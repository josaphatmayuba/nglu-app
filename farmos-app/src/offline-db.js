// IndexedDB mirror local des endpoints de lecture FarmOS, via Dexie.
// Pour chaque table miroir on stocke aussi la métadonnée { lastSyncedAt, etag }
// dans la table 'meta' pour piloter la stratégie cache-then-refresh.
//
// SCRUM-239 : cette couche reste utilisée même côté Capacitor / PWA. Elle
// n'a pas vocation à remplacer le service worker (qui cache au niveau HTTP)
// mais à offrir un cache structuré, requêtable, et utilisable par la queue
// de mutations (SCRUM-240).

import Dexie from "dexie";

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
