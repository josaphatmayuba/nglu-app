import {
  Bell,
  Building,
  CreditCard,
  DatabaseBackup,
  FileText,
  History,
  Info,
  Palette,
  Plug,
  Shield,
  User,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import AboutPanel from "./AppSettings/AboutPanel";
import GeneralSetting from "./AppSettings/GeneralSetting";
import SecurityPanel from "./AppSettings/SecurityPanel";
import AdminAudit from "./AdminSettings/tabs/AdminAudit";
import AdminBackup from "./AdminSettings/tabs/AdminBackup";
import AdminModels from "./AdminSettings/tabs/AdminModels";
import AdminUsers from "./AdminSettings/tabs/AdminUsers";

// ─── Simple placeholder panels ───────────────────────────────────────────────

function ProfilePanel() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-ink-900 text-lg">Mon profil</h3>
        <p className="text-xs text-ink-500 mt-1">
          Vos informations personnelles et préférences de compte
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-2xl select-none">
          {(localStorage.getItem("user") || "U")[0].toUpperCase()}
        </div>
        <div className="flex flex-col gap-1">
          <button className="px-3 py-1.5 border border-ink-200 hover:border-ink-300 rounded-lg text-sm text-ink-700 transition">
            Changer la photo
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-ink-700 mb-1.5 block">Prénom</label>
          <input
            type="text"
            defaultValue=""
            placeholder="Prénom"
            className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink-700 mb-1.5 block">Nom</label>
          <input
            type="text"
            defaultValue=""
            placeholder="Nom"
            className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink-700 mb-1.5 block">Email</label>
          <input
            type="email"
            defaultValue=""
            placeholder="email@exemple.com"
            className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink-700 mb-1.5 block">Téléphone</label>
          <input
            type="tel"
            defaultValue=""
            placeholder="+243 999 000 000"
            className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
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
        <button className="px-4 py-2 text-sm text-ink-700 hover:bg-ink-100 rounded-lg transition">
          Annuler
        </button>
        <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition">
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const [prefs, setPrefs] = useState({
    email: true,
    sms: false,
    push: true,
    newsletter: false,
  });
  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const items = [
    { key: "email", label: "Notifications par email", desc: "Recevoir les alertes importantes par email" },
    { key: "sms", label: "Notifications SMS", desc: "Recevoir les alertes urgentes par SMS" },
    { key: "push", label: "Notifications push", desc: "Notifications dans le navigateur" },
    { key: "newsletter", label: "Newsletter", desc: "Actualités et nouveautés de l'application" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-ink-900 text-lg">Notifications</h3>
        <p className="text-xs text-ink-500 mt-1">Gérez vos préférences de notification</p>
      </div>
      <div className="divide-y divide-ink-100">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium text-ink-800">{item.label}</p>
              <p className="text-xs text-ink-500 mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                prefs[item.key] ? "bg-brand-600" : "bg-ink-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  prefs[item.key] ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppearancePanel() {
  const [dark, setDark] = useState(false);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-ink-900 text-lg">Apparence</h3>
        <p className="text-xs text-ink-500 mt-1">Personnalisez l&apos;interface de l&apos;application</p>
      </div>
      <div className="flex items-center justify-between py-4 border-b border-ink-100">
        <div>
          <p className="text-sm font-medium text-ink-800">Mode sombre</p>
          <p className="text-xs text-ink-500 mt-0.5">Activer le thème sombre (bientôt disponible)</p>
        </div>
        <button
          onClick={() => setDark((d) => !d)}
          disabled
          className="relative inline-flex h-6 w-11 items-center rounded-full bg-ink-200 opacity-50 cursor-not-allowed"
        >
          <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow translate-x-1" />
        </button>
      </div>
      <p className="text-sm text-ink-400 italic">
        La personnalisation avancée de l&apos;apparence sera disponible dans une prochaine version.
      </p>
    </div>
  );
}

function PlaceholderSettingsPanel({ title, desc }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-ink-900 text-lg">{title}</h3>
        <p className="text-xs text-ink-500 mt-1">{desc}</p>
      </div>
      <div className="flex flex-col items-center justify-center py-12 text-ink-400">
        <div className="w-12 h-12 rounded-xl bg-ink-100 flex items-center justify-center mb-4">
          <Info className="w-6 h-6 text-ink-400" />
        </div>
        <p className="font-medium text-ink-600">Fonctionnalité à venir</p>
        <p className="text-sm mt-1">Cette section sera disponible dans une prochaine version.</p>
      </div>
    </div>
  );
}

// ─── Navigation config ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: "entreprise", label: "Entreprise", icon: Building },
  { key: "profil", label: "Profil", icon: User },
  { key: "securite", label: "Sécurité", icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "apparence", label: "Apparence", icon: Palette },
  { key: "facturation", label: "Facturation", icon: CreditCard },
  { key: "integrations", label: "Intégrations", icon: Plug },
  null, // separator
  { key: "utilisateurs", label: "Utilisateurs & Rôles", icon: UsersRound },
  { key: "modeles", label: "Modèles", icon: FileText },
  { key: "audit", label: "Audit & Journaux", icon: History },
  { key: "sauvegarde", label: "Sauvegarde & Export", icon: DatabaseBackup },
  { key: "apropos", label: "À propos", icon: Info },
];

function renderPanel(activeKey) {
  switch (activeKey) {
    case "entreprise":
      return <GeneralSetting />;
    case "profil":
      return <ProfilePanel />;
    case "securite":
      return <SecurityPanel />;
    case "notifications":
      return <NotificationsPanel />;
    case "apparence":
      return <AppearancePanel />;
    case "facturation":
      return (
        <PlaceholderSettingsPanel
          title="Facturation"
          desc="Gérez votre abonnement et vos informations de paiement"
        />
      );
    case "integrations":
      return (
        <PlaceholderSettingsPanel
          title="Intégrations"
          desc="Connectez des services et API tiers à votre application"
        />
      );
    case "utilisateurs":
      return <AdminUsers />;
    case "modeles":
      return <AdminModels />;
    case "audit":
      return <AdminAudit />;
    case "sauvegarde":
      return <AdminBackup />;
    case "apropos":
      return <AboutPanel />;
    default:
      return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsPanel() {
  const [active, setActive] = useState("entreprise");

  return (
    <div>
      <div className="mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-ink-900 tracking-tight">
          Paramètres
        </h1>
        <p className="text-xs md:text-sm text-ink-500 mt-1">
          Configuration générale de votre application
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left sidebar nav */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-ink-200 p-2 space-y-0.5">
            {NAV_ITEMS.map((item, idx) => {
              if (item === null) {
                return <div key={`sep-${idx}`} className="my-1 border-t border-ink-100" />;
              }
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActive(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                    isActive
                      ? "bg-brand-50 text-brand-700 font-medium"
                      : "hover:bg-ink-100 text-ink-600"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
            {renderPanel(active)}
          </div>
        </div>
      </div>
    </div>
  );
}
