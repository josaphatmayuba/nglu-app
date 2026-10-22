// Persistance IndexedDB de la file d'envois (File/Blob + métadonnées).
// Chaque accès est protégé : si IndexedDB est indisponible (navigation privée,
// WebView restreinte, quota), on retombe sur une Map en mémoire.
const DB_NAME = "domus-uploads";
const STORE = "queue";
const memory = new Map();
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        try { req.result.createObjectStore(STORE, { keyPath: "id" }); } catch {}
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run(mode, fn) {
  return openDb().then((db) => {
    if (!db) return { ok: false };
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve({ ok: true, result: req?.result });
        tx.onerror = () => resolve({ ok: false });
        tx.onabort = () => resolve({ ok: false });
      } catch {
        resolve({ ok: false });
      }
    });
  }).catch(() => ({ ok: false }));
}

export async function storePut(item) {
  memory.set(item.id, item);
  await run("readwrite", (s) => s.put(item));
}

export async function storeDelete(id) {
  memory.delete(id);
  await run("readwrite", (s) => s.delete(id));
}

export async function storeAll() {
  const r = await run("readonly", (s) => s.getAll());
  if (r.ok && Array.isArray(r.result)) return r.result;
  return [...memory.values()];
}

// Deconnexion / changement d'utilisateur : on ne garde rien en memoire.
export function storeClearMemory() {
  memory.clear();
}
