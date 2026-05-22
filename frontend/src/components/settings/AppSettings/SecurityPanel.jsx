import axios from "axios";
import { CheckCircle, Shield, ShieldOff, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

// ── helpers ────────────────────────────────────────────────────────────────
const userId = () => parseInt(localStorage.getItem("id") || "0", 10);

// ── MFA enable flow (3 steps: idle → setup → confirm) ─────────────────────
function MfaEnableFlow({ onEnabled }) {
  const [step, setStep] = useState("idle"); // idle | setup | confirm | done
  const [setupData, setSetupData] = useState(null); // { qrDataUrl, recoveryCodes }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCodes, setShowCodes] = useState(false);

  const startSetup = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post("auth/mfa/setup");
      setSetupData(data);
      setStep("setup");
    } catch {
      toast.error("Erreur lors du démarrage de la configuration MFA.");
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      await axios.post("auth/mfa/verify", { code: code.trim() });
      setStep("done");
      toast.success("Authentification à 2 facteurs activée.");
      onEnabled();
    } catch {
      toast.error("Code incorrect. Vérifiez votre application et réessayez.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "idle") {
    return (
      <button
        type="button"
        onClick={startSetup}
        disabled={busy}
        className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 transition"
      >
        {busy ? "Chargement…" : "Activer MFA"}
      </button>
    );
  }

  if (step === "setup") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-700">
          Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.),
          puis entrez le code à 6 chiffres pour confirmer.
        </p>
        {setupData?.qrDataUrl && (
          <div className="flex justify-center">
            <img src={setupData.qrDataUrl} alt="QR Code MFA" className="w-44 h-44 border border-ink-200 rounded-lg p-2 bg-white" />
          </div>
        )}
        {setupData?.recoveryCodes?.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-amber-800">Codes de récupération (sauvegardez-les !)</p>
              <button type="button" onClick={() => setShowCodes((v) => !v)} className="text-amber-700 text-xs underline">
                {showCodes ? "Masquer" : "Afficher"}
              </button>
            </div>
            {showCodes && (
              <div className="grid grid-cols-2 gap-1 font-mono text-xs text-amber-900">
                {setupData.recoveryCodes.map((c, i) => (
                  <span key={i} className="bg-white rounded px-2 py-0.5">{c}</span>
                ))}
              </div>
            )}
            <p className="text-xs text-amber-700 mt-2">Ces codes ne seront plus affichés. Conservez-les en lieu sûr.</p>
          </div>
        )}
        <form onSubmit={confirmSetup} className="flex items-center gap-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="w-32 px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm font-mono text-center focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition"
          >
            {busy ? "Vérification…" : "Confirmer"}
          </button>
          <button type="button" onClick={() => { setStep("idle"); setCode(""); }} className="text-sm text-ink-500 hover:text-ink-700 underline">
            Annuler
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
      <CheckCircle className="w-5 h-5" />
      MFA activé avec succès.
    </div>
  );
}

// ── MFA disable flow ────────────────────────────────────────────────────────
function MfaDisableFlow({ onDisabled }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDisable = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await axios.post("auth/mfa/disable", { password, code: code.trim() });
      toast.success("Authentification à 2 facteurs désactivée.");
      onDisabled();
    } catch {
      toast.error("Mot de passe ou code incorrect.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-white border border-red-300 hover:border-red-400 text-red-600 text-sm font-medium rounded-lg transition"
      >
        Désactiver MFA
      </button>
    );
  }

  return (
    <form onSubmit={handleDisable} className="space-y-3 max-w-xs">
      <div>
        <label className="text-xs font-medium text-ink-700 block mb-1">Mot de passe actuel</label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-3 py-2 pr-9 bg-white border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-ink-700 block mb-1">Code TOTP (appli auth)</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="w-32 px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm font-mono text-center focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy || !password || code.length !== 6}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition"
        >
          {busy ? "Désactivation…" : "Confirmer la désactivation"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setPassword(""); setCode(""); }} className="text-sm text-ink-500 hover:text-ink-700 underline">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────
export default function SecurityPanel() {
  const [mfaEnabled, setMfaEnabled] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const id = userId();
    if (!id) { setMfaEnabled(false); return; }
    axios.get(`user/${id}`)
      .then(({ data }) => setMfaEnabled(Boolean(data.totpEnabled)))
      .catch(() => { setLoadError(true); setMfaEnabled(false); });
  }, []);

  if (mfaEnabled === null) {
    return <div className="py-8 text-center text-ink-400 text-sm">Chargement…</div>;
  }

  return (
    <div className="space-y-4 p-4">
      {/* MFA card */}
      <div className="bg-white rounded-xl border border-ink-200 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-ink-900 text-lg flex items-center gap-2">
              {mfaEnabled
                ? <Shield className="w-5 h-5 text-emerald-600" />
                : <ShieldOff className="w-5 h-5 text-ink-400" />
              }
              Authentification à 2 facteurs (MFA)
            </h3>
            <p className="text-xs text-ink-500 mt-1">
              Sécurisez votre compte avec une application TOTP (Google Authenticator, Authy)
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            mfaEnabled ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-500"
          }`}>
            {mfaEnabled ? "Activé" : "Désactivé"}
          </span>
        </div>

        {loadError && (
          <p className="text-xs text-amber-600 mb-3">Impossible de charger le statut MFA. Les actions restent disponibles.</p>
        )}

        {mfaEnabled
          ? <MfaDisableFlow onDisabled={() => setMfaEnabled(false)} />
          : <MfaEnableFlow onEnabled={() => setMfaEnabled(true)} />
        }
      </div>

      {/* Info card */}
      <div className="bg-ink-50 rounded-xl border border-ink-200 p-4 text-xs text-ink-600">
        <p className="font-semibold mb-1">Comment ça fonctionne ?</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Installez <strong>Google Authenticator</strong> ou <strong>Authy</strong> sur votre téléphone.</li>
          <li>Cliquez sur "Activer MFA" et scannez le QR code affiché.</li>
          <li>À chaque connexion, l'application génère un code valide 30 secondes.</li>
          <li>Les codes de récupération permettent l'accès si vous perdez votre téléphone.</li>
        </ul>
      </div>
    </div>
  );
}
