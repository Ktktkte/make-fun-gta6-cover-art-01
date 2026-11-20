// Vice Sunset cover renderer — draws a five-panel GTA-style poster onto a canvas.
// Pure canvas code, no dependencies. All drawing is my own design.
(function () {
  'use strict';

  var LAYOUTS = ['hero', 'fullbleed', 'grid', 'tilted'];
  var GRADES = ['sunset', 'neon', 'dusk', 'mono', 'ink'];
  var SIZES = {
    square: [1080, 1080],
    portrait: [1080, 1350],
    wide: [1920, 1080],
  };

  // Small seeded random so painted skylines are stable per panel.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Panel rectangles for a layout, in cover space. Five panels: 0 is the hero.
  function layoutRects(W, H, layout) {
    var gap = layout === 'fullbleed' ? 0 : Math.round(Math.min(W, H) * 0.012);
    var smallH = Math.round(H * 0.40);
    var heroH = H - smallH - gap;
    var smallW = Math.floor((W - gap * 3) / 4);
    var i, rects = [];
    if (layout === 'grid') {
      var col = Math.floor((W - gap * 2) / 3);
      var row = Math.floor((H - gap) / 2);
      rects = [
        { x: 0, y: 0, w: col * 2 + gap, h: row, rot: 0 },
        { x: col * 2 + gap * 2, y: 0, w: col, h: row, rot: 0 },
        { x: 0, y: row + gap, w: col, h: row, rot: 0 },
        { x: col + gap, y: row + gap, w: col, h: row, rot: 0 },
        { x: col * 2 + gap * 2, y: row + gap, w: col, h: row, rot: 0 },
      ];
    } else {
      rects.push({ x: 0, y: 0, w: W, h: heroH, rot: 0 });
      for (i = 0; i < 4; i++) {
        rects.push({ x: i * (smallW + gap), y: heroH + gap, w: smallW, h: smallH, rot: 0 });
      }
      if (layout === 'tilted') {
        var tilts = [0, -1.6, 1.1, -1.1, 1.6];
        for (i = 0; i < 5; i++) rects[i].rot = tilts[i];
      }
    }
    return rects;
  }

  // CSS filter string applied while a photo is drawn, per grade.
  function gradeFilter(grade) {
    switch (grade) {
      case 'sunset': return 'saturate(1.35) contrast(1.08) brightness(1.03)';
      case 'neon': return 'saturate(1.55) contrast(1.16) brightness(0.96)';
      case 'dusk': return 'saturate(1.12) contrast(1.06) brightness(0.92)';
      case 'mono': return 'grayscale(1) contrast(1.28) brightness(1.03)';
      case 'ink': return 'grayscale(1) contrast(1.85) brightness(1.06)';
      default: return 'none';
    }
  }

  // Warm / neon / cool colour washes laid over a panel after its photo.
  function gradeOverlays(ctx, r, grade) {
    var g;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    if (grade === 'sunset') {
      g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      g.addColorStop(0, 'rgba(255,122,26,0.20)');
      g.addColorStop(0.55, 'rgba(255,77,141,0.10)');
      g.addColorStop(1, 'rgba(90,20,90,0.22)');
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    } else if (grade === 'neon') {
      g = ctx.createRadialGradient(r.x + r.w * 0.2, r.y + r.h * 0.15, 0, r.x + r.w * 0.2, r.y + r.h * 0.15, r.w * 0.7);
      g.addColorStop(0, 'rgba(255,0,128,0.28)');
      g.addColorStop(1, 'rgba(255,0,128,0)');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      g = ctx.createRadialGradient(r.x + r.w * 0.85, r.y + r.h * 0.9, 0, r.x + r.w * 0.85, r.y + r.h * 0.9, r.w * 0.7);
      g.addColorStop(0, 'rgba(0,229,255,0.26)');
      g.addColorStop(1, 'rgba(0,229,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    } else if (grade === 'dusk') {
      g = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
      g.addColorStop(0, 'rgba(48,16,96,0.28)');
      g.addColorStop(1, 'rgba(10,20,60,0.34)');
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    } else if (grade === 'ink') {
      g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      g.addColorStop(0, 'rgba(20,24,64,0.20)');
      g.addColorStop(1, 'rgba(255,240,200,0.10)');
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    ctx.restore();
  }

  // Painted fallback art for an empty panel: sunset sky, sun, skyline, palms.
  function paintFallback(ctx, r, grade, seed) {
    var rnd = mulberry32(seed);
    var sky = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    if (grade === 'neon') {
      sky.addColorStop(0, '#1b0533');
      sky.addColorStop(0.55, '#7a1060');
      sky.addColorStop(1, '#ff2e88');
    } else if (grade === 'dusk') {
      sky.addColorStop(0, '#0b1030');
      sky.addColorStop(0.55, '#2c1a5e');
      sky.addColorStop(1, '#7a3cff');
    } else if (grade === 'mono' || grade === 'ink') {
      sky.addColorStop(0, '#e8e8e8');
      sky.addColorStop(0.55, '#9a9a9a');
      sky.addColorStop(1, '#2b2b2b');
    } else {
      sky.addColorStop(0, '#2a1052');
      sky.addColorStop(0.45, '#c2337f');
      sky.addColorStop(0.8, '#ff7a2a');
      sky.addColorStop(1, '#ffc46b');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(r.x, r.y, r.w, r.h);

    // Sun with a soft halo.
    var sunX = r.x + r.w * (0.3 + rnd() * 0.4);
    var sunY = r.y + r.h * (0.32 + rnd() * 0.12);
    var sunR = Math.min(r.w, r.h) * 0.16;
    var halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3);
    var sunCore = grade === 'mono' || grade === 'ink' ? '#ffffff' : '#ffd76b';
    halo.addColorStop(0, grade === 'neon' ? 'rgba(255,80,180,0.55)' : 'rgba(255,190,90,0.55)');
    halo.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = sunCore;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    // Two layers of skyline silhouettes with lit windows.
    var base = r.y + r.h;
    var horizon = base - r.h * 0.34;
    var x, bw, bh;
    ctx.fillStyle = grade === 'mono' || grade === 'ink' ? '#3a3a3a' : '#241433';
    x = r.x;
    while (x < r.x + r.w) {
      bw = r.w * (0.08 + rnd() * 0.12);
      bh = r.h * (0.12 + rnd() * 0.22);
      ctx.fillRect(x, horizon - bh, bw, bh + (base - horizon));
      x += bw + r.w * 0.01;
    }
    ctx.fillStyle = grade === 'mono' || grade === 'ink' ? '#111111' : '#120a1e';
    x = r.x;
    while (x < r.x + r.w) {
      bw = r.w * (0.06 + rnd() * 0.1);
      bh = r.h * (0.06 + rnd() * 0.16);
      ctx.fillRect(x, horizon - bh * 0.6, bw, bh * 0.6 + (base - horizon));
      // Lit windows on the near layer.
      ctx.fillStyle = grade === 'mono' || grade === 'ink' ? '#f5f5f5' : '#ffd76b';
      var wy, wx;
      for (wy = 0; wy < 3; wy++) {
        for (wx = 0; wx < 2; wx++) {
          if (rnd() < 0.5) {
            ctx.fillRect(x + bw * (0.2 + wx * 0.35), horizon - bh * 0.6 + bh * 0.18 * wy + 2, Math.max(1.5, bw * 0.1), Math.max(1.5, bh * 0.08));
          }
        }
      }
      ctx.fillStyle = grade === 'mono' || grade === 'ink' ? '#111111' : '#120a1e';
      x += bw + r.w * 0.02;
    }

    // Palm silhouettes: curved trunk, drooping fronds.
    function palm(px, py, s) {
      ctx.strokeStyle = grade === 'mono' || grade === 'ink' ? '#111111' : '#120a1e';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = Math.max(2, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + s * 0.08, py - s * 0.5, px + s * 0.22, py - s * 0.85);
      ctx.stroke();
      var tx = px + s * 0.22;
      var ty = py - s * 0.85;
      var a, f;
      for (f = 0; f < 6; f++) {
        a = -Math.PI * (0.08 + f * 0.16);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(
          tx + Math.cos(a) * s * 0.3, ty + Math.sin(a) * s * 0.3 - s * 0.08,
          tx + Math.cos(a) * s * 0.52, ty + Math.sin(a) * s * 0.52 + s * 0.22
        );
        ctx.stroke();
      }
    }
    palm(r.x + r.w * (0.12 + rnd() * 0.1), base, Math.min(r.w, r.h) * (0.5 + rnd() * 0.3));
    palm(r.x + r.w * (0.78 + rnd() * 0.1), base, Math.min(r.w, r.h) * (0.42 + rnd() * 0.25));
  }

  // Draw one photo into a panel with cover-fit, offset and zoom, then grade it.
  function drawPhoto(ctx, r, photo, grade) {
    var img = photo.img;
    if (!img || !img.naturalWidth) return;
    var scale = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight) * (photo.zoom || 1);
    var dw = img.naturalWidth * scale;
    var dh = img.naturalHeight * scale;
    var dx = r.x + (r.w - dw) / 2 + (photo.ox || 0) * r.w * 0.4;
    var dy = r.y + (r.h - dh) / 2 + (photo.oy || 0) * r.h * 0.4;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.filter = gradeFilter(grade);
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
    ctx.restore();
    gradeOverlays(ctx, r, grade);
  }

  // Badge rosette in the hero corner.
  function drawBadge(ctx, x, y, radius, grade) {
    var gold = grade === 'mono' || grade === 'ink' ? '#f0f0f0' : '#ffd76b';
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = Math.max(1.5, radius * 0.06);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#16102a';
    ctx.font = 'bold ' + Math.round(radius * 0.42) + 'px Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EST.', 0, -radius * 0.22);
    ctx.fillText('2026', 0, radius * 0.26);
    ctx.restore();
  }

  // Title, subtitle and tagline across the bottom of the cover.
  function drawLettering(ctx, W, H, state) {
    var bandH = H * 0.22;
    var bandY = H - bandH;
    var g = ctx.createLinearGradient(0, bandY - H * 0.06, 0, H);
    g.addColorStop(0, 'rgba(8,4,20,0)');
    g.addColorStop(0.45, 'rgba(8,4,20,0.72)');
    g.addColorStop(1, 'rgba(8,4,20,0.92)');
    ctx.fillStyle = g;
    ctx.fillRect(0, bandY - H * 0.06, W, bandH + H * 0.06);

    var title = (state.title || 'VICE SUNSET').toUpperCase();
    var titleSize = Math.min(W * 0.115, H * 0.085);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = titleSize + 'px Anton, sans-serif';
    var tg = ctx.createLinearGradient(0, H - bandH * 0.85, 0, H - bandH * 0.15);
    if (state.grade === 'neon') {
      tg.addColorStop(0, '#ff5db1');
      tg.addColorStop(0.5, '#ffffff');
      tg.addColorStop(1, '#00e5ff');
    } else if (state.grade === 'mono' || state.grade === 'ink') {
      tg.addColorStop(0, '#ffffff');
      tg.addColorStop(1, '#c9c9c9');
    } else {
      tg.addColorStop(0, '#ffe9a8');
      tg.addColorStop(0.5, '#ff9d3c');
      tg.addColorStop(1, '#ff4d8d');
    }
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, titleSize * 0.09);
    ctx.strokeStyle = 'rgba(10,4,24,0.85)';
    var titleY = H - bandH * 0.42;
    ctx.strokeText(title, W / 2, titleY);
    ctx.fillStyle = tg;
    ctx.fillText(title, W / 2, titleY);

    var sub = (state.subtitle || 'LEONIDA').toUpperCase();
    var subSize = Math.max(12, Math.round(W * 0.026));
    ctx.font = subSize + 'px Anton, sans-serif';
    ctx.shadowColor = state.grade === 'neon' ? '#ff2e88' : '#ff7a2a';
    ctx.shadowBlur = subSize * 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, W / 2, H - bandH * 0.78);
    ctx.shadowBlur = 0;

    var tag = state.tagline || '';
    if (tag) {
      var tagSize = Math.max(11, Math.round(W * 0.02));
      ctx.font = 'italic ' + tagSize + 'px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(tag, W / 2, H - bandH * 0.1);
    }
  }

  // Film grain + vignette over the whole cover.
  function drawGrainVignette(ctx, W, H, seed) {
    var rnd = mulberry32(seed);
    var n = Math.floor((W * H) / 9000);
    var i;
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#ffffff';
    for (i = 0; i < n; i++) {
      ctx.fillRect(rnd() * W, rnd() * H, 1.4, 1.4);
    }
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#000000';
    for (i = 0; i < n; i++) {
      ctx.fillRect(rnd() * W, rnd() * H, 1.4, 1.4);
    }
    ctx.restore();
    var v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  // Draw the whole cover. state: {layout, grade, title, subtitle, tagline,
  // panels: [{img, ox, oy, zoom} | null] x5 }.
  function drawCover(canvas, state, W, H) {
    var ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;
    ctx.fillStyle = '#0d0818';
    ctx.fillRect(0, 0, W, H);
    var rects = layoutRects(W, H, state.layout || 'hero');
    var i, r;
    for (i = 0; i < 5; i++) {
      var base = rects[i];
      ctx.save();
      r = base;
      if (base.rot) {
        ctx.translate(base.x + base.w / 2, base.y + base.h / 2);
        ctx.rotate((base.rot * Math.PI) / 180);
        ctx.translate(-base.w / 2, -base.h / 2);
        r = { x: 0, y: 0, w: base.w, h: base.h };
      }
      var photo = state.panels && state.panels[i];
      if (photo && photo.img) {
        drawPhoto(ctx, r, photo, state.grade || 'sunset');
      } else {
        paintFallback(ctx, r, state.grade || 'sunset', 1000 + i * 77);
        gradeOverlays(ctx, r, state.grade || 'sunset');
      }
      // Panel frame, drawn inside the same transform; tilted panels get a
      // soft drop shadow so they lift off the poster.
      if (base.rot) {
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = Math.round(Math.min(W, H) * 0.02);
        ctx.shadowOffsetY = Math.round(Math.min(W, H) * 0.008);
      }
      ctx.strokeStyle = 'rgba(8,4,20,0.9)';
      ctx.lineWidth = Math.max(1, Math.min(W, H) * 0.004);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
    drawBadge(ctx, W - Math.min(W, H) * 0.075, Math.min(W, H) * 0.075, Math.min(W, H) * 0.052, state.grade || 'sunset');
    drawLettering(ctx, W, H, state);
    drawGrainVignette(ctx, W, H, 4242);
  }

  window.CoverArt = {
    LAYOUTS: LAYOUTS,
    GRADES: GRADES,
    SIZES: SIZES,
    layoutRects: layoutRects,
    drawCover: drawCover,
    paintFallback: paintFallback,
  };
})();
