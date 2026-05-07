// src/pages/ButtonHome.jsx
import { DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";

export default function ButtonHome() {
  const [logoError, setLogoError] = useState(false);
  const { data } = useSelector((state) => state.setting);
  const location = useLocation();

  // Build a redirect param so login can return here afterward
  const redirectParam = useMemo(() => {
    const here = `${location.pathname}${location.search || ""}`;
    return encodeURIComponent(here || "/");
  }, [location.pathname, location.search]);

  const headline = "The Trusted ERP Platform for Modern Enterprises";
  const subheadline =
    "Save time, streamline operations, and deliver exceptional experiences your clients will love.";

  // Logo fallback
  const logoRender =
    data?.logo && !logoError ? (
      <img
        onError={() => setLogoError(true)}
        loading="lazy"
        className="h-9 w-auto object-contain"
        src={data.logo}
        alt={data?.companyName || "Logo"}
      />
    ) : (
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-base">Ω</span>
        </div>
        <span className="text-xl font-bold text-gray-900">
          {data?.companyName || "Omega ERP"}
        </span>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
      {/* Animated Background Shapes (hidden on mobile for cleanliness/perf) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden hidden sm:block">
        {/* Circles */}
        <div className="absolute top-20 left-10 w-64 h-64 border-2 border-indigo-200/30 rounded-full"></div>
        <div className="absolute top-40 left-32 w-32 h-32 border-2 border-violet-200/30 rounded-full"></div>
        <div className="absolute bottom-32 left-20 w-48 h-48 border-2 border-blue-200/30 rounded-full"></div>

        {/* Squares */}
        <div className="absolute top-32 right-40 w-40 h-40 border-2 border-purple-200/30 rotate-12"></div>
        <div className="absolute bottom-40 right-20 w-56 h-56 border-2 border-indigo-200/30 -rotate-6"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 border-2 border-pink-200/30 rotate-45"></div>

        {/* Additional decorative elements */}
        <div className="absolute top-1/3 right-1/3 w-16 h-16 bg-gradient-to-br from-indigo-100/20 to-violet-100/20 rounded-lg rotate-12"></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/60">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Company */}
            <div className="flex items-center gap-2">{logoRender}</div>

            {/* Right buttons (mobile-optimized) */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to={`/admin/auth/login?redirect=${redirectParam}`}
                aria-label="Admin Log in"
                className="inline-flex items-center justify-center w-auto whitespace-nowrap shrink-0
      px-2 py-1 text-xs sm:px-3 sm:py-1.5 font-semibold text-white
      bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg
      shadow-md hover:shadow-lg hover:shadow-indigo-500/20 transition-all
      min-h-[32px] sm:min-h-[36px] touch-manipulation
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Admin Login
                </span>
                <span
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 translate-x-[-120%] skew-x-12 bg-white/30 blur-sm
          transition-transform duration-700 group-hover:translate-x-[260%]"
                />
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120px_60px_at_80%_10%,rgba(255,255,255,.25),transparent)] opacity-60" />
              </Link>

              <Link
                to={`/login?redirect=${redirectParam}`}
                aria-label="Customer Log in"
                className="inline-flex items-center justify-center w-auto whitespace-nowrap shrink-0
      px-2 py-1 text-xs sm:px-3 sm:py-1.5 font-medium text-gray-900 bg-white border border-gray-200 rounded-lg
      hover:border-gray-300 hover:bg-gray-50 transition-all
      min-h-[32px] sm:min-h-[36px] touch-manipulation
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Customer Login
                </span>
                <span
                  className="pointer-events-none absolute inset-0 -translate-y-full bg-gradient-to-b from-transparent via-white/40 to-transparent
          opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
                />
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-8rem)] py-12">
            {/* Left */}
            <div className="space-y-10">
              <div className="flex flex-wrap gap-2">
                {["Create", "Manage", "Schedule", "Track", "Scale"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 rounded-full border border-indigo-200/50
                               sm:px-4 sm:py-1.5 sm:text-xs">
                      {tag}
                    </span>
                  ),
                )}
              </div>

              <h1 className="tracking-tight text-[28px] sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                {headline}
              </h1>

              <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed">
                {subheadline}
              </p>

              {/* Hero CTAs (mobile-optimized; side-by-side on mobile) */}
              <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3">
                <Link
                  to={`/admin/auth/login?redirect=${redirectParam}`}
                  className="inline-flex items-center justify-center w-auto whitespace-nowrap shrink-0
      px-3 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm font-semibold text-white
      bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg
      shadow-md hover:shadow-lg hover:shadow-indigo-500/20 transition-all
      min-h-[40px] sm:min-h-[44px] touch-manipulation
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60">
                  Admin Login
                </Link>

                <Link
                  to={`/login?redirect=${redirectParam}`}
                  className="inline-flex items-center justify-center w-auto whitespace-nowrap shrink-0
      px-3 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg
      hover:border-gray-300 hover:bg-gray-50 transition-all
      min-h-[40px] sm:min-h-[44px] touch-manipulation
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50">
                  Customer Login
                </Link>
              </div>
            </div>

            {/* Right – dashboard preview (now responsive for mobile too) */}
            <div className="relative w-full">
              <div
                className="
                  relative
                  mx-auto
                  max-w-[22rem] sm:max-w-[28rem] lg:max-w-none
                  lg:mx-0
                  scale-[0.98] sm:scale-100 lg:scale-100
                  transition-transform
                ">
                <div
                  className="
                    bg-white/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur
                    rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden
                    ring-1 ring-black/5
                  ">
                  {/* Browser bar */}
                  <div className="h-10 bg-gray-100 border-b border-gray-200 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-2">
                      <div className="w-32 h-5 bg-white rounded border border-gray-200 flex items-center px-2">
                        <span className="text-xs text-gray-400">
                          https://{data?.companyName ? data.companyName : "ERP"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Content */}
                  <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-white">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-3 h-3 text-green-600" />
                          <span className="text-[11px] sm:text-xs text-gray-500">
                            Sales
                          </span>
                        </div>
                        <p className="text-base sm:text-lg font-bold text-gray-900">
                          $124K
                        </p>
                        <p className="text-[11px] sm:text-xs text-green-600">
                          +21%
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <ShoppingCart className="w-3 h-3 text-indigo-600" />
                          <span className="text-[11px] sm:text-xs text-gray-500">
                            Orders
                          </span>
                        </div>
                        <p className="text-base sm:text-lg font-bold text-gray-900">
                          1,429
                        </p>
                        <p className="text-[11px] sm:text-xs text-indigo-600">
                          +8%
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-3 h-3 text-amber-600" />
                          <span className="text-[11px] sm:text-xs text-gray-500">
                            Revenue
                          </span>
                        </div>
                        <p className="text-base sm:text-lg font-bold text-gray-900">
                          $89K
                        </p>
                        <p className="text-[11px] sm:text-xs text-amber-600">
                          +12%
                        </p>
                      </div>
                    </div>

                    {/* Main Chart */}
                    <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm mb-3 sm:mb-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-900">
                          Sales Performance
                        </h3>
                        <span className="text-[11px] sm:text-xs text-gray-500">
                          Last 7 months
                        </span>
                      </div>
                      <svg viewBox="0 0 400 120" className="w-full">
                        {[20, 40, 60, 80, 100].map((y) => (
                          <line
                            key={y}
                            x1="0"
                            y1={y}
                            x2="400"
                            y2={y}
                            stroke="#f4f4f5"
                            strokeWidth="1"
                          />
                        ))}
                        <polyline
                          points="40,90 100,70 160,80 220,50 280,60 340,40"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2.5"
                        />
                        <polyline
                          points="40,95 100,85 160,75 220,70 280,65 340,55"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                        />
                        {[40, 100, 160, 220, 280, 340].map((x, i) => {
                          const y = [90, 70, 80, 50, 60, 40][i];
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r="3"
                              fill="#3b82f6"
                            />
                          );
                        })}
                      </svg>
                    </div>

                    {/* Bottom Row */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {/* Bar Chart */}
                      <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-gray-200 shadow-sm">
                        <h4 className="text-[11px] sm:text-xs font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Product Revenue
                        </h4>
                        <svg viewBox="0 0 180 80" className="w-full">
                          {[
                            { x: 10, h: 50, color: "#3b82f6" },
                            { x: 40, h: 40, color: "#8b5cf6" },
                            { x: 70, h: 60, color: "#f59e0b" },
                            { x: 100, h: 30, color: "#10b981" },
                            { x: 130, h: 45, color: "#6366f1" },
                            { x: 160, h: 55, color: "#ec4899" },
                          ].map((bar, i) => (
                            <rect
                              key={i}
                              x={bar.x}
                              y={75 - bar.h}
                              width="18"
                              height={bar.h}
                              fill={bar.color}
                              rx="2"
                            />
                          ))}
                        </svg>
                      </div>

                      {/* Transaction List */}
                      <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-gray-200 shadow-sm">
                        <h4 className="text-[11px] sm:text-xs font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Transaction List
                        </h4>
                        <div className="space-y-2">
                          {[
                            { name: "Cash", pct: 45, color: "bg-blue-500" },
                            {
                              name: "Accounts Payable",
                              pct: 30,
                              color: "bg-purple-500",
                            },
                            {
                              name: "Accounts Receivable",
                              pct: 25,
                              color: "bg-amber-500",
                            },
                          ].map((row, i) => (
                            <div key={i}>
                              <div className="flex justify-between mb-1">
                                <span className="text-[11px] sm:text-xs text-gray-600">
                                  {row.name}
                                </span>
                                <span className="text-[11px] sm:text-xs font-semibold">
                                  {row.pct}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full">
                                <div
                                  className={`h-full ${row.color} rounded-full`}
                                  style={{ width: `${row.pct}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating bits → mobile-এ হাইড, md+ এ দেখাও */}
                <div className="hidden md:flex">
                  <div className="absolute -left-12 bottom-20 w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-lg flex items-center justify-center">
                    <DollarSign className="w-10 h-10 text-white" />
                  </div>

                  <div className="absolute -right-16 top-16 w-28 h-28 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle
                        cx="50"
                        cy="50"
                        r="30"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="30"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="12"
                        strokeDasharray="95 188"
                        transform="rotate(-90 50 50)"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="30"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="12"
                        strokeDasharray="47 188"
                        strokeDashoffset="-95"
                        transform="rotate(-90 50 50)"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="30"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="12"
                        strokeDasharray="46 188"
                        strokeDashoffset="-142"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                  </div>

                  <div className="absolute -right-12 top-64 w-32 h-24 bg-white rounded-xl shadow-lg border border-gray-200 p-3">
                    <svg viewBox="0 0 120 60" className="w-full h-full">
                      <polyline
                        points="10,40 30,25 50,35 70,20 90,30 110,15"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                      />
                      {[10, 30, 50, 70, 90, 110].map((x, i) => {
                        const y = [40, 25, 35, 20, 30, 15][i];
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="2.5"
                            fill="#f59e0b"
                          />
                        );
                      })}
                    </svg>
                  </div>

                  <div className="absolute -right-16 bottom-12 w-24 h-20 bg-amber-400 rounded-xl shadow-lg flex items-center justify-center relative">
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">3</span>
                    </div>
                    <svg
                      className="w-10 h-10 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            {/* End Right */}
          </div>
        </div>
      </section>
    </div>
  );
}
