import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

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
        // Ne jamais intercepter l'API : les appels doivent toucher le réseau.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
  base: "/domus/",
  define: { __BUILD_TS__: JSON.stringify(Date.now()) },
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
