import { VIDEO_PROFILES } from "./videoTuning.js";

// Capture video, miroir de microphone.js. La video est un flux distinct du
// micro : elle doit pouvoir echouer (pas de camera, permission refusee) sans
// jamais faire echouer l'appel audio.

export function cameraErrorMessage(err) {
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return "Camera bloquee : ouvrez l'app en HTTPS";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Camera non supportee par ce navigateur";
  }

  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "Camera bloquee par le navigateur";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "Aucune camera disponible";
  if (name === "NotReadableError" || name === "TrackStartError") return "Camera deja utilisee ou inaccessible";
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") return "Reglage camera non supporte";
  return "Camera indisponible";
}

export async function getCameraStream(constraints) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("mediaDevices unavailable");
  }

  const profile = VIDEO_PROFILES.low;
  const videoConstraints = constraints || {
    width: { ideal: profile.width },
    height: { ideal: profile.height },
    frameRate: { ideal: profile.fps },
  };

  return navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
}
