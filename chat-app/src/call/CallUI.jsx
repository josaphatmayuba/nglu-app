import { Mic, MicOff, Phone, PhoneOff, Radio, Signal, SignalHigh, SignalLow, Wifi } from "lucide-react";
import { CALL_STATE } from "./useCall.js";

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
    state, peer, muted, quality, profile, ultraMode, endMessage, durationSec,
    remoteAudioRef, acceptCall, rejectCall, endCall, toggleMute, startUltra, stopUltra,
  } = call;

  // Libellés de consommation : rassure l'utilisateur sur l'usage de données,
  // qui est la première inquiétude sur un forfait mobile limité.
  const PROFILE_LABELS = {
    minimal: "Éco — ~6 Mo/h",
    low: "Normal — ~9 Mo/h",
    standard: "Qualité — ~15 Mo/h",
  };

  if (state === CALL_STATE.IDLE) {
    // L'element audio doit rester monte : le detacher couperait le son en cours.
    return <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />;
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
          {quality?.score === 1 && (
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
