// Outbox des mutations offline (SCRUM-240).
// Quand l'utilisateur crée / modifie / supprime hors-ligne, l'action est
// poussée dans une table IndexedDB `outbox`. Un worker dans le navigateur
// rejoue la file dès que `navigator.onLine === true`, dans l'ordre de
// création (FIFO), une mutation à la fois pour respecter les dépendances
// (ex: créer un animal puis lui attacher un traitement).

import { db as cacheDb, replaceCache } from "./offline-db";
import { getToken } from "./auth.jsx";

// Le store "outbox" est déclaré dans offline-db.js (version 2) — toutes les
// versions Dexie de cette base doivent vivre dans ce seul fichier, voir le
// commentaire en tête de offline-db.js.

// Statuts possibles d'une mutation : pending → syncing → done (ou error).
const STATUS = { pending: "pending", syncing: "syncing", done: "done", error: "error" };

let _running = false;

export function enqueueMutation({ kind, method, path, body, optimistic }) {
  // `kind` = label lisible (createAnimal, uploadPhoto, …) pour l'UI.
  // `optimistic` = { table, row } pour ajouter localement avant sync.
  return cacheDb.transaction("rw", cacheDb.outbox, cacheDb[optimistic?.table], async () => {
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
    // Insertion optimiste dans le miroir local pour que les écrans
    // reflètent immédiatement l'action.
    if (optimistic?.table && optimistic?.row && cacheDb[optimistic.table]) {
      await cacheDb[optimistic.table].put({ ...optimistic.row, _pending: true, _outboxId: id });
    }
    window.dispatchEvent(new CustomEvent("farmos:outbox-changed"));
    return id;
  }).then((id) => {
    // Tente la sync immédiatement si online.
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
  // Retire l'enregistrement optimiste local s'il existe.
  if (item.optimisticTable && item.optimisticRow?.id != null && cacheDb[item.optimisticTable]) {
    await cacheDb[item.optimisticTable].where("_outboxId").equals(id).delete().catch(() => {});
  }
  await cacheDb.outbox.delete(id);
  window.dispatchEvent(new CustomEvent("farmos:outbox-changed"));
}

export async function retryMutation(id) {
  await cacheDb.outbox.update(id, { status: STATUS.pending, lastError: null });
  if (navigator.onLine) processOutbox().catch(() => {});
}

// Le coeur : exécute les mutations en attente dans l'ordre.
export async function processOutbox() {
  if (_running) return;
  _running = true;
  try {
    while (true) {
      const next = await cacheDb.outbox
        .where("status").equals(STATUS.pending)
        .first();
      if (!next) break;
      if (!navigator.onLine) break;
      await cacheDb.outbox.update(next.id, { status: STATUS.syncing, attempts: (next.attempts || 0) + 1 });
      window.dispatchEvent(new CustomEvent("farmos:outbox-changed"));
      try {
        const res = await rawFetch(next.method, next.path, next.body);
        // Si la réponse renvoie un id serveur, on remplace l'enregistrement
        // optimiste local avec les vraies valeurs.
        const serverId = res?.id ?? null;
        if (next.optimisticTable && cacheDb[next.optimisticTable]) {
          const prev = await cacheDb[next.optimisticTable].where("_outboxId").equals(next.id).first();
          if (prev) {
            await cacheDb[next.optimisticTable].delete(prev.id);
            if (res && typeof res === "object") {
              await cacheDb[next.optimisticTable].put({ ...res });
            }
          }
        }
        await cacheDb.outbox.update(next.id, { status: STATUS.done, serverId });
        // On peut purger les done après un délai. Pour debug initial, on les garde.
        setTimeout(() => cacheDb.outbox.delete(next.id).catch(() => {}), 30000);
        window.dispatchEvent(new CustomEvent("farmos:outbox-changed"));
        window.dispatchEvent(new CustomEvent("farmos:sync-success", { detail: { kind: next.kind, serverId } }));
      } catch (err) {
        // 4xx (sauf 408/429) = pas de retry auto, on attend que l'utilisateur tranche.
        const status = parseStatus(err);
        const fatal = status >= 400 && status < 500 && status !== 408 && status !== 429;
        await cacheDb.outbox.update(next.id, {
          status: STATUS.error,
          lastError: String(err.message || err),
        });
        window.dispatchEvent(new CustomEvent("farmos:outbox-changed"));
        window.dispatchEvent(new CustomEvent("farmos:sync-error", { detail: { kind: next.kind, error: String(err.message || err), fatal } }));
        if (fatal) {
          // On laisse cette mutation en "error" — pas de retry tant que l'utilisateur ne décide pas.
          continue;
        }
        // Retry plus tard (ex: 5xx) — on s'arrête là, on retentera au prochain online.
        break;
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

// Importé depuis api.js pour éviter une boucle d'imports : on duplique
// la logique fetch+auth localement.
async function rawFetch(method, path, body) {
  const NATIVE = typeof window !== "undefined" && (window.Capacitor?.isNativePlatform?.() === true || /^capacitor:\/\//.test(window.location?.protocol || ""));
  const API_HOST = (typeof window !== "undefined" && window.FARMOS_API_HOST) || "https://dev.ongdngolu.org";
  const BASE = (NATIVE ? API_HOST : "") + "/api/farmos";
  const token = getToken(); // SCRUM-119 — token en mémoire
  const res = await fetch(`${BASE}${path}`, {
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
  // Si réponse vide (DELETE/204), retourner {}.
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return {};
}

// Démarre le worker : rejoue dès qu'on revient online, et au boot de l'app.
export function startOutboxWorker() {
  if (typeof window === "undefined") return;
  const tick = () => {
    if (navigator.onLine) processOutbox().catch(() => {});
  };
  window.addEventListener("online", tick);
  // Au chargement, tente immédiatement.
  setTimeout(tick, 800);
  // Poll de sécurité toutes les 30s (si l'event 'online' est raté).
  setInterval(tick, 30 * 1000);
}
