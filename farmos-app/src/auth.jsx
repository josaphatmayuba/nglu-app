/* eslint-disable */
// Page de connexion FarmOS — fallback quand l'utilisateur arrive sans
// token CRM en localStorage. Réutilise le même endpoint /api/auth/login
// que le CRM, dépose les mêmes clés (access-token, role, roleId, user, id,
// isLogged) pour rester compatible si la même personne ouvre /admin ensuite.

import React from "react";
import { Icon, Brand } from "./icons";
import { useInstallPrompt } from "./pwa";

const MANUAL_HINT_TEXT = {
  "ios-safari": { fr: "Safari : bouton Partager puis « Sur l'écran d'accueil ».", en: "Share button, then \"Add to Home Screen\"." },
  "desktop-safari": { fr: "Safari : menu Fichier puis « Ajouter au Dock ».", en: "File menu, then \"Add to Dock\"." },
  "firefox": { fr: "Firefox ne propose pas encore l'installation PWA — utilise Chrome ou Edge.", en: "Firefox doesn't support PWA install yet — use Chrome or Edge." },
};

const NATIVE = typeof window !== "undefined" && (window.Capacitor?.isNativePlatform?.() === true || /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.FARMOS_API_HOST) || "https://dev.ongdngolu.org";
const LOGIN_URL = (NATIVE ? API_HOST : "") + "/api/auth/login";
const REFRESH_URL = (NATIVE ? API_HOST : "") + "/api/auth/refresh-token";

// SCRUM-119 — l'access-token vit en mémoire applicative, jamais dans localStorage,
// pour limiter l'impact d'une faille XSS. La session est restaurée au chargement
// via le cookie httpOnly `refreshToken` (même backend que le CRM).
let accessToken = null;

// Lit le token courant (en mémoire).
export function getToken() {
  return accessToken;
}

function setToken(t) {
  accessToken = t || null;
}

// Restaure une session via le cookie refresh httpOnly. Renvoie le token ou null.
// SCRUM-119 — si le fetch échoue faute de réseau (pas de réponse serveur), on ne
// doit PAS traiter ça comme une session invalide : on jette une erreur taguée
// `.isNetworkError` pour que l'appelant (api.js) garde la session et réessaie
// plus tard, au lieu de déconnecter l'utilisateur juste parce qu'il est hors ligne.
export async function restoreSession() {
  let res;
  try {
    res = await fetch(REFRESH_URL, { credentials: "include", headers: { Accept: "application/json" } });
  } catch (err) {
    const netErr = new Error("network unavailable during refresh");
    netErr.isNetworkError = true;
    throw netErr;
  }
  try {
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.token) {
      setToken(data.token);
      if (data.role) localStorage.setItem("role", data.role);
      if (data.roleId != null) localStorage.setItem("roleId", String(data.roleId));
      // Le refresh-token expose désormais firstName/lastName/username/email/id :
      // on les stocke comme le login formulaire pour que le UserChip affiche
      // l'utilisateur (sinon « Non connecté » alors qu'on est connecté).
      const display = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || data.username || data.email || "";
      if (display) localStorage.setItem("user", display);
      if (data.id != null) localStorage.setItem("id", String(data.id));
      if (data.email) localStorage.setItem("email", data.email);
      localStorage.setItem("isLogged", "true");
      window.dispatchEvent(new CustomEvent("farmos:auth-changed"));
      return data.token;
    }
  } catch {}
  return null;
}

// Bootstrap au démarrage : consomme un éventuel ?qc= (handoff CRM), sinon
// tente la restauration via le cookie refresh. À appeler avant le rendu.
export async function bootstrapAuth() {
  try {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("qc");
      if (q) {
        setToken(q);
        localStorage.setItem("isLogged", "true");
        const url = new URL(window.location.href);
        url.searchParams.delete("qc");
        window.history.replaceState({}, "", url.toString());
        return;
      }
    }
  } catch {}
  // Hors ligne au boot : restoreSession() jette (isNetworkError). On garde
  // simplement l'utilisateur non connecté pour l'instant, sans le traiter
  // comme une session invalide — il retentera dès que le réseau revient.
  if (!accessToken) {
    try { await restoreSession(); } catch {}
  }
}

export function clearAuth() {
  setToken(null);
  try {
    localStorage.removeItem("access-token");
    localStorage.removeItem("role");
    localStorage.removeItem("roleId");
    localStorage.removeItem("user");
    localStorage.removeItem("id");
    localStorage.removeItem("isLogged");
    localStorage.removeItem("email");
  } catch {}
}

// Hook simple — observe le token via storage events + custom events.
export function useAuthToken() {
  const [token, setToken] = React.useState(getToken);
  React.useEffect(() => {
    const update = () => setToken(getToken());
    window.addEventListener("storage", update);
    window.addEventListener("farmos:auth-changed", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("farmos:auth-changed", update);
    };
  }, []);
  return token;
}

export function LoginScreen({ lang = "fr" }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [mfaToken, setMfaToken] = React.useState(null);
  const [mfaCode, setMfaCode] = React.useState("");
  const { canInstall, promptInstall, manualHint } = useInstallPrompt();
  const [showHint, setShowHint] = React.useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(mfaToken ? { mfaToken, code: mfaCode } : { username, password }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        let msg = (lang === "fr" ? "Identifiants incorrects" : "Invalid credentials");
        try { const j = JSON.parse(body); msg = j.message || msg; } catch {}
        throw new Error(`${msg} (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.requireMfa) {
        setMfaToken(data.mfaToken);
        return;
      }
      // Format CRM : { ...user, role, token }
      try {
        setToken(data.token || ""); // SCRUM-119 — token en mémoire
        if (data.role) localStorage.setItem("role", data.role);
        if (data.roleId != null) localStorage.setItem("roleId", String(data.roleId));
        const display = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || data.username || data.email || "—";
        localStorage.setItem("user", display);
        if (data.id != null) localStorage.setItem("id", String(data.id));
        if (data.email) localStorage.setItem("email", data.email);
        localStorage.setItem("isLogged", "true");
      } catch {}
      window.dispatchEvent(new CustomEvent("farmos:auth-changed"));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0E2418 0%, #163022 100%)",
      padding: 24, fontFamily: "var(--font-sans, system-ui)",
    }}>
      <form onSubmit={submit} style={{
        width: "min(380px, 100%)", boxSizing: "border-box", background: "var(--paper, #FBF8F2)",
        borderRadius: 14, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Brand size={64}/>
          {/* Wordmark officiel (image) au lieu du texte CSS, pour rester fidèle à la charte. */}
          <img src={`${import.meta.env.BASE_URL}farmos-wordmark.png`} alt="FarmOS" style={{ height: 26, width: "auto", display: "block" }}/>
          <div style={{ fontSize: 12, color: "var(--fg-3, #6b6b6b)", textAlign: "center" }}>
            {lang === "fr" ? "Connecte-toi pour accéder à l'élevage" : "Sign in to access your herd"}
          </div>
        </div>

        {!mfaToken ? (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {lang === "fr" ? "Identifiant" : "Username"}
              </span>
              <input autoFocus className="input" autoComplete="username"
                value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder={lang === "fr" ? "ton.email@ferme.ca" : "you@farm.com"}
                style={inputStyle}/>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {lang === "fr" ? "Mot de passe" : "Password"}
              </span>
              <div style={{ position: "relative" }}>
                <input className="input" type={showPwd ? "text" : "password"} autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 40 }}/>
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  style={{ position: "absolute", top: 6, right: 6, background: "transparent", border: 0, cursor: "pointer", padding: 6, color: "var(--fg-3)" }}
                  title={showPwd ? "Masquer" : "Afficher"}>
                  <Icon name={showPwd ? "x" : "search"} size={14} color="currentColor"/>
                </button>
              </div>
            </label>
          </>
        ) : (
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {lang === "fr" ? "Code MFA" : "MFA code"}
            </span>
            <input autoFocus className="input mono" inputMode="numeric" maxLength={6}
              value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456" style={inputStyle}/>
          </label>
        )}

        {error && (
          <div style={{ background: "var(--oxblood-50, #f5e3e3)", color: "var(--oxblood-800, #7a1f2b)", padding: 10, borderRadius: 6, fontSize: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting || (!mfaToken && (!username || !password)) || (mfaToken && mfaCode.length < 6)}
          style={{
            background: "#0E2418", color: "#FBF8F2", padding: "12px 16px", border: 0,
            borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer",
            opacity: submitting ? 0.7 : 1,
          }}>
          {submitting ? (lang === "fr" ? "Connexion…" : "Signing in…") : (lang === "fr" ? "Se connecter" : "Sign in")}
        </button>

        <div style={{ fontSize: 11, color: "var(--fg-3)", textAlign: "center" }}>
          {lang === "fr" ? "Tu as déjà un compte CRM ? " : "Already have a CRM account? "}
          <a href="/admin/" style={{ color: "var(--clay-700)", textDecoration: "none", fontWeight: 600 }}>
            {lang === "fr" ? "Se connecter via le CRM" : "Sign in via CRM"}
          </a>
        </div>

        <button type="button" onClick={() => (canInstall ? promptInstall() : setShowHint((v) => !v))}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            width: "100%", height: 36, border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8,
            background: "transparent", color: "var(--fg-3, #6b6b6b)", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
          }}>
          {lang === "fr" ? "Installer l'application" : "Install the app"}
        </button>
        {showHint && !canInstall && (
          <div style={{ fontSize: 11, color: "var(--fg-3)", textAlign: "center" }}>
            {(MANUAL_HINT_TEXT[manualHint] || {})[lang]
              || (lang === "fr"
                ? "Utilise le menu de ton navigateur pour installer ou ajouter cette page à l'écran d'accueil."
                : "Use your browser's menu to install or add this page to your home screen.")}
          </div>
        )}
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 6,
  border: "1px solid var(--border-2, #d8c8a8)", background: "var(--paper, #fff)",
  fontSize: 14, fontFamily: "inherit", outline: "none",
};
