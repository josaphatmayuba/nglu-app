import axios from "axios";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import "./index.css";

import store from "./redux/rtk/app/store";
import getQuery from "./utils/getQuery";
const root = ReactDOM.createRoot(document.getElementById("root"));

axios.defaults.baseURL = import.meta.env.VITE_APP_API;
axios.interceptors.request.use(async (config) => {
  const query = getQuery();
  const isAdminPath = window.location.pathname.includes("/admin");

  if (isAdminPath && query.get("query") === "demo") {
    localStorage.setItem("access-token", query.get("qc"));
    localStorage.setItem("id", query.get("atc"));
    localStorage.setItem("roleId", query.get("bct"));
    localStorage.setItem("role", query.get("tbc"));
    localStorage.setItem("isLogged", query.get(true));
  }

  const token = localStorage.getItem("access-token");

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
      localStorage.setItem("access-token", data.token);
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

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
