import { describe, expect, it } from "vitest";
import { buildLeaseYears, conditionsSentence, firstMonthProrata, imposeCutStack, paperBookHtml, paperBookModel } from "./rentPaperBookUtils.js";

const base = {
  id: 49, reference: "BL-2026-0049", startDate: "2026-07-19", rentAmount: 400, currencySymbol: "$",
  tenantFirstName: "Mme Exemple", tenantLastName: "LOCATAIRE", tenantPhone: "+243820000000",
  propertyAddress: "Av. Exemple 18", unitName: "3",
  ownerName: "M. Bailleur", ownerPhone: "+243810000000",
  schedule: [{ periodStart: "2026-07-19", periodEnd: "2026-07-31", dueDate: "2026-07-19", amount: 170, prorated: true, days: 13, periodDays: 31 }],
  book: {
    graceDays: 5, dueDay: 1, depositContract: 1200, depositMonths: 3,
    depositReceived: { amount: 1000, date: "2026-07-09", currencySymbol: "$", status: "held" },
    delegates: [{ name: "Gest. KABILA", phone: "+243830000000" }],
  },
};

describe("buildLeaseYears", () => {
  it("3 annees juillet -> juin de 12 mois", () => {
    const y = buildLeaseYears("2026-07-19");
    expect(y).toHaveLength(3);
    expect(y[0][0]).toEqual({ y: 2026, m: 6 });
    expect(y[0][11]).toEqual({ y: 2027, m: 5 });
    expect(y[2][11]).toEqual({ y: 2029, m: 5 });
    expect(y.every((a) => a.length === 12)).toBe(true);
  });
});

describe("firstMonthProrata", () => {
  it("prorata depuis l'echeancier : 13 j", () => {
    expect(firstMonthProrata(base)).toEqual({ amount: 170, days: 13 });
  });
  it("prorata depuis les echeances d'un bail flague", () => {
    const l = { allocationLedger: true, dues: [{ periodStart: "2026-07-19", periodEnd: "2026-07-31", amount: 170, dueStatus: "pending" }, { periodStart: "2026-08-01", periodEnd: "2026-08-31", amount: 400 }] };
    expect(firstMonthProrata(l)).toEqual({ amount: 170, days: 13 });
  });
  it("mois complet ou inconnu : null", () => {
    expect(firstMonthProrata({ startDate: "2026-07-01" })).toBeNull();
    expect(firstMonthProrata({ allocationLedger: true, dues: [{ periodStart: "2026-07-01", periodEnd: "2026-07-31", amount: 400 }] })).toBeNull();
  });
});

describe("imposition coupe et empile", () => {
  it("feuille i = page i a gauche, page i+5 a droite", () => {
    expect(imposeCutStack(10)).toEqual([[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]]);
  });
});

describe("conditionsSentence", () => {
  it("$ <-> FC", () => {
    expect(conditionsSentence("$")).toContain("Le FC est accepté au taux du jour");
    expect(conditionsSentence("FC")).toContain("Le $ est accepté au taux du jour");
    expect(conditionsSentence("CDF")).toContain("Le $ est accepté");
  });
});

describe("paperBookHtml", () => {
  const html2 = paperBookHtml(base, { pass: "2", duplicate: true });

  it("duree 3 ans, jamais indeterminee ; pas de colonne Reste", () => {
    const p1 = paperBookHtml(base, { pass: "1" });
    expect(p1).toContain("Durée : 3 ans");
    expect(p1).toContain("juil. 2026");
    expect(p1).toContain("juin 2029");
    expect(p1.toLowerCase()).not.toContain("indéterminée");
    expect(html2.toLowerCase()).not.toContain("indéterminée");
    expect(html2).not.toMatch(/<th>Reste/);
    expect(html2).toContain("Signature de qui reçoit l'argent");
    expect(html2).toContain("Signature du locataire");
  });
  it("prorata du 1er mois et symbole de devise du bail", () => {
    expect(html2).toContain("<small>13 j</small>");
    expect(html2).toMatch(/170\s\$/);
    expect(html2).toContain("Le FC est accepté au taux du jour");
  });
  it("deux cahiers : feuilles blanche et rose", () => {
    expect(html2).toContain("Cahier du locataire");
    expect(html2).toContain("Cahier du bailleur");
    expect(html2.match(/class="sheet /g)).toHaveLength(10);
    expect(paperBookHtml(base, { pass: "2", duplicate: false }).match(/class="sheet /g)).toHaveLength(5);
  });
  it("garantie : montant du contrat et montant recu s'il differe", () => {
    expect(html2).toMatch(/1\s200\s\$ \(3 mois\) · reçue : 1\s000\s\$/);
  });
  it("gestionnaire affiche s'il existe, masque sinon", () => {
    expect(html2).toContain("Gest. KABILA");
    expect(html2).toContain("Signature et cachet");
    const none = paperBookHtml({ ...base, book: { ...base.book, delegates: [] } }, { pass: "2" });
    expect(none).not.toContain("Gest. KABILA");
    expect(none).not.toContain("Signature et cachet");
    expect(none).not.toContain(">Gestionnaire<");
  });
  it("champs null -> pointilles", () => {
    const bare = paperBookHtml({ ...base, ownerName: null, ownerPhone: null, book: undefined }, { pass: "2" });
    expect(bare).toContain('class="dots"');
    const m = paperBookModel({ ...base, ownerName: null, ownerPhone: null, book: {} });
    expect(m.owner).toBeNull();
    expect(m.notice).toBeNull();
    expect(m.deposit).toBeNull();
    expect(m.grace).toBeNull();
    expect(m.dueDay).toBeNull();
  });
  it("echappement HTML", () => {
    const h = paperBookHtml({ ...base, tenantFirstName: "<script>alert(1)</script>" }, { pass: "2" });
    expect(h).not.toContain("<script>alert(1)");
    expect(h).toContain("&lt;script&gt;");
  });
  it("passage 1, vue cahier, encre", () => {
    const p1 = paperBookHtml(base, { pass: "1" });
    expect(p1).toContain("Exemplaire du locataire");
    expect(p1).toContain("Exemplaire du bailleur");
    expect(paperBookHtml(base, { pass: "cahier" })).toContain('class="single"');
    expect(paperBookHtml(base, { pass: "2", ink: "ink-pale" })).toContain("paper ink-pale");
  });
});

describe("corrections revue", () => {
  it("exemple sans prorata : 1re ligne au loyer complet, taux d'exemple etiquete", () => {
    const h = paperBookHtml({ ...base, schedule: undefined }, { pass: "1" });
    expect(h).not.toMatch(/\b155\s\$/);
    expect(h).toContain("taux d'exemple");
  });
  it("vue cahier : message d'impression", () => {
    expect(paperBookHtml(base, { pass: "cahier" })).toContain("Choisissez Passage 1 ou Passage 2 pour imprimer.");
  });
});
