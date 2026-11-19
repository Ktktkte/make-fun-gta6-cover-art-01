# make-fun-gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Ktktkte/make-fun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Ktktkte/make-fun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Sunset turns your own photos into a Vice City sunset poster. Pick a
post size, drop one photo across all three panels or a different photo in
each, drag each photo to frame it, set the zoom, type a bold caption in
condensed display lettering, and export the finished cover as a PNG —
1080 × 1080, 1080 × 1350 or 1920 × 1080. The sunset sky, low sun, palm
silhouettes and neon band are all painted in code, so a panel with no photo
yet still shows the sunset; photos you load get a warm sunset grade so
shots from different places sit together in one poster. Everything runs
offline from these static files and your photos never leave your machine.
All artwork and lettering is original — no game logos, artwork or fonts.
The caption font is Anton, shipped under the SIL Open Font License
(see `app/fonts/OFL.txt`).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

## How it works

- `app/index.html` + `app/style.css` — the editor: size picker, per-panel
  photo/zoom controls, caption words and colour, live preview, export.
- `app/src/cover.js` — the poster painter: three-panel grid, painted
  sunset, photo cover-fit with grade, caption band with outlined lettering.
- `app/src/main.js` — editor wiring: uploads, drag-to-reposition, export.
- `app/src/shots.js` — deterministic `?shot=` scenes for the screenshots.
- `app/samples/` — two model-made sample photos, free to use, for the
  screenshots. `app/fonts/` — Anton (OFL).

---

<sub>Entered on [make.fun](https://make.fun/?ref=md2m7pb0&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
