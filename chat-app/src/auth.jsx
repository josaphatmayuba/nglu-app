// Chat SIFA — auth partagée (même cookie refresh httpOnly que le CRM).
// SCRUM-119 : access-token en mémoire applicative, jamais en localStorage.
import React, { useEffect, useState } from "react";
import { MessageSquare, Eye, EyeOff } from "lucide-react";

const NATIVE =
  typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true ||
    /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.CHAT_API_HOST) || "https://dev.ongdngolu.org";
const LOGIN_URL = (NATIVE ? API_HOST : "") + "/api/auth/login";
const REFRESH_URL = (NATIVE ? API_HOST : "") + "/api/auth/refresh-token";

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
      if (data.id != null) localStorage.setItem("id", String(data.id));
      if (data.email) localStorage.setItem("email", data.email);
      const display = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || data.username || "";
      if (display) localStorage.setItem("user", display);
      localStorage.setItem("isLogged", "true");
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

export function clearToken() {
  setToken(null);
  ["access-token", "role", "roleId", "user", "id", "isLogged", "email"].forEach((k) => {
    try { localStorage.removeItem(k); } catch {}
  });
  window.dispatchEvent(new CustomEvent("chat:auth-changed"));
}

export function useAuthToken() {
  const [token, setT] = useState(() => readToken());
  useEffect(() => {
    const refresh = () => setT(readToken());
    window.addEventListener("chat:auth-changed", refresh);
    return () => window.removeEventListener("chat:auth-changed", refresh);
  }, []);
  return token;
}

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (submitting) return;
    setError(null); setSubmitting(true);
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
        throw new Error(msg);
      }
      const data = await res.json();
      setToken(data.token || "");
      if (data.role) localStorage.setItem("role", data.role);
      if (data.roleId != null) localStorage.setItem("roleId", String(data.roleId));
      if (data.id != null) localStorage.setItem("id", String(data.id));
      if (data.email) localStorage.setItem("email", data.email);
      const display = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || data.username || "";
      if (display) localStorage.setItem("user", display);
      localStorage.setItem("isLogged", "true");
      window.dispatchEvent(new CustomEvent("chat:auth-changed"));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#0f172a", padding:24 }}>
      <form onSubmit={submit} style={{
        width:"100%", maxWidth:380, background:"#1e293b", borderRadius:20, padding:32,
        display:"flex", flexDirection:"column", gap:18, border:"1px solid rgba(255,255,255,0.08)",
        boxShadow:"0 32px 80px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"grid", placeItems:"center" }}>
            <MessageSquare size={26} color="#fff" />
          </div>
          <div style={{ fontFamily:"Space Grotesk,sans-serif", fontWeight:700, fontSize:22, color:"#f1f5f9" }}>Chat SIFA</div>
          <div style={{ fontSize:12, color:"#64748b", textAlign:"center" }}>Messagerie d'entreprise · même session que le CRM</div>
        </div>

        <label style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".08em" }}>Identifiant</span>
          <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="ton.email@ngolu.org"
            style={{ height:42, borderRadius:10, border:"1px solid #334155", background:"#0f172a", color:"#f1f5f9", padding:"0 14px", fontSize:14, outline:"none" }} />
        </label>

        <label style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".08em" }}>Mot de passe</span>
          <div style={{ position:"relative" }}>
            <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ height:42, width:"100%", borderRadius:10, border:"1px solid #334155", background:"#0f172a", color:"#f1f5f9", padding:"0 44px 0 14px", fontSize:14, outline:"none" }} />
            <button type="button" onClick={() => setShowPwd(v => !v)}
              style={{ position:"absolute", top:5, right:6, width:32, height:32, border:0, background:"transparent", color:"#64748b", cursor:"pointer", display:"grid", placeItems:"center" }}>
              {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
        </label>

        {error && <div style={{ padding:"10px 14px", borderRadius:8, background:"#450a0a", color:"#fca5a5", fontSize:12.5 }}>{error}</div>}

        <button type="submit" disabled={submitting || !username.trim() || !password}
          style={{ height:44, borderRadius:10, border:"none", background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", opacity:(submitting||!username.trim()||!password)?.5:1 }}>
          {submitting ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
