// main.js — the Vice Sunset editor wiring.
//
// Owns the editor state, undo/redo, photo uploads, drag-to-position, zoom,
// the heat meter, export, and the deep-link parameters the screenshots use.
// Imports the renderer from cover.js; no network, no libraries.

import { GRADES, LAYOUTS, SIZES, renderCover, renderToCanvas, heatScore } from "./cover.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const SAMPLE_URLS = {
  boulevard: "samples/boulevard.jpg",
  pier: "samples/pier.jpg",
};

function blankPanel() {
  return { img: null, ox: 0, oy: 0, zoom: 1 };
}

function defaultState() {
  return {
    layout: "hero",
    grade: "sunset",
    ink: false,
    size: "portrait",
    title: "VICE SUNSET",
    subtitle: "A LEONIDA STORY",
    tagline: "Two outlaws. One sunset.",
    selected: 0,
    panels: [blankPanel(), blankPanel(), blankPanel(), blankPanel(), blankPanel()],
  };
}

let state = defaultState();
let images = [null, null, null, null, null]; // HTMLImageElement per panel
let undoStack = [];
let redoStack = [];
let fontsReady = false;

const preview = $("#preview");
const pctx = preview.getContext("2d");

function snapshot() {
  return JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    ink: state.ink,
    size: state.size,
    title: state.title,
    subtitle: state.subtitle,
    tagline: state.tagline,
    panels: state.panels.map((p) => ({ img: p.img, ox: p.ox, oy: p.oy, zoom: p.zoom })),
  });
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}

function restore(json) {
  const s = JSON.parse(json);
  state.layout = s.layout;
  state.grade = s.grade;
  state.ink = s.ink;
  state.size = s.size;
  state.title = s.title;
  state.subtitle = s.subtitle;
  state.tagline = s.tagline;
  state.panels = s.panels;
  images = state.panels.map((p) => {
    if (!p.img) return null;
    const im = new Image();
    im.src = p.img;
    return im;
  });
  syncControls();
  drawPreview();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncUndoButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncUndoButtons();
}

function syncUndoButtons() {
  $("#undoBtn").disabled = undoStack.length === 0;
  $("#redoBtn").disabled = redoStack.length === 0;
}

function sizeOfPreview() {
  const size = SIZES[state.size] || SIZES.portrait;
  const scale = Math.min(560 / size.w, 640 / size.h);
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

function drawPreview() {
  const { w, h } = sizeOfPreview();
  if (preview.width !== w) preview.width = w;
  if (preview.height !== h) preview.height = h;
  renderCover(pctx, w, h, state, images);
  drawSelection();
  updateHeat();
}

function panelAt(px, py) {
  // Map preview pixel to panel index via the layout geometry (same fractions
  // as cover.js panelRects, re-derived here to avoid importing internals).
  const rects = {
    hero: [[0, 0, 1, 0.56], [0, 0.56, 0.25, 0.44], [0.25, 0.56, 0.25, 0.44], [0.5, 0.56, 0.25, 0.44], [0.75, 0.56, 0.25, 0.44]],
    fullbleed: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 1 / 3, 0.5], [1 / 3, 0.5, 1 / 3, 0.5], [2 / 3, 0.5, 1 / 3, 0.5]],
    grid: [[0, 0, 1, 0.5], [0, 0.5, 0.5, 0.25], [0.5, 0.5, 0.5, 0.25], [0, 0.75, 0.5, 0.25], [0.5, 0.75, 0.5, 0.25]],
    tilted: [[0, 0, 1, 0.56], [0, 0.56, 0.25, 0.44], [0.25, 0.56, 0.25, 0.44], [0.5, 0.56, 0.25, 0.44], [0.75, 0.56, 0.25, 0.44]],
  }[state.layout];
  const fx = px / preview.width;
  const fy = py / preview.height;
  for (let i = 0; i < 5; i++) {
    const [x, y, w, h] = rects[i];
    if (fx >= x && fx <= x + w && fy >= y && fy <= y + h) return i;
  }
  return 0;
}

function drawSelection() {
  const i = state.selected;
  const rects = {
    hero: [[0, 0, 1, 0.56], [0, 0.56, 0.25, 0.44], [0.25, 0.56, 0.25, 0.44], [0.5, 0.56, 0.25, 0.44], [0.75, 0.56, 0.25, 0.44]],
    fullbleed: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 1 / 3, 0.5], [1 / 3, 0.5, 1 / 3, 0.5], [2 / 3, 0.5, 1 / 3, 0.5]],
    grid: [[0, 0, 1, 0.5], [0, 0.5, 0.5, 0.25], [0.5, 0.5, 0.5, 0.25], [0, 0.75, 0.5, 0.25], [0.5, 0.75, 0.5, 0.25]],
    tilted: [[0, 0, 1, 0.56], [0, 0.56, 0.25, 0.44], [0.25, 0.56, 0.25, 0.44], [0.5, 0.56, 0.25, 0.44], [0.75, 0.56, 0.25, 0.44]],
  }[state.layout][i];
  pctx.save();
  pctx.strokeStyle = "#ffb347";
  pctx.lineWidth = 3;
  pctx.setLineDash([10, 6]);
  pctx.strokeRect(
    rects[0] * preview.width + 2,
    rects[1] * preview.height + 2,
    rects[2] * preview.width - 4,
    rects[3] * preview.height - 4,
  );
  pctx.restore();
  $("#panelLabel").textContent = `Panel ${i + 1} of 5 — drag to reposition, scroll to zoom`;
  $("#zoomRange").value = String(Math.round((state.panels[i].zoom || 1) * 100));
  $("#zoomVal").textContent = `${Math.round((state.panels[i].zoom || 1) * 100)}%`;
}

function updateHeat() {
  const score = heatScore(state);
  $("#heatFill").style.width = `${score}%`;
  $("#heatNum").textContent = `${score}°`;
  const label = score >= 85 ? "BLAZING" : score >= 70 ? "HOT" : score >= 55 ? "WARM" : "COOL";
  $("#heatLabel").textContent = label;
}

function syncControls() {
  $$("[data-layout]").forEach((b) => b.classList.toggle("active", b.dataset.layout === state.layout));
  $$("[data-grade]").forEach((b) => b.classList.toggle("active", b.dataset.grade === state.grade));
  $("#inkBtn").classList.toggle("active", !!state.ink);
  $$("[data-size]").forEach((b) => b.classList.toggle("active", b.dataset.size === state.size));
  $("#titleInput").value = state.title;
  $("#subtitleInput").value = state.subtitle;
  $("#taglineInput").value = state.tagline;
  drawSelection();
}

function loadImageForPanel(i, src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => {
      images[i] = im;
      state.panels[i].img = src;
      state.panels[i].ox = 0;
      state.panels[i].oy = 0;
      state.panels[i].zoom = 1;
      drawPreview();
      resolve(true);
    };
    im.onerror = () => resolve(false);
    im.src = src;
  });
}

async function loadSample(name, all) {
  const url = SAMPLE_URLS[name];
  if (!url) return;
  pushUndo();
  if (all) {
    for (let i = 0; i < 5; i++) await loadImageForPanel(i, url);
  } else {
    await loadImageForPanel(state.selected, url);
  }
  drawPreview();
}

function handleUpload(file, all) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    pushUndo();
    const targets = all ? [0, 1, 2, 3, 4] : [state.selected];
    targets.forEach((i) => {
      const im = new Image();
      im.onload = () => {
        images[i] = im;
        state.panels[i].img = reader.result;
        state.panels[i].ox = 0;
        state.panels[i].oy = 0;
        state.panels[i].zoom = 1;
        drawPreview();
      };
      im.src = reader.result;
    });
  };
  reader.readAsDataURL(file);
}

function exportPNG(sizeKey) {
  return new Promise((resolve, reject) => {
    const canvas = renderToCanvas(sizeKey, state, images);
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("export produced no PNG"));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const size = SIZES[sizeKey];
      a.href = url;
      a.download = `vice-sunset-${size.w}x${size.h}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve({ w: size.w, h: size.h, bytes: blob.size });
    }, "image/png");
  });
}

// Drag-to-reposition on the preview canvas.
let drag = null;
preview.addEventListener("pointerdown", (e) => {
  const r = preview.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * preview.width;
  const py = ((e.clientY - r.top) / r.height) * preview.height;
  const i = panelAt(px, py);
  if (i !== state.selected) {
    state.selected = i;
    drawPreview();
  }
  drag = { x: px, y: py, ox: state.panels[i].ox, oy: state.panels[i].oy, moved: false };
  preview.setPointerCapture(e.pointerId);
});
preview.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const r = preview.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * preview.width;
  const py = ((e.clientY - r.top) / r.height) * preview.height;
  const p = state.panels[state.selected];
  const dx = px - drag.x;
  const dy = py - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) {
    if (!drag.moved) {
      drag.moved = true;
      pushUndo();
    }
    p.ox = Math.max(-1, Math.min(1, drag.ox - (dx / preview.width) * 2));
    p.oy = Math.max(-1, Math.min(1, drag.oy - (dy / preview.height) * 2));
    drawPreview();
  }
});
preview.addEventListener("pointerup", () => {
  drag = null;
});
preview.addEventListener("wheel", (e) => {
  e.preventDefault();
  const p = state.panels[state.selected];
  pushUndo();
  p.zoom = Math.max(1, Math.min(3, (p.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.92)));
  drawPreview();
}, { passive: false });

$("#zoomRange").addEventListener("input", (e) => {
  const p = state.panels[state.selected];
  p.zoom = Math.max(1, Math.min(3, Number(e.target.value) / 100));
  drawPreview();
});
$("#zoomRange").addEventListener("change", () => pushUndo());

$$("[data-layout]").forEach((b) => b.addEventListener("click", () => {
  if (state.layout === b.dataset.layout) return;
  pushUndo();
  state.layout = b.dataset.layout;
  syncControls();
  drawPreview();
}));
$$("[data-grade]").forEach((b) => b.addEventListener("click", () => {
  if (state.grade === b.dataset.grade) return;
  pushUndo();
  state.grade = b.dataset.grade;
  syncControls();
  drawPreview();
}));
$("#inkBtn").addEventListener("click", () => {
  pushUndo();
  state.ink = !state.ink;
  syncControls();
  drawPreview();
});
$$("[data-size]").forEach((b) => b.addEventListener("click", () => {
  if (state.size === b.dataset.size) return;
  state.size = b.dataset.size;
  syncControls();
  drawPreview();
}));
$("#titleInput").addEventListener("input", (e) => {
  state.title = e.target.value.slice(0, 24);
  drawPreview();
});
$("#titleInput").addEventListener("change", () => pushUndo());
$("#subtitleInput").addEventListener("input", (e) => {
  state.subtitle = e.target.value.slice(0, 40);
  drawPreview();
});
$("#subtitleInput").addEventListener("change", () => pushUndo());
$("#taglineInput").addEventListener("input", (e) => {
  state.tagline = e.target.value.slice(0, 60);
  drawPreview();
});
$("#taglineInput").addEventListener("change", () => pushUndo());

$("#uploadBtn").addEventListener("click", () => $("#fileInput").click());
$("#fileInput").addEventListener("change", (e) => {
  handleUpload(e.target.files[0], false);
  e.target.value = "";
});
$("#fillAllBtn").addEventListener("click", () => $("#fileInputAll").click());
$("#fileInputAll").addEventListener("change", (e) => {
  handleUpload(e.target.files[0], true);
  e.target.value = "";
});
$("#sampleBoulevard").addEventListener("click", () => loadSample("boulevard", false));
$("#samplePier").addEventListener("click", () => loadSample("pier", false));
$("#sampleAllBtn").addEventListener("click", () => loadSample("boulevard", true));
$("#clearPanelBtn").addEventListener("click", () => {
  pushUndo();
  state.panels[state.selected] = blankPanel();
  images[state.selected] = null;
  drawPreview();
});
$("#undoBtn").addEventListener("click", undo);
$("#redoBtn").addEventListener("click", redo);
$$("[data-export]").forEach((b) => b.addEventListener("click", async () => {
  b.disabled = true;
  try {
    const info = await exportPNG(b.dataset.export);
    $("#exportStatus").textContent = `Exported ${info.w}×${info.h} PNG (${Math.round(info.bytes / 1024)} KB)`;
  } catch (err) {
    $("#exportStatus").textContent = `Export failed: ${err.message}`;
  } finally {
    b.disabled = false;
  }
}));

// Deep-link state for screenshots and sharing: ?layout=&grade=&ink=1&size=
// &title=&sample=boulevard|pier (loads the sample into every panel).
async function applyQuery() {
  const q = new URLSearchParams(location.search);
  if (q.get("layout") && LAYOUTS[q.get("layout")]) state.layout = q.get("layout");
  if (q.get("grade") && GRADES[q.get("grade")]) state.grade = q.get("grade");
  if (q.get("ink") === "1") state.ink = true;
  if (q.get("size") && SIZES[q.get("size")]) state.size = q.get("size");
  if (q.get("title")) state.title = q.get("title").slice(0, 24);
  if (q.get("subtitle")) state.subtitle = q.get("subtitle").slice(0, 40);
  if (q.get("tagline")) state.tagline = q.get("tagline").slice(0, 60);
  const sample = q.get("sample");
  if (sample && SAMPLE_URLS[sample]) {
    for (let i = 0; i < 5; i++) await loadImageForPanel(i, SAMPLE_URLS[sample]);
  }
  syncControls();
  drawPreview();
}

async function boot() {
  try {
    await document.fonts.load('80px Anton');
    await document.fonts.ready;
    fontsReady = true;
  } catch (err) {
    fontsReady = false;
  }
  await applyQuery();
  syncUndoButtons();
}

// Automation hook for the in-session tests and screenshots.
window.__cover = {
  get state() { return state; },
  get fontsReady() { return fontsReady; },
  drawPreview,
  exportPNG,
  renderToCanvas,
  loadSample,
  exportDataURL(sizeKey) {
    return renderToCanvas(sizeKey, state, images).toDataURL("image/png");
  },
  setState(next) {
    pushUndo();
    Object.assign(state, next);
    syncControls();
    drawPreview();
  },
};

boot();
