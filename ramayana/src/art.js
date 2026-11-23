'use strict';
// Illustrations, all vector/procedural, in one language: ink-dark silhouettes with gold-leaf line work and gold-leaf accents.
// Faceless and symbolic: a seated sage silhouette, a veena with a halo, a bow and arrow, a golden Ayodhya skyline.
// Each picture is a set of cached layers (for parallax); light and water are drawn live.

const DARK = ['#0c0a17', '#110e22', '#17132d', '#1d1838'];
// layer = dark fill + goldified line work, over a canvas with parallax margin
const PX = 120, PY = 70;                      // parallax margin around the 1920x1080 picture
function layer(fill, line, o = {}) {
  const w = W + 2 * PX, h = H + 2 * PY;
  const c = mk(w, h, g => { g.translate(PX, PY); fill && fill(g); });
  if (line) { const l = mk(w, h, g => { g.translate(PX, PY); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round'; line(g); });
    goldify(l, { texScale: .45, depth: o.depth ?? 1.2 }); c.g.setTransform(S, 0, 0, S, 0, 0); c.g.drawImage(l, 0, 0, w, h); c.line = l; }
  return c;
}
function drawLayer(g, L, dx = 0, dy = 0, a = 1) { if (a <= 0) return; g.save(); g.globalAlpha *= a; g.drawImage(L, -PX + dx, -PY + dy, L.lw, L.lh); g.restore(); }
function ridge(R, x0, x1, y, amp, step = 30, f = 1) { const pts = []; for (let x = x0; x <= x1; x += step) pts.push([x, y - amp * fbm(x / 400 * f + R, R * 3, 4)]); return pts; }
function polyFill(g, pts, yb, col) { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0][0], yb); pts.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(pts[pts.length - 1][0], yb); g.closePath(); g.fill(); }
function polyLine(g, pts, lw) { g.lineWidth = lw; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }

// ------------------------------------------------------------------ the ashram
const ART = {};
function makeAshram() {
  const A = {};
  A.sky = layer(g => {
    const gr = g.createLinearGradient(0, -PY, 0, 760); gr.addColorStop(0, '#0d0b1a'); gr.addColorStop(.7, '#1a1636'); gr.addColorStop(1, '#2a2040'); g.fillStyle = gr; g.fillRect(-PX, -PY, W + 2 * PX, H + 2 * PY);
    const mg = g.createRadialGradient(1440, 250, 0, 1440, 250, 360); mg.addColorStop(0, 'rgba(234,217,176,.35)'); mg.addColorStop(.25, 'rgba(234,217,176,.08)'); mg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = mg; g.fillRect(1000, -100, 900, 800);
    g.fillStyle = '#e9dcb6'; g.beginPath(); g.arc(1440, 250, 62, 0, TAU); g.fill();
    g.fillStyle = 'rgba(120,100,70,.10)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(1410 + h2(i, 1) * 60, 225 + h2(i, 2) * 50, 5 + h2(i, 3) * 9, 0, TAU); g.fill(); }
  }, g => { const R = mulberry(5); for (let i = 0; i < 60; i++) { const x = R() * W, y = R() * 520; if (Math.hypot(x - 1440, y - 250) < 140) continue; g.beginPath(); g.arc(x, y, .8 + R() * 1.6, 0, TAU); g.fill(); } }, { depth: 0 });
  const far = ridge(1.3, -PX, W + PX, 640, 220, 24, 1.2), near = ridge(4.1, -PX, W + PX, 720, 160, 24, .9);
  A.hills = layer(g => { polyFill(g, far, H + PY, DARK[3]); polyFill(g, near, H + PY, DARK[2]); },
    g => { g.globalAlpha = .75; polyLine(g, far, 1.6); g.globalAlpha = 1; polyLine(g, near, 2); });
  // trees: a banyan on the left, palms on the right
  const canopy = [[300, 430, 150], [440, 380, 170], [590, 440, 140], [200, 520, 120], [520, 520, 150], [360, 560, 130], [690, 540, 100]];
  A.trees = layer(g => {
    g.fillStyle = DARK[0];
    g.beginPath(); g.moveTo(370, 880); g.bezierCurveTo(390, 700, 400, 640, 380, 520); g.lineTo(480, 520); g.bezierCurveTo(460, 640, 470, 720, 520, 880); g.fill();
    for (const [x, y, r] of canopy) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    for (let i = 0; i < 6; i++) { g.fillRect(250 + i * 70, 560, 3, 300 + h2(i, 4) * 40); }                    // aerial roots
    for (const [bx, h, lean] of [[1640, 520, .12], [1760, 600, -.08], [1850, 460, .2]]) {
      g.lineWidth = 16; g.strokeStyle = DARK[0]; g.beginPath(); g.moveTo(bx, 900); g.quadraticCurveTo(bx + lean * h * .3, 900 - h * .5, bx + lean * h, 900 - h); g.stroke();
      const tx = bx + lean * h, ty = 900 - h; g.fillStyle = DARK[0];
      for (let k = 0; k < 9; k++) { const a = -Math.PI + k / 8 * Math.PI, L = 150; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * L * .6, ty + Math.sin(a) * L * .6 - 40, tx + Math.cos(a) * L, ty + Math.sin(a) * L * .4 + 50); g.quadraticCurveTo(tx + Math.cos(a) * L * .5, ty + Math.sin(a) * L * .5 - 10, tx, ty + 6); g.fill(); }
    }
  }, g => {
    for (const [x, y, r] of canopy) { g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.globalAlpha = .7; for (const [x, y, r] of canopy) for (let k = 0; k < 7; k++) { const a = Math.PI * (1.1 + k * .12), rr = r * .78; g.beginPath(); g.ellipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 12, 5, a + 1.2, 0, TAU); g.fill(); }
    g.globalAlpha = 1; g.lineWidth = 1.6; g.beginPath(); g.moveTo(480, 520); g.bezierCurveTo(460, 640, 470, 720, 520, 880); g.stroke();
    for (const [bx, h, lean] of [[1640, 520, .12], [1760, 600, -.08], [1850, 460, .2]]) { const tx = bx + lean * h, ty = 900 - h;
      for (let k = 0; k < 9; k++) { const a = -Math.PI + k / 8 * Math.PI, L = 150; g.lineWidth = 1.6; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * L * .6, ty + Math.sin(a) * L * .6 - 40, tx + Math.cos(a) * L, ty + Math.sin(a) * L * .4 + 50); g.stroke(); } }
  });
  // ground, hut, sage
  A.ground = layer(g => {
    const gr = g.createLinearGradient(0, 760, 0, 900); gr.addColorStop(0, '#15112a'); gr.addColorStop(1, '#0d0b18'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(-PX, 790); g.bezierCurveTo(500, 760, 1300, 770, W + PX, 790); g.lineTo(W + PX, 830); g.lineTo(-PX, 830); g.fill();
    // hut
    g.fillStyle = DARK[1]; g.fillRect(1180, 640, 240, 150); g.fillStyle = DARK[0]; g.beginPath(); g.moveTo(1150, 650); g.lineTo(1300, 540); g.lineTo(1450, 650); g.closePath(); g.fill();
    const dg = g.createLinearGradient(0, 690, 0, 790); dg.addColorStop(0, 'rgba(255,170,70,.75)'); dg.addColorStop(1, 'rgba(160,80,20,.5)'); g.fillStyle = dg; g.fillRect(1272, 690, 56, 100);
    // sage, seated in meditation, seen as a silhouette in profile-less frontal pose
    g.fillStyle = '#07060e'; const sx = 860, sy = 800;
    g.beginPath(); g.ellipse(sx, sy - 6, 120, 30, 0, 0, TAU); g.fill();                                   // crossed legs
    g.beginPath(); g.moveTo(sx - 70, sy - 20); g.bezierCurveTo(sx - 78, sy - 90, sx - 60, sy - 150, sx - 30, sy - 168); g.lineTo(sx + 30, sy - 168);
    g.bezierCurveTo(sx + 60, sy - 150, sx + 78, sy - 90, sx + 70, sy - 20); g.closePath(); g.fill();       // torso, shawl
    g.beginPath(); g.ellipse(sx, sy - 205, 30, 36, 0, 0, TAU); g.fill();                                   // head
    g.beginPath(); g.ellipse(sx, sy - 250, 18, 22, 0, 0, TAU); g.fill();                                   // jata (hair knot)
    g.beginPath(); g.moveTo(sx - 18, sy - 178); g.quadraticCurveTo(sx, sy - 120, sx + 18, sy - 178); g.fill();   // beard silhouette
    g.beginPath(); g.ellipse(sx, sy - 40, 60, 16, 0, 0, TAU); g.fill();                                     // hands in lap
    g.fillStyle = '#100d1e'; g.beginPath(); g.ellipse(sx, sy + 18, 170, 22, 0, 0, TAU); g.fill();            // mat
  }, g => {
    g.lineWidth = 2; g.beginPath(); g.moveTo(1150, 650); g.lineTo(1300, 540); g.lineTo(1450, 650); g.stroke();
    g.lineWidth = 1.2; for (let i = 1; i < 9; i++) { g.beginPath(); g.moveTo(1300, 545); g.lineTo(1150 + i * 300 / 9, 650); g.stroke(); }
    g.lineWidth = 1.6; g.strokeRect(1180, 650, 240, 140); g.strokeRect(1272, 690, 56, 100);
    const sx = 860, sy = 800;
    // halo ring and a rim light along the sage's outline (light from the fire on the right)
    g.globalAlpha = .9; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy - 215, 64, 0, TAU); g.stroke(); g.lineWidth = 1; g.beginPath(); g.arc(sx, sy - 215, 74, 0, TAU); g.stroke();
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; g.beginPath(); g.arc(sx + Math.cos(a) * 69, sy - 215 + Math.sin(a) * 69, 1.6, 0, TAU); g.fill(); }
    g.globalAlpha = 1; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(sx + 30, sy - 168); g.bezierCurveTo(sx + 60, sy - 150, sx + 78, sy - 90, sx + 70, sy - 20); g.stroke();
    g.beginPath(); g.ellipse(sx, sy - 205, 30, 36, 0, -1.3, .9); g.stroke(); g.beginPath(); g.ellipse(sx, sy - 250, 18, 22, 0, -1.2, .8); g.stroke();
    g.beginPath(); g.ellipse(sx, sy - 6, 120, 30, 0, -.7, .9); g.stroke();
    g.lineWidth = 1.4; g.beginPath(); g.ellipse(sx, sy + 18, 170, 22, 0, 0, TAU); g.stroke();
    // a small fire altar beside him
    g.lineWidth = 2; g.strokeRect(1010, 770, 70, 30); g.beginPath(); g.moveTo(1000, 770); g.lineTo(1090, 770); g.stroke();
  });
  // river bank and foreground reeds, lotus
  A.fg = layer(g => {
    g.fillStyle = '#08070f'; g.beginPath(); g.moveTo(-PX, 1000); g.bezierCurveTo(300, 960, 700, 990, 1000, 1010); g.bezierCurveTo(1400, 1030, 1700, 980, W + PX, 1000); g.lineTo(W + PX, H + PY); g.lineTo(-PX, H + PY); g.fill();
    const R = mulberry(17); g.strokeStyle = '#08070f'; g.lineWidth = 4;
    for (let i = 0; i < 70; i++) { const x = R() * (W + 200) - 100, h = 40 + R() * 90, b = 1000 + R() * 30; g.beginPath(); g.moveTo(x, b); g.quadraticCurveTo(x + (R() - .5) * 30, b - h * .6, x + (R() - .5) * 50, b - h); g.stroke(); }
  }, g => {
    const R = mulberry(17); g.lineWidth = 1.2; g.globalAlpha = .55;
    for (let i = 0; i < 70; i++) { const x = R() * (W + 200) - 100, h = 40 + R() * 90, b = 1000 + R() * 30, c1 = (R() - .5) * 30, c2 = (R() - .5) * 50; if (i % 3) continue; g.beginPath(); g.moveTo(x, b); g.quadraticCurveTo(x + c1, b - h * .6, x + c2, b - h); g.stroke(); }
    g.globalAlpha = 1;
    for (const [x, y, r] of [[640, 905, 26], [1120, 925, 20], [1500, 900, 24]]) { const q = new Path2D(); lotusPath(q, x, y, r, 7); g.fill(q); g.lineWidth = 1.4; g.beginPath(); g.ellipse(x, y + 4, r * 1.6, r * .25, 0, 0, TAU); g.stroke(); }
  });
  return A;
}
// water: dark band with moving gold glints
function river(g, t, y0 = 830, y1 = 1000, k = 1) {
  const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#1c1735'); gr.addColorStop(1, '#0e0c1d'); g.fillStyle = gr; g.fillRect(-PX, y0, W + 2 * PX, y1 - y0);
  g.save(); g.globalCompositeOperation = 'lighter'; const R = mulberry(23);
  for (let i = 0; i < 70; i++) { const y = lerp(y0 + 8, y1 - 10, R()), len = 30 + R() * 120 * (1 - (y - y0) / (y1 - y0) * .3), x = ((R() * W + t * (6 + R() * 10)) % (W + 200)) - 100;
    const a = (.15 + .35 * (.5 + .5 * Math.sin(t * (1 + R()) + i))) * k; g.strokeStyle = `rgba(243,217,139,${a})`; g.lineWidth = 1 + R() * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke(); }
  g.restore();
}

// ------------------------------------------------------------------ the veena with a halo (Narada, shown only by his instrument)
function makeVeena() {
  const c = mk(1300, 1000), line = mk(1300, 1000), fill = c.g, g = line.g;
  // halo behind, centred on the upper gourd
  const hx = 650, hy = 470;
  fill.fillStyle = DARK[0];
  fill.translate(650, 500); fill.rotate(-.62); fill.translate(-650, -500);
  g.translate(650, 500); g.rotate(-.62); g.translate(-650, -500);
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  // neck (dandi) from x 170 to 1130 at y 500
  fill.beginPath(); fill.roundRect(170, 476, 960, 48, 14); fill.fill(); g.lineWidth = 2.4; g.beginPath(); g.roundRect(170, 476, 960, 48, 14); g.stroke();
  // big resonator (kudam) at left, small gourd near right
  fill.beginPath(); fill.arc(200, 500, 150, 0, TAU); fill.fill();
  g.lineWidth = 3; g.beginPath(); g.arc(200, 500, 150, 0, TAU); g.stroke(); g.lineWidth = 1.6; g.beginPath(); g.arc(200, 500, 128, 0, TAU); g.stroke();
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; const q = new Path2D(); lotusPath(q, 200 + Math.cos(a) * 92, 500 + Math.sin(a) * 92, 18, 5); g.save(); g.translate(200 + Math.cos(a) * 92, 500 + Math.sin(a) * 92); g.rotate(a + Math.PI / 2); g.translate(-(200 + Math.cos(a) * 92), -(500 + Math.sin(a) * 92)); g.fill(q); g.restore(); }
  g.beginPath(); g.arc(200, 500, 30, 0, TAU); g.fill();
  fill.beginPath(); fill.arc(980, 590, 78, 0, TAU); fill.fill(); g.lineWidth = 2.4; g.beginPath(); g.arc(980, 590, 78, 0, TAU); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.moveTo(980, 524); g.lineTo(980, 512); g.stroke();
  // frets
  g.lineWidth = 1.6; for (let i = 0; i < 24; i++) { const x = 380 + i * 30 * (1 - i * .012); g.beginPath(); g.moveTo(x, 470); g.lineTo(x, 482); g.stroke(); }
  // yali head scroll at the right end
  g.lineWidth = 3; g.beginPath(); g.moveTo(1130, 500); g.bezierCurveTo(1190, 470, 1230, 430, 1200, 395); g.bezierCurveTo(1180, 372, 1150, 390, 1160, 412); g.bezierCurveTo(1168, 430, 1190, 420, 1186, 408); g.stroke();
  fill.beginPath(); fill.moveTo(1130, 476); fill.bezierCurveTo(1190, 460, 1235, 430, 1200, 390); fill.lineTo(1160, 410); fill.bezierCurveTo(1170, 440, 1150, 470, 1120, 524); fill.fill();
  // bridge and strings
  g.lineWidth = 4; g.beginPath(); g.moveTo(250, 470); g.lineTo(250, 530); g.stroke();
  goldify(line, { texScale: .45, depth: 1.6 });
  const strings = mk(1300, 1000, q => { q.translate(650, 500); q.rotate(-.62); q.translate(-650, -500); q.strokeStyle = 'rgba(234,217,176,.85)'; q.lineWidth = 1.1;
    for (let s = 0; s < 4; s++) { q.beginPath(); q.moveTo(250, 482 + s * 12); q.lineTo(1140, 486 + s * 9); q.stroke(); } });
  c.g.setTransform(S, 0, 0, S, 0, 0); c.g.drawImage(line, 0, 0, 1300, 1000); c.g.drawImage(strings, 0, 0, 1300, 1000);
  return c;
}
function halo(g, x, y, r, t, k = 1) {   // concentric gold rings with slow-turning rays
  if (k <= 0) return; g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, r * 1.5); gr.addColorStop(0, `rgba(243,217,139,${.28 * k})`); gr.addColorStop(.5, `rgba(212,166,58,${.1 * k})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
  g.translate(x, y); g.rotate(t * .03);
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, l = i % 2 ? r * .85 : r * 1.12; g.strokeStyle = `rgba(243,217,139,${(i % 2 ? .12 : .22) * k})`; g.lineWidth = i % 2 ? 1 : 2; g.beginPath(); g.moveTo(Math.cos(a) * r * .55, Math.sin(a) * r * .55); g.lineTo(Math.cos(a) * l, Math.sin(a) * l); g.stroke(); }
  for (const [rr, w, a] of [[r * .5, 3, .55], [r * .54, 1, .4], [r * 1.15, 1.5, .3]]) { g.strokeStyle = `rgba(243,217,139,${a * k})`; g.lineWidth = w; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); }
  g.restore();
}
function makeClouds() {   // stylised gold-line cloud scrolls (heavenly setting for Narada)
  return layer(null, g => {
    const cl = (x, y, s) => { g.save(); g.translate(x, y); g.scale(s, s); g.lineWidth = 2 / s;
      g.beginPath(); g.moveTo(-160, 0); g.bezierCurveTo(-150, -50, -90, -60, -70, -30); g.bezierCurveTo(-60, -80, 20, -90, 30, -36); g.bezierCurveTo(60, -70, 140, -60, 140, -10); g.bezierCurveTo(170, -10, 180, 10, 160, 18); g.lineTo(-170, 18); g.stroke();
      g.beginPath(); g.moveTo(-70, -30); g.bezierCurveTo(-60, -10, -30, -10, -30, -28); g.moveTo(30, -36); g.bezierCurveTo(40, -16, 70, -16, 72, -34); g.stroke(); g.restore(); };
    g.globalAlpha = .7; cl(300, 260, 1.1); cl(1650, 220, .9); cl(220, 840, 1); cl(1700, 860, 1.2); cl(1000, 160, .7);
  }, { depth: 0 });
}

// ------------------------------------------------------------------ bow and arrow emblem (Rama, symbolised)
function makeBow() {
  const c = mk(900, 900, g => { g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.translate(450, 450); g.rotate(-Math.PI / 4);
    // recurve bow (Kodanda)
    g.lineWidth = 16; g.beginPath(); g.moveTo(-40, -380); g.bezierCurveTo(-10, -330, -190, -200, -190, 0); g.bezierCurveTo(-190, 200, -10, 330, -40, 380); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(-40, -380); g.quadraticCurveTo(-70, -400, -80, -372); g.moveTo(-40, 380); g.quadraticCurveTo(-70, 400, -80, 372); g.stroke();
    g.beginPath(); g.ellipse(-190, 0, 22, 44, 0, 0, TAU); g.fill();                          // grip
    for (const y of [-120, 120]) { g.beginPath(); g.arc(-183, y, 8, 0, TAU); g.fill(); }
    g.lineWidth = 2.4; g.beginPath(); g.moveTo(-42, -376); g.lineTo(-42, 376); g.stroke();      // string
    // arrow
    g.lineWidth = 5; g.beginPath(); g.moveTo(-42, 0); g.lineTo(380, 0); g.stroke();
    g.beginPath(); g.moveTo(420, 0); g.lineTo(368, -24); g.lineTo(380, 0); g.lineTo(368, 24); g.closePath(); g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-30, 0); g.quadraticCurveTo(-10, 30 * s, 40, 34 * s); g.lineTo(20, 0); g.fill(); g.beginPath(); g.moveTo(10, 0); g.quadraticCurveTo(30, 30 * s, 80, 34 * s); g.lineTo(60, 0); g.fill(); }
  });
  return goldify(c, { texScale: .4, depth: 2.4 });
}

// ------------------------------------------------------------------ Ayodhya skyline
function makeAyodhya() {
  const A = {};
  A.sky = layer(g => { const gr = g.createLinearGradient(0, -PY, 0, 820); gr.addColorStop(0, '#0d0b1a'); gr.addColorStop(.55, '#1d1638'); gr.addColorStop(.85, '#4a2a2a'); gr.addColorStop(1, '#7a4a28'); g.fillStyle = gr; g.fillRect(-PX, -PY, W + 2 * PX, H + 2 * PY); },
    g => { const R = mulberry(8); for (let i = 0; i < 50; i++) { g.beginPath(); g.arc(R() * W, R() * 380, .8 + R() * 1.4, 0, TAU); g.fill(); } }, { depth: 0 });
  // far palaces and temple spires
  const far = [], near = [], wins = [];
  const shikhara = (g, x, b, w, h) => { g.beginPath(); g.moveTo(x - w / 2, b); g.bezierCurveTo(x - w / 2, b - h * .5, x - w * .25, b - h * .9, x, b - h); g.bezierCurveTo(x + w * .25, b - h * .9, x + w / 2, b - h * .5, x + w / 2, b); g.closePath(); };
  const dome = (g, x, b, w, h) => { g.beginPath(); g.moveTo(x - w / 2, b); g.bezierCurveTo(x - w * .62, b - h * .55, x - w * .1, b - h * .7, x, b - h); g.bezierCurveTo(x + w * .1, b - h * .7, x + w * .62, b - h * .55, x + w / 2, b); g.closePath(); };
  const R = mulberry(31), items = [];
  for (let x = -60; x < W + 80; x += 90 + R() * 70) { const kind = R() < .45 ? 's' : 'd', h = kind === 's' ? 160 + R() * 180 : 90 + R() * 80, w = kind === 's' ? 70 + R() * 50 : 80 + R() * 60; items.push([kind, x, 640 - R() * 40, w, h]); }
  A.far = layer(g => { g.fillStyle = DARK[2];
    for (const [k, x, b, w, h] of items) { g.fillRect(x - w * .6, b, w * 1.2, 760 - b); (k === 's' ? shikhara : dome)(g, x, b, w, h); g.fill(); }
    g.fillRect(-PX, 700, W + 2 * PX, 200);
  }, g => { for (const [k, x, b, w, h] of items) { g.lineWidth = 1.6; g.globalAlpha = .8; (k === 's' ? shikhara : dome)(g, x, b, w, h); g.stroke();
      g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, b - h); g.lineTo(x, b - h - 34); g.stroke(); g.beginPath(); g.moveTo(x, b - h - 34); g.lineTo(x + 22, b - h - 28); g.lineTo(x, b - h - 22); g.fill(); g.globalAlpha = 1;
      if (k === 's') for (let j = 1; j < 5; j++) { g.beginPath(); g.moveTo(x - w * .5 * (1 - j * .16), b - h * j * .18); g.lineTo(x + w * .5 * (1 - j * .16), b - h * j * .18); g.stroke(); } } });
  // the royal palace at centre and the city wall with gateways
  A.near = layer(g => { g.fillStyle = DARK[1];
    g.fillRect(760, 520, 400, 330); dome(g, 960, 520, 260, 200); g.fill(); for (const x of [800, 1120]) { g.fillRect(x - 30, 470, 60, 380); dome(g, x, 470, 80, 90); g.fill(); }
    g.fillStyle = DARK[0]; g.fillRect(-PX, 760, W + 2 * PX, 140);
    for (let x = -PX; x < W + PX; x += 46) g.fillRect(x, 740, 26, 22);                                   // battlements
  }, g => { g.lineWidth = 2.4; dome(g, 960, 520, 260, 200); g.stroke(); g.strokeRect(760, 520, 400, 330); for (const x of [800, 1120]) { dome(g, x, 470, 80, 90); g.stroke(); g.strokeRect(x - 30, 470, 60, 380); }
    g.lineWidth = 2; g.beginPath(); g.moveTo(960, 320); g.lineTo(960, 270); g.stroke(); g.beginPath(); g.moveTo(960, 270); g.lineTo(1000, 282); g.lineTo(960, 294); g.fill();
    const k = new Path2D(); lotusPath(k, 960, 330, 28, 5); g.fill(k);
    for (let i = 0; i < 5; i++) { const x = 800 + i * 80; g.beginPath(); g.moveTo(x - 24, 850); g.lineTo(x - 24, 640); g.arc(x, 640, 24, Math.PI, 0); g.lineTo(x + 24, 850); g.stroke(); }
    g.lineWidth = 2; g.beginPath(); g.moveTo(-PX, 762); g.lineTo(W + PX, 762); g.stroke(); g.lineWidth = 1.2; g.beginPath(); g.moveTo(-PX, 790); g.lineTo(W + PX, 790); g.stroke();
    for (const gx of [260, 1660]) { g.lineWidth = 2.4; g.beginPath(); g.moveTo(gx - 60, 900); g.lineTo(gx - 60, 700); g.bezierCurveTo(gx - 60, 640, gx + 60, 640, gx + 60, 700); g.lineTo(gx + 60, 900); g.stroke(); dome(g, gx, 640, 90, 70); g.stroke(); } });
  // window and wall lights (diyas) positions, lit live
  for (let i = 0; i < 5; i++) wins.push([800 + i * 80, 700, 1]);
  for (let x = -40; x < W + 40; x += 46) wins.push([x + 13, 734, 0]);
  A.lights = wins;
  return A;
}
function cityLights(g, A, t, k, flickerOut = 0) {
  g.save(); g.globalCompositeOperation = 'lighter';
  A.lights.forEach(([x, y, big], i) => { const f = flick(t * (1.2 + h2(i, 9)), i), off = flickerOut > h2(i, 33) ? 0 : 1; const a = k * f * off; if (a <= 0) return;
    const r = big ? 34 : 14, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,220,140,${.9 * a})`); gr.addColorStop(.3, `rgba(255,160,60,${.45 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); });
  g.restore();
}

// ------------------------------------------------------------------ the sixteen-petal lotus
function makePetal() { // one petal, base at (0,0), pointing up, length 300
  const c = mk(160, 330, g => { g.translate(80, 320); g.fillStyle = '#fff'; const p = new Path2D(); p.moveTo(0, 0); p.bezierCurveTo(-78, -90, -60, -230, 0, -312); p.bezierCurveTo(60, -230, 78, -90, 0, 0); g.fill(p);
    g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, -20); g.lineTo(0, -280); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, -30); g.bezierCurveTo(s * 40, -100, s * 34, -200, 0, -270); g.stroke(); } });
  return goldify(c, { texScale: .4, depth: 2 });
}
