import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { versionDefine } from "../scripts/app-version.mjs";

// KodaTill — app de caisse/POS multi-activite, servie sous /kodatill/ par
// nginx (meme pattern que farmos-app : SPA + PWA installable). Base fixe
// pour l'instant (pas de mode avelomi comme farmos, pas demande sur ce ticket).
const BASE = "/kodatill/";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      base: BASE,
      scope: BASE,
      includeAssets: ["kodatill-icon.svg", "apple-touch-icon.png", "styles/app.css"],
      manifest: {
        id: BASE,
        name: "KodaTill · Caisse",
        short_name: "KodaTill",
        description: "Caisse / point de vente multi-activite.",
        start_url: BASE,
        scope: BASE,
        display: "standalone",
        orientation: "any",
        background_color: "#FBF8F2",
        theme_color: "#1f6d75",
        lang: "fr",
        categories: ["business", "productivity"],
        icons: [
          { src: "kodatill-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "kodatill-icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: BASE + "index.html",
        // Ne jamais intercepter les appels API : ils doivent toujours toucher le reseau.
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
              cacheName: "kodatill-api-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: BASE,
  define: {
    __BUILD_TS__: JSON.stringify(Date.now()),
    ...versionDefine(),
  },
  server: {
    proxy: {
      "/api": "http://localhost:8001",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "kodatill-assets",
  },
});
