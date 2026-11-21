/* Vice After Dark — cover drawing engine.
   Draws a GTA-style neon-night poster cover on a canvas from plain state.
   No network, no external assets: photos come from the user or the bundled
   samples, fonts are local files, the skyline and palms are drawn paths. */
(function () {
  'use strict';

  var SIZES = [
    { id: 'square', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
    { id: 'portrait', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
    { id: 'wide', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
    { id: 'story', label: 'Story 1080 × 1920', w: 1080, h: 1920 }
  ];

  var LAYOUTS = [
    { id: 'hero-three', label: 'Hero + three', blurb: 'Big hero, three stacked' },
    { id: 'four-grid', label: 'Four grid', blurb: 'Two by two panels' },
    { id: 'nine-grid', label: 'Nine grid', blurb: 'Three by three panels' },
    { id: 'full-bleed', label: 'Full bleed', blurb: 'One photo, edge to edge' },
    { id: 'tilted', label: 'Tilted snaps', blurb: 'Rotated snapshot cards' },
    { id: 'duo-split', label: 'Duo split', blurb: 'Two tall halves' },
    { id: 'triptych', label: 'Triptych', blurb: 'Three tall panels' }
  ];

  var GRADES = [
    { id: 'neon-night', label: 'Neon Night', skyTop: '#12082e', skyBottom: '#2a0a4d', sunA: '#ff2e88', sunB: '#ff9d00', washTop: 'rgba(255,46,136,0.34)', washBottom: 'rgba(34,211,238,0.30)' },
    { id: 'sunset', label: 'Sunset', skyTop: '#2b0f3a', skyBottom: '#7a1e3c', sunA: '#ff9d00', sunB: '#ff2e88', washTop: 'rgba(255,157,0,0.32)', washBottom: 'rgba(255,46,136,0.30)' },
    { id: 'teal-noir', label: 'Teal Noir', skyTop: '#04121a', skyBottom: '#0a2e35', sunA: '#22d3ee', sunB: '#7ef0d4', washTop: 'rgba(34,211,238,0.26)', washBottom: 'rgba(4,18,26,0.34)' },
    { id: 'mono', label: 'Mono', skyTop: '#101010', skyBottom: '#333333', sunA: '#f2f2f2', sunB: '#9a9a9a', washTop: 'rgba(255,255,255,0.16)', washBottom: 'rgba(0,0,0,0.30)' },
    { id: 'candy-pop', label: 'Candy Pop', skyTop: '#3d0a4d', skyBottom: '#8a1e6e', sunA: '#ff6ad5', sunB: '#ffd166', washTop: 'rgba(255,106,213,0.30)', washBottom: 'rgba(255,209,102,0.26)' }
  ];

  function gradeById(id) {
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i].id === id) return GRADES[i];
    return GRADES[0];
  }

  function sizeById(id) {
    for (var i = 0; i < SIZES.length; i++) if (SIZES[i].id === id) return SIZES[i];
    return SIZES[2];
  }

  function panelCount(layoutId) {
    switch (layoutId) {
      case 'hero-three': return 4;
      case 'four-grid': return 4;
      case 'nine-grid': return 9;
      case 'full-bleed': return 1;
      case 'tilted': return 3;
      case 'duo-split': return 2;
      case 'triptych': return 3;
      default: return 4;
    }
  }

  /* Deterministic pseudo-random generator so a cover renders identically
     every time it is drawn (same seed, same grain, same skyline). */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function defaultState() {
    var panels = [];
    for (var i = 0; i < 9; i++) panels.push({ photo: i % 2, zoom: 1, dx: 0, dy: 0 });
    return {
      layout: 'hero-three',
      grade: 'neon-night',
      size: 'wide',
      title: 'VICE AFTER DARK',
      subtitle: 'Neon Coast nights',
      badge: 'VICE CITY • 2026',
      titleScale: 1,
      stars: 4,
      selectedPanel: 0,
      photos: [],
      panels: panels
    };
  }

  function bandHeight(H) { return Math.round(H * 0.20); }

  /* Panel rectangles for a layout, in cover pixels. Gutters keep panels apart. */
  function panelRects(state, W, H) {
    var band = bandHeight(H);
    var artH = H - band;
    var gap = Math.max(4, Math.round(Math.min(W, H) * 0.008));
    var rects = [];
    function R(x, y, w, h) { rects.push({ x: x, y: y, w: w, h: h }); }
    if (state.layout === 'hero-three') {
      var heroW = Math.round(W * 0.62);
      R(gap, gap, heroW - gap * 2, artH - gap * 2);
      var colX = heroW + gap, colW = W - heroW - gap * 2, third = (artH - gap * 4) / 3;
      for (var i = 0; i < 3; i++) R(colX, gap + i * (third + gap), colW, third);
    } else if (state.layout === 'four-grid') {
      var halfW = (W - gap * 3) / 2, halfH = (artH - gap * 3) / 2;
      R(gap, gap, halfW, halfH); R(gap * 2 + halfW, gap, halfW, halfH);
      R(gap, gap * 2 + halfH, halfW, halfH); R(gap * 2 + halfW, gap * 2 + halfH, halfW, halfH);
    } else if (state.layout === 'nine-grid') {
      var cw = (W - gap * 4) / 3, ch = (artH - gap * 4) / 3;
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++)
        R(gap + c * (cw + gap), gap + r * (ch + gap), cw, ch);
    } else if (state.layout === 'full-bleed') {
      R(0, 0, W, H);
    } else if (state.layout === 'tilted') {
      var sw = Math.round(W * 0.34), sh = Math.round(artH * 0.72);
      R(Math.round(W * 0.05), Math.round(artH * 0.10), sw, sh);
      R(Math.round(W * 0.33), Math.round(artH * 0.16), sw, sh);
      R(Math.round(W * 0.61), Math.round(artH * 0.08), sw, sh);
    } else if (state.layout === 'duo-split') {
      var dw = (W - gap * 3) / 2;
      R(gap, gap, dw, artH - gap * 2); R(gap * 2 + dw, gap, dw, artH - gap * 2);
    } else if (state.layout === 'triptych') {
      var tw = (W - gap * 4) / 3;
      R(gap, gap, tw, artH - gap * 2);
      R(gap * 2 + tw, gap, tw, artH - gap * 2);
      R(gap * 3 + tw * 2, gap, tw, artH - gap * 2);
    }
    return rects;
  }

  function tiltFor(layoutId, index) {
    if (layoutId !== 'tilted') return 0;
    return [-0.10, 0.04, 0.12][index % 3];
  }

  function drawPhotoCover(ctx, img, rect, zoom, dx, dy) {
    if (!img || !img.naturalWidth) return;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
    var dw = iw * scale, dh = ih * scale;
    var ox = rect.x + (rect.w - dw) / 2 + dx * Math.max(0, dw - rect.w);
    var oy = rect.y + (rect.h - dh) / 2 + dy * Math.max(0, dh - rect.h);
    ctx.drawImage(img, ox, oy, dw, dh);
  }

  function drawSkyline(ctx, W, H, grade, seed) {
    var rand = mulberry32(seed);
    var horizon = Math.round(H * 0.62);
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, grade.skyTop);
    sky.addColorStop(1, grade.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // Neon sun disc with slats, low on the horizon.
    var sunR = Math.min(W, H) * 0.17;
    var sunX = W * 0.72, sunY = horizon - sunR * 0.35;
    ctx.save();
    ctx.shadowColor = grade.sunA; ctx.shadowBlur = sunR * 0.9;
    var disc = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
    disc.addColorStop(0, grade.sunB); disc.addColorStop(1, grade.sunA);
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = grade.skyBottom;
    var slit = sunR * 0.10;
    for (var s = 0; s < 4; s++) ctx.fillRect(sunX - sunR, sunY + sunR * 0.08 + s * slit * 1.6, sunR * 2, slit * (0.5 + s * 0.3));
    ctx.restore();
    // Building silhouettes with lit windows.
    ctx.fillStyle = '#07041a';
    var x = 0;
    while (x < W) {
      var bw = W * (0.05 + rand() * 0.09);
      var bh = H * (0.10 + rand() * 0.26);
      ctx.fillRect(x, horizon - bh, bw, bh + 2);
      ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
      var cols = Math.max(1, Math.floor(bw / 16)), rows = Math.max(1, Math.floor(bh / 22));
      for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) {
        if (rand() < 0.42) ctx.fillRect(x + 4 + c * 16, horizon - bh + 6 + r * 22, 6, 8);
      }
      ctx.fillStyle = '#07041a';
      x += bw + W * 0.012;
    }
    // Wet-street reflection streaks under the horizon.
    for (var k = 0; k < 46; k++) {
      var rx = rand() * W, rh = 12 + rand() * 60;
      ctx.fillStyle = rand() < 0.5 ? 'rgba(255,46,136,0.20)' : 'rgba(34,211,238,0.20)';
      ctx.fillRect(rx, horizon + 4 + rand() * (H - horizon - 10), 3, rh);
    }
  }

  function drawPalm(ctx, x, baseY, size, lean) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.rotate(lean);
    ctx.strokeStyle = '#04020e';
    ctx.lineWidth = Math.max(3, size * 0.035);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.10, -size * 0.55, size * 0.04, -size);
    ctx.stroke();
    ctx.lineWidth = Math.max(2, size * 0.02);
    for (var f = 0; f < 7; f++) {
      var ang = -Math.PI * (0.08 + f * 0.13);
      var fx = Math.cos(ang) * size * 0.52, fy = -size + Math.sin(ang) * size * 0.34 + size * 0.10;
      ctx.beginPath();
      ctx.moveTo(size * 0.04, -size);
      ctx.quadraticCurveTo(size * 0.04 + fx * 0.5, -size + fy * 0.4 - size * 0.12, size * 0.04 + fx, -size + fy);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPanelFrame(ctx, rect, tilt, W) {
    ctx.save();
    if (tilt) { ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2); ctx.rotate(tilt); ctx.translate(-rect.w / 2, -rect.h / 2); }
    else ctx.translate(rect.x, rect.y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, W * 0.004);
    ctx.strokeRect(0, 0, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = Math.max(1, W * 0.0015);
    ctx.strokeRect(4, 4, rect.w - 8, rect.h - 8);
    ctx.restore();
  }

  function drawGradeWash(ctx, W, H, grade, seed) {
    var wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, grade.washTop);
    wash.addColorStop(1, grade.washBottom);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    var vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    var rand = mulberry32(seed + 77);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    var dots = Math.round(W * H / 2600);
    for (var i = 0; i < dots; i++) ctx.fillRect(rand() * W, rand() * H, 1.4, 1.4);
  }

  function drawStar(ctx, x, y, r, fill) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / 5;
      var rr = i % 2 === 0 ? r : r * 0.45;
      var px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill ? '#ffd166' : 'rgba(255,255,255,0.25)';
    ctx.fill();
  }

  function drawTitleBand(ctx, W, H, state, grade) {
    var band = bandHeight(H);
    var top = H - band;
    var overlay = state.layout === 'full-bleed';
    ctx.save();
    ctx.fillStyle = overlay ? 'rgba(6,4,20,0.84)' : '#0a0618';
    ctx.fillRect(0, top, W, band);
    // Halftone dots strip along the top of the band, kept clear of the title.
    var rand = mulberry32(4242);
    for (var x = 0; x < W; x += 16) {
      var r = 1.2 + 2.6 * Math.abs(Math.sin(x * 0.045));
      ctx.fillStyle = 'rgba(255,46,136,0.35)';
      ctx.beginPath(); ctx.arc(x + 8, top + 8 + rand() * 3, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(0, top, W, Math.max(3, band * 0.03));
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(0, top + Math.max(3, band * 0.03), W, Math.max(1, band * 0.012));
    // Title and subtitle, stacked on the left with room to breathe.
    // Measure the badge first, then shrink the title to fit the space left
    // of it, so the two can never overlap on a narrow cover.
    var pad = Math.round(W * 0.04);
    ctx.font = Math.round(band * 0.20) + 'px Anton, sans-serif';
    var badgeW = ctx.measureText(state.badge).width + band * 0.42;
    var badgeH = band * 0.34;
    var titleSize = Math.round(band * 0.48 * state.titleScale);
    ctx.font = titleSize + 'px Anton, sans-serif';
    var maxTitleW = W - pad * 2 - badgeW - Math.round(W * 0.02);
    var titleW = ctx.measureText(state.title).width;
    if (titleW > maxTitleW && titleW > 0) {
      titleSize = Math.max(10, Math.floor(titleSize * maxTitleW / titleW));
      ctx.font = titleSize + 'px Anton, sans-serif';
    }
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = Math.round(titleSize * 0.35);
    ctx.fillStyle = '#ffffff';
    var titleY = top + band * 0.56;
    ctx.fillText(state.title, pad, titleY);
    ctx.shadowBlur = 0;
    var subSize = Math.round(band * 0.24);
    ctx.fillStyle = '#22d3ee';
    ctx.font = subSize + 'px Pacifico, cursive';
    ctx.fillText(state.subtitle, pad + 2, top + band * 0.85);
    // Badge ribbon, tilted, top right of the band.
    var badgeText = state.badge;
    ctx.font = Math.round(band * 0.20) + 'px Anton, sans-serif';
    var bw = badgeW, bh = badgeH;
    ctx.save();
    ctx.translate(W - pad - bw / 2, top + band * 0.30);
    ctx.rotate(-0.06);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 0, 1);
    ctx.restore();
    // Heat meter stars under the badge.
    var starR = Math.round(band * 0.11);
    var starsW = 5 * starR * 2.4;
    var sx = W - pad - starsW + starR;
    var sy = top + band * 0.74;
    for (var s = 0; s < 5; s++) drawStar(ctx, sx + s * starR * 2.4, sy, starR, s < state.stars);
    ctx.restore();
  }

  /* Draw the whole cover into canvas (resized to the state's size). */
  function drawCover(canvas, state) {
    var size = sizeById(state.size);
    var W = size.w, H = size.h;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var grade = gradeById(state.grade);
    var seed = 1000 + W + H * 7;
    drawSkyline(ctx, W, H, grade, seed);
    var artH = H - bandHeight(H);
    drawPalm(ctx, W * 0.03, artH * 0.98, Math.min(W, H) * 0.34, -0.08);
    drawPalm(ctx, W * 0.97, artH * 0.98, Math.min(W, H) * 0.30, 0.10);
    var rects = panelRects(state, W, H);
    var count = panelCount(state.layout);
    for (var i = 0; i < count; i++) {
      var rect = rects[i];
      var panel = state.panels[i] || { photo: i, zoom: 1, dx: 0, dy: 0 };
      var photo = state.photos[panel.photo % Math.max(1, state.photos.length)];
      var tilt = tiltFor(state.layout, i);
      ctx.save();
      if (tilt) {
        ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
        ctx.rotate(tilt);
        ctx.translate(-rect.w / 2, -rect.h / 2);
        ctx.beginPath(); ctx.rect(0, 0, rect.w, rect.h); ctx.clip();
        if (photo) drawPhotoCover(ctx, photo.img, { x: 0, y: 0, w: rect.w, h: rect.h }, panel.zoom, panel.dx, panel.dy);
        else { ctx.fillStyle = '#1a1030'; ctx.fillRect(0, 0, rect.w, rect.h); }
        // Snapshot caption strip along the bottom edge of the tilted card.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, rect.h - Math.max(8, H * 0.012), rect.w + 12, Math.max(10, H * 0.03));
        ctx.restore();
        drawPanelFrame(ctx, rect, tilt, W);
      } else {
        ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
        if (photo) drawPhotoCover(ctx, photo.img, rect, panel.zoom, panel.dx, panel.dy);
        else { ctx.fillStyle = '#1a1030'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); }
        ctx.restore();
        drawPanelFrame(ctx, rect, 0, W);
      }
      if (state.selectedPanel === i) {
        ctx.save();
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = Math.max(3, W * 0.005);
        ctx.setLineDash([18, 10]);
        ctx.strokeRect(rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8);
        ctx.restore();
      }
    }
    drawGradeWash(ctx, W, H, grade, seed);
    drawTitleBand(ctx, W, H, state, grade);
  }

  function exportPNG(state, done) {
    var off = document.createElement('canvas');
    drawCover(off, state);
    off.toBlob(function (blob) { done(blob); }, 'image/png');
  }

  window.CoverArt = {
    SIZES: SIZES,
    LAYOUTS: LAYOUTS,
    GRADES: GRADES,
    gradeById: gradeById,
    sizeById: sizeById,
    panelCount: panelCount,
    panelRects: panelRects,
    defaultState: defaultState,
    drawCover: drawCover,
    exportPNG: exportPNG
  };
})();
