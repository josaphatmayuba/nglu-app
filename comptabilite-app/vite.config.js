import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { versionDefine } from "../scripts/app-version.mjs";

// Deux cibles de build pour la MEME app :
//  - defaut        : base "/comptabilite/" (ongdngolu.org/comptabilite + avelomi.com/comptabilite, INCHANGE)
//  - --mode avelomi: base "/" pour le sous-domaine avelomi (root nginx dedie html-comptabilite-avelomi-*)
export default defineConfig(({ mode }) => {
  const BASE = mode === "avelomi" ? "/" : "/comptabilite/";
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      base: BASE,
      scope: BASE,
      includeAssets: ["comptabilite-icon.svg"],
      manifest: {
        id: BASE,
        name: "Comptabilite",
        short_name: "Compta",
        description: "Comptabilite connectee au CRM NGLU.",
        start_url: BASE,
        scope: BASE,
        display: "standalone",
        background_color: "#f8fafc",
        theme_color: "#1e40af",
        lang: "fr",
        icons: [{ src: "comptabilite-icon.svg", sizes: "any", type: "image/svg+xml" }]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: BASE + "index.html",
        navigateFallbackDenylist: [/^\/api\//]
      },
      devOptions: { enabled: false }
    })
  ],
  base: BASE,
  define: {
    __BUILD_TS__: JSON.stringify(Date.now()),
    ...versionDefine()
  },
  server: { proxy: { "/api": "http://localhost:8001" } },
  build: { outDir: "dist", emptyOutDir: true, assetsDir: "comptabilite-assets" }
};
});
