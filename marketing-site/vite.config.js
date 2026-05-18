import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Emit JS/CSS under /marketing-assets/ so they don't collide with the
    // CRM nginx route `location ^~ /assets/` (which serves frontend/dist).
    assetsDir: "marketing-assets",
  },
});
