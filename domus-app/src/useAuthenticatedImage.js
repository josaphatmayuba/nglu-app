// Domus — apercu <img> pour un fichier protege par JWT (ReceiptField dans
// depenses.jsx / hypotheque.jsx). Le JWT ne doit jamais apparaitre dans l'URL
// (SCRUM-119) : on charge le fichier via fetch + en-tete Authorization, on
// cree un object URL local pour <img src>, et on le revoque au demontage /
// changement de chemin pour ne pas fuiter de memoire.
import { useEffect, useState } from "react";
import { api } from "./api.js";

/**
 * @param {string|null} path - chemin relatif (ex. `/property-expenses/42/receipt-file`), ou null pour ne rien charger.
 * @returns {{ src: string|null, loading: boolean, error: string|null }}
 */
export function useAuthenticatedImage(path) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let blobUrl = null;
    let cancelled = false;

    if (!path) {
      setSrc(null);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);
    api.fetchAuthenticatedBlob(path)
      .then((blob) => {
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);
        setSrc(blobUrl);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || String(e));
        setSrc(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [path]);

  return { src, loading, error };
}
