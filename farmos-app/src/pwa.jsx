/* eslint-disable */
// Composants PWA : prompt d'installation + notification "nouvelle version".
import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function PwaUpdateBanner({ lang = "fr" }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, reg) {
      // Vérifie une nouvelle version toutes les heures.
      if (!reg) return;
      reg.update().catch(() => {});
      setInterval(() => reg.update().catch(() => {}), 60 * 1000);
    },
  });

  React.useEffect(() => {
    if (needRefresh) updateServiceWorker(true);
  }, [needRefresh, updateServiceWorker]);

  const close = () => { setNeedRefresh(false); setOfflineReady(false); };

  if (!needRefresh && !offlineReady) return null;
  return (
    <div style={{
      position: "fixed", bottom: 16, right: 16, zIndex: 9999,
      background: "var(--ink-900, #0E2418)", color: "var(--bone-50, #FBF8F2)",
      padding: "12px 14px", borderRadius: 10, maxWidth: 320, fontSize: 13,
      boxShadow: "0 8px 24px rgba(14,36,24,0.4)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {needRefresh ? (
        <>
          <strong style={{ fontSize: 13 }}>
            {lang === "fr" ? "Nouvelle version disponible" : "New version available"}
          </strong>
          <div style={{ opacity: 0.85 }}>
            {lang === "fr" ? "Recharge pour appliquer la mise à jour." : "Reload to apply the update."}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button onClick={() => updateServiceWorker(true)} style={btn(true)}>
              {lang === "fr" ? "Recharger" : "Reload"}
            </button>
            <button onClick={close} style={btn(false)}>
              {lang === "fr" ? "Plus tard" : "Later"}
            </button>
          </div>
        </>
      ) : (
        <>
          <strong style={{ fontSize: 13 }}>
            {lang === "fr" ? "Prêt pour le hors-ligne" : "Ready for offline"}
          </strong>
          <div style={{ opacity: 0.85 }}>
            {lang === "fr" ? "L'app peut maintenant s'ouvrir sans réseau." : "App can now open without network."}
          </div>
          <button onClick={close} style={{ ...btn(false), alignSelf: "flex-start" }}>OK</button>
        </>
      )}
    </div>
  );
}

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

// Hook réutilisable pour déclencher l'invite d'installation depuis un bouton
// custom (ex: page login), sans passer par la bannière PwaInstallBanner.
// Safari (iOS/macOS) et Firefox ne déclenchent jamais beforeinstallprompt :
// manualHint indique quelle instruction manuelle afficher à la place.
export function useInstallPrompt() {
  const [deferred, setDeferred] = React.useState(null);
  const [manualHint] = React.useState(detectManualHint);

  React.useEffect(() => {
    const h = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (!deferred) return false;
    deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice?.outcome === "accepted";
  }, [deferred]);

  return { canInstall: !!deferred, promptInstall, manualHint };
}

const btn = (primary) => ({
  background: primary ? "#D7AA45" : "transparent",
  color: primary ? "#0E2418" : "#ECF1EC",
  border: primary ? "0" : "1px solid rgba(236,241,236,0.3)",
  padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12,
});

// Banner "Installer FarmOS" qui apparaît quand le navigateur déclenche
// beforeinstallprompt (Chrome/Edge Android + desktop). iOS Safari montre
// rien — l'utilisateur doit faire "Partager → Sur l'écran d'accueil".
export function PwaInstallBanner({ lang = "fr" }) {
  const [deferred, setDeferred] = React.useState(null);
  const [dismissed, setDismissed] = React.useState(() => {
    try { return localStorage.getItem("farmos-install-dismissed") === "1"; } catch { return false; }
  });

  React.useEffect(() => {
    const h = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (!deferred || dismissed) return null;

  const install = async () => {
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };
  const close = () => {
    setDismissed(true);
    try { localStorage.setItem("farmos-install-dismissed", "1"); } catch {}
  };

  return (
    <div style={{
      position: "fixed", bottom: 16, left: 16, zIndex: 9998,
      background: "var(--paper, #FBF8F2)", color: "var(--ink-900, #0E2418)",
      padding: "12px 14px", borderRadius: 10, maxWidth: 320, fontSize: 13,
      boxShadow: "0 8px 24px rgba(14,36,24,0.25)", border: "1px solid var(--border-2, #d8c8a8)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <strong style={{ fontSize: 13 }}>
        {lang === "fr" ? "Installer FarmOS ?" : "Install FarmOS?"}
      </strong>
      <div style={{ fontSize: 12, opacity: 0.85 }}>
        {lang === "fr"
          ? "Ajoute l'app à ton écran d'accueil pour un accès rapide et hors-ligne."
          : "Add the app to your home screen for quick offline access."}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={install} style={btn(true)}>
          {lang === "fr" ? "Installer" : "Install"}
        </button>
        <button onClick={close} style={btn(false)}>
          {lang === "fr" ? "Non merci" : "No thanks"}
        </button>
      </div>
    </div>
  );
}
