import React from "react";
import PhoneInputBase, { formatPhoneNumberIntl } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import fr from "react-phone-number-input/locale/fr.json";
import "react-phone-number-input/style.css";
import { api } from "./api.js";
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
  { id: "paie", label: "Historique de paie", icon: "wallet" },
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
  salaries: [],
  roles: [],
  leaveRequests: [],
  contracts: [],
  documents: [],
  expenseRequests: [],
  socialDeclarations: [],
  performanceReviews: [],
  trainingSessions: [],
  timesheets: [],
  employeeRequests: [],
  recruitmentOffers: [],
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
  signed: "Signe",
  active: "Actif",
  draft: "Brouillon",
  expired: "Expire",
  terminated: "Resilie",
  rejected: "Rejete",
  received: "Recu",
  planned: "Planifie",
  done: "Termine",
  open: "Ouvert",
  true: "Actif",
  false: "Inactif",
};
const isPending = (status) => ["pending", "en_attente", "submitted", "draft", "validation"].includes(String(status || "").toLowerCase());
const isApproved = (status) => ["approved", "active", "received", "planned", "done", "open", "true"].includes(String(status || "").toLowerCase());
const chipForStatus = (status) => isPending(status) ? "amber" : isApproved(status) ? "emerald" : String(status || "").toLowerCase() === "rejected" ? "rose" : "ink";
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
  departmentId: u.departmentId || u.department?.id || "",
  designationId: u.designationId || u.designation?.id || "",
  shiftId: u.shiftId || "",
  employeeId: u.employeeId || "",
  joinDate: dateOnly(u.joinDate),
  bloodGroup: u.bloodGroup || "",
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
    return start && end && start <= TODAY && end >= TODAY && status !== "rejected";
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
    defaults: { firstName: "", lastName: "", username: "", password: "", email: "", phone: "", roleId: "", departmentId: "", designationId: "", shiftId: "", employeeId: "", joinDate: TODAY, bloodGroup: "", street: "", city: "", state: "", zipCode: "", country: "RDC" },
    fields: [
      { kind: "section", label: "Identite" },
      { key: "firstName", label: "Prenom", required: true },
      { key: "lastName", label: "Nom", required: true },
      { key: "username", label: "Identifiant", required: true, help: "Peut etre ajuste si necessaire." },
      { key: "password", label: "Mot de passe initial", type: "password", required: true, generated: true, help: "Min 12 caracteres, avec au moins une lettre et un chiffre." },
      { key: "email", label: "Email", type: "email", readOnly: true, help: "Genere automatiquement avec le prenom et le nom." },
      { key: "phone", label: "Telephone" },
      { kind: "section", label: "Informations RH" },
      { key: "roleId", label: "Role", type: "select", optionKey: "roles", required: true },
      { key: "departmentId", label: "Departement", type: "select", optionKey: "departments" },
      { key: "designationId", label: "Poste", type: "select", optionKey: "designations" },
      { key: "shiftId", label: "Horaire", type: "select", optionKey: "shifts" },
      { key: "employeeId", label: "Matricule" },
      { key: "joinDate", label: "Date d'embauche", type: "date" },
      { key: "bloodGroup", label: "Groupe sanguin" },
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
    defaults: { id: "", firstName: "", lastName: "", username: "", password: "", email: "", phone: "", roleId: "", departmentId: "", designationId: "", shiftId: "", employeeId: "", joinDate: "", bloodGroup: "", street: "", city: "", state: "", zipCode: "", country: "", status: "true" },
    fields: [
      { kind: "section", label: "Identite" },
      { key: "firstName", label: "Prenom", required: true },
      { key: "lastName", label: "Nom", required: true },
      { key: "username", label: "Identifiant", required: true },
      { key: "password", label: "Changer mot de passe", type: "password", help: "Laisser vide pour garder l'ancien mot de passe." },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Telephone" },
      { key: "status", label: "Statut", type: "select", options: [{ value: "true", label: "Actif" }, { value: "false", label: "Inactif" }], requiresStatusPermission: true },
      { kind: "section", label: "Informations RH" },
      { key: "roleId", label: "Role", type: "select", optionKey: "roles", required: true },
      { key: "departmentId", label: "Departement", type: "select", optionKey: "departments" },
      { key: "designationId", label: "Poste", type: "select", optionKey: "designations" },
      { key: "shiftId", label: "Horaire", type: "select", optionKey: "shifts" },
      { key: "employeeId", label: "Matricule" },
      { key: "joinDate", label: "Date d'embauche", type: "date" },
      { key: "bloodGroup", label: "Groupe sanguin" },
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
  timesheet: {
    title: "Nouvelle saisie d'heures",
    submit: "Enregistrer",
    success: "Heures enregistrees.",
    defaults: { userId: "", periodStartDate: TODAY, periodEndDate: TODAY, project: "", donor: "", activity: "", hours: 0, note: "" },
    fields: [
      { key: "userId", label: "Employe", type: "select", optionKey: "staff", required: true },
      { key: "periodStartDate", label: "Debut de periode", type: "date", required: true },
      { key: "periodEndDate", label: "Fin de periode", type: "date", required: true },
      { key: "project", label: "Projet / activite", required: true },
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
function Avatar({ name, color, size = 36, sq = false, text }) {
  return <span className={`av ${sq ? "sq" : ""}`} style={{ width: size, height: size, background: color || colorFor(name), fontSize: size <= 30 ? 10 : 12 }}>{text || initials(name)}</span>;
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
      api.overview(), api.shifts(), api.awards(), api.salaryHistory(), api.roles(), api.setting(), api.currencies(),
      api.leaveRequests(), api.hrContracts(), api.hrDocuments(), api.expenseRequests(), api.socialDeclarations(),
      api.performanceReviews(), api.trainingSessions(), api.timesheets(), api.employeeRequests(), api.recruitmentOffers()
    ])
      .then(([overview, shifts, awards, salaries, roles, setting, currencies, leaves, contracts, documents, expenses, declarations, reviews, trainings, timesheets, employeeRequests, offers]) => {
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
          salaries: arrayFrom(salaries.value, "getAllSalaryHistory"),
          roles: arrayFrom(roles.value, "getAllRole"),
          leaveRequests: arrayFrom(leaves.value, "getAllHrLeaveRequest"),
          contracts: arrayFrom(contracts.value, "getAllHrContract"),
          documents: arrayFrom(documents.value, "getAllHrDocument"),
          expenseRequests: arrayFrom(expenses.value, "getAllHrExpenseRequest"),
          socialDeclarations: arrayFrom(declarations.value, "getAllHrSocialDeclaration"),
          performanceReviews: arrayFrom(reviews.value, "getAllHrPerformanceReview"),
          trainingSessions: arrayFrom(trainings.value, "getAllHrTrainingSession"),
          timesheets: arrayFrom(timesheets.value, "getAllHrTimesheet"),
          employeeRequests: arrayFrom(employeeRequests.value, "getAllHrEmployeeRequest"),
          recruitmentOffers: arrayFrom(offers.value, "getAllHrRecruitmentOffer"),
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
      const hrApiKinds = ["leaveRequest", "hrContract", "hrDocument", "expenseRequest", "socialDeclaration", "performanceReview", "trainingSession", "timesheet", "employeeRequest", "recruitmentOffer"];
      if (hrApiKinds.includes(kind)) {
        if (kind === "leaveRequest") await api.createLeaveRequest(cleanPayload({ userId: Number(form.userId), type: form.type, startDate: form.startDate, endDate: form.endDate, reason: form.reason || null }));
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
        if (kind === "performanceReview") await api.createPerformanceReview(cleanPayload({ userId: Number(form.userId), managerId: toNum(form.managerId), cycle: form.cycle, score: toNum(form.score), objectives: form.objectives || null, comments: form.comments || null }));
        if (kind === "trainingSession") await api.createTrainingSession(cleanPayload({ title: form.title, audience: form.audience || null, sessionDate: form.sessionDate || null, budget: Number(form.budget || 0), currencyId: toNum(form.currencyId), note: form.note || null }));
        if (kind === "timesheet") {
          const periodStartDate = form.periodStartDate || form.workDate || TODAY;
          const periodEndDate = form.periodEndDate || periodStartDate;
          const activity = (form.activity || form.project || "Heures travaillees").trim();
          await api.createTimesheet(cleanPayload({
            userId: Number(form.userId),
            workDate: periodStartDate,
            period: form.period || `${periodStartDate} - ${periodEndDate}`,
            periodStartDate,
            periodEndDate,
            project: form.project || activity.slice(0, 180),
            donor: form.donor || null,
            activity,
            hours: Number(form.hours || 0),
            note: form.note || null,
          }));
        }
        if (kind === "employeeRequest") await api.createEmployeeRequest(cleanPayload({ userId: Number(form.userId), requestType: form.requestType, subject: form.subject, requestedDate: form.requestedDate, description: form.description || null }));
        if (kind === "recruitmentOffer") await api.createRecruitmentOffer(cleanPayload({ role: form.role, departmentId: toNum(form.departmentId), deadline: form.deadline || null, description: form.description || null }));
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
          bloodGroup: form.bloodGroup, joinDate: form.joinDate, street: form.street, city: form.city,
          state: form.state, zipCode: form.zipCode, country: form.country,
        }));
      }
      if (kind === "editEmployee") {
        if (form.password && !isValidInitialPassword(form.password)) throw new Error("Le mot de passe doit contenir 12 a 64 caracteres, au moins une lettre et un chiffre.");
        await api.updateUser(Number(form.id), cleanPayload({
          firstName: form.firstName, lastName: form.lastName, username: form.username, password: form.password,
          roleId: Number(form.roleId), email: form.email, phone: form.phone, departmentId: toNum(form.departmentId),
          designationId: toNum(form.designationId), shiftId: toNum(form.shiftId), employeeId: form.employeeId,
          bloodGroup: form.bloodGroup, joinDate: form.joinDate, street: form.street, city: form.city,
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
    dossiers: <Dossiers {...ctx} />,
    presences: <Presences staff={staff} />,
    conges: <Conges {...ctx} />,
    timesheet: <Timesheet data={data} staff={staff} setModal={setModal} />,
    paie: <Paie data={data} staff={staff} masse={masse} setModal={setModal} />,
    frais: <Frais {...ctx} />,
    declarations: <Declarations {...ctx} />,
    performance: <Performance {...ctx} />,
    formation: <Formation {...ctx} />,
    recrutement: <Recrutement {...ctx} />,
    organigramme: <Organigramme departments={data.departments} designations={data.designations} canMutate={canMutate} onNew={() => setModal({ kind: "designation" })} />,
    reporting: <Reporting data={data} staff={staff} masse={masse} />,
    selfservice: <SelfService data={data} staff={staff} me={me} setModal={setModal} />,
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
              <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={name} color={colorFor(name)} size={30} /><div><div style={{ fontWeight: 500 }}>{name}</div><div className="tiny">{matricule(u)} · {displayPhone(u)}</div><EmployeeActions user={u} setModal={setModal} /></div></div></td>
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
                <div><Icon name="phone" /> {displayPhone(u)}</div>
                <div><Icon name="building2" /> {u.department?.name || "Département"}</div>
                <div><Icon name="badgeCheck" /> {u.employeeId || `NG-${String(u.id).padStart(3, "0")}`}</div>
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
          <Avatar name={name} color={colorFor(name)} size={54} sq />
          <div>
            <div className="chip emerald">{user.status === "false" ? "Inactif" : "Actif"}</div>
            <div className="tiny" style={{ marginTop: 6 }}>NG-{String(user.id).padStart(3, "0")}</div>
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
  const leaves = byUser(data.leaveRequests, userId);
  const documents = byUser(data.documents, userId);
  const timesheets = byUser(data.timesheets, userId);
  const reviews = byUser(data.performanceReviews, userId);
  const trainings = byUser(data.trainingSessions, userId);
  const expenses = byUser(data.expenseRequests, userId);
  const requests = byUser(data.employeeRequests, userId);
  const activeContract = contracts.find((c) => isApproved(c.status)) || contracts[0];
  const totalHours = timesheets.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const openLeaves = leaves.filter((row) => isPending(row.status)).length;
  const contractDays = daysUntil(activeContract?.endDate);
  const onLeaveNow = leaves.some((leave) => currentLeaves([leave]).length);
  const projectHours = [...timesheets.reduce((map, row) => {
    const key = row.project || "Projet non renseigne";
    map.set(key, (map.get(key) || 0) + Number(row.hours || 0));
    return map;
  }, new Map()).entries()].map(([project, hours]) => ({ project, hours }));
  const tabs = [["resume", "Resume"], ["contrats", "Contrats"], ["paie", "Paie"], ["temps", "Temps"], ["documents", "Documents"], ["developpement", "Developpement"]];
  const row = (label, value) => <div><span>{label}</span><strong>{value || "-"}</strong></div>;
  const statusChip = (status) => <span className={"chip " + chipForStatus(status)}>{statusLabel(status)}</span>;
  const hasAlerts = (contractDays != null && contractDays >= 0 && contractDays <= 90) || onLeaveNow || documents.length === 0;

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
          <Avatar name={name} color={colorFor(name)} size={54} sq />
          <div>
            <div className={user.status === "false" ? "chip rose" : "chip emerald"}>{user.status === "false" ? "Inactif" : "Actif"}</div>
            <div className="tiny" style={{ marginTop: 6 }}>{user.employeeId || `NG-${String(user.id).padStart(3, "0")}`}</div>
          </div>
        </div>

        <div className="employee-360-kpis">
          <Mini label="Contrats" value={contracts.length} />
          <Mini label="Conges ouverts" value={openLeaves} />
          <Mini label="Heures saisies" value={`${nf.format(totalHours)} h`} />
          <Mini label="Documents" value={documents.length} />
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
              {row("Adresse", [user.street, user.city, user.country].filter(Boolean).join(", "))}
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
            <Employee360Panel title="Signature electronique">
              <EmptyState title="Signature a connecter" detail="Les contrats signes seront relies ici quand le module document/signature sera pret." />
            </Employee360Panel>
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

function Presences() {
  return (
    <>
      <PageHead eyebrow="Pointage" title="Presences & pointage" />
      <div className="card pad">
        <div className="section-head"><h3 className="font-display">Feuille de presence</h3></div>
        <EmptyState title="Module de pointage non connecte a la base" detail="Aucune presence n'est affichee tant qu'un endpoint BD n'alimente pas ce module." />
      </div>
    </>
  );
}

/* Conges */
function Conges({ data, staff, setModal }) {
  const requests = data.leaveRequests || [];
  const pending = requests.filter((r) => isPending(r.status));
  const approved = requests.filter((r) => isApproved(r.status));
  const today = currentLeaves(requests);
  const addRequest = () => setModal({ kind: "leaveRequest" });
  const detail = (r) => [dateOnly(r.startDate), dateOnly(r.endDate)].filter(Boolean).join(" -> ") || "Dates non renseignees";
  return (
    <>
      <PageHead eyebrow="Absences" title="Conges & absences" action="Nouvelle demande" onAction={addRequest} />
      <div className="g4 kpis" style={{ marginBottom: 18 }}>
        <KPI label="En attente" value={pending.length} tone={pending.length ? "warn" : undefined} />
        <Mini label="Approuves" value={approved.length} valueClass="" />
        <Mini label="En conge aujourd'hui" value={today.length} />
        <Mini label="Total demandes" value={requests.length} />
      </div>
      <div className="g3">
        <section className="card pad span2">
          <h3 className="block-title font-display">Demandes en base</h3>
          {requests.length === 0 && <EmptyState title="Aucune demande de conge en base" />}
          {requests.map((c) => {
            const name = personName(staff, c.userId);
            return (
              <div className="row" key={c.id || [c.userId, c.startDate, c.endDate].filter(Boolean).join("-")}>
                <Avatar name={name} color={colorFor(name)} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{name} - <span className="muted" style={{ fontWeight: 400 }}>{c.type || "Conge"}</span></div><div className="tiny">{detail(c)}{c.reason ? " - " + c.reason : ""}</div></div>
                <span className={"chip " + chipForStatus(c.status)}>{statusLabel(c.status)}</span>
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
    </>
  );
}

/* Paie */
function Paie({ data, staff, masse, setModal }) {
  const [q, setQ] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("");
  const [currencyFilter, setCurrencyFilter] = React.useState("");
  const rows = data.salaries || [];
  const dateStart = (s) => dateOnly(s.salaryStartDate || s.startDate);
  const dateEnd = (s) => dateOnly(s.salaryEndDate || s.endDate);
  const comment = (s) => s.salaryComment || s.comment || "";
  const employeeFor = (userId) => staff.find((u) => String(u.id) === String(userId));
  const employeeSearchText = (u) => u ? [fullName(u), u.username, u.email, matricule(u), u.designation?.name, u.department?.name].filter(Boolean).join(" ").toLowerCase() : "";
  const historySearchText = (s) => [personName(staff, s.userId), employeeSearchText(employeeFor(s.userId)), comment(s), dateStart(s), dateEnd(s), dateOnly(s.createdAt)].filter(Boolean).join(" ").toLowerCase();
  const currenciesInHistory = [...new Set(rows.map((s) => symbolFor(s.currencyId, CURRENCIES, CUR)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const needle = q.trim().toLowerCase();
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
  const employeeCount = new Set(filteredRows.map((s) => s.userId).filter(Boolean)).size;
  const hasFilters = Boolean(needle || employeeFilter || currencyFilter);
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
      <PageHead eyebrow="Historique des salaires" title="Historique de paie" action="Nouveau salaire" actionIcon="plus" onAction={() => setModal({ kind: "salary" })} />
      <div className="g3" style={{ marginBottom: 16 }}>
        <Mini label={hasFilters ? "Resultats historique" : "Lignes historique"} value={filteredRows.length} />
        <Mini label="Employes salaries" value={employeeCount} />
        <Mini label="Masse salariale / mois" value={<MoneyLines lines={salaryMoneyLines(staff)} />} />
      </div>
      <div className="card pad table-card">
        <div className="section-head"><h3 className="font-display">Historique des salaires en base</h3><button type="button" className="link" onClick={exportHistory}><Icon name="download" style={{ width: 13, height: 13 }} /> Exporter</button></div>
        <div className="searchbar">
          <label className="search-input"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un employe, matricule, poste..." /></label>
          <select className="pillbtn" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} aria-label="Filtrer par employe">
            <option value="">Tous les employes</option>
            {staff.map((u) => <option key={u.id} value={u.id}>{fullName(u)}</option>)}
          </select>
          <select className="pillbtn" value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)} aria-label="Filtrer par devise">
            <option value="">Toutes les devises</option>
            {currenciesInHistory.map((sym) => <option key={sym} value={sym}>{sym}</option>)}
          </select>
        </div>
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
          <tbody>{currentFiltered.map((u) => { const name = fullName(u); return <tr key={u.id}><td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={name} color={colorFor(name)} size={30} /><div><div style={{ fontWeight: 500 }}>{name}</div><div className="tiny">{u.department?.name || ""}</div></div></div></td><td>{u.designation?.name || ""}</td><td className="r num">{fc(u.currentSalary, salarySym(u))}</td><td className="r"><span className={"chip " + (u.status === "false" ? "ink" : "emerald")}>{u.status === "false" ? "Inactif" : "Actif"}</span></td></tr>; })}</tbody>
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
function Dossiers({ data, staff, setModal }) {
  const rows = data.documents || [];
  return (
    <>
      <PageHead eyebrow="Dossier du personnel" title="Dossiers & documents" action="Televerser" actionIcon="upload" onAction={() => setModal({ kind: "hrDocument" })} ghost />
      <div className="g3" style={{ marginBottom: 18 }}><Mini label="Documents" value={rows.length} /><Mini label="Employes avec document" value={new Set(rows.map((d) => d.userId).filter(Boolean)).size} /><Mini label="Recus" value={rows.filter((d) => isApproved(d.status)).length} /></div>
      <div className="card pad table-card"><h3 className="block-title font-display">Documents en base</h3><div className="tbl-scroll"><table className="tbl" style={{ minWidth: 680 }}><thead><tr><th>Employe</th><th>Type</th><th>Reference</th><th>Fichier</th><th className="r">Statut</th></tr></thead><tbody>{rows.map((d) => <tr key={d.id}><td style={{ fontWeight: 500 }}>{personName(staff, d.userId)}</td><td>{d.documentType || "Document"}</td><td className="muted">{d.reference || "-"}</td><td>{d.fileUrl ? <a className="link" href={d.fileUrl} target="_blank" rel="noreferrer">Ouvrir</a> : "-"}</td><td className="r"><span className={"chip " + chipForStatus(d.status)}>{statusLabel(d.status)}</span></td></tr>)}</tbody></table></div>{rows.length === 0 && <EmptyState title="Aucun document en base" />}</div>
    </>
  );
}

/* Timesheet */
function Timesheet({ data, staff, setModal }) {
  const rows = data.timesheets || [];
  const totalHours = rows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const pending = rows.filter((row) => isPending(row.status)).length;
  const projectCount = new Set(rows.map((row) => row.project).filter(Boolean)).size;
  const exportTimesheets = () => exportCsv(
    "timesheets.csv",
    ["Employe", "Debut", "Fin", "Projet", "Financement", "Activite", "Heures", "Statut", "Note"],
    rows.map((row) => [personName(staff, row.userId), dateOnly(row.periodStartDate || row.workDate), dateOnly(row.periodEndDate || row.workDate), row.project || "", row.donor || "", row.activity || "", Number(row.hours || 0), statusLabel(row.status), row.note || ""])
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
          <tbody>{rows.map((row) => <tr key={row.id}><td style={{ fontWeight: 500 }}>{personName(staff, row.userId)}</td><td>{dateOnly(row.periodStartDate || row.workDate) || "-"}</td><td>{dateOnly(row.periodEndDate || row.workDate) || "-"}</td><td>{row.project || "-"}</td><td>{row.donor || "-"}</td><td className="muted">{row.activity || "-"}</td><td className="r">{nf.format(Number(row.hours || 0))}</td><td className="r"><span className={"chip " + chipForStatus(row.status)}>{statusLabel(row.status)}</span></td></tr>)}</tbody>
        </table></div>
        {rows.length === 0 && <EmptyState title="Aucune heure saisie" detail="Clique sur Nouvelle saisie pour enregistrer des heures liees a un projet ou une activite." />}
      </div>
    </>
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
function Recrutement({ data, setModal }) {
  const rows = data.recruitmentOffers || [];
  return (
    <>
      <PageHead eyebrow="Pipeline" title="Recrutement" action="Nouvelle offre" onAction={() => setModal({ kind: "recruitmentOffer" })} />
      <div className="g3" style={{ marginBottom: 18 }}><Mini label="Offres" value={rows.length} /><Mini label="Ouvertes" value={rows.filter((r) => isApproved(r.status)).length} /><Mini label="Avec deadline" value={rows.filter((r) => r.deadline).length} /></div>
      <div className="card pad table-card"><div className="tbl-scroll"><table className="tbl" style={{ minWidth: 620 }}><thead><tr><th>Role</th><th>Departement</th><th>Deadline</th><th className="r">Statut</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td style={{ fontWeight: 500 }}>{r.role || "Offre"}</td><td>{r.department?.name || r.departmentId || "-"}</td><td>{dateOnly(r.deadline) || "-"}</td><td className="r"><span className={"chip " + chipForStatus(r.status)}>{statusLabel(r.status)}</span></td></tr>)}</tbody></table></div>{rows.length === 0 && <EmptyState title="Aucune offre de recrutement en base" />}</div>
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
  const hasMoney = ["salary", "expenseRequest", "socialDeclaration", "trainingSession", "hrContract"].includes(modal.kind);
  const [form, setForm] = React.useState(() => {
    const base = { ...defaults(modal.kind, staff), ...(modal.initial || {}) };
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
  };
  const isMoneyField = (field) => {
    if (!field) return false;
    if (field.key === "salary") return true;
    if (["expenseRequest", "socialDeclaration"].includes(modal.kind) && ["amount", "baseAmount"].includes(field.key)) return true;
    if (modal.kind === "trainingSession" && field.key === "budget") return true;
    if (modal.kind === "hrContract" && ["baseSalary", "transportAllowance", "housingAllowance", "stipend", "contractAmount"].includes(field.key)) return true;
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
            if (field.key === "phone") return <PhoneField key={field.key} label={field.label} value={form[field.key] ?? ""} onChange={(v) => set(field.key, v)} required={field.required} />;
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
