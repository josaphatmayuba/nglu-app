const LEGACY_API_SW_MIGRATION_KEY = "farmos:legacy-api-sw-cleaned:v1";

function isNativeApp() {
  return window.Capacitor?.isNativePlatform?.() === true || /^capacitor:\/\//.test(window.location?.protocol || "");
}

async function deleteLegacyApiCaches() {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => /farmos-api|api-farmos|farmos.*runtime|runtime.*farmos/i.test(key))
      .map((key) => caches.delete(key)),
  );
}

export async function cleanupLegacyFarmosApiServiceWorker() {
  if (typeof window === "undefined" || isNativeApp()) return false;
  if (!("serviceWorker" in navigator)) return false;

  try {
    if (localStorage.getItem(LEGACY_API_SW_MIGRATION_KEY) === "1") return false;
  } catch {
    return false;
  }

  const controller = navigator.serviceWorker.controller;
  if (!controller || !controller.scriptURL.includes("/farmos/")) {
    try { localStorage.setItem(LEGACY_API_SW_MIGRATION_KEY, "1"); } catch {}
    return false;
  }

  try {
    await deleteLegacyApiCaches();
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((reg) => reg.scope.includes("/farmos/"))
        .map((reg) => reg.unregister()),
    );
    localStorage.setItem(LEGACY_API_SW_MIGRATION_KEY, "1");
    window.location.reload();
    return true;
  } catch {
    try { localStorage.setItem(LEGACY_API_SW_MIGRATION_KEY, "1"); } catch {}
    return false;
  }
}
