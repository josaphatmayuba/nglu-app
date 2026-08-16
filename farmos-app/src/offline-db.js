// IndexedDB mirror local des endpoints de lecture FarmOS, via Dexie.
// Pour chaque table miroir on stocke aussi la métadonnée { lastSyncedAt, etag }
// dans la table 'meta' pour piloter la stratégie cache-then-refresh.
//
// SCRUM-239 : cette couche reste utilisée même côté Capacitor / PWA. Elle
// n'a pas vocation à remplacer le service worker (qui cache au niveau HTTP)
// mais à offrir un cache structuré, requêtable, et utilisable par la queue
// de mutations (SCRUM-240).

import Dexie from "dexie";

// IMPORTANT : toutes les declarations de version Dexie de cette base doivent
// vivre ICI, dans ce seul fichier, meme celles utilisees uniquement par
// d'autres modules (ex: le store "outbox" de offline-outbox.js, SCRUM-240).
// Une declaration de version separee dans un autre fichier ne fonctionne que
// par accident, tant que ce fichier est toujours importe en meme temps que
// l'autre — si un futur ecran importait offline-db.js sans offline-outbox.js,
// Dexie ouvrirait la base sur un schema incomplet et le store "outbox"
// disparaitrait silencieusement (perte des mutations offline en attente).
export const db = new Dexie("farmos-offline");
db.version(1).stores({
  // Pour chaque table : primary key id, index utiles pour les écrans.
  animals:         "id, externalId, species, lot, status",
  medicines:       "id, kind, name",
  diseases:        "id, species",
  treatments:      "id, animalId, status",
  reproductionEvents: "id, animalId, eventType, eventDate",
  sales:           "id, saleDate, species",
  expenses:        "id, expenseDate, category",
  vaccinations:    "id, dueDate, species, status",
  productionLogs:  "id, logDate, animalId, species, productType",
  aiInsights:      "id, kind",
  lookups:         "[category+id], category",
  staff:           "id",
  semenStraws:     "id, species, strawsRemaining",
  // Méta : pour chaque ressource (clé = nom de la table miroir), suivi sync.
  meta:            "key, lastSyncedAt",
});
db.version(2).stores({
  feedForecasts:   "id, species, urgent",
  // Outbox des mutations offline (SCRUM-240) — deplace ici depuis
  // offline-outbox.js pour garder une seule source de verite du schema.
  outbox:          "++id, status, kind, createdAt",
});
db.version(3).stores({
  vetExams:        "id, examDate, animalId",
  mortalityEvents: "id, eventDate, species, animalId",
});
db.version(4).stores({
  // Pesées : absentes des versions precedentes, une pesee saisie hors-ligne
  // (ou pendant un raté réseau silencieusement mis en file) n'avait donc
  // aucun miroir local pour la faire réapparaître dans l'onglet Poids.
  weighings:       "id, animalId, weighDate",
});

// Met à jour la table miroir avec la dernière réponse API.
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

// Vide toute la base — pour le bouton "Resynchroniser depuis zéro".
export async function clearAllCaches() {
  await Promise.all(
    [...Object.keys(db.tables.reduce((a, t) => ({ ...a, [t.name]: 1 }), {}))]
      .map((n) => db[n] && db[n].clear ? db[n].clear() : null)
      .filter(Boolean),
  );
}
