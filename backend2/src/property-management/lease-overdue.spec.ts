import {
  computeLeaseOverdueStats,
  daysSince,
  isPastGrace,
  normalizeGraceDays,
  paymentOverdueFields,
} from "./lease-overdue";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe("isPastGrace", () => {
  it("jour J (date + grace) pas en retard, lendemain en retard", () => {
    expect(isPastGrace("2026-09-01", d("2026-09-06"), 5)).toBe(false);
    expect(isPastGrace("2026-09-01", d("2026-09-07"), 5)).toBe(true);
  });
  it("grace 0 : en retard des le lendemain de l echeance", () => {
    expect(isPastGrace("2026-09-01", d("2026-09-01"), 0)).toBe(false);
    expect(isPastGrace("2026-09-01", d("2026-09-02"), 0)).toBe(true);
  });
});

describe("normalizeGraceDays / daysSince", () => {
  it("borne 0..60 sinon defaut 5", () => {
    expect(normalizeGraceDays(30)).toBe(30);
    expect(normalizeGraceDays(0)).toBe(0);
    expect(normalizeGraceDays(61)).toBe(5);
    expect(normalizeGraceDays(null)).toBe(5);
  });
  it("jours depuis l echeance", () => {
    expect(daysSince("2026-10-01", d("2026-10-12"))).toBe(11);
  });
});

describe("computeLeaseOverdueStats", () => {
  // Echeances impayees au 01/08, 01/09, 01/10 ; aujourd hui 12/10.
  const run = (grace: number) =>
    computeLeaseOverdueStats("2026-08-01", null, "monthly", [], 100, d("2026-10-12"), grace);

  it("grace 30 : 2 en retard, la 3e (01/10) est echue seulement", () => {
    const s = run(30);
    expect(s.dueCount).toBe(3);
    expect(s.unpaidCount).toBe(2);
    expect(s.lateCount).toBe(2);
    expect(s.isOverdue).toBe(true);
    expect(s.overdueDueDate).toBe("2026-08-01");
    expect(s.overdueDays).toBe(72);
    expect(s.graceDays).toBe(30);
  });
  it("grace 0 : 3 en retard", () => {
    expect(run(0).unpaidCount).toBe(3);
  });
  it("grace 60 : 1 en retard", () => {
    expect(run(60).unpaidCount).toBe(1);
  });
  it("echeance du jour dans la grace : aucun retard, overdueDays 0", () => {
    const t = computeLeaseOverdueStats("2026-10-01", null, "monthly", [], 100, d("2026-10-12"), 30);
    expect(t.isOverdue).toBe(false);
    expect(t.overdueDays).toBe(0);
    expect(t.dueCount).toBe(1);
  });
  it("paiement fait apres la grace compte dans lateCount mais pas unpaidCount", () => {
    const s = computeLeaseOverdueStats(
      "2026-08-01", null, "monthly", [{ date: "2026-09-20", amount: 100 }], 100, d("2026-10-12"), 5,
    );
    expect(s.lateCount).toBeGreaterThanOrEqual(1);
    expect(s.unpaidCount).toBe(s.lateCount - 1);
  });
});

describe("paymentOverdueFields", () => {
  it("seules les echeances pending peuvent etre en retard", () => {
    expect(paymentOverdueFields("paid", "2026-01-01", d("2026-10-12"), 5).isOverdue).toBe(false);
    expect(paymentOverdueFields("pending", "2026-10-01", d("2026-10-12"), 30)).toEqual({ isOverdue: false, daysPastDue: 11 });
    expect(paymentOverdueFields("pending", "2026-09-13", d("2026-10-12"), 30)).toEqual({ isOverdue: false, daysPastDue: 29 });
    expect(paymentOverdueFields("pending", "2026-09-13", d("2026-10-14"), 30).isOverdue).toBe(true);
  });
});

describe("computeLeaseOverdueStats — retards graves et montants (preavis, badge)", () => {
  it("paye en retard AVANT l'echeance suivante + grace : retard simple, pas grave", () => {
    // Sept du 01/09, paye le 20/09 (apres grace 5 j, avant 01/10 + 5).
    const s = computeLeaseOverdueStats("2026-09-01", null, "monthly", [{ date: "2026-09-20", amount: 100 }], 100, d("2026-09-25"), 5);
    expect(s.lateCount).toBe(1);
    expect(s.severeLateCount).toBe(0);
  });
  it("septembre paye en novembre (apres la grace d'octobre) : grave, meme tout solde", () => {
    const s = computeLeaseOverdueStats(
      "2026-09-01", null, "monthly",
      [{ date: "2026-11-10", amount: 300 }], 100, d("2026-11-12"), 5,
    );
    // Sept (grace oct. depassee) et Oct (grace nov. depassee le 10/11) graves ; Nov paye a temps.
    expect(s.severeLateCount).toBe(2);
    expect(s.overdueAmount).toBe(0);
  });
  it("montant en retard vs en grace : le mois courant dans la grace n'est pas en retard", () => {
    const s = computeLeaseOverdueStats("2026-08-01", null, "monthly", [{ date: "2026-08-02", amount: 50 }], 100, d("2026-10-03"), 5);
    // Aout reste 50, Sept 100 en retard ; Oct (01/10, grace jusqu'au 06/10) 100 en grace.
    expect(s.overdueAmount).toBe(150);
    expect(s.graceDueAmount).toBe(100);
    // Aout toujours du apres la grace de septembre : grave ; Sept pas encore (grace oct. non depassee).
    expect(s.severeLateCount).toBe(1);
  });
});

describe("computeLeaseOverdueStats — amelioration (fenetre 12 mois, mois a jour d'affilee)", () => {
  // Bail du 01/01/2025, loyer 100, grace 5 : jan-mars 2025 payes en mai (graves), puis tout a temps.
  const pays = [
    { date: "2025-05-03", amount: 500 }, // couvre jan-mai 2025 : jan-mars graves (soldes apres la grace du mois suivant), avril non (03/05 <= 06/05)
    ...["06", "07", "08", "09", "10", "11", "12"].map((m) => ({ date: `2025-${m}-02`, amount: 100 })),
    ...["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"].map((m) => ({ date: `2026-${m}-02`, amount: 100 })),
  ];
  const s = computeLeaseOverdueStats("2025-01-01", null, "monthly", pays, 100, d("2026-10-20"), 5);
  it("retards graves anciens comptes dans l'historique, pas dans la fenetre de 12 mois", () => {
    expect(s.severeLateCount).toBe(3);
    expect(s.recentSevereLateCount).toBe(0);
    expect(s.recentDueCount).toBe(12);
  });
  it("mois a jour d'affilee depuis la derniere echeance", () => {
    expect(s.onTimeStreak).toBeGreaterThanOrEqual(17);
  });
  it("echeance courante encore dans la grace : neutre, ne casse pas la serie", () => {
    const t = computeLeaseOverdueStats("2026-07-01", null, "monthly",
      [{ date: "2026-07-02", amount: 100 }, { date: "2026-08-02", amount: 100 }, { date: "2026-09-02", amount: 100 }],
      100, d("2026-10-03"), 5);
    expect(t.onTimeStreak).toBe(3);
  });
  it("echeance impayee apres sa grace : serie a 0", () => {
    const t = computeLeaseOverdueStats("2026-07-01", null, "monthly",
      [{ date: "2026-07-02", amount: 100 }, { date: "2026-08-02", amount: 100 }], 100, d("2026-09-20"), 5);
    expect(t.onTimeStreak).toBe(0);
  });
});
