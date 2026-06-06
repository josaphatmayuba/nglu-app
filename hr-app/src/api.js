import { clearAuth, getToken, restoreSession } from "./auth.jsx";

const NATIVE = typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true || /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.HR_API_HOST) || "https://dev.ongdngolu.org";
export const API_ROOT = (NATIVE ? API_HOST : "") + "/api";

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonFetch(path, init = {}, retried = false) {
  const { base = API_ROOT, ...fetchInit } = init;
  const res = await fetch(`${base}${path}`, {
    ...fetchInit,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(fetchInit.headers || {})
    }
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      if (!retried) {
        const token = await restoreSession();
        if (token) return jsonFetch(path, init, true);
      }
      clearAuth();
      window.dispatchEvent(new CustomEvent("hr:auth-changed"));
    }
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} - ${body.slice(0, 180)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  setting: () => jsonFetch("/setting"),
  currencies: () => jsonFetch("/currency?query=all"),
  overview: () => jsonFetch("/hr/staff-overview"),
  shifts: () => jsonFetch("/shift?query=all"),
  awards: () => jsonFetch("/award?query=all"),
  salaryHistory: () => jsonFetch("/salary-history?page=1&count=20"),
  createDesignation: (body) => jsonFetch("/designation", { method: "POST", body: JSON.stringify(body) }),
  createShift: (body) => jsonFetch("/shift", { method: "POST", body: JSON.stringify(body) }),
  createAward: (body) => jsonFetch("/award", { method: "POST", body: JSON.stringify(body) }),
  createSalary: (body) => jsonFetch("/salary-history", { method: "POST", body: JSON.stringify(body) })
};
