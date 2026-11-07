import React from "react";
import { siteApi } from "./api.js";
import { Amounts, FinanceSections, Section, Shell, Thumb, btn, btnSm, card, fmtDate, money, muted, row } from "./OwnerTracking.jsx";

// Page publique ingenieur / responsable de chantier (sans compte). URL :
// /batipro/chantier/:token. Avancement des phases, photos, reception des BC,
// + suivi financier en lecture. Responsive 360 px : tout en cartes.
const PHASE_STATUS = [["A_venir", "À venir"], ["En_cours", "En cours"], ["Termine", "Terminé"]];
const fmtQty = (n) => Number(n || 0).toLocaleString("fr-CA", { maximumFractionDigits: 3 });
const field = { width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, minHeight: 44, background: "#fff" };
const today = () => new Date().toISOString().slice(0, 10);

export default function EngineerSite({ token }) {
  const [data, setData] = React.useState(null);
  const [state, setState] = React.useState("loading"); // loading | ok | invalid | error
  const [errMsg, setErrMsg] = React.useState("");
  const [viewer, setViewer] = React.useState(null);
  const [flash, setFlash] = React.useState("");
  const [tab, setTab] = React.useState("phases");

  const load = React.useCallback((silent) => {
    if (!silent) setState("loading");
    return siteApi.get(token)
      .then((d) => { setData(d); setState("ok"); })
      .catch((e) => {
        if (e.invalid) setState("invalid");
        else { setErrMsg(e.message || String(e)); setState("error"); }
      });
  }, [token]);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(""), 3000);
    return () => clearTimeout(t);
  }, [flash]);
  React.useEffect(() => {
    if (!viewer) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setViewer(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer]);

  const done = (msg) => { setFlash(msg); return load(true); };

  if (state === "loading") return <Shell title="Accès chantier"><p style={muted}>Chargement…</p></Shell>;
  if (state === "invalid") {
    return <Shell title="Accès chantier"><h2 style={{ margin: "8px 0", fontSize: 18 }}>Ce lien n'est plus valide</h2><p style={muted}>Demandez un nouveau lien au gestionnaire du chantier.</p></Shell>;
  }
  if (state === "error") {
    return (
      <Shell title="Accès chantier">
        <p style={{ color: "#b91c1c", fontSize: 14 }}>{errMsg || "Impossible de charger le chantier."}</p>
        <button type="button" style={btn} onClick={() => load()}>Réessayer</button>
      </Shell>
    );
  }

  const { project, phases, orders_to_receive: orders, site_photos: photos, recipient_name: who } = data;
  const pct = Math.max(0, Math.min(100, Number(project.progress) || 0));
  const docs = data.documents || [];
  const quotes = docs.filter((d) => d.type === "quote");
  const pos = docs.filter((d) => d.type === "purchase_order");
  const phaseName = (id) => phases.find((p) => p.id === id)?.label || null;
  const counts = {
    phases: phases.length, quotes: quotes.length, orders: orders.length,
    expenses: (data.direct_expenses || []).length, invoices: (data.supplier_invoices || []).length, photos: photos.length,
  };

  return (
    <Shell title="Accès chantier">
      {who && <p style={{ ...muted, margin: "0 0 4px" }}>Connecté en tant que <strong>{who}</strong></p>}
      <p style={{ ...muted, margin: 0 }}>Chantier</p>
      <h2 style={{ margin: "2px 0 8px", fontSize: 20, overflowWrap: "anywhere" }}>{project.name}</h2>
      <div style={{ height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }} aria-label={`Avancement ${pct} %`}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#d97706" }} />
      </div>
      <div style={{ ...row, marginTop: 6 }}>
        <span><strong>{pct} %</strong> d'avancement global</span>
        <span style={muted}>{fmtDate(project.start_date)} → {fmtDate(project.due_date)}</span>
      </div>

      {flash && <div role="status" style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "#ecfdf5", color: "#065f46", fontSize: 14 }}>{flash}</div>}

      <TabBar tab={tab} setTab={setTab} counts={counts} />

      {tab === "overview" && (
        <FinanceSections data={data} token={token} links={siteApi} onOpen={setViewer} only={["budget", "remaining", "subcontractors"]} />
      )}

      {tab === "phases" && (
        <Section title="Avancement des phases">
          {!phases.length && <p style={muted}>Aucune phase définie.</p>}
          {phases.map((p) => (
            <PhaseCard key={`${p.id}-${p.progress}-${p.status}`} token={token} phase={p} onDone={done} quoteLines={linesByPhase(quotes, p.id)} orderLines={linesByPhase(pos, p.id)} />
          ))}
        </Section>
      )}

      {tab === "quotes" && (
        <Section title="Devis">
          {!quotes.length && <p style={muted}>Aucun devis.</p>}
          {quotes.map((d) => <DocCard key={d.id} doc={d} phaseName={phaseName} />)}
        </Section>
      )}

      {tab === "orders" && (
        <>
          <Section title="À réceptionner">
            {!orders.length && <p style={muted}>Aucun bon de commande en attente de réception.</p>}
            {orders.map((o) => <ReceiveCard key={o.id} token={token} order={o} onDone={done} />)}
          </Section>
          <Section title="Tous les bons de commande">
            {!pos.length && <p style={muted}>Aucun bon de commande.</p>}
            {pos.map((d) => <DocCard key={d.id} doc={d} phaseName={phaseName} />)}
          </Section>
        </>
      )}

      {tab === "expenses" && <FinanceSections data={data} token={token} links={siteApi} onOpen={setViewer} only={["expenses"]} />}
      {tab === "invoices" && <FinanceSections data={data} token={token} links={siteApi} onOpen={setViewer} only={["invoices"]} />}

      {tab === "photos" && (
        <Section title="Photos du chantier">
          <PhotoUpload token={token} onDone={done} />
          {!photos.length && <p style={muted}>Aucune photo.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8, marginTop: 8 }}>
            {photos.map((p) => (
              <Thumb key={p.id} url={siteApi.photoUrl(token, p.id)} alt={p.caption || "Photo du chantier"} onOpen={setViewer} fill />
            ))}
          </div>
        </Section>
      )}

      {viewer && (
        <div role="dialog" aria-modal="true" onClick={() => setViewer(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
          <button type="button" aria-label="Fermer" onClick={() => setViewer(null)} style={{ position: "absolute", top: 10, right: 10, ...btnSm }}>Fermer</button>
          <img src={viewer.url} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", background: "#fff" }} />
        </div>
      )}
    </Shell>
  );
}

const TABS = [
  ["overview", "Aperçu"], ["phases", "Phases"], ["quotes", "Devis"], ["orders", "Commandes"],
  ["expenses", "Dépenses"], ["invoices", "Factures"], ["photos", "Photos"],
];
const DOC_STATUS = {
  draft: "Brouillon", sent: "Envoyé", confirmed: "Confirmé", accepted: "Accepté", rejected: "Refusé", issued: "Émis",
  partially_received: "Reçu en partie", received: "Reçu", paid: "Payé", partially_paid: "Payé en partie",
};

// Barre d'onglets : defile horizontalement a 360 px, collee en haut.
function TabBar({ tab, setTab, counts }) {
  return (
    <nav aria-label="Sections du chantier" style={{ position: "sticky", top: 0, zIndex: 5, background: "#fff", margin: "14px -14px 0", padding: "8px 14px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      {TABS.map(([k, label]) => {
        const active = tab === k;
        const n = counts[k];
        return (
          <button key={k} type="button" aria-current={active ? "page" : undefined} onClick={() => setTab(k)}
            style={{ flex: "0 0 auto", minHeight: 40, padding: "8px 12px", borderRadius: 999, border: active ? "1px solid #d97706" : "1px solid #cbd5e1", background: active ? "#d97706" : "#fff", color: active ? "#fff" : "#0f172a", fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer" }}>
            {label}{n ? ` · ${n}` : ""}
          </button>
        );
      })}
    </nav>
  );
}

function linesByPhase(docs, phaseId) {
  return docs.flatMap((d) => d.lines.filter((l) => l.phase_id === phaseId).map((l) => ({ ...l, doc: d })));
}

// Devis ou BC : en-tete + montants, lignes repliables (designation, qte x PU, total, phase).
function DocCard({ doc, phaseName }) {
  const isPo = doc.type === "purchase_order";
  return (
    <div style={card}>
      <div style={row}>
        <strong>{doc.number || `${isPo ? "BC" : "Devis"} #${doc.id}`}</strong>
        <span style={muted}>{DOC_STATUS[doc.status] || doc.status} · {fmtDate(doc.date)}</span>
      </div>
      <Amounts items={isPo ? [["Total", doc.total], ["Payé", doc.paid], ["Reste", doc.remaining]] : [["Total", doc.total]]} code={doc.currency_code} />
      {doc.lines.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "#b45309", minHeight: 32, display: "flex", alignItems: "center" }}>Voir les {doc.lines.length} ligne(s)</summary>
          <LineList lines={doc.lines} showReceived={isPo} phaseName={phaseName} />
        </details>
      )}
    </div>
  );
}

function LineList({ lines, showReceived, phaseName, showDoc }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {lines.map((l) => (
        <div key={`${l.doc?.id || ""}-${l.id}`} style={{ borderTop: "1px solid #f1f5f9", padding: "6px 0", fontSize: 13 }}>
          <div style={row}><span style={{ overflowWrap: "anywhere", flex: "1 1 60%" }}>{l.designation}</span><strong>{money(l.total, l.currency_code)}</strong></div>
          <div style={{ ...muted, fontSize: 12 }}>
            {fmtQty(l.quantity)} × {money(l.unit_price, l.currency_code)}
            {showReceived && l.line_type === "material" ? ` · reçu ${fmtQty(l.received)}` : ""}
            {showDoc && l.doc ? ` · ${l.doc.number || `#${l.doc.id}`}` : ""}
            {phaseName && l.phase_id && !showDoc ? ` · ${phaseName(l.phase_id) || ""}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

function PhaseCard({ token, phase, onDone, quoteLines = [], orderLines = [] }) {
  const [progress, setProgress] = React.useState(String(phase.progress ?? 0));
  const [status, setStatus] = React.useState(phase.status || "A_venir");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const n = Number(progress);
  const valid = progress !== "" && Number.isInteger(n) && n >= 0 && n <= 100;
  const dirty = valid && (n !== Number(phase.progress) || status !== phase.status);

  const save = async () => {
    setBusy(true); setError("");
    try {
      await siteApi.updatePhase(token, phase.id, { progress: n, status });
      await onDone(`Phase « ${phase.label} » mise à jour.`);
    } catch (e) { setError(e.message || String(e)); setBusy(false); }
  };

  return (
    <div style={card}>
      <div style={row}><strong style={{ overflowWrap: "anywhere" }}>{phase.label}</strong><span style={muted}>{fmtDate(phase.start_date)} → {fmtDate(phase.end_date)}</span></div>
      <input type="range" min="0" max="100" step="5" value={valid ? n : 0} onChange={(e) => setProgress(e.target.value)} aria-label={`Avancement ${phase.label}`} style={{ width: "100%", margin: "8px 0", minHeight: 32 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ fontSize: 12, color: "#475569" }}>Avancement %
          <input type="number" inputMode="numeric" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} style={field} />
        </label>
        <label style={{ fontSize: 12, color: "#475569" }}>Statut
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={field}>
            {PHASE_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      {!valid && <p style={{ color: "#b91c1c", fontSize: 12, margin: "6px 0 0" }}>Entier entre 0 et 100.</p>}
      {error && <p style={{ color: "#b91c1c", fontSize: 13, margin: "6px 0 0" }}>{error}</p>}
      {dirty && <button type="button" style={{ ...btn, marginTop: 8, width: "100%" }} disabled={busy} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer"}</button>}
      {quoteLines.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "#b45309", minHeight: 32, display: "flex", alignItems: "center" }}>Prévu au devis · {quoteLines.length} ligne(s)</summary>
          <LineList lines={quoteLines} showDoc />
        </details>
      )}
      {orderLines.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "#b45309", minHeight: 32, display: "flex", alignItems: "center" }}>Commandé · {orderLines.length} ligne(s)</summary>
          <LineList lines={orderLines} showReceived showDoc />
        </details>
      )}
    </div>
  );
}

function ReceiveCard({ token, order, onDone }) {
  const [qty, setQty] = React.useState({});
  const [note, setNote] = React.useState("");
  const [date, setDate] = React.useState(today());
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const open = order.lines.filter((l) => l.remaining > 0);

  const entries = open
    .map((l) => ({ line: l, q: Number(String(qty[l.id] ?? "").replace(",", ".")) }))
    .filter((e) => qty[e.line.id] !== undefined && qty[e.line.id] !== "" && e.q > 0);
  const tooMuch = entries.find((e) => e.q > e.line.remaining + 0.0005);
  const invalid = open.some((l) => qty[l.id] !== undefined && qty[l.id] !== "" && !(Number(String(qty[l.id]).replace(",", ".")) > 0));

  const fillAll = () => setQty(Object.fromEntries(open.map((l) => [l.id, String(l.remaining)])));
  const submit = async () => {
    if (!entries.length || tooMuch || invalid) return;
    if (!window.confirm(`Confirmer la réception de ${entries.length} ligne(s) du ${order.number || `BC #${order.id}`} ?`)) return;
    setBusy(true); setError("");
    try {
      await siteApi.receive(token, order.id, { lines: entries.map((e) => ({ line_id: e.line.id, quantity: e.q })), note: note.trim() || undefined, received_date: date || undefined });
      setQty({}); setNote("");
      await onDone(`Réception enregistrée (${order.number || `BC #${order.id}`}).`);
    } catch (e) { setError(e.message || String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div style={card}>
      <div style={row}>
        <strong>{order.number || `BC #${order.id}`}</strong>
        <span style={muted}>{order.status === "partially_received" ? "Reçu en partie" : "À recevoir"} · {fmtDate(order.date)}</span>
      </div>
      {!open.length && <p style={muted}>Aucune ligne matériau à recevoir.</p>}
      {open.map((l) => (
        <div key={l.id} style={{ borderTop: "1px solid #f1f5f9", padding: "8px 0" }}>
          <div style={{ fontSize: 14, overflowWrap: "anywhere" }}>{l.designation}</div>
          <div style={{ ...muted, fontSize: 12 }}>Commandé {fmtQty(l.ordered)} · Déjà reçu {fmtQty(l.received)} · Reste {fmtQty(l.remaining)}</div>
          <input type="text" inputMode="decimal" placeholder="Quantité reçue" aria-label={`Quantité reçue ${l.designation}`} value={qty[l.id] ?? ""} onChange={(e) => setQty((s) => ({ ...s, [l.id]: e.target.value }))} style={{ ...field, marginTop: 6 }} />
        </div>
      ))}
      {open.length > 0 && (
        <>
          <button type="button" style={{ ...btnSm, marginTop: 4 }} onClick={fillAll}>Tout reçu</button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 8 }}>
            <label style={{ fontSize: 12, color: "#475569" }}>Date de réception
              <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} style={field} />
            </label>
            <label style={{ fontSize: 12, color: "#475569" }}>Note (optionnel)
              <input type="text" maxLength={500} value={note} placeholder="Ex. camion n°, état…" onChange={(e) => setNote(e.target.value)} style={field} />
            </label>
          </div>
          {tooMuch && <p style={{ color: "#b91c1c", fontSize: 12, margin: "6px 0 0" }}>« {tooMuch.line.designation} » : plus que le reste à recevoir ({fmtQty(tooMuch.line.remaining)}).</p>}
          {invalid && <p style={{ color: "#b91c1c", fontSize: 12, margin: "6px 0 0" }}>Quantité invalide.</p>}
          {error && <p style={{ color: "#b91c1c", fontSize: 13, margin: "6px 0 0" }}>{error}</p>}
          <button type="button" style={{ ...btn, marginTop: 8, width: "100%", opacity: !entries.length || tooMuch || invalid ? 0.5 : 1 }} disabled={busy || !entries.length || !!tooMuch || invalid} onClick={submit}>
            {busy ? "Enregistrement…" : "Valider la réception"}
          </button>
        </>
      )}
    </div>
  );
}

function PhotoUpload({ token, onDone }) {
  const [file, setFile] = React.useState(null);
  const [caption, setCaption] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const inputRef = React.useRef(null);

  const send = async () => {
    if (!file) return;
    setBusy(true); setError("");
    try {
      await siteApi.uploadPhoto(token, file, caption.trim());
      setFile(null); setCaption("");
      if (inputRef.current) inputRef.current.value = "";
      await onDone("Photo ajoutée.");
    } catch (e) { setError(e.message || String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div style={card}>
      <label style={{ fontSize: 12, color: "#475569" }}>Photo (JPEG, PNG, WebP — 15 Mo max)
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ ...field, padding: 8 }} />
      </label>
      {file && (
        <>
          <label style={{ fontSize: 12, color: "#475569", display: "block", marginTop: 8 }}>Légende (optionnel)
            <input type="text" maxLength={200} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex. coulage dalle R+1" style={field} />
          </label>
          {error && <p style={{ color: "#b91c1c", fontSize: 13, margin: "6px 0 0" }}>{error}</p>}
          <button type="button" style={{ ...btn, marginTop: 8, width: "100%" }} disabled={busy} onClick={send}>{busy ? "Envoi…" : "Envoyer la photo"}</button>
        </>
      )}
    </div>
  );
}
