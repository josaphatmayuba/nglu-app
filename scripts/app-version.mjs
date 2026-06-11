// Version applicative partagée par TOUTES les apps du monorepo (source unique).
//
// Schéma : MAJOR.MINOR.PATCH+<commit>
//   - MAJOR.MINOR.PATCH : pilotés via le fichier racine `VERSION`. On incrémente le
//                         PATCH avec `node scripts/bump-version.mjs patch` (3.2.0 → 3.2.1)
//                         et MINOR/MAJOR avec `... minor` / `... major`.
//   - +<commit>         : build metadata SemVer (hash court git) pour la traçabilité —
//                         change à chaque build/déploiement, ignoré pour comparer les versions.
//
// Utilisé par chaque vite.config via `versionDefine()`. Hors dépôt git → pas de +commit.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function git(args, fallback = "") {
  try {
    return execSync(`git ${args}`, { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return fallback;
  }
}

export function appVersion() {
  let base = "0.0.0";
  try {
    base = readFileSync(resolve(rootDir, "VERSION"), "utf8").trim().split("+")[0];
  } catch {
    // garde le défaut
  }
  // Le pipeline Bitbucket build hors dépôt git -> git échoue. On lit alors le
  // hash fourni par l'env CI (BITBUCKET_COMMIT) avant de retomber sur git/unknown.
  const ciCommit = process.env.BITBUCKET_COMMIT || process.env.CI_COMMIT_SHA || "";
  const commit = (ciCommit ? ciCommit.slice(0, 7) : "") || git("rev-parse --short HEAD", "unknown");
  const dirty = Boolean(git("status --short --untracked-files=no", ""));
  const build = `${base}+${commit}${dirty ? ".dirty" : ""}`;
  return { base, build, commit };
}

// Bloc `define` Vite prêt à étaler — mêmes clés pour toutes les apps.
export function versionDefine() {
  const { base, build, commit } = appVersion();
  return {
    "import.meta.env.VITE_APP_BASE_VERSION": JSON.stringify(base),
    "import.meta.env.VITE_APP_BUILD_VERSION": JSON.stringify(build),
    "import.meta.env.VITE_APP_COMMIT": JSON.stringify(commit),
  };
}
