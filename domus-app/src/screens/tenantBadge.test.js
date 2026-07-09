import { describe, it, expect } from "vitest";
import { tenantBadge, tenantLeaseInfo } from "./tenantBadge.js";

// Date de référence fixe pour des tests déterministes.
const NOW = new Date("2026-07-09T00:00:00Z").getTime();
const yearsAgo = (n) => new Date("2026-07-09T00:00:00Z").getFullYear() - n + "-07-09";

const tenant = (over = {}) => ({ id: 1, ...over });
// Bail actif "propre" par défaut ; surchargeable.
const lease = (over = {}) => ({
  tenantId: 1, unitId: 10, status: "active",
  startDate: "2026-01-01", endDate: null,
  lateCount: 0, dueCount: 0, isOverdue: false,
  ...over,
});

const badge = (t, leases, active, now = NOW) => tenantBadge(t, leases, active, now);

describe("tenantBadge", () => {
  it("aucun bail -> Sans bail (pas de Bronze usurpé)", () => {
    const b = badge(tenant(), [], null);
    expect(b).toEqual({ label: "Sans bail", tone: "neutral" });
  });

  it("retard en cours -> danger avec jours", () => {
    const l = lease({ isOverdue: true, overdueDays: 12 });
    expect(badge(tenant(), [l], l)).toEqual({ label: "En retard 12j", tone: "danger" });
  });

  it("mauvais payeur historique (>30% sur >=3 echeances) -> danger", () => {
    const l = lease({ lateCount: 5, dueCount: 10 });
    expect(badge(tenant(), [l], l)).toEqual({ label: "Mauvais payeur · 5 retards", tone: "danger" });
  });

  it("mauvais payeur reste signale meme PARTI (aucun bail actif)", () => {
    const past = lease({ status: "ended", lateCount: 4, dueCount: 6, endDate: "2025-01-01", startDate: "2024-01-01" });
    const b = badge(tenant(), [past], past);
    expect(b.tone).toBe("danger");
    expect(b.label).toContain("Mauvais payeur");
  });

  it("sous le seuil (2/10) -> pas mauvais payeur", () => {
    const l = lease({ lateCount: 2, dueCount: 10, startDate: yearsAgo(4) });
    expect(badge(tenant(), [l], l).label).not.toContain("Mauvais payeur");
  });

  it("bail actif finissant dans <=60j -> Bail a renouveler", () => {
    const l = lease({ endDate: "2026-08-01" }); // ~23j apres NOW
    expect(badge(tenant(), [l], l)).toEqual({ label: "Bail à renouveler", tone: "warning" });
  });

  it("entreprise (nom SARL) -> Pro Entreprise", () => {
    const l = lease();
    const b = badge(tenant({ entityName: "Immo SARL" }), [l], l);
    expect(b).toEqual({ label: "Pro · Entreprise", tone: "brand" });
  });

  it("entreprise partie -> Pro Entreprise · ancien", () => {
    const l = lease({ status: "ended", endDate: "2025-01-01" });
    const b = badge(tenant({ entityName: "Immo SARL" }), [l], l);
    expect(b.label).toBe("Pro · Entreprise · ancien");
  });

  it("Or actif : 2 baux propres -> success", () => {
    const a = lease({ id: 1, startDate: yearsAgo(2) });
    const bl = lease({ id: 2, status: "active", startDate: yearsAgo(1) });
    const b = badge(tenant(), [a, bl], bl);
    expect(b.tone).toBe("success");
    expect(b.label).toContain("Or · 2 baux");
  });

  it("Or CONSERVE pour un ancien locataire (parti) -> suffixe ancien, ton neutralise", () => {
    const l1 = lease({ status: "ended", startDate: yearsAgo(4), endDate: yearsAgo(2) });
    const l2 = lease({ status: "ended", startDate: yearsAgo(2), endDate: "2025-06-01" });
    const b = badge(tenant(), [l1, l2], l1);
    expect(b.label).toBe("Or · 2 baux · ancien");
    expect(b.tone).toBe("neutral"); // plus de vert vif : parti
  });

  it("Argent : ~2 ans, 1 bail propre, actif -> brand", () => {
    const l = lease({ startDate: yearsAgo(2) });
    const b = badge(tenant(), [l], l);
    expect(b.label).toBe("Argent · 2 ans");
    expect(b.tone).toBe("brand");
  });

  it("Argent conserve pour un ancien -> suffixe ancien + neutre", () => {
    const l = lease({ status: "ended", startDate: yearsAgo(2), endDate: "2025-06-01" });
    const b = badge(tenant(), [l], l);
    expect(b.label).toBe("Argent · 2 ans · ancien");
    expect(b.tone).toBe("neutral");
  });

  it("bail actif recent (<1 an) -> Bronze · nouveau (pas '1 an' mensonger)", () => {
    const l = lease({ startDate: "2026-06-01" }); // < 1 an avant NOW
    expect(badge(tenant(), [l], l)).toEqual({ label: "Bronze · nouveau", tone: "neutral" });
  });

  it("anciennete cumulee sur l'historique, pas que le bail actif", () => {
    // Fidele: 1er bail il y a 3 ans, nouveau bail actif tout recent.
    const old = lease({ status: "ended", startDate: yearsAgo(3), endDate: yearsAgo(1) });
    const fresh = lease({ status: "active", startDate: "2026-06-01" });
    const b = badge(tenant(), [old, fresh], fresh);
    // 2 baux => Or, et non "Bronze · nouveau" base sur le seul bail actif.
    expect(b.label).toContain("Or");
    expect(b.tone).toBe("success");
  });

  it("parti sans historique marquant -> Ancien locataire", () => {
    const l = lease({ status: "ended", startDate: "2026-01-01", endDate: "2026-05-01" });
    expect(badge(tenant(), [l], l)).toEqual({ label: "Ancien locataire", tone: "neutral" });
  });

  it("ordre de priorite : retard en cours > mauvais payeur > renouveler", () => {
    const l = lease({ isOverdue: true, overdueDays: 3, lateCount: 9, dueCount: 10 });
    expect(badge(tenant(), [l], l).label).toContain("En retard");
  });

  it("mauvais payeur ET actif -> reste Mauvais payeur (prime sur Or/Argent/Bronze)", () => {
    // Locataire fidele (3 baux, ancien) mais ratio de retard eleve -> le
    // signal danger doit l'emporter sur la fidelite (regle de priorite 6).
    const l = lease({ startDate: yearsAgo(5), lateCount: 4, dueCount: 10 });
    const b = badge(tenant(), [l], l);
    expect(b.tone).toBe("danger");
    expect(b.label).toBe("Mauvais payeur · 4 retards");
  });

  it("borne stricte : ratio exactement 0.3 (3/10) -> PAS mauvais payeur", () => {
    const l = lease({ lateCount: 3, dueCount: 10, startDate: yearsAgo(4) });
    expect(badge(tenant(), [l], l).label).not.toContain("Mauvais payeur");
  });

  it("borne stricte : dueCount=3 pile avec ratio>0.3 (2/3) -> mauvais payeur", () => {
    const l = lease({ lateCount: 2, dueCount: 3 });
    expect(badge(tenant(), [l], l).label).toContain("Mauvais payeur");
  });

  it("dueCount=2 sous le plancher de 3 -> jamais mauvais payeur meme a 100%", () => {
    const l = lease({ lateCount: 2, dueCount: 2 });
    expect(badge(tenant(), [l], l).label).not.toContain("Mauvais payeur");
  });

  it("startDate absent sur tous les baux -> years=0, pas de crash (Bronze nouveau)", () => {
    const l = lease({ startDate: null });
    expect(badge(tenant(), [l], l)).toEqual({ label: "Bronze · nouveau", tone: "neutral" });
  });

  it("bail status=active mais endDate deja passee -> Bail expire (filet visuel)", () => {
    // daysToEnd < 0 : bail non cloture en amont. Le badge alerte au lieu de le
    // laisser passer pour sain, et ce n'est pas "à renouveler" (deja depasse).
    const l = lease({ endDate: "2026-01-01", startDate: yearsAgo(1) }); // ~6 mois avant NOW
    const b = badge(tenant(), [l], l);
    expect(b).toEqual({ label: "Bail expiré", tone: "danger" });
  });

  it("priorite : impaye courant prime sur bail expire", () => {
    // endDate passee ET retard en cours -> l'impaye (plus urgent) l'emporte.
    const l = lease({ endDate: "2026-01-01", isOverdue: true, overdueDays: 5 });
    expect(badge(tenant(), [l], l).label).toContain("En retard");
  });
});

describe("tenantLeaseInfo", () => {
  it("prend le bail actif en priorite, sinon le premier", () => {
    const leases = [
      { tenantId: 1, unitId: 10, status: "ended" },
      { tenantId: 1, unitId: 11, status: "active" },
      { tenantId: 2, unitId: 12, status: "active" },
    ];
    const units = [{ id: 11 }];
    const r = tenantLeaseInfo({ id: 1 }, leases, units);
    expect(r.tenantLeases).toHaveLength(2);
    expect(r.activeLease.status).toBe("active");
    expect(r.activeUnit).toEqual({ id: 11 });
  });

  it("sans bail -> activeLease null, activeUnit null", () => {
    const r = tenantLeaseInfo({ id: 99 }, [], []);
    expect(r.tenantLeases).toEqual([]);
    expect(r.activeLease).toBeNull();
    expect(r.activeUnit).toBeNull();
  });
});
