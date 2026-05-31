/* eslint-disable */
// Indicateur online/offline + bouton resync. À placer dans la topbar.
import React from "react";
import { Icon } from "./icons";
import { db } from "./offline-db";

export function useOnline() {
  const [online, setOnline] = React.useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  React.useEffect(() => {
    const up = () => setOnline(true);
    const dn = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", dn);
    };
  }, []);
  return online;
}

export function NetStatusPill({ lang = "fr" }) {
  const online = useOnline();
  const [lastSync, setLastSync] = React.useState(null);
  React.useEffect(() => {
    const update = async () => {
      try {
        const meta = await db.meta.toArray();
        const max = meta.reduce((m, x) => Math.max(m, x.lastSyncedAt || 0), 0);
        setLastSync(max || null);
      } catch {}
    };
    update();
    window.addEventListener("farmos:cache-updated", update);
    return () => window.removeEventListener("farmos:cache-updated", update);
  }, []);
  const ago = lastSync ? humanAgo(lastSync, lang) : (lang === "fr" ? "jamais" : "never");
  return (
    <div title={(lang === "fr" ? "Dernière sync : " : "Last sync: ") + ago}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: online ? "var(--solidite-50, #e7f0e3)" : "var(--oxblood-50, #f5e3e3)",
        color: online ? "var(--solidite-800, #2a5e2a)" : "var(--oxblood-800, #7a1f2b)",
        borderRadius: 999, padding: "4px 10px", fontSize: 11.5, fontWeight: 600,
        border: "1px solid currentColor", whiteSpace: "nowrap",
      }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: "currentColor" }}/>
      {online
        ? (lang === "fr" ? `Sync · ${ago}` : `Sync · ${ago}`)
        : (lang === "fr" ? "Hors-ligne" : "Offline")}
    </div>
  );
}

function humanAgo(ts, lang) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 30) return lang === "fr" ? "à l'instant" : "just now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return lang === "fr" ? `${d} j` : `${d}d`;
}
