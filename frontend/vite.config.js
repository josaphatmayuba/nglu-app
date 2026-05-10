import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  resolve: {
    alias: {
      // eslint-disable-next-line no-undef
      "@": path.resolve(__dirname, "./src/"),
    },
  },
  // build: {
  //   rollupOptions: {
  //     output: {
  //       manualChunks(id) {
  //         console.log(id);
  //         if (id.includes("node_modules")) {
  //           if (id.includes("antd") || id.includes("@ant-design")) {
  //             return "vendor-large";
  //           }
  //           return "vendor";
  //         }
  //       },
  //     },
  //   },
  // },
});
