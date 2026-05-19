// SCRUM-74: Dark mode hook
// Manages the `dark` class on <html>, persists in localStorage,
// and syncs across all hook consumers via a custom DOM event.

import { useEffect, useState } from "react";

const STORAGE_KEY = "crm-dark-mode";
const SYNC_EVENT = "crm-darkmode-change";

function applyDarkClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Apply on mount and whenever isDark changes
  useEffect(() => {
    applyDarkClass(isDark);
  }, [isDark]);

  // Sync when another component toggles the mode
  useEffect(() => {
    const handler = (e) => setIsDark(e.detail);
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);

  const toggle = () => {
    const next = !isDark;
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch { /* ignore quota */ }
    applyDarkClass(next);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: next }));
    setIsDark(next);
  };

  return { isDark, toggle };
}
