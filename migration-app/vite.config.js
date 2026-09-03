import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { versionDefine } from "../scripts/app-version.mjs";

// Migration Cockpit — outil interne (lecture seule) pour piloter la migration
// legacy PostgreSQL -> Drizzle/MySQL. Servi sous /migration/ par nginx, comme
// Domus l'est sous /domus/. Pas de PWA/offline : outil d'admin, pas mobile.
export default defineConfig({
  plugins: [react()],
  base: "/migration/",
  define: { __BUILD_TS__: JSON.stringify(Date.now()), ...versionDefine() },
  server: {
    proxy: {
      "/api": "http://localhost:8001",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "migration-assets",
  },
});
