'use strict';
// Painting kit for this film, on top of the Gilded Illumination drawing kit (lib.js, Lemo-Opuscar, MIT):
// pigment shapes (fill → inner rim → ink → white lead), gold-leaf text, vellum scrolls, plaques, quatrefoils, the sky,
// stepped spires, scalloped clouds, the diya; cached static layers (picture + gold mask); the light pass on gold.

// ---------------------------------------------------------------- one tempo for every motion in the film
const PACE = {
  ZOOM: .003,     // camera push: log-zoom per second, the same in every shot
  DRIFT: 0,       // camera drift: px per second, the same in every shot
  PEN: 520,       // pen wipe for all writing: px per second
  BUILD: 1.0,     // paint and gold build-up: seconds for every element
  WIPE: 1.6,      // the cloud wipe between scenes: seconds, constant speed
  RAKE_P: 9,      // a band of light crosses the picture every 9 s …
  RAKE_D: 3.2,    // … taking 3.2 s, at constant speed
  SCROLL: .5,     // the subtitle scroll opens and closes in 0.5 s
};

// ---------------------------------------------------------------- pigment shapes
function paint(g, path, fill, rim, rimW, lw = 2.4) { g.fillStyle = fill; g.fill(path); if (rim) rimShade(g, path, rim, rimW || 10); if (lw) ink(g, path, lw); maskErase(g, path); }
let PAINTC = null;
function makePaint() {   // ground ultramarine: granular, deep, matte
  const s = 512, c = cnv(s, s), g = c.getContext('2d'); g.drawImage(GRAINC, 0, 0);
  const im = g.getImageData(0, 0, s, s), d = im.data, A = [16, 24, 84], B = [46, 66, 156];
  for (let i = 0; i < d.length; i += 4) { const v = d[i] / 255, u = clamp(v * 1.15 - .1); d[i] = lerp(A[0], B[0], u); d[i + 1] = lerp(A[1], B[1], u); d[i + 2] = lerp(A[2], B[2], u); }
  g.putImageData(im, 0, 0); return c;
}
function ultra(g, path) { if (!g.__paint) { g.__paint = g.createPattern(PAINTC, 'repeat'); g.__paint.setTransform(new DOMMatrix().scale(1.1)); } g.fillStyle = g.__paint; g.fill(path); maskErase(g, path); }

// ---------------------------------------------------------------- sky: ultramarine ground, gold stars, scalloped clouds
function starField(seed, n, box, avoid = []) {
  const R = mulberry(seed), out = []; let k = 0;
  while (out.length < n && k++ < 4000) { const x = box[0] + R() * box[2], y = box[1] + R() * box[3];
    if (avoid.some(a => x > a[0] && x < a[0] + a[2] && y > a[1] && y < a[1] + a[3])) continue;
    if (out.some(s => Math.hypot(s.x - x, s.y - y) < 95)) continue; out.push({ x, y, r: 10 + R() * 9, rot: R() }); }
  return out;
}
function drawSky(g, stars) {
  ultra(g, P2(q => q.rect(-400, -300, W + 800, H + 600)));
  for (const s of stars) { const p = P2(q => star8(q, s.x, s.y, s.r, .42, s.rot)); leaf(g, p, [s.x - s.r, s.y - s.r, s.r * 2, s.r * 2], { lw: 1.4, rimW: 2 }); gpush(s.x, s.y, s.r * 2.2, .7); }
}
function cloudPath(x, y, w, h, n = 5) {   // a scalloped cloud: a row of arcs on a flat base
  return P2(q => { q.moveTo(x - w / 2, y); const r = w / n / 2;
    for (let i = 0; i < n; i++) { const cx = x - w / 2 + r + i * 2 * r, rr = r * (i % 2 ? .9 : 1.15); q.arc(cx, y - h * .1, rr, Math.PI, 0); }
    q.lineTo(x + w / 2, y + h * .35); q.quadraticCurveTo(x, y + h * .55, x - w / 2, y + h * .35); q.closePath(); });
}
function drawCloud(g, x, y, w, h, n = 5) {
  const p = cloudPath(x, y, w, h, n); paint(g, p, AZUR_L, AZUR, 10, 2.2);
  const r = w / n / 2; for (let i = 0; i < n; i++) hiLine(g, [[x - w / 2 + r * .5 + i * 2 * r, y - h * .1 - r * .55], [x - w / 2 + r + i * 2 * r, y - h * .1 - r * .85]], 2.2, .8);
  for (let i = 0; i < n - 1; i++) triad(g, x - w / 2 + 2 * r * (i + 1), y + h * .12, 2.2, .85);
}

// ---------------------------------------------------------------- stepped, leaning spires in clusters (mountains)
function spireRange(seed, x0, x1, base, hMin, hMax, cols) {
  const R = mulberry(seed), out = []; let x = x0;
  while (x < x1) { const h = lerp(hMin * .7, hMax, R() * R() * .6 + R() * .4), w = h * (.32 + R() * .14), lean = (R() - .5) * .18;
    out.push({ pts: spirePts(x, base, w, h, lean, R), col: cols[(R() * cols.length) | 0] });
    const sat = R() < .7; if (sat) { const h2_ = h * (.45 + R() * .25), w2 = h2_ * .38; out.push({ pts: spirePts(x + (R() < .5 ? -1 : 1) * w * .55, base, w2, h2_, lean * 1.6 + (R() - .5) * .2, R), col: cols[(R() * cols.length) | 0] }); }
    x += R() < .45 ? w * (.5 + R() * .4) : w * (1.3 + R() * 1.6); }
  return out;
}
function drawSpires(g, list) {
  for (const s of list) { const p = polyPath(s.pts, true); const [b, d] = s.col; paint(g, p, b, d, 14, 2.4);
    const R = mulberry((s.pts[0][0] * 7) | 0); for (let k = 0; k < 3; k++) { const i = 1 + ((R() * (s.pts.length / 2 - 2)) | 0), q = s.pts[i]; triad(g, q[0] + 10, q[1] + 8, 2, .75); }
    hiLine(g, s.pts.slice(0, Math.ceil(s.pts.length / 2)).map(q => [q[0] + 5, q[1]]), 1.6, .45); }
}

// ---------------------------------------------------------------- gold-leaf and ink writing
const FONTS = { tiro: 'Tiro', noto: 'NotoDeva', cinzel: 'Cinzel', uncial: 'Uncial' };
const font = (fam, size, wt = 400) => `${wt} ${size}px ${FONTS[fam] || fam}`;
const MEAS = document.createElement('canvas').getContext('2d');
function tw(text, fam, size, wt) { MEAS.font = font(fam, size, wt); return MEAS.measureText(text).width; }
function fitSize(lines, fam, size, maxW, min = 28) { while (size > min && Math.max(...lines.map(l => tw(l, fam, size))) > maxW) size -= 2; return size; }
function wrapWords(text, fam, size, maxW) { const ws = text.split(' '), out = []; let cur = '';
  for (const w of ws) { const t = cur ? cur + ' ' + w : w; if (cur && tw(t, fam, size) > maxW) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }
const isKey = w => /^[“"'(]*राम/.test(w) && !/रामायण/.test(w);
// gold text: raised leaf letters (cast shadow, leaf pattern, burnish, ink edge), written into the gold mask so the light finds them.
// wipe 0..1 is the pen front (left → right). keys: words that begin with राम are vermilion pigment instead of leaf.
function goldText(g, text, cx, by, size, o = {}) {
  const fam = o.fam || 'tiro', f = font(fam, size, o.wt), w = tw(text, fam, size, o.wt), x0 = cx - w / 2, wipe = o.wipe ?? 1;
  if (wipe <= 0) return; g.save();
  if (wipe < 1) { g.beginPath(); g.rect(x0 - size, by - size * 1.6, (w + size * 2) * wipe, size * 2.6); g.clip(); }
  g.font = f; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(8,6,30,.55)'; g.fillText(text, x0 + size * .03, by + size * .045);                  // raised gold: small cast shadow
  if (o.bright ?? size < 44) {   // small lettering: a bright burnished gold that reads at any light level
    const gb = g.createLinearGradient(0, by - size, 0, by + size * .25); gb.addColorStop(0, '#fbe7a6'); gb.addColorStop(.5, '#e9c463'); gb.addColorStop(1, '#c08a2c'); g.fillStyle = gb; g.fillText(text, x0, by);
  } else {
    goldPat(g); g.fillStyle = g.__gp; g.fillText(text, x0, by);
    const gr = g.createLinearGradient(0, by - size, 0, by + size * .3); gr.addColorStop(0, 'rgba(255,240,180,.28)'); gr.addColorStop(.55, 'rgba(90,50,0,0)'); gr.addColorStop(1, 'rgba(70,38,0,.35)');
    g.fillStyle = gr; g.fillText(text, x0, by); }
  if (!(o.bright ?? size < 44)) { g.lineWidth = Math.max(1.1, size * .018) * LWK; g.strokeStyle = 'rgba(42,26,16,.85)'; g.lineJoin = 'round'; g.strokeText(text, x0, by); }
  if (MK) { MK.g.save(); MK.g.setTransform(MK.pre.multiply(g.getTransform())); if (wipe < 1) { MK.g.beginPath(); MK.g.rect(x0 - size, by - size * 1.6, (w + size * 2) * wipe, size * 2.6); MK.g.clip(); }
    MK.g.font = f; MK.g.textAlign = 'left'; MK.g.fillStyle = MK.col || '#fff'; MK.g.fillText(text, x0, by); MK.g.restore(); }
  if (o.keys) { const words = text.split(' '); let pre = '';
    for (const wd of words) { if (isKey(wd)) { const kx = x0 + tw(pre, fam, size, o.wt);
        g.fillStyle = VERM; g.fillText(wd, kx, by); g.lineWidth = Math.max(1.4, size * .03) * LWK; g.strokeStyle = 'rgba(42,26,16,.9)'; g.strokeText(wd, kx, by);
        if (MK) { MK.g.save(); MK.g.setTransform(MK.pre.multiply(g.getTransform())); MK.g.globalCompositeOperation = 'destination-out'; MK.g.font = f; MK.g.fillText(wd, kx, by); MK.g.restore(); } }
      pre += wd + ' '; } }
  g.restore();
  if (o.id) reg(o.id, text, g, x0, by - size, x0 + w * wipe, by + size * .35);
}
function inkText(g, text, cx, by, size, o = {}) {   // brown iron-gall ink on vellum, pen-wiped
  const fam = o.fam || 'noto', w = tw(text, fam, size, o.wt), x0 = cx - w / 2, wipe = o.wipe ?? 1; if (wipe <= 0) return;
  g.save(); if (wipe < 1) { g.beginPath(); g.rect(x0 - 10, by - size * 1.6, (w + 20) * wipe, size * 2.6); g.clip(); }
  g.globalAlpha *= o.alpha ?? 1; g.font = font(fam, size, o.wt); g.textAlign = 'left'; g.fillStyle = o.col || '#4a2c16'; g.fillText(text, x0, by); g.restore();
  if (o.id) reg(o.id, text, g, x0, by - size, x0 + w * wipe, by + size * .35);
}
const penWipe = (t, t0, width) => clamp((t - t0) / Math.max(.4, width / PACE.PEN));   // constant pen speed

// ---------------------------------------------------------------- vellum: a banderole with rolled ends, opened from the centre
let VELLP = null;
function vellum(g, path) { g.fillStyle = VELL; g.fill(path); if (!g.__sp) g.__sp = g.createPattern(SPKC, 'repeat'); g.save(); g.clip(path); g.globalAlpha = .5; g.fillStyle = g.__sp; g.fillRect(-500, -500, W + 1000, H + 1000); g.restore();
  rimShade(g, path, '#cdb88c', 12); ink(g, path, 2.2); maskErase(g, path); }
function scroll(g, cx, cy, w, h, open) {
  if (open <= 0) return; const hw = Math.max(18, w / 2 * eio(open)), body = P2(q => { q.moveTo(cx - hw, cy - h / 2); q.bezierCurveTo(cx - hw * .3, cy - h / 2 - 10, cx + hw * .3, cy - h / 2 + 10, cx + hw, cy - h / 2);
    q.lineTo(cx + hw, cy + h / 2); q.bezierCurveTo(cx + hw * .3, cy + h / 2 + 10, cx - hw * .3, cy + h / 2 - 10, cx - hw, cy + h / 2); q.closePath(); });
  vellum(g, body);
  for (const s of [-1, 1]) { const x = cx + s * hw, roll = P2(q => q.roundRect(x - 14, cy - h / 2 - 12, 28, h + 24, 13)); paint(g, roll, '#e3cf9f', '#b89c62', 6, 2.2);
    hiLine(g, [[x - 6, cy - h / 2 - 2], [x - 6, cy + h / 2 + 2]], 2, .7);
    const cap = P2(q => { q.ellipse(x, cy - h / 2 - 14, 10, 6, 0, 0, TAU); q.ellipse(x, cy + h / 2 + 14, 10, 6, 0, 0, TAU); }); leaf(g, cap, [x - 10, cy - h / 2 - 20, 20, h + 40], { lw: 1.6, rimW: 2 }); }
}

// ---------------------------------------------------------------- plaques, frames, roundels
// a gilded plaque: leaf frame, vermilion band with pearls, ultramarine field
function plaque(g, x, y, w, h, k = 1, o = {}) {
  if (k <= 0) return; const cx = x + w / 2, cy = y + h / 2, sx = .2 + .8 * eo(k), W2 = w * sx, X = cx - W2 / 2;
  const pd = o.pad ?? 30, bd = Math.round(pd * .4);
  const outer = P2(q => q.roundRect(X, y, W2, h, o.r ?? 18)), band = P2(q => q.roundRect(X + bd, y + bd, W2 - 2 * bd, h - 2 * bd, Math.max(4, (o.r ?? 18) - bd * .6))), field = P2(q => q.roundRect(X + pd, y + pd, W2 - 2 * pd, h - 2 * pd, Math.max(2, (o.r ?? 18) - pd * .5)));
  leaf(g, outer, [X, y, W2, h], { lw: 2.6, rimW: 6 }); paint(g, band, o.band || VERM, o.bandD || VERM_D, 7, 2.2);
  if (o.field === 'vell') vellum(g, field); else { ultra(g, field); rimShade(g, field, ULTRA_D, 16); ink(g, field, 2.2); }
  const pm = (pd + bd) / 2;
  if (W2 > 120 && pd >= 24) { pearlLine(g, [[X + 22, y + pm], [X + W2 - 22, y + pm]], 22, 2.8, .9); pearlLine(g, [[X + 22, y + h - pm], [X + W2 - 22, y + h - pm]], 22, 2.8, .9); }
  if (pd >= 24) for (const [px, py] of [[X + pm, y + pm], [X + W2 - pm, y + pm], [X + pm, y + h - pm], [X + W2 - pm, y + h - pm]]) { const st = P2(q => star8(q, px, py, 13, .45, 0)); leaf(g, st, [px - 13, py - 13, 26, 26], { lw: 1.2, rimW: 2 }); gpush(px, py, 26, .8); }
  gpush(cx, y + 6, W2 * .5, .8); gpush(cx, y + h - 6, W2 * .5, .8);
}
function quatrefoil(q, cx, cy, r) {   // outer outline only: along each ray, the farthest point of the four lobes
  const a = r * .56, lr = r * .5, C4 = [[0, -a], [a, 0], [0, a], [-a, 0]];
  for (let i = 0; i <= 240; i++) { const th = i / 240 * TAU, ux = Math.cos(th), uy = Math.sin(th); let best = 0;
    for (const [dx, dy] of C4) { const b = ux * dx + uy * dy, c = dx * dx + dy * dy - lr * lr, disc = b * b - c; if (disc >= 0) best = Math.max(best, b + Math.sqrt(disc)); }
    i ? q.lineTo(cx + ux * best, cy + uy * best) : q.moveTo(cx + ux * best, cy + uy * best); }
  q.closePath(); }
// a quatrefoil medallion: gold-ground lobes with punched dots, vermilion rim, contents drawn by fn in its own clip
function medallion(g, cx, cy, r, k, fn) {
  if (k <= 0) return; const rr = r * eo(k);
  const qf = P2(q => quatrefoil(q, cx, cy, rr)), rim = P2(q => quatrefoil(q, cx, cy, rr + 12));
  paint(g, rim, VERM, VERM_D, 6, 2.6);
  leaf(g, qf, [cx - rr * 1.2, cy - rr * 1.2, rr * 2.4, rr * 2.4], { lw: 2.4, rimW: 8 });
  g.save(); g.clip(qf); g.fillStyle = 'rgba(100,54,6,.45)'; for (let y = cy - rr * 1.1; y < cy + rr * 1.1; y += 22) for (let x = cx - rr * 1.1; x < cx + rr * 1.1; x += 22) { g.beginPath(); g.arc(x + ((y - cy) / 22 % 2 ? 11 : 0), y, 1.8, 0, TAU); g.fill(); } g.restore();
  gpush(cx, cy - rr * .6, rr * 1.2, 1);
  if (fn) { const inner = P2(q => quatrefoil(q, cx, cy, rr * .84)); ultra(g, inner); rimShade(g, inner, ULTRA_D, 14); ink(g, inner, 2.2);
    g.save(); g.clip(inner); fn(g, rr); g.restore(); }
}

// ---------------------------------------------------------------- the diya (gold leaf bowl, painted flame)
function flameWob(t, seed = 0) { const f = Math.floor(t * 12 + seed * 3) % 4; return [[0, 0], [1.6, 2.5], [-1.2, -1], [.8, 1.6]][f]; }
function diya(g, x, y, s, t, lit = 1, seed = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const bowl = P2(q => { q.moveTo(-46, -14); q.quadraticCurveTo(-40, 14, 0, 16); q.quadraticCurveTo(40, 14, 56, -18); q.lineTo(40, -14); q.quadraticCurveTo(0, -8, -46, -14); q.closePath(); });
  const foot = P2(q => { q.moveTo(-20, 14); q.lineTo(20, 14); q.lineTo(26, 26); q.lineTo(-26, 26); q.closePath(); });
  leaf(g, foot, [-26, 14, 52, 12], { lw: 2, rimW: 2 }); leaf(g, bowl, [-46, -18, 102, 34], { lw: 2.2, rimW: 4 });
  for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(100,54,6,.6)'; g.beginPath(); g.arc(-28 + i * 13, 2 + Math.sin(i / 4 * Math.PI) * 4, 2, 0, TAU); g.fill(); }
  gpush(0, 0, 70, .9);
  if (lit > 0) { const [wob, hg] = flameWob(t, seed), fx = 46, fy = -18, sc = lit;
    const fl = (w, h, c) => { const p = P2(q => { q.moveTo(fx, fy + 3); q.bezierCurveTo(fx - w, fy, fx - w * .7, fy - h * .5, fx + wob, fy - h - hg); q.bezierCurveTo(fx + w * .7, fy - h * .5, fx + w, fy, fx, fy + 3); }); g.fillStyle = c; g.fill(p); return p; };
    const p1 = fl(11 * sc, 30 * sc, VERM); g.strokeStyle = 'rgba(42,26,16,.7)'; g.lineWidth = 1.3; g.stroke(p1); fl(7 * sc, 20 * sc, OCHRE_L); fl(3.5 * sc, 10 * sc, WHITE); maskErase(g, p1); }
  g.restore();
}
const flameTip = (x, y, s) => [x + 46 * s, y - 40 * s];

// ---------------------------------------------------------------- lotus, manjari
function lotusFlower(g, cx, cy, r, o = {}) {   // rose petals with rim and white lead, a gold seed pod
  const n = o.n || 7;
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * (Math.PI * .95) / (n - 1) + (pass ? 0 : .5 * Math.PI * .95 / (n - 1)), L = r * (pass ? 1 : .8) * (1 - Math.abs(i - (n - 1) / 2) * .06);
    if (!pass && i === n - 1) continue;
    const px = -Math.sin(a), py = Math.cos(a), w = r * .22, tx = cx + Math.cos(a) * L, ty = cy + Math.sin(a) * L;
    const p = P2(q => { q.moveTo(cx, cy); q.quadraticCurveTo(cx + Math.cos(a) * L * .55 + px * w, cy + Math.sin(a) * L * .55 + py * w, tx, ty); q.quadraticCurveTo(cx + Math.cos(a) * L * .55 - px * w, cy + Math.sin(a) * L * .55 - py * w, cx, cy); });
    paint(g, p, pass ? ROSE : ROSE_D, pass ? ROSE_D : '#7a3040', 6, 2); if (pass) hiLine(g, [[cx + Math.cos(a) * L * .3, cy + Math.sin(a) * L * .3], [cx + Math.cos(a) * L * .8, cy + Math.sin(a) * L * .8]], 1.6, .7); }
  const pod = P2(q => q.ellipse(cx, cy - r * .06, r * .2, r * .1, 0, 0, TAU)); leaf(g, pod, [cx - r * .2, cy - r * .16, r * .4, r * .2], { lw: 1.6, rimW: 2 });
}
function manjari(g, x, y, len, ang) {   // tulsi flower spike: verdigris stem, lilac florets in pairs, white-lead dots
  const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
  g.strokeStyle = INK; g.lineWidth = 6 * LWK; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * len, y + dy * len); g.stroke();
  g.strokeStyle = VERD; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * len, y + dy * len); g.stroke();
  for (let i = 1; i <= 7; i++) { const u = i / 8, cx = x + dx * len * u, cy = y + dy * len * u, s = len * .07 * (1 - u * .5);
    for (const sd of [-1, 1]) { const ex = cx + px * s * sd * 1.2, ey = cy + py * s * sd * 1.2, p = P2(q => q.ellipse(ex, ey, s, s * .6, Math.atan2(ey - cy, ex - cx), 0, TAU)); paint(g, p, LILAC, LILAC_D, 3, 1.4); } }
  for (let i = 0; i < 4; i++) triad(g, x + dx * len * (.2 + i * .2), y + dy * len * (.2 + i * .2), 1.6, .8);
}

// ---------------------------------------------------------------- cached static layers (picture + gold mask), drawn under the camera
const CS = 1.25;   // cache resolution: survives the slow push without softening
function cacheLayer(fn, ext = [0, 0, W, H]) {
  const [x, y, w, h] = ext, c = cnv(w * CS, h * CS), m = cnv(w * CS, h * CS), g = c.getContext('2d'), mg = m.getContext('2d');
  const prevMK = MK, prevDim = DIM, prevGP = GP; GP = [];
  g.setTransform(CS, 0, 0, CS, -x * CS, -y * CS); MK = { g: mg, pre: new DOMMatrix(), col: '#fff' }; setZoom(1);
  fn(g); const gp = GP;
  MK = prevMK; DIM = prevDim; GP = prevGP; return { c, m, x, y, w, h, gp };
}
function drawCached(g, L) { g.drawImage(L.c, L.x, L.y, L.w, L.h); if (MK) { MK.g.save(); MK.g.setTransform(MK.pre.multiply(g.getTransform())); MK.g.drawImage(L.m, L.x, L.y, L.w, L.h); MK.g.restore(); } for (const p of L.gp) GP.push(p); }

// ---------------------------------------------------------------- light on gold (glint pass from the style's film.js)
let FR, FRg, MC, MCg, GW, GWg, GWD, GWI;
function resetCtx(g) { if (g.reset) g.reset(); g.__gp = g.__sp = g.__paint = g.__gf = g.__gff = null; }
function lightAt(lights, x, y) {
  let v = 0; for (const L of lights) {
    if (L.type === 'r') { const d = Math.hypot(x - L.x, y - L.y) / L.r; if (d < 1) v += L.a * Math.pow(1 - d, 1.4); }
    else if (L.type === 'b') { const d = ((x - L.x) * L.nx + (y - L.y) * L.ny) / L.w; v += L.a * Math.exp(-d * d); }
    else if (L.type === 'o') { const d = (Math.hypot(x - L.x, y - L.y) - L.rad) / L.w; v += L.a * Math.exp(-d * d); }
  } return v;
}
function glintPass(M, lights, amb) {
  if (!GW) { GW = cnv(W / 4, H / 4); GWg = GW.getContext('2d'); GWD = new Float32Array(W / 4 * H / 4); GWI = GWg.createImageData(W / 4, H / 4); }
  GWD.fill(0); if (!lights.length && amb <= 0) return;
  const md = MCg.getImageData(0, 0, W, H).data, img = ctx.getImageData(0, 0, W, H), fd = img.data, QW = W / 4;
  const inv = M.inverse(), ia = inv.a, ib = inv.b, ic = inv.c, id = inv.d, ie = inv.e, iff = inv.f;
  const Ls = lights.map(L => ({ ...L, r2: L.r ? L.r * L.r : 0 }));
  let ci = 1e9, cj = 1e9, nx = 1, ny = 0, th = 0, fam = 0, tone = 0, ox = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = (y * W + x) * 4, A = md[p + 3]; if (A < 6) continue;
    const wx = ia * x + ic * y + ie, wy = ib * x + id * y + iff;
    const j = Math.floor(wy / LS), ro = rowOff(j), i = Math.floor((wx + ro) / LS);
    if (i !== ci || j !== cj) { ci = i; cj = j; ox = ro; th = leafTilt(i, j); nx = Math.cos(th); ny = Math.sin(th); const fa = .5 + .5 * Math.cos(th - .9); fam = fa * fa * fa * fa; tone = leafTone(i, j); }
    const lu = (wx + ox) / LS - i - .5, lv = wy / LS - j - .5, cup = 1 + .55 * (lu * nx + lv * ny);
    let R = amb * (.55 + .55 * fam);
    for (let k = 0; k < Ls.length; k++) { const L = Ls[k];
      if (L.type === 'r') { const dx = wx - L.x, dy = wy - L.y, d2 = dx * dx + dy * dy; if (d2 >= L.r2) continue; const d = Math.sqrt(d2), v = L.a * Math.pow(1 - d / L.r, 1.4);
        let f = .5 + .5 * (dx * nx + dy * ny) / (d + 1e-3); f *= f; R += v * (.5 + .75 * f); }
      else if (L.type === 'b') { const dd = ((wx - L.x) * L.nx + (wy - L.y) * L.ny) / L.w; if (dd > 3 || dd < -3) continue; const v = L.a * Math.exp(-dd * dd);
        let f = .5 + .5 * Math.cos(dd * 1.9 + th); f *= f; R += v * (.45 + .8 * f); }
      else { const dx = wx - L.x, dy = wy - L.y, dd = (Math.sqrt(dx * dx + dy * dy) - L.rad) / L.w; if (dd > 3 || dd < -3) continue; const v = L.a * Math.exp(-dd * dd);
        let f = .5 + .5 * Math.cos(dd * 2.2 + th); f *= f; R += v * (.5 + .8 * f); }
    }
    if (R < .004) continue;
    const k = A / 255 * Math.min(R * cup, 2.2) * (.9 + .2 * tone);
    if (k > .6) GWD[(y >> 2) * QW + (x >> 2)] += (k - .6);
    const f = .82 * (1 - Math.exp(-1.15 * k)), r0 = fd[p], g0 = fd[p + 1], b0 = fd[p + 2];
    fd[p] = Math.min(255, r0 * (1 + .5 * k) + (250 - r0) * f); fd[p + 1] = Math.min(232, g0 * (1 + .45 * k) + (204 - g0) * f); fd[p + 2] = Math.min(150, b0 * (1 + .2 * k) + (96 - b0) * f);
  }
  ctx.putImageData(img, 0, 0);
}
function glowPass(gain) {
  if (!GWD) return; const n = GWD.length, d = GWI.data;
  for (let i = 0; i < n; i++) { const v = Math.min(1, GWD[i] / 16 * gain); d[i * 4] = 255; d[i * 4 + 1] = 196; d[i * 4 + 2] = 110; d[i * 4 + 3] = 255 * v * v; }
  GWg.putImageData(GWI, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(10px)'; ctx.globalAlpha = .5; ctx.drawImage(GW, 0, 0, W, H); ctx.filter = 'blur(36px)'; ctx.globalAlpha = .4; ctx.drawImage(GW, 0, 0, W, H);
  ctx.restore();
}
function flashes(M, lights) {
  ctx.setTransform(M); ctx.globalCompositeOperation = 'lighter'; const z = Math.hypot(M.a, M.b);
  for (const p of GP) {
    const v = lightAt(lights, p.x, p.y) * p.k; if (v < .55) continue; const a = clamp((v - .55) * 1.4), r = Math.min(p.r * (.4 + .45 * a), 160 / z);
    const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * .5); rg.addColorStop(0, `rgba(255,246,215,${.4 * a})`); rg.addColorStop(1, 'rgba(255,232,160,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p.x, p.y, r * .5, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,250,232,${.8 * a})`;
    for (const an of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) { const rr = an % (Math.PI / 2) ? r * .45 : r; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(an + .2); ctx.beginPath(); ctx.moveTo(-rr, 0); ctx.quadraticCurveTo(0, -rr * .06, rr, 0); ctx.quadraticCurveTo(0, rr * .06, -rr, 0); ctx.fill(); ctx.restore(); }
  }
  ctx.globalCompositeOperation = 'source-over';
}
// a warm pool of lamplight on the paint (small, never a wash)
function pool(x, y, r, a) { const rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(255,224,160,${a})`); rg.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
