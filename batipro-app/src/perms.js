import React from "react";
import { api } from "./api.js";

// Bug #11 - permissions du rôle, chargées une fois après login, en mémoire (jamais localStorage).
// Fail-open : tant que non chargées, en cas d'échec, ou liste vide (rôle système), `can` renvoie true
// et le backend (403) tranche. Admin = tout.
let granted = null; // Set<string> | null
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn());

export function resetPermissions() {
  granted = null;
  notify();
}

export async function loadPermissions() {
  try {
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const roleId = localStorage.getItem("roleId");
    if (!roleId || /^(admin|super[-_ ]?admin)$/.test(role)) { granted = null; return; }
    const r = await api.rolePermissions(roleId);
    const list = Array.isArray(r?.permissions) ? r.permissions : [];
    granted = list.length ? new Set(list) : null;
  } catch {
    granted = null;
  } finally {
    notify();
  }
}

// perm : "create-batipro" | "update-batipro" | "delete-batipro" | "readAll-batipro"
export function can(perm) {
  return granted === null || granted.has(perm);
}

// Charge les permissions une fois et re-rend le composant quand elles arrivent.
export function usePermissions() {
  const [, setV] = React.useState(0);
  React.useEffect(() => {
    const fn = () => setV((v) => v + 1);
    listeners.add(fn);
    loadPermissions(); // à chaque montage de App (nouvelle session = nouveau rôle possible)
    return () => { listeners.delete(fn); };
  }, []);
  return can;
}
