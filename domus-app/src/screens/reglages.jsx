import { useEffect, useMemo, useRef, useState } from "react";
import {
  Globe2, WalletCards, Smartphone, Hash, Search, Check, Save, Coins,
  MessageSquare, Plus, Pencil, Trash2, X, Sparkles, CreditCard, UserRound,
  Files, FilePen, FilePlus, Eye, HardHat, Info, Clock,
} from "lucide-react";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import {
  DEVICE_MODES, useApi, decodeCurrencyText, cleanCurrencySymbol, buildCurrencyOptions,
  paymentMethodRows, PAYMENT_PRESETS, PAYMENT_PRESET_NAMES, PAYMENT_PRESET_BY_NAME,
} from "../data.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { LandlordSignatureCard } from "./landlordSignature.jsx";
import { DomusPhoneField } from "../components/PhoneField.jsx";
import { useConfirm } from "../components/Dialog.jsx";
import { TEMPLATE_TYPE_LABEL, hasHtmlMarkup, escapeHtml } from "../contractUtils.js";
import { sanitizeHtml } from "../sanitizeHtml.js";

async function loadConfig() {
  // status=all → toutes les devises (actives + inactives) pour la liste « Devises supportees ».
  const [setting, currencies, paymentMethods, subAccounts, contractTemplates] = await Promise.all([
    api.setting(),
    api.allCurrencies(),
    api.paymentMethods().catch(() => []),
    api.subAccounts().catch(() => []),
    api.contractTemplates().catch(() => []),
  ]);
  return { setting, currencies, paymentMethods, subAccounts, contractTemplates };
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

function SettingsGroup({ id, label, cols = 1, children }) {
  return (
    <div className="settings-group" id={id}>
      <h2 className="settings-group-label">{label}</h2>
      <div className="settings-grid" data-cols={cols}>{children}</div>
    </div>
  );
}

// Raccourcis affiches en tete de Réglages : certains naviguent vers un autre
// ecran (go), d'autres font defiler jusqu'a une carte de cette page (anchor).
function scrollToAnchor(id) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const SETTINGS_SHORTCUTS = [
  { key: "delegues", label: "Délégués", icon: UserRound, kind: "go", target: "delegues" },
  { key: "sous-traitants", label: "Sous-traitants", icon: HardHat, kind: "go", target: "sous-traitants" },
  { key: "devises", label: "Devises", icon: Coins, kind: "anchor", target: "reglages-devises" },
  { key: "paiement", label: "Moyens de paiement", icon: CreditCard, kind: "anchor", target: "reglages-devises" },
  { key: "numerotation", label: "Numérotation", icon: Hash, kind: "anchor", target: "reglages-devises" },
  { key: "identite", label: "Identité du bailleur", icon: UserRound, kind: "anchor", target: "reglages-contrats" },
  { key: "signature", label: "Signature du bailleur", icon: FilePen, kind: "anchor", target: "reglages-contrats" },
  { key: "messages", label: "Messages & notifications", icon: MessageSquare, kind: "anchor", target: "reglages-contrats" },
  { key: "modeles", label: "Modèles de contrat", icon: Files, kind: "anchor", target: "reglages-contrats" },
  { key: "apropos", label: "À propos", icon: Info, kind: "anchor", target: "reglages-apropos" },
];

function SettingsShortcuts({ go }) {
  return (
    <div className="settings-shortcuts card">
      <h3 className="settings-shortcuts-title">{t("Accès rapide")}</h3>
      <div className="settings-shortcuts-grid">
        {SETTINGS_SHORTCUTS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              type="button"
              className="settings-shortcut-tile"
              onClick={() => (s.kind === "go" ? go?.(s.target) : scrollToAnchor(s.target))}
            >
              <Icon size={18} />
              <span>{t(s.label)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Reglages({ device, go }) {
  const { data, loading, error, reload } = useApi(loadConfig, []);

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  const activeMethods = paymentMethodRows(data?.paymentMethods).filter((m) => m.active);

  return (
    <div className="settings-layout">
      <div className="immo-header">
        <div>
          <h1>{t("Reglages")}</h1>
          <p>{t("Devises, facturation et configuration du module")}</p>
        </div>
      </div>

      <div className="settings-hero card">
        <div>
          <span className="chip chip-iris"><Globe2 size={12} /> {t("App locative")}</span>
          <h3>{t("Domus est connecte au CRM NgoluApp")}</h3>
          <p>{t("Devises, numerotation et parametres sont partages avec la session principale (meme API).")}</p>
        </div>
        <div className="settings-mini">
          <WalletCards size={20} />
          <b>{tf("{n} moyen(s) de paiement", {n: activeMethods.length})}</b>
          <span>{activeMethods.map((m) => m.name).slice(0, 4).join(", ") || t("Aucun configuré")}</span>
        </div>
        <div className="settings-mini">
          <Smartphone size={20} />
          <b>{t("PWA / mobile")}</b>
          <span>{tf("Device {mode}", {mode: device?.mode || "auto"})}</span>
        </div>
      </div>

      <SettingsShortcuts go={go} />

      <SettingsGroup id="reglages-devises" label={t("Devises & facturation")}>
        <CurrenciesCard initial={data?.currencies} onChanged={reload} />
        <PaymentMethodsCard initial={data?.paymentMethods} subAccounts={data?.subAccounts} onChanged={reload} />
        <NumberingCard setting={data?.setting} currencies={data?.currencies} onSaved={reload} />
      </SettingsGroup>

      <SettingsGroup id="reglages-contrats" label={t("Contrats & communication")} cols={2}>
        <LandlordInfoCard setting={data?.setting} onSaved={reload} />
        <LandlordSignatureCard setting={data?.setting} onSaved={reload} />
        <MessagesCard />
        <OverdueGraceCard setting={data?.setting} onSaved={reload} />
        <RemindersCard setting={data?.setting} onSaved={reload} />
        <TemplatesCard initial={data?.contractTemplates} onChanged={reload} />
      </SettingsGroup>

      {device && (
        <SettingsGroup id="reglages-device" label={t("Affichage & application")}>
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
        </SettingsGroup>
      )}

      <SettingsGroup id="reglages-apropos" label="À propos">
        <AboutCard />
      </SettingsGroup>
    </div>
  );
}

// Carte « À propos » — version applicative (source unique monorepo) + dernière mise à jour.
function AboutCard() {
  const base = import.meta.env.VITE_APP_BASE_VERSION || "—";
  const build = import.meta.env.VITE_APP_BUILD_VERSION || base;
  const commit = import.meta.env.VITE_APP_COMMIT || "—";
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const env = /dev\.|localhost|127\.0\.0\.1/.test(host) ? "dev" : "prod";
  const buildDate = import.meta.env.VITE_APP_BUILD_DATE;
  const lastUpdate = buildDate
    ? new Date(buildDate).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
    : "—";
  return (
    <section className="card settings-card">
      <h3>À propos</h3>
      <div className="setting-row"><span>Version</span><b>v{base}</b></div>
      <div className="setting-row"><span>Build</span><b>{build}</b></div>
      <div className="setting-row"><span>Commit</span><b>{commit}</b></div>
      <div className="setting-row"><span>Dernière mise à jour</span><b>{lastUpdate}</b></div>
      <div className="setting-row"><span>Environnement</span><b>{env}</b></div>
    </section>
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

// Catégories proposées à l'utilisateur → sous-compte comptable cible.
// Mobile money / banque / carte / portefeuille / chèque sont rattachés au
// sous-compte « Bank » (trésorerie hors caisse) ; espèces au sous-compte « Cash ».
const PM_CATEGORIES = [
  { value: "cash", label: "Espèces", sub: "Cash" },
  { value: "mobile", label: "Mobile money", sub: "Bank" },
  { value: "bank", label: "Banque / virement", sub: "Bank" },
  { value: "card", label: "Carte", sub: "Bank" },
  { value: "wallet", label: "Portefeuille / en ligne", sub: "Bank" },
  { value: "cheque", label: "Chèque", sub: "Bank" },
];

// Résout l'id du sous-compte par nom (Cash / Bank) ; repli 1 (Cash) / 2 (Bank).
function resolveSubId(subAccounts, subName) {
  const list = Array.isArray(subAccounts) ? subAccounts : [];
  const found = list.find((s) => String(s?.name || "").toLowerCase() === subName.toLowerCase());
  return found?.id ?? (subName.toLowerCase() === "cash" ? 1 : 2);
}

function PaymentMethodsCard({ initial, subAccounts, onChanged }) {
  const [rows, setRows] = useState(() => paymentMethodRows(initial));
  const [name, setName] = useState("");
  const [cat, setCat] = useState("mobile");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => { setRows(paymentMethodRows(initial)); }, [initial]);

  // Saisie du nom : si elle correspond à un moyen du catalogue, on pré-règle la catégorie.
  const onName = (v) => {
    setName(v);
    const preset = PAYMENT_PRESET_BY_NAME[v.trim().toLowerCase()];
    if (preset) setCat(preset.cat);
  };

  const add = async () => {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const cm = PM_CATEGORIES.find((c) => c.value === cat) || PM_CATEGORIES[0];
      await api.createPaymentMethod({ methodName: n, subAccountId: resolveSubId(subAccounts, cm.sub) });
      setName("");
      setMsg({ type: "ok", text: `« ${n} » ajouté.` });
      onChanged?.();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (m) => {
    if (m.locked && m.active) return; // la méthode par défaut (Cash) reste active
    const next = m.active ? "false" : "true";
    setRows((prev) => prev.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)));
    try {
      await api.setPaymentMethodStatus(m.id, next);
      onChanged?.();
    } catch (e) {
      setRows((prev) => prev.map((x) => (x.id === m.id ? { ...x, active: m.active } : x)));
      setMsg({ type: "err", text: e.message });
    }
  };

  const openEdit = (m) => setEditing({
    id: m.id,
    methodName: m.name,
    ownerAccount: m.ownerAccount || "",
    instruction: m.instruction || "",
    cat: m.mobile ? "mobile" : (m.subAccount?.toLowerCase() === "cash" ? "cash" : "bank"),
  });

  const saveEdit = async (form) => {
    setBusy(true);
    setMsg(null);
    try {
      const cm = PM_CATEGORIES.find((c) => c.value === form.cat) || PM_CATEGORIES[0];
      await api.updatePaymentMethod(form.id, {
        methodName: form.methodName.trim(),
        subAccountId: resolveSubId(subAccounts, cm.sub),
        ownerAccount: form.ownerAccount?.trim() || null,
        instruction: form.instruction?.trim() || null,
      });
      setEditing(null);
      setMsg({ type: "ok", text: "Moyen de paiement mis à jour." });
      onChanged?.();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card settings-card">
      <h3><CreditCard size={17} /> Moyens de paiement</h3>
      <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
        Méthodes proposées à l'encaissement (espèces, mobile money, banque, cartes, portefeuilles…). Partagées avec le CRM. Le badge « mobile » affiche un champ numéro lors du paiement.
      </p>

      <div className="pm-add">
        <input
          list="pm-presets"
          value={name}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Choisir ou saisir (M-Pesa, Airtel Money, Orange Money, MTN MoMo, Wave…)"
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          {PM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button className="btn btn-sm btn-primary" onClick={add} disabled={busy || !name.trim()}>
          <Plus size={14} /> Ajouter
        </button>
      </div>
      <datalist id="pm-presets">
        {PAYMENT_PRESETS.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map((it) => <option key={it.name} value={it.name} />)}
          </optgroup>
        ))}
      </datalist>
      <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
        {PAYMENT_PRESET_NAMES.length}+ moyens préconfigurés (mobile money mondial, cartes, portefeuilles). Saisissez un nom libre pour un moyen non listé.
      </p>

      {msg && <div style={{ fontSize: 12, marginTop: 8, color: msg.type === "err" ? "#dc2626" : "#059669" }}>{msg.text}</div>}

      <div style={{ marginTop: 10, border: "1px solid var(--ink-200, #e4e4e7)", borderRadius: 10, overflow: "hidden" }}>
        {rows.map((m) => (
          <div key={m.id} className="currency-row">
            <span className="currency-badge" style={{ background: m.color, color: "#fff" }}>{m.short}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                {m.name}
                {m.mobile && <span className="chip chip-iris" style={{ fontSize: 10 }}>mobile</span>}
              </div>
              <div className="muted" style={{ fontSize: 11 }}>
                {m.subAccount || "—"}{m.ownerAccount ? ` · ${m.ownerAccount}` : ""}{m.locked ? " · par défaut" : ""}
              </div>
            </div>
            <span className={`chip ${m.active ? "chip-emerald" : "chip-ink"}`} style={{ marginRight: 6 }}>{m.active ? "Actif" : "Inactif"}</span>
            {!m.locked && (
              <button type="button" className="btn btn-sm" onClick={() => openEdit(m)} title="Configurer"><Pencil size={13} /></button>
            )}
            <button
              type="button"
              className={`switch ${m.active ? "on" : ""}`}
              onClick={() => toggle(m)}
              disabled={m.locked && m.active}
              title={m.locked ? "Méthode par défaut" : "Activer / désactiver"}
              aria-label="Basculer"
            >
              <span />
            </button>
          </div>
        ))}
        {rows.length === 0 && <div className="muted" style={{ padding: 16, fontSize: 13 }}>Aucun moyen de paiement. Ajoutez-en un ci-dessus.</div>}
      </div>

      {editing && (
        <PaymentMethodEditor value={editing} busy={busy} onClose={() => setEditing(null)} onSave={saveEdit} />
      )}
    </section>
  );
}

function PaymentMethodEditor({ value, busy, onClose, onSave }) {
  const [form, setForm] = useState(value);
  const set = (patch) => setForm((c) => ({ ...c, ...patch }));
  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={() => !busy && onClose()} />
      <div className="modal-card domus-template-modal">
        <div className="modal-head">
          <div className="domus-modal-title">
            <span className="domus-modal-title-icon"><CreditCard size={20} /></span>
            <div>
              <h2>Configurer le moyen de paiement</h2>
              <p>Nom, compte destinataire et instructions affichées au paiement</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="domus-template-form">
          <div className="domus-property-form-grid">
            <label className="domus-property-field">
              <span>Nom <b>*</b></span>
              <input list="pm-presets" value={form.methodName} onChange={(e) => set({ methodName: e.target.value })} placeholder="ex. M-Pesa" />
            </label>
            <label className="domus-property-field">
              <span>Catégorie</span>
              <select value={form.cat} onChange={(e) => set({ cat: e.target.value })}>
                {PM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
          </div>
          <label className="domus-property-field">
            <span>Compte / numéro destinataire</span>
            <input value={form.ownerAccount} onChange={(e) => set({ ownerAccount: e.target.value })} placeholder="+243 970 000 000 ou n° de compte / IBAN" />
          </label>
          <label className="domus-property-field">
            <span>Instructions <em style={{ color: "#94a3b8", fontWeight: 400 }}>(affichées au locataire)</em></span>
            <textarea
              className="domus-template-body"
              value={form.instruction}
              onChange={(e) => set({ instruction: e.target.value })}
              placeholder={"Ex. Composer *150*1# puis confirmer le paiement avec votre code secret."}
            />
          </label>
        </div>
        <div className="domus-modal-footer">
          <button type="button" className="domus-modal-cancel" onClick={onClose} disabled={busy}>Annuler</button>
          <button type="button" className="domus-modal-submit" onClick={() => onSave(form)} disabled={busy || !form.methodName.trim()}>
            <Check size={14} /> {busy ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

const MESSAGE_EVENTS = [
  ["tenant_onboarding", "Inscription locataire"],
  ["lease_created", "Bail créé / signé"],
  ["contract_signed", "Bienvenue / contrat signé"],
  ["payment_received", "Paiement reçu / quittance"],
  ["payment_reminder", "Rappel de loyer / retard"],
  // Preavis pour defaut de paiement (declenche a la main depuis Loyers, au-dela
  // d'un mois de loyer du) : un texte par destinataire.
  ["default_notice", "Préavis défaut de paiement · locataire"],
  ["default_notice_contact", "Préavis défaut de paiement · personne de contact"],
  ["default_notice_owner", "Propriétaire · préavis défaut de paiement"],
  // Messages adressés au PROPRIÉTAIRE du bien (bailleur), pas au locataire.
  ["tenant_created_owner", "Propriétaire · nouveau dossier locataire"],
  ["lease_created_owner", "Propriétaire · nouveau bail"],
  ["payment_received_owner", "Propriétaire · paiement reçu"],
  ["payment_overdue_owner", "Propriétaire · loyer en retard"],
  ["lease_expiring", "Fin de bail · locataire"],
  ["lease_expiring_owner", "Propriétaire · fin de bail"],
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
      "Bonjour {tenantName}, votre bail {reference} pour {address}, appartement {unit}, est confirmé " +
      "(loyer mensuel : {amount}, bailleur : {landlordName}). " +
      "Consultez et signez votre contrat ici : {url}. Merci de votre confiance. — Votre gestionnaire",
  },
  {
    name: "Bienvenue après signature",
    eventType: "contract_signed",
    subject: "Bienvenue ! Votre bail {reference} est signé et confirmé",
    body:
      "Bonjour {tenantName}, félicitations ! Votre contrat de bail {reference} est bien signé et confirmé. " +
      "Bienvenue dans votre nouveau logement : {address}, appartement {unit}. Votre bailleur est {landlordName}. " +
      "Votre location court du {startDate} au {endDate} ({duration}). " +
      "Merci de votre confiance. Pour toute question, contactez {contacts}. — {companyName}",
  },
  {
    name: "Quittance / paiement reçu",
    eventType: "payment_received",
    subject: "Paiement reçu — bail {reference}",
    body:
      "Bonjour {tenantName}, nous confirmons la réception de votre paiement de {amount} " +
      "pour le bail {reference}. Votre quittance et le detail de vos paiements : {url}. " +
      "Merci ! — Votre gestionnaire",
  },
  {
    name: "Rappel de loyer en retard",
    eventType: "payment_reminder",
    subject: "Rappel : loyer en retard — bail {reference}",
    body:
      "Bonjour {tenantName}, le loyer du bail {reference} ({amount}) est en retard. " +
      "Merci de régulariser dès que possible afin d'éviter l'annulation de votre contrat de location. " +
      "Pour tout règlement ou question, contactez {contacts}. Merci de votre compréhension. — {companyName}",
  },
  {
    name: "Propriétaire — nouveau dossier locataire",
    eventType: "tenant_created_owner",
    subject: "Nouveau dossier locataire",
    body:
      "Nouveau dossier locataire : {tenantName} ({tenantPhone}). " +
      "{profession} chez {employer}, revenu {income}. {maritalStatus} {spouse}. " +
      "{occupants} occupants. Contact : {emergencyContact}.",
  },
  {
    name: "Propriétaire — nouveau bail",
    eventType: "lease_created_owner",
    subject: "Nouveau bail {reference} sur votre bien",
    body:
      "Bail {tenantName}, {unit}. {startDate} au {endDate}. " +
      "Loyer {amount}, caut. {deposit}. {url}",
  },
  {
    name: "Préavis pour défaut de paiement — locataire",
    eventType: "default_notice",
    subject: "Préavis pour défaut de paiement — bail {reference}",
    body:
      "Bonjour {tenantName}, malgré nos rappels, {monthsBehind} mois de loyer restent impayés pour " +
      "{address} (bail {reference}), soit {amount}. Sans régularisation de votre part, un préavis " +
      "pour défaut de paiement sera déposé. Merci de contacter {contacts} sans tarder.",
  },
  {
    name: "Préavis défaut de paiement — personne de contact",
    eventType: "default_notice_contact",
    subject: "Préavis pour défaut de paiement de {tenantName}",
    body:
      "Bonjour, en tant que personne de contact de {tenantName}, nous vous informons que {monthsBehind} mois " +
      "de loyer ({amount}) restent impayés pour {address}. Sans régularisation, un préavis pour défaut de " +
      "paiement sera déposé. Merci de l'inviter à contacter {contacts}.",
  },
  {
    name: "Propriétaire — préavis pour défaut de paiement",
    eventType: "default_notice_owner",
    subject: "Préavis notifié — bail {reference}",
    body:
      "Préavis pour défaut de paiement notifié à {tenantName} ({property}) : " +
      "{monthsBehind} mois impayés, {amount}. {url}",
  },
  {
    name: "Fin de bail — locataire",
    eventType: "lease_expiring",
    subject: "Votre bail se termine le {endDate}",
    body:
      "Bonjour {firstName}, votre bail {address} se termine le {endDate}. " +
      "Pour le renouveler ou nous informer de votre depart, contactez {contacts}.",
  },
  {
    name: "Propriétaire — fin de bail",
    eventType: "lease_expiring_owner",
    subject: "Fin de bail {reference} sur votre bien",
    body:
      "Fin de bail : {tenantName}, {unit} se termine le {endDate}. " +
      "Loyer {amount}. {url}",
  },
  {
    name: "Propriétaire — loyer en retard",
    eventType: "payment_overdue_owner",
    subject: "Loyer en retard — bail {reference}",
    body:
      "Loyer en retard : {tenantName} doit {amount} pour {property}, " +
      "{daysLate} j de retard. {url}",
  },
  {
    name: "Propriétaire — paiement reçu",
    eventType: "payment_received_owner",
    subject: "Paiement reçu — bail {reference}",
    body:
      "Paiement recu : {tenantName} a regle {amount} pour {property}. {url}",
  },
];

function MessagesCard() {
  const confirm = useConfirm();
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
    if (!(await confirm({
      title: "Supprimer le message",
      message: `Supprimer le message « ${t.name} » ?`,
      confirmLabel: "Supprimer",
      danger: true,
    }))) return;
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
        Personnalisez les messages envoyes par email et SMS (inscription, bail, bienvenue apres signature, paiement, retard). Gardez un texte court et sans mise en forme : le meme contenu sert d'email et de SMS. <b>Chaque SMS est limite a 160 caracteres (un seul segment)</b> : au-dela, le texte est coupe automatiquement, le lien etant toujours preserve en entier. Placeholders : {"{firstName}"}, {"{tenantName}"}, {"{url}"}, {"{reference}"}, {"{amount}"} (montant avec devise, ex. « 620000 FC »). Pour le message de bienvenue : {"{address}"} (adresse du logement), {"{startDate}"}, {"{endDate}"}, {"{duration}"} (duree du bail), {"{contacts}"} (proprietaire du bien et gestionnaire qui lui est assigne, avec leurs telephones ; {"{ownerContact}"} et {"{managerContact}"} permettent de n'en citer qu'un), {"{landlordName}"} (nom du proprietaire) et {"{unit}"} (numero d'appartement). Pour les messages au PROPRIETAIRE : {"{ownerName}"} (nom du proprietaire), {"{tenantPhone}"}, {"{deposit}"} (caution) et {"{charges}"}. Pour le nouveau dossier locataire : {"{profession}"}, {"{employer}"}, {"{income}"}, {"{spouse}"} (conjoint si marie), {"{occupants}"}, {"{children}"}, {"{idNumber}"}, {"{nationality}"}, {"{oldLessor}"} et {"{emergencyContact}"} — un champ vide est retire automatiquement du texte. {"{property}"} (nom du bien seul, ex. « Residence Tombalbaye ») n'est disponible que pour le message de paiement recu ; pour le bail, {"{address}"} donne le bien, la rue, la ville et l'appartement. Le message de nouveau dossier locataire ne mentionne aucun bien : a ce stade le locataire n'est encore rattache a rien.
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

const TEMPLATE_TYPE_OPTIONS = [
  ["residential", "Bail résidentiel"],
  ["commercial", "Bail commercial"],
  ["short_term", "Bail court terme / saisonnier"],
];

const CONTRACT_PLACEHOLDER_GROUPS = [
  {
    label: "Bailleur",
    items: [
      "NOM COMPLET DU BAILLEUR",
      "ADRESSE DU BAILLEUR",
      "TÉLÉPHONE DU BAILLEUR",
      "EMAIL DU BAILLEUR",
    ],
  },
  {
    label: "Preneur",
    items: [
      "NOM COMPLET DU PRENEUR",
      "ADRESSE DU PRENEUR",
      "TÉLÉPHONE DU PRENEUR",
      "EMAIL DU PRENEUR",
      "TYPE DE PIÈCE D'IDENTITÉ",
      "NUMÉRO DE PIÈCE D'IDENTITÉ",
    ],
  },
  {
    label: "Logement",
    items: [
      "ADRESSE COMPLÈTE DU LOGEMENT DE LOCATION",
      "TYPE DE LOGEMENT",
      "PROPRIÉTÉ",
      "UNITÉ",
      "RÉFÉRENCE BAIL",
      "VILLE",
    ],
  },
  {
    label: "Dates",
    items: [
      "NUMÉRO DE MOIS",
      "DURÉE DE BAIL EN MOIS",
      "DATE DE DÉBUT DE BAIL",
      "DATE DE DÉBUT DE BAIL JJ/MM/AAAA",
      "DATE DE FIN DE BAIL",
      "DATE DE FIN DE BAIL JJ/MM/AAAA",
      "DATE DE SIGNATURE DE BAIL",
      "DATE DE SIGNATURE DE BAIL JJ/MM/AAAA",
      "DATE DU JOUR",
    ],
  },
  {
    label: "Montants",
    items: [
      "MONTANT DU LOYER AVEC DEVISE",
      "MONTANT DU LOYER",
      "MONTANT GARANTIE AVEC DEVISE",
      "MONTANT GARANTIE",
      "NUMÉRO DE MOIS DE GARANTIE",
      "DEVISE",
      "SYMBOLE DE DEVISE",
      "CODE DE DEVISE",
    ],
  },
  {
    label: "Notes / conditions (optionnel)",
    items: [
      "CONDITIONS PARTICULIÈRES",
      "NOTES ÉTAT DES LIEUX",
    ],
  },
];

// Placeholders facultatifs : insérés dans une section conditionnelle {{#if}}...{{/if}}
// pour que l'article disparaisse du contrat quand le champ du bail est vide.
const OPTIONAL_PLACEHOLDERS = new Set(["CONDITIONS PARTICULIÈRES", "NOTES ÉTAT DES LIEUX"]);

// Dans l'aperçu, on masque les balises de section {{#if ...}}/{{/if}} et on garde
// leur contenu (le rendu réel des blocs conditionnels est fait côté backend).
function templatePreviewHtml(body) {
  const previewBody = (body || "").replace(/\{\{\s*(#if\s+[^{}]+?|\/if)\s*\}\}/g, "");
  return hasHtmlMarkup(previewBody)
    ? previewBody
    : `<pre class="domus-contract-plain">${escapeHtml(previewBody)}</pre>`;
}

function templateLabel(tpl) {
  return tpl?.name || TEMPLATE_TYPE_LABEL[tpl?.type] || "Modèle";
}

// Gestion des modèles de contrat (liste + CRUD) — déplacée depuis l'écran Contrats
// (SCRUM-247) vers Réglages ; le sélecteur « modèle actif par défaut » à la création
// d'un contrat reste dans contrats.jsx et charge les modèles séparément.
function TemplatesCard({ initial, onChanged }) {
  const confirm = useConfirm();
  const [templates, setTemplates] = useState(() => (Array.isArray(initial) ? initial : []));
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const [editing, setEditing] = useState(null);
  const [previewing, setPreviewing] = useState(null);

  useEffect(() => { setTemplates(Array.isArray(initial) ? initial : []); }, [initial]);

  const reloadTemplates = async () => {
    try {
      const list = await api.contractTemplates();
      setTemplates(Array.isArray(list) ? list : []);
      onChanged?.();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  };

  const openEditor = async (tpl) => {
    setMsg(null);
    try {
      const full = await api.contractTemplate(tpl.id);
      setEditing({ id: full.id, name: full.name || "", type: full.type || "residential", description: full.description || "", body: full.body || "", isActive: Boolean(full.isActive) });
    } catch {
      setEditing({ id: tpl.id, name: tpl.name || "", type: tpl.type || "residential", description: tpl.description || "", body: tpl.body || "", isActive: Boolean(tpl.isActive) });
    }
  };

  const activate = async (tpl) => {
    setBusy(`tpl-activate-${tpl.id}`);
    setMsg(null);
    try {
      await api.activateContractTemplate(tpl.id);
      await reloadTemplates();
    } catch (e) {
      setMsg({ type: "err", text: e.message || "Impossible d'activer le modèle." });
    } finally {
      setBusy("");
    }
  };

  const remove = async (tpl) => {
    if (!(await confirm({
      title: "Supprimer le modèle",
      message: `Supprimer le modèle « ${tpl.name} » ?`,
      confirmLabel: "Supprimer",
      danger: true,
    }))) return;
    setBusy(`tpl-del-${tpl.id}`);
    setMsg(null);
    try {
      await api.deleteContractTemplate(tpl.id);
      await reloadTemplates();
    } catch (e) {
      setMsg({ type: "err", text: e.message || "Impossible de supprimer le modèle." });
    } finally {
      setBusy("");
    }
  };

  const save = async (form) => {
    setBusy("tpl-save");
    setMsg(null);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        body: form.body,
        description: form.description?.trim() || undefined,
        isActive: Boolean(form.isActive),
      };
      if (form.id) await api.updateContractTemplate(form.id, payload);
      else await api.createContractTemplate(payload);
      setEditing(null);
      await reloadTemplates();
    } catch (e) {
      setMsg({ type: "err", text: e.message || "Impossible d'enregistrer le modèle." });
    } finally {
      setBusy("");
    }
  };

  const openPreview = async (tpl) => {
    setMsg(null);
    try {
      const full = await api.contractTemplate(tpl.id);
      setPreviewing({ name: full.name || tpl.name, body: full.body || "" });
    } catch {
      setPreviewing({ name: tpl.name, body: tpl.body || "" });
    }
  };

  return (
    <section className="card settings-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}><Files size={17} /> Modèles de contrat</h3>
        <button className="btn btn-sm" onClick={() => setEditing({ name: "", type: "residential", description: "", body: "", isActive: false })}>
          <FilePlus size={14} /> Nouveau
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        Placeholders disponibles : [NOM COMPLET DU BAILLEUR], [NOM COMPLET DU PRENEUR], [ADRESSE COMPLÈTE DU LOGEMENT DE LOCATION], [MONTANT DU LOYER AVEC DEVISE], etc.
      </p>

      {msg && <div style={{ fontSize: 12, marginTop: 8, color: msg.type === "err" ? "#dc2626" : "#059669" }}>{msg.text}</div>}

      <div className="contrats-template-list" style={{ marginTop: 10 }}>
        {templates.length === 0 && (
          <p className="muted" style={{ fontSize: 13 }}>Aucun modèle configuré.</p>
        )}
        {templates.map((tpl) => (
          <div key={tpl.id} className={`contrats-template-card ${tpl.isActive ? "" : "inactive"}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{tpl.name}</span>
              <span className={`chip ${tpl.isActive ? "chip-emerald" : "chip-ink"}`} style={{ marginLeft: "auto" }}>
                {tpl.isActive ? "Actif" : "Inactif"}
              </span>
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              {TEMPLATE_TYPE_LABEL[tpl.type] || tpl.type} · v{tpl.version || 1}
              {tpl.updatedAt ? ` · MAJ ${new Date(tpl.updatedAt).toLocaleDateString("fr-FR")}` : ""}
            </div>
            <div className="contrats-template-actions">
              <button type="button" disabled={Boolean(busy)} onClick={() => openPreview(tpl)}><Eye size={12} /> Aperçu</button>
              <button type="button" disabled={Boolean(busy)} onClick={() => openEditor(tpl)}><FilePen size={12} /> Modifier</button>
              {!tpl.isActive && <button type="button" disabled={Boolean(busy)} onClick={() => activate(tpl)}><Check size={12} /> Activer</button>}
              <button type="button" className="danger" disabled={Boolean(busy) || tpl.isActive} title={tpl.isActive ? "Impossible de supprimer le modèle actif" : "Supprimer"} onClick={() => remove(tpl)}><X size={12} /> Suppr.</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <TemplateModal value={editing} busy={busy === "tpl-save"} onClose={() => setEditing(null)} onSave={save} />
      )}
      {previewing && (
        <TemplatePreviewModal value={previewing} onClose={() => setPreviewing(null)} />
      )}
    </section>
  );
}

// Aperçu en lecture seule du contenu HTML d'un modèle (depuis la carte de liste).
function TemplatePreviewModal({ value, onClose }) {
  const previewHtml = templatePreviewHtml(value?.body);
  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-card domus-template-modal">
        <div className="modal-head">
          <div className="domus-modal-title">
            <span className="domus-modal-title-icon"><Eye size={20} /></span>
            <div>
              <h2>Aperçu du modèle</h2>
              <p>{value?.name || "Modèle"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Fermer")}><X size={18} /></button>
        </div>
        <div className="domus-template-form">
          <div className="domus-template-preview" dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }} />
        </div>
        <div className="domus-modal-footer">
          <button type="button" className="domus-modal-cancel" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

function TemplateModal({ value, busy, onClose, onSave }) {
  const [form, setForm] = useState(value);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef(null);
  const set = (patch) => setForm((c) => ({ ...c, ...patch }));
  const canSave = form.name.trim() && form.body.trim() && form.type;
  const insertPlaceholder = (name) => {
    const token = OPTIONAL_PLACEHOLDERS.has(name) ? `{{#if ${name}}}[${name}]{{/if}}` : `[${name}]`;
    const textarea = textareaRef.current;
    setShowPreview(false);
    setForm((current) => {
      const body = current.body || "";
      const start = textarea ? textarea.selectionStart : body.length;
      const end = textarea ? textarea.selectionEnd : body.length;
      const insert = textarea ? token : `${body ? "\n" : ""}${token}`;
      const nextBody = `${body.slice(0, start)}${insert}${body.slice(end)}`;
      const nextCaret = start + insert.length;
      requestAnimationFrame(() => {
        const nextTextarea = textareaRef.current;
        if (!nextTextarea) return;
        nextTextarea.focus();
        nextTextarea.setSelectionRange(nextCaret, nextCaret);
      });
      return { ...current, body: nextBody };
    });
  };
  const previewHtml = templatePreviewHtml(form.body);
  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={() => !busy && onClose()} />
      <div className="modal-card domus-template-modal">
        <div className="modal-head">
          <div className="domus-modal-title">
            <span className="domus-modal-title-icon"><FilePen size={20} /></span>
            <div>
              <h2>{form.id ? "Modifier le modèle" : "Nouveau modèle"}</h2>
              <p>Contenu du contrat avec placeholders (ex. [MONTANT DU LOYER AVEC DEVISE])</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Fermer")}><X size={18} /></button>
        </div>
        <div className="domus-template-form">
          <div className="domus-property-form-grid">
            <label className="domus-property-field">
              <span>Nom <b>*</b></span>
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="ex. Bail résidentiel standard" />
            </label>
            <label className="domus-property-field">
              <span>Type <b>*</b></span>
              <select value={form.type} onChange={(e) => set({ type: e.target.value })}>
                {TEMPLATE_TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <label className="domus-property-field">
            <span>Description</span>
            <input value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Optionnel" />
          </label>
          <div className="domus-template-body-head">
            <span>Contenu du contrat <b>*</b> <em>(HTML accepté)</em></span>
            <button type="button" className="immo-link" onClick={() => setShowPreview((v) => !v)}>
              <Eye size={14} /> {showPreview ? "Éditer" : "Aperçu"}
            </button>
          </div>
          <div className="domus-placeholder-panel" aria-label="Placeholders disponibles">
            {CONTRACT_PLACEHOLDER_GROUPS.map((group) => (
              <div className="domus-placeholder-group" key={group.label}>
                <div className="domus-placeholder-label">{group.label}</div>
                <div className="domus-placeholder-list">
                  {group.items.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => insertPlaceholder(item)}
                      title={`Insérer [${item}]`}
                    >
                      [{item}]
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {showPreview ? (
            <div className="domus-template-preview" dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }} />
          ) : (
            <textarea
              ref={textareaRef}
              className="domus-template-body"
              value={form.body}
              onChange={(e) => set({ body: e.target.value })}
              placeholder={"CONTRAT DE BAIL\nARTICLE 1 : ...\n[NOM COMPLET DU PRENEUR], [ADRESSE COMPLÈTE DU LOGEMENT DE LOCATION], [MONTANT DU LOYER AVEC DEVISE]...\n\nHTML possible : <h2>Titre</h2> <b>gras</b> <ul><li>...</li></ul>"}
            />
          )}
          <label className="domus-template-active">
            <input type="checkbox" checked={Boolean(form.isActive)} onChange={(e) => set({ isActive: e.target.checked })} />
            <span>Définir comme modèle actif pour ce type</span>
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

// Identité du bailleur pour les contrats — distincte du nom de l'entreprise
// (remplace [NOM COMPLET DU BAILLEUR] / [TÉLÉPHONE DU BAILLEUR] à la génération).
function LandlordInfoCard({ setting, onSaved }) {
  const [name, setName] = useState(setting?.landlordName || "");
  const [phone, setPhone] = useState(setting?.landlordPhone || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await api.updateSetting({ landlordName: name, landlordPhone: phone });
      setMsg({ type: "ok", text: "Identite du bailleur enregistree." });
      onSaved?.();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card settings-card">
      <h3><UserRound size={17} /> {t("Identite du bailleur")}</h3>
      <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
        {t("Nom et telephone utilises dans les contrats de bail. Si vide, le nom de l'entreprise est utilise.")}
      </p>
      <label className="domus-property-field">
        <span>{t("Nom du bailleur")}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={setting?.companyName || "ex. Jean Mukendi"} />
      </label>
      <DomusPhoneField label={t("Telephone du bailleur")} value={phone} onChange={setPhone} />
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

function OverdueGraceCard({ setting, onSaved }) {
  const [days, setDays] = useState(setting?.rentOverdueGraceDays ?? 5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const save = async () => {
    const n = Number(days);
    if (days === "" || !Number.isInteger(n) || n < 0 || n > 60) {
      setMsg({ type: "err", text: "Saisissez un nombre entier de jours entre 0 et 60." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await api.updateSetting({ rentOverdueGraceDays: n });
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
      <h3><Clock size={17} /> Retards de loyer</h3>
      <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
        Un loyer est considere en retard (badges « En retard » et « Mauvais payeur ») lorsqu&apos;il reste impaye plus de ce nombre de jours apres son echeance.
        Le changement recalcule aussi les retards passes. Distinct du delai des rappels automatiques.
      </p>
      <div className="numbering-grid">
        <label className="domus-property-field">
          <span>Delai de grace avant retard (jours)</span>
          <input type="number" inputMode="numeric" min="0" max="60" step="1" value={days} onChange={(e) => setDays(e.target.value)} />
        </label>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? "Enregistrement..." : <><Save size={15} /> Enregistrer</>}
        </button>
        {msg && <span role={msg.type === "err" ? "alert" : "status"} style={{ fontSize: 12, color: msg.type === "err" ? "#dc2626" : "#059669", display: "inline-flex", alignItems: "center", gap: 5 }}>
          {msg.type === "ok" && <Check size={14} />}{msg.text}
        </span>}
      </div>
    </section>
  );
}

function RemindersCard({ setting, onSaved }) {
  const [form, setForm] = useState({
    enabled: Number(setting?.rentReminderEnabled) === 1,
    overdueDays: setting?.rentReminderOverdueDays ?? 15,
    expiryDays: setting?.leaseExpiryNoticeDays ?? 90,
    hour: setting?.rentReminderHour ?? 9,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const overdue = Number(form.overdueDays);
    const expiry = Number(form.expiryDays);
    if (!(overdue >= 1 && overdue <= 365) || !(expiry >= 1 && expiry <= 365)) {
      setMsg({ type: "err", text: "Nombre de jours entre 1 et 365." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await api.updateSetting({
        rentReminderEnabled: form.enabled ? 1 : 0,
        rentReminderOverdueDays: overdue,
        leaseExpiryNoticeDays: expiry,
        rentReminderHour: Number(form.hour),
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
      <h3><MessageSquare size={17} /> Rappels automatiques</h3>
      <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
        Envoi automatique (SMS + email) au locataire, au proprietaire et aux delegues. Un seul rappel par periode de retard.
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
        <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
        <span>Activer les rappels automatiques</span>
      </label>
      <div className="numbering-grid">
        <label className="domus-property-field">
          <span>Rappel de loyer apres (jours de retard)</span>
          <input type="number" min="1" max="365" disabled={!form.enabled} value={form.overdueDays} onChange={(e) => set("overdueDays", e.target.value)} />
        </label>
        <label className="domus-property-field">
          <span>Rappel de fin de bail avant (jours)</span>
          <input type="number" min="1" max="365" disabled={!form.enabled} value={form.expiryDays} onChange={(e) => set("expiryDays", e.target.value)} />
        </label>
        <label className="domus-property-field">
          <span>Heure d&apos;envoi</span>
          <select disabled={!form.enabled} value={form.hour} onChange={(e) => set("hour", e.target.value)}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}h00</option>)}
          </select>
        </label>
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

      <AboutVersion />
    </section>
  );
}

// À propos — version applicative (source unique du monorepo).
function AboutVersion() {
  const base = import.meta.env.VITE_APP_BASE_VERSION || "—";
  const build = import.meta.env.VITE_APP_BUILD_VERSION || base;
  const commit = import.meta.env.VITE_APP_COMMIT || "—";
  const env = /dev\.|localhost|127\.0\.0\.1/.test(window.location.hostname) ? "dev" : "prod";
  const Row = ({ k, v }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #eee" }}>
      <span style={{ color: "#6b7280", fontSize: 13 }}>{k}</span>
      <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13 }}>{v}</span>
    </div>
  );
  return (
    <div style={{ marginTop: 24, maxWidth: 480 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>À propos</div>
      <Row k="Version" v={`v${base}`} />
      <Row k="Build" v={build} />
      <Row k="Commit" v={commit} />
      <Row k="Environnement" v={env} />
    </div>
  );
}
