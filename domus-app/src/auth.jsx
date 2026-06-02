// Domus — gestion du token d'auth, partagé avec le CRM via localStorage.
// Le CRM (et FarmOS) stockent `access-token` ; Domus le réutilise tel quel.
// En natif (Capacitor), on accepte aussi un token passé en query (?qc=...).
import { useEffect, useState } from "react";

export function readToken() {
  try {
    // Token injecté par le CRM lors d'un deep-link (?qc=...).
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("qc");
      if (q) {
        localStorage.setItem("access-token", q);
        // Nettoie l'URL pour ne pas garder le token visible.
        const url = new URL(window.location.href);
        url.searchParams.delete("qc");
        window.history.replaceState({}, "", url.toString());
      }
    }
  } catch {}
  try {
    return localStorage.getItem("access-token");
  } catch {
    return null;
  }
}

export function clearToken() {
  try {
    ["access-token", "role", "roleId", "user", "id", "isLogged"].forEach((k) =>
      localStorage.removeItem(k),
    );
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("domus:auth-changed"));
  }
}

// Hook : renvoie le token courant et se met à jour sur l'évènement `domus:auth-changed`
// (émis par le client API sur 401, ou par clearToken).
export function useAuthToken() {
  const [token, setToken] = useState(() => readToken());
  useEffect(() => {
    const refresh = () => setToken(readToken());
    window.addEventListener("domus:auth-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("domus:auth-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return token;
}
