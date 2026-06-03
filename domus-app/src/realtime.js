// Domus — client temps réel (SSE) + hooks React.
//
// Se connecte à GET /api/events/me?token=… (même endpoint que le CRM). Le backend
// pousse des évènements `data.updated` portant un tableau `tags`
// (properties, units, leases, payments, maintenance, …) à chaque mutation.
// Les écrans s'abonnent via useRealtimeReload(reload, tags) pour se rafraîchir tout seuls.
//
// - Reconnexion automatique avec backoff exponentiel.
// - BroadcastChannel : une seule connexion SSE par origine, partagée entre les onglets.
// - Indicateur de connexion via useRealtimeStatus() pour la pastille du topbar.
import { useEffect, useRef, useState } from "react";
import { API_ROOT } from "./api.js";

const SSE_PATH = `${API_ROOT}/events/me`;
const INITIAL_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 30_000;
const CHANNEL_NAME = "domus-realtime";

let source = null;
let reconnectTimer = null;
let backoffMs = INITIAL_BACKOFF_MS;
let connected = false;
let starts = 0; // compteur de consommateurs actifs (refcount)

const listeners = new Map(); // eventType → Set<handler>
const statusListeners = new Set();

// Diffusion inter-onglets : un seul onglet tient la connexion SSE.
let channel = null;
try {
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (msg) => {
      if (msg.data?.type === "realtime-event") dispatch(msg.data.event);
    };
  }
} catch {
  // BroadcastChannel indisponible (vieux navigateurs / WebView)
}

function token() {
  try {
    return localStorage.getItem("access-token") || "";
  } catch {
    return "";
  }
}

function setConnected(next) {
  if (connected === next) return;
  connected = next;
  statusListeners.forEach((fn) => fn(connected));
}

function dispatch(event) {
  const type = event?.type || "message";
  const set = listeners.get(type);
  if (set) set.forEach((fn) => fn(event));
}

function handleEvent(event) {
  try {
    const data = JSON.parse(event.data);
    const parsed = { ...data, type: event.type || data.type || "message" };
    channel?.postMessage({ type: "realtime-event", event: parsed });
    dispatch(parsed);
  } catch {
    // évènement malformé — ignoré
  }
}

function connect() {
  if (source) return;
  const t = token();
  if (!t) return;
  try {
    source = new EventSource(`${SSE_PATH}?token=${encodeURIComponent(t)}`);
    source.addEventListener("open", () => {
      backoffMs = INITIAL_BACKOFF_MS;
      setConnected(true);
    });
    source.addEventListener("error", () => {
      setConnected(false);
      source?.close();
      source = null;
      scheduleReconnect();
    });
    // (Re)brancher tous les types d'évènements déjà demandés.
    for (const [type] of listeners) source.addEventListener(type, handleEvent);
  } catch {
    setConnected(false);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer || starts <= 0) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, backoffMs);
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  source?.close();
  source = null;
  setConnected(false);
}

// Reconnexion quand l'onglet redevient visible (la connexion a pu tomber en arrière-plan).
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && starts > 0 && !source) {
      backoffMs = INITIAL_BACKOFF_MS;
      connect();
    }
  });
}
// Re-tente quand on revient en ligne.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    if (starts > 0 && !source) {
      backoffMs = INITIAL_BACKOFF_MS;
      connect();
    }
  });
  // Token changé (login/logout dans un autre onglet) → reconnecter proprement.
  window.addEventListener("domus:auth-changed", () => {
    disconnect();
    if (starts > 0) connect();
  });
}

/** Abonne un type d'évènement SSE. Renvoie une fonction de désabonnement. */
export function onRealtimeEvent(type, handler) {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
    source?.addEventListener(type, handleEvent);
  }
  listeners.get(type).add(handler);
  return () => listeners.get(type)?.delete(handler);
}

/** Démarre (ou rejoint) la connexion. Refcount : à coupler avec stopRealtimeClient(). */
export function startRealtimeClient() {
  starts += 1;
  if (starts === 1) connect();
}

/** Décrémente le refcount ; coupe la connexion quand plus personne n'écoute. */
export function stopRealtimeClient() {
  starts = Math.max(0, starts - 1);
  if (starts === 0) disconnect();
}

export function isRealtimeConnected() {
  return connected;
}

// ── Hooks React ────────────────────────────────────────────────────────────

/**
 * Maintient la connexion SSE ouverte tant qu'un composant est monté,
 * et appelle `reload` (anti-rebond) quand un évènement `data.updated`
 * porte au moins un des `tags` surveillés.
 */
export function useRealtimeReload(reload, tags = [], { debounceMs = 500 } = {}) {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const tagsRef = useRef(tags);
  tagsRef.current = tags;

  useEffect(() => {
    startRealtimeClient();
    let timer = null;
    const unsub = onRealtimeEvent("data.updated", (event) => {
      const eventTags = event?.tags || [];
      const watched = tagsRef.current;
      const hit = watched.length === 0 || eventTags.some((t) => watched.includes(t));
      if (!hit) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        reloadRef.current?.();
      }, debounceMs);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
      stopRealtimeClient();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounceMs]);
}

/** État de connexion temps réel (pour une pastille de statut). */
export function useRealtimeStatus() {
  const [online, setOnline] = useState(isRealtimeConnected());
  useEffect(() => {
    statusListeners.add(setOnline);
    setOnline(isRealtimeConnected());
    return () => statusListeners.delete(setOnline);
  }, []);
  return online;
}
