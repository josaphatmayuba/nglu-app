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
    expect(html2).toContain("Signature de qui reçoit");
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
    expect(p1).toContain("page 6.");
    expect(p1).toContain("Départ :</b> page 7");
    expect(p1).toContain("expliquez page 8.");
    expect(p2).toContain("4 feuilles A4");
    expect(p2).toContain("Liasse 4 ");
    expect(p2).not.toContain("Liasse 5 ");
    expect(p2).toContain("8/8");
    expect(p2).not.toContain("/10<");
    expect(p2).not.toContain("année 3 du bail");
    expect((p2.match(/class="sheet/g) || []).length).toBe(8);
  });
  it("3 ans inchange : 10 pages, 5 liasses", () => {
    const p2 = paperBookHtml(base, { pass: "2", years: 3 });
    expect(p2).toContain("5 feuilles A4");
    expect(p2).toContain("10/10");
    expect((p2.match(/class="sheet/g) || []).length).toBe(10);
  });
});

describe("cahier complet en une impression", () => {
  const pages = (h) => [...h.matchAll(/pages (\d+) et (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  it("2 ans : 6 feuilles x blanc/rose, couverture -> dos, gauche n / droite n+6", () => {
    const h = paperBookHtml(base, { pass: "complet", years: 2, duplicate: true });
    expect((h.match(/class="sheet/g) || []).length).toBe(12);
    expect(h).toContain("6 feuilles A4");
    const p = pages(h).filter((_, i) => i % 2 === 0);
    expect(p).toEqual([[1, 7], [2, 8], [3, 9], [4, 10], [5, 11], [6, 12]]);
    expect(h).toContain("Exemplaire du locataire");
    expect(h).toContain("Exemplaire du bailleur");
    expect(h).toContain("Dos du carnet");
    expect(h).toContain("8/8");
  });
  it("3 ans : 7 feuilles (cahier coupe)", () => {
    const h = paperBookHtml({ ...base }, { pass: "complet", years: 3, duplicate: false });
    expect((h.match(/class="sheet/g) || []).length).toBe(7);
    expect(h).toContain("Cahier complet en une seule impression, 7 feuilles A4");
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
  it("2 ans, cahier du locataire (defaut) : 3 feuilles A/B, 12 pages sans Notes, couverture page 1, dos page 12", () => {
    const h = paperBookHtml(base, { pass: "plie", years: 2 });
    expect((h.match(/class="sheet fold/g) || []).length).toBe(6);
    expect(sides(h)).toEqual(["A 12-1", "B 2-11", "A 10-3", "B 4-9", "A 8-5", "B 6-7"]);
    expect(h).not.toContain("<h2>Notes<\/h2>");
    expect(h).toContain("Exemplaire du locataire");
    expect(h).not.toContain("Exemplaire du bailleur");
    expect(h).not.toContain('class="sheet fold dup"');
  });
  it("reperes imprimes : numero de page du cahier et feuille/cote", () => {
    const h = paperBookHtml(base, { pass: "plie", years: 2 });
    for (let n = 1; n <= 12; n++) expect(h).toContain(`<span class="bk">${n}</span>`);
    expect(h).toContain('<span class="fl">Feuille 1 · côté A</span>');
    expect(h).toContain('<span class="fl">Feuille 3 · côté B</span>');
  });
  it("cahier du bailleur seul, puis les deux (blanches puis roses)", () => {
    const b = paperBookHtml(base, { pass: "plie", years: 2, copy: "landlord" });
    expect(b).toContain("Exemplaire du bailleur");
    expect((b.match(/class="sheet fold dup"/g) || []).length).toBe(6);
    const both = paperBookHtml(base, { pass: "plie", years: 2, copy: "both" });
    const caps = [...both.matchAll(/(blanche|roses) \(cahier/g)].map((m) => m[1]);
    expect(caps).toEqual([...Array(6).fill("blanche"), ...Array(6).fill("roses")]);
  });
  it("3 ans : 14 pages + 2 Notes = 16 (plie)", () => {
    const h = paperBookHtml(base, { pass: "plie", years: 3 });
    expect((h.match(/class="sheet fold/g) || []).length).toBe(8);
    expect((h.match(/<h2>Notes<\/h2>/g) || []).length).toBe(2);
  });
  it("recto-verso a la main : cotes A seuls puis cotes B seuls", () => {
    expect(sides(paperBookHtml(base, { pass: "plie-r", years: 2 }))).toEqual(["A 12-1", "A 10-3", "A 8-5"]);
    expect(sides(paperBookHtml(base, { pass: "plie-v", years: 2 }))).toEqual(["B 2-11", "B 4-9", "B 6-7"]);
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
  it("defaut : 2 ans = 6 feuilles recto, feuille i = devant 2i-1 / derriere 2i", () => {
    const h = paperBookHtml(base, { pass: "simple", years: 2 });
    expect((h.match(/class="sheet fold"/g) || []).length).toBe(6);
    expect(caps(h)).toEqual(["1:1/2", "2:3/4", "3:5/6", "4:7/8", "5:9/10", "6:11/12"]);
    expect(h).toContain("au recto seulement");
    for (let n = 1; n <= 12; n++) expect(h).toContain(`<span class="bk">${n}</span>`);
  });
  it("moitie droite = page devant (impaire), moitie gauche = derriere (paire)", () => {
    const h = paperBookHtml(base, { pass: "simple", years: 2 });
    const first = h.split('<div class="sheet fold">')[1];
    expect(first.indexOf('<span class="bk">2</span>')).toBeLessThan(first.indexOf('<span class="bk">1</span>'));
    expect(first).toContain("Exemplaire du locataire");
  });
  it("sans copie : bailleur en rose pale, pas d'autocopiant ni de carton dans le guide", () => {
    const h = paperBookHtml(base, { pass: "simple", years: 2, copy: "both" });
    expect(h).toContain("sheet fold dup");
    expect(paperBookHtml(base, { pass: "simple", years: 2 })).not.toContain("dup");
    expect(paperBookHtml(base, { years: 2, copy: "landlord" })).toContain("sheet cut dup");
    expect(paperBookHtml(base, { pass: "pleine", years: 2, copy: "landlord" })).toContain("sheet full dup");
    expect(h).toContain("Exemplaire du bailleur");
    expect(h).toContain("la même ligne");
    expect(h).not.toMatch(/cahier rose|page rose|se copie/);
    expect(paperBookHtml(base, { pass: "plie", years: 2, copy: "landlord" })).toContain("dans les deux cahiers");
    const p1 = paperBookHtml(base, { pass: "1", years: 2, duplicate: true });
    expect(p1).toContain('class="a5 covpage dup"');
    expect(p1).toContain('class="sheet dup"');
    expect(paperBookHtml(base, { pass: "cahier", years: 2 })).toContain('class="a5 covpage dup"');
    expect((h.match(/class="sheet fold( dup)?"/g) || []).length).toBe(12);
  });
  it("3 ans : 7 feuilles", () => {
    expect((paperBookHtml(base, { pass: "simple", years: 3 }).match(/class="sheet fold"/g) || []).length).toBe(7);
  });
});

describe("cahier relie : renvois du guide = numeros du cahier", () => {
  it("2 ans simple : hausses p.9, depart p.10, corrections p.11", () => {
    const h = paperBookHtml(base, { years: 2 });
    expect(h).toContain("Garantie :</b> page 9.");
    expect(h).toContain("Départ :</b> page 10");
    expect(h).toContain("expliquez page 11.");
    expect(h).toContain("notez-la page 9");
  });
  it("cahier coupe et passages : numerotation inchangee", () => {
    expect(paperBookHtml(base, { pass: "2", years: 2 })).toContain("8/8");
    expect(paperBookHtml(base, { pass: "1", years: 2 })).toContain("page 6.");
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

describe("feuilles entieres (defaut)", () => {
  it("2 ans : 12 feuilles portrait dans l'ordre 1..12, sans copie, renvois au numero du cahier", () => {
    const h = paperBookHtml(base, { pass: "pleine", years: 2 });
    expect((h.match(/class="sheet full"/g) || []).length).toBe(12);
    expect([...h.matchAll(/<span class="bk">(\d+)<\/span>/g)].map((m) => +m[1])).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(h).toContain("Exemplaire du locataire");
    expect(h).not.toMatch(/cahier rose|se copie|dup/);
    expect(h).toContain("Garantie :</b> page 9.");
  });
  it("bailleur et les deux ; 3 ans = 14 feuilles ; Letter", () => {
    expect(paperBookHtml(base, { pass: "pleine", years: 2, copy: "landlord" })).toContain("Exemplaire du bailleur");
    expect((paperBookHtml(base, { pass: "pleine", years: 2, copy: "both" }).match(/class="sheet full( dup)?"/g) || []).length).toBe(24);
    expect((paperBookHtml(base, { pass: "pleine", years: 3 }).match(/class="sheet full"/g) || []).length).toBe(14);
    expect(paperBookHtml(base, { pass: "pleine", years: 2, paper: "letter" })).toContain('class="paper  letter"');
  });
});

describe("feuilles entieres : dimensions", () => {
  it("Letter portrait : page A5 de 148,5 x 210 mm agrandie x1,33, pour tenir dans 215,9 x 279,4 mm (numero visible)", () => {
    expect(PAPER_BOOK_CSS).toContain(".paper.letter .sheet.full { width: 215.9mm; height: 279.4mm; }");
    expect(PAPER_BOOK_CSS).toContain(".paper.letter .sheet.full .a5 { zoom: 1.33; width: 148.5mm; height: 210mm; margin: 0 auto; }");
    // 210 mm x 1,33 = 279,3 mm <= 279,4 mm : le bas de page (et son numero) reste sur la feuille
    expect(210 * 1.33).toBeLessThanOrEqual(279.4);
    expect(148.5 * 1.33).toBeLessThanOrEqual(215.9);
  });
});

describe("cahier coupe A5 (defaut)", () => {
  it("2 ans : 6 feuilles, feuille i = pages 2i-1 / 2i, numeros 1..12 dans l'ordre, sans copie", () => {
    const h = paperBookHtml(base, { years: 2 });
    expect((h.match(/class="sheet cut"/g) || []).length).toBe(6);
    expect([...h.matchAll(/<span class="bk">(\d+)<\/span>/g)].map((m) => +m[1])).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect([...h.matchAll(/cahier du locataire · pages (\d+) et (\d+)/g)].map((m) => `${m[1]}-${m[2]}`)).toEqual(["1-2", "3-4", "5-6", "7-8", "9-10", "11-12"]);
    expect(h).not.toMatch(/cahier rose|se copie|dup/);
    expect(h).toContain("Garantie :</b> page 9.");
  });
  it("ligne de coupe au milieu du papier ; bailleur ; Letter", () => {
    expect(PAPER_BOOK_CSS).toContain(".paper .sheet.cut::after { left: 50%;");
    expect(PAPER_BOOK_CSS).toContain(".paper .sheet.cut, .paper .sheet.fold { width: 100vw; height: 100vh; }");
    expect(paperBookHtml(base, { years: 2, copy: "landlord" })).toContain("Exemplaire du bailleur");
    expect(paperBookHtml(base, { years: 2, paper: "letter" })).toContain("letter");
  });
});

describe("carnet lisible : tailles et textes", () => {
  const html = paperBookHtml(base, { pass: "coupe", years: 2 });
  it("phrase complete du QR sur Loyers et Eau, signature raccourcie, pied de page Bail", () => {
    const rent = html.split('<div class="a5 ').filter((p) => p.includes("p-rent") && p.includes("Loyers, année 1"))[0];
    const water = html.split('<div class="a5 ').filter((p) => p.includes("p-water"))[0];
    for (const page of [rent, water]) {
      expect(page).toContain("Scannez pour envoyer la photo de cette page à Domus.");
      expect(page).toContain("Signature de qui reçoit");
      expect(page).not.toContain("reçoit l'argent");
    }
    expect(rent).toMatch(/class="foot"><span>Carnet [^<]*· Bail /);
    expect(rent).toContain("$ ou FC + taux");
  });
  it("classes de page ajoutees a cote de dup", () => {
    expect(paperBookHtml(base, { pass: "coupe", years: 2, copy: "landlord" })).toContain('class="a5 p-rent"');
    for (const c of ["p-rent", "p-cond", "p-water", "p-end", "p-guide"]) expect(html).toMatch(new RegExp(`class="a5[^"]* ${c}"`));
    expect(PAPER_BOOK_CSS).toContain(".paper .sheet.dup .a5, .paper .a5.dup");
  });
  it("p-misc : Hausses, Corrections et Notes agrandies ; exemple avec colonnes adaptees", () => {
    const h = paperBookHtml(base, { pass: "coupe", years: 2, copy: "landlord" });
    expect(h.match(/class="a5 p-misc"/g).length).toBe(2);
    expect(PAPER_BOOK_CSS).toContain(".paper .p-misc th { font-size: 8pt; }");
    expect(PAPER_BOOK_CSS).toContain(".paper .p-misc td { height: 9.6mm; }");
    expect(h).toContain('<table class="ex">');
    expect(PAPER_BOOK_CSS).toContain(".paper .p-rent table.ex .via em .pen { font-size: 7pt;");
  });
  it("A4 pleine page : zoom 1.414", () => {
    expect(PAPER_BOOK_CSS).toContain(".paper .sheet.full .a5 { zoom: 1.414; }");
    expect(PAPER_BOOK_CSS).toContain(".paper .p-rent td { height: 10.6mm; }");
  });
});
