import React from "react";

// Aperçu simplifié d'un chantier (4 blocs) : avancement, argent, où va l'argent,
// honoraires de l'ingénieur, prochaine livraison. Composant de présentation pur,
// partagé par l'onglet Aperçu (app.jsx) et les pages de lien (EngineerSite, OwnerTracking).
// Montants : jamais arrondis à 0 décimale, devise toujours issue des données (DB).

export function fmtMoney(value, code) {
  const v = Number(value || 0);
  if (!code) return `${v.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} (devise non renseignée)`;
  try {
    return new Intl.NumberFormat("fr-CA", { style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v);
  } catch {
    return `${code} ${v.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }
}
const fmtPct = (v) => Number(v || 0).toLocaleString("fr-CA", { maximumFractionDigits: 1 });
const fmtQty = (v) => Number(v || 0).toLocaleString("fr-CA", { maximumFractionDigits: 3 });
const clampPct = (v) => Math.max(0, Math.min(100, Number(v) || 0));
const shortDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("fr-CA", { month: "2-digit", day: "2-digit" });
};

const NATURE_COLOR = { materials: "var(--sov-c-mat)", fees: "var(--sov-c-hon)", labor: "var(--sov-c-mo)", handling: "var(--sov-c-man)", other: "var(--sov-c-aut)" };
const NATURE_LABEL = { materials: "Matériaux", fees: "Honoraires et avances", labor: "Main-d'œuvre", handling: "Manutention et transport", other: "Autres" };
const BASE_LABEL = { materials: "matériaux achetés", labor: "main-d'œuvre", handling: "manutention et transport", other: "autres dépenses", accepted_quote: "devis accepté" };

// Libellé du mode d'honoraires : « 30 % des matériaux achetés (3 415,25 $) » ou « Montant fixe convenu ».
export function feeLabel(f) {
  if (f.mode === "percent_materials") {
    const bases = (f.bases && f.bases.length ? f.bases : ["materials"]).map((b) => BASE_LABEL[b] || b).join(" + ");
    const pct = Number(f.percent || 0).toLocaleString("fr-CA", { maximumFractionDigits: 4 });
    return `${pct} % des ${bases} (${fmtMoney(f.base_amount, f.currency_code)})`;
  }
  return "Montant fixe convenu";
}

// Jour de livraison relatif : Aujourd'hui / Demain / En retard / jj-mm / À venir.
export function deliveryWhen(dateStr, now = new Date()) {
  if (!dateStr) return { tag: "À venir", word: "à venir" };
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return { tag: "À venir", word: "à venir" };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((new Date(y, m - 1, d) - today) / 86400000);
  if (diff === 0) return { tag: "Aujourd'hui", word: "aujourd'hui" };
  if (diff === 1) return { tag: "Demain", word: "demain" };
  if (diff < 0) return { tag: "En retard", word: `prévue le ${shortDate(dateStr)}` };
  return { tag: shortDate(dateStr), word: `le ${shortDate(dateStr)}` };
}

function ProgressBar({ label, now }) {
  const v = clampPct(now);
  return (
    <div className="sov-prog" role="progressbar" aria-label={label} aria-valuenow={Math.round(v * 10) / 10} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${v}%` }} />
    </div>
  );
}

/**
 * props :
 *  loading, progress (0-100), phaseLabel,
 *  currency (code devise chantier), funds {received, available} | null,
 *  nature {rows:[{nature,label,amount}], total} | null,
 *  fees [{name, mode, percent, bases, base_amount, due, paid, remaining, currency_code, payments:[{date,label,amount}]}],
 *  deliveries [{number, expected_date, paid, total, currency_code, lines:[{designation, remaining}]}]
 */
export default function SimpleOverview({ loading, progress, phaseLabel, currency, funds, nature, fees, deliveries, name, hideCash }) {
  if (loading) return <div className="sov" role="status" aria-live="polite"><div className="sov-card sov-muted">Chargement de l'aperçu…</div></div>;

  const pct = clampPct(progress);
  const dList = (deliveries || []).filter((d) => (d.lines || []).length > 0 || d.number);
  const next = dList[0] || null;
  const nextWhen = next ? deliveryWhen(next.expected_date) : null;
  const firstLine = next?.lines?.[0] || null;
  const rows = nature?.rows || [];
  const total = nature?.total ?? rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const shownRows = rows.filter((r) => r.nature !== "other" || Number(r.amount || 0) > 0);
  const feeList = (fees || []).filter((f) => f.mode && f.mode !== "none");
  const feePaid = feeList.reduce((t, f) => t + Number(f.paid || 0), 0);
  const feeRemaining = feeList.reduce((t, f) => t + Number(f.remaining || 0), 0);
  const hasMoney = funds && (funds.received != null || funds.available != null);

  return (
    <div className="sov">
      {/* 0. Avancement */}
      <section className="sov-card sov-hero" aria-label="Avancement">
        <div className="sov-ring" role="img" aria-label={`Avancement ${fmtPct(pct)} pour cent`} style={{ background: `conic-gradient(var(--sov-accent) 0 ${pct}%, var(--sov-track) ${pct}% 100%)` }}>
          <span>{fmtPct(pct)} %</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <b>{phaseLabel ? `Phase en cours : ${phaseLabel}` : (name || "Avancement du chantier")}</b>
          <small>
            {next
              ? `Prochaine livraison : ${firstLine ? `${firstLine.designation} ${fmtQty(firstLine.remaining)}, ` : (next.number ? `${next.number}, ` : "")}${nextWhen.word}`
              : "Aucune livraison en attente"}
          </small>
        </div>
      </section>

      {/* 1. L'argent du chantier */}
      <section className="sov-card" aria-label="L'argent du chantier">
        <h3 className="sov-h">{hideCash ? "Les dépenses du chantier" : "L'argent du chantier"}</h3>
        {hideCash ? (
          <div className="sov-money">
            <div><small>Dépensé</small><strong>{fmtMoney(nature?.total ?? 0, currency)}</strong></div>
            <div><small>Honoraires payés</small><strong>{fmtMoney(feePaid, currency)}</strong></div>
            <div className="sov-ok"><small>Reste à payer (honoraires)</small><strong>{fmtMoney(feeRemaining, currency)}</strong></div>
          </div>
        ) : hasMoney ? (
          <div className="sov-money">
            <div><small>Reçu</small><strong>{fmtMoney(funds.received, currency)}</strong></div>
            <div><small>Dépensé</small><strong>{fmtMoney(nature?.total ?? 0, currency)}</strong></div>
            <div className={Number(funds.available) < 0 ? "sov-neg" : "sov-ok"}><small>Il reste en caisse</small><strong>{fmtMoney(funds.available, currency)}</strong></div>
          </div>
        ) : <p className="sov-muted" style={{ margin: 0 }}>Aucun fonds enregistré pour ce chantier.</p>}
      </section>

      {/* 2. Où va l'argent dépensé */}
      <section className="sov-card" aria-label="Où va l'argent dépensé">
        <h3 className="sov-h">Où va l'argent dépensé</h3>
        {shownRows.length && Number(total) > 0 ? (
          <>
            <div className="sov-bar" role="img" aria-label={`Répartition des dépenses : ${shownRows.map((r) => `${r.label || NATURE_LABEL[r.nature] || r.nature} ${fmtPct((Number(r.amount) / Number(total)) * 100)} pour cent`).join(", ")}`}>
              {shownRows.map((r) => <i key={r.nature} style={{ width: `${clampPct((Number(r.amount) / Number(total)) * 100)}%`, background: NATURE_COLOR[r.nature] || "var(--sov-c-aut)" }} />)}
            </div>
            <div className="sov-rows">
              {shownRows.map((r) => (
                <div key={r.nature} className="sov-row">
                  <span className="sov-dot" style={{ background: NATURE_COLOR[r.nature] || "var(--sov-c-aut)" }} />
                  <span>{r.label || NATURE_LABEL[r.nature] || r.nature}<span className="sov-pct">{fmtPct((Number(r.amount) / Number(total)) * 100)} %</span></span>
                  <strong>{fmtMoney(r.amount, currency)}</strong>
                </div>
              ))}
            </div>
            <div className="sov-total"><span>Total dépensé</span><span>{fmtMoney(total, currency)}</span></div>
          </>
        ) : <p className="sov-muted" style={{ margin: 0 }}>Aucune dépense enregistrée pour le moment.</p>}
      </section>

      {/* 3. Honoraires (un bloc par sous-traitant avec honoraires) */}
      {feeList.map((f, idx) => {
        const paidPct = Number(f.due) > 0 ? clampPct((Number(f.paid) / Number(f.due)) * 100) : 0;
        const pays = Array.isArray(f.payments) ? f.payments : [];
        return (
          <section key={`${f.name}-${idx}`} className="sov-card sov-hon" aria-label={`Honoraires de ${f.name}`}>
            <h3 className="sov-h">Honoraires de l'ingénieur · {f.name}</h3>
            <div className="sov-line"><span className="sov-muted">{feeLabel(f)}</span><strong>{fmtMoney(f.due, f.currency_code)}</strong></div>
            <div className="sov-line"><span className="sov-muted">Déjà payé</span><strong>{fmtMoney(f.paid, f.currency_code)}</strong></div>
            <ProgressBar label={`Payé : ${fmtPct(paidPct)} pour cent des honoraires dus`} now={paidPct} />
            <div className="sov-line"><span>Reste à lui payer</span><strong className="sov-due">{fmtMoney(f.remaining, f.currency_code)}</strong></div>
            {pays.length > 0 && (
              <details className="sov-details">
                <summary>Voir les paiements</summary>
                {pays.map((p, i) => (
                  <div key={i} className="sov-line"><span className="sov-muted">{shortDate(p.date)}{p.label ? ` · ${p.label}` : ""}</span><span>{fmtMoney(p.amount, f.currency_code)}</span></div>
                ))}
              </details>
            )}
          </section>
        );
      })}

      {/* 4. Prochaine livraison */}
      {next && (
        <section className="sov-card sov-todo" aria-label="Prochaine livraison">
          <span className="sov-tag">{nextWhen.tag}</span>
          <div style={{ minWidth: 0 }}>
            <b>Réceptionner {(next.lines || []).length ? next.lines.map((l) => l.designation).join(", ") : (next.number || "la livraison")}</b>
            <br />
            <span className="sov-muted">
              {(next.lines || []).length ? `${next.lines.map((l) => fmtQty(l.remaining)).join(" + ")} à recevoir, ` : ""}
              déjà payé {fmtMoney(next.paid, next.currency_code)}{next.number ? ` (${next.number})` : ""}
              {dList.length > 1 ? ` · +${dList.length - 1} autre${dList.length > 2 ? "s" : ""} livraison${dList.length > 2 ? "s" : ""}` : ""}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

// Adaptateur : réponse des routes publiques (buildTracking) -> props de SimpleOverview.
export function trackingOverviewProps(data) {
  const cur = data.project?.currency_code || data.budget?.currency_code || null;
  return {
    name: data.project?.name,
    progress: data.project?.progress,
    phaseLabel: data.current_phase?.label || null,
    currency: cur,
    funds: data.funds ? { received: data.funds.received, available: data.funds.available } : null,
    nature: { rows: data.spent_by_nature || [], total: data.spent_by_nature_total ?? 0 },
    fees: data.fees || [],
    deliveries: data.next_deliveries || [],
  };
}
