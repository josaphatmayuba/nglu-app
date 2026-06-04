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
      base: "/batipro/",
      scope: "/batipro/",
      includeAssets: ["batipro-icon.svg"],
      manifest: {
        id: "/batipro/",
        name: "BatiPro Construction",
        short_name: "BatiPro",
        description: "Gestion de chantiers, main-d'oeuvre, materiaux et budgets.",
        start_url: "/batipro/",
        scope: "/batipro/",
        display: "standalone",
        orientation: "any",
        background_color: "#f8fafc",
        theme_color: "#172554",
        lang: "fr",
        categories: ["business", "productivity", "utilities"],
        icons: [
          { src: "batipro-icon.svg", sizes: "any", type: "image/svg+xml" }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/batipro/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: []
      },
      devOptions: { enabled: false }
    })
  ],
  base: "/batipro/",
  define: {
    __BUILD_TS__: JSON.stringify(Date.now()),
    ...versionDefine()
  },
  server: {
    proxy: {
      "/api": "http://localhost:8001"
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "batipro-assets"
  }
});
