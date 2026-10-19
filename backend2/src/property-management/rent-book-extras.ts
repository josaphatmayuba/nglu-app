// Carnets Domus (rent-book) : champs complementaires pour le carnet papier / le releve.
// Fonctions PURES (sans DB) pour rester testables ; le service fait les lectures
// (best-effort, jamais bloquantes) et passe les valeurs brutes ici.

export interface RentBookExtrasInput {
  graceDays: number;
  startDate?: string | null;
  rentAmount?: number | string | null;
  rentProrationEnabled?: boolean;
  /** Echeances imputees (bail flagge) ou echeancier prorata : seule la date d'echeance compte. */
  dueDates?: Array<string | null | undefined>;
  depositContract?: number | string | null;
  depositReceived?: { amount: number | string; date: string | null; currencySymbol: string | null; status: string } | null;
  tenant?: {
    occupantNumber?: number | null;
    originProvince?: string | null;
    maritalStatus?: string | null;
    tenantType?: string | null;
    companyName?: string | null;
  } | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  settingLandlordName?: string | null;
  settingLandlordPhone?: string | null;
  delegates?: Array<{ displayName?: string | null; phone?: string | null; phone2?: string | null }>;
}

const clean = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};

/** Jour d'echeance du loyer : mois civil (prorata) -> 1 ; sinon jour de la 2e echeance, sinon jour de startDate. */
export function deriveDueDay(input: Pick<RentBookExtrasInput, "startDate" | "rentProrationEnabled" | "dueDates">): number | null {
  if (input.rentProrationEnabled) return 1;
  const dates = (input.dueDates || []).map((d) => String(d || "").slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const pick = dates.length > 1 ? dates[1] : dates[0];
  const src = pick || String(input.startDate || "").slice(0, 10);
  const m = /^\d{4}-\d{2}-(\d{2})$/.exec(src);
  const day = m ? Number(m[1]) : NaN;
  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : null;
}

export function buildRentBookExtras(input: RentBookExtrasInput) {
  const rent = Number(input.rentAmount);
  const contract = input.depositContract == null || input.depositContract === "" ? null : Number(input.depositContract);
  const depositContract = contract != null && Number.isFinite(contract) && contract > 0 ? contract : null;
  const depositMonths = depositContract != null && Number.isFinite(rent) && rent > 0 ? Math.round(depositContract / rent) : null;

  const dep = input.depositReceived;
  const depositReceived = dep && Number.isFinite(Number(dep.amount))
    ? { amount: Number(dep.amount), date: dep.date || null, currencySymbol: dep.currencySymbol || null, status: dep.status }
    : null;

  const t = input.tenant || null;
  const seen = new Set<string>();
  const delegates: Array<{ name: string; phone: string | null }> = [];
  for (const d of input.delegates || []) {
    const name = clean(d.displayName);
    if (!name) continue;
    const phone = clean(d.phone) || clean(d.phone2);
    const key = `${name}|${phone || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    delegates.push({ name, phone });
  }

  const ownerName = clean(input.ownerName);
  return {
    graceDays: input.graceDays,
    dueDay: deriveDueDay(input),
    depositContract,
    depositMonths,
    depositReceived,
    noticeMonths: null as number | null,
    occupants: t?.occupantNumber != null && Number(t.occupantNumber) > 0 ? Number(t.occupantNumber) : null,
    tenantProvince: clean(t?.originProvince),
    tenantMaritalStatus: clean(t?.maritalStatus),
    tenantPostName: null as string | null,
    tenantType: clean(t?.tenantType),
    companyName: clean(t?.companyName),
    landlordName: ownerName || clean(input.settingLandlordName),
    landlordPhone: ownerName ? clean(input.ownerPhone) : (clean(input.ownerPhone) || clean(input.settingLandlordPhone)),
    delegates,
    orgPaymentMethods: null as unknown,
  };
}
