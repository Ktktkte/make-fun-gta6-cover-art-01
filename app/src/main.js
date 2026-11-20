// Vice Sunset v2 (fresh build) — the editor.
//
// Wires the page: photos per panel (or one photo for all five), drag to
// reposition, zoom sliders, four layouts, four colour grades + Poster Ink,
// heat, caption words with gradient title and neon script subtitle, three
// post sizes, undo/redo, and the Export PNG button. A `?shot=` query sets
// up a fixed scene for a screenshot instead (./shots.js). The preview canvas
// always paints at the poster's export resolution, so what you see is what
// the PNG holds.
import { SIZES, GRADES, LAYOUTS, freshState, panelRects, renderCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = freshState();

// The display font lives under app/fonts/ (SIL Open Font License). Load it
// before the first paint so the caption is drawn in Anton from the start.
async function loadDisplayFont() {
  try {
    const face = new FontFace('Anton', 'url(./fonts/Anton-Regular.ttf)');
    document.fonts.add(face);
    await face.load();
  } catch {
    // Falls back to the condensed system font named in cover.js.
  }
  await document.fonts.ready;
}

function redraw() {
  renderCover(canvas, state);
  const size = SIZES[state.size];
  document.getElementById('export').textContent =
    `Export PNG ${size.w} x ${size.h}`;
}

// --- Undo / redo -----------------------------------------------------------
// A snapshot holds everything except the photo pixels: each panel keeps an
// index into the photo bank, so undo never loses a loaded photo.
const photoBank = [];
function photoIndex(photo) {
  if (!photo) return -1;
  let i = photoBank.indexOf(photo);
  if (i === -1) {
    photoBank.push(photo);
    i = photoBank.length - 1;
  }
  return i;
}
function snapshot() {
  return JSON.stringify({
    size: state.size,
    posterLayout: state.posterLayout,
    grade: state.grade,
    ink: state.ink,
    heat: state.heat,
    caption: state.caption,
    subtitle: state.subtitle,
    tagline: state.tagline,
    captionScale: state.captionScale,
    captionColor: state.captionColor,
    onePhoto: state.onePhoto,
    panels: state.panels.map((p) => ({
      photo: photoIndex(p.photo),
      zoom: p.zoom,
      ox: p.ox,
      oy: p.oy,
    })),
  });
}
const undoStack = [];
const redoStack = [];
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncUndoButtons();
}
function restore(snap) {
  const data = JSON.parse(snap);
  state.size = data.size;
  state.posterLayout = data.posterLayout;
  state.grade = data.grade;
  state.ink = data.ink;
  state.heat = data.heat;
  state.caption = data.caption;
  state.subtitle = data.subtitle;
  state.tagline = data.tagline;
  state.captionScale = data.captionScale;
  state.captionColor = data.captionColor;
  state.onePhoto = data.onePhoto;
  data.panels.forEach((saved, i) => {
    state.panels[i].photo = saved.photo === -1 ? null : photoBank[saved.photo];
    state.panels[i].zoom = saved.zoom;
    state.panels[i].ox = saved.ox;
    state.panels[i].oy = saved.oy;
  });
  syncControls();
  redraw();
}
function syncUndoButtons() {
  document.getElementById('undo').disabled = undoStack.length === 0;
  document.getElementById('redo').disabled = redoStack.length === 0;
}
document.getElementById('undo').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncUndoButtons();
});
document.getElementById('redo').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncUndoButtons();
});

// Reflect the state back into every control (used after undo/redo).
function syncControls() {
  document.querySelectorAll('#sizes button').forEach((b) => {
    b.classList.toggle('on', b.dataset.size === state.size);
  });
  document.querySelectorAll('#layouts button').forEach((b) => {
    b.classList.toggle('on', b.dataset.layout === state.posterLayout);
  });
  document.querySelectorAll('#grades button').forEach((b) => {
    b.classList.toggle('on', b.dataset.grade === state.grade);
  });
  document.getElementById('poster-ink').checked = state.ink;
  document.getElementById('heat').value = String(state.heat);
  document.getElementById('one-photo').checked = state.onePhoto;
  document.getElementById('caption').value = state.caption;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('tagline').value = state.tagline;
  document.getElementById('caption-size').value = String(state.captionScale);
  document.querySelectorAll('#swatches button').forEach((b) => {
    b.classList.toggle('on', b.dataset.color === state.captionColor);
  });
  document.querySelectorAll('.panel').forEach((panelEl) => {
    const i = Number(panelEl.dataset.panel);
    panelEl.querySelector('input[type=range]').value = String(state.panels[i].zoom);
  });
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function loadFromFile(file) {
  return loadImage(URL.createObjectURL(file));
}

function applyPhoto(index, photo) {
  if (state.onePhoto) {
    for (const slot of state.panels) {
      slot.photo = photo;
      slot.zoom = 1;
      slot.ox = 0;
      slot.oy = 0;
    }
    document.querySelectorAll('.panel input[type=range]').forEach((r) => { r.value = '1'; });
  } else {
    const slot = state.panels[index];
    slot.photo = photo;
    slot.zoom = 1;
    slot.ox = 0;
    slot.oy = 0;
    document.querySelector(`.panel[data-panel="${index}"] input[type=range]`).value = '1';
  }
  redraw();
}

document.querySelectorAll('.panel').forEach((panelEl) => {
  const index = Number(panelEl.dataset.panel);
  panelEl.querySelector('input[type=file]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      pushHistory();
      applyPhoto(index, await loadFromFile(file));
      status.textContent = 'Photo loaded.';
    } catch {
      status.textContent = 'That photo could not be read.';
    }
  });
  panelEl.querySelector('input[type=range]').addEventListener('input', (e) => {
    state.panels[index].zoom = Number(e.target.value);
    redraw();
  });
  panelEl.querySelector('input[type=range]').addEventListener('change', pushHistory);
  panelEl.querySelector('.center').addEventListener('click', () => {
    pushHistory();
    state.panels[index].ox = 0;
    state.panels[index].oy = 0;
    redraw();
  });
});

document.getElementById('one-photo').addEventListener('change', (e) => {
  pushHistory();
  state.onePhoto = e.target.checked;
  if (state.onePhoto && state.panels[0].photo) {
    for (const slot of state.panels) slot.photo = state.panels[0].photo;
  }
  redraw();
});

// Drag a photo inside its panel to reposition it.
let drag = null;
function panelAt(clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const x = ((clientX - box.left) / box.width) * canvas.width;
  const y = ((clientY - box.top) / box.height) * canvas.height;
  const rects = panelRects(state.size, state.posterLayout, canvas.width, canvas.height);
  const index = rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  return index === -1 ? null : { index, rect: rects[index], x, y };
}
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit || !state.panels[hit.index].photo) return;
  const slot = state.panels[hit.index];
  drag = { index: hit.index, startX: hit.x, startY: hit.y, ox: slot.ox, oy: slot.oy, rect: hit.rect, moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit) return;
  const slot = state.panels[drag.index];
  slot.ox = drag.ox + (hit.x - drag.startX) / drag.rect.w;
  slot.oy = drag.oy + (hit.y - drag.startY) / drag.rect.h;
  drag.moved = true;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  if (drag?.moved) pushHistory();
  drag = null;
});

// Post size.
document.getElementById('sizes').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-size]');
  if (!button) return;
  pushHistory();
  state.size = button.dataset.size;
  document.querySelectorAll('#sizes button').forEach((b) => b.classList.toggle('on', b === button));
  redraw();
});

// Panel layout.
document.getElementById('layouts').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-layout]');
  if (!button) return;
  pushHistory();
  state.posterLayout = button.dataset.layout;
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('on', b === button));
  redraw();
});

// Colour grade.
document.getElementById('grades').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-grade]');
  if (!button) return;
  pushHistory();
  state.grade = button.dataset.grade;
  document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('on', b === button));
  redraw();
});

// Poster Ink.
document.getElementById('poster-ink').addEventListener('change', (e) => {
  pushHistory();
  state.ink = e.target.checked;
  redraw();
});

// Heat.
document.getElementById('heat').addEventListener('input', (e) => {
  state.heat = Number(e.target.value);
  redraw();
});
document.getElementById('heat').addEventListener('change', pushHistory);

// Words.
document.getElementById('caption').addEventListener('input', (e) => {
  state.caption = e.target.value;
  redraw();
});
document.getElementById('caption').addEventListener('change', pushHistory);
document.getElementById('caption-size').addEventListener('input', (e) => {
  state.captionScale = Number(e.target.value);
  redraw();
});
document.getElementById('caption-size').addEventListener('change', pushHistory);
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('change', pushHistory);
document.getElementById('tagline').addEventListener('input', (e) => {
  state.tagline = e.target.value;
  redraw();
});
document.getElementById('tagline').addEventListener('change', pushHistory);
document.getElementById('swatches').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-color]');
  if (!button) return;
  pushHistory();
  state.captionColor = button.dataset.color;
  document.querySelectorAll('#swatches button').forEach((b) => b.classList.toggle('on', b === button));
  redraw();
});

// Export: paint the poster fresh at full size and download it as a PNG.
document.getElementById('export').addEventListener('click', () => {
  const out = document.createElement('canvas');
  const size = renderCover(out, state);
  out.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — please try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-sunset-v2-${state.posterLayout}-${state.grade}-${size.width}x${size.height}.png`;
    a.click();
    status.textContent = `Saved ${a.download}`;
  }, 'image/png');
});

// Test hook for the maker's own checks: paint any state offscreen and read
// back its size. Used by the screenshot script, not by the page itself.
window.__vice = {
  state,
  GRADES,
  LAYOUTS,
  paint(size, posterLayout, grade) {
    const probe = document.createElement('canvas');
    const copy = {
      ...state,
      size: size ?? state.size,
      posterLayout: posterLayout ?? state.posterLayout,
      grade: grade ?? state.grade,
      panels: state.panels.map((p) => ({ ...p })),
    };
    const out = renderCover(probe, copy);
    return { width: out.width, height: out.height };
  },
};

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
await loadDisplayFont();
if (shot) {
  await runShot(shot, query, async (scene) => {
    const photo = await loadImage(scene.sample);
    state.size = SIZES[scene.size] ? scene.size : 'square';
    state.posterLayout = LAYOUTS[scene.layout] ? scene.layout : 'hero';
    state.grade = GRADES[scene.grade] ? scene.grade : 'sunset';
    state.ink = scene.ink;
    state.heat = scene.heat;
    state.caption = scene.caption;
    state.subtitle = scene.subtitle;
    state.tagline = scene.tagline;
    applyPhoto(0, photo);
    // Frame faces in the panels: tall panels shift the photo down a little
    // so the visible window shows more of the photo's top, and wide panels
    // shift it further down for the same reason (a positive shift shows the
    // photo's top; the shift is clamped in cover.js so the photo always
    // covers its panel).
    const rects = panelRects(state.size, state.posterLayout, 1000, 1000);
    state.panels.forEach((slot, i) => {
      const rect = rects[i];
      if (rect.h > rect.w * 0.9) slot.oy = i === 0 ? 0.22 : 0.2;
      else if (rect.w > rect.h * 1.2) slot.oy = 0.55;
      else slot.oy = 0;
    });
    redraw();
    syncControls();
  });
} else {
  redraw();
}
