/**
 * SSE client singleton — connects to GET /events/me with the current access token.
 * Reconnects automatically with exponential backoff.
 * Listeners registered before connection are queued and replayed on connect.
 */

// Use a relative path so nginx routes to the correct environment's middleware.
// VITE_APP_API bakes in the prod URL at build time; SSE must use the same host.
const SSE_PATH = "/api/events/me";
const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 2_000;

let source = null;
let reconnectTimer = null;
let backoffMs = INITIAL_BACKOFF_MS;
let connected = false;
const listeners = new Map(); // eventType → Set<handler>
const statusListeners = new Set();

function token() {
  return localStorage.getItem("access-token") || "";
}

function connect() {
  if (source) return;
  const t = token();
  if (!t) return; // not logged in — don't connect

  try {
    // EventSource doesn't support custom headers, so we pass the token as a query param.
    // The backend JwtAuthGuard is configured to accept it from query string too (see guard).
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

    // Forward all named events to registered listeners
    for (const [type] of listeners) {
      source.addEventListener(type, handleEvent);
    }

    // Catch-all via onmessage for generic "message" events
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

function handleEvent(event) {
  try {
    const data = JSON.parse(event.data);
    const type = event.type || data.type || "message";
    const handlers = listeners.get(type);
    if (handlers) handlers.forEach((h) => h(data));
  } catch {
    // malformed event — ignore
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

/**
 * Subscribe to an SSE event type. Returns an unsubscribe function.
 */
export function onRealtimeEvent(eventType, handler) {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, new Set());
    // Register on live source if already connected
    source?.addEventListener(eventType, handleEvent);
  }
  listeners.get(eventType).add(handler);
  return () => {
    listeners.get(eventType)?.delete(handler);
  };
}

export function onRealtimeStatusChange(handler) {
  statusListeners.add(handler);
  handler({ connected });
  return () => {
    statusListeners.delete(handler);
  };
}

export function isRealtimeConnected() {
  return connected;
}

export function startRealtimeClient() {
  connect();
}

export function stopRealtimeClient() {
  disconnect();
  listeners.clear();
}
