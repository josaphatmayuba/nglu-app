import { AUDIO_CONSTRAINTS } from "./opusTuning.js";

export function microphoneErrorMessage(err) {
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return "Micro bloque: ouvrez l'app en HTTPS";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Micro non supporte par ce navigateur";
  }

  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "Micro bloque par le navigateur";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "Aucun micro disponible";
  if (name === "NotReadableError" || name === "TrackStartError") return "Micro deja utilise ou inaccessible";
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") return "Reglage micro non supporte";
  return "Micro indisponible";
}

export async function getMicrophoneStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("mediaDevices unavailable");
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: false,
    });
  } catch (err) {
    const name = err?.name || "";
    if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
      return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    throw err;
  }
}
