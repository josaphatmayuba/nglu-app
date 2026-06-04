import React from "react";

const NATIVE =
  typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true || /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.BATIPRO_API_HOST) || "https://dev.ongdngolu.org";
const LOGIN_URL = (NATIVE ? API_HOST : "") + "/api/auth/login";

export function getToken() {
  try { return localStorage.getItem("access-token") || null; } catch { return null; }
}

export function clearAuth() {
  try {
    ["access-token", "role", "roleId", "user", "id", "isLogged", "email"].forEach((k) => localStorage.removeItem(k));
  } catch {}
}

export function useAuthToken() {
  const [token, setToken] = React.useState(getToken);
  React.useEffect(() => {
    const update = () => setToken(getToken());
    window.addEventListener("storage", update);
    window.addEventListener("batipro:auth-changed", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("batipro:auth-changed", update);
    };
  }, []);
  return token;
}

export function LoginScreen() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) throw new Error(`Connexion refusee (HTTP ${res.status})`);
      const data = await res.json();
      localStorage.setItem("access-token", data.token || "");
      if (data.role) localStorage.setItem("role", data.role);
      if (data.roleId != null) localStorage.setItem("roleId", String(data.roleId));
      const display = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || data.username || data.email || "Utilisateur";
      localStorage.setItem("user", display);
      if (data.id != null) localStorage.setItem("id", String(data.id));
      if (data.email) localStorage.setItem("email", data.email);
      localStorage.setItem("isLogged", "true");
      window.dispatchEvent(new CustomEvent("batipro:auth-changed"));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">BP</div>
        <h1>BatiPro Construction</h1>
        <p>Connecte-toi avec le meme compte que le CRM.</p>
        <label>
          <span>Identifiant</span>
          <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          <span>Mot de passe</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && <div className="login-error">{error}</div>}
        <button disabled={submitting || !username || !password}>{submitting ? "Connexion..." : "Se connecter"}</button>
        <a href="/admin/">Retour au CRM</a>
      </form>
    </main>
  );
}
