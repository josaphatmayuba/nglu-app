// i18n léger pour Domus.
//
// Les CLÉS du dictionnaire sont les chaînes françaises elles-mêmes : on peut
// donc envelopper le texte existant avec `t("Locataires")` sans tout restructurer.
// En français, `t` renvoie la clé telle quelle ; en anglais, sa traduction.
import { useEffect, useState } from "react";

const KEY = "domus-lang";

const EN = {
  // Shell / navigation
  "Domus - Gestion locative": "Domus - Property management",
  "Pilotage": "Overview",
  "Patrimoine": "Portfolio",
  "Locatif": "Leasing",
  "Espace & config": "Space & settings",
  "Tableau de bord": "Dashboard",
  "Propriétés": "Properties",
  "Carte des propriétés": "Property map",
  "Locataires": "Tenants",
  "Baux": "Leases",
  "Contrats & signature": "Contracts & signing",
  "Onboarding locataire": "Tenant onboarding",
  "Loyers & paiements": "Rent & payments",
  "Paiement & quittance": "Payment & receipt",
  "Maintenance": "Maintenance",
  "Espace locataire": "Tenant portal",
  "Réglages": "Settings",
  "Accueil": "Home",
  "Plus": "More",
  "Tout le reste": "Everything else",
  "Gestionnaire": "Manager",
  "Se deconnecter": "Sign out",
  "Direct": "Live",
  "Hors ligne": "Offline",
  "en attente": "pending",
  // Common
  "Rechercher": "Search",
  "Annuler": "Cancel",
  "Enregistrer": "Save",
  "Supprimer": "Delete",
  "Modifier": "Edit",
  "Nouveau": "New",
  "Fermer": "Close",
  "Actif": "Active",
  "Inactif": "Inactive",
};

const DICT = { fr: {}, en: EN };

let current = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) || "fr";

export function getLang() {
  return current;
}

export function setLang(lang) {
  current = lang === "en" ? "en" : "fr";
  try { localStorage.setItem(KEY, current); } catch {}
  if (typeof document !== "undefined") document.documentElement.lang = current;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("domus-lang-changed", { detail: current }));
  }
}

export function t(key) {
  if (current === "fr") return key;
  return (DICT[current] && DICT[current][key]) ?? key;
}

export function useLang() {
  const [lang, setL] = useState(current);
  useEffect(() => {
    const onChange = (e) => setL(e.detail || getLang());
    window.addEventListener("domus-lang-changed", onChange);
    return () => window.removeEventListener("domus-lang-changed", onChange);
  }, []);
  return [lang, setLang];
}
