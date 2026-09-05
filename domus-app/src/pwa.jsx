// Installation PWA — capte l'event beforeinstallprompt (Chrome/Edge) pour
// pouvoir déclencher l'invite d'installation depuis un bouton (ex: page login).
// iOS Safari ne déclenche jamais cet event : canInstall reste false, l'appelant
// doit alors afficher l'instruction "Partager → Sur l'écran d'accueil".
import { useEffect, useState, useCallback } from "react";

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);

  useEffect(() => {
    const h = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return false;
    deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice?.outcome === "accepted";
  }, [deferred]);

  return { canInstall: !!deferred, promptInstall };
}
