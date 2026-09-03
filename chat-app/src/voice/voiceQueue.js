// File d'attente persistante des messages vocaux.
//
// Raison d'etre : en 2G/EDGE, un upload de 25 ko peut echouer plusieurs fois
// avant de passer. Sans file persistante, fermer l'app perdrait le message.
// Ici l'enregistrement est stocke dans IndexedDB des la fin de la capture, puis
// envoye en arriere-plan avec reprise automatique — y compris apres un
// redemarrage de l'application.

const DB_NAME = "chat-voice-queue";
const DB_VERSION = 1;
const STORE = "pending";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let result;
    try { result = fn(store); } catch (err) { reject(err); return; }
    transaction.oncomplete = () => resolve(result?.result ?? result);
    transaction.onerror = () => reject(transaction.error);
  });
}

/** Ajoute un vocal a la file. Retourne son id local. */
export async function enqueueVoice({ discussionId, blob, durationSec }) {
  return tx("readwrite", (store) =>
    store.add({
      discussionId,
      blob,
      durationSec,
      createdAt: Date.now(),
      attempts: 0,
      nextAttemptAt: 0,
    }),
  );
}

export async function listPending() {
  return tx("readonly", (store) => store.getAll());
}

export async function removeVoice(id) {
  return tx("readwrite", (store) => store.delete(id));
}

/** Enregistre un echec et programme la prochaine tentative. */
export async function markAttemptFailed(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) { resolve(null); return; }
      item.attempts = (item.attempts || 0) + 1;
      // Backoff exponentiel plafonne a 5 min : evite de marteler un reseau
      // deja sature tout en restant reactif au retour de connexion.
      const delayMs = Math.min(5 * 60_000, 2000 * 2 ** (item.attempts - 1));
      item.nextAttemptAt = Date.now() + delayMs;
      store.put(item);
      resolve(item);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/** Vocaux prets a etre reessayes maintenant. */
export async function listReady() {
  const all = await listPending();
  const now = Date.now();
  return all.filter((item) => (item.nextAttemptAt || 0) <= now);
}
