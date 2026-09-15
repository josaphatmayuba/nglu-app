// Domus — Dépenses par propriété (SCRUM-310).
// Liste + modale de création/édition, sur le même pattern que maintenance.jsx.
import { useMemo, useState } from "react";
import {
  CircleDollarSign,
  FileDown,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { money, normalizeCurrencyModule, cleanCurrencySymbol, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { api } from "../api.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { DomusPropertyField, DomusPropertySelect, FormSection, Modal, ModalActions } from "./biens.jsx";
import { useConfirm } from "../components/Dialog.jsx";
import { t, tf } from "../i18n.js";

// Catégories autorisées côté backend (PROPERTY_EXPENSE_CATEGORIES) — mortgage
// est volontairement exclu de cette v1.
export const EXPENSE_CATEGORIES = [
  ["insurance", t("Assurance")],
  ["property_tax", t("Taxe foncière")],
  ["hoa", t("Charges de copropriété")],
  ["maintenance_general", t("Entretien général")],
  ["management_fee", t("Frais de gestion")],
  ["security", t("Sécurité")],
  ["cleaning", t("Nettoyage")],
  ["other", t("Autre")],
];
const CATEGORY_LABEL = Object.fromEntries(EXPENSE_CATEGORIES);

const PAYMENT_METHOD_OPTIONS = [
  ["cash", t("Cash")],
  ["bank", t("Banque")],
  ["mobile_money", t("Mobile money")],
  ["cheque", t("Cheque")],
];
const PAYMENT_STATUS_OPTIONS = [
  ["paid", t("Payé")],
  ["pending", t("En attente")],
  ["overdue", t("En retard")],
];

const emptyExpense = {
  propertyId: "",
  unitId: "",
  category: "insurance",
  description: "",
  amount: "",
  currencyId: "",
  expenseDate: "",
  supplierId: "",
  vendorName: "",
  paymentMethod: "cash",
  paymentStatus: "paid",
  receiptUrl: "",
  receiptFile: null,
  notes: "",
};

function toId(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function compactDate(value) {
  return value ? String(value).slice(0, 10) : "-";
}

// Total groupé PAR DEVISE (jamais de somme inter-devises).
export function expenseTotalsByCurrency(expenses, resolveSymbol) {
  const map = new Map();
  expenses.forEach((expense) => {
    const sym = resolveSymbol(expense);
    map.set(sym, (map.get(sym) || 0) + Number(expense.amount || 0));
  });
  return [...map.entries()].map(([symbol, amount]) => ({ symbol, amount }));
}

export function Depenses() {
  const [query, setQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expenseModal, setExpenseModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const confirm = useConfirm();
  const expensesApi = useApi(() => api.propertyExpenses(), []);
  const propertiesApi = useApi(() => api.properties(), []);
  const unitsApi = useApi(() => api.units(), []);
  const currenciesApi = useApi(() => api.currencies(), []);
  const settingApi = useApi(() => api.setting(), []);
  const suppliersApi = useApi(() => api.suppliers(), []);
  useRealtimeReload(expensesApi.reload, ["property-expenses"]);

  const supplierOptions = useMemo(() => {
    const raw = suppliersApi.data;
    const arr = Array.isArray(raw) ? raw : (raw?.getAllSupplier || raw?.data || []);
    return (arr || [])
      .filter((s) => String(s.status) === "true")
      .map((s) => [String(s.id), `${s.name}${s.partyType === "individual" ? " (personne)" : ""}`]);
  }, [suppliersApi.data]);

  const loading = expensesApi.loading || propertiesApi.loading || unitsApi.loading;
  const error = expensesApi.error || propertiesApi.error || unitsApi.error;
  const expenses = useMemo(() => {
    const raw = expensesApi.data;
    return Array.isArray(raw) ? raw : raw?.data || [];
  }, [expensesApi.data]);
  const properties = useMemo(() => (Array.isArray(propertiesApi.data) ? propertiesApi.data : propertiesApi.data?.data || []), [propertiesApi.data]);
  const units = useMemo(() => (Array.isArray(unitsApi.data) ? unitsApi.data : unitsApi.data?.data || []), [unitsApi.data]);
  const currency = useMemo(
    () => normalizeCurrencyModule(currenciesApi.data, settingApi.data),
    [currenciesApi.data, settingApi.data],
  );

  // Symbole de la devise PROPRE à la dépense (SIFA : jamais le défaut global).
  const expenseSymbol = (expense) => {
    const byId = expense?.currencyId != null ? currency.currencyById?.get(Number(expense.currencyId)) : null;
    const fromId = byId ? cleanCurrencySymbol(byId) : "";
    return fromId || cleanCurrencySymbol(expense) || currency.defaultCurrencySymbol;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (propertyFilter && String(expense.propertyId) !== String(propertyFilter)) return false;
      if (categoryFilter && expense.category !== categoryFilter) return false;
      if (!q) return true;
      return [expense.description, expense.propertyName, expense.unitName, expense.vendorName]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [expenses, query, propertyFilter, categoryFilter]);

  const totalsByCurrency = useMemo(() => expenseTotalsByCurrency(filtered, expenseSymbol), [filtered, currency]);

  const reloadAll = async () => {
    await Promise.all([expensesApi.reload(), propertiesApi.reload(), unitsApi.reload()]);
  };

  const saveExpense = async (form) => {
    setBusy(true);
    setActionError("");
    try {
      const payload = {
        propertyId: toId(form.propertyId),
        unitId: toId(form.unitId) ?? null,
        category: form.category,
        description: form.description?.trim(),
        amount: toMoney(form.amount),
        currencyId: toId(form.currencyId) ?? null,
        expenseDate: form.expenseDate || null,
        supplierId: toId(form.supplierId) ?? undefined,
        vendorName: form.vendorName?.trim() || undefined,
        paymentMethod: form.paymentMethod || "cash",
        paymentStatus: form.paymentStatus || "paid",
        notes: form.notes?.trim() || undefined,
      };
      if (!payload.propertyId || !payload.description || !payload.amount || !payload.expenseDate) {
        throw new Error(t("Bien, description, montant et date obligatoires."));
      }
      let expenseId = form.id;
      if (expenseId) await api.updatePropertyExpense(expenseId, payload);
      else {
        const created = await api.createPropertyExpense(payload);
        expenseId = created?.id;
      }
      // Justificatif : upload multipart séparé (piece jointe), pas dans le payload JSON.
      if (form.receiptFile && expenseId) {
        await api.uploadPropertyExpenseReceipt(expenseId, form.receiptFile);
      }
      setExpenseModal(null);
      await reloadAll();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteExpense = async (expense) => {
    if (!(await confirm({
      title: t("Supprimer la dépense"),
      message: tf(t("Supprimer la dépense {description} ?"), { description: expense.description }),
      confirmLabel: t("Supprimer"),
      danger: true,
    }))) return;
    setBusyId(expense.id);
    setActionError("");
    try {
      await api.deletePropertyExpense(expense.id);
      await expensesApi.reload();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} onRetry={reloadAll} />;

  return (
    <>
      <div className="immo-header">
        <div>
          <h1>{t("Dépenses")}</h1>
          <p>{t("Dépenses par propriété : assurance, taxes, charges, entretien...")}</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Description, bien, fournisseur...")} />
          </label>
          <button className="immo-btn primary" onClick={() => setExpenseModal({ ...emptyExpense, currencyId: currency.defaultCurrencyId || "" })}>
            <Plus size={16} /> {t("Nouvelle dépense")}
          </button>
        </div>
      </div>

      <div className="maintenance-toolbar">
        <div className="immo-filter-group">
          <button type="button" className={propertyFilter === "" ? "active" : ""} onClick={() => setPropertyFilter("")}>
            {t("Toutes propriétés")}
          </button>
          {properties.map((p) => (
            <button key={p.id} type="button" className={String(propertyFilter) === String(p.id) ? "active" : ""} onClick={() => setPropertyFilter(String(p.id))}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="immo-filter-group">
          <button type="button" className={categoryFilter === "" ? "active" : ""} onClick={() => setCategoryFilter("")}>
            {t("Toutes catégories")}
          </button>
          {EXPENSE_CATEGORIES.map(([key, label]) => (
            <button key={key} type="button" className={categoryFilter === key ? "active" : ""} onClick={() => setCategoryFilter(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {actionError && <div className="api-error" style={{ marginBottom: 12 }}>{actionError}</div>}

      <ExpenseTable
        expenses={filtered}
        busyId={busyId}
        expenseSymbol={expenseSymbol}
        onEdit={(expense) => setExpenseModal(expenseToForm(expense, currency.defaultCurrencyId))}
        onDelete={deleteExpense}
      />

      <div className="card ops-panel maintenance-summary-card">
        <div className="panel-title">{t("Total des dépenses")}</div>
        {totalsByCurrency.length === 0
          ? <div className="ops-score"><span>{t("Total")}</span><b>{money(0, currency.defaultCurrencySymbol)}</b></div>
          : totalsByCurrency.map((c) => (
              <div className="ops-score" key={c.symbol}>
                <span>{tf(t("Total {sym}"), { sym: c.symbol })}</span>
                <b>{money(c.amount, c.symbol)}</b>
              </div>
            ))}
      </div>

      {expenseModal && (
        <ExpenseModal
          value={expenseModal}
          properties={properties}
          units={units}
          currencyOptions={currency.currencyOptions}
          defaultCurrencyId={currency.defaultCurrencyId}
          supplierOptions={supplierOptions}
          busy={busy}
          error={actionError}
          onClose={() => { setExpenseModal(null); setActionError(""); }}
          onSave={saveExpense}
        />
      )}
    </>
  );
}

function ExpenseTable({ expenses, busyId, expenseSymbol, onEdit, onDelete }) {
  if (!expenses.length) return <div className="card maintenance-empty">{t("Aucune dépense à afficher pour ce filtre.")}</div>;
  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <table className="tbl" style={{ width: "100%", minWidth: 860 }}>
        <thead>
          <tr>
            <th>{t("Description")}</th>
            <th>{t("Bien")}</th>
            <th>{t("Catégorie")}</th>
            <th>{t("Date")}</th>
            <th>{t("Statut")}</th>
            <th className="r">{t("Montant")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => {
            const sym = expenseSymbol(expense);
            return (
              <tr key={expense.id}>
                <td style={{ fontWeight: 700 }}>{expense.description}</td>
                <td>{expense.propertyName || "-"}{expense.unitName ? ` - ${expense.unitName}` : ""}</td>
                <td><span className="chip chip-ink">{CATEGORY_LABEL[expense.category] || expense.category}</span></td>
                <td>{compactDate(expense.expenseDate)}</td>
                <td>{PAYMENT_STATUS_OPTIONS.find(([k]) => k === expense.paymentStatus)?.[1] || expense.paymentStatus}</td>
                <td className="r">{money(expense.amount, sym)}</td>
                <td className="r">
                  <button className="immo-link" disabled={busyId === expense.id} onClick={() => onEdit(expense)}>
                    <Pencil size={13} /> {t("Modifier")}
                  </button>
                  <button className="immo-link danger" disabled={busyId === expense.id} onClick={() => onDelete(expense)}>
                    <Trash2 size={13} /> {t("Supprimer")}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function expenseToForm(expense, defaultCurrencyId) {
  return {
    id: expense.id,
    propertyId: expense.propertyId ? String(expense.propertyId) : "",
    unitId: expense.unitId ? String(expense.unitId) : "",
    category: expense.category || "insurance",
    description: expense.description || "",
    amount: expense.amount ?? "",
    currencyId: expense.currencyId || defaultCurrencyId || "",
    expenseDate: expense.expenseDate ? String(expense.expenseDate).slice(0, 10) : "",
    supplierId: expense.supplierId ? String(expense.supplierId) : "",
    vendorName: expense.vendorName || "",
    paymentMethod: expense.paymentMethod || "cash",
    paymentStatus: expense.paymentStatus || "paid",
    receiptUrl: expense.receiptUrl || "",
    receiptFile: null,
    notes: expense.notes || "",
  };
}

function ExpenseModal({ value, properties, units, currencyOptions, defaultCurrencyId, supplierOptions, busy, error, onClose, onSave }) {
  const [form, setForm] = useState({ ...value, currencyId: value.currencyId || defaultCurrencyId || "" });
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const propertyUnits = units.filter((unit) => !form.propertyId || String(unit.propertyId) === String(form.propertyId));
  return (
    <Modal
      title={form.id ? t("Modifier la dépense") : t("Nouvelle dépense")}
      subtitle={t("Dépenses par propriété")}
      icon={<CircleDollarSign size={20} />}
      className="domus-property-modal"
      onClose={onClose}
    >
      <div className="domus-property-form">
        <FormSection icon={<Receipt size={14} />} title={t("Dépense")}>
          <div className="domus-property-form-grid">
            <DomusPropertySelect label={t("Propriété")} value={form.propertyId} required onChange={(propertyId) => set({ propertyId, unitId: "" })} options={properties.map((p) => [String(p.id), p.name])} />
            <DomusPropertySelect label={t("Unité")} value={form.unitId} onChange={(unitId) => set({ unitId })} options={propertyUnits.map((u) => [String(u.id), `${u.name}${u.propertyName ? ` - ${u.propertyName}` : ""}`])} />
            <DomusPropertySelect label={t("Catégorie")} value={form.category} required onChange={(category) => set({ category })} options={EXPENSE_CATEGORIES} />
            <DomusPropertyField label={t("Date")} type="date" value={form.expenseDate} onChange={(expenseDate) => set({ expenseDate })} required />
            <MoneyField label={t("Montant")} value={form.amount} currencyId={form.currencyId} currencyOptions={currencyOptions} onAmountChange={(amount) => set({ amount })} onCurrencyChange={(currencyId) => set({ currencyId })} />
            <DomusPropertySelect label={t("Méthode de paiement")} value={form.paymentMethod} onChange={(paymentMethod) => set({ paymentMethod })} options={PAYMENT_METHOD_OPTIONS} />
            <DomusPropertySelect label={t("Statut de paiement")} value={form.paymentStatus} onChange={(paymentStatus) => set({ paymentStatus })} options={PAYMENT_STATUS_OPTIONS} />
            <DomusPropertySelect label={t("Fournisseur")} value={form.supplierId} onChange={(supplierId) => {
              const opt = supplierOptions.find(([id]) => id === supplierId);
              set({ supplierId, vendorName: opt ? opt[1].replace(" (personne)", "") : form.vendorName });
            }} options={[["", t("— Aucun / saisir ci-dessous —")], ...supplierOptions]} />
            <DomusPropertyField label={t("Fournisseur (texte libre)")} value={form.vendorName} onChange={(vendorName) => set({ vendorName })} />
          </div>
          <DomusPropertyField label={t("Description")} value={form.description} onChange={(description) => set({ description })} required placeholder={t("ex. Assurance annuelle immeuble")} />
          <ReceiptField
            receiptUrl={form.receiptUrl}
            receiptFile={form.receiptFile}
            onPick={(receiptFile) => set({ receiptFile })}
            onClear={() => set({ receiptFile: null })}
          />
          <DomusPropertyField label={t("Notes")} value={form.notes} onChange={(notes) => set({ notes })} textarea />
        </FormSection>
      </div>
      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      <ModalActions busy={busy} disabled={!form.propertyId || !form.description || !form.amount || !form.expenseDate} onClose={onClose} onSave={() => onSave(form)} />
    </Modal>
  );
}

// Justificatif (SCRUM-310) — upload fichier (image/PDF), meme pattern que la
// preuve de paiement de loyer (loyers.jsx) et le recu de cout de maintenance.
function ReceiptField({ receiptUrl, receiptFile, onPick, onClear }) {
  const isImage = receiptUrl && /\.(jpe?g|png|webp)$/i.test(receiptUrl);
  return (
    <label className="domus-property-field">
      <span>{t("Justificatif")}</span>
      <input
        id="expense-receipt-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
      <label htmlFor="expense-receipt-input" className="btn" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <FileDown size={16} />
        {receiptFile ? receiptFile.name : t("Photo, scan ou capture (JPEG, PNG, PDF)")}
      </label>
      {receiptFile && (
        <button type="button" className="btn" style={{ marginTop: 6, fontSize: 12 }} onClick={() => onClear()}>
          <X size={14} /> {t("Retirer le fichier")}
        </button>
      )}
      {!receiptFile && receiptUrl && (
        isImage
          ? <a href={receiptUrl} target="_blank" rel="noreferrer"><img src={receiptUrl} alt={t("Justificatif")} style={{ maxWidth: 160, marginTop: 8, borderRadius: 6 }} /></a>
          : <a href={receiptUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, fontSize: 13 }}>{t("Voir le justificatif")}</a>
      )}
    </label>
  );
}

function MoneyField({ label, value, currencyId, currencyOptions, onAmountChange, onCurrencyChange }) {
  return (
    <label className="domus-property-field">
      <span>{label}</span>
      <div className="domus-money-input">
        <input type="number" value={value ?? ""} onChange={(e) => onAmountChange(e.target.value)} />
        <select value={currencyId ?? ""} onChange={(e) => onCurrencyChange(e.target.value)}>
          {currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.symbol || option.label}</option>)}
        </select>
      </div>
    </label>
  );
}
