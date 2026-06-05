// SCRUM-119 — Le JWT d'accès est conservé en mémoire applicative uniquement,
// jamais dans localStorage. Cela limite l'impact d'une faille XSS : un script
// injecté ne peut plus lire le token via localStorage.getItem("access-token").
//
// La session est restaurée au chargement de la page via le cookie httpOnly
// `refreshToken` (endpoint /auth/refresh-token), donc rien à persister côté JS.
let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export function clearAccessToken() {
  accessToken = null;
}
