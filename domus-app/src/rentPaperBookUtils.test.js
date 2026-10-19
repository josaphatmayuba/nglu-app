import { describe, expect, it } from "vitest";
import { PAPER_BOOK_CSS, buildLeaseYears, conditionsSentence, defaultPaperYears, firstMonthProrata, imposeBooklet, imposeCutStack, paperBookHtml, paperBookModel } from "./rentPaperBookUtils.js";

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
    expect(paperBookHtml(base, { pass: "cahier" })).toContain("Choisissez « Cahier complet » ou un passage pour imprimer.");
  });
});

describe("carnet 2 ans", () => {
  it("duree par defaut : 2 ans si le bail finit dans 24 mois ou moins, sinon 3 ans", () => {
    expect(defaultPaperYears({ startDate: "2026-07-19" })).toBe(3);
    expect(defaultPaperYears({ startDate: "2026-07-19", endDate: "2028-07-18" })).toBe(2);
    expect(defaultPaperYears({ startDate: "2026-07-19", endDate: "2027-07-18" })).toBe(2);
    expect(defaultPaperYears({ startDate: "2026-07-19", endDate: "2029-07-18" })).toBe(3);
  });
  it("8 pages, 4 liasses, couverture 2 ans, renvois du guide renumerotes", () => {
    const p1 = paperBookHtml(base, { pass: "1", years: 2 });
    const p2 = paperBookHtml(base, { pass: "2", years: 2, duplicate: true });
    expect(p1).toContain("Durée : 2 ans");
    expect(p1).toContain("juin 2028");
    expect(p1).not.toContain("juin 2029");
    expect(p1).toContain("s'écrit page 6.");
    expect(p1).toContain("remplissez la page 7");
    expect(p1).toContain("correction page 8.");
    expect(p2).toContain("4 liasses A4");
    expect(p2).toContain("Liasse 4 ");
    expect(p2).not.toContain("Liasse 5 ");
    expect(p2).toContain("8/8");
    expect(p2).not.toContain("/10<");
    expect(p2).not.toContain("année 3 du bail");
    expect((p2.match(/class="sheet/g) || []).length).toBe(8);
  });
  it("3 ans inchange : 10 pages, 5 liasses", () => {
    const p2 = paperBookHtml(base, { pass: "2", years: 3 });
    expect(p2).toContain("5 liasses A4");
    expect(p2).toContain("10/10");
    expect((p2.match(/class="sheet/g) || []).length).toBe(10);
  });
});

describe("cahier complet en une impression", () => {
  const pages = (h) => [...h.matchAll(/pages (\d+) et (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  it("2 ans : 7 feuilles x blanc/rose, couverture -> dos, gauche n / droite n+7", () => {
    const h = paperBookHtml(base, { pass: "complet", years: 2, duplicate: true });
    expect((h.match(/class="sheet/g) || []).length).toBe(14);
    expect(h).toContain("7 feuilles A4");
    const p = pages(h).filter((_, i) => i % 2 === 0);
    expect(p).toEqual([[1, 8], [2, 9], [3, 10], [4, 11], [5, 12], [6, 13], [7, 14]]);
    expect(h).toContain("Exemplaire du locataire");
    expect(h).toContain("Exemplaire du bailleur");
    expect(h).toContain("Dos du carnet");
    expect(h).toContain("8/8");
  });
  it("3 ans : 8 feuilles (cahier coupe)", () => {
    const h = paperBookHtml({ ...base }, { pass: "complet", years: 3, duplicate: false });
    expect((h.match(/class="sheet/g) || []).length).toBe(8);
    expect(h).toContain("Cahier complet en une seule impression, 8 feuilles A4");
  });
});

describe("cahier plie (livret recto-verso)", () => {
  it("imposition livret 16 pages", () => {
    expect(imposeBooklet(16)).toEqual([
      { recto: [15, 0], verso: [1, 14] },
      { recto: [13, 2], verso: [3, 12] },
      { recto: [11, 4], verso: [5, 10] },
      { recto: [9, 6], verso: [7, 8] },
    ]);
  });
  const sides = (h) => [...h.matchAll(/côté (A|B) · pages (\d+) et (\d+)/g)].map((m) => `${m[1]} ${m[2]}-${m[3]}`);
  it("2 ans, cahier du locataire (defaut) : 4 feuilles A/B, 16 pages dont 2 Notes, couverture page 1, dos page 16", () => {
    const h = paperBookHtml(base, { pass: "plie", years: 2 });
    expect((h.match(/class="sheet fold/g) || []).length).toBe(8);
    expect(sides(h)).toEqual(["A 16-1", "B 2-15", "A 14-3", "B 4-13", "A 12-5", "B 6-11", "A 10-7", "B 8-9"]);
    expect((h.match(/<h2>Notes<\/h2>/g) || []).length).toBe(2);
    expect(h).toContain("Exemplaire du locataire");
    expect(h).not.toContain("Exemplaire du bailleur");
    expect(h).not.toContain('class="sheet fold dup"');
  });
  it("reperes imprimes : numero de page du cahier et feuille/cote", () => {
    const h = paperBookHtml(base, { pass: "plie", years: 2 });
    for (let n = 1; n <= 16; n++) expect(h).toContain(`<span class="bk">${n}</span>`);
    expect(h).toContain('<span class="fl">Feuille 1 · côté A</span>');
    expect(h).toContain('<span class="fl">Feuille 4 · côté B</span>');
  });
  it("cahier du bailleur seul, puis les deux (blanches puis roses)", () => {
    const b = paperBookHtml(base, { pass: "plie", years: 2, copy: "landlord" });
    expect(b).toContain("Exemplaire du bailleur");
    expect((b.match(/class="sheet fold dup"/g) || []).length).toBe(8);
    const both = paperBookHtml(base, { pass: "plie", years: 2, copy: "both" });
    const caps = [...both.matchAll(/(blanche|rose) \(cahier/g)].map((m) => m[1]);
    expect(caps).toEqual([...Array(8).fill("blanche"), ...Array(8).fill("rose")]);
  });
  it("3 ans : 16 pages sans page Notes (plie)", () => {
    const h = paperBookHtml(base, { pass: "plie", years: 3 });
    expect((h.match(/class="sheet fold/g) || []).length).toBe(8);
    expect(h).not.toContain("<h2>Notes</h2>");
  });
  it("recto-verso a la main : cotes A seuls puis cotes B seuls", () => {
    expect(sides(paperBookHtml(base, { pass: "plie-r", years: 2 }))).toEqual(["A 16-1", "A 14-3", "A 12-5", "A 10-7"]);
    expect(sides(paperBookHtml(base, { pass: "plie-v", years: 2 }))).toEqual(["B 2-15", "B 4-13", "B 6-11", "B 8-9"]);
  });
  it("feuille d'essai : 1 feuille recto-verso, C'est bon derriere la page 1", () => {
    const h = paperBookHtml(base, { pass: "plie-essai" });
    expect((h.match(/class="sheet fold/g) || []).length).toBe(2);
    const [a, b] = h.split("Feuille d'essai · côté B");
    expect(a).toContain("Côté A · page 1");
    // cote B, moitie gauche (derriere la page 1 apres retournement bord court) = « C'est bon »
    expect(b.indexOf("C'est bon")).toBeLessThan(b.indexOf("Pas bon"));
  });
});

describe("cahier simple (recto, plier, empiler, sans copie)", () => {
  const caps = (h) => [...h.matchAll(/Feuille (\d+) \/ (\d+) · cahier du (\w+) · devant : page (\d+), derrière : page (\d+)/g)].map((m) => `${m[1]}:${m[4]}/${m[5]}`);
  it("defaut : 2 ans = 7 feuilles recto, feuille i = devant 2i-1 / derriere 2i", () => {
    const h = paperBookHtml(base, { years: 2 });
    expect((h.match(/class="sheet fold"/g) || []).length).toBe(7);
    expect(caps(h)).toEqual(["1:1/2", "2:3/4", "3:5/6", "4:7/8", "5:9/10", "6:11/12", "7:13/14"]);
    expect(h).toContain("au recto seulement");
    for (let n = 1; n <= 14; n++) expect(h).toContain(`<span class="bk">${n}</span>`);
  });
  it("moitie droite = page devant (impaire), moitie gauche = derriere (paire)", () => {
    const h = paperBookHtml(base, { years: 2 });
    const first = h.split('<div class="sheet fold">')[1];
    expect(first.indexOf('<span class="bk">2</span>')).toBeLessThan(first.indexOf('<span class="bk">1</span>'));
    expect(first).toContain("Exemplaire du locataire");
  });
  it("sans copie : pas de rose, pas d'autocopiant ni de carton dans le guide", () => {
    const h = paperBookHtml(base, { years: 2, copy: "both" });
    expect(h).not.toContain("dup");
    expect(h).toContain("Exemplaire du bailleur");
    expect(h).toContain("exactement la même ligne");
    expect(h).not.toMatch(/cahier rose|page rose|se copie/);
    expect((h.match(/class="sheet fold"/g) || []).length).toBe(14);
  });
  it("3 ans : 8 feuilles", () => {
    expect((paperBookHtml(base, { years: 3 }).match(/class="sheet fold"/g) || []).length).toBe(8);
  });
});

describe("cahier relie : renvois du guide = numeros du cahier", () => {
  it("2 ans simple : hausses p.11, depart p.12, corrections p.13", () => {
    const h = paperBookHtml(base, { years: 2 });
    expect(h).toContain("s'écrit page 11.");
    expect(h).toContain("remplissez la page 12");
    expect(h).toContain("correction page 13.");
    expect(h).toContain("Notez la hausse page 11");
  });
  it("cahier coupe et passages : numerotation inchangee", () => {
    expect(paperBookHtml(base, { pass: "2", years: 2 })).toContain("8/8");
    expect(paperBookHtml(base, { pass: "1", years: 2 })).toContain("s'écrit page 6.");
  });
});

describe("papier Letter", () => {
  it("classe letter : feuille et moities aux dimensions Letter", () => {
    const h = paperBookHtml(base, { years: 2, paper: "letter" });
    expect(h.startsWith('<div class="paper  letter">') || h.startsWith('<div class="paper letter">')).toBe(true);
    expect(PAPER_BOOK_CSS).toContain(".paper.letter { --sheet-w: 279.4mm; --sheet-h: 215.9mm; --half-w: 139.7mm; }");
    expect(paperBookHtml(base, { years: 2 })).not.toContain("letter");
  });
});
