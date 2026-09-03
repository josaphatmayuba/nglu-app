// IndexedDB mirror local du catalogue KodaTill (SCRUM-304), sur le modele
// exact de farmos-app/src/offline-db.js : une table miroir par ressource,
// plus une table `meta` { key, lastSyncedAt } pour piloter la strategie
// cache-then-refresh (et ici, l'ETag renvoye par GET /catalog/snapshot).
//
// Contrairement a FarmOS (plusieurs ressources synchronisees separement),
// KodaTill ne met en cache qu'un seul payload consolide (le "snapshot"
// categories+produits) — on garde neanmoins deux tables distinctes
// (categories/products) pour rester requetable par CaisseScreen exactement
// comme le catalogue en ligne (mêmes filtres categoryId/search en memoire).

import Dexie from "dexie";

// IMPORTANT : toutes les declarations de version Dexie de cette base doivent
// vivre ICI, dans ce seul fichier, meme celles utilisees uniquement par
// d'autres modules (ex: le store "outbox" de offline-outbox.js). Une
// declaration de version separee dans un autre fichier ne fonctionne que par
// accident, tant que ce fichier est toujours importe en premier avec l'autre
// dans le meme module consommateur (ordre d'import non garanti sinon) — si un
// futur ecran importait offline-db.js sans l'autre module, Dexie ouvrirait la
// base sur un schema incomplet et un store entier disparaitrait silencieusement
// (perte de donnees en attente, ex: ventes offline non synchronisees).
export const db = new Dexie("kodatill-offline");
db.version(1).stores({
  categories: "id, sortOrder",
  products:   "id, categoryId, barcode, name",
  // Cle unique "catalog" : { lastSyncedAt, etag, version }.
  meta:       "key, lastSyncedAt",
});
// v2 (SCRUM-304) : outbox des commandes creees hors-ligne, consommee par
// offline-outbox.js (voir ce fichier pour le detail des statuts/usage).
db.version(2).stores({
  outbox: "++id, status, clientUuid, createdAt",
});

// GARDE FUTURE : si un prochain bump de version modifie la STRUCTURE du
// catalogue mis en cache (ex: ajout d'un champ "variants" embarque dans les
// produits), accompagner le nouveau `db.version(N).stores(...)` d'un
// `.upgrade()` qui vide le store `meta` (db.meta.clear()). Sans ca, une caisse
// avec un ancien cache garde son ETag/version existant en meta, envoie encore
// un If-None-Match valide au backend, recoit un 304, et sert indefiniment un
// cache structurellement obsolete (les nouveaux champs n'existeront jamais
// localement). Vider meta force un re-fetch complet (pas d'ETag => 200 avec
// le nouveau payload). Pas necessaire aujourd'hui (aucun bump prevu dans ce
// ticket), juste documente pour eviter le piege plus tard.

// Remplace entierement le miroir catalogue avec la derniere reponse
// GET /catalog/snapshot (categories + products), et enregistre l'ETag/version
// pour un prochain If-None-Match.
export async function replaceCatalogCache({ version, categories, products }) {
  await db.transaction("rw", db.categories, db.products, db.meta, async () => {
    await db.categories.clear();
    if (Array.isArray(categories) && categories.length) await db.categories.bulkPut(categories);
    await db.products.clear();
    if (Array.isArray(products) && products.length) await db.products.bulkPut(products);
    await db.meta.put({ key: "catalog", lastSyncedAt: Date.now(), version: version ?? null });
  });
}

export async function readCatalogCache() {
  const [categories, products] = await Promise.all([
    db.categories.toArray(),
    db.products.toArray(),
  ]);
  return { categories, products };
}

export async function getCatalogMeta() {
  return db.meta.get("catalog");
}

// Vide toute la base — utile pour un futur bouton "Resynchroniser depuis zero".
export async function clearAllCaches() {
  await Promise.all([db.categories.clear(), db.products.clear(), db.meta.clear()]);
}
