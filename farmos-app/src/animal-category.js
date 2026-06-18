// Classification d'âge/catégorie d'un animal d'élevage, partagée entre le dashboard
// et l'écran Bâtiments. Logique : le `type` (Truie, Verrat, Porcelet, Cochette…)
// prime ; à défaut, on déduit de la date de naissance + seuils par espèce.
//
// Catégories retournées par animalCategory() :
//   "adulte"        — reproducteur / animal mature
//   "cochette"      — jeune femelle pas encore mise bas (future reproductrice)
//   "engraissement" — animal en croissance destiné à l'abattage
//   "jeune"         — jeune (porcelet, veau, poussin…) sans destination précisée
//   "inconnu"       — ni type ni date exploitables

// Âge (jours) à partir duquel un animal est adulte, par espèce
// (porc ~6 mois, bovin ~24 mois, caprin/ovin ~12 mois, volailles ~5 mois, lapin ~6 mois).
export const ADULT_AGE_DAYS = { pig: 180, cow: 730, goat: 365, sheep: 365, chicken: 150, duck: 150, turkey: 150, rabbit: 180 };

const ADULT_TYPE_KW = ["adulte", "truie", "verrat", "vache", "taureau", "boeuf", "bouc", "brebis", "belier", "bélier", "chevre", "chèvre", "pondeuse", "poule", "coq", "dinde"];
const COCHETTE_TYPE_KW = ["cochette"];
const FATTEN_TYPE_KW = ["engraissement", "abattage", "embouche"];
const YOUNG_TYPE_KW = ["jeune", "porcelet", "veau", "genisse", "génisse", "chevreau", "agneau", "poussin", "poulet", "lapereau", "cabri"];

// Quantité représentée par une ligne (1 ligne peut valoir plusieurs têtes via `count`).
// Aligné sur le calcul d'occupation backend (somme des count, défaut 1).
export const animalQty = (a) => (Number(a?.count ?? 0) > 0 ? Number(a.count) : 1);

export const animalCategory = (a) => {
  const t = (a?.type || "").toLowerCase();
  if (t) {
    if (COCHETTE_TYPE_KW.some((k) => t.includes(k))) return "cochette";
    if (FATTEN_TYPE_KW.some((k) => t.includes(k))) return "engraissement";
    if (ADULT_TYPE_KW.some((k) => t.includes(k))) return "adulte";
    if (YOUNG_TYPE_KW.some((k) => t.includes(k))) return "jeune";
  }
  const dobStr = a?.dateOfBirth || a?.date_of_birth;
  if (dobStr) {
    const dob = new Date(dobStr);
    if (!isNaN(dob)) {
      const days = (Date.now() - dob.getTime()) / 86400000;
      return days >= (ADULT_AGE_DAYS[a.species] ?? 365) ? "adulte" : "jeune";
    }
  }
  return "inconnu";
};

// Un animal compte-t-il comme adulte mature ? (cochette = future reproductrice, comptée adulte)
export const isAdultAnimal = (a) => {
  const c = animalCategory(a);
  return c === "adulte" || c === "cochette";
};

// Libellés affichables des catégories
export const CATEGORY_LABELS = {
  adulte:        { fr: "Adultes",       en: "Adults" },
  cochette:      { fr: "Cochettes (futures repro.)", en: "Gilts (future breeders)" },
  engraissement: { fr: "Engraissement (abattage)",   en: "Fattening (slaughter)" },
  jeune:         { fr: "Jeunes",        en: "Young" },
  inconnu:       { fr: "Non classés",   en: "Unclassified" },
};

// Agrège un ensemble d'animaux en têtes par catégorie (utilise count).
export const categoryBreakdown = (animals) => {
  const out = { adulte: 0, cochette: 0, engraissement: 0, jeune: 0, inconnu: 0 };
  (animals || []).forEach((a) => { out[animalCategory(a)] += animalQty(a); });
  return out;
};
