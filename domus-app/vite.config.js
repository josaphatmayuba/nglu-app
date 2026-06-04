import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { versionDefine } from "../scripts/app-version.mjs";

// Domus — gestion locative (spin-off du module property-management).
// Servie sous /domus/ par nginx, comme FarmOS l'est sous /farmos/.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      base: "/domus/",
      scope: "/domus/",
      includeAssets: ["domus-icon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/domus/",
        name: "Domus · Gestion locative",
        short_name: "Domus",
        description: "Biens, baux, loyers (mobile money) et maintenance.",
        start_url: "/domus/",
        scope: "/domus/",
        display: "standalone",
        orientation: "any",
        background_color: "#e8ecf5",
        theme_color: "#4f46e5",
        lang: "fr",
        categories: ["business", "productivity", "finance"],
        icons: [
          { src: "domus-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "domus-icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "domus-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "domus-icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/domus/index.html",
        // La navigation ne doit jamais retomber sur l'API.
        navigateFallbackDenylist: [/^\/api\//],
        // Lecture hors ligne : on garde la dernière réponse connue des GET API.
        // NetworkFirst = réseau d'abord (données fraîches), sinon cache (offline).
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => request.method === "GET"
              && url.pathname.startsWith("/api/")
              && !url.pathname.startsWith("/api/events"),
            handler: "NetworkFirst",
            options: {
              cacheName: "domus-api-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  base: "/domus/",
  define: { __BUILD_TS__: JSON.stringify(Date.now()), ...versionDefine() },
  server: {
    proxy: {
      "/api": "http://localhost:8001",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "domus-assets",
  },
});
