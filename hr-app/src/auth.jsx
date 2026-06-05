import React from "react";

const NATIVE = typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true || /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.HR_API_HOST) || "https://dev.ongdngolu.org";
const LOGIN_URL = (NATIVE ? API_HOST : "") + "/api/auth/login";
const REFRESH_URL = (NATIVE ? API_HOST : "") + "/api/auth/refresh-token";
let accessToken = null;

export function getToken() { return accessToken; }
function setToken(token) { accessToken = token || null; }

export async function restoreSession() {
  try {
    const res = await fetch(REFRESH_URL, { credentials: "include", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.token) {
      setToken(data.token);
      localStorage.setItem("isLogged", "true");
      if (data.role) localStorage.setItem("role", data.role);
      if (data.roleId != null) localStorage.setItem("roleId", String(data.roleId));
      return data.token;
    }
  } catch {}
  return null;
}

export async function bootstrapAuth() {
  try {
    const q = new URLSearchParams(window.location.search).get("qc");
    if (q) {
      setToken(q);
      localStorage.setItem("isLogged", "true");
      const url = new URL(window.location.href);
      url.searchParams.delete("qc");
      window.history.replaceState({}, "", url.toString());
      return;
    }
  } catch {}
  if (!accessToken) await restoreSession();
}

export function clearAuth() {
  setToken(null);
  try { ["access-token", "role", "roleId", "user", "id", "isLogged", "email"].forEach((k) => localStorage.removeItem(k)); } catch {}
}

export function useAuthToken() {
  const [token, updateToken] = React.useState(getToken);
  React.useEffect(() => {
    const update = () => updateToken(getToken());
    window.addEventListener("storage", update);
    window.addEventListener("hr:auth-changed", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("hr:auth-changed", update);
    };
  }, []);
  return token;
}

export function LoginScreen() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) throw new Error(`Connexion refusee (HTTP ${res.status})`);
      const data = await res.json();
      setToken(data.token || "");
      localStorage.setItem("isLogged", "true");
      const display = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || data.username || data.email || "Utilisateur";
      localStorage.setItem("user", display);
      if (data.id != null) localStorage.setItem("id", String(data.id));
      window.dispatchEvent(new CustomEvent("hr:auth-changed"));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">RH</div>
        <h1>Ressources Humaines</h1>
        <p>Connexion avec le compte CRM.</p>
        <label><span>Identifiant</span><input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} /></label>
        <label><span>Mot de passe</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div className="login-error">{error}</div>}
        <button disabled={submitting || !username || !password}>{submitting ? "Connexion..." : "Se connecter"}</button>
        <a href="/admin/">Retour CRM</a>
      </form>
    </main>
  );
}
