import { describe, expect, it } from "vitest";
import { buildStatement, collectDues, dueStatus, statementBodyHtml } from "./rentStatementUtils.js";

const due = (id, start, amount, remaining, allocations = [], extra = {}) => ({
  id, periodStart: start, periodEnd: null, dueDate: start, amount, amountPaid: amount - remaining, remaining,
  dueStatus: remaining <= 0 ? "paid" : "pending", status: remaining <= 0 ? "paid" : "pending", allocations, ...extra,
});
const pay = (id, date, amount, extra = {}) => ({ id, paymentDate: date, amount, status: "paid", method: "M-Pesa", currencySymbol: "$", ...extra });

const lease = (dues, extra = {}) => ({
  id: 7, reference: "BL-1", startDate: "2026-01-01", rentAmount: 400, currencySymbol: "$",
  tenantFirstName: "Ann", tenantLastName: "Lu", allocationLedger: true, dues, book: { graceDays: 5 }, ...extra,
});

describe("statuts de la frise (delai de grace)", () => {
  const d = (dueDate, left, paidOn) => ({ dueDate, left, paidOn });
  it("temps / retard / avance / du / avenir", () => {
    expect(dueStatus(d("2026-02-01", 0, "2026-02-06"), "2026-06-01", 5)).toBe("temps");
    expect(dueStatus(d("2026-02-01", 0, "2026-02-07"), "2026-06-01", 5)).toBe("retard");
    expect(dueStatus(d("2026-02-01", 0, "2026-01-20"), "2026-06-01", 5)).toBe("avance");
    expect(dueStatus(d("2026-02-01", 100, null), "2026-06-01", 5)).toBe("du");
    expect(dueStatus(d("2026-08-01", 400, null), "2026-06-01", 5)).toBe("avenir");
    expect(dueStatus(d("2026-08-01", 0, "2026-05-01"), "2026-06-01", 5)).toBe("avance");
  });
});

describe("buildStatement (bail flague : dues = source de verite)", () => {
  const payments = [pay(1, "2026-01-03", 400), pay(2, "2026-02-20", 600), pay(3, "2027-01-02", 100)];
  const dues = [
    due(1, "2026-01-01", 400, 0, [{ paymentId: 1, paymentDate: "2026-01-03", amount: 400 }]),
    due(2, "2026-02-01", 400, 0, [{ paymentId: 2, paymentDate: "2026-02-20", amount: 400 }]),
    due(3, "2026-03-01", 400, 200, [{ paymentId: 2, paymentDate: "2026-02-20", amount: 200 }]),
    due(4, "2026-04-01", 400, 400),
  ];
  const st = buildStatement(lease(dues), payments, { today: "2026-04-10" });

  it("statuts par mois", () => {
    expect(st.months.map((m) => m.status)).toEqual(["temps", "retard", "du", "du"]);
  });
  it("solde par devise = paiements - echeances echues", () => {
    expect(st.balances["$"]).toBe(1100 - 1600);
    expect(st.situation.kind).toBe("due");
    expect(st.situation.label).toContain("En retard");
  });
  it("decoupage par annee avec report", () => {
    expect(st.years.map((y) => y.year)).toEqual(["2026", "2027"]);
    expect(st.years[1].opening["$"]).toBe(1000 - 1600);
  });
  it("collectDues ignore les echeances annulees", () => {
    const l = lease([...dues, { ...due(9, "2026-05-01", 400, 400), dueStatus: "voided" }]);
    expect(collectDues(l, payments)).toHaveLength(4);
  });
});

describe("buildStatement (soldes par devise, avance, a jour)", () => {
  it("deux devises ne se melangent pas", () => {
    const payments = [pay(1, "2026-01-02", 400), pay(2, "2026-01-05", 100000, { currencySymbol: "FC" })];
    const st = buildStatement(lease([due(1, "2026-01-01", 400, 0, [{ paymentId: 1, paymentDate: "2026-01-02", amount: 400 }])]), payments, { today: "2026-01-31" });
    expect(st.balances["$"]).toBe(0);
    expect(st.balances["FC"]).toBe(100000);
    expect(st.situation.kind).toBe("adv");
  });
  it("a jour", () => {
    const st = buildStatement(lease([due(1, "2026-01-01", 400, 0, [{ paymentId: 1, paymentDate: "2026-01-02", amount: 400 }])]), [pay(1, "2026-01-02", 400)], { today: "2026-01-31" });
    expect(st.situation).toEqual({ kind: "ok", label: "À jour" });
  });
  it("bail non flague : base sur buildFullRentSchedule", () => {
    const l = { id: 1, startDate: "2026-01-01", rentAmount: 230, currencySymbol: "$", book: { graceDays: 5 } };
    const st = buildStatement(l, [pay(1, "2026-01-03", 230)], { today: "2026-03-15" });
    expect(st.months[0].status).toBe("temps");
    expect(st.months[1].status).toBe("du");
    expect(st.balances["$"]).toBe(230 - 690);
  });
});

describe("statementBodyHtml", () => {
  it("echappe le nom du locataire et contient l'arrete signe", () => {
    const l = lease([due(1, "2026-01-01", 400, 0, [{ paymentId: 1, paymentDate: "2026-01-02", amount: 400 }])], { tenantFirstName: "<img onerror=x>", book: { graceDays: 5, depositContract: 800, depositMonths: 2 } });
    const html = statementBodyHtml(l, [pay(1, "2026-01-02", 400)], { today: "2026-01-31" });
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("&lt;img onerror=x&gt;");
    expect(html).toContain("Arrêté de compte 2026");
    expect(html).toContain("Garantie locative");
    expect(html).toContain("Paiement reçu");
  });
  it("loyer payé par la caution : libellé dédié + ligne garantie « Imputée sur loyers »", () => {
    const l = lease([due(1, "2026-01-01", 400, 0, [{ paymentId: 1, paymentDate: "2026-01-02", amount: 400 }])], {
      book: { graceDays: 5, depositContract: 800, depositReceived: { amount: "800.00", date: "2026-01-01", currencySymbol: "$", status: "held", rentApplied: "400.00" } },
    });
    const html = statementBodyHtml(l, [pay(1, "2026-01-02", 400, { method: "deposit" })], { today: "2026-01-31" });
    expect(html).toContain("Payée par la caution");
    expect(html).not.toContain(">deposit<");
    expect(html).toContain("Imputée sur loyers");
    expect(html).toContain("400");
  });
  it("sans garantie connue : pas de section garantie", () => {
    const html = statementBodyHtml(lease([due(1, "2026-01-01", 400, 400)]), [], { today: "2026-01-31" });
    expect(html).not.toContain("Garantie locative");
    expect(html).toContain("Mois par mois");
  });
});

describe("corrections revue", () => {
  it("dans le delai de grace : « Dû », pas « En retard »", () => {
    const st = buildStatement(lease([due(1, "2026-04-01", 400, 400)]), [], { today: "2026-04-04" });
    expect(st.situation.label).toBe("Dû : 400 $");
    const late = buildStatement(lease([due(1, "2026-04-01", 400, 400)]), [], { today: "2026-04-07" });
    expect(late.situation.label).toBe("En retard : 400 $");
  });
  it("paiement sans date : compte dans le solde, aucune annee vide", () => {
    const st = buildStatement(lease([due(1, "2026-01-01", 400, 400)]), [pay(1, null, 100)], { today: "2026-01-31" });
    expect(st.years.map((y) => y.year)).toEqual(["2026"]);
    expect(st.balances["$"]).toBe(100 - 400);
    const html = statementBodyHtml(lease([due(1, "2026-01-01", 400, 400)]), [pay(1, null, 100)], { today: "2026-01-31" });
    expect(html).not.toContain("Report de -1");
  });
  it("jamais « indéterminée » et pastilles avec devise", () => {
    const html = statementBodyHtml(lease([due(1, "2026-01-01", 400, 400)]), [], { today: "2026-01-31" });
    expect(html.toLowerCase()).not.toContain("indéterminée");
    expect(html).toMatch(/class="dot">400\s\$</);
  });
});

describe("bail sans echeancier (legacy) - echeance au jour du bail", () => {
  const legacy = { id: 63, reference: "BL-63", startDate: "2026-10-18", rentAmount: 300, currencySymbol: "$", allocationLedger: false, book: { graceDays: 30, dueDay: 18 } };
  it("mois non paye date au jour d'echeance, pas au 1er", () => {
    const st = buildStatement(legacy, [], { today: "2026-10-19" });
    expect(st.months[0].dueDate).toBe("2026-10-18");
    expect(st.situation.kind).not.toBe("late");
  });
  it("aucun paiement : totaux affiches avec la devise", () => {
    const html = statementBodyHtml(legacy, [], { today: "2026-10-19" });
    expect(html).toContain("Total payé depuis l'entrée</span><strong>0 $");
    expect(html).toMatch(/Payé <b>0 \$<\/b>/);
  });
});

describe("bail au prorata hors echeances (montant du = echeancier, pas le montant paye)", () => {
  const sched = [
    { periodStart: "2026-07-19", periodEnd: "2026-07-31", dueDate: "2026-07-19", amount: 167.74, prorated: true, days: 13, periodDays: 31 },
    { periodStart: "2026-08-01", periodEnd: "2026-08-31", dueDate: "2026-08-01", amount: 400 },
    { periodStart: "2026-09-01", periodEnd: "2026-09-30", dueDate: "2026-09-01", amount: 400 },
    { periodStart: "2026-10-01", periodEnd: "2026-10-31", dueDate: "2026-10-01", amount: 400 },
    { periodStart: "2026-11-01", periodEnd: "2026-11-30", dueDate: "2026-11-01", amount: 400 },
  ];
  const l = { id: 24, startDate: "2026-07-19", rentAmount: 400, currencySymbol: "$", schedule: sched, book: { graceDays: 30 } };
  const pays = [
    pay(216, "2026-08-06", 170, { transactionId: 106 }),
    pay(217, "2026-09-09", 400, { transactionId: 107 }),
    pay(218, "2026-10-09", 400, { transactionId: 108 }),
    { id: 233, paymentDate: "2026-10-01", amount: 400, status: "pending", periodStart: "2026-10-01", periodEnd: "2026-10-31", currencySymbol: "$" },
  ];
  it("170 paye sur 167,74 du : solde 397,74 et octobre reste 397,74", () => {
    const s = buildStatement(l, pays, { today: "2026-10-19" });
    expect(s.months[0].amount).toBe(167.74);
    expect(s.balances["$"]).toBeCloseTo(-397.74, 2);
    expect(s.months.find((m) => m.key === "2026-10").left).toBeCloseTo(397.74, 2);
    expect(s.months.find((m) => m.key === "2026-11").left).toBe(400);
  });
});
