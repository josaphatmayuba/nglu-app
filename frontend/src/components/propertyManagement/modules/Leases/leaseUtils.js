import moment from "moment";

export const leaseContractFor = (lease, contracts = []) =>
  contracts.find((contract) => contract.leaseId === lease?.id || contract.lease?.id === lease?.id);

// Single source of truth: a lease is expired when its status says so OR when
// its endDate is in the past. Previously the "Actifs" filter only checked
// status === "active" and so a status="active" lease whose endDate had
// already passed (badge "Expiré" + "Archivé" in the UI) was wrongly counted
// as active. See SCRUM-62.
export const isLeaseExpired = (lease) => {
  if (!lease) return false;
  if (lease.status === "expired" || lease.status === "ended") return true;
  if (lease.endDate && moment(lease.endDate).isBefore(moment(), "day")) return true;
  return false;
};

export const leaseMenuVariant = (lease, contract) => {
  if (isLeaseExpired(lease)) return "expired";
  if (!contract) return "noContract";
  if (contract.status === "signed") return "signed";
  return "pendingSignature";
};

export const leaseDisplayInfo = (lease, contract) => {
  const start = lease?.startDate ? moment(lease.startDate) : null;
  const end = lease?.endDate ? moment(lease.endDate) : null;
  const now = moment();
  const isExpired = isLeaseExpired(lease);
  const daysLeft = end ? end.diff(now, "days") : null;
  const elapsedMonths = start ? Math.max(0, now.diff(start, "months")) : 0;
  const totalMonths = start && end ? Math.max(1, end.diff(start, "months")) : 1;
  const years = Math.max(1, Math.round(totalMonths / 12));
  const progress = Math.min(100, Math.max(0, Math.round((elapsedMonths / totalMonths) * 100)));
  const variant = leaseMenuVariant(lease, contract);
  const statusTone = isExpired ? "danger" : daysLeft !== null && daysLeft <= 60 ? "warning" : "success";
  const statusText = isExpired ? "Expiré" : daysLeft !== null && daysLeft <= 60 ? `À renouveler ${daysLeft}j` : "Actif";
  const contractTone =
    variant === "signed" ? "success" : variant === "noContract" ? "danger" : variant === "expired" ? "muted" : "warning";
  const contractLabel =
    variant === "signed" ? "Signé" : variant === "noContract" ? "Générer" : variant === "expired" ? "Archivé" : "Attente signature";
  const progressTone = variant === "noContract" ? "danger" : statusTone;

  return {
    variant,
    start,
    end,
    isExpired,
    daysLeft,
    elapsedMonths,
    totalMonths,
    years,
    progress,
    statusTone,
    statusText,
    contractTone,
    contractLabel,
    progressTone,
    propertyLabel: [lease?.propertyAddress || lease?.propertyName, lease?.unitName].filter(Boolean).join(" · ") || "-",
    reference: `#${lease?.reference || `BAIL-${lease?.id}`}`,
  };
};

export const pickDefaultTemplateFor = (lease, templates = [], units = []) => {
  const safeTemplates = (templates || []).filter(Boolean);
  if (!safeTemplates.length) return "standard";
  const unit = units.find((item) => item.id === lease?.unitId);
  const haystack = `${unit?.unitType || ""} ${lease?.propertyType || ""}`.toLowerCase();
  let preferredType = "residential";
  if (/(office|bureau|commercial|commerce|shop|magasin|store)/.test(haystack)) preferredType = "commercial";
  else if (/(short|saison|courte|court|temporary)/.test(haystack)) preferredType = "short_term";

  return (
    safeTemplates.find((tpl) => tpl.type === preferredType && tpl.isActive)?.id ||
    safeTemplates.find((tpl) => tpl.isActive)?.id ||
    safeTemplates[0].id
  );
};
