// Vice Sunset v2 — the entry program (Node 22, standard library only).
//
// It hands the app in: copy this directory's app/ and screenshots/ into the
// output folder and write the dossier.json the judge reads, built with the
// vendored make.fun library. Run it locally with:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The grader runs it twice with /output as the target; both runs must write
// byte-identical files, so this program does nothing time- or
// randomness-dependent — it only copies files and builds the dossier.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's caps, as the kit documents them: the dossier text is capped, and
// the rest refuse an entry the scorer would refuse (at most 4 screenshots,
// each at most 256 KiB; app/ at most 993 entries and 48 MiB in all; no path
// under app/ over 1000 bytes). app/ counts beside /output's own 1000-entry
// cap, together with screenshots/ and dossier.json.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
