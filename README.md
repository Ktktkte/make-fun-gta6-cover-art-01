# Vice Sunset — GTA 6 Cover Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Ktktkte/make-fun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Ktktkte/make-fun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline browser web app that turns a photo and a caption into GTA 6-style cover art — the multi-panel poster look with bold caption lettering and a Vice City sunset or neon grade — exported as a PNG to share.

Built for the make.fun bounty: https://make.fun/bounty/gta6-cover-art-01

## What it does

- **Five panels**: one large hero panel plus four small ones. Load your own photo into any panel, or leave a panel empty and it paints its own sunset skyline with palm silhouettes.
- **Four layouts**: Hero, Fullbleed, Grid and Tilted.
- **Five grades**: Sunset, Neon, Dusk, Mono Noir and Poster Ink.
- **Lettering**: a big Anton display title with a warm gradient, a neon script subtitle, a tagline, and an "EST. 2026" badge rosette.
- **Crop and position**: click a panel to select it, drag its photo to reposition, scroll to zoom. Undo and redo included.
- **Heat meter**: rates the cover's visual heat from its grade and photos.
- **Export**: PNG in the common post sizes 1080 × 1080, 1080 × 1350 and 1920 × 1080.
- **Fully offline**: every font, image and script is a local file under `app/`. Photos are read on your machine and never uploaded.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

All art is original — no Rockstar Games logo, artwork or font. The Anton typeface ships under the SIL Open Font License (`app/fonts/OFL.txt`). Sample photos are CC0.
