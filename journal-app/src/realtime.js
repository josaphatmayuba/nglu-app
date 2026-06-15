// Journal — client SSE temps réel (partagé same-origin avec CRM/Domus).
import { useEffect, useRef, useState } from "react";
import { API_ROOT } from "./api.js";
import { readToken } from "./auth.jsx";

const SSE_PATH = `${API_ROOT}/events/me`;
const INITIAL_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 30_000;
const CHANNEL_NAME = "journal-realtime";

let source = null;
let reconnectTimer = null;
let backoffMs = INITIAL_BACKOFF_MS;
let connected = false;
let starts = 0;
const listeners = new Map();
const statusListeners = new Set();

let channel = null;
try {
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (msg) => { if (msg.data?.type === "realtime-event") dispatch(msg.data.event); };
  }
} catch {}

function token() { return readToken() || ""; }
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
  } catch {}
}
function connect() {
  if (source) return;
  const t = token();
  if (!t) return;
  try {
    source = new EventSource(`${SSE_PATH}?token=${encodeURIComponent(t)}`);
    source.addEventListener("open", () => { backoffMs = INITIAL_BACKOFF_MS; setConnected(true); });
    source.addEventListener("error", () => { setConnected(false); source?.close(); source = null; scheduleReconnect(); });
    for (const [type] of listeners) source.addEventListener(type, handleEvent);
  } catch { setConnected(false); scheduleReconnect(); }
}
function scheduleReconnect() {
  if (reconnectTimer || starts <= 0) return;
  reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, backoffMs);
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
}
function disconnect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  source?.close(); source = null; setConnected(false);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && starts > 0 && !source) { backoffMs = INITIAL_BACKOFF_MS; connect(); }
  });
}
if (typeof window !== "undefined") {
  window.addEventListener("online", () => { if (starts > 0 && !source) { backoffMs = INITIAL_BACKOFF_MS; connect(); } });
  window.addEventListener("journal:auth-changed", () => { disconnect(); if (starts > 0) connect(); });
}

export function onRealtimeEvent(type, handler) {
  if (!listeners.has(type)) { listeners.set(type, new Set()); source?.addEventListener(type, handleEvent); }
  listeners.get(type).add(handler);
  return () => listeners.get(type)?.delete(handler);
}
export function startRealtimeClient() { starts += 1; if (starts === 1) connect(); }
export function stopRealtimeClient() { starts = Math.max(0, starts - 1); if (starts === 0) disconnect(); }
export function isRealtimeConnected() { return connected; }

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
      timer = setTimeout(() => { timer = null; reloadRef.current?.(); }, debounceMs);
    });
    return () => { if (timer) clearTimeout(timer); unsub(); stopRealtimeClient(); };
  }, [debounceMs]);
}

export function useRealtimeStatus() {
  const [online, setOnline] = useState(isRealtimeConnected());
  useEffect(() => {
    statusListeners.add(setOnline);
    setOnline(isRealtimeConnected());
    return () => statusListeners.delete(setOnline);
  }, []);
  return online;
}
