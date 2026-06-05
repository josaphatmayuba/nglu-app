import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { versionDefine } from "../scripts/app-version.mjs";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      base: "/comptabilite/",
      scope: "/comptabilite/",
      includeAssets: ["comptabilite-icon.svg"],
      manifest: {
        id: "/comptabilite/",
        name: "Comptabilite",
        short_name: "Compta",
        description: "Comptabilite connectee au CRM NGLU.",
        start_url: "/comptabilite/",
        scope: "/comptabilite/",
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
        navigateFallback: "/comptabilite/index.html",
        navigateFallbackDenylist: [/^\/api\//]
      },
      devOptions: { enabled: false }
    })
  ],
  base: "/comptabilite/",
  define: {
    __BUILD_TS__: JSON.stringify(Date.now()),
    ...versionDefine()
  },
  server: { proxy: { "/api": "http://localhost:8001" } },
  build: { outDir: "dist", emptyOutDir: true, assetsDir: "comptabilite-assets" }
});
