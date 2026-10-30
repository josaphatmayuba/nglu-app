import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const appVersion = readFileSync(
  fileURLToPath(new URL("../VERSION", import.meta.url)),
  "utf8",
).trim();

// Defaut : base "/chat/" (INCHANGE, partage avec ongdngolu.org). --mode avelomi : base "/" (sous-domaine dedie).
export default defineConfig(({ mode }) => {
  const BASE = mode === "avelomi" ? "/" : "/chat/";
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      base: BASE,
      scope: BASE,
      includeAssets: ["chat-icon.svg", "chat-icon-192.png", "chat-icon-512.png"],
      manifest: {
        id: BASE,
        name: "Chat SIFA",
        short_name: "Chat",
        description: "Messagerie d'entreprise SIFA.",
        start_url: BASE,
        scope: BASE,
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
        globPatterns: ["**/*.{js,mjs,wasm,css,html,svg,png,ico,woff2}"],
        navigateFallback: BASE + "index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: { enabled: false },
    }),
  ],
  base: BASE,
  define: { __BUILD_TS__: JSON.stringify(Date.now()), __APP_VERSION__: JSON.stringify(appVersion) },
  server: {
    proxy: { "/api": "http://localhost:8001" },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "chat-assets",
  },
};
});
