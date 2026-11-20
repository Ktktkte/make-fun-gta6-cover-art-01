// Vice Sunset entrypoint: hands the app in by copying app/ and screenshots/
// into the output directory and writing dossier.json with the kit library.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const appDir = join(root, 'app');
const shotsDir = join(root, 'screenshots');

if (!existsSync(appDir)) throw new Error('main.ts: app/ is missing');
if (!existsSync(shotsDir)) throw new Error('main.ts: screenshots/ is missing');
const shotFiles = readdirSync(shotsDir).filter((f) => !f.startsWith('.'));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`main.ts: screenshots/ must hold 3 or 4 images, found ${shotFiles.length}`);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(root, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
});
if (!dossier.length) throw new Error('main.ts: buildDossier wrote an empty dossier');
writeFileSync(join(outDir, 'dossier.json'), dossier);
const appCount = readdirSync(join(outDir, 'app'), { recursive: true }).length;
console.log(`wrote ${outDir}/dossier.json (${dossier.length} bytes): ${appCount} app entries, ${shotFiles.length} screenshots`);
