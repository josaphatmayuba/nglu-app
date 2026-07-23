import { readToken, restoreSession } from "./auth.jsx";

const NATIVE =
  typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true ||
    /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.CHAT_API_HOST) || "https://dev.ongdngolu.org";
export const API_ROOT = (NATIVE ? API_HOST : "") + "/api";
const BASE = `${API_ROOT}/chat`;

function authHeaders() {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

/** En-têtes sans Content-Type : le navigateur pose lui-même le boundary multipart. */
function authHeadersRaw() {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Upload multipart avec réessai après rafraîchissement de session.
 * Utilisé pour les messages vocaux : sur réseau lent, l'upload peut durer
 * assez longtemps pour que l'access-token expire en cours de route.
 */
async function reqMultipart(path, formData, retried = false) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authHeadersRaw(),
    body: formData,
  });
  if (res.status === 401 && !retried) {
    await restoreSession();
    return reqMultipart(path, formData, true);
  }
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function req(path, init = {}, retried = false) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...authHeaders(), ...(init.headers || {}) } });
  if (res.status === 401 && !retried) {
    await restoreSession();
    return req(path, init, true);
  }
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export const api = {
  channels: () => req("/channels"),
  allChannels: () => req("/channels/all"),
  createChannel: (data) => req("/channels", { method: "POST", body: JSON.stringify(data) }),
  joinChannel: (id) => req(`/channels/${id}/join`, { method: "POST" }),
  channelDiscussion: (id) => req(`/channels/${id}/discussion`),
  channelMembers: (id) => req(`/channels/${id}/members`),
  topics: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return req(`/topics${qs ? "?" + qs : ""}`);
  },
  messages: (discussionId, beforeId) =>
    req(`/messages/${discussionId}${beforeId ? "?beforeId=" + beforeId : ""}`),
  sendMessage: (discussionId, content, mentions = []) =>
    req(`/messages/${discussionId}`, { method: "POST", body: JSON.stringify({ content, mentions }) }),
  users: () => req("/users"),

  // ── Appels audio ───────────────────────────────────────────────────────────
  iceServers: () => req("/ice-servers"),
  callHistory: (discussionId) => req(`/calls/${discussionId}`),

  // ── Messages vocaux ────────────────────────────────────────────────────────
  // multipart : on ne passe pas par req(), qui impose Content-Type JSON.
  // Le navigateur doit poser lui-même le boundary du FormData.
  sendVoiceMessage: (discussionId, formData) =>
    reqMultipart(`/voice/${discussionId}`, formData),

  // URL authentifiée d'un vocal : récupérée en blob car le token n'est jamais
  // dans l'URL (JWT en mémoire, cf. règle projet).
  voiceBlobUrl: async (messageId) => {
    const res = await fetch(`${BASE}/voice/${messageId}/file`, { headers: authHeadersRaw() });
    if (!res.ok) throw new Error(`${res.status}`);
    return URL.createObjectURL(await res.blob());
  },
};
