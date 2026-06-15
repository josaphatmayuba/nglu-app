// Utilitaires partagés tickets-app.
import { useState, useEffect, useRef } from "react";
import { api } from "./api.js";

// Hook générique fetch avec loading/error/reload — identique à domus data.js.
export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const counter = useRef(0);

  const load = async () => {
    const seq = ++counter.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      if (seq === counter.current) setData(res);
    } catch (err) {
      if (seq === counter.current) setError(err.message || String(err));
    } finally {
      if (seq === counter.current) setLoading(false);
    }
  };

  useEffect(() => { load(); }, deps);
  return { data, loading, error, reload: load };
}

// Formatage monétaire depuis la config serveur.
export function useCurrency() {
  const [symbol, setSymbol] = useState("CDF");
  useEffect(() => {
    api.setting().then((s) => { if (s?.currencySymbol) setSymbol(s.currencySymbol); }).catch(() => {});
  }, []);
  return symbol;
}

export function fmtMoney(amount, symbol = "CDF") {
  const n = Math.round(Number(amount || 0));
  return `${symbol} ${n.toLocaleString("fr-FR")}`;
}

export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// Profil utilisateur depuis localStorage (écrit par auth au login).
export function useCurrentUser() {
  const name = localStorage.getItem("user") || "Utilisateur";
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const role = localStorage.getItem("role") || "";
  const id = Number(localStorage.getItem("id") || 0);
  return { name, initials, role, id };
}

// Libellés catégories de tickets.
export const CATEGORIES = [
  { key: "payment",  label: "Paiement",  icon: "credit-card",     color: "emerald" },
  { key: "purchase", label: "Achat",     icon: "shopping-bag",     color: "indigo"  },
  { key: "leave",    label: "Congé",     icon: "calendar-days",    color: "amber"   },
  { key: "other",    label: "Autre",     icon: "more-horizontal",  color: "ink"     },
];

export const STATUS_LABELS = {
  pending:   { label: "En attente",  color: "amber"   },
  approved:  { label: "Approuvé",    color: "emerald" },
  rejected:  { label: "Rejeté",      color: "rose"    },
  cancelled: { label: "Annulé",      color: "ink"     },
};

export function getCategoryMeta(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[3];
}
