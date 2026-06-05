import { getAccessToken } from "./tokenStore";

// SCRUM-119 — token admin en mémoire. Fallback localStorage pour le flux
// client eCommerce legacy (qui n'a pas de cookie refresh).
const GetToken = () => {
  return getAccessToken() || localStorage.getItem("access-token");
};

export default GetToken;
