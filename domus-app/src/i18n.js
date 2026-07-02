// i18n léger pour Domus.
//
// Les CLÉS du dictionnaire sont les chaînes françaises elles-mêmes : on peut
// donc envelopper le texte existant avec `t("Locataires")` sans tout restructurer.
// En français, `t` renvoie la clé telle quelle ; en anglais, sa traduction.
//
// Deux règles importantes pour l'extension à d'autres apps :
// 1. Interpolation : utiliser des placeholders `{name}`, `{count}` dans les clés FR,
//    puis `tf("Clé {placeholder}", {placeholder: value})` au lieu de template strings.
//    Ex: tf("Supprimer {name} ?", {name: row.name}) → "Delete {name}?" en EN.
// 2. Pas de pluriel automatique (pas de moteur ICU) : choisir une forme neutre en FR,
//    traduire la valeur EN à la main.
//    Ex: "{n} intervention(s) ouverte(s)" FR → "{n} open issue(s)" EN.
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
  "Administrateur": "Administrator",
  "Locataire": "Tenant",
  "Utilisateur": "User",
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
  // Écran: placeholder.jsx
  "Ecran en cours de construction": "Screen under construction",
  "La maquette de cet ecran est validee. L'implementation cablee sur l'API arrive dans une prochaine story.": "The mockup for this screen is validated. The API-wired implementation is coming in a next story.",
  // Écran: carte.jsx
  "Patrimoine geolocalise": "Geolocalized portfolio",
  "Carte des proprietes": "Property map",
  "Calques": "Layers",
  "Itineraire": "Route",
  "Residence": "Residence",
  "Bureaux": "Offices",
  "Mixte": "Mixed",
  "Proprietes geolocalisees": "Geolocalized properties",
  "unites occupees": "units occupied",
  "zones suivies": "zones tracked",
  // Écran: dashboard.jsx
  "À faire aujourd'hui": "To do today",
  "{n} intervention(s) ouverte(s)": "{n} open issue(s)",
  "à traiter": "to handle",
  "{n} unité(s) vacante(s)": "{n} vacant unit(s)",
  "à relouer": "to re-rent",
  "Encaisser": "Collect",
  "un loyer": "a rent",
  "Ajouter": "Add",
  "un locataire": "a tenant",
  "Déclarer": "Report",
  "une panne": "a breakdown",
  "Voir": "View",
  "proprietes": "properties",
  "occupé": "occupied",
  "baux actifs": "active leases",
  "Vue d'ensemble": "Overview",
  "Votre parc locatif": "Your rental portfolio",
  "Rechercher propriete, locataire...": "Search property, tenant...",
  "Nouveau bail": "New lease",
  "Proprietes": "Properties",
  "lots": "units",
  "Occupation": "Occupancy",
  "unites": "units",
  "Loyers du mois": "Monthly rent",
  "Maintenance ouverte": "Open maintenance",
  "interventions": "issues",
  "Encaissé cumulé": "Collected total",
  "Total des paiements de loyer enregistrés. Le détail par échéance arrive avec l'écran Loyers (SCRUM-248).": "Total rent payments recorded. Installment details coming in the Rent screen (SCRUM-248).",
  "Parc": "Portfolio",
  "{n} unité(s) vacante(s)": "{n} vacant unit(s)",
  "{n} occupée(s)": "{n} occupied",
  "Impossible de charger les données": "Failed to load data",
  // Écran: landlordSignature.jsx
  "Impossible de lire l'image.": "Failed to read image.",
  "Aucune signature à enregistrer.": "No signature to save.",
  "Signature du bailleur enregistrée.": "Landlord signature saved.",
  "Échec de l'enregistrement.": "Save failed.",
  "Effacer la signature actuelle ? Le cachet textuel par défaut sera utilisé.": "Clear current signature? The default text stamp will be used.",
  "Signature effacée.": "Signature cleared.",
  "Échec.": "Failed.",
  "Signature du bailleur": "Landlord signature",
  "Signature par défaut sur tous les contrats (aperçu, impression, PDF). Partagée avec le CRM.": "Default signature on all contracts (preview, print, PDF). Shared with CRM.",
  "Signature actuelle": "Current signature",
  "Utilisée sur les contrats signés.": "Used on signed contracts.",
  "Cachet eIDAS": "eIDAS stamp",
  "Cachet visuel (non qualifié eIDAS légalement). Valeur probatoire avec horodatage contrat.": "Visual stamp (not legally eIDAS-qualified). Probative value with contract timestamp.",
  "Effacer le tracé": "Clear drawing",
  "Texte": "Text",
  "Police": "Font",
  "Choisir PNG / JPG": "Choose PNG / JPG",
  "Aperçu": "Preview",
  "Enregistrement...": "Saving...",
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

export function tf(key, vars) {
  let s = t(key);
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
  return s;
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
