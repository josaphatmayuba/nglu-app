import React from "react";
import { api } from "../api.js";
import CurrencyPicker from "../CurrencyPicker.jsx";
import { BatiproPhoneField } from "./PhoneField.jsx";

const KIND = { owner: "Propriétaire", partner: "Associé / partenaire", other: "Autre" };
const NATURE = { client_advance: "Avance client", partner_account: "Compte courant associé", equity: "Capital" };
const METHOD = { cash: "Cash", bank: "Banque", mobile_money: "Mobile money" };
const num = (v) => Number(v || 0);
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => { if (!d) return "—"; const s = String(d).slice(0, 10); const [y, m, j] = s.split("-"); return y && m && j ? `${j}/${m}/${y}` : s; };

/* Fonds du chantier : versements reçus (avance client, compte courant, capital)
   et synthèse par devise. Aucun arrondi : money() affiche 2 décimales exactes. */
export default function ProjectFunds({ project, canMutate, money, Icon, useCurrencies }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [cancelFund, setCancelFund] = React.useState(null);
  const [receipt, setReceipt] = React.useState(null); // { url, type }
  const [receiptError, setReceiptError] = React.useState("");

  const load = React.useCallback(() => {
    setLoading(true); setError("");
    api.projectFunds(project.id)
      .then((r) => setData(r || { funds: [], summary_by_currency: [] }))
      .catch((e) => setError(e.message || String(e)))
      .finally(() => setLoading(false));
  }, [project.id]);
  React.useEffect(() => { load(); }, [load]);

  const funds = data?.funds || [];
  const summary = data?.summary_by_currency || [];

  const viewReceipt = async (f) => {
    setReceiptError("");
    try { const r = await api.fundAttachmentUrl(f.id); setReceipt({ url: r.url, type: r.type || "" }); }
    catch (e) { setReceiptError(e.message || String(e)); }
  };
  const closeReceipt = () => { if (receipt?.url) URL.revokeObjectURL(receipt.url); setReceipt(null); };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h3 className="font-display" style={{ margin: 0 }}>Fonds du chantier</h3>
        {canMutate && <button type="button" className="btn btn-amber grad-amber btn-touch" onClick={() => setAddOpen(true)}><Icon name="plus" /> Ajouter un versement</button>}
      </div>

      {loading && <div className="card pad muted">Chargement…</div>}
      {!loading && error && (
        <div className="card pad"><div className="login-error">{error}</div><button type="button" className="btn btn-ghost" onClick={load}>Réessayer</button></div>
      )}
      {receiptError && <div className="login-error">{receiptError}</div>}

      {!loading && !error && (
        <>
          {summary.map((s) => {
            const avail = num(s.available);
            const cards = [
              ["Reçu", money(s.received, s.currency_code)],
              ["Décaissé", money(s.disbursed, s.currency_code)],
              ["Disponible", money(s.available, s.currency_code), avail < 0 ? "préfinancé" : null],
              ["Engagé non payé", money(s.committed_unpaid, s.currency_code)],
            ];
            return (
              <div key={s.currency_id ?? s.currency_code} className="card pad">
                <p className="kv-title"><Icon name="wallet" /> Synthèse en {s.currency_code || "devise non renseignée"}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                  {cards.map(([label, value, note]) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: "var(--ink-500)" }}>{label}</div>
                      <div className="font-display" style={{ fontSize: 17, fontWeight: 700, wordBreak: "break-word" }}>{value}</div>
                      {note && <span className="chip amber" style={{ fontSize: 11 }}>{note}</span>}
                    </div>
                  ))}
                  {num(s.shortfall) > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: "var(--ink-500)" }}>Manque</div>
                      <div className="font-display" style={{ fontSize: 17, fontWeight: 700, color: "#b91c1c", wordBreak: "break-word" }}>{money(s.shortfall, s.currency_code)}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {!funds.length ? (
            <div className="card pad muted">Aucun versement enregistré pour ce chantier.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {funds.map((f) => {
                const cancelled = f.is_active === false || f.is_active === 0 || !!f.cancelled_at;
                return (
                  <div key={f.id} className="card pad" style={{ opacity: cancelled ? 0.65 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="font-display" style={{ fontSize: 18, fontWeight: 700, textDecoration: cancelled ? "line-through" : "none", wordBreak: "break-word" }}>{money(f.amount, f.currency_code)}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-500)" }}>{fmtDate(f.received_at)} · {METHOD[f.payment_method] || f.payment_method}{f.reference ? ` · Réf. ${f.reference}` : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span className="chip ink">{NATURE[f.funding_nature] || f.funding_nature}</span>
                        {cancelled && <span className="chip amber">Annulé</span>}
                        {!cancelled && f.ledger_status === "pending" && <span className="chip amber" title="L'écriture comptable n'est pas encore passée">En attente compta</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, marginTop: 6 }}>
                      {KIND[f.contributor_kind] || f.contributor_kind}{f.contributor_name ? ` : ${f.contributor_name}` : ""}{f.contributor_phone ? ` · ${f.contributor_phone}` : ""}
                    </div>
                    {f.notes && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{f.notes}</div>}
                    {cancelled && f.cancel_reason && <div style={{ fontSize: 12, marginTop: 4, color: "#b91c1c" }}>Motif d'annulation : {f.cancel_reason}</div>}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      {f.has_attachment && <button type="button" className="btn btn-ghost btn-touch" onClick={() => viewReceipt(f)}><Icon name="receipt" /> Voir le reçu</button>}
                      {canMutate && !cancelled && <button type="button" className="btn btn-ghost btn-touch" onClick={() => setCancelFund(f)}>Annuler le versement</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {addOpen && <AddFundModal project={project} Icon={Icon} useCurrencies={useCurrencies} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); load(); }} />}
      {cancelFund && <CancelFundModal fund={cancelFund} money={money} onClose={() => setCancelFund(null)} onDone={() => { setCancelFund(null); load(); }} />}
      {receipt && (
        <div className="modal-scrim" role="dialog" aria-modal="true" onClick={closeReceipt}>
          <div className="modal-card" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="font-display">Reçu du versement</h2>
              <button type="button" className="icon-btn" onClick={closeReceipt} aria-label="Fermer"><Icon name="x" /></button>
            </div>
            {String(receipt.type).includes("pdf")
              ? <iframe title="Reçu" src={receipt.url} style={{ width: "100%", height: "70vh", border: 0 }} />
              : <img src={receipt.url} alt="Reçu" style={{ maxWidth: "100%", maxHeight: "70vh", display: "block", margin: "0 auto" }} />}
          </div>
        </div>
      )}
    </div>
  );
}

function AddFundModal({ project, Icon, useCurrencies, onClose, onSaved }) {
  const currencies = useCurrencies();
  const fileRef = React.useRef(null);
  const [form, setForm] = React.useState({
    received_at: today(),
    amount: "",
    currency_id: project.currencyId ? String(project.currencyId) : "",
    contributor_kind: "owner",
    contributor_name: project.ownerName || "",
    contributor_phone: "",
    funding_nature: "client_advance",
    payment_method: "cash",
    reference: "",
    notes: "",
  });
  const [file, setFile] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!(Number(form.amount) > 0)) { setError("Le montant doit être supérieur à 0."); return; }
    if (!form.currency_id) { setError("Choisissez la devise."); return; }
    setBusy(true); setError("");
    const body = {
      received_at: form.received_at,
      amount: Number(form.amount),
      currency_id: Number(form.currency_id),
      contributor_kind: form.contributor_kind,
      funding_nature: form.funding_nature,
      payment_method: form.payment_method,
    };
    if (form.contributor_name.trim()) body.contributor_name = form.contributor_name.trim();
    if (form.contributor_phone) body.contributor_phone = form.contributor_phone;
    if (form.reference.trim()) body.reference = form.reference.trim();
    if (form.notes.trim()) body.notes = form.notes.trim();
    let created;
    try { created = await api.createProjectFund(project.id, body); }
    catch (err) { setError(err.message || String(err)); setBusy(false); return; }
    if (file && created?.id) {
      try { await api.uploadFundAttachment(created.id, file); }
      catch (err) {
        // Le versement existe déjà : on ne le recrée pas, on prévient.
        // busy reste à true : « Enregistrer » ne doit pas recréer le versement.
        setError(`Versement enregistré, mais l'envoi du reçu a échoué : ${err.message || err}. Ajoutez-le plus tard.`);
        setTimeout(onSaved, 2500);
        return;
      }
    }
    onSaved();
  };

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={save} style={{ maxHeight: "92vh", overflowY: "auto" }}>
        <div className="modal-head">
          <h2 className="font-display">Ajouter un versement</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer"><Icon name="x" /></button>
        </div>
        <div className="form-grid">
          <label className="field"><span>Date de réception</span>
            <input type="date" value={form.received_at} max={today()} onChange={(e) => set("received_at", e.target.value)} required />
          </label>
          <label className="field"><span>Montant</span>
            <input type="number" inputMode="decimal" step="0.01" min="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} autoFocus required />
          </label>
          <div className="field"><span>Devise</span>
            <CurrencyPicker value={form.currency_id} onChange={(id) => set("currency_id", id)} currencies={currencies} required />
          </div>
          <label className="field"><span>Apporteur</span>
            <select value={form.contributor_kind} onChange={(e) => set("contributor_kind", e.target.value)}>
              {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="field"><span>Nom de l'apporteur</span>
            <input type="text" value={form.contributor_name} onChange={(e) => set("contributor_name", e.target.value)} maxLength={255} />
          </label>
          <BatiproPhoneField label="Téléphone" value={form.contributor_phone} onChange={(v) => set("contributor_phone", v)} />
          <label className="field"><span>Nature</span>
            <select value={form.funding_nature} onChange={(e) => set("funding_nature", e.target.value)}>
              {Object.entries(NATURE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="field"><span>Mode de paiement</span>
            <select value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}>
              {Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="field"><span>Référence</span>
            <input type="text" value={form.reference} onChange={(e) => set("reference", e.target.value)} maxLength={120} />
          </label>
        </div>
        <label className="field"><span>Notes</span>
          <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </label>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setFile(f); }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "8px 0" }}>
          <button type="button" className="btn btn-ghost btn-touch" onClick={() => fileRef.current?.click()}>
            <Icon name="camera" /> {file ? "Changer le reçu" : "Joindre un reçu"}
          </button>
          {file && <span className="chip amber" style={{ fontSize: 12 }}>{file.name}</span>}
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Fermer</button>
          <button className="btn btn-amber grad-amber" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </div>
  );
}

function CancelFundModal({ fund, money, onClose, onDone }) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const trimmed = reason.trim();
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (trimmed.length < 3 || trimmed.length > 255) { setError("Le motif doit contenir entre 3 et 255 caractères."); return; }
    if (!window.confirm(`Annuler le versement de ${money(fund.amount, fund.currency_code)} ? Cette action est conservée dans l'historique.`)) return;
    setBusy(true); setError("");
    try { await api.cancelProjectFund(fund.id, trimmed); onDone(); }
    catch (err) { setError(err.message || String(err)); setBusy(false); }
  };
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={submit}>
        <div className="modal-head"><h2 className="font-display">Annuler le versement</h2></div>
        <p style={{ fontSize: 13 }}>{money(fund.amount, fund.currency_code)} · {fmtDate(fund.received_at)}</p>
        <label className="field"><span>Motif (obligatoire)</span>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} autoFocus required />
        </label>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Retour</button>
          <button className="btn btn-amber grad-amber" disabled={busy}>{busy ? "Annulation…" : "Annuler le versement"}</button>
        </div>
      </form>
    </div>
  );
}
