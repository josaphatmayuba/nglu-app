// IndexedDB mirror local du Journal Entreprise, via Dexie — meme pattern que
// farmos-app/src/offline-db.js et kodatill-app/src/offline-db.js (miroir de
// lecture par ressource + table 'meta' pour piloter le cache-then-refresh,
// plus un store 'outbox' pour les mutations differees hors-ligne).
//
// IMPORTANT : toutes les declarations de version Dexie de cette base doivent
// vivre ICI, dans ce seul fichier, meme celles utilisees uniquement par
// d'autres modules (ex: le store "outbox" de offline-outbox.js). Une
// declaration de version separee dans un autre fichier ne fonctionne que par
// accident, tant que ce fichier est toujours importe en meme temps que
// l'autre — c'est exactement le bug corrige aujourd'hui dans farmos-app
// (offline-outbox.js declarait sa propre version separement d'offline-db.js) :
// si un futur ecran importait offline-db.js seul, Dexie ouvrirait la base sur
// un schema incomplet et le store "outbox" disparaitrait silencieusement
// (perte des mutations offline en attente, ex: evenement/tache cree hors
// ligne jamais synchronise).
import Dexie from "dexie";

export const db = new Dexie("journal-offline");
db.version(1).stores({
  events: "id, eventType, sourceModule, importance, eventDate, isPinned",
  tasks:  "id, isDone, dueDate, priority, sourceModule",
  // Cle = nom de la ressource miroir (ex: "events", "tasks").
  meta:   "key, lastSyncedAt",
  // Mutations offline (creation/edition d'evenements et taches) — memes
  // statuts que farmos-app/kodatill-app : pending -> syncing -> done/error.
  outbox: "++id, status, kind, createdAt",
});

// Remplace entierement le miroir d'une ressource avec la derniere reponse API.
export async function replaceCache(tableName, rows) {
  if (!Array.isArray(rows)) return;
  await db.transaction("rw", db[tableName], db.meta, async () => {
    await db[tableName].clear();
    if (rows.length) await db[tableName].bulkPut(rows);
    await db.meta.put({ key: tableName, lastSyncedAt: Date.now(), count: rows.length });
  });
}

export async function readCache(tableName) {
  return db[tableName].toArray();
}

export async function lastSync(tableName) {
  const m = await db.meta.get(tableName);
  return m?.lastSyncedAt || null;
}

// Vide toute la base — appele au logout (fuite de donnees entre utilisateurs
// sur poste partage, meme fix que farmos-app/kodatill-app aujourd'hui) et
// utile pour un futur bouton "Resynchroniser depuis zero".
export async function clearAllCaches() {
  await Promise.all([db.events.clear(), db.tasks.clear(), db.meta.clear(), db.outbox.clear()]);
}
