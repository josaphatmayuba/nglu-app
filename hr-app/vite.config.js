import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { versionDefine } from "../scripts/app-version.mjs";

// Deux cibles de build pour la MEME app :
//  - defaut        : base "/hr/" (ongdngolu.org/hr + avelomi.com/hr, INCHANGE)
//  - --mode avelomi: base "/" pour le sous-domaine avelomi (root nginx dedie html-hr-avelomi-*)
export default defineConfig(({ mode }) => {
  const BASE = mode === "avelomi" ? "/" : "/hr/";
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      base: BASE,
      scope: BASE,
      includeAssets: ["hr-icon.svg"],
      manifest: {
        id: BASE,
        name: "Ressources Humaines",
        short_name: "HR",
        description: "Gestion RH connectee au CRM NGLU.",
        start_url: BASE,
        scope: BASE,
        display: "standalone",
        background_color: "#f8fafc",
        theme_color: "#0f766e",
        lang: "fr",
        icons: [{ src: "hr-icon.svg", sizes: "any", type: "image/svg+xml" }]
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
  build: { outDir: "dist", emptyOutDir: true, assetsDir: "hr-assets" }
};
});
