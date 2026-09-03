// Indicateur online/offline + panneau des mutations en attente — adapté de
// farmos-app/src/offline-status.jsx (même pattern), à placer dans la topbar.
import React from "react";
import { X, Sparkles } from "lucide-react";
import { db } from "./offline-db.js";
import { listOutbox, discardMutation, retryMutation, processOutbox } from "./offline-outbox.js";

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

export function NetStatusPill() {
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
    window.addEventListener("journal:cache-updated", update);
    window.addEventListener("journal:outbox-changed", updateOutbox);
    return () => {
      window.removeEventListener("journal:cache-updated", update);
      window.removeEventListener("journal:outbox-changed", updateOutbox);
    };
  }, []);
  const ago = lastSync ? humanAgo(lastSync) : "jamais";
  return (
    <>
      <button onClick={() => setPanelOpen(true)}
        title={`Dernière sync : ${ago}${pending ? ` · ${pending} en attente` : ""}`}
        className="rt-pill"
        style={{
          cursor: "pointer", border: "1px solid currentColor",
          background: !online ? "#fee2e2" : pending ? "#fef3c7" : "#dcfce7",
          color: !online ? "#991b1b" : pending ? "#92400e" : "#166534",
        }}>
        <span className="rt-dot" />
        {!online ? "Hors-ligne" : pending > 0 ? `${pending} en attente` : `Sync · ${ago}`}
      </button>
      <OutboxPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}

export function OutboxPanel({ open, onClose }) {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    const refresh = () => listOutbox().then(setItems).catch(() => {});
    refresh();
    window.addEventListener("journal:outbox-changed", refresh);
    return () => window.removeEventListener("journal:outbox-changed", refresh);
  }, []);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", width: "min(420px,100vw)", height: "100%", overflow: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Mutations en attente ({items.length})</h3>
          <button className="btn btn-ghost" onClick={onClose}><X size={13} /></button>
        </div>
        {items.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--ink-400, #6b6b6b)", fontSize: 13 }}>
            Aucune action en attente. Tout est synchronisé.
          </div>
        ) : items.map((it) => {
          const color = it.status === "error" ? "#991b1b" : it.status === "syncing" ? "#92400e" : it.status === "done" ? "#166534" : "#334155";
          const label = { pending: "⏱ en attente", syncing: "↻ sync…", done: "✓ envoyé", error: "⚠ échec" }[it.status] || it.status;
          return (
            <div key={it.id} style={{ border: `1px solid ${color}`, borderRadius: 8, padding: 10, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{it.kind}</strong>
                <span style={{ color }}>{label}</span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-400, #6b6b6b)", marginTop: 2, fontFamily: "ui-monospace,monospace" }}>
                {it.method} {it.path || it.rawUrl} · {new Date(it.createdAt).toLocaleString("fr-FR")}
              </div>
              {it.lastError && (
                <div style={{ fontSize: 11, color: "#991b1b", marginTop: 4, wordBreak: "break-word" }}>
                  {it.lastError}
                </div>
              )}
              {(it.status === "error" || it.status === "pending") && (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button className="btn btn-sm" onClick={() => retryMutation(it.id)}>Réessayer</button>
                  <button className="btn btn-sm" onClick={() => discardMutation(it.id)} style={{ color: "#991b1b" }}>
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <button className="btn btn-sm btn-primary" onClick={() => processOutbox()} disabled={!navigator.onLine}>
          <Sparkles size={12} /> Forcer la sync maintenant
        </button>
      </div>
    </div>
  );
}

function humanAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 30) return "à l'instant";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} j`;
}
