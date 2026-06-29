/* eslint-disable */
import React from "react";
import { api } from "./api";
import { MaterialLineChart } from "./material-charts.jsx";
import { defaultCurrencyId, symbolFor, currencyOptions, currencyIdOf } from "./currency";

// ─────────────────────────────────────────────────────────────────────────
// SIMULATEUR D'ELEVAGE — projection cheptel 5 ans, strategies P1/P2,
// valorisation par decoupe, compte de resultat (CA - depenses = benefice),
// prime travailleurs. Calcul 100% frontend (pas d'ecriture DB, marche offline).
// Modele PAR COHORTE (age reel) : porte du modele Python valide avec le client.
// ─────────────────────────────────────────────────────────────────────────

const YEARS = [2026, 2027, 2028, 2029, 2030];

// Hypotheses par defaut (= celles du modele Excel/rapport, refs marche RDC 2026)
const DEFAULTS = {
  nesParPortee: 10,
  porteesParAn: 2.3,
  surviePct: 85,
  partMalesPct: 50,
  ageSaillieMois: 8,
  gestationMois: 4,        // gestation + detection
  ageVenteMois: 7,
  poidsVenteKg: 95,
  plafondTruiesP2: 150,
  anneeDebut: 2026,
  horizonAns: 5,
  granularite: "annee",   // "annee" | "trimestre"
  // couts (CDF)
  alimentEngraissementParPorc: 342000,
  alimentTruieParAn: 1320000,
  vetoParPorc: 30000,
  diversParPorc: 40000,
  salaireMensuelOuvrier: 559000,
  capex: 206000000,
  // prime travailleurs : seuil exprime dans une devise au choix (aucune fixee)
  seuilPrime: 50000,
  seuilPrimeDeviseId: null, // null = devise des donnees ; sinon une devise permise
  tauxPrimePct: 5,
  // decoupe d'un porc (poids kg, prix CDF/kg)
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

function vendablesParTruieAn(h) {
  return h.nesParPortee * h.porteesParAn * (h.surviePct / 100);
}

function coutParPorc(h) {
  const malesTruie = vendablesParTruieAn(h) * (h.partMalesPct / 100);
  const quotePartMere = malesTruie > 0 ? h.alimentTruieParAn / malesTruie : 0;
  return h.alimentEngraissementParPorc + quotePartMere + h.vetoParPorc + h.diversParPorc;
}

// Noms de mois (debut de trimestre) pour l'affichage trimestriel
const MOIS_T = { 0: "janv", 3: "avr", 6: "juil", 9: "oct" };
const MOIS_T_FIN = { 0: "mars", 3: "juin", 6: "sept", 9: "déc" };

// ─── MOTEUR PAR COHORTE (mois par mois) ──────────────────────────────────
// cohortesInit: [{ naissanceMoisAbs, n }]  (mois 0 = janvier de anneeDebut)
// Accumule en buckets mensuels puis agrege par periode (annee OU trimestre).
function simulate(strategy, h, cohortesInit, malesActuels, seuilEnBase = 0) {
  const debut = h.anneeDebut || 2026;
  const nbAns = Math.max(1, Math.min(30, h.horizonAns || 5));
  const HORIZON = nbAns * 12 - 1; // dernier mois inclus (mois 0 = janv debut)
  // buckets mensuels
  const moisData = [];
  for (let m = 0; m <= HORIZON; m++) moisData.push({ mb: 0, nes: 0, vendus: 0, truies: 0 });
  const add = (mab, key, val) => { if (mab >= 0 && mab <= HORIZON) moisData[mab][key] += val; };

  const file = cohortesInit.map((c) => ({ ...c }));
  let parc = cohortesInit.reduce((s, c) => s + c.n, 0);
  add(0, "vendus", malesActuels); // males adultes existants vendus au depart

  const inter = h.porteesParAn > 0 ? 12 / h.porteesParAn : 5.2;

  for (let i = 0; i < file.length; i++) {
    const c = file[i];
    let mb = c.naissanceMoisAbs + h.ageSaillieMois + h.gestationMois;
    while (mb <= HORIZON) {
      if (mb >= 0) {
        add(mb, "mb", c.n);
        add(mb, "truies", c.n);
        const nesViv = c.n * h.nesParPortee * (h.surviePct / 100);
        add(mb, "nes", nesViv);
        const femelles = nesViv * (1 - h.partMalesPct / 100);
        const males = nesViv * (h.partMalesPct / 100);
        const venteMois = mb + h.ageVenteMois;
        add(venteMois, "vendus", males);
        if (strategy === "P1") {
          file.push({ naissanceMoisAbs: mb, n: femelles });
          parc += femelles;
        } else {
          const manque = Math.max(0, h.plafondTruiesP2 - parc);
          const gardees = Math.min(femelles, manque);
          const aVendre = femelles - gardees;
          if (gardees > 0) { file.push({ naissanceMoisAbs: mb, n: gardees }); parc += gardees; }
          if (aVendre > 0) add(venteMois, "vendus", aVendre);
        }
      }
      mb = Math.round(mb + inter);
    }
  }

  // Agregation par periode (annee ou trimestre)
  const granu = h.granularite === "trimestre" ? "trimestre" : "annee";
  const moisParPeriode = granu === "trimestre" ? 3 : 12;
  const periodes = [];
  for (let p0 = 0; p0 <= HORIZON; p0 += moisParPeriode) {
    const agg = { mb: 0, nes: 0, vendus: 0, truies: 0 };
    for (let m = p0; m < p0 + moisParPeriode && m <= HORIZON; m++)
      for (const k in agg) agg[k] += moisData[m][k];
    const anneeP = debut + Math.floor(p0 / 12);
    const moisDansAnnee = p0 % 12;
    const t = Math.floor(moisDansAnnee / 3) + 1;
    const label = granu === "trimestre"
      ? `T${t} ${anneeP} (${MOIS_T[moisDansAnnee]}–${MOIS_T_FIN[moisDansAnnee]})`
      : String(anneeP);
    // label court pour le graphe (axe X) : "T1 27 (avr)"
    const labelCourt = granu === "trimestre"
      ? `T${t} ${String(anneeP).slice(2)} (${MOIS_T[moisDansAnnee]})`
      : String(anneeP);
    periodes.push({ label, labelCourt, annee: anneeP, agg, moisParPeriode: Math.min(moisParPeriode, HORIZON - p0 + 1) });
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
    const ouvriers = Math.max(1, Math.ceil(Math.min(truiesActives || 1, parc) / 70));
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
      ca,
      depenses,
      benef: benefApres,
      prime,
    });
  }
  return out;
}

// Repartit le cheptel reel en cohortes d'age (par date de naissance)
function buildCohortes(animals, speciesFilter, anneeDebut) {
  const debut = anneeDebut || 2026;
  const moisAbs = (d) => (d.getFullYear() - debut) * 12 + d.getMonth();
  let females = 0, males = 0;
  const cohortes = [];
  const groups = new Map();
  for (const a of animals || []) {
    if (speciesFilter && a.species !== speciesFilter) continue;
    if (a.is_active === 0 || a.isActive === 0) continue;
    if ((a.status || "").toLowerCase() === "deceased") continue;
    const sex = (a.sex || "").toUpperCase();
    if (!a.date_of_birth && !a.dateOfBirth) continue;
    const dob = new Date(a.date_of_birth || a.dateOfBirth);
    if (isNaN(dob)) continue;
    if (sex === "F" || sex === "FEMALE" || sex === "FEMELLE") {
      females++;
      const key = `${dob.getFullYear()}-${dob.getMonth()}`;
      if (!groups.has(key)) groups.set(key, { naissanceMoisAbs: moisAbs(dob), n: 0 });
      groups.get(key).n++;
    } else if (sex === "M" || sex === "MALE" || sex === "MALE" || sex === "MÂLE") {
      males++;
    }
  }
  for (const g of groups.values()) cohortes.push(g);
  return { cohortes, females, males };
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
const fmtUSD = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return sigNum(n, 1e6) + " M$";
  if (a >= 1e3) return sigNum(n, 1e3) + " k$";
  return Math.round(n).toLocaleString("fr-FR") + " $";
};

// Importe les prix reels (api.listPrices) dans la decoupe + prix vif.
// Matche productType (texte libre) sur le nom de chaque morceau / mot-cle "vif".
function appliquerPrixReels(h, prixRows) {
  const out = { ...h, decoupe: h.decoupe.map((d) => ({ ...d })) };
  const notes = [];
  const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(DIACRITICS, "");
  const rows = (prixRows || []).map((r) => ({
    type: norm(r.productType || r.product_type),
    prix: Number(r.unitPrice || r.unit_price) || 0,
    src: norm(r.saleSource || r.sale_source),
  })).filter((r) => r.prix > 0);
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

// Taux web INDICATIF (1 from = X to). Source publique sans cle ; null si indispo.
async function fetchTauxWeb(from, to) {
  const res = await fetch(`https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=1`);
  if (!res.ok) return null;
  const j = await res.json();
  const r = Number(j?.result || j?.info?.rate);
  return r > 0 ? r : null;
}

// Resout le taux base->affichage avec priorite : compta (DB) > web > manuel.
// Retourne { taux, source } ; taux=null si rien (on n'invente pas de chiffre).
function resolveTaux(baseId, dispId, exchanges, tauxWeb, tauxManuel) {
  if (baseId == null || dispId == null || Number(baseId) === Number(dispId))
    return { taux: 1, source: "identique" };
  // 1) Taux compta le plus recent entre les deux devises (sens direct ou inverse)
  const tries = (exchanges || []).filter((e) => {
    const f = Number(e.fromCurrencyId), t = Number(e.toCurrencyId);
    return (f === Number(baseId) && t === Number(dispId)) || (f === Number(dispId) && t === Number(baseId));
  });
  if (tries.length) {
    // deja trie par date desc cote backend ; on prend le 1er
    const e = tries[0];
    const r = Number(e.rate);
    if (r > 0) {
      const direct = Number(e.fromCurrencyId) === Number(baseId);
      return { taux: direct ? r : 1 / r, source: "compta" };
    }
  }
  // 2) Taux web indicatif
  if (tauxWeb > 0) return { taux: tauxWeb, source: "web" };
  // 3) Saisie manuelle
  const m = Number(tauxManuel);
  if (m > 0) return { taux: m, source: "manuel" };
  return { taux: null, source: "aucun" };
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
async function loadRealData(speciesFilter) {
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

function calibrate(real, h, animals, speciesFilter) {
  const out = { ...h };
  const notes = [];
  const num = (x) => Number(x) || 0;

  // Prix de vente reel = CA total / kg vendus (ou par tete si pas de poids)
  const sp = (r) => !speciesFilter || r.species === speciesFilter || !r.species;
  const salesF = (real.sales || []).filter(sp);
  if (salesF.length) {
    const totAmount = salesF.reduce((s, r) => s + num(r.total_amount || r.amount || r.totalAmount), 0);
    const totQty = salesF.reduce((s, r) => s + (num(r.quantity) || 1), 0);
    if (totAmount > 0 && totQty > 0) {
      const parTete = totAmount / totQty;
      if (parTete > 0) {
        // Bascule en mode "entier" pour que le prix reel/tete soit reellement utilise
        out.prixEntierParKg = Math.round(parTete / h.poidsVenteKg);
        out.modeVente = "entier";
        notes.push(`Prix vente reel ~${Math.round(parTete).toLocaleString()} CDF/tete → mode porc entier`);
      }
    }
  }

  // Taille de portee reelle (offspring_count moyen sur mises bas)
  const births = (real.repro || []).filter((r) => num(r.offspring_count || r.offspringCount) > 0);
  if (births.length) {
    const avg = births.reduce((s, r) => s + num(r.offspring_count || r.offspringCount), 0) / births.length;
    if (avg > 0) { out.nesParPortee = Math.round(avg * 10) / 10; notes.push(`Nes/portee reel ~${out.nesParPortee}`); }
  }

  // Mortalite reelle = morts / nes (approx sur la periode)
  const totMorts = (real.morts || []).length;
  const totNes = births.reduce((s, r) => s + num(r.offspring_count || r.offspringCount), 0);
  if (totNes > 0 && totMorts > 0) {
    const survie = Math.max(50, Math.min(99, Math.round((1 - totMorts / totNes) * 100)));
    out.surviePct = survie; notes.push(`Survie reelle ~${survie}%`);
  }

  // Couts reels par categorie → injectes dans les hypotheses (pas juste affiches)
  const exp = real.expenses || [];
  const byCat = {};
  for (const e of exp) { const c = (e.category || "autre").toLowerCase(); byCat[c] = (byCat[c] || 0) + num(e.amount); }

  // Base de repartition : nb de porcs vendus enregistres (sinon les nes vivants)
  const porcsVendus = salesF.reduce((s, r) => s + (num(r.quantity) || 1), 0);
  const base = porcsVendus > 0 ? porcsVendus : totNes;

  const get = (...keys) => { for (const k of keys) if (byCat[k]) return byCat[k]; return 0; };
  const feed = get("feed", "aliment", "alimentation");
  const veto = get("veterinary", "veterinaire", "veto", "sante");
  const sal = get("salaire", "salary", "payroll", "salaires");

  if (feed > 0 && base > 0) {
    out.alimentEngraissementParPorc = Math.round(feed / base);
    notes.push(`Aliment reel ~${out.alimentEngraissementParPorc.toLocaleString()} CDF/porc (${Math.round(feed).toLocaleString()} CDF / ${base} porcs)`);
  } else if (feed > 0) {
    notes.push(`Aliment enregistre: ${Math.round(feed).toLocaleString()} CDF (pas de base de repartition)`);
  }
  if (veto > 0 && base > 0) {
    out.vetoParPorc = Math.round(veto / base);
    notes.push(`Veto reel ~${out.vetoParPorc.toLocaleString()} CDF/porc`);
  } else if (veto > 0) {
    notes.push(`Veto enregistre: ${Math.round(veto).toLocaleString()} CDF`);
  }
  if (sal > 0) {
    // Salaires enregistres = total sur la periode ; on estime un mensuel/ouvrier
    const moisCouverts = monthsSpan(exp);
    if (moisCouverts > 0) {
      out.salaireMensuelOuvrier = Math.round(sal / moisCouverts);
      notes.push(`Salaires reels ~${out.salaireMensuelOuvrier.toLocaleString()} CDF/mois (${Math.round(sal).toLocaleString()} CDF / ${moisCouverts} mois)`);
    } else {
      notes.push(`Salaires enregistres: ${Math.round(sal).toLocaleString()} CDF`);
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
function progression(real, speciesFilter) {
  const num = (x) => Number(x) || 0;
  const yearOf = (d) => d ? new Date(d).getFullYear() : null;
  const byYear = {};
  const ensure = (y) => (byYear[y] = byYear[y] || { ventes: 0, ca: 0, depenses: 0, naissances: 0, morts: 0 });
  for (const s of real.sales || []) { const y = yearOf(s.created_at || s.sale_date || s.date); if (y) { const r = ensure(y); r.ventes += num(s.quantity) || 1; r.ca += num(s.total_amount || s.amount); } }
  for (const e of real.expenses || []) { const y = yearOf(e.expense_date || e.created_at); if (y) ensure(y).depenses += num(e.amount); }
  for (const rp of real.repro || []) { const y = yearOf(rp.event_date || rp.created_at); if (y) ensure(y).naissances += num(rp.offspring_count || rp.offspringCount); }
  for (const m of real.morts || []) { const y = yearOf(m.death_date || m.created_at); if (y) ensure(y).morts += 1; }
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

const SimulatorScreen = ({ lang, speciesFilter }) => {
  const L = (fr, en) => (lang === "fr" ? fr : en);
  const [h, setH] = React.useState(DEFAULTS);
  const [strategy, setStrategy] = React.useState("P2");
  const [animals, setAnimals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [calibNotes, setCalibNotes] = React.useState(null);
  const [prog, setProg] = React.useState(null);
  const [importing, setImporting] = React.useState(false);
  const [currencies, setCurrencies] = React.useState([]);
  const [currencyId, setCurrencyId] = React.useState(null);   // devise d'AFFICHAGE
  const [convertir, setConvertir] = React.useState(false);    // conversion = choix explicite (pas auto)
  const [baseCurrencyId, setBaseCurrencyId] = React.useState(null); // devise des donnees (systeme)
  const [exchanges, setExchanges] = React.useState([]);       // taux compta /ledger/exchanges
  const [exchOk, setExchOk] = React.useState(null);           // null=pas tente, true/false
  const [tauxManuel, setTauxManuel] = React.useState("");     // repli si pas de taux DB
  const [tauxWeb, setTauxWeb] = React.useState(null);         // indicatif en ligne (peut rester null hors-ligne)
  const [prixNotes, setPrixNotes] = React.useState(null);     // resultat import prix
  const [importingPrix, setImportingPrix] = React.useState(false);
  const set = (k) => (v) => setH((s) => ({ ...s, [k]: v }));

  // Edition d'un morceau de la decoupe (kg ou prix)
  const setDecoupe = (i, champ) => (v) => setH((s) => {
    const decoupe = s.decoupe.map((d, j) => (j === i ? { ...d, [champ]: Number(v) } : d));
    return { ...s, decoupe };
  });

  // Import des prix reels depuis la liste de prix FarmOS (best-effort)
  const importerPrix = async () => {
    setImportingPrix(true);
    try {
      const res = await api.listPrices();
      const rows = res?.getAllPrice || res?.data || (Array.isArray(res) ? res : []);
      const { hypotheses, notes } = appliquerPrixReels(h, rows);
      setH(hypotheses);
      setPrixNotes(notes.length ? notes : [L("Aucun prix correspondant trouvé dans la liste de prix.", "No matching price found in the price list.")]);
    } catch (e) {
      setPrixNotes([L("Impossible de charger la liste de prix.", "Could not load price list.") + " " + (e.message || "")]);
    } finally { setImportingPrix(false); }
  };

  const importReal = async () => {
    setImporting(true);
    try {
      const real = await loadRealData(speciesFilter);
      const { hypotheses, notes } = calibrate(real, h, animals, speciesFilter);
      setH(hypotheses);
      setCalibNotes(notes.length ? notes : [L("Peu de donnees reelles exploitables — verifiez la saisie dans FarmOS.", "Few usable real data — check FarmOS entries.")]);
      setProg(progression(real, speciesFilter));
    } catch (e) {
      setCalibNotes([L("Erreur de chargement des donnees.", "Data load error.") + " " + (e.message || "")]);
    } finally { setImporting(false); }
  };

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    api.listAnimals().then((res) => {
      if (!alive) return;
      const list = res?.getAllAnimal || res?.data || (Array.isArray(res) ? res : []);
      setAnimals(list);
    }).catch(() => setAnimals([])).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  // Devises : on REUTILISE les devises deja permises (currency.js) et la devise
  // par defaut du systeme. On n'ajoute aucune devise nous-memes.
  React.useEffect(() => {
    let alive = true;
    Promise.allSettled([api.listCurrencies(), api.getAppSetting()]).then(([curR, setR]) => {
      if (!alive) return;
      const curRaw = curR.status === "fulfilled" ? curR.value : null;
      const list = curRaw?.getAllCurrency || (Array.isArray(curRaw) ? curRaw : []);
      const setting = setR.status === "fulfilled" ? setR.value : null;
      const def = defaultCurrencyId(setting, list);
      setCurrencies(list);
      setBaseCurrencyId(def); // les montants du modele sont dans la devise systeme
      // devise d'AFFICHAGE non pre-selectionnee : l'utilisateur choisit (sinon = devise des donnees)
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Taux de change reels (compta) — best-effort : 403 si pas de droit compta -> repli manuel.
  React.useEffect(() => {
    let alive = true;
    api.listLedgerExchanges(200).then((res) => {
      if (!alive) return;
      const list = res?.getAllExchange || res?.data || (Array.isArray(res) ? res : []);
      setExchanges(list);
      setExchOk(true);
    }).catch(() => { if (alive) { setExchanges([]); setExchOk(false); } });
    return () => { alive = false; };
  }, []);

  // Taux web INDICATIF (sans cle, source publique). Ne s'affiche pas hors-ligne / si echec.
  React.useEffect(() => {
    let alive = true;
    setTauxWeb(null);
    const from = codeOf(baseCurrencyId, currencies);
    const to = codeOf(currencyId, currencies);
    if (!from || !to || from === to) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    fetchTauxWeb(from, to).then((r) => { if (alive && r > 0) setTauxWeb(r); }).catch(() => {});
    return () => { alive = false; };
  }, [baseCurrencyId, currencyId, currencies]);

  // Devise d'affichage effective : seulement si on a coche "convertir" ET choisi une devise.
  // Sinon on reste dans la devise des donnees (aucune conversion automatique).
  const afficheId = (convertir && currencyId != null) ? currencyId : baseCurrencyId;
  const symbole = symbolFor(afficheId, currencies, "");
  const curOptions = currencyOptions(currencies);

  // Resout le taux base->affichage : 1) taux compta (le + recent) 2) taux web 3) saisie manuelle.
  const tauxResolu = React.useMemo(
    () => resolveTaux(baseCurrencyId, afficheId, exchanges, tauxWeb, tauxManuel),
    [baseCurrencyId, afficheId, exchanges, tauxWeb, tauxManuel]);
  const fmtM = (v) => fmtMontant(v * (tauxResolu.taux || 1), symbole);
  const devData = codeOf(baseCurrencyId, currencies) || ""; // code devise des donnees (suffixe inputs couts)

  // Seuil de prime converti dans la devise des donnees (devise du seuil au choix, aucune fixee).
  const seuilDeviseId = h.seuilPrimeDeviseId ?? baseCurrencyId;
  const seuilEnBase = React.useMemo(() => {
    const v = Number(h.seuilPrime) || 0;
    if (seuilDeviseId == null || Number(seuilDeviseId) === Number(baseCurrencyId)) return v;
    const t = resolveTaux(seuilDeviseId, baseCurrencyId, exchanges, tauxWeb, tauxManuel);
    return t.taux ? v * t.taux : v; // pas de taux -> on garde la valeur telle quelle
  }, [h.seuilPrime, seuilDeviseId, baseCurrencyId, exchanges, tauxWeb, tauxManuel]);

  const { cohortes, females, males } = React.useMemo(
    () => buildCohortes(animals, speciesFilter, h.anneeDebut), [animals, speciesFilter, h.anneeDebut]);

  const rows = React.useMemo(
    () => simulate(strategy, h, cohortes.length ? cohortes : [{ naissanceMoisAbs: -1, n: 88 }], Math.max(0, males - 3), seuilEnBase),
    [strategy, h, cohortes, males, seuilEnBase]);

  const debutP = h.anneeDebut || 2026;
  const finP = debutP + Math.max(1, h.horizonAns || 5) - 1;
  const periodeRange = `${debutP}-${finP}`;
  const rev = revenuParPorc(h);
  const cout = coutParPorc(h);
  const marge = rev - cout;
  const cumulBenef = rows.reduce((s, r) => s + r.benef, 0);

  const card = { padding: 16, marginBottom: 14 };
  const upper = { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8, color: "var(--fg-3)" };
  const th = { textAlign: "right", padding: "6px 8px", fontSize: 11, color: "var(--fg-3)", whiteSpace: "nowrap" };
  const td = { textAlign: "right", padding: "6px 8px", fontSize: 13, whiteSpace: "nowrap" };

  return (
    <div style={{ padding: "var(--pad-page)", overflow: "auto", height: "100%", maxWidth: 1100 }}>
      {/* En-tete + cheptel detecte */}
      <div className="card" style={card}>
        <div style={upper}>{L("Cheptel de depart (detecte)", "Starting herd (detected)")}</div>
        {loading ? <div>{L("Chargement…", "Loading…")}</div> : (
          <div style={{ fontSize: 13 }}>
            {L("Femelles", "Females")}: <b>{females}</b> · {L("Males", "Males")}: <b>{males}</b>
            {" · "}{cohortes.length} {L("cohorte(s) d'age", "age cohort(s)")}
            {speciesFilter ? ` · ${speciesFilter}` : ` · ${L("toutes especes", "all species")}`}
          </div>
        )}
        <div style={{ marginTop: 12 }}>
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
        {curOptions.length > 0 && (
          <div>
            <div style={upper}>{L("Devise", "Currency")}</div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 6 }}>
              <input type="checkbox" checked={convertir}
                onChange={(e) => setConvertir(e.target.checked)} />
              {L("Convertir les montants", "Convert amounts")}
              {baseCurrencyId != null && <span style={{ color: "var(--fg-3)" }}> ({L("donnees en", "data in")} {codeOf(baseCurrencyId, currencies)})</span>}
            </label>
            {convertir && (
              <select className="input" value={currencyId ?? ""}
                onChange={(e) => setCurrencyId(e.target.value ? Number(e.target.value) : null)}
                style={{ minWidth: 150 }}>
                <option value="">{L("— Choisir la devise —", "— Choose currency —")}</option>
                {curOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            )}
          </div>
        )}

        {/* Taux de conversion (uniquement si conversion activee + devise differente choisie) */}
        {convertir && baseCurrencyId != null && currencyId != null && Number(baseCurrencyId) !== Number(currencyId) && (
          <div style={{ flexBasis: "100%", fontSize: 12, paddingTop: 4 }}>
            <div style={upper}>
              {L("Taux de conversion", "Conversion rate")} ({codeOf(baseCurrencyId, currencies)} → {codeOf(currencyId, currencies)})
            </div>
            {/* Source utilisee */}
            <div style={{ marginBottom: 6 }}>
              {tauxResolu.taux ? (
                <span>
                  1 {codeOf(baseCurrencyId, currencies)} = <b>{tauxResolu.taux.toFixed(4)}</b> {codeOf(currencyId, currencies)}{" "}
                  <span style={{ color: "var(--fg-3)" }}>
                    ({tauxResolu.source === "compta" ? L("taux compta", "accounting rate")
                      : tauxResolu.source === "web" ? L("taux web indicatif", "indicative web rate")
                      : L("taux saisi", "manual rate")})
                  </span>
                </span>
              ) : (
                <span style={{ color: "crimson" }}>
                  {L("Aucun taux disponible — saisissez-le ci-dessous pour convertir.",
                     "No rate available — enter one below to convert.")}
                </span>
              )}
              {exchOk === false && (
                <span style={{ color: "var(--fg-3)" }}> · {L("(taux compta non accessibles)", "(accounting rates not accessible)")}</span>
              )}
            </div>
            {/* Saisie manuelle + indicatif web */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--fg-3)" }}>{L("Taux manuel", "Manual rate")}</span>
                <input className="input" type="number" value={tauxManuel}
                  onChange={(e) => setTauxManuel(e.target.value)} placeholder="—" style={{ width: 120 }} />
              </label>
              {tauxWeb > 0 && (
                <span style={{ color: "var(--fg-3)" }}>
                  {L("En ligne aujourd'hui", "Online today")}: <b>{tauxWeb.toFixed(4)}</b>{" "}
                  <button className="btn" style={{ padding: "2px 8px", fontSize: 11 }}
                    onClick={() => setTauxManuel(String(tauxWeb))}>
                    {L("Réajuster avec ce taux", "Use this rate")}
                  </button>
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
              {L("Conversion = taux de votre compta en priorité (cohérent et hors-ligne). Le taux web n'est qu'indicatif et n'apparaît qu'en ligne.",
                 "Conversion uses your accounting rate first (consistent, offline). The web rate is indicative only and shows only when online.")}
            </div>
          </div>
        )}
      </div>

      {/* Periode : annee de depart, horizon, granularite */}
      <div className="card" style={{ ...card, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
        <NumInput label={L("Annee de depart", "Start year")} value={h.anneeDebut} onChange={set("anneeDebut")} />
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
          {L(`Projection ${h.anneeDebut} → ${h.anneeDebut + Math.max(1, h.horizonAns) - 1}`,
             `Projection ${h.anneeDebut} → ${h.anneeDebut + Math.max(1, h.horizonAns) - 1}`)}
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
          <NumInput label={L("Poids vente", "Sale weight")} value={h.poidsVenteKg} onChange={set("poidsVenteKg")} suffix="kg" />
          <div>
            <div style={upper}>{L("Seuil prime", "Bonus threshold")}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input className="input" type="number" value={h.seuilPrime}
                onChange={(e) => set("seuilPrime")(Number(e.target.value))} style={{ width: 110 }} />
              <select className="input" value={h.seuilPrimeDeviseId ?? ""}
                onChange={(e) => set("seuilPrimeDeviseId")(e.target.value ? Number(e.target.value) : null)}
                style={{ minWidth: 90 }}>
                <option value="">{codeOf(baseCurrencyId, currencies) || L("devise donnees", "data cur.")}</option>
                {curOptions.map((o) => <option key={o.id} value={o.id}>{codeOf(o.id, currencies) || o.label}</option>)}
              </select>
            </div>
          </div>
          <NumInput label={L("Taux prime", "Bonus rate")} value={h.tauxPrimePct} onChange={set("tauxPrimePct")} suffix="%" />
        </div>
      </div>

      {/* Couts : editables, et remplis par "Importer mes donnees reelles" (calibrate) */}
      <div className="card" style={card}>
        <div style={upper}>{L("Coûts (modifiable)", "Costs (editable)")}</div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 10 }}>
          {L(`En ${devData}. Le bouton « Importer mes données réelles » remplit ces champs depuis vos dépenses.`,
             `In ${devData}. The "Import my real data" button fills these from your expenses.`)}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <NumInput label={L("Aliment / porc", "Feed / pig")} value={h.alimentEngraissementParPorc} onChange={set("alimentEngraissementParPorc")} suffix={devData} />
          <NumInput label={L("Aliment truie / an", "Sow feed / yr")} value={h.alimentTruieParAn} onChange={set("alimentTruieParAn")} suffix={devData} />
          <NumInput label={L("Santé (véto) / porc", "Health (vet) / pig")} value={h.vetoParPorc} onChange={set("vetoParPorc")} suffix={devData} />
          <NumInput label={L("Divers / porc", "Misc / pig")} value={h.diversParPorc} onChange={set("diversParPorc")} suffix={devData} />
          <NumInput label={L("Salaire / mois", "Salary / mo")} value={h.salaireMensuelOuvrier} onChange={set("salaireMensuelOuvrier")} suffix={devData} />
          <NumInput label={L("Investissement (capex)", "Investment (capex)")} value={h.capex} onChange={set("capex")} suffix={devData} />
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
          {L(`Prix saisis en ${codeOf(baseCurrencyId, currencies) || "devise des données"} (devise des données). Le mode de vente actif détermine le revenu utilisé.`,
             `Prices in ${codeOf(baseCurrencyId, currencies) || "data currency"} (data currency). The active sale mode sets the revenue used.`)}
        </div>

        {/* Tableau decoupe */}
        <div style={{ overflowX: "auto", marginBottom: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
            <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ ...th, textAlign: "left" }}>{L("Morceau (découpe)", "Cut")}</th>
              <th style={th}>{L("Poids (kg)", "Weight (kg)")}</th>
              <th style={th}>{L("Prix / kg", "Price / kg")}</th>
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
                <td style={{ ...td, fontWeight: 600 }}>{h.decoupe.reduce((s, d) => s + Number(d.kg || 0), 0)}</td>
                <td style={td}></td>
                <td style={{ ...td, fontWeight: 600 }}>{fmtM(h.decoupe.reduce((s, d) => s + d.kg * d.prix, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Prix porc vif */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <NumInput label={L("Prix porc vif / kg", "Live pig price / kg")} value={h.prixEntierParKg} onChange={set("prixEntierParKg")} />
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
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ ...th, textAlign: "left" }}>{h.granularite === "trimestre" ? L("Trimestre", "Quarter") : L("Annee", "Year")}</th>
                <th style={th}>{L("Mises bas", "Farrowings")}</th>
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
          labels={rows.map((r) => r.labelCourt)}
          series={[
            { name: L("Porcs vendus", "Pigs sold"), data: rows.map((r) => r.vendus) },
            { name: L(`Chiffre d'affaires (M ${symbole})`, `Revenue (M ${symbole})`), data: rows.map((r) => Math.round((r.ca * (tauxResolu.taux || 1)) / 1e4) / 100) },
            { name: L(`Benefice (M ${symbole})`, `Profit (M ${symbole})`), data: rows.map((r) => Math.round((r.benef * (tauxResolu.taux || 1)) / 1e4) / 100) },
          ]}
          height={260}
        />
      </div>

      <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 24 }}>
        {L(
          "Estimation a partir de references de marche RDC (couts, prix, taux). Cheptel de depart lu depuis vos donnees reelles. Ajustez les hypotheses pour votre situation.",
          "Estimate based on DRC market references (costs, prices, rate). Starting herd read from your real data. Adjust assumptions for your situation."
        )}
      </div>
    </div>
  );
};

export { SimulatorScreen };
