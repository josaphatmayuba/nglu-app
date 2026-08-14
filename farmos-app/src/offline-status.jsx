/* eslint-disable */
// Indicateur online/offline + bouton resync. À placer dans la topbar.
import React from "react";
import { Icon } from "./icons";
import { db } from "./offline-db";
import { listOutbox, discardMutation, retryMutation, processOutbox } from "./offline-outbox";

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

export function NetStatusPill({ lang = "fr", compact = false }) {
  const online = useOnline();
  const [lastSync, setLastSync] = React.useState(null);
  const [pending, setPending] = React.useState(0);
  const [panelOpen, setPanelOpen] = React.useState(false);
  React.useEffect(() => {
    const update = async () => {
      try {
        const meta = await db.meta.toArray();
        const max = meta.reduce((m, x) => Math.max(m, x.lastSyncedAt || 0), 0);
        setLastSync(max || null);
      } catch {}
    };
    const updateOutbox = async () => {
      try {
        const items = await listOutbox();
        setPending(items.filter((i) => i.status === "pending" || i.status === "syncing" || i.status === "error").length);
      } catch {}
    };
    update(); updateOutbox();
    window.addEventListener("farmos:cache-updated", update);
    window.addEventListener("farmos:outbox-changed", updateOutbox);
    return () => {
      window.removeEventListener("farmos:cache-updated", update);
      window.removeEventListener("farmos:outbox-changed", updateOutbox);
    };
  }, []);
  const ago = lastSync ? humanAgo(lastSync, lang) : (lang === "fr" ? "jamais" : "never");
  return (
    <>
      <button onClick={() => setPanelOpen(true)}
        title={(lang === "fr" ? "Dernière sync : " : "Last sync: ") + ago + (pending ? ` · ${pending} en attente` : "")}
        style={{
          display: "inline-flex", alignItems: "center", gap: compact ? 0 : 6, cursor: "pointer",
          background: !online ? "var(--oxblood-50, #f5e3e3)" : pending ? "var(--autorite-50, #f5edd2)" : "var(--solidite-50, #e7f0e3)",
          color: !online ? "var(--oxblood-800, #7a1f2b)" : pending ? "var(--autorite-900, #6a4a0a)" : "var(--solidite-800, #2a5e2a)",
          borderRadius: 999, padding: compact ? 0 : "4px 10px", width: compact ? 32 : undefined, height: compact ? 32 : undefined,
          justifyContent: compact ? "center" : undefined,
          fontSize: 11.5, fontWeight: 600,
          border: "1px solid currentColor", whiteSpace: "nowrap", flexShrink: 0,
        }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: "currentColor", flexShrink: 0 }}/>
        {!compact && (!online
          ? (lang === "fr" ? "Hors-ligne" : "Offline")
          : pending > 0
            ? (lang === "fr" ? `${pending} en attente` : `${pending} pending`)
            : (lang === "fr" ? `Sync · ${ago}` : `Sync · ${ago}`))}
      </button>
      <OutboxPanel lang={lang} open={panelOpen} onClose={() => setPanelOpen(false)}/>
    </>
  );
}

// Petit popover liste des mutations en attente (cliquable depuis la pill).
export function OutboxPanel({ lang = "fr", open, onClose }) {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    const refresh = () => listOutbox().then(setItems).catch(() => {});
    refresh();
    window.addEventListener("farmos:outbox-changed", refresh);
    return () => window.removeEventListener("farmos:outbox-changed", refresh);
  }, []);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(14,36,24,0.45)", zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper, #FBF8F2)", width: "min(420px,100vw)", height: "100%", overflow: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 18 }}>
            {lang === "fr" ? "Mutations en attente" : "Pending mutations"} ({items.length})
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-ghost"><Icon name="x" size={13} color="currentColor"/></button>
        </div>
        {items.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
            {lang === "fr" ? "Aucune action en attente. Tout est synchronisé." : "Nothing pending. All synced."}
          </div>
        ) : items.map((it) => {
          const color = it.status === "error" ? "var(--oxblood-700, #7a1f2b)" : it.status === "syncing" ? "var(--autorite-700, #8a6a1a)" : it.status === "done" ? "var(--solidite-700, #2a5e2a)" : "var(--fg-2)";
          const label = { pending: "⏱ en attente", syncing: "↻ sync…", done: "✓ envoyé", error: "⚠ échec" }[it.status] || it.status;
          return (
            <div key={it.id} style={{ border: `1px solid ${color}`, borderRadius: 8, padding: 10, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{it.kind}</strong>
                <span style={{ color }}>{lang === "fr" ? label : label}</span>
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>
                {it.method} {it.path} · {new Date(it.createdAt).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA")}
              </div>
              {it.lastError && (
                <div style={{ fontSize: 11, color: "var(--oxblood-700)", marginTop: 4, wordBreak: "break-word" }}>
                  {it.lastError}
                </div>
              )}
              {(it.status === "error" || it.status === "pending") && (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button className="btn btn-sm" onClick={() => retryMutation(it.id)}>
                    {lang === "fr" ? "Réessayer" : "Retry"}
                  </button>
                  <button className="btn btn-sm" onClick={() => discardMutation(it.id)}
                    style={{ color: "var(--oxblood-700)" }}>
                    {lang === "fr" ? "Supprimer" : "Discard"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <button className="btn btn-sm btn-primary" onClick={() => processOutbox()} disabled={!navigator.onLine}>
          <Icon name="sparkle" size={12} color="#ECF1EC"/>
          {lang === "fr" ? "Forcer la sync maintenant" : "Force sync now"}
        </button>
      </div>
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
