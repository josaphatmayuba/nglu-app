// Données de repli (fallback) — utilisées tant que l'API ne répond pas.
// Calquées sur le mockup RH NgoluApp (données fictives, ONG).

export const fallback = {
  staff: [
    { id: 1, firstName: "Joseph", lastName: "Mwepu", username: "jmwepu", designation: { name: "Coordinateur programmes" }, department: { name: "Programmes & terrain" }, currentSalary: 1250000, status: "true" },
    { id: 2, firstName: "Grâce", lastName: "Mbuyi", username: "gmbuyi", designation: { name: "Comptable" }, department: { name: "Finances & compta" }, currentSalary: 980000, status: "true" },
    { id: 3, firstName: "Patrick", lastName: "Kabongo", username: "pkabongo", designation: { name: "Logisticien" }, department: { name: "Logistique" }, currentSalary: 760000, status: "true" },
    { id: 4, firstName: "Sarah", lastName: "Ilunga", username: "silunga", designation: { name: "Chargée de programme" }, department: { name: "Programmes & terrain" }, currentSalary: 1050000, status: "true" },
    { id: 5, firstName: "David", lastName: "Nzuzi", username: "dnzuzi", designation: { name: "Chauffeur" }, department: { name: "Logistique" }, currentSalary: 520000, status: "true" },
    { id: 6, firstName: "Anny", lastName: "Kalala", username: "akalala", designation: { name: "Responsable RH" }, department: { name: "Administration & RH" }, currentSalary: 1400000, status: "true" }
  ],
  designations: [
    { id: 1, name: "Coordinateur programmes" }, { id: 2, name: "Chargé de programme" }, { id: 3, name: "Agent de terrain" },
    { id: 4, name: "Logisticien" }, { id: 5, name: "Chauffeur" }, { id: 6, name: "Magasinier" },
    { id: 7, name: "Comptable" }, { id: 8, name: "Caissier" }, { id: 9, name: "Responsable RH" },
    { id: 10, name: "Assistant administratif" }, { id: 11, name: "Directeur national" }
  ],
  departments: [
    { id: 1, name: "Programmes & terrain", head: "J. Mwepu", count: 16, color: "teal" },
    { id: 2, name: "Logistique", head: "R. Tshibanda", count: 9, color: "sky" },
    { id: 3, name: "Finances & compta", head: "G. Mbuyi", count: 6, color: "emerald" },
    { id: 4, name: "Administration & RH", head: "A. Kalala", count: 5, color: "amber" },
    { id: 5, name: "Direction & coordination", head: "Direction", count: 6, color: "ink" }
  ],
  shifts: [
    { id: 1, name: "Jour", startTime: "08:00:00", endTime: "17:00:00", workHour: 8 },
    { id: 2, name: "Support", startTime: "10:00:00", endTime: "18:00:00", workHour: 8 }
  ],
  awards: [{ id: 1, name: "Employé du mois", description: "Reconnaissance mensuelle" }],
  salaries: [
    { id: 1, userId: 1, salary: 1250000, startDate: "2026-06-01", comment: "Paie mensuelle" },
    { id: 2, userId: 2, salary: 980000, startDate: "2026-06-01", comment: "Paie mensuelle" }
  ]
};

// Avatars couleurs (initiales → fond)
export const AV_COLORS = ["#0d9488", "#0ea5e9", "#7c3aed", "#0891b2", "#f59e0b", "#475569", "#14b8a6", "#e11d48"];

export const presences = [
  { name: "Joseph Mwepu", dept: "Programmes", time: "08:02 → —", status: "Présent", chip: "emerald", av: "#0d9488" },
  { name: "Grâce Mbuyi", dept: "Finances", time: "07:55 → —", status: "Présent", chip: "emerald", av: "#0ea5e9" },
  { name: "Sarah Ilunga", dept: "Programmes", time: "09:18 → —", status: "Retard", chip: "amber", av: "#7c3aed" },
  { name: "David Nzuzi", dept: "Logistique", time: "Mission terrain", status: "Mission", chip: "sky", av: "#0891b2" },
  { name: "Rachel Tshibanda", dept: "Logistique", time: "Non pointé", status: "Absent", chip: "rose", av: "#94a3b8" }
];

export const conges = [
  { name: "Patrick Kabongo", type: "Congé annuel", detail: "28 juin → 12 juil. · 10 j ouvrés", av: "#f59e0b" },
  { name: "Grâce Mbuyi", type: "Congé maladie", detail: "10 juin → 12 juin · 3 j · certificat joint", av: "#0ea5e9" },
  { name: "Sarah Ilunga", type: "Congé maternité", detail: "1 juil. → 22 sept. · 14 semaines", av: "#7c3aed" }
];

export const absents = [
  { name: "Patrick Kabongo", detail: "Congé annuel · revient 12 juil.", av: "#f59e0b" },
  { name: "Franck Mukendi", detail: "Récupération · 1 jour", av: "#0d9488" }
];

export const contrats = [
  { name: "Joseph Mwepu", type: "CDI", chip: "emerald", start: "01/03/2022", end: "—", status: "Actif", sChip: "emerald" },
  { name: "Patrick Kabongo", type: "CDD", chip: "sky", start: "01/02/2026", end: "31/07/2026", status: "Expire < 30 j", sChip: "amber" },
  { name: "Sarah Ilunga", type: "CDI", chip: "emerald", start: "15/09/2023", end: "—", status: "Actif", sChip: "emerald" },
  { name: "Yves Kanku", type: "Consultance", chip: "violet", start: "01/05/2026", end: "31/12/2026", status: "Actif", sChip: "emerald" }
];

export const dossiers = [
  { name: "Joseph Mwepu", cv: 1, id: 1, dip: 1, ctr: 1, cnss: 1, psea: 1 },
  { name: "Grâce Mbuyi", cv: 1, id: 1, dip: 0, ctr: 1, cnss: 1, psea: 1 },
  { name: "Patrick Kabongo", cv: 1, id: 1, dip: 1, ctr: 0, cnss: 1, psea: 0 }
];

export const timesheet = [
  { name: "Joseph Mwepu", kc: 90, kin: 50, fct: 20 },
  { name: "Sarah Ilunga", kc: 120, kin: 20, fct: 20 },
  { name: "Grâce Mbuyi", kc: 40, kin: 40, fct: 80 },
  { name: "David Nzuzi", kc: 60, kin: 80, fct: 20 }
];

export const grille = [
  { poste: "Coordinateur · A3", base: 1100000, ind: 150000, brut: 1250000 },
  { poste: "Chargé de programme · B2", base: 920000, ind: 130000, brut: 1050000 },
  { poste: "Comptable · B1", base: 870000, ind: 110000, brut: 980000 },
  { poste: "Chauffeur · C1", base: 440000, ind: 80000, brut: 520000 }
];

export const frais = [
  { name: "Patrick Kabongo", type: "Frais de mission", amount: 320000, date: "04/06", status: "À valider", chip: "amber" },
  { name: "David Nzuzi", type: "Avance sur salaire", amount: 200000, date: "02/06", status: "En cours", chip: "sky" },
  { name: "Sarah Ilunga", type: "Carburant", amount: 85000, date: "29/05", status: "Remboursé", chip: "emerald" }
];

export const declarations = [
  { org: "CNSS — part employeur", base: 20800000, taux: "13 %", montant: 2704000, ech: "15/07" },
  { org: "CNSS — part salarié", base: 20800000, taux: "5 %", montant: 1040000, ech: "15/07" },
  { org: "INPP", base: 20800000, taux: "2 %", montant: 416000, ech: "15/07" },
  { org: "ONEM", base: 20800000, taux: "0,2 %", montant: 42000, ech: "15/07" },
  { org: "IPR (impôt sur revenus)", base: 22000000, taux: "barème", montant: 1240000, ech: "10/07", warn: true }
];

export const performances = [
  { name: "Joseph Mwepu", role: "Coordinateur programmes", score: 4.4, pct: 88, status: "Évalué", chip: "emerald", bar: "grad-accent" },
  { name: "Grâce Mbuyi", role: "Comptable", score: 4.0, pct: 80, status: "Évalué", chip: "emerald", bar: "grad-accent" },
  { name: "David Nzuzi", role: "Chauffeur", score: 3.0, pct: 60, status: "À revoir", chip: "amber", bar: "amber" },
  { name: "Patrick Kabongo", role: "Logisticien", score: null, pct: 0, status: "En attente", chip: "ink", bar: "ink" }
];

export const formations = [
  { title: "Sauvegarde & PSEA", who: "Tout le personnel · 18 juin", status: "Planifiée", chip: "sky", icon: "shield" },
  { title: "SYSCOHADA — comptabilité ONG", who: "Équipe finances · 25 juin", status: "Planifiée", chip: "sky", icon: "calculator" },
  { title: "Sécurité terrain & premiers secours", who: "Agents terrain · 12 mai", status: "Réalisée", chip: "emerald", icon: "hardHat" }
];

export const recrutement = {
  candidatures: [
    { name: "Esther Lukusa", role: "Agent de terrain" },
    { name: "Yves Kanku", role: "Comptable" },
    { name: "Bijou Ngalula", role: "Agent de terrain" }
  ],
  preselection: [
    { name: "Aimé Banza", role: "Chauffeur" },
    { name: "Nadège Mwamba", role: "Comptable" }
  ],
  entretien: [
    { name: "Aimé Banza", role: "Chauffeur · jeu. 10 h" },
    { name: "Esther Lukusa", role: "Agent terrain · ven. 14 h" }
  ],
  offre: [{ name: "Nadège Mwamba", role: "Offre envoyée", ok: true }]
};
