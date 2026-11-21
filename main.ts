// Entry program for the Vice After Dark cover maker (gta6-cover-art-01).
//
// Hands the built app to the grader: copies app/ and screenshots/ into the
// output directory and writes output/dossier.json with the kit's
// buildDossier. Runs under Node 22 with the standard library only.
//
// The output directory is a mount the grader owns, so this program only ever
// creates directories inside it and copies files into them — it never removes
// the output directory itself, and it never deletes anything inside it.
// Running it twice writes the same bytes both times.
import { copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
} as const;

function copyTree(fromDir: string, toDir: string): number {
  mkdirSync(toDir, { recursive: true });
  let copiedCount = 0;
  const names = readdirSync(fromDir).sort();
  for (const name of names) {
    const from = join(fromDir, name);
    const to = join(toDir, name);
    if (statSync(from).isDirectory()) {
      copiedCount += copyTree(from, to);
    } else {
      copyFileSync(from, to);
      copiedCount += 1;
    }
  }
  return copiedCount;
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  const appFiles = copyTree(join(repoRoot, 'app'), join(outDir, 'app'));
  const shotFiles = copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
  const dossier = buildDossier(outDir, DOSSIER_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(
    `vice-after-dark: ${appFiles} app files, ${shotFiles} screenshots, dossier ${dossier.length} bytes -> ${outDir}`,
  );
}

main();
