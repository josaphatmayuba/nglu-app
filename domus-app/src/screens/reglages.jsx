import { useEffect, useMemo, useState } from "react";
import {
  Globe2, WalletCards, Smartphone, Hash, Search, Check, Save, Coins,
  MessageSquare, Plus, Pencil, Trash2, X, Sparkles,
} from "lucide-react";
import { api } from "../api.js";
import {
  DEVICE_MODES, useApi, decodeCurrencyText, cleanCurrencySymbol, buildCurrencyOptions,
} from "../data.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { LandlordSignatureCard } from "./landlordSignature.jsx";

async function loadConfig() {
  // status=all → toutes les devises (actives + inactives) pour la liste « Devises supportees ».
  const [setting, currencies] = await Promise.all([api.setting(), api.allCurrencies()]);
  return { setting, currencies };
}

function currencyList(raw) {
  const list = Array.isArray(raw?.getAllCurrency) ? raw.getAllCurrency : Array.isArray(raw) ? raw : [];
  return list.map((c) => ({
    id: c.id ?? c.currencyId,
    code: decodeCurrencyText(c.currencyCode).trim() || "—",
    name: decodeCurrencyText(c.currencyName).trim(),
    symbol: cleanCurrencySymbol(c),
    active: c.status === true || c.status === "true" || c.status === 1,
    raw: c,
  })).filter((c) => c.id != null);
}

export function Reglages({ device }) {
  const { data, loading, error, reload } = useApi(loadConfig, []);

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  return (
    <>
      <div className="immo-header">
        <div>
          <h1>Reglages</h1>
          <p>Devises, facturation et configuration du module</p>
        </div>
      </div>

      <div className="settings-hero card">
        <div>
          <span className="chip chip-iris"><Globe2 size={12} /> App locative</span>
          <h3>Domus est connecte au CRM NgoluApp</h3>
          <p>Devises, numerotation et parametres sont partages avec la session principale (meme API).</p>
        </div>
        <div className="settings-mini">
          <WalletCards size={20} />
          <b>Mobile money actif</b>
          <span>M-Pesa, Airtel, Orange</span>
        </div>
        <div className="settings-mini">
          <Smartphone size={20} />
          <b>PWA / mobile</b>
          <span>Device {device?.mode || "auto"}</span>
        </div>
      </div>

      {device && (
        <section className="card settings-card device-settings-card">
          <h3><Smartphone size={17} /> Apercu device</h3>
          <div className="device-segmented">
            {DEVICE_MODES.map((mode) => (
              <button key={mode.value} className={device.forcedMode === mode.value ? "active" : ""} onClick={() => device.setForcedMode(mode.value)}>
                {mode.label}
              </button>
            ))}
          </div>
          <div className="setting-row"><span>Mode applique</span><b>{device.mode}</b></div>
        </section>
      )}

      <CurrenciesCard initial={data?.currencies} onChanged={reload} />
      <LandlordSignatureCard setting={data?.setting} onSaved={reload} />
      <NumberingCard setting={data?.setting} currencies={data?.currencies} onSaved={reload} />
      <MessagesCard />
    </>
  );
}

function CurrenciesCard({ initial, onChanged }) {
  const [rows, setRows] = useState(() => currencyList(initial));
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { setRows(currencyList(initial)); }, [initial]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => [c.code, c.name, c.symbol].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [rows, query]);

  const activeCount = rows.filter((c) => c.active).length;
  const allPicked = filtered.length > 0 && filtered.every((c) => picked.has(c.id));

  const togglePick = (id) => setPicked((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setPicked(() => (allPicked ? new Set() : new Set(filtered.map((c) => c.id))));

  const setOne = async (c) => {
    const nextStatus = c.active ? "false" : "true";
    setRows((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)));
    try {
      await api.setCurrencyStatus(c.id, nextStatus);
      onChanged?.();
    } catch (e) {
      setRows((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: c.active } : x)));
      setMsg({ type: "err", text: e.message });
    }
  };

  const bulk = async (status) => {
    const ids = [...picked];
    if (!ids.length) return;
    setBusy(true);
    setMsg(null);
    setRows((prev) => prev.map((x) => (picked.has(x.id) ? { ...x, active: status === "true" } : x)));
    try {
      await api.bulkCurrencyStatus(ids, status);
      setPicked(new Set());
      setMsg({ type: "ok", text: `${ids.length} devise(s) ${status === "true" ? "activee(s)" : "desactivee(s)"}.` });
      onChanged?.();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card settings-card">
      <h3><Coins size={17} /> Devises supportees</h3>
      <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>Devises actives dans l'application (factures, paiements, baux) · {activeCount} active(s)</p>

      <label className="immo-search" style={{ width: "100%", marginTop: 10 }}>
        <Search size={16} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une devise (code, nom, symbole)..." />
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={allPicked} onChange={toggleAll} /> Tout selectionner
        </label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-sm" disabled={busy || picked.size === 0} onClick={() => bulk("true")}>Activer la selection</button>
          <button className="btn btn-sm" disabled={busy || picked.size === 0} onClick={() => bulk("false")}>Desactiver la selection</button>
        </div>
      </div>

      {msg && <div style={{ fontSize: 12, marginTop: 8, color: msg.type === "err" ? "#dc2626" : "#059669" }}>{msg.text}</div>}

      <div style={{ marginTop: 10, maxHeight: 320, overflow: "auto", border: "1px solid var(--ink-200, #e4e4e7)", borderRadius: 10 }}>
        {filtered.map((c) => (
          <div key={c.id} className="currency-row">
            <input type="checkbox" checked={picked.has(c.id)} onChange={() => togglePick(c.id)} />
            <span className="currency-badge">{c.symbol || c.code}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{c.code} — {c.name}</div>
              <div className="muted" style={{ fontSize: 11 }}>{c.active ? "Devise active" : "Desactivee"}</div>
            </div>
            <span className={`chip ${c.active ? "chip-emerald" : "chip-ink"}`} style={{ marginRight: 6 }}>{c.active ? "Active" : "Inactive"}</span>
            <button type="button" className={`switch ${c.active ? "on" : ""}`} onClick={() => setOne(c)} aria-label="Basculer">
              <span />
            </button>
          </div>
        ))}
        {filtered.length === 0 && <div className="muted" style={{ padding: 16, fontSize: 13 }}>Aucune devise.</div>}
      </div>
    </section>
  );
}

const MESSAGE_EVENTS = [
  ["tenant_onboarding", "Inscription locataire"],
  ["lease_created", "Bail créé / signé"],
  ["payment_received", "Paiement reçu / quittance"],
  ["payment_reminder", "Rappel de loyer / retard"],
  ["custom", "Autre / personnalisé"],
];
const eventLabel = (ev) => (MESSAGE_EVENTS.find(([v]) => v === ev) || [, ev || "—"])[1];
const emptyMessage = { name: "", eventType: "tenant_onboarding", subject: "", body: "" };

// Exemples prêts à l'emploi, repris du wording utilisé dans le CRM
// (email d'inscription + rappel de retard) et adaptés aux placeholders Domus :
// {firstName} {tenantName} {url} {reference} {amount}.
// ⚠️ Le même texte sert d'EMAIL et de SMS : on garde donc du texte brut, court
// et d'un seul bloc (pas de HTML ni de longs sauts de ligne qui gonflent un SMS).
const DEFAULT_MESSAGES = [
  {
    name: "Lien d'inscription locataire",
    eventType: "tenant_onboarding",
    subject: "Votre lien d'inscription locataire",
    body:
      "Bonjour {firstName}, complétez votre dossier locataire Domus via ce lien : {url}. " +
      "Merci de le faire dès que possible. — Votre gestionnaire",
  },
  {
    name: "Confirmation de bail",
    eventType: "lease_created",
    subject: "Votre bail {reference} est confirmé",
    body:
      "Bonjour {tenantName}, votre bail {reference} est confirmé (loyer mensuel : {amount}). " +
      "Consultez et signez votre contrat ici : {url}. Merci de votre confiance. — Votre gestionnaire",
  },
  {
    name: "Quittance / paiement reçu",
    eventType: "payment_received",
    subject: "Paiement reçu — bail {reference}",
    body:
      "Bonjour {tenantName}, nous confirmons la réception de votre paiement de {amount} " +
      "pour le bail {reference}. Votre quittance est disponible. Merci ! — Votre gestionnaire",
  },
  {
    name: "Rappel de loyer en retard",
    eventType: "payment_reminder",
    subject: "Rappel : loyer en retard — bail {reference}",
    body:
      "Bonjour {tenantName}, le loyer du bail {reference} ({amount}) est en retard. " +
      "Merci de régulariser dès que possible afin d'éviter l'annulation de votre contrat de location. " +
      "Pour tout règlement ou question, contactez-nous. Merci de votre compréhension. — Votre gestionnaire",
  },
];

function MessagesCard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.messageTemplates();
      const list = Array.isArray(data) ? data : (data?.templates || data?.data || []);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    setBusy(true);
    setMsg(null);
    try {
      const payload = { name: form.name.trim(), subject: form.subject.trim(), body: form.body, eventType: form.eventType };
      if (form.id) await api.updateMessageTemplate(form.id, payload);
      else await api.createMessageTemplate(payload);
      setEditing(null);
      await load();
      setMsg({ type: "ok", text: "Message enregistre." });
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const remove = async (t) => {
    if (!window.confirm(`Supprimer le message « ${t.name} » ?`)) return;
    try {
      await api.deleteMessageTemplate(t.id);
      await load();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  };
  const seedExamples = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const existing = new Set(rows.map((r) => r.eventType));
      const toCreate = DEFAULT_MESSAGES.filter((m) => !existing.has(m.eventType));
      for (const m of toCreate) {
        // eslint-disable-next-line no-await-in-loop
        await api.createMessageTemplate(m);
      }
      await load();
      setMsg({ type: "ok", text: `${toCreate.length} exemple(s) genere(s). Vous pouvez les modifier.` });
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const hasMissingDefaults = DEFAULT_MESSAGES.some((m) => !rows.some((r) => r.eventType === m.eventType));

  return (
    <section className="card settings-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}><MessageSquare size={17} /> Messages &amp; notifications</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {hasMissingDefaults && (
            <button className="btn btn-sm" onClick={seedExamples} disabled={busy} title="Crée des modèles d'exemple prêts à l'emploi">
              <Sparkles size={14} /> Générer des exemples
            </button>
          )}
          <button className="btn btn-sm" onClick={() => setEditing({ ...emptyMessage })}><Plus size={14} /> Nouveau message</button>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        Personnalisez les messages envoyes par email et SMS (inscription, bail, paiement, retard). Gardez un texte court et sans mise en forme : le meme contenu sert d'email et de SMS. Placeholders : {"{firstName}"}, {"{tenantName}"}, {"{url}"}, {"{reference}"}, {"{amount}"} (montant avec devise, ex. « 620000 FC »).
      </p>

      {msg && <div style={{ fontSize: 12, marginTop: 8, color: msg.type === "err" ? "#dc2626" : "#059669" }}>{msg.text}</div>}

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {loading && <div className="muted" style={{ fontSize: 13 }}>Chargement…</div>}
        {!loading && rows.length === 0 && (
          <div className="muted" style={{ fontSize: 13, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, padding: "6px 0" }}>
            <span>Aucun message configuré. Générez les exemples prêts à l'emploi, puis personnalisez-les.</span>
            <button className="btn btn-sm btn-primary" onClick={seedExamples} disabled={busy}>
              <Sparkles size={14} /> {busy ? "Génération…" : "Générer des exemples"}
            </button>
          </div>
        )}
        {rows.map((t) => (
          <div key={t.id} className="currency-row" style={{ alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name || "(sans nom)"}</div>
              <div className="muted" style={{ fontSize: 11 }}>{eventLabel(t.eventType)} · {t.subject || "sans objet"}</div>
            </div>
            <button type="button" className="btn btn-sm" onClick={() => setEditing({ id: t.id, name: t.name || "", eventType: t.eventType || "custom", subject: t.subject || "", body: t.body || "" })}><Pencil size={13} /></button>
            <button type="button" className="btn btn-sm" style={{ color: "#dc2626" }} onClick={() => remove(t)}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      {editing && (
        <MessageEditorModal value={editing} busy={busy} onClose={() => setEditing(null)} onSave={save} />
      )}
    </section>
  );
}

function MessageEditorModal({ value, busy, onClose, onSave }) {
  const [form, setForm] = useState(value);
  const set = (patch) => setForm((c) => ({ ...c, ...patch }));
  const canSave = form.name.trim() && form.subject.trim() && form.body.trim();
  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={() => !busy && onClose()} />
      <div className="modal-card domus-template-modal">
        <div className="modal-head">
          <div className="domus-modal-title">
            <span className="domus-modal-title-icon"><MessageSquare size={20} /></span>
            <div>
              <h2>{form.id ? "Modifier le message" : "Nouveau message"}</h2>
              <p>Message envoye au locataire selon l'evenement</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="domus-template-form">
          <div className="domus-property-form-grid">
            <label className="domus-property-field">
              <span>Nom <b>*</b></span>
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="ex. Rappel de loyer" />
            </label>
            <label className="domus-property-field">
              <span>Evenement <b>*</b></span>
              <select value={form.eventType} onChange={(e) => set({ eventType: e.target.value })}>
                {MESSAGE_EVENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <label className="domus-property-field">
            <span>Objet (email) <b>*</b></span>
            <input value={form.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="ex. Votre loyer est en retard" />
          </label>
          <label className="domus-property-field">
            <span>Contenu du message <b>*</b> <em style={{ color: "#94a3b8", fontWeight: 400 }}>(HTML accepte)</em></span>
            <textarea
              className="domus-template-body"
              value={form.body}
              onChange={(e) => set({ body: e.target.value })}
              placeholder={"Bonjour {tenantName},\n\nNous vous rappelons que votre loyer (bail {reference}) est en retard.\n\nCordialement."}
            />
          </label>
        </div>
        <div className="domus-modal-footer">
          <button type="button" className="domus-modal-cancel" onClick={onClose} disabled={busy}>Annuler</button>
          <button type="button" className="domus-modal-submit" onClick={() => onSave(form)} disabled={busy || !canSave}>
            <Check size={14} /> {busy ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberingCard({ setting, currencies, onSaved }) {
  const [form, setForm] = useState({
    invoicePrefix: setting?.invoicePrefix ?? "INV-",
    leasePrefix: setting?.leasePrefix ?? "LEASE-",
    defaultVatRate: setting?.defaultVatRate ?? 16,
    defaultPaymentTermDays: setting?.defaultPaymentTermDays ?? 14,
    currencyId: setting?.currencyId ?? setting?.currency?.id ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const currencyOptions = useMemo(() => {
    const list = Array.isArray(currencies?.getAllCurrency) ? currencies.getAllCurrency : Array.isArray(currencies) ? currencies : [];
    const active = list.filter((c) => c?.status === true || c?.status === "true" || c?.status === undefined);
    return buildCurrencyOptions(active);
  }, [currencies]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await api.updateSetting({
        invoicePrefix: form.invoicePrefix,
        leasePrefix: form.leasePrefix,
        defaultVatRate: Number(form.defaultVatRate) || 0,
        defaultPaymentTermDays: Number(form.defaultPaymentTermDays) || 0,
        ...(form.currencyId ? { currencyId: Number(form.currencyId) } : {}),
      });
      setMsg({ type: "ok", text: "Parametres enregistres." });
      onSaved?.();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card settings-card">
      <h3><Hash size={17} /> Numerotation &amp; facturation</h3>
      <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>Format de numerotation des factures et baux, TVA et echeance par defaut</p>

      <div className="numbering-grid">
        <label className="domus-property-field">
          <span>Prefixe facture</span>
          <input value={form.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} placeholder="INV-" />
        </label>
        <label className="domus-property-field">
          <span>Prefixe bail</span>
          <input value={form.leasePrefix} onChange={(e) => set("leasePrefix", e.target.value)} placeholder="LEASE-" />
        </label>
        <label className="domus-property-field">
          <span>TVA (%)</span>
          <input type="number" min="0" value={form.defaultVatRate} onChange={(e) => set("defaultVatRate", e.target.value)} />
        </label>
        <label className="domus-property-field">
          <span>Echeance par defaut (jours)</span>
          <input type="number" min="0" value={form.defaultPaymentTermDays} onChange={(e) => set("defaultPaymentTermDays", e.target.value)} />
        </label>
        {currencyOptions.length > 0 && (
          <label className="domus-property-field">
            <span>Devise par defaut</span>
            <select value={form.currencyId ?? ""} onChange={(e) => set("currencyId", e.target.value)}>
              <option value="">—</option>
              {currencyOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? "Enregistrement..." : <><Save size={15} /> Enregistrer</>}
        </button>
        {msg && <span style={{ fontSize: 12, color: msg.type === "err" ? "#dc2626" : "#059669", display: "inline-flex", alignItems: "center", gap: 5 }}>
          {msg.type === "ok" && <Check size={14} />}{msg.text}
        </span>}
      </div>
    </section>
  );
}
