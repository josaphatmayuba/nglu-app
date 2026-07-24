import { useEffect, useState } from "react";

let deferredPrompt = null;
let installed = false;
const listeners = new Set();

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    window.navigator?.standalone === true
  );
}

function snapshot() {
  return {
    canInstall: Boolean(deferredPrompt) && !installed,
    installed,
  };
}

function notify() {
  const state = snapshot();
  listeners.forEach((listener) => listener(state));
}

if (typeof window !== "undefined") {
  installed = isStandalone();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installed = isStandalone();
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });
}

export function usePwaInstallPrompt() {
  const [state, setState] = useState(snapshot);

  useEffect(() => {
    const update = (nextState) => setState(nextState);
    listeners.add(update);
    setState(snapshot());
    return () => listeners.delete(update);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    notify();

    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {
      // Chrome can reject if the prompt is no longer valid.
    }
  };

  return { ...state, install };
}
