// Domus — imputation des paiements sur les echeances (bail allocationLedger).
// AllocationBlock : bloc « Imputation » des formulaires de paiement.
// PaymentAllocations : « Impute sur : ... » + action « Reimputer » (motif obligatoire).
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { getLang, t, tf } from "../i18n.js";
import { moneyExact } from "../data.js";
import { fmtDateLong } from "../rentBookUtils.js";
import { Modal } from "../screens/biens.jsx";
import { activeDues, allocationsOfPayment, dueRemaining, futureBeforeLate } from "../duesUtils.js";

const monthLabel = (iso) => {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ""));
  if (!m) return "";
  return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString(getLang() === "en" ? "en-GB" : "fr-FR", { month: "short", year: "numeric" });
};
// Avertissement d'apercu : code + params structures (localise), repli sur le message brut.
const WARN_KEYS = { OLDER_DUE_UNSETTLED: "L'échéance du {date} n'est pas soldée alors qu'une échéance plus récente est payée." };
export function warningText(w) {
  if (typeof w === "string") return w;
  const key = w?.code && w?.params ? WARN_KEYS[w.code] : null;
  if (!key) return w?.message || "";
  return tf(key, { ...w.params, date: w.params.date ? fmtDateLong(w.params.date) : "" });
}
const num = (v) => Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));

// "juil. 2026 (1 645,16 $), aout 2026 (...)"
export function allocationSummary(allocs, symbol) {
  return allocs.map((a) => `${monthLabel(a.due.periodStart)} (${moneyExact(a.amount, symbol)})`).join(", ");
}

// Corps d'envoi a fusionner dans createPayment (bail flagge uniquement).
export const allocationPayload = (alloc) =>
  alloc?.allocationMode === "manual"
    ? { allocationMode: "manual", allocations: alloc.allocations || [] }
    : { allocationMode: "auto" };

// Champ montant avec la devise visible en suffixe.
function AmountInput({ symbol, ...props }) {
  return (
    <span className="immo-alloc-amount-wrap">
      <input className="immo-input immo-alloc-amount" inputMode="decimal" {...props} />
      {symbol ? <span className="immo-alloc-sym" aria-hidden="true">{symbol}</span> : null}
    </span>
  );
}

export function AllocationBlock({ lease, amount, paymentDate, symbol, onChange }) {
  const [dues, setDues] = useState(() => activeDues(lease));
  const [loadErr, setLoadErr] = useState(null);
  const [mode, setMode] = useState("auto");
  const [picked, setPicked] = useState({}); // dueId -> montant (chaine) en mode manuel
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [retry, setRetry] = useState(0);
  const [err, setErr] = useState(null);
  const seq = useRef(0);

  useEffect(() => {
    let live = true;
    setLoadErr(null);
    api.leaseDues(lease.id)
      .then((r) => { if (live && Array.isArray(r?.dues)) setDues(activeDues({ dues: r.dues })); })
      .catch((e) => { if (live) setLoadErr(e?.message || t("Impossible de charger les données")); });
    return () => { live = false; };
  }, [lease.id, retry]);

  const open = useMemo(() => dues.filter((d) => dueRemaining(d) > 0.005), [dues]);
  const manualAllocs = useMemo(
    () => Object.entries(picked).map(([dueId, a]) => ({ dueId: Number(dueId), amount: num(a) })).filter((x) => x.amount > 0),
    [picked],
  );
  const amountOk = Number.isFinite(amount) && amount > 0;

  // Apercu (aucune ecriture) avec debounce ; vide des que les entrees changent.
  useEffect(() => {
    const my = ++seq.current;
    setPreview(null);
    if (!amountOk) { setErr(null); setPreviewing(false); return undefined; }
    setPreviewing(true);
    const h = setTimeout(async () => {
      try {
        const body = { amount, paymentDate, ...(lease.currencyId ? { currencyId: Number(lease.currencyId) } : {}) };
        if (mode === "manual") body.allocations = manualAllocs;
        const r = await api.allocationPreview(lease.id, body);
        if (my === seq.current) { setPreview(r); setErr(null); setPreviewing(false); }
      } catch (e) {
        if (my === seq.current) { setPreview(null); setErr(e.message || String(e)); setPreviewing(false); }
      }
    }, 400);
    return () => clearTimeout(h);
  }, [lease.id, lease.currencyId, amount, amountOk, paymentDate, mode, manualAllocs, retry]);

  // Remonte le choix au formulaire.
  useEffect(() => {
    onChange?.(mode === "manual" ? { allocationMode: "manual", allocations: manualAllocs } : { allocationMode: "auto" });
  }, [mode, manualAllocs]); // eslint-disable-line react-hooks/exhaustive-deps

  const previewMap = useMemo(() => {
    const m = {};
    (preview?.allocations || []).forEach((a) => { m[a.dueId] = a.amount; });
    return m;
  }, [preview]);

  const toManual = (next) => { setMode("manual"); setPicked(next); };
  const seed = () => Object.fromEntries(Object.entries(previewMap).map(([k, v]) => [k, String(v)]));
  const toggle = (d) => {
    const base = mode === "manual" ? { ...picked } : seed();
    if (base[d.id] != null) delete base[d.id];
    else {
      const left = Math.max(0, amount - Object.values(base).reduce((s, v) => s + num(v), 0));
      base[d.id] = String(left > 0 ? Math.min(dueRemaining(d), left) : 0);
    }
    toManual(base);
  };
  const edit = (d, v) => toManual({ ...(mode === "manual" ? picked : seed()), [d.id]: v });

  const effective = mode === "manual" ? Object.fromEntries(manualAllocs.map((x) => [x.dueId, x.amount])) : previewMap;
  const pickedMap = new Map(Object.entries(effective).map(([k, v]) => [Number(k), v]));
  const warnFuture = futureBeforeLate(dues, pickedMap, lease.graceDays);
  const credit = Number(preview?.credit) || 0;
  const manualSum = manualAllocs.reduce((s, x) => s + x.amount, 0);
  const target = mode === "auto"
    ? (preview?.allocations || []).map((a) => ({ due: dues.find((d) => d.id === a.dueId), amount: a.amount })).filter((x) => x.due)
    : [];

  return (
    <fieldset className="immo-alloc" aria-busy={previewing}>
      <legend className="immo-alloc-legend">{t("Imputation")}</legend>
      <div className="immo-alloc-head">
        <span className="muted">{mode === "auto" ? t("Automatique : mois le plus ancien non soldé") : t("Manuelle")}</span>
        {mode === "manual" && <button type="button" className="immo-btn" onClick={() => { setMode("auto"); setPicked({}); }}>{t("Revenir à l'automatique")}</button>}
      </div>
      {loadErr && (
        <div className="api-error" role="alert">
          {loadErr}{" "}
          <button type="button" className="immo-btn" onClick={() => setRetry((n) => n + 1)}>{t("Réessayer")}</button>
        </div>
      )}
      {!loadErr && open.length === 0 && <p className="muted">{t("Aucune échéance impayée.")}</p>}
      <ul className="immo-alloc-list">
        {open.map((d) => {
          const on = mode === "manual" ? picked[d.id] != null : effective[d.id] != null;
          return (
            <li key={d.id} className={on ? "on" : ""}>
              <label className="immo-alloc-check">
                <input type="checkbox" checked={on} onChange={() => toggle(d)} />
                <span>
                  <b>{monthLabel(d.periodStart)}</b>
                  <small>{tf("reste {m}", { m: moneyExact(dueRemaining(d), symbol) })}</small>
                </span>
              </label>
              {on && (
                <AmountInput symbol={symbol} aria-label={tf("Montant imputé sur {m}", { m: monthLabel(d.periodStart) })}
                  value={mode === "manual" ? (picked[d.id] ?? "") : String(effective[d.id])}
                  onChange={(e) => edit(d, e.target.value)} />
              )}
            </li>
          );
        })}
      </ul>
      <div className="immo-alloc-status" aria-live="polite">
        {previewing && <p className="muted">{t("Calcul…")}</p>}
        {!previewing && target.length > 0 && <p className="muted">{tf("Ira sur : {s}", { s: allocationSummary(target, symbol) })}</p>}
        {mode === "manual" && amountOk && manualSum < amount - 0.005 && (
          <p className="immo-alloc-credit">{tf("{m} non imputé : il deviendra une avance.", { m: moneyExact(amount - manualSum, symbol) })}</p>
        )}
        {credit > 0.005 && <p className="immo-alloc-credit">{tf("Avance : {m}", { m: moneyExact(credit, symbol) })}</p>}
        {warnFuture && <p className="immo-alloc-warn">{t("Un mois à venir est payé alors qu'un mois plus ancien est en retard.")}</p>}
        {(preview?.warnings || []).map((w, i) => <p key={i} className="immo-alloc-warn">{warningText(w)}</p>)}
      </div>
      {err && (
        <div className="api-error" role="alert">
          {err}{" "}
          <button type="button" className="immo-btn" onClick={() => setRetry((n) => n + 1)}>{t("Réessayer")}</button>
        </div>
      )}
    </fieldset>
  );
}

export function ReallocateModal({ payment, dues, symbol, onClose, onDone }) {
  const current = allocationsOfPayment(dues, payment.id);
  const open = dues.filter((d) => dueRemaining(d) > 0.005 || current.some((c) => c.due.id === d.id));
  const [vals, setVals] = useState(() => Object.fromEntries(current.map((c) => [c.due.id, String(c.amount)])));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const reasonRef = useRef(null);
  const sum = Object.values(vals).reduce((s, v) => s + (num(v) || 0), 0);
  const over = sum > Number(payment.amount) + 0.005;

  const close = () => { if (!busy) onClose(); };
  const closeRef = useRef(close);
  closeRef.current = close;

  // Focus a l'ouverture, retour du focus a la fermeture, Echap.
  useEffect(() => {
    const opener = document.activeElement;
    reasonRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
    };
  }, []);

  const submit = async () => {
    if (!reason.trim()) { setErr(t("Le motif est obligatoire.")); return; }
    if (over) return;
    setBusy(true); setErr(null);
    try {
      const allocations = Object.entries(vals).map(([dueId, a]) => ({ dueId: Number(dueId), amount: num(a) })).filter((x) => x.amount > 0);
      await api.setPaymentAllocations(payment.id, { allocations, reason: reason.trim() });
      onDone?.();
      onClose();
    } catch (e) {
      setErr(e.message || String(e));
    } finally { setBusy(false); }
  };
  return (
    <Modal title={t("Réimputer le paiement")} subtitle={moneyExact(payment.amount, payment.currencySymbol || symbol)} className="immo-realloc-modal" onClose={close}>
      <div className="modal-body">
        <ul className="immo-alloc-list">
          {open.map((d) => (
            <li key={d.id} className={vals[d.id] != null ? "on" : ""}>
              <label className="immo-alloc-check">
                <input type="checkbox" checked={vals[d.id] != null}
                  onChange={() => setVals((v) => { const n = { ...v }; if (n[d.id] != null) delete n[d.id]; else n[d.id] = String(dueRemaining(d) || d.amount); return n; })} />
                <span><b>{monthLabel(d.periodStart)}</b><small>{tf("reste {m}", { m: moneyExact(dueRemaining(d), symbol) })}</small></span>
              </label>
              {vals[d.id] != null && (
                <AmountInput symbol={symbol} aria-label={tf("Montant imputé sur {m}", { m: monthLabel(d.periodStart) })}
                  value={vals[d.id]} onChange={(e) => setVals((v) => ({ ...v, [d.id]: e.target.value }))} />
              )}
            </li>
          ))}
        </ul>
        <p className={over ? "api-error" : "muted"} role={over ? "alert" : undefined}>
          {tf("Imputé : {a} sur {b}", { a: moneyExact(sum, symbol), b: moneyExact(payment.amount, symbol) })}
          {over ? ` — ${t("Le total imputé dépasse le montant du paiement.")}` : ""}
        </p>
        <div>
          <label className="immo-field-label" htmlFor="realloc-reason">{t("Motif (obligatoire)")}</label>
          <input id="realloc-reason" ref={reasonRef} className="immo-input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} />
        </div>
        {err && <div className="api-error" role="alert">{err}</div>}
      </div>
      <div className="modal-actions">
        <button type="button" className="immo-btn" onClick={close} disabled={busy}>{t("Annuler")}</button>
        <button type="button" className="immo-btn primary" onClick={submit} disabled={busy || over || !reason.trim()}>{busy ? t("Enregistrement…") : t("Réimputer")}</button>
      </div>
    </Modal>
  );
}

// « Impute sur : juil. 2026 (1 645,16 $), ... » + « Reimputer ».
export function PaymentAllocations({ payment, dues, symbol, onChanged }) {
  const [open, setOpen] = useState(false);
  const allocs = allocationsOfPayment(dues, payment.id);
  return (
    <div className="immo-pay-row immo-alloc-line">
      <span>{t("Imputé sur")}</span>
      <strong>{allocs.length ? allocationSummary(allocs, symbol) : "—"}</strong>
      <button type="button" className="immo-btn" onClick={() => setOpen(true)}>{t("Réimputer")}</button>
      {open && <ReallocateModal payment={payment} dues={dues} symbol={symbol} onClose={() => setOpen(false)} onDone={onChanged} />}
    </div>
  );
}
