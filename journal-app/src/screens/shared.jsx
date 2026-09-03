// Constantes et utilitaires partagés entre tous les écrans Journal.
import { FileText, Phone, Users, Mail, AlertTriangle, Package, Lightbulb, MapPin } from "lucide-react";

export const EVENT_TYPES = [
  { value: "note", label: "Note" },
  { value: "appel", label: "Appel" },
  { value: "reunion", label: "Réunion" },
  { value: "courrier", label: "Courrier" },
  { value: "incident", label: "Incident" },
  { value: "livraison", label: "Livraison" },
  { value: "decision", label: "Décision" },
  { value: "visite", label: "Visite" },
];

export const SOURCE_MODULES = [
  { value: "all", label: "Tous" },
  { value: "comptabilite", label: "Comptabilité" },
  { value: "domus", label: "Domus" },
  { value: "batipro", label: "BâtiPro" },
  { value: "rh", label: "RH" },
  { value: "farmos", label: "FarmOS" },
  { value: "general", label: "Général" },
];

export const EVENT_COLORS = {
  note: "var(--type-note)",
  appel: "var(--type-call)",
  reunion: "var(--type-meeting)",
  courrier: "var(--type-mail)",
  incident: "var(--type-incident)",
  livraison: "var(--type-delivery)",
  decision: "var(--type-decision)",
  visite: "var(--type-visit)",
};

export const EVENT_ICONS = {
  note: FileText,
  appel: Phone,
  reunion: Users,
  courrier: Mail,
  incident: AlertTriangle,
  livraison: Package,
  decision: Lightbulb,
  visite: MapPin,
};

export const IMP_COLORS = {
  haute: { bg: "#fef2f2", text: "#b91c1c", chip: "chip-rose" },
  moyenne: { bg: "#fef3c7", text: "#92400e", chip: "chip-amber" },
  basse: { bg: "#f0fdf4", text: "#15803d", chip: "chip-emerald" },
};

export function formatRelative(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function impChipClass(imp) {
  if (imp === "haute") return "chip chip-rose";
  if (imp === "moyenne") return "chip chip-amber";
  return "chip chip-emerald";
}
