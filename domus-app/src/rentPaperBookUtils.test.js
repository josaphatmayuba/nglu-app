import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { PAPER_BOOK_CSS, buildLeaseYears, conditionsSentence, currentLeaseYearStart, defaultPaperYears, firstMonthProrata, imposeBooklet, imposeCutStack, paperBookHtml, paperBookModel } from "./rentPaperBookUtils.js";

// Date figée : l'année 1 du carnet dépend de la date du jour (année de bail en cours).
beforeAll(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 11)); });
afterAll(() => { vi.useRealTimers(); });

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
    expect(html2.match(/class="sheet /g)).toHaveLength(8);
    expect(paperBookHtml(base, { pass: "2", duplicate: false }).match(/class="sheet /g)).toHaveLength(4);
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
  it("6 pages, 3 liasses, couverture 2 ans, renvois du guide renumerotes", () => {
    const p1 = paperBookHtml(base, { pass: "1", years: 2 });
    const p2 = paperBookHtml(base, { pass: "2", years: 2, duplicate: true });
    expect(p1).toContain("Durée : 2 ans");
    expect(p1).toContain("juin 2028");
    expect(p1).not.toContain("juin 2029");
    expect(p1).toContain("page 4.");
    expect(p1).toContain("Départ :</b> page 5");
    expect(p1).toContain("expliquez page 6.");
    expect(p2).toContain("3 feuilles A4");
    expect(p2).toContain("Liasse 3 ");
    expect(p2).not.toContain("Liasse 4 ");
    expect(p2).toContain("6/6");
    expect(p2).not.toContain("/8<");
    expect(p2).not.toContain("année 3 du bail");
    expect((p2.match(/class="sheet/g) || []).length).toBe(6);
  });
  it("3 ans : 8 pages, 4 liasses", () => {
    const p2 = paperBookHtml(base, { pass: "2", years: 3 });
    expect(p2).toContain("4 feuilles A4");
    expect(p2).toContain("8/8");
    expect((p2.match(/class="sheet/g) || []).length).toBe(8);
  });
});

describe("cahier complet en une impression", () => {
  const pages = (h) => [...h.matchAll(/pages (\d+) et (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  it("2 ans : 4 feuilles blanches puis 5 roses (le bailleur a guide + exemple en plus)", () => {
    const h = paperBookHtml(base, { pass: "complet", years: 2, duplicate: true });
    expect((h.match(/class="sheet/g) || []).length).toBe(9);
    expect(h).toContain("4 feuilles blanches (locataire) et 5 feuilles à points rouges (bailleur)");
    expect(pages(h)).toEqual([[1, 5], [2, 6], [3, 7], [4, 8], [1, 6], [2, 7], [3, 8], [4, 9], [5, 10]]);
    expect(h).toContain("Exemplaire du locataire");
    expect(h).toContain("Exemplaire du bailleur");
    expect(h).toContain("Dos du carnet");
    expect(h).toContain("6/6");
  });
  it("3 ans : 5 feuilles blanches (cahier coupe)", () => {
    const h = paperBookHtml({ ...base }, { pass: "complet", years: 3, duplicate: false });
    expect((h.match(/class="sheet/g) || []).length).toBe(5);
    expect(h).toContain("Cahier complet en une seule impression, 5 feuilles blanches (locataire)");
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
  it("2 ans, cahier du locataire (defaut) : 2 feuilles A/B, 8 pages sans Notes, couverture page 1, dos page 8", () => {
    const h = paperBookHtml(base, { pass: "plie", years: 2 });
    expect((h.match(/class="sheet fold/g) || []).length).toBe(4);
    expect(sides(h)).toEqual(["A 8-1", "B 2-7", "A 6-3", "B 4-5"]);
    expect(h).not.toContain("<h2>Notes<\/h2>");
    expect(h).toContain("Exemplaire du locataire");
    expect(h).not.toContain("Exemplaire du bailleur");
    expect(h).not.toContain('class="sheet fold dup"');
  });
  it("reperes imprimes : numero de page du cahier et feuille/cote", () => {
    const h = paperBookHtml(base, { pass: "plie", years: 2 });
    for (let n = 1; n <= 8; n++) expect(h).toContain(`<span class="bk">${n}</span>`);
    expect(h).toContain('<span class="fl">Feuille 1 · côté A</span>');
    expect(h).toContain('<span class="fl">Feuille 2 · côté B</span>');
  });
  it("cahier du bailleur seul, puis les deux (blanches puis rouges)", () => {
    const b = paperBookHtml(base, { pass: "plie", years: 2, copy: "landlord" });
    expect(b).toContain("Exemplaire du bailleur");
    expect((b.match(/class="sheet fold dup"/g) || []).length).toBe(6);
    const both = paperBookHtml(base, { pass: "plie", years: 2, copy: "both" });
    const caps = [...both.matchAll(/(blanche|rouges) \(cahier/g)].map((m) => m[1]);
    expect(caps).toEqual([...Array(4).fill("blanche"), ...Array(6).fill("rouges")]);
  });
  it("chaque page (sauf couverture) dit à qui est le cahier", () => {
    ["coupe", "pleine", "simple", "plie"].forEach((pass) => {
      const t = paperBookHtml(base, { pass, years: 2, copy: "tenant" });
      const pages = (t.match(/class="a5/g) || []).length;
      expect((t.match(/class="tag">Cahier du locataire/g) || []).length).toBe(pages - 1);
      const b = paperBookHtml(base, { pass, years: 2, copy: "landlord" });
      const pagesB = (b.match(/class="a5/g) || []).length;
      expect((b.match(/class="tag">Cahier du bailleur/g) || []).length).toBe(pagesB - 1);
    });
  });
  it("3 ans : 10 pages + 2 Notes de remplissage = 12 (plie)", () => {
    const h = paperBookHtml(base, { pass: "plie", years: 3 });
    expect((h.match(/class="sheet fold/g) || []).length).toBe(6);
    expect((h.match(/<h2>Notes<\/h2>/g) || []).length).toBe(3); // 1 page numérotée (année impaire) + 2 de remplissage
  });
  it("recto-verso a la main : cotes A seuls puis cotes B seuls", () => {
    expect(sides(paperBookHtml(base, { pass: "plie-r", years: 2 }))).toEqual(["A 8-1", "A 6-3"]);
    expect(sides(paperBookHtml(base, { pass: "plie-v", years: 2 }))).toEqual(["B 2-7", "B 4-5"]);
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
  it("defaut : 2 ans = 4 feuilles recto, feuille i = devant 2i-1 / derriere 2i", () => {
    const h = paperBookHtml(base, { pass: "simple", years: 2 });
    expect((h.match(/class="sheet fold"/g) || []).length).toBe(4);
    expect(caps(h)).toEqual(["1:1/2", "2:3/4", "3:5/6", "4:7/8"]);
    expect(h).toContain("au recto seulement");
    for (let n = 1; n <= 8; n++) expect(h).toContain(`<span class="bk">${n}</span>`);
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
    expect(p1).toContain('class="a5 covpage dup rdots"');
    expect(p1).toContain('class="sheet dup"');
    expect(paperBookHtml(base, { pass: "cahier", years: 2 })).toContain('class="a5 covpage dup rdots"');
    expect((h.match(/class="sheet fold( dup)?"/g) || []).length).toBe(9);
  });
  it("3 ans : 5 feuilles", () => {
    expect((paperBookHtml(base, { pass: "simple", years: 3 }).match(/class="sheet fold"/g) || []).length).toBe(5);
  });
});

describe("cahier relie : renvois du guide = numeros du cahier", () => {
  it("2 ans, cahier du bailleur : hausses p.7, depart p.8, corrections p.9", () => {
    const h = paperBookHtml(base, { years: 2, copy: "landlord" });
    expect(h).toContain("Garantie :</b> page 7.");
    expect(h).toContain("Départ :</b> page 8");
    expect(h).toContain("expliquez page 9.");
    expect(h).toContain("notez-la page 7");
  });
  it("cahier coupe et passages : numerotation inchangee", () => {
    expect(paperBookHtml(base, { pass: "2", years: 2 })).toContain("6/6");
    expect(paperBookHtml(base, { pass: "1", years: 2 })).toContain("page 4.");
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
  it("2 ans : 8 feuilles portrait dans l'ordre 1..8, sans copie ; le bailleur a guide + exemple (10)", () => {
    const h = paperBookHtml(base, { pass: "pleine", years: 2 });
    expect((h.match(/class="sheet full"/g) || []).length).toBe(8);
    expect([...h.matchAll(/<span class="bk">(\d+)<\/span>/g)].map((m) => +m[1])).toEqual(Array.from({ length: 8 }, (_, i) => i + 1));
    expect(h).toContain("Exemplaire du locataire");
    expect(h).not.toMatch(/cahier rose|se copie|dup/);
    expect(h).not.toContain("Comment remplir ce carnet");
    expect(h).not.toContain("Exemple d'une page remplie");
    const b = paperBookHtml(base, { pass: "pleine", years: 2, copy: "landlord" });
    expect((b.match(/class="sheet full/g) || []).length).toBe(10);
    expect(b).toContain("Comment remplir ce carnet");
    expect(b).toContain("Exemple d'une page remplie");
    expect(b).toContain("Garantie :</b> page 7.");
  });
  it("bailleur et les deux ; 3 ans = 10 feuilles ; Letter", () => {
    expect(paperBookHtml(base, { pass: "pleine", years: 2, copy: "landlord" })).toContain("Exemplaire du bailleur");
    expect((paperBookHtml(base, { pass: "pleine", years: 2, copy: "both" }).match(/class="sheet full( dup)?"/g) || []).length).toBe(18);
    expect((paperBookHtml(base, { pass: "pleine", years: 3 }).match(/class="sheet full"/g) || []).length).toBe(10);
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
  it("2 ans : 4 feuilles, feuille i = pages 2i-1 / 2i, numeros 1..8 dans l'ordre, sans copie", () => {
    const h = paperBookHtml(base, { years: 2 });
    expect((h.match(/class="sheet cut"/g) || []).length).toBe(4);
    expect([...h.matchAll(/<span class="bk">(\d+)<\/span>/g)].map((m) => +m[1])).toEqual(Array.from({ length: 8 }, (_, i) => i + 1));
    expect([...h.matchAll(/cahier du locataire · pages (\d+) et (\d+)/g)].map((m) => `${m[1]}-${m[2]}`)).toEqual(["1-2", "3-4", "5-6", "7-8"]);
    expect(h).not.toMatch(/cahier rose|se copie|dup/);
    expect(h).not.toContain("p-guide");
    expect(paperBookHtml(base, { years: 2, copy: "landlord" })).toContain("Garantie :</b> page 7.");
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
  it("phrase complete du QR sur Loyers, signature raccourcie, pied de page Bail", () => {
    const rent = html.split('<div class="a5 ').filter((p) => p.includes("p-rent") && p.includes("Loyers, année 1"))[0];
    for (const page of [rent]) {
      expect(page).toContain("Scannez pour envoyer la photo de cette page à Domus.");
      expect(page).toContain("Signature de qui reçoit");
      expect(page).not.toContain("reçoit l'argent");
    }
    expect(rent).toMatch(/class="foot"><span>Carnet [^<]*· Bail /);
    expect(rent).toContain("$ ou FC + taux");
  });
  it("cahier du bailleur : signature du bailleur et du locataire", () => {
    for (const pass of ["coupe", "pleine", "simple", "plie"]) {
      const guide = paperBookHtml(base, { pass, years: 2, copy: "landlord" }).split('<div class="a5 ').filter((p) => p.includes("p-guide"));
      expect(guide.length).toBeGreaterThan(0);
      for (const page of guide) expect(page).not.toContain("Signature de qui reçoit");
    }
    const pages = paperBookHtml(base, { pass: "coupe", years: 2, copy: "landlord" }).split('<div class="a5 ').filter((p) => p.includes("p-rent"));
    for (const page of pages) expect(page).not.toContain("Signature de qui reçoit");
    expect(pages.some((p) => p.includes("Signature du bailleur") && p.includes("Signature du locataire"))).toBe(true);
  });
  it("classes de page ajoutees a cote de dup", () => {
    expect(paperBookHtml(base, { pass: "coupe", years: 2, copy: "landlord" })).toContain('class="a5 p-rent"');
    for (const c of ["p-rent", "p-cond", "p-end"]) expect(html).toMatch(new RegExp(`class="a5[^"]* ${c}"`));
    expect(html).not.toContain("p-water");
    expect(html).not.toContain("p-guide");
    expect(paperBookHtml(base, { pass: "coupe", years: 2, copy: "landlord" })).toMatch(/class="a5[^"]* p-guide"/);
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

describe("annee 1 = annee de bail en cours", () => {
  const today = new Date(2026, 10, 11); // 11 nov. 2026
  it("bail recent : inchange", () => {
    expect(currentLeaseYearStart("2026-07-19", today)).toBe("2026-07");
    expect(currentLeaseYearStart("2025-12-01", today)).toBe("2025-12");
  });
  it("bail de plus d'un an : dernier anniversaire", () => {
    expect(currentLeaseYearStart("2025-07-19", today)).toBe("2026-07");
    expect(currentLeaseYearStart("2025-11-01", today)).toBe("2026-11");
    expect(currentLeaseYearStart("2024-03-05", today)).toBe("2026-03");
    expect(currentLeaseYearStart(null, today)).toBeNull();
  });
  it("carnet : l'annee 1 commence a l'annee en cours, sans prorata", () => {
    const old = { ...base, startDate: "2025-07-19" };
    const h = paperBookHtml(old, { pass: "pleine", years: 2, today });
    expect(h).toContain("Loyers, année 1 du bail");
    expect(h).toContain("juil. 2026 → juin 2027");
    expect(h).not.toContain("juil. 2025");
    expect(h).not.toContain("13 j");
    expect(h).toContain("entrée le 19/07/2025");
  });
});

describe("montants de l'annee prochaine", () => {
  it("annee 1 a cheval sur 2 annees civiles : pas de montant a payer pour les mois de l'annee suivante", () => {
    const h = paperBookHtml({ ...base, startDate: "2026-09-01", schedule: [] }, { pass: "coupe", years: 2, today: new Date(2026, 10, 11) });
    expect(h).toMatch(/Décembre<small>2026<\/small><\/td><td class="due">[^<]*\d/);
    expect(h).toMatch(/Janvier<small>2027<\/small><\/td><td class="due"><\/td>/);
    expect(h).toMatch(/Août<small>2027<\/small><\/td><td class="due"><\/td>/);
  });
});
