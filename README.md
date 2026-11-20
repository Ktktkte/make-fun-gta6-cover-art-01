# Vice Sunset — GTA 6 Cover Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Ktktkte/make-fun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Ktktkte/make-fun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns a photo and a caption into GTA 6-style cover art — the multi-panel poster look, exported as a PNG to share. Built for the [gta6-cover-art-01 bounty on make.fun](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Five panels** — one hero panel plus four smaller ones. Each panel takes its own photo, with drag-to-reposition and zoom; panels with no photo paint their own sunset-skyline art so the cover is always complete.
- **Four layouts** — Hero, Fullbleed, Grid and Tilted poster style.
- **Four colour grades** — Sunset, Neon, Dusk and Mono Noir, plus a Poster Ink treatment.
- **Lettering** — a big Anton display title with a warm gradient, a neon-glow subtitle, a tagline, and a Leonida rosette badge. All editable, live.
- **Heat meter** — rates the cover's visual heat from grade, photos and ink.
- **Undo / redo** for every edit.
- **Export PNG** in 1080×1080, 1080×1350 and 1920×1080, with film grain and vignette.

Everything runs locally in the browser. Photos never leave the machine; the app makes no network requests. The two sample photos in `app/samples/` are original illustrations drawn for this entry.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Upload a photo (or load a sample), pick a layout and a grade, edit the caption, export a PNG.

## Files

- `app/index.html`, `app/style.css` — the editor.
- `app/src/cover.js` — the cover renderer: layouts, grades, lettering, grain.
- `app/src/main.js` — editor wiring: state, undo/redo, uploads, export.
- `app/fonts/Anton-Regular.ttf` — Anton, SIL Open Font License (see `app/fonts/OFL.txt`).
- `app/samples/` — two original sample illustrations.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `vendor/makefun-app.ts`. It never removes the output directory itself (the grader's `/output` is a mount point).
- `screenshots/` — the cover and the editor at work.
- `shots.json` — what each screenshot shows.

## License

MIT — see `LICENSE`. Anton is licensed under the SIL Open Font License 1.1.
