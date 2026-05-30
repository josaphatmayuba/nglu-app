import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
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
    // Emit JS/CSS under /marketing-assets/ so they don't collide with the
    // CRM nginx route `location ^~ /assets/` (which serves frontend/dist).
    assetsDir: "marketing-assets",
  },
});
