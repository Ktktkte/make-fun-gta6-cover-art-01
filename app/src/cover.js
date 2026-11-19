// Vice Sunset v2 — the cover painter.
//
// Everything on the poster is drawn here in code: a five-panel grid in one
// of four layouts, a painted Vice City sunset (gradient sky, low sun, palm
// silhouettes, neon lines) in one of four colour grades, plus a Poster Ink
// treatment, grain and vignette. Photos are drawn inside the panels; a panel
// with no photo yet shows the painted sunset instead, so the poster never
// looks empty. No image is ever fetched from the network.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

export const LAYOUTS = {
  hero: { label: 'Hero + four' },
  fullbleed: { label: 'Full bleed' },
  grid: { label: 'Poster grid' },
  tilted: { label: 'Tilted snapshots' },
};

// Four colour grades. Each one drives the painted sky, the caption band,
// the gradient title lettering and the tint photos get, so the whole poster
// shifts together when the grade changes.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    sky: ['#2b1055', '#7597de', '#ff2e88', '#ff7a3d', '#ffb347'],
    sun: '#ffe9a8',
    band: ['#ff2e88', '#ff7a3d', '#ffb347'],
    title: ['#ffe9a8', '#ff7a3d', '#ff2e88'],
    tint: ['rgba(255, 46, 136, 0.06)', 'rgba(255, 122, 61, 0.05)', 'rgba(43, 16, 85, 0.28)'],
    neon: '#37f6ff',
  },
  neon: {
    label: 'Neon',
    sky: ['#12082e', '#4b1d8f', '#c724b1', '#ff2e88', '#37f6ff'],
    sun: '#e8fbff',
    band: ['#7b2ff7', '#ff2e88', '#37f6ff'],
    title: ['#37f6ff', '#ff7ad9', '#ffe9a8'],
    tint: ['rgba(55, 246, 255, 0.08)', 'rgba(255, 46, 136, 0.08)', 'rgba(18, 8, 46, 0.30)'],
    neon: '#ffe9a8',
  },
  dusk: {
    label: 'Dusk',
    sky: ['#0d1233', '#2c3a7a', '#7b2f8f', '#e2607a', '#ffb347'],
    sun: '#ffd9a0',
    band: ['#1b2a6b', '#7b2ff7', '#ff7a3d'],
    title: ['#cdd6ff', '#ff9ecf', '#ffb347'],
    tint: ['rgba(123, 47, 247, 0.08)', 'rgba(226, 96, 122, 0.06)', 'rgba(13, 18, 51, 0.30)'],
    neon: '#ff7ad9',
  },
  mono: {
    label: 'Mono noir',
    sky: ['#0a0a0a', '#3a3a3a', '#6e6e6e', '#9a9a9a', '#d8d8d8'],
    sun: '#ffffff',
    band: ['#1c1c1c', '#555555', '#9a9a9a'],
    title: ['#ffffff', '#c8c8c8', '#7a7a7a'],
    tint: ['rgba(255, 255, 255, 0.05)', 'rgba(0, 0, 0, 0.06)', 'rgba(0, 0, 0, 0.34)'],
    neon: '#ffffff',
  },
};

// One poster is five panels above a caption band. The numbers below are
// fractions of the poster's width and height, so the same grids work for
// all three sizes. `rot` tilts a panel a few degrees, snapshot style.
function gridFor(size, layout) {
  const band = size === 'portrait'
    ? { y: 0.76, h: 0.24 }
    : { y: 0.74, h: 0.26 };
  if (layout === 'fullbleed') {
    return {
      band,
      panels: [
        { x: 0, y: 0, w: 1, h: 0.5 },
        { x: 0, y: 0.51, w: 0.245, h: 0.22 },
        { x: 0.252, y: 0.51, w: 0.245, h: 0.22 },
        { x: 0.503, y: 0.51, w: 0.245, h: 0.22 },
        { x: 0.755, y: 0.51, w: 0.245, h: 0.22 },
      ],
    };
  }
  if (layout === 'grid') {
    return {
      band,
      panels: [
        { x: 0, y: 0, w: 0.66, h: 0.48 },
        { x: 0.67, y: 0, w: 0.33, h: 0.235 },
        { x: 0.67, y: 0.245, w: 0.33, h: 0.235 },
        { x: 0, y: 0.49, w: 0.495, h: 0.24 },
        { x: 0.505, y: 0.49, w: 0.495, h: 0.24 },
      ],
    };
  }
  if (layout === 'tilted') {
    if (size === 'portrait') {
      return {
        band,
        panels: [
          { x: 0.02, y: 0.01, w: 0.96, h: 0.52, rot: -1.4 },
          { x: 0.01, y: 0.545, w: 0.48, h: 0.095, rot: 1.8 },
          { x: 0.51, y: 0.545, w: 0.48, h: 0.095, rot: -2 },
          { x: 0.01, y: 0.65, w: 0.48, h: 0.095, rot: -1.6 },
          { x: 0.51, y: 0.65, w: 0.48, h: 0.095, rot: 2 },
        ],
      };
    }
    return {
      band,
      panels: [
        { x: 0.01, y: 0.01, w: 0.6, h: 0.71, rot: -1.4 },
        { x: 0.625, y: 0.01, w: 0.365, h: 0.345, rot: 1.8 },
        { x: 0.625, y: 0.375, w: 0.365, h: 0.345, rot: -2 },
        { x: 0.02, y: 0.02, w: 0.28, h: 0.33, rot: 2.2 },
        { x: 0.32, y: 0.38, w: 0.28, h: 0.33, rot: -1.8 },
      ],
    };
  }
  // hero — the default: one big panel, four small ones in a 2 x 2 block.
  if (size === 'portrait') {
    return {
      band,
      panels: [
        { x: 0, y: 0, w: 1, h: 0.535 },
        { x: 0, y: 0.545, w: 0.495, h: 0.1 },
        { x: 0.505, y: 0.545, w: 0.495, h: 0.1 },
        { x: 0, y: 0.655, w: 0.495, h: 0.1 },
        { x: 0.505, y: 0.655, w: 0.495, h: 0.1 },
      ],
    };
  }
  return {
    band,
    panels: [
      { x: 0, y: 0, w: 0.615, h: 0.73 },
      { x: 0.625, y: 0, w: 0.182, h: 0.36 },
      { x: 0.817, y: 0, w: 0.183, h: 0.36 },
      { x: 0.625, y: 0.37, w: 0.182, h: 0.36 },
      { x: 0.817, y: 0.37, w: 0.183, h: 0.36 },
    ],
  };
}

export function panelRects(size, layout, width, height) {
  const grid = gridFor(size, layout);
  return grid.panels.map((p) => ({
    x: p.x * width,
    y: p.y * height,
    w: p.w * width,
    h: p.h * height,
    rot: p.rot ?? 0,
  }));
}

function sunsetSky(ctx, x, y, w, h, grade, heat) {
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  const stops = grade.sky;
  sky.addColorStop(0, stops[0]);
  sky.addColorStop(0.42, stops[1]);
  sky.addColorStop(0.55, stops[2]);
  sky.addColorStop(0.72, stops[3]);
  sky.addColorStop(1, stops[4]);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // Low sun with a soft halo; the heat slider swells it.
  const sunX = x + w * 0.68;
  const sunY = y + h * 0.62;
  const sunR = Math.min(w, h) * (0.13 + heat * 0.0006);
  const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.4);
  halo.addColorStop(0, 'rgba(255, 214, 120, 0.85)');
  halo.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Thin sun stripes, the retro kind.
  ctx.fillStyle = 'rgba(255, 46, 136, 0.55)';
  for (let i = 0; i < 3; i++) {
    const stripeY = sunY + sunR * (0.25 + i * 0.3);
    ctx.fillRect(x, stripeY, w, Math.max(2, sunR * 0.07));
  }
}

// One palm tree: a leaning trunk and a crown of drooping fronds.
function palmTree(ctx, baseX, baseY, size, lean) {
  const topX = baseX + lean * size;
  const topY = baseY - size;
  ctx.strokeStyle = '#1a0b2e';
  ctx.lineWidth = Math.max(3, size * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + lean * size * 0.3, baseY - size * 0.55, topX, topY);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, size * 0.03);
  // Fronds fan out from the crown, arching up and then drooping down past it.
  for (let i = 0; i < 7; i++) {
    const a = (-0.5 + i / 6) * Math.PI * 0.9;
    const reach = size * (0.38 + (i % 2) * 0.08);
    const tipX = topX + Math.sin(a) * reach;
    const tipY = topY - Math.cos(a) * reach * 0.35 + reach * 0.45;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.sin(a) * reach * 0.55,
      topY - Math.cos(a) * reach * 0.8,
      tipX,
      tipY,
    );
    ctx.stroke();
  }
  ctx.fillStyle = '#1a0b2e';
  ctx.beginPath();
  ctx.arc(topX, topY, size * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

function skyline(ctx, x, y, w, h) {
  // A low blocky skyline with two lit towers, silhouetted against the sun.
  ctx.fillStyle = '#241040';
  const base = y + h;
  const blocks = [
    [0.02, 0.16, 0.2], [0.2, 0.1, 0.26], [0.38, 0.2, 0.14],
    [0.56, 0.12, 0.24], [0.72, 0.18, 0.18], [0.88, 0.09, 0.12],
  ];
  for (const [bx, bw, bh] of blocks) {
    ctx.fillRect(x + bx * w, base - bh * h, bw * w, bh * h);
  }
  ctx.fillStyle = 'rgba(255, 214, 120, 0.9)';
  for (let i = 0; i < 14; i++) {
    const wx = x + w * (0.05 + (i * 0.067) % 0.9);
    const wy = base - h * (0.05 + ((i * 37) % 13) * 0.012);
    ctx.fillRect(wx, wy, Math.max(2, w * 0.008), Math.max(2, h * 0.012));
  }
  palmTree(ctx, x + w * 0.12, base, h * 0.34, 0.22);
  palmTree(ctx, x + w * 0.88, base, h * 0.28, -0.18);
}

// The painted sunset a panel shows while it has no photo.
function paintedPanel(ctx, rect, seed, grade, heat) {
  sunsetSky(ctx, rect.x, rect.y, rect.w, rect.h, grade, heat);
  skyline(ctx, rect.x, rect.y, rect.w, rect.h);
  palmTree(ctx, rect.x + rect.w * (0.2 + seed * 0.05), rect.y + rect.h, rect.h * 0.42, 0.25 - seed * 0.1);
}

function drawPhotoCover(ctx, rect, photo, zoom, ox, oy, gradeName, ink) {
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const pw = iw * base;
  const ph = ih * base;
  // Clamp the shift so the photo always covers the panel: no bare edges.
  const maxOx = Math.max(0, (pw - rect.w) / 2 / rect.w);
  const maxOy = Math.max(0, (ph - rect.h) / 2 / rect.h);
  const cx = Math.max(-maxOx, Math.min(maxOx, ox));
  const cy = Math.max(-maxOy, Math.min(maxOy, oy));
  const dx = rect.x + (rect.w - pw) / 2 + cx * rect.w;
  const dy = rect.y + (rect.h - ph) / 2 + cy * rect.h;
  // The grade's filter: mono noir desaturates, Poster Ink punches contrast.
  const filters = [];
  if (gradeName === 'mono') filters.push('grayscale(1)', 'contrast(1.08)');
  if (ink) filters.push('contrast(1.25)', 'saturate(1.3)');
  if (filters.length) ctx.filter = filters.join(' ');
  ctx.drawImage(photo, dx, dy, pw, ph);
  ctx.filter = 'none';
}

// The grade's tint + vignette so photos from different places sit in one poster.
function gradePanel(ctx, rect, grade) {
  const tint = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  tint.addColorStop(0, grade.tint[0]);
  tint.addColorStop(0.6, grade.tint[1]);
  tint.addColorStop(1, grade.tint[2]);
  ctx.fillStyle = tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const edge = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.45,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
  );
  edge.addColorStop(0, 'rgba(20, 6, 40, 0)');
  edge.addColorStop(1, 'rgba(20, 6, 40, 0.35)');
  ctx.fillStyle = edge;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

// Poster Ink: inked horizontal bands and a halftone dot strip, the printed
// poster look. Drawn over a panel after its photo or painted sunset.
function posterInk(ctx, rect) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = 'rgba(10, 4, 24, 0.10)';
  const step = Math.max(10, rect.h * 0.045);
  for (let y = rect.y + step; y < rect.y + rect.h; y += step * 2) {
    ctx.fillRect(rect.x, y, rect.w, Math.max(3, step * 0.28));
  }
  // Halftone dots along the panel's bottom edge.
  ctx.fillStyle = 'rgba(10, 4, 24, 0.35)';
  const dotGap = Math.max(8, rect.w * 0.03);
  for (let x = rect.x + dotGap / 2; x < rect.x + rect.w; x += dotGap) {
    const r = Math.max(1.5, dotGap * 0.14);
    ctx.beginPath();
    ctx.arc(x, rect.y + rect.h - dotGap * 0.55, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPanel(ctx, rect, slot, seed, grade, gradeName, ink, heat) {
  ctx.save();
  // Tilted layouts rotate each panel a few degrees around its centre.
  if (rect.rot) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate((rect.rot * Math.PI) / 180);
    ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
  }
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (slot.photo) {
    drawPhotoCover(ctx, rect, slot.photo, slot.zoom, slot.ox, slot.oy, gradeName, ink);
    gradePanel(ctx, rect, grade);
  } else {
    paintedPanel(ctx, rect, seed, grade, heat);
  }
  if (ink) posterInk(ctx, rect);
  ctx.restore();
  // Crisp white frame, the poster-grid look; thicker on tilted snapshots.
  ctx.save();
  if (rect.rot) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate((rect.rot * Math.PI) / 180);
    ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, rect.w * (rect.rot ? 0.012 : 0.006));
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// The heat meter: a small bar in the caption band showing the poster's heat.
function drawHeatMeter(ctx, x, y, w, h, heat, grade) {
  ctx.fillStyle = 'rgba(26, 11, 46, 0.55)';
  ctx.fillRect(x, y, w, h);
  const fill = ctx.createLinearGradient(x, y, x + w, y);
  fill.addColorStop(0, grade.title[0]);
  fill.addColorStop(1, grade.title[2]);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * (heat / 100)), h - 4);
  ctx.strokeStyle = 'rgba(26, 11, 46, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

// A badge ribbon: a starburst rosette pinned on the band's edge.
function drawBadgeRibbon(ctx, cx, cy, r, grade) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = grade.neon;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rad = i % 2 === 0 ? r : r * 0.72;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a0b2e';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${r * 0.62}px Anton, 'Arial Narrow', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', 0, r * 0.04);
  ctx.restore();
}

function drawBand(ctx, state, width, height) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const grid = gridFor(state.size, state.posterLayout);
  const bandY = grid.band.y * height;
  const bandH = grid.band.h * height;
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  band.addColorStop(0, grade.band[0]);
  band.addColorStop(0.5, grade.band[1]);
  band.addColorStop(1, grade.band[2]);
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, width, bandH);
  // Neon rules above and below the caption.
  ctx.fillStyle = grade.neon;
  ctx.fillRect(width * 0.06, bandY + bandH * 0.12, width * 0.88, Math.max(3, bandH * 0.02));
  ctx.fillStyle = grade.title[2];
  ctx.fillRect(width * 0.06, bandY + bandH * 0.88, width * 0.88, Math.max(3, bandH * 0.02));
  palmTree(ctx, width * 0.05, bandY + bandH * 0.86, bandH * 0.45, 0.2);
  palmTree(ctx, width * 0.955, bandY + bandH * 0.86, bandH * 0.38, -0.2);

  // Heat meter, top right of the band, with its label.
  const meterW = width * 0.16;
  const meterH = Math.max(10, bandH * 0.07);
  const meterX = width * 0.82 - meterW / 2;
  const meterY = bandY + bandH * 0.05;
  ctx.font = `800 ${Math.max(12, bandH * 0.06)}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(26, 11, 46, 0.9)';
  ctx.fillText('HEAT', meterX - 10, meterY + meterH / 2);
  drawHeatMeter(ctx, meterX, meterY, meterW, meterH, state.heat, grade);
  drawBadgeRibbon(ctx, width * 0.055, bandY + bandH * 0.1, Math.max(16, bandH * 0.13), grade);

  const caption = (state.caption || '').trim().toUpperCase();
  if (caption) {
    let size = bandH * 0.42 * state.captionScale;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    while (ctx.measureText(caption).width > width * 0.8 && size > 20) {
      size -= 4;
      ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    }
    // Gradient title lettering, dark outline, soft drop shadow.
    const titleGrad = ctx.createLinearGradient(width * 0.2, 0, width * 0.8, 0);
    titleGrad.addColorStop(0, grade.title[0]);
    titleGrad.addColorStop(0.5, grade.title[1]);
    titleGrad.addColorStop(1, grade.title[2]);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a0b2e';
    ctx.lineWidth = Math.max(4, size * 0.14);
    ctx.shadowColor = 'rgba(26, 11, 46, 0.55)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(caption, width / 2, bandY + bandH * 0.44);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = state.captionColor === '#ffffff' ? titleGrad : state.captionColor;
    ctx.fillText(caption, width / 2, bandY + bandH * 0.44);
  }
  // Neon script subtitle, glowing, under the title.
  const subtitle = (state.subtitle || '').trim();
  if (subtitle) {
    const subSize = Math.max(16, bandH * 0.13);
    ctx.font = `italic 700 ${subSize}px 'Brush Script MT', 'Segoe Script', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = grade.neon;
    ctx.shadowBlur = subSize * 0.7;
    ctx.fillStyle = grade.neon;
    ctx.fillText(subtitle, width / 2, bandY + bandH * 0.66);
    ctx.shadowBlur = 0;
  }
  const tagline = (state.tagline || '').trim().toUpperCase();
  if (tagline) {
    const tagSize = Math.max(14, bandH * 0.085);
    ctx.font = `700 ${tagSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(26, 11, 46, 0.85)';
    const spaced = tagline.split('').join('  ');
    ctx.fillText(spaced, width / 2, bandY + bandH * 0.8);
  }
}

// Film grain: a small tiled noise pattern, drawn once over the whole poster.
let grainPattern = null;
function grain(ctx, width, height) {
  if (!grainPattern) {
    const tile = document.createElement('canvas');
    tile.width = 128;
    tile.height = 128;
    const tctx = tile.getContext('2d');
    const img = tctx.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 22;
    }
    tctx.putImageData(img, 0, 0);
    grainPattern = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function vignette(ctx, width, height) {
  const edge = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.78,
  );
  edge.addColorStop(0, 'rgba(20, 6, 40, 0)');
  edge.addColorStop(1, 'rgba(20, 6, 40, 0.32)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, width, height);
}

// Paints the whole poster onto `canvas` at its export resolution.
export function renderCover(canvas, state) {
  const size = SIZES[state.size] ?? SIZES.square;
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  ctx.fillStyle = '#1a0b2e';
  ctx.fillRect(0, 0, size.w, size.h);
  const rects = panelRects(state.size, state.posterLayout, size.w, size.h);
  rects.forEach((rect, i) => drawPanel(ctx, rect, state.panels[i], i * 0.37 + 0.2, grade, state.grade, state.ink, state.heat));
  drawBand(ctx, state, size.w, size.h);
  grain(ctx, size.w, size.h);
  vignette(ctx, size.w, size.h);
  return { width: size.w, height: size.h };
}

// A fresh poster state: no photos yet, the painted sunset fills every panel.
export function freshState() {
  return {
    size: 'square',
    posterLayout: 'hero',
    grade: 'sunset',
    ink: false,
    heat: 70,
    caption: 'VICE SUNSET',
    subtitle: 'neon nights',
    tagline: 'A POSTER BY YOU',
    captionScale: 1,
    captionColor: '#ffffff',
    onePhoto: true,
    panels: [
      { photo: null, zoom: 1, ox: 0, oy: 0 },
      { photo: null, zoom: 1, ox: 0, oy: 0 },
      { photo: null, zoom: 1, ox: 0, oy: 0 },
      { photo: null, zoom: 1, ox: 0, oy: 0 },
      { photo: null, zoom: 1, ox: 0, oy: 0 },
    ],
  };
}
