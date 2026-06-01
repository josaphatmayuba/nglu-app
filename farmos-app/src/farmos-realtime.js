// FarmOS realtime bridge.
// Expected SSE payload from /api/farmos/events:
// { kind, tables, action, id, updatedAt }

const NATIVE = typeof window !== "undefined"
  && (window.Capacitor?.isNativePlatform?.() === true
      || /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.FARMOS_API_HOST) || "https://dev.ongdngolu.org";
const API_ROOT = (NATIVE ? API_HOST : "") + "/api";
const FARMOS_BASE = `${API_ROOT}/farmos`;

let started = false;
let source = null;
let pollTimer = null;
let reconnectTimer = null;
let reconnectAttempt = 0;
let lastSeen = null;

export function startFarmosRealtime() {
  if (started || typeof window === "undefined") return;
  started = true;

  const online = () => {
    if (!hasToken()) return;
    connectSse();
  };
  const offline = () => {
    closeSse();
    stopPolling();
  };
  const authChanged = () => {
    if (hasToken() && navigator.onLine) {
      connectSse();
    } else {
      closeSse();
      stopPolling();
      clearReconnect();
    }
  };

  window.addEventListener("online", online);
  window.addEventListener("offline", offline);
  window.addEventListener("storage", authChanged);
  window.addEventListener("farmos:auth-changed", authChanged);

  if (navigator.onLine && hasToken()) online();
}

function connectSse() {
  if (!hasToken()) return;
  if (source) return;
  if (typeof EventSource === "undefined") {
    startPolling();
    return;
  }

  try {
    source = new EventSource(`${API_ROOT}/events/me${eventQuery()}`);
  } catch {
    scheduleReconnect();
    startPolling();
    return;
  }

  source.onopen = () => {
    reconnectAttempt = 0;
    stopPolling();
  };

  source.onmessage = (event) => {
    const payload = parsePayload(event.data);
    if (payload) dispatchRealtimePayload(payload);
  };

  source.onerror = () => {
    closeSse();
    startPolling();
    scheduleReconnect();
  };
}

function closeSse() {
  if (!source) return;
  try { source.close(); } catch {}
  source = null;
}

function scheduleReconnect() {
  if (reconnectTimer || !navigator.onLine || !hasToken()) return;
  const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt++));
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectSse();
  }, delay);
}

function startPolling() {
  if (pollTimer || !navigator.onLine || !hasToken()) return;
  const poll = () => pollEvents().catch(() => {});
  poll();
  pollTimer = setInterval(poll, 45000);
}

function stopPolling() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}

function clearReconnect() {
  if (!reconnectTimer) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  reconnectAttempt = 0;
}

async function pollEvents() {
  if (!hasToken()) return;
  const res = await fetch(`${FARMOS_BASE}/events/version${lastSeen ? `?since=${encodeURIComponent(lastSeen)}` : ""}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  if (!res.ok) return;
  const payload = await res.json().catch(() => null);
  if (!payload) return;

  if (Array.isArray(payload.events)) {
    payload.events.forEach(dispatchRealtimePayload);
  } else if (Array.isArray(payload.tables)) {
    dispatchRealtimePayload(payload);
  }

  lastSeen = payload.updatedAt || payload.version || lastSeen;
}

function dispatchRealtimePayload(payload) {
  const tables = tablesFromPayload(payload);
  if (!tables.length) return;
  lastSeen = payload.updatedAt || payload.version || lastSeen;
  window.dispatchEvent(new CustomEvent("farmos:data-changed", {
    detail: {
      kind: payload.kind || payload.entity || "realtime",
      tables,
      action: payload.action || null,
      id: payload.id ?? payload.entityId ?? null,
      updatedAt: payload.updatedAt || payload.version || null,
      source: "realtime",
    },
  }));
}

function tablesFromPayload(payload) {
  if (Array.isArray(payload.tables)) return payload.tables.filter(Boolean);
  if (payload.type === "data.updated" && payload.entity === "farmos" && Array.isArray(payload.tags)) {
    const known = new Set([
      "animals", "medicines", "diseases", "treatments", "reproductionEvents",
      "sales", "expenses", "vaccinations", "productionLogs", "vetExams",
      "mortalityEvents", "lookups", "staff", "semenStraws", "workLogs",
    ]);
    return payload.tags.filter((tag) => known.has(tag));
  }
  return [];
}

function parsePayload(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

function authHeaders() {
  const token = currentToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function eventQuery() {
  const token = currentToken();
  const qs = [];
  if (token) qs.push(`token=${encodeURIComponent(token)}`);
  if (lastSeen) qs.push(`since=${encodeURIComponent(lastSeen)}`);
  return qs.length ? `?${qs.join("&")}` : "";
}

function currentToken() {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem("access-token") : null;
  } catch {
    return null;
  }
}

function hasToken() {
  return !!currentToken();
}
