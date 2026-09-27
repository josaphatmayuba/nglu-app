/* eslint-disable */
import React from "react";
import { createPortal } from "react-dom";
import { api } from "./api";
import { MaterialLineChart } from "./material-charts.jsx";
import { symbolFor, currencyOptions, currencyIdOf } from "./currency";
import { SectionLoader } from "./loading.jsx";

// ─────────────────────────────────────────────────────────────────────────
// SIMULATEUR D'ELEVAGE — projection cheptel 5 ans, strategies P1/P2,
// valorisation par decoupe, compte de resultat (CA - depenses = benefice),
// prime travailleurs. Calcul 100% frontend (pas d'ecriture DB, marche offline).
// Modele PAR COHORTE (age reel) : porte du modele Python valide avec le client.
// ─────────────────────────────────────────────────────────────────────────

const YEARS = [2026, 2027, 2028, 2029, 2030];
const SIMULATOR_SPECIES = "pig";
const ZONE_ALL = "__all__";
const ZONE_NONE = "__none__";

// Hypotheses par defaut : parametres biologiques + montants indicatifs de depart.
// Les montants sont AGNOSTIQUES de devise : ils sont interpretes dans la devise des
// donnees du compte (aucune devise codee en dur) ; l'eleveur les ajuste/importe.
const DEFAULTS = {
  nesParPortee: 10,
  porteesParAn: 2.3,
  surviePct: 85,
  partMalesPct: 50,
  ageSaillieMois: 8,
  gestationMois: 4,        // gestation + detection
  ageReformeMois: 44,      // fin de carriere reproductive : la truie est reformee (vendue) au-dela
  ageVenteMois: 7,
  poidsVenteKg: 95,
  plafondTruiesP2: 150,
  anneeDebut: new Date().getFullYear(),
  moisDebut: new Date().getMonth() + 1, // 1-12 ; defaut = mois courant (on demarre maintenant)
  horizonAns: 5,
  granularite: "annee",   // "annee" | "trimestre"
  // couts : valeurs de depart indicatives, EXPRIMEES dans la devise des donnees du
  // compte (aucune devise codee en dur). L'eleveur ajuste/importe dans sa devise.
  alimentEngraissementParPorc: 342000,
  alimentTruieParAn: 1320000,
  vetoParPorc: 30000,
  diversParPorc: 40000,
  salaireMensuelOuvrier: 559000,
  capex: 206000000,
  // prime travailleurs : seuil exprime dans la devise choisie
  seuilPrime: 100000000,
  tauxPrimePct: 5,
  // decoupe d'un porc (poids kg, prix/kg dans la devise des donnees)
  decoupe: [
    { nom: "Viande (chair)", kg: 50, prix: 22000 },
    { nom: "Pieds (Makoso)", kg: 4, prix: 4200 },
    { nom: "Tete / masque", kg: 7, prix: 5200 },
    { nom: "Sternum / bas morceaux", kg: 6, prix: 6200 },
    { nom: "Abats", kg: 8, prix: 5000 },
    { nom: "Gras / couenne / os", kg: 20, prix: 3000 },
  ],
  prixEntierParKg: 6130, // mode porc entier vif
  modeVente: "decoupe",  // "decoupe" | "entier"
  // facteur de montee en charge (1re annee partielle, modele cohorte affine ensuite)
};

function revenuParPorc(h) {
  if (h.modeVente === "entier") return h.prixEntierParKg * h.poidsVenteKg;
  return h.decoupe.reduce((s, p) => s + p.kg * p.prix, 0);
}

const roundKg = (v) => Math.round((Number(v) || 0) * 100) / 100;
const totalDecoupeKg = (decoupe = []) => roundKg(decoupe.reduce((s, d) => s + Number(d.kg || 0), 0));

function scaleDecoupeToWeight(decoupe = [], poidsVenteKg) {
  const target = roundKg(Math.max(0, Number(poidsVenteKg) || 0));
  const source = totalDecoupeKg(decoupe);
  if (!decoupe.length || source <= 0 || target <= 0) return decoupe;
  const scaled = decoupe.map((d) => ({ ...d, kg: roundKg(Number(d.kg || 0) * target / source) }));
  const diff = roundKg(target - totalDecoupeKg(scaled));
  if (diff !== 0) {
    const adjustIndex = scaled.reduce((best, d, i) => Number(d.kg || 0) > Number(scaled[best]?.kg || 0) ? i : best, 0);
    scaled[adjustIndex] = { ...scaled[adjustIndex], kg: roundKg(Math.max(0, Number(scaled[adjustIndex].kg || 0) + diff)) };
  }
  return scaled;
}

function vendablesParTruieAn(h) {
  return h.nesParPortee * h.porteesParAn * (h.surviePct / 100);
}

function coutParPorc(h) {
  const malesTruie = vendablesParTruieAn(h) * (h.partMalesPct / 100);
  const quotePartMere = malesTruie > 0 ? h.alimentTruieParAn / malesTruie : 0;
  return h.alimentEngraissementParPorc + quotePartMere + h.vetoParPorc + h.diversParPorc;
}

function rowAnimalId(row) {
  return row?.animalId ?? row?.animal_id ?? row?.relatedAnimalId ?? row?.related_animal_id ?? null;
}

function recordId(row) {
  return row?._pk ?? row?.id ?? row?.animalId ?? row?.animal_id ?? null;
}

function makeAnimalSpeciesIndex(animals) {
  const byId = new Map();
  for (const a of animals || []) {
    const id = a?._pk ?? a?.id ?? a?.animalId ?? a?.animal_id;
    if (id != null && a?.species) byId.set(String(id), a.species);
  }
  return byId;
}

function rowSpecies(row, animalSpeciesById) {
  const direct = row?.species ?? row?.animalSpecies ?? row?.animal_species;
  if (direct) return direct;
  const id = rowAnimalId(row);
  return id != null ? animalSpeciesById.get(String(id)) : null;
}

function rowsForSpecies(rows, speciesFilter, animalSpeciesById) {
  if (!speciesFilter) return rows || [];
  return (rows || []).filter((row) => rowSpecies(row, animalSpeciesById) === speciesFilter);
}

function cleanText(v) {
  const s = String(v ?? "").trim();
  return s || "";
}

function animalQty(a) {
  return Math.max(1, Number(a?.count) || 1);
}

function isSimulationAnimal(a, speciesFilter = SIMULATOR_SPECIES) {
  if (speciesFilter && a?.species !== speciesFilter) return false;
  if (a?.is_active === 0 || a?.isActive === 0) return false;
  const st = String(a?.status || "").toLowerCase();
  return st !== "deceased" && st !== "sold";
}

function zoneInfoOf(row) {
  const zoneId = row?.zoneId ?? row?.zone_id;
  const zoneIdText = cleanText(zoneId);
  const room = cleanText(row?.room);
  const barn = cleanText(row?.barn);
  const lot = cleanText(row?.lot);
  if (zoneIdText) return { key: `zone:${zoneIdText}`, label: room || barn || lot || `Zone ${zoneIdText}`, rank: 0 };
  if (room) return { key: `room:${room.toLowerCase()}`, label: room, rank: 1 };
  if (barn) return { key: `barn:${barn.toLowerCase()}`, label: barn, rank: 2 };
  if (lot) return { key: `lot:${lot.toLowerCase()}`, label: lot, rank: 3 };
  return { key: ZONE_NONE, label: "Non renseignee", rank: 9 };
}

function makeAnimalZoneIndex(animals) {
  const byId = new Map();
  for (const a of animals || []) {
    const id = a?._pk ?? a?.id ?? a?.animalId ?? a?.animal_id;
    if (id != null) byId.set(String(id), zoneInfoOf(a).key);
  }
  return byId;
}

function rowZoneKey(row, animalZoneById) {
  const id = rowAnimalId(row);
  if (id != null && animalZoneById.has(String(id))) return animalZoneById.get(String(id));
  return zoneInfoOf(row).key;
}

function rowsForScope(rows, speciesFilter, animalSpeciesById, zoneKey = ZONE_ALL, animalZoneById = new Map()) {
  const bySpecies = rowsForSpecies(rows, speciesFilter, animalSpeciesById);
  if (zoneKey === ZONE_ALL) return bySpecies;
  return bySpecies.filter((row) => rowZoneKey(row, animalZoneById) === zoneKey);
}

function filterAnimalsByZone(animals, zoneKey) {
  if (zoneKey === ZONE_ALL) return animals || [];
  return (animals || []).filter((a) => zoneInfoOf(a).key === zoneKey);
}

function buildZoneOptions(animals, speciesFilter = SIMULATOR_SPECIES) {
  const zones = new Map();
  for (const a of animals || []) {
    if (!isSimulationAnimal(a, speciesFilter)) continue;
    const info = zoneInfoOf(a);
    const prev = zones.get(info.key) || { ...info, count: 0 };
    prev.count += animalQty(a);
    if ((!prev.label || prev.key === ZONE_NONE) && info.label) prev.label = info.label;
    zones.set(info.key, prev);
  }
  return Array.from(zones.values()).sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));
}

function eventDateOf(row) {
  return row?.eventDate || row?.event_date || row?.date || row?.created_at || null;
}

function offspringCountOf(row) {
  return Number(row?.offspringCount ?? row?.offspring_count ?? 0) || 0;
}

function isBirthEvent(row) {
  const live = offspringCountOf(row);
  if (live <= 0) return false;
  const type = String(row?.eventType || row?.event_type || "").toLowerCase();
  return !type || /birth|birthing|farrow|mise|partur|litter|portee|portée/.test(type);
}

// Noms de mois (debut de trimestre) pour l'affichage trimestriel
const MOIS_T = { 0: "janv", 3: "avr", 6: "juil", 9: "oct" };
const MOIS_T_FIN = { 0: "mars", 3: "juin", 6: "sept", 9: "déc" };

// ─── MOTEUR PAR COHORTE (mois par mois) ──────────────────────────────────
// cohortesInit: [{ naissanceMoisAbs, n }]  (mois 0 = janvier de anneeDebut)
// Accumule en buckets mensuels puis agrege par periode (annee OU trimestre).
function simulate(strategy, h, cohortesInit, malesActuels, seuilEnBase = 0, cohortesMalesVente = [], verratsInit = 0) {
  const debut = h.anneeDebut || 2026;
  const nbAns = Math.max(1, Math.min(30, h.horizonAns || 5));
  const HORIZON = nbAns * 12 - 1; // dernier mois inclus (mois 0 = janv debut)
  // buckets mensuels
  const moisData = [];
  for (let m = 0; m <= HORIZON; m++) moisData.push({ mb: 0, nes: 0, vendus: 0, truies: 0, morts: 0, vendusM: 0, vendusF: 0 });
  const add = (mab, key, val) => { if (mab >= 0 && mab <= HORIZON) moisData[mab][key] += val; };

  const malesExistants = cohortesMalesVente.reduce((s, c) => s + c.n, 0);
  const femellesInitiales = cohortesInit.reduce((s, c) => s + c.n, 0);
  let femellesGardees = femellesInitiales;
  const femellesReproParMois = Array.from({ length: HORIZON + 1 }, () => Math.round(femellesGardees));
  const malesReproGardes = Math.max(0, Math.round(Number(verratsInit) || 0));
  // cheptel vivant au depart = reproductrices + males a vendre + verrats (geniteurs)
  const parcInit = femellesInitiales + malesExistants + (Number(verratsInit) || 0) + (Number(malesActuels) || 0);
  // males existants destines a la vente : vendus a l'age de vente (lot date), PAS tous au mois 0
  for (const c of cohortesMalesVente) {
    const venteMois = Math.max(0, c.naissanceMoisAbs + h.ageVenteMois);
    add(venteMois, "vendus", c.n);
    add(venteMois, "vendusM", c.n);
  }
  if (malesActuels) { add(0, "vendus", malesActuels); add(0, "vendusM", malesActuels); }

  const inter = h.porteesParAn > 0 ? Math.max(1, Math.round(12 / h.porteesParAn)) : 5;
  const reforme = Math.max(h.ageSaillieMois + h.gestationMois + 1, h.ageReformeMois || 44);
  const misesBasParMois = Array.from({ length: HORIZON + 1 }, () => []);
  const reformesParMois = Array.from({ length: HORIZON + 1 }, () => 0);

  const planifierCohorte = (naissanceMoisAbs, n, options = {}) => {
    if (!n || n <= 0) return;
    let mb = Number.isFinite(options.prochaineMiseBasMoisAbs)
      ? options.prochaineMiseBasMoisAbs
      : naissanceMoisAbs + h.ageSaillieMois + h.gestationMois;
    // la truie ne se reproduit que jusqu'a l'age de reforme (fin de carriere)
    while (mb <= HORIZON && (mb - naissanceMoisAbs) <= reforme) {
      if (mb >= 0) misesBasParMois[mb].push({ naissanceMoisAbs, n });
      mb += inter;
    }
    // Reforme : en fin de carriere, la truie est vendue (sortie du cheptel reproducteur)
    const moisReforme = naissanceMoisAbs + reforme;
    if (moisReforme >= 0 && moisReforme <= HORIZON) {
      add(moisReforme, "vendus", n);
      add(moisReforme, "vendusF", n); // truies de reforme = femelles vendues
      reformesParMois[moisReforme] += n;
    }
  };

  for (const c of cohortesInit) planifierCohorte(c.naissanceMoisAbs, c.n, c);

  for (let m = 0; m <= HORIZON; m++) {
    if (reformesParMois[m] > 0) femellesGardees = Math.max(0, femellesGardees - reformesParMois[m]);
    for (const c of misesBasParMois[m]) {
      add(m, "mb", c.n);
      add(m, "truies", c.n);
      const nesTotal = c.n * h.nesParPortee;
      const nesViv = nesTotal * (h.surviePct / 100);
      add(m, "nes", nesViv);
      add(m, "morts", nesTotal - nesViv); // morts a la naissance (1 - survie)
      const femelles = nesViv * (1 - h.partMalesPct / 100);
      const males = nesViv * (h.partMalesPct / 100);
      const venteMois = m + h.ageVenteMois;
      add(venteMois, "vendus", males);
      add(venteMois, "vendusM", males);
      if (strategy === "P1") {
        femellesGardees += femelles;
        planifierCohorte(m, femelles);
      } else {
        const manque = Math.max(0, h.plafondTruiesP2 - femellesGardees);
        const gardees = Math.min(femelles, manque);
        const aVendre = femelles - gardees;
        if (gardees > 0) {
          femellesGardees += gardees;
          planifierCohorte(m, gardees);
        }
        if (aVendre > 0) { add(venteMois, "vendus", aVendre); add(venteMois, "vendusF", aVendre); }
      }
    }
    femellesReproParMois[m] = Math.round(Math.max(0, femellesGardees));
  }

  // Agregation par periode (annee ou trimestre), ALIGNEE sur le calendrier civil.
  // mois 0 = (anneeDebut, moisDebut). On demarre au mois choisi : la 1re periode
  // peut etre PARTIELLE (ex: demarrage en juin -> 1er trimestre = juin-sept partiel),
  // puis les periodes suivantes sont pleines et calees sur janv/avr/juil/oct.
  const granu = h.granularite === "trimestre" ? "trimestre" : "annee";
  const tailleP = granu === "trimestre" ? 3 : 12; // mois par periode civile pleine
  const moisDebut0 = Math.min(11, Math.max(0, (h.moisDebut || 1) - 1)); // 0-11
  const civAbs0 = debut * 12 + moisDebut0; // mois civil absolu du depart (mois 0)
  const periodes = [];
  let vivants = parcInit; // stock d'animaux vivants, cumule mois par mois
  let p0 = 0;
  while (p0 <= HORIZON) {
    const civAbs = civAbs0 + p0;          // mois civil absolu du 1er mois de la periode
    const anneeP = Math.floor(civAbs / 12);
    const moisCiv = civAbs % 12;          // 0-11
    // fin de la periode civile courante (frontiere trimestre/annee)
    const borneCiv = granu === "trimestre" ? (Math.floor(moisCiv / 3) + 1) * 3 : 12;
    const finP = p0 + (borneCiv - moisCiv); // 1er mois de la periode suivante (exclu)
    const agg = { mb: 0, nes: 0, vendus: 0, truies: 0, morts: 0, vendusM: 0, vendusF: 0 };
    let nbMois = 0;
    for (let m = p0; m < finP && m <= HORIZON; m++) {
      for (const k in agg) agg[k] += moisData[m][k];
      vivants += moisData[m].nes - moisData[m].vendus;
      nbMois++;
    }
    const stockMois = Math.min(Math.max(p0, finP - 1), HORIZON);
    agg.femellesRepro = femellesReproParMois[stockMois] ?? Math.round(femellesInitiales);
    agg.malesRepro = malesReproGardes;
    agg.totalRepro = agg.femellesRepro + agg.malesRepro;
    agg.vivants = Math.round(Math.max(0, vivants));
    const t = Math.floor(moisCiv / 3); // index trimestre civil 0-3
    const label = granu === "trimestre"
      ? `T${t + 1} ${anneeP} (${MOIS_T[t * 3]}–${MOIS_T_FIN[t * 3]})`
      : String(anneeP);
    const labelCourt = granu === "trimestre"
      ? `T${t + 1} ${String(anneeP).slice(2)} (${MOIS_T[t * 3]})`
      : String(anneeP);
    periodes.push({ label, labelCourt, annee: anneeP, agg, moisParPeriode: nbMois });
    p0 = finP;
  }

  // Volet financier par periode
  const rev = revenuParPorc(h);
  const marge = rev - coutParPorc(h);
  const amortAn = h.capex / 10;
  const out = [];
  for (const per of periodes) {
    const vendus = Math.round(per.agg.vendus);
    const ca = vendus * rev;
    const truiesActives = Math.round(per.agg.truies);
    const ouvriers = Math.max(1, Math.ceil((truiesActives || 1) / 70));
    // charges au prorata du nombre de mois de la periode
    const partAn = per.moisParPeriode / 12;
    const charges = ouvriers * 12 * h.salaireMensuelOuvrier * partAn + amortAn * partAn;
    const margeBrute = vendus * marge;
    const benef = margeBrute - charges;
    // seuil de prime exprime en devise des donnees (seuilEnBase) ; aucune devise fixee
    const prime = benef > seuilEnBase ? benef * (h.tauxPrimePct / 100) : 0;
    const benefApres = benef - prime;
    const depenses = ca - benefApres;
    out.push({
      label: per.label,
      labelCourt: per.labelCourt,
      annee: per.annee,
      mb: Math.round(per.agg.mb),
      vendus,
      vendusM: Math.round(per.agg.vendusM),
      vendusF: Math.round(per.agg.vendusF),
      femellesRepro: Math.round(per.agg.femellesRepro),
      malesRepro: Math.round(per.agg.malesRepro),
      totalRepro: Math.round(per.agg.totalRepro),
      truies: truiesActives,
      morts: Math.round(per.agg.morts),
      naissances: Math.round(per.agg.nes),
      vivants: per.agg.vivants,
      ca,
      depenses,
      benef: benefApres,
      prime,
    });
  }
  return out;
}

// Repartit le cheptel reel en cohortes d'age (par date de naissance).
// IMPORTANT : un enregistrement animal peut etre un LOT (champ `count`) -> on
// somme `count` (1 par defaut), jamais 1 par ligne, sinon un lot de 28 porcs
// d'engraissement ne compterait que pour 1.
// On separe :
//  - femelles reproductrices (Truie/Cochette) -> cohortes de repro (saillie selon l'age)
//  - males reproducteurs (Verrat) -> comptes au cheptel mais JAMAIS vendus
//  - autres males (Engraissement/Porcelet...) -> cohortes a vendre a l'age de vente
function buildCohortes(animals, speciesFilter, anneeDebut, moisDebut = 1, options = {}) {
  const debut = anneeDebut || 2026;
  // mois 0 = (anneeDebut, moisDebut). naissanceMoisAbs peut etre negatif (animal ne avant le depart).
  const civ0 = debut * 12 + Math.min(11, Math.max(0, (moisDebut || 1) - 1));
  const moisAbs = (d) => (d.getFullYear() * 12 + d.getMonth()) - civ0;
  const h = options.hypotheses || DEFAULTS;
  const inter = h.porteesParAn > 0 ? Math.max(1, Math.round(12 / h.porteesParAn)) : 5;
  let females = 0, males = 0, verrats = 0;
  let realBirthsAdded = 0, mothersRecalibrated = 0;
  const cohortes = [];        // femelles reproductrices, par mois de naissance
  const cohortesMales = [];   // males a vendre (engraissement/porcelets), par mois de naissance
  const groupsF = new Map();
  const groupsM = new Map();
  const REPRO_MALE = /verrat|reproduct|breed|boar|geniteur|géniteur/i;
  const animalById = new Map();
  for (const a of animals || []) {
    const id = recordId(a);
    if (id != null) animalById.set(String(id), a);
  }

  const lastBirthAbsByAnimal = new Map();
  const realBirthsByMonthZone = new Map();
  for (const ev of options.reproEvents || []) {
    if (!isBirthEvent(ev)) continue;
    const motherId = rowAnimalId(ev);
    const mother = motherId != null ? animalById.get(String(motherId)) : null;
    if (!mother || !isSimulationAnimal(mother, speciesFilter)) continue;
    const d = new Date(eventDateOf(ev));
    if (isNaN(d)) continue;
    const mab = moisAbs(d);
    const idKey = String(recordId(mother));
    const prev = lastBirthAbsByAnimal.get(idKey);
    if (mab <= 0 && (prev == null || mab > prev)) lastBirthAbsByAnimal.set(idKey, mab);
    if (mab <= 0) {
      const zoneKey = zoneInfoOf(mother).key;
      const key = `${d.getFullYear()}-${d.getMonth()}|${zoneKey}`;
      const n = Math.max(0, Math.round(offspringCountOf(ev)));
      realBirthsByMonthZone.set(key, (realBirthsByMonthZone.get(key) || 0) + n);
    }
  }

  const existingBornByMonthZone = new Map();
  for (const a of animals || []) {
    if (!isSimulationAnimal(a, speciesFilter)) continue;
    const sex = (a.sex || "").toUpperCase();
    if (!a.date_of_birth && !a.dateOfBirth) continue;
    const dob = new Date(a.date_of_birth || a.dateOfBirth);
    if (isNaN(dob)) continue;
    const n = animalQty(a); // effectif du lot
    const type = a.type || a.category || "";
    const monthZoneKey = `${dob.getFullYear()}-${dob.getMonth()}|${zoneInfoOf(a).key}`;
    existingBornByMonthZone.set(monthZoneKey, (existingBornByMonthZone.get(monthZoneKey) || 0) + n);
    const motherId = recordId(a);
    const lastBirthAbs = motherId != null ? lastBirthAbsByAnimal.get(String(motherId)) : null;
    const nextBirthAbs = lastBirthAbs != null ? lastBirthAbs + inter : null;
    if (nextBirthAbs != null) mothersRecalibrated += n;
    const key = `${dob.getFullYear()}-${dob.getMonth()}|${nextBirthAbs ?? "auto"}`;
    if (sex === "F" || sex === "FEMALE" || sex === "FEMELLE") {
      females += n;
      if (!groupsF.has(key)) groupsF.set(key, { naissanceMoisAbs: moisAbs(dob), prochaineMiseBasMoisAbs: nextBirthAbs, n: 0 });
      groupsF.get(key).n += n;
    } else if (sex === "M" || sex === "MALE" || sex === "MÂLE") {
      males += n;
      if (REPRO_MALE.test(type)) {
        verrats += n; // reproducteur : compte au cheptel, pas a vendre
      } else {
        if (!groupsM.has(key)) groupsM.set(key, { naissanceMoisAbs: moisAbs(dob), n: 0 });
        groupsM.get(key).n += n;
      }
    }
  }
  for (const [key, bornReal] of realBirthsByMonthZone) {
    const missing = Math.max(0, Math.round(bornReal - (existingBornByMonthZone.get(key) || 0)));
    if (!missing) continue;
    const [ym] = key.split("|");
    const [year, month] = ym.split("-").map((x) => Number(x));
    const naissanceMoisAbs = (year * 12 + month) - civ0;
    const malesMissing = Math.round(missing * (h.partMalesPct / 100));
    const femalesMissing = missing - malesMissing;
    if (femalesMissing > 0) {
      const k = `real-birth-f|${key}`;
      groupsF.set(k, { naissanceMoisAbs, n: femalesMissing });
      females += femalesMissing;
    }
    if (malesMissing > 0) {
      const k = `real-birth-m|${key}`;
      groupsM.set(k, { naissanceMoisAbs, n: malesMissing });
      males += malesMissing;
    }
    realBirthsAdded += missing;
  }
  for (const g of groupsF.values()) cohortes.push(g);
  for (const g of groupsM.values()) cohortesMales.push(g);
  return { cohortes, cohortesMales, females, males, verrats, realBirthsAdded, mothersRecalibrated };
}

// 2-3 chiffres significatifs apres le seuil (ex: 1 256 000 -> 1,26 M)
const sigNum = (n, div) => {
  const x = n / div;
  const dec = Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2;
  return x.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
};
const fmt = (n) => {
  const a = Math.abs(n);
  if (a >= 1e9) return sigNum(n, 1e9) + " Md";
  if (a >= 1e6) return sigNum(n, 1e6) + " M";
  if (a >= 1e3) return sigNum(n, 1e3) + " k";
  return Math.round(n).toLocaleString("fr-FR");
};

// Importe les prix reels (api.listPrices) dans la decoupe + prix vif.
// Matche productType (texte libre) sur le nom de chaque morceau / mot-cle "vif".
function appliquerPrixReels(h, prixRows, speciesFilter = SIMULATOR_SPECIES) {
  const out = { ...h, decoupe: h.decoupe.map((d) => ({ ...d })) };
  const notes = [];
  const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(DIACRITICS, "");
  const rows = (prixRows || []).map((r) => ({
    type: norm(r.productType || r.product_type),
    prix: Number(r.unitPrice || r.unit_price) || 0,
    src: norm(r.saleSource || r.sale_source),
    species: norm(r.species),
  })).filter((r) => r.prix > 0 && (!speciesFilter || !r.species || r.species === norm(speciesFilter)));
  // Prix porc vif/entier
  const vif = rows.find((r) => /vif|entier|live|whole|sur pied/.test(r.type));
  if (vif) { out.prixEntierParKg = Math.round(vif.prix); notes.push(`Prix vif importé: ${vif.prix.toLocaleString()}/kg`); }
  // Chaque morceau de la decoupe
  for (const d of out.decoupe) {
    const nd = norm(d.nom);
    const motcle = nd.split(/[ /(]/)[0]; // 1er mot (viande, pieds, tete, sternum, abats, gras)
    const match = rows.find((r) => r.type.includes(motcle) || motcle.includes(r.type));
    if (match) { d.prix = Math.round(match.prix); notes.push(`${d.nom}: ${match.prix.toLocaleString()}/kg`); }
  }
  return { hypotheses: out, notes };
}

// Code ISO d'une devise (USD, CDF, EUR…) a partir de son id, via la liste systeme.
function codeOf(id, currencies) {
  if (id == null) return null;
  const c = (currencies || []).find((x) => Number(currencyIdOf(x)) === Number(id));
  return c ? String(c.currencyCode || c.currency_code || "").trim().toUpperCase() : null;
}

// Montant compact (k/M/Md) suivi du symbole de la devise systeme choisie.
// La devise n'est PAS codee ici : le symbole vient de currency.js (donnees).
function fmtMontant(v, symbole) {
  const u = symbole ? " " + symbole : "";
  const a = Math.abs(v);
  // garder des chiffres significatifs apres le seuil (ex: 1 256 000 -> 1,26 M)
  const sig = (div) => {
    const n = v / div;
    const dec = Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2;
    return n.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };
  if (a >= 1e9) return sig(1e9) + " Md" + u;
  if (a >= 1e6) return sig(1e6) + " M" + u;
  if (a >= 1e3) return sig(1e3) + " k" + u;
  return Math.round(v).toLocaleString("fr-FR") + u;
}

// ─── CALIBRATION SUR DONNEES REELLES ─────────────────────────────────────
// Lit les vraies tables (depenses, ventes, repro, mortalite) et derive des
// hypotheses calibrees + une analyse de progression annee/annee.
async function loadRealData() {
  const [expR, salR, repR, morR] = await Promise.allSettled([
    api.listExpenses(), api.listSales(), api.listReproductionEvents(), api.listMortalityEvents(),
  ]);
  const arr = (x, keys) => {
    const v = x.status === "fulfilled" ? x.value : null;
    if (!v) return [];
    for (const k of keys) if (Array.isArray(v[k])) return v[k];
    return Array.isArray(v) ? v : (v.data || []);
  };
  const expenses = arr(expR, ["expenses", "getAllExpense"]);
  const sales = arr(salR, ["sales", "getAllSale"]);
  const repro = arr(repR, ["reproductionEvents", "getAllReproductionEvent"]);
  const morts = arr(morR, ["mortalityEvents", "getAllMortalityEvent"]);
  return { expenses, sales, repro, morts };
}

function calibrate(real, h, animals, speciesFilter, devCode = "", zoneKey = ZONE_ALL) {
  const out = { ...h };
  const notes = [];
  const num = (x) => Number(x) || 0;
  const cur = devCode ? ` ${devCode}` : ""; // suffixe devise des donnees (aucune devise codee en dur)
  const animalSpeciesById = makeAnimalSpeciesIndex(animals);
  const animalZoneById = makeAnimalZoneIndex(animals);
  const salesF = rowsForScope(real.sales, speciesFilter, animalSpeciesById, zoneKey, animalZoneById);
  const reproF = rowsForScope(real.repro, speciesFilter, animalSpeciesById, zoneKey, animalZoneById);
  const mortsF = rowsForScope(real.morts, speciesFilter, animalSpeciesById, zoneKey, animalZoneById);
  const expensesAll = real.expenses || [];
  const exp = rowsForScope(expensesAll, speciesFilter, animalSpeciesById, zoneKey, animalZoneById);
  const ignoredExpenses = expensesAll.length - exp.length;

  // Prix de vente reel = CA total / kg vendus (ou par tete si pas de poids)
  if (salesF.length) {
    const totAmount = salesF.reduce((s, r) => s + num(r.total_amount || r.amount || r.totalAmount), 0);
    const totQty = salesF.reduce((s, r) => s + (num(r.quantity) || 1), 0);
    if (totAmount > 0 && totQty > 0) {
      const parTete = totAmount / totQty;
      if (parTete > 0) {
        // Bascule en mode "entier" pour que le prix reel/tete soit reellement utilise
        out.prixEntierParKg = Math.round(parTete / h.poidsVenteKg);
        out.modeVente = "entier";
        notes.push(`Prix vente reel ~${Math.round(parTete).toLocaleString()}${cur}/tete → mode porc entier`);
      }
    }
  }

  // Taille de portee reelle (offspring_count moyen sur mises bas)
  const births = reproF.filter((r) => num(r.offspring_count || r.offspringCount) > 0);
  if (births.length) {
    const avg = births.reduce((s, r) => s + num(r.offspring_count || r.offspringCount), 0) / births.length;
    if (avg > 0) { out.nesParPortee = Math.round(avg * 10) / 10; notes.push(`Nes/portee reel ~${out.nesParPortee}`); }
  }

  // Mortalite reelle = morts / nes (approx sur la periode)
  const totMorts = mortsF.reduce((s, r) => s + (num(r.count) || 1), 0);
  const totNes = births.reduce((s, r) => s + num(r.offspring_count || r.offspringCount), 0);
  if (totNes > 0 && totMorts > 0) {
    const survie = Math.max(50, Math.min(99, Math.round((1 - totMorts / totNes) * 100)));
    out.surviePct = survie; notes.push(`Survie reelle ~${survie}%`);
  }

  // Couts reels par categorie → injectes dans les hypotheses (pas juste affiches)
  const byCat = {};
  for (const e of exp) { const c = (e.category || "autre").toLowerCase(); byCat[c] = (byCat[c] || 0) + num(e.amount); }
  if (speciesFilter && ignoredExpenses > 0) {
    notes.push(`${ignoredExpenses} depense(s) hors perimetre porc/zone ignoree(s) pour eviter de melanger les especes`);
  }

  // Base de repartition : nb de porcs vendus enregistres (sinon les nes vivants)
  const porcsVendus = salesF.reduce((s, r) => s + (num(r.quantity) || 1), 0);
  const base = porcsVendus > 0 ? porcsVendus : totNes;

  const get = (...keys) => { for (const k of keys) if (byCat[k]) return byCat[k]; return 0; };
  const feed = get("feed", "aliment", "alimentation");
  const veto = get("veterinary", "veterinaire", "veto", "sante");
  const sal = get("salaire", "salary", "payroll", "salaires");

  if (feed > 0 && base > 0) {
    out.alimentEngraissementParPorc = Math.round(feed / base);
    notes.push(`Aliment reel ~${out.alimentEngraissementParPorc.toLocaleString()}${cur}/porc (${Math.round(feed).toLocaleString()}${cur} / ${base} porcs)`);
  } else if (feed > 0) {
    notes.push(`Aliment enregistre: ${Math.round(feed).toLocaleString()}${cur} (pas de base de repartition)`);
  }
  if (veto > 0 && base > 0) {
    out.vetoParPorc = Math.round(veto / base);
    notes.push(`Veto reel ~${out.vetoParPorc.toLocaleString()}${cur}/porc`);
  } else if (veto > 0) {
    notes.push(`Veto enregistre: ${Math.round(veto).toLocaleString()}${cur}`);
  }
  if (sal > 0) {
    // Salaires enregistres = total sur la periode ; on estime un mensuel/ouvrier
    const moisCouverts = monthsSpan(exp);
    if (moisCouverts > 0) {
      out.salaireMensuelOuvrier = Math.round(sal / moisCouverts);
      notes.push(`Salaires reels ~${out.salaireMensuelOuvrier.toLocaleString()}${cur}/mois (${Math.round(sal).toLocaleString()}${cur} / ${moisCouverts} mois)`);
    } else {
      notes.push(`Salaires enregistres: ${Math.round(sal).toLocaleString()}${cur}`);
    }
  }

  return { hypotheses: out, notes };
}

// Nombre de mois couverts par une liste de depenses (min→max des dates)
function monthsSpan(items) {
  const dates = (items || [])
    .map((e) => new Date(e.expense_date || e.created_at))
    .filter((d) => !isNaN(d));
  if (!dates.length) return 0;
  const min = new Date(Math.min(...dates)), max = new Date(Math.max(...dates));
  return Math.max(1, (max.getFullYear() - min.getFullYear()) * 12 + (max.getMonth() - min.getMonth()) + 1);
}

// Analyse de progression : ventilation par annee des donnees reelles
function progression(real, speciesFilter, animals = [], zoneKey = ZONE_ALL) {
  const num = (x) => Number(x) || 0;
  const yearOf = (d) => d ? new Date(d).getFullYear() : null;
  const animalSpeciesById = makeAnimalSpeciesIndex(animals);
  const animalZoneById = makeAnimalZoneIndex(animals);
  const sales = rowsForScope(real.sales, speciesFilter, animalSpeciesById, zoneKey, animalZoneById);
  const expenses = rowsForScope(real.expenses, speciesFilter, animalSpeciesById, zoneKey, animalZoneById);
  const repro = rowsForScope(real.repro, speciesFilter, animalSpeciesById, zoneKey, animalZoneById);
  const morts = rowsForScope(real.morts, speciesFilter, animalSpeciesById, zoneKey, animalZoneById);
  const byYear = {};
  const ensure = (y) => (byYear[y] = byYear[y] || { ventes: 0, ca: 0, depenses: 0, naissances: 0, morts: 0 });
  for (const s of sales) { const y = yearOf(s.created_at || s.sale_date || s.saleDate || s.date); if (y) { const r = ensure(y); r.ventes += num(s.quantity) || 1; r.ca += num(s.total_amount || s.totalAmount || s.amount); } }
  for (const e of expenses) { const y = yearOf(e.expense_date || e.expenseDate || e.created_at); if (y) ensure(y).depenses += num(e.amount); }
  for (const rp of repro) { const y = yearOf(rp.event_date || rp.eventDate || rp.created_at); if (y) ensure(y).naissances += num(rp.offspring_count || rp.offspringCount); }
  for (const m of morts) { const y = yearOf(m.death_date || m.event_date || m.eventDate || m.created_at); if (y) ensure(y).morts += num(m.count) || 1; }
  return Object.entries(byYear).map(([y, v]) => ({ annee: Number(y), ...v })).sort((a, b) => a.annee - b.annee);
}

const NumInput = ({ label, value, onChange, suffix }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
    <span style={{ color: "var(--fg-3)" }}>{label}</span>
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input className="input" type="number" value={value}
        onChange={(e) => onChange(Number(e.target.value))} style={{ width: 110 }} />
      {suffix && <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{suffix}</span>}
    </div>
  </label>
);

// Vue rapport imprimable : mise en page document (titre, synthese, hypotheses,
// tableau de projection, graphe, prix). Cachee a l'ecran (#sim-report-print
// display:none), rendue visible uniquement par @media print.
function ReportView({ L, rows, h, strategy, zoneDisplayLabel, females, males, cohortes, saisieCode, fmtM, rev, cout, marge, cumulBenef, debutP, finP, granu }) {
  const dev = saisieCode || "";
  const today = new Date().toLocaleDateString(L("fr-CA", "en-CA"));
  const totVendus = rows.reduce((s, r) => s + r.vendus, 0);
  const totCA = rows.reduce((s, r) => s + r.ca, 0);
  const totDep = rows.reduce((s, r) => s + r.depenses, 0);
  const totMisesBas = rows.reduce((s, r) => s + (r.mb || 0), 0);
  const totNaissances = rows.reduce((s, r) => s + (r.naissances || 0), 0);
  const totMorts = rows.reduce((s, r) => s + (r.morts || 0), 0);
  const h2 = { fontSize: 14, fontWeight: 700, margin: "16px 0 6px", borderBottom: "2px solid #111", paddingBottom: 3 };
  const dl = { display: "flex", flexWrap: "wrap", gap: "4px 24px", margin: "4px 0" };
  const item = (k, v) => <div key={k} style={{ minWidth: 200 }}><b>{k} :</b> {v}</div>;
  const rt = { textAlign: "right" };

  return (
    <div id="sim-report-print">
      {/* En-tete */}
      <div className="rep-block" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{L("Rapport de simulation — Élevage", "Simulation report — Livestock")}</div>
          <div style={{ fontSize: 12, color: "#555" }}>
            {L("Projection", "Projection")} {debutP}–{finP} · {L("Stratégie", "Strategy")} {strategy}
            {zoneDisplayLabel ? ` · ${L("Zone", "Zone")} ${zoneDisplayLabel}` : ""}
            {dev ? ` · ${L("Devise", "Currency")} ${dev}` : ""}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#555" }}>{L("Édité le", "Generated")} {today}</div>
      </div>

      {/* Synthese */}
      <div className="rep-block">
        <div style={h2}>{L("Synthèse", "Summary")}</div>
        <div style={dl}>
          {item(L("Cheptel de départ", "Starting herd"), `${females} ♀ · ${males} ♂ · ${cohortes.length} ${L("cohorte(s)", "cohort(s)")}`)}
          {item(L("Zone", "Zone"), zoneDisplayLabel || L("Toutes les zones", "All zones"))}
          {item(L("Porcs vendus (total)", "Pigs sold (total)"), totVendus.toLocaleString())}
          {item(L("Chiffre d'affaires (total)", "Revenue (total)"), fmtM(totCA))}
          {item(L("Dépenses (total)", "Expenses (total)"), fmtM(totDep))}
          {item(L("Bénéfice cumulé", "Cumulative profit"), fmtM(cumulBenef))}
          {item(L("Revenu / porc", "Revenue / pig"), fmtM(rev))}
          {item(L("Coût / porc", "Cost / pig"), fmtM(cout))}
          {item(L("Marge / porc", "Margin / pig"), fmtM(marge))}
        </div>
      </div>

      {/* Hypotheses */}
      <div className="rep-block">
        <div style={h2}>{L("Hypothèses", "Assumptions")}</div>
        <div style={dl}>
          {item(L("Nés / portée", "Born / litter"), h.nesParPortee)}
          {item(L("Portées / an", "Litters / yr"), h.porteesParAn)}
          {item(L("Survie", "Survival"), `${h.surviePct} %`)}
          {item(L("Âge saillie", "Breed age"), `${h.ageSaillieMois} ${L("mois", "mo")}`)}
          {item(L("Poids vente", "Sale weight"), `${h.poidsVenteKg} kg`)}
          {item(L("Mode de vente", "Sale mode"), h.modeVente === "entier" ? L("Porc entier vif", "Whole live pig") : L("Découpe", "Cuts"))}
          {strategy === "P2" && item(L("Plafond truies (P2)", "Sow cap (P2)"), h.plafondTruiesP2)}
        </div>
        <div style={h2}>{L("Coûts", "Costs")} {dev ? `(${dev})` : ""}</div>
        <div style={dl}>
          {item(L("Aliment / porc (vie entière)", "Feed / pig (whole life)"), fmtM(h.alimentEngraissementParPorc))}
          {item(L("Aliment / truie / an", "Feed / sow / yr"), fmtM(h.alimentTruieParAn))}
          {item(L("Santé (véto) / porc (vie entière)", "Health (vet) / pig (whole life)"), fmtM(h.vetoParPorc))}
          {item(L("Divers / porc (vie entière)", "Misc / pig (whole life)"), fmtM(h.diversParPorc))}
          {item(L("Salaire / ouvrier / mois", "Salary / worker / mo"), fmtM(h.salaireMensuelOuvrier))}
          {item(L("Investissement (capex) — amorti sur 10 ans", "Investment (capex) — amortized over 10 yrs"), fmtM(h.capex))}
        </div>
      </div>

      {/* Reproducteurs gardes */}
      <div className="rep-block">
        <div style={h2}>{L("Reproducteurs gardés", "Breeders kept")} {granu === "trimestre" ? L("(fin de trimestre)", "(quarter end)") : L("(fin d'année)", "(year end)")}</div>
        <table>
          <thead><tr>
            <th style={{ textAlign: "left" }}>{L("Période", "Period")}</th>
            <th style={rt}>{L("Femelles gardées repro", "Females kept for breeding")}</th>
            <th style={rt}>{L("Mâles gardés repro", "Males kept for breeding")}</th>
            <th style={rt}>{L("Total reproducteurs", "Total breeders")}</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ textAlign: "left" }}>{r.label}</td>
                <td style={rt}>{(r.femellesRepro || 0).toLocaleString()}</td>
                <td style={rt}>{(r.malesRepro || 0).toLocaleString()}</td>
                <td style={{ ...rt, fontWeight: 700 }}>{(r.totalRepro || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Naissances par periode */}
      <div className="rep-block">
        <div style={h2}>{L("Naissances par période", "Births by period")}</div>
        <table>
          <thead><tr>
            <th style={{ textAlign: "left" }}>{L("Période", "Period")}</th>
            <th style={rt}>{L("Mises bas", "Farrowings")}</th>
            <th style={rt}>{L("Nés vivants", "Live births")}</th>
            <th style={rt}>{L("Mortalité naissance", "Birth mortality")}</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ textAlign: "left" }}>{r.label}</td>
                <td style={rt}>{(r.mb || 0).toLocaleString()}</td>
                <td style={{ ...rt, fontWeight: 700 }}>{(r.naissances || 0).toLocaleString()}</td>
                <td style={rt}>{(r.morts || 0).toLocaleString()}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, background: "#f0f0f0" }}>
              <td style={{ textAlign: "left" }}>{L("Total", "Total")}</td>
              <td style={rt}>{totMisesBas.toLocaleString()}</td>
              <td style={rt}>{totNaissances.toLocaleString()}</td>
              <td style={rt}>{totMorts.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tableau de projection */}
      <div className="rep-block">
        <div style={h2}>{L("Projection", "Projection")} {granu === "trimestre" ? L("(par trimestre)", "(quarterly)") : L("(par an)", "(yearly)")}</div>
        <table>
          <thead><tr>
            <th style={{ textAlign: "left" }}>{L("Période", "Period")}</th>
            <th style={rt}>{L("Mises bas", "Farrowings")}</th>
            <th style={rt}>{L("Total animaux", "Total animals")}</th>
            <th style={rt}>{L("Porcs vendus", "Pigs sold")}</th>
            <th style={rt}>{L("Chiffre d'affaires", "Revenue")}</th>
            <th style={rt}>{L("Dépenses", "Expenses")}</th>
            <th style={rt}>{L("Bénéfice", "Profit")}</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ textAlign: "left" }}>{r.label}</td>
                <td style={rt}>{r.mb.toLocaleString()}</td>
                <td style={rt}>{r.vivants.toLocaleString()}</td>
                <td style={rt}>{r.vendus.toLocaleString()}</td>
                <td style={rt}>{fmtM(r.ca)}</td>
                <td style={rt}>{fmtM(r.depenses)}</td>
                <td style={{ ...rt, fontWeight: 700 }}>{fmtM(r.benef)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, background: "#f0f0f0" }}>
              <td style={{ textAlign: "left" }}>{L("Total", "Total")}</td>
              <td style={rt}>—</td>
              <td style={rt}>—</td>
              <td style={rt}>{totVendus.toLocaleString()}</td>
              <td style={rt}>{fmtM(totCA)}</td>
              <td style={rt}>{fmtM(totDep)}</td>
              <td style={rt}>{fmtM(cumulBenef)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Graphe */}
      <div className="rep-block">
        <div style={h2}>{L("Ventes & bénéfice", "Sales & profit")}</div>
        <MaterialLineChart
          type="line"
          colors={["var(--forest-700)", "var(--rust-500)", "var(--clay-600)"]}
          labels={rows.map((r) => r.labelCourt)}
          series={[
            { name: L("Porcs vendus", "Pigs sold"), data: rows.map((r) => r.vendus) },
            { name: L(`Chiffre d'affaires (M ${dev})`, `Revenue (M ${dev})`), data: rows.map((r) => Math.round(r.ca / 1e4) / 100) },
            { name: L(`Bénéfice (M ${dev})`, `Profit (M ${dev})`), data: rows.map((r) => Math.round(r.benef / 1e4) / 100) },
          ]}
          height={240}
        />
      </div>

      {/* Detail des prix */}
      <div className="rep-block">
        <div style={h2}>{L("Détail des prix — découpe", "Price details — cuts")} {dev ? `(${dev})` : ""}</div>
        <table>
          <thead><tr>
            <th style={{ textAlign: "left" }}>{L("Morceau", "Cut")}</th>
            <th style={rt}>{L("Poids (kg)", "Weight (kg)")}</th>
            <th style={rt}>{L("Prix / kg", "Price / kg")}</th>
            <th style={rt}>{L("Sous-total", "Subtotal")}</th>
          </tr></thead>
          <tbody>
            {(h.decoupe || []).map((d, i) => (
              <tr key={i}>
                <td style={{ textAlign: "left" }}>{d.nom}</td>
                <td style={rt}>{d.kg}</td>
                <td style={rt}>{fmtM(d.prix)}</td>
                <td style={rt}>{fmtM(d.kg * d.prix)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700 }}>
              <td style={{ textAlign: "left" }}>{L("Total découpe", "Cuts total")}</td>
              <td style={rt}>{totalDecoupeKg(h.decoupe || [])}</td>
              <td></td>
              <td style={rt}>{fmtM((h.decoupe || []).reduce((s, d) => s + d.kg * d.prix, 0))}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: 6 }}>
          <b>{L("Prix porc vif / kg", "Live pig price / kg")} :</b> {fmtM(h.prixEntierParKg)} ·{" "}
          {L("porc vif", "live pig")} ({h.poidsVenteKg} kg) : <b>{fmtM(h.prixEntierParKg * h.poidsVenteKg)}</b>
        </div>
      </div>
    </div>
  );
}

const SimulatorScreen = ({ lang }) => {
  const L = (fr, en) => (lang === "fr" ? fr : en);
  const effectiveSpeciesFilter = SIMULATOR_SPECIES;
  const [h, setH] = React.useState(DEFAULTS);
  const [strategy, setStrategy] = React.useState("P2");
  const [animals, setAnimals] = React.useState([]);
  const [reproEvents, setReproEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [calibNotes, setCalibNotes] = React.useState(null);
  const [prog, setProg] = React.useState(null);
  const [importing, setImporting] = React.useState(false);
  const [currencies, setCurrencies] = React.useState([]);
  const [prixNotes, setPrixNotes] = React.useState(null);     // resultat import prix
  const [importingPrix, setImportingPrix] = React.useState(false);
  const [saisieCurrencyId, setSaisieCurrencyId] = React.useState(null); // devise choisie (null = aucune, a choisir)
  const [zoneFilter, setZoneFilter] = React.useState(ZONE_ALL);
  const set = (k) => (v) => setH((s) => ({ ...s, [k]: v }));
  const setPoidsVente = (v) => setH((s) => {
    const poidsVenteKg = Number(v) || 0;
    return { ...s, poidsVenteKg, decoupe: scaleDecoupeToWeight(s.decoupe, poidsVenteKg) };
  });

  // Edition d'un morceau de la decoupe (kg ou prix)
  const setDecoupe = (i, champ) => (v) => setH((s) => {
    const decoupe = s.decoupe.map((d, j) => (j === i ? { ...d, [champ]: Number(v) } : d));
    return champ === "kg" ? { ...s, decoupe, poidsVenteKg: totalDecoupeKg(decoupe) } : { ...s, decoupe };
  });

  // Import des prix reels depuis la liste de prix FarmOS (best-effort)
  const importerPrix = async () => {
    setImportingPrix(true);
    try {
      const res = await api.listPrices();
      const rows = res?.getAllPrice || res?.data || (Array.isArray(res) ? res : []);
      const { hypotheses, notes } = appliquerPrixReels(h, rows, effectiveSpeciesFilter);
      setH(hypotheses);
      setPrixNotes(notes.length ? notes : [L("Aucun prix correspondant trouvé dans la liste de prix.", "No matching price found in the price list.")]);
    } catch (e) {
      setPrixNotes([L("Impossible de charger la liste de prix.", "Could not load price list.") + " " + (e.message || "")]);
    } finally { setImportingPrix(false); }
  };

  const importReal = async () => {
    setImporting(true);
    try {
      const real = await loadRealData();
      const { hypotheses, notes } = calibrate(real, h, animals, effectiveSpeciesFilter, devData, zoneFilter);
      setH(hypotheses);
      setCalibNotes(notes.length ? notes : [L("Peu de donnees reelles exploitables — verifiez la saisie dans FarmOS.", "Few usable real data — check FarmOS entries.")]);
      setProg(progression(real, effectiveSpeciesFilter, animals, zoneFilter));
    } catch (e) {
      setCalibNotes([L("Erreur de chargement des donnees.", "Data load error.") + " " + (e.message || "")]);
    } finally { setImporting(false); }
  };

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.allSettled([api.listAnimals(), api.listReproductionEvents()]).then(([animalsRes, reproRes]) => {
      if (!alive) return;
      const av = animalsRes.status === "fulfilled" ? animalsRes.value : null;
      const rv = reproRes.status === "fulfilled" ? reproRes.value : null;
      const list = av?.getAllAnimal || av?.data || (Array.isArray(av) ? av : []);
      const repro = rv?.reproductionEvents || rv?.getAllReproductionEvent || rv?.data || (Array.isArray(rv) ? rv : []);
      setAnimals(list);
      setReproEvents(repro);
    }).catch(() => { setAnimals([]); setReproEvents([]); }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  // Devises : on REUTILISE les devises deja permises (currency.js). Aucune n'est
  // pre-selectionnee : l'utilisateur choisit la sienne (pas de devise systeme imposee).
  React.useEffect(() => {
    let alive = true;
    api.listCurrencies().then((curRaw) => {
      if (!alive) return;
      const list = curRaw?.getAllCurrency || (Array.isArray(curRaw) ? curRaw : []);
      setCurrencies(list);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const curOptions = currencyOptions(currencies);

  // UNE seule devise, au CHOIX de l'utilisateur, AUCUNE par defaut. Tant qu'aucune
  // n'est choisie, on n'affiche aucun code/symbole de devise (ni USD ni CDF).
  // Choisir une devise ne convertit PAS les nombres : ca les etiquette seulement.
  const saisieChoisie = saisieCurrencyId != null;
  const saisieCode = saisieChoisie ? (codeOf(saisieCurrencyId, currencies) || "") : "";
  const symbole = saisieChoisie ? symbolFor(saisieCurrencyId, currencies, "") : "";
  const fmtM = (v) => fmtMontant(v, symbole); // pas de conversion : meme devise partout
  const devData = saisieCode; // suffixe inputs = devise choisie (vide si non choisie)

  // Seuil de prime : exprime dans la devise choisie (aucune conversion).
  const seuilEnBase = Number(h.seuilPrime) || 0;

  const zoneOptions = React.useMemo(
    () => buildZoneOptions(animals, effectiveSpeciesFilter), [animals, effectiveSpeciesFilter]);
  React.useEffect(() => {
    if (zoneFilter !== ZONE_ALL && !zoneOptions.some((z) => z.key === zoneFilter)) setZoneFilter(ZONE_ALL);
  }, [zoneFilter, zoneOptions]);
  const zoneLabel = (z) => z?.key === ZONE_NONE ? L("Non renseignée", "Unassigned") : (z?.label || "");
  const selectedZone = zoneFilter === ZONE_ALL ? null : zoneOptions.find((z) => z.key === zoneFilter);
  const selectedZoneLabel = zoneFilter === ZONE_ALL ? L("Toutes les zones", "All zones") : zoneLabel(selectedZone);
  const animalsForProjection = React.useMemo(
    () => filterAnimalsByZone(animals, zoneFilter), [animals, zoneFilter]);

  const { cohortes, cohortesMales, females, males, verrats, realBirthsAdded, mothersRecalibrated } = React.useMemo(
    () => buildCohortes(animalsForProjection, effectiveSpeciesFilter, h.anneeDebut, h.moisDebut, { reproEvents, hypotheses: h }),
    [animalsForProjection, effectiveSpeciesFilter, h, reproEvents]);

  const useDemoData = !loading && animals.length === 0;
  const cohortesUse = cohortes.length ? cohortes : (useDemoData ? [{ naissanceMoisAbs: -1, n: 88 }] : []);
  // males a vendre = lots non-reproducteurs (engraissement/porcelets) vendus a l'age de vente
  const cohortesMalesUse = cohortesMales.length ? cohortesMales
    : (useDemoData ? [{ naissanceMoisAbs: -1, n: 14 }] : []); // fallback demo seulement si aucune donnee animal
  const rowsP1 = React.useMemo(
    () => simulate("P1", h, cohortesUse, 0, seuilEnBase, cohortesMalesUse, verrats),
    [h, cohortes, cohortesMales, verrats, seuilEnBase, useDemoData]);
  const rowsP2 = React.useMemo(
    () => simulate("P2", h, cohortesUse, 0, seuilEnBase, cohortesMalesUse, verrats),
    [h, cohortes, cohortesMales, verrats, seuilEnBase, useDemoData]);
  const rows = strategy === "P1" ? rowsP1 : rowsP2;

  const zoneComparisonRows = React.useMemo(() => zoneOptions.map((z) => {
    const za = filterAnimalsByZone(animals, z.key);
    const c = buildCohortes(za, effectiveSpeciesFilter, h.anneeDebut, h.moisDebut, { reproEvents, hypotheses: h });
    const rs = simulate(strategy, h, c.cohortes, 0, seuilEnBase, c.cohortesMales, c.verrats);
    return {
      key: z.key,
      label: z.label,
      count: z.count,
      females: c.females,
      males: c.males,
      verrats: c.verrats,
      vendus: rs.reduce((s, r) => s + r.vendus, 0),
      ca: rs.reduce((s, r) => s + r.ca, 0),
      benef: rs.reduce((s, r) => s + r.benef, 0),
      finVivants: rs[rs.length - 1]?.vivants || 0,
    };
  }), [zoneOptions, animals, effectiveSpeciesFilter, h, strategy, seuilEnBase, reproEvents]);

  const debutP = h.anneeDebut || 2026;
  const moisD0 = Math.min(11, Math.max(0, (h.moisDebut || 1) - 1));
  const nbMoisTot = Math.max(1, h.horizonAns || 5) * 12;
  const finCivAbs = debutP * 12 + moisD0 + nbMoisTot - 1; // dernier mois civil inclus
  const finP = Math.floor(finCivAbs / 12);
  const periodeRange = debutP === finP ? `${debutP}` : `${debutP}-${finP}`;
  const rev = revenuParPorc(h);
  const cout = coutParPorc(h);
  const marge = rev - cout;
  const cumulBenef = rows.reduce((s, r) => s + r.benef, 0);

  const card = { padding: 16, marginBottom: 14 };
  const upper = { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8, color: "var(--fg-3)" };
  const th = { textAlign: "right", padding: "6px 8px", fontSize: 11, color: "var(--fg-3)", whiteSpace: "nowrap" };
  const td = { textAlign: "right", padding: "6px 8px", fontSize: 13, whiteSpace: "nowrap" };
  const reportView = (
    <ReportView
      L={L} rows={rows} h={h} strategy={strategy}
      zoneDisplayLabel={selectedZoneLabel}
      females={females} males={males} cohortes={cohortes}
      saisieCode={saisieCode} fmtM={fmtM}
      rev={rev} cout={cout} marge={marge} cumulBenef={cumulBenef}
      debutP={debutP} finP={finP} granu={h.granularite}
    />
  );

  return (
    <div id="simulator-report" style={{ padding: "var(--pad-page)", overflow: "auto", height: "100%", maxWidth: 1100 }}>
      <style>{`
        #sim-report-print { display: none; }
        @media print {
          html, body { height: auto !important; overflow: visible !important; }
          body > :not(#sim-report-print) { display: none !important; }
          #sim-report-print {
            display: block !important; position: static !important;
            width: auto; padding: 0; color: #111; font-size: 12px;
          }
          #sim-report-print .rep-block { break-inside: auto; page-break-inside: auto; margin-bottom: 12px; }
          #sim-report-print table { width: 100%; border-collapse: collapse; break-inside: auto; page-break-inside: auto; }
          #sim-report-print thead { display: table-header-group; }
          #sim-report-print tfoot { display: table-footer-group; }
          #sim-report-print tr { break-inside: avoid; page-break-inside: avoid; }
          #sim-report-print th, #sim-report-print td { border: 1px solid #ccc; padding: 5px 8px; }
          @page { margin: 14mm; }
        }
      `}</style>

      {/* Vue RAPPORT : invisible a l'ecran, imprimee depuis body pour permettre la pagination multi-pages. */}
      {typeof document !== "undefined" ? createPortal(reportView, document.body) : reportView}
      {/* Devise : reglage global, en haut. Aucune devise imposee tant que non choisie. */}
      <div className="card" style={{ ...card, ...(saisieChoisie ? {} : { borderLeft: "3px solid var(--warning, #d97706)", background: "var(--warning-bg, #fffbeb)" }) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <b>{L("Devise", "Currency")}</b>
            <select className="input" value={saisieCurrencyId ?? ""} style={{ height: 32, minWidth: 150 }}
              onChange={(e) => setSaisieCurrencyId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">{L("— Choisir —", "— Choose —")}</option>
              {curOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          <button className="btn no-print" onClick={() => window.print()} style={{ marginLeft: "auto" }}>
            {L("🖨️ Imprimer le rapport", "🖨️ Print report")}
          </button>
          <div style={{ fontSize: 11, color: "var(--fg-3)", flex: 1, minWidth: 220 }}>
            {saisieChoisie
              ? L(`Tous les montants sont exprimés en ${saisieCode}. Les chiffres de départ sont indicatifs — ajustez-les ou importez vos données réelles.`,
                  `All amounts are expressed in ${saisieCode}. Starting figures are indicative — adjust them or import your real data.`)
              : L("Choisissez d'abord votre devise : aucune n'est imposée. Tous les montants seront alors exprimés dans cette devise.",
                  "Choose your currency first: none is imposed. All amounts will then be expressed in that currency.")}
          </div>
        </div>
      </div>

      {/* Vue par zone : filtre la projection et compare les zones porc */}
      <div className="card" style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={upper}>{L("Vue par zone", "Zone view")}</div>
            <select className="input" value={zoneFilter} style={{ height: 32, minWidth: 220 }}
              onChange={(e) => setZoneFilter(e.target.value)}>
              <option value={ZONE_ALL}>{L("Toutes les zones", "All zones")}</option>
              {zoneOptions.map((z) => (
                <option key={z.key} value={z.key}>{zoneLabel(z)} ({z.count})</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", maxWidth: 520 }}>
            {L(
              `Projection recalculée sur : ${selectedZoneLabel}. Les zones sont déduites dans l'ordre zone_id, salle, bâtiment, lot.`,
              `Projection recalculated on: ${selectedZoneLabel}. Zones are inferred in this order: zone_id, room, barn, batch.`
            )}
          </div>
        </div>
        {loading && zoneComparisonRows.length === 0 && (
          <SectionLoader lang={lang} compact/>
        )}
        {zoneComparisonRows.length > 0 && (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ ...th, textAlign: "left" }}>{L("Zone", "Zone")}</th>
                <th style={th}>{L("Porcs depart", "Starting pigs")}</th>
                <th style={th}>{L("Femelles", "Females")}</th>
                <th style={th}>{L("Males", "Males")}</th>
                <th style={th}>{L("Vendus", "Sold")}</th>
                <th style={th}>CA</th>
                <th style={th}>{L("Benefice", "Profit")}</th>
                <th style={th}>{L("Fin periode", "End period")}</th>
              </tr></thead>
              <tbody>
                {zoneComparisonRows.map((z) => (
                  <tr key={z.key} style={{ borderBottom: "1px solid var(--border-subtle, var(--border))", background: zoneFilter === z.key ? "var(--forest-50, #eef7ee)" : "transparent" }}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{zoneLabel(z)}</td>
                    <td style={td}>{z.count.toLocaleString()}</td>
                    <td style={td}>{z.females.toLocaleString()}</td>
                    <td style={td}>{z.males.toLocaleString()}{z.verrats ? ` (${z.verrats} verrats)` : ""}</td>
                    <td style={td}>{Math.round(z.vendus).toLocaleString()}</td>
                    <td style={td}>{fmtM(z.ca)}</td>
                    <td style={{ ...td, fontWeight: 600, color: z.benef >= 0 ? "var(--forest-700, green)" : "crimson" }}>{fmtM(z.benef)}</td>
                    <td style={td}>{Math.round(z.finVivants).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && zoneComparisonRows.length === 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--fg-3)" }}>
            {L("Aucun porc actif avec zone exploitable.", "No active pig with usable zone data.")}
          </div>
        )}
      </div>
      {/* En-tete + cheptel detecte */}
      <div className="card" style={card}>
        <div style={upper}>{L("Cheptel de depart (detecte)", "Starting herd (detected)")}</div>
        {loading ? <SectionLoader lang={lang} compact/> : (
          <div style={{ fontSize: 13 }}>
            {L("Total", "Total")}: <b>{females + males}</b>
            {" · "}{L("Femelles", "Females")}: <b>{females}</b> · {L("Males", "Males")}: <b>{males}</b>
            {verrats ? <> {" · "}{L("dont verrats (geniteurs, non vendus)", "incl. boars (breeders, not sold)")}: <b>{verrats}</b></> : null}
            {" · "}{cohortes.length} {L("cohorte(s) repro", "breeding cohort(s)")}
            {cohortesMales.length ? <> {" + "}{cohortesMales.length} {L("lot(s) males a vendre", "male lot(s) to sell")}</> : null}
            {realBirthsAdded ? <> {" · "}{L("nés réels ajoutés", "real births added")}: <b>{realBirthsAdded}</b></> : null}
            {mothersRecalibrated ? <> {" · "}{L("mères recalées", "mothers recalibrated")}: <b>{mothersRecalibrated}</b></> : null}
            {` · ${L("porcs uniquement", "pigs only")} · ${selectedZoneLabel}`}
          </div>
        )}
        <div style={{ marginTop: 12 }} className="no-print">
          <button className="btn btn-primary" onClick={importReal} disabled={importing}>
            {importing ? L("Import…", "Importing…") : L("📥 Importer mes donnees reelles (depenses, salaires, ventes, repro)", "📥 Import my real data (expenses, salaries, sales, repro)")}
          </button>
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6 }}>
            {L("Calibre la simulation sur vos vraies donnees enregistrees au lieu des estimations de marche.",
               "Calibrates the simulation on your real recorded data instead of market estimates.")}
          </div>
        </div>
        {calibNotes && (
          <div style={{ marginTop: 12, padding: 10, background: "var(--forest-50, #eef7ee)", borderRadius: 8, fontSize: 12 }}>
            <b>{L("Hypotheses calibrees sur vos donnees :", "Assumptions calibrated on your data:")}</b>
            <ul style={{ margin: "6px 0 0 18px" }}>{calibNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
          </div>
        )}
      </div>

      {/* Analyse de progression (donnees reelles par annee) */}
      {prog && prog.length > 0 && (
        <div className="card" style={card}>
          <div style={upper}>{L("Votre progression reelle (donnees enregistrees)", "Your real progression (recorded data)")}</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
              <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ ...th, textAlign: "left" }}>{L("Annee", "Year")}</th>
                <th style={th}>{L("Ventes", "Sales")}</th>
                <th style={th}>CA</th>
                <th style={th}>{L("Depenses", "Expenses")}</th>
                <th style={th}>{L("Naissances", "Births")}</th>
                <th style={th}>{L("Morts", "Deaths")}</th>
              </tr></thead>
              <tbody>
                {prog.map((p) => (
                  <tr key={p.annee} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{p.annee}</td>
                    <td style={td}>{p.ventes}</td>
                    <td style={td}>{fmtM(p.ca)}</td>
                    <td style={td}>{fmtM(p.depenses)}</td>
                    <td style={td}>{p.naissances}</td>
                    <td style={td}>{p.morts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--fg-3)" }}>
            {L("Compare vos annees pour voir la tendance reelle, base de la prevision.",
               "Compare your years to see the real trend, the basis of the forecast.")}
          </div>
        </div>
      )}

      {/* Choix strategie + mode de vente */}
      <div className="card" style={{ ...card, display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={upper}>{L("Strategie", "Strategy")}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["P2", L("P2 — plafond truies", "P2 — sow cap")], ["P1", L("P1 — garder tout (potentiel)", "P1 — keep all (potential)")]].map(([k, lbl]) => (
              <button key={k} className={"btn " + (strategy === k ? "btn-primary" : "")}
                onClick={() => setStrategy(k)}>{lbl}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={upper}>{L("Mode de vente", "Sale mode")}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["decoupe", L("Decoupe", "Cuts")], ["entier", L("Porc entier vif", "Whole live pig")]].map(([k, lbl]) => (
              <button key={k} className={"btn " + (h.modeVente === k ? "btn-primary" : "")}
                onClick={() => set("modeVente")(k)}>{lbl}</button>
            ))}
          </div>
        </div>
        {strategy === "P2" && <NumInput label={L("Plafond truies (P2)", "Sow cap (P2)")} value={h.plafondTruiesP2} onChange={set("plafondTruiesP2")} />}
      </div>

      {/* Periode : annee de depart, horizon, granularite */}
      <div className="card" style={{ ...card, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
        <NumInput label={L("Annee de depart", "Start year")} value={h.anneeDebut} onChange={set("anneeDebut")} />
        <div>
          <div style={upper}>{L("Mois de depart", "Start month")}</div>
          <select className="input" value={h.moisDebut || 1} style={{ height: 32, minWidth: 120 }}
            onChange={(e) => set("moisDebut")(Number(e.target.value))}>
            {[L("janvier", "January"), L("fevrier", "February"), L("mars", "March"), L("avril", "April"),
              L("mai", "May"), L("juin", "June"), L("juillet", "July"), L("aout", "August"),
              L("septembre", "September"), L("octobre", "October"), L("novembre", "November"), L("decembre", "December")]
              .map((nom, i) => <option key={i + 1} value={i + 1}>{nom}</option>)}
          </select>
        </div>
        <NumInput label={L("Horizon", "Horizon")} value={h.horizonAns} onChange={set("horizonAns")} suffix={L("ans", "yrs")} />
        <div>
          <div style={upper}>{L("Granularite", "Granularity")}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["annee", L("Par annee", "Yearly")], ["trimestre", L("Par trimestre", "Quarterly")]].map(([k, lbl]) => (
              <button key={k} className={"btn " + (h.granularite === k ? "btn-primary" : "")}
                onClick={() => set("granularite")(k)}>{lbl}</button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", maxWidth: 240 }}>
          {L(`Projection ${rows[0]?.label || debutP} → ${rows[rows.length - 1]?.label || finP}`,
             `Projection ${rows[0]?.label || debutP} → ${rows[rows.length - 1]?.label || finP}`)}
        </div>
      </div>

      {/* Hypotheses ajustables */}
      <div className="card" style={card}>
        <div style={upper}>{L("Hypotheses (ajustables)", "Assumptions (adjustable)")}</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <NumInput label={L("Nes / portee", "Born / litter")} value={h.nesParPortee} onChange={set("nesParPortee")} />
          <NumInput label={L("Portees / an", "Litters / yr")} value={h.porteesParAn} onChange={set("porteesParAn")} />
          <NumInput label={L("Survie", "Survival")} value={h.surviePct} onChange={set("surviePct")} suffix="%" />
          <NumInput label={L("Age saillie", "Breed age")} value={h.ageSaillieMois} onChange={set("ageSaillieMois")} suffix={L("mois", "mo")} />
          <NumInput label={L("Poids vente", "Sale weight")} value={h.poidsVenteKg} onChange={setPoidsVente} suffix="kg" />
          <NumInput label={L("Seuil prime", "Bonus threshold")} value={h.seuilPrime} onChange={set("seuilPrime")} suffix={saisieCode} />
          <NumInput label={L("Taux prime", "Bonus rate")} value={h.tauxPrimePct} onChange={set("tauxPrimePct")} suffix="%" />
        </div>
      </div>

      {/* Couts : editables, et remplis par "Importer mes donnees reelles" (calibrate) */}
      <div className="card" style={card}>
        <div style={upper}>{L("Coûts (modifiable)", "Costs (editable)")}</div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 10 }}>
          {L("Le bouton « Importer mes données réelles » remplit ces champs depuis vos dépenses. « / porc » = montant total pour élever un porc jusqu'à la vente (toute sa vie), pas par jour ni par mois.",
             "The \"Import my real data\" button fills these from your expenses. \"/ pig\" = total amount to raise one pig until sale (its whole life), not per day or per month.")}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <NumInput label={L("Aliment / porc (vie entière)", "Feed / pig (whole life)")} value={h.alimentEngraissementParPorc} onChange={set("alimentEngraissementParPorc")} suffix={saisieCode} />
          <NumInput label={L("Aliment / truie / an", "Feed / sow / yr")} value={h.alimentTruieParAn} onChange={set("alimentTruieParAn")} suffix={saisieCode} />
          <NumInput label={L("Santé (véto) / porc (vie entière)", "Health (vet) / pig (whole life)")} value={h.vetoParPorc} onChange={set("vetoParPorc")} suffix={saisieCode} />
          <NumInput label={L("Divers / porc (vie entière)", "Misc / pig (whole life)")} value={h.diversParPorc} onChange={set("diversParPorc")} suffix={saisieCode} />
          <NumInput label={L("Salaire / ouvrier / mois", "Salary / worker / mo")} value={h.salaireMensuelOuvrier} onChange={set("salaireMensuelOuvrier")} suffix={saisieCode} />
          <NumInput label={L("Investissement (capex) — amorti sur 10 ans", "Investment (capex) — amortized over 10 yrs")} value={h.capex} onChange={set("capex")} suffix={saisieCode} />
        </div>
      </div>

      {/* Detail des prix : decoupe (par morceau) + porc vif — editable + importable */}
      <div className="card" style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={upper}>{L("Détail des prix (modifiable)", "Price details (editable)")}</div>
          <button className="btn" onClick={importerPrix} disabled={importingPrix} style={{ fontSize: 12 }}>
            {importingPrix ? L("Import…", "Importing…") : L("📥 Importer mes prix", "📥 Import my prices")}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 10 }}>
          {saisieChoisie
            ? L(`Prix en ${saisieCode}. Le mode de vente actif détermine le revenu utilisé.`,
                `Prices in ${saisieCode}. The active sale mode sets the revenue used.`)
            : L("Choisissez votre devise en haut de la page. Le mode de vente actif détermine le revenu utilisé.",
                "Choose your currency at the top of the page. The active sale mode sets the revenue used.")}
        </div>

        {/* Tableau decoupe */}
        <div style={{ overflowX: "auto", marginBottom: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
            <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ ...th, textAlign: "left" }}>{L("Morceau (découpe)", "Cut")}</th>
              <th style={th}>{L("Poids (kg)", "Weight (kg)")}</th>
              <th style={th}>{L("Prix / kg", "Price / kg")}{saisieCode ? ` (${saisieCode})` : ""}</th>
              <th style={th}>{L("Sous-total", "Subtotal")}</th>
            </tr></thead>
            <tbody>
              {h.decoupe.map((d, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle, var(--border))" }}>
                  <td style={{ ...td, textAlign: "left" }}>{d.nom}</td>
                  <td style={td}>
                    <input className="input" type="number" value={d.kg}
                      onChange={(e) => setDecoupe(i, "kg")(e.target.value)} style={{ width: 80, textAlign: "right" }} />
                  </td>
                  <td style={td}>
                    <input className="input" type="number" value={d.prix}
                      onChange={(e) => setDecoupe(i, "prix")(e.target.value)} style={{ width: 100, textAlign: "right" }} />
                  </td>
                  <td style={td}>{fmtM(d.kg * d.prix)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{L("Total découpe", "Cuts total")}</td>
                <td style={{ ...td, fontWeight: 600 }}>{totalDecoupeKg(h.decoupe)}</td>
                <td style={td}></td>
                <td style={{ ...td, fontWeight: 600 }}>{fmtM(h.decoupe.reduce((s, d) => s + d.kg * d.prix, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Prix porc vif */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <NumInput label={L("Prix porc vif / kg", "Live pig price / kg")} value={h.prixEntierParKg} onChange={set("prixEntierParKg")} suffix={saisieCode} />
          <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
            {L("Poids vente", "Sale weight")}: {h.poidsVenteKg} kg → {L("porc vif", "live pig")}: <b>{fmtM(h.prixEntierParKg * h.poidsVenteKg)}</b>
          </span>
        </div>

        {prixNotes && (
          <div style={{ padding: 10, background: "var(--forest-50, #eef7ee)", borderRadius: 8, fontSize: 12, marginBottom: 10 }}>
            <b>{L("Prix importés :", "Imported prices:")}</b>
            <ul style={{ margin: "6px 0 0 18px" }}>{prixNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
          </div>
        )}

        {/* Synthese revenu/cout/marge selon le mode actif */}
        <div style={{ fontSize: 13, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          {L("Mode actif", "Active mode")}: <b>{h.modeVente === "entier" ? L("porc vif", "live pig") : L("découpe", "cuts")}</b> ·{" "}
          {L("Revenu", "Revenue")}: <b>{fmtM(rev)}</b> ·
          {" "}{L("Cout", "Cost")}: {fmtM(cout)} ·
          {" "}{L("Marge", "Margin")}: <b>{fmtM(marge)}</b> ({rev > 0 ? Math.round(marge / rev * 100) : 0}%)
        </div>
      </div>

      {/* Tableau projection */}
      <div className="card" style={card}>
        <div style={upper}>{L("Projection", "Projection")} {periodeRange} — {strategy}{h.granularite === "trimestre" ? ` · ${L("trimestres", "quarters")}` : ""}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ ...th, textAlign: "left" }}>{h.granularite === "trimestre" ? L("Trimestre", "Quarter") : L("Annee", "Year")}</th>
                <th style={th}>{L("Mises bas", "Farrowings")}</th>
                <th style={th}>{L("Total animaux", "Total animals")}</th>
                <th style={th}>{L("Vendus", "Sold")}</th>
                <th style={th}>CA ({symbole})</th>
                <th style={th}>{L("Depenses", "Expenses")}</th>
                <th style={th}>{L("Benefice", "Profit")}</th>
                <th style={th}>{L("Prime", "Bonus")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} style={{ borderBottom: "1px solid var(--border-subtle, var(--border))" }}>
                  <td style={{ ...td, textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{r.label}</td>
                  <td style={td}>{r.mb}</td>
                  <td style={td}>{r.vivants.toLocaleString()}</td>
                  <td style={td}>{r.vendus.toLocaleString()}</td>
                  <td style={td}>{fmtM(r.ca)}</td>
                  <td style={td}>{fmtM(r.depenses)}</td>
                  <td style={{ ...td, fontWeight: 600, color: r.benef >= 0 ? "var(--forest-700, green)" : "crimson" }}>{fmtM(r.benef)}</td>
                  <td style={td}>{r.prime > 0 ? fmtM(r.prime) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--fg-3)" }}>
          {L(`CA − Depenses = Benefice. Benefice net cumule ${periodeRange} :`, `Revenue − Expenses = Profit. Cumulative net profit ${periodeRange}:`)}{" "}
          <b>{fmtM(cumulBenef)}</b>
        </div>
      </div>

      {/* Graphique ventes + benefice */}
      <div className="card" style={card}>
        <div style={upper}>{L("Ventes & benefice par", "Sales & profit per")} {h.granularite === "trimestre" ? L("trimestre", "quarter") : L("an", "year")}</div>
        <MaterialLineChart
          type="line"
          colors={["var(--forest-700)", "var(--rust-500)", "var(--clay-600)"]}
          labels={rows.map((r) => r.labelCourt)}
          series={[
            { name: L("Porcs vendus", "Pigs sold"), data: rows.map((r) => r.vendus) },
            { name: L(`Chiffre d'affaires (M ${symbole})`, `Revenue (M ${symbole})`), data: rows.map((r) => Math.round(r.ca / 1e4) / 100) },
            { name: L(`Benefice (M ${symbole})`, `Profit (M ${symbole})`), data: rows.map((r) => Math.round(r.benef / 1e4) / 100) },
          ]}
          height={260}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8, fontSize: 12, color: "var(--fg-2)" }}>
          {[
            { c: "var(--forest-700)", t: L("Porcs vendus", "Pigs sold") },
            { c: "var(--rust-500)", t: L(`Chiffre d'affaires (M ${symbole})`, `Revenue (M ${symbole})`) },
            { c: "var(--clay-600)", t: L(`Benefice (M ${symbole})`, `Profit (M ${symbole})`) },
          ].map((s) => (
            <span key={s.t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 3, borderRadius: 2, background: s.c }} />
              {s.t}
            </span>
          ))}
        </div>
      </div>

      {/* NOUVEAU graphe : comparaison strategie P1 vs P2 (cheptel, ventes, mortalite) */}
      <div className="card" style={card}>
        <div style={upper}>{L("Comparaison des stratégies P1 vs P2", "Strategy comparison P1 vs P2")}</div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 12 }}>
          {L("P1 = garder toutes les femelles (cheptel maximal). P2 = plafonner les truies et vendre l'excédent. Un graphe par indicateur ; ligne pleine = P1, pointillés = P2.",
             "P1 = keep all females (max herd). P2 = cap sows and sell the surplus. One chart per metric; solid line = P1, dashed = P2.")}
        </div>
        <div style={{ fontSize: 11, color: "var(--warning, #b45309)", background: "var(--warning-bg, #fffbeb)", border: "1px solid var(--warning, #f0c36d)", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
          ⚠️ {L("P1 est un potentiel théorique SANS limite physique : sans capacité de bâtiment ni achat de places, le cheptel croît de façon exponentielle (chaque femelle née devient reproductrice). À lire comme un plafond maximal, pas comme une prévision réaliste — la production réelle sera bornée par votre capacité. P2 reflète une conduite réaliste (truies plafonnées, excédent vendu).",
                "P1 is a theoretical potential with NO physical limit: without barn capacity or buying slots, the herd grows exponentially (every female born becomes a breeder). Read it as a maximum ceiling, not a realistic forecast — real output is capped by your capacity. P2 reflects a realistic operation (capped sows, surplus sold).")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {[
            { t: L("Naissances (vivantes)", "Births (alive)"), p1: rowsP1.map((r) => r.naissances), p2: rowsP2.map((r) => r.naissances) },
            { t: L("Total animaux (cheptel vivant)", "Total animals (live herd)"), p1: rowsP1.map((r) => r.vivants), p2: rowsP2.map((r) => r.vivants) },
            { t: L("Porcs vendus", "Pigs sold"), p1: rowsP1.map((r) => r.vendus), p2: rowsP2.map((r) => r.vendus) },
            { t: L("Mâles vendus", "Males sold"), p1: rowsP1.map((r) => r.vendusM), p2: rowsP2.map((r) => r.vendusM) },
            { t: L("Femelles vendues", "Females sold"), p1: rowsP1.map((r) => r.vendusF), p2: rowsP2.map((r) => r.vendusF) },
            { t: L("Truies actives (reproductrices)", "Active sows (breeders)"), p1: rowsP1.map((r) => r.truies), p2: rowsP2.map((r) => r.truies) },
            { t: L("Mortalité (à la naissance)", "Mortality (at birth)"), p1: rowsP1.map((r) => r.morts), p2: rowsP2.map((r) => r.morts) },
            { t: L(`Bénéfice (M ${symbole})`, `Profit (M ${symbole})`), p1: rowsP1.map((r) => Math.round(r.benef / 1e4) / 100), p2: rowsP2.map((r) => Math.round(r.benef / 1e4) / 100) },
          ].map((g) => (
            <div key={g.t}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{g.t}</div>
              <MaterialLineChart
                type="line"
                colors={["var(--forest-700)", "var(--clay-600)"]}
                dashArray={[0, 5]}
                labels={rowsP1.map((r) => r.labelCourt)}
                series={[
                  { name: "P1", data: g.p1 },
                  { name: "P2", data: g.p2 },
                ]}
                height={180}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 8, fontSize: 12, color: "var(--fg-2)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 3, borderRadius: 2, background: "var(--forest-700)" }} />P1
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 0, borderTop: "3px dashed var(--clay-600)" }} />P2
          </span>
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 24 }}>
        {L(
          "Cheptel de depart lu depuis vos donnees reelles. Les montants de depart sont indicatifs : choisissez votre devise et ajustez les hypotheses, ou importez vos donnees reelles.",
          "Starting herd read from your real data. Starting amounts are indicative: choose your currency and adjust the assumptions, or import your real data."
        )}
      </div>
    </div>
  );
};

export { SimulatorScreen };
