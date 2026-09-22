import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { versionDefine } from "../scripts/app-version.mjs";

// Domus — gestion locative (spin-off du module property-management).
// Servie sous /domus/ par nginx, comme FarmOS l'est sous /farmos/.
// Deux cibles de build pour la MEME app :
//  - defaut        : base "/domus/" (ongdngolu.org/domus + avelomi.com/domus, INCHANGE)
//  - --mode avelomi: base "/" pour le sous-domaine avelomi (root nginx dedie html-domus-avelomi-*)
export default defineConfig(({ mode }) => {
  const BASE = mode === "avelomi" ? "/" : "/domus/";
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      base: BASE,
      scope: BASE,
      includeAssets: ["domus-icon.svg", "apple-touch-icon.png"],
      manifest: {
        id: BASE,
        name: "Domus · Gestion locative",
        short_name: "Domus",
        description: "Biens, baux, loyers (mobile money) et maintenance.",
        start_url: BASE,
        scope: BASE,
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
        navigateFallback: BASE + "index.html",
        // La navigation ne doit jamais retomber sur l'API.
        // Les pages PUBLIQUES a token (portail locataire, onboarding,
        // prelocation, reservations) sont exclues du fallback : servir le
        // index.html precache y renvoyait un ancien bundle, qui ignore la route
        // et affiche l'ecran de connexion au lieu de la page publique.
        navigateFallbackDenylist: [
          /^\/api\//,
          /\/mon-espace/,
          /\/onboarding\//,
          /\/prescreening\//,
          /\/public(\/|$)/,
        ],
        // Lecture hors ligne : on garde la dernière réponse connue des GET API.
        // NetworkFirst = réseau d'abord (données fraîches), sinon cache (offline).
        runtimeCaching: [
          {
            // Les reponses des endpoints PUBLICS a token ne sont jamais mises
            // en cache : elles contiennent les donnees personnelles d'UN
            // locataire, et le cache survit 7 jours sur l'appareil. Sur un
            // telephone partage, un autre locataire pourrait les relire.
            urlPattern: ({ url, request }) => request.method === "GET"
              && url.pathname.startsWith("/api/")
              && !url.pathname.startsWith("/api/events")
              && !url.pathname.startsWith("/api/tenant-portal")
              && !url.pathname.startsWith("/api/tenant-onboarding")
              && !url.pathname.startsWith("/api/tenant-prescreening"),
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
  base: BASE,
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
};
});
