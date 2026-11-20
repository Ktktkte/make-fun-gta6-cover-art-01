// Vice Sunset — editor.
//
// Wires the cover painter to the page: photo loading, per-panel crop
// and position, layouts, grades, export, undo/redo, heat meter and
// the ?shot= scenes the screenshots are taken from. Everything runs
// offline; photos are read on the machine, never uploaded.

import { paintCover, panelRects, heatOf, LAYOUTS, GRADES, SIZES } from './cover.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

const state = {
  layout: 'hero',
  grade: 'sunset',
  size: 'square',
  title: 'VICE SUNSET',
  subtitle: 'Welcome to Leonida',
  tagline: 'One city. Two outlaws. No way back.',
  panels: [
    { src: 'samples/boulevard.jpg', img: null, cx: 0.5, cy: 0.45, zoom: 1 },
    { src: null, img: null, cx: 0.5, cy: 0.5, zoom: 1 },
    { src: 'samples/pier.jpg', img: null, cx: 0.5, cy: 0.5, zoom: 1 },
    { src: null, img: null, cx: 0.5, cy: 0.5, zoom: 1 },
    { src: null, img: null, cx: 0.5, cy: 0.5, zoom: 1 },
  ],
};

let selected = 0;
let undoStack = [];
let redoStack = [];
let lastRects = [];
let lastDraw = { w: 0, h: 0 };
let readyResolve;
const ready = new Promise((r) => { readyResolve = r; });

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cannot load ' + src));
    img.src = src;
  });
}

async function loadPanel(i) {
  const p = state.panels[i];
  if (!p.src) { p.img = null; return; }
  try {
    p.img = await loadImage(p.src);
  } catch {
    p.img = null;
  }
}

function snapshot() {
  return JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    size: state.size,
    title: state.title,
    subtitle: state.subtitle,
    tagline: state.tagline,
    panels: state.panels.map((p) => ({ src: p.src, cx: p.cx, cy: p.cy, zoom: p.zoom })),
  });
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 40) undoStack.shift();
  redoStack = [];
}

async function restore(json) {
  const s = JSON.parse(json);
  state.layout = s.layout;
  state.grade = s.grade;
  state.size = s.size;
  state.title = s.title;
  state.subtitle = s.subtitle;
  state.tagline = s.tagline;
  for (let i = 0; i < 5; i++) {
    state.panels[i].src = s.panels[i].src;
    state.panels[i].cx = s.panels[i].cx;
    state.panels[i].cy = s.panels[i].cy;
    state.panels[i].zoom = s.panels[i].zoom;
    await loadPanel(i);
  }
  syncControls();
  render();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
}

// Preview canvas: internal pixels follow the export aspect, capped at 640.
function previewSize() {
  const [w, h] = SIZES[state.size];
  const scale = Math.min(1, 640 / Math.max(w, h));
  return [Math.round(w * scale), Math.round(h * scale)];
}

function render() {
  const [w, h] = previewSize();
  if (preview.width !== w || preview.height !== h) {
    preview.width = w;
    preview.height = h;
  }
  lastDraw = { w, h };
  lastRects = paintCover(pctx, state, w, h);
  const heat = heatOf(state);
  $('heatFill').style.width = heat.score + '%';
  $('heatScore').textContent = heat.score + ' — ' + heat.label;
  document.querySelectorAll('#layouts button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#grades button').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('#sizes button').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  document.querySelectorAll('#panelPick button').forEach((b, i) => {
    b.classList.toggle('active', i === selected);
    const p = state.panels[i];
    b.textContent = (i === 0 ? 'Hero' : 'Panel ' + i) + (p.img ? ' ●' : ' ○');
  });
  $('photoName').textContent = state.panels[selected].src
    ? state.panels[selected].src.split('/').pop()
    : 'painted art';
}

function syncControls() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('taglineInput').value = state.tagline;
}

function pickPanelAt(clientX, clientY) {
  const r = preview.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * lastDraw.w;
  const y = ((clientY - r.top) / r.height) * lastDraw.h;
  // Topmost panel wins: check small panels first, hero last.
  for (let i = 4; i >= 0; i--) {
    const pr = lastRects[i];
    if (pr && x >= pr.x && x <= pr.x + pr.w && y >= pr.y && y <= pr.y + pr.h) return i;
  }
  return -1;
}

let dragging = null;

preview.addEventListener('pointerdown', (e) => {
  const i = pickPanelAt(e.clientX, e.clientY);
  if (i < 0) return;
  selected = i;
  dragging = { x: e.clientX, y: e.clientY, moved: false };
  preview.setPointerCapture(e.pointerId);
  render();
});

preview.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = state.panels[selected];
  if (!p.img) return;
  const r = preview.getBoundingClientRect();
  const dx = ((e.clientX - dragging.x) / r.width) * lastDraw.w;
  const dy = ((e.clientY - dragging.y) / r.height) * lastDraw.h;
  const pr = lastRects[selected];
  const scale = Math.max(pr.w / p.img.naturalWidth, pr.h / p.img.naturalHeight) * p.zoom;
  const dw = p.img.naturalWidth * scale;
  const dh = p.img.naturalHeight * scale;
  p.cx = Math.min(1, Math.max(0, p.cx - dx / dw));
  p.cy = Math.min(1, Math.max(0, p.cy - dy / dh));
  dragging.x = e.clientX;
  dragging.y = e.clientY;
  dragging.moved = true;
  render();
});

preview.addEventListener('pointerup', () => {
  if (dragging && dragging.moved) pushUndo();
  dragging = null;
});

preview.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = state.panels[selected];
  if (!p.img) return;
  p.zoom = Math.min(3, Math.max(1, p.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  render();
}, { passive: false });

$('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  pushUndo();
  const url = URL.createObjectURL(file);
  const p = state.panels[selected];
  p.src = url;
  p.cx = 0.5;
  p.cy = 0.5;
  p.zoom = 1;
  await loadPanel(selected);
  render();
  e.target.value = '';
});

$('titleInput').addEventListener('input', (e) => { state.title = e.target.value; render(); });
$('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
$('taglineInput').addEventListener('input', (e) => { state.tagline = e.target.value; render(); });
$('titleInput').addEventListener('change', () => pushUndo());
$('subtitleInput').addEventListener('change', () => pushUndo());
$('taglineInput').addEventListener('change', () => pushUndo());

document.querySelectorAll('#layouts button').forEach((b) => {
  b.addEventListener('click', () => { pushUndo(); state.layout = b.dataset.layout; render(); });
});
document.querySelectorAll('#grades button').forEach((b) => {
  b.addEventListener('click', () => { pushUndo(); state.grade = b.dataset.grade; render(); });
});
document.querySelectorAll('#sizes button').forEach((b) => {
  b.addEventListener('click', () => { pushUndo(); state.size = b.dataset.size; render(); });
});
document.querySelectorAll('#panelPick button').forEach((b, i) => {
  b.addEventListener('click', () => { selected = i; render(); });
});
$('undoBtn').addEventListener('click', undo);
$('redoBtn').addEventListener('click', redo);
$('exportBtn').addEventListener('click', () => { exportPNG(); });

// Draw the cover at full export size and download it as a PNG.
function exportPNG() {
  const [w, h] = SIZES[state.size];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  paintCover(canvas.getContext('2d'), state, w, h);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-sunset-${state.size}-${state.layout}-${state.grade}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve({ w, h, bytes: blob ? blob.size : 0 });
    }, 'image/png');
  });
}

// Test hooks: render every size x layout x grade combo offscreen and
// report dimensions plus a pixel-variance check (blank = fail).
async function runCombos() {
  const results = [];
  for (const sizeName of Object.keys(SIZES)) {
    const [W, H] = SIZES[sizeName];
    for (const layout of LAYOUTS) {
      for (const grade of GRADES) {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const cover = { ...state, layout, grade };
        paintCover(canvas.getContext('2d'), cover, W, H);
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(0, 0, W, H).data;
        let min = 255;
        let max = 0;
        for (let i = 0; i < data.length; i += 9973) {
          const v = data[i];
          if (v < min) min = v;
          if (v > max) max = v;
        }
        results.push({
          size: sizeName, layout, grade, w: W, h: H,
          ok: canvas.width === W && canvas.height === H && (max - min) > 40,
          spread: max - min,
        });
      }
    }
  }
  return results;
}

window.__vice = { state, render, exportPNG, runCombos, ready, panelRects, SIZES, LAYOUTS, GRADES };

// Screenshot scenes: ?shot=cover|editor|portrait|square (+size/layout/grade).
async function applyShot() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return;
  if (q.get('layout')) state.layout = q.get('layout');
  if (q.get('grade')) state.grade = q.get('grade');
  if (q.get('size')) state.size = q.get('size');
  if (shot === 'cover' || shot === 'portrait' || shot === 'square') {
    document.body.classList.add('shot-cover');
    if (shot === 'portrait') state.size = 'portrait';
    if (shot === 'square') state.size = 'square';
  }
  render();
}

async function boot() {
  await document.fonts.ready;
  try { await document.fonts.load('90px Anton'); } catch { /* fallback fonts */ }
  for (let i = 0; i < 5; i++) await loadPanel(i);
  syncControls();
  await applyShot();
  render();
  readyResolve();
  window.__viceReadyDone = true;
}

boot();
