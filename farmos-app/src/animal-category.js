// Classification d'âge/catégorie d'un animal d'élevage, partagée entre le dashboard
// et l'écran Bâtiments.
//
// Logique (100% dérivée de l'ÂGE + SEXE, le type saisi n'est plus utilisé) :
//   - Âge < seuil espèce      → "jeune"  (sauf jeune femelle de porc → "cochette")
//   - Âge ≥ seuil, femelle    → "adulte" (reproductrice : truie, vache…)
//   - Âge ≥ seuil, mâle       → en partie reproducteur ("adulte"), le surplus
//                               "engraissement" selon le ratio reproducteur du
//                               groupe (1 mâle pour N femelles adultes).
//
// Le ratio se calcule par GROUPE (= par bâtiment) : il faut donc connaître le
// nombre de femelles adultes du groupe pour départager les mâles adultes. Utiliser
// categoryBreakdownByGroup() pour un comptage correct ; animalCategory() seul ne
// peut pas trancher mâle reproducteur vs engraissement (renvoie alors "adulte").

// Âge (jours) à partir duquel un animal est adulte, par espèce
// (porc ~6 mois, bovin ~24 mois, caprin/ovin ~12 mois, volailles ~5 mois, lapin ~6 mois).
export const ADULT_AGE_DAYS = { pig: 180, cow: 730, goat: 365, sheep: 365, chicken: 150, duck: 150, turkey: 150, rabbit: 180 };

// Ratio reproducteur : 1 mâle adulte conservé pour N femelles adultes ; le surplus
// de mâles adultes est destiné à l'engraissement / abattage.
export const BREEDING_RATIO = { pig: 20, cow: 25, goat: 25, sheep: 25, chicken: 10, duck: 10, turkey: 10, rabbit: 10 };

// Espèces où une jeune femelle proche maturité est une "cochette" (future reproductrice).
const GILT_SPECIES = new Set(["pig"]);

// Quantité représentée par une ligne (1 ligne peut valoir plusieurs têtes via `count`).
// Aligné sur le calcul d'occupation backend (somme des count, défaut 1).
export const animalQty = (a) => (Number(a?.count ?? 0) > 0 ? Number(a.count) : 1);

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

// Catégorie d'un animal isolé (sans contexte de groupe). Les mâles adultes sont
// renvoyés "adulte" car le départage reproducteur/engraissement exige le groupe.
export const animalCategory = (a) => {
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

// Agrège un GROUPE d'animaux (= un bâtiment) en têtes par catégorie, en appliquant
// le ratio reproducteur sur les mâles adultes. Le ratio est calculé par espèce
// présente dans le groupe.
export const categoryBreakdownByGroup = (animals) => {
  const out = { adulte: 0, cochette: 0, engraissement: 0, jeune: 0, inconnu: 0 };
  // Compter d'abord les femelles adultes par espèce (base du ratio).
  const adultFemalesBySpecies = {};
  (animals || []).forEach((a) => {
    if (a?.sex === "F" && isAdultAnimal(a)) {
      adultFemalesBySpecies[a.species] = (adultFemalesBySpecies[a.species] || 0) + animalQty(a);
    }
  });
  // Nombre de mâles reproducteurs à conserver par espèce = ceil(femelles / ratio), min 1.
  const breedersBudget = {};
  Object.keys(adultFemalesBySpecies).forEach((sp) => {
    const ratio = BREEDING_RATIO[sp] ?? 20;
    breedersBudget[sp] = Math.max(1, Math.ceil(adultFemalesBySpecies[sp] / ratio));
  });
  (animals || []).forEach((a) => {
    const n = animalQty(a);
    const d = ageDays(a);
    if (d == null) { out.inconnu += n; return; }
    const adult = d >= (ADULT_AGE_DAYS[a?.species] ?? 365);
    if (!adult) {
      out[a?.sex === "F" && GILT_SPECIES.has(a?.species) ? "cochette" : "jeune"] += n;
      return;
    }
    if (a?.sex === "F") { out.adulte += n; return; }
    if (a?.sex === "M") {
      // Conserver d'abord le budget de reproducteurs, le reste → engraissement.
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
