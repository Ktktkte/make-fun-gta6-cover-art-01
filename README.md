# Vice Sunset — GTA-style Cover Maker

An offline web app that turns a person's photo and a caption into GTA 6-style
cover art: a five-panel poster with bold lettering and a Vice City colour
grade, exported as a PNG to share.

## What it does

- **Five panels** — one large hero panel plus four smaller ones. Each panel
  takes a photo of its own, or paints its own sunset skyline with palm
  silhouettes when empty.
- **Four layouts** — Hero, Fullbleed, Grid and Tilted (angled panels, poster
  style).
- **Five grades** — Sunset, Neon, Dusk, Mono noir and Poster Ink, each with
  its own colour wash and filter.
- **Lettering** — a big Anton title with a warm gradient, a glowing subtitle,
  a tagline, and an "EST. 2026" badge rosette.
- **Crop and position** — drag a photo inside its panel to move it, scroll
  to zoom. Undo and redo for every edit.
- **Heat meter** — a gauge that rates the cover's visual heat from the grade
  and the photos loaded.
- **Export** — PNG in the common post sizes 1080×1080, 1080×1350 and
  1920×1080, with film grain and a vignette.

Everything runs locally in the browser. Photos are read on the person's own
machine and never uploaded; the app makes no network requests.

## Try it

```sh
node serve.ts            # serves app/ on http://localhost:8080
node serve.ts --port 8090
```

Open the page, click a panel to load a photo (or "Load the two sample
photos"), pick a layout and a grade, edit the caption, and press Export PNG.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` into the output directory and
writes `dossier.json` with the kit's `vendor/makefun-app.ts` library.

## Files

- `app/index.html`, `app/style.css` — the editor page and its styling.
- `app/src/cover.js` — the cover renderer: layouts, grades, painted
  skylines, lettering, grain and vignette.
- `app/src/main.js` — editor state, undo/redo, drag-to-position, export,
  and the `?shot=` scenes used for screenshots.
- `app/fonts/Anton-Regular.ttf` — Anton, under the SIL Open Font License.
- `app/samples/` — two CC0 sample photos.
- `screenshots/` — four screenshots: the exported covers and the editor
  with a photo loaded.
- `main.ts`, `serve.ts`, `shots.json` — entrypoint, local server, shot list.

## License

MIT (see LICENSE). Anton is under the SIL Open Font License (see
`app/fonts/OFL.txt`).
