// Outbox des commandes creees hors-ligne (SCRUM-304).
// Meme principe que farmos-app/src/offline-outbox.js (file d'attente
// IndexedDB, un worker qui rejoue des que navigator.onLine === true, statuts
// pending -> syncing -> done/error) mais adapte au domaine KodaTill : au lieu
// de rejouer les mutations une a une contre leurs endpoints respectifs, on
// envoie tout le lot en un seul POST /kodatill/orders/sync (batch), qui
// reutilise cote backend exactement OrdersService.create/addPayment/
// updateStatus (idempotence via clientUuid). Le backend traite chaque
// commande dans sa propre transaction : une commande en erreur ne bloque pas
// les autres — le resultat par clientUuid pilote la purge locale.

import { db as cacheDb } from "./offline-db";
import { getToken } from "./auth.jsx";

// Meme base que offline-db.js ne supporte pas l'ajout d'une table apres coup
// sans bumper la version -> on bumpe (identique au pattern farmos-app).
cacheDb.version(2).stores({
  outbox: "++id, status, clientUuid, createdAt",
});

const STATUS = { pending: "pending", syncing: "syncing", done: "done", error: "error" };

// Delai au-dela duquel une entree restee en "syncing" est consideree comme
// abandonnee (app/onglet ferme pendant l'appel reseau : tablette en veille,
// page tuee) et requalifiee en "pending" pour repartir au prochain tick —
// fix bug 2 (SCRUM-304) : sans ca, ces entrees ne sont plus jamais
// selectionnees ni par le worker normal (qui ne lit que "pending") ni par
// retryOutbox (qui ne lit que "error"), la vente est perdue silencieusement.
// Marge large au-dela d'un timeout reseau normal pour ne pas requalifier une
// synchronisation legitimement en cours (autre onglet/tick).
const STUCK_SYNCING_MS = 60 * 1000;

let _running = false;

// Repasse en "pending" toute entree "syncing" depuis plus de STUCK_SYNCING_MS
// (detecte via syncStartedAt, pose au moment ou l'entree passe en syncing).
// Requalification ciblee par age, pas un reset aveugle de tout "syncing"
// (qui casserait un sync legitimement en cours ailleurs).
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
  window.dispatchEvent(new CustomEvent("kodatill:outbox-changed"));
}

const NATIVE = typeof window !== "undefined"
  && (window.Capacitor?.isNativePlatform?.() === true
      || /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.KODATILL_API_HOST) || "https://dev.ongdngolu.org";
const BASE = (NATIVE ? API_HOST : "") + "/api/kodatill";

/**
 * Met en file une commande creee hors-ligne. `order` a la meme forme que le
 * body attendu par POST /kodatill/orders/sync pour un element du tableau
 * `orders` (clientUuid, branchId, channel, lines, payments especes...).
 * Stock : aucune verification locale (comportement optimiste deja en place
 * depuis la Phase 2 — voir OrdersService.decrementStockForOrder, meme regle
 * pour les ventes resynchronisees).
 */
export function enqueueOfflineOrder(order) {
  return cacheDb.transaction("rw", cacheDb.outbox, async () => {
    const id = await cacheDb.outbox.add({
      clientUuid: order.clientUuid,
      order,
      status: STATUS.pending,
      createdAt: Date.now(),
      attempts: 0,
      lastError: null,
      result: null,
    });
    window.dispatchEvent(new CustomEvent("kodatill:outbox-changed"));
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

export async function discardOrder(id) {
  await cacheDb.outbox.delete(id);
  window.dispatchEvent(new CustomEvent("kodatill:outbox-changed"));
}

export async function retryOutbox() {
  await cacheDb.outbox.where("status").equals(STATUS.error).modify({ status: STATUS.pending, lastError: null });
  if (navigator.onLine) processOutbox().catch(() => {});
}

/**
 * Rejoue toute la file pending en un seul appel POST /orders/sync (batch),
 * puis purge/marque chaque entree locale selon le resultat par clientUuid.
 * Affiche un resume via l'evenement "kodatill:sync-summary" (X synchronisees,
 * Y en erreur) — a consommer par CaisseScreen pour l'indicateur de sync.
 */
export async function processOutbox() {
  if (_running) return;
  if (!navigator.onLine) return;
  _running = true;
  try {
    // Recupere d'abord les entrees bloquees en "syncing" (fix bug 2) avant de
    // selectionner les "pending" : sinon une entree abandonnee lors d'un tick
    // precedent resterait invisible pour toujours.
    await reclaimStuckSyncing();

    const pending = await cacheDb.outbox.where("status").equals(STATUS.pending).toArray();
    if (!pending.length) return;

    await cacheDb.outbox.where("status").equals(STATUS.pending).modify({
      status: STATUS.syncing,
      syncStartedAt: Date.now(),
    });
    window.dispatchEvent(new CustomEvent("kodatill:outbox-changed"));
    window.dispatchEvent(new CustomEvent("kodatill:sync-start", { detail: { count: pending.length } }));

    let results = [];
    try {
      const res = await rawFetch("POST", "/orders/sync", {
        orders: pending.map((p) => ({ ...p.order, attempts: undefined })),
      });
      results = Array.isArray(res?.results) ? res.results : [];
    } catch (err) {
      // Echec reseau/serveur global (ex: 5xx, hors-ligne redevenu) : on remet
      // tout en pending pour retenter au prochain online, pas d'erreur fatale.
      await cacheDb.outbox.where("status").equals(STATUS.syncing).modify({
        status: STATUS.pending,
        syncStartedAt: null,
        lastError: String(err.message || err),
      });
      window.dispatchEvent(new CustomEvent("kodatill:outbox-changed"));
      window.dispatchEvent(new CustomEvent("kodatill:sync-summary", { detail: { synced: 0, failed: 0, networkError: true } }));
      return;
    }

    const byClientUuid = new Map(results.map((r) => [r.clientUuid, r]));
    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      const result = byClientUuid.get(item.clientUuid);
      if (result && !result.error) {
        synced += 1;
        await cacheDb.outbox.update(item.id, { status: STATUS.done, result });
        // Purge differee, comme farmos-app (garde une trace courte pour debug).
        setTimeout(() => cacheDb.outbox.delete(item.id).catch(() => {}), 30000);
      } else {
        failed += 1;
        await cacheDb.outbox.update(item.id, {
          status: STATUS.error,
          lastError: result?.error || "Reponse de synchronisation absente pour cette commande.",
          attempts: (item.attempts || 0) + 1,
        });
      }
    }

    window.dispatchEvent(new CustomEvent("kodatill:outbox-changed"));
    window.dispatchEvent(new CustomEvent("kodatill:sync-summary", { detail: { synced, failed } }));
  } finally {
    _running = false;
  }
}

async function rawFetch(method, path, body) {
  const token = getToken(); // SCRUM-119 — token en memoire
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
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return {};
}

// Demarre le worker : rejoue des que la connexion revient, et au boot.
export function startOutboxWorker() {
  if (typeof window === "undefined") return;
  const tick = () => {
    if (navigator.onLine) processOutbox().catch(() => {});
  };
  window.addEventListener("online", tick);
  setTimeout(tick, 800);
  // Poll de securite toutes les 30s (si l'evenement 'online' est rate).
  setInterval(tick, 30 * 1000);
}
