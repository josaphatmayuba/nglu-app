import { useMemo, useState } from "react";
import {
  Wallet, Download, Plus, Check, Clock, Smartphone, ArrowRight, ArrowLeft,
  Banknote, BellRing, CheckCircle2, FileDown, Send,
} from "lucide-react";
import { api } from "../api.js";
import { useApi, money } from "../data.js";
import { Loading, ApiError } from "./dashboard.jsx";

const METHODS = [
  { key: "cash", label: "Espèces", color: "#475569", short: "FC" },
  { key: "mpesa", label: "M-Pesa", color: "#ef4444", short: "M-P", mobile: true },
  { key: "airtel", label: "Airtel", color: "#dc2626", short: "A", mobile: true },
  { key: "orange", label: "Orange", color: "#f59e0b", short: "O", mobile: true },
];
const tenantName = (r) => [r.tenantFirstName, r.tenantLastName].filter(Boolean).join(" ") || "Locataire";
const today = () => new Date().toISOString().slice(0, 10);

// ─────────────────────────── LOYERS (liste) ───────────────────────────
export function Loyers({ go }) {
  const { data, loading, error } = useApi(() => api.payments(), []);
  const rows = Array.isArray(data) ? data : [];

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  return (
    <>
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Encaissements</div>
          <h2 className="title">Loyers &amp; paiements</h2>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn"><Download size={16} /> Export CSV</button>
          <button className="btn btn-primary" onClick={() => go("paiement")}><Smartphone size={16} /> Encaisser</button>
        </div>
      </div>

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="card grad-iris" style={{ padding: 20, color: "#fff" }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Encaissé (cumul)</div>
          <div className="kpi-value" style={{ fontSize: 30, color: "#fff" }}>{money(total)}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{rows.length} paiement(s)</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi-label">Dernier paiement</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{rows[0] ? money(rows[0].amount) : "—"}</div>
          <div className="kpi-sub">{rows[0] ? tenantName(rows[0]) : "aucun"}</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi-label" style={{ marginBottom: 8 }}>Rappels d'impayés</div>
          <button className="btn" style={{ width: "100%", justifyContent: "center" }}
            onClick={() => api.runOverdueReminders().then(() => alert("Rappels lancés")).catch((e) => alert(e.message))}>
            <BellRing size={16} /> Lancer maintenant
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <p className="muted" style={{ margin: 0 }}>Aucun paiement enregistré. Cliquez « Encaisser » pour le premier.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead><tr><th>Locataire</th><th>Logement</th><th>Date</th><th>Méthode</th><th>Montant</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{tenantName(p)}</td>
                  <td className="muted">{[p.propertyName, p.unitName].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="muted">{p.paymentDate || "—"}</td>
                  <td><span className="chip chip-ink">{p.method || "—"}</span></td>
                  <td style={{ fontWeight: 600 }}>{money(p.amount, p.currencySymbol || "$")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ───────────────────── PAIEMENT (wizard Encaisser) ─────────────────────
export function Paiement({ go }) {
  const { data: leases, loading, error } = useApi(() => api.leases(), []);
  const active = (Array.isArray(leases) ? leases : []).filter((l) => (l.status || "active") === "active");

  const [step, setStep] = useState(1);
  const [leaseId, setLeaseId] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mpesa");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState(null);

  const lease = active.find((l) => l.id === leaseId) || null;
  const methodMeta = METHODS.find((m) => m.key === method);

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  const pickLease = (l) => {
    setLeaseId(l.id);
    setAmount(String(l.rentAmount ?? ""));
    setStep(2);
  };

  const submit = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      const payment = await api.createPayment({
        leaseId,
        paymentDate: today(),
        amount: Number(amount),
        method: methodMeta?.label || method,
        reference: reference || null,
      });
      setDone(payment || { amount, method: methodMeta?.label });
      setStep(4);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1); setLeaseId(null); setAmount(""); setMethod("mpesa");
    setReference(""); setDone(null); setErr(null);
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 16 }}>
        <div className="eyebrow">Encaissement · pas à pas</div>
        <h2 className="title">Encaisser un loyer</h2>
      </div>

      <Stepper step={step} />

      {/* ÉTAPE 1 — bail */}
      {step === 1 && (
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi-label" style={{ marginBottom: 8 }}>Choisir le bail</div>
          {active.length === 0 && <p className="muted">Aucun bail actif.</p>}
          <div style={{ display: "grid", gap: 8 }}>
            {active.map((l) => (
              <button key={l.id} className="btn" style={{ height: "auto", padding: 12, justifyContent: "space-between", textAlign: "left" }}
                onClick={() => pickLease(l)}>
                <span>
                  <div style={{ fontWeight: 600 }}>{[l.tenantFirstName, l.tenantLastName].filter(Boolean).join(" ") || l.reference}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{[l.propertyName, l.unitName].filter(Boolean).join(" · ")}</div>
                </span>
                <span style={{ fontWeight: 700 }}>{money(l.rentAmount, l.currencySymbol || "$")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ÉTAPE 2 — montant + méthode */}
      {step === 2 && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <span className="muted" style={{ fontSize: 13 }}>{lease ? [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") : ""}</span>
            <span className="muted" style={{ fontSize: 12 }}>{lease ? [lease.propertyName, lease.unitName].filter(Boolean).join(" · ") : ""}</span>
          </div>
          <label className="kpi-label">Montant</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
            style={inputStyle} />
          <div className="kpi-label" style={{ margin: "14px 0 8px" }}>Moyen de paiement</div>
          <div className="grid g4 keep" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {METHODS.map((m) => (
              <button key={m.key} onClick={() => setMethod(m.key)}
                style={{ ...tileStyle, ...(method === m.key ? tileOn : {}) }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: m.color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, margin: "0 auto" }}>{m.short}</span>
                <div style={{ fontSize: 11, marginTop: 6, fontWeight: method === m.key ? 600 : 400 }}>{m.label}</div>
              </button>
            ))}
          </div>
          <div className="kpi-label" style={{ margin: "14px 0 6px" }}>
            {methodMeta?.mobile ? "Numéro mobile money" : "Référence (reçu)"}
          </div>
          <input value={reference} onChange={(e) => setReference(e.target.value)}
            placeholder={methodMeta?.mobile ? "+243 …" : "REC-001"} style={inputStyle} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={() => setStep(1)}><ArrowLeft size={16} /></button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}
              disabled={!amount} onClick={() => setStep(3)}>
              {methodMeta?.mobile ? <><Smartphone size={16} /> Demander le paiement</> : <>Continuer <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 3 — validation / confirmation */}
      {step === 3 && (
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          {methodMeta?.mobile ? (
            <>
              <div style={{ width: 60, height: 60, borderRadius: 999, background: "var(--iris-50)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Smartphone size={26} color="#4f46e5" />
              </div>
              <div className="font-display" style={{ fontWeight: 700, fontSize: 16 }}>Demande envoyée</div>
              <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                Demande <b>{methodMeta.label}</b> de <b>{money(amount, lease?.currencySymbol || "$")}</b>
                {reference ? <> au <span style={{ fontFamily: "monospace" }}>{reference}</span></> : null}. En attente de validation du locataire…
              </p>
              <div className="grad-dark" style={{ borderRadius: 16, padding: 14, textAlign: "left", color: "#fff", margin: "14px 0", fontFamily: "monospace", fontSize: 12, lineHeight: 1.5 }}>
                *150*1#<br />DOMUS demande {money(amount, " USD")}<br />
                <span style={{ color: "#fcd34d" }}>Entrez votre code PIN pour confirmer :</span> ••••
              </div>
            </>
          ) : (
            <>
              <div style={{ width: 60, height: 60, borderRadius: 999, background: "#ecfdf5", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Banknote size={26} color="#10b981" />
              </div>
              <div className="font-display" style={{ fontWeight: 700, fontSize: 16 }}>Confirmer l'encaissement</div>
              <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                {money(amount, lease?.currencySymbol || "$")} en espèces · {lease ? [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") : ""}
              </p>
            </>
          )}
          {err && <p style={{ color: "#be123c", fontSize: 12 }}>{err}</p>}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
            disabled={submitting} onClick={submit}>
            {submitting ? "Enregistrement…" : <><Check size={16} /> {methodMeta?.mobile ? "Valider le paiement" : "Confirmer"}</>}
          </button>
          <button className="btn" style={{ marginTop: 8, border: "none" }} onClick={() => setStep(2)}>Retour</button>
        </div>
      )}

      {/* ÉTAPE 4 — quittance */}
      {step === 4 && (
        <>
          <div className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12, marginBottom: 12, borderColor: "#a7f3d0", background: "#ecfdf5" }}>
            <span style={{ width: 40, height: 40, borderRadius: 999, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Check size={20} color="#fff" />
            </span>
            <div>
              <div style={{ fontWeight: 600, color: "#065f46" }}>Paiement reçu · {money(done?.amount ?? amount, lease?.currencySymbol || "$")}</div>
              <div style={{ fontSize: 12, color: "#047857" }}>Écriture comptable créée automatiquement</div>
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ textAlign: "center", margin: "8px 0 14px" }}>
              <div className="eyebrow">Quittance de loyer</div>
              <div className="kpi-value" style={{ fontSize: 28 }}>{money(done?.amount ?? amount, lease?.currencySymbol || "$")}</div>
            </div>
            <Line k="Locataire" v={lease ? [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") : "—"} />
            <Line k="Logement" v={lease ? [lease.propertyName, lease.unitName].filter(Boolean).join(" · ") : "—"} />
            <Line k="Méthode" v={methodMeta?.label} />
            <Line k="Date" v={today()} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn" style={{ flex: 1, justifyContent: "center" }}><FileDown size={16} /> PDF</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center" }}><Send size={16} /> Envoyer</button>
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={reset}>
              <Plus size={16} /> Nouvel encaissement
            </button>
            <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 8, border: "none" }} onClick={() => go("loyers")}>
              Voir les loyers
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Stepper({ step }) {
  const labels = ["Bail", "Moyen", "Validation", "Quittance"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
      {labels.map((l, i) => {
        const n = i + 1;
        const active = n <= step;
        return (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, flex: i < 3 ? 1 : "none" }}>
            <span style={{ width: 26, height: 26, borderRadius: 999, fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", flex: "none",
              background: active ? "var(--grad-iris)" : "var(--ink-100)", color: active ? "#fff" : "var(--ink-500)" }}>{n}</span>
            {i < 3 && <span style={{ flex: 1, height: 1, background: "var(--ink-200)" }} />}
          </div>
        );
      })}
    </div>
  );
}

function Line({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderTop: "1px solid var(--ink-100)" }}>
      <span className="muted">{k}</span><span style={{ fontWeight: 500 }}>{v}</span>
    </div>
  );
}

const inputStyle = {
  width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--ink-200)",
  padding: "0 12px", font: "inherit", fontSize: 16, outline: "none",
};
const tileStyle = {
  border: "1px solid var(--ink-200)", borderRadius: 12, padding: 10, textAlign: "center",
  background: "#fff", cursor: "pointer", font: "inherit",
};
const tileOn = { border: "2px solid var(--iris-500)", background: "var(--iris-50)" };
