import { useEffect, useState } from "react";

const COOLDOWN_MS = 60_000;
const storageKey = (phone) => `nglu.smsCooldown.${phone || ""}`;

const readUntil = (phone) => {
  if (!phone) return 0;
  try {
    const v = sessionStorage.getItem(storageKey(phone));
    return v ? Number(v) || 0 : 0;
  } catch { return 0; }
};

export const useSmsCooldown = (phone) => {
  const [until, setUntil] = useState(() => readUntil(phone));

  useEffect(() => { setUntil(readUntil(phone)); }, [phone]);

  const remaining = Math.max(0, until - Date.now());
  useEffect(() => {
    if (remaining <= 0) return undefined;
    const id = setInterval(() => setUntil((u) => u), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const start = () => {
    const t = Date.now() + COOLDOWN_MS;
    setUntil(t);
    try { if (phone) sessionStorage.setItem(storageKey(phone), String(t)); } catch { /* ignore */ }
  };

  return { remainingSeconds: Math.ceil(remaining / 1000), start };
};
