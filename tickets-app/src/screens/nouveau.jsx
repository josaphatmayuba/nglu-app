import { useState } from "react";
import { Send, CreditCard, ShoppingBag, CalendarDays, MoreHorizontal } from "lucide-react";
import { useApi, CATEGORIES, useCurrency } from "../data.js";
import { api } from "../api.js";

const CAT_ICONS = { payment: CreditCard, purchase: ShoppingBag, leave: CalendarDays, other: MoreHorizontal };

export function Nouveau({ go, onToast }) {
  const [category, setCategory] = useState("payment");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [currencyCode, setCurrencyCode] = useState("CDF");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: workflows } = useApi(() => api.listWorkflows(), []);
  const { data: currencies } = useApi(() => api.currencies(), []);

  const currencyList = Array.isArray(currencies) ? currencies : [];

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!label.trim()) { onToast("L'objet est obligatoire."); return; }
    setSubmitting(true);
    try {
      // Trouver le workflow correspondant à la catégorie (workflowKey = catégorie)
      const wfList = Array.isArray(workflows) ? workflows : [];
      const wf = wfList.find((w) => w.key === category);

      await api.submit({
        workflowKey: wf?.key || category,
        entityType: category,
        entityId: 0, // tickets sans entité liée = 0 (le backend l'accepte)
        label: label.trim(),
        amount: amount ? Number(amount) : undefined,
        currencyCode,
        description: description.trim() || undefined,
      });

      onToast("Ticket soumis — en attente d'approbation");
      go("liste");
    } catch (err) {
      onToast(`Erreur : ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-500)", marginBottom: 14, cursor: "pointer" }}
        onClick={() => go("liste")}>
        ← Mes tickets / <span style={{ color: "var(--ink-900)", fontWeight: 600 }}>Nouveau ticket</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Nouveau ticket</h1>
        <button className="btn btn-primary" disabled={submitting} onClick={submit}>
          <Send size={15} /> {submitting ? "Envoi…" : "Soumettre"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14, alignItems: "start" }}>
        <form className="card" style={{ padding: 20 }} onSubmit={submit}>
          {/* Catégorie */}
          <div style={{ marginBottom: 18 }}>
            <div className="form-field" style={{ marginBottom: 8 }}>
              <label>Catégorie *</label>
            </div>
            <div className="cat-grid">
              {CATEGORIES.map((cat) => {
                const Icon = CAT_ICONS[cat.key];
                return (
                  <button key={cat.key} type="button"
                    className={`cat-btn${category === cat.key ? " active" : ""}`}
                    onClick={() => setCategory(cat.key)}>
                    <Icon size={18} /> {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Objet */}
          <div className="form-field" style={{ marginBottom: 14 }}>
            <label>Objet *</label>
            <input className="input" placeholder="Ex: Paiement fournisseur — ciment Matete"
              value={label} onChange={(e) => setLabel(e.target.value)} required />
          </div>

          {/* Montant / Devise */}
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <div className="form-field">
              <label>Montant (optionnel)</label>
              <input className="input" type="number" min="0" step="any" placeholder="0"
                value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Devise</label>
              <select className="input" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}>
                {currencyList.length > 0
                  ? currencyList.map((c) => <option key={c.id} value={c.currencyCode}>{c.currencyCode} — {c.currencyName}</option>)
                  : <>
                    <option value="CDF">CDF — Franc congolais</option>
                    <option value="USD">USD — Dollar américain</option>
                    <option value="EUR">EUR — Euro</option>
                  </>}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-field">
            <label>Description</label>
            <textarea className="input" rows={4} placeholder="Détails de la demande, justification…"
              value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </form>

        {/* Panneau circuit */}
        <div className="card" style={{ padding: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Circuit d'approbation</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
            Le circuit est déterminé automatiquement selon la catégorie et le montant via les définitions de workflow.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { n: 1, label: "Chef de site" },
              { n: 2, label: "Validation Finance" },
              { n: 3, label: "Comptabilisation auto (ledger)" },
            ].map((s) => (
              <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--iris-100)", color: "var(--iris-700)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12, flex: "none" }}>{s.n}</div>
                <span style={{ color: "var(--ink-800)", fontWeight: 500 }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: 10, borderRadius: 8, background: "var(--iris-50)", fontSize: 12, color: "var(--iris-700)", lineHeight: 1.4 }}>
            Une fois approuvé, le montant est comptabilisé automatiquement au ledger SIFA si une catégorie financière est renseignée.
          </div>
        </div>
      </div>
    </div>
  );
}
