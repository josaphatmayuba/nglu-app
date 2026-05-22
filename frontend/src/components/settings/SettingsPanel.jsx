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
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { loadAllCurrency } from "@/redux/rtk/features/eCommerce/currency/currencySlice";
import { getSetting, updateSetting } from "@/redux/rtk/features/setting/settingSlice";
import { loadAllStaff, loadSingleStaff, updateStaff } from "@/redux/rtk/features/user/userSlice";
import { loadAllRole } from "@/redux/rtk/features/hr/role/roleSlice";
import { loadAllTermsAndConditions } from "@/redux/rtk/features/termsAndCondition/termsAndConditionSlice";
import { loadAllEmailConfig } from "@/redux/rtk/features/EmailConfigAppSettings/emailConfigAppSettingSlice";
import { loadNotificationPreferences as loadNotifPrefs, saveNotificationPreferences as saveNotifPrefs } from "@/redux/rtk/features/notificationPreferences/notificationPreferencesSlice";
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
  const dispatch = useDispatch();
  const userId = parseInt(localStorage.getItem("id"), 10);
  const userRole = localStorage.getItem("role") || "";
  const userData = useSelector((s) => s?.user?.user);
  const saving = useSelector((s) => s?.user?.loading) || false;
  const photoRef = useRef(null);

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });

  useEffect(() => {
    if (userId) dispatch(loadSingleStaff(userId));
  }, [dispatch, userId]);

  useEffect(() => {
    if (userData) {
      setForm({
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
        phone: userData.phone || "",
      });
    }
  }, [userData]);

  const initial = ((form.firstName?.[0] || "") + (form.lastName?.[0] || "")).toUpperCase() || "U";

  const handleSave = async () => {
    const resp = await dispatch(updateStaff({ id: userId, values: { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone } }));
    if (resp.payload?.message === "success") { toast.success("Profil mis à jour"); dispatch(loadSingleStaff(userId)); }
    else toast.error(resp.payload?.error || "Échec de la mise à jour");
  };

  const handleCancel = () => {
    if (userData) setForm({ firstName: userData.firstName || "", lastName: userData.lastName || "", email: userData.email || "", phone: userData.phone || "" });
  };

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
            <button type="button" onClick={() => photoRef.current?.click()} className="px-3 py-1.5 border border-ink-200 hover:border-ink-300 rounded-lg text-sm text-ink-700 transition">
              Changer la photo
            </button>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Prénom", key: "firstName", type: "text" },
            { label: "Nom", key: "lastName", type: "text" },
            { label: "Email", key: "email", type: "email" },
            { label: "Téléphone", key: "phone", type: "tel" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="text-sm font-medium text-ink-700 mb-1.5 block">{label}</label>
              <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-ink-700 mb-1.5 block">Fonction</label>
            <input type="text" value={userRole} disabled className="w-full px-3 py-2 bg-ink-50 border border-ink-200 rounded-lg text-sm text-ink-500 cursor-not-allowed" />
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
          <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm text-ink-700 hover:bg-ink-100 rounded-lg transition">Annuler</button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg shadow-sm transition">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
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
  const dispatch = useDispatch();
  const { list: serverPrefs, loading: saving } = useSelector((s) => s?.notificationPreferences) || {};

  const [prefs, setPrefs] = useState(() =>
    Object.fromEntries(NOTIF_EVENTS.flatMap((e) => [[`${e.key}_email`, e.email], [`${e.key}_inapp`, e.inapp]]))
  );

  useEffect(() => {
    dispatch(loadNotifPrefs());
  }, [dispatch]);

  useEffect(() => {
    if (Array.isArray(serverPrefs)) {
      const map = Object.fromEntries(serverPrefs.flatMap((p) => [
        [`${p.eventKey}_email`, !!p.emailEnabled],
        [`${p.eventKey}_inapp`, !!p.inappEnabled],
      ]));
      setPrefs((prev) => ({ ...prev, ...map }));
    }
  }, [serverPrefs]);

  const toggle = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const handleSave = async () => {
    const payload = NOTIF_EVENTS.map((ev) => ({
      eventKey: ev.key,
      emailEnabled: !!prefs[`${ev.key}_email`],
      inappEnabled: !!prefs[`${ev.key}_inapp`],
    }));
    const resp = await dispatch(saveNotifPrefs(payload));
    if (resp.payload?.data || Array.isArray(resp.payload)) toast.success("Notifications enregistrées");
    else toast.error("Échec de la sauvegarde");
  };

  const handleCancel = () => {
    if (Array.isArray(serverPrefs)) {
      const map = Object.fromEntries(serverPrefs.flatMap((p) => [
        [`${p.eventKey}_email`, !!p.emailEnabled],
        [`${p.eventKey}_inapp`, !!p.inappEnabled],
      ]));
      setPrefs((prev) => ({ ...prev, ...map }));
    }
  };

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
              <Toggle small checked={!!prefs[`${ev.key}_email`]} onChange={() => toggle(`${ev.key}_email`)} />
            </div>
            <div className="flex justify-center">
              <Toggle small checked={!!prefs[`${ev.key}_inapp`]} onChange={() => toggle(`${ev.key}_inapp`)} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-ink-100">
        <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm text-ink-700 hover:bg-ink-100 rounded-lg transition">Annuler</button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg shadow-sm transition">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
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

const LS_THEME = "nglu-theme";
const LS_ACCENT = "nglu-accent";
const LS_DENSITY = "nglu-density";
const LS_FONTSIZE = "nglu-fontsize";

function applyTheme(val) {
  const root = document.documentElement;
  if (val === "dark") root.classList.add("dark");
  else if (val === "light") root.classList.remove("dark");
  else root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function AppearancePanel() {
  const [theme, setTheme] = useState(() => localStorage.getItem(LS_THEME) || "light");
  const [accent, setAccent] = useState(() => parseInt(localStorage.getItem(LS_ACCENT) || "0", 10));
  const [density, setDensity] = useState(() => localStorage.getItem(LS_DENSITY) || "Confortable");
  const [fontSize, setFontSize] = useState(() => localStorage.getItem(LS_FONTSIZE) || "Moyenne (par défaut)");

  const handleTheme = (val) => { setTheme(val); applyTheme(val); };

  const handleSave = () => {
    localStorage.setItem(LS_THEME, theme);
    localStorage.setItem(LS_ACCENT, accent);
    localStorage.setItem(LS_DENSITY, density);
    localStorage.setItem(LS_FONTSIZE, fontSize);
    applyTheme(theme);
    toast.success("Apparence enregistrée");
  };

  const handleCancel = () => {
    const saved = localStorage.getItem(LS_THEME) || "light";
    setTheme(saved);
    setAccent(parseInt(localStorage.getItem(LS_ACCENT) || "0", 10));
    setDensity(localStorage.getItem(LS_DENSITY) || "Confortable");
    setFontSize(localStorage.getItem(LS_FONTSIZE) || "Moyenne (par défaut)");
    applyTheme(saved);
  };

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
                <input type="radio" name="theme" value={val} checked={theme === val} onChange={() => handleTheme(val)} className="sr-only" />
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
            <select value={density} onChange={(e) => setDensity(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500">
              <option>Confortable</option>
              <option>Compacte</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700 mb-1.5 block">Taille de police</label>
            <select value={fontSize} onChange={(e) => setFontSize(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500">
              <option>Moyenne (par défaut)</option>
              <option>Petite</option>
              <option>Grande</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-ink-100">
          <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm text-ink-700 hover:bg-ink-100 rounded-lg transition">Annuler</button>
          <button type="button" onClick={handleSave} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Facturation panel ────────────────────────────────────────────────────────
const CURRENCY_COLORS = ["bg-brand-50 text-brand-700", "bg-emerald-50 text-emerald-700", "bg-amber-50 text-amber-700", "bg-sky-50 text-sky-700"];

function FacturationPanel() {
  const dispatch = useDispatch();
  const settingData = useSelector((s) => s?.setting?.data);
  const saving = useSelector((s) => s?.setting?.loading) || false;
  const { list: currenciesRaw } = useSelector((s) => s?.currency) || {};
  const currencies = currenciesRaw ?? [];

  const defaultCurrencyId = settingData?.currencyId;

  const [num, setNum] = useState({ invoicePrefix: "", leasePrefix: "", defaultVatRate: "16", defaultPaymentTermDays: "14" });

  useEffect(() => {
    dispatch(loadAllCurrency());
    if (!settingData) dispatch(getSetting());
  }, [dispatch, settingData]);

  useEffect(() => {
    if (settingData) {
      setNum({
        invoicePrefix: settingData.invoicePrefix || "INV-",
        leasePrefix: settingData.leasePrefix || "LEASE-",
        defaultVatRate: String(settingData.defaultVatRate ?? 16),
        defaultPaymentTermDays: String(settingData.defaultPaymentTermDays ?? 14),
      });
    }
  }, [settingData]);

  const handleSaveNum = async () => {
    const fd = new FormData();
    fd.append("invoicePrefix", num.invoicePrefix);
    fd.append("leasePrefix", num.leasePrefix);
    fd.append("defaultVatRate", num.defaultVatRate);
    fd.append("defaultPaymentTermDays", num.defaultPaymentTermDays);
    fd.append("_method", "PUT");
    const resp = await dispatch(updateSetting(fd));
    if (resp.payload?.message === "success") { toast.success("Numérotation enregistrée"); dispatch(getSetting()); }
    else toast.error(resp.payload?.error || "Échec");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
        <div className="mb-5">
          <h3 className="font-semibold text-ink-900 text-lg">Devises supportées</h3>
          <p className="text-xs text-ink-500 mt-1">Devises actives dans l&apos;application (factures, paiements, baux)</p>
        </div>
        <div className="space-y-2">
          {currencies.length === 0 && <p className="text-xs text-ink-400 py-2">Chargement…</p>}
          {currencies.map((c, i) => (
            <div key={c.id} className="flex items-center justify-between p-3 border border-ink-200 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-full ${CURRENCY_COLORS[i % CURRENCY_COLORS.length]} font-semibold flex items-center justify-center text-sm`}>
                  {c.currencySymbol || c.currencyCode?.slice(0, 2)}
                </span>
                <div>
                  <div className="text-sm font-medium text-ink-900">{c.currencyCode} — {c.currencyName}</div>
                  <div className="text-xs text-ink-500">{c.id === defaultCurrencyId ? "Devise par défaut" : "Devise active"}</div>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
        <div className="mb-5">
          <h3 className="font-semibold text-ink-900 text-lg">Numérotation</h3>
          <p className="text-xs text-ink-500 mt-1">Format de numérotation des factures et baux</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Préfixe facture", key: "invoicePrefix", type: "text" },
            { label: "Préfixe bail", key: "leasePrefix", type: "text" },
            { label: "TVA (%)", key: "defaultVatRate", type: "number" },
            { label: "Échéance par défaut (jours)", key: "defaultPaymentTermDays", type: "number" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="text-sm font-medium text-ink-700 mb-1.5 block">{label}</label>
              <input type={type} value={num[key]} onChange={(e) => setNum((n) => ({ ...n, [key]: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-ink-100">
          <button type="button" onClick={() => settingData && setNum({ invoicePrefix: settingData.invoicePrefix || "INV-", leasePrefix: settingData.leasePrefix || "LEASE-", defaultVatRate: String(settingData.defaultVatRate ?? 16), defaultPaymentTermDays: String(settingData.defaultPaymentTermDays ?? 14) })}
            className="px-4 py-2 text-sm text-ink-700 hover:bg-ink-100 rounded-lg transition">Annuler</button>
          <button type="button" onClick={handleSaveNum} disabled={saving}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg shadow-sm transition">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Intégrations panel ───────────────────────────────────────────────────────
const STATIC_INTEGRATIONS = [
  { Icon: MessageSquare, bg: "bg-amber-50", iconColor: "text-amber-600", name: "SMS / WhatsApp", desc: "Notifications locataires et 2FA par SMS", badge: "Non configuré", badgeClass: "text-ink-600 bg-ink-100", action: "Bientôt disponible", disabled: true },
  { Icon: CreditCard, bg: "bg-brand-50", iconColor: "text-brand-600", name: "Mobile Money", desc: "M-Pesa, Airtel Money, Orange Money", badge: "Non configuré", badgeClass: "text-ink-600 bg-ink-100", action: "Bientôt disponible", disabled: true },
  { Icon: Cloud, bg: "bg-purple-50", iconColor: "text-purple-600", name: "Stockage cloud", desc: "Backup automatique des contrats signés", badge: "Non configuré", badgeClass: "text-ink-600 bg-ink-100", action: "Bientôt disponible", disabled: true },
  { Icon: KeyRound, bg: "bg-sky-50", iconColor: "text-sky-600", name: "Clés API", desc: "Accès programmatique à NGOLU", badge: "Bientôt disponible", badgeClass: "text-ink-600 bg-ink-100", action: "Bientôt disponible", disabled: true },
  { Icon: Webhook, bg: "bg-rose-50", iconColor: "text-rose-600", name: "Webhooks", desc: "Notifier des systèmes tiers en temps réel", badge: "Bientôt disponible", badgeClass: "text-ink-600 bg-ink-100", action: "Bientôt disponible", disabled: true },
];

function IntegrationsPanel() {
  const dispatch = useDispatch();
  const { list: emailConfigs } = useSelector((s) => s?.emailConfigAppSetting) || {};
  const smtpConfigured = Array.isArray(emailConfigs) && emailConfigs.some((c) => c.emailHost);

  useEffect(() => { dispatch(loadAllEmailConfig()); }, [dispatch]);

  const smtpBadge = smtpConfigured
    ? { badge: "Connecté", badgeClass: "text-emerald-700 bg-emerald-50", action: "Configurer" }
    : { badge: "Non configuré", badgeClass: "text-ink-600 bg-ink-100", action: "Configurer" };

  return (
    <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
      <div className="mb-5">
        <h3 className="font-semibold text-ink-900 text-lg">Intégrations</h3>
        <p className="text-xs text-ink-500 mt-1">Services externes connectés à NGOLU</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* SMTP — statut réel */}
        <div className="border border-ink-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-ink-900 text-sm">SMTP / Email</h4>
              <span className={`text-xs font-medium ${smtpBadge.badgeClass} px-2 py-0.5 rounded`}>{smtpBadge.badge}</span>
            </div>
            <p className="text-xs text-ink-500 mb-2">Envoi de factures, liens d&apos;inscription et signatures</p>
            <button className="text-xs text-brand-700 hover:underline">{smtpBadge.action}</button>
          </div>
        </div>
        {/* Autres — placeholder */}
        {STATIC_INTEGRATIONS.map(({ Icon, bg, iconColor, name, desc, badge, badgeClass, action }) => (
          <div key={name} className="border border-ink-200 rounded-xl p-4 flex items-start gap-3 opacity-70">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-ink-900 text-sm">{name}</h4>
                <span className={`text-xs font-medium ${badgeClass} px-2 py-0.5 rounded`}>{badge}</span>
              </div>
              <p className="text-xs text-ink-500 mb-2">{desc}</p>
              <span className="text-xs text-ink-400">{action}</span>
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

// ─── Utilisateurs & Rôles panel ───────────────────────────────────────────────
function UtilisateursPanel() {
  const dispatch = useDispatch();
  const [tab, setTab] = useState("users");
  const usersRaw = useSelector((s) => s?.user?.list);
  const users = usersRaw ?? [];
  const rolesRaw = useSelector((s) => s?.role?.list);
  const roles = rolesRaw ?? [];
  const loading = useSelector((s) => s?.user?.loading || s?.role?.loading);

  useEffect(() => {
    dispatch(loadAllStaff());
    dispatch(loadAllRole());
  }, [dispatch]);

  return (
    <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-ink-900 text-lg">Utilisateurs &amp; Rôles</h3>
          <p className="text-xs text-ink-500 mt-1">Comptes et permissions de l&apos;application</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
          <UserPlus className="w-4 h-4" /> Inviter
        </button>
      </div>
      <div className="flex gap-1 p-1 bg-ink-100 rounded-lg mb-4 w-fit">
        {["users", "roles"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? "bg-white shadow-sm text-ink-900" : "text-ink-500 hover:text-ink-700"}`}>
            {t === "users" ? `Utilisateurs (${users.length})` : `Rôles (${roles.length})`}
          </button>
        ))}
      </div>
      {loading && <p className="text-xs text-ink-400 py-4 text-center">Chargement…</p>}
      {!loading && tab === "users" && (
        <div className="space-y-1">
          <div className="grid grid-cols-4 gap-4 text-xs font-semibold uppercase text-ink-500 px-3 pb-2 border-b border-ink-100">
            <div>Nom</div><div>Email</div><div>Rôle</div><div>Statut</div>
          </div>
          {users.length === 0 && <p className="text-xs text-ink-400 py-4 text-center">Aucun utilisateur</p>}
          {users.map((u) => (
            <div key={u.id} className="grid grid-cols-4 gap-4 items-center px-3 py-2.5 hover:bg-ink-50 rounded-lg">
              <div className="text-sm font-medium text-ink-900 truncate">{u.firstName || u.username} {u.lastName || ""}</div>
              <div className="text-xs text-ink-500 truncate">{u.email || "—"}</div>
              <div className="text-xs text-ink-600">{u.role?.name || u.roleName || "—"}</div>
              <div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${u.status === "true" || u.status === true ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"}`}>
                  {u.status === "true" || u.status === true ? "Actif" : "Inactif"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && tab === "roles" && (
        <div className="space-y-1">
          <div className="grid grid-cols-3 gap-4 text-xs font-semibold uppercase text-ink-500 px-3 pb-2 border-b border-ink-100">
            <div>Nom du rôle</div><div>Permissions</div><div>Statut</div>
          </div>
          {roles.length === 0 && <p className="text-xs text-ink-400 py-4 text-center">Aucun rôle</p>}
          {roles.map((r) => (
            <div key={r.id} className="grid grid-cols-3 gap-4 items-center px-3 py-2.5 hover:bg-ink-50 rounded-lg">
              <div className="text-sm font-medium text-ink-900">{r.name}</div>
              <div className="text-xs text-ink-500">{r.rolePermission?.length ?? r.permissionCount ?? "—"} permissions</div>
              <div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${r.status === "true" || r.status === true ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"}`}>
                  {r.status === "true" || r.status === true ? "Actif" : "Inactif"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Audit & Journaux panel ───────────────────────────────────────────────────
function AdminAuditPanel() {
  const dispatch = useDispatch();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const LIMIT = 20;

  const fetchLogs = useCallback(async (p, action) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (action) params.append("action", action);
      const resp = await import("axios").then(({ default: axios }) =>
        axios.get(`audit-log?${params}`)
      );
      setLogs(resp.data?.data ?? []);
      setTotal(resp.data?.total ?? 0);
    } catch (e) {
      toast.error("Impossible de charger les journaux");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(page, actionFilter); }, [page, actionFilter, fetchLogs]);

  const ACTION_COLORS = { create: "text-emerald-700 bg-emerald-50", update: "text-brand-700 bg-brand-50", delete: "text-red-700 bg-red-50", login: "text-amber-700 bg-amber-50" };
  const actionColor = (a) => ACTION_COLORS[Object.keys(ACTION_COLORS).find((k) => a?.includes(k))] || "text-ink-600 bg-ink-100";

  return (
    <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-ink-900 text-lg">Audit &amp; Journaux</h3>
          <p className="text-xs text-ink-500 mt-1">Historique des actions sensibles dans l&apos;application</p>
        </div>
        <div className="flex gap-2">
          <input value={actionFilter} onChange={(e) => { setPage(1); setActionFilter(e.target.value); }}
            placeholder="Filtrer par action…" className="px-3 py-1.5 border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 w-44" />
        </div>
      </div>
      {loading && <p className="text-xs text-ink-400 py-4 text-center">Chargement…</p>}
      {!loading && (
        <>
          <div className="space-y-1">
            <div className="grid grid-cols-5 gap-3 text-xs font-semibold uppercase text-ink-500 px-3 pb-2 border-b border-ink-100">
              <div className="col-span-2">Action</div><div>Cible</div><div>IP</div><div>Date</div>
            </div>
            {logs.length === 0 && <p className="text-xs text-ink-400 py-4 text-center">Aucun journal</p>}
            {logs.map((l) => (
              <div key={l.id} className="grid grid-cols-5 gap-3 items-center px-3 py-2 hover:bg-ink-50 rounded-lg text-xs">
                <div className="col-span-2">
                  <span className={`font-medium px-2 py-0.5 rounded ${actionColor(l.action)}`}>{l.action}</span>
                  {l.userId && <span className="ml-2 text-ink-400">user:{l.userId}</span>}
                </div>
                <div className="text-ink-600 truncate">{l.target || "—"}</div>
                <div className="text-ink-400">{l.ip || "—"}</div>
                <div className="text-ink-400">{l.createdAt ? new Date(l.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
            <p className="text-xs text-ink-500">{total} entrée{total > 1 ? "s" : ""}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-xs border border-ink-200 rounded-lg disabled:opacity-40 hover:bg-ink-50 transition">← Précédent</button>
              <span className="px-3 py-1 text-xs text-ink-600">Page {page} / {Math.max(1, Math.ceil(total / LIMIT))}</span>
              <button type="button" disabled={page * LIMIT >= total} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-xs border border-ink-200 rounded-lg disabled:opacity-40 hover:bg-ink-50 transition">Suivant →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const TYPE_LABELS = { residential: "Résidentiel", commercial: "Commercial", short_term: "Court terme" };
const EVENT_LABELS = { invoice_sent: "Facture envoyée", payment_reminder: "Rappel paiement", lease_renewal: "Renouvellement bail", welcome: "Bienvenue", custom: "Personnalisé" };

const canSee = (permissions, permit) => {
  if (!permit) return true;
  if (!Array.isArray(permissions)) return false;
  const required = Array.isArray(permit.permissions) ? permit.permissions : [permit.permissions];
  return permit.operator === "and" ? required.every((p) => permissions.includes(p)) : required.some((p) => permissions.includes(p));
};

function useTemplates(url) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    import("axios").then(({ default: axios }) => axios.get(url))
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("Impossible de charger les modèles"))
      .finally(() => setLoading(false));
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return { items, loading, reload: load };
}

function TemplateDrawer({ title, fields, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch { toast.error("Erreur lors de l'enregistrement"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-ink-900 text-lg">{title}</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {fields.map(({ key, label, type = "text", options }) => (
            <div key={key}>
              <label className="text-sm font-medium text-ink-700 mb-1 block">{label}</label>
              {type === "textarea" ? (
                <textarea rows={4} value={form[key] || ""} onChange={(e) => set(key, e.target.value)}
                  className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
              ) : type === "select" ? (
                <select value={form[key] || ""} onChange={(e) => set(key, e.target.value)}
                  className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500">
                  <option value="">— Sélectionner —</option>
                  {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                </select>
              ) : (
                <input type="text" value={form[key] || ""} onChange={(e) => set(key, e.target.value)}
                  className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-ink-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-ink-700 hover:bg-ink-100 rounded-lg transition">Annuler</button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg shadow-sm transition">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modèles panel ────────────────────────────────────────────────────────────
function AdminModelsPanel() {
  const permissions = useSelector((s) => s?.auth?.list ?? []);
  const [tab, setTab] = useState("contrats");
  const [drawer, setDrawer] = useState(null); // { mode: "create"|"edit", type, item? }

  const contracts = useTemplates("property-management/contract-templates?query=all");
  const emailTpls = useTemplates("email-templates");
  const invoiceTpls = useTemplates("invoice-templates");

  const canCreateEmail = canSee(permissions, { permissions: ["create-emailTemplate", "readAll-emailTemplate"], operator: "or" });
  const canEditEmail = canSee(permissions, { permissions: ["update-emailTemplate"] });
  const canDeleteEmail = canSee(permissions, { permissions: ["delete-emailTemplate"] });
  const canCreateInvoice = canSee(permissions, { permissions: ["create-invoiceTemplate", "readAll-invoiceTemplate"], operator: "or" });
  const canEditInvoice = canSee(permissions, { permissions: ["update-invoiceTemplate"] });
  const canDeleteInvoice = canSee(permissions, { permissions: ["delete-invoiceTemplate"] });

  const EMAIL_FIELDS = [
    { key: "name", label: "Nom du modèle" },
    { key: "subject", label: "Sujet de l'email" },
    { key: "eventType", label: "Événement déclencheur", type: "select", options: Object.entries(EVENT_LABELS) },
    { key: "body", label: "Corps de l'email", type: "textarea" },
  ];

  const INVOICE_FIELDS = [
    { key: "name", label: "Nom du modèle" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "headerText", label: "Texte en-tête" },
    { key: "footerText", label: "Texte pied de page" },
    { key: "colorScheme", label: "Couleur", type: "select", options: [["brand", "Indigo (défaut)"], ["emerald", "Vert"], ["amber", "Ambre"], ["rose", "Rose"]] },
  ];

  const handleSaveEmail = async (form) => {
    const { default: axios } = await import("axios");
    if (drawer.mode === "create") await axios.post("email-templates", form);
    else await axios.put(`email-templates/${drawer.item.id}`, form);
    emailTpls.reload();
    toast.success("Modèle email enregistré");
  };

  const handleDeleteEmail = async (id) => {
    if (!window.confirm("Supprimer ce modèle email ?")) return;
    const { default: axios } = await import("axios");
    await axios.delete(`email-templates/${id}`);
    emailTpls.reload();
    toast.success("Modèle supprimé");
  };

  const handleSaveInvoice = async (form) => {
    const { default: axios } = await import("axios");
    if (drawer.mode === "create") await axios.post("invoice-templates", form);
    else await axios.put(`invoice-templates/${drawer.item.id}`, form);
    invoiceTpls.reload();
    toast.success("Modèle facture enregistré");
  };

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm("Supprimer ce modèle facture ?")) return;
    const { default: axios } = await import("axios");
    await axios.delete(`invoice-templates/${id}`);
    invoiceTpls.reload();
    toast.success("Modèle supprimé");
  };

  return (
    <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-ink-900 text-lg">Modèles</h3>
          <p className="text-xs text-ink-500 mt-1">Modèles de contrats, d&apos;email et de factures</p>
        </div>
        {tab === "email" && canCreateEmail && (
          <button onClick={() => setDrawer({ mode: "create", type: "email" })}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition">
            + Nouveau
          </button>
        )}
        {tab === "factures" && canCreateInvoice && (
          <button onClick={() => setDrawer({ mode: "create", type: "invoice" })}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition">
            + Nouveau
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-ink-100 rounded-lg mb-4 w-fit">
        {[["contrats", "Contrats"], ["email", "Email"], ["factures", "Factures"]].map(([key, lbl]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === key ? "bg-white shadow-sm text-ink-900" : "text-ink-500 hover:text-ink-700"}`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Contrats tab */}
      {tab === "contrats" && (
        <div className="space-y-1">
          <div className="grid grid-cols-3 gap-4 text-xs font-semibold uppercase text-ink-500 px-3 pb-2 border-b border-ink-100">
            <div className="col-span-2">Nom du modèle</div><div>Type</div>
          </div>
          {contracts.loading && <p className="text-xs text-ink-400 py-4 text-center">Chargement…</p>}
          {!contracts.loading && contracts.items.length === 0 && <p className="text-xs text-ink-400 py-4 text-center">Aucun modèle de contrat</p>}
          {contracts.items.map((t) => (
            <div key={t.id} className="grid grid-cols-3 gap-4 items-center px-3 py-2.5 hover:bg-ink-50 rounded-lg">
              <div className="col-span-2 text-sm font-medium text-ink-900 truncate">{t.name || `Modèle #${t.id}`}</div>
              <span className="text-xs font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded w-fit">{TYPE_LABELS[t.type] || t.type || "—"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Email tab */}
      {tab === "email" && (
        <div className="space-y-1">
          <div className="grid grid-cols-3 gap-4 text-xs font-semibold uppercase text-ink-500 px-3 pb-2 border-b border-ink-100">
            <div>Nom</div><div>Événement</div><div>Actions</div>
          </div>
          {emailTpls.loading && <p className="text-xs text-ink-400 py-4 text-center">Chargement…</p>}
          {!emailTpls.loading && emailTpls.items.length === 0 && <p className="text-xs text-ink-400 py-4 text-center">Aucun modèle email — créez le premier</p>}
          {emailTpls.items.map((t) => (
            <div key={t.id} className="grid grid-cols-3 gap-4 items-center px-3 py-2.5 hover:bg-ink-50 rounded-lg">
              <div className="text-sm font-medium text-ink-900 truncate">{t.name}</div>
              <span className="text-xs text-ink-500">{EVENT_LABELS[t.eventType] || t.eventType || "—"}</span>
              <div className="flex gap-2">
                {canEditEmail && <button onClick={() => setDrawer({ mode: "edit", type: "email", item: t })} className="text-xs text-brand-700 hover:underline">Modifier</button>}
                {canDeleteEmail && <button onClick={() => handleDeleteEmail(t.id)} className="text-xs text-red-600 hover:underline">Supprimer</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Factures tab */}
      {tab === "factures" && (
        <div className="space-y-1">
          <div className="grid grid-cols-3 gap-4 text-xs font-semibold uppercase text-ink-500 px-3 pb-2 border-b border-ink-100">
            <div>Nom</div><div>Couleur</div><div>Actions</div>
          </div>
          {invoiceTpls.loading && <p className="text-xs text-ink-400 py-4 text-center">Chargement…</p>}
          {!invoiceTpls.loading && invoiceTpls.items.length === 0 && <p className="text-xs text-ink-400 py-4 text-center">Aucun modèle facture — créez le premier</p>}
          {invoiceTpls.items.map((t) => (
            <div key={t.id} className="grid grid-cols-3 gap-4 items-center px-3 py-2.5 hover:bg-ink-50 rounded-lg">
              <div className="text-sm font-medium text-ink-900 truncate">{t.name}</div>
              <span className="text-xs text-ink-500 capitalize">{t.colorScheme || "brand"}</span>
              <div className="flex gap-2">
                {canEditInvoice && <button onClick={() => setDrawer({ mode: "edit", type: "invoice", item: t })} className="text-xs text-brand-700 hover:underline">Modifier</button>}
                {canDeleteInvoice && <button onClick={() => handleDeleteInvoice(t.id)} className="text-xs text-red-600 hover:underline">Supprimer</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawers */}
      {drawer?.type === "email" && (
        <TemplateDrawer
          title={drawer.mode === "create" ? "Nouveau modèle email" : "Modifier le modèle email"}
          fields={EMAIL_FIELDS}
          initial={drawer.item}
          onSave={handleSaveEmail}
          onClose={() => setDrawer(null)}
        />
      )}
      {drawer?.type === "invoice" && (
        <TemplateDrawer
          title={drawer.mode === "create" ? "Nouveau modèle facture" : "Modifier le modèle facture"}
          fields={INVOICE_FIELDS}
          initial={drawer.item}
          onSave={handleSaveInvoice}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}

// ─── Sauvegarde panel ─────────────────────────────────────────────────────────
function AdminBackupPanel() {
  return (
    <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
      <div className="mb-5">
        <h3 className="font-semibold text-ink-900 text-lg">Sauvegarde &amp; Export</h3>
        <p className="text-xs text-ink-500 mt-1">Gestion des sauvegardes de la base de données</p>
      </div>
      <div className="flex flex-col items-center justify-center py-12 text-ink-400">
        <div className="w-14 h-14 rounded-xl bg-ink-100 flex items-center justify-center mb-4">
          <DatabaseBackup className="w-7 h-7 text-ink-400" />
        </div>
        <p className="font-medium text-ink-600 mb-1">Fonctionnalité en cours de développement</p>
        <p className="text-sm text-center max-w-sm">
          L&apos;API de sauvegarde automatique sera disponible dans une prochaine version.
          Pour exporter vos données manuellement, contactez votre administrateur système.
        </p>
      </div>
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
    case "modeles":      return <AdminModelsPanel />;
    case "audit":        return <AdminAuditPanel />;
    case "sauvegarde":   return <AdminBackupPanel />;
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
