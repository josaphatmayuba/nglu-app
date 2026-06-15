import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      base: "/tickets/",
      scope: "/tickets/",
      includeAssets: ["tickets-icon.svg"],
      manifest: {
        id: "/tickets/",
        name: "Tickets · SIFA",
        short_name: "Tickets",
        description: "Demandes internes et circuits d'approbation.",
        start_url: "/tickets/",
        scope: "/tickets/",
        display: "standalone",
        orientation: "any",
        background_color: "#e8ecf5",
        theme_color: "#4f46e5",
        lang: "fr",
        categories: ["business", "productivity"],
        icons: [
          { src: "tickets-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "tickets-icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "tickets-icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/tickets/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              url.pathname.startsWith("/api/") &&
              !url.pathname.startsWith("/api/events"),
            handler: "NetworkFirst",
            options: {
              cacheName: "tickets-api-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  base: "/tickets/",
  define: { __BUILD_TS__: JSON.stringify(Date.now()) },
  server: {
    proxy: {
      "/api": "http://localhost:8001",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "tickets-assets",
  },
});
