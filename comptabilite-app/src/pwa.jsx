// Installation PWA — capte l'event beforeinstallprompt (Chrome/Edge, desktop
// et Android) pour pouvoir déclencher l'invite d'installation depuis un bouton
// (ex: page login). Safari (iOS et macOS) et Firefox ne déclenchent jamais cet
// event : canInstall reste false, manualHint indique quelle instruction
// manuelle afficher à la place ("Partager → Sur l'écran d'accueil" sur iOS,
// icône d'installation dans la barre d'adresse sur les autres).
import { useEffect, useState, useCallback } from "react";

function detectManualHint() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);
  if (isIOS) return "ios-safari";
  if (isSafari) return "desktop-safari";
  if (isFirefox) return "firefox";
  return null;
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [manualHint] = useState(detectManualHint);

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

  return { canInstall: !!deferred, promptInstall, manualHint };
}
