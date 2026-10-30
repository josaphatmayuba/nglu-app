import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { versionDefine } from "../scripts/app-version.mjs";

// Migration Cockpit — outil interne (lecture seule) pour piloter la migration
// legacy PostgreSQL -> Drizzle/MySQL. Servi sous /migration/ par nginx, comme
// Domus l'est sous /domus/. Pas de PWA/offline : outil d'admin, pas mobile.
// Defaut : base "/migration/" (INCHANGE, partage avec ongdngolu.org). --mode avelomi : base "/" (sous-domaine dedie).
export default defineConfig(({ mode }) => {
  const BASE = mode === "avelomi" ? "/" : "/migration/";
  return {
  plugins: [react()],
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
    assetsDir: "migration-assets",
  },
};
});
