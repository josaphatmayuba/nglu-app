/* eslint-disable */
import React from "react";
import { api } from "./api";
import { MaterialLineChart } from "./material-charts.jsx";
import { symbolFor, currencyOptions, currencyIdOf } from "./currency";

// ─────────────────────────────────────────────────────────────────────────
// SIMULATEUR D'ELEVAGE — projection cheptel 5 ans, strategies P1/P2,
// valorisation par decoupe, compte de resultat (CA - depenses = benefice),
// prime travailleurs. Calcul 100% frontend (pas d'ecriture DB, marche offline).
// Modele PAR COHORTE (age reel) : porte du modele Python valide avec le client.
// ─────────────────────────────────────────────────────────────────────────

const YEARS = [2026, 2027, 2028, 2029, 2030];

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
  ageVenteMois: 7,
  poidsVenteKg: 95,
  plafondTruiesP2: 150,
  anneeDebut: 2026,
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
  seuilPrime: 50000,
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
  for (let m = 0; m <= HORIZON; m++) moisData.push({ mb: 0, nes: 0, vendus: 0, truies: 0, morts: 0, vendusM: 0, vendusF: 0 });
  const add = (mab, key, val) => { if (mab >= 0 && mab <= HORIZON) moisData[mab][key] += val; };

  const file = cohortesInit.map((c) => ({ ...c }));
  let parc = cohortesInit.reduce((s, c) => s + c.n, 0);
  add(0, "vendus", malesActuels); // males adultes existants vendus au depart
  add(0, "vendusM", malesActuels);

  const inter = h.porteesParAn > 0 ? 12 / h.porteesParAn : 5.2;

  for (let i = 0; i < file.length; i++) {
    const c = file[i];
    let mb = c.naissanceMoisAbs + h.ageSaillieMois + h.gestationMois;
    while (mb <= HORIZON) {
      if (mb >= 0) {
        add(mb, "mb", c.n);
        add(mb, "truies", c.n);
        const nesTotal = c.n * h.nesParPortee;
        const nesViv = nesTotal * (h.surviePct / 100);
        add(mb, "nes", nesViv);
        add(mb, "morts", nesTotal - nesViv); // morts a la naissance (1 - survie)
        const femelles = nesViv * (1 - h.partMalesPct / 100);
        const males = nesViv * (h.partMalesPct / 100);
        const venteMois = mb + h.ageVenteMois;
        add(venteMois, "vendus", males);
        add(venteMois, "vendusM", males);
        if (strategy === "P1") {
          file.push({ naissanceMoisAbs: mb, n: femelles });
          parc += femelles;
        } else {
          const manque = Math.max(0, h.plafondTruiesP2 - parc);
          const gardees = Math.min(femelles, manque);
          const aVendre = femelles - gardees;
          if (gardees > 0) { file.push({ naissanceMoisAbs: mb, n: gardees }); parc += gardees; }
          if (aVendre > 0) { add(venteMois, "vendus", aVendre); add(venteMois, "vendusF", aVendre); }
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
    const agg = { mb: 0, nes: 0, vendus: 0, truies: 0, morts: 0, vendusM: 0, vendusF: 0 };
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
      vendusM: Math.round(per.agg.vendusM),
      vendusF: Math.round(per.agg.vendusF),
      truies: truiesActives,
      morts: Math.round(per.agg.morts),
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

function calibrate(real, h, animals, speciesFilter, devCode = "") {
  const out = { ...h };
  const notes = [];
  const num = (x) => Number(x) || 0;
  const cur = devCode ? ` ${devCode}` : ""; // suffixe devise des donnees (aucune devise codee en dur)

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
        notes.push(`Prix vente reel ~${Math.round(parTete).toLocaleString()}${cur}/tete → mode porc entier`);
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

// Vue rapport imprimable : mise en page document (titre, synthese, hypotheses,
// tableau de projection, graphe, prix). Cachee a l'ecran (#sim-report-print
// display:none), rendue visible uniquement par @media print.
function ReportView({ L, rows, h, strategy, females, males, cohortes, saisieCode, fmtM, rev, cout, marge, cumulBenef, debutP, finP, granu }) {
  const dev = saisieCode || "";
  const today = new Date().toLocaleDateString(L("fr-CA", "en-CA"));
  const totVendus = rows.reduce((s, r) => s + r.vendus, 0);
  const totCA = rows.reduce((s, r) => s + r.ca, 0);
  const totDep = rows.reduce((s, r) => s + r.depenses, 0);
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

      {/* Tableau de projection */}
      <div className="rep-block">
        <div style={h2}>{L("Projection", "Projection")} {granu === "trimestre" ? L("(par trimestre)", "(quarterly)") : L("(par an)", "(yearly)")}</div>
        <table>
          <thead><tr>
            <th style={{ textAlign: "left" }}>{L("Période", "Period")}</th>
            <th style={rt}>{L("Porcs vendus", "Pigs sold")}</th>
            <th style={rt}>{L("Chiffre d'affaires", "Revenue")}</th>
            <th style={rt}>{L("Dépenses", "Expenses")}</th>
            <th style={rt}>{L("Bénéfice", "Profit")}</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ textAlign: "left" }}>{r.label}</td>
                <td style={rt}>{r.vendus.toLocaleString()}</td>
                <td style={rt}>{fmtM(r.ca)}</td>
                <td style={rt}>{fmtM(r.depenses)}</td>
                <td style={{ ...rt, fontWeight: 700 }}>{fmtM(r.benef)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, background: "#f0f0f0" }}>
              <td style={{ textAlign: "left" }}>{L("Total", "Total")}</td>
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
              <td style={rt}>{(h.decoupe || []).reduce((s, d) => s + Number(d.kg || 0), 0)}</td>
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
  const [prixNotes, setPrixNotes] = React.useState(null);     // resultat import prix
  const [importingPrix, setImportingPrix] = React.useState(false);
  const [saisieCurrencyId, setSaisieCurrencyId] = React.useState(null); // devise choisie (null = aucune, a choisir)
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
      const { hypotheses, notes } = calibrate(real, h, animals, speciesFilter, devData);
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

  const { cohortes, females, males } = React.useMemo(
    () => buildCohortes(animals, speciesFilter, h.anneeDebut), [animals, speciesFilter, h.anneeDebut]);

  const cohortesUse = cohortes.length ? cohortes : [{ naissanceMoisAbs: -1, n: 88 }];
  const malesVendables = Math.max(0, males - 3);
  const rowsP1 = React.useMemo(
    () => simulate("P1", h, cohortesUse, malesVendables, seuilEnBase),
    [h, cohortes, males, seuilEnBase]);
  const rowsP2 = React.useMemo(
    () => simulate("P2", h, cohortesUse, malesVendables, seuilEnBase),
    [h, cohortes, males, seuilEnBase]);
  const rows = strategy === "P1" ? rowsP1 : rowsP2;

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
    <div id="simulator-report" style={{ padding: "var(--pad-page)", overflow: "auto", height: "100%", maxWidth: 1100 }}>
      <style>{`
        #sim-report-print { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          #sim-report-print, #sim-report-print * { visibility: visible !important; }
          #sim-report-print {
            display: block !important; position: absolute; left: 0; top: 0;
            width: 100%; padding: 16px; color: #111; font-size: 12px;
          }
          #sim-report-print .rep-block { break-inside: avoid; }
          #sim-report-print table { width: 100%; border-collapse: collapse; }
          #sim-report-print th, #sim-report-print td { border: 1px solid #ccc; padding: 5px 8px; }
          @page { margin: 14mm; }
        }
      `}</style>

      {/* Vue RAPPORT : invisible a l'ecran, seule chose imprimee (mise en page document) */}
      <ReportView
        L={L} rows={rows} h={h} strategy={strategy}
        females={females} males={males} cohortes={cohortes}
        saisieCode={saisieCode} fmtM={fmtM}
        rev={rev} cout={cout} marge={marge} cumulBenef={cumulBenef}
        debutP={debutP} finP={finP} granu={h.granularite}
      />
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
                <td style={{ ...td, fontWeight: 600 }}>{h.decoupe.reduce((s, d) => s + Number(d.kg || 0), 0)}</td>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {[
            { t: L("Porcs vendus", "Pigs sold"), p1: rowsP1.map((r) => r.vendus), p2: rowsP2.map((r) => r.vendus) },
            { t: L("Mâles vendus", "Males sold"), p1: rowsP1.map((r) => r.vendusM), p2: rowsP2.map((r) => r.vendusM) },
            { t: L("Femelles vendues", "Females sold"), p1: rowsP1.map((r) => r.vendusF), p2: rowsP2.map((r) => r.vendusF) },
            { t: L("Truies actives (cheptel)", "Active sows (herd)"), p1: rowsP1.map((r) => r.truies), p2: rowsP2.map((r) => r.truies) },
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
