// Classification d'âge/catégorie d'un animal d'élevage, partagée entre le dashboard
// et l'écran Bâtiments.
//
// Logique combinée (type pour la DESTINATION, âge pour la MATURITÉ) :
//   1. type = engraissement/abattage  → "engraissement" (décision humaine, prioritaire,
//                                        quel que soit l'âge)
//   2. sinon, par âge :
//        - âge < seuil, femelle de porc → "cochette" (future reproductrice)
//        - âge < seuil                  → "jeune"
//        - âge ≥ seuil, femelle         → "adulte" (reproductrice)
//        - âge ≥ seuil, mâle NON marqué → reproducteur ("adulte") jusqu'au budget du
//                                         ratio reproducteur, surplus → "engraissement"
//
// Le ratio reproducteur ne s'applique qu'aux mâles adultes non marqués, et se calcule
// par GROUPE (= par bâtiment). Utiliser categoryBreakdownByGroup() pour un comptage
// correct ; animalCategory() seul classe un mâle adulte non marqué en "adulte".

// Âge (jours) à partir duquel un animal est adulte, par espèce
// (porc ~6 mois, bovin ~24 mois, caprin/ovin ~12 mois, volailles ~5 mois, lapin ~6 mois).
export const ADULT_AGE_DAYS = { pig: 180, cow: 730, goat: 365, sheep: 365, chicken: 150, duck: 150, turkey: 150, rabbit: 180 };

// Ratio reproducteur : 1 mâle adulte conservé pour N femelles adultes ; le surplus
// de mâles adultes NON marqués est estimé destiné à l'engraissement / abattage.
export const BREEDING_RATIO = { pig: 20, cow: 25, goat: 25, sheep: 25, chicken: 10, duck: 10, turkey: 10, rabbit: 10 };

// Espèces où une jeune femelle proche maturité est une "cochette" (future reproductrice).
const GILT_SPECIES = new Set(["pig"]);

// Mots-clés du champ type signalant une destination abattage/engraissement (prioritaire).
const FATTEN_TYPE_KW = ["engraissement", "abattage", "embouche", "boucherie"];

// Quantité représentée par une ligne (1 ligne peut valoir plusieurs têtes via `count`).
// Aligné sur le calcul d'occupation backend (somme des count, défaut 1).
export const animalQty = (a) => (Number(a?.count ?? 0) > 0 ? Number(a.count) : 1);

// Un animal est-il marqué (via type) comme destiné à l'engraissement/abattage ?
export const isFatteningType = (a) => {
  const t = (a?.type || "").toLowerCase();
  return !!t && FATTEN_TYPE_KW.some((k) => t.includes(k));
};

const ageDays = (a) => {
  const dobStr = a?.dateOfBirth || a?.date_of_birth;
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob)) return null;
  return (Date.now() - dob.getTime()) / 86400000;
};

// Un animal est-il adulte ? Basé UNIQUEMENT sur l'âge (date de naissance + seuil espèce).
export const isAdultAnimal = (a) => {
  const d = ageDays(a);
  return d != null && d >= (ADULT_AGE_DAYS[a.species] ?? 365);
};

// Catégorie d'un animal isolé (sans contexte de groupe). Un mâle adulte non marqué
// est renvoyé "adulte" car le départage reproducteur/engraissement exige le groupe.
export const animalCategory = (a) => {
  if (isFatteningType(a)) return "engraissement";
  const d = ageDays(a);
  if (d == null) return "inconnu";
  const adult = d >= (ADULT_AGE_DAYS[a?.species] ?? 365);
  if (adult) return "adulte";
  if (a?.sex === "F" && GILT_SPECIES.has(a?.species)) return "cochette";
  return "jeune";
};

// Libellés affichables des catégories
export const CATEGORY_LABELS = {
  adulte:        { fr: "Adultes",       en: "Adults" },
  cochette:      { fr: "Cochettes (futures repro.)", en: "Gilts (future breeders)" },
  engraissement: { fr: "Engraissement (abattage)",   en: "Fattening (slaughter)" },
  jeune:         { fr: "Jeunes",        en: "Young" },
  inconnu:       { fr: "Non classés",   en: "Unclassified" },
};

// Agrège un GROUPE d'animaux (= un bâtiment) en têtes par catégorie.
// Priorité au type (engraissement marqué), puis âge, puis ratio reproducteur sur les
// mâles adultes NON marqués.
export const categoryBreakdownByGroup = (animals) => {
  const out = { adulte: 0, cochette: 0, engraissement: 0, jeune: 0, inconnu: 0 };
  // Femelles adultes (non marquées engraissement) par espèce = base du ratio.
  const adultFemalesBySpecies = {};
  (animals || []).forEach((a) => {
    if (!isFatteningType(a) && a?.sex === "F" && isAdultAnimal(a)) {
      adultFemalesBySpecies[a.species] = (adultFemalesBySpecies[a.species] || 0) + animalQty(a);
    }
  });
  // Budget de mâles reproducteurs à conserver par espèce = ceil(femelles / ratio), min 1.
  const breedersBudget = {};
  Object.keys(adultFemalesBySpecies).forEach((sp) => {
    breedersBudget[sp] = Math.max(1, Math.ceil(adultFemalesBySpecies[sp] / (BREEDING_RATIO[sp] ?? 20)));
  });
  (animals || []).forEach((a) => {
    const n = animalQty(a);
    if (isFatteningType(a)) { out.engraissement += n; return; } // décision humaine prioritaire
    const d = ageDays(a);
    if (d == null) { out.inconnu += n; return; }
    const adult = d >= (ADULT_AGE_DAYS[a?.species] ?? 365);
    if (!adult) {
      out[a?.sex === "F" && GILT_SPECIES.has(a?.species) ? "cochette" : "jeune"] += n;
      return;
    }
    if (a?.sex === "F") { out.adulte += n; return; }
    if (a?.sex === "M") {
      // Conserver d'abord le budget de reproducteurs, le reste → engraissement (estimation).
      const budget = breedersBudget[a.species] ?? 0;
      const asBreeder = Math.min(n, budget);
      breedersBudget[a.species] = budget - asBreeder;
      out.adulte += asBreeder;
      out.engraissement += n - asBreeder;
      return;
    }
    out.adulte += n; // sexe inconnu mais adulte
  });
  return out;
};
