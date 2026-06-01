import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // L'app est servie sous /farmos/ par nginx; tout le scope PWA doit l'etre aussi.
      base: "/farmos/",
      scope: "/farmos/",
      includeAssets: [
        "farmos-icon.svg",
        "apple-touch-icon.png",
        "styles/app.css",
        "styles/farm-tokens.css",
        "styles/tokens.css",
      ],
      manifest: {
        id: "/farmos/",
        name: "FarmOS Pro · Élevage intelligent",
        short_name: "FarmOS",
        description: "Gestion de troupeau, traitements, alertes et reproduction.",
        start_url: "/farmos/",
        scope: "/farmos/",
        display: "standalone",
        orientation: "any",
        background_color: "#FBF8F2",
        theme_color: "#0E2418",
        lang: "fr",
        categories: ["business", "productivity", "utilities"],
        icons: [
          { src: "farmos-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "farmos-icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "farmos-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "farmos-icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Limite a 5 Mo par fichier precache (utile pour les chunks TF.js).
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/farmos/index.html",
        // Ne jamais intercepter les appels API : ils doivent toujours toucher le reseau.
        navigateFallbackDenylist: [/^\/api\//],
        // Offline data is handled by Dexie + outbox. Do not let Workbox
        // StaleWhileRevalidate duplicate /api/farmos requests.
        runtimeCaching: [],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: "/farmos/",
  define: {
    __BUILD_TS__: JSON.stringify(Date.now()),
  },
  server: {
    proxy: {
      "/api": "http://localhost:8001",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "farmos-assets",
  },
});
