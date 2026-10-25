import React from "react";
import { trackingApi } from "./api.js";

// Page publique de suivi financier du chantier pour le proprietaire (sans compte,
// lecture seule). URL : /batipro/suivi/:token. Responsive 360 px : listes en cartes.
function money(value, code) {
  // Pas de devise par defaut : sans code, montant brut + mention explicite.
  if (!code) return `${Number(value || 0).toLocaleString("fr-CA", { maximumFractionDigits: 2 })} (devise non renseignée)`;
  const c = code;
  try {
    return new Intl.NumberFormat("fr-CA", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(value || 0);
  } catch {
    return `${c} ${Number(value || 0).toLocaleString("fr-CA", { maximumFractionDigits: 2 })}`;
  }
}
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("fr-CA");
};

export default function OwnerTracking({ token }) {
  const [data, setData] = React.useState(null);
  const [state, setState] = React.useState("loading"); // loading | ok | invalid | error
  const [errMsg, setErrMsg] = React.useState("");
  const [viewer, setViewer] = React.useState(null); // { url, pdf }

  const load = React.useCallback(() => {
    setState("loading");
    trackingApi.get(token)
      .then((d) => { setData(d); setState("ok"); })
      .catch((e) => {
        if (e.invalid) setState("invalid");
        else { setErrMsg(e.message || String(e)); setState("error"); }
      });
  }, [token]);
  React.useEffect(load, [load]);
  React.useEffect(() => {
    if (!viewer) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setViewer(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer]);

  if (state === "loading") return <Shell><p style={muted}>Chargement…</p></Shell>;
  if (state === "invalid") {
    return <Shell><h2 style={{ margin: "8px 0", fontSize: 18 }}>Ce lien n'est plus valide</h2><p style={muted}>Demandez un nouveau lien au responsable du chantier.</p></Shell>;
  }
  if (state === "error") {
    return (
      <Shell>
        <p style={{ color: "#b91c1c", fontSize: 14 }}>{errMsg || "Impossible de charger le suivi."}</p>
        <button type="button" style={btn} onClick={load}>Réessayer</button>
      </Shell>
    );
  }

  const { project, budget, purchase_orders: pos, supplier_invoices: invoices, subcontractors, remaining_by_currency: remaining, site_photos: photos } = data;
  const pct = Math.max(0, Math.min(100, Number(project.progress) || 0));

  return (
    <Shell>
      <p style={{ ...muted, margin: 0 }}>Chantier</p>
      <h2 style={{ margin: "2px 0 8px", fontSize: 20, overflowWrap: "anywhere" }}>{project.name}</h2>
      <div style={{ height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }} aria-label={`Avancement ${pct} %`}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#d97706" }} />
      </div>
      <div style={{ ...row, marginTop: 6 }}>
        <span><strong>{pct} %</strong> d'avancement</span>
        <span style={muted}>{fmtDate(project.start_date)} → {fmtDate(project.due_date)}</span>
      </div>

      <Section title="Budget">
        <div style={row}><span>Devis accepté</span><strong>{money(budget.accepted_quote, budget.currency_code)}</strong></div>
        <div style={row}><span>Budget du chantier</span><strong>{money(budget.project_budget, budget.currency_code)}</strong></div>
      </Section>

      <Section title="Reste à payer">
        {remaining.length ? remaining.map((r) => (
          <div key={r.currency_code || "none"} style={row}><span>{r.currency_code || "Devise non renseignée"}</span><strong>{money(r.remaining, r.currency_code)}</strong></div>
        )) : <p style={muted}>Rien à payer.</p>}
        <p style={{ ...muted, fontSize: 11, margin: "6px 0 0" }}>Reste à payer = bons de commande non soldés. Les devises sont présentées séparément, sans conversion.</p>
      </Section>

      <Section title="Bons de commande">
        {!pos.length && <p style={muted}>Aucun bon de commande.</p>}
        {pos.map((p) => (
          <div key={p.id} style={card}>
            <div style={row}><strong>{p.number || `BC #${p.id}`}</strong><span style={muted}>{fmtDate(p.date)}</span></div>
            {p.label && <div style={{ fontSize: 13, color: "#475569", overflowWrap: "anywhere" }}>{p.label}</div>}
            <Amounts items={[["Engagé", p.engaged], ["Payé", p.paid], ["Reste", p.remaining]]} code={p.currency_code} />
          </div>
        ))}
      </Section>

      <Section title="Factures fournisseur">
        {!invoices.length && <p style={muted}>Aucune facture.</p>}
        {invoices.map((i) => (
          <div key={i.id} style={card}>
            <div style={row}><strong>{i.number || `Facture #${i.id}`}</strong><span style={muted}>{fmtDate(i.date)}</span></div>
            <Amounts items={[["Total", i.total], ["Payé", i.paid], ["Reste", i.remaining]]} code={i.currency_code} />
            {(i.has_attachment || i.photo_ids.length > 0) && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {i.has_attachment && <a href={trackingApi.attachmentUrl(token, i.id)} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Voir la facture</a>}
                {i.photo_ids.map((pid, idx) => (
                  <Thumb key={pid} url={trackingApi.photoUrl(token, pid)} alt={`Photo facture ${idx + 1}`} onOpen={setViewer} />
                ))}
              </div>
            )}
          </div>
        ))}
      </Section>

      <Section title="Sous-traitants">
        {!subcontractors.length && <p style={muted}>Aucun sous-traitant.</p>}
        {subcontractors.map((s, idx) => (
          <div key={`${s.name}-${idx}`} style={card}>
            <div style={row}><strong style={{ overflowWrap: "anywhere" }}>{s.name}</strong><span style={muted}>{s.trade || ""}</span></div>
            <Amounts items={[["Contrat", s.contract], ["Payé", s.paid], ["Reste", s.remaining]]} code={s.currency_code} />
          </div>
        ))}
      </Section>

      <Section title="Photos du chantier">
        {!photos.length && <p style={muted}>Aucune photo.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
          {photos.map((p) => (
            <Thumb key={p.id} url={trackingApi.photoUrl(token, p.id)} alt={p.caption || "Photo du chantier"} onOpen={setViewer} fill />
          ))}
        </div>
      </Section>

      {viewer && (
        <div role="dialog" aria-modal="true" onClick={() => setViewer(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
          <button type="button" aria-label="Fermer" onClick={() => setViewer(null)} style={{ position: "absolute", top: 10, right: 10, ...btnSm }}>Fermer</button>
          <img src={viewer.url} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", background: "#fff" }} />
        </div>
      )}
    </Shell>
  );
}

function Thumb({ url, alt, onOpen, fill }) {
  const [failed, setFailed] = React.useState(false);
  return (
    <button type="button" onClick={() => onOpen({ url })} style={{ padding: 0, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", cursor: "pointer", overflow: "hidden", width: fill ? "100%" : 72, height: fill ? 96 : 72 }}>
      {failed
        ? <span style={{ fontSize: 11, color: "#64748b", padding: 4, display: "block" }}>Photo indisponible</span>
        : <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
    </button>
  );
}

function Amounts({ items, code }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 6, fontSize: 13 }}>
      {items.map(([label, value]) => (
        <span key={label} style={{ whiteSpace: "nowrap" }}><span style={muted}>{label} </span><strong>{money(value, code)}</strong></span>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#b45309" }}>{title}</h3>
      {children}
    </section>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "16px 10px", fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", background: "#fff", borderRadius: 14, padding: "16px 14px", boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>
        <div style={{ fontWeight: 700, color: "#b45309", marginBottom: 12 }}>BâtiPro · Suivi du chantier</div>
        {children}
      </div>
    </div>
  );
}

const muted = { color: "#64748b", fontSize: 13 };
const row = { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap", fontSize: 14, padding: "3px 0" };
const card = { border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", marginBottom: 8 };
const btn = { padding: "10px 16px", border: "none", borderRadius: 8, background: "#d97706", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 44 };
const btnSm = { padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", color: "#0f172a", fontSize: 13, cursor: "pointer", minHeight: 40 };
