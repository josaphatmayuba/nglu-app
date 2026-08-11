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

export const db = new Dexie("kodatill-offline");
db.version(1).stores({
  categories: "id, sortOrder",
  products:   "id, categoryId, barcode, name",
  // Cle unique "catalog" : { lastSyncedAt, etag, version }.
  meta:       "key, lastSyncedAt",
});

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
