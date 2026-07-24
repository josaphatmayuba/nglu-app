import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { applyOpusProfile, detectInitialProfile, readOpusProfileFromSdp } from "./opusTuning.js";
import { getMicrophoneStream, microphoneErrorMessage } from "./microphone.js";
import { createCodec2AudioEngine } from "../ultra/audioWorklet.js";
import { createCodec2Transport } from "../ultra/transport.js";

// Machine a etats d'un appel audio 1-a-1.
//
// Cible : reseaux mobiles d'Afrique centrale (2G/EDGE/3G instable). Les choix
// techniques privilegient systematiquement l'etablissement et le maintien de la
// connexion sur la qualite audio.

/** Etats exposes a l'UI. */
export const CALL_STATE = {
  IDLE: "idle",
  RINGING_OUT: "ringing-out", // on appelle
  RINGING_IN: "ringing-in", // on est appele
  CONNECTING: "connecting", // negociation WebRTC en cours
  ACTIVE: "active",
  ENDED: "ended",
};

// Delais adaptes aux reseaux lents : en 2G, l'echange ICE peut prendre 15-20 s.
// Des seuils trop courts couperaient des appels qui allaient aboutir.
const CONNECT_TIMEOUT_MS = 45000;
const RINGING_TIMEOUT_MS = 45000;
const HEARTBEAT_MS = 15000;
const STATS_INTERVAL_MS = 3000;
const ICE_RESTART_COOLDOWN_MS = 8000;
const ULTRA_AUTO_BAD_SAMPLES = 2;
const ULTRA_AUTO_GOOD_SAMPLES = 4;
const ULTRA_RETURN_BITRATE = 16000;
const AUTO_ULTRA_FALLBACK = import.meta.env.VITE_CODEC2_AUTO_FALLBACK === "true"
  || import.meta.env.MODE === "development"
  || (typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("codec2") === "auto");

// Adaptation du profil audio a la qualite reelle.
// Montee exigeante (5 mesures = ~15 s de bonne qualite soutenue) : une
// renegociation coute une breve interruption du son, on ne la declenche pas
// pour un pic passager. Descente rapide (2 mesures = ~6 s) : mieux vaut
// degrader trop tot que perdre l'appel.
const GOOD_SAMPLES_TO_UPGRADE = 5;
const BAD_SAMPLES_TO_DOWNGRADE = 2;
const PROFILE_CHANGE_COOLDOWN_MS = 20000;

const END_MESSAGES = {
  hangup: "Appel termine",
  rejected: "Appel refuse",
  missed: "Pas de reponse",
  unavailable: "Correspondant hors ligne",
  busy: "Correspondant deja en appel",
  failed: "Connexion impossible",
  timeout: "Connexion perdue",
  forbidden: "Appel non autorise",
  invalid: "Destinataire invalide",
};

function callSetupErrorMessage(err) {
  const message = microphoneErrorMessage(err);
  return message === "Micro indisponible" ? "Connexion audio impossible" : message;
}

export function useCall(socket, currentUserId) {
  const [state, setState] = useState(CALL_STATE.IDLE);
  const [peer, setPeer] = useState(null); // { userId, name }
  const [callId, setCallId] = useState(null);
  const [discussionId, setDiscussionId] = useState(null);
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState(null); // { score, label, rtt, loss, jitter }
  const [profile, setProfile] = useState("low");
  const [endMessage, setEndMessage] = useState(null);
  const [durationSec, setDurationSec] = useState(0);
  const [ultraMode, setUltraMode] = useState("off"); // off | starting | active | error

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const ultraModeRef = useRef("off");
  const ultraRef = useRef(null);
  const ultraAttemptRef = useRef(0);
  const ultraStartRef = useRef(null);
  const ultraStopRef = useRef(null);
  const ultraAutoBadSamplesRef = useRef(0);
  const ultraAutoGoodSamplesRef = useRef(0);
  const ultraAutoAttemptedRef = useRef(false);
  const callIdRef = useRef(null);
  const isCallerRef = useRef(false);
  const iceServersRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const remoteDescSetRef = useRef(false);
  const profileRef = useRef("low");
  const timersRef = useRef({});
  const iceRestartAtRef = useRef(0);
  const relayOnlyRef = useRef(false);
  const reportedConnectionRef = useRef(false);
  // Adaptation du profil audio : compteurs de mesures consecutives, derniere
  // valeur de qualite, et echantillon precedent pour calculer la perte sur
  // l'intervalle plutot que depuis le debut de l'appel.
  const goodSamplesRef = useRef(0);
  const badSamplesRef = useRef(0);
  const lastProfileChangeRef = useRef(0);
  const lastSampleRef = useRef({ lost: 0, received: 0 });
  const qualityRef = useRef(null);
  // Indirection vers attemptIceRestart, defini plus bas : evite une dependance
  // circulaire entre adaptProfile et la renegociation.
  const renegotiateRef = useRef(null);

  const updateUltraMode = useCallback((mode) => {
    ultraModeRef.current = mode;
    setUltraMode(mode);
  }, []);

  /** Stoppe le transport Ultra et restaure l'envoi RTP sans couper le micro. */
  const teardownUltra = useCallback(({ notify = false } = {}) => {
    ultraAttemptRef.current += 1;
    const id = callIdRef.current;
    const current = ultraRef.current;
    ultraRef.current = null;

    if (notify && id && socket?.connected) {
      socket.emit("call:ultra:stop", { callId: id });
    }
    if (current) {
      current.transport?.close();
      current.engine?.close()?.catch(() => { /* contexte deja ferme */ });
      for (const { sender, track } of current.senders) {
        sender.replaceTrack(track).catch(() => { /* peerconnection deja fermee */ });
      }
    }
    ultraAutoGoodSamplesRef.current = 0;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
      remoteAudioRef.current.play?.().catch(() => { /* autoplay bloque */ });
    }
    updateUltraMode("off");
  }, [socket, updateUltraMode]);

  const clearTimers = useCallback(() => {
    for (const key of Object.keys(timersRef.current)) {
      clearTimeout(timersRef.current[key]);
      clearInterval(timersRef.current[key]);
      delete timersRef.current[key];
    }
  }, []);

  /** Libere micro, PeerConnection et minuteries. Toujours appelable. */
  const cleanup = useCallback(() => {
    clearTimers();
    teardownUltra();
    ultraAutoBadSamplesRef.current = 0;
    ultraAutoGoodSamplesRef.current = 0;
    ultraAutoAttemptedRef.current = false;
    if (pcRef.current) {
      try {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch { /* deja ferme */ }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        try { track.stop(); } catch { /* ignore */ }
      }
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    pendingCandidatesRef.current = [];
    remoteDescSetRef.current = false;
    reportedConnectionRef.current = false;
    relayOnlyRef.current = false;
    iceRestartAtRef.current = 0;
    // Compteurs d'adaptation : remis a zero pour que le prochain appel reparte
    // d'une mesure propre et non des statistiques du precedent.
    goodSamplesRef.current = 0;
    badSamplesRef.current = 0;
    lastProfileChangeRef.current = 0;
    lastSampleRef.current = { lost: 0, received: 0 };
    qualityRef.current = null;
  }, [clearTimers, teardownUltra]);

  const resetToIdle = useCallback(() => {
    cleanup();
    callIdRef.current = null;
    setCallId(null);
    setPeer(null);
    setDiscussionId(null);
    setQuality(null);
    setMuted(false);
    setDurationSec(0);
    setState(CALL_STATE.IDLE);
  }, [cleanup]);

  /** Termine l'appel localement et previent le serveur. */
  const endCall = useCallback((reason = "hangup", message = null) => {
    const id = callIdRef.current;
    if (id && socket?.connected) {
      socket.emit("call:end", { callId: id, reason });
    }
    cleanup();
    setEndMessage(message || END_MESSAGES[reason] || END_MESSAGES.hangup);
    setState(CALL_STATE.ENDED);
    // Laisse le temps de lire le message avant de rendre la main.
    timersRef.current.reset = setTimeout(() => resetToIdle(), 2500);
  }, [socket, cleanup, resetToIdle]);

  /** Recupere STUN/TURN. Sans TURN, la plupart des appels mobiles echouent. */
  const getIceServers = useCallback(async () => {
    if (iceServersRef.current && iceServersRef.current.expiresAt > Date.now()) {
      return iceServersRef.current.servers;
    }
    try {
      const res = await api.iceServers();
      iceServersRef.current = {
        servers: res.iceServers || [],
        // Renouvelle 5 min avant l'expiration reelle.
        expiresAt: Date.now() + Math.max(60, (res.ttlSeconds || 3600) - 300) * 1000,
      };
      return iceServersRef.current.servers;
    } catch {
      // Repli : STUN public seul. Fonctionne sur NAT cooperatif uniquement.
      return [{ urls: ["stun:stun.l.google.com:19302"] }];
    }
  }, []);

  /**
   * Adapte le profil audio a la qualite mesuree, dans les deux sens.
   *
   * Montee : exige une bonne qualite soutenue (plusieurs mesures consecutives)
   * avant d'augmenter le debit. Un pic passager ne doit pas declencher une
   * renegociation, qui coute une interruption breve du son.
   *
   * Descente : immediate des la premiere mesure mauvaise. Mieux vaut degrader
   * trop tot que perdre l'appel — c'est le compromis choisi pour les reseaux
   * africains, ou la degradation est souvent brutale.
   */
  const adaptProfile = useCallback((score) => {
    const order = ["minimal", "low", "standard"];
    const current = profileRef.current;
    const idx = order.indexOf(current);
    if (idx === -1) return;

    // Laisse la connexion se stabiliser apres chaque changement.
    if (Date.now() - lastProfileChangeRef.current < PROFILE_CHANGE_COOLDOWN_MS) return;

    if (score === 3) {
      goodSamplesRef.current += 1;
      badSamplesRef.current = 0;
    } else if (score === 1) {
      badSamplesRef.current += 1;
      goodSamplesRef.current = 0;
    } else {
      // Qualite moyenne : on ne bouge pas, mais on remet les compteurs a zero
      // pour ne pas cumuler des bonnes mesures eparpillees.
      goodSamplesRef.current = 0;
      badSamplesRef.current = 0;
      return;
    }

    let target = null;
    if (goodSamplesRef.current >= GOOD_SAMPLES_TO_UPGRADE && idx < order.length - 1) {
      target = order[idx + 1];
    } else if (badSamplesRef.current >= BAD_SAMPLES_TO_DOWNGRADE && idx > 0) {
      target = order[idx - 1];
    }
    if (!target) return;

    goodSamplesRef.current = 0;
    badSamplesRef.current = 0;
    lastProfileChangeRef.current = Date.now();
    profileRef.current = target;
    setProfile(target);

    // Le nouveau profil ne s'applique qu'a la prochaine negociation SDP.
    renegotiateRef.current?.();
  }, []);

  /** Mesure la qualite et rapporte le mode de connexion (p2p vs relay). */
  const collectStats = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    let stats;
    try { stats = await pc.getStats(); } catch { return; }

    let rtt = null, jitter = null, lost = 0, received = 0;
    let localType = null, remoteType = null, availableBitrate = null;

    stats.forEach((report) => {
      if (report.type === "inbound-rtp" && report.kind === "audio") {
        jitter = report.jitter != null ? report.jitter * 1000 : jitter;
        lost = report.packetsLost ?? 0;
        received = report.packetsReceived ?? 0;
      }
      if (report.type === "candidate-pair" && report.state === "succeeded" && report.nominated) {
        rtt = report.currentRoundTripTime != null ? report.currentRoundTripTime * 1000 : rtt;
        const local = stats.get(report.localCandidateId);
        const remote = stats.get(report.remoteCandidateId);
        localType = local?.candidateType ?? localType;
        remoteType = remote?.candidateType ?? remoteType;
        if (report.availableOutgoingBitrate != null) {
          availableBitrate = report.availableOutgoingBitrate;
        }
      }
    });

    // Rapporte une seule fois le mode reellement negocie : alimente la colonne
    // chat_calls.connection_type, qui mesure le recours au relais TURN.
    if (!reportedConnectionRef.current && localType) {
      reportedConnectionRef.current = true;
      const isRelay = localType === "relay" || remoteType === "relay";
      if (callIdRef.current && socket?.connected) {
        socket.emit("call:connected", {
          callId: callIdRef.current,
          connectionType: isRelay ? "relay" : "p2p",
        });
      }
    }

    // Perte sur le DERNIER intervalle, pas depuis le debut de l'appel :
    // packetsLost est cumulatif, donc une mauvaise passe initiale plomberait le
    // score definitivement et interdirait toute remontee de qualite.
    const prev = lastSampleRef.current;
    const deltaLost = Math.max(0, lost - prev.lost);
    const deltaReceived = Math.max(0, received - prev.received);
    lastSampleRef.current = { lost, received };

    const deltaTotal = deltaLost + deltaReceived;
    // Sans trafic sur l'intervalle (DTX pendant un silence), on conserve la
    // derniere mesure connue plutot que d'afficher 0 % a tort.
    const lossPct = deltaTotal > 0
      ? (deltaLost / deltaTotal) * 100
      : (qualityRef.current?.loss ?? 0);

    // Score reseau : pensé pour la 2G, ou 400 ms de latence reste exploitable.
    let score = 3; // 3 = bon, 2 = moyen, 1 = faible
    if (
      lossPct > 12
      || (rtt != null && rtt > 800)
      || (jitter != null && jitter > 120)
      || (availableBitrate != null && availableBitrate < 8000)
    ) score = 1;
    else if (lossPct > 5 || (rtt != null && rtt > 400) || (jitter != null && jitter > 60)) score = 2;

    const nextQuality = {
      score,
      label: score === 3 ? "Bonne" : score === 2 ? "Moyenne" : "Faible",
      rtt: rtt != null ? Math.round(rtt) : null,
      loss: Math.round(lossPct * 10) / 10,
      jitter: jitter != null ? Math.round(jitter) : null,
      bitrate: availableBitrate != null ? Math.round(availableBitrate) : null,
      relay: localType === "relay" || remoteType === "relay",
    };
    qualityRef.current = nextQuality;
    setQuality(nextQuality);

    if (AUTO_ULTRA_FALLBACK) {
      if (ultraModeRef.current === "off" && !ultraAutoAttemptedRef.current) {
        ultraAutoBadSamplesRef.current = score === 1 ? ultraAutoBadSamplesRef.current + 1 : 0;
        if (ultraAutoBadSamplesRef.current >= ULTRA_AUTO_BAD_SAMPLES && ultraStartRef.current) {
          ultraAutoAttemptedRef.current = true;
          ultraStartRef.current();
        }
      } else if (ultraModeRef.current === "active") {
        const recovered = availableBitrate != null
          && availableBitrate >= ULTRA_RETURN_BITRATE
          && (rtt == null || rtt < 400);
        ultraAutoGoodSamplesRef.current = recovered
          ? ultraAutoGoodSamplesRef.current + 1
          : 0;
        if (ultraAutoGoodSamplesRef.current >= ULTRA_AUTO_GOOD_SAMPLES && ultraStopRef.current) {
          ultraStopRef.current();
        }
      }
    }

    adaptProfile(score);
  }, [socket, adaptProfile]);

  /**
   * Relance la negociation ICE sans raccrocher.
   * C'est le mecanisme qui sauve l'appel lors d'un basculement 2G<->3G ou d'un
   * trou reseau : au lieu de perdre l'appel, on renegocie le chemin media.
   */
  const attemptIceRestart = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !isCallerRef.current) return; // seul l'appelant reoffre
    if (Date.now() - iceRestartAtRef.current < ICE_RESTART_COOLDOWN_MS) return;
    iceRestartAtRef.current = Date.now();

    try {
      const offer = await pc.createOffer({ iceRestart: true });
      offer.sdp = applyOpusProfile(offer.sdp, profileRef.current);
      await pc.setLocalDescription(offer);
      socket?.emit("call:signal", {
        callId: callIdRef.current,
        signal: { type: "offer", sdp: offer.sdp },
      });
    } catch { /* la connexion se fermera d'elle-meme si l'echec persiste */ }
  }, [socket]);

  /**
   * Renegocie uniquement le codec, sans relancer la decouverte ICE.
   *
   * Distinct de attemptIceRestart : ici le chemin reseau est bon, seul le
   * debit change. Un iceRestart complet couterait plusieurs secondes de
   * collecte de candidats pour rien — inacceptable en 2G.
   */
  const renegotiateProfile = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !isCallerRef.current) return; // seul l'appelant reoffre
    if (pc.signalingState !== "stable") return; // negociation deja en cours

    try {
      const offer = await pc.createOffer();
      offer.sdp = applyOpusProfile(offer.sdp, profileRef.current);
      await pc.setLocalDescription(offer);
      socket?.emit("call:signal", {
        callId: callIdRef.current,
        signal: { type: "offer", sdp: offer.sdp },
      });
    } catch { /* on garde le profil courant, l'appel continue */ }
  }, [socket]);

  // Branche l'indirection utilisee par adaptProfile (defini plus haut).
  useEffect(() => {
    renegotiateRef.current = renegotiateProfile;
  }, [renegotiateProfile]);

  /** Demande le micro des que l'utilisateur lance/accepte l'appel. */
  const ensureLocalStream = useCallback(async () => {
    const existing = localStreamRef.current;
    if (existing?.active && existing.getAudioTracks().some((track) => track.readyState === "live")) {
      return existing;
    }
    const stream = await getMicrophoneStream();
    localStreamRef.current = stream;
    return stream;
  }, []);

  // Expose la demande micro pour les boutons qui doivent faire un appel
  // reseau avant de connaitre l'identifiant de discussion.
  const prepareMicrophone = useCallback(() => ensureLocalStream(), [ensureLocalStream]);

  /** Active le prototype Codec2 full-duplex sans detruire l'appel WebRTC. */
  const startUltra = useCallback(async () => {
    if (state !== CALL_STATE.ACTIVE || !socket?.connected || !callIdRef.current) return;
    if (ultraRef.current || ultraModeRef.current === "starting") return;

    const attempt = ++ultraAttemptRef.current;
    updateUltraMode("starting");
    let engine = null;
    let transport = null;
    let senderStates = [];
    try {
      const stream = await ensureLocalStream();
      const track = stream.getAudioTracks()[0];
      const pc = pcRef.current;
      senderStates = pc
        ? pc.getSenders()
          .filter((sender) => sender.track?.kind === "audio" && sender.track === track)
          .map((sender) => ({ sender, track }))
        : [];
      if (!track || senderStates.length === 0) throw new Error("Piste WebRTC audio absente");

      // Le micro reste vivant pour l'AudioWorklet; seule la copie RTP est retiree.
      for (const { sender } of senderStates) await sender.replaceTrack(null);
      ultraRef.current = { engine: null, transport: null, senders: senderStates };
      if (attempt !== ultraAttemptRef.current) throw new Error("Initialisation Ultra annulee");

      engine = await createCodec2AudioEngine(stream, {
        onFrame: (frame) => transport?.sendFrame(frame),
        onState: (event) => {
          if (event.type === "error") {
            teardownUltra({ notify: true });
            updateUltraMode("error");
          }
        },
      });
      if (attempt !== ultraAttemptRef.current) throw new Error("Initialisation Ultra annulee");
      ultraRef.current.engine = engine;
      transport = createCodec2Transport(socket, callIdRef.current, {
        onFrame: (frame) => engine.sendFrame(frame),
      });
      ultraRef.current.transport = transport;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
      updateUltraMode("active");
    } catch (error) {
      if (ultraRef.current?.senders === senderStates) ultraRef.current = null;
      transport?.close();
      if (engine) await engine.close().catch(() => { /* nettoyage best-effort */ });
      for (const { sender, track } of senderStates) await sender.replaceTrack(track).catch(() => {});
      if (attempt !== ultraAttemptRef.current) return;
      updateUltraMode("error");
      console.warn("Codec2 Ultra indisponible", error);
    }
  }, [state, socket, ensureLocalStream, teardownUltra, updateUltraMode]);

  const stopUltra = useCallback(() => {
    teardownUltra({ notify: true });
  }, [teardownUltra]);

  useEffect(() => {
    ultraStartRef.current = startUltra;
    return () => {
      if (ultraStartRef.current === startUltra) ultraStartRef.current = null;
    };
  }, [startUltra]);

  useEffect(() => {
    ultraStopRef.current = stopUltra;
    return () => {
      if (ultraStopRef.current === stopUltra) ultraStopRef.current = null;
    };
  }, [stopUltra]);

  /** Construit la PeerConnection et branche micro + evenements. */
  const createPeerConnection = useCallback(async (forceRelay = false) => {
    const iceServers = await getIceServers();

    const pc = new RTCPeerConnection({
      iceServers,
      // "relay" force le passage par TURN : utilise en second essai, quand le
      // P2P direct a echoue (NAT symetrique des operateurs mobiles).
      iceTransportPolicy: forceRelay ? "relay" : "all",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      iceCandidatePoolSize: 0, // pre-collecte inutile ici, coute de la batterie
    });

    const stream = await ensureLocalStream();
    for (const track of stream.getTracks()) pc.addTrack(track, stream);

    pc.onicecandidate = (evt) => {
      if (!evt.candidate || !callIdRef.current) return;
      // Trickle ICE : envoi au fil de l'eau, l'appel s'etablit plus vite.
      socket?.emit("call:signal", {
        callId: callIdRef.current,
        signal: { type: "candidate", candidate: evt.candidate.toJSON() },
      });
    };

    pc.ontrack = (evt) => {
      if (!evt.streams[0]) return;
      remoteStreamRef.current = evt.streams[0];
      if (ultraModeRef.current !== "active" && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = evt.streams[0];
        remoteAudioRef.current.play?.().catch(() => { /* autoplay bloque */ });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState;
      if (st === "connected" || st === "completed") {
        clearTimeout(timersRef.current.connect);
        setState((prev) => (prev === CALL_STATE.ENDED ? prev : CALL_STATE.ACTIVE));
      } else if (st === "disconnected") {
        // Ne pas raccrocher : sur reseau mobile, "disconnected" est souvent
        // transitoire (handover, micro-coupure). On tente une reprise ICE.
        attemptIceRestart();
      } else if (st === "failed") {
        // Echec definitif du chemin courant : on retente en TURN force,
        // puis on abandonne.
        if (!relayOnlyRef.current) {
          relayOnlyRef.current = true;
          restartWithRelay();
        } else {
          endCall("failed");
        }
      }
    };

    pcRef.current = pc;
    return pc;
  }, [getIceServers, ensureLocalStream, socket, attemptIceRestart, endCall]);

  /** Rebatit la connexion en forcant le relais TURN. */
  const restartWithRelay = useCallback(async () => {
    if (!isCallerRef.current) return; // l'appele attend la nouvelle offre
    const id = callIdRef.current;
    if (!id) return;

    try {
      if (pcRef.current) { try { pcRef.current.close(); } catch { /* ignore */ } }
      if (localStreamRef.current) {
        for (const t of localStreamRef.current.getTracks()) { try { t.stop(); } catch { /* ignore */ } }
      }
      remoteDescSetRef.current = false;
      pendingCandidatesRef.current = [];
      reportedConnectionRef.current = false;

      const pc = await createPeerConnection(true);
      const offer = await pc.createOffer();
      offer.sdp = applyOpusProfile(offer.sdp, profileRef.current);
      await pc.setLocalDescription(offer);
      socket?.emit("call:signal", { callId: id, signal: { type: "offer", sdp: offer.sdp } });
    } catch (err) {
      endCall("failed", callSetupErrorMessage(err));
    }
  }, [createPeerConnection, socket, endCall]);

  /** Applique les candidats ICE recus avant la description distante. */
  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !remoteDescSetRef.current) return;
    const pending = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of pending) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* candidat obsolete */ }
    }
  }, []);

  // ── Actions exposees a l'UI ────────────────────────────────────────────────

  /** Lance un appel vers un correspondant. */
  const startCall = useCallback(async (targetDiscussionId, calleeId, calleeName) => {
    if (!socket?.connected) {
      setEndMessage("Pas de connexion au serveur");
      setState(CALL_STATE.ENDED);
      timersRef.current.reset = setTimeout(() => resetToIdle(), 2500);
      return;
    }
    const initial = detectInitialProfile();
    profileRef.current = initial;
    setProfile(initial);

    try {
      await ensureLocalStream();
    } catch (err) {
      cleanup();
      setPeer({ userId: calleeId, name: calleeName });
      setDiscussionId(targetDiscussionId);
      setEndMessage(callSetupErrorMessage(err));
      setState(CALL_STATE.ENDED);
      timersRef.current.reset = setTimeout(() => resetToIdle(), 2500);
      return;
    }

    isCallerRef.current = true;
    setPeer({ userId: calleeId, name: calleeName });
    setDiscussionId(targetDiscussionId);
    setEndMessage(null);
    setState(CALL_STATE.RINGING_OUT);

    socket.emit("call:invite", { discussionId: targetDiscussionId, calleeId });

    timersRef.current.ringing = setTimeout(() => {
      if (callIdRef.current) endCall("missed");
    }, RINGING_TIMEOUT_MS);
  }, [socket, ensureLocalStream, cleanup, endCall, resetToIdle]);

  /** Accepte l'appel entrant. */
  const acceptCall = useCallback(async () => {
    if (!callIdRef.current || !socket?.connected) return;
    clearTimeout(timersRef.current.ringing);
    setState(CALL_STATE.CONNECTING);
    try {
      await ensureLocalStream();
    } catch (err) {
      endCall("failed", callSetupErrorMessage(err));
      return;
    }
    socket.emit("call:accept", { callId: callIdRef.current });
  }, [socket, ensureLocalStream, endCall]);

  /** Refuse l'appel entrant. */
  const rejectCall = useCallback(() => {
    if (!callIdRef.current || !socket?.connected) return;
    socket.emit("call:reject", { callId: callIdRef.current });
    cleanup();
    setEndMessage(END_MESSAGES.rejected);
    setState(CALL_STATE.ENDED);
    timersRef.current.reset = setTimeout(() => resetToIdle(), 1500);
  }, [socket, cleanup, resetToIdle]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    for (const track of stream.getAudioTracks()) track.enabled = !next;
    setMuted(next);
  }, [muted]);

  /**
   * Change le profil audio en cours d'appel (economie de donnees manuelle).
   * Le choix manuel neutralise l'adaptation automatique pendant le cooldown,
   * pour ne pas etre immediatement contredit par la mesure suivante.
   */
  const changeProfile = useCallback((name) => {
    profileRef.current = name;
    setProfile(name);
    goodSamplesRef.current = 0;
    badSamplesRef.current = 0;
    lastProfileChangeRef.current = Date.now();
    if (state === CALL_STATE.ACTIVE) renegotiateProfile();
  }, [state, renegotiateProfile]);

  // ── Reception des evenements de signalisation ──────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onIncoming = ({ callId: id, discussionId: did, callerId, callerName }) => {
      // Un seul appel a la fois : on refuse poliment le second.
      if (callIdRef.current) {
        socket.emit("call:end", { callId: id, reason: "busy" });
        return;
      }
      callIdRef.current = id;
      setCallId(id);
      setDiscussionId(did);
      setPeer({ userId: callerId, name: callerName || "Appel entrant" });
      isCallerRef.current = false;
      const initial = detectInitialProfile();
      profileRef.current = initial;
      setProfile(initial);
      setEndMessage(null);
      setState(CALL_STATE.RINGING_IN);

      timersRef.current.ringing = setTimeout(() => {
        if (callIdRef.current === id) endCall("missed");
      }, RINGING_TIMEOUT_MS);
    };

    const onRinging = ({ callId: id }) => {
      callIdRef.current = id;
      setCallId(id);
    };

    const onAccepted = async ({ callId: id }) => {
      clearTimeout(timersRef.current.ringing);
      if (callIdRef.current !== id) return;
      setState(CALL_STATE.CONNECTING);

      // Garde-fou : si rien n'aboutit dans le delai, on arrete proprement.
      timersRef.current.connect = setTimeout(() => {
        endCall("failed");
      }, CONNECT_TIMEOUT_MS);

      if (!isCallerRef.current) return; // l'appele attend l'offre

      try {
        const pc = await createPeerConnection(false);
        const offer = await pc.createOffer();
        offer.sdp = applyOpusProfile(offer.sdp, profileRef.current);
        await pc.setLocalDescription(offer);
        socket.emit("call:signal", { callId: id, signal: { type: "offer", sdp: offer.sdp } });
      } catch (err) {
        endCall("failed", callSetupErrorMessage(err));
      }
    };

    const onSignal = async ({ callId: id, signal }) => {
      if (callIdRef.current !== id || !signal) return;

      try {
        if (signal.type === "offer") {
          const pc = pcRef.current ?? (await createPeerConnection(relayOnlyRef.current));
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: signal.sdp }));
          remoteDescSetRef.current = true;
          await flushPendingCandidates();

          // L'appele s'aligne sur le profil impose par l'offre plutot que sur
          // le sien : sinon les deux cotes negocieraient des debits differents
          // et l'adaptation de l'appelant serait sans effet sur le flux recu.
          const offered = readOpusProfileFromSdp(signal.sdp);
          if (offered && offered !== profileRef.current) {
            profileRef.current = offered;
            setProfile(offered);
          }

          const answer = await pc.createAnswer();
          answer.sdp = applyOpusProfile(answer.sdp, profileRef.current);
          await pc.setLocalDescription(answer);
          socket.emit("call:signal", { callId: id, signal: { type: "answer", sdp: answer.sdp } });
        } else if (signal.type === "answer") {
          const pc = pcRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: signal.sdp }));
          remoteDescSetRef.current = true;
          await flushPendingCandidates();
        } else if (signal.type === "candidate") {
          const pc = pcRef.current;
          if (!pc || !remoteDescSetRef.current) {
            // Candidat arrive avant la description : on le met de cote.
            pendingCandidatesRef.current.push(signal.candidate);
            return;
          }
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch { /* obsolete */ }
        }
      } catch (err) {
        endCall("failed", callSetupErrorMessage(err));
      }
    };

    const onUltraReady = ({ callId: id }) => {
      if (callIdRef.current !== id || state !== CALL_STATE.ACTIVE) return;
      startUltra();
    };

    const onUltraStop = ({ callId: id }) => {
      if (callIdRef.current !== id) return;
      teardownUltra();
    };

    const onEnded = ({ callId: id, reason }) => {
      if (callIdRef.current !== id) return;
      cleanup();
      setEndMessage(END_MESSAGES[reason] ?? END_MESSAGES.hangup);
      setState(CALL_STATE.ENDED);
      timersRef.current.reset = setTimeout(() => resetToIdle(), 2500);
    };

    const onFailed = ({ reason, message }) => {
      cleanup();
      setEndMessage(message || END_MESSAGES[reason] || "Appel impossible");
      setState(CALL_STATE.ENDED);
      timersRef.current.reset = setTimeout(() => resetToIdle(), 2500);
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:ringing", onRinging);
    socket.on("call:accepted", onAccepted);
    socket.on("call:signal", onSignal);
    socket.on("call:ultra:ready", onUltraReady);
    socket.on("call:ultra:stop", onUltraStop);
    socket.on("call:ended", onEnded);
    socket.on("call:failed", onFailed);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:ringing", onRinging);
      socket.off("call:accepted", onAccepted);
      socket.off("call:signal", onSignal);
      socket.off("call:ultra:ready", onUltraReady);
      socket.off("call:ultra:stop", onUltraStop);
      socket.off("call:ended", onEnded);
      socket.off("call:failed", onFailed);
    };
  }, [socket, state, startUltra, teardownUltra, createPeerConnection, flushPendingCandidates, cleanup, endCall, resetToIdle]);

  // Heartbeat + statistiques + chrono pendant l'appel.
  useEffect(() => {
    if (state !== CALL_STATE.ACTIVE && state !== CALL_STATE.CONNECTING) return;

    timersRef.current.heartbeat = setInterval(() => {
      if (callIdRef.current && socket?.connected) {
        socket.emit("call:heartbeat", { callId: callIdRef.current });
      }
    }, HEARTBEAT_MS);

    timersRef.current.stats = setInterval(collectStats, STATS_INTERVAL_MS);

    let seconds = 0;
    timersRef.current.chrono = setInterval(() => {
      if (state === CALL_STATE.ACTIVE) setDurationSec(++seconds);
    }, 1000);

    return () => {
      clearInterval(timersRef.current.heartbeat);
      clearInterval(timersRef.current.stats);
      clearInterval(timersRef.current.chrono);
    };
  }, [state, socket, collectStats]);

  // Les navigateurs mobiles suspendent souvent AudioWorklet et Socket.IO quand
  // l'ecran est verrouille. Revenir a WebRTC avant la suspension permet au
  // moteur audio natif de continuer quand le navigateur le supporte.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (ultraModeRef.current === "active" || ultraModeRef.current === "starting") {
          ultraAutoAttemptedRef.current = true;
          teardownUltra({ notify: true });
        }
        return;
      }

      if (remoteAudioRef.current && remoteStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.play?.().catch(() => { /* autoplay deja bloque */ });
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [teardownUltra]);

  // Filet de securite : libere le micro si le composant disparait.
  useEffect(() => cleanup, [cleanup]);

  return {
    state,
    peer,
    callId,
    discussionId,
    muted,
    quality,
    profile,
    endMessage,
    durationSec,
    ultraMode,
    remoteAudioRef,
    startCall,
    prepareMicrophone,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    changeProfile,
    startUltra,
    stopUltra,
    isActive: state !== CALL_STATE.IDLE,
  };
}

