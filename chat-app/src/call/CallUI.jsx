import { useEffect, useRef } from "react";
import { Clock, Mic, MicOff, Phone, PhoneOff, Radio, Signal, SignalHigh, SignalLow, User, Video, VideoOff, Wifi } from "lucide-react";
import { CALL_STATE } from "./useCall.js";
import { VIDEO_PROFILE_LABELS } from "./videoTuning.js";

// Interface d'appel audio. Deux formes :
//  - overlay plein ecran pendant la sonnerie / la connexion
//  - barre compacte en haut du fil une fois l'appel actif

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Indicateur de qualite : 3 niveaux, plus un libelle explicite. */
function QualityBadge({ quality }) {
  if (!quality) return null;
  const Icon = quality.score === 3 ? SignalHigh : quality.score === 2 ? Signal : SignalLow;
  const cls = quality.score === 3 ? "q-good" : quality.score === 2 ? "q-fair" : "q-poor";

  return (
    <div className={`call-quality ${cls}`} title={
      [
        quality.rtt != null ? `Latence ${quality.rtt} ms` : null,
        quality.bitrate != null ? `Debit ${Math.round(quality.bitrate / 1000)} kbit/s` : null,
        `Perte ${quality.loss}%`,
        quality.jitter != null ? `Gigue ${quality.jitter} ms` : null,
        quality.relay ? "Via relais TURN" : "Connexion directe",
      ].filter(Boolean).join(" · ")
    }>
      <Icon size={15} />
      <span>{quality.label}</span>
    </div>
  );
}

export function CallUI({ call }) {
  const {
    state, peer, muted, quality, profile, ultraMode, ultraError, reconnecting, endMessage, durationSec,
    videoEnabled, videoActive, videoAutoSuspended, videoProfile,
    remoteVideoActive, remoteVideoReason,
    cameraError, cameraLoading, remoteAudioRef, localVideoStreamRef,
    remoteVideoRef,
    acceptCall, rejectCall, endCall, toggleMute, toggleCamera, startUltra, stopUltra,
  } = call;

  const localVideoRef = useRef(null);

  // Preview locale : attache/detache le MediaStream camera sur l'element
  // <video> monte en permanence (comme l'<audio> existant). Le flux distant est
  // attache directement via remoteVideoRef par useCall (pc.ontrack).
  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    el.srcObject = videoActive ? localVideoStreamRef.current : null;
  });

  // Libellés de consommation : rassure l'utilisateur sur l'usage de données,
  // qui est la première inquiétude sur un forfait mobile limité.
  const PROFILE_LABELS = {
    minimal: "Éco — ~6 Mo/h",
    low: "Normal — ~9 Mo/h",
    standard: "Qualité — ~15 Mo/h",
  };

  // Repli reseau (pas un choix utilisateur) : intention video toujours vraie
  // mais piste reellement coupee. Distinct d'une coupure manuelle (videoEnabled
  // === false), qui n'affiche aucun badge — c'est le comportement attendu.
  const videoNetworkSuspended = videoEnabled && videoAutoSuspended && !videoActive;
  // Le pair n'a jamais recu de flux video (jamais active, ou coupe manuellement) :
  // placeholder statique et neutre, pas un cadre noir/erreur. Distinct d'une
  // coupure reseau distante (remoteVideoReason === "network"), affichee a part.
  const remoteVideoNetworkCut = !remoteVideoActive && remoteVideoReason === "network";

  if (state === CALL_STATE.IDLE) {
    // Les elements audio/video doivent rester montes : les detacher couperait
    // le flux en cours.
    return (
      <>
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />
        <video ref={localVideoRef} muted playsInline autoPlay className="call-video-local" style={{ display: "none" }} />
        <video ref={remoteVideoRef} playsInline autoPlay className="call-video-remote" style={{ display: "none" }} />
      </>
    );
  }

  const isRingingIn = state === CALL_STATE.RINGING_IN;
  const isRingingOut = state === CALL_STATE.RINGING_OUT;
  const isConnecting = state === CALL_STATE.CONNECTING;
  const isActive = state === CALL_STATE.ACTIVE;
  const isEnded = state === CALL_STATE.ENDED;

  // Barre compacte : l'utilisateur garde acces au fil pendant l'appel.
  if (isActive) {
    return (
      <>
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />
        <video
          ref={localVideoRef}
          muted
          playsInline
          autoPlay
          className="call-video-local"
          style={{ display: videoActive ? "block" : "none" }}
        />
        {videoNetworkSuspended && (
          <div className="call-video-local-suspended" title="Caméra en attente — le réseau est trop faible">
            <Clock size={16} />
          </div>
        )}
        <video
          ref={remoteVideoRef}
          playsInline
          autoPlay
          className="call-video-remote"
          style={{ display: remoteVideoActive ? "block" : "none" }}
        />
        {!remoteVideoActive && (
          <div className="call-video-remote-placeholder">
            <User size={22} />
            <span>
              {remoteVideoNetworkCut
                ? "Vidéo de l'autre coupée — réseau"
                : "L'autre personne n'a pas activé sa caméra"}
            </span>
          </div>
        )}
        <div className="call-bar">
          <div className="call-bar-info">
            <span className="call-bar-dot" />
            <span className="call-bar-name">{peer?.name || "Appel"}</span>
            <span className="call-bar-time">{formatDuration(durationSec)}</span>
            <QualityBadge quality={quality} />
          </div>
          {profile && (
            <span className="call-bar-profile" title="Qualité ajustée automatiquement selon le réseau">
              {PROFILE_LABELS[profile] ?? profile}
            </span>
          )}
          {videoActive && (
            <span className="call-bar-profile" title="Qualité vidéo ajustée automatiquement selon le réseau">
              {VIDEO_PROFILE_LABELS[videoProfile] ?? videoProfile}
            </span>
          )}
          {reconnecting ? (
            <span className="call-bar-warn">Reconnexion en cours…</span>
          ) : ultraMode === "error" ? (
            <span className="call-bar-warn" title={ultraError || undefined}>
              Mode économie extrême indisponible{ultraError ? ` — ${ultraError}` : ""}
            </span>
          ) : cameraError ? (
            <span className="call-bar-warn">{cameraError}</span>
          ) : videoNetworkSuspended ? (
            <span className="call-bar-warn">Vidéo coupée — réseau insuffisant</span>
          ) : remoteVideoNetworkCut ? (
            <span className="call-bar-warn">Vidéo de l'autre coupée — réseau</span>
          ) : quality?.score === 1 && (
            <span className="call-bar-warn">Connexion faible — la voix peut se couper</span>
          )}
          <div className="call-bar-actions">
            {ultraMode === "active" && (
              <span className="call-bar-profile" title="Codec2 actif, environ 700 bit/s par direction">
                Ultra ~700 bit/s
              </span>
            )}
            <button
              className={`call-btn call-btn-ultra ${ultraMode === "active" ? "is-active" : ""}`}
              onClick={ultraMode === "active" ? stopUltra : startUltra}
              disabled={ultraMode === "starting"}
              title={ultraMode === "active" ? "Desactiver le mode Ultra" : "Activer le mode Ultra"}
            >
              <Radio size={17} />
            </button>
            <button
              className={`call-btn call-btn-video ${videoActive ? "is-active" : ""} ${videoNetworkSuspended ? "is-waiting" : ""}`}
              onClick={toggleCamera}
              disabled={cameraLoading}
              title={
                videoNetworkSuspended
                  ? "Caméra en attente — réseau insuffisant"
                  : videoEnabled ? "Désactiver la caméra" : "Activer la caméra"
              }
            >
              {videoNetworkSuspended ? <Clock size={17} /> : videoEnabled ? <Video size={17} /> : <VideoOff size={17} />}
            </button>
            <button
              className={`call-btn call-btn-mute ${muted ? "is-muted" : ""}`}
              onClick={toggleMute}
              title={muted ? "Réactiver le micro" : "Couper le micro"}
            >
              {muted ? <MicOff size={17} /> : <Mic size={17} />}
            </button>
            <button className="call-btn call-btn-end" onClick={() => endCall("hangup")} title="Raccrocher">
              <PhoneOff size={17} />
            </button>
          </div>
        </div>
      </>
    );
  }

  // Overlay : sonnerie, connexion, fin d'appel.
  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />
      <video ref={localVideoRef} muted playsInline autoPlay className="call-video-local" style={{ display: "none" }} />
      <video ref={remoteVideoRef} playsInline autoPlay className="call-video-remote" style={{ display: "none" }} />
      <div className="call-overlay">
        <div className="call-card">
          <div className={`call-avatar ${isRingingIn ? "is-pulsing" : ""}`}>
            <Phone size={30} />
          </div>

          <div className="call-peer-name">{peer?.name || "Appel"}</div>

          <div className="call-status">
            {isRingingIn && "Appel entrant…"}
            {isRingingOut && "Sonnerie…"}
            {isConnecting && "Connexion en cours…"}
            {isEnded && (endMessage || "Appel terminé")}
          </div>

          {isConnecting && (
            <div className="call-hint">
              <Wifi size={13} />
              <span>Sur réseau lent, la connexion peut prendre jusqu’à 45 secondes.</span>
            </div>
          )}

          <div className="call-actions">
            {isRingingIn ? (
              <>
                <button className="call-btn call-btn-end lg" onClick={rejectCall} title="Refuser">
                  <PhoneOff size={22} />
                </button>
                <button className="call-btn call-btn-accept lg" onClick={acceptCall} title="Répondre">
                  <Phone size={22} />
                </button>
              </>
            ) : !isEnded ? (
              <button className="call-btn call-btn-end lg" onClick={() => endCall("hangup")} title="Annuler">
                <PhoneOff size={22} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
