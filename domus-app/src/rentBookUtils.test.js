import { describe, expect, it } from "vitest";
import { assignPaymentsToMonths, buildFullRentSchedule, dueDateWithGrace, rentBookPrintBody } from "./rentBookUtils.js";

const paid = (id, paymentDate, amount = 230, extra = {}) => ({ id, paymentDate, amount, status: "paid", ...extra });

describe("buildFullRentSchedule (sans prorata)", () => {
  const lease = { startDate: "2026-01-01", rentAmount: 230, currencySymbol: "$" };

  it("paiement du mois suivant rangé sur le mois de loyer, vraie date conservée", () => {
    // Carnet Gloria : janvier payé le 06/02, avril le 07/05, mai le 06/05.
    const payments = [
      paid(1, "2026-02-06"), paid(2, "2026-03-15"), paid(3, "2026-04-09"),
      paid(4, "2026-05-07"), paid(5, "2026-05-06"), paid(6, "2026-06-07"),
    ];
    const s = buildFullRentSchedule(lease, payments);
    const byMonth = Object.fromEntries(s.map((l) => [l.rentMonth, l]));
    expect(byMonth["2026-01"].paymentDate).toBe("2026-02-06");
    expect(byMonth["2026-02"].paymentDate).toBe("2026-03-15");
    expect(byMonth["2026-06"].status).toBe("paid");
    expect(byMonth["2026-07"].status).toBe("pending");
    // Aucun paiement perdu (les deux paiements de mai sont affichés).
    expect(s.filter((l) => l.status === "paid")).toHaveLength(6);
  });

  it("jamais avant le début du bail", () => {
    const s = buildFullRentSchedule({ ...lease, startDate: "2026-09-01" }, [paid(1, "2026-10-09")]);
    expect(s[0].rentMonth).toBe("2026-09");
    expect(s[0].status).toBe("paid");
  });

  it("periodStart explicite respecté", () => {
    const m = assignPaymentsToMonths(["2026-01", "2026-02", "2026-03"], [paid(1, "2026-04-01", 230, { periodStart: "2026-03-01" })], 230);
    expect(m.get("2026-03")?.id).toBe(1);
    expect(m.has("2026-01")).toBe(false);
  });

  it("ligne en attente rangée par son échéance", () => {
    const m = assignPaymentsToMonths(["2026-01", "2026-02"], [paid(1, "2026-02-06"), { id: 2, paymentDate: "2026-02-01", amount: 230, status: "pending" }], 230);
    expect(m.get("2026-01")?.id).toBe(1);
    expect(m.get("2026-02")?.id).toBe(2);
  });
});

describe("buildFullRentSchedule (prorata)", () => {
  // Bail Thaddée : début 19/07, 400/mois, juillet 13 j = 167,74 payé 170.
  const schedule = [
    { periodStart: "2026-07-19", periodEnd: "2026-07-31", dueDate: "2026-07-19", amount: 167.74, prorated: true, days: 13, periodDays: 31 },
    { periodStart: "2026-08-01", periodEnd: "2026-08-31", dueDate: "2026-08-01", amount: 400 },
    { periodStart: "2026-09-01", periodEnd: "2026-09-30", dueDate: "2026-09-01", amount: 400 },
    { periodStart: "2026-10-01", periodEnd: "2026-10-31", dueDate: "2026-10-01", amount: 400 },
  ];
  const lease = { startDate: "2026-07-19", rentAmount: 400, currencySymbol: "$", schedule };

  it("paiements sans période rattachés dans l'ordre aux périodes", () => {
    const s = buildFullRentSchedule(lease, [paid(1, "2026-08-06", 170), paid(2, "2026-09-09", 400), paid(3, "2026-10-09", 400)]);
    expect(s).toHaveLength(4);
    expect(s.map((l) => [l.rentMonth, l.status, l.id ?? null])).toEqual([
      ["2026-07", "paid", 1], ["2026-08", "paid", 2], ["2026-09", "paid", 3], ["2026-10", "pending", null],
    ]);
    expect(s[0].isProrata).toBe(true);
  });

  it("échéance pending d'une période couverte remplacée par le paiement réel", () => {
    const pend = { id: 9, status: "pending", paymentDate: "2026-07-19", periodStart: "2026-07-19", amount: 167.74 };
    const s = buildFullRentSchedule(lease, [pend, paid(1, "2026-08-06", 170)]);
    expect(s[0].id).toBe(1);
    expect(s.find((l) => l.id === 9)).toBeUndefined();
  });
});

describe("rentBookPrintBody (exemplaire)", () => {
  const lease = { id: 1, reference: "B1", startDate: "2026-01-01", endDate: "2026-03-31", rentAmount: 230, currencySymbol: "$" };
  const count = (h, re) => (h.match(re) || []).length;

  it("locataire par défaut, bailleur au choix, les deux à la suite", () => {
    const t = rentBookPrintBody(lease, []);
    expect(t).toContain("Carnet du locataire");
    expect(count(t, /Exemplaire du locataire/g)).toBe(3);
    expect(t).not.toContain("bailleur");
    const b = rentBookPrintBody(lease, [], null, {}, "landlord");
    expect(b).toContain("Carnet du bailleur");
    expect(count(b, /Exemplaire du bailleur/g)).toBe(3);
    const both = rentBookPrintBody(lease, [], null, {}, "both");
    expect(count(both, /Exemplaire du locataire/g)).toBe(3);
    expect(count(both, /Exemplaire du bailleur/g)).toBe(3);
    expect(count(both, /class="copy-break"/g)).toBe(1);
  });
});

describe("carnet de quittances : échéance au jour du bail + période", () => {
  const leon = { id: 1, startDate: "2026-09-15", endDate: "2027-09-14", rentAmount: 1500, currencySymbol: "$" };

  it("bail du 15 : 12 quittances, échéance le 15, période 15→14", () => {
    const s = buildFullRentSchedule(leon, []);
    expect(s).toHaveLength(12);
    expect(s[0]).toMatchObject({ dueDate: "2026-09-15", coverStart: "2026-09-15", coverEnd: "2026-10-14" });
    expect(s[11]).toMatchObject({ dueDate: "2027-08-15", coverEnd: "2027-09-14" });
  });

  it("bail du 15 au 15 : même 12 quittances", () => {
    expect(buildFullRentSchedule({ ...leon, endDate: "2027-09-15" }, [])).toHaveLength(12);
  });

  it("ligne en attente en base datée du 1er : échéance quand même le 15", () => {
    const s = buildFullRentSchedule(leon, [{ id: 9, paymentDate: "2026-09-01", amount: 1500, status: "pending" }]);
    expect(s[0].dueDate).toBe("2026-09-15");
  });

  it("bail du 31/01 : échéances 28/02 puis 31/03", () => {
    const s = buildFullRentSchedule({ ...leon, startDate: "2027-01-31", endDate: "2027-12-30" }, []);
    expect(s[0].coverEnd).toBe("2027-02-27");
    expect(s[1].dueDate).toBe("2027-02-28");
    expect(s[1].coverEnd).toBe("2027-03-30");
    expect(s[2].dueDate).toBe("2027-03-31");
  });

  it("grâce : buildFullRentSchedule garde dueDate au jour du bail (pas de décalage dans le schedule)", () => {
    // Le décalage est à l'affichage (dueDateWithGrace), pas ici : le Relevé relit
    // dueDate et applique déjà la grâce, donc la décaler ici la compterait 2 fois.
    const s = buildFullRentSchedule({ ...leon, startDate: "2026-10-01", endDate: "2027-09-30", book: { graceDays: 5 } }, []);
    expect(s[0]).toMatchObject({ dueDate: "2026-10-01", coverStart: "2026-10-01", coverEnd: "2026-10-31" });
  });

  it("HTML : échéance 15/09/2026, période en toutes lettres, « à payer » au lieu de « (dû) »", () => {
    const html = rentBookPrintBody(leon, [], null);
    expect(html).toContain("15/09/2026");
    expect(html).toContain("du 15 septembre 2026 au 14 octobre 2026");
    expect(html).not.toContain("01/09/2026");
    expect(html).not.toContain("(dû)");
    expect(html).toContain("à payer");
  });

  it("HTML grâce 33 : échéance décalée (18/10) mais période inchangée (du 15/09…)", () => {
    const html = rentBookPrintBody({ ...leon, book: { graceDays: 33 } }, [], null);
    expect(html).toContain("18/10/2026"); // 15/09 + 33 j
    expect(html).toContain("du 15 septembre 2026 au 14 octobre 2026");
  });
});

describe("dueDateWithGrace : décalage d'affichage de l'échéance", () => {
  it("grâce nulle/inconnue/0 : date inchangée", () => {
    expect(dueDateWithGrace("2026-10-01", { book: { graceDays: 0 } })).toBe("2026-10-01");
    expect(dueDateWithGrace("2026-10-01", { book: { graceDays: null } })).toBe("2026-10-01");
    expect(dueDateWithGrace("2026-10-01", {})).toBe("2026-10-01");
  });

  it("grâce 5 : 01/10 -> 06/10", () => {
    expect(dueDateWithGrace("2026-10-01", { book: { graceDays: 5 } })).toBe("2026-10-06");
  });

  it("grâce 33 : 01/10 -> 03/11 (passage de mois)", () => {
    expect(dueDateWithGrace("2026-10-01", { book: { graceDays: 33 } })).toBe("2026-11-03");
  });

  it("grâce lue sur lease.graceDays en repli", () => {
    expect(dueDateWithGrace("2026-10-01", { graceDays: 5 })).toBe("2026-10-06");
  });
});

describe("carnet de quittances : versements multi-mois / partiels", () => {
  const leon = { id: 1, startDate: "2026-09-15", endDate: "2027-09-14", rentAmount: 1500, currencySymbol: "$" };
  const pay = (id, d, amount, extra = {}) => ({ id, paymentDate: d, amount, status: "paid", method: "cash", receivedBy: "Paul", ...extra });
  const sumPaid = (s) => s.filter((l) => l.status === "paid").reduce((t, l) => t + l.amount, 0);

  it("3 000 couvre deux mois : les deux payés, 1 500 chacun, mention du versement", () => {
    const s = buildFullRentSchedule(leon, [pay(1, "2026-09-20", 3000)]);
    expect(s).toHaveLength(12);
    expect(s.slice(0, 2).map((l) => [l.status, l.amount, l.paymentDate, l.method, l.receivedBy])).toEqual([
      ["paid", 1500, "2026-09-20", "cash", "Paul"], ["paid", 1500, "2026-09-20", "cash", "Paul"],
    ]);
    expect(s[2].status).toBe("pending");
    expect(sumPaid(s)).toBe(3000);
    const html = rentBookPrintBody(leon, [pay(1, "2026-09-20", 3000)], null);
    expect(html).toContain("Versement du 20/09/2026");
  });

  it("750 sur 1 500 : mois en attente avec reste dû 750", () => {
    const s = buildFullRentSchedule(leon, [pay(1, "2026-09-20", 750)]);
    expect(s[0]).toMatchObject({ status: "pending", remaining: 750, amount: 1500, rentMonth: "2026-09" });
    expect(s[0].linkedPayments).toHaveLength(1);
    expect(sumPaid(s)).toBe(0);
    const html = rentBookPrintBody(leon, [pay(1, "2026-09-20", 750)], null);
    expect(html).toContain("Paiements liés");
    expect(html).toContain("Reste dû");
  });

  it("750 + 750 complètent le même mois, rien en fin de carnet", () => {
    const s = buildFullRentSchedule(leon, [pay(1, "2026-09-20", 750), pay(2, "2026-10-01", 750)]);
    expect(s).toHaveLength(12);
    expect(s[0]).toMatchObject({ status: "paid", amount: 1500, remaining: 0, paymentDate: "2026-10-01" });
    expect(s[0].linkedPayments.map((x) => x.amount)).toEqual([750, 750]);
    expect(s[1].status).toBe("pending");
  });

  it("2 000 = 1 mois + 500 de reste sur le suivant", () => {
    const s = buildFullRentSchedule(leon, [pay(1, "2026-09-20", 2000)]);
    expect(s[0]).toMatchObject({ status: "paid", amount: 1500 });
    expect(s[1]).toMatchObject({ status: "pending", remaining: 1000 });
    expect(s[1].linkedPayments[0].amount).toBe(500);
    // Excédent reporté puis complété par le versement suivant.
    const s2 = buildFullRentSchedule(leon, [pay(1, "2026-09-20", 2000), pay(2, "2026-10-15", 1000)]);
    expect(s2[1]).toMatchObject({ status: "paid", amount: 1500 });
    expect(sumPaid(s2)).toBe(3000);
  });

  it("aucun paiement perdu : excédent au-delà du bail ajouté pour le seul montant restant", () => {
    const short = { ...leon, endDate: "2026-11-14" }; // 2 mois
    const s = buildFullRentSchedule(short, [pay(1, "2026-09-20", 4000)]);
    expect(s).toHaveLength(3);
    expect(s[2]).toMatchObject({ status: "paid", amount: 1000 });
    expect(sumPaid(s)).toBe(4000);
  });

  it("bail indéterminé : assez de mois pour un gros versement", () => {
    const open = { ...leon, endDate: null };
    const s = buildFullRentSchedule(open, [pay(1, "2026-09-20", 1500 * 14)]);
    expect(s.filter((l) => l.status === "paid")).toHaveLength(14);
    expect(sumPaid(s)).toBe(21000);
  });

  it("centimes exacts : 3 × 0,10 sur loyer 0,30", () => {
    const l = { ...leon, rentAmount: 0.3 };
    const s = buildFullRentSchedule(l, [pay(1, "2026-09-20", 0.1), pay(2, "2026-09-21", 0.1), pay(3, "2026-09-22", 0.1)]);
    expect(s[0]).toMatchObject({ status: "paid", remaining: 0 });
  });
});
