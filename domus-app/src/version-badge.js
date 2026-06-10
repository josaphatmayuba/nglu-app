// Badge version — affiché en bas de l'app UNIQUEMENT en mode dev (hostname).
// Source unique : VITE_APP_BASE_VERSION (fichier racine VERSION via scripts/app-version.mjs).
export function mountVersionBadge() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const host = window.location.hostname;
  const isDev = /dev\.|localhost|127\.0\.0\.1/.test(host);
  if (!isDev) return; // jamais en prod
  if (document.getElementById("app-version-badge")) return;
  const base = import.meta.env.VITE_APP_BASE_VERSION || "—";
  const build = import.meta.env.VITE_APP_BUILD_VERSION || base;
  const el = document.createElement("div");
  el.id = "app-version-badge";
  el.title = build;
  el.textContent = `v${base} · dev`;
  el.style.cssText = [
    "position:fixed", "bottom:6px", "right:8px", "z-index:99999",
    "font:10px ui-monospace,Menlo,monospace", "color:rgba(120,120,120,0.7)",
    "background:rgba(0,0,0,0.04)", "padding:2px 6px", "border-radius:6px",
    "pointer-events:none", "user-select:none",
  ].join(";");
  document.body.appendChild(el);
}
