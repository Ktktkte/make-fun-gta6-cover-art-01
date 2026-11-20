// Vice Sunset — entrypoint.
//
// Hands the app in: copies app/ and screenshots/ from this repository
// into the output directory and writes dossier.json with buildDossier
// from vendor/makefun-app.ts. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output. Node 22 standard library only.

import { buildDossier } from './vendor/makefun-app.ts';
import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(root, 'app'), join(out, 'app'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The entry is not complete without its renders: refuse to write a
// dossier for an output that holds fewer than three screenshots.
const shots = readdirSync(join(out, 'screenshots')).filter((n) => !n.startsWith('.'));
if (shots.length < 3) {
  throw new Error(`screenshots/ holds ${shots.length} image(s), need at least 3`);
}

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
if (dossier.length === 0) throw new Error('buildDossier wrote an empty dossier');
writeFileSync(join(out, 'dossier.json'), dossier);
const appBytes = statSync(join(out, 'app')).isDirectory()
  ? readdirSync(join(out, 'app')).length
  : 0;
console.log(
  `wrote ${out}/dossier.json (${dossier.length} bytes) ` +
  `for ${shots.length} screenshots and ${appBytes} top-level app entries`,
);
