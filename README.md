# make-fun-gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Ktktkte/make-fun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Ktktkte/make-fun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Sunset v2 turns your own photos into a Vice City sunset poster. Pick a
post size, pick one of four five-panel layouts, drop one photo across all
five panels or a different photo in each, drag each photo to frame it, set
the zoom, choose one of four colour grades (Sunset, Neon, Dusk, Mono noir),
switch on Poster Ink for an inked, halftone printed look, slide the Heat,
type a bold gradient caption with a glowing neon script subtitle, and export
the finished cover as a PNG — 1080 × 1080, 1080 × 1350 or 1920 × 1080.
Every change can be undone. The sunset sky, low sun, palm silhouettes and
neon band are all painted in code, so a panel with no photo yet still shows
the sunset; photos you load get the grade's tint so shots from different
places sit together in one poster, with film grain and a vignette over the
whole thing. Everything runs offline from these static files and your photos
never leave your machine. All artwork and lettering is original — no game
logos, artwork or fonts. The caption font is Anton, shipped under the SIL
Open Font License (see `app/fonts/OFL.txt`).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

## How it works

- `app/index.html` + `app/style.css` — the editor: size picker, layout
  picker, per-panel photo/zoom controls, grade picker, Poster Ink, heat,
  caption words and colour, live preview, undo/redo, export.
- `app/src/cover.js` — the poster painter: five-panel grids in four
  layouts, painted sunset in four grades, photo cover-fit with grade tint,
  Poster Ink bands + halftone, gradient title, neon script subtitle, heat
  meter, badge ribbon, grain and vignette.
- `app/src/main.js` — editor wiring: uploads, drag-to-reposition, undo/redo
  history, export.
- `app/src/shots.js` — deterministic `?shot=` scenes for the screenshots.
- `app/samples/` — two free-to-use sample photos (Unsplash, via picsum):
  a neon boulevard at night and a canoe on a turquoise lake at sunset.
  `app/fonts/` — Anton (OFL).

---

<sub>Entered on [make.fun](https://make.fun/?ref=md2m7pb0&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
