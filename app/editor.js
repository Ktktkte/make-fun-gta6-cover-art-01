/* Vice After Dark — editor wiring.
   Loads photos, binds every control to cover state, keeps an undo history,
   pans the selected panel by dragging on the preview, and exports PNGs.
   Also runs the screenshot mode: ?shot=cover&layout=..&grade=..&size=.. draws
   one cover full-frame with no editor chrome. */
(function () {
  'use strict';

  var state = CoverArt.defaultState();
  var canvas = document.getElementById('coverPreview');
  var history = [];
  var historyPos = -1;
  var dragging = null;
  var shotMode = new URLSearchParams(location.search).get('shot') === 'cover';

  var SAMPLES = ['samples/boulevard.jpg', 'samples/pier.jpg'];

  function snapshot() {
    return JSON.stringify({
      layout: state.layout, grade: state.grade, size: state.size,
      title: state.title, subtitle: state.subtitle, badge: state.badge,
      titleScale: state.titleScale, stars: state.stars,
      panels: state.panels
    });
  }

  function restore(snap) {
    var s = JSON.parse(snap);
    state.layout = s.layout; state.grade = s.grade; state.size = s.size;
    state.title = s.title; state.subtitle = s.subtitle; state.badge = s.badge;
    state.titleScale = s.titleScale; state.stars = s.stars;
    state.panels = s.panels;
    syncControls();
  }

  function commit() {
    var snap = snapshot();
    if (history[historyPos] === snap) return;
    history = history.slice(0, historyPos + 1);
    history.push(snap);
    if (history.length > 50) history.shift();
    historyPos = history.length - 1;
    syncHistoryButtons();
  }

  function undo() {
    if (historyPos <= 0) return;
    historyPos--;
    restore(history[historyPos]);
    redraw();
    syncHistoryButtons();
  }

  function redo() {
    if (historyPos >= history.length - 1) return;
    historyPos++;
    restore(history[historyPos]);
    redraw();
    syncHistoryButtons();
  }

  function syncHistoryButtons() {
    document.getElementById('undoBtn').disabled = historyPos <= 0;
    document.getElementById('redoBtn').disabled = historyPos >= history.length - 1;
  }

  function redraw() {
    CoverArt.drawCover(canvas, state);
    var note = document.getElementById('panelNote');
    if (note) note.textContent = 'Panel ' + (state.selectedPanel + 1) + ' selected.';
  }

  function loadPhoto(src, name) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        state.photos.push({ img: img, name: name || src.split('/').pop() });
        resolve();
      };
      img.onerror = function () { resolve(); };
      img.src = src;
    });
  }

  function loadPhotoFile(file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          state.photos.push({ img: img, name: file.name });
          resolve();
        };
        img.onerror = function () { resolve(); };
        img.src = reader.result;
      };
      reader.onerror = function () { resolve(); };
      reader.readAsDataURL(file);
    });
  }

  function refreshThumbs() {
    var box = document.getElementById('thumbs');
    box.innerHTML = '';
    state.photos.forEach(function (p, idx) {
      var thumb = document.createElement('img');
      thumb.src = p.img.src;
      thumb.alt = p.name;
      thumb.title = p.name;
      thumb.addEventListener('click', function () {
        var panelIndex = state.selectedPanel < 0 ? 0 : state.selectedPanel;
        state.panels[panelIndex].photo = idx;
        commit(); redraw(); refreshPanelSelect();
      });
      box.appendChild(thumb);
    });
    refreshPanelSelect();
  }

  function refreshPanelSelect() {
    var sel = document.getElementById('panelPhotoSelect');
    if (!sel) return;
    var panelIndex = state.selectedPanel < 0 ? 0 : state.selectedPanel;
    var current = state.panels[panelIndex].photo;
    sel.innerHTML = '';
    state.photos.forEach(function (p, idx) {
      var opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = (idx + 1) + ' — ' + p.name;
      sel.appendChild(opt);
    });
    sel.value = String(current % Math.max(1, state.photos.length));
    document.getElementById('panelZoomInput').value =
      String(Math.round(state.panels[panelIndex].zoom * 100));
  }

  function buildChips(containerId, items, activeId, onPick) {
    var box = document.getElementById(containerId);
    box.innerHTML = '';
    items.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (item.id === activeId ? ' active' : '');
      btn.textContent = item.label;
      if (item.blurb) {
        var small = document.createElement('small');
        small.textContent = item.blurb;
        btn.appendChild(small);
      }
      btn.addEventListener('click', function () { onPick(item.id); });
      box.appendChild(btn);
    });
  }

  function syncControls() {
    document.getElementById('titleInput').value = state.title;
    document.getElementById('subtitleInput').value = state.subtitle;
    document.getElementById('badgeInput').value = state.badge;
    document.getElementById('titleSizeInput').value = String(Math.round(state.titleScale * 100));
    document.getElementById('starsInput').value = String(state.stars);
    buildChips('layoutRow', CoverArt.LAYOUTS, state.layout, function (id) {
      state.layout = id; state.selectedPanel = 0; commit(); redraw(); refreshPanelSelect();
    });
    buildChips('gradeRow', CoverArt.GRADES, state.grade, function (id) {
      state.grade = id; commit(); redraw();
    });
    buildChips('sizeRow', CoverArt.SIZES, state.size, function (id) {
      state.size = id; commit(); redraw();
    });
    refreshPanelSelect();
  }

  function bindControls() {
    document.getElementById('titleInput').addEventListener('input', function (e) {
      state.title = e.target.value.toUpperCase(); redraw();
    });
    document.getElementById('titleInput').addEventListener('change', commit);
    document.getElementById('subtitleInput').addEventListener('input', function (e) {
      state.subtitle = e.target.value; redraw();
    });
    document.getElementById('subtitleInput').addEventListener('change', commit);
    document.getElementById('badgeInput').addEventListener('input', function (e) {
      state.badge = e.target.value.toUpperCase(); redraw();
    });
    document.getElementById('badgeInput').addEventListener('change', commit);
    document.getElementById('titleSizeInput').addEventListener('input', function (e) {
      state.titleScale = Number(e.target.value) / 100; redraw();
    });
    document.getElementById('titleSizeInput').addEventListener('change', commit);
    document.getElementById('starsInput').addEventListener('input', function (e) {
      state.stars = Number(e.target.value); redraw();
    });
    document.getElementById('starsInput').addEventListener('change', commit);
    document.getElementById('panelPhotoSelect').addEventListener('change', function (e) {
      state.panels[state.selectedPanel].photo = Number(e.target.value);
      commit(); redraw();
    });
    document.getElementById('panelZoomInput').addEventListener('input', function (e) {
      state.panels[state.selectedPanel].zoom = Number(e.target.value) / 100; redraw();
    });
    document.getElementById('panelZoomInput').addEventListener('change', commit);
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    });
    document.getElementById('exportBtn').addEventListener('click', function () {
      CoverArt.exportPNG(state, function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'vice-after-dark-' + state.size + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      });
    });

    var input = document.getElementById('photoInput');
    var zone = document.getElementById('dropzone');
    zone.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files);
      Promise.all(files.map(loadPhotoFile)).then(function () {
        commit(); redraw(); refreshThumbs();
      });
      input.value = '';
    });
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('dragging'); });
    zone.addEventListener('dragleave', function () { zone.classList.remove('dragging'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('dragging');
      var files = Array.prototype.slice.call(e.dataTransfer.files).filter(function (f) {
        return f.type.indexOf('image/') === 0;
      });
      Promise.all(files.map(loadPhotoFile)).then(function () {
        commit(); redraw(); refreshThumbs();
      });
    });

    canvas.addEventListener('pointerdown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width;
      var py = (e.clientY - rect.top) / rect.height;
      var size = CoverArt.sizeById(state.size);
      var cx = px * size.w, cy = py * size.h;
      var rects = CoverArt.panelRects(state, size.w, size.h);
      for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
          state.selectedPanel = i;
          dragging = { panel: i, startX: e.clientX, startY: e.clientY, dx: state.panels[i].dx, dy: state.panels[i].dy, rect: rect };
          canvas.setPointerCapture(e.pointerId);
          refreshPanelSelect();
          redraw();
          return;
        }
      }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var size = CoverArt.sizeById(state.size);
      var panel = state.panels[dragging.panel];
      var scaleX = size.w / rect.width, scaleY = size.h / rect.height;
      panel.dx = clamp(dragging.dx + (e.clientX - dragging.startX) * scaleX / Math.max(1, dragging.rect.w), -0.5, 0.5);
      panel.dy = clamp(dragging.dy + (e.clientY - dragging.startY) * scaleY / Math.max(1, dragging.rect.h), -0.5, 0.5);
      redraw();
    });
    canvas.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = null;
      commit();
    });
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function applyShotParams() {
    var q = new URLSearchParams(location.search);
    if (q.get('layout')) state.layout = q.get('layout');
    if (q.get('grade')) state.grade = q.get('grade');
    if (q.get('size')) state.size = q.get('size');
    if (q.get('title')) state.title = q.get('title').toUpperCase();
    if (q.get('subtitle')) state.subtitle = q.get('subtitle');
    if (q.get('badge')) state.badge = q.get('badge').toUpperCase();
    state.selectedPanel = -1;
    document.body.classList.add('shot-mode');
    document.title = 'Vice After Dark — cover shot';
  }

  function boot() {
    if (shotMode) applyShotParams();
    bindControls();
    var loads = SAMPLES.map(function (src) { return loadPhoto(src); });
    var fontsReady = Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('20px Pacifico')
    ]).catch(function () { return null; });
    Promise.all(loads).then(function () { return fontsReady; }).then(function () {
      syncControls();
      commit();
      redraw();
      refreshThumbs();
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
