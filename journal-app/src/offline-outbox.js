// Outbox des mutations offline (evenements/taches crees ou modifies hors
// ligne) — meme principe que farmos-app/src/offline-outbox.js : file
// IndexedDB generique par mutation (kind/method/path/body), rejouee dans
// l'ordre FIFO des que navigator.onLine === true.
//
// Le store "outbox" (et son bump de version Dexie) est declare dans
// offline-db.js, pas ici — voir le commentaire "IMPORTANT" en tete de ce
// fichier pour la raison.

import { db as cacheDb } from "./offline-db";
import { readToken } from "./auth.jsx";
import { read as readLegacyOutbox, write as writeLegacyOutbox } from "./outbox.js";

const STATUS = { pending: "pending", syncing: "syncing", done: "done", error: "error" };

// Delai au-dela duquel une entree restee en "syncing" est consideree comme
// abandonnee (app/onglet ferme pendant l'appel reseau) et requalifiee en
// "pending" pour repartir au prochain tick — meme fix que kodatill-app
// (SCRUM-304 bug 2) : sans ca, une entree bloquee en syncing n'est plus
// jamais reprise par le worker (qui ne lit que "pending"), la mutation est
// perdue silencieusement.
const STUCK_SYNCING_MS = 60 * 1000;

let _running = false;

async function reclaimStuckSyncing() {
  const cutoff = Date.now() - STUCK_SYNCING_MS;
  const stuck = await cacheDb.outbox
    .where("status").equals(STATUS.syncing)
    .filter((item) => !item.syncStartedAt || item.syncStartedAt < cutoff)
    .toArray();
  if (!stuck.length) return;
  await Promise.all(
    stuck.map((item) => cacheDb.outbox.update(item.id, { status: STATUS.pending, syncStartedAt: null })),
  );
  window.dispatchEvent(new CustomEvent("journal:outbox-changed"));
}

// Migration une seule fois : draine l'ancien outbox localStorage
// ("journal-outbox", voir outbox.js) vers ce nouvel outbox Dexie, pour ne
// perdre aucune mutation en attente au moment du passage a Dexie. Idempotent
// (vide localStorage une fois consomme, ne rejoue jamais deux fois).
let _migrated = false;
export async function migrateLegacyOutbox() {
  if (_migrated) return;
  _migrated = true;
  let legacy = [];
  try { legacy = readLegacyOutbox(); } catch { legacy = []; }
  if (!legacy.length) return;
  await cacheDb.transaction("rw", cacheDb.outbox, async () => {
    for (const entry of legacy) {
      await cacheDb.outbox.add({
        kind: "legacyMutation",
        method: entry.method,
        path: entry.url?.startsWith("http") ? new URL(entry.url).pathname + new URL(entry.url).search : entry.url,
        // Les entrees legacy stockaient l'URL absolue (API_ROOT+path) — on ne
        // rejoue plus via BASE journal-entreprise mais via cette URL brute
        // pour rester fidele a la mutation d'origine (peut viser /api ou
        // /api/journal-entreprise selon l'appel initial).
        rawUrl: entry.url,
        body: entry.body ?? null,
        status: STATUS.pending,
        createdAt: entry.queuedAt || Date.now(),
        attempts: 0,
        lastError: null,
      });
    }
  });
  // Purge l'ancien store une fois migre — pas de perte : chaque entree existe
  // maintenant dans Dexie.
  try { writeLegacyOutbox([]); } catch {}
  window.dispatchEvent(new CustomEvent("journal:outbox-changed"));
}

export function enqueueMutation({ kind, method, path, body, optimistic }) {
  // `optimistic` = { table, row } pour refleter l'action immediatement dans
  // le miroir local (ecran a jour sans attendre la sync).
  return cacheDb.transaction("rw", cacheDb.outbox, optimistic?.table ? cacheDb[optimistic.table] : cacheDb.outbox, async () => {
    const id = await cacheDb.outbox.add({
      kind, method, path,
      body: body ?? null,
      optimisticTable: optimistic?.table ?? null,
      optimisticRow: optimistic?.row ?? null,
      status: STATUS.pending,
      createdAt: Date.now(),
      attempts: 0,
      lastError: null,
      serverId: null,
    });
    if (optimistic?.table && optimistic?.row && cacheDb[optimistic.table]) {
      await cacheDb[optimistic.table].put({ ...optimistic.row, _pending: true, _outboxId: id });
    }
    window.dispatchEvent(new CustomEvent("journal:outbox-changed"));
    return id;
  }).then((id) => {
    if (navigator.onLine) processOutbox().catch(() => {});
    return id;
  });
}

export async function listOutbox() {
  return cacheDb.outbox.orderBy("createdAt").toArray();
}

export async function pendingCount() {
  return cacheDb.outbox.where("status").anyOf(STATUS.pending, STATUS.error).count();
}

export async function discardMutation(id) {
  const item = await cacheDb.outbox.get(id);
  if (!item) return;
  if (item.optimisticTable && cacheDb[item.optimisticTable]) {
    await cacheDb[item.optimisticTable].where("_outboxId").equals(id).delete().catch(() => {});
  }
  await cacheDb.outbox.delete(id);
  window.dispatchEvent(new CustomEvent("journal:outbox-changed"));
}

export async function retryMutation(id) {
  await cacheDb.outbox.update(id, { status: STATUS.pending, lastError: null });
  if (navigator.onLine) processOutbox().catch(() => {});
}

export async function processOutbox() {
  if (_running) return;
  if (!navigator.onLine) return;
  _running = true;
  try {
    await reclaimStuckSyncing();
    while (true) {
      const next = await cacheDb.outbox.where("status").equals(STATUS.pending).first();
      if (!next) break;
      if (!navigator.onLine) break;
      await cacheDb.outbox.update(next.id, { status: STATUS.syncing, syncStartedAt: Date.now(), attempts: (next.attempts || 0) + 1 });
      window.dispatchEvent(new CustomEvent("journal:outbox-changed"));
      try {
        const res = await rawFetch(next.method, next.rawUrl || next.path, next.body);
        const serverId = res?.id ?? null;
        if (next.optimisticTable && cacheDb[next.optimisticTable]) {
          const prev = await cacheDb[next.optimisticTable].where("_outboxId").equals(next.id).first();
          if (prev) {
            await cacheDb[next.optimisticTable].delete(prev.id);
            if (res && typeof res === "object") await cacheDb[next.optimisticTable].put({ ...res });
          }
        }
        await cacheDb.outbox.update(next.id, { status: STATUS.done, syncStartedAt: null, serverId });
        setTimeout(() => cacheDb.outbox.delete(next.id).catch(() => {}), 30000);
        window.dispatchEvent(new CustomEvent("journal:outbox-changed"));
        window.dispatchEvent(new CustomEvent("journal:sync-success", { detail: { kind: next.kind, serverId } }));
      } catch (err) {
        const status = parseStatus(err);
        const fatal = status >= 400 && status < 500 && status !== 408 && status !== 429;
        await cacheDb.outbox.update(next.id, { status: STATUS.error, syncStartedAt: null, lastError: String(err.message || err) });
        window.dispatchEvent(new CustomEvent("journal:outbox-changed"));
        window.dispatchEvent(new CustomEvent("journal:sync-error", { detail: { kind: next.kind, error: String(err.message || err), fatal } }));
        if (fatal) continue; // reste en "error", pas de retry auto tant que l'utilisateur ne tranche pas
        break; // erreur reseau/5xx : on retentera au prochain "online"
      }
    }
  } finally {
    _running = false;
  }
}

function parseStatus(err) {
  const m = String(err?.message || "").match(/API (\d{3})/);
  return m ? Number(m[1]) : 0;
}

// Duplique volontairement la logique fetch+auth (comme farmos-app) pour
// eviter une boucle d'imports avec api.js.
async function rawFetch(method, path, body) {
  const NATIVE = typeof window !== "undefined" && (window.Capacitor?.isNativePlatform?.() === true || /^capacitor:\/\//.test(window.location?.protocol || ""));
  const API_HOST = (typeof window !== "undefined" && window.JOURNAL_API_HOST) || "https://dev.ongdngolu.org";
  const BASE = (NATIVE ? API_HOST : "") + "/api/journal-entreprise";
  const token = readToken();
  const url = /^https?:\/\//.test(path) ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} — ${text.slice(0, 200)}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return {};
}

export function startOutboxWorker() {
  if (typeof window === "undefined") return;
  migrateLegacyOutbox().catch(() => {});
  const tick = () => {
    if (navigator.onLine) processOutbox().catch(() => {});
  };
  window.addEventListener("online", tick);
  setTimeout(tick, 800);
  setInterval(tick, 30 * 1000);
}
