// cover.js — the cover renderer for Vice Sunset.
//
// Draws a five-panel GTA-style poster onto any 2D canvas: panels with photos
// (or painted skyline art when empty), a colour grade, poster lettering and a
// film finish. Pure canvas, no dependencies, fully deterministic: the same
// state always paints the same pixels (seeded grain, no clocks, no random
// calls outside the seeded generator).

export const GRADES = {
  sunset: {
    label: "Sunset",
    sky: ["#3a1358", "#d64a6e", "#ff9e4a"],
    wash: ["rgba(255,120,40,0.16)", "rgba(255,60,120,0.10)"],
    title: ["#ffe08a", "#ff6a5e"],
    accent: "#ffb347",
    heat: 82,
  },
  neon: {
    label: "Neon",
    sky: ["#0b0626", "#3d0a5e", "#12082e"],
    wash: ["rgba(255,40,180,0.20)", "rgba(0,220,255,0.16)"],
    title: ["#8ff7ff", "#ff5ef1"],
    accent: "#ff4fd8",
    heat: 90,
  },
  dusk: {
    label: "Dusk",
    sky: ["#141a3d", "#2c2a6e", "#4b3a8c"],
    wash: ["rgba(90,80,220,0.18)", "rgba(40,30,90,0.14)"],
    title: ["#d8c8ff", "#7aa2ff"],
    accent: "#9db4ff",
    heat: 70,
  },
  mono: {
    label: "Mono Noir",
    sky: ["#111111", "#3a3a3a", "#6a6a6a"],
    wash: ["rgba(255,255,255,0.05)", "rgba(0,0,0,0.18)"],
    title: ["#ffffff", "#bdbdbd"],
    accent: "#ffffff",
    heat: 60,
  },
};

export const LAYOUTS = {
  hero: { label: "Hero" },
  fullbleed: { label: "Fullbleed" },
  grid: { label: "Grid" },
  tilted: { label: "Tilted" },
};

export const SIZES = {
  square: { label: "1080 × 1080", w: 1080, h: 1080 },
  portrait: { label: "1080 × 1350", w: 1080, h: 1350 },
  wide: { label: "1920 × 1080", w: 1920, h: 1080 },
};

// Panel geometry as fractions of the cover [x, y, w, h] per layout.
export function panelRects(layout, W, H) {
  switch (layout) {
    case "hero":
      return [
        [0, 0, 1, 0.56],
        [0, 0.56, 0.25, 0.44],
        [0.25, 0.56, 0.25, 0.44],
        [0.5, 0.56, 0.25, 0.44],
        [0.75, 0.56, 0.25, 0.44],
      ];
    case "fullbleed":
      return [
        [0, 0, 0.5, 0.5],
        [0.5, 0, 0.5, 0.5],
        [0, 0.5, 1 / 3, 0.5],
        [1 / 3, 0.5, 1 / 3, 0.5],
        [2 / 3, 0.5, 1 / 3, 0.5],
      ];
    case "grid":
      return [
        [0, 0, 1, 0.5],
        [0, 0.5, 0.5, 0.25],
        [0.5, 0.5, 0.5, 0.25],
        [0, 0.75, 0.5, 0.25],
        [0.5, 0.75, 0.5, 0.25],
      ];
    case "tilted":
      return [
        [0, 0, 1, 0.56],
        [0, 0.56, 0.25, 0.44],
        [0.25, 0.56, 0.25, 0.44],
        [0.5, 0.56, 0.25, 0.44],
        [0.75, 0.56, 0.25, 0.44],
      ];
    default:
      return panelRects("hero", W, H);
  }
}

// Deterministic pseudo-random generator (mulberry32) for the grain tile.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  const img = g.createImageData(128, 128);
  const rnd = mulberry32(20261120);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

// Painted skyline art for a panel with no photo: gradient sky, sun, towers,
// palm silhouettes. Drawn with the grade's palette so empty panels still
// look like part of the cover.
function paintSkyline(ctx, x, y, w, h, grade, seed) {
  const g = GRADES[grade] || GRADES.sunset;
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  sky.addColorStop(0, g.sky[0]);
  sky.addColorStop(0.55, g.sky[1]);
  sky.addColorStop(1, g.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // sun
  const sx = x + w * 0.68;
  const sy = y + h * 0.42;
  const sr = Math.min(w, h) * 0.22;
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 2.1);
  glow.addColorStop(0, "rgba(255,220,140,0.85)");
  glow.addColorStop(0.35, "rgba(255,180,90,0.28)");
  glow.addColorStop(1, "rgba(255,180,90,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#ffe6a0";
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();
  // towers
  const rnd = mulberry32(seed);
  const base = y + h * 0.72;
  let tx = x;
  ctx.fillStyle = "rgba(16,8,28,0.92)";
  while (tx < x + w) {
    const bw = w * (0.1 + rnd() * 0.14);
    const bh = h * (0.22 + rnd() * 0.3);
    ctx.fillRect(tx, base - bh, bw, bh);
    ctx.fillStyle = "rgba(255,190,100,0.85)";
    for (let wy = base - bh + h * 0.03; wy < base - h * 0.02; wy += h * 0.07) {
      for (let wx = tx + w * 0.015; wx < tx + bw - w * 0.02; wx += w * 0.045) {
        if (rnd() < 0.45) ctx.fillRect(wx, wy, w * 0.018, h * 0.03);
      }
    }
    ctx.fillStyle = "rgba(16,8,28,0.92)";
    tx += bw + w * 0.02;
  }
  // palms
  ctx.strokeStyle = "rgba(12,6,20,0.95)";
  ctx.lineCap = "round";
  for (const px of [x + w * 0.12, x + w * 0.9]) {
    const py = y + h * 0.98;
    const ph = h * 0.42;
    ctx.lineWidth = Math.max(2, w * 0.012);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + w * 0.02, py - ph * 0.6, px - w * 0.03, py - ph);
    ctx.stroke();
    ctx.lineWidth = Math.max(2, w * 0.008);
    for (let k = 0; k < 6; k++) {
      const a = Math.PI * (0.08 + k * 0.16);
      const fx = px - w * 0.03 + Math.cos(a) * w * 0.16;
      const fy = py - ph + Math.sin(a) * h * 0.1 + h * 0.05 * k * 0.12;
      ctx.beginPath();
      ctx.moveTo(px - w * 0.03, py - ph);
      ctx.quadraticCurveTo(
        px - w * 0.03 + Math.cos(a) * w * 0.08,
        py - ph - h * 0.06,
        fx,
        fy,
      );
      ctx.stroke();
    }
  }
  // road sheen
  const sheen = ctx.createLinearGradient(x, base, x, y + h);
  sheen.addColorStop(0, "rgba(255,150,80,0.10)");
  sheen.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = sheen;
  ctx.fillRect(x, base, w, y + h - base);
}

function drawPhotoInto(ctx, img, x, y, w, h, panel) {
  const zoom = panel.zoom || 1;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = (panel.ox || 0) * (dw - w) * 0.5;
  const oy = (panel.oy || 0) * (dh - h) * 0.5;
  ctx.drawImage(img, x + (w - dw) / 2 - ox, y + (h - dh) / 2 - oy, dw, dh);
}

function applyGradeWash(ctx, x, y, w, h, grade) {
  const g = GRADES[grade] || GRADES.sunset;
  const wash = ctx.createLinearGradient(x, y, x + w, y + h);
  wash.addColorStop(0, g.wash[0]);
  wash.addColorStop(1, g.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
}

// The lettering block: subtitle, big title, tagline, rosette badge.
function drawLettering(ctx, W, H, state) {
  const g = GRADES[state.grade] || GRADES.sunset;
  const u = Math.min(W, H) / 100; // layout unit
  ctx.save();
  ctx.textBaseline = "alphabetic";

  // Rosette badge, top right.
  const bx = W - u * 13;
  const by = u * 11;
  const br = u * 8.5;
  ctx.save();
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fillStyle = "#f5c04a";
  ctx.fill();
  ctx.lineWidth = u * 0.9;
  ctx.strokeStyle = "#191019";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bx, by, br * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = u * 0.45;
  ctx.stroke();
  ctx.fillStyle = "#191019";
  ctx.font = `${Math.round(u * 3.4)}px Anton, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("★ LEONIDA ★", bx, by - u * 0.6);
  ctx.font = `${Math.round(u * 2.6)}px Anton, sans-serif`;
  ctx.fillText("EST. 2026", bx, by + u * 3.4);
  ctx.restore();

  // Title block, bottom left, slight poster tilt. Origin 7u above the bottom
  // edge so the tagline (drawn 5.2u below the title baseline) stays on-canvas.
  ctx.save();
  ctx.translate(u * 4, H - u * 7);
  ctx.rotate(-0.018);
  const titleSize = Math.round(u * 12.5);
  ctx.font = `${titleSize}px Anton, sans-serif`;
  ctx.textAlign = "left";
  const title = (state.title || "VICE SUNSET").toUpperCase();
  const grad = ctx.createLinearGradient(0, -titleSize, 0, 0);
  grad.addColorStop(0, g.title[0]);
  grad.addColorStop(1, g.title[1]);
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, titleSize / 13);
  ctx.strokeStyle = "rgba(10,5,14,0.95)";
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = grad;
  ctx.fillText(title, 0, 0);

  const subSize = Math.round(u * 4.6);
  ctx.font = `${subSize}px Anton, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = g.accent;
  ctx.shadowBlur = u * 2.2;
  const sub = (state.subtitle || "A LEONIDA STORY").toUpperCase();
  ctx.fillText(sub, u * 0.4, -titleSize - u * 3.4);
  ctx.shadowBlur = 0;

  const tagSize = Math.round(u * 3.1);
  ctx.font = `${tagSize}px Anton, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText((state.tagline || "TWO OUTLAWS. ONE SUNSET.").toUpperCase(), u * 0.4, u * 5.2);
  ctx.restore();
  ctx.restore();
}

function drawGrain(ctx, W, H) {
  const tile = getGrainTile();
  const pat = ctx.createPattern(tile, "repeat");
  if (!pat) return;
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const v = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// Main entry: paint the whole cover onto ctx at size W x H.
// state: { layout, grade, ink, title, subtitle, tagline, panels: [{img, ox, oy, zoom}] }
// images: array of 5 HTMLImageElements (or null) aligned with panels.
export function renderCover(ctx, W, H, state, images) {
  const gap = state.layout === "fullbleed" ? 0 : Math.max(3, Math.round(Math.min(W, H) * 0.006));
  const rects = panelRects(state.layout, W, H);
  const tilted = state.layout === "tilted";

  // Base: dark poster board.
  ctx.save();
  ctx.fillStyle = "#0d0714";
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 5; i++) {
    const [fx, fy, fw, fh] = rects[i];
    const x = fx * W + (fx > 0 ? gap / 2 : 0);
    const y = fy * H + (fy > 0 ? gap / 2 : 0);
    const w = fw * W - (fx > 0 ? gap / 2 : 0) - (fx + fw < 1 ? gap / 2 : 0);
    const h = fh * H - (fy > 0 ? gap / 2 : 0) - (fy + fh < 1 ? gap / 2 : 0);
    ctx.save();
    if (tilted) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((i % 2 === 0 ? -1 : 1) * 0.045);
      ctx.translate(-(x + w / 2), -(y + h / 2));
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = Math.min(W, H) * 0.02;
      ctx.shadowOffsetY = Math.min(W, H) * 0.008;
    }
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const panel = (state.panels && state.panels[i]) || {};
    const img = images && images[i];
    if (img && img.complete && (img.naturalWidth || img.width) > 0) {
      drawPhotoInto(ctx, img, x, y, w, h, panel);
    } else {
      paintSkyline(ctx, x, y, w, h, state.grade, 100 + i * 37);
    }
    if (state.ink) {
      ctx.save();
      ctx.filter = "contrast(1.55) saturate(1.25)";
      ctx.drawImage(ctx.canvas, x, y, w, h, x, y, w, h);
      ctx.restore();
    } else if (state.grade === "mono") {
      ctx.save();
      ctx.filter = "grayscale(1) contrast(1.18)";
      ctx.drawImage(ctx.canvas, x, y, w, h, x, y, w, h);
      ctx.restore();
    }
    applyGradeWash(ctx, x, y, w, h, state.grade);
    // Panel inner edge.
    ctx.strokeStyle = "rgba(8,4,12,0.85)";
    ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.004);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  drawLettering(ctx, W, H, state);
  drawGrain(ctx, W, H);
  drawVignette(ctx, W, H);
  ctx.restore();
}

// Heat score for the meter: grade base + loaded photos + ink bonus.
export function heatScore(state) {
  const g = GRADES[state.grade] || GRADES.sunset;
  const loaded = (state.panels || []).filter((p) => p && p.img).length;
  let score = g.heat + loaded * 3 + (state.ink ? 5 : 0);
  return Math.max(5, Math.min(99, Math.round(score)));
}

// Render the cover to a fresh canvas at the named size and return it.
export function renderToCanvas(sizeKey, state, images) {
  const size = SIZES[sizeKey] || SIZES.portrait;
  const c = document.createElement("canvas");
  c.width = size.w;
  c.height = size.h;
  const ctx = c.getContext("2d");
  renderCover(ctx, size.w, size.h, state, images);
  return c;
}
