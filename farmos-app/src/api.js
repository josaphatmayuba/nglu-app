// FarmOS — API client. Reads access-token from the CRM's localStorage entry
// (same-origin: /admin and /farmos share localStorage on ongdngolu.org).

const BASE = "/api/farmos";

function authHeaders() {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("access-token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonFetch(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }
  return res.json();
}

export const api = {
  listAnimals:    () => jsonFetch("/animals"),
  listMedicines:  () => jsonFetch("/medicines"),
  listTreatments: () => jsonFetch("/treatments"),
  listDiseases:   (species) => jsonFetch(`/diseases${species ? `?species=${encodeURIComponent(species)}` : ""}`),
  listReproductionEvents: () => jsonFetch("/reproduction-events"),
  listSales:    () => jsonFetch("/sales"),
  listExpenses: () => jsonFetch("/expenses"),
  createAnimal:    (body) => jsonFetch("/animals",             { method: "POST",   body: JSON.stringify(body) }),
  updateAnimal:    (id, body) => jsonFetch(`/animals/${id}`,   { method: "PATCH",  body: JSON.stringify(body) }),
  createTreatment: (body) => jsonFetch("/treatments",          { method: "POST",   body: JSON.stringify(body) }),
  createSale:      (body) => jsonFetch("/sales",               { method: "POST",   body: JSON.stringify(body) }),
  createExpense:   (body) => jsonFetch("/expenses",            { method: "POST",   body: JSON.stringify(body) }),
  createReproductionEvent: (body) => jsonFetch("/reproduction-events", { method: "POST", body: JSON.stringify(body) }),
  listProductionLogs: () => jsonFetch("/production-logs"),
  listVaccinations: () => jsonFetch("/vaccinations"),
  listAiInsights: () => jsonFetch("/ai-insights"),
  getFinanceSummary: () => jsonFetch("/finance-summary"),
  createProductionLog: (body) => jsonFetch("/production-logs", { method: "POST", body: JSON.stringify(body) }),
  deleteAnimal:  (id) => jsonFetch(`/animals/${id}`,  { method: "DELETE" }),
  deleteMedicine: (id) => jsonFetch(`/medicines/${id}`, { method: "DELETE" }),
  deleteTreatment: (id) => jsonFetch(`/treatments/${id}`, { method: "DELETE" }),
  deleteReproductionEvent: (id) => jsonFetch(`/reproduction-events/${id}`, { method: "DELETE" }),
  deleteProductionLog: (id) => jsonFetch(`/production-logs/${id}`, { method: "DELETE" }),
  deleteSale:    (id) => jsonFetch(`/sales/${id}`,    { method: "DELETE" }),
  deleteExpense: (id) => jsonFetch(`/expenses/${id}`, { method: "DELETE" }),
  listLookups: (category, scope) => jsonFetch(`/lookups?category=${encodeURIComponent(category)}${scope ? `&scope=${encodeURIComponent(scope)}` : ""}`),
  createLookup: (body) => jsonFetch("/lookups", { method: "POST", body: JSON.stringify(body) }),
  createDisease: (body) => jsonFetch("/diseases", { method: "POST", body: JSON.stringify(body) }),
  listFarmosStaff: (role) => jsonFetch(`/staff${role ? `?role=${encodeURIComponent(role)}` : ""}`),
  listAnimalPhotos: (animalId) => jsonFetch(`/animals/${animalId}/photos`),
  uploadAnimalPhoto: (animalId, body) => jsonFetch(`/animals/${animalId}/photos`, { method: "POST", body: JSON.stringify(body) }),
  deleteAnimalPhoto: (id) => jsonFetch(`/animals/photos/${id}`, { method: "DELETE" }),
};

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

const SHORT_MONTHS_FR = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];

function shortDate(iso, lang = "fr") {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  const day = d.getUTCDate();
  const m = lang === "fr" ? SHORT_MONTHS_FR[d.getUTCMonth()] : d.toLocaleString("en", { month: "short" }).toLowerCase();
  return `${day} ${m}`;
}

const REV_CATEGORY_FR = { milk: "Lait", eggs: "Œufs", meat: "Viande", wool: "Laine", fish: "Poisson" };
const EXP_CATEGORY_FR = { feed: "Alimentation", medicine: "Médicaments", veterinary: "Vétérinaire", labor: "Main d'œuvre", utility: "Services", other: "Autre" };

export function adaptSaleAsTransaction(row, lang = "fr") {
  const date = row.saleDate || row.sale_date;
  const amount = Number(row.totalAmount ?? row.total_amount ?? 0);
  const sp = row.species;
  const product = row.productType || row.product_type;
  return {
    id: `sale-${row.id}`,
    _pk: row.id,
    _kind: "sale",
    kind: "rev",
    date: shortDate(date, lang),
    isoDate: date ? String(date).slice(0, 10) : "",
    label: `${row.buyer || "—"}${product ? ` · ${REV_CATEGORY_FR[product] || product}` : ""}`,
    amount: `+${amount.toLocaleString("fr-CA")}`,
    rawAmount: amount,
    category: REV_CATEGORY_FR[product] || product || "Revenu",
    species: sp || null,
  };
}

export function adaptExpenseAsTransaction(row, lang = "fr") {
  const date = row.expenseDate || row.expense_date;
  const amount = Number(row.amount ?? 0);
  return {
    id: `expense-${row.id}`,
    _pk: row.id,
    _kind: "expense",
    kind: "exp",
    date: shortDate(date, lang),
    isoDate: date ? String(date).slice(0, 10) : "",
    label: row.description || row.supplier || "Dépense",
    amount: `−${amount.toLocaleString("fr-CA")}`,
    rawAmount: -amount,
    category: EXP_CATEGORY_FR[row.category] || row.category || "Dépense",
    species: null,
  };
}

// Reproduction event row → mockup gestation shape used by ReproScreen.
const GESTATION_DAYS_BY_SPECIES = { cow: 283, pig: 114, goat: 152, sheep: 152, rabbit: 31, chicken: 21, duck: 28, turkey: 28, fish: 30 };

export function adaptReproEvent(row, animalById) {
  const evDate = row.eventDate || row.event_date;
  const due = row.expectedDueDate || row.expected_due_date;
  const a = animalById?.get(row.animalId ?? row.animal_id);
  const total = GESTATION_DAYS_BY_SPECIES[a?.species] || 0;
  let day = 0;
  if (evDate) {
    const start = new Date(String(evDate));
    day = Math.max(0, Math.round((Date.now() - start.getTime()) / 86400000));
  }
  const complete = row.eventType === "birthing" || row.event_type === "birthing" || row.outcome === "success";
  const offspring = row.offspringCount ?? row.offspring_count;
  return {
    id: `R-${row.id}`,
    _pk: row.id,
    animal: a?.name || a?.externalId || a?.external_id || "—",
    species: a?.species || null,
    start: evDate ? String(evDate).slice(0, 10) : "—",
    due: due ? String(due).slice(0, 10) : "—",
    day,
    total,
    ai: row.notes || (row.eventType ?? row.event_type) || "",
    soon: due && total > 0 && day >= total * 0.95,
    complete,
    offspring,
  };
}

// Medicine row → mockup STOCK shape.
export function adaptMedicine(row) {
  const exp = row.expiryDate || row.expiry_date;
  const min = row.minQuantity != null ? Number(row.minQuantity) : (row.min_quantity != null ? Number(row.min_quantity) : null);
  const qty = row.quantity != null ? Number(row.quantity) : 0;
  return {
    id: `M-${row.id}`,
    _pk: row.id,
    kind: row.kind || "med",
    name: row.name,
    qty,
    unit: row.unit,
    min,
    supplier: row.supplier,
    expiry: exp ? String(exp).slice(0, 10) : "—",
    species: [],
    lowStock: min != null && qty < min,
  };
}

// Treatment row → mockup TREATMENTS shape. Needs animal + disease maps for joins.
export function adaptTreatment(row, animalById, diseaseById) {
  const start = row.startDate || row.start_date;
  const end = row.endDate || row.end_date;
  const meat = row.withdrawalMeatDays ?? row.withdrawal_meat_days;
  const milkH = row.withdrawalMilkHours ?? row.withdrawal_milk_hours;
  const eggs = row.withdrawalEggsDays ?? row.withdrawal_eggs_days;
  const a = animalById?.get(row.animalId ?? row.animal_id);
  const d = diseaseById?.get(row.diseaseId ?? row.disease_id);
  const wd = {};
  if (meat != null) wd.meat = meat;
  if (milkH != null) wd.milk = Math.round(milkH / 24);
  if (eggs != null) wd.eggs = eggs;
  return {
    id: `T-${row.id}`,
    _pk: row.id,
    species: a?.species || null,
    animal: a?.name || a?.externalId || a?.external_id || "—",
    med: row.medicineName || row.medicine_name || "—",
    reason: d ? (d.nameFr || d.name_fr) : "—",
    dosage: row.dosage,
    route: row.route,
    start: start ? String(start).slice(0, 10) : null,
    end: end ? String(end).slice(0, 10) : null,
    vet: row.vet,
    status: row.status || "running",
    withdrawal: Object.keys(wd).length ? wd : undefined,
  };
}

// Adapter — converts backend farmos_animals row to mockup ANIMALS shape.
export function adaptAnimal(row) {
  const ext = row.externalId || row.external_id;
  const dob = row.dateOfBirth || row.date_of_birth;
  const last = row.lastEvent || row.last_event;
  const wUntil = row.withdrawalUntil || row.withdrawal_until;
  const wKind = row.withdrawalKind || row.withdrawal_kind;
  return {
    id: ext || `farmos-${row.id}`,
    _pk: row.id,
    glyph: row.species,
    species: row.species,
    name: row.name,
    race: row.race,
    sex: row.sex,
    dob: dob ? String(dob).slice(0, 10) : null,
    weight: row.weight != null ? Number(row.weight) : null,
    count: row.count != null ? Number(row.count) : null,
    lot: row.lot,
    barn: row.barn,
    status: row.status || "healthy",
    lastEvent: last,
    withdrawal: wUntil
      ? { until: String(wUntil).slice(0, 10), kind: wKind, med: null }
      : undefined,
  };
}
