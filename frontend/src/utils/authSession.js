import { getAccessToken, clearAccessToken } from "./tokenStore";

// SCRUM-119 — l'access-token n'est plus en localStorage. On garde les clés de
// métadonnées non-secrètes pour le nettoyage des sessions héritées.
const SESSION_KEYS = ["access-token", "id", "role", "roleId", "user", "isLogged"];

export function hasValidAdminSession() {
  try {
    // Le token vit en mémoire (restauré au boot via le cookie refresh). Fallback
    // localStorage pour une éventuelle session client legacy.
    const token = getAccessToken() || localStorage.getItem("access-token");
    return Boolean(token) && localStorage.getItem("isLogged") === "true";
  } catch {
    return false;
  }
}

export function clearAdminSession() {
  clearAccessToken();
  try {
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage can be unavailable in restricted browser modes.
  }
}
