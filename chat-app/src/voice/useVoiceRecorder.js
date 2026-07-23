import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { AUDIO_CONSTRAINTS } from "../call/opusTuning.js";
import { enqueueVoice, listReady, markAttemptFailed, removeVoice } from "./voiceQueue.js";

// Enregistrement et envoi differe des messages vocaux.
//
// Complement de l'appel temps reel : quand le reseau ne permet pas d'etablir
// une connexion WebRTC (GPRS sature, coupures repetees), le vocal passe quand
// meme parce qu'il n'a aucune contrainte de temps. 30 s de parole = ~25 ko,
// envoyes par morceaux avec reprise automatique.

const MAX_DURATION_SEC = 180; // au-dela, le fichier devient lourd pour un lien 2G
const RETRY_TICK_MS = 20000;

/** Choisit le format le plus econome supporte par le navigateur. */
function pickMimeType() {
  const candidates = [
    "audio/webm;codecs=opus", // Chrome, Edge, Android
    "audio/ogg;codecs=opus", // Firefox
    "audio/mp4", // Safari / iOS
    "audio/webm",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return "";
}

export function useVoiceRecorder(discussionId, { onSent } = {}) {
  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const uploadingRef = useRef(false);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try { track.stop(); } catch { /* ignore */ }
      }
      streamRef.current = null;
    }
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  /**
   * Vide la file d'attente. Appele au montage, apres chaque enregistrement,
   * au retour de connexion et periodiquement.
   */
  const flushQueue = useCallback(async () => {
    if (uploadingRef.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    uploadingRef.current = true;
    try {
      const ready = await listReady();
      for (const item of ready) {
        try {
          const form = new FormData();
          const ext = (item.blob?.type || "").includes("ogg") ? "ogg"
            : (item.blob?.type || "").includes("mp4") ? "m4a" : "webm";
          form.append("file", item.blob, `voice-${item.id}.${ext}`);
          form.append("durationSec", String(item.durationSec ?? 0));

          await api.sendVoiceMessage(item.discussionId, form);
          await removeVoice(item.id);
          onSent?.(item.discussionId);
        } catch {
          // Echec reseau : on reprogramme, le message reste en file.
          await markAttemptFailed(item.id);
        }
      }
    } finally {
      uploadingRef.current = false;
      const remaining = await listReady().catch(() => []);
      setPendingCount(remaining.length);
    }
  }, [onSent]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: false,
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        // 12 kbps : voix intelligible, ~90 ko par minute. Compatible avec un
        // upload en GPRS sans monopoliser le lien.
        audioBitsPerSecond: 12000,
      });

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) chunksRef.current.push(evt.data);
      };

      recorder.onstop = async () => {
        const durationSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        chunksRef.current = [];
        stopTracks();

        if (blob.size > 0) {
          // Persiste AVANT toute tentative reseau : meme si l'app est fermee
          // dans la seconde, le message n'est pas perdu.
          await enqueueVoice({ discussionId, blob, durationSec });
          const pending = await listReady().catch(() => []);
          setPendingCount(pending.length);
          flushQueue();
        }
      };

      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(1000); // decoupe en morceaux d'1 s : rien n'est perdu si l'app crash
      setRecording(true);
      setElapsedSec(0);

      timerRef.current = setInterval(() => {
        const sec = Math.round((Date.now() - startedAtRef.current) / 1000);
        setElapsedSec(sec);
        if (sec >= MAX_DURATION_SEC) stopRecording();
      }, 1000);
    } catch {
      setError("Micro indisponible");
      stopTracks();
      setRecording(false);
    }
  }, [discussionId, flushQueue, stopTracks]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch { /* ignore */ }
    }
    recorderRef.current = null;
    setRecording(false);
    setElapsedSec(0);
  }, []);

  /** Abandonne l'enregistrement sans l'envoyer. */
  const cancelRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null; // court-circuite la mise en file
      try { recorder.stop(); } catch { /* ignore */ }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    stopTracks();
    setRecording(false);
    setElapsedSec(0);
  }, [stopTracks]);

  // Reprise automatique : au montage, au retour de connexion, et par intervalle.
  useEffect(() => {
    flushQueue();
    const onOnline = () => flushQueue();
    window.addEventListener("online", onOnline);
    const tick = setInterval(flushQueue, RETRY_TICK_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(tick);
    };
  }, [flushQueue]);

  useEffect(() => () => { cancelRecording(); }, [cancelRecording]);

  return {
    recording,
    elapsedSec,
    pendingCount,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    maxDurationSec: MAX_DURATION_SEC,
  };
}
