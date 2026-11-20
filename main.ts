// Vice Sunset — entrypoint.
//
// Hands the app in: copies app/ and screenshots/ from this repository into
// the output directory and writes dossier.json with buildDossier from
// vendor/makefun-app.ts. Outside the grader, MAKEFUN_OUTPUT_DIR stands in
// for /output. Node 22 standard library only.
//
// The grader runs this program twice with /output as the target, in a fresh
// container where /bot is read-only and /output is a mounted writable
// directory. This program NEVER removes the output directory itself —
// removing a mount point throws EPERM. It only creates the directory and
// copies files into it, so both runs write byte-identical output.

import { buildDossier } from "./vendor/makefun-app.ts";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// Create the output directory; never remove it (it may be a mount point).
mkdirSync(out, { recursive: true });

// Clear only the known children from a previous run, never the directory.
for (const child of ["app", "screenshots", "dossier.json"]) {
  const target = join(out, child);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

cpSync(join(root, "app"), join(out, "app"), { recursive: true });
cpSync(join(root, "screenshots"), join(out, "screenshots"), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, "dossier.json"), dossier);

// Fail loudly if any handed-in file is missing after the write, so a
// partial /output is never mistaken for a successful run.
for (const name of ["dossier.json", "app/index.html", "screenshots/1-cover.jpg"]) {
  if (!existsSync(join(out, name))) throw new Error(`main.ts: expected output missing: ${name}`);
}

const shots = readdirSync(join(out, "screenshots")).filter((n) => !n.startsWith("."));
const appEntries = readdirSync(join(out, "app")).length;
console.log(
  `wrote ${out}/dossier.json (${dossier.length} bytes) ` +
    `for ${shots.length} screenshots and ${appEntries} top-level app entries`,
);
