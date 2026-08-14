import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { versionDefine } from "../scripts/app-version.mjs";

// Deux cibles de build pour la MEME app :
//  - defaut        : base "/batipro/" (ongdngolu.org/batipro + avelomi.com/batipro, INCHANGE)
//  - --mode avelomi: base "/" pour le sous-domaine avelomi (root nginx dedie html-batipro-avelomi-*)
export default defineConfig(({ mode }) => {
  const BASE = mode === "avelomi" ? "/" : "/batipro/";
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      base: BASE,
      scope: BASE,
      includeAssets: ["batipro-icon.svg"],
      manifest: {
        id: BASE,
        name: "BatiPro Construction",
        short_name: "BatiPro",
        description: "Gestion de chantiers, main-d'oeuvre, materiaux et budgets.",
        start_url: BASE,
        scope: BASE,
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
        navigateFallback: BASE + "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        // Lecture hors ligne : on garde la derniere reponse connue des GET API.
        // NetworkFirst = reseau d'abord (donnees fraiches), sinon cache (offline).
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => request.method === "GET"
              && url.pathname.startsWith("/api/")
              && !url.pathname.startsWith("/api/events"),
            handler: "NetworkFirst",
            options: {
              cacheName: "batipro-api-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  base: BASE,
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
};
});
