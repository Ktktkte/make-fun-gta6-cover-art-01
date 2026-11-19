// Vice Sunset — the editor.
//
// Wires the page: photos per panel (or one photo for all three), drag to
// reposition, zoom sliders, caption words and colour, three post sizes, and
// the Export PNG button. A `?shot=` query sets up a fixed scene for a
// screenshot instead (./shots.js). The preview canvas always paints at the
// poster's export resolution, so what you see is what the PNG holds.
import { SIZES, freshState, panelRects, renderCover } from './cover.js';
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
  const size = SIZES[state.layout];
  document.getElementById('export').textContent =
    `Export PNG ${size.w} x ${size.h}`;
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
  panelEl.querySelector('.center').addEventListener('click', () => {
    state.panels[index].ox = 0;
    state.panels[index].oy = 0;
    redraw();
  });
});

document.getElementById('one-photo').addEventListener('change', (e) => {
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
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const index = rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  return index === -1 ? null : { index, rect: rects[index], x, y };
}
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit || !state.panels[hit.index].photo) return;
  const slot = state.panels[hit.index];
  drag = { index: hit.index, startX: hit.x, startY: hit.y, ox: slot.ox, oy: slot.oy, rect: hit.rect };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit) return;
  const slot = state.panels[drag.index];
  slot.ox = drag.ox + (hit.x - drag.startX) / drag.rect.w;
  slot.oy = drag.oy + (hit.y - drag.startY) / drag.rect.h;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// Post size.
document.getElementById('sizes').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-size]');
  if (!button) return;
  state.layout = button.dataset.size;
  document.querySelectorAll('#sizes button').forEach((b) => b.classList.toggle('on', b === button));
  redraw();
});

// Words.
document.getElementById('caption').addEventListener('input', (e) => {
  state.caption = e.target.value;
  redraw();
});
document.getElementById('caption-size').addEventListener('input', (e) => {
  state.captionScale = Number(e.target.value);
  redraw();
});
document.getElementById('tagline').addEventListener('input', (e) => {
  state.tagline = e.target.value;
  redraw();
});
document.getElementById('swatches').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-color]');
  if (!button) return;
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
    a.download = `vice-sunset-${state.layout}-${size.width}x${size.height}.png`;
    a.click();
    status.textContent = `Saved ${a.download}`;
  }, 'image/png');
});

// Test hook for the maker's own checks: paint any state offscreen and read
// back its size. Used by the screenshot script, not by the page itself.
window.__vice = {
  state,
  paint(layout) {
    const probe = document.createElement('canvas');
    const copy = { ...state, layout: layout ?? state.layout, panels: state.panels.map((p) => ({ ...p })) };
    const size = renderCover(probe, copy);
    return { width: size.width, height: size.height };
  },
};

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
await loadDisplayFont();
if (shot) {
  await runShot(shot, query, async (sample, caption, tagline, size) => {
    const photo = await loadImage(sample);
    state.layout = SIZES[size] ? size : 'square';
    state.caption = caption;
    state.tagline = tagline;
    applyPhoto(0, photo);
    // Frame faces in the panels: shift the photo down a little so the
    // visible window shows more of the photo's top (clamped in cover.js so
    // the photo always covers its panel).
    state.panels[0].oy = 0.22;
    state.panels[1].oy = 0.2;
    state.panels[2].oy = 0.2;
    redraw();
    document.getElementById('caption').value = caption;
    document.getElementById('tagline').value = tagline;
    document.querySelectorAll('#sizes button').forEach((b) => {
      b.classList.toggle('on', b.dataset.size === state.layout);
    });
  });
} else {
  redraw();
}
