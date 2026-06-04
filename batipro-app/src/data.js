export const projects = [
  {
    id: 1,
    code: "BAT-2026-001",
    name: "Residence Kasa-Vubu",
    client: "Groupe Mbuyi",
    manager: "Jean Kabongo",
    status: "En cours",
    progress: 62,
    budget: 185000,
    spent: 112400,
    due: "2026-09-18",
    location: "Kinshasa",
    risk: "Moyen"
  },
  {
    id: 2,
    code: "BAT-2026-002",
    name: "Depot logistique Limete",
    client: "TransCongo",
    manager: "Aline Tshimanga",
    status: "Planifie",
    progress: 18,
    budget: 94000,
    spent: 12600,
    due: "2026-11-04",
    location: "Limete",
    risk: "Faible"
  },
  {
    id: 3,
    code: "BAT-2026-003",
    name: "Renovation clinique Ngaliema",
    client: "Fondation Sante Plus",
    manager: "Patrick Ilunga",
    status: "Urgent",
    progress: 41,
    budget: 72000,
    spent: 48800,
    due: "2026-07-22",
    location: "Ngaliema",
    risk: "Eleve"
  }
];

export const tasks = [
  { id: 1, projectId: 1, label: "Coffrage dalle R+1", owner: "Equipe beton", status: "En cours", date: "2026-06-04" },
  { id: 2, projectId: 1, label: "Reception ciment 32.5", owner: "Logistique", status: "A valider", date: "2026-06-04" },
  { id: 3, projectId: 3, label: "Pose cloisons bloc operatoire", owner: "Second oeuvre", status: "Bloque", date: "2026-06-05" },
  { id: 4, projectId: 2, label: "Implantation topographique", owner: "Geometre", status: "Planifie", date: "2026-06-06" }
];

export const materials = [
  { name: "Ciment", unit: "sacs", stock: 840, min: 500, reserved: 220 },
  { name: "Fer a beton 12mm", unit: "barres", stock: 1260, min: 900, reserved: 410 },
  { name: "Briques", unit: "pieces", stock: 18400, min: 12000, reserved: 5300 },
  { name: "Carrelage", unit: "m2", stock: 320, min: 450, reserved: 180 }
];

export const crews = [
  { name: "Equipe beton", people: 14, site: "Residence Kasa-Vubu", status: "Actif" },
  { name: "Second oeuvre", people: 9, site: "Clinique Ngaliema", status: "Actif" },
  { name: "Logistique", people: 5, site: "Multi-sites", status: "Actif" },
  { name: "Electricite", people: 6, site: "Depot Limete", status: "Disponible" }
];
