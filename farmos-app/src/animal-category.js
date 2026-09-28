import { isSaleLockedAnimal } from "./animal-lock";

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

// Seuils d'abattage par espèce : prêt = âge OU poids atteint ; en retard = au-delà du
// seuil "late" (l'animal mange sans rendement → coût net). Le poids ne s'applique que
// s'il est saisi. Valeurs standard d'élevage (porc charcutier ~100 kg/5,5 mois, etc.).
export const SLAUGHTER_THRESHOLDS = {
  pig:     { readyDays: 165, lateDays: 240, readyKg: 100, lateKg: 130 },
  cow:     { readyDays: 540, lateDays: 900, readyKg: 450, lateKg: 600 },
  goat:    { readyDays: 150, lateDays: 300, readyKg: 35,  lateKg: 50 },
  sheep:   { readyDays: 150, lateDays: 300, readyKg: 40,  lateKg: 55 },
  chicken: { readyDays: 42,  lateDays: 70,  readyKg: 2,   lateKg: 3 },
  duck:    { readyDays: 49,  lateDays: 80,  readyKg: 3,   lateKg: 4 },
  turkey:  { readyDays: 100, lateDays: 160, readyKg: 7,   lateKg: 12 },
  rabbit:  { readyDays: 70,  lateDays: 110, readyKg: 2.3, lateKg: 3 },
};

export const isActiveLivestock = (a) => !!a && !isSaleLockedAnimal(a);

// Quantité vivante représentée par une ligne (1 ligne peut valoir plusieurs
// têtes via `count`). Les animaux vendus, en vente ou décédés sortent de
// l'effectif courant.
export const animalQty = (a) => (isActiveLivestock(a) ? (Number(a?.count ?? 0) > 0 ? Number(a.count) : 1) : 0);

// Un animal est-il marqué (via type) comme destiné à l'engraissement/abattage ?
export const isFatteningType = (a) => {
  const t = (a?.type || "").toLowerCase();
  return !!t && FATTEN_TYPE_KW.some((k) => t.includes(k));
};

export const ageDays = (a) => {
  const dobStr = a?.dateOfBirth || a?.date_of_birth;
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob)) return null;
  return (Date.now() - dob.getTime()) / 86400000;
};

// Âge lisible depuis la date de naissance, en mois calendaires :
// < 1 mois → « 12 j », < 1 an → « 5 mois », sinon « 3 ans 2 mois ».
// tone : "young" | "adult" (seuil espèce, isAdultAnimal) | "none" (date absente ou future).
// birth : « Née le 14/07/2023 » (accord selon le sexe), pour le survol / la 2e ligne.
export const formatAnimalAge = (a, lang = "fr") => {
  const fr = lang !== "en";
  const dobStr = a?.dateOfBirth || a?.date_of_birth;
  const dob = dobStr ? new Date(dobStr) : null;
  const unknown = { label: fr ? "Âge inconnu" : "Unknown age", birth: fr ? "Date de naissance manquante" : "Birth date missing", days: null, tone: "none" };
  if (!dob || isNaN(dob)) return unknown;
  const now = new Date();
  const days = Math.floor((now - dob) / 86400000);
  if (days < 0) return { ...unknown, birth: fr ? "Date de naissance dans le futur (à corriger)" : "Birth date in the future (to fix)" };
  let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months -= 1;
  let label;
  if (months < 1) label = fr ? `${days} j` : `${days} d`;
  else if (months < 12) label = fr ? `${months} mois` : `${months} mo`;
  else {
    const y = Math.floor(months / 12), m = months % 12;
    label = fr ? `${y} an${y > 1 ? "s" : ""}${m ? ` ${m} mois` : ""}` : `${y} y${m ? ` ${m} mo` : ""}`;
  }
  const female = String(a?.sex || "").trim().toLowerCase().startsWith("f");
  const dateTxt = dob.toLocaleDateString(fr ? "fr-FR" : "en-GB");
  const birth = fr ? `${female ? "Née" : "Né"} le ${dateTxt}` : `Born ${dateTxt}`;
  return { label, birth, days, tone: isAdultAnimal(a) ? "adult" : "young" };
};

// Couleurs de la pastille d'âge (bleu = jeune, vert = adulte, neutre = inconnu).
export const AGE_TONES = {
  young: { bg: "#DDE9F2", fg: "#1D4466" },
  adult: { bg: "#DCE5DD", fg: "#1E4A2E" },
  none:  { bg: "#EFE8DA", fg: "#5E6B63" },
};

// Un animal est-il adulte ? Basé UNIQUEMENT sur l'âge (date de naissance + seuil espèce).
export const isAdultAnimal = (a) => {
  const d = ageDays(a);
  return d != null && d >= (ADULT_AGE_DAYS[a.species] ?? 365);
};

const animalKg = (a) => {
  const w = Number(a?.weight);
  return Number.isFinite(w) && w > 0 ? w : null;
};

// État d'abattage d'un animal : "en_croissance" | "pret" | "retard" | null (inconnu).
// Prêt = âge OU poids atteint ; en retard = au-delà du seuil "late". Le poids prime
// quand il est saisi (plus précis que l'âge pour la rentabilité).
export const slaughterReadiness = (a) => {
  const th = SLAUGHTER_THRESHOLDS[a?.species];
  if (!th) return null;
  const d = ageDays(a);
  const kg = animalKg(a);
  if (d == null && kg == null) return null;
  const late = (kg != null && kg >= th.lateKg) || (d != null && d >= th.lateDays);
  if (late) return "retard";
  const ready = (kg != null && kg >= th.readyKg) || (d != null && d >= th.readyDays);
  return ready ? "pret" : "en_croissance";
};

export const SLAUGHTER_LABELS = {
  pret:   { fr: "Prêts à abattre",  en: "Ready to slaughter" },
  retard: { fr: "En retard (coût net)", en: "Overdue (net cost)" },
  en_croissance: { fr: "En croissance", en: "Growing" },
};

// Agrège l'état d'abattage + le poids moyen d'un groupe d'animaux (têtes pondérées
// par count). onlyFattening = ne compter que les animaux destinés à l'engraissement.
export const slaughterStats = (animals, { onlyFattening = false } = {}) => {
  let pret = 0, retard = 0, enCroissance = 0, weightSum = 0, weightHeads = 0;
  (animals || []).forEach((a) => {
    if (onlyFattening && animalCategory(a) !== "engraissement") return;
    const n = animalQty(a);
    const st = slaughterReadiness(a);
    if (st === "pret") pret += n; else if (st === "retard") retard += n; else if (st === "en_croissance") enCroissance += n;
    const kg = animalKg(a);
    if (kg != null) { weightSum += kg * n; weightHeads += n; }
  });
  return { pret, retard, enCroissance, avgWeight: weightHeads > 0 ? weightSum / weightHeads : null, weightHeads };
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

// Sexe normalisé d'un animal pour la ventilation : "M" | "F" | "inconnu".
const animalSex = (a) => (a?.sex === "M" ? "M" : a?.sex === "F" ? "F" : "inconnu");

// Ventile un GROUPE d'animaux (= un bâtiment) par catégorie ET par sexe.
// Même logique de catégorisation que categoryBreakdownByGroup (type prioritaire,
// puis âge, puis ratio reproducteur sur les mâles adultes non marqués), mais chaque
// catégorie compte les têtes par sexe { M, F, inconnu }. Pour le ratio reproducteur,
// les mâles "gardés" et le "surplus engraissement" restent comptés en M.
export const sexBreakdownByGroup = (animals) => {
  const mk = () => ({ M: 0, F: 0, inconnu: 0 });
  const out = { adulte: mk(), cochette: mk(), engraissement: mk(), jeune: mk(), inconnu: mk() };
  const adultFemalesBySpecies = {};
  (animals || []).forEach((a) => {
    if (!isFatteningType(a) && a?.sex === "F" && isAdultAnimal(a)) {
      adultFemalesBySpecies[a.species] = (adultFemalesBySpecies[a.species] || 0) + animalQty(a);
    }
  });
  const breedersBudget = {};
  Object.keys(adultFemalesBySpecies).forEach((sp) => {
    breedersBudget[sp] = Math.max(1, Math.ceil(adultFemalesBySpecies[sp] / (BREEDING_RATIO[sp] ?? 20)));
  });
  (animals || []).forEach((a) => {
    const n = animalQty(a);
    const sx = animalSex(a);
    if (isFatteningType(a)) { out.engraissement[sx] += n; return; }
    const d = ageDays(a);
    if (d == null) { out.inconnu[sx] += n; return; }
    const adult = d >= (ADULT_AGE_DAYS[a?.species] ?? 365);
    if (!adult) {
      out[a?.sex === "F" && GILT_SPECIES.has(a?.species) ? "cochette" : "jeune"][sx] += n;
      return;
    }
    if (a?.sex === "F") { out.adulte.F += n; return; }
    if (a?.sex === "M") {
      const budget = breedersBudget[a.species] ?? 0;
      const asBreeder = Math.min(n, budget);
      breedersBudget[a.species] = budget - asBreeder;
      out.adulte.M += asBreeder;
      out.engraissement.M += n - asBreeder;
      return;
    }
    out.adulte.inconnu += n; // sexe inconnu mais adulte
  });
  return out;
};
