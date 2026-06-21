import axios from "axios";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import "./index.css";

import store from "./redux/rtk/app/store";
import getQuery from "./utils/getQuery";
import { getAccessToken, setAccessToken, clearAccessToken } from "./utils/tokenStore";

const CHUNK_RELOAD_FLAG = "nglu.chunkReloaded";
const isChunkLoadError = (err) => {
  const msg = String(err?.message || err || "");
  return /Failed to fetch dynamically imported module|Loading chunk \d+ failed|Importing a module script failed/i.test(msg);
};
const handleChunkError = (err) => {
  if (!isChunkLoadError(err)) return false;
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_FLAG)) return false;
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
  } catch { /* ignore */ }
  window.location.reload();
  return true;
};
window.addEventListener("error", (e) => { handleChunkError(e?.error); });
window.addEventListener("unhandledrejection", (e) => { handleChunkError(e?.reason); });
window.addEventListener("load", () => {
  setTimeout(() => { try { sessionStorage.removeItem(CHUNK_RELOAD_FLAG); } catch { /* ignore */ } }, 5000);
});

const root = ReactDOM.createRoot(document.getElementById("root"));

axios.defaults.baseURL = import.meta.env.VITE_APP_API;

// [DIAG-LOOP] Detecteur temporaire de boucle de requetes : compte les appels par
// URL (sans querystring) sur une fenetre glissante de 3s ; au-dela de 10 appels,
// console.trace() crache la pile d'appels du coupable. A RETIRER apres diagnostic.
const __loopWindow = new Map(); // key -> [timestamps]
const __loopTraced = new Set();
axios.interceptors.request.use((config) => {
  try {
    const key = String(config.url || "").split("?")[0];
    const now = Date.now();
    const arr = (__loopWindow.get(key) || []).filter((t) => now - t < 3000);
    arr.push(now);
    __loopWindow.set(key, arr);
    if (arr.length > 10 && !__loopTraced.has(key)) {
      __loopTraced.add(key);
      // eslint-disable-next-line no-console
      console.error(`[DIAG-LOOP] ${key} appele ${arr.length}x en 3s — pile ci-dessous`);
      // eslint-disable-next-line no-console
      console.trace(`[DIAG-LOOP] ${key}`);
    }
  } catch { /* ignore */ }
  return config;
});

axios.interceptors.request.use(async (config) => {
  const query = getQuery();
  const isAdminPath = window.location.pathname.includes("/admin");

  if (isAdminPath && query.get("query") === "demo") {
    setAccessToken(query.get("qc"));
    localStorage.setItem("id", query.get("atc"));
    localStorage.setItem("roleId", query.get("bct"));
    localStorage.setItem("role", query.get("tbc"));
    localStorage.setItem("isLogged", query.get(true));
  }

  // Admin : token en mémoire (SCRUM-119). Fallback localStorage pour le flux
  // client eCommerce legacy, qui n'a pas de mécanisme de refresh côté serveur.
  const token = getAccessToken() || localStorage.getItem("access-token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.withCredentials = true;
  return config;
});

const refreshAccessToken = async () => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_APP_API}/auth/refresh-token`,
      {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();
    if (data?.token) {
      setAccessToken(data.token);
      if (data.roleId) localStorage.setItem("roleId", data.roleId);
      if (data.role) localStorage.setItem("role", data.role);
      return data.token;
    } else {
      // localStorage.clear();
      // If token refresh fails or for other errors, reject the promise
      // window.location.replace("/admin/auth/login");
      return undefined;
    }
  } catch (err) {
    // localStorage.clear();
    // If token refresh fails or for other errors, reject the promise
    // window.location.replace("/admin/auth/login");
    return undefined;
  }
};

const clearSession = () => {
  clearAccessToken();
  localStorage.removeItem("access-token");
  localStorage.removeItem("id");
  localStorage.removeItem("role");
  localStorage.removeItem("roleId");
  localStorage.removeItem("user");
  localStorage.removeItem("isLogged");
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const prevRequest = error?.config;
    const isLoginPath = window.location.pathname.includes("/login");
    const isAdminPath = window.location.pathname.includes("/admin");

    if (
      error?.response?.status === 401 &&
      !prevRequest?.sent &&
      isAdminPath &&
      !isLoginPath
    ) {
      prevRequest.sent = true;
      const refreshedToken = await refreshAccessToken();

      if (refreshedToken) {
        error.config.headers.Authorization = `Bearer ${refreshedToken}`;
        return axios(error.config);
      }

      // Refresh failed — clear session and redirect to login
      clearSession();
      window.location.replace("/admin/auth/login");
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// SCRUM-119 — Restauration de session au chargement : l'access-token n'est plus
// persisté, on le récupère depuis le cookie httpOnly `refreshToken` avant le
// rendu pour éviter une rafale de 401 au démarrage. Le flux client eCommerce
// legacy garde son token en localStorage (pas de cookie refresh) : on le laisse.
const bootstrapSession = async () => {
  try {
    if (localStorage.getItem("isLogged") !== "true") return;
    if (localStorage.getItem("access-token")) return; // session client legacy
    const token = await refreshAccessToken();
    if (!token) clearSession();
  } catch {
    /* le rendu se fait quoi qu'il arrive */
  }
};

bootstrapSession().finally(() => {
  root.render(
    <Provider store={store}>
      <App />
    </Provider>
  );
});
