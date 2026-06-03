const SESSION_KEYS = ["access-token", "id", "role", "roleId", "user", "isLogged"];

export function hasValidAdminSession() {
  try {
    return Boolean(localStorage.getItem("access-token")) && localStorage.getItem("isLogged") === "true";
  } catch {
    return false;
  }
}

export function clearAdminSession() {
  try {
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage can be unavailable in restricted browser modes.
  }
}
