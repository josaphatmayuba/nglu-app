// Tickets — auth partagée avec le CRM via cookie refresh httpOnly (SCRUM-119).
// Token en mémoire applicative uniquement, jamais dans localStorage.
import React, { useEffect, useState } from "react";
import { TicketCheck, Eye, EyeOff } from "lucide-react";

const API_HOST = (typeof window !== "undefined" && window.TICKETS_API_HOST) || "https://dev.ongdngolu.org";
const LOGIN_URL = API_HOST + "/api/auth/login";
const REFRESH_URL = API_HOST + "/api/auth/refresh-token";

let accessToken = null;

export function readToken() { return accessToken; }
function setToken(t) { accessToken = t || null; }

export async function restoreSession() {
  try {
    const res = await fetch(REFRESH_URL, { credentials: "include", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.token) {
      setToken(data.token);
      if (data.role) localStorage.setItem("role", data.role);
      if (data.roleId != null) localStorage.setItem("roleId", String(data.roleId));
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
    ["access-token", "role", "roleId", "user", "id", "isLogged", "email"].forEach((k) =>
      localStorage.removeItem(k),
    );
  } catch {}
  window.dispatchEvent(new CustomEvent("tickets:auth-changed"));
}

export function useAuthToken() {
  const [tok, setTok] = useState(() => readToken());
  useEffect(() => {
    const refresh = () => setTok(readToken());
    window.addEventListener("tickets:auth-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("tickets:auth-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return tok;
}

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        let msg = "Identifiants incorrects";
        try { const j = JSON.parse(body); msg = j.message || msg; } catch {}
        throw new Error(`${msg} (HTTP ${res.status})`);
      }
      const data = await res.json();
      setToken(data.token || "");
      if (data.role) localStorage.setItem("role", data.role);
      if (data.roleId != null) localStorage.setItem("roleId", String(data.roleId));
      const display = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || data.username || "Utilisateur";
      localStorage.setItem("user", display);
      if (data.id != null) localStorage.setItem("id", String(data.id));
      if (data.email) localStorage.setItem("email", data.email);
      localStorage.setItem("isLogged", "true");
      window.dispatchEvent(new CustomEvent("tickets:auth-changed"));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || !username.trim() || !password;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--grad-dark)", fontFamily: "Inter,sans-serif" }}>
      <form onSubmit={submit} className="card" style={{ width: "100%", maxWidth: 390, padding: 28, display: "flex", flexDirection: "column", gap: 16, borderColor: "rgba(255,255,255,.16)", boxShadow: "0 24px 70px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div className="brand-logo" style={{ width: 48, height: 48 }}>
            <TicketCheck size={24} color="#fff" />
          </div>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 24, color: "var(--ink-900)" }}>Tickets</div>
          <div className="muted" style={{ fontSize: 12.5, textAlign: "center" }}>
            Connecte-toi avec ton compte CRM pour accéder aux tickets internes.
          </div>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: ".08em" }}>Identifiant</span>
          <input className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="ton.email@ngolu.org" style={{ width: "100%", height: 42, borderRadius: 8, border: "1px solid var(--line)", background: "#fff", padding: "0 12px", fontSize: 14 }} />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: ".08em" }}>Mot de passe</span>
          <div style={{ position: "relative" }}>
            <input className="input" type={showPw ? "text" : "password"} autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", height: 42, borderRadius: 8, border: "1px solid var(--line)", background: "#fff", padding: "0 44px 0 12px", fontSize: 14 }} />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              style={{ position: "absolute", top: 5, right: 6, width: 32, height: 32, border: 0, borderRadius: 8, background: "transparent", color: "var(--ink-500)", display: "grid", placeItems: "center", cursor: "pointer" }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        {error && <div style={{ padding: 10, borderRadius: 8, background: "#fee2e2", color: "#991b1b", fontSize: 12.5 }}>{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={disabled}
          style={{ width: "100%", justifyContent: "center", opacity: disabled ? 0.65 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
          {submitting ? "Connexion…" : "Se connecter"}
        </button>

        <div className="muted" style={{ fontSize: 11.5, textAlign: "center" }}>
          Même session que le CRM.{" "}
          <a href="/admin/" style={{ color: "var(--iris-600)", fontWeight: 700, textDecoration: "none" }}>Ouvrir le CRM</a>
        </div>
      </form>
    </div>
  );
}
