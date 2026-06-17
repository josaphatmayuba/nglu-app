// Journal Entreprise — auth partagée avec le CRM (même cookie refresh httpOnly).
// SCRUM-119 : access-token en mémoire applicative, jamais en localStorage.
import React, { useEffect, useState } from "react";
import { BookOpen, Eye, EyeOff } from "lucide-react";

const NATIVE =
  typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true ||
    /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.JOURNAL_API_HOST) || "https://dev.ongdngolu.org";
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("journal:auth-changed"));
  }
}

export function useAuthToken() {
  const [token, setT] = useState(() => readToken());
  useEffect(() => {
    const refresh = () => setT(readToken());
    window.addEventListener("journal:auth-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("journal:auth-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return token;
}

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [mfaToken, setMfaToken] = useState(null);
  const [mfaCode, setMfaCode] = useState("");

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
        let msg = "Identifiants incorrects";
        try { const j = JSON.parse(body); msg = j.message || msg; } catch {}
        throw new Error(`${msg} (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.requireMfa) { setMfaToken(data.mfaToken); return; }
      setToken(data.token || "");
      if (data.role) localStorage.setItem("role", data.role);
      if (data.roleId != null) localStorage.setItem("roleId", String(data.roleId));
      const display = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || data.username || data.email || "Utilisateur";
      localStorage.setItem("user", display);
      if (data.id != null) localStorage.setItem("id", String(data.id));
      if (data.email) localStorage.setItem("email", data.email);
      localStorage.setItem("isLogged", "true");
      window.dispatchEvent(new CustomEvent("journal:auth-changed"));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const disabled =
    submitting ||
    (!mfaToken && (!username.trim() || !password)) ||
    (mfaToken && mfaCode.length < 6);

  return (
    <div style={pageStyle}>
      <form onSubmit={submit} className="card" style={formStyle}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginBottom:4 }}>
          <div className="brand-logo" style={{ width:48, height:48 }}>
            <BookOpen size={24} color="#fff" />
          </div>
          <div className="font-display" style={{ fontWeight:700, fontSize:24, color:"var(--ink-900)" }}>
            Journal Entreprise
          </div>
          <div className="muted" style={{ fontSize:12.5, textAlign:"center" }}>
            Connecte-toi avec ton compte CRM pour acceder au journal.
          </div>
        </div>

        {!mfaToken ? (
          <>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Identifiant</span>
              <input autoFocus className="input" autoComplete="username" value={username}
                onChange={(e) => setUsername(e.target.value)} placeholder="ton.email@ngolu.org"
                style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Mot de passe</span>
              <div style={{ position:"relative" }}>
                <input className="input" type={showPwd ? "text" : "password"} autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight:44 }} />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={iconBtnStyle}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </>
        ) : (
          <label style={labelStyle}>
            <span style={labelTextStyle}>Code MFA</span>
            <input autoFocus className="input" inputMode="numeric" maxLength={6}
              value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g,""))}
              placeholder="123456" style={inputStyle} />
          </label>
        )}

        {error && <div style={errorStyle}>{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={disabled}
          style={{ width:"100%", justifyContent:"center", opacity:disabled ? 0.65 : 1, cursor:disabled ? "not-allowed":"pointer" }}>
          {submitting ? "Connexion..." : "Se connecter"}
        </button>

        <div className="muted" style={{ fontSize:11.5, textAlign:"center" }}>
          Meme session que le CRM et Domus.{" "}
          <a href="/crm/" style={{ color:"var(--iris-600)", fontWeight:700, textDecoration:"none" }}>
            Ouvrir le CRM
          </a>
        </div>
      </form>
    </div>
  );
}

const pageStyle = {
  minHeight:"100vh", display:"grid", placeItems:"center", padding:24,
  background:"var(--grad-dark)", fontFamily:"Inter, ui-sans-serif, system-ui, sans-serif",
};
const formStyle = {
  width:"100%", maxWidth:390, padding:28, display:"flex", flexDirection:"column", gap:16,
  borderColor:"rgba(255,255,255,0.16)", boxShadow:"0 24px 70px rgba(0,0,0,0.35)",
};
const labelStyle = { display:"flex", flexDirection:"column", gap:6 };
const labelTextStyle = { fontSize:11, fontWeight:800, color:"var(--ink-500)", textTransform:"uppercase", letterSpacing:"0.08em" };
const inputStyle = { width:"100%", height:42, borderRadius:8, border:"1px solid var(--line)", background:"#fff", color:"var(--ink-900)", padding:"0 12px", fontSize:14, outline:"none" };
const iconBtnStyle = { position:"absolute", top:5, right:6, width:32, height:32, border:0, borderRadius:8, background:"transparent", color:"var(--ink-500)", display:"grid", placeItems:"center", cursor:"pointer" };
const errorStyle = { padding:10, borderRadius:8, background:"#fee2e2", color:"#991b1b", fontSize:12.5, lineHeight:1.35 };
