import React from "react";
import { api } from "./api.js";
import { LoginScreen, useAuthToken, clearAuth, getUser } from "./auth.jsx";
import { AiAssistant } from "./aiAssistant.jsx";
import { defaultSymbol, symbolFor } from "./currency.js";
import {
  fallback, AV_COLORS, presences as fbPresences, conges as fbConges, absents as fbAbsents,
  contrats as fbContrats, dossiers as fbDossiers, timesheet as fbTimesheet, grille as fbGrille,
  frais as fbFrais, declarations as fbDeclarations, performances as fbPerf, formations as fbFormations,
  recrutement as fbRecrutement
} from "./data.js";

/* ───────────────────────────────────────────────────────────────────────
   Icônes (SVG inline, style lucide) — aucune dépendance externe.
   ─────────────────────────────────────────────────────────────────────── */
const P = {
  dashboard: "M3 3h7v7H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 14h7v7H3z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11",
  usersRound: "M18 21a8 8 0 0 0-16 0M10 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10",
  fileText: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  folder: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z",
  fingerprint: "M12 4a8 8 0 0 0-8 8v3M20 12a8 8 0 0 0-4-7M8 20c-.5-1-1-2.5-1-5a5 5 0 0 1 10 0v2M12 12v4M16 18c.3-1 .5-2 .5-3",
  palmtree: "M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2M13 7a5.8 5.8 0 0 1 3.5-1c3 0 5.5 2.24 5.5 5h-3M12 9v13M9 22h6",
  timer: "M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  wallet: "M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5M16 12h.01",
  banknote: "M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M6 9v.01M18 15v.01",
  receipt: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1zM8 7h8M8 11h8M8 15h5",
  fileCheck: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15l2 2 4-4",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2",
  graduationCap: "M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5",
  userPlus: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6",
  network: "M9 2h6v6H9zM2 16h6v6H2zM16 16h6v6h-6zM12 8v4M6 16v-2h12v2",
  barChart: "M3 3v18h18M7 16v-5M12 16V8M17 16v-9",
  circleUser: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M7 20a5 5 0 0 1 10 0M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
  plus: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  building2: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18ZM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4",
  badgeCheck: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.75M9 12l2 2 4-4",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
  chevronRight: "M9 18l6-6-6-6",
  check: "M20 6 9 17l-5-5",
  x: "M18 6 6 18M6 6l12 12",
  calendarDays: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01",
  cake: "M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v2M12 8v2M17 8v2M12 2v2",
  plane: "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z",
  checkCircle: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2",
  userX: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 8l5 5M22 8l-5 5",
  play: "M6 3l14 9-14 9z",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 16v-4M12 8h.01",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 14H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 3.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.4 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.4 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 2z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  menu: "M3 12h18M3 6h18M3 18h18",
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  lightbulb: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.5.5 1 1.3 1 2.3h6c0-1 .5-1.8 1-2.3A7 7 0 0 0 12 2z",
  hardHat: "M2 18h20M10 5.5A6 6 0 0 0 4 11v3h16v-3a6 6 0 0 0-6-5.5M10 5.5V4a2 2 0 0 1 4 0v1.5",
  calculator: "M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h4",
  truck: "M10 17h4V5H2v12h3M20 17h2v-4l-3-4h-4v8h2M5.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  edit: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  circle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  xCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M15 9l-6 6M9 9l6 6",
  award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12M8.21 13.89 7 23l5-3 5 3-1.21-9.12",
  fileBadge: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M5 17a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
};
function Icon({ name, className = "ic", style }) {
  const d = P[name] || P.circle;
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split("M").filter(Boolean).map((seg, i) => <path key={i} d={"M" + seg} />)}
    </svg>
  );
}

/* ── Navigation (sections comme le mockup) ─────────────────────────────── */
const NAV = [
  { id: "dashboard", label: "Tableau de bord", icon: "dashboard" },
  { section: "Équipe" },
  { id: "employes", label: "Employés", icon: "users" },
  { id: "contrats", label: "Contrats", icon: "fileText" },
  { id: "dossiers", label: "Dossiers & documents", icon: "folder" },
  { section: "Temps" },
  { id: "presences", label: "Présences & pointage", icon: "fingerprint" },
  { id: "conges", label: "Congés & absences", icon: "palmtree" },
  { id: "timesheet", label: "Timesheet (projets)", icon: "timer" },
  { section: "Paie & rémunération" },
  { id: "paie", label: "Paie", icon: "wallet" },
  { id: "remuneration", label: "Rémunération", icon: "banknote" },
  { id: "frais", label: "Frais & avances", icon: "receipt" },
  { id: "declarations", label: "Déclarations sociales", icon: "fileCheck" },
  { section: "Développement" },
  { id: "performance", label: "Performance", icon: "target" },
  { id: "formation", label: "Formation", icon: "graduationCap" },
  { id: "recrutement", label: "Recrutement", icon: "userPlus" },
  { section: "Structure & pilotage" },
  { id: "organigramme", label: "Postes & départements", icon: "network" },
  { id: "reporting", label: "Reporting RH", icon: "barChart" },
  { id: "selfservice", label: "Espace employé", icon: "circleUser" },
];
const ITEMS = NAV.filter((n) => n.id);
const TITLES = Object.fromEntries(ITEMS.map((n) => [n.id, n.label]));
const MOB_PRIMARY = ["dashboard", "employes", "presences", "paie"];
const MOB_LABEL = { dashboard: "Accueil", employes: "Équipe", presences: "Pointage", paie: "Paie" };

/* ── Helpers ───────────────────────────────────────────────────────────── */
// Devise résolue depuis la BD (GET /setting + /currency), comme le CRM.
let CUR = "CDF";
let CURRENCIES = []; // liste pour résoudre la devise propre à chaque employé
const nf = new Intl.NumberFormat("fr-FR");
const fc = (v, sym) => `${nf.format(Math.round(Number(v || 0)))} ${sym || CUR}`;
const fcM = (v) => `${(Number(v || 0) / 1e6).toFixed(1).replace(".", ",")} M ${CUR}`;
const salarySym = (u) => symbolFor(u?.currentSalaryCurrencyId, CURRENCIES, CUR);

// Toast léger — fait répondre les boutons sans endpoint dédié.
const DEMO = "Action de démonstration — à connecter au backend.";
function notify(msg) { try { window.dispatchEvent(new CustomEvent("hr:toast", { detail: msg || DEMO })); } catch {} }
function Toaster() {
  const [msg, setMsg] = React.useState(null);
  React.useEffect(() => {
    let t;
    const on = (e) => { setMsg(e.detail); clearTimeout(t); t = setTimeout(() => setMsg(null), 2600); };
    window.addEventListener("hr:toast", on);
    return () => { window.removeEventListener("hr:toast", on); clearTimeout(t); };
  }, []);
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}
function ActionFeed() {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    const on = (e) => {
      const message = e.detail || DEMO;
      const time = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      setItems((cur) => [{ id: `${Date.now()}-${Math.random()}`, message, time }, ...cur].slice(0, 3));
    };
    window.addEventListener("hr:toast", on);
    return () => window.removeEventListener("hr:toast", on);
  }, []);
  if (!items.length) return null;
  return (
    <div className="action-feed" aria-live="polite">
      {items.map((item) => (
        <div className="action-feed-item" key={item.id}>
          <span className="row-ic"><Icon name="checkCircle" /></span>
          <span>{item.message}</span>
          <time>{item.time}</time>
        </div>
      ))}
    </div>
  );
}
// Export CSV réel — télécharge les données affichées, sans backend.
function exportCsv(filename, headers, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 600);
  notify(`Export « ${filename} » téléchargé.`);
}
const fullName = (u) => [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username || u.email || `Employé #${u.id}`;
const initials = (s) => (s || "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const colorFor = (s) => AV_COLORS[(initials(s).charCodeAt(0) + (initials(s).charCodeAt(1) || 0)) % AV_COLORS.length];
const toNum = (v) => v === "" || v == null ? undefined : Number(v);
function cleanPayload(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""));
}

function useIsMobile() {
  const get = () => (typeof window !== "undefined" ? window.innerWidth <= 960 : false);
  const [m, setM] = React.useState(get);
  React.useEffect(() => {
    const on = () => setM(get());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return m;
}

const TODAY = new Date().toISOString().slice(0, 10);
const ACTION_FORMS = {
  designation: { title: "Nouveau poste", submit: "Créer", success: "Poste créé dans la base.", defaults: { name: "" } },
  shift: { title: "Nouvel horaire", submit: "Créer", success: "Horaire créé dans la base.", defaults: { name: "", startTime: "08:00", endTime: "17:00" } },
  award: { title: "Nouvelle récompense", submit: "Créer", success: "Récompense créée dans la base.", defaults: { name: "", description: "" } },
  designationHistory: { title: "Affecter un poste", submit: "Enregistrer", success: "Historique de poste enregistré.", defaults: { userId: "", designationId: "", designationStartDate: new Date().toISOString().slice(0, 10), designationEndDate: "", designationComment: "" } },
  salary: { title: "Nouveau salaire", submit: "Enregistrer", success: "Salaire enregistré dans l'historique.", defaults: { userId: "", salary: 0, salaryStartDate: new Date().toISOString().slice(0, 10), salaryEndDate: "", salaryComment: "", paymentAccountId: 2, currencyId: "" } },
  awardHistory: { title: "Attribuer une récompense", submit: "Enregistrer", success: "Récompense attribuée dans l'historique.", defaults: { userId: "", awardId: "", awardedDate: new Date().toISOString().slice(0, 10), comment: "" } },
  closeAccount: { title: "Fermer le compte", submit: "Confirmer", success: "Compte employé désactivé.", defaults: { userId: "", reason: "Démission", note: "" } },
};

/* ── Petits composants réutilisables ───────────────────────────────────── */
Object.assign(ACTION_FORMS, {
  employee: { title: "Nouvel employÃ©", submit: "CrÃ©er", success: "EmployÃ© crÃ©Ã© dans la base.", defaults: { firstName: "", lastName: "", username: "", password: "ChangeMe123!", email: "", phone: "", roleId: "", departmentId: "", designationId: "", shiftId: "", employeeId: "", joinDate: TODAY, bloodGroup: "" }, fields: [{ key: "firstName", label: "PrÃ©nom", required: true }, { key: "lastName", label: "Nom", required: true }, { key: "username", label: "Identifiant", required: true }, { key: "password", label: "Mot de passe initial", type: "password", required: true }, { key: "roleId", label: "RÃ´le", type: "select", optionKey: "roles", required: true }, { key: "departmentId", label: "DÃ©partement", type: "select", optionKey: "departments" }, { key: "designationId", label: "Poste", type: "select", optionKey: "designations" }, { key: "shiftId", label: "Horaire", type: "select", optionKey: "shifts" }, { key: "email", label: "Email", type: "email" }, { key: "phone", label: "TÃ©lÃ©phone" }, { key: "employeeId", label: "Matricule" }, { key: "joinDate", label: "Date d'embauche", type: "date" }] },
  designation: { title: "Nouveau poste", submit: "CrÃ©er", success: "Poste crÃ©Ã© dans la base.", defaults: { name: "" }, fields: [{ key: "name", label: "Nom du poste", required: true }] },
  shift: { title: "Nouvel horaire", submit: "CrÃ©er", success: "Horaire crÃ©Ã© dans la base.", defaults: { name: "", startTime: "08:00", endTime: "17:00" }, fields: [{ key: "name", label: "Nom", required: true }, { key: "startTime", label: "DÃ©but", type: "time", required: true }, { key: "endTime", label: "Fin", type: "time", required: true }] },
  award: { title: "Nouvelle rÃ©compense", submit: "CrÃ©er", success: "RÃ©compense crÃ©Ã©e dans la base.", defaults: { name: "", description: "" }, fields: [{ key: "name", label: "Nom", required: true }, { key: "description", label: "Description", type: "textarea" }] },
  designationHistory: { title: "Affecter un poste", submit: "Enregistrer", success: "Historique de poste enregistrÃ©.", defaults: { userId: "", designationId: "", designationStartDate: TODAY, designationEndDate: "", designationComment: "" }, fields: [{ key: "userId", label: "EmployÃ©", type: "select", optionKey: "staff", required: true }, { key: "designationId", label: "Poste", type: "select", optionKey: "designations", required: true }, { key: "designationStartDate", label: "DÃ©but", type: "date" }, { key: "designationEndDate", label: "Fin", type: "date" }, { key: "designationComment", label: "Commentaire", type: "textarea" }] },
  salary: { title: "Nouveau salaire", submit: "Enregistrer", success: "Salaire enregistrÃ© dans l'historique.", defaults: { userId: "", salary: 0, salaryStartDate: TODAY, salaryEndDate: "", salaryComment: "", paymentAccountId: 2, currencyId: "" }, fields: [{ key: "userId", label: "EmployÃ©", type: "select", optionKey: "staff", required: true }, { key: "salary", label: "Montant", type: "number", required: true }, { key: "currencyId", label: "Devise", type: "select", optionKey: "currencies" }, { key: "salaryStartDate", label: "Date", type: "date", required: true }, { key: "paymentAccountId", label: "Compte crÃ©dit", type: "select", options: [{ value: 2, label: "Banque" }, { value: 1, label: "Caisse" }] }, { key: "salaryComment", label: "Commentaire", type: "textarea" }] },
  awardHistory: { title: "Attribuer une rÃ©compense", submit: "Enregistrer", success: "RÃ©compense attribuÃ©e dans l'historique.", defaults: { userId: "", awardId: "", awardedDate: TODAY, comment: "" }, fields: [{ key: "userId", label: "EmployÃ©", type: "select", optionKey: "staff", required: true }, { key: "awardId", label: "RÃ©compense", type: "select", optionKey: "awards", required: true }, { key: "awardedDate", label: "Date", type: "date", required: true }, { key: "comment", label: "Commentaire", type: "textarea" }] },
  closeAccount: { title: "Fermer le compte", submit: "Confirmer", success: "Compte employÃ© dÃ©sactivÃ©.", defaults: { userId: "", reason: "DÃ©mission", note: "" }, fields: [{ key: "userId", label: "EmployÃ©", type: "select", optionKey: "staff", required: true }, { key: "reason", label: "Motif", type: "select", options: ["DÃ©mission", "Fin de contrat", "Licenciement", "DÃ©cÃ¨s", "Autre"], required: true }, { key: "note", label: "Note", type: "textarea" }] },
  leaveRequest: { title: "Demande de congÃ©", submit: "Soumettre", success: "Demande de congÃ© enregistrÃ©e.", defaults: { userId: "", type: "CongÃ© annuel", startDate: TODAY, endDate: TODAY, reason: "" }, fields: [{ key: "userId", label: "EmployÃ©", type: "select", optionKey: "staff", required: true }, { key: "type", label: "Type", type: "select", options: ["CongÃ© annuel", "Maladie", "MaternitÃ©", "PaternitÃ©", "Mission", "Autre"], required: true }, { key: "startDate", label: "DÃ©but", type: "date", required: true }, { key: "endDate", label: "Fin", type: "date", required: true }, { key: "reason", label: "Motif", type: "textarea" }] },
  hrContract: { title: "Nouveau contrat RH", submit: "Enregistrer", success: "Contrat RH enregistrÃ©.", defaults: { userId: "", contractType: "CDI", startDate: TODAY, endDate: "", reference: "", notes: "" }, fields: [{ key: "userId", label: "EmployÃ©", type: "select", optionKey: "staff", required: true }, { key: "contractType", label: "Type", type: "select", options: ["CDI", "CDD", "Consultance", "Stage", "Volontariat"], required: true }, { key: "startDate", label: "DÃ©but", type: "date", required: true }, { key: "endDate", label: "Fin", type: "date" }, { key: "reference", label: "RÃ©fÃ©rence" }, { key: "notes", label: "Notes", type: "textarea" }] },
  hrDocument: { title: "Ajouter un document", submit: "Enregistrer", success: "Document RH enregistrÃ©.", defaults: { userId: "", documentType: "Contrat signÃ©", reference: "", fileUrl: "", note: "" }, fields: [{ key: "userId", label: "EmployÃ©", type: "select", optionKey: "staff", required: true }, { key: "documentType", label: "Type", type: "select", options: ["CV", "PiÃ¨ce ID", "DiplÃ´me", "Contrat signÃ©", "NÂ° CNSS", "Code conduite / PSEA", "Attestation"], required: true }, { key: "reference", label: "RÃ©fÃ©rence" }, { key: "fileUrl", label: "Lien fichier" }, { key: "note", label: "Note", type: "textarea" }] },
  expenseRequest: { title: "Nouvelle demande de frais", submit: "Soumettre", success: "Demande de frais enregistrÃ©e.", defaults: { userId: "", type: "Remboursement", amount: 0, requestDate: TODAY, description: "" }, fields: [{ key: "userId", label: "EmployÃ©", type: "select", optionKey: "staff", required: true }, { key: "type", label: "Type", type: "select", options: ["Remboursement", "Avance", "Transport", "Mission", "Communication", "Autre"], required: true }, { key: "amount", label: "Montant", type: "number", required: true }, { key: "requestDate", label: "Date", type: "date", required: true }, { key: "description", label: "Description", type: "textarea" }] },
  socialDeclaration: { title: "DÃ©claration sociale", submit: "PrÃ©parer", success: "DÃ©claration sociale enregistrÃ©e.", defaults: { period: "2026-06", organism: "CNSS", baseAmount: 0, rate: "", amount: 0, dueDate: TODAY, note: "" }, fields: [{ key: "period", label: "PÃ©riode", required: true }, { key: "organism", label: "Organisme", type: "select", options: ["CNSS", "INPP", "ONEM", "DGI / IPR", "Autre"], required: true }, { key: "baseAmount", label: "Base", type: "number" }, { key: "rate", label: "Taux" }, { key: "amount", label: "Montant", type: "number" }, { key: "dueDate", label: "Ã‰chÃ©ance", type: "date" }, { key: "note", label: "Note", type: "textarea" }] },
  performanceReview: { title: "Nouvelle Ã©valuation", submit: "Enregistrer", success: "Ã‰valuation enregistrÃ©e.", defaults: { userId: "", managerId: "", cycle: "S1 2026", score: "", objectives: "", comments: "" }, fields: [{ key: "userId", label: "EmployÃ©", type: "select", optionKey: "staff", required: true }, { key: "managerId", label: "Manager", type: "select", optionKey: "staff" }, { key: "cycle", label: "Cycle", required: true }, { key: "score", label: "Score / 5", type: "number" }, { key: "objectives", label: "Objectifs", type: "textarea" }, { key: "comments", label: "Commentaires", type: "textarea" }] },
  trainingSession: { title: "Session de formation", submit: "Planifier", success: "Formation enregistrÃ©e.", defaults: { title: "", audience: "Toute l'Ã©quipe", sessionDate: TODAY, budget: 0, note: "" }, fields: [{ key: "title", label: "Titre", required: true }, { key: "audience", label: "Public" }, { key: "sessionDate", label: "Date", type: "date" }, { key: "budget", label: "Budget", type: "number" }, { key: "note", label: "Note", type: "textarea" }] },
  recruitmentOffer: { title: "Nouvelle offre", submit: "Publier", success: "Offre de recrutement enregistrÃ©e.", defaults: { role: "", departmentId: "", deadline: TODAY, description: "" }, fields: [{ key: "role", label: "Poste Ã  recruter", required: true }, { key: "departmentId", label: "DÃ©partement", type: "select", optionKey: "departments" }, { key: "deadline", label: "Date limite", type: "date" }, { key: "description", label: "Description", type: "textarea" }] },
});

function KPI({ label, value, sub, subClass = "", icon, tone }) {
  return (
    <div className={`card pad ${tone === "warn" ? "warn" : tone === "danger" ? "danger" : ""}`}>
      <div className="kpi-head"><span className="kpi-label" style={tone === "warn" ? { color: "var(--amber-600)" } : tone === "danger" ? { color: "var(--rose-600)" } : undefined}>{label}</span>{icon && <Icon name={icon} />}</div>
      <div className="kpi-value font-display" style={tone === "warn" ? { color: "var(--amber-700)" } : tone === "danger" ? { color: "var(--rose-600)" } : undefined}>{value}</div>
      {sub != null && <div className={`kpi-sub ${subClass}`}>{sub}</div>}
    </div>
  );
}
function Mini({ label, value, valueClass = "" }) {
  return <div className="card pad"><div className="kpi-label">{label}</div><div className={`font-display ${valueClass}`} style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{value}</div></div>;
}
function Avatar({ name, color, size = 36, sq = false, text }) {
  return <span className={`av ${sq ? "sq" : ""}`} style={{ width: size, height: size, background: color || colorFor(name), fontSize: size <= 30 ? 10 : 12 }}>{text || initials(name)}</span>;
}
function Bar({ pct, cls = "grad-accent" }) {
  const bg = { amber: "var(--amber-400)", sky: "var(--sky-400)", ink: "var(--ink-300)", teal: "var(--teal-400)" }[cls];
  return <div className="bar"><span className={bg ? "" : cls} style={{ width: `${pct}%`, background: bg }} /></div>;
}
function PageHead({ eyebrow, title, action, onAction, actionIcon = "plus", disabled, ghost }) {
  return (
    <div className="topbar">
      <div><p className="eyebrow">{eyebrow}</p><h2 className="title font-display">{title}</h2></div>
      {action && (
        <button className={`btn ${ghost ? "btn-ghost" : "btn-accent grad-accent"}`} disabled={disabled} onClick={onAction}>
          <Icon name={actionIcon} /> {action}
        </button>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   Shell
   ─────────────────────────────────────────────────────────────────────── */
function AppShell() {
  const token = useAuthToken();
  if (!token) return <LoginScreen />;
  return <App />;
}

function App() {
  const [route, setRoute] = React.useState("dashboard");
  const [data, setData] = React.useState({ ...fallback });
  const [apiStatus, setApiStatus] = React.useState("local");
  const [modal, setModal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [moreOpen, setMoreOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const [, forceCur] = React.useState(0);
  const load = React.useCallback(() => {
    Promise.allSettled([
      api.overview(), api.shifts(), api.awards(), api.salaryHistory(), api.roles(), api.setting(), api.currencies(),
      api.leaveRequests(), api.hrContracts(), api.hrDocuments(), api.expenseRequests(), api.socialDeclarations(),
      api.performanceReviews(), api.trainingSessions(), api.recruitmentOffers()
    ])
      .then(([overview, shifts, awards, salaries, roles, setting, currencies, leaves, contracts, documents, expenses, declarations, reviews, trainings, offers]) => {
        const curList = currencies.value?.getAllCurrency || (Array.isArray(currencies.value) ? currencies.value : null);
        if (curList) CURRENCIES = curList;
        if (setting.value && curList) { CUR = defaultSymbol(setting.value, curList, CUR); forceCur((n) => n + 1); }
        const next = {
          staff: overview.value?.staff?.length ? overview.value.staff : fallback.staff,
          designations: overview.value?.designations || fallback.designations,
          departments: overview.value?.departments || fallback.departments,
          shifts: Array.isArray(shifts.value) && shifts.value.length ? shifts.value : fallback.shifts,
          awards: awards.value?.getAllAward || (Array.isArray(awards.value) ? awards.value : null) || fallback.awards,
          salaries: salaries.value?.getAllSalaryHistory || fallback.salaries,
          roles: roles.value?.getAllRole || (Array.isArray(roles.value) ? roles.value : []),
          leaveRequests: leaves.value?.getAllHrLeaveRequest || (Array.isArray(leaves.value) ? leaves.value : []) || [],
          contracts: contracts.value?.getAllHrContract || (Array.isArray(contracts.value) ? contracts.value : []) || [],
          documents: documents.value?.getAllHrDocument || (Array.isArray(documents.value) ? documents.value : []) || [],
          expenseRequests: expenses.value?.getAllHrExpenseRequest || (Array.isArray(expenses.value) ? expenses.value : []) || [],
          socialDeclarations: declarations.value?.getAllHrSocialDeclaration || (Array.isArray(declarations.value) ? declarations.value : []) || [],
          performanceReviews: reviews.value?.getAllHrPerformanceReview || (Array.isArray(reviews.value) ? reviews.value : []) || [],
          trainingSessions: trainings.value?.getAllHrTrainingSession || (Array.isArray(trainings.value) ? trainings.value : []) || [],
          recruitmentOffers: offers.value?.getAllHrRecruitmentOffer || (Array.isArray(offers.value) ? offers.value : []) || [],
        };
        const ok = [overview, shifts, awards, salaries].some((r) => r.status === "fulfilled" && r.value);
        setData(next);
        setApiStatus(ok ? "api" : "local");
      })
      .catch(() => setApiStatus("local"));
  }, []);
  React.useEffect(() => load(), [load]);

  const me = getUser();
  const myInitials = initials(me.name);
  const myRole = me.role || "Ressources humaines";
  const go = (id) => { setRoute(id); setMoreOpen(false); window.scrollTo(0, 0); };

  async function save(kind, form) {
    setBusy(true); setError("");
    try {
      const hrApiKinds = ["leaveRequest", "hrContract", "hrDocument", "expenseRequest", "socialDeclaration", "performanceReview", "trainingSession", "recruitmentOffer"];
      if (hrApiKinds.includes(kind)) {
        if (kind === "leaveRequest") await api.createLeaveRequest(cleanPayload({ userId: Number(form.userId), type: form.type, startDate: form.startDate, endDate: form.endDate, reason: form.reason || null }));
        if (kind === "hrContract") await api.createHrContract(cleanPayload({ userId: Number(form.userId), contractType: form.contractType, startDate: form.startDate, endDate: form.endDate || null, reference: form.reference || null, notes: form.notes || null }));
        if (kind === "hrDocument") await api.createHrDocument(cleanPayload({ userId: Number(form.userId), documentType: form.documentType, reference: form.reference || null, fileUrl: form.fileUrl || null, note: form.note || null }));
        if (kind === "expenseRequest") await api.createExpenseRequest(cleanPayload({ userId: Number(form.userId), type: form.type, amount: Number(form.amount || 0), requestDate: form.requestDate, description: form.description || null }));
        if (kind === "socialDeclaration") await api.createSocialDeclaration(cleanPayload({ period: form.period, organism: form.organism, baseAmount: Number(form.baseAmount || 0), rate: form.rate || null, amount: Number(form.amount || 0), dueDate: form.dueDate || null, note: form.note || null }));
        if (kind === "performanceReview") await api.createPerformanceReview(cleanPayload({ userId: Number(form.userId), managerId: toNum(form.managerId), cycle: form.cycle, score: toNum(form.score), objectives: form.objectives || null, comments: form.comments || null }));
        if (kind === "trainingSession") await api.createTrainingSession(cleanPayload({ title: form.title, audience: form.audience || null, sessionDate: form.sessionDate || null, budget: Number(form.budget || 0), note: form.note || null }));
        if (kind === "recruitmentOffer") await api.createRecruitmentOffer(cleanPayload({ role: form.role, departmentId: toNum(form.departmentId), deadline: form.deadline || null, description: form.description || null }));
        setModal(null); load(); notify(ACTION_FORMS[kind]?.success || `${titleFor(kind)} enregistrÃ© avec l'API.`);
        return;
      }
      if (kind === "employee") {
        await api.createUser(cleanPayload({
          firstName: form.firstName, lastName: form.lastName, username: form.username, password: form.password,
          roleId: Number(form.roleId), email: form.email, phone: form.phone, departmentId: toNum(form.departmentId),
          designationId: toNum(form.designationId), shiftId: toNum(form.shiftId), employeeId: form.employeeId,
          bloodGroup: form.bloodGroup, joinDate: form.joinDate, street: form.street, city: form.city,
          state: form.state, zipCode: form.zipCode, country: form.country,
        }));
      }
      if (kind === "designation") await api.createDesignation({ name: form.name });
      if (kind === "shift") await api.createShift({ name: form.name, startTime: form.startTime, endTime: form.endTime });
      if (kind === "award") await api.createAward({ name: form.name, description: form.description || null });
      if (kind === "designationHistory") await api.createDesignationHistory(cleanPayload({
        userId: Number(form.userId), designationId: Number(form.designationId), designationStartDate: form.designationStartDate,
        designationEndDate: form.designationEndDate || null, designationComment: form.designationComment || null,
      }));
      if (kind === "salary") await api.createSalary(cleanPayload({
        userId: Number(form.userId), salary: Number(form.salary), salaryStartDate: form.salaryStartDate,
        salaryEndDate: form.salaryEndDate || null, salaryComment: form.salaryComment || null,
        paymentAccountId: Number(form.paymentAccountId || 2), currencyId: toNum(form.currencyId),
      }));
      if (kind === "awardHistory") await api.createAwardHistory(cleanPayload({
        userId: Number(form.userId), awardId: Number(form.awardId), awardedDate: form.awardedDate, comment: form.comment || null,
      }));
      if (kind === "closeAccount") {
        const leaveReason = form.note?.trim() ? `${form.reason} — ${form.note.trim()}` : form.reason;
        await api.updateUser(Number(form.userId), { status: "false", leaveDate: new Date().toISOString().slice(0, 10), leaveReason });
      }
      setModal(null); load(); notify(ACTION_FORMS[kind]?.success || `${titleFor(kind)} enregistré avec l'API.`);
      if (kind === "leaveRequest") await api.createLeaveRequest(cleanPayload({
        userId: Number(form.userId), type: form.type, startDate: form.startDate, endDate: form.endDate, reason: form.reason || null,
      }));
      if (kind === "hrContract") await api.createHrContract(cleanPayload({
        userId: Number(form.userId), contractType: form.contractType, startDate: form.startDate, endDate: form.endDate || null,
        reference: form.reference || null, notes: form.notes || null,
      }));
      if (kind === "hrDocument") await api.createHrDocument(cleanPayload({
        userId: Number(form.userId), documentType: form.documentType, reference: form.reference || null,
        fileUrl: form.fileUrl || null, note: form.note || null,
      }));
      if (kind === "expenseRequest") await api.createExpenseRequest(cleanPayload({
        userId: Number(form.userId), type: form.type, amount: Number(form.amount || 0), requestDate: form.requestDate,
        description: form.description || null,
      }));
      if (kind === "socialDeclaration") await api.createSocialDeclaration(cleanPayload({
        period: form.period, organism: form.organism, baseAmount: Number(form.baseAmount || 0), rate: form.rate || null,
        amount: Number(form.amount || 0), dueDate: form.dueDate || null, note: form.note || null,
      }));
      if (kind === "performanceReview") await api.createPerformanceReview(cleanPayload({
        userId: Number(form.userId), managerId: toNum(form.managerId), cycle: form.cycle,
        score: toNum(form.score), objectives: form.objectives || null, comments: form.comments || null,
      }));
      if (kind === "trainingSession") await api.createTrainingSession(cleanPayload({
        title: form.title, audience: form.audience || null, sessionDate: form.sessionDate || null,
        budget: Number(form.budget || 0), note: form.note || null,
      }));
      if (kind === "recruitmentOffer") await api.createRecruitmentOffer(cleanPayload({
        role: form.role, departmentId: toNum(form.departmentId), deadline: form.deadline || null, description: form.description || null,
      }));
    } catch (err) {
      setError(err.message || String(err));
    }
    finally { setBusy(false); }
  }

  const canMutate = true;
  const staff = data.staff.filter((s) => s.status !== "false");
  const masse = staff.reduce((s, u) => s + Number(u.currentSalary || 0), 0);
  const ctx = { data, staff, masse, go, canMutate, setModal };

  const views = {
    dashboard: <Dashboard {...ctx} />,
    employes: <Employes {...ctx} />,
    contrats: <Contrats {...ctx} />,
    dossiers: <Dossiers {...ctx} />,
    presences: <Presences staff={staff} />,
    conges: <Conges {...ctx} />,
    timesheet: <Timesheet />,
    paie: <Paie staff={staff} masse={masse} setModal={setModal} />,
    remuneration: <Remuneration masse={masse} setModal={setModal} />,
    frais: <Frais {...ctx} />,
    declarations: <Declarations {...ctx} />,
    performance: <Performance {...ctx} />,
    formation: <Formation {...ctx} />,
    recrutement: <Recrutement {...ctx} />,
    organigramme: <Organigramme departments={data.departments} designations={data.designations} canMutate={canMutate} onNew={() => setModal({ kind: "designation" })} />,
    reporting: <Reporting />,
    selfservice: <SelfService setModal={setModal} />,
  };

  return (
    <div className="app">
      <aside className="sidebar grad-dark">
        <a className="brand" href="/hr/">
          <span className="brand-icon grad-accent"><Icon name="usersRound" /></span>
          <span className="brand-title font-display">RH NgoluApp</span>
        </a>
        <nav className="nav">
          {NAV.map((item, i) => item.section
            ? <div key={`s${i}`} className="nav-section">{item.section}</div>
            : (
              <button key={item.id} className={`navlink ${route === item.id ? "active" : ""}`} onClick={() => go(item.id)}>
                <Icon name={item.icon} /><span>{item.label}</span>
              </button>
            ))}
        </nav>
        <div className="user-chip">
          <span className="user-avatar grad-accent">{myInitials}</span>
          <div><div className="user-name">{me.name}</div><div className="user-role">{myRole}</div></div>
          <button className="user-logout" title="Se déconnecter" onClick={clearAuth}><Icon name="logout" /></button>
        </div>
      </aside>

      <div className="mob-topbar grad-dark">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="brand-icon grad-accent"><Icon name="usersRound" /></span>
          <span className="mob-title font-display">{TITLES[route]}</span>
        </div>
        <span className="user-avatar grad-accent">{myInitials}</span>
      </div>

      <main className="main">
        <div className="content">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <span className={`source-pill ${apiStatus}`}>{apiStatus === "api" ? "Données live" : "Démo locale"}</span>
          </div>
          {error && <div className="inline-error">{error}</div>}
          <ActionFeed />
          {views[route]}
        </div>
      </main>

      <nav className="mob-nav">
        {MOB_PRIMARY.map((id) => {
          const item = ITEMS.find((x) => x.id === id);
          return (
            <button key={id} className={route === id ? "active" : ""} onClick={() => go(id)}>
              <Icon name={id === "dashboard" ? "home" : item.icon} /><span>{MOB_LABEL[id]}</span>
            </button>
          );
        })}
        <button className={!MOB_PRIMARY.includes(route) ? "active" : ""} onClick={() => setMoreOpen(true)}>
          <Icon name="menu" /><span>Plus</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="more-sheet">
          <div className="more-scrim" onClick={() => setMoreOpen(false)} />
          <div className="more-panel">
            <div className="more-handle" />
            {NAV.filter((n) => n.section || !MOB_PRIMARY.includes(n.id)).map((item, i) => item.section
              ? <div key={`ms${i}`} className="nav-section">{item.section}</div>
              : <button key={item.id} className="navlink" onClick={() => go(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}
          </div>
        </div>
      )}

      {modal && <RecordModal modal={modal} data={data} staff={staff} busy={busy} error={error} onSave={save} onClose={() => setModal(null)} />}
      <Toaster />
      <AiAssistant />
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────────────────────── */
function Dashboard({ data, staff, masse, go, setModal }) {
  const total = staff.length || 42;
  const presents = Math.max(0, total - fbAbsents.length - 1);
  return (
    <>
      <PageHead eyebrow="Vue d'ensemble · juin 2026" title="Ressources humaines" action="Nouvel employé" actionIcon="userPlus" onAction={() => setModal({ kind: "employee" })} />
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <KPI label="Effectif total" value={total} sub="+3 ce trimestre" subClass="up" icon="users" />
        <KPI label="Présents aujourd'hui" value={<>{presents}<span style={{ color: "var(--ink-400)", fontSize: 18 }}>/{total}</span></>} sub="2 congés · 2 missions" icon="fingerprint" />
        <KPI label="Congés en attente" value={fbConges.length} sub="à approuver" tone="warn" icon="palmtree" />
        <KPI label="Masse salariale / mois" value={fcM(masse)} sub="+ 12,3 k$ (expatriés)" icon="wallet" />
      </div>
      <div className="g3">
        <section className="card pad span2">
          <div className="section-head"><h3 className="font-display">Effectif par département</h3><button className="link" onClick={() => go("organigramme")}>Organigramme</button></div>
          {data.departments.map((d) => (
            <div key={d.id} style={{ marginBottom: 12, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontWeight: 500 }}>{d.name}</span><span className="muted">{d.count}</span></div>
              <Bar pct={Math.min(100, d.count * 5)} cls={d.color === "teal" ? "grad-accent" : d.color === "sky" ? "grad-sky" : d.color} />
            </div>
          ))}
        </section>
        <section className="card pad">
          <h3 className="block-title font-display"><Icon name="bell" style={{ color: "var(--rose-500)" }} /> À traiter</h3>
          <Todo icon="palmtree" tone="teal" title={`${fbConges.length} demandes de congé`} sub="2 urgentes" onClick={() => go("conges")} />
          <Todo icon="wallet" tone="sky" title="Paie de juin à valider" sub="42 bulletins" onClick={() => go("paie")} />
          <Todo icon="fileText" tone="amber" title="2 contrats expirent" sub="< 30 jours" onClick={() => go("contrats")} />
          <Todo icon="cake" tone="emerald" title="Anniversaire" sub="G. Mbuyi · demain" />
        </section>
      </div>
    </>
  );
}
function Todo({ icon, tone, title, sub, onClick }) {
  const bg = { teal: "var(--teal-100)", sky: "var(--sky-100)", amber: "var(--amber-100)", emerald: "var(--emerald-100)", rose: "var(--rose-100)" }[tone];
  const fg = { teal: "var(--teal-600)", sky: "var(--sky-600)", amber: "var(--amber-600)", emerald: "var(--emerald-600)", rose: "var(--rose-600)" }[tone];
  return (
    <div className="row" style={{ cursor: onClick ? "pointer" : "default", borderBottom: 0, paddingBottom: 4, paddingTop: 4, marginBottom: 8 }} onClick={onClick}>
      <span className="row-ic" style={{ background: bg, color: fg }}><Icon name={icon} /></span>
      <div style={{ fontSize: 12, flex: 1 }}><div style={{ fontWeight: 600 }}>{title}</div><div className="muted">{sub}</div></div>
      {onClick && <Icon name="chevronRight" style={{ color: "var(--ink-300)" }} />}
    </div>
  );
}

/* ── Employés ──────────────────────────────────────────────────────────── */
function Employes({ staff, setModal }) {
  const enConge = 2, nouveaux = 3, expirent = 2;
  const [q, setQ] = React.useState("");
  const [dept, setDept] = React.useState("");
  const [view, setView] = React.useState("grid");
  const depts = [...new Set(staff.map((u) => u.department?.name).filter(Boolean))];
  const matricule = (u) => `NG-${String(u.id).padStart(3, "0")}`;
  const filtered = staff.filter((u) => {
    const okDept = !dept || u.department?.name === dept;
    const hay = `${fullName(u)} ${u.designation?.name || ""} ${u.department?.name || ""} ${matricule(u)}`.toLowerCase();
    const okQ = !q.trim() || hay.includes(q.trim().toLowerCase());
    return okDept && okQ;
  });
  const exportEmployes = () => exportCsv(
    "employes.csv",
    ["Matricule", "Nom", "Poste", "Département", "Statut", `Salaire (${CUR})`],
    filtered.map((u) => [matricule(u), fullName(u), u.designation?.name || "", u.department?.name || "", u.status === "false" ? "Inactif" : "Actif", Math.round(Number(u.currentSalary || 0))])
  );
  return (
    <>
      <PageHead eyebrow="Annuaire" title="Employés" action="Nouvel employé" actionIcon="userPlus" onAction={() => setModal({ kind: "employee" })} />
      <div className="searchbar">
        <label className="search-input"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un employé, poste, matricule…" /></label>
        <select className={`pillbtn ${dept ? "on" : ""}`} value={dept} onChange={(e) => setDept(e.target.value)} title="Filtrer par département">
          <option value="">Tous les départements</option>
          {depts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button type="button" className="pillbtn" onClick={() => setView(view === "grid" ? "list" : "grid")} title="Changer l'affichage"><Icon name={view === "grid" ? "list" : "dashboard"} /> {view === "grid" ? "Liste" : "Grille"}</button>
        <button type="button" className="pillbtn" onClick={exportEmployes} title="Exporter en CSV"><Icon name="download" /> Exporter</button>
      </div>
      <div className="g4 kpis" style={{ marginBottom: 18 }}>
        <Mini label={q || dept ? "Résultats" : "Actifs"} value={filtered.length} />
        <Mini label="En congé" value={enConge} />
        <Mini label="Nouveaux (30 j)" value={nouveaux} valueClass="" />
        <Mini label="Contrats < 30 j" value={expirent} />
      </div>
      {view === "list" ? (
        <div className="card pad table-card"><div className="tbl-scroll"><table className="tbl" style={{ minWidth: 560 }}>
          <thead><tr><th>Employé</th><th>Poste</th><th>Département</th><th className="r">Salaire</th><th className="r">Statut</th></tr></thead>
          <tbody>{filtered.map((u) => { const name = fullName(u); return (
            <tr key={u.id}>
              <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={name} color={colorFor(name)} size={30} /><div><div style={{ fontWeight: 500 }}>{name}</div><div className="tiny">{matricule(u)}</div></div></div></td>
              <td>{u.designation?.name || "—"}</td>
              <td className="muted">{u.department?.name || "—"}</td>
              <td className="r num">{fc(u.currentSalary, salarySym(u))}</td>
              <td className="r"><span className="chip emerald">{u.status === "false" ? "Inactif" : "Actif"}</span></td>
            </tr>
          ); })}</tbody>
        </table></div></div>
      ) : (
      <div className="emp-grid">
        {filtered.length === 0 && <div className="muted" style={{ gridColumn: "1/-1", textAlign: "center", padding: 24 }}>Aucun employé ne correspond à la recherche.</div>}
        {filtered.map((u) => {
          const name = fullName(u);
          return (
            <div className="card pad" key={u.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={name} color={colorFor(name)} size={48} sq />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                  <div className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.designation?.name || "Poste non assigné"}</div>
                </div>
                <span className="chip emerald" style={{ marginLeft: "auto" }}>{u.status === "false" ? "Inactif" : "Actif"}</span>
              </div>
              <div className="emp-meta">
                <div><Icon name="building2" /> {u.department?.name || "Département"}</div>
                <div><Icon name="badgeCheck" /> {u.designation?.name ? "CDI" : "Contrat"} · matricule NG-{String(u.id).padStart(3, "0")}</div>
                <div><Icon name="phone" /> +243 ··· ·· ··</div>
              </div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{fc(u.currentSalary, salarySym(u))} / mois</span>
                <span style={{ fontSize: 12, color: "var(--teal-600)", fontWeight: 500, display: "flex", alignItems: "center", gap: 2 }}>Profil <Icon name="chevronRight" style={{ width: 14, height: 14 }} /></span>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </>
  );
}

/* ── Présences ─────────────────────────────────────────────────────────── */
function Presences() {
  const [checked, setChecked] = React.useState(false);
  const presents = checked ? 39 : 38;
  const punch = () => {
    setChecked(true);
    notify("Pointage enregistré pour aujourd'hui.");
  };
  return (
    <>
      <PageHead eyebrow="Pointage · jeudi 5 juin 2026" title="Présences & pointage" action={checked ? "Pointage enregistré" : "Pointer maintenant"} actionIcon={checked ? "checkCircle" : "fingerprint"} onAction={punch} ghost={checked} />
      <div className="g4 kpis" style={{ marginBottom: 18 }}>
        <KPI label="Présents" value={presents} icon="checkCircle" />
        <KPI label="Retards" value="3" tone="warn" icon="clock" />
        <KPI label="Absents" value="1" tone="danger" icon="userX" />
        <KPI label="En mission" value="2" icon="plane" />
      </div>
      <div className="card pad">
        <div className="section-head"><h3 className="font-display">Feuille de présence du jour</h3><span className="tiny">90 % de présence</span></div>
        {(checked ? [{ name: "Moi", dept: "Ressources humaines", time: "Pointé maintenant", status: "Présent", chip: "emerald", av: "#14b8a6" }, ...fbPresences] : fbPresences).map((p, i) => (
          <div className="row" key={i}>
            <Avatar name={p.name} color={p.av} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div><div className="tiny">{p.dept}</div></div>
            <div style={{ fontSize: 12, textAlign: "right" }} className={p.chip === "amber" ? "" : "muted"}><span style={p.chip === "amber" ? { color: "var(--amber-600)" } : p.chip === "sky" ? { color: "var(--sky-600)" } : p.chip === "rose" ? { color: "var(--rose-500)" } : undefined}>{p.time}</span></div>
            <span className={`chip ${p.chip}`} style={{ marginLeft: 8 }}>{p.status}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Congés ────────────────────────────────────────────────────────────── */
function Conges({ setModal }) {
  const [requests, setRequests] = React.useState(fbConges);
  const addRequest = () => {
    return setModal({ kind: "leaveRequest" });
  };
  const decide = (index, accepted) => {
    const req = requests[index];
    setRequests((cur) => cur.filter((_, i) => i !== index));
    notify(`${req?.name || "Demande"} ${accepted ? "approuvée" : "refusée"}.`);
  };
  return (
    <>
      <PageHead eyebrow="Absences" title="Congés & absences" action="Nouvelle demande" onAction={addRequest} />
      <div className="g4 kpis" style={{ marginBottom: 18 }}>
        <KPI label="En attente" value={requests.length} tone="warn" />
        <Mini label="Approuvés (mois)" value="8" valueClass="" />
        <Mini label="En congé aujourd'hui" value="2" />
        <Mini label="Solde moyen" value="11 j" />
      </div>
      <div className="g3">
        <section className="card pad span2">
          <h3 className="block-title font-display">Demandes à traiter</h3>
          {requests.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Aucune demande en attente.</div>}
          {requests.map((c, i) => (
            <div className="row" key={i}>
              <Avatar name={c.name} color={c.av} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{c.name} · <span className="muted" style={{ fontWeight: 400 }}>{c.type}</span></div><div className="tiny">{c.detail}</div></div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="btn" style={{ height: 32, padding: "0 10px", background: "var(--emerald-500)", color: "#fff" }} onClick={() => decide(i, true)}><Icon name="check" /></button>
                <button type="button" className="btn btn-ghost" style={{ height: 32, padding: "0 10px", color: "var(--rose-500)" }} onClick={() => decide(i, false)}><Icon name="x" /></button>
              </div>
            </div>
          ))}
        </section>
        <section className="card pad">
          <h3 className="block-title font-display"><Icon name="calendarDays" style={{ color: "var(--teal-600)" }} /> Qui est absent</h3>
          {fbAbsents.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Avatar name={a.name} color={a.av} size={30} />
              <div style={{ fontSize: 12 }}><div style={{ fontWeight: 500 }}>{a.name}</div><div className="muted">{a.detail}</div></div>
            </div>
          ))}
          <div className="kv" style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--ink-100)", color: "var(--ink-500)" }}>
            <div><span>Congé annuel</span><span style={{ color: "var(--ink-700)", fontWeight: 500 }}>26 j / an</span></div>
            <div><span>Maladie</span><span style={{ color: "var(--ink-700)", fontWeight: 500 }}>sur certificat</span></div>
            <div><span>Maternité</span><span style={{ color: "var(--ink-700)", fontWeight: 500 }}>14 sem.</span></div>
          </div>
        </section>
      </div>
    </>
  );
}

/* ── Paie ──────────────────────────────────────────────────────────────── */
function Paie({ staff, masse, setModal }) {
  const net = Math.round(masse * 0.85);
  const exportBulletins = () => exportCsv(
    "bulletins-juin-2026.csv",
    ["Employé", "Poste", `Brut (${CUR})`, `Retenues (${CUR})`, `Net (${CUR})`, "Statut"],
    staff.map((u) => { const brut = Number(u.currentSalary || 0); const ret = Math.round(brut * 0.15); return [fullName(u), u.designation?.name || "", brut, ret, brut - ret, "En attente"]; })
  );
  return (
    <>
      <PageHead eyebrow="Historique DB" title="Paie" action="Nouveau salaire" actionIcon="plus" onAction={() => setModal({ kind: "salary" })} />
      <div className="banner grad-accent">
        <div>
          <div style={{ fontSize: 12, opacity: .85, display: "flex", alignItems: "center", gap: 6 }}><Icon name="wallet" /> Net à payer · juin</div>
          <div className="font-display num" style={{ fontSize: 30, fontWeight: 700 }}>{fcM(net)}</div>
          <div style={{ fontSize: 12, opacity: .85 }}>+ 10,8 k$ (5 expatriés)</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, opacity: .9 }}>
          <div>Brut : {fcM(masse)}</div><div>Cotisations CNSS : 3,1 M FC</div><div>IPR (impôt) : 1,2 M FC</div>
        </div>
      </div>
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <Mini label="Bulletins" value={staff.length} />
        <Mini label="Historique salaires" value={staff.length} valueClass="" />
        <KPI label="À vérifier" value={staff.length} tone="warn" />
        <Mini label="Via mobile money" value={Math.round(staff.length * 0.74)} />
      </div>
      <div className="card pad table-card">
        <div className="section-head"><h3 className="font-display">Bulletins · juin 2026</h3><button type="button" className="link" onClick={exportBulletins}><Icon name="download" style={{ width: 13, height: 13 }} /> Exporter</button></div>
        <div className="tbl-scroll">
          <table className="tbl" style={{ minWidth: 560 }}>
            <thead><tr><th>Employé</th><th className="r">Brut</th><th className="r">Retenues</th><th className="r">Net</th><th className="r">Statut</th></tr></thead>
            <tbody>
              {staff.map((u) => {
                const brut = Number(u.currentSalary || 0); const ret = Math.round(brut * 0.15);
                const name = fullName(u);
                return (
                  <tr key={u.id}>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={name} color={colorFor(name)} size={30} /><div><div style={{ fontWeight: 500 }}>{name}</div><div className="tiny">{u.designation?.name || ""}</div></div></div></td>
                    <td className="r num">{nf.format(brut)}</td>
                    <td className="r num muted">{nf.format(ret)}</td>
                    <td className="r num" style={{ fontWeight: 600 }}>{nf.format(brut - ret)}</td>
                    <td className="r"><span className="chip amber">Historique</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="tiny" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="info" style={{ width: 13, height: 13 }} /> Retenues = CNSS (5 %) + IPR. Versement par M-Pesa / Airtel Money / virement selon l'employé.</p>
      </div>
    </>
  );
}

/* ── Contrats ──────────────────────────────────────────────────────────── */
function Contrats({ setModal }) {
  const [q, setQ] = React.useState("");
  const filtered = fbContrats.filter((c) => !q.trim() || `${c.name} ${c.type} ${c.status}`.toLowerCase().includes(q.trim().toLowerCase()));
  const exportContrats = () => exportCsv("contrats.csv", ["Employé", "Type", "Début", "Fin", "Statut"], filtered.map((c) => [c.name, c.type, c.start, c.end, c.status]));
  return (
    <>
      <PageHead eyebrow="Cycle de vie" title="Contrats" action="Nouveau contrat" onAction={() => setModal({ kind: "hrContract" })} />
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <Mini label="Total contrats" value="42" />
        <Mini label="CDI" value="31" />
        <Mini label="CDD / consultance" value="11" />
        <KPI label="Expirent < 30 j" value="2" tone="warn" />
      </div>
      <div className="card pad table-card">
        <div className="searchbar">
          <label className="search-input"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (employé, type, statut)…" /></label>
          <button type="button" className="pillbtn" onClick={exportContrats}><Icon name="download" /> Exporter</button>
        </div>
        <div className="tbl-scroll">
          <table className="tbl" style={{ minWidth: 620 }}>
            <thead><tr><th>Employé</th><th>Type</th><th>Début</th><th>Fin</th><th className="r">Statut</th></tr></thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td><span className={`chip ${c.chip}`}>{c.type}</span></td>
                  <td>{c.start}</td>
                  <td className="muted">{c.end}</td>
                  <td className="r"><span className={`chip ${c.sChip}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="info" style={{ width: 13, height: 13 }} /> Avenants, renouvellements et alertes d'échéance (&lt; 30 j) gérés par contrat. Fin de contrat → solde de tout compte.</p>
      </div>
    </>
  );
}

/* ── Dossiers ──────────────────────────────────────────────────────────── */
function Dossiers({ setModal }) {
  const cols = ["CV", "Pièce ID", "Diplôme", "Contrat signé", "N° CNSS", "Code conduite (PSEA)"];
  const keys = ["cv", "id", "dip", "ctr", "cnss", "psea"];
  return (
    <>
      <PageHead eyebrow="Dossier du personnel" title="Dossiers & documents" action="Téléverser" actionIcon="upload" onAction={() => setModal({ kind: "hrDocument" })} ghost />
      <div className="g3" style={{ marginBottom: 18 }}>
        <Mini label="Dossiers complets" value="35" valueClass="" />
        <KPI label="Incomplets" value="7" tone="warn" />
        <Mini label="Pièces manquantes" value="12" />
      </div>
      <div className="card pad table-card">
        <h3 className="block-title font-display">Pièces par employé</h3>
        <div className="tbl-scroll">
          <table className="tbl" style={{ minWidth: 680 }}>
            <thead><tr><th>Employé</th>{cols.map((c) => <th key={c} className="c">{c}</th>)}</tr></thead>
            <tbody>
              {fbDossiers.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{d.name}</td>
                  {keys.map((k) => <td key={k} className="c"><Icon name={d[k] ? "checkCircle" : "xCircle"} style={{ width: 16, height: 16, color: d[k] ? "var(--emerald-500)" : "var(--rose-500)", display: "inline" }} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="shield" style={{ width: 13, height: 13, color: "var(--teal-600)" }} /> Coffre numérique par employé. Le <b>code de conduite / PSEA</b> signé est requis (conformité bailleur).</p>
      </div>
    </>
  );
}

/* ── Timesheet ─────────────────────────────────────────────────────────── */
function Timesheet() {
  const tot = (r) => r.kc + r.kin + r.fct;
  const sum = (k) => fbTimesheet.reduce((s, r) => s + r[k], 0);
  return (
    <>
      <PageHead eyebrow="Allocation du temps · juin 2026" title="Timesheet — projets & bailleurs" action="Rapport bailleur" actionIcon="download" onAction={() => exportCsv("timesheet-bailleur-juin-2026.csv", ["Employé", "Kongo Central", "Kinshasa", "Fonctionnement", "Total"], fbTimesheet.map((r) => [r.name, r.kc, r.kin, r.fct, tot(r)]))} ghost />
      <div className="note"><Icon name="lightbulb" /> <span>Chaque agent répartit son temps entre les <b>projets/bailleurs</b>. C'est l'équivalent RH de l'analytique comptable — <b>exigé par les bailleurs</b> pour justifier les salaires imputés.</span></div>
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <Mini label="Heures saisies" value="6 240 h" /><Mini label="Taux de remplissage" value="92 %" valueClass="" />
        <Mini label="% sur projets" value="78 %" /><Mini label="% fonctionnement" value="22 %" />
      </div>
      <div className="card pad table-card tbl-scroll">
        <table className="tbl" style={{ minWidth: 680 }}>
          <thead><tr><th>Employé</th><th className="r">Kongo Central</th><th className="r">Kinshasa</th><th className="r">Fonctionnement</th><th className="r">Total</th></tr></thead>
          <tbody>
            {fbTimesheet.map((r, i) => (
              <tr key={i}><td style={{ fontWeight: 500 }}>{r.name}</td><td className="r">{r.kc} h</td><td className="r">{r.kin} h</td><td className="r">{r.fct} h</td><td className="r" style={{ fontWeight: 600 }}>{tot(r)} h</td></tr>
            ))}
          </tbody>
          <tfoot><tr><td>Total équipe</td><td className="r">{sum("kc")} h</td><td className="r">{sum("kin")} h</td><td className="r">{sum("fct")} h</td><td className="r">6 240 h</td></tr></tfoot>
        </table>
      </div>
    </>
  );
}

/* ── Rémunération ──────────────────────────────────────────────────────── */
function Remuneration({ masse, setModal }) {
  return (
    <>
      <PageHead eyebrow="Grille & primes" title="Rémunération" action="Nouveau salaire" actionIcon="plus" onAction={() => setModal({ kind: "salary" })} />
      <div className="g3" style={{ marginBottom: 18 }}>
        <Mini label="Masse salariale / mois" value={fcM(masse)} />
        <Mini label="Prime transport (total)" value="2,1 M FC" />
        <Mini label="Indemnité terrain" value="1,4 M FC" />
      </div>
      <div className="card pad table-card tbl-scroll">
        <h3 className="block-title font-display">Grille salariale par poste / échelon</h3>
        <table className="tbl num" style={{ minWidth: 620 }}>
          <thead><tr><th>Poste / échelon</th><th className="r">Salaire de base</th><th className="r">Indemnités</th><th className="r">Total brut</th></tr></thead>
          <tbody>
            {fbGrille.map((g, i) => (
              <tr key={i}><td style={{ fontWeight: 500 }}>{g.poste}</td><td className="r">{nf.format(g.base)}</td><td className="r muted">{nf.format(g.ind)}</td><td className="r" style={{ fontWeight: 600 }}>{nf.format(g.brut)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="tiny" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="info" style={{ width: 13, height: 13 }} /> Primes & indemnités configurables (transport, logement, terrain, risque). La grille alimente automatiquement la paie.</p>
      </div>
    </>
  );
}

/* ── Frais & avances ───────────────────────────────────────────────────── */
function Frais({ setModal }) {
  return (
    <>
      <PageHead eyebrow="Remboursements & acomptes" title="Frais & avances" action="Nouvelle demande" onAction={() => setModal({ kind: "expenseRequest" })} />
      <div className="g3" style={{ marginBottom: 18 }}>
        <KPI label="À rembourser / valider" value="3" tone="warn" />
        <Mini label="Avances en cours" value="1,2 M FC" />
        <Mini label="Validé ce mois" value="2,7 M FC" valueClass="" />
      </div>
      <div className="card pad table-card">
        <div className="searchbar"><div className="search-input"><Icon name="search" /> Rechercher (employé, type)…</div></div>
        <div className="tbl-scroll">
          <table className="tbl num" style={{ minWidth: 620 }}>
            <thead><tr><th>Employé</th><th>Type</th><th className="r">Montant</th><th>Date</th><th className="r">Statut</th></tr></thead>
            <tbody>
              {fbFrais.map((f, i) => (
                <tr key={i}><td style={{ fontWeight: 500 }}>{f.name}</td><td>{f.type}</td><td className="r">{nf.format(f.amount)}</td><td>{f.date}</td><td className="r"><span className={`chip ${f.chip}`}>{f.status}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Déclarations sociales ─────────────────────────────────────────────── */
function Declarations({ setModal }) {
  return (
    <>
      <PageHead eyebrow="Cotisations & impôts · juin 2026" title="Déclarations sociales & fiscales" action="Préparer les bordereaux" actionIcon="fileCheck" onAction={() => setModal({ kind: "socialDeclaration" })} />
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <Mini label="CNSS (sécurité sociale)" value="3 124 000" />
        <Mini label="INPP (formation prof.)" value="568 000" />
        <Mini label="ONEM (emploi)" value="57 000" />
        <KPI label="IPR (impôt salaires)" value="1 240 000" tone="warn" />
      </div>
      <div className="card pad table-card tbl-scroll">
        <table className="tbl num" style={{ minWidth: 600 }}>
          <thead><tr><th>Organisme</th><th className="r">Base</th><th className="r">Taux</th><th className="r">Montant</th><th className="r">Échéance</th></tr></thead>
          <tbody>
            {fbDeclarations.map((d, i) => (
              <tr key={i}><td style={{ fontWeight: 500 }}>{d.org}</td><td className="r">{nf.format(d.base)}</td><td className="r">{d.taux}</td><td className="r" style={d.warn ? { color: "var(--amber-700)" } : undefined}>{nf.format(d.montant)}</td><td className="r muted">{d.ech}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="tiny" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="info" style={{ width: 13, height: 13 }} /> Cotisations RDC calculées depuis la paie. Bordereaux CNSS/INPP/ONEM et déclaration IPR à la DGI.</p>
      </div>
    </>
  );
}

/* ── Performance ───────────────────────────────────────────────────────── */
function Performance({ setModal }) {
  return (
    <>
      <PageHead eyebrow="Évaluations · cycle S1 2026" title="Performance" action="Nouvelle évaluation" onAction={() => setModal({ kind: "performanceReview" })} />
      <div className="g4 kpis" style={{ marginBottom: 18 }}>
        <Mini label="Évaluations faites" value={<>26<span style={{ color: "var(--ink-400)", fontSize: 16 }}>/42</span></>} />
        <Mini label="Note moyenne" value={<>3,9<span style={{ color: "var(--ink-400)", fontSize: 16 }}>/5</span></>} valueClass="" />
        <Mini label="Objectifs atteints" value="72 %" valueClass="" />
        <KPI label="À faire" value="16" tone="warn" />
      </div>
      <div className="card pad">
        <h3 className="block-title font-display">Évaluations par employé</h3>
        {fbPerf.map((p, i) => (
          <div className="row" key={i}>
            <Avatar name={p.name} color={colorFor(p.name)} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div><div className="tiny">{p.role}</div></div>
            <div style={{ width: 120 }} className="desk-only"><Bar pct={p.pct} cls={p.bar} /></div>
            <span className="font-display" style={{ fontWeight: 700, fontSize: 14, width: 40, textAlign: "right", color: p.score == null ? "var(--ink-300)" : undefined }}>{p.score != null ? p.score.toFixed(1).replace(".", ",") : "—"}</span>
            <span className={`chip ${p.chip}`} style={{ marginLeft: 8 }}>{p.status}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Formation ─────────────────────────────────────────────────────────── */
function Formation({ setModal }) {
  return (
    <>
      <PageHead eyebrow="Plan de formation 2026" title="Formation & compétences" action="Nouvelle session" onAction={() => setModal({ kind: "trainingSession" })} />
      <div className="g3" style={{ marginBottom: 18 }}>
        <Mini label="Sessions planifiées" value="6" />
        <Mini label="Agents formés (2026)" value="23" valueClass="" />
        <Mini label="Budget formation" value="3,5 M FC" />
      </div>
      <div className="card pad">
        <h3 className="block-title font-display">Sessions</h3>
        {fbFormations.map((f, i) => (
          <div className="row" key={i}>
            <span className="row-ic" style={{ background: f.chip === "emerald" ? "var(--emerald-100)" : "var(--teal-100)", color: f.chip === "emerald" ? "var(--emerald-600)" : "var(--teal-600)" }}><Icon name={f.icon} /></span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{f.title}</div><div className="tiny">{f.who}</div></div>
            <span className={`chip ${f.chip}`}>{f.status}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Recrutement (kanban) ──────────────────────────────────────────────── */
function Recrutement({ setModal }) {
  const cols = [
    { title: "Candidatures", count: 18, chip: "ink", items: fbRecrutement.candidatures },
    { title: "Présélection", count: 9, chip: "ink", items: fbRecrutement.preselection },
    { title: "Entretien", count: 6, chip: "sky", items: fbRecrutement.entretien },
    { title: "Offre / embauche", count: 4, chip: "emerald", items: fbRecrutement.offre },
  ];
  return (
    <>
      <PageHead eyebrow="Pipeline" title="Recrutement" action="Nouvelle offre" onAction={() => setModal({ kind: "recruitmentOffer" })} />
      <div className="g3" style={{ marginBottom: 18 }}>
        <div className="card pad"><div className="kpi-label">Offres ouvertes</div><div className="font-display kpi-value">3</div><div className="tiny" style={{ marginTop: 4 }}>Agent terrain · Comptable · Chauffeur</div></div>
        <div className="card pad"><div className="kpi-label">Candidatures</div><div className="font-display kpi-value">37</div><div className="tiny" style={{ marginTop: 4 }}>12 cette semaine</div></div>
        <div className="card pad"><div className="kpi-label">Entretiens prévus</div><div className="font-display kpi-value" style={{ color: "var(--sky-600)" }}>6</div><div className="tiny" style={{ marginTop: 4 }}>cette semaine</div></div>
      </div>
      <div className="kanban">
        {cols.map((col) => (
          <div className="kanban-col" key={col.title}>
            <div className="kanban-head"><span>{col.title}</span><span className={`chip ${col.chip}`}>{col.count}</span></div>
            {col.items.map((it, i) => (
              <div className="kanban-card" key={i} style={it.ok ? { boxShadow: "inset 0 0 0 1px var(--emerald-500)" } : undefined}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{it.name}</div>
                <div className="tiny" style={it.ok ? { color: "var(--emerald-600)" } : undefined}>{it.role}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Organigramme ──────────────────────────────────────────────────────── */
function Organigramme({ departments, designations, canMutate, onNew }) {
  const tones = { teal: { bg: "var(--teal-50)", bd: "var(--teal-200)", fg: "var(--teal-800)", sub: "var(--teal-600)" }, sky: { bg: "var(--sky-50)", bd: "var(--sky-400)", fg: "var(--sky-700)", sub: "var(--sky-600)" }, emerald: { bg: "var(--emerald-100)", bd: "var(--emerald-500)", fg: "var(--emerald-700)", sub: "var(--emerald-600)" }, amber: { bg: "var(--amber-50)", bd: "var(--amber-400)", fg: "var(--amber-700)", sub: "var(--amber-600)" }, ink: { bg: "var(--ink-50)", bd: "var(--ink-200)", fg: "var(--ink-700)", sub: "var(--ink-500)" } };
  const palette = ["accent-soft", "sky-soft", "emerald", "amber", "ink"];
  return (
    <>
      <PageHead eyebrow="Structure" title="Postes & départements" action="Nouveau poste" onAction={onNew} disabled={!canMutate} />
      <div className="card pad" style={{ marginBottom: 18 }}>
        <div className="org-top">
          <div className="org-node grad-dark" style={{ color: "#fff" }}><div style={{ fontWeight: 600, fontSize: 13 }}>Direction nationale</div><div style={{ fontSize: 11, color: "var(--ink-300)" }}>1 poste</div></div>
          <div className="org-line" />
          <div className="org-children">
            {departments.slice(0, 4).map((d) => {
              const t = tones[d.color] || tones.ink;
              return <div key={d.id} className="org-node" style={{ background: t.bg, border: `1px solid ${t.bd}` }}><div style={{ fontWeight: 600, fontSize: 13, color: t.fg }}>{d.name.split(" ")[0]}</div><div style={{ fontSize: 11, color: t.sub }}>{d.count} personnes</div></div>;
            })}
          </div>
        </div>
      </div>
      <div className="g2">
        <div className="card pad">
          <h3 className="block-title font-display">Départements</h3>
          {departments.map((d) => (
            <div className="row" key={d.id}>
              <span className="row-ic" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}><Icon name={d.color === "sky" ? "truck" : d.color === "emerald" ? "calculator" : d.color === "amber" ? "usersRound" : "target"} /></span>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{d.name}</div><div className="tiny">Resp. {d.head}</div></div>
              <span className="chip ink">{d.count}</span>
            </div>
          ))}
        </div>
        <div className="card pad">
          <h3 className="block-title font-display">Postes (désignations)</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {designations.map((d, i) => <span key={d.id} className={`chip ${palette[i % palette.length]}`}>{d.name}</span>)}
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 16, height: 36 }} disabled={!canMutate} onClick={onNew}><Icon name="plus" /> Ajouter un poste</button>
        </div>
      </div>
    </>
  );
}

/* ── Reporting RH ──────────────────────────────────────────────────────── */
function Reporting() {
  const dep = [{ l: "Programmes & terrain", v: 16, p: 80, c: "grad-accent" }, { l: "Logistique", v: 9, p: 45, c: "grad-sky" }, { l: "Finances & compta", v: 6, p: 30, c: "teal" }, { l: "Administration & RH", v: 5, p: 25, c: "sky" }];
  const proj = [{ l: "Programme Kinshasa", v: "11,4 M", p: 40, c: "grad-accent" }, { l: "Programme Kongo Central", v: "8,6 M", p: 30, c: "grad-accent" }, { l: "Fonctionnement / structure", v: "8,4 M", p: 30, c: "amber" }];
  return (
    <>
      <PageHead eyebrow="Analytique RH" title="Reporting RH" action="Exporter" actionIcon="download" onAction={() => exportCsv("reporting-rh-juin-2026.csv", ["Indicateur", "Valeur"], [["Effectif", 42], ["Turnover annuel", "9 %"], ["Ancienneté moyenne", "3,4 ans"], ["Ratio H/F", "58 / 42"]])} ghost />
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <Mini label="Effectif" value="42" /><Mini label="Turnover (annuel)" value="9 %" />
        <Mini label="Ancienneté moy." value="3,4 ans" /><Mini label="Ratio H / F" value="58 / 42" />
      </div>
      <div className="g2">
        <div className="card pad">
          <h3 className="block-title font-display">Effectif par département</h3>
          {dep.map((d, i) => <div key={i} style={{ marginBottom: 12, fontSize: 13 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span>{d.l}</span><span className="muted">{d.v}</span></div><Bar pct={d.p} cls={d.c} /></div>)}
        </div>
        <div className="card pad">
          <h3 className="block-title font-display">Masse salariale par projet</h3>
          {proj.map((d, i) => <div key={i} style={{ marginBottom: 12, fontSize: 13 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span>{d.l}</span><span className="muted num">{d.v}</span></div><Bar pct={d.p} cls={d.c} /></div>)}
          <p className="tiny" style={{ marginTop: 8 }}>Alimenté par le timesheet → justifie les salaires imputés à chaque bailleur.</p>
        </div>
      </div>
    </>
  );
}

/* ── Espace employé (self-service) ─────────────────────────────────────── */
function SelfService({ setModal }) {
  const tiles = [
    { icon: "receipt", title: "Mon bulletin", rows: [["Net juin", "1 062 500 FC"], ["Versé par", "M-Pesa"]], btn: "Bulletin + historique (12)", bicon: "download", request: "Télécharger mon bulletin" },
    { icon: "palmtree", title: "Mes congés", rows: [["Solde annuel", "14 j"], ["En attente", "0"]], btn: "Demander un congé", bicon: "plus", accent: true, request: "Demander un congé" },
    { icon: "timer", title: "Ma feuille de temps", rows: [["Semaine 23", "À soumettre"], ["Réparti sur", "3 projets"]], btn: "Saisir mes heures", bicon: "edit", accent: true, request: "Saisir mes heures" },
    { icon: "banknote", title: "Mes frais & avances", rows: [["Avance en cours", "250 000 FC"], ["Note de frais", "1 en validation"]], btn: "Nouvelle demande", bicon: "plus", request: "Nouvelle demande de frais" },
    { icon: "fingerprint", title: "Mes présences", rows: [["Aujourd'hui", "Pointé 08:02"], ["Heures du mois", "168 h"]], btn: "Pointer la sortie", bicon: "logout", request: "Pointer la sortie" },
    { icon: "target", title: "Ma performance", rows: [["Objectifs Q2", "3 / 5 atteints"], ["Auto-éval.", "À remplir"]], btn: "Mon évaluation", bicon: "edit", request: "Remplir mon évaluation" },
    { icon: "graduationCap", title: "Mes formations", rows: [["PSEA — code de conduite", "Certifié"], ["Sécurité terrain", "12 juin"]], btn: "Mes certificats", bicon: "award", request: "Demander mes certificats" },
    { icon: "folder", title: "Mes documents", rows: [["Contrat de travail", ""], ["Carte CNSS", ""], ["Bulletins", "12"]], btn: "Déposer un document", bicon: "upload", request: "Déposer un document" },
    { icon: "circleUser", title: "Mon profil & paiement", rows: [["Mobile money", "M-Pesa ••• 412"], ["Contact urgence", "Renseigné"]], btn: "Mettre à jour mes infos", bicon: "edit", request: "Mettre à jour mes infos" },
  ];
  return (
    <>
      <PageHead eyebrow="Portail · vue agent" title="Espace employé (self-service)" />
      <div className="note"><Icon name="phone" /> <span>Ce que voit <b>l'employé</b> sur son téléphone : il consulte sa paie, pose ses congés, soumet sa feuille de temps et ses frais, télécharge ses attestations — <b>en autonomie</b>.</span></div>
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <div className="card pad"><div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="wallet" style={{ width: 14, height: 14, color: "var(--teal-600)" }} /> Prochaine paie</div><div className="num" style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>30 juin</div><div className="tiny">≈ 1 062 500 FC · M-Pesa</div></div>
        <div className="card pad"><div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="palmtree" style={{ width: 14, height: 14, color: "var(--teal-600)" }} /> Solde congés</div><div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>14 j</div><div className="tiny">sur 18 j acquis</div></div>
        <div className="card pad"><div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="clock" style={{ width: 14, height: 14, color: "var(--amber-600)" }} /> Timesheet</div><div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: "var(--amber-600)" }}>S.23 à soumettre</div><div className="tiny">avant vendredi 17h</div></div>
        <div className="card pad"><div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="inbox" style={{ width: 14, height: 14, color: "var(--teal-600)" }} /> Demandes en cours</div><div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>2</div><div className="tiny">1 avance · 1 attestation</div></div>
      </div>
      <div className="g3">
        {tiles.map((t) => (
          <div className="card pad" key={t.title}>
            <h3 className="block-title font-display" style={{ fontSize: 14, marginBottom: 10 }}><Icon name={t.icon} style={{ color: "var(--teal-600)" }} /> {t.title}</h3>
            <div className="kv">{t.rows.map(([k, v], i) => <div key={i}><span className="muted">{k}</span><span style={{ fontWeight: 500 }}>{v}</span></div>)}</div>
            <button type="button" className={`tile-btn ${t.accent ? "accent" : ""}`} onClick={() => setModal({ kind: "selfService", initial: { request: t.request, details: "" } })}><Icon name={t.bicon} /> {t.btn}</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Modal création ────────────────────────────────────────────────────── */
function RecordModal({ modal, data, staff, busy, error, onSave, onClose }) {
  const [form, setForm] = React.useState(() => ({ ...defaults(modal.kind, staff), ...(modal.initial || {}) }));
  const set = (k, v) => setForm((c) => ({ ...c, [k]: v }));
  const action = ACTION_FORMS[modal.kind];
  const opts = {
    staff: staff.map((u) => ({ value: u.id, label: fullName(u) })),
    roles: (data.roles || []).map((r) => ({ value: r.id, label: r.name })),
    departments: (data.departments || []).map((d) => ({ value: d.id, label: d.name })),
    designations: (data.designations || []).map((d) => ({ value: d.id, label: d.name })),
    shifts: (data.shifts || []).map((s) => ({ value: s.id, label: `${s.name} (${(s.startTime || "").slice(0, 5)}-${(s.endTime || "").slice(0, 5)})` })),
    awards: (data.awards || []).map((a) => ({ value: a.id, label: a.name })),
    currencies: CURRENCIES.map((c) => ({ value: c.id, label: `${c.currencyName || c.name || c.currencyCode} (${c.currencySymbol || c.symbol || c.currencyCode})` })),
  };
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={(e) => { e.preventDefault(); onSave(modal.kind, form); }}>
        <div className="modal-head"><div><h2 className="font-display">{titleFor(modal.kind)}</h2><p>RH NgoluApp</p></div><button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button></div>
        <div className="form-grid">
          {action && action.fields.map((field) => (
            <Field key={field.key} {...field} options={field.optionKey ? opts[field.optionKey] || [] : field.options} value={form[field.key] ?? ""} onChange={(v) => set(field.key, v)} />
          ))}
          {modal.kind === "employee" && !action && (
            <>
              <Field label="Prénom" value={form.firstName} onChange={(v) => set("firstName", v)} required />
              <Field label="Nom" value={form.lastName} onChange={(v) => set("lastName", v)} required />
              <Field label="Poste" value={form.designationName} onChange={(v) => set("designationName", v)} required />
              <Field label="Département" value={form.departmentName} onChange={(v) => set("departmentName", v)} required />
              <Field label="Salaire mensuel" type="number" value={form.salary} onChange={(v) => set("salary", v)} />
            </>
          )}
          {!action && !["employee", "salary"].includes(modal.kind) && <Field label="Nom" value={form.name} onChange={(v) => set("name", v)} required />}
          {modal.kind === "shift" && <><Field label="Début" type="time" value={form.startTime} onChange={(v) => set("startTime", v)} required /><Field label="Fin" type="time" value={form.endTime} onChange={(v) => set("endTime", v)} required /></>}
          {modal.kind === "award" && !action && <Field label="Description" value={form.description} onChange={(v) => set("description", v)} />}
          {modal.kind === "salary" && !action && (
            <>
              <label className="field"><span>Employé</span><select value={form.userId} onChange={(e) => set("userId", e.target.value)}>{staff.map((u) => <option key={u.id} value={u.id}>{fullName(u)}</option>)}</select></label>
              <Field label="Montant (FC)" type="number" value={form.salary} onChange={(v) => set("salary", v)} required />
              <Field label="Date" type="date" value={form.salaryStartDate} onChange={(v) => set("salaryStartDate", v)} required />
              <Field label="Compte crédit" type="number" value={form.paymentAccountId} onChange={(v) => set("paymentAccountId", v)} />
              <Field label="Commentaire" value={form.salaryComment} onChange={(v) => set("salaryComment", v)} />
            </>
          )}
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-accent grad-accent" disabled={busy}>{busy ? "Enregistrement…" : (action?.submit || "Enregistrer")}</button></div>
      </form>
    </div>
  );
}
function Field({ label, value, onChange, type = "text", required = false, options = [] }) {
  if (type === "textarea") {
    return <label className="field wide"><span>{label}</span><textarea required={required} value={value} onChange={(e) => onChange(e.target.value)} rows={3} /></label>;
  }
  if (type === "select") {
    return <label className="field"><span>{label}</span><select required={required} value={value} onChange={(e) => onChange(e.target.value)}><option value="">SÃ©lectionner</option>{options.map((opt) => {
      const item = typeof opt === "object" ? opt : { value: opt, label: opt };
      return <option key={item.value} value={item.value}>{item.label}</option>;
    })}</select></label>;
  }
  return <label className="field"><span>{label}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}
function titleFor(kind) {
  if (ACTION_FORMS[kind]) return ACTION_FORMS[kind].title;
  return kind === "employee" ? "Nouvel employé" : kind === "shift" ? "Nouvel horaire" : kind === "award" ? "Nouvelle reconnaissance" : kind === "salary" ? "Nouvelle paie" : "Nouveau poste";
}
function defaults(kind, staff) {
  if (ACTION_FORMS[kind]) return { ...ACTION_FORMS[kind].defaults };
  if (kind === "employee") return { firstName: "", lastName: "", designationName: "Agent de terrain", departmentName: "Programmes & terrain", salary: 0 };
  if (kind === "shift") return { name: "", startTime: "08:00", endTime: "17:00" };
  if (kind === "award") return { name: "", description: "" };
  if (kind === "salary") return { userId: staff[0]?.id || "", salary: 0, salaryStartDate: new Date().toISOString().slice(0, 10), salaryComment: "", paymentAccountId: 2 };
  return { name: "" };
}

export default AppShell;
