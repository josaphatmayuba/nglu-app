import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { addUser } from "../../redux/rtk/features/user/userSlice";
import { getSetting } from "../../redux/rtk/features/setting/settingSlice";
import { loadPermissionById } from "../../redux/rtk/features/auth/authSlice";
import LoginTable from "../Card/LoginTable";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data, loading } = useSelector((state) => state.setting || {});

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [defaultValue, setDefaultValue] = useState("");

  const handleChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSubmitting(true);
    const resp = await dispatch(addUser(formData));
    if (resp?.payload?.message === "success") {
      dispatch(getSetting());
      dispatch(loadPermissionById(resp.payload?.data?.roleId));
      localStorage.setItem("isLogged", true);
      setSubmitting(false);
      navigate("/admin");
    } else {
      setSubmitting(false);
      toast.error(resp?.payload?.message || "Échec de la connexion");
    }
  };

  useEffect(() => {
    if (defaultValue) {
      setFormData({
        username: defaultValue[0]?.username || "",
        password: defaultValue[0]?.password || "",
      });
    }
  }, [defaultValue]);

  useEffect(() => {
    if (localStorage.getItem("isLogged")) navigate("/admin");
  }, [navigate]);

  const companyName = data?.companyName || "NGOLU";

  return (
    <div className="min-h-screen bg-ink-50 flex">
      {/* Left: form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-12 py-8">
        <div className="w-full max-w-md">
          {/* Logo + brand */}
          <div className="mb-8 flex items-center gap-3">
            {data && !loading && data?.logo && !imageError ? (
              <img
                src={data.logo}
                alt={companyName}
                className="h-10 w-auto max-w-[120px] object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg">
                    {companyName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-semibold text-ink-900 text-lg tracking-tight">
                  {companyName}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-ink-900 tracking-tight">
              Bon retour 👋
            </h1>
            <p className="text-ink-500 text-sm mt-2">
              Connectez-vous pour accéder à votre tableau de bord
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-ink-700 mb-1.5"
              >
                Nom d'utilisateur
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleChange("username", e.target.value)}
                placeholder="ex. admin"
                className="w-full px-3.5 py-2.5 bg-white border border-ink-200 rounded-lg text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-ink-700"
                >
                  Mot de passe
                </label>
                <button
                  type="button"
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  onClick={() =>
                    toast("Contactez votre administrateur pour réinitialiser")
                  }
                >
                  Oublié ?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-white border border-ink-200 rounded-lg text-ink-900 placeholder-ink-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition pr-11"
                  autoComplete="current-password"
                  required
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition"
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="w-full mt-2 py-2.5 rounded-lg font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-70 disabled:cursor-not-allowed transition shadow-sm flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connexion...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Demo login table */}
            {import.meta.env.VITE_LOGIN_TABLE === "true" && (
              <>
                <div className="relative flex items-center justify-center my-5">
                  <div className="border-t border-ink-200 w-full" />
                  <span className="absolute bg-ink-50 px-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                    Ou via démo
                  </span>
                </div>
                <div>
                  <LoginTable setDefaultValue={setDefaultValue} />
                </div>
              </>
            )}
          </form>

          <p className="text-xs text-ink-400 text-center mt-8">
            © {new Date().getFullYear()} {companyName} · Tous droits réservés
          </p>
        </div>
      </div>

      {/* Right: brand panel (hidden on mobile/tablet) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 relative overflow-hidden">
        {/* Subtle pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Subtle glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 text-white w-full">
          <div className="max-w-md">
            <h2 className="text-3xl xl:text-4xl font-semibold tracking-tight mb-4 leading-tight">
              Gérez votre entreprise en toute simplicité.
            </h2>
            <p className="text-brand-100 text-base mb-12">
              Tout ce dont vous avez besoin pour piloter ventes, stocks,
              comptabilité et plus encore — en un seul endroit.
            </p>

            {/* Feature highlights */}
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <Zap className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">Caisse rapide (POS)</h3>
                  <p className="text-brand-100 text-sm mt-0.5">
                    Encaissez en quelques clics, suivi du stock en temps réel
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">Rapports et analyses</h3>
                  <p className="text-brand-100 text-sm mt-0.5">
                    Décisions éclairées grâce à des tableaux de bord clairs
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">Sécurité et permissions</h3>
                  <p className="text-brand-100 text-sm mt-0.5">
                    Gestion fine des rôles pour chaque membre de l'équipe
                  </p>
                </div>
              </div>
            </div>

            {/* Stat strip */}
            <div className="mt-12 pt-8 border-t border-white/15 flex items-center gap-8">
              <div>
                <div className="text-2xl font-semibold">99.9%</div>
                <div className="text-xs text-brand-100 mt-0.5">
                  Disponibilité
                </div>
              </div>
              <div>
                <div className="text-2xl font-semibold">24/7</div>
                <div className="text-xs text-brand-100 mt-0.5">Support</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">10+</div>
                <div className="text-xs text-brand-100 mt-0.5">Modules</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
