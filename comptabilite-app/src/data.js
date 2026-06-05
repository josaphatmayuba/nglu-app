// Données de repli (fallback) — calquées sur le mockup Comptabilité NgoluApp (SYSCOHADA, RDC, FC).

export const fallback = {
  transactions: [
    { id: 1, date: "2026-06-05", particulars: "Encaissement loyer juin — J. Mwepu", amount: 620000, type: "CA", debit: { name: "Caisse" }, credit: { name: "Produits locatifs" }, status: "Validée" },
    { id: 2, date: "2026-06-04", particulars: "Don reçu — bailleur local", amount: 1500000, type: "BQ", debit: { name: "Banque FC" }, credit: { name: "Dons" }, status: "Validée" },
    { id: 3, date: "2026-06-03", particulars: "Achat carburant terrain", amount: 95000, type: "AC", debit: { name: "Carburant" }, credit: { name: "Caisse" }, status: "Validée" },
    { id: 4, date: "2026-06-03", particulars: "Paie juin — provision salaires", amount: 16600000, type: "OD", debit: { name: "Personnel" }, credit: { name: "Banque FC" }, status: "Brouillon" },
    { id: 5, date: "2026-06-02", particulars: "Virement reçu — subvention tranche 2", amount: 8000000, type: "BQ", debit: { name: "Banque FC" }, credit: { name: "Subventions" }, status: "Validée" },
    { id: 6, date: "2026-05-30", particulars: "Frais bancaires", amount: 45000, type: "BQ", debit: { name: "Services bancaires" }, credit: { name: "Banque FC" }, status: "Validée" },
    { id: 7, date: "2026-05-28", particulars: "Vente produits — Boutique Centrale", amount: 890000, type: "VE", debit: { name: "Clients" }, credit: { name: "Ventes" }, status: "Validée" }
  ],
  accounts: [
    { id: 1, name: "Caisse", account: { name: "Trésorerie", type: "Asset" } },
    { id: 2, name: "Banque FC", account: { name: "Trésorerie", type: "Asset" } },
    { id: 10, name: "Charges de personnel", account: { name: "Charges", type: "Expense" } },
    { id: 11, name: "Dons & subventions", account: { name: "Produits", type: "Revenue" } }
  ],
  mainAccounts: [
    { id: 1, name: "Capitaux", type: "Equity" }, { id: 2, name: "Actif", type: "Asset" },
    { id: 3, name: "Passif", type: "Liability" }, { id: 4, name: "Produits", type: "Revenue" }, { id: 5, name: "Charges", type: "Expense" }
  ],
  trialBalance: { match: true, totalDebit: 160050000, totalCredit: 160050000, debits: [], credits: [] },
  balanceSheet: { match: true, totalAsset: 62050000, totalLiability: 11050000, totalEquity: 51000000, assets: [], liabilities: [], equity: [] },
  incomeStatement: { totalRevenue: 134000000, totalExpense: 98000000, profit: 36000000, revenue: [], expense: [] }
};

export const journaux = [
  { code: "CA", name: "Caisse (CA)", mvts: 38, val: "2,1 M FC", label: "Solde", icon: "coins", tone: "accent" },
  { code: "BQ", name: "Banque FC (BQ)", mvts: 21, val: "39,1 M FC", label: "Solde", icon: "landmark", tone: "accent" },
  { code: "BU", name: "Banque USD (BU)", mvts: 12, val: "18,4 k$", label: "Solde", icon: "dollarSign", tone: "accent" },
  { code: "VE", name: "Ventes (VE)", mvts: 26, val: "22,7 M FC", label: "Cumul", icon: "trendingUp", tone: "emerald", valClass: "pos" },
  { code: "AC", name: "Achats (AC)", mvts: 19, val: "16,6 M FC", label: "Cumul", icon: "trendingDown", tone: "rose", valClass: "neg" },
  { code: "OD", name: "Opérations div. (OD)", mvts: 7, val: "Régularisations & paie", label: "", icon: "shuffle", tone: "ink" }
];

export const journalCaisse = [
  { date: "04/06", piece: "CA-0142", label: "Encaissement loyer — bail LEASE-018", debit: 620000, credit: null },
  { date: "03/06", piece: "CA-0141", label: "Achat carburant — mission terrain", debit: null, credit: 95000 },
  { date: "03/06", piece: "CA-0140", label: "Don en espèces — bailleur local", debit: 1500000, credit: null },
  { date: "02/06", piece: "CA-0139", label: "Fournitures de bureau", debit: null, credit: 48000 }
];

export const ecritures = [
  { date: "05/06", journal: "CA", label: "Encaissement loyer juin — J. Mwepu", amount: 620000, status: "Validée" },
  { date: "04/06", journal: "BQ", label: "Don reçu — bailleur local", amount: 1500000, status: "Validée" },
  { date: "03/06", journal: "AC", label: "Achat carburant terrain", amount: 95000, status: "Validée" },
  { date: "03/06", journal: "OD", label: "Paie juin — provision salaires", amount: 16600000, status: "Brouillon" },
  { date: "02/06", journal: "BQ", label: "Virement reçu — subvention tranche 2", amount: 8000000, status: "Validée" },
  { date: "30/05", journal: "BQ", label: "Frais bancaires", amount: 45000, status: "Validée" },
  { date: "28/05", journal: "VE", label: "Vente produits — Boutique Centrale", amount: 890000, status: "Validée" }
];

export const planComptable = [
  { grp: "Classe 1 — Capitaux propres", rows: [
    { num: "101", name: "Capital / fonds associatif", type: "Capitaux", chip: "accent-soft", solde: "15 000 000" },
    { num: "120", name: "Résultat de l'exercice", type: "Capitaux", chip: "accent-soft", solde: "+6 200 000", pos: true }
  ] },
  { grp: "Classe 4 — Tiers", rows: [
    { num: "401", name: "Fournisseurs", type: "Passif", chip: "rose-soft", solde: "3 400 000" },
    { num: "411", name: "Clients / locataires", type: "Actif", chip: "emerald-soft", solde: "2 150 000" }
  ] },
  { grp: "Classe 5 — Trésorerie", rows: [
    { num: "521", name: "Banque FC", type: "Actif", chip: "emerald-soft", solde: "39 100 000" },
    { num: "571", name: "Caisse", type: "Actif", chip: "emerald-soft", solde: "2 100 000" }
  ] },
  { grp: "Classe 6 & 7 — Charges & produits", rows: [
    { num: "661", name: "Charges de personnel (salaires)", type: "Charges", chip: "rose-soft", solde: "52 000 000" },
    { num: "706", name: "Produits locatifs", type: "Produits", chip: "emerald-soft", solde: "7 400 000" },
    { num: "754", name: "Dons & subventions", type: "Produits", chip: "emerald-soft", solde: "118 000 000" }
  ] }
];

export const types = [
  { name: "Encaissement loyer", sens: "Entrée", debit: "521 · Banque", credit: "706 · Produits locatifs", journal: "BQ", ana: "Immobilier" },
  { name: "Don en espèces", sens: "Entrée", debit: "571 · Caisse", credit: "754 · Dons", journal: "CA", ana: "Collecte" },
  { name: "Subvention bailleur", sens: "Entrée", debit: "521 · Banque", credit: "754 · Subventions", journal: "BQ", ana: "Par projet" },
  { name: "Vente de produits", sens: "Entrée", debit: "411 · Clients", credit: "701 · Ventes", journal: "VE", ana: "Commercial" },
  { name: "Paiement salaires", sens: "Sortie", debit: "661 · Personnel", credit: "521 · Banque", journal: "OD", ana: "RH / projet" },
  { name: "Achat carburant", sens: "Sortie", debit: "605 · Carburant", credit: "571 · Caisse", journal: "CA", ana: "Logistique" },
  { name: "Achat fournitures", sens: "Sortie", debit: "604 · Fournitures", credit: "401 · Fournisseurs", journal: "AC", ana: "Fonctionnement" },
  { name: "Frais bancaires", sens: "Sortie", debit: "631 · Services bancaires", credit: "521 · Banque", journal: "BQ", ana: "Structure" }
];

export const grandLivreAccounts = [
  { code: "521", name: "Banque FC", solde: "39 100 000 FC" },
  { code: "571", name: "Caisse" }, { code: "411", name: "Clients" }, { code: "661", name: "Personnel" }
];
export const grandLivre = [
  { date: "", piece: "", label: "Report à nouveau au 01/06", debit: null, credit: null, solde: 47545000, report: true },
  { date: "02/06", piece: "BQ-031", label: "Subvention bailleur — tranche 2", debit: 8000000, credit: null, solde: 55545000 },
  { date: "29/05", piece: "BQ-030", label: "Encaissement chèque loyer", debit: 1240000, credit: null, solde: 56785000 },
  { date: "31/05", piece: "OD-014", label: "Virement salaires mai", debit: null, credit: 16200000, solde: 40585000 },
  { date: "30/05", piece: "BQ-029", label: "Frais bancaires", debit: null, credit: 45000, solde: 40540000 },
  { date: "28/05", piece: "BQ-028", label: "Achat équipement terrain", debit: null, credit: 1440000, solde: 39100000 }
];

export const tresorerieComptes = [
  { name: "Caisse", icon: "coins", val: "2,1 M FC", sub: "dernier mvt aujourd'hui", subTone: "" },
  { name: "Banque FC", icon: "landmark", val: "39,1 M FC", sub: "3 lignes à pointer", subTone: "amber" },
  { name: "Banque USD", icon: "dollarSign", val: "18,4 k$", sub: "rapprochée", subTone: "emerald" }
];
export const tresorerieMvts = [
  { date: "02/06", label: "Subvention bailleur — tranche 2", entree: 8000000, sortie: null, pointe: true },
  { date: "31/05", label: "Virement salaires mai", entree: null, sortie: 16200000, pointe: true },
  { date: "30/05", label: "Frais bancaires", entree: null, sortie: 45000, pointe: false },
  { date: "29/05", label: "Encaissement chèque loyer", entree: 1240000, sortie: null, pointe: false }
];

export const tva = [
  { taux: "16 % — standard", base: 22700000, tva: 3632000, sens: "Collectée", chip: "emerald", cls: "pos" },
  { taux: "16 % — sur achats", base: 8812000, tva: 1410000, sens: "Déductible", chip: "rose", cls: "neg" },
  { taux: "0 % — exonéré (dons)", base: 118000000, tva: null, sens: "Exonéré", chip: "ink" }
];

export const tiers = [
  { name: "Joseph Mwepu (loyer)", total: 620000, nonEchu: 620000, d30: null, d60: null, plus60: null },
  { name: "Boutique Centrale (vente)", total: 890000, nonEchu: 600000, d30: 290000, d60: null, plus60: null },
  { name: "Patrick Kabongo (loyer)", total: 640000, nonEchu: null, d30: null, d60: 300000, plus60: 340000 }
];

export const immobilisations = [
  { name: "Véhicule pickup Toyota", an: "2023", brute: 20000000, duree: "5 ans", dot: 4000000, amort: 12000000, vnc: 8000000 },
  { name: "Groupe électrogène", an: "2024", brute: 6500000, duree: "5 ans", dot: 1300000, amort: 2600000, vnc: 3900000 },
  { name: "Ordinateurs (lot)", an: "2024", brute: 4200000, duree: "3 ans", dot: 1400000, amort: 2800000, vnc: 1400000 },
  { name: "Mobilier de bureau", an: "2021", brute: 11000000, duree: "10 ans", dot: 1100000, amort: 5600000, vnc: 5400000 }
];

export const analytiqueCards = [
  { name: "Programme Kongo Central", bailleur: "Fondation X", pct: 72, depense: "7,6 M", budget: "10,5 M FC", grad: "grad-accent", chip: "accent-soft" },
  { name: "Programme Kinshasa", bailleur: "Union Européenne", pct: 48, depense: "9,6 M", budget: "20 M FC", grad: "grad-emerald", chip: "emerald-soft" },
  { name: "Fonctionnement / structure", bailleur: "Fonds propres", pct: 91, depense: "5,0 M", budget: "5,5 M FC", grad: "amber", chip: "amber", warn: true }
];
export const analytiqueRows = [
  { axe: "Programme Kongo Central", prod: 10500000, charge: 7600000, solde: 2900000 },
  { axe: "Programme Kinshasa", prod: 20000000, charge: 9600000, solde: 10400000 },
  { axe: "Activité locative (Domus)", prod: 7400000, charge: 2200000, solde: 5200000 },
  { axe: "Fonctionnement / structure", prod: null, charge: 5000000, solde: -5000000 }
];

export const budgetLines = [
  { name: "Charges de personnel", txt: "52,0 / 80,0 M · 65 %", pct: 65, grad: "grad-accent" },
  { name: "Activités terrain & logistique", txt: "31,0 / 50,0 M · 62 %", pct: 62, grad: "grad-accent" },
  { name: "Fonctionnement & admin", txt: "15,0 / 16,0 M · 94 %", pct: 94, grad: "rose", warn: true },
  { name: "Investissements / équipement", txt: "9,0 / 14,0 M · 64 %", pct: 64, grad: "grad-emerald" }
];

export const cashflowPlan = [
  { mois: "Juillet", debut: 41200000, entrees: 9500000, sorties: 24600000, fin: 26100000 },
  { mois: "Août", debut: 26100000, entrees: 9500000, sorties: 22000000, fin: 13600000, warn: true },
  { mois: "Septembre", debut: 13600000, entrees: 9500000, sorties: 8000000, fin: 15100000 }
];

export const resultat = {
  produits: [["Dons & subventions", 118000000], ["Produits locatifs", 7400000], ["Autres produits", 8600000]],
  totalProduits: 134000000,
  charges: [["Charges de personnel", 52000000], ["Activités terrain & logistique", 31000000], ["Fonctionnement & admin", 15000000]],
  totalCharges: 98000000,
  resultat: 36000000
};
export const bilan = {
  actif: [["Immobilisations", 18700000], ["Créances (clients/locataires)", 2150000], ["Trésorerie (caisse + banques)", 41200000]],
  totalActif: 62050000,
  passif: [["Fonds associatif", 15000000], ["Résultat de l'exercice", 36000000], ["Dettes (fournisseurs, etc.)", 11050000]],
  totalPassif: 62050000
};
export const balanceGenerale = [
  { num: "101", name: "Fonds associatif", debit: null, credit: 15000000 },
  { num: "211", name: "Immobilisations", debit: 18700000, credit: null },
  { num: "401", name: "Fournisseurs", debit: null, credit: 3400000 },
  { num: "411", name: "Clients / locataires", debit: 2150000, credit: null },
  { num: "16x", name: "Autres dettes", debit: null, credit: 7650000 },
  { num: "521", name: "Banque FC", debit: 39100000, credit: null },
  { num: "571", name: "Caisse", debit: 2100000, credit: null },
  { num: "661", name: "Charges de personnel", debit: 52000000, credit: null },
  { num: "60-62", name: "Autres charges", debit: 46000000, credit: null },
  { num: "706", name: "Produits locatifs", debit: null, credit: 7400000 },
  { num: "70x", name: "Autres produits", debit: null, credit: 8600000 },
  { num: "754", name: "Dons & subventions", debit: null, credit: 118000000 }
];
export const flux = [
  { sec: "Activités opérationnelles", rows: [["Résultat de l'exercice", "+36 000 000", "pos"], ["+ Dotations aux amortissements", "+4 200 000", "pos"], ["± Variation du BFR", "+1 000 000", ""]], total: ["Flux opérationnels", "+41 200 000", "pos"] },
  { sec: "Activités d'investissement", rows: [["Acquisitions d'immobilisations", "−9 000 000", "neg"]], total: ["Flux d'investissement", "−9 000 000", "neg"] },
  { sec: "Activités de financement", rows: [["Subventions d'équipement reçues", "+3 000 000", "pos"]], total: ["Flux de financement", "+3 000 000", "pos"] }
];
