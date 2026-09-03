// File d'attente hors ligne legacy (localStorage) pour les écritures Journal.
// DEPRECIEE : remplacée par l'outbox Dexie (offline-outbox.js), qui suit le
// même pattern que farmos-app/kodatill-app (reclaim des entrées bloquées,
// statuts pending/syncing/done/error). Ce module reste uniquement pour
// drainer au premier boot les entrées en attente créées avant la migration
// (offline-outbox.js::migrateLegacyOutbox) — plus aucune nouvelle écriture
// n'y est ajoutée depuis api.js.
const KEY = "journal-outbox";

export function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

export function write(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("journal-outbox-changed", { detail: { count: items.length } }));
  }
}

export function outboxCount() { return read().length; }

export function enqueue(entry) {
  const items = read();
  items.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, queuedAt: Date.now(), ...entry });
  write(items);
}

let flushing = false;

export async function flushOutbox(replay) {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  let items = read();
  if (!items.length) return;
  flushing = true;
  const remaining = [];
  let synced = 0;
  for (const entry of items) {
    try {
      const res = await replay(entry);
      if (res && res.ok) { synced++; }
      else if (res && res.status >= 400 && res.status < 500) { synced++; }
      else { remaining.push(entry); }
    } catch { remaining.push(entry); }
  }
  write(remaining);
  flushing = false;
  if (synced > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("journal-outbox-synced", { detail: { synced } }));
  }
}

export function isNetworkError(err) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return err instanceof TypeError;
}
