// Logique pure (sans React) de classification d'un locataire pour l'affichage
// d'un badge dans l'écran Locataires. Extrait pour être testable unitairement.
//
// Le badge combine, par ordre de priorité :
//   1. retard en cours          -> danger
//   2. mauvais payeur historique -> danger  (passé inclus, même parti)
//   3. bail à renouveler         -> warning (seulement si encore actif)
//   4. entreprise / fidélité Or/Argent/Bronze
//   5. ancien locataire (parti sans historique marquant)
//
// L'ancienneté et l'historique de paiement sont cumulés sur TOUS les baux du
// locataire (actifs comme terminés), pas seulement le bail actif.

const YEAR_MS = 365 * 86400000;

// Liaison locataire -> ses baux -> bail actif -> unité (comme le CRM).
export function tenantLeaseInfo(tenant, leases, units) {
  const tenantLeases = leases.filter((l) => String(l.tenantId) === String(tenant.id));
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
  const totalLate = tenantLeases.reduce((s, l) => s + Number(l.lateCount || 0), 0);
  const totalDue = tenantLeases.reduce((s, l) => s + Number(l.dueCount || 0), 0);
  if (totalDue >= 3 && totalLate / totalDue > 0.3) {
    return { label: `Mauvais payeur · ${totalLate} retards`, tone: "danger" };
  }
  const hasActive = tenantLeases.some((l) => l.status === "active");
  const daysToEnd = hasActive && activeLease?.endDate
    ? Math.ceil((new Date(activeLease.endDate).getTime() - now) / 86400000)
    : null;
  // Filet : bail encore "actif" mais dont l'échéance est déjà passée (donnée non
  // clôturée en amont). On l'alerte au lieu de le laisser passer pour sain.
  if (daysToEnd !== null && daysToEnd < 0) return { label: "Bail expiré", tone: "danger" };
  // Bail actif proche de la fin : à renouveler (seulement si encore actif).
  if (daysToEnd !== null && daysToEnd >= 0 && daysToEnd <= 60) return { label: "Bail à renouveler", tone: "warning" };
  const isCompany = Boolean(tenant?.entityName) && /\b(sarl|sas|sa|sprl|entreprise|company|ltd|inc|group)\b/i.test(String(tenant.entityName));
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
