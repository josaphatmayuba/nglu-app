import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "path";
import { defineConfig } from "vite";

const rootDir = path.resolve(__dirname, "..");
let baseVersion = "3.2.0";
try {
  baseVersion = readFileSync(path.resolve(rootDir, "VERSION"), "utf8").trim();
} catch {
  try {
    baseVersion = readFileSync(path.resolve(__dirname, "VERSION"), "utf8").trim();
  } catch {
    // use default
  }
}

function git(command, fallback) {
  try {
    return execSync(command, { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return fallback;
  }
}

const commit = git("git rev-parse --short HEAD", "unknown");
const isDirty = Boolean(git("git status --short --untracked-files=no", ""));
const buildVersion = `${baseVersion}+${commit}${isDirty ? ".dirty" : ""}`;
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
