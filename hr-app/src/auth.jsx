import React from "react";
import { useInstallPrompt } from "./pwa";

const MANUAL_HINT_TEXT = {
  "ios-safari": "Safari : bouton Partager puis « Sur l'écran d'accueil ».",
  "desktop-safari": "Safari : menu Fichier puis « Ajouter au Dock ».",
  "firefox": "Firefox ne propose pas encore l'installation PWA — utilise Chrome ou Edge.",
};
const NATIVE = typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true || /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.HR_API_HOST) || "https://dev.ongdngolu.org";
const LOGIN_URL = (NATIVE ? API_HOST : "") + "/api/auth/login";
const REFRESH_URL = (NATIVE ? API_HOST : "") + "/api/auth/refresh-token";
const LOGOUT_URL = (NATIVE ? API_HOST : "") + "/api/auth/logout";
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
  const token = accessToken;
  // 1) Nettoyer l'etat local et basculer l'UI IMMEDIATEMENT (avant le reseau).
  setToken(null);
  try { ["access-token", "role", "roleId", "user", "id", "isLogged", "email"].forEach((k) => localStorage.removeItem(k)); } catch {}
  try { window.dispatchEvent(new CustomEvent("hr:auth-changed")); } catch {}
  // 2) Invalider le cookie refresh + la famille de tokens cote serveur (best-effort,
  //    en arriere-plan : ne doit pas bloquer le retour a l'ecran de connexion).
  try {
    fetch(LOGOUT_URL, {
      method: "POST",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

// Utilisateur connecté (nom + rôle) depuis localStorage — alimenté au login /
// restauré via le cookie refresh. Plus de nom codé en dur dans l'UI.
export function getUser() {
  let name = "", role = "", id = "", email = "";
  try {
    name = localStorage.getItem("user") || "";
    role = localStorage.getItem("role") || "";
    id = localStorage.getItem("id") || "";
    email = localStorage.getItem("email") || "";
  } catch {}
  return { id, name: name || "Utilisateur", role: role || "", email };
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
      if (data.email) localStorage.setItem("email", String(data.email));
      if (data.role) localStorage.setItem("role", String(data.role));
      if (data.roleId != null) localStorage.setItem("roleId", String(data.roleId));
      window.dispatchEvent(new CustomEvent("hr:auth-changed"));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }
  const { canInstall, promptInstall, manualHint } = useInstallPrompt();
  const [showHint, setShowHint] = React.useState(false);
  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark grad-accent">RH</div>
        <h1 className="font-display">RH <span className="text-grad">NgoluApp</span></h1>
        <p>Connecte-toi avec le même compte que le CRM.</p>
        <label><span>Identifiant</span><input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label>
        <label><span>Mot de passe</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        {error && <div className="login-error">{error}</div>}
        <button className="btn btn-accent grad-accent" disabled={submitting || !username || !password}>{submitting ? "Connexion..." : "Se connecter"}</button>
        <a href="/admin/">Retour au CRM</a>
        <button type="button" className="btn" onClick={() => (canInstall ? promptInstall() : setShowHint((v) => !v))}>
          Installer l'application
        </button>
        {showHint && !canInstall && (
          <p style={{ fontSize: 12, textAlign: "center" }}>
            {MANUAL_HINT_TEXT[manualHint] || "Utilise le menu de ton navigateur pour installer ou ajouter cette page à l'écran d'accueil."}
          </p>
        )}
      </form>
    </main>
  );
}
