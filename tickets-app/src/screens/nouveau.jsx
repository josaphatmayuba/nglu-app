import { useState, useRef } from "react";
import { Send, CreditCard, ShoppingBag, CalendarDays, MoreHorizontal, Upload, X } from "lucide-react";
import { useApi, CATEGORIES, useCurrency } from "../data.js";
import { api } from "../api.js";

const CAT_ICONS = { payment: CreditCard, purchase: ShoppingBag, leave: CalendarDays, other: MoreHorizontal };

export function Nouveau({ go, onToast }) {
  const [category, setCategory] = useState("payment");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [currencyCode, setCurrencyCode] = useState("CDF");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

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
          <div className="form-field" style={{ marginBottom: 14 }}>
            <label>Description</label>
            <textarea className="input" rows={4} placeholder="Détails de la demande, justification…"
              value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Pièce jointe */}
          <div className="form-field">
            <label>Pièce jointe (optionnel)</label>
            <input type="file" ref={fileRef} style={{ display: "none" }}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setAttachment(e.target.files[0] || null)} />
            {!attachment ? (
              <div onClick={() => fileRef.current?.click()}
                style={{ border: "2px dashed var(--border)", borderRadius: 10, padding: "20px 14px",
                  textAlign: "center", cursor: "pointer", color: "var(--ink-500)", fontSize: 13, transition: ".15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--iris-400)"; e.currentTarget.style.background = "var(--iris-50)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = ""; }}>
                <Upload size={20} style={{ marginBottom: 6, color: "var(--ink-400)" }} />
                <div>Glisser un fichier ou <span style={{ color: "var(--iris-600)", fontWeight: 600 }}>parcourir</span></div>
                <div style={{ fontSize: 11, marginTop: 4, color: "var(--ink-400)" }}>PDF, image, Word, Excel</div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                border: "1px solid var(--iris-100)", borderRadius: 8, background: "var(--iris-50)" }}>
                <Upload size={15} style={{ color: "var(--iris-600)", flex: "none" }} />
                <span style={{ flex: 1, fontSize: 13, color: "var(--iris-700)", fontWeight: 500,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachment.name}</span>
                <button onClick={() => { setAttachment(null); if (fileRef.current) fileRef.current.value = ""; }}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-400)", padding: 2 }}>
                  <X size={14} />
                </button>
              </div>
            )}
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
