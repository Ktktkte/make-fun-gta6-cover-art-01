// Vice Sunset — the cover painter.
//
// Everything on the poster is drawn here in code: the three-panel grid, the
// Vice City sunset (gradient sky, low sun, palm silhouettes, neon lines) and
// the big condensed caption. Photos are drawn inside the panels; a panel with
// no photo yet shows the painted sunset instead, so the poster never looks
// empty. No image is ever fetched from the network.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

// One poster is a hero panel plus two smaller panels above a caption band.
// The numbers below are fractions of the poster's width and height, so the
// same grid works for all three sizes.
function gridFor(size) {
  if (size === 'portrait') {
    return {
      band: { y: 0.76, h: 0.24 },
      panels: [
        { x: 0, y: 0, w: 1, h: 0.545 },
        { x: 0, y: 0.555, w: 0.495, h: 0.195 },
        { x: 0.505, y: 0.555, w: 0.495, h: 0.195 },
      ],
    };
  }
  if (size === 'wide') {
    return {
      band: { y: 0.74, h: 0.26 },
      panels: [
        { x: 0, y: 0, w: 0.6, h: 0.73 },
        { x: 0.61, y: 0, w: 0.39, h: 0.36 },
        { x: 0.61, y: 0.37, w: 0.39, h: 0.36 },
      ],
    };
  }
  return {
    band: { y: 0.74, h: 0.26 },
    panels: [
      { x: 0, y: 0, w: 0.615, h: 0.73 },
      { x: 0.625, y: 0, w: 0.375, h: 0.36 },
      { x: 0.625, y: 0.37, w: 0.375, h: 0.36 },
    ],
  };
}

export function panelRects(size, width, height) {
  const grid = gridFor(size);
  return grid.panels.map((p) => ({
    x: p.x * width,
    y: p.y * height,
    w: p.w * width,
    h: p.h * height,
  }));
}

function sunsetSky(ctx, x, y, w, h) {
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  sky.addColorStop(0, '#2b1055');
  sky.addColorStop(0.42, '#7597de');
  sky.addColorStop(0.55, '#ff2e88');
  sky.addColorStop(0.72, '#ff7a3d');
  sky.addColorStop(1, '#ffb347');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // Low sun with a soft halo.
  const sunX = x + w * 0.68;
  const sunY = y + h * 0.62;
  const sunR = Math.min(w, h) * 0.16;
  const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.4);
  halo.addColorStop(0, 'rgba(255, 214, 120, 0.85)');
  halo.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffe9a8';
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
function paintedPanel(ctx, rect, seed) {
  sunsetSky(ctx, rect.x, rect.y, rect.w, rect.h);
  skyline(ctx, rect.x, rect.y, rect.w, rect.h);
  palmTree(ctx, rect.x + rect.w * (0.2 + seed * 0.05), rect.y + rect.h, rect.h * 0.42, 0.25 - seed * 0.1);
}

function drawPhotoCover(ctx, rect, photo, zoom, ox, oy) {
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
  ctx.drawImage(photo, dx, dy, pw, ph);
}

// Warm sunset grade + vignette so photos from different places sit in one poster.
function gradePanel(ctx, rect) {
  const grade = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grade.addColorStop(0, 'rgba(255, 46, 136, 0.06)');
  grade.addColorStop(0.6, 'rgba(255, 122, 61, 0.05)');
  grade.addColorStop(1, 'rgba(43, 16, 85, 0.28)');
  ctx.fillStyle = grade;
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

function drawPanel(ctx, rect, slot, seed) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (slot.photo) {
    drawPhotoCover(ctx, rect, slot.photo, slot.zoom, slot.ox, slot.oy);
    gradePanel(ctx, rect);
  } else {
    paintedPanel(ctx, rect, seed);
  }
  ctx.restore();
  // Crisp white frame, the poster-grid look.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, rect.w * 0.006);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

function drawBand(ctx, state, width, height) {
  const grid = gridFor(state.layout);
  const bandY = grid.band.y * height;
  const bandH = grid.band.h * height;
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  band.addColorStop(0, '#ff2e88');
  band.addColorStop(0.5, '#ff7a3d');
  band.addColorStop(1, '#ffb347');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, width, bandH);
  // Neon rules above and below the caption.
  ctx.fillStyle = '#37f6ff';
  ctx.fillRect(width * 0.06, bandY + bandH * 0.12, width * 0.88, Math.max(3, bandH * 0.02));
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(width * 0.06, bandY + bandH * 0.88, width * 0.88, Math.max(3, bandH * 0.02));
  palmTree(ctx, width * 0.05, bandY + bandH * 0.86, bandH * 0.45, 0.2);
  palmTree(ctx, width * 0.955, bandY + bandH * 0.86, bandH * 0.38, -0.2);

  const caption = (state.caption || '').trim().toUpperCase();
  if (caption) {
    let size = bandH * 0.52 * state.captionScale;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    while (ctx.measureText(caption).width > width * 0.8 && size > 20) {
      size -= 4;
      ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a0b2e';
    ctx.lineWidth = Math.max(4, size * 0.14);
    ctx.shadowColor = 'rgba(26, 11, 46, 0.55)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(caption, width / 2, bandY + bandH * 0.5);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = state.captionColor;
    ctx.fillText(caption, width / 2, bandY + bandH * 0.5);
  }
  const tagline = (state.tagline || '').trim().toUpperCase();
  if (tagline) {
    const tagSize = Math.max(14, bandH * 0.085);
    ctx.font = `700 ${tagSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(26, 11, 46, 0.85)';
    const spaced = tagline.split('').join('  ');
    ctx.fillText(spaced, width / 2, bandY + bandH * 0.76);
  }
}

// Paints the whole poster onto `canvas` at its export resolution.
export function renderCover(canvas, state) {
  const size = SIZES[state.layout] ?? SIZES.square;
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a0b2e';
  ctx.fillRect(0, 0, size.w, size.h);
  const rects = panelRects(state.layout, size.w, size.h);
  rects.forEach((rect, i) => drawPanel(ctx, rect, state.panels[i], i * 0.37 + 0.2));
  drawBand(ctx, state, size.w, size.h);
  return { width: size.w, height: size.h };
}

// A fresh poster state: no photos yet, the painted sunset fills every panel.
export function freshState() {
  return {
    layout: 'square',
    caption: 'VICE SUNSET',
    tagline: 'A POSTER BY YOU',
    captionScale: 1,
    captionColor: '#ffffff',
    onePhoto: true,
    panels: [
      { photo: null, zoom: 1, ox: 0, oy: 0 },
      { photo: null, zoom: 1, ox: 0, oy: 0 },
      { photo: null, zoom: 1, ox: 0, oy: 0 },
    ],
  };
}
