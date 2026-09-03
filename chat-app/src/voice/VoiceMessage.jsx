import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Pause, Play } from "lucide-react";
import { api } from "../api.js";

// Lecteur d'un message vocal recu.
//
// Le fichier n'est telecharge qu'au premier clic sur "lire" : sur un forfait
// data limite, on ne consomme rien pour les vocaux que l'utilisateur n'ecoute
// pas. Une fois recupere, le blob est conserve pour les lectures suivantes.

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export function VoiceMessage({ messageId, durationSec, isMe }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const audioRef = useRef(null);
  const urlRef = useRef(null);

  // Libere l'objet URL au demontage : sinon le blob reste en memoire.
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const toggle = useCallback(async () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }

    if (!url) {
      setLoading(true);
      setFailed(false);
      try {
        const blobUrl = await api.voiceBlobUrl(messageId);
        urlRef.current = blobUrl;
        setUrl(blobUrl);
        setLoading(false);
        // Lecture lancee au prochain rendu, quand la source est en place.
        requestAnimationFrame(() => {
          audioRef.current?.play().then(() => setPlaying(true)).catch(() => setFailed(true));
        });
      } catch {
        setLoading(false);
        setFailed(true);
      }
      return;
    }

    audioRef.current?.play().then(() => setPlaying(true)).catch(() => setFailed(true));
  }, [playing, url, messageId]);

  const onTimeUpdate = () => {
    const el = audioRef.current;
    if (!el || !el.duration || !isFinite(el.duration)) return;
    setProgress((el.currentTime / el.duration) * 100);
  };

  const onEnded = () => {
    setPlaying(false);
    setProgress(0);
  };

  return (
    <div className={`voice-msg ${isMe ? "voice-me" : "voice-other"}`}>
      <button
        className="voice-play"
        onClick={toggle}
        disabled={loading}
        title={playing ? "Pause" : "Écouter"}
      >
        {loading ? <Loader2 size={16} className="spin" />
          : playing ? <Pause size={16} />
          : <Play size={16} />}
      </button>

      <div className="voice-body">
        <div className="voice-wave">
          <div className="voice-wave-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="voice-meta">
          <Mic size={11} />
          <span>{formatDuration(durationSec)}</span>
          {failed && <span className="voice-error">Lecture impossible</span>}
        </div>
      </div>

      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="none"
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          onPause={() => setPlaying(false)}
        />
      )}
    </div>
  );
}
