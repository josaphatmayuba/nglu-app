import {
  Bell,
  Building,
  Cloud,
  CreditCard,
  DatabaseBackup,
  FileText,
  History,
  Info,
  KeyRound,
  Mail,
  MessageSquare,
  Monitor,
  Moon,
  Palette,
  Plug,
  Shield,
  Smartphone,
  Sun,
  User,
  UserPlus,
  UsersRound,
  Webhook,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { loadAllCurrency } from "@/redux/rtk/features/eCommerce/currency/currencySlice";
import { getSetting, updateSetting } from "@/redux/rtk/features/setting/settingSlice";
import AboutPanel from "./AppSettings/AboutPanel";
import SecurityPanel from "./AppSettings/SecurityPanel";
import AdminAudit from "./AdminSettings/tabs/AdminAudit";
import AdminBackup from "./AdminSettings/tabs/AdminBackup";
import AdminModels from "./AdminSettings/tabs/AdminModels";
import AdminUsers from "./AdminSettings/tabs/AdminUsers";

// ─── Entreprise panel ─────────────────────────────────────────────────────────
const LOGO_MAX_BYTES = 10 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const TIMEZONES = ["Africa/Kinshasa (UTC+1)", "Africa/Lubumbashi (UTC+2)"];

function EntreprisePanel() {
  const dispatch = useDispatch();
  const data = useSelector((s) => s?.setting?.data);
  const saving = useSelector((s) => s?.setting?.loading) || false;
  const { list: currenciesRaw, loading: currLoading } = useSelector((s) => s?.currency) || {};
  const currencies = currenciesRaw ?? [];

  const [form, setForm] = useState({ companyName: "", tagLine: "", email: "", phone: "", address: "", currencyId: "", timezone: TIMEZONES[0] });
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!data) dispatch(getSetting());
    dispatch(loadAllCurrency());
  }, [dispatch, data]);

  useEffect(() => {
    if (data) {
      setForm({
        companyName: data.companyName || "",
        tagLine: data.tagLine || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        currencyId: data.currencyId ?? "",
        timezone: TIMEZONES[0],
      });
      if (data.logo) setLogoPreview(data.logo);
    }
  }, [data]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) { toast.error("Format accepté : PNG, JPG, WebP, SVG"); return; }
    if (file.size > LOGO_MAX_BYTES) { toast.error("Logo trop volumineux (max 10 MB)"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => { setLogoFile(null); setLogoPreview(null); };

  const handleSave = async () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (k !== "timezone" && v !== "") fd.append(k, v); });
    if (logoFile) fd.append("images", logoFile);
    else if (!logoPreview) fd.append("clearLogo", "true");
    fd.append("_method", "PUT");
    const resp = await dispatch(updateSetting(fd));
    if (resp.payload?.message === "success") { toast.success("Paramètres enregistrés"); dispatch(getSetting()); }
    else toast.error(resp.payload?.error || "Échec de la mise à jour");
  };

  const initial = (form.companyName || "N")[0].toUpperCase();

  return (
    <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
      <div className="mb-5">
        <h3 className="font-semibold text-ink-900 text-lg">Informations entreprise</h3>
        <p className="text-xs text-ink-500 mt-1">Ces informations apparaîtront sur vos factures et documents</p>
      </div>
      <div className="space-y-4">
        {/* Logo */}
        <div>
          <label className="text-sm font-medium text-ink-700 mb-1.5 block">Logo</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-2xl overflow-hidden shrink-0">
              {logoPreview ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" /> : initial}
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-1.5 border border-ink-200 hover:border-ink-300 rounded-lg text-sm text-ink-700 transition">
              Changer
            </button>
            {logoPreview && (
              <button type="button" onClick={handleRemoveLogo} className="text-sm text-red-600 hover:underline">
                Supprimer
              </button>
            )}
            <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp,.svg" className="hidden" onChange={handleLogoChange} />
          </div>
        </div>

        {/* Fields grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Nom de l'entreprise", key: "companyName", type: "text" },
            { label: "RCCM", key: "tagLine", type: "text" },
            { label: "Email", key: "email", type: "email" },
            { label: "Téléphone", key: "phone", type: "tel" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="text-sm font-medium text-ink-700 mb-1.5 block">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-ink-700 mb-1.5 block">Adresse</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700 mb-1.5 block">Devise</label>
            <select
              value={form.currencyId}
              onChange={(e) => setForm((f) => ({ ...f, currencyId: e.target.value }))}
              disabled={currLoading}
              className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="">— Sélectionner —</option>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>{c.currencyCode} — {c.currencyName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700 mb-1.5 block">Fuseau horaire</label>
            <select
              value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
            >
              {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-ink-100">
          <button type="button" onClick={() => { setForm({ companyName: data?.companyName || "", tagLine: data?.tagLine || "", email: data?.email || "", phone: data?.phone || "", address: data?.address || "", currencyId: data?.currencyId ?? "", timezone: TIMEZONES[0] }); setLogoPreview(data?.logo || null); setLogoFile(null); }} className="px-4 py-2 text-sm text-ink-700 hover:bg-ink-100 rounded-lg transition">
            Annuler
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg shadow-sm transition">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toggle helper ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, small }) {
  const w = small ? "w-9 h-5" : "w-11 h-6";
  const dot = small ? "w-4 h-4" : "w-5 h-5";
  const tx = small ? "peer-checked:translate-x-4" : "peer-checked:translate-x-5";
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <div className={`${w} bg-ink-200 peer-checked:bg-brand-600 rounded-full peer transition`} />
      <div className={`absolute left-0.5 top-0.5 ${dot} bg-white rounded-full transition ${tx}`} />
    </label>
  );
}

// ─── Profile panel ────────────────────────────────────────────────────────────
function ProfilePanel() {
  const initial = (localStorage.getItem("username") || "U")[0].toUpperCase();
  return (
    <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
      <div className="mb-5">
        <h3 className="font-semibold text-ink-900 text-lg">Mon profil</h3>
        <p className="text-xs text-ink-500 mt-1">Vos informations personnelles et préférences de compte</p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-2xl select-none">
            {initial}
          </div>
          <div className="flex flex-col gap-1">
            <button className="px-3 py-1.5 border border-ink-200 hover:border-ink-300 rounded-lg text-sm text-ink-700 transition">
              Changer la photo
            </button>
            <button className="text-sm text-red-600 hover:underline text-left">Supprimer</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Prénom", type: "text", placeholder: "Prénom" },
            { label: "Nom", type: "text", placeholder: "Nom" },
            { label: "Email", type: "email", placeholder: "email@exemple.com" },
            { label: "Téléphone", type: "tel", placeholder: "+243 999 000 000" },
          ].map(({ label, type, placeholder }) => (
            <div key={label}>
              <label className="text-sm font-medium text-ink-700 mb-1.5 block">{label}</label>
              <input type={type} placeholder={placeholder} className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-ink-700 mb-1.5 block">Fonction</label>
            <input type="text" value="Administrateur" disabled className="w-full px-3 py-2 bg-ink-50 border border-ink-200 rounded-lg text-sm text-ink-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700 mb-1.5 block">Langue</label>
            <select className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500">
              <option>Français</option>
              <option>English</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-ink-100">
          <button className="px-4 py-2 text-sm text-ink-700 hover:bg-ink-100 rounded-lg transition">Annuler</button>
          <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications panel ──────────────────────────────────────────────────────
const NOTIF_EVENTS = [
  { key: "payment", label: "Nouveau paiement reçu", desc: "Loyer / facture encaissée", email: true, inapp: true },
  { key: "overdue", label: "Loyer en retard", desc: "Locataire ≥ 3 jours en retard", email: true, inapp: true },
  { key: "renewal", label: "Bail à renouveler", desc: "60 jours avant expiration", email: false, inapp: true },
  { key: "maintenance", label: "Ticket maintenance urgent", desc: "Priorité haute", email: true, inapp: true },
  { key: "report", label: "Rapport mensuel", desc: "Synthèse 1er du mois", email: true, inapp: false },
];

function NotificationsPanel() {
  const [prefs, setPrefs] = useState(() =>
    Object.fromEntries(NOTIF_EVENTS.flatMap((e) => [[`${e.key}_email`, e.email], [`${e.key}_inapp`, e.inapp]]))
  );
  const toggle = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
      <div className="mb-5">
        <h3 className="font-semibold text-ink-900 text-lg">Préférences de notification</h3>
        <p className="text-xs text-ink-500 mt-1">Choisissez quand et comment être averti</p>
      </div>
      <div className="space-y-1 divide-y divide-ink-100">
        <div className="grid grid-cols-3 gap-4 text-xs font-semibold uppercase text-ink-500 pb-2">
          <div>Événement</div>
          <div className="text-center">Email</div>
          <div className="text-center">In-app</div>
        </div>
        {NOTIF_EVENTS.map((ev) => (
          <div key={ev.key} className="grid grid-cols-3 gap-4 items-center py-3">
            <div>
              <div className="text-sm font-medium text-ink-900">{ev.label}</div>
              <div className="text-xs text-ink-500">{ev.desc}</div>
            </div>
            <div className="flex justify-center">
              <Toggle small checked={prefs[`${ev.key}_email`]} onChange={() => toggle(`${ev.key}_email`)} />
            </div>
            <div className="flex justify-center">
              <Toggle small checked={prefs[`${ev.key}_inapp`]} onChange={() => toggle(`${ev.key}_inapp`)} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-ink-100">
        <button className="px-4 py-2 text-sm text-ink-700 hover:bg-ink-100 rounded-lg transition">Annuler</button>
        <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition">Enregistrer</button>
      </div>
    </div>
  );
}

// ─── Apparence panel ──────────────────────────────────────────────────────────
const ACCENT_COLORS = [
  { bg: "bg-brand-600", ring: "ring-brand-600", label: "Indigo (actuel)" },
  { bg: "bg-emerald-600", ring: "ring-emerald-600", label: "Emerald" },
  { bg: "bg-amber-500", ring: "ring-amber-500", label: "Amber" },
  { bg: "bg-rose-600", ring: "ring-rose-600", label: "Rose" },
  { bg: "bg-sky-600", ring: "ring-sky-600", label: "Sky" },
  { bg: "bg-purple-600", ring: "ring-purple-600", label: "Purple" },
];

function AppearancePanel() {
  const [theme, setTheme] = useState("light");
  const [accent, setAccent] = useState(0);

  const themes = [
    { val: "light", label: "Clair", Icon: Sun, preview: "bg-white border border-ink-200", iconColor: "text-amber-500" },
    { val: "dark", label: "Sombre", Icon: Moon, preview: "bg-ink-900", iconColor: "text-ink-300" },
    { val: "system", label: "Système", Icon: Monitor, preview: "bg-gradient-to-r from-white from-50% to-ink-900 to-50%", iconColor: "text-ink-500" },
  ];

  return (
    <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
      <div className="mb-5">
        <h3 className="font-semibold text-ink-900 text-lg">Apparence</h3>
        <p className="text-xs text-ink-500 mt-1">Personnalisez l&apos;apparence de l&apos;interface</p>
      </div>
      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium text-ink-700 mb-2 block">Thème</label>
          <div className="grid grid-cols-3 gap-3">
            {themes.map(({ val, label, Icon, preview, iconColor }) => (
              <label key={val} className="cursor-pointer">
                <input type="radio" name="theme" value={val} checked={theme === val} onChange={() => setTheme(val)} className="sr-only" />
                <div className={`p-3 bg-white border-2 rounded-lg flex flex-col items-center gap-2 transition ${theme === val ? "border-brand-500 ring-2 ring-brand-100" : "border-ink-200 hover:border-ink-300"}`}>
                  <div className={`w-full h-12 ${preview} rounded flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <span className="text-xs font-medium text-ink-900">{label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-ink-700 mb-2 block">Couleur principale</label>
          <div className="flex items-center gap-2 flex-wrap">
            {ACCENT_COLORS.map(({ bg, ring, label }, i) => (
              <button key={i} onClick={() => setAccent(i)} title={label}
                className={`w-9 h-9 rounded-full ${bg} transition ${accent === i ? `ring-2 ring-offset-2 ${ring}` : `hover:ring-2 ring-offset-2 ${ring}`}`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700 mb-1.5 block">Densité d&apos;affichage</label>
            <select className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500">
              <option>Confortable</option>
              <option>Compacte</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700 mb-1.5 block">Taille de police</label>
            <select className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500">
              <option>Moyenne (par défaut)</option>
              <option>Petite</option>
              <option>Grande</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-ink-100">
          <button className="px-4 py-2 text-sm text-ink-700 hover:bg-ink-100 rounded-lg transition">Annuler</button>
          <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Facturation panel ────────────────────────────────────────────────────────
const CURRENCIES = [
  { symbol: "FC", name: "Franc Congolais (CDF)", sub: "Devise par défaut", color: "bg-brand-50 text-brand-700" },
  { symbol: "$", name: "Dollar US (USD)", sub: "Devise secondaire", color: "bg-emerald-50 text-emerald-700" },
];

function FacturationPanel() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
        <div className="mb-5">
          <h3 className="font-semibold text-ink-900 text-lg">Devises supportées</h3>
          <p className="text-xs text-ink-500 mt-1">Devises actives dans l&apos;application (factures, paiements, baux)</p>
        </div>
        <div className="space-y-2">
          {CURRENCIES.map(({ symbol, name, sub, color }) => (
            <div key={name} className="flex items-center justify-between p-3 border border-ink-200 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-full ${color} font-semibold flex items-center justify-center text-sm`}>{symbol}</span>
                <div>
                  <div className="text-sm font-medium text-ink-900">{name}</div>
                  <div className="text-xs text-ink-500">{sub}</div>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
            </div>
          ))}
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-ink-300 hover:border-brand-300 hover:bg-brand-50 rounded-lg text-sm text-ink-600 hover:text-brand-700 transition">
            + Ajouter une devise
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
        <div className="mb-5">
          <h3 className="font-semibold text-ink-900 text-lg">Numérotation</h3>
          <p className="text-xs text-ink-500 mt-1">Format de numérotation des factures et baux</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Préfixe facture", defaultValue: "INV-2026-" },
            { label: "Préfixe bail", defaultValue: "LEASE-" },
          ].map(({ label, defaultValue }) => (
            <div key={label}>
              <label className="text-sm font-medium text-ink-700 mb-1.5 block">{label}</label>
              <input type="text" defaultValue={defaultValue} className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-ink-700 mb-1.5 block">TVA (%)</label>
            <input type="number" defaultValue={16} className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700 mb-1.5 block">Échéance par défaut (jours)</label>
            <input type="number" defaultValue={14} className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-ink-100">
          <button className="px-4 py-2 text-sm text-ink-700 hover:bg-ink-100 rounded-lg transition">Annuler</button>
          <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Intégrations panel ───────────────────────────────────────────────────────
const INTEGRATIONS = [
  { Icon: Mail, bg: "bg-emerald-50", iconColor: "text-emerald-600", name: "SMTP / Email", desc: "Envoi de factures, liens d'inscription et signatures", badge: "Connecté", badgeClass: "text-emerald-700 bg-emerald-50", action: "Configurer" },
  { Icon: MessageSquare, bg: "bg-amber-50", iconColor: "text-amber-600", name: "SMS / WhatsApp", desc: "Notifications locataires et 2FA par SMS", badge: "Non configuré", badgeClass: "text-ink-600 bg-ink-100", action: "Connecter" },
  { Icon: CreditCard, bg: "bg-brand-50", iconColor: "text-brand-600", name: "Mobile Money", desc: "M-Pesa, Airtel Money, Orange Money", badge: "Non configuré", badgeClass: "text-ink-600 bg-ink-100", action: "Connecter" },
  { Icon: Cloud, bg: "bg-purple-50", iconColor: "text-purple-600", name: "Stockage cloud", desc: "Backup automatique des contrats signés", badge: "Non configuré", badgeClass: "text-ink-600 bg-ink-100", action: "Connecter" },
  { Icon: KeyRound, bg: "bg-sky-50", iconColor: "text-sky-600", name: "Clés API", desc: "Accès programmatique à NGOLU", badge: "3 actives", badgeClass: "text-emerald-700 bg-emerald-50", action: "Gérer" },
  { Icon: Webhook, bg: "bg-rose-50", iconColor: "text-rose-600", name: "Webhooks", desc: "Notifier des systèmes tiers en temps réel", badge: "0 actifs", badgeClass: "text-ink-600 bg-ink-100", action: "Configurer" },
];

function IntegrationsPanel() {
  return (
    <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
      <div className="mb-5">
        <h3 className="font-semibold text-ink-900 text-lg">Intégrations</h3>
        <p className="text-xs text-ink-500 mt-1">Services externes connectés à NGOLU</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INTEGRATIONS.map(({ Icon, bg, iconColor, name, desc, badge, badgeClass, action }) => (
          <div key={name} className="border border-ink-200 rounded-xl p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-ink-900 text-sm">{name}</h4>
                <span className={`text-xs font-medium ${badgeClass} px-2 py-0.5 rounded`}>{badge}</span>
              </div>
              <p className="text-xs text-ink-500 mb-2">{desc}</p>
              <button className="text-xs text-brand-700 hover:underline">{action}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sécurité wrapper (existing SecurityPanel has its own cards) ───────────────
function SecuriteWrapper() {
  return <SecurityPanel />;
}

// ─── Utilisateurs wrapper (needs full-width, no extra card wrapper) ────────────
function UtilisateursPanel() {
  return (
    <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-ink-900 text-lg">Utilisateurs &amp; Rôles</h3>
          <p className="text-xs text-ink-500 mt-1">Comptes ayant accès à l&apos;application et leurs permissions</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
          <UserPlus className="w-4 h-4" />
          Inviter un utilisateur
        </button>
      </div>
      <AdminUsers />
    </div>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "entreprise", label: "Entreprise", icon: Building },
  { key: "profil", label: "Profil", icon: User },
  { key: "securite", label: "Sécurité", icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "apparence", label: "Apparence", icon: Palette },
  { key: "facturation", label: "Facturation", icon: CreditCard },
  { key: "integrations", label: "Intégrations", icon: Plug },
  null,
  { key: "utilisateurs", label: "Utilisateurs & Rôles", icon: UsersRound },
  { key: "modeles", label: "Modèles", icon: FileText },
  { key: "audit", label: "Audit & Journaux", icon: History },
  { key: "sauvegarde", label: "Sauvegarde & Export", icon: DatabaseBackup },
  { key: "apropos", label: "À propos", icon: Info },
];

// Panels that manage their own card wrapper(s)
const SELF_WRAPPED = new Set(["profil", "notifications", "apparence", "facturation", "integrations", "securite", "utilisateurs"]);

function renderPanel(key) {
  switch (key) {
    case "entreprise":    return <EntreprisePanel />;
    case "profil":       return <ProfilePanel />;
    case "securite":     return <SecuriteWrapper />;
    case "notifications":return <NotificationsPanel />;
    case "apparence":    return <AppearancePanel />;
    case "facturation":  return <FacturationPanel />;
    case "integrations": return <IntegrationsPanel />;
    case "utilisateurs": return <UtilisateursPanel />;
    case "modeles":      return <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6"><AdminModels /></div>;
    case "audit":        return <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6"><AdminAudit /></div>;
    case "sauvegarde":   return <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6"><AdminBackup /></div>;
    case "apropos":      return <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6"><AboutPanel /></div>;
    default:             return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPanel() {
  const [active, setActive] = useState("entreprise");

  return (
    <div>
      <div className="mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-ink-900 tracking-tight">Paramètres</h1>
        <p className="text-xs md:text-sm text-ink-500 mt-1">Configuration générale de votre application</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-ink-200 p-2 space-y-0.5" id="settings-tabs">
            {NAV_ITEMS.map((item, idx) => {
              if (item === null) return <div key={`sep-${idx}`} className="my-1 border-t border-ink-100" />;
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActive(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                    isActive ? "bg-brand-50 text-brand-700 font-medium" : "hover:bg-ink-100 text-ink-600"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel */}
        <div className="lg:col-span-3">
          {renderPanel(active)}
        </div>
      </div>
    </div>
  );
}
