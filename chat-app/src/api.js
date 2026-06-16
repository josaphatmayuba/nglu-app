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
};
