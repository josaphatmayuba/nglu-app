// Génère les rasters PNG depuis public/farmos-icon.svg.
// À ré-exécuter à chaque modif du SVG : `node scripts/gen-pwa-icons.mjs`.
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pub = resolve(here, "..", "public");
const svg = await readFile(resolve(pub, "farmos-icon.svg"));

const variants = [
  { name: "farmos-icon-192.png", size: 192 },
  { name: "farmos-icon-512.png", size: 512 },
  { name: "farmos-icon-maskable-512.png", size: 512, padding: 64 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const v of variants) {
  let pipeline = sharp(svg).resize(v.size, v.size);
  if (v.padding) {
    pipeline = sharp(svg)
      .resize(v.size - v.padding * 2, v.size - v.padding * 2)
      .extend({ top: v.padding, bottom: v.padding, left: v.padding, right: v.padding, background: "#0E2418" });
  }
  const buf = await pipeline.png().toBuffer();
  await writeFile(resolve(pub, v.name), buf);
  console.log(`  ✓ ${v.name} (${v.size}×${v.size}${v.padding ? `, padding ${v.padding}` : ""})`);
}
console.log("PWA icons generated in public/.");
