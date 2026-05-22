import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const baseVersion = readFileSync(resolve(root, "VERSION"), "utf8").trim();

function git(command, fallback) {
  try {
    return execSync(command, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return fallback;
  }
}

const commit = git("git rev-parse --short HEAD", "unknown");
const branch = git("git branch --show-current", "unknown");
const dirty = git("git status --short --untracked-files=no", "") ? true : false;
const buildVersion = `${baseVersion}+${commit}${dirty ? ".dirty" : ""}`;

const payload = {
  baseVersion,
  buildVersion,
  commit,
  branch,
  dirty,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`Base version: ${payload.baseVersion}`);
  console.log(`Build version: ${payload.buildVersion}`);
  console.log(`Commit: ${payload.commit}`);
  console.log(`Branch: ${payload.branch}`);
  console.log(`Dirty: ${payload.dirty ? "yes" : "no"}`);
}
