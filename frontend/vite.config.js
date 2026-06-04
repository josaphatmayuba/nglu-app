import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { appVersion } from "../scripts/app-version.mjs";

const rootDir = path.resolve(__dirname, "..");
// Version partagée avec PATCH automatique — voir scripts/app-version.mjs.
const { base: baseVersion, build: buildVersion, commit } = appVersion();
let changelog = "";
try {
  changelog = readFileSync(path.resolve(rootDir, "CHANGELOG.md"), "utf8")
    .replace(/https?:\/\/[\w.-]+\.ongdngolu\.org\/api/g, "[api-url]");
} catch {
  try {
    changelog = readFileSync(path.resolve(__dirname, "CHANGELOG.md"), "utf8")
      .replace(/https?:\/\/[\w.-]+\.ongdngolu\.org\/api/g, "[api-url]");
  } catch {
    // use empty changelog
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{spec,test}.{js,jsx,ts,tsx}"],
  },
  plugins: [react()],
  base: "/",
  define: {
    "import.meta.env.VITE_APP_BASE_VERSION": JSON.stringify(baseVersion),
    "import.meta.env.VITE_APP_BUILD_VERSION": JSON.stringify(buildVersion),
    "import.meta.env.VITE_APP_COMMIT": JSON.stringify(commit),
    "import.meta.env.VITE_APP_CHANGELOG": JSON.stringify(changelog),
  },
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
