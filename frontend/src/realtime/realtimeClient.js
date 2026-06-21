/**
 * SSE client singleton — connects to GET /events/me with the current access token.
 * Reconnects automatically with exponential backoff.
 * Listeners registered before connection are queued and replayed on connect.
 *
 * Features:
 * - BroadcastChannel: propagates events to other tabs so only one SSE connection is needed.
 * - Debounce: handlers can opt in with debounceMs to avoid duplicate rapid-fire calls.
 * - Stale marking: page-visibility API marks the client stale when the tab is hidden,
 *   triggering a refresh-needed notification on return.
 */

import { getAccessToken } from "../utils/tokenStore";

const SSE_PATH = "/api/events/me";
const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 2_000;
const BROADCAST_CHANNEL_NAME = "nglu-realtime";

let source = null;
let reconnectTimer = null;
let backoffMs = INITIAL_BACKOFF_MS;
let connected = false;
let stale = false;
const listeners = new Map(); // eventType → Set<{handler, debounceMs, _timer}>
const statusListeners = new Set();
const staleListeners = new Set();
const debounceTimers = new Map(); // handler → timer

// BroadcastChannel for cross-tab delivery (only one tab holds the SSE connection)
let broadcastChannel = null;
try {
  if (typeof BroadcastChannel !== "undefined") {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastChannel.onmessage = (msg) => {
      if (msg.data?.type === "realtime-event") {
        dispatchToListeners(msg.data.event);
      }
    };
  }
} catch {
  // BroadcastChannel not available (Node.js test env, old browsers)
}

function token() {
  // SCRUM-119 — token admin en mémoire ; fallback localStorage pour le client legacy.
  return (
    getAccessToken() ||
    (typeof localStorage !== "undefined" && localStorage.getItem("access-token")) ||
    ""
  );
}

let __diagConnectCount = 0;
function connect() {
  if (source) return;
  const t = token();
  if (!t) return;

  // [DIAG-LOOP] trace chaque ouverture de connexion SSE pour reperer une reconnexion en rafale. A RETIRER.
  __diagConnectCount += 1;
  // eslint-disable-next-line no-console
  console.error(`[DIAG-SSE] connect() #${__diagConnectCount} backoff=${backoffMs}ms`);

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

    for (const [type] of listeners) {
      source.addEventListener(type, handleEvent);
    }

    source.onmessage = handleEvent;
  } catch {
    setConnected(false);
    scheduleReconnect();
  }
}

function setConnected(nextConnected) {
  if (connected === nextConnected) return;
  connected = nextConnected;
  statusListeners.forEach((handler) => handler({ connected }));
}

function setStale(nextStale) {
  if (stale === nextStale) return;
  stale = nextStale;
  staleListeners.forEach((handler) => handler({ stale }));
}

function handleEvent(event) {
  try {
    const data = JSON.parse(event.data);
    const type = event.type || data.type || "message";
    const parsed = { ...data, type };

    // Forward to other tabs before dispatching locally
    broadcastChannel?.postMessage({ type: "realtime-event", event: parsed });

    dispatchToListeners(parsed);
  } catch {
    // malformed event — ignore
  }
}

/**
 * Dispatch a parsed event object to all matching listeners,
 * respecting per-handler debounce.
 */
function dispatchToListeners(data) {
  const type = data.type || "message";
  const entries = listeners.get(type);
  if (!entries) return;

  for (const entry of entries) {
    const { handler, debounceMs } = entry;
    if (debounceMs > 0) {
      const existing = debounceTimers.get(handler);
      if (existing) clearTimeout(existing);
      debounceTimers.set(
        handler,
        setTimeout(() => {
          debounceTimers.delete(handler);
          handler(data);
        }, debounceMs),
      );
    } else {
      handler(data);
    }
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, backoffMs);
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
}

function disconnect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  source?.close();
  source = null;
  setConnected(false);
}

// Stale marking via Page Visibility API
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      setStale(true);
    } else {
      setStale(false);
    }
  });
}

/**
 * Subscribe to an SSE event type. Returns an unsubscribe function.
 * @param {string} eventType
 * @param {function} handler
 * @param {{ debounceMs?: number }} [options]
 */
export function onRealtimeEvent(eventType, handler, { debounceMs = 0 } = {}) {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, new Set());
    source?.addEventListener(eventType, handleEvent);
  }
  const entry = { handler, debounceMs };
  listeners.get(eventType).add(entry);

  return () => {
    const timer = debounceTimers.get(handler);
    if (timer) { clearTimeout(timer); debounceTimers.delete(handler); }
    listeners.get(eventType)?.delete(entry);
  };
}

export function onRealtimeStatusChange(handler) {
  statusListeners.add(handler);
  handler({ connected });
  return () => {
    statusListeners.delete(handler);
  };
}

export function onRealtimeStaleChange(handler) {
  staleListeners.add(handler);
  handler({ stale });
  return () => {
    staleListeners.delete(handler);
  };
}

export function isRealtimeConnected() {
  return connected;
}

export function isRealtimeStale() {
  return stale;
}

export function startRealtimeClient() {
  connect();
}

export function stopRealtimeClient() {
  disconnect();
  listeners.clear();
  debounceTimers.forEach((t) => clearTimeout(t));
  debounceTimers.clear();
}
