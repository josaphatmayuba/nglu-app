// Migration Cockpit — auth partagée avec le CRM (même session, cookie refresh
// httpOnly). SCRUM-119 : l'access-token vit en mémoire applicative, jamais dans
// localStorage. Mécanisme identique à Domus.
import React, { useEffect, useState } from "react";
import { Database, Eye, EyeOff } from "lucide-react";

const NATIVE =
  typeof window !== "undefined" && /^capacitor:\/\//.test(window.location?.protocol || "");
const API_HOST = (typeof window !== "undefined" && window.MIGRATION_API_HOST) || "https://dev.ongdngolu.org";
const LOGIN_URL = (NATIVE ? API_HOST : "") + "/api/auth/login";
const REFRESH_URL = (NATIVE ? API_HOST : "") + "/api/auth/refresh-token";

let accessToken = null;

export function readToken() {
  return accessToken;
}

function setToken(t) {
  accessToken = t || null;
}

export async function restoreSession() {
  try {
    const res = await fetch(REFRESH_URL, { credentials: "include", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.token) {
      setToken(data.token);
      if (data.role) localStorage.setItem("role", data.role);
      localStorage.setItem("isLogged", "true");
      return data.token;
    }
  } catch {}
  return null;
}

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
  if (!accessToken) await restoreSession();
}

export function clearToken() {
  setToken(null);
  try {
    ["access-token", "role", "isLogged", "user", "email"].forEach((k) => localStorage.removeItem(k));
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("migration:auth-changed"));
  }
}

export function useAuthToken() {
  const [token, setTok] = useState(() => readToken());
  useEffect(() => {
    const refresh = () => setTok(readToken());
    window.addEventListener("migration:auth-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("migration:auth-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return token;
}

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event?.preventDefault?.();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        let message = "Identifiants incorrects";
        try {
          message = JSON.parse(body).message || message;
        } catch {}
        throw new Error(`${message} (HTTP ${res.status})`);
      }
      const data = await res.json();
      setToken(data.token || "");
      if (data.role) localStorage.setItem("role", data.role);
      localStorage.setItem("isLogged", "true");
      window.dispatchEvent(new CustomEvent("migration:auth-changed"));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || !username.trim() || !password;

  return (
    <div className="login-page">
      <form onSubmit={submit} className="card login-card">
        <div className="login-head">
          <div className="brand-logo">
            <Database size={22} color="#fff" />
          </div>
          <div className="login-title">Migration Cockpit</div>
          <div className="muted login-sub">Connecte-toi avec ton compte CRM pour piloter la migration.</div>
        </div>

        <label className="field">
          <span className="field-label">Identifiant</span>
          <input
            autoFocus
            className="input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ton.email@ngolu.org"
          />
        </label>
        <label className="field">
          <span className="field-label">Mot de passe</span>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? "Masquer" : "Afficher"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={disabled} style={{ width: "100%", justifyContent: "center" }}>
          {submitting ? "Connexion..." : "Se connecter"}
        </button>
        <div className="muted" style={{ fontSize: 11.5, textAlign: "center" }}>
          Même session que le CRM. <a href="/admin/" className="link">Ouvrir le CRM</a>
        </div>
      </form>
    </div>
  );
}
