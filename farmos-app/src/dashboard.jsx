/* eslint-disable */
// Dashboard — adapts entirely based on speciesFilter.

import React from "react";
import { Icon, AnimalGlyph } from "./icons";
import { speciesById, t, SPECIES } from "./data";
import { SpeciesPillBar, KpiCard, Sparkline, FarmScore } from "./shell";
import { api } from "./api";
import { DateRangeFilter, defaultDateRange, inDateRange, rangeLabel } from "./date-range-filter.jsx";
import { defaultCurrencyId, defaultSymbol, rowCurrencyId, symbolFor } from "./currency";
import { useDataRefresh } from "./use-data-refresh";
import { animalQty, isActiveLivestock, isAdultAnimal, animalCategory, slaughterReadiness } from "./animal-category";
import { MaterialLineChart } from "./material-charts.jsx";
import { SectionLoader, KpiGridLoader } from "./loading.jsx";

function formatLongDate(d, lang) {
  try {
    return d.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function useCurrencyCatalog() {
  const [state, setState] = React.useState({ currencies: [], defaultCurrencyId: null, fallbackSymbol: "" });
  React.useEffect(() => {
    let cancel = false;
    Promise.allSettled([api.getAppSetting(), api.listCurrencies()])
      .then(([setting, currencyList]) => {
        if (cancel) return;
        const currencies = currencyList.value?.getAllCurrency || (Array.isArray(currencyList.value) ? currencyList.value : []);
        setState({
          currencies,
          defaultCurrencyId: defaultCurrencyId(setting.value, currencies),
          fallbackSymbol: defaultSymbol(setting.value, currencies),
        });
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);
  return state;
}

function deriveDashFinanceKpis(summary) {
  const totalR = (summary?.revenue || []).reduce((a, b) => a + b, 0);
  const totalE = (summary?.expense || []).reduce((a, b) => a + b, 0);
  const currentMonthR = (summary?.revenue || []).slice(-1)[0] || 0;
  const currentMonthE = (summary?.expense || []).slice(-1)[0] || 0;
  return { totalR, totalE, currentMonthR, currentMonthE };
}

function deriveDashAlerts(d, lang) {
  if (!d.ready) return [];
  const out = [];
  const aMap = new Map(d.animals.map((a) => [a.id, a]));
  // Withdrawals
  const today = new Date().toISOString().slice(0, 10);
  d.treatments.forEach((t) => {
    if (t.status !== "running" || !t.endDate || t.endDate < today) return;
    if (!t.withdrawalMilkHours && !t.withdrawalMeatDays && !t.withdrawalEggsDays) return;
    const a = aMap.get(t.animalId);
    if (!isActiveLivestock(a)) return;
    out.push({
      id: `wd-${t.id}`, kind: "withdrawal", severity: "critical",
      animal: a?.name || a?.externalId || "—", animalId: a?.externalId || `#${a?.id}`,
      species: a?.species || "cow",
      title: lang === "fr" ? "Délai de retrait actif" : "Withdrawal active",
      subtitle: `${t.medicineName || "Traitement"}${t.withdrawalMilkHours ? ` · lait ${Math.round(t.withdrawalMilkHours / 24)} j` : ""}${t.withdrawalMeatDays ? ` · viande ${t.withdrawalMeatDays} j` : ""}`,
      date: t.endDate, icon: "shield",
    });
  });
  // Low stock
  d.medicines.forEach((m) => {
    if (m.minQuantity == null || Number(m.quantity) >= Number(m.minQuantity)) return;
    out.push({
      id: `low-${m.id}`, kind: "stock", severity: Number(m.quantity) < Number(m.minQuantity) / 2 ? "critical" : "high",
      animal: m.name, animalId: m.kind === "feed" ? "Aliment" : "Médicament", species: "cow",
      title: lang === "fr" ? `Stock faible · ${m.name}` : `Low stock · ${m.name}`,
      subtitle: `${Number(m.quantity).toLocaleString("fr-CA")} ${m.unit || ""} restant · seuil ${m.minQuantity}`,
      date: "—", icon: "wheat",
    });
  });
  // Prêt à abattre / vente : animaux d'engraissement prêts ou en retard, groupés par bâtiment.
  const slByBarn = new Map(); // barn -> { ready, overdue, species }
  d.animals.forEach((a) => {
    if (!isActiveLivestock(a)) return;
    if (animalCategory(a) !== "engraissement") return;
    const st = slaughterReadiness(a);
    if (st !== "pret" && st !== "retard") return;
    const barn = a.barn || (lang === "fr" ? "Sans bâtiment" : "No building");
    if (!slByBarn.has(barn)) slByBarn.set(barn, { ready: 0, overdue: 0, species: a.species });
    const g = slByBarn.get(barn);
    g[st === "pret" ? "ready" : "overdue"] += animalQty(a);
  });
  slByBarn.forEach((g, barn) => {
    const tot = g.ready + g.overdue;
    if (tot <= 0) return;
    out.push({
      id: `slaughter-${barn}`, kind: "slaughter", severity: g.overdue > 0 ? "critical" : "high",
      animal: barn, animalId: lang === "fr" ? "Engraissement" : "Fattening", species: g.species || "pig",
      title: lang === "fr" ? `${tot} animal(aux) à abattre/vendre` : `${tot} animal(s) to slaughter/sell`,
      subtitle: [
        g.ready > 0 ? (lang === "fr" ? `${g.ready} prêt(s)` : `${g.ready} ready`) : null,
        g.overdue > 0 ? (lang === "fr" ? `${g.overdue} en retard (coût net)` : `${g.overdue} overdue (net cost)`) : null,
        barn,
      ].filter(Boolean).join(" · "),
      date: "—", icon: "cart",
    });
  });
  return out;
}

function useDashboardData() {
  const [data, setData] = React.useState({ animals: [], medicines: [], sales: [], expenses: [], treatments: [], repro: [], vaccinations: [], aiInsights: [], productionLogs: [], mortalityEvents: [], finance: { months: [], revenue: [], expense: [], byCategory: [] }, ready: false });
  const [reloadKey, setReloadKey] = React.useState(0);
  const refresh = useDataRefresh(["animals", "medicines", "sales", "expenses", "treatments", "reproductionEvents", "vaccinations", "productionLogs", "mortalityEvents"]);
  React.useEffect(() => {
    let cancel = false;
    api.getDashboardSnapshot()
      .then((snapshot) => {
        if (cancel) return;
        const {
          animals = [],
          medicines = [],
          sales = [],
          expenses = [],
          treatments = [],
          repro = [],
          vaccinations = [],
          aiInsights = [],
          finance = { months: [], revenue: [], expense: [], byCategory: [] },
          productionLogs = [],
          mortalityEvents = [],
        } = snapshot || {};
        // Le snapshot est rendu resilient cote backend (chaque source a un fallback []).
        // On normalise ici par securite: une source absente devient [] sans bloquer le reste.
        const arr = (x) => (Array.isArray(x) ? x : []);
        setData({
          animals: arr(animals), medicines: arr(medicines), sales: arr(sales), expenses: arr(expenses),
          treatments: arr(treatments), repro: arr(repro), vaccinations: arr(vaccinations), aiInsights: arr(aiInsights),
          productionLogs: arr(productionLogs), mortalityEvents: arr(mortalityEvents),
          finance: finance || { months: [], revenue: [], expense: [], byCategory: [] }, ready: true,
        });
      })
      // En erreur on sort quand même de l'état « chargement » (sinon spinner infini) : les sections montrent leur état vide.
      .catch(() => { if (!cancel) setData((d) => ({ ...d, ready: true })); });
    return () => { cancel = true; };
  }, [reloadKey, refresh]);
  React.useEffect(() => {
    const reload = () => setReloadKey((k) => k + 1);
    const events = ["farmos:animal-created", "farmos:treatment-created", "farmos:repro-created", "farmos:expense-created", "farmos:sale-created", "farmos:production-created", "farmos:mortality-created"];
    events.forEach((e) => window.addEventListener(e, reload));
    return () => events.forEach((e) => window.removeEventListener(e, reload));
  }, []);
  return data;
}

const DAY_MS = 86400000;

function isoDateKey(value) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function firstDateKey(row, keys) {
  for (const key of keys) {
    const date = isoDateKey(row?.[key]);
    if (date) return date;
  }
  return null;
}

function previousComparableRange(range) {
  if (!range?.from || !range?.to || range.preset === "all") return null;
  const from = new Date(`${range.from}T00:00:00`);
  const to = new Date(`${range.to}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return null;
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1);
  const prevTo = new Date(from.getTime() - DAY_MS);
  const prevFrom = new Date(from.getTime() - days * DAY_MS);
  return { from: isoDateKey(prevFrom), to: isoDateKey(prevTo) };
}

function percentDelta(current, previous) {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return 0;
  if (p === 0) return c === 0 ? 0 : 100;
  return Math.round(((c - p) / Math.abs(p)) * 100);
}

function rawHeadQty(row) {
  const n = Number(row?.count ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function eventHeadQty(row) {
  const n = Number(row?.quantity ?? row?.count ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function saleHeadQty(row) {
  const unit = String(row?.unit || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const weightUnits = new Set(["kg", "kilo", "kilos", "kilogram", "kilograms", "kilogramme", "kilogrammes", "g", "gram", "grams", "gramme", "grammes", "lb", "lbs", "livre", "livres", "t", "tonne", "tonnes"]);
  return weightUnits.has(unit) ? 1 : eventHeadQty(row);
}

function animalStartDate(a) {
  return firstDateKey(a, ["dateOfBirth", "date_of_birth", "dob", "createdAt", "created_at"]);
}

function animalExistedBy(a, cutoffIso) {
  const start = animalStartDate(a);
  return !start || !cutoffIso || start <= cutoffIso;
}

function addRemovedHeads(map, row, cutoffIso, dateKeys, qtyFn) {
  const date = firstDateKey(row, dateKeys);
  if (!date || !cutoffIso || date <= cutoffIso) return;
  const animalId = row?.animalId ?? row?.animal_id;
  if (animalId == null) return;
  const key = String(animalId);
  map.set(key, (map.get(key) || 0) + qtyFn(row));
}

function removedHeadsByAnimalAfter(sales, mortalityEvents, cutoffIso) {
  const map = new Map();
  (sales || []).forEach((s) => addRemovedHeads(map, s, cutoffIso, ["saleDate", "sale_date"], saleHeadQty));
  (mortalityEvents || []).forEach((m) => addRemovedHeads(map, m, cutoffIso, ["eventDate", "event_date"], eventHeadQty));
  return map;
}

function isSaleListedAnimal(a) {
  return ["available_sale", "for_sale", "a_vendre"].includes(String(a?.status || "").trim().toLowerCase());
}

function livestockCountAt(animals, cutoffIso, removedHeadsByAnimal, predicate = () => true) {
  return (animals || []).reduce((total, a) => {
    if (!predicate(a) || !animalExistedBy(a, cutoffIso)) return total;
    const removed = removedHeadsByAnimal.get(String(a.id)) || 0;
    const current = isActiveLivestock(a) ? animalQty(a) : (removed > 0 && isSaleListedAnimal(a) ? rawHeadQty(a) : 0);
    return total + current + removed;
  }, 0);
}

function computeDashboardKpis(d, speciesFilter, lang, dateRange, activeCurrencyId) {
  if (!d.ready) return null;
  const filterSp = (rows, getSp) => rows.filter((r) => !speciesFilter || getSp(r) === speciesFilter);
  const keepCurrency = (row) => !activeCurrencyId || String(rowCurrencyId(row) ?? activeCurrencyId) === String(activeCurrencyId);
  const animals = filterSp(d.animals, (a) => a.species).filter(isActiveLivestock);
  const animalById = new Map(d.animals.map((a) => [a.id, a]));
  const keepActiveAnimalId = (animalId) => {
    const a = animalById.get(animalId);
    return isActiveLivestock(a) && (!speciesFilter || a?.species === speciesFilter);
  };
  // Quantité = champ count (1 ligne = plusieurs têtes possible), aligné sur l'occupation.
  const sum = (rows) => rows.reduce((s, a) => s + animalQty(a), 0);
  const sick = sum(animals.filter((a) => a.status && a.status !== "healthy"));
  const total = sum(animals);
  const females = animals.filter((a) => a.sex === "F");
  const males = animals.filter((a) => a.sex === "M");
  const female = sum(females);
  const male = sum(males);
  const femaleAdult = sum(females.filter(isAdultAnimal));
  const maleAdult = sum(males.filter(isAdultAnimal));
  const sales = d.sales.filter((s) => (!speciesFilter || s.species === speciesFilter) && keepCurrency(s) && inDateRange(s.saleDate || s.sale_date, dateRange));
  const expenses = d.expenses.filter((e) => (!speciesFilter || e.species === speciesFilter || !e.species) && keepCurrency(e) && inDateRange(e.expenseDate || e.expense_date, dateRange));
  const revMonth = sales.reduce((acc, s) => acc + Number(s.totalAmount ?? s.total_amount ?? 0), 0);
  const expMonth = expenses.reduce((acc, e) => acc + Number(e.amount ?? 0), 0);
  const lowStock = d.medicines.filter((m) => m.minQuantity != null && Number(m.quantity) < Number(m.minQuantity)).length;
  const runningTreatments = d.treatments.filter((t) => t.status === "running" && keepActiveAnimalId(t.animalId)).length;
  const todayISO = new Date().toISOString().slice(0, 10);
  const ongoingWithdrawals = d.treatments.filter((t) => t.status === "running" && keepActiveAnimalId(t.animalId) && t.endDate && t.endDate >= todayISO && (t.withdrawalMilkHours || t.withdrawalMeatDays || t.withdrawalEggsDays)).length;
  const activeRepro = d.repro.filter((e) => keepActiveAnimalId(e.animalId) && e.eventType === "insemination" && e.outcome !== "success" && e.outcome !== "failed").length;
  const previousRange = previousComparableRange(dateRange);
  const previousRemoved = previousRange ? removedHeadsByAnimalAfter(d.sales, d.mortalityEvents, previousRange.to) : new Map();
  const speciesPredicate = (a) => !speciesFilter || a?.species === speciesFilter;
  const previousTotal = previousRange ? livestockCountAt(d.animals, previousRange.to, previousRemoved, speciesPredicate) : total;
  const previousFemale = previousRange ? livestockCountAt(d.animals, previousRange.to, previousRemoved, (a) => speciesPredicate(a) && a?.sex === "F") : female;
  const previousMale = previousRange ? livestockCountAt(d.animals, previousRange.to, previousRemoved, (a) => speciesPredicate(a) && a?.sex === "M") : male;
  const previousSales = previousRange
    ? d.sales.filter((s) => (!speciesFilter || s.species === speciesFilter) && keepCurrency(s) && inDateRange(s.saleDate || s.sale_date, previousRange))
    : sales;
  const previousExpenses = previousRange
    ? d.expenses.filter((e) => (!speciesFilter || e.species === speciesFilter || !e.species) && keepCurrency(e) && inDateRange(e.expenseDate || e.expense_date, previousRange))
    : expenses;
  const previousRevMonth = previousSales.reduce((acc, s) => acc + Number(s.totalAmount ?? s.total_amount ?? 0), 0);
  const previousExpMonth = previousExpenses.reduce((acc, e) => acc + Number(e.amount ?? 0), 0);
  return {
    total, sick, female, male, femaleAdult, maleAdult, revMonth, expMonth, lowStock, runningTreatments, ongoingWithdrawals, activeRepro,
    deltaTotal: percentDelta(total, previousTotal),
    deltaFemale: percentDelta(female, previousFemale),
    deltaMale: percentDelta(male, previousMale),
    deltaRevenue: percentDelta(revMonth, previousRevMonth),
    deltaExpense: percentDelta(expMonth, previousExpMonth),
  };
}

const Dashboard = ({ lang, speciesFilter, onSpeciesFilter, onNav }) => {
  const species = speciesFilter ? speciesById(speciesFilter) : null;
  const isAll = !species;
  const [dateRange, setDateRange] = React.useState(() => defaultDateRange("today"));
  const live = useDashboardData();
  const currencyMeta = useCurrencyCatalog();
  const activeCurrencyId = currencyMeta.defaultCurrencyId ? String(currencyMeta.defaultCurrencyId) : "";
  const moneyUnit = symbolFor(activeCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol);
  const k = computeDashboardKpis(live, speciesFilter, lang, dateRange, activeCurrencyId);
  const fin = deriveDashFinanceKpis(live.finance);
  const ALERTS = deriveDashAlerts(live, lang);
  const aiFiltered = live.aiInsights.map((i) => ({
    id: i.id, kind: i.kind, icon: i.icon || "sparkle", confidence: i.confidence ?? 80,
    fr: i.textFr || i.text_fr, en: i.textEn || i.text_en,
    action: lang === "fr" ? (i.actionLabelFr || i.action_label_fr) : (i.actionLabelEn || i.action_label_en),
    target: i.actionTarget || i.action_target,
  }));

  // KPI set (adapts). Values come from live API/DB data only.
  const liveKpis = k ? [
    { label: t(lang, "kTotal"),       value: k.total.toLocaleString("fr-CA"), unit: lang==="fr"?"têtes":"head", delta: k.deltaTotal, trend: Array(12).fill(k.total), icon: "layers" },
    { label: lang==="fr"?"Femelles":"Females", value: k.female.toLocaleString("fr-CA"), unit: lang==="fr"?"têtes":"head", sublabel: k.female > 0 ? (lang==="fr"?`dont ${k.femaleAdult} adulte${k.femaleAdult>1?"s":""}`:`incl. ${k.femaleAdult} adult${k.femaleAdult>1?"s":""}`) : undefined, delta: k.deltaFemale, trend: Array(12).fill(k.female), icon: "heart", accent: "var(--pertinence-500)" },
    { label: lang==="fr"?"Mâles":"Males",     value: k.male.toLocaleString("fr-CA"),   unit: lang==="fr"?"têtes":"head", sublabel: k.male > 0 ? (lang==="fr"?`dont ${k.maleAdult} adulte${k.maleAdult>1?"s":""}`:`incl. ${k.maleAdult} adult${k.maleAdult>1?"s":""}`) : undefined, delta: k.deltaMale, trend: Array(12).fill(k.male),   icon: "user",  accent: "var(--forest-700)" },
    { label: t(lang, "kSick"),        value: k.sick, unit: lang==="fr"?"animaux":"animals", delta: null, trend: [k.sick, k.sick, k.sick, k.sick, k.sick, k.sick, k.sick, k.sick, k.sick, k.sick, k.sick, k.sick], icon: "pulse", accent: "var(--health-500)" },
    { label: t(lang, "kTreatments"),  value: k.runningTreatments, unit: "", delta: null, trend: [k.runningTreatments, k.runningTreatments, k.runningTreatments, k.runningTreatments, k.runningTreatments, k.runningTreatments, k.runningTreatments, k.runningTreatments, k.runningTreatments, k.runningTreatments, k.runningTreatments, k.runningTreatments], icon: "pill", accent: "var(--health-500)" },
    { label: t(lang, "kAlerts"),      value: ALERTS.length, unit: lang==="fr"?"actives":"active", delta: null, trend: [ALERTS.length, ALERTS.length, ALERTS.length, ALERTS.length, ALERTS.length, ALERTS.length, ALERTS.length, ALERTS.length, ALERTS.length, ALERTS.length, ALERTS.length, ALERTS.length], icon: "bell", accent: "var(--critical)" },
    { label: t(lang, "kRevenue"),     sublabel: rangeLabel(dateRange, lang), value: k.revMonth.toLocaleString("fr-CA"), unit: moneyUnit, delta: k.deltaRevenue, trend: [k.revMonth, k.revMonth, k.revMonth, k.revMonth, k.revMonth, k.revMonth, k.revMonth, k.revMonth, k.revMonth, k.revMonth, k.revMonth, k.revMonth], icon: "coins", accent: "var(--money-500)" },
    { label: t(lang, "kExpense"),     sublabel: rangeLabel(dateRange, lang), value: k.expMonth.toLocaleString("fr-CA"), unit: moneyUnit, delta: k.deltaExpense, trend: [k.expMonth, k.expMonth, k.expMonth, k.expMonth, k.expMonth, k.expMonth, k.expMonth, k.expMonth, k.expMonth, k.expMonth, k.expMonth, k.expMonth], icon: "wallet" },
    { label: lang==="fr"?"Stock faible":"Low stock", value: k.lowStock, unit: lang==="fr"?"réf.":"refs", delta: null, trend: [k.lowStock, k.lowStock, k.lowStock, k.lowStock, k.lowStock, k.lowStock, k.lowStock, k.lowStock, k.lowStock, k.lowStock, k.lowStock, k.lowStock], icon: "wheat", accent: k.lowStock > 0 ? "var(--rust-700)" : "var(--health-500)" },
    { label: t(lang, "kRepro"),       value: k.activeRepro, unit: lang==="fr"?"actives":"active", delta: null, trend: [k.activeRepro, k.activeRepro, k.activeRepro, k.activeRepro, k.activeRepro, k.activeRepro, k.activeRepro, k.activeRepro, k.activeRepro, k.activeRepro, k.activeRepro, k.activeRepro], icon: "fingerprint", accent: "var(--pertinence-500)" },
  ] : null;
  const speciesKpis = !isAll && live.ready ? (() => {
    const animalsSp = live.animals.filter((a) => a.species === species.id && isActiveLivestock(a));
    const sumSp = (rows) => rows.reduce((s, a) => s + animalQty(a), 0);
    const totalSp = sumSp(animalsSp);
    const sickSp = sumSp(animalsSp.filter((a) => a.status === "sick"));
    const runningTreatmentsSp = live.treatments.filter((t) => {
      const a = live.animals.find((x) => x.id === t.animalId);
      return a?.species === species.id && isActiveLivestock(a) && t.status === "running";
    }).length;
    const vaccUpcomingSp = live.vaccinations.filter((v) => v.species === species.id && v.status !== "done").length;
    const revSp = (live.sales || [])
      .filter((s) => s.species === species.id && (!activeCurrencyId || String(rowCurrencyId(s) ?? activeCurrencyId) === String(activeCurrencyId)) && inDateRange(s.saleDate || s.sale_date, dateRange))
      .reduce((sum, s) => sum + Number(s.totalAmount ?? s.total_amount ?? 0), 0);
    const femalesSp = animalsSp.filter((a) => a.sex === "F");
    const malesSp = animalsSp.filter((a) => a.sex === "M");
    const femaleSp = sumSp(femalesSp);
    const maleSp = sumSp(malesSp);
    const femaleAdultSp = sumSp(femalesSp.filter(isAdultAnimal));
    const maleAdultSp = sumSp(malesSp.filter(isAdultAnimal));
    return [
      { label: lang === "fr" ? `Cheptel · ${species.fr}` : `Herd · ${species.en}`, value: totalSp.toLocaleString("fr-CA"), unit: species.countingUnit, delta: k.deltaTotal, trend: Array(12).fill(totalSp), icon: "layers", accent: species.accent },
      { label: lang === "fr" ? "Femelles" : "Females", value: femaleSp.toLocaleString("fr-CA"), unit: species.countingUnit, sublabel: femaleSp > 0 ? (lang==="fr"?`dont ${femaleAdultSp} adulte${femaleAdultSp>1?"s":""}`:`incl. ${femaleAdultSp} adult${femaleAdultSp>1?"s":""}`) : undefined, delta: k.deltaFemale, trend: Array(12).fill(femaleSp), icon: "heart", accent: "var(--pertinence-500)" },
      { label: lang === "fr" ? "Mâles" : "Males",     value: maleSp.toLocaleString("fr-CA"),   unit: species.countingUnit, sublabel: maleSp > 0 ? (lang==="fr"?`dont ${maleAdultSp} adulte${maleAdultSp>1?"s":""}`:`incl. ${maleAdultSp} adult${maleAdultSp>1?"s":""}`) : undefined, delta: k.deltaMale, trend: Array(12).fill(maleSp),   icon: "user",  accent: "var(--forest-700)" },
      { label: t(lang, "kSick"), value: sickSp, unit: lang === "fr" ? "animaux" : "animals", delta: null, trend: Array(12).fill(sickSp), icon: "pulse", accent: "var(--health-500)" },
      { label: lang === "fr" ? "Traitements actifs" : "Active treatments", value: runningTreatmentsSp, unit: "", delta: null, trend: Array(12).fill(runningTreatmentsSp), icon: "pill", accent: "var(--health-500)" },
      { label: lang === "fr" ? "Vaccins à venir" : "Upcoming vaccines", value: vaccUpcomingSp, unit: "", delta: null, trend: Array(12).fill(vaccUpcomingSp), icon: "syringe", accent: "var(--health-500)" },
      { label: lang === "fr" ? "Revenu" : "Revenue", sublabel: rangeLabel(dateRange, lang), value: revSp.toLocaleString("fr-CA"), unit: moneyUnit, delta: k.deltaRevenue, trend: Array(12).fill(revSp), icon: "coins", accent: "var(--money-500)" },
    ];
  })() : null;
  const kpis = isAll ? (liveKpis || []) : (speciesKpis || []);

  // Species-aware filtered lists
  const alertsFiltered = isAll ? ALERTS : ALERTS.filter(a => a.species === species.id);
  // Upcoming: derive from live treatments end_date + repro due_date if available.
  const todayISO = new Date().toISOString().slice(0, 10);
  const liveUpcoming = live.ready ? (() => {
    const aMap = new Map(live.animals.map((a) => [a.id, a]));
    const items = [];
    live.treatments.forEach((t) => {
      if (!t.endDate || t.endDate < todayISO) return;
      const a = aMap.get(t.animalId);
      if (!isActiveLivestock(a)) return;
      if (speciesFilter && a?.species !== speciesFilter) return;
      items.push({ id: `t-${t.id}`, species: a?.species || "cow", vaccine: (lang === "fr" ? "Fin traitement · " : "Treatment end · ") + (t.medicineName || ""), target: a?.name || a?.externalId || "—", n: 1, due: t.endDate, status: t.endDate === todayISO ? "today" : "scheduled" });
    });
    live.repro.forEach((e) => {
      if (!e.expectedDueDate || e.expectedDueDate < todayISO) return;
      const a = aMap.get(e.animalId);
      if (!isActiveLivestock(a)) return;
      if (speciesFilter && a?.species !== speciesFilter) return;
      items.push({ id: `r-${e.id}`, species: a?.species || "cow", vaccine: (lang === "fr" ? "Mise bas · " : "Birthing · ") + (a?.name || a?.externalId || "—"), target: a?.name || "—", n: 1, due: e.expectedDueDate, status: e.expectedDueDate === todayISO ? "today" : "scheduled" });
    });
    items.sort((a, b) => a.due.localeCompare(b.due));
    return items.slice(0, 5);
  })() : null;
  const vaccinesUpcoming = liveUpcoming || [];

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 20, overflow: "auto", height: "100%" }}>
      {/* Header strip with species switcher */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="overline" style={{ marginBottom: 4 }}>
              {lang === "fr" ? "Vue d'ensemble · Overview" : "Overview · Vue d'ensemble"}
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 32, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
              {isAll
                ? (lang === "fr"
                    ? <>{lang === "fr" ? "Tableau de bord" : "Dashboard"}, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{formatLongDate(new Date(), "fr")}</span></>
                    : <>Dashboard, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{formatLongDate(new Date(), "en")}</span></>)
                : (lang === "fr" ? <>{species.fr}, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>aperçu détaillé</span></> : <>{species.en}, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>detailed overview</span></>)
              }
            </h1>
          </div>
          <FarmScore {...computeFarmScore(live, speciesFilter, dateRange)} loading={!live.ready}/>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter}/>
          <DateRangeFilter lang={lang} value={dateRange} onChange={setDateRange}/>
        </div>
      </div>

      {/* Withdrawal banner when on cow / any species with active withdrawal */}
      {alertsFiltered.some(a => a.kind === "withdrawal") && (
        <WithdrawalBanner lang={lang} alerts={alertsFiltered.filter(a => a.kind === "withdrawal")} onNav={onNav}/>
      )}

      {/* KPI grid */}
      {live.ready ? (
        <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
          {kpis.map((k, i) => <KpiCard key={i} {...k}/>)}
        </div>
      ) : (
        <KpiGridLoader lang={lang} count={8} columns="var(--cols-4)"/>
      )}

      {/* Two-column main area */}
      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-main)", gap: 16, alignItems: "start" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Production chart */}
          <ProductionPanel lang={lang} species={species} live={live}/>

          {/* Per-species breakdown (only when all) OR Diseases (when species) */}
          {isAll ? <SpeciesBreakdown lang={lang} onSelect={onSpeciesFilter} live={live} onAll={() => onNav("animals")}/> : <SpeciesDetailPanel lang={lang} species={species}/>}

          {/* AI Insights */}
          <AIPanel lang={lang} insights={aiFiltered} onNav={onNav} ready={live.ready}/>
        </div>

        {/* Right column: alerts + upcoming */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AlertsPanel lang={lang} alerts={alertsFiltered} onAll={() => onNav("alerts")} ready={live.ready}/>
          <UpcomingPanel lang={lang} vaccines={vaccinesUpcoming} onAll={() => onNav("calendar")} ready={live.ready}/>
        </div>
      </div>
    </div>
  );
};

// Score de la ferme — calculé sur les vraies données live.
// - sante:  100 * (animaux sains / total). 80 par défaut si pas encore de data.
// - prod:   100 - min(80, 10 * traitements actifs / total). Approximation:
//           si peu de traitements en cours pour la taille du troupeau, prod
//           est haute. À remplacer par une métrique production réelle quand
//           on aura un objectif par espèce.
// - finance: marge (rev - exp) / rev * 100, plafonnée [0..100]. 80 si rev=0.
function computeFarmScore(live, speciesFilter, dateRange) {
  if (!live?.ready) return { sante: 0, prod: 0, finance: 0 };
  const animals = (live.animals || []).filter((a) => isActiveLivestock(a) && (!speciesFilter || a.species === speciesFilter));
  const total = animals.reduce((s, a) => s + animalQty(a), 0) || 1;
  const sick = animals.filter((a) => a.status && a.status !== "healthy").reduce((s, a) => s + animalQty(a), 0);
  const sante = Math.round(((total - sick) / total) * 100);
  const treatments = (live.treatments || []).filter((t) => {
    const a = live.animals.find((x) => x.id === t.animalId);
    return t.status === "running" && isActiveLivestock(a) && (!speciesFilter || a?.species === speciesFilter);
  });
  const prodPenalty = Math.min(80, Math.round((10 * treatments.length) / total));
  const prod = Math.max(0, 100 - prodPenalty);
  const sales = (live.sales || []).filter((s) => (!speciesFilter || s.species === speciesFilter) && inDateRange(s.saleDate || s.sale_date, dateRange));
  const expenses = (live.expenses || []).filter((e) => (!speciesFilter || e.species === speciesFilter || !e.species) && inDateRange(e.expenseDate || e.expense_date, dateRange));
  const rev = sales.reduce((s, x) => s + Number(x.totalAmount ?? x.total_amount ?? 0), 0);
  const exp = expenses.reduce((s, x) => s + Number(x.amount || 0), 0);
  const finance = rev > 0 ? Math.max(0, Math.min(100, Math.round(((rev - exp) / rev) * 100))) : 0;
  return { sante, prod, finance };
}

// ─── Withdrawal banner ───────────────────────────────────────────────────
const WithdrawalBanner = ({ lang, alerts, onNav }) => (
  <div className="withdrawal-banner" style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
    <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", zIndex: 1 }}>
      <Icon name="shield" size={20} color="#ECF1EC"/>
    </div>
    <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="overline" style={{ color: "rgba(251, 248, 242, 0.85)" }}>{lang === "fr" ? "Délai de retrait · obligatoire" : "Withdrawal period · mandatory"}</span>
        {alerts.map((a, i) => (
          <span key={i} className="italic-serif" style={{ fontSize: 13, color: "#F0D6CB" }}>{a.animal}</span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em" }}>
          {lang === "fr" ? "Vente, abattage et collecte bloqués" : "Sale, slaughter and collection blocked"}
        </span>
      </div>
      <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {alerts.map((a, i) => (
          <span key={i} className="mono" style={{ fontSize: 11.5, color: "#F0D6CB", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: "#F0D6CB" }}/>
            {a.subtitle}
          </span>
        ))}
      </div>
    </div>
    <button className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "#ECF1EC", borderColor: "rgba(255,255,255,0.2)", position: "relative", zIndex: 1, cursor: "pointer" }}
      onClick={() => onNav && onNav("alerts")}>
      {lang === "fr" ? "Détails" : "Details"}
      <Icon name="arrowRight" size={14} color="#ECF1EC"/>
    </button>
  </div>
);

// ─── Production panel with chart ─────────────────────────────────────────
// Period buckets: week=7 days, month=12 weeks (~3 mo), quarter=6 months, year=12 months.
const PERIOD_DEFS = {
  week:    { buckets: 7,  unit: "day",   subtitle: { fr: "7 derniers jours",   en: "Last 7 days" } },
  month:   { buckets: 12, unit: "week",  subtitle: { fr: "12 dernières semaines", en: "Last 12 weeks" } },
  quarter: { buckets: 6,  unit: "month", subtitle: { fr: "6 derniers mois",    en: "Last 6 months" } },
  year:    { buckets: 12, unit: "month", subtitle: { fr: "12 derniers mois",   en: "Last 12 months" } },
};

function bucketProduction(logs, period, speciesId) {
  const def = PERIOD_DEFS[period] || PERIOD_DEFS.month;
  const now = new Date();
  const labels = [];
  const buckets = [];
  for (let i = def.buckets - 1; i >= 0; i--) {
    const d = new Date(now);
    if (def.unit === "day") d.setDate(d.getDate() - i);
    else if (def.unit === "week") d.setDate(d.getDate() - i * 7);
    else d.setMonth(d.getMonth() - i);
    buckets.push(d);
  }
  const startOfBucket = (d) => {
    const x = new Date(d);
    if (def.unit === "day") { x.setHours(0,0,0,0); return x; }
    if (def.unit === "week") { x.setDate(x.getDate() - x.getDay()); x.setHours(0,0,0,0); return x; }
    x.setDate(1); x.setHours(0,0,0,0); return x;
  };
  const bucketStarts = buckets.map(startOfBucket);
  const labelFor = (d) => {
    if (def.unit === "day") return `${d.getDate()}/${d.getMonth()+1}`;
    if (def.unit === "week") return `S${Math.ceil(d.getDate()/7)} ${d.getMonth()+1}`;
    return `${d.getFullYear().toString().slice(2)}-${String(d.getMonth()+1).padStart(2,"0")}`;
  };
  bucketStarts.forEach((d) => labels.push(labelFor(d)));

  const byKind = {};
  (logs || []).forEach((row) => {
    if (speciesId && row.species !== speciesId) return;
    const iso = row.logDate || row.log_date;
    if (!iso) return;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return;
    let idx = -1;
    for (let i = bucketStarts.length - 1; i >= 0; i--) {
      if (t >= bucketStarts[i].getTime()) { idx = i; break; }
    }
    if (idx < 0) return;
    const kind = row.productType || row.product_type || "other";
    byKind[kind] = byKind[kind] || new Array(def.buckets).fill(0);
    byKind[kind][idx] += Number(row.quantity ?? 0);
  });

  const KIND_META = {
    milk:   { fr: "Lait (L)",         en: "Milk (L)",        color: "var(--pertinence-500)" },
    eggs:   { fr: "Œufs",             en: "Eggs",            color: "var(--autorite-500)" },
    wool:   { fr: "Laine (kg)",       en: "Wool (kg)",       color: "var(--clay-700)" },
    growth: { fr: "Poids moyen (kg)", en: "Avg weight (kg)", color: "var(--health-500)" },
  };
  const series = Object.entries(byKind).map(([kind, data]) => {
    const m = KIND_META[kind] || { fr: kind, en: kind, color: "var(--ink-500)" };
    return { name: m.fr, en: m.en, color: m.color, data };
  });
  return { labels, series };
}

const ProductionPanel = ({ lang, species, live }) => {
  const [period, setPeriod] = React.useState("month");
  const { series, labels } = bucketProduction(live?.productionLogs || [], period, species?.id);
  const sub = PERIOD_DEFS[period].subtitle[lang === "fr" ? "fr" : "en"];
  const periods = [
    { id: "week",    label: t(lang, "week") },
    { id: "month",   label: t(lang, "month") },
    { id: "quarter", label: t(lang, "quarter") },
    { id: "year",    label: t(lang, "year") },
  ];
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div className="bilang">
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>
              {lang === "fr" ? "Production" : "Production"}
            </h3>
            <span className="sec">{(lang === "fr" ? "production" : "production")} · {sub}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {periods.map((p) => (
            <button key={p.id} className="btn btn-sm" onClick={() => setPeriod(p.id)}
              style={p.id === period ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : {}}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {!live?.ready ? (
        <SectionLoader lang={lang} minHeight={140}/>
      ) : series.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
          {lang === "fr" ? "Aucune production enregistrée pour cette période" : "No production recorded for this period"}
        </div>
      ) : (
        <ProdChart series={series} lang={lang} labels={labels}/>
      )}
      <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
        {series.map((s, i) => (
          <span key={i} style={{ fontSize: 12, color: "var(--fg-2)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }}/> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
};

const ProdChart = ({ series, lang, labels }) => {
  const chartSeries = series.map((s) => ({
    name: lang === "fr" ? s.name : (s.en || s.name),
    data: s.data,
    color: s.color,
  }));
  return (
    <MaterialLineChart
      type="area"
      height={220}
      labels={labels}
      series={chartSeries}
      colors={chartSeries.map((s) => s.color)}
      formatter={(v) => Number(v || 0).toLocaleString("fr-CA")}
    />
  );
};

// ─── Species breakdown grid (when "all") ─────────────────────────────────
const SpeciesBreakdown = ({ lang, onSelect, live, onAll }) => {
  // Replace static counts with live animal counts per species when available.
  const liveCounts = live?.ready ? live.animals.reduce((acc, a) => {
    if (!isActiveLivestock(a)) return acc;
    acc[a.species] = (acc[a.species] || 0) + animalQty(a);
    return acc;
  }, {}) : null;
  const liveSick = live?.ready ? live.animals.reduce((acc, a) => {
    if (!isActiveLivestock(a) || !a.status || a.status === "healthy") return acc;
    acc[a.species] = (acc[a.species] || 0) + animalQty(a);
    return acc;
  }, {}) : null;
  return (
  <div className="card" style={{ padding: "16px 18px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div className="bilang">
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Par espèce" : "By species"}</h3>
        <span className="sec">{lang === "fr" ? "by species" : "par espèce"}</span>
      </div>
      <button className="btn btn-sm btn-ghost" onClick={onAll}>
        {lang === "fr" ? "Tout voir" : "View all"}
        <Icon name="arrowRight" size={12} color="var(--ink-600)"/>
      </button>
    </div>
    {!live?.ready ? (
      <SectionLoader lang={lang} minHeight={110}/>
    ) : (
    <div style={{ display: "grid", gridTemplateColumns: "var(--cols-5)", gap: 8 }}>
      {SPECIES.map((s_orig) => {
        const liveN = liveCounts ? (liveCounts[s_orig.id] ?? 0) : 0;
        const liveSickN = liveSick ? (liveSick[s_orig.id] ?? 0) : 0;
        const s = { ...s_orig, count: liveN, sick: liveSickN };
        return (
        <button key={s.id} onClick={() => onSelect(s.id)} style={{
          background: "var(--bg-sunken)", border: "1px solid var(--border-1)", borderRadius: 10,
          padding: "12px 12px 10px", display: "flex", flexDirection: "column", gap: 6, cursor: "pointer",
          textAlign: "left", transition: "all 120ms var(--ease-out)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--ink-300)"; e.currentTarget.style.background = "var(--paper)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-1)"; e.currentTarget.style.background = "var(--bg-sunken)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: s.accentBg, color: s.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AnimalGlyph kind={s.glyph} size={18} color="currentColor"/>
            </div>
            {s.sick > 0 && (
              <span className="tag tag-danger" style={{ fontSize: 10, padding: "1px 6px" }}>
                {s.sick} {lang==="fr"?"malades":"sick"}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>{lang === "fr" ? s.fr : s.en}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span className="tnum serif" style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-950)" }}>{s.count.toLocaleString("fr-CA")}</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{s.countingUnit === "lot" ? (lang==="fr"?"oiseaux":"birds") : s.countingUnit === "bassin" ? "kg" : ""}</span>
          </div>
          <Sparkline data={Array(12).fill(s.count)} color={s.accent}/>
        </button>
        );
      })}
    </div>
    )}
  </div>
  );
};

// ─── Species detail panel (when one species selected) ────────────────────
const SpeciesDetailPanel = ({ lang, species }) => (
  <div className="card" style={{ padding: "16px 18px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div className="bilang">
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>
          {lang === "fr" ? "Module specifique" : "Species module"} - <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{lang === "fr" ? species.fr : species.en}</span>
        </h3>
        <span className="sec">{species.modules.length} {lang === "fr" ? "modules adaptes" : "adapted modules"}</span>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "var(--cols-2)", gap: 24 }}>
      <div>
        <div className="overline" style={{ color: "var(--health-700)", marginBottom: 8 }}>
          {lang === "fr" ? "Donnees sanitaires" : "Health data"}
        </div>
        <span style={{ color: "var(--ink-700)", fontSize: 13 }}>
          {lang === "fr" ? "Les maladies, alertes et traitements sont lus depuis la base." : "Diseases, alerts and treatments are read from the database."}
        </span>
      </div>
      <div>
        <div className="overline" style={{ color: "var(--pertinence-700)", marginBottom: 8 }}>
          {lang === "fr" ? "Modules actifs" : "Active modules"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {species.modules.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <Icon name="check" size={13} color="var(--pertinence-500)"/>
              <span style={{ color: "var(--ink-800)" }}>{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="hairline" style={{ marginTop: 14, paddingTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
      <div className="overline" style={{ width: "100%", marginBottom: 2 }}>{lang === "fr" ? "Champs du dossier animal" : "Animal sheet fields"}</div>
      {species.fields.map((f, i) => (
        <span key={i} className="tag" style={{ background: "var(--bg-sunken)" }}>{f}</span>
      ))}
    </div>
  </div>
);

const AI_INSIGHT_DEST = { predict: "alerts", feed: "stock", repro: "repro", anomaly: "alerts" };
const AIPanel = ({ lang, insights, onNav, ready = true }) => (
  <div className="card" style={{ padding: "16px 18px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--ink-900)", color: "var(--parchment-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="sparkle" size={16} color="#D7AA45"/>
        </div>
        <div className="bilang">
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Recommandations IA" : "AI recommendations"}</h3>
          <span className="sec">{lang === "fr" ? "AI insights" : "recommandations"}</span>
        </div>
      </div>
      <span className="tag" style={{ background: "var(--ink-900)", color: "var(--parchment-50)" }}>ChatGPT</span>
    </div>
    {!ready ? (
      <SectionLoader lang={lang} minHeight={100}/>
    ) : (
    <div className="rule-lines" style={{ background: "var(--parchment-50)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {insights.map((ins) => (
          <div key={ins.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--paper)", border: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={ins.icon} size={14} color="var(--oxblood-700)"/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-800)" }}>{lang === "fr" ? ins.fr : ins.en}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>confiance {ins.confidence}%</span>
                <span style={{ width: 60, height: 3, borderRadius: 2, background: "var(--ink-100)", overflow: "hidden" }}>
                  <span style={{ display: "block", width: `${ins.confidence}%`, height: "100%", background: "var(--oxblood-700)" }}/>
                </span>
                <button className="btn btn-sm btn-ghost" style={{ marginLeft: "auto", color: "var(--oxblood-700)" }}
                  onClick={() => onNav && onNav(AI_INSIGHT_DEST[ins.kind] || "alerts")}>
                  {ins.action}
                  <Icon name="arrowRight" size={11} color="var(--oxblood-700)"/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    )}
    <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 10, }}>
      {lang === "fr"
        ? "L'assistant cite ses sources. Vérifiez chaque recommandation avant action vétérinaire."
        : "The assistant cites its sources. Verify every recommendation before veterinary action."}
    </div>
  </div>
);

// ─── Alerts panel ────────────────────────────────────────────────────────
const AlertsPanel = ({ lang, alerts, onAll, ready = true }) => (
  <div className="card" style={{ padding: "14px 16px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div className="bilang">
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Alertes critiques" : "Critical alerts"}</h3>
        <span className="sec">{alerts.length}</span>
      </div>
      <button className="btn btn-sm btn-ghost" onClick={onAll}>
        {lang === "fr" ? "Voir tout" : "View all"}
        <Icon name="arrowRight" size={11} color="var(--ink-600)"/>
      </button>
    </div>
    {!ready ? (
      <SectionLoader lang={lang} minHeight={90}/>
    ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {alerts.slice(0, 6).map((a, i, arr) => {
        const sevColor = a.severity === "critical" ? "var(--rust-700)" : a.severity === "high" ? "var(--wheat-500)" : "var(--sky-500)";
        return (
          <div key={a.id} style={{
            display: "grid", gridTemplateColumns: "8px 1fr auto", columnGap: 10, rowGap: 2,
            padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px dashed var(--border-1)" : "none",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: sevColor, marginTop: 6 }}/>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>{a.title}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--fg-2)", marginTop: 2 }}>
                <span className="italic-serif" style={{ fontSize: 12 }}>{a.animal}</span>
                <span style={{ color: "var(--fg-3)" }}> · {a.subtitle}</span>
              </div>
            </div>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", whiteSpace: "nowrap", alignSelf: "center" }}>{a.date}</span>
          </div>
        );
      })}
      {alerts.length === 0 && (
        <div style={{ padding: "20px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
          {lang === "fr" ? "Aucune alerte active 🌱" : "No active alerts"}
        </div>
      )}
    </div>
    )}
  </div>
);

// ─── Upcoming actions panel ──────────────────────────────────────────────
const UpcomingPanel = ({ lang, vaccines, onAll, ready = true }) => (
  <div className="card" style={{ padding: "14px 16px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div className="bilang">
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, letterSpacing: "-0.01em" }}>{lang === "fr" ? "À venir cette semaine" : "Upcoming this week"}</h3>
        <span className="sec">{lang === "fr" ? "calendrier" : "schedule"}</span>
      </div>
      <button className="btn btn-sm btn-ghost" onClick={onAll}>
        <Icon name="calendar" size={12} color="var(--ink-600)"/>
        {lang === "fr" ? "Calendrier" : "Calendar"}
      </button>
    </div>
    {!ready ? (
      <SectionLoader lang={lang} minHeight={90}/>
    ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {vaccines.map((v) => {
        const sp = speciesById(v.species) || { glyph: null, accent: "var(--ink-700)", accentBg: "var(--ink-50)" };
        const dot = v.status === "overdue" ? "var(--rust-700)" : v.status === "today" ? "var(--wheat-500)" : "var(--ink-300)";
        return (
          <div key={v.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: sp.accentBg, color: sp.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="syringe" size={15} color="currentColor"/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-900)" }}>{v.vaccine}</div>
              <div style={{ fontSize: 11, color: "var(--fg-2)" }}>
                <AnimalGlyph kind={sp.glyph} size={11} color="var(--fg-2)"/>
                <span style={{ marginLeft: 4 }}>{v.target}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: dot, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: dot }}/>
                {v.status === "overdue" ? (lang==="fr"?"retard":"overdue") : v.status === "today" ? (lang==="fr"?"aujourd'hui":"today") : v.due.split("-").slice(1).join("-")}
              </span>
              <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{v.n.toLocaleString("fr-CA")} {lang==="fr"?"animaux":"animals"}</span>
            </div>
          </div>
        );
      })}
    </div>
    )}
  </div>
);

export { Dashboard };
