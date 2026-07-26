import React from "react";
import { publicApi } from "./api.js";

// Page publique de soumission sous-traitant (sans compte). Servie par token
// d'URL : /batipro/public/submit/:token. Responsive mobile (Capacitor).
function money(value, code) {
  const c = code || "USD";
  try {
    return new Intl.NumberFormat("fr-CA", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(value || 0);
  } catch {
    return `${c} ${Number(value || 0).toLocaleString("fr-CA", { maximumFractionDigits: 2 })}`;
  }
}
const n = (v) => Number(v || 0);
const emptyLine = () => ({ designation: "", quantity: 1, unit_price: 0, vat_rate: 0, phase_id: "" });

export default function SubcontractorSubmit({ token }) {
  const [ctx, setCtx] = React.useState(null);
  const [loadErr, setLoadErr] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [type, setType] = React.useState("quote");
  const [name, setName] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState([emptyLine()]);
  const [file, setFile] = React.useState(null);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    publicApi.submitContext(token)
      .then((c) => setCtx(c))
      .catch((e) => setLoadErr(e.message || String(e)))
      .finally(() => setLoading(false));
  }, [token]);

  const cur = ctx?.project?.currencyCode;
  const setLine = (i, k, v) => setLines((c) => c.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const addLine = () => setLines((c) => [...c, emptyLine()]);
  const removeLine = (i) => setLines((c) => (c.length > 1 ? c.filter((_, idx) => idx !== i) : c));

  const totalHt = lines.reduce((s, l) => s + n(l.quantity) * n(l.unit_price), 0);
  const totalVat = lines.reduce((s, l) => s + n(l.quantity) * n(l.unit_price) * (n(l.vat_rate) / 100), 0);
  const totalTtc = totalHt + totalVat;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!ctx?.nominative && !name.trim() && !company.trim()) { setError("Indiquez votre nom ou votre entreprise."); return; }
    if (!lines.some((l) => l.designation.trim())) { setError("Ajoutez au moins une ligne."); return; }
    setBusy(true);
    try {
      const payload = {
        type,
        currency_id: ctx?.project?.currencyId || undefined,
        submitted_by_name: ctx?.nominative ? undefined : (name.trim() || undefined),
        submitted_by_company: ctx?.nominative ? undefined : (company.trim() || undefined),
        notes: notes.trim() || undefined,
        lines: lines
          .filter((l) => l.designation.trim())
          .map((l) => ({
            designation: l.designation.trim(),
            quantity: n(l.quantity),
            unit_price: n(l.unit_price),
            vat_rate: n(l.vat_rate),
            phase_id: l.phase_id ? Number(l.phase_id) : undefined,
          })),
      };
      const res = await publicApi.submitDocument(token, payload);
      if (file && res?.id) {
        await publicApi.attachFile(token, res.id, file);
      }
      setDone(true);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Shell><p style={{ color: "#64748b" }}>Chargement…</p></Shell>;
  if (loadErr) return <Shell><div style={{ color: "#b91c1c", fontWeight: 600 }}>Lien invalide ou expiré.</div><p style={{ color: "#64748b", fontSize: 13 }}>{loadErr}</p></Shell>;
  if (done) return (
    <Shell>
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ fontSize: 40 }}>✓</div>
        <h2 style={{ margin: "8px 0" }}>Soumission envoyée</h2>
        <p style={{ color: "#64748b" }}>Votre document a bien été transmis au gestionnaire du chantier. Vous pouvez fermer cette page.</p>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Chantier</p>
      <h2 style={{ margin: "2px 0 16px", fontSize: 20 }}>{ctx?.project?.name}</h2>
      {ctx?.nominative && ctx?.subcontractor && (
        <div style={box}>Soumission au nom de <strong>{ctx.subcontractor.name}</strong></div>
      )}

      <form onSubmit={submit}>
        <label style={lbl}>Type de document
          <select value={type} onChange={(e) => setType(e.target.value)} style={inp}>
            <option value="quote">Devis</option>
            <option value="invoice">Facture</option>
          </select>
        </label>

        {!ctx?.nominative && (
          <div style={{ display: "grid", gap: 8 }}>
            <label style={lbl}>Votre nom
              <input value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder="Nom complet" />
            </label>
            <label style={lbl}>Entreprise
              <input value={company} onChange={(e) => setCompany(e.target.value)} style={inp} placeholder="Raison sociale" />
            </label>
          </div>
        )}

        <h3 style={{ fontSize: 15, margin: "18px 0 8px" }}>Détail des prestations</h3>
        {/* scroll horizontal tactile plutot que flexWrap sur mobile */}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#64748b" }}>
                <th style={th}>Désignation</th><th style={th}>Qté</th><th style={th}>P.U.</th>
                <th style={th}>TVA %</th><th style={th}>Phase</th><th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td style={td}><input value={l.designation} onChange={(e) => setLine(i, "designation", e.target.value)} style={{ ...inp, minWidth: 180 }} placeholder="Travaux…" /></td>
                  <td style={td}><input type="number" min="0" step="any" value={l.quantity} onChange={(e) => setLine(i, "quantity", e.target.value)} style={{ ...inp, width: 70 }} /></td>
                  <td style={td}><input type="number" min="0" step="any" value={l.unit_price} onChange={(e) => setLine(i, "unit_price", e.target.value)} style={{ ...inp, width: 90 }} /></td>
                  <td style={td}><input type="number" min="0" max="100" step="any" value={l.vat_rate} onChange={(e) => setLine(i, "vat_rate", e.target.value)} style={{ ...inp, width: 70 }} /></td>
                  <td style={td}>
                    <select value={l.phase_id} onChange={(e) => setLine(i, "phase_id", e.target.value)} style={{ ...inp, minWidth: 120 }}>
                      <option value="">—</option>
                      {(ctx?.phases || []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </td>
                  <td style={td}><button type="button" onClick={() => removeLine(i)} style={{ ...btnGhost, color: "#b91c1c" }}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addLine} style={{ ...btnGhost, marginTop: 8 }}>+ Ajouter une ligne</button>

        <div style={{ ...box, marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={row}><span>Total HT</span><strong>{money(totalHt, cur)}</strong></div>
          <div style={row}><span>TVA</span><strong>{money(totalVat, cur)}</strong></div>
          <div style={{ ...row, fontSize: 16 }}><span>Total TTC</span><strong>{money(totalTtc, cur)}</strong></div>
        </div>

        <label style={lbl}>Document (PDF ou image, ≤ 15 Mo)
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ ...inp, padding: 8 }} />
        </label>

        <label style={lbl}>Notes (optionnel)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inp, minHeight: 70 }} placeholder="Précisions…" />
        </label>

        {error && <div style={{ color: "#b91c1c", fontSize: 13, margin: "8px 0" }}>{error}</div>}
        <button type="submit" disabled={busy} style={btnPrimary}>{busy ? "Envoi…" : "Envoyer ma soumission"}</button>
      </form>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "24px 12px", fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", background: "#fff", borderRadius: 14, padding: "20px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>
        <div style={{ fontWeight: 700, color: "#b45309", marginBottom: 12 }}>BâtiPro · Portail sous-traitant</div>
        {children}
      </div>
    </div>
  );
}

const inp = { width: "100%", padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#fff" };
const lbl = { fontSize: 13, color: "#334155", fontWeight: 500, margin: "10px 0", display: "flex", flexDirection: "column", gap: 4 };
const th = { padding: "6px 6px", fontWeight: 600, whiteSpace: "nowrap" };
const td = { padding: "3px 6px", verticalAlign: "top" };
const box = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 13 };
const row = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const btnGhost = { background: "transparent", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13 };
const btnPrimary = { width: "100%", marginTop: 14, background: "#d97706", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 600, cursor: "pointer" };
