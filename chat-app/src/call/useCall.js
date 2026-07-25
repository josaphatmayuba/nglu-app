import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { applyOpusProfile, detectInitialProfile, readOpusProfileFromSdp } from "./opusTuning.js";
import { getMicrophoneStream, microphoneErrorMessage } from "./microphone.js";
import { getCameraStream, cameraErrorMessage } from "./camera.js";
import { detectInitialVideoProfile, applyVideoProfile, VIDEO_PROFILES } from "./videoTuning.js";
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
// Doit rester sous DISCONNECT_GRACE_MS cote gateway (12s) : le client doit
// avoir le temps d'emettre call:rejoin apres une reconnexion avant que le
// serveur ne raccroche de son cote.
const DISCONNECT_GRACE_MS = 10000;
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

// Noms d'erreur getUserMedia connus : seuls ceux-ci justifient un message micro.
const KNOWN_MIC_ERROR_NAMES = new Set([
  "NotAllowedError", "PermissionDeniedError",
  "NotFoundError", "DevicesNotFoundError",
  "NotReadableError", "TrackStartError",
  "OverconstrainedError", "ConstraintNotSatisfiedError",
]);

function callSetupErrorMessage(err) {
  // Une erreur de negociation SDP/WebRTC (DOMException generique levee par
  // set{Local,Remote}Description/createAnswer) n'a rien a voir avec le micro :
  // la router vers microphoneErrorMessage affichait "Connexion audio impossible",
  // message trompeur. On ne renvoie un message micro que pour une vraie erreur
  // getUserMedia connue ; sinon message de connexion generique.
  const name = err?.name || "";
  if (KNOWN_MIC_ERROR_NAMES.has(name)) return microphoneErrorMessage(err);
  return "Connexion impossible";
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
  // Vrai pendant le delai de grace apres une deconnexion socket (cf onDisconnect) :
  // l'appel n'est pas encore raccroche, mais le signaling est momentanement coupe.
  const [reconnecting, setReconnecting] = useState(false);
  // Message d'erreur exact d'un echec Ultra, affiche dans l'UI : sur mobile
  // sans DevTools branche, console.warn seul rendait l'echec invisible.
  const [ultraError, setUltraError] = useState(null);
  // Video (Ticket 2) : capture + toggle locaux uniquement, pas encore
  // branches au RTCPeerConnection (Ticket 3) ni au signaling (Ticket 4) ni a
  // l'adaptation reseau (Ticket 5).
  const [videoEnabled, setVideoEnabled] = useState(false); // intention utilisateur
  const [videoActive, setVideoActive] = useState(false); // etat reel de la piste
  const [videoAutoSuspended, setVideoAutoSuspended] = useState(false); // reserve Ticket 5
  const [cameraError, setCameraError] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  // Vrai des qu'un flux video DISTANT est recu et actif (pilote l'affichage du
  // <video> distant). Distinct de videoActive (qui concerne l'envoi local).
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  // Raison de la derniere coupure video distante rapportee par le peer
  // ("manual"/"network"), pour que l'UI distingue les deux (rendu Ticket 6).
  const [remoteVideoReason, setRemoteVideoReason] = useState(null);
  // Miroir reactif (lecture UI uniquement, Ticket 6) de videoProfileRef : la
  // logique d'adaptation (adaptVideo) continue de piloter le palier via la ref
  // non-reactive, ce state ne fait que refleter sa valeur pour l'affichage du
  // libelle VIDEO_PROFILE_LABELS.
  const [videoProfile, setVideoProfileState] = useState("low");

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoStreamRef = useRef(null);
  const videoTransceiverRef = useRef(null);
  // Direction courante negociee sur la m=video ("inactive" tant que la camera
  // n'a pas ete activee). Lue par renegotiate() pour munger le SDP video.
  const videoDirectionRef = useRef("inactive");
  // Miroir non-reactif de videoActive : permet aux callbacks (restartWithRelay,
  // renegotiate) de connaitre l'etat reel sans dependre d'une closure stale.
  const videoActiveRef = useRef(false);
  const remoteVideoStreamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const videoProfileRef = useRef("low");
  const videoGoodSamplesRef = useRef(0); // reserve Ticket 5
  const videoBadSamplesRef = useRef(0); // reserve Ticket 5
  const lastVideoProfileChangeRef = useRef(0); // reserve Ticket 5
  const remoteAudioRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const ultraModeRef = useRef("off");
  const ultraRef = useRef(null);
  // Engine/transport prets localement mais RTP pas encore coupe : en attente
  // de la confirmation call:ultra:go de l'autre participant (cf engageUltra).
  const ultraPendingRef = useRef(null);
  const ultraPeerReadyRef = useRef(false);
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
  // Indirection vers applyVideoConstraints (defini plus bas) : adaptVideo, defini
  // a cote d'adaptProfile, doit pouvoir changer de palier video sans dependance
  // circulaire.
  const applyVideoConstraintsRef = useRef(null);
  // Miroir non-reactif de videoEnabled (intention utilisateur) : adaptVideo,
  // memoize sans deps, doit connaitre l'intention courante sans closure stale.
  const videoEnabledRef = useRef(false);
  // Miroir non-reactif de videoAutoSuspended (coupure reseau, videoEnabled reste
  // true) : distingue une coupure auto d'une coupure manuelle cote adaptVideo.
  const videoAutoSuspendedRef = useRef(false);
  // Indirections vers suspend/resumeVideoForNetwork (definis plus bas) : appeles
  // par adaptVideo sans dependance circulaire.
  const suspendVideoRef = useRef(null);
  const resumeVideoRef = useRef(null);
  // Indirections vers suspend/resumeVideoForVisibility (definis plus bas) :
  // appelees par le handler visibilitychange, distinctes des indirections
  // reseau ci-dessus pour ne pas confondre les deux causes de suspension.
  const suspendVideoForVisibilityRef = useRef(null);
  const resumeVideoForVisibilityRef = useRef(null);
  // Ticket 7 (section 8.4) : distingue une suspension video causee par la mise
  // en arriere-plan (visibilitychange) d'une suspension causee par le reseau
  // (videoAutoSuspendedRef). Seule la premiere doit etre annulee automatiquement
  // au retour "visible" ; la seconde reste du ressort d'adaptVideo (mesures
  // reseau soutenues), pas du simple retour de visibilite.
  const videoSuspendedByVisibilityRef = useRef(false);
  // Ticket 7 (section 8.5) : protege toggleCamera() contre un double-clic rapide
  // (deux getUserMedia/renegociations concurrents) - un second appel pendant
  // qu'un premier est en cours est ignore silencieusement.
  const videoToggleInFlightRef = useRef(false);

  const updateUltraMode = useCallback((mode) => {
    ultraModeRef.current = mode;
    setUltraMode(mode);
  }, []);

  /** Stoppe le transport Ultra et restaure l'envoi RTP sans couper le micro. */
  const teardownUltra = useCallback(({ notify = false } = {}) => {
    ultraAttemptRef.current += 1;
    const id = callIdRef.current;
    const current = ultraRef.current ?? ultraPendingRef.current;
    ultraRef.current = null;
    ultraPendingRef.current = null;
    ultraPeerReadyRef.current = false;

    if (notify && id && socket?.connected) {
      socket.emit("call:ultra:stop", { callId: id });
    }
    if (current) {
      current.transport?.close();
      current.engine?.close()?.catch(() => { /* contexte deja ferme */ });
      const senders = current.senders ?? current.senderStates ?? [];
      for (const { sender, track } of senders) {
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
    if (localVideoStreamRef.current) {
      for (const track of localVideoStreamRef.current.getTracks()) {
        try { track.stop(); } catch { /* ignore */ }
      }
      localVideoStreamRef.current = null;
    }
    videoActiveRef.current = false;
    videoEnabledRef.current = false;
    videoAutoSuspendedRef.current = false;
    videoDirectionRef.current = "inactive";
    videoTransceiverRef.current = null;
    remoteVideoStreamRef.current = null;
    // Ticket 7 : remise a zero des flags de suspension/race pour le prochain appel.
    videoSuspendedByVisibilityRef.current = false;
    videoToggleInFlightRef.current = false;
    // Compteurs d'adaptation video : remis a zero pour le prochain appel.
    videoGoodSamplesRef.current = 0;
    videoBadSamplesRef.current = 0;
    lastVideoProfileChangeRef.current = 0;
    videoProfileRef.current = "low";
    setVideoProfileState("low");
    setVideoEnabled(false);
    setVideoActive(false);
    setVideoAutoSuspended(false);
    setRemoteVideoActive(false);
    setRemoteVideoReason(null);
    setCameraError(null);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    pendingCandidatesRef.current = [];
    remoteDescSetRef.current = false;
    reportedConnectionRef.current = false;
    relayOnlyRef.current = false;
    iceRestartAtRef.current = 0;
    // Liberer callIdRef ici (pas seulement dans resetToIdle, retarde de
    // 1.5-2.5s pour l'affichage du message de fin) : sinon un rappel immediat
    // pendant l'ecran "Appel termine" trouve encore l'ancien callId et se fait
    // rejeter (onIncoming le prend pour un second appel en cours).
    callIdRef.current = null;
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
    setReconnecting(false);
    setUltraError(null);
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

  /**
   * Adapte la video au meme thermometre reseau que l'audio (le score audio est
   * le signal MAITRE, la video suit — cf plan section 4). L'audio n'est JAMAIS
   * touche ici : adaptVideo ne modifie que le palier/l'etat video et ne
   * declenche jamais d'ICE restart. La video se degrade/coupe AVANT que l'audio
   * ne souffre — c'est le seul degre de liberte restant quand l'audio est deja
   * au plancher.
   *
   * Refs dediees (videoGoodSamplesRef/videoBadSamplesRef/lastVideoProfileChangeRef)
   * pour ne pas se melanger aux compteurs audio ni partager leur cooldown.
   *
   * @param {number} score  1=mauvais / 2=moyen / 3=bon (issu des stats AUDIO).
   */
  const adaptVideo = useCallback((score) => {
    // Ne JAMAIS agir si l'utilisateur ne veut pas de video : on ne l'active
    // jamais automatiquement contre son intention.
    if (!videoEnabledRef.current) return;

    const order = ["off", "minimal", "low", "standard", "high"];
    const now = Date.now();
    const audioAtFloor = profileRef.current === "minimal";

    // ── Coupure ACCELEREE (priorite audio > video) ──────────────────────────
    // L'audio est deja au plancher et le reseau reste mauvais : la video est le
    // seul levier restant. On coupe IMMEDIATEMENT (sans attendre les paliers
    // intermediaires ni le cooldown) pour liberer la bande passante au profit
    // de l'audio.
    if (score === 1 && audioAtFloor && videoActiveRef.current) {
      suspendVideoRef.current?.();
      return;
    }

    // Respecte le cooldown entre changements video (independant de l'audio).
    if (now - lastVideoProfileChangeRef.current < PROFILE_CHANGE_COOLDOWN_MS) return;

    // Compteurs de mesures consecutives (memes seuils que l'audio).
    if (score === 3) {
      videoGoodSamplesRef.current += 1;
      videoBadSamplesRef.current = 0;
    } else if (score === 1) {
      videoBadSamplesRef.current += 1;
      videoGoodSamplesRef.current = 0;
    } else {
      videoGoodSamplesRef.current = 0;
      videoBadSamplesRef.current = 0;
      return;
    }

    // ── Descente / coupure (mauvaise qualite soutenue) ──────────────────────
    if (videoBadSamplesRef.current >= BAD_SAMPLES_TO_DOWNGRADE) {
      if (videoActiveRef.current) {
        const idx = order.indexOf(videoProfileRef.current);
        if (idx > order.indexOf("minimal")) {
          // Descente d'un palier via setParameters (aucune renegociation SDP).
          const target = order[idx - 1];
          videoProfileRef.current = target;
          setVideoProfileState(target);
          videoGoodSamplesRef.current = 0;
          videoBadSamplesRef.current = 0;
          lastVideoProfileChangeRef.current = now;
          applyVideoConstraintsRef.current?.(target);
        } else {
          // Deja au palier minimal et toujours mauvais : coupure totale.
          suspendVideoRef.current?.();
        }
      }
      return;
    }

    // ── Remontee / reactivation (bonne qualite soutenue) ────────────────────
    if (videoGoodSamplesRef.current >= GOOD_SAMPLES_TO_UPGRADE) {
      videoGoodSamplesRef.current = 0;
      videoBadSamplesRef.current = 0;
      lastVideoProfileChangeRef.current = now;
      if (videoAutoSuspendedRef.current) {
        // Reprise apres coupure reseau : reactive la video (intention utilisateur
        // toujours vraie, videoEnabled est reste true).
        resumeVideoRef.current?.();
      } else if (videoActiveRef.current) {
        // Video active mais degradee : remonte d'un palier.
        const idx = order.indexOf(videoProfileRef.current);
        if (idx < order.length - 1) {
          const target = order[idx + 1];
          videoProfileRef.current = target;
          setVideoProfileState(target);
          applyVideoConstraintsRef.current?.(target);
        }
      }
    }
  }, []);

  /** Mesure la qualite et rapporte le mode de connexion (p2p vs relay). */
  const collectStats = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    let stats;
    try { stats = await pc.getStats(); } catch { return; }

    let rtt = null, jitter = null, lost = 0, received = 0;
    let localType = null, remoteType = null, availableBitrate = null;
    // Lecture seule, pour affichage debug (Ticket 6) : n'influence jamais le
    // score ni adaptVideo (qui reste pilote par les stats AUDIO uniquement).
    let videoBitrateSent = null;

    stats.forEach((report) => {
      if (report.type === "inbound-rtp" && report.kind === "audio") {
        jitter = report.jitter != null ? report.jitter * 1000 : jitter;
        lost = report.packetsLost ?? 0;
        received = report.packetsReceived ?? 0;
      }
      if (report.type === "outbound-rtp" && report.kind === "video") {
        if (report.targetBitrate != null) videoBitrateSent = report.targetBitrate;
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
      videoBitrateSent: videoBitrateSent != null ? Math.round(videoBitrateSent) : null,
    };
    qualityRef.current = nextQuality;
    setQuality(nextQuality);

    if (AUTO_ULTRA_FALLBACK) {
      if (ultraModeRef.current === "off" && !ultraAutoAttemptedRef.current) {
        // Ne reinitialise le compteur que sur une bonne mesure (score 3) : un
        // reseau instable qui oscille Faible/Moyenne reste globalement mauvais
        // et ne doit pas empecher indefiniment le declenchement d'Ultra.
        ultraAutoBadSamplesRef.current = score === 1
          ? ultraAutoBadSamplesRef.current + 1
          : score === 3
            ? 0
            : ultraAutoBadSamplesRef.current;
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
    // Video decidee APRES l'audio (ordre important) : adaptVideo lit
    // profileRef.current pour appliquer la priorite audio>video (coupure video
    // acceleree quand l'audio est deja au plancher). Meme score que l'audio, pas
    // de score video separe (decision explicite du plan section 4).
    adaptVideo(score);
  }, [socket, adaptProfile, adaptVideo]);

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
      offer.sdp = applyVideoProfile(offer.sdp, videoProfileRef.current, videoDirectionRef.current);
      await pc.setLocalDescription(offer);
      socket?.emit("call:signal", {
        callId: callIdRef.current,
        signal: { type: "offer", sdp: offer.sdp },
      });
    } catch { /* la connexion se fermera d'elle-meme si l'echec persiste */ }
  }, [socket]);

  /**
   * Primitive UNIQUE de renegociation SDP legere (sans relance ICE).
   *
   * Sert a la fois aux changements de profil audio Opus ET aux changements de
   * direction/plafond video : une seule offre, un seul chemin, pas de flot
   * parallele. Le chemin reseau reste inchange (contrairement a
   * attemptIceRestart) — un iceRestart couterait plusieurs secondes de collecte
   * de candidats, inacceptable en 2G, et couperait l'audio pour rien.
   *
   * Contrainte structurelle (comme l'audio) : seul l'appelant reoffre, et il
   * faut signalingState === "stable". La renegociation video ne declenche donc
   * jamais d'ICE restart, l'audio n'est pas interrompu.
   */
  const renegotiate = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !isCallerRef.current) return; // seul l'appelant reoffre
    if (pc.signalingState !== "stable") return; // negociation deja en cours

    try {
      const offer = await pc.createOffer();
      offer.sdp = applyOpusProfile(offer.sdp, profileRef.current);
      offer.sdp = applyVideoProfile(offer.sdp, videoProfileRef.current, videoDirectionRef.current);
      await pc.setLocalDescription(offer);
      socket?.emit("call:signal", {
        callId: callIdRef.current,
        signal: { type: "offer", sdp: offer.sdp },
      });
    } catch { /* on garde l'etat courant, l'appel continue */ }
  }, [socket]);

  // Conserve renegotiateProfile comme alias historique (call sites audio) :
  // meme primitive, evite un renommage massif des appelants.
  const renegotiateProfile = renegotiate;

  // Branche l'indirection utilisee par adaptProfile (defini plus haut).
  useEffect(() => {
    renegotiateRef.current = renegotiate;
  }, [renegotiate]);

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

  /**
   * Coupe le RTP WebRTC sortant et bascule l'affichage local sur Ultra.
   * N'est appele qu'une fois les DEUX cotes confirmes prets (cf startUltra) :
   * sinon le premier a couper son RTP laisse l'autre sans audio pendant que
   * son propre transport demarre encore.
   */
  const engageUltra = useCallback(async () => {
    const pending = ultraPendingRef.current;
    if (!pending || ultraRef.current) return;
    ultraPendingRef.current = null;
    const { senderStates, engine, transport } = pending;
    for (const { sender } of senderStates) await sender.replaceTrack(null).catch(() => {});
    ultraRef.current = { engine, transport, senders: senderStates };
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    updateUltraMode("active");
  }, [updateUltraMode]);

  /** Prepare le prototype Codec2 full-duplex sans detruire l'appel WebRTC. */
  const startUltra = useCallback(async () => {
    if (state !== CALL_STATE.ACTIVE || !socket?.connected || !callIdRef.current) return;
    if (ultraRef.current || ultraPendingRef.current || ultraModeRef.current === "starting") return;

    const attempt = ++ultraAttemptRef.current;
    updateUltraMode("starting");
    setUltraError(null);
    ultraPeerReadyRef.current = false;
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

      // Le micro reste vivant pour l'AudioWorklet; le RTP n'est coupe qu'une
      // fois l'autre cote confirme pret (cf engageUltra / call:ultra:go).
      engine = await createCodec2AudioEngine(stream, {
        onFrame: (frame) => transport?.sendFrame(frame),
        onState: (event) => {
          if (event.type === "error") {
            teardownUltra({ notify: true });
            updateUltraMode("error");
            setUltraError(event.message || "Erreur moteur audio Codec2");
            console.error("[Ultra] audio engine error (post-init)", event);
          }
        },
      });
      if (attempt !== ultraAttemptRef.current) throw new Error("Initialisation Ultra annulee");
      transport = createCodec2Transport(socket, callIdRef.current, {
        onFrame: (frame) => engine.sendFrame(frame),
      });
      if (attempt !== ultraAttemptRef.current) throw new Error("Initialisation Ultra annulee");

      ultraPendingRef.current = { senderStates, engine, transport };
      socket.emit("call:ultra:go", { callId: callIdRef.current });
      if (ultraPeerReadyRef.current) await engageUltra();
    } catch (error) {
      ultraPendingRef.current = null;
      transport?.close();
      if (engine) await engine.close().catch(() => { /* nettoyage best-effort */ });
      if (attempt !== ultraAttemptRef.current) return;
      updateUltraMode("error");
      setUltraError(error?.message || String(error));
      console.warn("Codec2 Ultra indisponible", error);
    }
  }, [state, socket, ensureLocalStream, teardownUltra, updateUltraMode, engageUltra]);

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

    // Transceiver video pose SYSTEMATIQUEMENT des la creation, meme camera
    // inactive. Choix retenu (vs ajout tardif au moment du toggle) : negocier le
    // m=video une seule fois a l'offre initiale donne une structure SDP stable
    // et evite une renegociation "ajout de m-line" en cours d'appel, fragile sur
    // Safari / anciens Chromium mobiles africains cibles. Activer/desactiver =
    // changer direction + replaceTrack, sans jamais modifier le nombre de m-lines.
    const videoTransceiver = pc.addTransceiver("video", { direction: "inactive" });
    videoTransceiverRef.current = videoTransceiver;

    // Ré-attache l'etat video courant dans ce (nouveau) PC : indispensable pour
    // que restartWithRelay/attemptIceRestart preservent la video active a
    // travers une recreation du PC, exactement comme l'audio ci-dessus.
    if (videoActiveRef.current && localVideoStreamRef.current) {
      const vtrack = localVideoStreamRef.current.getVideoTracks()[0];
      if (vtrack) {
        try {
          await videoTransceiver.sender.replaceTrack(vtrack);
          videoTransceiver.direction = "sendrecv";
          videoDirectionRef.current = "sendrecv";
        } catch { /* le PC se refermera de lui-meme si l'echec persiste */ }
      }
    } else {
      videoDirectionRef.current = "inactive";
    }

    pc.onicecandidate = (evt) => {
      if (!evt.candidate || !callIdRef.current) return;
      // Trickle ICE : envoi au fil de l'eau, l'appel s'etablit plus vite.
      socket?.emit("call:signal", {
        callId: callIdRef.current,
        signal: { type: "candidate", candidate: evt.candidate.toJSON() },
      });
    };

    pc.ontrack = (evt) => {
      // On distingue video et audio pour garder deux MediaStream distincts cote
      // reception : vider le flux video (repli reseau, ontrack jamais recu) ne
      // doit jamais toucher a l'audio.
      if (evt.track.kind === "video") {
        // Flux video distant separe. Un <video> dedie (remoteVideoRef) l'affiche
        // dans CallUI. On garde une reference propre au track video pour pouvoir
        // vider srcObject sans casser l'audio.
        const vstream = evt.streams[0] || new MediaStream([evt.track]);
        remoteVideoStreamRef.current = vstream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = vstream;
          remoteVideoRef.current.play?.().catch(() => { /* autoplay bloque */ });
        }
        // Le track distant est "mute" tant qu'aucune image n'arrive (direction
        // inactive/recvonly cote pair) et "unmute" quand la video coule : on
        // pilote l'affichage du <video> distant la-dessus plutot que sur l'etat
        // d'envoi LOCAL (videoActive). Le badge "pair sans camera" = Ticket 6.
        setRemoteVideoActive(!evt.track.muted);
        evt.track.onunmute = () => setRemoteVideoActive(true);
        evt.track.onmute = () => setRemoteVideoActive(false);
        evt.track.onended = () => setRemoteVideoActive(false);
        return;
      }
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

      // Degradation video forcee a l'entree en mode relay (Ticket 5) : le relais
      // TURN coute cher en bande passante serveur, on ne le charge pas de video
      // HD des la reconnexion. On repart au palier minimal ; si la video etait
      // deja au plancher minimal, on la coupe (auto-suspend reseau) — l'audio
      // reste prioritaire sur le lien relaye. On reinitialise les compteurs de
      // remontee pour que la video ne remonte pas trop vite apres le relay.
      if (videoEnabledRef.current && videoActiveRef.current) {
        if (videoProfileRef.current === "minimal") {
          // Deja au plancher : coupure. Le PC recree ne reattachera pas la video
          // (videoActiveRef=false), l'offre partira donc en m=video inactive.
          const vtrack = localVideoStreamRef.current?.getVideoTracks()[0];
          if (vtrack) vtrack.enabled = false; // pas stop() -> reprise instantanee
          videoActiveRef.current = false;
          videoAutoSuspendedRef.current = true;
          videoDirectionRef.current = "inactive";
          setVideoActive(false);
          setVideoAutoSuspended(true);
          socket?.emit("call:video:state", { callId: id, active: false, reason: "network" });
        } else {
          videoProfileRef.current = "minimal";
          setVideoProfileState("minimal");
        }
      }
      videoGoodSamplesRef.current = 0;
      videoBadSamplesRef.current = 0;
      lastVideoProfileChangeRef.current = Date.now();

      // createPeerConnection re-pose le transceiver video et, si videoActiveRef
      // est vrai, ré-attache le track + direction sendrecv (etat video preserve
      // a travers le restart, au palier minimal force ci-dessus).
      const pc = await createPeerConnection(true);
      // Applique le plafond minimal cote encodeur sur le nouveau sender (si la
      // video est restee active mais degradee a minimal). Via la ref indirection
      // (applyVideoConstraints est defini plus bas, evite un TDZ dans les deps).
      if (videoActiveRef.current) await applyVideoConstraintsRef.current?.(videoProfileRef.current);
      const offer = await pc.createOffer();
      offer.sdp = applyOpusProfile(offer.sdp, profileRef.current);
      offer.sdp = applyVideoProfile(offer.sdp, videoProfileRef.current, videoDirectionRef.current);
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
   * Applique un palier video AU FIL DE L'EAU, sans renegociation SDP.
   *
   * Deux leviers complementaires (les deux necessaires) :
   *  - applyConstraints sur le track : reduit ce que la CAMERA capture (economie
   *    CPU sur les telephones bas de gamme cibles),
   *  - setParameters sur le sender : plafonne ce qui est ENCODE/envoye
   *    (economie de bande passante meme si la capture reste plus grande).
   *
   * setParameters s'applique sans interruption : contrairement au changement de
   * DIRECTION (sendrecv <-> inactive), un changement de palier resolution/bitrate
   * ne necessite JAMAIS de renegociation SDP.
   */
  const applyVideoConstraints = useCallback(async (profileName) => {
    const p = VIDEO_PROFILES[profileName] ?? VIDEO_PROFILES.low;
    const track = localVideoStreamRef.current?.getVideoTracks()[0];
    if (track && p.width > 0) {
      try {
        await track.applyConstraints({
          width: { ideal: p.width },
          height: { ideal: p.height },
          frameRate: { ideal: p.fps, max: p.fps },
        });
      } catch { /* la camera peut refuser certaines contraintes : best-effort */ }
    }
    const sender = videoTransceiverRef.current?.sender;
    if (sender && sender.setParameters && sender.getParameters) {
      try {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
        params.encodings[0].maxBitrate = p.maxBitrate || undefined;
        params.encodings[0].maxFramerate = p.fps || undefined;
        // Downscale cote encodeur en complement d'applyConstraints (certains
        // navigateurs ne re-negocient pas la resolution de capture a la volee).
        delete params.encodings[0].scaleResolutionDownBy;
        await sender.setParameters(params);
      } catch { /* setParameters best-effort */ }
    }
  }, []);

  /**
   * Coupe la video pour cause RESEAU (pas manuel) : la piste cesse d'etre
   * encodee/envoyee mais N'EST PAS stoppee (track.stop) — elle est seulement
   * desactivee (track.enabled=false) + direction inactive. Cela permet une
   * reprise INSTANTANEE (resumeVideoFromNetwork) sans re-demander la permission
   * camera ni rouvrir le device (couteux, source de flicker).
   *
   * videoEnabled RESTE true (intention utilisateur inchangee) ; on distingue cet
   * etat via videoAutoSuspended=true. Un event call:video:state reason="network"
   * previent le pair pour l'affichage distant (Ticket 6).
   */
  const suspendVideoForNetwork = useCallback(() => {
    if (!videoActiveRef.current) return;
    const track = localVideoStreamRef.current?.getVideoTracks()[0];
    if (track) track.enabled = false; // desactive, PAS stop() -> reprise instantanee
    const sender = videoTransceiverRef.current?.sender;
    if (sender) {
      // La piste reste attachee au sender (pour reprise rapide) mais la direction
      // inactive coupe l'encodage/envoi RTP.
      sender.replaceTrack(null).catch(() => { /* PC deja fermee */ });
    }
    if (videoTransceiverRef.current) {
      try { videoTransceiverRef.current.direction = "inactive"; } catch { /* ignore */ }
    }
    videoDirectionRef.current = "inactive";
    videoActiveRef.current = false;
    videoAutoSuspendedRef.current = true;
    setVideoActive(false);
    setVideoAutoSuspended(true);
    // Changement de direction = renegociation SDP legere (jamais d'ICE restart).
    renegotiate();
    socket?.emit("call:video:state", { callId: callIdRef.current, active: false, reason: "network" });
  }, [renegotiate, socket]);

  /**
   * Reactive la video apres une coupure RESEAU (symetrique de suspend). La piste
   * ayant seulement ete desactivee (pas stoppee), la reprise est instantanee :
   * track.enabled=true + direction sendrecv + renegociation. Si la piste a ete
   * perdue entre-temps, on la recapture via le mecanisme de toggleCamera.
   */
  const resumeVideoFromNetwork = useCallback(async () => {
    if (!videoEnabledRef.current) return; // securite : jamais contre l'intention
    let track = localVideoStreamRef.current?.getVideoTracks()[0];
    if (!track || track.readyState === "ended") {
      // Piste perdue : recapture via le meme chemin que toggleCamera.
      try {
        const stream = await getCameraStream();
        localVideoStreamRef.current = stream;
        track = stream.getVideoTracks()[0];
      } catch (err) {
        // Recapture impossible : on abandonne la reprise sans casser l'appel.
        setCameraError(cameraErrorMessage(err));
        return;
      }
    }
    if (!track) return;
    track.enabled = true;
    const sender = videoTransceiverRef.current?.sender;
    if (sender) {
      try { await sender.replaceTrack(track); } catch { /* PC deja fermee */ }
    }
    if (videoTransceiverRef.current) {
      try { videoTransceiverRef.current.direction = "sendrecv"; } catch { /* ignore */ }
    }
    videoDirectionRef.current = "sendrecv";
    await applyVideoConstraints(videoProfileRef.current);
    videoActiveRef.current = true;
    videoAutoSuspendedRef.current = false;
    setVideoActive(true);
    setVideoAutoSuspended(false);
    renegotiate();
    socket?.emit("call:video:state", { callId: callIdRef.current, active: true, reason: "network" });
  }, [applyVideoConstraints, renegotiate, socket]);

  /**
   * Ticket 7 (section 8.4) : suspend/reprend la video pour cause de mise en
   * ARRIERE-PLAN (visibilitychange), pas reseau. Meme mecanique que
   * suspend/resumeVideoForNetwork (track.enabled=false + direction inactive,
   * jamais track.stop(), reprise instantanee) mais SANS toucher a
   * videoAutoSuspended[Ref] : cet etat reste reserve a adaptVideo (Ticket 5)
   * pour ne pas confondre les deux causes de suspension dans l'UI/signaling
   * (badge "reseau insuffisant" serait trompeur pour une simple mise en
   * arriere-plan).
   */
  const suspendVideoForVisibility = useCallback(() => {
    if (!videoActiveRef.current) return;
    const track = localVideoStreamRef.current?.getVideoTracks()[0];
    if (track) track.enabled = false; // desactive, PAS stop() -> reprise instantanee
    const sender = videoTransceiverRef.current?.sender;
    if (sender) {
      sender.replaceTrack(null).catch(() => { /* PC deja fermee */ });
    }
    if (videoTransceiverRef.current) {
      try { videoTransceiverRef.current.direction = "inactive"; } catch { /* ignore */ }
    }
    videoDirectionRef.current = "inactive";
    videoActiveRef.current = false;
    setVideoActive(false);
    // Renegociation legere (jamais d'ICE restart), comme pour le repli reseau.
    renegotiate();
    socket?.emit("call:video:state", { callId: callIdRef.current, active: false, reason: "background" });
  }, [renegotiate, socket]);

  const resumeVideoFromVisibility = useCallback(async () => {
    if (!videoEnabledRef.current) return; // securite : jamais contre l'intention
    let track = localVideoStreamRef.current?.getVideoTracks()[0];
    if (!track || track.readyState === "ended") {
      try {
        const stream = await getCameraStream();
        localVideoStreamRef.current = stream;
        track = stream.getVideoTracks()[0];
      } catch (err) {
        setCameraError(cameraErrorMessage(err));
        return;
      }
    }
    if (!track) return;
    track.enabled = true;
    const sender = videoTransceiverRef.current?.sender;
    if (sender) {
      try { await sender.replaceTrack(track); } catch { /* PC deja fermee */ }
    }
    if (videoTransceiverRef.current) {
      try { videoTransceiverRef.current.direction = "sendrecv"; } catch { /* ignore */ }
    }
    videoDirectionRef.current = "sendrecv";
    await applyVideoConstraints(videoProfileRef.current);
    videoActiveRef.current = true;
    setVideoActive(true);
    renegotiate();
    socket?.emit("call:video:state", { callId: callIdRef.current, active: true, reason: "background" });
  }, [applyVideoConstraints, renegotiate, socket]);

  // Branche les indirections utilisees par adaptVideo (defini plus haut, memoize
  // sans deps pour ne pas se re-creer a chaque render).
  useEffect(() => {
    applyVideoConstraintsRef.current = applyVideoConstraints;
    suspendVideoRef.current = suspendVideoForNetwork;
    resumeVideoRef.current = resumeVideoFromNetwork;
    suspendVideoForVisibilityRef.current = suspendVideoForVisibility;
    resumeVideoForVisibilityRef.current = resumeVideoFromVisibility;
  }, [
    applyVideoConstraints,
    suspendVideoForNetwork,
    resumeVideoFromNetwork,
    suspendVideoForVisibility,
    resumeVideoFromVisibility,
  ]);

  /**
   * Active/desactive la camera locale ET la branche au RTCPeerConnection.
   *
   * Un echec de capture ne doit JAMAIS faire echouer l'appel audio en cours :
   * seul cameraError est mis a jour, videoEnabled/videoActive retombent a false.
   * La renegociation video (changement de direction) n'entraine aucun ICE
   * restart et n'interrompt donc jamais l'audio.
   *
   * Ticket 7 (section 8.5) : un double-clic rapide (toggle ON puis OFF avant que
   * la premiere capture/renegociation soit terminee) est ignore silencieusement
   * via videoToggleInFlightRef, plutot que de laisser deux getUserMedia/
   * renegociations se chevaucher et corrompre l'etat.
   */
  const toggleCamera = useCallback(async () => {
    if (videoToggleInFlightRef.current) return;
    videoToggleInFlightRef.current = true;

    // Toute action manuelle "gagne" sur une decision auto (Ticket 5) : on
    // reinitialise les compteurs/cooldown video pour ne pas etre contredit juste
    // apres par une renegociation reseau-driven.
    videoGoodSamplesRef.current = 0;
    videoBadSamplesRef.current = 0;
    lastVideoProfileChangeRef.current = Date.now();
    // Une action manuelle explicite prime aussi sur une suspension de visibilite
    // en cours (cas limite : l'utilisateur toggle pendant que l'app est encore
    // en train de gerer un retour de visibilite) - evite une reprise auto
    // fantome au prochain visibilitychange.
    videoSuspendedByVisibilityRef.current = false;

    try {
      if (videoEnabled) {
        // Coupure manuelle : on arrete reellement la piste (voyant camera eteint),
        // contrairement a une future coupure auto reseau (Ticket 5) qui ne fera que
        // desactiver la piste pour une reprise instantanee.
        const sender = videoTransceiverRef.current?.sender;
        if (sender) {
          try { await sender.replaceTrack(null); } catch { /* PC deja fermee */ }
        }
        if (videoTransceiverRef.current) {
          try { videoTransceiverRef.current.direction = "inactive"; } catch { /* ignore */ }
        }
        videoDirectionRef.current = "inactive";
        if (localVideoStreamRef.current) {
          for (const track of localVideoStreamRef.current.getTracks()) {
            try { track.stop(); } catch { /* ignore */ }
          }
          localVideoStreamRef.current = null;
        }
        videoActiveRef.current = false;
        videoEnabledRef.current = false;
        videoAutoSuspendedRef.current = false;
        setVideoEnabled(false);
        setVideoActive(false);
        setVideoAutoSuspended(false);
        setCameraError(null);
        // Renegocie pour passer la m=video a inactive (seul l'appelant reoffre).
        renegotiate();
        socket?.emit("call:video:state", { callId: callIdRef.current, active: false, reason: "manual" });
        return;
      }

      setCameraLoading(true);
      setCameraError(null);
      try {
        const stream = await getCameraStream();
        localVideoStreamRef.current = stream;
        videoProfileRef.current = detectInitialVideoProfile();
        setVideoProfileState(videoProfileRef.current);
        videoActiveRef.current = true;
        videoEnabledRef.current = true;
        videoAutoSuspendedRef.current = false;
        setVideoEnabled(true);
        setVideoActive(true);

        // Branche au PC si un appel est actif ; sinon on reste en preview locale
        // (comportement Ticket 2), le transceiver sera pose a la creation du PC.
        const sender = videoTransceiverRef.current?.sender;
        if (pcRef.current && sender) {
          const vtrack = stream.getVideoTracks()[0];
          if (vtrack) {
            await sender.replaceTrack(vtrack);
            try { videoTransceiverRef.current.direction = "sendrecv"; } catch { /* ignore */ }
            videoDirectionRef.current = "sendrecv";
            await applyVideoConstraints(videoProfileRef.current);
            if (isCallerRef.current) {
              renegotiate();
            } else {
              // L'appele ne peut pas emettre d'offre lui-meme : il demande a
              // l'appelant de renegocier (celui-ci verra son transceiver video
              // deja en sendrecv/recvonly cote SDP recu et reoffrira en consequence).
              socket?.emit("call:video:request", { callId: callIdRef.current });
            }
            socket?.emit("call:video:state", { callId: callIdRef.current, active: true, reason: "manual" });
          }
        }
      } catch (err) {
        // Repli silencieux : la camera echoue sans jamais toucher a l'appel audio.
        setCameraError(cameraErrorMessage(err));
        videoActiveRef.current = false;
        videoEnabledRef.current = false;
        videoAutoSuspendedRef.current = false;
        videoDirectionRef.current = "inactive";
        setVideoEnabled(false);
        setVideoActive(false);
      } finally {
        setCameraLoading(false);
      }
    } finally {
      videoToggleInFlightRef.current = false;
    }
  }, [videoEnabled, applyVideoConstraints, renegotiate, socket]);

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
        offer.sdp = applyVideoProfile(offer.sdp, videoProfileRef.current, videoDirectionRef.current);
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
          // direction = null : on NE force PAS la direction sur la reponse (elle
          // est deja correctement derivee de l'offre par le navigateur ; la
          // reecrire casserait la reception cote appele). On pose seulement le
          // plafond b=* selon le palier.
          answer.sdp = applyVideoProfile(answer.sdp, videoProfileRef.current, null);
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

    // L'autre participant a son encodeur Codec2 pret. On ne coupe le RTP
    // sortant que lorsque les deux cotes se sont mutuellement confirmes :
    // sinon celui qui coupe en premier laisse l'autre sans audio pendant
    // que son propre transport demarre encore (cf startUltra/engageUltra).
    const onUltraGo = ({ callId: id }) => {
      if (callIdRef.current !== id) return;
      ultraPeerReadyRef.current = true;
      if (ultraPendingRef.current) engageUltra();
    };

    // L'appele a active sa camera et demande une renegociation : seul
    // l'appelant peut reoffrir. On ignore si on n'est pas l'appelant ou si
    // une negociation est deja en cours (renegotiate() verifie deja stable).
    const onVideoRequest = ({ callId: id }) => {
      if (callIdRef.current !== id || !isCallerRef.current) return;
      renegotiate();
    };

    // Etat video du peer distant (coupure/activation, manuelle ou reseau) :
    // pilote uniquement l'affichage (Ticket 6), aucune action WebRTC ici (la
    // direction SDP est deja vehiculee par call:signal).
    const onVideoState = ({ callId: id, active, reason }) => {
      if (callIdRef.current !== id) return;
      setRemoteVideoActive(Boolean(active));
      setRemoteVideoReason(reason === "network" ? "network" : "manual");
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

    // Le client Socket.IO retente indefiniment en arriere-plan
    // (reconnectionAttempts: Infinity, cf app.jsx). Le serveur laisse aussi un
    // delai de grace avant de raccrocher (cf DISCONNECT_GRACE_MS cote
    // gateway) : on s'aligne dessus plutot que de raccrocher immediatement,
    // pour survivre a une micro-coupure reseau pendant laquelle WebRTC/Ultra
    // continuent souvent de fonctionner en P2P sans le signaling.
    const onDisconnect = () => {
      if (!callIdRef.current) return;
      setReconnecting(true);
      clearTimeout(timersRef.current.disconnectGrace);
      timersRef.current.disconnectGrace = setTimeout(() => {
        if (callIdRef.current) endCall("timeout");
      }, DISCONNECT_GRACE_MS);
    };

    // Reconnexion Socket.IO : si un appel etait en cours, on le rattache au
    // nouveau socket cote serveur (call:rejoin) avant que le delai de grace
    // n'expire, plutot que de laisser le serveur raccrocher.
    const onConnect = () => {
      setReconnecting(false);
      clearTimeout(timersRef.current.disconnectGrace);
      delete timersRef.current.disconnectGrace;
      if (callIdRef.current) socket.emit("call:rejoin", { callId: callIdRef.current });
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:ringing", onRinging);
    socket.on("call:accepted", onAccepted);
    socket.on("call:signal", onSignal);
    socket.on("call:ultra:ready", onUltraReady);
    socket.on("call:ultra:go", onUltraGo);
    socket.on("call:ultra:stop", onUltraStop);
    socket.on("call:video:request", onVideoRequest);
    socket.on("call:video:state", onVideoState);
    socket.on("call:ended", onEnded);
    socket.on("call:failed", onFailed);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:ringing", onRinging);
      socket.off("call:accepted", onAccepted);
      socket.off("call:signal", onSignal);
      socket.off("call:ultra:ready", onUltraReady);
      socket.off("call:ultra:go", onUltraGo);
      socket.off("call:ultra:stop", onUltraStop);
      socket.off("call:video:request", onVideoRequest);
      socket.off("call:video:state", onVideoState);
      socket.off("call:ended", onEnded);
      socket.off("call:failed", onFailed);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
      clearTimeout(timersRef.current.disconnectGrace);
      delete timersRef.current.disconnectGrace;
    };
  }, [socket, state, startUltra, engageUltra, teardownUltra, createPeerConnection, flushPendingCandidates, cleanup, endCall, resetToIdle, renegotiate]);

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
  //
  // Ticket 7 (section 8.4) : etend le meme principe a la video. Sur "hidden",
  // si la video est active, on la desactive explicitement (track.enabled=false,
  // direction inactive, PAS de track.stop()) plutot que de laisser un
  // comportement incoherent selon les navigateurs mobiles (qui suspendent de
  // toute facon l'encodage camera en arriere-plan). On reutilise le meme
  // mecanisme que suspendVideoForNetwork/resumeVideoFromNetwork (Ticket 5) via
  // les refs indirectes, pour ne pas dupliquer la logique de renegociation.
  //
  // Distinction cause de suspension : videoSuspendedByVisibilityRef marque une
  // suspension causee par la mise en arriere-plan (annulee automatiquement au
  // retour "visible"). Si la video etait DEJA videoAutoSuspendedRef (coupure
  // reseau) AVANT la mise en arriere-plan, on ne la relance pas au retour de
  // visibilite - c'est adaptVideo (mesures reseau soutenues) qui doit la
  // relancer normalement, pas le simple retour de visibilite.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (ultraModeRef.current === "active" || ultraModeRef.current === "starting") {
          ultraAutoAttemptedRef.current = true;
          teardownUltra({ notify: true });
        }
        if (videoActiveRef.current && !videoAutoSuspendedRef.current) {
          videoSuspendedByVisibilityRef.current = true;
          suspendVideoForVisibilityRef.current?.();
        }
        return;
      }

      if (remoteAudioRef.current && remoteStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.play?.().catch(() => { /* autoplay deja bloque */ });
      }

      if (videoSuspendedByVisibilityRef.current) {
        videoSuspendedByVisibilityRef.current = false;
        // Ne relance que si l'intention utilisateur est toujours active et que
        // la coupure n'a pas ete "reclassee" reseau entre-temps (adaptVideo a
        // pu tourner pendant l'arriere-plan et positionner videoAutoSuspendedRef
        // lui-meme, auquel cas c'est a lui de gerer la remontee).
        if (videoEnabledRef.current && !videoAutoSuspendedRef.current) {
          resumeVideoForVisibilityRef.current?.();
        }
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
    ultraError,
    reconnecting,
    videoEnabled,
    videoActive,
    videoAutoSuspended,
    videoProfile,
    remoteVideoActive,
    remoteVideoReason,
    cameraError,
    cameraLoading,
    remoteAudioRef,
    localVideoStreamRef,
    remoteVideoRef,
    startCall,
    prepareMicrophone,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    changeProfile,
    startUltra,
    stopUltra,
    isActive: state !== CALL_STATE.IDLE,
  };
}

