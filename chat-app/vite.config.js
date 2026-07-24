import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      base: "/chat/",
      scope: "/chat/",
      includeAssets: ["chat-icon.svg", "chat-icon-192.png", "chat-icon-512.png"],
      manifest: {
        id: "/chat/",
        name: "Chat SIFA",
        short_name: "Chat",
        description: "Messagerie d'entreprise SIFA.",
        start_url: "/chat/",
        scope: "/chat/",
        display: "standalone",
        orientation: "any",
        background_color: "#0f172a",
        theme_color: "#6366f1",
        lang: "fr",
        categories: ["business", "productivity"],
        icons: [
          { src: "chat-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "chat-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          { src: "chat-icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/chat/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: { enabled: false },
    }),
  ],
  base: "/chat/",
  define: { __BUILD_TS__: JSON.stringify(Date.now()) },
  server: {
    proxy: { "/api": "http://localhost:8001" },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "chat-assets",
  },
});
