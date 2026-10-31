// Domus — <img> pour un fichier protege par JWT. Charge le fichier via fetch +
// en-tete Authorization (jamais de token dans l'URL, cf. bug #35/#39) puis
// affiche un object URL local, revoque au demontage (useAuthenticatedImage).
// `path` = chemin API relatif (ex. `/properties/photos/12/file`).
import { useAuthenticatedImage } from "../useAuthenticatedImage.js";

export function AuthImg({ path, alt = "", ...rest }) {
  const { src } = useAuthenticatedImage(path || null);
  return <img src={src || undefined} alt={alt} {...rest} />;
}
