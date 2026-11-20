// Vice Sunset — cover painter.
//
// Draws a five-panel GTA-style poster cover onto a 2D canvas context.
// Pure drawing code: no DOM access except the canvas it is handed.
// A cover is { layout, grade, title, subtitle, tagline, panels },
// where panels is an array of five { img, cx, cy, zoom } entries.
// img is an HTMLImageElement (or null: the panel paints its own art),
// cx/cy are the photo's focal point in 0..1, zoom is 1..3.

export const LAYOUTS = ['hero', 'fullbleed', 'grid', 'tilted'];
export const GRADES = ['sunset', 'neon', 'dusk', 'mono', 'ink'];
export const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

// Every grade is a full look: sky colours for painted art, lettering
// colours, the photo treatment (a canvas filter plus a soft tint) and
// the base value of the heat meter.
export const GRADES_DEF = {
  sunset: {
    label: 'Sunset',
    sky: ['#ff9a3c', '#ff2e63', '#2b1055'],
    sun: '#ffd166',
    title: ['#ffe66d', '#ff5e78'],
    subtitle: '#7ef9ff',
    accent: '#ff2e63',
    frame: '#12081f',
    heatBase: 82,
    photoFilter: 'saturate(1.25) contrast(1.08)',
    tint: '#ff7a3c',
    tintAlpha: 0.22,
    tintBlend: 'soft-light',
  },
  neon: {
    label: 'Neon',
    sky: ['#0b0b2a', '#ff2bd6', '#00e5ff'],
    sun: '#00f0ff',
    title: ['#00f0ff', '#ff2bd6'],
    subtitle: '#ffe66d',
    accent: '#00e5ff',
    frame: '#050510',
    heatBase: 90,
    photoFilter: 'saturate(1.45) contrast(1.15)',
    tint: '#ff2bd6',
    tintAlpha: 0.22,
    tintBlend: 'overlay',
  },
  dusk: {
    label: 'Dusk',
    sky: ['#1b2a6b', '#7b2ff7', '#f107a3'],
    sun: '#ffb3d9',
    title: ['#c7b8ff', '#ff7ad9'],
    subtitle: '#ffe66d',
    accent: '#7b2ff7',
    frame: '#0d0a24',
    heatBase: 64,
    photoFilter: 'saturate(1.1) contrast(1.05)',
    tint: '#7b2ff7',
    tintAlpha: 0.14,
    tintBlend: 'soft-light',
  },
  mono: {
    label: 'Mono Noir',
    sky: ['#e8e8e8', '#8a8a8a', '#141414'],
    sun: '#ffffff',
    title: ['#ffffff', '#bdbdbd'],
    subtitle: '#e8e8e8',
    accent: '#f5f5f5',
    frame: '#000000',
    heatBase: 48,
    photoFilter: 'grayscale(1) contrast(1.25) brightness(1.04)',
    tint: '#ffffff',
    tintAlpha: 0.05,
    tintBlend: 'soft-light',
  },
  ink: {
    label: 'Poster Ink',
    sky: ['#f2e8d5', '#e8c39e', '#8a5a3b'],
    sun: '#d92626',
    title: ['#1a1a1a', '#d92626'],
    subtitle: '#d92626',
    accent: '#d92626',
    frame: '#1a1a1a',
    heatBase: 71,
    photoFilter: 'grayscale(1) contrast(1.7) brightness(1.06)',
    tint: '#f2e8d5',
    tintAlpha: 0.12,
    tintBlend: 'overlay',
  },
};

// Deterministic random from a seed, so painted art never flickers.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Five panel rectangles for a layout, in cover space.
// Panel 0 is the hero; panels 1..4 are the small ones.
// Returns [{x, y, w, h, angle}] with angle in degrees (tilted only).
export function panelRects(layout, W, H) {
  const m = layout === 'fullbleed' ? 0 : Math.round(W * 0.026);
  const g = layout === 'fullbleed' ? 0 : Math.round(W * 0.013);
  const iw = W - 2 * m;
  const ih = H - 2 * m;
  const angles = layout === 'tilted' ? [-2.2, 1.4, -1.2, 1.8, -1.6] : [0, 0, 0, 0, 0];
  const R = (x, y, w, h, i) => ({ x, y, w, h, angle: angles[i] });
  if (layout === 'fullbleed') {
    const hw = Math.round(W * 0.6);
    const sw = W - hw;
    const sh = Math.round(H / 2);
    return [
      R(0, 0, hw, H, 0),
      R(hw, 0, sw, sh, 1),
      R(hw, sh, sw, H - sh, 2),
      R(hw, 0, sw, sh, 3),
      R(hw, sh, sw, H - sh, 4),
    ];
  }
  if (layout === 'grid') {
    const topH = Math.round(ih * 0.55);
    const botH = ih - topH - g;
    const hw = Math.round(iw * 0.62);
    const sw = Math.round((iw - 2 * g) / 3);
    return [
      R(m, m, hw, topH, 0),
      R(m + hw + g, m, iw - hw - g, topH, 1),
      R(m, m + topH + g, sw, botH, 2),
      R(m + sw + g, m + topH + g, sw, botH, 3),
      R(m + 2 * (sw + g), m + topH + g, iw - 2 * (sw + g), botH, 4),
    ];
  }
  // hero (and tilted, which shares the hero geometry)
  const heroH = Math.round(ih * 0.6);
  const botH = ih - heroH - g;
  const sw = Math.round((iw - 3 * g) / 4);
  const rects = [R(m, m, iw, heroH, 0)];
  for (let i = 0; i < 4; i++) {
    const w = i === 3 ? iw - 3 * (sw + g) : sw;
    rects.push(R(m + i * (sw + g), m + heroH + g, w, botH, i + 1));
  }
  return rects;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Draw a photo cover-fitting a rect, honouring focal point + zoom.
function drawPhoto(ctx, img, rect, panel) {
  const zoom = panel.zoom || 1;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = panel.cx ?? 0.5;
  const cy = panel.cy ?? 0.5;
  const dx = rect.x + rect.w / 2 - dw * cx;
  const dy = rect.y + rect.h / 2 - dh * cy;
  ctx.drawImage(img, dx, dy, dw, dh);
}

// Painted fallback art: sunset sky, sun, skyline with lit windows,
// palm silhouettes. Seeded, so the same panel always looks the same.
function paintFallback(ctx, rect, grade, seed) {
  const rnd = mulberry32(seed * 7919 + 13);
  const g = GRADES_DEF[grade];
  const sky = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  sky.addColorStop(0, g.sky[0]);
  sky.addColorStop(0.55, g.sky[1]);
  sky.addColorStop(1, g.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  // Sun with a soft glow.
  const sx = rect.x + rect.w * (0.3 + rnd() * 0.4);
  const sy = rect.y + rect.h * (0.22 + rnd() * 0.14);
  const sr = Math.min(rect.w, rect.h) * (0.13 + rnd() * 0.06);
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 3.2);
  glow.addColorStop(0, g.sun);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = glow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalAlpha = 1;
  ctx.fillStyle = g.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();

  // Skyline: dark slabs with lit windows along the bottom.
  const base = rect.y + rect.h;
  const dark = grade === 'mono' ? '#0a0a0a' : grade === 'ink' ? '#241812' : '#160b26';
  let bx = rect.x;
  while (bx < rect.x + rect.w) {
    const bw = rect.w * (0.09 + rnd() * 0.12);
    const bh = rect.h * (0.16 + rnd() * 0.3);
    ctx.fillStyle = dark;
    ctx.fillRect(bx, base - bh, bw, bh);
    // Lit windows.
    const cols = Math.max(1, Math.floor(bw / (rect.w * 0.035)));
    const rows = Math.max(1, Math.floor(bh / (rect.h * 0.05)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() < 0.34) {
          ctx.fillStyle = grade === 'mono' ? '#f5f5f5' : '#ffd166';
          ctx.fillRect(
            bx + (c + 0.5) * (bw / cols) - 1.5,
            base - bh + (r + 0.5) * (bh / rows) - 1.5,
            3,
            3,
          );
        }
      }
    }
    bx += bw + rect.w * 0.008;
  }

  // Palm silhouettes: curved trunk, fanning fronds.
  const palms = 1 + Math.floor(rnd() * 2);
  for (let p = 0; p < palms; p++) {
    const px = rect.x + rect.w * (0.12 + rnd() * 0.76);
    const py = base;
    const ph = rect.h * (0.34 + rnd() * 0.2);
    const lean = (rnd() - 0.5) * rect.w * 0.16;
    const topX = px + lean;
    const topY = py - ph;
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(2, rect.w * 0.008);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + lean * 0.4, py - ph * 0.6, topX, topY);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, rect.w * 0.005);
    for (let f = 0; f < 7; f++) {
      const a = (-Math.PI * (0.08 + (f / 6) * 0.84)) + (lean >= 0 ? 0 : 0);
      const len = rect.w * (0.07 + rnd() * 0.05);
      const fx = topX + Math.cos(a) * len;
      const fy = topY + Math.sin(a) * len * 0.7 + len * 0.28;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.55, topY - len * 0.12, fx, fy);
      ctx.stroke();
    }
  }
}

// One panel: photo (graded) or painted art, clipped to its rect.
function paintPanel(ctx, rect, panel, grade, seed) {
  const r = Math.max(2, Math.round(Math.min(rect.w, rect.h) * 0.02));
  ctx.save();
  if (rect.angle) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate((rect.angle * Math.PI) / 180);
    ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = Math.round(rect.w * 0.03);
    ctx.shadowOffsetY = Math.round(rect.h * 0.02);
  }
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.clip();
  const g = GRADES_DEF[grade];
  if (panel.img && panel.img.naturalWidth > 0) {
    ctx.filter = g.photoFilter;
    drawPhoto(ctx, panel.img, rect, panel);
    ctx.filter = 'none';
    if (g.tintAlpha > 0) {
      ctx.globalCompositeOperation = g.tintBlend;
      ctx.globalAlpha = g.tintAlpha;
      ctx.fillStyle = g.tint;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  } else {
    paintFallback(ctx, rect, grade, seed);
  }
  // Thin inner frame.
  ctx.strokeStyle = g.frame;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1, Math.round(rect.w * 0.004));
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Big display lettering over the hero panel's lower half.
function paintLettering(ctx, cover, W, H, heroRect) {
  const g = GRADES_DEF[cover.grade];
  const title = (cover.title || 'VICE SUNSET').toUpperCase();
  const sub = cover.subtitle || '';
  const tag = cover.tagline || '';
  // Scrim so the type stays readable over any photo.
  const scrimH = heroRect.h * 0.52;
  const scrim = ctx.createLinearGradient(0, heroRect.y + heroRect.h - scrimH, 0, heroRect.y + heroRect.h);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(heroRect.x, heroRect.y + heroRect.h - scrimH, heroRect.w, scrimH);

  const pad = heroRect.w * 0.045;
  const titleSize = Math.round(heroRect.h * 0.26);
  const tagSize = Math.round(H * 0.016);
  const titleY = heroRect.y + heroRect.h - Math.round(heroRect.h * 0.15) - Math.round(tagSize * 1.7);
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${titleSize}px Anton, 'Arial Black', sans-serif`;
  const grad = ctx.createLinearGradient(heroRect.x, titleY - titleSize, heroRect.x, titleY);
  grad.addColorStop(0, g.title[0]);
  grad.addColorStop(1, g.title[1]);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = Math.max(2, Math.round(titleSize * 0.09));
  ctx.strokeText(title, heroRect.x + pad, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(title, heroRect.x + pad, titleY);

  if (sub) {
    const subSize = Math.round(heroRect.h * 0.085);
    ctx.font = `italic 700 ${subSize}px Georgia, 'Times New Roman', serif`;
    ctx.fillStyle = g.subtitle;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = Math.round(subSize * 0.25);
    ctx.fillText(sub, heroRect.x + pad, titleY - titleSize - Math.round(heroRect.h * 0.03));
    ctx.shadowBlur = 0;
  }
  if (tag) {
    const tagY = titleY + Math.round(tagSize * 1.7);
    ctx.font = `700 ${tagSize}px 'Arial Narrow', Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const spaced = tag.toUpperCase().split('').join(' ');
    ctx.fillText(spaced, heroRect.x + pad, tagY);
  }

  // Badge rosette, top-right of the cover.
  const br = Math.round(H * 0.048);
  const bx = W - Math.round(W * 0.03) - br;
  const by = Math.round(H * 0.03) + br;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.2);
  ctx.fillStyle = g.accent;
  ctx.beginPath();
  ctx.arc(0, 0, br, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1.5, br * 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, br * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(br * 0.34)}px Arial, sans-serif`;
  ctx.fillText('EST.', 0, -br * 0.2);
  ctx.fillText('2026', 0, br * 0.22);
  ctx.restore();
  ctx.textAlign = 'left';
}

function paintGrain(ctx, W, H, seed) {
  const rnd = mulberry32(seed);
  const s = 140;
  const tile = document.createElement('canvas');
  tile.width = s;
  tile.height = s;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 22;
  }
  tctx.putImageData(img, 0, 0);
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function paintVignette(ctx, W, H) {
  const vg = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

// The whole cover. cover = { layout, grade, title, subtitle, tagline, panels }.
export function paintCover(ctx, cover, W, H) {
  const grade = GRADES_DEF[cover.grade] ? cover.grade : 'sunset';
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = GRADES_DEF[grade].frame;
  ctx.fillRect(0, 0, W, H);
  const rects = panelRects(cover.layout, W, H);
  for (let i = 0; i < 5; i++) {
    paintPanel(ctx, rects[i], cover.panels[i] || {}, grade, 100 + i * 37);
  }
  paintLettering(ctx, cover, W, H, rects[0]);
  paintGrain(ctx, W, H, 42);
  paintVignette(ctx, W, H);
  ctx.restore();
  return rects;
}

// Heat score for the meter: grade base + loaded photos + grade pop.
export function heatOf(cover) {
  const g = GRADES_DEF[cover.grade] || GRADES_DEF.sunset;
  const loaded = cover.panels.filter((p) => p && p.img).length;
  const score = Math.max(0, Math.min(100, Math.round(g.heatBase + loaded * 3)));
  const label = score >= 85 ? 'BLAZING' : score >= 70 ? 'HOT' : score >= 55 ? 'WARM' : 'COOL';
  return { score, label };
}
