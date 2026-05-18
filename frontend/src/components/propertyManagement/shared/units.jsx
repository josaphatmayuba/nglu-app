// Unit + ticket icon helpers (JSX-returning, hence .jsx).
// Copied from PropertyManagement.jsx — keep both in sync during the soft migration.

import {
  Briefcase,
  Building2,
  CheckCircle2,
  Droplets,
  Home,
  Key,
  Paintbrush,
  Store,
  Wrench,
  Zap,
} from "lucide-react";

export const getUnitKind = (unit) =>
  unit?.unitType || unit?.propertyType || unit?.property?.propertyType || "apartment";

export const unitTypeIcon = (kind, size = 14) => {
  switch (kind) {
    case "office":
      return <Briefcase size={size} />;
    case "shop":
    case "commercial":
      return <Store size={size} />;
    case "house":
    case "villa":
      return <Home size={size} />;
    default:
      return <Building2 size={size} />;
  }
};

export const ticketIconFor = (request, size = 20) => {
  const haystack = `${request?.title || ""} ${request?.description || ""} ${request?.category || ""}`.toLowerCase();
  if (/(fuite|eau|plomb|water|leak|robinet)/.test(haystack)) return <Droplets size={size} />;
  if (/(élec|elec|electric|panne|disjonct|courant|tension|zap)/.test(haystack)) return <Zap size={size} />;
  if (/(peint|paint|mur|humidit|enduit)/.test(haystack)) return <Paintbrush size={size} />;
  if (/(serrur|clé|cle|lock|key|porte|securit)/.test(haystack)) return <Key size={size} />;
  if (request?.status === "done") return <CheckCircle2 size={size} />;
  return <Wrench size={size} />;
};

export const ticketIconTone = (request) => {
  if (request?.status === "done") return "green";
  if (["urgent", "high"].includes(request?.priority)) return "red";
  const haystack = `${request?.title || ""} ${request?.description || ""}`.toLowerCase();
  if (/(élec|elec|electric|panne|disjonct)/.test(haystack)) return "amber";
  if (/(peint|paint|mur|humidit|enduit)/.test(haystack)) return "blue";
  if (/(serrur|clé|cle|lock|key|securit)/.test(haystack)) return "purple";
  return "amber";
};
