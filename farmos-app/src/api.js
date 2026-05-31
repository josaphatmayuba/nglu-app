// FarmOS — API client. Reads access-token from the CRM's localStorage entry
// (same-origin: /admin and /farmos share localStorage on ongdngolu.org).
//
// Web : URLs relatives (/api/farmos/...), nginx route vers le backend.
// Capacitor (Android/iOS) : la WebView a pour origin capacitor://localhost,
// donc les URLs relatives ne marcheraient pas. On détecte Capacitor et on
// préfixe avec l'hôte API configuré (FARMOS_API_HOST, sinon dev par défaut).
const NATIVE = typeof window !== "undefined"
  && (window.Capacitor?.isNativePlatform?.() === true
      || /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.FARMOS_API_HOST) || "https://dev.ongdngolu.org";
const BASE = (NATIVE ? API_HOST : "") + "/api/farmos";

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
    // 401 = token invalide ou expiré → on purge l'auth et on laisse le shell
    // basculer sur l'écran de login (useAuthToken réagit à 'farmos:auth-changed').
    if (res.status === 401 && typeof window !== "undefined") {
      try {
        ["access-token", "role", "roleId", "user", "id", "isLogged"].forEach((k) => localStorage.removeItem(k));
      } catch {}
      window.dispatchEvent(new CustomEvent("farmos:auth-changed"));
    }
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }
  return res.json();
}

// SCRUM-239 : stale-while-revalidate via Dexie. Sert immédiatement la version
// cachée de la collection (si présente), puis rafraîchit en arrière-plan et
// émet `farmos:cache-updated` (detail = nom de table) pour que les composants
// se ré-render si besoin.
import { db, replaceCache, readCache } from "./offline-db";
import { enqueueMutation } from "./offline-outbox";

// ID temporaire pour les enregistrements optimistes en attente du retour
// serveur. Remplacé par le vrai id quand l'outbox sync.
let _tempCounter = 0;
function tempId(prefix) {
  _tempCounter++;
  return `tmp-${prefix}-${Date.now()}-${_tempCounter}`;
}

// Helper : enqueue si offline, sinon tente le réseau direct. Si le réseau
// échoue (timeout/connection), retombe sur la queue pour ne pas perdre la donnée.
async function mutate({ kind, method, path, body, optimistic }) {
  if (!navigator.onLine) {
    const id = await enqueueMutation({ kind, method, path, body, optimistic });
    return { id, _queued: true };
  }
  try {
    return await jsonFetch(path, { method, body: body ? JSON.stringify(body) : undefined });
  } catch (err) {
    // Si l'erreur est réseau (pas un 4xx serveur), on enqueue.
    if (/Failed to fetch|NetworkError|TypeError/i.test(String(err.message || err))) {
      const id = await enqueueMutation({ kind, method, path, body, optimistic });
      return { id, _queued: true };
    }
    throw err;
  }
}

function cachedList(table, path) {
  return async () => {
    let cached;
    try { cached = await readCache(table); } catch { cached = []; }
    // Lance le refresh en background (non bloquant pour la valeur retournée).
    const refresh = jsonFetch(path)
      .then(async (fresh) => {
        if (Array.isArray(fresh)) {
          await replaceCache(table, fresh);
          window.dispatchEvent(new CustomEvent("farmos:cache-updated", { detail: table }));
        }
        return fresh;
      })
      .catch(() => null);
    // Si on a déjà du cache → retourne immédiatement. Sinon attend le serveur.
    if (cached && cached.length > 0) return cached;
    const fresh = await refresh;
    return fresh || cached || [];
  };
}

export const api = {
  listAnimals:    cachedList("animals", "/animals"),
  listMedicines:  cachedList("medicines", "/medicines"),
  listTreatments: cachedList("treatments", "/treatments"),
  listDiseases:   (species) => cachedList("diseases", `/diseases${species ? `?species=${encodeURIComponent(species)}` : ""}`)(),
  listReproductionEvents: cachedList("reproductionEvents", "/reproduction-events"),
  listSales:    cachedList("sales", "/sales"),
  listExpenses: cachedList("expenses", "/expenses"),
  createAnimal:    (body) => mutate({ kind: "createAnimal", method: "POST", path: "/animals", body,
                       optimistic: { table: "animals", row: { id: tempId("a"), ...body, _pending: true } } }),
  updateAnimal:    (id, body) => mutate({ kind: "updateAnimal", method: "PATCH", path: `/animals/${id}`, body }),
  createTreatment: (body) => mutate({ kind: "createTreatment", method: "POST", path: "/treatments", body,
                       optimistic: { table: "treatments", row: { id: tempId("t"), ...body, _pending: true } } }),
  createSale:      (body) => mutate({ kind: "createSale", method: "POST", path: "/sales", body,
                       optimistic: { table: "sales", row: { id: tempId("s"), ...body, _pending: true } } }),
  createExpense:   (body) => mutate({ kind: "createExpense", method: "POST", path: "/expenses", body,
                       optimistic: { table: "expenses", row: { id: tempId("e"), ...body, _pending: true } } }),
  createReproductionEvent: (body) => mutate({ kind: "createReproductionEvent", method: "POST", path: "/reproduction-events", body,
                       optimistic: { table: "reproductionEvents", row: { id: tempId("r"), ...body, _pending: true } } }),
  listProductionLogs: cachedList("productionLogs", "/production-logs"),
  listVaccinations: cachedList("vaccinations", "/vaccinations"),
  listAiInsights: cachedList("aiInsights", "/ai-insights"),
  getFinanceSummary: () => jsonFetch("/finance-summary"),
  createProductionLog: (body) => mutate({ kind: "createProductionLog", method: "POST", path: "/production-logs", body }),
  deleteAnimal:  (id) => mutate({ kind: "deleteAnimal",  method: "DELETE", path: `/animals/${id}` }),
  deleteMedicine: (id) => mutate({ kind: "deleteMedicine", method: "DELETE", path: `/medicines/${id}` }),
  deleteTreatment: (id) => mutate({ kind: "deleteTreatment", method: "DELETE", path: `/treatments/${id}` }),
  deleteReproductionEvent: (id) => mutate({ kind: "deleteReproductionEvent", method: "DELETE", path: `/reproduction-events/${id}` }),
  deleteProductionLog: (id) => mutate({ kind: "deleteProductionLog", method: "DELETE", path: `/production-logs/${id}` }),
  deleteSale:    (id) => mutate({ kind: "deleteSale",    method: "DELETE", path: `/sales/${id}` }),
  deleteExpense: (id) => mutate({ kind: "deleteExpense", method: "DELETE", path: `/expenses/${id}` }),
  listLookups: (category, scope) => jsonFetch(`/lookups?category=${encodeURIComponent(category)}${scope ? `&scope=${encodeURIComponent(scope)}` : ""}`),
  createLookup: (body) => jsonFetch("/lookups", { method: "POST", body: JSON.stringify(body) }),
  createDisease: (body) => jsonFetch("/diseases", { method: "POST", body: JSON.stringify(body) }),
  listFarmosStaff: (role) => cachedList("staff", `/staff${role ? `?role=${encodeURIComponent(role)}` : ""}`)(),
  listAnimalPhotos: (animalId) => jsonFetch(`/animals/${animalId}/photos`),
  listAnimalsWithPhotos: (perAnimal = 3) => jsonFetch(`/animals-with-photos?perAnimal=${perAnimal}`),
  uploadAnimalPhoto: (animalId, body) => jsonFetch(`/animals/${animalId}/photos`, { method: "POST", body: JSON.stringify(body) }),
  deleteAnimalPhoto: (id) => jsonFetch(`/animals/photos/${id}`, { method: "DELETE" }),
  // Banque de semence (IA)
  listSemenStraws: (species) => cachedList("semenStraws", `/semen-straws${species ? `?species=${encodeURIComponent(species)}` : ""}`)(),
  getSemenStraw: (id) => jsonFetch(`/semen-straws/${id}`),
  createSemenStraw: (body) => jsonFetch("/semen-straws", { method: "POST", body: JSON.stringify(body) }),
  updateSemenStraw: (id, body) => jsonFetch(`/semen-straws/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteSemenStraw: (id) => jsonFetch(`/semen-straws/${id}`, { method: "DELETE" }),
  // Mâles disponibles pour saillie naturelle
  listBreedingMales: (species) => jsonFetch(`/breeding-males${species ? `?species=${encodeURIComponent(species)}` : ""}`),
  // Suggestion pour pré-remplir le formulaire d'IA
  suggestBreeding: (animalId, mode) => jsonFetch(`/breeding-suggestion/${animalId}${mode ? `?mode=${mode}` : ""}`),
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
