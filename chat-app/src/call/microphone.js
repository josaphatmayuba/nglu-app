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

  // Demande d'abord le micro avec les contraintes minimales. Certains
  // navigateurs accordent la permission mais refusent une contrainte audio
  // avancee au moment de getUserMedia(), ce qui masque la vraie demande.
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  const track = stream.getAudioTracks()[0];

  // Les optimisations sont facultatives : le micro reste utilisable si le
  // navigateur ne sait pas les appliquer.
  if (track?.applyConstraints) {
    try { await track.applyConstraints(AUDIO_CONSTRAINTS); } catch { /* garder le flux standard */ }
  }
  return stream;
}
