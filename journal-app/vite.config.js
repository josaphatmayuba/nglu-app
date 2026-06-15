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
      base: "/journal/",
      scope: "/journal/",
      includeAssets: ["journal-icon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/journal/",
        name: "Journal Entreprise",
        short_name: "Journal",
        description: "Fil d'activité, tâches, calendrier et audit de l'entreprise.",
        start_url: "/journal/",
        scope: "/journal/",
        display: "standalone",
        orientation: "any",
        background_color: "#f0f4ff",
        theme_color: "#4f46e5",
        lang: "fr",
        categories: ["business", "productivity"],
        icons: [
          { src: "journal-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "journal-icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "journal-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "journal-icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/journal/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.pathname.startsWith("/api/") &&
              !url.pathname.startsWith("/api/events"),
            handler: "NetworkFirst",
            options: {
              cacheName: "journal-api-cache",
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
  base: "/journal/",
  define: { __BUILD_TS__: JSON.stringify(Date.now()), ...versionDefine() },
  server: {
    proxy: {
      "/api": "http://localhost:8001",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "journal-assets",
  },
});
