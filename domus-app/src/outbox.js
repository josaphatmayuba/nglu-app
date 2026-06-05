// File d'attente hors ligne (outbox) pour les écritures.
//
// Quand une mutation (POST/PUT/PATCH/DELETE) échoue faute de réseau, on la
// stocke localement. Dès que la connexion revient (événement `online` ou
// nouvelle tentative), on rejoue les requêtes dans l'ordre.
//
// Limite assumée : pas d'UI optimiste (l'élément créé hors ligne n'a pas
// encore d'id serveur). Les flux qui lisent le résultat reçoivent `{_queued:true}`.

const KEY = "domus-outbox";

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("domus-outbox-changed", { detail: { count: items.length } }));
  }
}

export function outboxCount() {
  return read().length;
}

export function enqueue(entry) {
  const items = read();
  items.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, queuedAt: Date.now(), ...entry });
  write(items);
}

let flushing = false;

// `replay(entry)` doit renvoyer la Response fetch (ou throw sur erreur réseau).
export async function flushOutbox(replay) {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  let items = read();
  if (!items.length) return;
  flushing = true;
  const remaining = [];
  let synced = 0;
  for (const entry of items) {
    try {
      const res = await replay(entry);
      // 2xx → succès. 4xx → erreur définitive (validation) : on abandonne pour
      // ne pas boucler. 5xx / réseau → on garde pour réessayer plus tard.
      if (res && res.ok) {
        synced += 1;
      } else if (res && res.status >= 400 && res.status < 500) {
        synced += 1; // abandonnée (client error) — on la retire de la file
      } else {
        remaining.push(entry);
      }
    } catch {
      remaining.push(entry); // échec réseau → on réessaiera
    }
  }
  write(remaining);
  flushing = false;
  if (synced > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("domus-outbox-synced", { detail: { synced } }));
  }
}

export function isNetworkError(err) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  // fetch lève un TypeError "Failed to fetch" quand le réseau est indisponible.
  return err instanceof TypeError;
}
