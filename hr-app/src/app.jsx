import React from "react";
import PhoneInputBase, { formatPhoneNumberIntl } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import fr from "react-phone-number-input/locale/fr.json";
import "react-phone-number-input/style.css";
import { api, API_ROOT } from "./api.js";
import { LoginScreen, useAuthToken, clearAuth, getUser } from "./auth.jsx";
import { AiAssistant } from "./aiAssistant.jsx";
import { defaultSymbol, symbolFor } from "./currency.js";
import { AV_COLORS } from "./data.js";

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
  { id: "timesheet", label: "Temps projets", icon: "timer" },
  { section: "Paie & rémunération" },
  { id: "paie", label: "Paie", icon: "wallet" },
  { id: "frais", label: "Frais & avances", icon: "receipt" },
  { id: "declarations", label: "Déclarations sociales", icon: "fileCheck" },
  { section: "Développement" },
  { id: "performance", label: "Performance", icon: "target" },
  { id: "formation", label: "Formation", icon: "graduationCap" },
  { id: "recrutement", label: "Recrutement", icon: "userPlus" },
  { section: "Structure & pilotage" },
  { id: "projets", label: "Affectations projets", icon: "folder" },
  { id: "organigramme", label: "Postes & départements", icon: "network" },
  { id: "reporting", label: "Reporting RH", icon: "barChart" },
  { id: "selfservice", label: "Espace employé", icon: "circleUser" },
  { section: "Système" },
  { id: "parametres", label: "Paramètres", icon: "settings" },
];
const ITEMS = NAV.filter((n) => n.id);
const TITLES = Object.fromEntries(ITEMS.map((n) => [n.id, n.label]));
const MOB_PRIMARY = ["dashboard", "employes", "presences", "paie"];
const MOB_LABEL = { dashboard: "Accueil", employes: "Équipe", presences: "Pointage", paie: "Paie" };

/* ── Helpers ───────────────────────────────────────────────────────────── */
// Devise résolue depuis la BD (GET /setting + /currency), comme le CRM.
let CUR = "CDF";
let DEFAULT_CURRENCY_ID = "";
let CURRENCIES = []; // liste pour résoudre la devise propre à chaque employé
const nf = new Intl.NumberFormat("fr-FR");
const fc = (v, sym) => `${nf.format(Math.round(Number(v || 0)))} ${sym || CUR}`;
const fcM = (v) => `${(Number(v || 0) / 1e6).toFixed(1).replace(".", ",")} M ${CUR}`;
const salarySym = (u) => symbolFor(u?.currentSalaryCurrencyId, CURRENCIES, CUR);
const moneyLineText = (amount, sym) => `${nf.format(Math.round(Number(amount || 0)))} ${sym || CUR}`;
function moneyLinesFrom(rows, amountOf, symbolOf = () => CUR) {
  const totals = new Map();
  for (const row of rows || []) {
    const amount = Number(amountOf(row) || 0);
    if (!amount) continue;
    const sym = symbolOf(row) || CUR;
    totals.set(sym, (totals.get(sym) || 0) + amount);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sym, amount]) => ({ sym, amount, text: moneyLineText(amount, sym) }));
}
const salaryMoneyLines = (staff) => moneyLinesFrom(staff, (u) => u.currentSalary, salarySym);
const moneySymbolFor = (row) => symbolFor(row?.currencyId, CURRENCIES, CUR);
function MoneyLines({ lines, empty = `0 ${CUR}` }) {
  const rows = (lines || []).filter((line) => Number(line.amount || 0) !== 0);
  if (!rows.length) return <span>{empty}</span>;
  return <span className="money-lines">{rows.map((line) => <span key={line.sym}>{line.text}</span>)}</span>;
}
const currencyValue = (c) => c?.id ?? c?.currencyId ?? "";
const currencySymbolText = (c) => c?.currencyCode || c?.currencySymbol || c?.symbol || c?.currencyName || CUR;
const currencyOptions = () => CURRENCIES.map((c) => {
  const value = currencyValue(c);
  const symbol = currencySymbolText(c);
  return { value, label: `${c.currencyName || c.name || symbol} (${symbol})`, symbol };
}).filter((c) => c.value !== "");
const defaultCurrencyId = () => DEFAULT_CURRENCY_ID || currencyValue(CURRENCIES[0]) || "";

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
  const timers = React.useRef(new Map());
  React.useEffect(() => {
    const on = (e) => {
      const message = e.detail || DEMO;
      const time = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      const id = `${Date.now()}-${Math.random()}`;
      setItems((cur) => [{ id, message, time }, ...cur].slice(0, 3));
      const timer = window.setTimeout(() => {
        setItems((cur) => cur.filter((item) => item.id !== id));
        timers.current.delete(id);
      }, 6500);
      timers.current.set(id, timer);
    };
    window.addEventListener("hr:toast", on);
    return () => {
      window.removeEventListener("hr:toast", on);
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, []);
  const dismiss = (id) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setItems((cur) => cur.filter((item) => item.id !== id));
  };
  if (!items.length) return null;
  return (
    <div className="action-feed" aria-live="polite">
      {items.map((item) => (
        <div className="action-feed-item" key={item.id}>
          <span className="row-ic"><Icon name="checkCircle" /></span>
          <span>{item.message}</span>
          <time>{item.time}</time>
          <button type="button" className="action-feed-close" onClick={() => dismiss(item.id)} aria-label="Fermer la notification"><Icon name="x" /></button>
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
const dateOnly = (v) => v ? String(v).slice(0, 10) : "";
const CONTRACT_TYPES = ["CDI", "CDD", "Stage", "Consultant", "Journalier", "Volontariat"];
const CONTRACT_STATUSES = [
  { value: "draft", label: "Brouillon" },
  { value: "validation", label: "En validation" },
  { value: "approved", label: "Approuve" },
  { value: "signed", label: "Signe" },
  { value: "active", label: "Actif" },
  { value: "expired", label: "Expire" },
  { value: "terminated", label: "Resilie" },
];
const hasContractEndDate = (form) => ["CDD", "Stage", "Consultant", "Journalier", "Volontariat"].includes(form.contractType);
const usesPayrollSalary = (form) => ["CDI", "CDD", "Journalier", "Volontariat"].includes(form.contractType);
const usesProbation = (form) => ["CDI", "CDD"].includes(form.contractType);
function contractDurationText(form) {
  if (!form.startDate || !form.endDate) return "-";
  const start = new Date(form.startDate);
  const end = new Date(form.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return "-";
  const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth());
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  return months >= 1 ? `${months} mois` : `${days} jours`;
}
function contractTotalText(form) {
  const total = Number(form.baseSalary || 0) + Number(form.transportAllowance || 0) + Number(form.housingAllowance || 0);
  return fc(total, symbolFor(form.currencyId || defaultCurrencyId(), CURRENCIES, CUR));
}
function contractMoneyText(contract) {
  if (contract?.contractType === "Consultant") return fc(contract.contractAmount, moneySymbolFor(contract));
  if (contract?.contractType === "Stage") return fc(contract.stipend, moneySymbolFor(contract));
  const total = Number(contract?.baseSalary || 0) + Number(contract?.transportAllowance || 0) + Number(contract?.housingAllowance || 0);
  return fc(total, moneySymbolFor(contract));
}
function payrollGross(row) {
  return Number(row?.baseSalary || 0) + Number(row?.transportAllowance || 0) + Number(row?.housingAllowance || 0)
    + Number(row?.riskAllowance || 0) + Number(row?.otherAllowances || 0) + Number(row?.overtimeAmount || 0);
}
function payrollNet(row) {
  return Math.max(0, payrollGross(row) - Number(row?.unpaidAbsenceDeduction || 0) - Number(row?.advanceDeduction || 0)
    - Number(row?.taxAmount || 0) - Number(row?.cnssAmount || 0) - Number(row?.otherDeductions || 0));
}
const payrollMoneyText = (row, amount) => fc(amount, moneySymbolFor(row));
const fallbackEmployeeId = (u) => `EMP-${dateOnly(u?.joinDate).slice(0, 4) || TODAY.slice(0, 4)}-${String(u?.id || 0).padStart(4, "0")}`;
const displayPhone = (u) => {
  const raw = typeof u === "string" ? u : u?.phone;
  if (!String(raw || "").trim()) return "Telephone non renseigne";
  return formatPhoneNumberIntl(String(raw).trim()) || String(raw).trim();
};
const EMPTY_DATA = {
  staff: [],
  designations: [],
  departments: [],
  shifts: [],
  awards: [],
  attendances: [],
  attendanceSummary: { totals: { records: 0, present: 0, late: 0, absent: 0, partial: 0, workedHours: 0, lateMinutes: 0, overtimeHours: 0, absenceHours: 0 }, byEmployee: [] },
  salaries: [],
  payrolls: [],
  projects: [],
  projectReport: { projects: [], byMonth: [], byDonor: [], byDepartment: [], totals: [] },
  projectAssignments: [],
  roles: [],
  leaveRequests: [],
  leaveSummary: { totals: { employees: 0, entitlementDays: 0, usedDays: 0, pendingDays: 0, balanceDays: 0 }, byEmployee: [], workflow: { pending: 0, managerApproved: 0, approved: 0, rejected: 0 } },
  contracts: [],
  documents: [],
  expenseRequests: [],
  socialDeclarations: [],
  performanceReviews: [],
  trainingSessions: [],
  timesheets: [],
  employeeRequests: [],
  recruitmentOffers: [],
  candidates: [],
  candidateSummary: { total: 0, pending: 0, converted: 0, withInterview: 0, pipeline: { nouveau: 0, entrevue: 0, test: 0, offre: 0, accepte: 0, embauche: 0, rejete: 0 } },
  payrollSummary: { period: "all", bulletins: 0, employees: 0, grossTotal: 0, netTotal: 0, taxTotal: 0, cnssTotal: 0, workflow: { draft: 0, validated: 0, paid: 0 }, periods: [] },
  documentSummary: { total: 0, generated: 0, signed: 0, pending: 0, employees: 0, byType: {} },
};
const DEPARTMENT_COLORS = ["teal", "sky", "emerald", "amber", "ink"];
const arrayFrom = (value, key) => {
  if (Array.isArray(value)) return value;
  if (key && Array.isArray(value?.[key])) return value[key];
  return [];
};
const STATUS_LABELS = {
  pending: "En attente",
  submitted: "Soumis",
  validation: "En validation",
  approved: "Approuve",
  manager_approved: "Chef approuve",
  hr_review: "Revue RH",
  hr_approved: "RH approuve",
  signed: "Signe",
  paid: "Paye",
  active: "Actif",
  draft: "Brouillon",
  expired: "Expire",
  terminated: "Resilie",
  rejected: "Rejete",
  received: "Recu",
  planned: "Planifie",
  done: "Termine",
  open: "Ouvert",
  closed: "Cloture",
  suspended: "Suspendu",
  ended: "Termine",
  present: "Present",
  late: "En retard",
  absent: "Absent",
  partial: "Partiel",
  validated: "Valide",
  pending_approval: "En approbation",
  paid_leave: "Conge paye",
  unpaid_leave: "Conge non paye",
  true: "Actif",
  false: "Inactif",
};
const isPending = (status) => ["pending", "en_attente", "submitted", "draft", "validation"].includes(String(status || "").toLowerCase());
const isApproved = (status) => ["approved", "hr_approved", "active", "received", "planned", "done", "open", "true", "paid", "present", "validated", "paid_leave"].includes(String(status || "").toLowerCase());
const chipForStatus = (status) => {
  const value = String(status || "").toLowerCase();
  if (["late", "partial", "manager_approved", "hr_review", "pending_approval"].includes(value)) return "amber";
  if (["absent", "rejected"].includes(value)) return "rose";
  return isPending(value) ? "amber" : isApproved(value) ? "emerald" : "ink";
};
const statusLabel = (status) => STATUS_LABELS[String(status || "").toLowerCase()] || (status ? String(status) : "Non renseigne");
const personName = (staff, userId) => fullName((staff || []).find((u) => String(u.id) === String(userId)) || { id: userId });
const sameId = (a, b) => String(a ?? "") !== "" && String(a) === String(b ?? "");
const findCurrentStaff = (me, staff) => (staff || []).find((u) => sameId(u.id, me?.id)) || (staff || []).find((u) => fullName(u).toLowerCase() === String(me?.name || "").toLowerCase()) || null;
const byUser = (rows, userId) => (rows || []).filter((row) => sameId(row.userId, userId));
const daysUntil = (date) => {
  if (!date) return null;
  const diff = new Date(dateOnly(date)).getTime() - new Date(TODAY).getTime();
  return Number.isFinite(diff) ? Math.ceil(diff / 86400000) : null;
};
function EmptyState({ title = "Aucune donnee", detail = "Les donnees seront affichees des qu'elles existent dans la base." }) {
  return <div className="muted" style={{ textAlign: "center", padding: 24, fontSize: 13 }}>{title}<div className="tiny" style={{ marginTop: 4 }}>{detail}</div></div>;
}
const employeeForm = (u) => ({
  id: u.id,
  firstName: u.firstName || "",
  lastName: u.lastName || "",
  username: u.username || "",
  roleId: u.roleId || u.role?.id || "",
  email: u.email || "",
  phone: u.phone || "",
  gender: u.gender || "",
  birthDate: dateOnly(u.birthDate),
  maritalStatus: u.maritalStatus || "",
  childrenCount: u.childrenCount ?? 0,
  nationality: u.nationality || "",
  emergencyContactName: u.emergencyContactName || "",
  emergencyContactPhone: u.emergencyContactPhone || "",
  emergencyContactRelationship: u.emergencyContactRelationship || "",
  personalDocumentsUrl: u.personalDocumentsUrl || "",
  departmentId: u.departmentId || u.department?.id || "",
  designationId: u.designationId || u.designation?.id || "",
  shiftId: u.shiftId || "",
  employeeId: u.employeeId || "",
  joinDate: dateOnly(u.joinDate),
  bloodGroup: u.bloodGroup || "",
  image: u.image || "",
  street: u.street || "",
  city: u.city || "",
  state: u.state || "",
  zipCode: u.zipCode || "",
  country: u.country || "",
  status: u.status || "true",
});
function enrichDepartments(departments, staff) {
  const map = new Map();

  for (const user of staff || []) {
    const deptId = user.departmentId ?? user.department?.id;
    const deptName = user.department?.name;
    if (deptId == null && !deptName) continue;
    const key = deptId != null ? `id:${deptId}` : `name:${String(deptName).toLowerCase()}`;
    const cur = map.get(key) || { id: deptId ?? key, name: deptName || `Departement #${deptId}`, count: 0 };
    cur.count += 1;
    if (deptName) cur.name = deptName;
    map.set(key, cur);
  }

  for (const dept of departments || []) {
    const key = dept.id != null ? `id:${dept.id}` : `name:${String(dept.name || "").toLowerCase()}`;
    const cur = map.get(key) || { count: 0 };
    map.set(key, { ...cur, ...dept, count: cur.count || Number(dept.count || 0) });
  }

  return [...map.values()]
    .filter((dept) => dept.name)
    .map((dept, index) => ({ ...dept, color: dept.color || DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length] }));
}
function currentLeaves(leaves) {
  return (leaves || []).filter((leave) => {
    const start = dateOnly(leave.startDate);
    const end = dateOnly(leave.endDate);
    const status = String(leave.status || "").toLowerCase();
    return start && end && start <= TODAY && end >= TODAY && ["approved", "hr_approved"].includes(status);
  });
}
function expiringContracts(contracts, horizon = 30) {
  return (contracts || []).filter((contract) => {
    const days = daysUntil(contract.endDate);
    return days != null && days >= 0 && days <= horizon;
  });
}
function newEmployees(staff, days = 30) {
  return (staff || []).filter((user) => {
    const joined = daysUntil(user.joinDate);
    return joined != null && joined <= 0 && joined >= -days;
  });
}
function cleanPayload(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""));
}
function slugName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}
function generatedEmailFor(firstName, lastName) {
  const local = [slugName(firstName), slugName(lastName)].filter(Boolean).join(".");
  return local ? `${local}@ongdngolu.org` : "";
}
function generatedUsernameFor(firstName, lastName) {
  return [slugName(firstName), slugName(lastName)].filter(Boolean).join(".");
}
function generateInitialPassword() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const all = letters + digits;
  const pick = (chars) => chars[Math.floor(Math.random() * chars.length)];
  return Array.from({ length: 10 }, () => pick(all)).join("") + pick(letters) + pick(digits);
}
function isValidInitialPassword(value) {
  const text = String(value || "");
  return text.length >= 12 && text.length <= 64 && /[a-zA-Z]/.test(text) && /\d/.test(text);
}
function canManageUserStatus() {
  const role = String(getUser().role || "").toLowerCase();
  return ["admin", "super-admin", "super admin"].includes(role);
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
  editEmployee: { title: "Modifier employe", submit: "Enregistrer", success: "Employe modifie dans la base.", defaults: { id: "", firstName: "", lastName: "", username: "", email: "", phone: "", roleId: "", departmentId: "", designationId: "", shiftId: "", employeeId: "", joinDate: "", bloodGroup: "", street: "", city: "", state: "", zipCode: "", country: "", status: "true" }, fields: [{ key: "firstName", label: "Prenom", required: true }, { key: "lastName", label: "Nom", required: true }, { key: "username", label: "Identifiant", required: true }, { key: "roleId", label: "Role", type: "select", optionKey: "roles", required: true }, { key: "departmentId", label: "Departement", type: "select", optionKey: "departments" }, { key: "designationId", label: "Poste", type: "select", optionKey: "designations" }, { key: "shiftId", label: "Horaire", type: "select", optionKey: "shifts" }, { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Telephone" }, { key: "employeeId", label: "Matricule" }, { key: "joinDate", label: "Date d'embauche", type: "date" }, { key: "bloodGroup", label: "Groupe sanguin" }, { key: "street", label: "Adresse" }, { key: "city", label: "Ville" }, { key: "country", label: "Pays" }] },
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
  socialDeclaration: { title: "DÃ©claration sociale", submit: "PrÃ©parer", success: "DÃ©claration sociale enregistrÃ©e.", defaults: { period: "", organism: "", baseAmount: 0, rate: "", amount: 0, dueDate: "", note: "" }, fields: [{ key: "period", label: "PÃ©riode", required: true }, { key: "organism", label: "Organisme", type: "select", options: ["CNSS", "INPP", "ONEM", "DGI / IPR", "Autre"], required: true }, { key: "baseAmount", label: "Base", type: "number" }, { key: "rate", label: "Taux" }, { key: "amount", label: "Montant", type: "number" }, { key: "dueDate", label: "Ã‰chÃ©ance", type: "date" }, { key: "note", label: "Note", type: "textarea" }] },
  performanceReview: { title: "Nouvelle Ã©valuation", submit: "Enregistrer", success: "Ã‰valuation enregistrÃ©e.", defaults: { userId: "", managerId: "", cycle: "S1 2026", score: "", objectives: "", comments: "" }, fields: [{ key: "userId", label: "EmployÃ©", type: "select", optionKey: "staff", required: true }, { key: "managerId", label: "Manager", type: "select", optionKey: "staff" }, { key: "cycle", label: "Cycle", required: true }, { key: "score", label: "Score / 5", type: "number" }, { key: "objectives", label: "Objectifs", type: "textarea" }, { key: "comments", label: "Commentaires", type: "textarea" }] },
  trainingSession: { title: "Session de formation", submit: "Planifier", success: "Formation enregistrÃ©e.", defaults: { title: "", audience: "Toute l'Ã©quipe", sessionDate: TODAY, budget: 0, note: "" }, fields: [{ key: "title", label: "Titre", required: true }, { key: "audience", label: "Public" }, { key: "sessionDate", label: "Date", type: "date" }, { key: "budget", label: "Budget", type: "number" }, { key: "note", label: "Note", type: "textarea" }] },
  recruitmentOffer: { title: "Nouvelle offre", submit: "Publier", success: "Offre de recrutement enregistrÃ©e.", defaults: { role: "", departmentId: "", deadline: TODAY, description: "" }, fields: [{ key: "role", label: "Poste Ã  recruter", required: true }, { key: "departmentId", label: "DÃ©partement", type: "select", optionKey: "departments" }, { key: "deadline", label: "Date limite", type: "date" }, { key: "description", label: "Description", type: "textarea" }] },
  employeeRequest: { title: "Demande RH", submit: "Soumettre", success: "Demande RH enregistree.", defaults: { userId: "", requestType: "Attestation de travail", subject: "", requestedDate: TODAY, description: "" }, fields: [{ key: "userId", label: "Employe", type: "select", optionKey: "staff", required: true }, { key: "requestType", label: "Type", type: "select", options: ["Attestation de travail", "Changement d'adresse", "Changement compte bancaire", "Correction profil", "Document administratif", "Autre"], required: true }, { key: "subject", label: "Objet", required: true }, { key: "requestedDate", label: "Date", type: "date", required: true }, { key: "description", label: "Details", type: "textarea" }] },
});

Object.assign(ACTION_FORMS, {
  employee: {
    title: "Nouvel employe",
    submit: "Creer",
    success: "Employe cree dans la base.",
    defaults: { firstName: "", lastName: "", username: "", password: "", email: "", phone: "", gender: "", birthDate: "", maritalStatus: "", childrenCount: 0, nationality: "Congolaise", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "", personalDocumentsUrl: "", roleId: "", departmentId: "", designationId: "", shiftId: "", employeeId: "", joinDate: TODAY, bloodGroup: "", image: "", street: "", city: "", state: "", zipCode: "", country: "RDC" },
    fields: [
      { kind: "section", label: "Identite" },
      { key: "firstName", label: "Prenom", required: true },
      { key: "lastName", label: "Nom", required: true },
      { key: "username", label: "Identifiant", required: true, help: "Peut etre ajuste si necessaire." },
      { key: "password", label: "Mot de passe initial", type: "password", required: true, generated: true, help: "Min 12 caracteres, avec au moins une lettre et un chiffre." },
      { key: "email", label: "Email", type: "email", readOnly: true, help: "Genere automatiquement avec le prenom et le nom." },
      { key: "phone", label: "Telephone" },
      { key: "image", label: "Photo (lien fichier)", wide: true },
      { key: "gender", label: "Genre", type: "select", options: ["Femme", "Homme", "Autre", "Non precise"] },
      { key: "birthDate", label: "Date de naissance", type: "date" },
      { key: "maritalStatus", label: "Etat civil", type: "select", options: ["Celibataire", "Marie(e)", "Divorce(e)", "Veuf/Veuve", "Non precise"] },
      { key: "childrenCount", label: "Nombre d'enfants", type: "number" },
      { key: "nationality", label: "Nationalite" },
      { kind: "section", label: "Informations RH" },
      { key: "roleId", label: "Role", type: "select", optionKey: "roles", required: true },
      { key: "departmentId", label: "Departement", type: "select", optionKey: "departments" },
      { key: "designationId", label: "Poste", type: "select", optionKey: "designations" },
      { key: "shiftId", label: "Horaire", type: "select", optionKey: "shifts" },
      { key: "employeeId", label: "Matricule", readOnly: true, help: "Genere automatiquement par l'API si vide." },
      { key: "joinDate", label: "Date d'embauche", type: "date" },
      { key: "bloodGroup", label: "Groupe sanguin" },
      { kind: "section", label: "Contact d'urgence" },
      { key: "emergencyContactName", label: "Nom contact" },
      { key: "emergencyContactPhone", label: "Telephone contact", type: "phone" },
      { key: "emergencyContactRelationship", label: "Lien avec l'employe" },
      { key: "personalDocumentsUrl", label: "Pieces personnelles (lien dossier)", wide: true },
      { kind: "section", label: "Adresse" },
      { key: "street", label: "Rue", wide: true },
      { key: "city", label: "Ville" },
      { key: "state", label: "Province / Etat" },
      { key: "zipCode", label: "Code postal" },
      { key: "country", label: "Pays" },
    ],
  },
  editEmployee: {
    title: "Modifier employe",
    submit: "Enregistrer",
    success: "Employe modifie dans la base.",
    defaults: { id: "", firstName: "", lastName: "", username: "", password: "", email: "", phone: "", gender: "", birthDate: "", maritalStatus: "", childrenCount: 0, nationality: "", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "", personalDocumentsUrl: "", roleId: "", departmentId: "", designationId: "", shiftId: "", employeeId: "", joinDate: "", bloodGroup: "", image: "", street: "", city: "", state: "", zipCode: "", country: "", status: "true" },
    fields: [
      { kind: "section", label: "Identite" },
      { key: "firstName", label: "Prenom", required: true },
      { key: "lastName", label: "Nom", required: true },
      { key: "username", label: "Identifiant", required: true },
      { key: "password", label: "Changer mot de passe", type: "password", help: "Laisser vide pour garder l'ancien mot de passe." },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Telephone" },
      { key: "image", label: "Photo (lien fichier)", wide: true },
      { key: "gender", label: "Genre", type: "select", options: ["Femme", "Homme", "Autre", "Non precise"] },
      { key: "birthDate", label: "Date de naissance", type: "date" },
      { key: "maritalStatus", label: "Etat civil", type: "select", options: ["Celibataire", "Marie(e)", "Divorce(e)", "Veuf/Veuve", "Non precise"] },
      { key: "childrenCount", label: "Nombre d'enfants", type: "number" },
      { key: "nationality", label: "Nationalite" },
      { key: "status", label: "Statut", type: "select", options: [{ value: "true", label: "Actif" }, { value: "false", label: "Inactif" }], requiresStatusPermission: true },
      { kind: "section", label: "Informations RH" },
      { key: "roleId", label: "Role", type: "select", optionKey: "roles", required: true },
      { key: "departmentId", label: "Departement", type: "select", optionKey: "departments" },
      { key: "designationId", label: "Poste", type: "select", optionKey: "designations" },
      { key: "shiftId", label: "Horaire", type: "select", optionKey: "shifts" },
      { key: "employeeId", label: "Matricule" },
      { key: "joinDate", label: "Date d'embauche", type: "date" },
      { key: "bloodGroup", label: "Groupe sanguin" },
      { kind: "section", label: "Contact d'urgence" },
      { key: "emergencyContactName", label: "Nom contact" },
      { key: "emergencyContactPhone", label: "Telephone contact", type: "phone" },
      { key: "emergencyContactRelationship", label: "Lien avec l'employe" },
      { key: "personalDocumentsUrl", label: "Pieces personnelles (lien dossier)", wide: true },
      { kind: "section", label: "Adresse" },
      { key: "street", label: "Rue", wide: true },
      { key: "city", label: "Ville" },
      { key: "state", label: "Province / Etat" },
      { key: "zipCode", label: "Code postal" },
      { key: "country", label: "Pays" },
    ],
  },
});

Object.assign(ACTION_FORMS, {
  leaveRequest: {
    title: "Demande de conge",
    submit: "Soumettre",
    success: "Demande de conge enregistree.",
    defaults: { userId: "", type: "Conge annuel", startDate: TODAY, endDate: TODAY, managerId: "", isPaid: "1", reason: "" },
    fields: [
      { key: "userId", label: "Employe", type: "select", optionKey: "staff", required: true },
      { key: "type", label: "Type", type: "select", options: ["Conge annuel", "Maladie", "Maternite", "Paternite", "Mission", "Autre"], required: true },
      { key: "startDate", label: "Debut", type: "date", required: true },
      { key: "endDate", label: "Fin", type: "date", required: true },
      { key: "managerId", label: "Chef / responsable", type: "select", optionKey: "staff" },
      { key: "isPaid", label: "Impact paie", type: "select", options: [{ value: "1", label: "Conge paye" }, { value: "0", label: "Conge non paye" }] },
      { key: "reason", label: "Motif", type: "textarea", wide: true },
    ],
  },
  leaveDecision: {
    title: "Decision conge",
    submit: "Enregistrer",
    success: "Decision conge enregistree.",
    defaults: { id: "", status: "manager_approved", decidedBy: "", managerId: "", decisionComment: "" },
    fields: [
      { key: "status", label: "Decision", type: "select", options: [{ value: "manager_approved", label: "Chef approuve" }, { value: "approved", label: "RH approuve" }, { value: "rejected", label: "Rejeter" }], required: true },
      { key: "decidedBy", label: "Decide par", type: "select", optionKey: "staff" },
      { key: "managerId", label: "Chef / responsable", type: "select", optionKey: "staff" },
      { key: "decisionComment", label: "Commentaire", type: "textarea", wide: true },
    ],
  },
  attendance: {
    title: "Nouveau pointage",
    submit: "Enregistrer",
    success: "Pointage enregistre.",
    defaults: { userId: "", workDate: TODAY, shiftId: "", clockIn: "08:00", pauseOut: "12:00", pauseIn: "13:00", clockOut: "17:00", status: "", note: "" },
    fields: [
      { key: "userId", label: "Employe", type: "select", optionKey: "staff", required: true },
      { key: "workDate", label: "Date", type: "date", required: true },
      { key: "shiftId", label: "Horaire", type: "select", optionKey: "shifts" },
      { key: "clockIn", label: "Entree", type: "time" },
      { key: "pauseOut", label: "Debut pause", type: "time" },
      { key: "pauseIn", label: "Retour pause", type: "time" },
      { key: "clockOut", label: "Sortie", type: "time" },
      { key: "status", label: "Statut", type: "select", options: [{ value: "", label: "Automatique" }, { value: "present", label: "Present" }, { value: "late", label: "En retard" }, { value: "absent", label: "Absent" }, { value: "partial", label: "Partiel" }, { value: "validated", label: "Valide" }] },
      { key: "note", label: "Note", type: "textarea", wide: true },
    ],
  },
  timesheet: {
    title: "Nouvelle saisie d'heures",
    submit: "Enregistrer",
    success: "Heures enregistrees.",
    defaults: { userId: "", periodStartDate: TODAY, periodEndDate: TODAY, projectId: "", project: "", donor: "", activity: "", hours: 0, note: "" },
    fields: [
      { key: "userId", label: "Employe", type: "select", optionKey: "staff", required: true },
      { key: "periodStartDate", label: "Debut de periode", type: "date", required: true },
      { key: "periodEndDate", label: "Fin de periode", type: "date", required: true },
      { key: "projectId", label: "Projet ONG", type: "select", optionKey: "projects", required: true },
      { key: "project", label: "Libelle libre / activite" },
      { key: "donor", label: "Financement / centre de cout" },
      { key: "hours", label: "Heures", type: "number", required: true },
      { key: "activity", label: "Activite", wide: true },
      { key: "note", label: "Note", type: "textarea" },
    ],
  },
});

Object.assign(ACTION_FORMS, {
  hrContract: {
    title: "Nouveau contrat RH",
    submit: "Enregistrer",
    success: "Contrat RH enregistre.",
    wide: true,
    defaults: {
      userId: "",
      contractType: "CDI",
      startDate: TODAY,
      endDate: "",
      designationId: "",
      departmentId: "",
      workLocation: "",
      baseSalary: 0,
      transportAllowance: 0,
      housingAllowance: 0,
      stipend: 0,
      contractAmount: 0,
      currencyId: "",
      payFrequency: "Mensuelle",
      probationMonths: 3,
      probationEndDate: "",
      workSchedule: "Temps plein",
      managerId: "",
      hrResponsibleId: "",
      school: "",
      supervisor: "",
      deliverables: "",
      generatedDocumentUrl: "",
      signedDocumentUrl: "",
      amendmentsUrl: "",
      identityDocumentUrl: "",
      diplomasUrl: "",
      status: "draft",
      notes: "",
    },
    fields: [
      { kind: "section", label: "Informations generales" },
      { kind: "computed", label: "Reference", value: () => "Generee automatiquement a l'enregistrement", wide: true },
      { key: "userId", label: "Employe", type: "select", optionKey: "staff", required: true },
      { key: "contractType", label: "Type de contrat", type: "select", options: CONTRACT_TYPES, required: true },
      { key: "designationId", label: "Poste", type: "select", optionKey: "designations" },
      { key: "departmentId", label: "Departement", type: "select", optionKey: "departments" },
      { key: "workLocation", label: "Lieu de travail" },
      { key: "startDate", label: "Date de debut", type: "date", required: true },
      { key: "endDate", label: "Date de fin", type: "date", visibleWhen: hasContractEndDate },
      { kind: "computed", label: "Duree", value: contractDurationText, visibleWhen: hasContractEndDate },
      { key: "probationMonths", label: "Periode d'essai (mois)", type: "number", visibleWhen: usesProbation },
      { key: "probationEndDate", label: "Fin periode d'essai", type: "date", visibleWhen: usesProbation },

      { kind: "section", label: "Conditions salariales" },
      { key: "baseSalary", label: "Salaire de base", type: "number", visibleWhen: usesPayrollSalary },
      { key: "transportAllowance", label: "Prime transport", type: "number", visibleWhen: usesPayrollSalary },
      { key: "housingAllowance", label: "Prime logement", type: "number", visibleWhen: usesPayrollSalary },
      { key: "stipend", label: "Indemnite de stage", type: "number", visibleWhen: (form) => form.contractType === "Stage" },
      { key: "contractAmount", label: "Montant contrat", type: "number", visibleWhen: (form) => form.contractType === "Consultant" },
      { key: "currencyId", label: "Devise", type: "select", optionKey: "currencies" },
      { key: "payFrequency", label: "Frequence de paie", type: "select", options: ["Mensuelle", "Bimensuelle", "Hebdomadaire", "Journaliere", "Forfait"] },
      { kind: "computed", label: "Total mensuel", value: contractTotalText, visibleWhen: usesPayrollSalary },

      { kind: "section", label: "Stage", visibleWhen: (form) => form.contractType === "Stage" },
      { key: "school", label: "Ecole", visibleWhen: (form) => form.contractType === "Stage" },
      { key: "supervisor", label: "Encadreur", visibleWhen: (form) => form.contractType === "Stage" },

      { kind: "section", label: "Consultance", visibleWhen: (form) => form.contractType === "Consultant" },
      { key: "deliverables", label: "Livrables", type: "textarea", wide: true, visibleWhen: (form) => form.contractType === "Consultant" },

      { kind: "section", label: "Suivi RH" },
      { key: "workSchedule", label: "Horaires de travail" },
      { key: "managerId", label: "Responsable hierarchique", type: "select", optionKey: "staff" },
      { key: "hrResponsibleId", label: "Responsable RH", type: "select", optionKey: "staff" },
      { key: "status", label: "Statut", type: "select", options: CONTRACT_STATUSES, requiresStatusPermission: true },

      { kind: "section", label: "Documents" },
      { key: "generatedDocumentUrl", label: "Contrat genere (lien)", wide: true },
      { key: "signedDocumentUrl", label: "Contrat signe (lien)", wide: true },
      { key: "amendmentsUrl", label: "Avenants (lien)", wide: true },
      { key: "identityDocumentUrl", label: "Piece identite (lien)", wide: true },
      { key: "diplomasUrl", label: "Diplomes (lien)", wide: true },
      { key: "notes", label: "Notes", type: "textarea", wide: true },
    ],
  },
});

Object.assign(ACTION_FORMS, {
  payroll: {
    title: "Nouveau bulletin de paie",
    submit: "Enregistrer",
    success: "Bulletin de paie enregistre.",
    wide: true,
    defaults: {
      userId: "",
      contractId: "",
      period: TODAY.slice(0, 7),
      currencyId: "",
      baseSalary: 0,
      transportAllowance: 0,
      housingAllowance: 0,
      riskAllowance: 0,
      otherAllowances: 0,
      overtimeHours: 0,
      overtimeAmount: 0,
      unpaidAbsenceDeduction: 0,
      advanceDeduction: 0,
      taxAmount: 0,
      cnssAmount: 0,
      otherDeductions: 0,
      workedDays: 0,
      absenceDays: 0,
      paidLeaveDays: 0,
      status: "draft",
      notes: "",
    },
    fields: [
      { kind: "section", label: "Reference paie" },
      { key: "userId", label: "Employe", type: "select", optionKey: "staff", required: true },
      { key: "contractId", label: "Contrat", type: "select", optionKey: "contracts" },
      { key: "period", label: "Periode", type: "month", required: true },
      { key: "currencyId", label: "Devise", type: "select", optionKey: "currencies" },
      { key: "status", label: "Statut", type: "select", options: [{ value: "draft", label: "Brouillon" }, { value: "validation", label: "En validation" }, { value: "approved", label: "Approuve" }, { value: "paid", label: "Paye" }] },
      { kind: "section", label: "Gains" },
      { key: "baseSalary", label: "Salaire de base", type: "number", required: true },
      { key: "transportAllowance", label: "Prime transport", type: "number" },
      { key: "housingAllowance", label: "Prime logement", type: "number" },
      { key: "riskAllowance", label: "Prime risque", type: "number" },
      { key: "otherAllowances", label: "Autres primes", type: "number" },
      { key: "overtimeHours", label: "Heures supp.", type: "number" },
      { key: "overtimeAmount", label: "Montant heures supp.", type: "number" },
      { kind: "computed", label: "Salaire brut", value: (form) => fc(payrollGross(form), symbolFor(form.currencyId || defaultCurrencyId(), CURRENCIES, CUR)) },
      { kind: "section", label: "Retenues" },
      { key: "unpaidAbsenceDeduction", label: "Absences non payees", type: "number" },
      { key: "advanceDeduction", label: "Avances retenues", type: "number" },
      { key: "taxAmount", label: "Impots", type: "number" },
      { key: "cnssAmount", label: "CNSS", type: "number" },
      { key: "otherDeductions", label: "Autres retenues", type: "number" },
      { kind: "computed", label: "Net a payer", value: (form) => fc(payrollNet(form), symbolFor(form.currencyId || defaultCurrencyId(), CURRENCIES, CUR)) },
      { kind: "section", label: "Presence" },
      { key: "workedDays", label: "Jours travailles", type: "number" },
      { key: "absenceDays", label: "Jours absence", type: "number" },
      { key: "paidLeaveDays", label: "Jours conge paye", type: "number" },
      { key: "notes", label: "Notes", type: "textarea", wide: true },
    ],
  },
});

Object.assign(ACTION_FORMS, {
  hrProject: {
    title: "Nouveau projet ONG",
    submit: "Enregistrer",
    success: "Projet ONG enregistre.",
    wide: true,
    defaults: { code: "", name: "", donor: "", managerId: "", startDate: TODAY, endDate: "", hrBudget: 0, currencyId: "", status: "active", notes: "" },
    fields: [
      { kind: "section", label: "Projet" },
      { kind: "computed", label: "Code", value: () => "Genere automatiquement a l'enregistrement", wide: true },
      { key: "name", label: "Nom du projet", required: true },
      { key: "donor", label: "Financeur / donneur d'ordre" },
      { key: "managerId", label: "Responsable projet", type: "select", optionKey: "staff" },
      { key: "startDate", label: "Date de debut", type: "date" },
      { key: "endDate", label: "Date de fin", type: "date" },
      { kind: "section", label: "Budget RH" },
      { key: "hrBudget", label: "Budget RH", type: "number" },
      { key: "currencyId", label: "Devise", type: "select", optionKey: "currencies" },
      { key: "status", label: "Statut", type: "select", options: [{ value: "active", label: "Actif" }, { value: "planned", label: "Planifie" }, { value: "closed", label: "Cloture" }, { value: "suspended", label: "Suspendu" }] },
      { key: "notes", label: "Notes", type: "textarea", wide: true },
    ],
  },
  hrProjectAssignment: {
    title: "Affecter un employe a un projet",
    submit: "Enregistrer",
    success: "Affectation projet enregistree.",
    wide: true,
    defaults: { projectId: "", userId: "", role: "", startDate: TODAY, endDate: "", timePercent: 100, monthlyCost: 0, currencyId: "", status: "active", notes: "" },
    fields: [
      { kind: "section", label: "Affectation" },
      { key: "projectId", label: "Projet", type: "select", optionKey: "projects", required: true },
      { key: "userId", label: "Employe", type: "select", optionKey: "staff", required: true },
      { key: "role", label: "Role sur le projet" },
      { key: "startDate", label: "Debut affectation", type: "date" },
      { key: "endDate", label: "Fin affectation", type: "date" },
      { key: "timePercent", label: "Pourcentage de temps", type: "number" },
      { kind: "section", label: "Cout RH" },
      { key: "monthlyCost", label: "Cout mensuel impute", type: "number" },
      { key: "currencyId", label: "Devise", type: "select", optionKey: "currencies" },
      { kind: "computed", label: "Cout pondere", value: (form) => fc(Number(form.monthlyCost || 0) * Number(form.timePercent || 0) / 100, symbolFor(form.currencyId || defaultCurrencyId(), CURRENCIES, CUR)) },
      { key: "status", label: "Statut", type: "select", options: [{ value: "active", label: "Actif" }, { value: "planned", label: "Planifie" }, { value: "ended", label: "Termine" }, { value: "suspended", label: "Suspendu" }] },
      { key: "notes", label: "Notes", type: "textarea", wide: true },
    ],
  },
});

// Déclaré avant usage : ACTION_FORMS.candidate (top-level) lit CANDIDATE_STAGES
// à l'évaluation du module — une déclaration plus bas provoquerait un TDZ
// ("Cannot access 'CANDIDATE_STAGES' before initialization").
const CANDIDATE_STAGES = [
  { value: "nouveau", label: "Nouveau", color: "ink" },
  { value: "entrevue", label: "Entrevue", color: "sky" },
  { value: "test", label: "Test", color: "amber" },
  { value: "offre", label: "Offre", color: "accent-soft" },
  { value: "accepte", label: "Accepte", color: "emerald" },
  { value: "embauche", label: "Embauche", color: "emerald" },
  { value: "rejete", label: "Rejete", color: "rose" },
];

Object.assign(ACTION_FORMS, {
  candidate: {
    title: "Nouveau candidat",
    submit: "Enregistrer",
    success: "Candidat enregistre.",
    wide: true,
    defaults: { offerId: "", firstName: "", lastName: "", email: "", phone: "", nationality: "", gender: "", birthDate: "", currentTitle: "", currentEmployer: "", yearsExperience: "", educationLevel: "", skills: "", languages: "", source: "", cvUrl: "", linkedinUrl: "", stage: "nouveau", interviewDate: "", testDate: "", offerDate: "", offerAmount: "", offerCurrencyId: "", notes: "" },
    fields: [
      { kind: "section", label: "Identite" },
      { key: "firstName", label: "Prenom", required: true },
      { key: "lastName", label: "Nom", required: true },
      { key: "email", label: "Email" },
      { key: "phone", label: "Telephone" },
      { key: "gender", label: "Genre", type: "select", options: [{ value: "", label: "Non renseigne" }, { value: "Masculin", label: "Masculin" }, { value: "Feminin", label: "Feminin" }] },
      { key: "birthDate", label: "Date de naissance", type: "date" },
      { key: "nationality", label: "Nationalite" },
      { kind: "section", label: "Profil professionnel" },
      { key: "currentTitle", label: "Poste actuel" },
      { key: "currentEmployer", label: "Employeur actuel" },
      { key: "yearsExperience", label: "Annees d'experience", type: "number" },
      { key: "educationLevel", label: "Niveau d'etudes", type: "select", options: [{ value: "", label: "Non renseigne" }, { value: "Bac", label: "Bac" }, { value: "Bac+2", label: "Bac+2" }, { value: "Bac+3 / Licence", label: "Bac+3 / Licence" }, { value: "Bac+5 / Master", label: "Bac+5 / Master" }, { value: "Doctorat", label: "Doctorat" }, { value: "Autre", label: "Autre" }] },
      { key: "skills", label: "Competences (mots-cles)", type: "textarea", wide: true },
      { key: "languages", label: "Langues" },
      { kind: "section", label: "Candidature" },
      { key: "offerId", label: "Poste vise", type: "select", optionKey: "offers" },
      { key: "source", label: "Source", type: "select", options: [{ value: "", label: "Non renseigne" }, { value: "Annonce LinkedIn", label: "Annonce LinkedIn" }, { value: "Site carriere", label: "Site carriere" }, { value: "Recommandation", label: "Recommandation" }, { value: "Agence", label: "Agence" }, { value: "Candidature spontanee", label: "Candidature spontanee" }, { value: "Autre", label: "Autre" }] },
      { key: "stage", label: "Etape", type: "select", options: CANDIDATE_STAGES.map((s) => ({ value: s.value, label: s.label })) },
      { key: "cvUrl", label: "URL du CV" },
      { key: "linkedinUrl", label: "Profil LinkedIn" },
      { kind: "section", label: "Calendrier" },
      { key: "interviewDate", label: "Date d'entretien", type: "date" },
      { key: "testDate", label: "Date du test", type: "date" },
      { key: "offerDate", label: "Date d'offre", type: "date" },
      { key: "offerAmount", label: "Montant de l'offre", type: "number" },
      { key: "offerCurrencyId", label: "Devise offre", type: "select", optionKey: "currencies" },
      { key: "notes", label: "Notes", type: "textarea", wide: true },
    ],
  },
});

const SELF_ACTION_FORMS = {
  leaveRequest: {
    title: "Demander un conge",
    subtitle: "Ta demande sera envoyee aux RH pour validation.",
    submit: "Envoyer la demande",
    success: "Demande de conge envoyee.",
    fields: [
      { key: "userId", label: "Employe", type: "select", optionKey: "staff", required: true },
      { key: "type", label: "Type de conge", type: "select", options: ["Conge annuel", "Maladie", "Maternite", "Paternite", "Mission", "Autre"], required: true },
      { key: "startDate", label: "Date de debut", type: "date", required: true },
      { key: "endDate", label: "Date de fin", type: "date", required: true },
      { key: "reason", label: "Motif", type: "textarea", wide: true },
    ],
  },
  timesheet: {
    title: "Saisir mes heures",
    subtitle: "Indique la periode, le travail effectue et le nombre d'heures.",
    submit: "Soumettre les heures",
    success: "Heures envoyees.",
    fields: [
      { key: "userId", label: "Employe", type: "select", optionKey: "staff", required: true },
      { key: "periodStartDate", label: "Debut de periode", type: "date", required: true },
      { key: "periodEndDate", label: "Fin de periode", type: "date", required: true },
      { key: "hours", label: "Nombre d'heures", type: "number", required: true },
      { key: "activity", label: "Travail effectue", type: "textarea", wide: true, required: true },
      { key: "note", label: "Note", type: "textarea", wide: true },
    ],
  },
  expenseRequest: {
    title: "Demander un remboursement ou une avance",
    subtitle: "Indique le montant, la devise et la raison de la demande.",
    submit: "Envoyer la demande",
    success: "Demande de frais envoyee.",
    fields: [
      { key: "userId", label: "Employe", type: "select", optionKey: "staff", required: true },
      { key: "type", label: "Nature de la demande", type: "select", options: ["Remboursement", "Avance", "Transport", "Mission", "Communication", "Autre"], required: true },
      { key: "amount", label: "Montant demande", type: "number", required: true },
      { key: "requestDate", label: "Date de la demande", type: "date", required: true },
      { key: "description", label: "Justification", type: "textarea", wide: true },
    ],
  },
  hrDocument: {
    title: "Deposer un document",
    subtitle: "Ajoute un document personnel ou RH a ton dossier.",
    submit: "Deposer le document",
    success: "Document envoye aux RH.",
    fields: [
      { key: "userId", label: "Employe", type: "select", optionKey: "staff", required: true },
      { key: "documentType", label: "Type de document", type: "select", options: ["CV", "Piece ID", "Diplome", "Contrat signe", "N CNSS", "Code conduite / PSEA", "Attestation", "Autre"], required: true },
      { key: "reference", label: "Reference" },
      { key: "fileUrl", label: "Lien du document" },
      { key: "note", label: "Commentaire", type: "textarea", wide: true },
    ],
  },
  employeeRequest: {
    title: "Faire une demande RH",
    subtitle: "Pour une attestation, correction de profil ou autre demande administrative.",
    submit: "Envoyer aux RH",
    success: "Demande RH envoyee.",
    fields: [
      { key: "userId", label: "Employe", type: "select", optionKey: "staff", required: true },
      { key: "requestType", label: "Type de demande", type: "select", options: ["Attestation de travail", "Changement d'adresse", "Changement compte bancaire", "Correction profil", "Document administratif", "Autre"], required: true },
      { key: "subject", label: "Objet", required: true },
      { key: "requestedDate", label: "Date de la demande", type: "date", required: true },
      { key: "description", label: "Details de la demande", type: "textarea", wide: true },
    ],
  },
};

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
function Avatar({ name, color, size = 36, sq = false, text, src }) {
  return <span className={`av ${sq ? "sq" : ""}`} style={{ width: size, height: size, background: color || colorFor(name), fontSize: size <= 30 ? 10 : 12 }}>{src ? <img src={src} alt="" /> : text || initials(name)}</span>;
}
function Bar({ pct, cls = "grad-accent" }) {
  const bg = { amber: "var(--amber-400)", sky: "var(--sky-400)", ink: "var(--ink-300)", teal: "var(--teal-400)" }[cls];
  const width = Number.isFinite(Number(pct)) ? Math.max(0, Math.min(100, Number(pct))) : 0;
  return <div className="bar"><span className={bg ? "" : cls} style={{ width: `${width}%`, background: bg }} /></div>;
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
  const [data, setData] = React.useState({ ...EMPTY_DATA });
  const [apiStatus, setApiStatus] = React.useState("empty");
  const [modal, setModal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [moreOpen, setMoreOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const [, forceCur] = React.useState(0);
  const load = React.useCallback(() => {
    Promise.allSettled([
      api.overview(), api.shifts(), api.awards(), api.attendances(), api.attendanceSummary(), api.salaryHistory(), api.payrolls(), api.hrProjects(), api.hrProjectReport(), api.hrProjectAssignments(), api.roles(), api.setting(), api.currencies(),
      api.leaveRequests(), api.leaveSummary(), api.hrContracts(), api.hrDocuments(), api.expenseRequests(), api.socialDeclarations(),
      api.performanceReviews(), api.trainingSessions(), api.timesheets(), api.employeeRequests(), api.recruitmentOffers(), api.payrollSummary(), api.hrDocumentSummary(), api.hrCandidates(), api.candidateSummary()
    ])
      .then(([overview, shifts, awards, attendances, attendanceSummary, salaries, payrolls, projects, projectReport, projectAssignments, roles, setting, currencies, leaves, leaveSummary, contracts, documents, expenses, declarations, reviews, trainings, timesheets, employeeRequests, offers, payrollSummary, documentSummary, candidatesRes, candidateSummaryRes]) => {
        const curList = currencies.value?.getAllCurrency || (Array.isArray(currencies.value) ? currencies.value : null);
        if (curList) CURRENCIES = curList;
        if (setting.value && curList) {
          DEFAULT_CURRENCY_ID = setting.value.currencyId ?? setting.value.currency?.id ?? defaultCurrencyId();
          CUR = defaultSymbol(setting.value, curList, CUR);
          forceCur((n) => n + 1);
        }
        const staffRows = Array.isArray(overview.value?.staff) ? overview.value.staff : [];
        const next = {
          staff: staffRows,
          designations: Array.isArray(overview.value?.designations) ? overview.value.designations : [],
          departments: enrichDepartments(Array.isArray(overview.value?.departments) ? overview.value.departments : [], staffRows),
          shifts: Array.isArray(shifts.value) ? shifts.value : [],
          awards: arrayFrom(awards.value, "getAllAward"),
          attendances: arrayFrom(attendances.value, "getAllHrAttendance"),
          attendanceSummary: attendanceSummary.value || EMPTY_DATA.attendanceSummary,
          salaries: arrayFrom(salaries.value, "getAllSalaryHistory"),
          payrolls: arrayFrom(payrolls.value, "getAllHrPayroll"),
          projects: arrayFrom(projects.value, "getAllHrProject"),
          projectReport: projectReport.value || EMPTY_DATA.projectReport,
          projectAssignments: arrayFrom(projectAssignments.value, "getAllHrProjectAssignment"),
          roles: arrayFrom(roles.value, "getAllRole"),
          leaveRequests: arrayFrom(leaves.value, "getAllHrLeaveRequest"),
          leaveSummary: leaveSummary.value || EMPTY_DATA.leaveSummary,
          contracts: arrayFrom(contracts.value, "getAllHrContract"),
          documents: arrayFrom(documents.value, "getAllHrDocument"),
          expenseRequests: arrayFrom(expenses.value, "getAllHrExpenseRequest"),
          socialDeclarations: arrayFrom(declarations.value, "getAllHrSocialDeclaration"),
          performanceReviews: arrayFrom(reviews.value, "getAllHrPerformanceReview"),
          trainingSessions: arrayFrom(trainings.value, "getAllHrTrainingSession"),
          timesheets: arrayFrom(timesheets.value, "getAllHrTimesheet"),
          employeeRequests: arrayFrom(employeeRequests.value, "getAllHrEmployeeRequest"),
          recruitmentOffers: arrayFrom(offers.value, "getAllHrRecruitmentOffer"),
          candidates: arrayFrom(candidatesRes.value, "getAllHrCandidate"),
          candidateSummary: candidateSummaryRes.value || EMPTY_DATA.candidateSummary,
          payrollSummary: payrollSummary.value || EMPTY_DATA.payrollSummary,
          documentSummary: documentSummary.value || EMPTY_DATA.documentSummary,
        };
        const ok = [overview, shifts, awards, salaries].some((r) => r.status === "fulfilled" && r.value);
        setData(next);
        setApiStatus(ok ? "api" : "empty");
      })
      .catch(() => { setData({ ...EMPTY_DATA }); setApiStatus("empty"); });
  }, []);
  React.useEffect(() => load(), [load]);

  const me = getUser();
  const myInitials = initials(me.name);
  const myRole = me.role || "Ressources humaines";
  const go = (id) => { setRoute(id); setMoreOpen(false); window.scrollTo(0, 0); };

  async function save(kind, form) {
    setBusy(true); setError("");
    try {
      const hrApiKinds = ["leaveRequest", "leaveDecision", "hrContract", "hrDocument", "expenseRequest", "socialDeclaration", "performanceReview", "trainingSession", "timesheet", "attendance", "employeeRequest", "recruitmentOffer", "payroll", "hrProject", "hrProjectAssignment"];
      if (hrApiKinds.includes(kind)) {
        if (kind === "leaveRequest") await api.createLeaveRequest(cleanPayload({ userId: Number(form.userId), type: form.type, startDate: form.startDate, endDate: form.endDate, reason: form.reason || null, managerId: toNum(form.managerId), isPaid: form.isPaid === "0" ? 0 : 1 }));
        if (kind === "leaveDecision") await api.updateLeaveRequest(Number(form.id), cleanPayload({
          status: form.status,
          decidedBy: toNum(form.decidedBy),
          managerId: toNum(form.managerId),
          decisionComment: form.decisionComment || null,
          managerComment: form.status === "manager_approved" ? form.decisionComment || null : undefined,
          hrComment: form.status === "approved" ? form.decisionComment || null : undefined,
        }));
        if (kind === "attendance") await api.createAttendance(cleanPayload({
          userId: Number(form.userId),
          workDate: form.workDate,
          shiftId: toNum(form.shiftId),
          clockIn: form.clockIn || null,
          pauseOut: form.pauseOut || null,
          pauseIn: form.pauseIn || null,
          clockOut: form.clockOut || null,
          status: form.status || null,
          source: "manual",
          note: form.note || null,
        }));
        if (kind === "hrContract") await api.createHrContract(cleanPayload({
          userId: Number(form.userId),
          contractType: form.contractType,
          startDate: form.startDate,
          endDate: hasContractEndDate(form) ? form.endDate || null : null,
          designationId: toNum(form.designationId),
          departmentId: toNum(form.departmentId),
          managerId: toNum(form.managerId),
          hrResponsibleId: toNum(form.hrResponsibleId),
          workLocation: form.workLocation || null,
          currencyId: toNum(form.currencyId),
          baseSalary: Number(form.baseSalary || 0),
          transportAllowance: Number(form.transportAllowance || 0),
          housingAllowance: Number(form.housingAllowance || 0),
          payFrequency: form.payFrequency || null,
          probationMonths: usesProbation(form) ? toNum(form.probationMonths) : null,
          probationEndDate: usesProbation(form) ? form.probationEndDate || null : null,
          workSchedule: form.workSchedule || null,
          school: form.contractType === "Stage" ? form.school || null : null,
          supervisor: form.contractType === "Stage" ? form.supervisor || null : null,
          stipend: form.contractType === "Stage" ? Number(form.stipend || 0) : 0,
          contractAmount: form.contractType === "Consultant" ? Number(form.contractAmount || 0) : 0,
          deliverables: form.contractType === "Consultant" ? form.deliverables || null : null,
          generatedDocumentUrl: form.generatedDocumentUrl || null,
          signedDocumentUrl: form.signedDocumentUrl || null,
          amendmentsUrl: form.amendmentsUrl || null,
          identityDocumentUrl: form.identityDocumentUrl || null,
          diplomasUrl: form.diplomasUrl || null,
          status: form.status || "draft",
          notes: form.notes || null,
        }));
        if (kind === "hrDocument") await api.createHrDocument(cleanPayload({ userId: Number(form.userId), documentType: form.documentType, reference: form.reference || null, fileUrl: form.fileUrl || null, note: form.note || null }));
        if (kind === "expenseRequest") await api.createExpenseRequest(cleanPayload({ userId: Number(form.userId), type: form.type, amount: Number(form.amount || 0), currencyId: toNum(form.currencyId), requestDate: form.requestDate, description: form.description || null }));
        if (kind === "socialDeclaration") await api.createSocialDeclaration(cleanPayload({ period: form.period, organism: form.organism, baseAmount: Number(form.baseAmount || 0), rate: form.rate || null, amount: Number(form.amount || 0), currencyId: toNum(form.currencyId), dueDate: form.dueDate || null, note: form.note || null }));
        if (kind === "payroll") await api.createPayroll(cleanPayload({
          userId: Number(form.userId),
          contractId: toNum(form.contractId),
          period: form.period,
          currencyId: toNum(form.currencyId),
          baseSalary: Number(form.baseSalary || 0),
          transportAllowance: Number(form.transportAllowance || 0),
          housingAllowance: Number(form.housingAllowance || 0),
          riskAllowance: Number(form.riskAllowance || 0),
          otherAllowances: Number(form.otherAllowances || 0),
          overtimeHours: Number(form.overtimeHours || 0),
          overtimeAmount: Number(form.overtimeAmount || 0),
          unpaidAbsenceDeduction: Number(form.unpaidAbsenceDeduction || 0),
          advanceDeduction: Number(form.advanceDeduction || 0),
          taxAmount: Number(form.taxAmount || 0),
          cnssAmount: Number(form.cnssAmount || 0),
          otherDeductions: Number(form.otherDeductions || 0),
          workedDays: Number(form.workedDays || 0),
          absenceDays: Number(form.absenceDays || 0),
          paidLeaveDays: Number(form.paidLeaveDays || 0),
          status: form.status || "draft",
          notes: form.notes || null,
        }));
        if (kind === "hrProject") await api.createHrProject(cleanPayload({
          code: form.code || null,
          name: form.name,
          donor: form.donor || null,
          managerId: toNum(form.managerId),
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          hrBudget: Number(form.hrBudget || 0),
          currencyId: toNum(form.currencyId),
          status: form.status || "active",
          notes: form.notes || null,
        }));
        if (kind === "hrProjectAssignment") await api.createHrProjectAssignment(cleanPayload({
          projectId: Number(form.projectId),
          userId: Number(form.userId),
          role: form.role || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          timePercent: Number(form.timePercent || 0),
          monthlyCost: Number(form.monthlyCost || 0),
          currencyId: toNum(form.currencyId),
          status: form.status || "active",
          notes: form.notes || null,
        }));
        if (kind === "performanceReview") await api.createPerformanceReview(cleanPayload({ userId: Number(form.userId), managerId: toNum(form.managerId), cycle: form.cycle, score: toNum(form.score), objectives: form.objectives || null, comments: form.comments || null }));
        if (kind === "trainingSession") await api.createTrainingSession(cleanPayload({ title: form.title, audience: form.audience || null, sessionDate: form.sessionDate || null, budget: Number(form.budget || 0), currencyId: toNum(form.currencyId), note: form.note || null }));
        if (kind === "timesheet") {
          const periodStartDate = form.periodStartDate || form.workDate || TODAY;
          const periodEndDate = form.periodEndDate || periodStartDate;
          const selectedProject = (data.projects || []).find((p) => String(p.id) === String(form.projectId));
          const projectLabel = (form.project || [selectedProject?.code, selectedProject?.name].filter(Boolean).join(" - ") || "Projet ONG").trim();
          const activity = (form.activity || projectLabel || "Heures travaillees").trim();
          await api.createTimesheet(cleanPayload({
            userId: Number(form.userId),
            workDate: periodStartDate,
            period: form.period || `${periodStartDate} - ${periodEndDate}`,
            periodStartDate,
            periodEndDate,
            projectId: toNum(form.projectId),
            project: projectLabel.slice(0, 180),
            donor: form.donor || selectedProject?.donor || null,
            activity,
            hours: Number(form.hours || 0),
            note: form.note || null,
          }));
        }
        if (kind === "employeeRequest") await api.createEmployeeRequest(cleanPayload({ userId: Number(form.userId), requestType: form.requestType, subject: form.subject, requestedDate: form.requestedDate, description: form.description || null }));
        if (kind === "recruitmentOffer") await api.createRecruitmentOffer(cleanPayload({ role: form.role, departmentId: toNum(form.departmentId), deadline: form.deadline || null, description: form.description || null }));
        if (kind === "candidate") {
          const body = cleanPayload({ offerId: toNum(form.offerId), firstName: form.firstName, lastName: form.lastName, email: form.email || null, phone: form.phone || null, nationality: form.nationality || null, gender: form.gender || null, birthDate: form.birthDate || null, currentTitle: form.currentTitle || null, currentEmployer: form.currentEmployer || null, yearsExperience: toNum(form.yearsExperience), educationLevel: form.educationLevel || null, skills: form.skills || null, languages: form.languages || null, source: form.source || null, cvUrl: form.cvUrl || null, linkedinUrl: form.linkedinUrl || null, stage: form.stage || "nouveau", interviewDate: form.interviewDate || null, testDate: form.testDate || null, offerDate: form.offerDate || null, offerAmount: toNum(form.offerAmount), offerCurrencyId: toNum(form.offerCurrencyId), notes: form.notes || null });
          if (form.id) await api.updateCandidate(form.id, body);
          else await api.createCandidate(body);
        }
        setModal(null); load(); notify(ACTION_FORMS[kind]?.success || `${titleFor(kind)} enregistrÃ© avec l'API.`);
        return;
      }
      if (kind === "employee") {
        const email = form.email || generatedEmailFor(form.firstName, form.lastName);
        const password = form.password || generateInitialPassword();
        if (!isValidInitialPassword(password)) throw new Error("Le mot de passe doit contenir 12 a 64 caracteres, au moins une lettre et un chiffre.");
        await api.createUser(cleanPayload({
          firstName: form.firstName, lastName: form.lastName, username: form.username, password,
          roleId: Number(form.roleId), email, phone: form.phone, departmentId: toNum(form.departmentId),
          designationId: toNum(form.designationId), shiftId: toNum(form.shiftId), employeeId: form.employeeId,
          gender: form.gender, birthDate: form.birthDate, maritalStatus: form.maritalStatus,
          childrenCount: Number(form.childrenCount || 0), nationality: form.nationality,
          emergencyContactName: form.emergencyContactName, emergencyContactPhone: form.emergencyContactPhone,
          emergencyContactRelationship: form.emergencyContactRelationship, personalDocumentsUrl: form.personalDocumentsUrl,
          bloodGroup: form.bloodGroup, image: form.image, joinDate: form.joinDate, street: form.street, city: form.city,
          state: form.state, zipCode: form.zipCode, country: form.country,
        }));
      }
      if (kind === "editEmployee") {
        if (form.password && !isValidInitialPassword(form.password)) throw new Error("Le mot de passe doit contenir 12 a 64 caracteres, au moins une lettre et un chiffre.");
        await api.updateUser(Number(form.id), cleanPayload({
          firstName: form.firstName, lastName: form.lastName, username: form.username, password: form.password,
          roleId: Number(form.roleId), email: form.email, phone: form.phone, departmentId: toNum(form.departmentId),
          designationId: toNum(form.designationId), shiftId: toNum(form.shiftId), employeeId: form.employeeId,
          gender: form.gender, birthDate: form.birthDate, maritalStatus: form.maritalStatus,
          childrenCount: Number(form.childrenCount || 0), nationality: form.nationality,
          emergencyContactName: form.emergencyContactName, emergencyContactPhone: form.emergencyContactPhone,
          emergencyContactRelationship: form.emergencyContactRelationship, personalDocumentsUrl: form.personalDocumentsUrl,
          bloodGroup: form.bloodGroup, image: form.image, joinDate: form.joinDate, street: form.street, city: form.city,
          state: form.state, zipCode: form.zipCode, country: form.country, status: canManageUserStatus() ? form.status : undefined,
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
        await api.closeUser(Number(form.userId), { status: "false", leaveDate: new Date().toISOString().slice(0, 10), leaveReason });
      }
      setModal(null); load(); notify(ACTION_FORMS[kind]?.success || `${titleFor(kind)} enregistré avec l'API.`);
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
    dossiers: <Dossiers {...ctx} reload={load} />,
    presences: <Presences data={data} staff={staff} setModal={setModal} />,
    conges: <Conges {...ctx} />,
    timesheet: <Timesheet data={data} staff={staff} setModal={setModal} />,
    paie: <Paie data={data} staff={staff} masse={masse} setModal={setModal} reload={load} />,
    frais: <Frais {...ctx} />,
    declarations: <Declarations {...ctx} />,
    performance: <Performance {...ctx} />,
    formation: <Formation {...ctx} />,
    recrutement: <Recrutement {...ctx} reload={load} />,
    projets: <ProjetsONG data={data} staff={staff} setModal={setModal} />,
    organigramme: <Organigramme departments={data.departments} designations={data.designations} canMutate={canMutate} onNew={() => setModal({ kind: "designation" })} />,
    reporting: <Reporting data={data} staff={staff} masse={masse} />,
    selfservice: <SelfService data={data} staff={staff} me={me} setModal={setModal} />,
    parametres: <Parametres />,
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
            <span className={`source-pill ${apiStatus}`}>{apiStatus === "api" ? "Données live" : "Aucune donnée locale"}</span>
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

      {modal && (modal.kind === "employeeProfile"
        ? <Employee360ProfileModal
            user={modal.user}
            data={data}
            staff={staff}
            onClose={() => setModal(null)}
            onEdit={() => setModal({ kind: "editEmployee", initial: employeeForm(modal.user) })}
            onCloseAccount={() => setModal({ kind: "closeAccount", initial: { userId: modal.user.id } })}
          />
        : <RecordModal modal={modal} data={data} staff={staff} busy={busy} error={error} onSave={save} onClose={() => setModal(null)} />
      )}
      <Toaster />
      <AiAssistant />
    </div>
  );
}

/* ── Paramètres (dont version applicative) ─────────────────────────────── */
function Parametres() {
  const base = import.meta.env.VITE_APP_BASE_VERSION || "—";
  const build = import.meta.env.VITE_APP_BUILD_VERSION || base;
  const commit = import.meta.env.VITE_APP_COMMIT || "—";
  const env = /dev\.|localhost|127\.0\.0\.1/.test(window.location.hostname) ? "dev" : "prod";
  const buildDate = import.meta.env.VITE_APP_BUILD_DATE;
  const lastUpdate = buildDate
    ? new Date(buildDate).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
    : "—";
  const Row = ({ k, v }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border, #e5e7eb)" }}>
      <span style={{ color: "#6b7280", fontSize: 13 }}>{k}</span>
      <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13 }}>{v}</span>
    </div>
  );
  return (
    <>
      <PageHead eyebrow="Système" title="Paramètres" />
      <div className="card" style={{ maxWidth: 560, padding: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>À propos</div>
        <Row k="Version" v={`v${base}`} />
        <Row k="Build" v={build} />
        <Row k="Commit" v={commit} />
        <Row k="Dernière mise à jour" v={lastUpdate} />
        <Row k="Environnement" v={env} />
      </div>
    </>
  );
}

/* ── Dashboard ─────────────────────────────────────────────────────────── */
function Dashboard({ data, staff, masse, go, setModal }) {
  const total = staff.length;
  const pendingLeaves = (data.leaveRequests || []).filter((l) => isPending(l.status)).length;
  const leavesToday = currentLeaves(data.leaveRequests).length;
  const contractsSoon = expiringContracts(data.contracts).length;
  const deptMax = Math.max(1, ...data.departments.map((d) => Number(d.count || 0)));
  const todos = [
    pendingLeaves ? { icon: "palmtree", tone: "teal", title: `${pendingLeaves} demandes de congé`, sub: "A traiter", onClick: () => go("conges") } : null,
    contractsSoon ? { icon: "fileText", tone: "amber", title: `${contractsSoon} contrats expirent`, sub: "< 30 jours", onClick: () => go("contrats") } : null,
  ].filter(Boolean);
  return (
    <>
      <PageHead eyebrow="Vue d'ensemble" title="Ressources humaines" action="Nouvel employé" actionIcon="userPlus" onAction={() => setModal({ kind: "employee" })} />
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <KPI label="Effectif total" value={total} icon="users" />
        <KPI label="En congé aujourd'hui" value={leavesToday} icon="palmtree" />
        <KPI label="Congés en attente" value={pendingLeaves} sub={pendingLeaves ? "A approuver" : ""} tone={pendingLeaves ? "warn" : undefined} icon="palmtree" />
        <KPI label="Masse salariale / mois" value={<MoneyLines lines={salaryMoneyLines(staff)} />} icon="wallet" />
      </div>
      <div className="g3">
        <section className="card pad span2">
          <div className="section-head"><h3 className="font-display">Effectif par département</h3><button className="link" onClick={() => go("organigramme")}>Organigramme</button></div>
          {data.departments.length === 0 && <EmptyState title="Aucun departement en base" />}
          {data.departments.map((d) => (
            <div key={d.id} style={{ marginBottom: 12, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontWeight: 500 }}>{d.name}</span><span className="muted">{d.count}</span></div>
              <Bar pct={Math.max(5, Math.round((Number(d.count || 0) / deptMax) * 100))} cls={d.color === "teal" ? "grad-accent" : d.color === "sky" ? "grad-sky" : d.color} />
            </div>
          ))}
        </section>
        <section className="card pad">
          <h3 className="block-title font-display"><Icon name="bell" style={{ color: "var(--rose-500)" }} /> À traiter</h3>
          {todos.length === 0 && <EmptyState title="Aucune action RH en attente" detail="Les alertes apparaissent quand des donnees existent en base." />}
          {todos.map((todo) => <Todo key={todo.title} {...todo} />)}
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
function Employes({ data, staff, setModal }) {
  const enConge = currentLeaves(data.leaveRequests).length;
  const nouveaux = newEmployees(staff).length;
  const expirent = expiringContracts(data.contracts).length;
  const [q, setQ] = React.useState("");
  const [dept, setDept] = React.useState("");
  const [view, setView] = React.useState("grid");
  const depts = [...new Set(staff.map((u) => u.department?.name).filter(Boolean))];
  const matricule = (u) => u.employeeId || fallbackEmployeeId(u);
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
        <Autocomplete
          className={`pill-auto ${dept ? "on" : ""}`}
          value={dept}
          onChange={setDept}
          placeholder="Tous les départements"
          title="Filtrer par département"
          options={[{ value: "", label: "Tous les départements" }, ...depts.map((d) => ({ value: d, label: d }))]}
        />
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
        <div className="card pad table-card"><div className="tbl-scroll"><table className="tbl" style={{ minWidth: 760 }}>
          <thead><tr><th>Employé</th><th>Poste</th><th>Département</th><th className="r">Salaire</th><th className="r">Statut</th></tr></thead>
          <tbody>{filtered.map((u) => { const name = fullName(u); return (
            <tr key={u.id}>
              <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={name} color={colorFor(name)} size={30} src={u.image} /><div><div style={{ fontWeight: 500 }}>{name}</div><div className="tiny">{matricule(u)} · {displayPhone(u)}</div><EmployeeActions user={u} setModal={setModal} /></div></div></td>
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
                <Avatar name={name} color={colorFor(name)} size={48} sq src={u.image} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                  <div className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.designation?.name || "Poste non assigné"}</div>
                </div>
                <span className="chip emerald" style={{ marginLeft: "auto" }}>{u.status === "false" ? "Inactif" : "Actif"}</span>
              </div>
              <div className="emp-meta">
                <div><Icon name="phone" /> {displayPhone(u)}</div>
                <div><Icon name="building2" /> {u.department?.name || "Département"}</div>
                <div><Icon name="badgeCheck" /> {matricule(u)}</div>
              </div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{fc(u.currentSalary, salarySym(u))} / mois</span>
                <EmployeeActions user={u} setModal={setModal} />
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
function EmployeeActions({ user, setModal }) {
  const [open, setOpen] = React.useState(false);
  const openModal = (next) => {
    setOpen(false);
    setModal(next);
  };
  return (
    <div className="emp-actions">
      <button type="button" className="emp-action-trigger" onClick={() => setOpen((v) => !v)}>
        Actions <Icon name="chevronRight" style={{ width: 14, height: 14 }} />
      </button>
      {open && (
        <div className="emp-action-menu">
          <button type="button" onClick={() => openModal({ kind: "employeeProfile", user })}><Icon name="circleUser" /> Visualiser</button>
          <button type="button" onClick={() => openModal({ kind: "editEmployee", initial: employeeForm(user) })}><Icon name="edit" /> Modifier</button>
          <button type="button" className="danger" onClick={() => openModal({ kind: "closeAccount", initial: { userId: user.id } })}><Icon name="xCircle" /> Fermer le compte</button>
        </div>
      )}
    </div>
  );
}

function EmployeeProfileModal({ user, onClose, onEdit, onCloseAccount }) {
  const name = fullName(user);
  const row = (label, value) => <div><span>{label}</span><strong>{value || "-"}</strong></div>;
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <div className="modal-card employee-profile-card">
        <div className="modal-head">
          <div>
            <h2 className="font-display">{name}</h2>
            <p>{user.designation?.name || "Poste non assigne"} · {user.department?.name || "Departement non assigne"}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="employee-profile-head">
          <Avatar name={name} color={colorFor(name)} size={54} sq src={user.image} />
          <div>
            <div className="chip emerald">{user.status === "false" ? "Inactif" : "Actif"}</div>
            <div className="tiny" style={{ marginTop: 6 }}>{user.employeeId || fallbackEmployeeId(user)}</div>
          </div>
        </div>
        <div className="employee-profile-grid">
          {row("Telephone", displayPhone(user))}
          {row("Email", user.email)}
          {row("Identifiant", user.username)}
          {row("Role", user.role?.name)}
          {row("Departement", user.department?.name)}
          {row("Poste", user.designation?.name)}
          {row("Date d'embauche", dateOnly(user.joinDate))}
          {row("Salaire", `${fc(user.currentSalary, salarySym(user))} / mois`)}
          {row("Adresse", [user.street, user.city, user.country].filter(Boolean).join(", "))}
          {row("Motif de depart", user.leaveReason)}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Fermer</button>
          <button type="button" className="btn btn-ghost" onClick={onEdit}><Icon name="edit" /> Modifier</button>
          <button type="button" className="btn btn-accent grad-accent" onClick={onCloseAccount}><Icon name="xCircle" /> Fermer le compte</button>
        </div>
      </div>
    </div>
  );
}

function Employee360ProfileModal({ user, data, staff, onClose, onEdit, onCloseAccount }) {
  const name = fullName(user);
  const [tab, setTab] = React.useState("resume");
  const userId = user?.id;
  const contracts = byUser(data.contracts, userId);
  const salaries = byUser(data.salaries, userId);
  const payrolls = byUser(data.payrolls, userId);
  const leaves = byUser(data.leaveRequests, userId);
  const documents = byUser(data.documents, userId);
  const timesheets = byUser(data.timesheets, userId);
  const projectAssignments = byUser(data.projectAssignments, userId);
  const reviews = byUser(data.performanceReviews, userId);
  const trainings = byUser(data.trainingSessions, userId);
  const expenses = byUser(data.expenseRequests, userId);
  const requests = byUser(data.employeeRequests, userId);
  const activeContract = contracts.find((c) => isApproved(c.status)) || contracts[0];
  const totalHours = timesheets.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const openLeaves = leaves.filter((row) => isPending(row.status)).length;
  const contractDays = daysUntil(activeContract?.endDate);
  const onLeaveNow = leaves.some((leave) => currentLeaves([leave]).length);
  const projectLabel = (projectId) => {
    const project = (data.projects || []).find((p) => String(p.id) === String(projectId));
    return project ? [project.code, project.name].filter(Boolean).join(" - ") : `Projet #${projectId}`;
  };
  const projectHours = [...timesheets.reduce((map, row) => {
    const key = row.projectId ? projectLabel(row.projectId) : (row.project || "Projet non renseigne");
    map.set(key, (map.get(key) || 0) + Number(row.hours || 0));
    return map;
  }, new Map()).entries()].map(([project, hours]) => ({ project, hours }));
  const candidatureRecord = (data.candidates || []).find((c) => String(c.convertedUserId) === String(userId));
  const [personalDocs, setPersonalDocs] = React.useState(null);
  const [photoUploading, setPhotoUploading] = React.useState(false);
  const [docUploading, setDocUploading] = React.useState(false);
  const [photoError, setPhotoError] = React.useState(null);
  const [docError, setDocError] = React.useState(null);
  const [userImage, setUserImage] = React.useState(user.image);
  React.useEffect(() => {
    api.listPersonalDocuments(userId).then(setPersonalDocs).catch(() => setPersonalDocs([]));
  }, [userId]);
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true); setPhotoError(null);
    try {
      const res = await api.uploadEmployeePhoto(userId, file);
      setUserImage(res.image);
    } catch (err) { setPhotoError(err.message); }
    finally { setPhotoUploading(false); }
  };
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const docType = window.prompt("Type de document (ex: CIN, Passeport, Diplome, Contrat, Autre) :", "CIN");
    if (!docType) return;
    setDocUploading(true); setDocError(null);
    try {
      const created = await api.uploadPersonalDocument(userId, file, docType);
      setPersonalDocs((prev) => [created, ...(prev || [])]);
    } catch (err) { setDocError(err.message); }
    finally { setDocUploading(false); }
  };
  const handleDeleteDoc = async (docId) => {
    if (!window.confirm("Supprimer ce document ?")) return;
    try {
      await api.deletePersonalDocument(docId);
      setPersonalDocs((prev) => (prev || []).filter((d) => d.id !== docId));
    } catch (err) { alert(err.message); }
  };
  const tabs = [["resume", "Resume"], ["contrats", "Contrats"], ["paie", "Paie"], ["temps", "Temps"], ["documents", "Documents"], ["pieces", "Pieces"], ["developpement", "Developpement"]];
  const row = (label, value) => <div><span>{label}</span><strong>{value || "-"}</strong></div>;
  const statusChip = (status) => <span className={"chip " + chipForStatus(status)}>{statusLabel(status)}</span>;
  const hasAlerts = (contractDays != null && contractDays >= 0 && contractDays <= 90) || onLeaveNow || documents.length === 0;
  const emergencyContact = [user.emergencyContactName, user.emergencyContactPhone ? displayPhone(user.emergencyContactPhone) : "", user.emergencyContactRelationship].filter(Boolean).join(" - ");

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <div className="modal-card employee-profile-card employee-360-card">
        <div className="modal-head">
          <div>
            <h2 className="font-display">{name}</h2>
            <p>{user.designation?.name || "Poste non assigne"} - {user.department?.name || "Departement non assigne"}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>

        <div className="employee-profile-head">
          <div style={{ position: "relative", display: "inline-block" }}>
            <Avatar name={name} color={colorFor(name)} size={54} sq src={userImage} />
            <label title="Changer la photo" style={{ position: "absolute", bottom: -4, right: -4, background: "#14b8a6", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 12 }}>
              <Icon name="edit" style={{ width: 11, height: 11 }} />
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} disabled={photoUploading} />
            </label>
          </div>
          <div>
            <div className={user.status === "false" ? "chip rose" : "chip emerald"}>{user.status === "false" ? "Inactif" : "Actif"}</div>
            <div className="tiny" style={{ marginTop: 6 }}>{user.employeeId || fallbackEmployeeId(user)}</div>
            {photoUploading && <div className="tiny" style={{ color: "#14b8a6", marginTop: 2 }}>Upload en cours...</div>}
            {photoError && <div className="tiny" style={{ color: "#ef4444", marginTop: 2 }}>{photoError}</div>}
          </div>
        </div>

        <div className="employee-360-kpis">
          <Mini label="Contrats" value={contracts.length} />
          <Mini label="Conges ouverts" value={openLeaves} />
          <Mini label="Heures saisies" value={`${nf.format(totalHours)} h`} />
          <Mini label="Bulletins" value={payrolls.length} />
        </div>

        <div className="employee-360-tabs">
          {tabs.map(([id, label]) => <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
        </div>

        {tab === "resume" && (
          <div className="employee-360-body">
            <div className="employee-profile-grid">
              {row("Telephone", displayPhone(user))}
              {row("Email", user.email)}
              {row("Identifiant", user.username)}
              {row("Role", user.role?.name)}
              {row("Departement", user.department?.name)}
              {row("Poste", user.designation?.name)}
              {row("Date d'embauche", dateOnly(user.joinDate))}
              {row("Salaire actuel", `${fc(user.currentSalary, salarySym(user))} / mois`)}
              {row("Genre", user.gender)}
              {row("Date de naissance", dateOnly(user.birthDate))}
              {row("Etat civil", user.maritalStatus)}
              {row("Enfants", user.childrenCount != null ? String(user.childrenCount) : "")}
              {row("Nationalite", user.nationality)}
              {row("Contact urgence", emergencyContact)}
              {row("Adresse", [user.street, user.city, user.country].filter(Boolean).join(", "))}
              {user.personalDocumentsUrl && row("Pieces personnelles (ancien lien)", user.personalDocumentsUrl)}
              {row("Motif de depart", user.leaveReason)}
            </div>
            <div className="employee-360-grid">
              <Employee360Panel title="Contrat actif">
                {activeContract ? (
                  <div className="kv">
                    {row("Reference", activeContract.reference)}
                    {row("Type", activeContract.contractType)}
                    {row("Debut", dateOnly(activeContract.startDate))}
                    {row("Fin", dateOnly(activeContract.endDate))}
                    {row("Montant", contractMoneyText(activeContract))}
                    <div><span>Statut</span><strong>{statusChip(activeContract.status)}</strong></div>
                  </div>
                ) : <EmptyState title="Aucun contrat lie a cet employe" />}
              </Employee360Panel>
              <Employee360Panel title="Alertes">
                {hasAlerts ? (
                  <div className="employee-360-alerts">
                    {contractDays != null && contractDays >= 0 && contractDays <= 90 && <div className="note"><Icon name="fileText" />Contrat expire dans {contractDays} jours.</div>}
                    {onLeaveNow && <div className="note"><Icon name="palmtree" />Employe actuellement en conge.</div>}
                    {documents.length === 0 && <div className="note"><Icon name="folder" />Aucun document RH lie a cet employe.</div>}
                  </div>
                ) : <EmptyState title="Aucune alerte active" detail="Les alertes apparaissent selon les donnees en base." />}
              </Employee360Panel>
            </div>
            <Employee360Panel title="Temps par projet">
              <Employee360List rows={projectHours.slice(0, 6)} empty="Aucune heure par projet pour cet employe" render={(item) => <><span>{item.project}</span><strong>{nf.format(item.hours)} h</strong></>} />
            </Employee360Panel>
            <Employee360Panel title="Affectations projets">
              <Employee360List rows={projectAssignments} empty="Aucune affectation projet en base" render={(a) => <><span>{projectLabel(a.projectId)}<small>{[a.role, dateOnly(a.startDate), dateOnly(a.endDate)].filter(Boolean).join(" - ")}</small></span><strong>{nf.format(Number(a.timePercent || 0))} %</strong></>} />
            </Employee360Panel>
          </div>
        )}

        {tab === "contrats" && (
          <Employee360Panel title="Contrats de l'employe">
            <Employee360List rows={contracts} empty="Aucun contrat en base" render={(c) => <><span>{c.reference || c.contractType || "Contrat"}<small>{[c.contractType, dateOnly(c.startDate), dateOnly(c.endDate)].filter(Boolean).join(" - ")}</small></span><strong>{statusChip(c.status)}</strong></>} />
          </Employee360Panel>
        )}

        {tab === "paie" && (
          <div className="employee-360-body">
            <Employee360Panel title="Salaire actuel">
              <div className="kv">{row("Montant", `${fc(user.currentSalary, salarySym(user))} / mois`)}{activeContract && row("Source contrat", activeContract.reference || activeContract.contractType)}</div>
            </Employee360Panel>
            <Employee360Panel title="Bulletins de paie">
              <Employee360List rows={payrolls} empty="Aucun bulletin de paie en base" render={(p) => <><span>{p.period || "Periode"}<small>{statusLabel(p.status)}</small></span><strong>{payrollMoneyText(p, p.netSalary ?? payrollNet(p))}</strong></>} />
            </Employee360Panel>
            <Employee360Panel title="Historique de paie">
              <Employee360List rows={salaries} empty="Aucune ligne de paie en base" render={(s) => <><span>{dateOnly(s.salaryStartDate || s.startDate) || "Date non renseignee"}<small>{s.salaryComment || ""}</small></span><strong>{fc(s.salary, moneySymbolFor(s))}</strong></>} />
            </Employee360Panel>
            <Employee360Panel title="Frais & avances">
              <Employee360List rows={expenses} empty="Aucune demande de frais liee" render={(e) => <><span>{e.type || "Frais"}<small>{dateOnly(e.requestDate)}</small></span><strong>{fc(e.amount, moneySymbolFor(e))}</strong></>} />
            </Employee360Panel>
          </div>
        )}

        {tab === "temps" && (
          <div className="employee-360-grid">
            <Employee360Panel title="Conges">
              <Employee360List rows={leaves} empty="Aucune demande de conge" render={(l) => <><span>{l.type || "Conge"}<small>{[dateOnly(l.startDate), dateOnly(l.endDate)].filter(Boolean).join(" - ")}</small></span><strong>{statusChip(l.status)}</strong></>} />
            </Employee360Panel>
            <Employee360Panel title="Heures">
              <Employee360List rows={timesheets} empty="Aucune heure saisie" render={(t) => <><span>{t.activity || t.project || "Travail"}<small>{[dateOnly(t.periodStartDate || t.workDate), dateOnly(t.periodEndDate || t.workDate)].filter(Boolean).join(" - ")}</small></span><strong>{nf.format(Number(t.hours || 0))} h</strong></>} />
            </Employee360Panel>
          </div>
        )}

        {tab === "documents" && (
          <div className="employee-360-grid">
            <Employee360Panel title="Documents RH">
              <Employee360List rows={documents} empty="Aucun document en base" render={(d) => <><span>{d.documentType || "Document"}<small>{d.reference || d.note || ""}</small></span><strong>{d.fileUrl ? <a className="link" href={d.fileUrl} target="_blank" rel="noreferrer">Ouvrir</a> : statusChip(d.status)}</strong></>} />
            </Employee360Panel>
            <Employee360Panel title="Demandes RH">
              <Employee360List rows={requests} empty="Aucune demande RH" render={(r) => <><span>{r.subject || r.requestType}<small>{dateOnly(r.requestedDate)}</small></span><strong>{statusChip(r.status)}</strong></>} />
            </Employee360Panel>
          </div>
        )}

        {tab === "pieces" && (
          <div className="employee-360-body" style={{ padding: "0 0 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 className="font-display" style={{ fontSize: 14 }}>Pieces personnelles ({(personalDocs || []).length})</h3>
              <label className="btn btn-accent grad-accent" style={{ fontSize: 12, cursor: "pointer" }}>
                <Icon name="plus" style={{ width: 12, height: 12 }} /> {docUploading ? "Upload..." : "Ajouter"}
                <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleDocUpload} disabled={docUploading} />
              </label>
            </div>
            {docError && <div className="tiny" style={{ color: "#ef4444", marginBottom: 8 }}>{docError}</div>}
            {personalDocs === null && <div className="tiny" style={{ color: "#64748b" }}>Chargement...</div>}
            {personalDocs !== null && personalDocs.length === 0 && <div className="tiny" style={{ color: "#64748b" }}>Aucune piece personnelle en base. Cliquez sur Ajouter pour telecharger un document.</div>}
            {(personalDocs || []).map((doc) => (
              <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{doc.documentType}</div>
                  <div className="tiny">{doc.fileName} &middot; v{doc.version} &middot; {dateOnly(doc.createdAt)}</div>
                  {doc.notes && <div className="tiny" style={{ color: "#64748b" }}>{doc.notes}</div>}
                </div>
                <a className="link" href={`${API_ROOT}${doc.filePath}`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Ouvrir</a>
                <button type="button" className="icon-btn" style={{ color: "#ef4444" }} onClick={() => handleDeleteDoc(doc.id)}><Icon name="trash" style={{ width: 14, height: 14 }} /></button>
              </div>
            ))}
          </div>
        )}

        {tab === "developpement" && (
          <div className="employee-360-grid">
            <Employee360Panel title="Evaluations">
              <Employee360List rows={reviews} empty="Aucune evaluation en base" render={(r) => <><span>{r.cycle || "Evaluation"}<small>{r.comments || r.objectives || ""}</small></span><strong>{r.score != null ? `${r.score}/5` : statusChip(r.status)}</strong></>} />
            </Employee360Panel>
            <Employee360Panel title="Formations">
              <Employee360List rows={trainings} empty="Aucune formation liee a cet employe" render={(t) => <><span>{t.title || "Formation"}<small>{[t.audience, dateOnly(t.sessionDate)].filter(Boolean).join(" - ")}</small></span><strong>{statusChip(t.status)}</strong></>} />
            </Employee360Panel>
            <Employee360Panel title="Discipline">
              <EmptyState title="Module discipline a connecter" detail="Aucune table/API discipline n'existe encore pour cet employe." />
            </Employee360Panel>
            <Employee360Panel title="Documents signes">
              <Employee360List rows={documents.filter((d) => String(d.status || "") === "signed")} empty="Aucun document signe" render={(d) => <><span>{d.documentType || "Document"}<small>{d.signedBy ? `Signe par ${d.signedBy}` : d.reference || ""}</small></span><strong>{d.content ? <button type="button" className="link" style={{ fontSize: 12 }} onClick={() => { const w = window.open("", "_blank"); w.document.write(d.content); w.document.close(); }}>Voir</button> : <span className="chip emerald">Signe</span>}</strong></>} />
            </Employee360Panel>
            {candidatureRecord && (
              <Employee360Panel title="Dossier de candidature">
                <div style={{ fontSize: 13 }}>
                  <div className="kv">
                    <div><span>Nom</span><span>{candidatureRecord.firstName} {candidatureRecord.lastName}</span></div>
                    {candidatureRecord.currentTitle && <div><span>Poste anterieur</span><span>{candidatureRecord.currentTitle}{candidatureRecord.currentEmployer ? ` — ${candidatureRecord.currentEmployer}` : ""}</span></div>}
                    {candidatureRecord.yearsExperience != null && <div><span>Experience</span><span>{candidatureRecord.yearsExperience} an(s)</span></div>}
                    {candidatureRecord.educationLevel && <div><span>Formation</span><span>{candidatureRecord.educationLevel}</span></div>}
                    {candidatureRecord.source && <div><span>Source</span><span>{candidatureRecord.source}</span></div>}
                    {candidatureRecord.interviewDate && <div><span>Date entretien</span><span>{dateOnly(candidatureRecord.interviewDate)}</span></div>}
                    {candidatureRecord.convertedAt && <div><span>Date embauche</span><span>{dateOnly(candidatureRecord.convertedAt)}</span></div>}
                  </div>
                  {candidatureRecord.skills && <div style={{ marginTop: 8 }}><span className="muted" style={{ fontSize: 11 }}>Competences : </span>{candidatureRecord.skills}</div>}
                </div>
              </Employee360Panel>
            )}
          </div>
        )}

        <div className="employee-360-note">Stade 1: dossier central connecte aux donnees existantes. Les blocs vides attendent leur table/API dediee.</div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Fermer</button>
          <button type="button" className="btn btn-ghost" onClick={onEdit}><Icon name="edit" /> Modifier</button>
          <button type="button" className="btn btn-accent grad-accent" onClick={onCloseAccount}><Icon name="xCircle" /> Fermer le compte</button>
        </div>
      </div>
    </div>
  );
}

function Employee360Panel({ title, children }) {
  return <div className="employee-360-panel"><h3 className="block-title font-display">{title}</h3>{children}</div>;
}

function Employee360List({ rows, empty, render }) {
  if (!rows.length) return <EmptyState title={empty} />;
  return <div className="employee-360-list">{rows.map((row, index) => <div className="employee-360-row" key={row.id || `${index}`}>{render(row)}</div>)}</div>;
}

function Presences({ data, staff, setModal }) {
  const rows = data.attendances || [];
  const totals = data.attendanceSummary?.totals || {};
  const shiftName = (shiftId) => {
    const shift = (data.shifts || []).find((s) => String(s.id) === String(shiftId));
    return shift ? `${shift.name} (${String(shift.startTime || "").slice(0, 5)}-${String(shift.endTime || "").slice(0, 5)})` : "-";
  };
  const timeText = (row) => [row.clockIn, row.pauseOut, row.pauseIn, row.clockOut].map((value) => value ? String(value).slice(0, 5) : "--:--").join(" / ");
  const exportAttendances = () => exportCsv(
    "presences-pointage.csv",
    ["Employe", "Date", "Horaire", "Entree", "Pause", "Retour", "Sortie", "Heures travaillees", "Retard minutes", "Absence heures", "Heures sup", "Statut", "Source", "Note"],
    rows.map((row) => [
      personName(staff, row.userId),
      dateOnly(row.workDate),
      shiftName(row.shiftId),
      row.clockIn ? String(row.clockIn).slice(0, 5) : "",
      row.pauseOut ? String(row.pauseOut).slice(0, 5) : "",
      row.pauseIn ? String(row.pauseIn).slice(0, 5) : "",
      row.clockOut ? String(row.clockOut).slice(0, 5) : "",
      Number(row.workedHours || 0),
      Number(row.lateMinutes || 0),
      Number(row.absenceHours || 0),
      Number(row.overtimeHours || 0),
      statusLabel(row.status),
      row.source || "manual",
      row.note || "",
    ])
  );
  return (
    <>
      <PageHead eyebrow="Pointage" title="Presences & pointage" action="Nouveau pointage" actionIcon="plus" onAction={() => setModal({ kind: "attendance" })} />
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <KPI label="Presents" value={totals.present ?? rows.filter((r) => ["present", "validated"].includes(String(r.status || "").toLowerCase())).length} icon="checkCircle" />
        <KPI label="En retard" value={totals.late ?? rows.filter((r) => String(r.status || "").toLowerCase() === "late").length} tone={(totals.late || 0) ? "warn" : undefined} icon="clock" />
        <KPI label="Absents" value={totals.absent ?? rows.filter((r) => String(r.status || "").toLowerCase() === "absent").length} tone={(totals.absent || 0) ? "danger" : undefined} icon="xCircle" />
        <Mini label="Heures travaillees" value={nf.format(Number(totals.workedHours || rows.reduce((sum, r) => sum + Number(r.workedHours || 0), 0)))} />
      </div>
      <div className="g3" style={{ marginBottom: 16 }}>
        <Mini label="Pointages" value={totals.records ?? rows.length} />
        <Mini label="Minutes retard" value={nf.format(Number(totals.lateMinutes || 0))} />
        <Mini label="Heures sup." value={nf.format(Number(totals.overtimeHours || 0))} />
      </div>
      <div className="card pad table-card">
        <div className="section-head">
          <h3 className="font-display">Feuille de presence</h3>
          <button type="button" className="link" onClick={exportAttendances}><Icon name="download" style={{ width: 13, height: 13 }} /> Exporter</button>
        </div>
        <div className="tbl-scroll"><table className="tbl num" style={{ minWidth: 980 }}>
          <thead><tr><th>Employe</th><th>Date</th><th>Horaire</th><th>Entree / pause / retour / sortie</th><th className="r">Heures</th><th className="r">Retard</th><th className="r">Absence</th><th className="r">Sup.</th><th className="r">Statut</th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.id}>
              <td style={{ fontWeight: 500 }}>{personName(staff, row.userId)}<div className="tiny">{row.source || "manual"}</div></td>
              <td>{dateOnly(row.workDate) || "-"}</td>
              <td>{shiftName(row.shiftId)}</td>
              <td className="muted">{timeText(row)}{row.note ? <div className="tiny">{row.note}</div> : null}</td>
              <td className="r">{nf.format(Number(row.workedHours || 0))}</td>
              <td className="r">{nf.format(Number(row.lateMinutes || 0))} min</td>
              <td className="r">{nf.format(Number(row.absenceHours || 0))} h</td>
              <td className="r">{nf.format(Number(row.overtimeHours || 0))} h</td>
              <td className="r"><span className={"chip " + chipForStatus(row.status)}>{statusLabel(row.status)}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
        {rows.length === 0 && <EmptyState title="Aucun pointage en base" detail="Clique sur Nouveau pointage pour enregistrer une entree, pause, retour et sortie." />}
      </div>
    </>
  );
}

/* Conges */
function Conges({ data, staff, setModal }) {
  const requests = data.leaveRequests || [];
  const summary = data.leaveSummary || EMPTY_DATA.leaveSummary;
  const pending = requests.filter((r) => ["pending", "submitted"].includes(String(r.status || "").toLowerCase()));
  const managerApproved = requests.filter((r) => String(r.status || "").toLowerCase() === "manager_approved");
  const approved = requests.filter((r) => ["approved", "hr_approved"].includes(String(r.status || "").toLowerCase()));
  const today = currentLeaves(requests);
  const addRequest = () => setModal({ kind: "leaveRequest" });
  const detail = (r) => [dateOnly(r.startDate), dateOnly(r.endDate)].filter(Boolean).join(" -> ") || "Dates non renseignees";
  const decision = (request, status) => setModal({ kind: "leaveDecision", initial: { id: request.id, status, userId: request.userId, managerId: request.managerId || "", decidedBy: "", decisionComment: "" } });
  return (
    <>
      <PageHead eyebrow="Absences" title="Conges & absences" action="Nouvelle demande" onAction={addRequest} />
      <div className="g4 kpis" style={{ marginBottom: 18 }}>
        <KPI label="A valider chef" value={pending.length} tone={pending.length ? "warn" : undefined} />
        <KPI label="A valider RH" value={managerApproved.length} tone={managerApproved.length ? "warn" : undefined} />
        <Mini label="En conge aujourd'hui" value={today.length} />
        <Mini label="Solde total" value={`${nf.format(Number(summary.totals?.balanceDays || 0))} j`} />
      </div>
      <div className="g3" style={{ marginBottom: 18 }}>
        <Mini label="Jours approuves" value={`${nf.format(Number(summary.totals?.usedDays || 0))} j`} />
        <Mini label="Jours en attente" value={`${nf.format(Number(summary.totals?.pendingDays || 0))} j`} />
        <Mini label="Demandes approuvees" value={approved.length} />
      </div>
      <div className="g3">
        <section className="card pad span2">
          <div className="section-head"><h3 className="block-title font-display">Workflow des demandes</h3></div>
          {requests.length === 0 && <EmptyState title="Aucune demande de conge en base" />}
          {requests.map((c) => {
            const name = personName(staff, c.userId);
            const status = String(c.status || "").toLowerCase();
            return (
              <div className="row" key={c.id || [c.userId, c.startDate, c.endDate].filter(Boolean).join("-")}>
                <Avatar name={name} color={colorFor(name)} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{name} - <span className="muted" style={{ fontWeight: 400 }}>{c.type || "Conge"}</span></div>
                  <div className="tiny">{detail(c)} - {nf.format(Number(c.requestedDays || 0))} j{c.reason ? " - " + c.reason : ""}</div>
                  <div className="tiny">Solde: {nf.format(Number(c.balanceBefore || 0))} -> {nf.format(Number(c.balanceAfter || 0))} j</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span className={"chip " + chipForStatus(c.status)}>{statusLabel(c.status)}</span>
                  {["pending", "submitted"].includes(status) && <button type="button" className="link" onClick={() => decision(c, "manager_approved")}>Chef approuve</button>}
                  {status === "manager_approved" && <button type="button" className="link" onClick={() => decision(c, "approved")}>RH approuve</button>}
                  {!["approved", "hr_approved", "rejected"].includes(status) && <button type="button" className="link" onClick={() => decision(c, "rejected")}>Rejeter</button>}
                </div>
              </div>
            );
          })}
        </section>
        <section className="card pad">
          <h3 className="block-title font-display"><Icon name="calendarDays" style={{ color: "var(--teal-600)" }} /> Absents aujourd'hui</h3>
          {today.length === 0 && <EmptyState title="Aucun absent aujourd'hui" detail="Selon les demandes de conge en base." />}
          {today.map((a) => {
            const name = personName(staff, a.userId);
            return <div key={a.id || name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Avatar name={name} color={colorFor(name)} size={30} /><div style={{ fontSize: 12 }}><div style={{ fontWeight: 500 }}>{name}</div><div className="muted">{a.type || "Conge"} - retour {dateOnly(a.endDate) || "non renseigne"}</div></div></div>;
          })}
        </section>
      </div>
      <div className="card pad table-card" style={{ marginTop: 16 }}>
        <div className="section-head"><h3 className="font-display">Soldes par employe</h3><span className="tiny">{summary.year || TODAY.slice(0, 4)}</span></div>
        <div className="tbl-scroll"><table className="tbl num" style={{ minWidth: 680 }}>
          <thead><tr><th>Employe</th><th className="r">Droit</th><th className="r">Utilise</th><th className="r">En attente</th><th className="r">Solde</th></tr></thead>
          <tbody>{(summary.byEmployee || []).map((row) => <tr key={row.userId}><td style={{ fontWeight: 500 }}>{row.name || personName(staff, row.userId)}</td><td className="r">{nf.format(Number(row.entitlementDays || 0))} j</td><td className="r">{nf.format(Number(row.usedDays || 0))} j</td><td className="r">{nf.format(Number(row.pendingDays || 0))} j</td><td className="r">{nf.format(Number(row.balanceDays || 0))} j</td></tr>)}</tbody>
        </table></div>
        {(summary.byEmployee || []).length === 0 && <EmptyState title="Aucun solde calcule" detail="Les soldes apparaitront quand les employes seront charges depuis l'API." />}
      </div>
    </>
  );
}

/* Paie */
function Paie({ data, staff, masse, setModal, reload }) {
  const [q, setQ] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("");
  const [currencyFilter, setCurrencyFilter] = React.useState("");
  const [periodFilter, setPeriodFilter] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [generateError, setGenerateError] = React.useState("");
  const rows = data.salaries || [];
  const payrollRows = data.payrolls || [];
  const summary = data.payrollSummary || EMPTY_DATA.payrollSummary;
  const [payrollPreview, setPayrollPreview] = React.useState(null); // { html } ou { loading:true }
  const openPayrollPreview = async (p) => {
    setPayrollPreview({ loading: true });
    try { setPayrollPreview({ html: await api.payrollHtml(p.id) }); }
    catch (e) { setPayrollPreview(null); alert(e.message); }
  };
  const dateStart = (s) => dateOnly(s.salaryStartDate || s.startDate);
  const dateEnd = (s) => dateOnly(s.salaryEndDate || s.endDate);
  const comment = (s) => s.salaryComment || s.comment || "";
  const employeeFor = (userId) => staff.find((u) => String(u.id) === String(userId));
  const employeeSearchText = (u) => u ? [fullName(u), u.username, u.email, matricule(u), u.designation?.name, u.department?.name].filter(Boolean).join(" ").toLowerCase() : "";
  const historySearchText = (s) => [personName(staff, s.userId), employeeSearchText(employeeFor(s.userId)), comment(s), dateStart(s), dateEnd(s), dateOnly(s.createdAt)].filter(Boolean).join(" ").toLowerCase();
  const currenciesInHistory = [...new Set([...rows.map((s) => symbolFor(s.currencyId, CURRENCIES, CUR)), ...payrollRows.map((p) => symbolFor(p.currencyId, CURRENCIES, CUR))].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const needle = q.trim().toLowerCase();
  const payrollSearchText = (p) => [personName(staff, p.userId), employeeSearchText(employeeFor(p.userId)), p.period, p.status, p.notes].filter(Boolean).join(" ").toLowerCase();
  const filteredPayrolls = payrollRows.filter((p) => {
    if (employeeFilter && String(p.userId) !== String(employeeFilter)) return false;
    if (currencyFilter && symbolFor(p.currencyId, CURRENCIES, CUR) !== currencyFilter) return false;
    if (periodFilter && p.period !== periodFilter) return false;
    return !needle || payrollSearchText(p).includes(needle);
  });
  const filteredRows = rows.filter((s) => {
    if (employeeFilter && String(s.userId) !== String(employeeFilter)) return false;
    if (currencyFilter && symbolFor(s.currencyId, CURRENCIES, CUR) !== currencyFilter) return false;
    return !needle || historySearchText(s).includes(needle);
  });
  const currentFiltered = staff.filter((u) => {
    if (employeeFilter && String(u.id) !== String(employeeFilter)) return false;
    if (currencyFilter && salarySym(u) !== currencyFilter) return false;
    return !needle || employeeSearchText(u).includes(needle);
  });
  const employeeCount = new Set([...filteredRows.map((s) => s.userId), ...filteredPayrolls.map((p) => p.userId)].filter(Boolean)).size;
  const hasFilters = Boolean(needle || employeeFilter || currencyFilter || periodFilter);
  const payrollNetLines = moneyLinesFrom(filteredPayrolls, (p) => p.netSalary ?? payrollNet(p), moneySymbolFor);
  const payrollGrossLines = moneyLinesFrom(filteredPayrolls, (p) => p.grossSalary ?? payrollGross(p), moneySymbolFor);
  const availablePeriods = [...new Set(payrollRows.map((p) => p.period).filter(Boolean))].sort().reverse();

  const handleGenerate = async () => {
    if (!employeeFilter) { setGenerateError("Selectionne un employe pour generer la paie."); return; }
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setGenerating(true); setGenerateError("");
    try {
      const draft = await api.generatePayroll(employeeFilter, period);
      setModal({ kind: "payroll", prefill: draft });
    } catch (e) {
      setGenerateError(e.message || "Erreur lors de la generation.");
    } finally { setGenerating(false); }
  };

  const handleSubmit = async (p) => {
    try { await api.submitPayroll(p.id); reload(); } catch (e) { alert(e.message); }
  };
  const handleApprove = async (p) => {
    try { await api.approvePayroll(p.id); reload(); } catch (e) { alert(e.message); }
  };
  const handleReject = async (p) => {
    const reason = window.prompt("Motif du rejet (optionnel) :");
    if (reason === null) return;
    try { await api.rejectPayroll(p.id, { comment: reason }); reload(); } catch (e) { alert(e.message); }
  };
  const handleMarkPaid = async (p) => {
    try { await api.payPayroll(p.id); reload(); } catch (e) { alert(e.message); }
  };

  const exportPayrolls = () => exportCsv(
    "bulletins-paie.csv",
    ["Employe", "Periode", "Brut", "Net", "Devise", "Jours travailles", "Absences", "Impots", "CNSS", "Statut", "Notes"],
    filteredPayrolls.map((p) => [personName(staff, p.userId), p.period || "", Math.round(Number(p.grossSalary ?? payrollGross(p))), Math.round(Number(p.netSalary ?? payrollNet(p))), symbolFor(p.currencyId, CURRENCIES, CUR), p.workedDays ?? 0, p.absenceDays ?? 0, p.taxAmount ?? 0, p.cnssAmount ?? 0, statusLabel(p.status), p.notes || ""])
  );
  const exportHistory = () => exportCsv(
    "historique-salaires.csv",
    ["Employe", "Salaire", "Devise", "Debut", "Fin", "Commentaire", "Enregistre le"],
    filteredRows.map((s) => [personName(staff, s.userId), Math.round(Number(s.salary || 0)), symbolFor(s.currencyId, CURRENCIES, CUR), dateStart(s), dateEnd(s), comment(s), dateOnly(s.createdAt)])
  );
  const exportCurrent = () => exportCsv(
    "salaires-actuels.csv",
    ["Employe", "Poste", "Salaire", "Devise", "Statut"],
    currentFiltered.map((u) => [fullName(u), u.designation?.name || "", Math.round(Number(u.currentSalary || 0)), salarySym(u), u.status === "false" ? "Inactif" : "Actif"])
  );
  return (
    <>
      <PageHead eyebrow="Payroll" title="Paie professionnelle" action="Nouveau bulletin" actionIcon="plus" onAction={() => setModal({ kind: "payroll" })} />
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <Mini label="Brouillons" value={summary.workflow.draft} />
        <KPI label="En approbation" value={payrollRows.filter((p) => String(p.status) === "pending_approval").length} tone={payrollRows.filter((p) => String(p.status) === "pending_approval").length ? "warn" : undefined} />
        <KPI label="Valides" value={summary.workflow.validated} tone={summary.workflow.validated ? "warn" : undefined} />
        <KPI label="Payes" value={summary.workflow.paid} tone={summary.workflow.paid ? "emerald" : undefined} />
      </div>
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <Mini label={hasFilters ? "Bulletins filtres" : "Bulletins (total)"} value={hasFilters ? filteredPayrolls.length : summary.bulletins} />
        <Mini label="Employes salaries" value={employeeCount} />
        <Mini label="Brut total" value={<MoneyLines lines={payrollGrossLines} empty={`0 ${CUR}`} />} />
        <Mini label="Net a payer" value={<MoneyLines lines={payrollNetLines} empty={`0 ${CUR}`} />} />
      </div>
      <div className="card pad table-card">
        <div className="section-head">
          <h3 className="font-display">Bulletins de paie</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="pillbtn" onClick={handleGenerate} disabled={generating} title="Generer depuis contrat et presences du mois en cours">
              <Icon name="play" style={{ width: 13, height: 13 }} /> {generating ? "Calcul..." : "Generer depuis contrat"}
            </button>
            <button type="button" className="link" onClick={exportPayrolls}><Icon name="download" style={{ width: 13, height: 13 }} /> Exporter</button>
          </div>
        </div>
        {generateError && <div className="chip amber" style={{ marginBottom: 8 }}>{generateError}</div>}
        <div className="searchbar">
          <label className="search-input"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un employe, matricule, poste..." /></label>
          <Autocomplete value={employeeFilter} onChange={(v) => { setEmployeeFilter(v); setGenerateError(""); }}
            placeholder="Tous les employes" options={staff.map((u) => ({ value: u.id, label: fullName(u) }))} />
          <select className="pillbtn" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} aria-label="Filtrer par periode">
            <option value="">Toutes les periodes</option>
            {availablePeriods.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="pillbtn" value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)} aria-label="Filtrer par devise">
            <option value="">Toutes les devises</option>
            {currenciesInHistory.map((sym) => <option key={sym} value={sym}>{sym}</option>)}
          </select>
        </div>
        <div className="tbl-scroll"><table className="tbl num" style={{ minWidth: 1020 }}>
          <thead><tr><th>Employe</th><th>Periode</th><th className="r">Brut</th><th className="r">Net</th><th className="r">Impots</th><th className="r">CNSS</th><th className="r">Jours</th><th className="r">Absences</th><th className="r">Statut</th><th className="r">Actions</th></tr></thead>
          <tbody>{filteredPayrolls.map((p) => {
            const st = String(p.status || "draft");
            const isPaid = st === "paid";
            const isDraft = st === "draft";
            const isRejected = st === "rejected";
            const isPending = st === "pending_approval";
            const isValidated = st === "validated";
            return <tr key={p.id}>
              <td style={{ fontWeight: 500 }}>{personName(staff, p.userId)}</td>
              <td>{p.period || "-"}</td>
              <td className="r">{payrollMoneyText(p, p.grossSalary ?? payrollGross(p))}</td>
              <td className="r" style={{ fontWeight: 700 }}>{payrollMoneyText(p, p.netSalary ?? payrollNet(p))}</td>
              <td className="r">{payrollMoneyText(p, p.taxAmount)}</td>
              <td className="r">{payrollMoneyText(p, p.cnssAmount)}</td>
              <td className="r">{p.workedDays ?? "-"}</td>
              <td className="r">{p.absenceDays ?? "-"}</td>
              <td className="r"><span className={"chip " + chipForStatus(p.status)}>{statusLabel(p.status)}</span></td>
              <td className="r" style={{ whiteSpace: "nowrap", display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                {(isDraft || isRejected) && <button type="button" className="link" style={{ fontSize: 12 }} onClick={() => handleSubmit(p)}>Soumettre</button>}
                {isPending && <button type="button" className="link" style={{ fontSize: 12, color: "var(--emerald-600)" }} onClick={() => handleApprove(p)}>Approuver</button>}
                {isPending && <button type="button" className="link" style={{ fontSize: 12, color: "var(--red-500, #ef4444)" }} onClick={() => handleReject(p)}>Rejeter</button>}
                {isValidated && <button type="button" className="link" style={{ fontSize: 12, color: "var(--emerald-600)" }} onClick={() => handleMarkPaid(p)}>Marquer paye</button>}
                {isPaid && <span className="muted" style={{ fontSize: 12 }}>Verrouille</span>}
                <button type="button" className="link" style={{ fontSize: 12 }} onClick={() => openPayrollPreview(p)}>Aperçu</button>
                <button type="button" className="link" style={{ fontSize: 12 }} onClick={() => api.downloadAuth(`/hr/payrolls/${p.id}/pdf`, `fiche-paie-${p.id}.pdf`).catch((e) => alert(e.message))}>PDF ↓</button>
              </td>
            </tr>;
          })}</tbody>
        </table></div>
        {filteredPayrolls.length === 0 && <EmptyState title={payrollRows.length === 0 ? "Aucun bulletin de paie en base" : "Aucun bulletin ne correspond aux filtres"} detail={payrollRows.length === 0 ? "Clique sur Nouveau bulletin ou Generer depuis contrat pour creer la premiere paie." : "Modifie la recherche ou les filtres."} />}
      </div>

      {payrollPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setPayrollPreview(null)}>
          <div style={{ background: "#fff", borderRadius: 10, width: "min(820px,96vw)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.22)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #eee", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Aperçu du bulletin</span>
              <button type="button" className="link" onClick={() => setPayrollPreview(null)}><Icon name="x" style={{ width: 18, height: 18 }} /></button>
            </div>
            {payrollPreview.loading
              ? <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Chargement…</div>
              : <div style={{ padding: 0 }} dangerouslySetInnerHTML={{ __html: payrollPreview.html }} />}
          </div>
        </div>
      )}

      <div className="card pad table-card" style={{ marginTop: 16 }}>
        <div className="section-head"><h3 className="font-display">Historique des salaires en base</h3><div style={{ display: "flex", gap: 10 }}><button type="button" className="link" onClick={() => setModal({ kind: "salary" })}><Icon name="plus" style={{ width: 13, height: 13 }} /> Nouveau salaire</button><button type="button" className="link" onClick={exportHistory}><Icon name="download" style={{ width: 13, height: 13 }} /> Exporter</button></div></div>
        <div className="tbl-scroll"><table className="tbl num" style={{ minWidth: 760 }}>
          <thead><tr><th>Employe</th><th className="r">Salaire</th><th>Debut</th><th>Fin</th><th>Commentaire</th><th className="r">Enregistre le</th></tr></thead>
          <tbody>{filteredRows.map((s) => <tr key={s.id}><td style={{ fontWeight: 500 }}>{personName(staff, s.userId)}</td><td className="r">{fc(s.salary, symbolFor(s.currencyId, CURRENCIES, CUR))}</td><td>{dateStart(s) || "-"}</td><td>{dateEnd(s) || "-"}</td><td className="muted">{comment(s) || "-"}</td><td className="r muted">{dateOnly(s.createdAt) || "-"}</td></tr>)}</tbody>
        </table></div>
        {filteredRows.length === 0 && <EmptyState title={rows.length === 0 ? "Aucun historique de salaire en base" : "Aucun salaire ne correspond aux filtres"} detail={rows.length === 0 ? "Clique sur Nouveau salaire pour creer la premiere ligne d'historique." : "Modifie la recherche ou les filtres pour retrouver un employe."} />}
      </div>
      <div className="card pad table-card" style={{ marginTop: 16 }}>
        <div className="section-head"><h3 className="font-display">Salaires actuels</h3><button type="button" className="link" onClick={exportCurrent}><Icon name="download" style={{ width: 13, height: 13 }} /> Exporter</button></div>
        <div className="tbl-scroll"><table className="tbl" style={{ minWidth: 560 }}>
          <thead><tr><th>Employe</th><th>Poste</th><th className="r">Salaire</th><th className="r">Statut</th></tr></thead>
          <tbody>{currentFiltered.map((u) => { const name = fullName(u); return <tr key={u.id}><td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={name} color={colorFor(name)} size={30} src={u.image} /><div><div style={{ fontWeight: 500 }}>{name}</div><div className="tiny">{u.department?.name || ""}</div></div></div></td><td>{u.designation?.name || ""}</td><td className="r num">{fc(u.currentSalary, salarySym(u))}</td><td className="r"><span className={"chip " + (u.status === "false" ? "ink" : "emerald")}>{u.status === "false" ? "Inactif" : "Actif"}</span></td></tr>; })}</tbody>
        </table></div>
        {currentFiltered.length === 0 && <EmptyState title={staff.length === 0 ? "Aucun employe en base" : "Aucun employe ne correspond aux filtres"} />}
      </div>
    </>
  );
}

/* Contrats */
function Contrats({ data, staff, setModal }) {
  const [q, setQ] = React.useState("");
  const rows = data.contracts || [];
  const filtered = rows.filter((c) => !q.trim() || [personName(staff, c.userId), c.contractType, c.reference, c.status, contractMoneyText(c)].join(" ").toLowerCase().includes(q.trim().toLowerCase()));
  const soon90 = expiringContracts(rows, 90);
  const soon30 = expiringContracts(rows, 30);
  const soon7 = expiringContracts(rows, 7);
  const exportContrats = () => exportCsv("contrats.csv", ["Reference", "Employe", "Type", "Debut", "Fin", "Montant", "Statut"], filtered.map((c) => [c.reference || "", personName(staff, c.userId), c.contractType || "", dateOnly(c.startDate), dateOnly(c.endDate), contractMoneyText(c), statusLabel(c.status)]));
  return (
    <>
      <PageHead eyebrow="Cycle de vie" title="Contrats" action="Nouveau contrat" onAction={() => setModal({ kind: "hrContract" })} />
      <div className="g4 kpis" style={{ marginBottom: 16 }}><Mini label="Total contrats" value={rows.length} /><KPI label="Expirent < 90 j" value={soon90.length} tone={soon90.length ? "warn" : undefined} /><KPI label="Expirent < 30 j" value={soon30.length} tone={soon30.length ? "warn" : undefined} /><KPI label="Urgent < 7 j" value={soon7.length} tone={soon7.length ? "warn" : undefined} /></div>
      <div className="card pad table-card">
        <div className="searchbar"><label className="search-input"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (employe, reference, type, montant, statut)..." /></label><button type="button" className="pillbtn" onClick={exportContrats}><Icon name="download" /> Exporter</button></div>
        <div className="tbl-scroll"><table className="tbl num" style={{ minWidth: 900 }}><thead><tr><th>Reference</th><th>Employe</th><th>Type</th><th>Debut</th><th>Fin</th><th className="r">Montant</th><th className="r">Alerte</th><th className="r">Statut</th></tr></thead><tbody>{filtered.map((c) => { const days = daysUntil(c.endDate); return <tr key={c.id}><td className="muted">{c.reference || "-"}</td><td style={{ fontWeight: 500 }}>{personName(staff, c.userId)}</td><td><span className="chip ink">{c.contractType || "Contrat"}</span></td><td>{dateOnly(c.startDate) || "-"}</td><td className="muted">{dateOnly(c.endDate) || "-"}</td><td className="r">{contractMoneyText(c)}</td><td className="r">{days == null || days < 0 ? "-" : days <= 7 ? <span className="chip amber">{days} j</span> : days <= 30 ? <span className="chip amber">{days} j</span> : days <= 90 ? <span className="chip ink">{days} j</span> : "-"}</td><td className="r"><span className={"chip " + chipForStatus(c.status)}>{statusLabel(c.status)}</span></td></tr>; })}</tbody></table></div>
        {filtered.length === 0 && <EmptyState title="Aucun contrat en base" />}
      </div>
    </>
  );
}

/* Dossiers */
const DOCUMENT_TEMPLATES = [
  { value: "contrat", label: "Contrat de travail" },
  { value: "avenant", label: "Avenant au contrat" },
  { value: "attestation", label: "Attestation de travail" },
  { value: "certificat", label: "Certificat de travail" },
  { value: "disciplinaire", label: "Lettre disciplinaire" },
  { value: "conge", label: "Autorisation de conge" },
];

function Dossiers({ data, staff, setModal, reload }) {
  const rows = data.documents || [];
  const summary = data.documentSummary || EMPTY_DATA.documentSummary;
  const [q, setQ] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("");
  const [preview, setPreview] = React.useState(null);
  const [generating, setGenerating] = React.useState(false);
  const [genForm, setGenForm] = React.useState({ userId: "", templateType: "contrat" });
  const [genError, setGenError] = React.useState("");
  const [signing, setSigning] = React.useState(null);
  const [signName, setSignName] = React.useState("");

  const needle = q.trim().toLowerCase();
  const docTypes = [...new Set(rows.map((d) => d.documentType).filter(Boolean))].sort();
  const filtered = rows.filter((d) => {
    if (employeeFilter && String(d.userId) !== String(employeeFilter)) return false;
    if (typeFilter && d.documentType !== typeFilter) return false;
    return !needle || [personName(staff, d.userId), d.documentType, d.reference, d.note, d.status].join(" ").toLowerCase().includes(needle);
  });

  const handleGenerate = async () => {
    if (!genForm.userId) { setGenError("Selectionne un employe."); return; }
    setGenerating(true); setGenError("");
    try {
      await api.generateHrDocument({ userId: Number(genForm.userId), templateType: genForm.templateType });
      reload();
    } catch (e) { setGenError(e.message || "Erreur de generation."); }
    finally { setGenerating(false); }
  };

  const handleSign = async () => {
    if (!signName.trim()) return;
    try {
      await api.signHrDocument(signing.id, signName.trim());
      setSigning(null); setSignName("");
      reload();
    } catch (e) { alert(e.message); }
  };

  // Workflow de validation : draft/received -> pending_validation -> approved -> signed.
  const handleSubmitDoc = async (d) => { try { await api.submitHrDocument(d.id); reload(); } catch (e) { alert(e.message); } };
  const handleApproveDoc = async (d) => { try { await api.approveHrDocument(d.id, null); reload(); } catch (e) { alert(e.message); } };
  const handleRejectDoc = async (d) => {
    const reason = window.prompt("Motif du rejet (optionnel) :", "");
    if (reason === null) return;
    try { await api.rejectHrDocument(d.id, reason || null); reload(); } catch (e) { alert(e.message); }
  };

  const exportDocs = () => exportCsv(
    "documents-rh.csv",
    ["Employe", "Type", "Reference", "Statut", "Genere", "Signe le", "Signe par", "Version"],
    filtered.map((d) => [personName(staff, d.userId), d.documentType, d.reference || "", statusLabel(d.status), d.templateType ? "Oui" : "Non", dateOnly(d.signedAt) || "", d.signedBy || "", d.version || 1])
  );

  return (
    <>
      <PageHead eyebrow="Dossier du personnel" title="Documents & signature" action="Deposer un document" actionIcon="upload" onAction={() => setModal({ kind: "hrDocument" })} ghost />
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <Mini label="Documents total" value={summary.total} />
        <Mini label="Generes depuis template" value={summary.generated} />
        <KPI label="Signes" value={summary.signed} tone={summary.signed ? "emerald" : undefined} />
        <KPI label="En attente" value={summary.pending} tone={summary.pending ? "warn" : undefined} />
      </div>

      <div className="card pad" style={{ marginBottom: 16 }}>
        <h3 className="block-title font-display" style={{ marginBottom: 12 }}>Generer un document depuis template</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--muted)" }}>Employe</label>
            <Autocomplete value={genForm.userId} onChange={(v) => { setGenForm((f) => ({ ...f, userId: v })); setGenError(""); }} style={{ minWidth: 180 }}
              placeholder="-- Choisir un employe --" options={staff.map((u) => ({ value: u.id, label: fullName(u) }))} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--muted)" }}>Type de document</label>
            <select className="pillbtn" value={genForm.templateType} onChange={(e) => setGenForm((f) => ({ ...f, templateType: e.target.value }))} style={{ minWidth: 200 }}>
              {DOCUMENT_TEMPLATES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <button type="button" className="btn" onClick={handleGenerate} disabled={generating} style={{ alignSelf: "flex-end" }}>
            <Icon name="fileText" style={{ width: 14, height: 14 }} /> {generating ? "Generation..." : "Generer"}
          </button>
        </div>
        {genError && <div className="chip amber" style={{ marginTop: 8 }}>{genError}</div>}
      </div>

      <div className="card pad table-card">
        <div className="section-head">
          <h3 className="font-display">Documents en base</h3>
          <button type="button" className="link" onClick={exportDocs}><Icon name="download" style={{ width: 13, height: 13 }} /> Exporter</button>
        </div>
        <div className="searchbar">
          <label className="search-input"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher employe, type, reference..." /></label>
          <Autocomplete value={employeeFilter} onChange={setEmployeeFilter}
            placeholder="Tous les employes" options={staff.map((u) => ({ value: u.id, label: fullName(u) }))} />
          <select className="pillbtn" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Tous les types</option>
            {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="tbl-scroll"><table className="tbl" style={{ minWidth: 820 }}>
          <thead><tr><th>Employe</th><th>Type</th><th>Reference</th><th>Ver.</th><th className="r">Statut</th><th className="r">Signe par</th><th className="r">Actions</th></tr></thead>
          <tbody>{filtered.map((d) => {
            const st = String(d.status || "").toLowerCase();
            const canSubmit = ["draft", "received", "rejected"].includes(st);
            const isPending = st === "pending_validation";
            const isApproved = st === "approved";
            return <tr key={d.id}>
              <td style={{ fontWeight: 500 }}>{personName(staff, d.userId)}</td>
              <td><span style={{ display: "flex", alignItems: "center", gap: 6 }}>{d.documentType || "Document"}{d.templateType && <span className="chip ink" style={{ fontSize: 10, padding: "1px 6px" }}>Genere</span>}</span></td>
              <td className="muted">{d.reference || "-"}</td>
              <td className="muted">v{d.version || 1}</td>
              <td className="r"><span className={"chip " + chipForStatus(d.status)}>{statusLabel(d.status)}</span></td>
              <td className="r muted">{d.signedBy ? <span title={dateOnly(d.signedAt) || ""}>{d.signedBy}</span> : "-"}</td>
              <td className="r" style={{ whiteSpace: "nowrap", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {d.content && <button type="button" className="link" style={{ fontSize: 12 }} onClick={() => setPreview(d)}>Apercu</button>}
                {d.fileUrl && <a className="link" href={d.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Ouvrir</a>}
                {canSubmit && <button type="button" className="link" style={{ fontSize: 12 }} onClick={() => handleSubmitDoc(d)}>Soumettre</button>}
                {isPending && <button type="button" className="link" style={{ fontSize: 12, color: "var(--emerald-600)" }} onClick={() => handleApproveDoc(d)}>Approuver</button>}
                {isPending && <button type="button" className="link" style={{ fontSize: 12, color: "var(--rose-600)" }} onClick={() => handleRejectDoc(d)}>Rejeter</button>}
                {isApproved && <button type="button" className="link" style={{ fontSize: 12, color: "var(--emerald-600)" }} onClick={() => { setSigning(d); setSignName(""); }}>Signer</button>}
              </td>
            </tr>;
          })}</tbody>
        </table></div>
        {filtered.length === 0 && <EmptyState title={rows.length === 0 ? "Aucun document en base" : "Aucun document ne correspond aux filtres"} detail={rows.length === 0 ? "Genere un document depuis template ou depose un fichier." : ""} />}
      </div>

      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setPreview(null)}>
          <div style={{ background: "#fff", borderRadius: 10, width: "min(760px,96vw)", maxHeight: "88vh", overflow: "auto", padding: 0, boxShadow: "0 8px 40px rgba(0,0,0,0.22)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #eee", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{preview.documentType} — {preview.reference}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="link" style={{ fontSize: 12 }} onClick={() => api.downloadAuth(`/hr/documents/${preview.id}/pdf`, `${preview.reference || "document"}.pdf`).catch((e) => alert(e.message))}>PDF ↓</button>
                <button type="button" className="btn" style={{ fontSize: 12 }} onClick={() => { const w = window.open("", "_blank"); w.document.write(preview.content); w.document.close(); w.print(); }}>Imprimer</button>
                <button type="button" className="link" onClick={() => setPreview(null)}><Icon name="x" style={{ width: 18, height: 18 }} /></button>
              </div>
            </div>
            <div style={{ padding: 0 }} dangerouslySetInnerHTML={{ __html: preview.content }} />
          </div>
        </div>
      )}

      {signing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setSigning(null)}>
          <div style={{ background: "#fff", borderRadius: 10, padding: 28, width: "min(400px,94vw)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Signer le document</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>{signing.documentType} — {signing.reference}</p>
            <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Nom du signataire</label>
            <input className="input" value={signName} onChange={(e) => setSignName(e.target.value)} placeholder="Nom complet du responsable..." style={{ width: "100%", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="link" onClick={() => setSigning(null)}>Annuler</button>
              <button type="button" className="btn" onClick={handleSign} disabled={!signName.trim()}>Confirmer la signature</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Timesheet */
function Timesheet({ data, staff, setModal }) {
  const rows = data.timesheets || [];
  const projectName = (row) => {
    const project = (data.projects || []).find((p) => String(p.id) === String(row.projectId));
    return project ? [project.code, project.name].filter(Boolean).join(" - ") : (row.project || "-");
  };
  const totalHours = rows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const pending = rows.filter((row) => isPending(row.status)).length;
  const projectCount = new Set(rows.map((row) => row.projectId || row.project).filter(Boolean)).size;
  const exportTimesheets = () => exportCsv(
    "timesheets.csv",
    ["Employe", "Debut", "Fin", "Projet", "Financement", "Activite", "Heures", "Statut", "Note"],
    rows.map((row) => [personName(staff, row.userId), dateOnly(row.periodStartDate || row.workDate), dateOnly(row.periodEndDate || row.workDate), projectName(row), row.donor || "", row.activity || "", Number(row.hours || 0), statusLabel(row.status), row.note || ""])
  );
  return (
    <>
      <PageHead eyebrow="Allocation du temps" title="Temps projets" action="Nouvelle saisie" actionIcon="plus" onAction={() => setModal({ kind: "timesheet" })} />
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <Mini label="Lignes en base" value={rows.length} />
        <Mini label="Heures saisies" value={nf.format(totalHours)} />
        <Mini label="Projets" value={projectCount} />
        <KPI label="A valider" value={pending} tone={pending ? "warn" : undefined} />
      </div>
      <div className="card pad table-card">
        <div className="section-head"><h3 className="font-display">Heures saisies</h3><button type="button" className="link" onClick={exportTimesheets}><Icon name="download" style={{ width: 13, height: 13 }} /> Exporter</button></div>
        <div className="tbl-scroll"><table className="tbl num" style={{ minWidth: 840 }}>
          <thead><tr><th>Employe</th><th>Debut</th><th>Fin</th><th>Projet</th><th>Financement</th><th>Activite</th><th className="r">Heures</th><th className="r">Statut</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><td style={{ fontWeight: 500 }}>{personName(staff, row.userId)}</td><td>{dateOnly(row.periodStartDate || row.workDate) || "-"}</td><td>{dateOnly(row.periodEndDate || row.workDate) || "-"}</td><td>{projectName(row)}</td><td>{row.donor || "-"}</td><td className="muted">{row.activity || "-"}</td><td className="r">{nf.format(Number(row.hours || 0))}</td><td className="r"><span className={"chip " + chipForStatus(row.status)}>{statusLabel(row.status)}</span></td></tr>)}</tbody>
        </table></div>
        {rows.length === 0 && <EmptyState title="Aucune heure saisie" detail="Clique sur Nouvelle saisie pour enregistrer des heures liees a un projet ou une activite." />}
      </div>
    </>
  );
}

function ProjetsONG({ data, staff, setModal }) {
  const projects = data.projects || [];
  const assignments = data.projectAssignments || [];
  const report = data.projectReport || {};
  const reportProjects = report.projects || [];
  const reportByProject = new Map(reportProjects.map((row) => [String(row.projectId), row]));
  const reportMoneyLines = (lines = []) => lines
    .filter((line) => Number(line.amount || 0) !== 0)
    .map((line) => {
      const sym = symbolFor(line.currencyId, CURRENCIES, CUR);
      return { sym, amount: Number(line.amount || 0), text: moneyLineText(line.amount, sym) };
    });
  const activeProjects = projects.filter((p) => ["active", "planned"].includes(String(p.status || "").toLowerCase()));
  const weightedCost = (a) => Number(a.monthlyCost || 0) * Number(a.timePercent || 0) / 100;
  const budgetLines = moneyLinesFrom(projects, (p) => p.hrBudget, moneySymbolFor);
  const costLines = moneyLinesFrom(assignments, weightedCost, moneySymbolFor);
  const actualLines = reportMoneyLines(report.totals || []);
  const projectName = (projectId) => {
    const project = projects.find((p) => String(p.id) === String(projectId));
    return project ? [project.code, project.name].filter(Boolean).join(" - ") : `Projet #${projectId}`;
  };
  const projectCostLines = (projectId) => moneyLinesFrom(assignments.filter((a) => String(a.projectId) === String(projectId)), weightedCost, moneySymbolFor);
  const assignmentRows = assignments.slice(0, 50);
  const exportAssignments = () => exportCsv(
    "affectations-projets-rh.csv",
    ["Projet", "Employe", "Role", "Debut", "Fin", "Temps %", "Cout mensuel", "Statut"],
    assignments.map((a) => [projectName(a.projectId), personName(staff, a.userId), a.role || "", dateOnly(a.startDate), dateOnly(a.endDate), a.timePercent, fc(weightedCost(a), moneySymbolFor(a)), statusLabel(a.status)])
  );
  return (
    <>
      <PageHead eyebrow="ONG & projets" title="Affectations projets" action="Nouveau projet" actionIcon="plus" onAction={() => setModal({ kind: "hrProject" })} />
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <KPI label="Projets actifs" value={activeProjects.length} sub={`${projects.length} projets en base`} icon="folder" />
        <KPI label="Affectations" value={assignments.length} sub={`${new Set(assignments.map((a) => a.userId)).size} employes affectes`} icon="users" />
        <KPI label="Budget RH projets" value={<MoneyLines lines={budgetLines} />} sub="par devise" icon="wallet" />
        <KPI label="Cout reel timesheets" value={<MoneyLines lines={actualLines} />} sub={`${report.linkedTimesheets || 0} lignes liees`} icon="banknote" />
      </div>
      <div className="g3" style={{ marginBottom: 16 }}>
        <Mini label="Cout planifie / mois" value={<MoneyLines lines={costLines} />} />
        <Mini label="Timesheets non lies" value={report.unlinkedTimesheets || 0} />
        <Mini label="Rapport analytique" value={`${(report.byMonth || []).length} mois`} valueClass="" />
      </div>
      <div className="g2">
        <div className="card pad table-card">
          <div className="section-head"><h3 className="font-display">Projets</h3><button type="button" className="link" onClick={() => setModal({ kind: "hrProject" })}><Icon name="plus" style={{ width: 13, height: 13 }} /> Projet</button></div>
          <div className="tbl-scroll"><table className="tbl num" style={{ minWidth: 900 }}>
            <thead><tr><th>Projet</th><th>Financeur</th><th className="r">Budget RH</th><th className="r">Planifie / mois</th><th className="r">Reel timesheets</th><th className="r">Ecart budget</th><th className="r">Statut</th></tr></thead>
            <tbody>{projects.map((p) => { const r = reportByProject.get(String(p.id)); return <tr key={p.id}><td style={{ fontWeight: 500 }}>{p.name}<div className="tiny">{p.code || `Projet #${p.id}`} - {[dateOnly(p.startDate), dateOnly(p.endDate)].filter(Boolean).join(" - ") || "Periode non renseignee"}</div></td><td>{p.donor || "-"}</td><td className="r">{fc(p.hrBudget, moneySymbolFor(p))}</td><td className="r"><MoneyLines lines={projectCostLines(p.id)} /></td><td className="r"><MoneyLines lines={reportMoneyLines(r?.actualCost || [])} /></td><td className="r">{r ? fc(r.budgetVariance, moneySymbolFor(p)) : "-"}</td><td className="r">{statusChip(p.status)}</td></tr>; })}</tbody>
          </table></div>
          {projects.length === 0 && <EmptyState title="Aucun projet en base" detail="Cree un projet pour affecter les couts RH par financeur ou centre de cout." />}
        </div>
        <div className="card pad table-card">
          <div className="section-head"><h3 className="font-display">Affectations employes</h3><button type="button" className="btn btn-accent grad-accent" disabled={!projects.length || !staff.length} onClick={() => setModal({ kind: "hrProjectAssignment" })}><Icon name="plus" /> Affecter</button></div>
          <div className="tbl-scroll"><table className="tbl num" style={{ minWidth: 780 }}>
            <thead><tr><th>Employe</th><th>Projet</th><th>Role</th><th className="r">Temps</th><th className="r">Cout mensuel</th><th className="r">Statut</th></tr></thead>
            <tbody>{assignmentRows.map((a) => <tr key={a.id}><td style={{ fontWeight: 500 }}>{personName(staff, a.userId)}<div className="tiny">{[dateOnly(a.startDate), dateOnly(a.endDate)].filter(Boolean).join(" - ") || "Periode non renseignee"}</div></td><td>{projectName(a.projectId)}</td><td>{a.role || "-"}</td><td className="r">{nf.format(Number(a.timePercent || 0))} %</td><td className="r">{fc(weightedCost(a), moneySymbolFor(a))}</td><td className="r">{statusChip(a.status)}</td></tr>)}</tbody>
          </table></div>
          {assignmentRows.length === 0 && <EmptyState title="Aucune affectation en base" detail="Les couts RH par projet seront calcules des qu'un employe est affecte." />}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}><button type="button" className="link" onClick={exportAssignments}><Icon name="download" style={{ width: 13, height: 13 }} /> Exporter</button></div>
        </div>
      </div>
      <div className="g3" style={{ marginTop: 16 }}>
        <ProjectAnalyticsCard title="Par mois" rows={report.byMonth || []} labelOf={(r) => r.month || "Sans mois"} moneyLines={reportMoneyLines} />
        <ProjectAnalyticsCard title="Par financeur" rows={report.byDonor || []} labelOf={(r) => r.donor || "Sans financeur"} moneyLines={reportMoneyLines} />
        <ProjectAnalyticsCard title="Par departement" rows={report.byDepartment || []} labelOf={(r) => r.department || "Sans departement"} moneyLines={reportMoneyLines} />
      </div>
    </>
  );
}

function ProjectAnalyticsCard({ title, rows, labelOf, moneyLines }) {
  return (
    <div className="card pad table-card">
      <h3 className="block-title font-display">{title}</h3>
      {rows.length === 0 && <EmptyState title="Aucune donnee analytique" detail="Les lignes apparaitront quand les timesheets seront liees aux projets." />}
      {rows.slice(0, 8).map((row) => (
        <div className="row" key={labelOf(row)}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{labelOf(row)}</div>
            <div className="tiny">{nf.format(Number(row.actualHours || 0))} h</div>
          </div>
          <strong style={{ fontSize: 13, textAlign: "right" }}><MoneyLines lines={moneyLines(row.actualCost || [])} /></strong>
        </div>
      ))}
    </div>
  );
}

/* Frais */
function Frais({ data, staff, setModal }) {
  const rows = data.expenseRequests || [];
  const pending = rows.filter((r) => isPending(r.status));
  const totalLines = moneyLinesFrom(rows, (r) => r.amount, moneySymbolFor);
  return (
    <>
      <PageHead eyebrow="Remboursements & acomptes" title="Frais & avances" action="Nouvelle demande" onAction={() => setModal({ kind: "expenseRequest" })} />
      <div className="g3" style={{ marginBottom: 18 }}><KPI label="A valider" value={pending.length} tone={pending.length ? "warn" : undefined} /><Mini label="Demandes" value={rows.length} /><Mini label="Montant total" value={<MoneyLines lines={totalLines} />} valueClass="" /></div>
      <div className="card pad table-card"><div className="tbl-scroll"><table className="tbl num" style={{ minWidth: 620 }}><thead><tr><th>Employe</th><th>Type</th><th className="r">Montant</th><th>Date</th><th className="r">Statut</th></tr></thead><tbody>{rows.map((f) => <tr key={f.id}><td style={{ fontWeight: 500 }}>{personName(staff, f.userId)}</td><td>{f.type || "Frais"}</td><td className="r">{fc(f.amount, moneySymbolFor(f))}</td><td>{dateOnly(f.requestDate) || "-"}</td><td className="r"><span className={"chip " + chipForStatus(f.status)}>{statusLabel(f.status)}</span></td></tr>)}</tbody></table></div>{rows.length === 0 && <EmptyState title="Aucune demande de frais en base" />}</div>
    </>
  );
}

/* Declarations */
function Declarations({ data, setModal }) {
  const rows = data.socialDeclarations || [];
  const totalLines = moneyLinesFrom(rows, (r) => r.amount, moneySymbolFor);
  return (
    <>
      <PageHead eyebrow="Cotisations & impots" title="Declarations sociales & fiscales" action="Nouvelle declaration" actionIcon="fileCheck" onAction={() => setModal({ kind: "socialDeclaration" })} />
      <div className="g3" style={{ marginBottom: 16 }}><Mini label="Declarations" value={rows.length} /><Mini label="Montant total" value={<MoneyLines lines={totalLines} />} /><KPI label="En attente" value={rows.filter((r) => isPending(r.status)).length} tone="warn" /></div>
      <div className="card pad table-card tbl-scroll"><table className="tbl num" style={{ minWidth: 600 }}><thead><tr><th>Organisme</th><th>Periode</th><th className="r">Base</th><th className="r">Taux</th><th className="r">Montant</th><th className="r">Echeance</th></tr></thead><tbody>{rows.map((d) => <tr key={d.id}><td style={{ fontWeight: 500 }}>{d.organism || "-"}</td><td>{d.period || "-"}</td><td className="r">{fc(d.baseAmount, moneySymbolFor(d))}</td><td className="r">{d.rate || "-"}</td><td className="r">{fc(d.amount, moneySymbolFor(d))}</td><td className="r muted">{dateOnly(d.dueDate) || "-"}</td></tr>)}</tbody></table>{rows.length === 0 && <EmptyState title="Aucune declaration sociale en base" />}</div>
    </>
  );
}

/* Performance */
function Performance({ data, staff, setModal }) {
  const rows = data.performanceReviews || [];
  const scored = rows.filter((r) => r.score != null);
  const avg = scored.length ? (scored.reduce((s, r) => s + Number(r.score || 0), 0) / scored.length).toFixed(1).replace(".", ",") : "-";
  return (
    <>
      <PageHead eyebrow="Evaluations" title="Performance" action="Nouvelle evaluation" onAction={() => setModal({ kind: "performanceReview" })} />
      <div className="g4 kpis" style={{ marginBottom: 18 }}><Mini label="Evaluations" value={rows.length} /><Mini label="Note moyenne" value={avg} valueClass="" /><Mini label="Scores renseignes" value={scored.length} /><KPI label="En attente" value={rows.filter((r) => isPending(r.status)).length} tone="warn" /></div>
      <div className="card pad"><h3 className="block-title font-display">Evaluations en base</h3>{rows.length === 0 && <EmptyState title="Aucune evaluation en base" />}{rows.map((p) => { const name = personName(staff, p.userId); const pct = Math.max(0, Math.min(100, Number(p.score || 0) * 20)); return <div className="row" key={p.id}><Avatar name={name} color={colorFor(name)} size={36} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{name}</div><div className="tiny">{p.cycle || "Cycle non renseigne"}</div></div><div style={{ width: 120 }} className="desk-only"><Bar pct={pct} cls="grad-accent" /></div><span className="font-display" style={{ fontWeight: 700, fontSize: 14, width: 40, textAlign: "right" }}>{p.score ?? "-"}</span><span className={"chip " + chipForStatus(p.status)} style={{ marginLeft: 8 }}>{statusLabel(p.status)}</span></div>; })}</div>
    </>
  );
}

/* Formation */
function Formation({ data, setModal }) {
  const rows = data.trainingSessions || [];
  const budgetLines = moneyLinesFrom(rows, (r) => r.budget, moneySymbolFor);
  return (
    <>
      <PageHead eyebrow="Plan de formation" title="Formation & competences" action="Nouvelle session" onAction={() => setModal({ kind: "trainingSession" })} />
      <div className="g3" style={{ marginBottom: 18 }}><Mini label="Sessions" value={rows.length} /><Mini label="Planifiees" value={rows.filter((r) => isApproved(r.status)).length} valueClass="" /><Mini label="Budget" value={<MoneyLines lines={budgetLines} />} /></div>
      <div className="card pad"><h3 className="block-title font-display">Sessions en base</h3>{rows.length === 0 && <EmptyState title="Aucune session de formation en base" />}{rows.map((f) => <div className="row" key={f.id}><span className="row-ic" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}><Icon name="graduationCap" /></span><div style={{ flex: 1 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{f.title || "Formation"}</div><div className="tiny">{[f.audience, dateOnly(f.sessionDate)].filter(Boolean).join(" - ")}</div></div><span className={"chip " + chipForStatus(f.status)}>{statusLabel(f.status)}</span></div>)}</div>
    </>
  );
}

/* Recrutement */
const stageChip = (stage) => {
  const s = CANDIDATE_STAGES.find((x) => x.value === String(stage || "").toLowerCase()) || { color: "ink" };
  return s.color;
};
const stageLabel = (stage) => {
  const s = CANDIDATE_STAGES.find((x) => x.value === String(stage || "").toLowerCase());
  return s ? s.label : (stage ? String(stage) : "Nouveau");
};

function Recrutement({ data, reload, setModal }) {
  const candidates = data.candidates || [];
  const offers = data.recruitmentOffers || [];
  const summary = data.candidateSummary || EMPTY_DATA.candidateSummary;
  const [search, setSearch] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState("all");
  const [busy, setBusy] = React.useState(false);
  const [convertModal, setConvertModal] = React.useState(null);
  const [convertForm, setConvertForm] = React.useState({ username: "", password: "", roleId: "", departmentId: "", joinDate: TODAY });

  const filtered = candidates.filter((c) => {
    const name = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || (c.email || "").toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || String(c.stage || "nouveau") === stageFilter;
    return matchSearch && matchStage;
  });

  const pipeline = summary.pipeline || {};

  async function moveStage(id, stage) {
    setBusy(true);
    try { await api.updateCandidate(id, { stage }); reload(); notify(`Candidat déplacé vers « ${stageLabel(stage)} ».`); }
    catch (e) { notify(String(e.message || e)); }
    finally { setBusy(false); }
  }

  async function doConvert() {
    if (!convertModal) return;
    setBusy(true);
    try {
      const res = await api.convertCandidate(convertModal.id, {
        username: convertForm.username || undefined,
        password: convertForm.password || undefined,
        roleId: convertForm.roleId ? Number(convertForm.roleId) : undefined,
        departmentId: convertForm.departmentId ? Number(convertForm.departmentId) : undefined,
        joinDate: convertForm.joinDate || undefined,
      });
      setConvertModal(null);
      reload();
      notify(`Candidat converti en employé : ${res.employeeId} (login: ${res.username}).`);
    }
    catch (e) { notify(String(e.message || e)); }
    finally { setBusy(false); }
  }

  async function deleteCandidate(id) {
    if (!window.confirm("Supprimer ce candidat ?")) return;
    setBusy(true);
    try { await api.deleteCandidate(id); reload(); notify("Candidat supprimé."); }
    catch (e) { notify(String(e.message || e)); }
    finally { setBusy(false); }
  }

  const exportCandidates = () => exportCsv("candidats.csv",
    ["Nom", "Prenom", "Email", "Telephone", "Poste actuel", "Experience (ans)", "Etape", "Date entretien", "Statut"],
    filtered.map((c) => [c.lastName || "", c.firstName || "", c.email || "", c.phone || "", c.currentTitle || "", c.yearsExperience ?? "", stageLabel(c.stage), dateOnly(c.interviewDate) || "", statusLabel(c.status)])
  );

  return (
    <>
      <PageHead eyebrow="Pipeline RH" title="Recrutement" action="Nouveau candidat" actionIcon="userPlus" onAction={() => setModal({ kind: "candidate" })} />

      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <Mini label="Candidats actifs" value={summary.total} />
        <Mini label="En cours" value={summary.pending} />
        <Mini label="Avec entretien" value={summary.withInterview} />
        <Mini label="Convertis employe" value={summary.converted} />
      </div>

      {/* Pipeline kanban-style KPIs */}
      <div className="card pad" style={{ marginBottom: 16 }}>
        <h3 className="block-title font-display">Pipeline de candidature</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CANDIDATE_STAGES.map((s) => (
            <div key={s.value} className="card" style={{ flex: "1 1 100px", minWidth: 90, padding: "10px 12px", cursor: "pointer", border: stageFilter === s.value ? "2px solid var(--teal-500)" : "1px solid var(--ink-100)" }}
              onClick={() => setStageFilter(stageFilter === s.value ? "all" : s.value)}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink-800)" }}>{pipeline[s.value] ?? 0}</div>
              <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Offres de poste ouvertes */}
      {offers.filter((o) => !["closed", "false"].includes(String(o.status || ""))).length > 0 && (
        <div className="card pad" style={{ marginBottom: 16 }}>
          <h3 className="block-title font-display">Postes ouverts</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {offers.filter((o) => !["closed", "false"].includes(String(o.status || ""))).map((o) => (
              <span key={o.id} className="chip emerald">{o.role}{o.deadline ? ` — ${dateOnly(o.deadline)}` : ""}</span>
            ))}
          </div>
        </div>
      )}

      {/* Table candidats */}
      <div className="card pad table-card">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <div className="search-box" style={{ flex: 1, minWidth: 180 }}>
            <Icon name="search" /><input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="select" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={{ width: 140 }}>
            <option value="all">Toutes les etapes</option>
            {CANDIDATE_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={exportCandidates}><Icon name="download" /> CSV</button>
        </div>
        <div className="tbl-scroll">
          <table className="tbl" style={{ minWidth: 780 }}>
            <thead>
              <tr><th>Candidat</th><th>Poste</th><th>Experience</th><th>Entretien</th><th>Etape</th><th>Source</th><th className="r">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{c.firstName} {c.lastName}</div>
                    <div className="tiny muted">{c.email || c.phone || "-"}</div>
                  </td>
                  <td>
                    <div>{c.currentTitle || "-"}</div>
                    <div className="tiny muted">{c.currentEmployer || ""}</div>
                  </td>
                  <td>{c.yearsExperience != null ? `${c.yearsExperience} an(s)` : "-"}</td>
                  <td>{dateOnly(c.interviewDate) || "-"}</td>
                  <td>
                    <select className="select" style={{ height: 28, fontSize: 12, padding: "0 8px" }} value={c.stage || "nouveau"} disabled={busy}
                      onChange={(e) => moveStage(c.id, e.target.value)}>
                      {CANDIDATE_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="tiny muted">{c.source || "-"}</td>
                  <td className="r" style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn btn-ghost" style={{ height: 28, fontSize: 12, padding: "0 8px" }}
                      onClick={() => setModal({ kind: "candidate", prefill: c })}>
                      <Icon name="edit" />
                    </button>
                    {!c.convertedUserId && ["accepte", "embauche"].includes(String(c.stage || "")) && (
                      <button className="btn" style={{ height: 28, fontSize: 12, padding: "0 8px", background: "var(--teal-600)", color: "#fff" }}
                        onClick={() => { setConvertModal(c); setConvertForm({ username: "", password: "", roleId: "", departmentId: "", joinDate: TODAY }); }}>
                        <Icon name="userPlus" /> Embaucher
                      </button>
                    )}
                    {c.convertedUserId && <span className="chip emerald" style={{ fontSize: 11 }}>Employe #{c.convertedUserId}</span>}
                    <button className="btn btn-ghost" style={{ height: 28, fontSize: 12, padding: "0 8px", color: "var(--rose-600)" }}
                      onClick={() => deleteCandidate(c.id)}>
                      <Icon name="x" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState title="Aucun candidat" detail="Ajoutez un candidat pour commencer le pipeline." />}
      </div>

      {/* Modal conversion candidat → employé */}
      {convertModal && (
        <div className="modal-backdrop" onClick={() => setConvertModal(null)}>
          <div className="modal-box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><h2 className="modal-title">Embaucher {convertModal.firstName} {convertModal.lastName}</h2><button className="modal-close" onClick={() => setConvertModal(null)}><Icon name="x" /></button></div>
            <div className="modal-body">
              <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Un compte employé sera créé. Les champs vides utiliseront des valeurs par défaut.</p>
              <label className="field-label">Nom d'utilisateur (optionnel)</label>
              <input className="input" value={convertForm.username} placeholder={`${(convertModal.firstName || "").toLowerCase()}.${(convertModal.lastName || "").toLowerCase()}`} onChange={(e) => setConvertForm((f) => ({ ...f, username: e.target.value }))} />
              <label className="field-label" style={{ marginTop: 10 }}>Mot de passe initial (optionnel)</label>
              <input className="input" type="password" placeholder="Par défaut: nom+année" value={convertForm.password} onChange={(e) => setConvertForm((f) => ({ ...f, password: e.target.value }))} />
              <label className="field-label" style={{ marginTop: 10 }}>Rôle</label>
              <Autocomplete className="select" value={convertForm.roleId} onChange={(v) => setConvertForm((f) => ({ ...f, roleId: v }))} style={{ display: "block" }}
                placeholder="-- Rôle par défaut (Employé) --" options={(data.roles || []).map((r) => ({ value: r.id, label: r.name }))} />
              <label className="field-label" style={{ marginTop: 10 }}>Département</label>
              <Autocomplete className="select" value={convertForm.departmentId} onChange={(v) => setConvertForm((f) => ({ ...f, departmentId: v }))} style={{ display: "block" }}
                placeholder="-- Aucun --" options={(data.departments || []).map((d) => ({ value: d.id, label: d.name }))} />
              <label className="field-label" style={{ marginTop: 10 }}>Date d'entrée</label>
              <input className="input" type="date" value={convertForm.joinDate} onChange={(e) => setConvertForm((f) => ({ ...f, joinDate: e.target.value }))} />
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setConvertModal(null)}>Annuler</button>
              <button className="btn" style={{ background: "var(--teal-600)", color: "#fff" }} disabled={busy} onClick={doConvert}>{busy ? "..." : "Confirmer l'embauche"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Organigramme */
function Organigramme({ departments, designations, canMutate, onNew }) {
  const tones = { teal: { bg: "var(--teal-50)", bd: "var(--teal-200)", fg: "var(--teal-800)", sub: "var(--teal-600)" }, sky: { bg: "var(--sky-50)", bd: "var(--sky-400)", fg: "var(--sky-700)", sub: "var(--sky-600)" }, emerald: { bg: "var(--emerald-100)", bd: "var(--emerald-500)", fg: "var(--emerald-700)", sub: "var(--emerald-600)" }, amber: { bg: "var(--amber-50)", bd: "var(--amber-400)", fg: "var(--amber-700)", sub: "var(--amber-600)" }, ink: { bg: "var(--ink-50)", bd: "var(--ink-200)", fg: "var(--ink-700)", sub: "var(--ink-500)" } };
  const palette = ["accent-soft", "sky-soft", "emerald", "amber", "ink"];
  const total = departments.reduce((s, d) => s + Number(d.count || 0), 0);
  return (
    <>
      <PageHead eyebrow="Structure" title="Postes & departements" action="Nouveau poste" onAction={onNew} disabled={!canMutate} />
      <div className="card pad" style={{ marginBottom: 18 }}>
        <div className="org-top"><div className="org-node grad-dark" style={{ color: "#fff" }}><div style={{ fontWeight: 600, fontSize: 13 }}>Structure RH</div><div style={{ fontSize: 11, color: "var(--ink-300)" }}>{total} personnes</div></div><div className="org-line" /><div className="org-children">{departments.slice(0, 4).map((d) => { const t = tones[d.color] || tones.ink; return <div key={d.id || d.name} className="org-node" style={{ background: t.bg, border: "1px solid " + t.bd }}><div style={{ fontWeight: 600, fontSize: 13, color: t.fg }}>{d.name}</div><div style={{ fontSize: 11, color: t.sub }}>{d.count} personnes</div></div>; })}</div></div>
        {departments.length === 0 && <EmptyState title="Aucun departement en base" />}
      </div>
      <div className="g2">
        <div className="card pad"><h3 className="block-title font-display">Departements</h3>{departments.length === 0 && <EmptyState title="Aucun departement en base" />}{departments.map((d) => <div className="row" key={d.id || d.name}><span className="row-ic" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}><Icon name={d.color === "sky" ? "truck" : d.color === "emerald" ? "calculator" : d.color === "amber" ? "usersRound" : "target"} /></span><div style={{ flex: 1 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{d.name}</div></div><span className="chip ink">{d.count}</span></div>)}</div>
        <div className="card pad"><h3 className="block-title font-display">Postes</h3><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{designations.map((d, i) => <span key={d.id} className={"chip " + palette[i % palette.length]}>{d.name}</span>)}</div>{designations.length === 0 && <EmptyState title="Aucun poste en base" />}<button className="btn btn-ghost" style={{ marginTop: 16, height: 36 }} disabled={!canMutate} onClick={onNew}><Icon name="plus" /> Ajouter un poste</button></div>
      </div>
    </>
  );
}

/* Reporting */
function Reporting({ data, staff, masse }) {
  const total = staff.length;
  const deptMax = Math.max(1, ...data.departments.map((d) => Number(d.count || 0)));
  const salaryLines = salaryMoneyLines(staff);
  const salaryText = salaryLines.length ? salaryLines.map((line) => line.text).join(" | ") : `0 ${CUR}`;
  const exportRows = () => exportCsv("reporting-rh.csv", ["Indicateur", "Valeur"], [["Effectif", total], ["Masse salariale", salaryText], ["Departements", data.departments.length], ["Contrats", data.contracts.length], ["Conges en attente", data.leaveRequests.filter((l) => isPending(l.status)).length]]);
  return (
    <>
      <PageHead eyebrow="Analytique RH" title="Reporting RH" action="Exporter" actionIcon="download" onAction={exportRows} ghost />
      <div className="g4 kpis" style={{ marginBottom: 16 }}><Mini label="Effectif" value={total} /><Mini label="Departements" value={data.departments.length} /><Mini label="Masse salariale" value={<MoneyLines lines={salaryLines} />} /><Mini label="Contrats" value={data.contracts.length} /></div>
      <div className="g2"><div className="card pad"><h3 className="block-title font-display">Effectif par departement</h3>{data.departments.length === 0 && <EmptyState title="Aucun departement en base" />}{data.departments.map((d) => <div key={d.id || d.name} style={{ marginBottom: 12, fontSize: 13 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span>{d.name}</span><span className="muted">{d.count}</span></div><Bar pct={Math.max(5, Math.round((Number(d.count || 0) / deptMax) * 100))} cls={d.color === "sky" ? "grad-sky" : d.color === "teal" ? "grad-accent" : d.color} /></div>)}</div><div className="card pad"><h3 className="block-title font-display">Sources BD</h3><div className="kv"><div><span>Employes</span><span>{staff.length}</span></div><div><span>Conges</span><span>{data.leaveRequests.length}</span></div><div><span>Frais</span><span>{data.expenseRequests.length}</span></div><div><span>Formations</span><span>{data.trainingSessions.length}</span></div></div></div></div>
    </>
  );
}

/* Self service */
function SelfService({ data, staff, me, setModal }) {
  const user = findCurrentStaff(me, staff);
  const userId = user?.id || me?.id || "";
  const myLeaves = byUser(data.leaveRequests, userId);
  const myExpenses = byUser(data.expenseRequests, userId);
  const myDocuments = byUser(data.documents, userId);
  const myContracts = byUser(data.contracts, userId);
  const myTimesheets = byUser(data.timesheets, userId);
  const myReviews = byUser(data.performanceReviews, userId);
  const mySalaries = byUser(data.salaries, userId);
  const myRequests = byUser(data.employeeRequests, userId);
  const pendingCount = [...myLeaves, ...myExpenses, ...myTimesheets, ...myRequests].filter((r) => isPending(r.status)).length;
  const activeContract = myContracts.find((c) => isApproved(c.status)) || myContracts[0];
  const lastSalary = mySalaries[0];
  const thisMonthHours = myTimesheets.filter((t) => dateOnly(t.periodStartDate || t.workDate).slice(0, 7) === TODAY.slice(0, 7)).reduce((sum, t) => sum + Number(t.hours || 0), 0);
  const selfModal = (kind, initial = {}) => setModal({ kind, initial: { userId, ...initial }, lockUserId: true, source: "selfservice" });
  const statusChip = (status) => <span className={"chip " + chipForStatus(status)}>{statusLabel(status)}</span>;
  const actions = [
    { icon: "palmtree", title: "Demander un conge", cta: "Envoyer", onClick: () => selfModal("leaveRequest") },
    { icon: "timer", title: "Saisir mes heures", cta: "Saisir", onClick: () => selfModal("timesheet", { periodStartDate: TODAY, periodEndDate: TODAY }) },
    { icon: "receipt", title: "Frais ou avance", cta: "Demander", onClick: () => selfModal("expenseRequest", { requestDate: TODAY }) },
    { icon: "folder", title: "Deposer un document", cta: "Deposer", onClick: () => selfModal("hrDocument") },
    { icon: "fileCheck", title: "Demande RH", cta: "Soumettre", onClick: () => selfModal("employeeRequest") },
  ];
  return (
    <>
      <PageHead eyebrow="Mon espace" title="Espace employe" />
      {!userId && <div className="card pad" style={{ marginBottom: 16 }}><EmptyState title="Compte employe non relie" detail="Reconnecte-toi avec un compte employe pour voir tes donnees personnelles." /></div>}
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <Mini label="Demandes en attente" value={pendingCount} />
        <Mini label="Heures ce mois" value={nf.format(thisMonthHours)} />
        <Mini label="Documents" value={myDocuments.length} />
        <Mini label="Salaire actuel" value={lastSalary ? fc(lastSalary.salary, symbolFor(lastSalary.currencyId, CURRENCIES, CUR)) : (user?.currentSalary ? fc(user.currentSalary, salarySym(user)) : `0 ${CUR}`)} />
      </div>
      <div className="g3" style={{ marginBottom: 16 }}>{actions.map((a) => <div className="card pad" key={a.title}><h3 className="block-title font-display" style={{ fontSize: 14, marginBottom: 10 }}><Icon name={a.icon} style={{ color: "var(--teal-600)" }} /> {a.title}</h3><button type="button" className="tile-btn accent" disabled={!userId} onClick={a.onClick}><Icon name="plus" /> {a.cta}</button></div>)}</div>
      <div className="g2" style={{ marginBottom: 16 }}>
        <div className="card pad"><h3 className="block-title font-display">Mon profil</h3><div className="kv"><div><span>Nom</span><span>{user ? fullName(user) : me.name}</span></div><div><span>Poste</span><span>{user?.designation?.name || "-"}</span></div><div><span>Departement</span><span>{user?.department?.name || "-"}</span></div><div><span>Telephone</span><span>{displayPhone(user)}</span></div><div><span>Adresse</span><span>{[user?.street, user?.city, user?.country].filter(Boolean).join(", ") || "-"}</span></div></div></div>
        <div className="card pad"><h3 className="block-title font-display">Contrat actif</h3>{activeContract ? <div className="kv"><div><span>Type</span><span>{activeContract.contractType || "-"}</span></div><div><span>Debut</span><span>{dateOnly(activeContract.startDate) || "-"}</span></div><div><span>Fin</span><span>{dateOnly(activeContract.endDate) || "-"}</span></div><div><span>Statut</span><span>{statusChip(activeContract.status)}</span></div></div> : <EmptyState title="Aucun contrat en base" />}</div>
      </div>
      <div className="g2" style={{ marginBottom: 16 }}>
        <SelfList title="Mes conges" empty="Aucune demande de conge" rows={myLeaves.slice(0, 5)} render={(r) => <><div><b>{r.type || "Conge"}</b><div className="tiny">{dateOnly(r.startDate)} - {dateOnly(r.endDate)}</div></div>{statusChip(r.status)}</>} />
        <SelfList title="Mes frais & avances" empty="Aucune demande de frais" rows={myExpenses.slice(0, 5)} render={(r) => <><div><b>{r.type || "Frais"}</b><div className="tiny">{dateOnly(r.requestDate)} - {r.description || ""}</div></div><div style={{ textAlign: "right" }}><b>{fc(r.amount, moneySymbolFor(r))}</b><div>{statusChip(r.status)}</div></div></>} />
        <SelfList title="Mes heures" empty="Aucune heure saisie" rows={myTimesheets.slice(0, 5)} render={(r) => <><div><b>{r.activity || r.project || "Travail effectue"}</b><div className="tiny">{[dateOnly(r.periodStartDate || r.workDate), dateOnly(r.periodEndDate || r.workDate)].filter(Boolean).join(" - ")}</div></div><div style={{ textAlign: "right" }}><b>{nf.format(Number(r.hours || 0))} h</b><div>{statusChip(r.status)}</div></div></>} />
        <SelfList title="Mes documents" empty="Aucun document" rows={myDocuments.slice(0, 5)} render={(r) => <><div><b>{r.documentType || "Document"}</b><div className="tiny">{r.reference || r.note || "-"}</div></div>{r.fileUrl ? <a className="link" href={r.fileUrl} target="_blank" rel="noreferrer">Ouvrir</a> : statusChip(r.status)}</>} />
        <SelfList title="Mes demandes RH" empty="Aucune demande RH" rows={myRequests.slice(0, 5)} render={(r) => <><div><b>{r.subject || r.requestType}</b><div className="tiny">{r.requestType} - {dateOnly(r.requestedDate)}</div></div>{statusChip(r.status)}</>} />
        <SelfList title="Evaluations & formation" empty="Aucune evaluation ou formation" rows={[...myReviews.slice(0, 3), ...data.trainingSessions.slice(0, 3)]} render={(r) => <><div><b>{r.cycle || r.title || "Element RH"}</b><div className="tiny">{r.score != null ? `Score ${r.score}/5` : [r.audience, dateOnly(r.sessionDate)].filter(Boolean).join(" - ")}</div></div>{statusChip(r.status)}</>} />
      </div>
    </>
  );
}

function SelfList({ title, rows, render, empty }) {
  return <div className="card pad"><h3 className="block-title font-display">{title}</h3>{rows.length === 0 && <EmptyState title={empty} />}{rows.map((row) => <div className="row" key={`${title}-${row.id}`} style={{ alignItems: "center" }}>{render(row)}</div>)}</div>;
}

/* Modal creation */
function RecordModal({ modal, data, staff, busy, error, onSave, onClose }) {
  const selfAction = modal.lockUserId ? SELF_ACTION_FORMS[modal.kind] : null;
  const action = selfAction || ACTION_FORMS[modal.kind];
  const hasMoney = ["salary", "expenseRequest", "socialDeclaration", "trainingSession", "hrContract", "payroll", "hrProject", "hrProjectAssignment"].includes(modal.kind);
  const [form, setForm] = React.useState(() => {
    const base = { ...defaults(modal.kind, staff), ...(modal.prefill || {}), ...(modal.initial || {}) };
    if (hasMoney && !base.currencyId) base.currencyId = defaultCurrencyId();
    if (modal.kind === "employee") {
      if (!base.password) base.password = generateInitialPassword();
      base.email = generatedEmailFor(base.firstName, base.lastName);
      if (!base.username) base.username = generatedUsernameFor(base.firstName, base.lastName);
    }
    return base;
  });
  const set = (k, v) => setForm((c) => {
    const next = { ...c, [k]: v };
    if (modal.kind === "employee" && (k === "firstName" || k === "lastName")) {
      const previousGeneratedUsername = generatedUsernameFor(c.firstName, c.lastName);
      const nextGeneratedUsername = generatedUsernameFor(next.firstName, next.lastName);
      next.email = generatedEmailFor(next.firstName, next.lastName);
      if (!c.username || c.username === previousGeneratedUsername) next.username = nextGeneratedUsername;
    }
    return next;
  });
  const opts = {
    staff: staff.map((u) => ({ value: u.id, label: fullName(u) })),
    roles: (data.roles || []).map((r) => ({ value: r.id, label: r.name })),
    departments: (data.departments || []).map((d) => ({ value: d.id, label: d.name })),
    designations: (data.designations || []).map((d) => ({ value: d.id, label: d.name })),
    shifts: (data.shifts || []).map((s) => ({ value: s.id, label: `${s.name} (${(s.startTime || "").slice(0, 5)}-${(s.endTime || "").slice(0, 5)})` })),
    awards: (data.awards || []).map((a) => ({ value: a.id, label: a.name })),
    currencies: currencyOptions(),
    contracts: (data.contracts || []).map((c) => ({ value: c.id, label: [c.reference, personName(staff, c.userId), c.contractType].filter(Boolean).join(" - ") })),
    projects: (data.projects || []).map((p) => ({ value: p.id, label: [p.code, p.name, p.donor].filter(Boolean).join(" - ") })),
    offers: (data.recruitmentOffers || []).filter((o) => !["closed", "false"].includes(String(o.status || ""))).map((o) => ({ value: o.id, label: o.role })),
  };
  const isMoneyField = (field) => {
    if (!field) return false;
    if (field.key === "salary") return true;
    if (["expenseRequest", "socialDeclaration"].includes(modal.kind) && ["amount", "baseAmount"].includes(field.key)) return true;
    if (modal.kind === "trainingSession" && field.key === "budget") return true;
    if (modal.kind === "hrContract" && ["baseSalary", "transportAllowance", "housingAllowance", "stipend", "contractAmount"].includes(field.key)) return true;
    if (modal.kind === "payroll" && ["baseSalary", "transportAllowance", "housingAllowance", "riskAllowance", "otherAllowances", "overtimeAmount", "unpaidAbsenceDeduction", "advanceDeduction", "taxAmount", "cnssAmount", "otherDeductions"].includes(field.key)) return true;
    if (modal.kind === "hrProject" && field.key === "hrBudget") return true;
    if (modal.kind === "hrProjectAssignment" && field.key === "monthlyCost") return true;
    return false;
  };
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className={`modal-card ${action?.wide ? "wide" : ""}`} onSubmit={(e) => { e.preventDefault(); onSave(modal.kind, form); }}>
        <div className="modal-head"><div><h2 className="font-display">{action?.title || titleFor(modal.kind)}</h2><p>{action?.subtitle || (modal.lockUserId ? "Espace employe" : "RH NgoluApp")}</p></div><button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button></div>
        <div className="form-grid">
          {action && action.fields.map((field) => {
            if (field.visibleWhen && !field.visibleWhen(form)) return null;
            if (field.kind === "section") return <div key={field.label} className="form-section">{field.label}</div>;
            if (field.kind === "computed") return <div key={field.label} className={`field ${field.wide ? "wide" : ""}`}><span>{field.label}</span><div className="computed-field">{field.value ? field.value(form) : "-"}</div></div>;
            if (field.requiresStatusPermission && !canManageUserStatus()) return null;
            const options = field.optionKey ? opts[field.optionKey] || [] : field.options;
            if (modal.lockUserId && field.key === "userId") return null;
            if (field.key === "currencyId") return null;
            if (field.key === "phone" || field.type === "phone") return <PhoneField key={field.key} label={field.label} value={form[field.key] ?? ""} onChange={(v) => set(field.key, v)} required={field.required} />;
            if (field.generated && field.key === "password") {
              return (
                <GeneratedPasswordField
                  key={field.key}
                  label={field.label}
                  value={form[field.key] ?? ""}
                  onChange={(v) => set(field.key, v)}
                  onGenerate={() => set(field.key, generateInitialPassword())}
                  required={field.required}
                  help={field.help}
                />
              );
            }
            if (isMoneyField(field)) {
              return (
                <MoneyField
                  key={field.key}
                  label={field.label}
                  value={form[field.key] ?? ""}
                  currencyId={form.currencyId || defaultCurrencyId()}
                  currencyOptions={opts.currencies}
                  required={field.required}
                  onAmountChange={(v) => set(field.key, v)}
                  onCurrencyChange={(v) => set("currencyId", v)}
                />
              );
            }
            return <Field key={field.key} {...field} options={options} value={form[field.key] ?? ""} onChange={(v) => set(field.key, v)} />;
          })}
          {modal.kind === "employee" && !action && (
            <>
              <Field label="Prénom" value={form.firstName} onChange={(v) => set("firstName", v)} required />
              <Field label="Nom" value={form.lastName} onChange={(v) => set("lastName", v)} required />
              <Field label="Poste" value={form.designationName} onChange={(v) => set("designationName", v)} required />
              <Field label="Département" value={form.departmentName} onChange={(v) => set("departmentName", v)} required />
              <MoneyField label="Salaire mensuel" value={form.salary} currencyId={form.currencyId || defaultCurrencyId()} currencyOptions={opts.currencies} onAmountChange={(v) => set("salary", v)} onCurrencyChange={(v) => set("currencyId", v)} />
            </>
          )}
          {!action && !["employee", "salary"].includes(modal.kind) && <Field label="Nom" value={form.name} onChange={(v) => set("name", v)} required />}
          {modal.kind === "shift" && <><Field label="Début" type="time" value={form.startTime} onChange={(v) => set("startTime", v)} required /><Field label="Fin" type="time" value={form.endTime} onChange={(v) => set("endTime", v)} required /></>}
          {modal.kind === "award" && !action && <Field label="Description" value={form.description} onChange={(v) => set("description", v)} />}
          {modal.kind === "salary" && !action && (
            <>
              <div className="field"><span>Employé</span><Autocomplete value={form.userId} onChange={(v) => set("userId", v)} options={staff.map((u) => ({ value: u.id, label: fullName(u) }))} /></div>
              <MoneyField label="Montant" value={form.salary} currencyId={form.currencyId || defaultCurrencyId()} currencyOptions={opts.currencies} required onAmountChange={(v) => set("salary", v)} onCurrencyChange={(v) => set("currencyId", v)} />
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
function normalizeOptions(options = []) {
  return options.map((opt) => typeof opt === "object" ? opt : { value: opt, label: opt });
}

function Autocomplete({ value, onChange, options = [], placeholder = "Selectionner", required = false, className = "", title }) {
  const items = React.useMemo(() => normalizeOptions(options), [options]);
  const selected = items.find((item) => String(item.value) === String(value ?? ""));
  const [query, setQuery] = React.useState(selected?.label || "");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const next = items.find((item) => String(item.value) === String(value ?? ""));
    setQuery(next?.label || "");
  }, [value, items]);

  React.useEffect(() => {
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || selected?.label === query) return items;
    return items.filter((item) => String(item.label).toLowerCase().includes(needle));
  }, [items, query, selected]);

  const choose = (item) => {
    onChange(item.value);
    setQuery(item.label || "");
    setOpen(false);
    setActive(0);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && open && filtered[active]) {
      event.preventDefault();
      choose(filtered[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setQuery(selected?.label || "");
    }
  };

  const onBlur = () => {
    window.setTimeout(() => {
      if (!ref.current?.contains(document.activeElement)) {
        const exact = items.find((item) => item.label.toLowerCase() === query.trim().toLowerCase());
        if (exact) choose(exact);
        else setQuery(selected?.label || "");
      }
    }, 80);
  };

  return (
    <div className={`autocomplete ${className}`} ref={ref} title={title}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        required={required}
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
          if (!event.target.value) onChange("");
        }}
      />
      <button type="button" className="autocomplete-toggle" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((v) => !v)}>
        <Icon name="chevronRight" />
      </button>
      {open && (
        <div className="autocomplete-menu" role="listbox">
          {filtered.length === 0 && <div className="autocomplete-empty">Aucun resultat</div>}
          {filtered.map((item, index) => (
            <button
              type="button"
              role="option"
              aria-selected={String(item.value) === String(value ?? "")}
              className={`autocomplete-option ${index === active ? "active" : ""}`}
              key={`${item.value}-${item.label}`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PhoneField({ label, value, onChange, required = false }) {
  return (
    <label className="field phone-field">
      <span>{label}</span>
      <PhoneInputBase
        international
        countryCallingCodeEditable={false}
        defaultCountry="CD"
        flags={flags}
        labels={fr}
        value={value || undefined}
        onChange={(v) => onChange(v || "")}
        placeholder="Numero de telephone"
        className="phone-input"
        required={required}
      />
    </label>
  );
}

function GeneratedPasswordField({ label, value, onChange, onGenerate, required = false, help }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="generated-input">
        <input required={required} type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        <button type="button" onClick={onGenerate}>Generer</button>
      </div>
      {help && <small>{help}</small>}
    </label>
  );
}

function MoneyField({ label, value, currencyId, currencyOptions: options = [], onAmountChange, onCurrencyChange, required = false }) {
  const rows = options.length ? options : [{ value: "", label: CUR, symbol: CUR }];
  return (
    <label className="field">
      <span>{label}</span>
      <div className="money-input">
        <input required={required} type="number" min="0" step="0.01" value={value ?? ""} onChange={(e) => onAmountChange(e.target.value)} />
        <select value={currencyId ?? ""} onChange={(e) => onCurrencyChange(e.target.value)} aria-label="Devise">
          {rows.map((option) => (
            <option key={option.value || option.symbol || option.label} value={option.value}>{option.symbol || option.label}</option>
          ))}
        </select>
      </div>
    </label>
  );
}

function Field({ label, value, onChange, type = "text", required = false, options = [], readOnly = false, help, wide = false }) {
  if (type === "textarea") {
    return <label className="field wide"><span>{label}</span><textarea required={required} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />{help && <small>{help}</small>}</label>;
  }
  if (type === "select") {
    return <div className={`field ${wide ? "wide" : ""}`}><span>{label}</span><Autocomplete required={required} value={value} onChange={onChange} options={options} />{help && <small>{help}</small>}</div>;
  }
  return <label className={`field ${wide ? "wide" : ""}`}><span>{label}</span><input required={required} readOnly={readOnly} type={type} value={value} onChange={(e) => onChange(e.target.value)} />{help && <small>{help}</small>}</label>;
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
