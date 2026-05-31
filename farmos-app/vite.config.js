import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/farmos/",
  define: {
    __BUILD_TS__: JSON.stringify(Date.now()),
  },
  server: {
    proxy: {
      "/api": "http://localhost:8001",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Sous /farmos-assets/ pour ne pas entrer en conflit avec le CRM (/assets/).
    assetsDir: "farmos-assets",
  },
});
