import { useEffect, useState } from "react";

const KEY = "journal-lang";

const EN = {
  "Journal Entreprise": "Enterprise Journal",
  "Tableau de bord": "Dashboard",
  "Fil d'activité": "Activity feed",
  "Calendrier": "Calendar",
  "Tâches & rappels": "Tasks & reminders",
  "Épinglés": "Pinned",
  "Export": "Export",
  "Audit": "Audit trail",
  "Paramètres": "Settings",
  "Comptabilité": "Accounting",
  "Domus": "Domus",
  "BâtiPro": "BâtiPro",
  "RH": "HR",
  "FarmOS": "FarmOS",
  "Tous": "All",
  "Rechercher": "Search",
  "Nouveau": "New",
  "Annuler": "Cancel",
  "Enregistrer": "Save",
  "Supprimer": "Delete",
  "Modifier": "Edit",
  "Fermer": "Close",
  "Direct": "Live",
  "Hors ligne": "Offline",
  "en attente": "pending",
  "Se déconnecter": "Sign out",
  "Gestionnaire": "Manager",
  "Plus": "More",
  "Tout le reste": "Everything else",
  "Accueil": "Home",
  "Aujourd'hui": "Today",
  "Cette semaine": "This week",
  "Ce mois": "This month",
  "Note": "Note",
  "Appel": "Call",
  "Réunion": "Meeting",
  "Courrier": "Mail",
  "Incident": "Incident",
  "Livraison": "Delivery",
  "Décision": "Decision",
  "Visite": "Visit",
  "Haute": "High",
  "Moyenne": "Medium",
  "Basse": "Low",
};

const DICT = { fr: {}, en: EN };
let current = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) || "fr";

export function getLang() { return current; }

export function setLang(lang) {
  current = lang === "en" ? "en" : "fr";
  try { localStorage.setItem(KEY, current); } catch {}
  if (typeof document !== "undefined") document.documentElement.lang = current;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("journal-lang-changed", { detail: current }));
}

export function t(key) {
  if (current === "fr") return key;
  return (DICT[current] && DICT[current][key]) ?? key;
}

export function useLang() {
  const [lang, setL] = useState(current);
  useEffect(() => {
    const onChange = (e) => setL(e.detail || getLang());
    window.addEventListener("journal-lang-changed", onChange);
    return () => window.removeEventListener("journal-lang-changed", onChange);
  }, []);
  return [lang, setLang];
}
