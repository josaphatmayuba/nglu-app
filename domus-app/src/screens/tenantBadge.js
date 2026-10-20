// Logique pure (sans React) de classification d'un locataire pour l'affichage
// d'un badge dans l'écran Locataires. Extrait pour être testable unitairement.
//
// Le badge combine, par ordre de priorité :
//   1. retard en cours          -> danger
//   2. mauvais payeur (retards graves sur 12 mois) -> danger, même parti ;
//      3 mois à jour d'affilée -> « En amélioration » (warning), 6 -> statut levé
//   3. bail à renouveler         -> warning (seulement si encore actif)
//   4. entreprise / fidélité Or/Argent/Bronze
//   5. ancien locataire (parti sans historique marquant)
//
// L'ancienneté et l'historique de paiement sont cumulés sur TOUS les baux du
// locataire (actifs comme terminés), pas seulement le bail actif.

import { parseDomusDate } from "../dateRange.jsx";

const YEAR_MS = 365 * 86400000;
// Rehabilitation « Mauvais payeur » : mois consecutifs payes dans la grace.
export const IMPROVING_STREAK = 3;
export const CLEARED_STREAK = 6;

function latestLease(leases) {
  return [...(leases || [])].sort((a, b) => String(b.startDate || "").localeCompare(String(a.startDate || "")))[0] || null;
}

// Liaison locataire -> ses baux -> bail actif -> unité (comme le CRM).
export function tenantLeaseInfo(tenant, leases, units) {
  // Co-locataire inclus : un bail multi-locataires appartient a chacun d'eux.
  const id = String(tenant.id);
  const tenantLeases = leases.filter((l) => String(l.tenantId) === id
    || (Array.isArray(l.coTenants) && l.coTenants.some((c) => String(c?.id) === id)));
  const activeLease = tenantLeases.find((l) => l.status === "active") || tenantLeases[0] || null;
  const activeUnit = activeLease ? units.find((u) => String(u.id) === String(activeLease.unitId)) || null : null;
  return { tenantLeases, activeLease, activeUnit };
}

// `now` injectable pour rendre les tests déterministes.
export function tenantBadge(tenant, tenantLeases, activeLease, now = Date.now()) {
  // Pas de bail du tout : prospect / contact, pas de badge de fidélité.
  if (!activeLease && (!tenantLeases || tenantLeases.length === 0)) {
    return { label: "Sans bail", tone: "neutral" };
  }
  const isLate = activeLease?.isOverdue || activeLease?.status === "late";
  if (isLate) {
    const d = activeLease?.overdueDays;
    return { label: `En retard${d ? ` ${d}j` : ""}`, tone: "danger" };
  }
  // Retard historique cumulé sur TOUS les baux (actifs comme terminés), évalué
  // AVANT le cas "ancien" pour qu'un mauvais payeur parti reste signalé.
  // Mauvais payeur = retards GRAVES récurrents : échéance réglée (ou toujours due)
  // après la grâce de l'échéance suivante (ex. septembre payé en novembre), même
  // s'il a tout soldé depuis. Payer en retard avant l'échéance suivante n'en fait pas un.
  // Seuls les 12 derniers mois comptent (recentSevereLateCount / recentDueCount) ;
  // puis rehabilitation : 3 mois a jour d'affilee -> « En amelioration », 6 -> statut leve.
  // Champs absents (ancien backend) : repli sur l'historique complet / lateCount.
  const totalLate = tenantLeases.reduce((s, l) => s + Number(l.lateCount || 0), 0);
  const totalSevere = tenantLeases.reduce((s, l) => s + Number(l.recentSevereLateCount ?? l.severeLateCount ?? l.lateCount ?? 0), 0);
  const totalDue = tenantLeases.reduce((s, l) => s + Number(l.recentDueCount ?? l.dueCount ?? 0), 0);
  if (totalDue >= 3 && totalSevere >= 2 && totalSevere / totalDue > 0.3) {
    // Serie du bail actif, sinon du plus recent (locataire parti).
    const ref = activeLease?.onTimeStreak != null ? activeLease : latestLease(tenantLeases);
    const streak = Number(ref?.onTimeStreak ?? 0);
    if (streak < IMPROVING_STREAK) return { label: `Mauvais payeur · ${totalSevere} retards`, tone: "danger" };
    if (streak < CLEARED_STREAK) return { label: `En amélioration · ${streak} mois à jour`, tone: "warning" };
  }
  const hasActive = tenantLeases.some((l) => l.status === "active");
  const daysToEnd = hasActive && activeLease?.endDate
    ? Math.ceil(((parseDomusDate(activeLease.endDate) || new Date(activeLease.endDate)).getTime() - now) / 86400000)
    : null;
  // Filet : bail encore "actif" mais dont l'échéance est déjà passée (donnée non
  // clôturée en amont). On l'alerte au lieu de le laisser passer pour sain.
  if (daysToEnd !== null && daysToEnd < 0) return { label: "Bail expiré", tone: "danger" };
  // Bail actif proche de la fin : à renouveler (seulement si encore actif).
  if (daysToEnd !== null && daysToEnd >= 0 && daysToEnd <= 60) return { label: "Bail à renouveler", tone: "warning" };
  const isCompany = tenant?.tenantType === "company" || Boolean(tenant?.entityName) && /\b(sarl|sas|sa|sprl|entreprise|company|ltd|inc|group)\b/i.test(String(tenant.entityName));
  if (isCompany) return { label: `Pro · Entreprise${hasActive ? "" : " · ancien"}`, tone: "brand" };
  // Ancienneté = depuis le TOUT PREMIER bail (historique complet).
  const firstStart = tenantLeases
    .map((l) => (l.startDate ? new Date(l.startDate).getTime() : null))
    .filter((t) => Number.isFinite(t))
    .reduce((min, t) => (min === null || t < min ? t : min), null);
  const years = firstStart !== null ? Math.max(0, Math.floor((now - firstStart) / YEAR_MS)) : 0;
  const hasAnyLate = tenantLeases.some((l) => l.isOverdue || l.status === "late") || totalLate > 0;
  const plural = years > 1 ? "s" : "";
  // Le niveau de fidélité se calcule sur l'HISTORIQUE : il reste valable pour un
  // locataire parti (suffixe "· ancien", ton neutralisé).
  const suffix = hasActive ? "" : " · ancien";
  if (!hasAnyLate) {
    if (tenantLeases.length >= 2 || years >= 3) return { label: `Or · ${tenantLeases.length >= 2 ? `${tenantLeases.length} baux` : `${years} ans`}${suffix}`, tone: hasActive ? "success" : "neutral" };
    if (years >= 2) return { label: `Argent · ${years} an${plural}${suffix}`, tone: hasActive ? "brand" : "neutral" };
  }
  // Parti sans historique marquant : "Ancien locataire" plutôt que "Bronze".
  if (!hasActive) {
    const n = tenantLeases.length;
    return { label: `Ancien locataire${n > 1 ? ` · ${n} baux` : ""}`, tone: "neutral" };
  }
  const anciennete = years >= 1 ? `${years} an${plural}` : "nouveau";
  return { label: `Bronze · ${anciennete}`, tone: "neutral" };
}
