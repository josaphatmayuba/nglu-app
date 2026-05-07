import { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  TrendingUp,
  Package,
  DollarSign,
  BarChart3,
  Activity,
  Users,
  LogIn,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { addUser } from "../../redux/rtk/features/user/userSlice";
import { getSetting } from "../../redux/rtk/features/setting/settingSlice";
import { loadPermissionById } from "../../redux/rtk/features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import LoginTable from "../Card/LoginTable";
import toast from "react-hot-toast";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data, loading } = useSelector((state) => state.setting || {});

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loader, setLoader] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [defaultValue, setDefaultValue] = useState("");

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoader(true);
    const resp = await dispatch(addUser(formData));
    if (resp?.payload?.message === "success") {
      dispatch(getSetting());
      dispatch(loadPermissionById(resp.payload?.data?.roleId));
      localStorage.setItem("isLogged", true);
      setLoader(false);
      navigate("/admin");
    } else {
      setLoader(false);
      toast.error(resp?.payload?.message || "Login failed");
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
    const isLogged = Boolean(localStorage.getItem("isLogged"));
    if (isLogged) navigate("/admin");
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-gray-100 overflow-hidden mx-3 md:mx-0">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-pink-100 via-pink-50 to-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"
          style={{
            boxShadow:
              "0 0 30px rgba(255, 240, 245, 0.6), 0 0 60px rgba(255, 240, 245, 0.4)",
          }}
        ></div>
        <div
          className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-blue-100 via-sky-50 to-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"
          style={{
            animationDelay: "2s",
            boxShadow:
              "0 0 30px rgba(240, 248, 255, 0.6), 0 0 60px rgba(240, 248, 255, 0.4)",
          }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-bl from-slate-100 via-gray-50 to-slate-100 rounded-full mix-blend-multiply filter blur-3xl opacity-35 animate-pulse"
          style={{
            animationDelay: "4s",
            boxShadow:
              "0 0 30px rgba(248, 250, 252, 0.5), 0 0 60px rgba(248, 250, 252, 0.3)",
          }}
        ></div>
        {/* New animated elements - gradient backgrounds */}
        <div
          className="absolute top-16 left-16 w-48 h-48 bg-gradient-to-r from-rose-100 via-pink-50 to-rose-50 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-pulse"
          style={{
            animationDelay: "1s",
            boxShadow:
              "0 0 25px rgba(255, 241, 242, 0.5), 0 0 50px rgba(255, 241, 242, 0.3)",
          }}
        ></div>
        <div
          className="absolute bottom-24 right-24 w-56 h-56 bg-gradient-to-l from-sky-100 via-blue-50 to-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-35 animate-pulse"
          style={{
            animationDelay: "3s",
            boxShadow:
              "0 0 25px rgba(240, 249, 255, 0.5), 0 0 50px rgba(240, 249, 255, 0.3)",
          }}
        ></div>
        <div
          className="absolute top-1/3 right-1/3 w-52 h-52 bg-gradient-to-tl from-violet-100 via-purple-50 to-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"
          style={{
            animationDelay: "5s",
            boxShadow:
              "0 0 25px rgba(250, 245, 255, 0.5), 0 0 50px rgba(250, 245, 255, 0.3)",
          }}
        ></div>
        <div
          className="absolute bottom-1/3 left-1/3 w-44 h-44 bg-gradient-to-br from-cyan-100 via-teal-50 to-blue-100 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-pulse"
          style={{
            animationDelay: "6s",
            boxShadow:
              "0 0 20px rgba(240, 253, 255, 0.5), 0 0 40px rgba(240, 253, 255, 0.3)",
          }}
        ></div>
      </div>

      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12 items-center py-8">
          {/* Left Side - Login Form */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              {/* Glass morphism card */}
              <div className="bg-white backdrop-blur-xl rounded-xl p-8 ">
                {/* Logo */}
                <div className="mb-8 flex items-center gap-3 justify-center lg:justify-start">
                  {data && !loading && data?.logo && !imageError ? (
                    <img
                      src={data.logo}
                      alt="Logo"
                      className="w-16 h-16 rounded-2xl object-contain"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-400 via-slate-500 to-slate-500 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-500/50">
                      <Package className="w-8 h-8 text-black" />
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="mb-8 text-center lg:text-left">
                  <h1 className="text-3xl font-bold text-black mb-2">
                    Welcome back
                  </h1>
                  <p className="text-black">Sign in to access your dashboard</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleChange("username", e.target.value)}
                      placeholder="Enter your username"
                      className="w-full px-4 py-3.5 bg-white/10 backdrop-blur-sm border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      autoComplete="username"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          handleChange("password", e.target.value)
                        }
                        placeholder="Enter your password"
                        className="w-full px-4 py-3.5 bg-white/10 backdrop-blur-sm border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-12"
                        autoComplete="current-password"
                        required
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition-colors"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loader}
                    aria-busy={loader}
                    className={`w-full mt-6 py-3 rounded-xl font-semibold text-white transition-transform shadow-sm relative overflow-hidden flex items-center justify-center gap-3 ${
                      loader
                        ? "bg-primary cursor-not-allowed opacity-90"
                        : "bg-gradient-to-r from-primary via-primary to-primary hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                  >
                    {loader ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing In...
                      </span>
                    ) : (
                      <>
                        <span className="uppercase tracking-wide">Sign In</span>
                      </>
                    )}
                  </button>

                  {/* Demo Login Table */}
                  {import.meta.env.VITE_LOGIN_TABLE === "true" && (
                    <>
                      <div className="relative flex items-center justify-center my-4">
                        <div className="border-t border-white/20 w-full" />
                        <span className="absolute bg-transparent px-3 text-xs font-medium text-black">
                          Or
                        </span>
                      </div>

                      <div className="pt-2">
                        <LoginTable setDefaultValue={setDefaultValue} />
                      </div>
                    </>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* Right Side - Analytics Dashboard Preview */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-full max-w-xl space-y-6">
              {/* Main Chart Card */}
              <div className="bg-white backdrop-blur-xl rounded-3xl p-6 border border-white relative">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-black">
                      Weekly Analytics
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Performance Overview
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Line Chart */}
                <div className="bg-white rounded-2xl p-4">
                  <svg viewBox="0 0 400 160" className="w-full h-40">
                    <defs>
                      <linearGradient
                        id="chartGradient"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor="#06b6d4"
                          stopOpacity="0.4"
                        />
                        <stop
                          offset="100%"
                          stopColor="#06b6d4"
                          stopOpacity="0.05"
                        />
                      </linearGradient>
                      <linearGradient
                        id="lineGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#0FAEDA" />
                        <stop offset="50%" stopColor="#0FAEDA" />
                        <stop offset="100%" stopColor="#0FAEDA" />
                      </linearGradient>
                    </defs>

                    {/* Grid */}
                    {[40, 80, 120].map((y) => (
                      <line
                        key={y}
                        x1="20"
                        x2="380"
                        y1={y}
                        y2={y}
                        stroke="rgba(0,0,0,0.1)"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Area */}
                    <path
                      d="M 30,90 L 80,70 L 130,80 L 180,50 L 230,60 L 280,35 L 330,45 L 370,25 L 370,160 L 30,160 Z"
                      fill="url(#chartGradient)"
                    />

                    {/* Line */}
                    <polyline
                      points="30,90 80,70 130,80 180,50 230,60 280,35 330,45 370,25"
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Points */}
                    {[30, 80, 130, 180, 230, 280, 330, 370].map((x, i) => {
                      const y = [90, 70, 80, 50, 60, 35, 45, 25][i];
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="5"
                          fill="white"
                          stroke="url(#lineGradient)"
                          strokeWidth="2"
                        />
                      );
                    })}
                  </svg>

                  {/* Labels */}
                  <div className="flex justify-between text-xs font-medium text-gray-600 mt-3 px-2">
                    {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                      (day) => (
                        <span key={day}>{day}</span>
                      )
                    )}
                  </div>
                </div>
                {/* Total Revenue Circular Progress */}
                <div className="bg-white backdrop-blur-xl rounded-2xl p-5 border border-white flex flex-col items-center justify-center absolute -top-20 -right-10 shadow-sm ">
                  <h4 className="text-sm font-semibold text-black mb-4">
                    Total Revenue
                  </h4>
                  <div className="relative w-32 h-32">
                    <svg
                      className="w-full h-full transform -rotate-90"
                      viewBox="0 0 120 120"
                    >
                      <defs>
                        <linearGradient
                          id="progressGradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#0891b2" />
                        </linearGradient>
                      </defs>
                      {/* Background circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#e0f2f1"
                        strokeWidth="12"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="url(#progressGradient)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 50 * 0.42} ${
                          2 * Math.PI * 50
                        }`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-xs text-gray-500 mb-1">Total</p>
                      <p className="text-3xl font-bold text-teal-600">42%</p>
                      <p className="text-xs text-gray-500 mt-1">Progress</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white backdrop-blur-xl rounded-2xl p-5 border border-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-black">1,234+</p>
                      <p className="text-sm text-gray-600">Active Orders</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+12% from last week</span>
                  </div>
                </div>

                <div className="bg-white backdrop-blur-xl rounded-2xl p-5 border border-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-black">856</p>
                      <p className="text-sm text-gray-600">Total Users</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+8% from last week</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
