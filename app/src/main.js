// Vice Sunset editor — state, undo/redo, drag-to-position, export, shot scenes.
// My own design. Depends on window.CoverArt (cover.js) for drawing.
(function () {
  'use strict';

  var SAMPLES = ['samples/boulevard.jpg', 'samples/pier.jpg'];
  var GRADE_HEAT = { sunset: 92, neon: 88, dusk: 74, mono: 61, ink: 70 };
  var GRADE_LABEL = { sunset: 'Sunset', neon: 'Neon', dusk: 'Dusk', mono: 'Mono noir', ink: 'Poster Ink' };
  var LAYOUT_LABEL = { hero: 'Hero', fullbleed: 'Fullbleed', grid: 'Grid', tilted: 'Tilted' };

  var state = {
    layout: 'hero',
    grade: 'sunset',
    title: 'VICE SUNSET',
    subtitle: 'LEONIDA • 2026',
    tagline: 'Two outlaws. One last score.',
    exportSize: 'wide',
    panels: [null, null, null, null, null],
  };

  var undoStack = [];
  var redoStack = [];
  var canvas, ctx, heatFill, heatValue, heatWord;
  var selectedPanel = 0;
  var dragging = null;
  var shotMode = null;
  var errors = [];
  window.addEventListener('error', function (e) { errors.push(String(e.message || e.error)); });

  function $(id) { return document.getElementById(id); }

  function snapshot() {
    return JSON.stringify({
      layout: state.layout,
      grade: state.grade,
      title: state.title,
      subtitle: state.subtitle,
      tagline: state.tagline,
      exportSize: state.exportSize,
      panels: state.panels.map(function (p) {
        return p ? { src: p.src, ox: p.ox, oy: p.oy, zoom: p.zoom } : null;
      }),
    });
  }

  function pushUndo() {
    undoStack.push(snapshot());
    if (undoStack.length > 20) undoStack.shift();
    redoStack.length = 0;
    syncUndoButtons();
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('cannot load ' + src)); };
      img.src = src;
    });
  }

  function restore(json) {
    var data = JSON.parse(json);
    state.layout = data.layout;
    state.grade = data.grade;
    state.title = data.title;
    state.subtitle = data.subtitle;
    state.tagline = data.tagline;
    state.exportSize = data.exportSize;
    var jobs = data.panels.map(function (p, i) {
      if (!p) { state.panels[i] = null; return Promise.resolve(); }
      return loadImage(p.src).then(function (img) {
        state.panels[i] = { img: img, src: p.src, ox: p.ox, oy: p.oy, zoom: p.zoom };
      });
    });
    return Promise.all(jobs).then(function () {
      syncControls();
      drawPreview();
    });
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(undoStack.pop()).then(syncUndoButtons);
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(redoStack.pop()).then(syncUndoButtons);
  }

  function syncUndoButtons() {
    var u = $('undoBtn'), r = $('redoBtn');
    if (u) u.disabled = !undoStack.length;
    if (r) r.disabled = !redoStack.length;
  }

  function heatScore() {
    var base = GRADE_HEAT[state.grade] || 70;
    var photos = state.panels.filter(function (p) { return p; }).length;
    return Math.min(100, base + photos * 2);
  }

  function heatWordFor(score) {
    if (score >= 90) return 'BLAZING';
    if (score >= 75) return 'HOT';
    if (score >= 60) return 'WARM';
    return 'COOL';
  }

  function syncControls() {
    var i;
    document.querySelectorAll('[data-layout]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.layout === state.layout);
    });
    document.querySelectorAll('[data-grade]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.grade === state.grade);
    });
    document.querySelectorAll('[data-size]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.size === state.exportSize);
    });
    if ($('titleInput')) $('titleInput').value = state.title;
    if ($('subtitleInput')) $('subtitleInput').value = state.subtitle;
    if ($('taglineInput')) $('taglineInput').value = state.tagline;
    var score = heatScore();
    if (heatFill) heatFill.style.width = score + '%';
    if (heatValue) heatValue.textContent = score;
    if (heatWord) heatWord.textContent = heatWordFor(score);
    var slots = document.querySelectorAll('.panel-slot');
    slots.forEach(function (slot, idx) {
      slot.classList.toggle('filled', !!state.panels[idx]);
      slot.classList.toggle('selected', idx === selectedPanel);
      var label = slot.querySelector('.slot-state');
      if (label) label.textContent = state.panels[idx] ? 'photo loaded' : 'painted art';
    });
    syncUndoButtons();
  }

  function drawPreview() {
    if (!canvas) return;
    var size = window.CoverArt.SIZES[state.exportSize] || [1080, 1350];
    window.CoverArt.drawCover(canvas, state, size[0], size[1]);
  }

  function scheduleDraw() {
    requestAnimationFrame(drawPreview);
  }

  function setPhoto(index, file) {
    var reader = new FileReader();
    reader.onload = function () {
      loadImage(String(reader.result)).then(function (img) {
        pushUndo();
        state.panels[index] = { img: img, src: String(reader.result), ox: 0, oy: 0, zoom: 1 };
        selectedPanel = index;
        syncControls();
        drawPreview();
      });
    };
    reader.readAsDataURL(file);
  }

  function clearPhoto(index) {
    if (!state.panels[index]) return;
    pushUndo();
    state.panels[index] = null;
    syncControls();
    drawPreview();
  }

  function previewScale() {
    var rect = canvas.getBoundingClientRect();
    return { x: rect.width / canvas.width, y: rect.height / canvas.height, rect: rect };
  }

  function hitPanel(clientX, clientY) {
    var sc = previewScale();
    var px = (clientX - sc.rect.left) / sc.x;
    var py = (clientY - sc.rect.top) / sc.y;
    var rects = window.CoverArt.layoutRects(canvas.width, canvas.height, state.layout);
    for (var i = 4; i >= 0; i--) {
      var r = rects[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    return -1;
  }

  function bindCanvas() {
    canvas.addEventListener('pointerdown', function (e) {
      var idx = hitPanel(e.clientX, e.clientY);
      if (idx < 0) return;
      selectedPanel = idx;
      syncControls();
      if (!state.panels[idx]) return;
      dragging = { idx: idx, startX: e.clientX, startY: e.clientY, ox: state.panels[idx].ox, oy: state.panels[idx].oy };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var sc = previewScale();
      var p = state.panels[dragging.idx];
      if (!p) return;
      p.ox = Math.max(-1, Math.min(1, dragging.ox + (e.clientX - dragging.startX) / sc.x / canvas.width * 2.2));
      p.oy = Math.max(-1, Math.min(1, dragging.oy + (e.clientY - dragging.startY) / sc.y / canvas.height * 2.2));
      scheduleDraw();
    });
    canvas.addEventListener('pointerup', function () {
      if (dragging) { pushUndo(); dragging = null; }
    });
    canvas.addEventListener('wheel', function (e) {
      var idx = hitPanel(e.clientX, e.clientY);
      if (idx < 0 || !state.panels[idx]) return;
      e.preventDefault();
      pushUndo();
      var p = state.panels[idx];
      p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
      drawPreview();
    }, { passive: false });
  }

  function exportPNG(sizeKey) {
    var size = window.CoverArt.SIZES[sizeKey] || window.CoverArt.SIZES.wide;
    var off = document.createElement('canvas');
    window.CoverArt.drawCover(off, state, size[0], size[1]);
    return new Promise(function (resolve) {
      off.toBlob(function (blob) { resolve(blob); }, 'image/png');
    });
  }

  function downloadExport() {
    exportPNG(state.exportSize).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vice-sunset-cover-' + state.exportSize + '.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    });
  }

  function loadSamplesIntoPanels() {
    var jobs = SAMPLES.map(function (src, i) {
      return loadImage(src).then(function (img) {
        state.panels[i] = { img: img, src: src, ox: 0, oy: 0, zoom: 1 };
      });
    });
    return Promise.all(jobs);
  }

  // Shot scenes for screenshots: ?shot=cover|editor|portrait|square
  var SHOTS = {
    cover: { layout: 'hero', grade: 'sunset', size: 'wide', chrome: false },
    editor: { layout: 'hero', grade: 'sunset', size: 'wide', chrome: true },
    portrait: { layout: 'grid', grade: 'dusk', size: 'portrait', chrome: false },
    square: { layout: 'tilted', grade: 'neon', size: 'square', chrome: false },
  };

  function runShot(name) {
    var preset = SHOTS[name] || SHOTS.cover;
    state.layout = preset.layout;
    state.grade = preset.grade;
    state.exportSize = preset.size;
    if (!preset.chrome) document.body.classList.add('shot-cover');
    return loadSamplesIntoPanels().then(function () {
      // Fill the remaining panels with the two samples alternating.
      var i;
      for (i = 2; i < 5; i++) {
        var src = SAMPLES[i % 2];
        var img = state.panels[i % 2].img;
        state.panels[i] = { img: img, src: src, ox: 0, oy: 0, zoom: 1 };
      }
      syncControls();
      drawPreview();
      window.__shotReady = true;
    });
  }

  function init() {
    canvas = $('coverCanvas');
    heatFill = $('heatFill');
    heatValue = $('heatValue');
    heatWord = $('heatWord');
    var params = new URLSearchParams(window.location.search);
    shotMode = params.get('shot');

    document.querySelectorAll('[data-layout]').forEach(function (b) {
      b.addEventListener('click', function () { pushUndo(); state.layout = b.dataset.layout; syncControls(); drawPreview(); });
    });
    document.querySelectorAll('[data-grade]').forEach(function (b) {
      b.addEventListener('click', function () { pushUndo(); state.grade = b.dataset.grade; syncControls(); drawPreview(); });
    });
    document.querySelectorAll('[data-size]').forEach(function (b) {
      b.addEventListener('click', function () { state.exportSize = b.dataset.size; syncControls(); drawPreview(); });
    });
    ['titleInput', 'subtitleInput', 'taglineInput'].forEach(function (id, i) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', function () {
        var keys = ['title', 'subtitle', 'tagline'];
        state[keys[i]] = el.value;
        scheduleDraw();
      });
      el.addEventListener('change', function () { pushUndo(); });
    });
    var slots = document.querySelectorAll('.panel-slot');
    slots.forEach(function (slot, idx) {
      var fileInput = slot.querySelector('input[type=file]');
      var clearBtn = slot.querySelector('.slot-clear');
      slot.addEventListener('click', function (e) {
        if (e.target === clearBtn) return;
        selectedPanel = idx;
        syncControls();
        if (fileInput) fileInput.click();
      });
      if (fileInput) {
        fileInput.addEventListener('change', function () {
          if (fileInput.files && fileInput.files[0]) setPhoto(idx, fileInput.files[0]);
          fileInput.value = '';
        });
      }
      if (clearBtn) {
        clearBtn.addEventListener('click', function (e) { e.stopPropagation(); clearPhoto(idx); });
      }
    });
    var sampleBtn = $('loadSamplesBtn');
    if (sampleBtn) {
      sampleBtn.addEventListener('click', function () {
        pushUndo();
        loadSamplesIntoPanels().then(function () { syncControls(); drawPreview(); });
      });
    }
    if ($('exportBtn')) $('exportBtn').addEventListener('click', downloadExport);
    if ($('undoBtn')) $('undoBtn').addEventListener('click', undo);
    if ($('redoBtn')) $('redoBtn').addEventListener('click', redo);
    bindCanvas();

    // Wait for the display font, then draw.
    var ready = document.fonts ? document.fonts.load('100px Anton').catch(function () {}) : Promise.resolve();
    ready.then(function () {
      if (shotMode) {
        runShot(shotMode).catch(function (err) { errors.push(String(err)); window.__shotReady = true; });
      } else {
        syncControls();
        drawPreview();
        window.__shotReady = true;
      }
    });

    // Test hooks for the local combo check (not part of the UI).
    window.__cover = {
      state: state,
      errors: errors,
      drawCover: window.CoverArt.drawCover,
      exportPNG: exportPNG,
      setState: function (patch) {
        Object.assign(state, patch);
        syncControls();
        drawPreview();
      },
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
