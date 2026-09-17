// Domus — Prêts hypothécaires (SCRUM-311 phase 2).
// Liste + modale de création/édition, calquées sur hypotheque.jsx.
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, HandCoins, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { money, normalizeCurrencyModule, cleanCurrencySymbol, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { api } from "../api.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { DomusPropertyField, DomusPropertySelect, FormSection, Modal, ModalActions } from "./biens.jsx";
import { Autocomplete } from "../components/Autocomplete.jsx";
import { useConfirm } from "../components/Dialog.jsx";
import { takePretsPrefill } from "./reservationPrefill.js";
import { t, tf } from "../i18n.js";

const STATUS_OPTIONS = [
  ["active", t("Actif")],
  ["paid_off", t("Soldé")],
  ["refinanced", t("Refinancé")],
];

const emptyLoan = {
  propertyId: "",
  unitId: "",
  lenderName: "",
  reference: "",
  principalAmount: "",
  currencyId: "",
  startDate: "",
  endDate: "",
  interestRate: "",
  termMonths: "",
  status: "active",
  notes: "",
  attachExistingPayments: false,
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

function statusLabel(status) {
  return STATUS_OPTIONS.find(([k]) => k === status)?.[1] || status;
}

// Totaux (emprunté / solde restant) groupés strictement PAR DEVISE — jamais
// de somme inter-devises (règle projet, cf. incident « USD fantôme »).
function loanTotalsByCurrency(loans, resolveSymbol) {
  const map = new Map();
  loans.forEach((loan) => {
    const sym = resolveSymbol(loan);
    const entry = map.get(sym) || { principal: 0, remaining: 0 };
    entry.principal += Number(loan.principalAmount || 0);
    entry.remaining += Number(loan.remainingBalance ?? loan.principalAmount ?? 0);
    map.set(sym, entry);
  });
  return [...map.entries()].map(([symbol, entry]) => ({ symbol, ...entry }));
}

export function Prets() {
  const [query, setQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [loanModal, setLoanModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const confirm = useConfirm();
  const loansApi = useApi(() => api.mortgageLoans(), []);
  const propertiesApi = useApi(() => api.properties(), []);
  const unitsApi = useApi(() => api.units(), []);
  const currenciesApi = useApi(() => api.currencies(), []);
  const settingApi = useApi(() => api.setting(), []);
  useRealtimeReload(loansApi.reload, ["mortgage-payments", "mortgage-loans"]);

  useEffect(() => {
    const prefillId = takePretsPrefill();
    if (prefillId) setPropertyFilter(prefillId);
  }, []);

  const loading = loansApi.loading || propertiesApi.loading || unitsApi.loading;
  const error = loansApi.error || propertiesApi.error || unitsApi.error;
  const loans = useMemo(() => {
    const raw = loansApi.data;
    return Array.isArray(raw) ? raw : raw?.data || [];
  }, [loansApi.data]);
  const properties = useMemo(() => (Array.isArray(propertiesApi.data) ? propertiesApi.data : propertiesApi.data?.data || []), [propertiesApi.data]);
  const units = useMemo(() => (Array.isArray(unitsApi.data) ? unitsApi.data : unitsApi.data?.data || []), [unitsApi.data]);
  const currency = useMemo(
    () => normalizeCurrencyModule(currenciesApi.data, settingApi.data),
    [currenciesApi.data, settingApi.data],
  );

  // Symbole de la devise PROPRE au prêt (jamais le défaut global).
  const loanSymbol = (loan) => {
    const byId = loan?.currencyId != null ? currency.currencyById?.get(Number(loan.currencyId)) : null;
    const fromId = byId ? cleanCurrencySymbol(byId) : "";
    return fromId || cleanCurrencySymbol(loan) || currency.defaultCurrencySymbol;
  };

  const otherCurrencySymbol = (currencyId) => {
    const byId = currencyId != null ? currency.currencyById?.get(Number(currencyId)) : null;
    return byId ? cleanCurrencySymbol(byId) : "";
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return loans.filter((loan) => {
      if (propertyFilter && String(loan.propertyId) !== String(propertyFilter)) return false;
      if (!q) return true;
      return [loan.lenderName, loan.propertyName, loan.unitName, loan.reference]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [loans, query, propertyFilter]);

  const totalsByCurrency = useMemo(() => loanTotalsByCurrency(filtered, loanSymbol), [filtered, currency]);

  const reloadAll = async () => {
    await Promise.all([loansApi.reload(), propertiesApi.reload(), unitsApi.reload()]);
  };

  const saveLoan = async (form) => {
    setBusy(true);
    setActionError("");
    try {
      const payload = {
        propertyId: toId(form.propertyId),
        unitId: toId(form.unitId) ?? null,
        lenderName: form.lenderName?.trim() || undefined,
        reference: form.reference?.trim() || undefined,
        principalAmount: toMoney(form.principalAmount),
        currencyId: toId(form.currencyId) ?? null,
        startDate: form.startDate || null,
        endDate: form.endDate || undefined,
        interestRate: form.interestRate !== "" ? Number(form.interestRate) : undefined,
        termMonths: form.termMonths !== "" ? Number(form.termMonths) : undefined,
        status: form.status || "active",
        notes: form.notes?.trim() || undefined,
      };
      if (!payload.propertyId || !payload.startDate || !payload.principalAmount) {
        throw new Error(t("Bien, date de début et montant emprunté obligatoires."));
      }
      if (!form.id) {
        // Rattachement des paiements orphelins — création uniquement.
        payload.attachExistingPayments = Boolean(form.attachExistingPayments);
      }
      if (form.id) await api.updateMortgageLoan(form.id, payload);
      else await api.createMortgageLoan(payload);
      setLoanModal(null);
      await reloadAll();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteLoan = async (loan) => {
    if (!(await confirm({
      title: t("Supprimer le prêt"),
      message: tf(t("Supprimer le prêt {lender} ?"), { lender: loan.lenderName || loan.reference || `#${loan.id}` }),
      confirmLabel: t("Supprimer"),
      danger: true,
    }))) return;
    setBusyId(loan.id);
    setActionError("");
    try {
      await api.deleteMortgageLoan(loan.id);
      await loansApi.reload();
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
          <h1>{t("Prêts")}</h1>
          <p>{t("Prêts hypothécaires par propriété : montant emprunté, capital remboursé, solde restant dû.")}</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Prêteur, bien, référence...")} />
          </label>
          <button className="immo-btn primary" onClick={() => setLoanModal({ ...emptyLoan, propertyId: propertyFilter || "", currencyId: currency.defaultCurrencyId || "" })}>
            <Plus size={16} /> {t("Nouveau prêt")}
          </button>
        </div>
      </div>

      <div className="maintenance-toolbar">
        <div className="immo-filter-autocomplete">
          <Autocomplete value={propertyFilter} onChange={setPropertyFilter} placeholder={t("Toutes propriétés")}
            options={properties.map((p) => [String(p.id), p.name])} />
        </div>
      </div>

      {actionError && <div className="api-error" style={{ marginBottom: 12 }}>{actionError}</div>}

      <LoansTable
        loans={filtered}
        busyId={busyId}
        loanSymbol={loanSymbol}
        otherCurrencySymbol={otherCurrencySymbol}
        onEdit={(loan) => setLoanModal(loanToForm(loan, currency.defaultCurrencyId))}
        onDelete={deleteLoan}
      />

      <div className="card ops-panel maintenance-summary-card">
        <div className="panel-title">{t("Montant emprunté / Solde restant dû (filtre courant)")}</div>
        {totalsByCurrency.length === 0
          ? (
            <>
              <div className="ops-score"><span>{t("Emprunté")}</span><b>{money(0, currency.defaultCurrencySymbol)}</b></div>
              <div className="ops-score"><span>{t("Solde restant dû")}</span><b>{money(0, currency.defaultCurrencySymbol)}</b></div>
            </>
          )
          : totalsByCurrency.map((c) => (
              <div key={c.symbol}>
                <div className="ops-score">
                  <span>{tf(t("Emprunté {sym}"), { sym: c.symbol })}</span>
                  <b>{money(c.principal, c.symbol)}</b>
                </div>
                <div className="ops-score">
                  <span>{tf(t("Solde restant dû {sym}"), { sym: c.symbol })}</span>
                  <b>{money(c.remaining, c.symbol)}</b>
                </div>
              </div>
            ))}
      </div>

      {loanModal && (
        <MortgageLoanModal
          value={loanModal}
          properties={properties}
          units={units}
          currencyOptions={currency.currencyOptions}
          defaultCurrencyId={currency.defaultCurrencyId}
          busy={busy}
          error={actionError}
          onClose={() => { setLoanModal(null); setActionError(""); }}
          onSave={saveLoan}
        />
      )}
    </>
  );
}

function LoansTable({ loans, busyId, loanSymbol, otherCurrencySymbol, onEdit, onDelete }) {
  if (!loans.length) return <div className="card maintenance-empty">{t("Aucun prêt hypothécaire à afficher pour ce filtre.")}</div>;
  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <table className="tbl" style={{ width: "100%", minWidth: 1080 }}>
        <thead>
          <tr>
            <th>{t("Bien")}</th>
            <th>{t("Prêteur")}</th>
            <th>{t("Date de début")}</th>
            <th className="r">{t("Montant emprunté")}</th>
            <th className="r">{t("Capital remboursé")}</th>
            <th className="r">{t("Solde restant dû")}</th>
            <th>{t("Taux")}</th>
            <th>{t("Statut")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => {
            const sym = loanSymbol(loan);
            const principal = Number(loan.principalAmount || 0);
            const repaid = Number(loan.principalRepaid || 0);
            const remaining = Number(loan.remainingBalance ?? principal);
            const progress = principal > 0 ? Math.min(100, Math.round((repaid / principal) * 100)) : 0;
            const hasOtherCurrency = Array.isArray(loan.otherCurrencyPayments) && loan.otherCurrencyPayments.length > 0;
            return (
              <tr key={loan.id}>
                <td>{loan.propertyName || "-"}{loan.unitName ? ` - ${loan.unitName}` : ""}</td>
                <td style={{ fontWeight: 700 }}>{loan.lenderName || "-"}{loan.reference ? ` (${loan.reference})` : ""}</td>
                <td>{compactDate(loan.startDate)}</td>
                <td className="r">{money(principal, sym)}</td>
                <td className="r">{money(repaid, sym)}</td>
                <td className="r">
                  <div style={{ fontWeight: 700 }}>{money(remaining, sym)}</div>
                  <div style={{ height: 5, borderRadius: 3, background: "#eee", marginTop: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: remaining <= 0 ? "#2e7d32" : "#c9a24b", borderRadius: 3 }} />
                  </div>
                  {hasOtherCurrency && (
                    <div title={t("Paiements dans une autre devise non inclus dans le solde")}
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#b45309", marginTop: 4 }}>
                      <AlertTriangle size={12} />
                      {t("Autre devise non incluse")} : {loan.otherCurrencyPayments.map((p) => money(p.total, otherCurrencySymbol(p.currencyId) || p.currencyCode || "")).join(", ")}
                    </div>
                  )}
                </td>
                <td>{loan.interestRate != null && loan.interestRate !== "" ? `${loan.interestRate}%` : "-"}</td>
                <td><span className={`badge ${loan.status === "active" ? "badge-success" : "badge-muted"}`}>{statusLabel(loan.status)}</span></td>
                <td className="r">
                  <button className="immo-link" disabled={busyId === loan.id} onClick={() => onEdit(loan)}>
                    <Pencil size={13} /> {t("Modifier")}
                  </button>
                  <button className="immo-link danger" disabled={busyId === loan.id} onClick={() => onDelete(loan)}>
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

function loanToForm(loan, defaultCurrencyId) {
  return {
    id: loan.id,
    propertyId: loan.propertyId ? String(loan.propertyId) : "",
    unitId: loan.unitId ? String(loan.unitId) : "",
    lenderName: loan.lenderName || "",
    reference: loan.reference || "",
    principalAmount: loan.principalAmount ?? "",
    currencyId: loan.currencyId || defaultCurrencyId || "",
    startDate: loan.startDate ? String(loan.startDate).slice(0, 10) : "",
    endDate: loan.endDate ? String(loan.endDate).slice(0, 10) : "",
    interestRate: loan.interestRate ?? "",
    termMonths: loan.termMonths ?? "",
    status: loan.status || "active",
    notes: loan.notes || "",
    attachExistingPayments: false,
  };
}

function MortgageLoanModal({ value, properties, units, currencyOptions, defaultCurrencyId, busy, error, onClose, onSave }) {
  const [form, setForm] = useState({ ...value, currencyId: value.currencyId || defaultCurrencyId || "" });
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const propertyUnits = units.filter((unit) => !form.propertyId || String(unit.propertyId) === String(form.propertyId));
  const isCreate = !form.id;

  return (
    <Modal
      title={form.id ? t("Modifier le prêt") : t("Nouveau prêt")}
      subtitle={t("Prêt hypothécaire")}
      icon={<HandCoins size={20} />}
      className="domus-property-modal"
      onClose={onClose}
    >
      <div className="domus-property-form">
        <FormSection icon={<HandCoins size={14} />} title={t("Prêt")}>
          <div className="domus-property-form-grid">
            <DomusPropertySelect label={t("Propriété")} value={form.propertyId} required onChange={(propertyId) => set({ propertyId, unitId: "" })} options={properties.map((p) => [String(p.id), p.name])} />
            <DomusPropertySelect label={t("Unité")} value={form.unitId} onChange={(unitId) => set({ unitId })} options={propertyUnits.map((u) => [String(u.id), `${u.name}${u.propertyName ? ` - ${u.propertyName}` : ""}`])} />
            <DomusPropertyField label={t("Prêteur / Banque")} value={form.lenderName} onChange={(lenderName) => set({ lenderName })} placeholder={t("ex. Rawbank")} />
            <DomusPropertyField label={t("Référence")} value={form.reference} onChange={(reference) => set({ reference })} placeholder={t("ex. PRET-2026-001")} />
            <MoneyField label={t("Montant emprunté")} value={form.principalAmount} currencyId={form.currencyId} currencyOptions={currencyOptions} onAmountChange={(principalAmount) => set({ principalAmount })} onCurrencyChange={(currencyId) => set({ currencyId })} />
            <DomusPropertyField label={t("Date de début")} type="date" value={form.startDate} onChange={(startDate) => set({ startDate })} required />
            <DomusPropertyField label={t("Date de fin")} type="date" value={form.endDate} onChange={(endDate) => set({ endDate })} />
            <DomusPropertyField label={t("Taux d'intérêt annuel (%)")} type="number" value={form.interestRate} onChange={(interestRate) => set({ interestRate })} placeholder={t("ex. 5.25")} />
            <DomusPropertyField label={t("Durée (mois)")} type="number" value={form.termMonths} onChange={(termMonths) => set({ termMonths })} placeholder={t("ex. 120")} />
            <DomusPropertySelect label={t("Statut")} value={form.status} onChange={(status) => set({ status })} options={STATUS_OPTIONS} />
          </div>
          {isCreate && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13 }}>
              <input type="checkbox" checked={form.attachExistingPayments} onChange={(e) => set({ attachExistingPayments: e.target.checked })} />
              {t("Rattacher les paiements déjà enregistrés pour ce bien dans cette devise")}
            </label>
          )}
          <DomusPropertyField label={t("Notes")} value={form.notes} onChange={(notes) => set({ notes })} textarea />
        </FormSection>
      </div>
      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      <ModalActions busy={busy} disabled={!form.propertyId || !form.startDate || !form.principalAmount} onClose={onClose} onSave={() => onSave(form)} />
    </Modal>
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
