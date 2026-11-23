'use strict';
// Gilded Illumination engine: gold leaf, illuminated frame, text layers, diya light, gold dust.
// Everything is procedural Canvas 2D. frame(t) depends only on t, so any frame can be rendered in any order.
// All drawing is in logical 1920x1080 units; ?scale=0.5 renders a 960x540 preview with identical layout.

const W = 1920, H = 1080;
const Q = new URLSearchParams(location.search);
const S = +(Q.get('scale') || 1);
const cv = document.getElementById('c'); cv.width = Math.round(W * S); cv.height = Math.round(H * S);
const ctx = cv.getContext('2d');

const C = { ink0: '#0B0A12', ink1: '#14112A', gold: '#D4A63A', goldHi: '#F3D98B', goldSh: '#8A6A1F', cream: '#EAD9B0', verm: '#B3261E' };
const F = { tiro: "'Tiro Devanagari Sanskrit'", noto: "'Noto Serif Devanagari'", cinzel: "'Cinzel'" };

// ------------------------------------------------------------------ math
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const TAU = Math.PI * 2;
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function h2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vn(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, o = 5) { let s = 0, a = .5; for (let i = 0; i < o; i++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 3.7; a *= .5; } return s; }
const flick = (t, k = 0) => .82 + .1 * Math.sin(t * 7.3 + k) + .06 * Math.sin(t * 13.1 + k * 2.1) + .05 * (vn(t * 3 + k * 9, 1.7) - .5);
const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };

// ------------------------------------------------------------------ canvases
function mk(w, h, fn) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * S)); c.height = Math.max(1, Math.ceil(h * S));
  const g = c.getContext('2d'); g.scale(S, S); c.lw = w; c.lh = h; c.g = g; if (fn) fn(g, c); return c; }
const POOL = {};
function tmp(key, w, h) { let c = POOL[key]; if (!c || c.lw !== w || c.lh !== h) c = POOL[key] = mk(w, h); const g = c.g; g.setTransform(S, 0, 0, S, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h); return c; }

// ------------------------------------------------------------------ gold leaf texture
let GOLD_PAT = null, GRAIN = null, VERM_PAT = null;
function ramp(v) {   // shadow → base → highlight
  const A = hex(C.goldSh), B = hex(C.gold), D = hex(C.goldHi);
  if (v < .55) { const u = clamp(v / .55); return A.map((a, i) => lerp(a, B[i], u)); }
  const u = clamp((v - .55) / .45); return B.map((b, i) => lerp(b, D[i], u));
}
function makeGoldTile() {
  const s = 384, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'), im = g.createImageData(s, s), d = im.data, R = mulberry(7);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const P = s / 6, n = fbm(x / P, y / P, 4), streak = vn(x / 90, y / 7), fine = R();
    // periodic blend at tile edge so the pattern repeats without a seam
    const v = clamp(.5 + .55 * (n - .5) + .22 * (streak - .5) + (fine < .04 ? .2 : fine > .97 ? -.25 : (fine - .5) * .08));
    const [r, gg, b] = ramp(v); const i = (y * s + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  // soften seams: mirror tile
  const m = document.createElement('canvas'); m.width = m.height = s * 2; const mg = m.getContext('2d');
  mg.drawImage(c, 0, 0); mg.save(); mg.scale(-1, 1); mg.drawImage(c, -2 * s, 0); mg.restore();
  mg.save(); mg.scale(1, -1); mg.drawImage(c, 0, -2 * s); mg.scale(-1, 1); mg.drawImage(c, -2 * s, -2 * s); mg.restore();
  return m;
}
function makeGrain() {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'), im = g.createImageData(s, s), d = im.data, R = mulberry(3);
  for (let i = 0; i < s * s; i++) { const r = R(), v = r < .5 ? 0 : 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = Math.abs(r - .5) > .44 ? 60 : 14; }
  g.putImageData(im, 0, 0); return c;
}
function makeVermTile() {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'), im = g.createImageData(s, s), d = im.data;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const n = fbm(x / 40, y / 40, 3); const v = .75 + .5 * (n - .5); const i = (y * s + x) * 4;
    d[i] = clamp(179 * v, 0, 255); d[i + 1] = 38 * v; d[i + 2] = 30 * v; d[i + 3] = 255; }
  g.putImageData(im, 0, 0); return c;
}
// turn whatever is drawn on canvas c (any colour, alpha = shape) into burnished gold leaf, with a carved shadow behind
function goldify(c, o = {}) {
  const g = c.g, w = c.lw, h = c.lh;
  g.save(); g.setTransform(S, 0, 0, S, 0, 0);
  g.globalCompositeOperation = 'source-in';
  const pat = g.createPattern(o.verm ? VERM_PAT : GOLD_PAT, 'repeat'); pat.setTransform(new DOMMatrix().scale(o.texScale || .6).translate(o.tx || 0, o.ty || 0));
  g.fillStyle = pat; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-atop';
  const y0 = o.y0 ?? 0, y1 = o.y1 ?? h, gr = g.createLinearGradient(0, y0, 0, y1);
  if (o.verm) { gr.addColorStop(0, 'rgba(255,140,110,.25)'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,0,0,.35)'); }
  else { gr.addColorStop(0, 'rgba(255,246,200,.22)'); gr.addColorStop(.42, 'rgba(255,240,190,.04)'); gr.addColorStop(.6, 'rgba(70,45,5,.34)'); gr.addColorStop(.8, 'rgba(255,230,150,.1)'); gr.addColorStop(1, 'rgba(70,45,5,.38)'); }
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const gp = g.createPattern(GRAIN, 'repeat'); g.globalAlpha = .55; g.fillStyle = gp; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
  if (o.depth !== 0) {   // carved shadow and a hairline highlight
    const sh = mk(w, h); sh.g.drawImage(c, 0, 0, w, h); sh.g.globalCompositeOperation = 'source-in'; sh.g.fillStyle = 'rgba(20,10,0,.85)'; sh.g.fillRect(0, 0, w, h);
    const d = o.depth || 1.6; g.globalCompositeOperation = 'destination-over'; g.drawImage(sh, d * .6, d, w, h);
  }
  g.restore(); return c;
}
// soft blurred glow copy of a layer (for halos behind gold)
function glowOf(c, blur = 14, col = 'rgba(243,217,139,1)') {
  const pad = blur * 2, out = mk(c.lw + pad * 2, c.lh + pad * 2); out.pad = pad;
  out.g.filter = `blur(${blur * S}px)`; out.g.drawImage(c, pad, pad, c.lw, c.lh); out.g.filter = 'none';
  out.g.globalCompositeOperation = 'source-in'; out.g.fillStyle = col; out.g.fillRect(0, 0, out.lw, out.lh); return out;
}

// slow shimmer sweep across a gold layer: a diagonal band of light every `period` s
function shimmerAmt(t, period = 7, phase = 0, dur = 2.4) { const u = (((t + phase) % period) + period) % period / dur; return u <= 1 ? u : -1; }
function shimmer(g, layer, x, y, w, h, t, o = {}) {
  const u = shimmerAmt(t, o.period || 7, o.phase || 0, o.dur || 2.4); if (u < 0) return;
  const T = tmp('shim' + (o.slot || 0), Math.ceil(w), Math.ceil(h)), tg = T.g;
  tg.drawImage(layer, 0, 0, w, h); tg.globalCompositeOperation = 'source-atop';
  const span = w + h, cx = lerp(-.25, 1.25, eio(u)) * span, gr = tg.createLinearGradient(cx - 160, 0, cx + 160, 0);
  gr.addColorStop(0, 'rgba(255,250,225,0)'); gr.addColorStop(.5, `rgba(255,250,225,${o.k ?? .55})`); gr.addColorStop(1, 'rgba(255,250,225,0)');
  tg.setTransform(new DOMMatrix([S, 0, 0, S, 0, 0]).translate(0, 0).skewX(-30)); tg.fillStyle = gr; tg.fillRect(-h, 0, span + 2 * h, h);
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= (o.alpha ?? 1); g.drawImage(T, x, y, w, h); g.restore();
}

// ------------------------------------------------------------------ text
const FONT_SIZES = {};
function fontStr(fam, size, weight = 400) { return `${weight} ${size}px ${F[fam] || fam}`; }
const MEAS = mk(4, 4).g;
function measure(text, fam, size, weight) { MEAS.font = fontStr(fam, size, weight); const m = MEAS.measureText(text); return { w: m.width, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent }; }
// split into lines that fit maxW (by words)
function wrap(text, fam, size, maxW, weight) {
  const words = text.split(/\s+/).filter(Boolean), out = []; let cur = '';
  for (const w of words) { const tryS = cur ? cur + ' ' + w : w; if (cur && measure(tryS, fam, size, weight).w > maxW) { out.push(cur); cur = w; } else cur = tryS; }
  if (cur) out.push(cur); return out;
}
// isKey(word) → vermilion. Only whole words that begin with राम (राम, रामो, रामः …), never sub-word splits (keeps Devanagari shaping intact).
const isKey = w => /^[“"'(]*राम/.test(w) && !/^रामायण/.test(w.replace(/^[“"'(]+/, ''));
const TXC = new Map();
// a cached text layer: {c, w, h, base} with padding; style 'gold' | 'cream' | 'verm'
function textLayer(text, fam, size, style = 'gold', o = {}) {
  const key = [text, fam, size, style, o.weight || 400, o.keys ? 1 : 0, o.glow || 0].join('|');
  if (TXC.has(key)) return TXC.get(key);
  const m = measure(text, fam, size, o.weight), pad = Math.ceil(size * .5), lh = size * 1.75;
  const w = Math.ceil(m.w + pad * 2), h = Math.ceil(lh + pad), base = pad * .5 + size * 1.15;
  const c = mk(w, h), g = c.g; g.font = fontStr(fam, size, o.weight); g.textBaseline = 'alphabetic';
  g.fillStyle = '#fff'; g.fillText(text, pad, base);
  const keys = [];
  if (o.keys) { // positions of key words
    const words = text.split(' '); let pre = '';
    for (const wd of words) { if (isKey(wd)) keys.push({ x: pad + measure(pre, fam, size, o.weight).w, wd }); pre += wd + ' '; }
    for (const k of keys) { g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000'; g.lineWidth = size * .06; g.fillText(k.wd, k.x, base); g.strokeText(k.wd, k.x, base); }
    g.globalCompositeOperation = 'source-over';
  }
  if (style === 'gold') goldify(c, { y0: base - size, y1: base + size * .3, texScale: .5, depth: Math.max(1.2, size / 40) });
  else { g.globalCompositeOperation = 'source-in'; g.fillStyle = style === 'verm' ? C.verm : C.cream; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-over'; g.drawImage(c, 1, 1.5, w, h); g.globalCompositeOperation = 'source-over';
    // re-tint the shadow copy dark (destination-over drew the tinted copy; darken it)
  }
  if (keys.length) { // vermilion key words with a thin gold edge
    const v = mk(w, h), vg = v.g; vg.font = g.font;
    for (const k of keys) { vg.fillStyle = '#fff'; vg.fillText(k.wd, k.x, base); }
    goldify(v, { verm: true, y0: base - size, y1: base + size * .3, depth: Math.max(1.2, size / 40) });
    const e = mk(w, h), eg = e.g; eg.font = g.font; eg.lineWidth = Math.max(1.2, size * .022); eg.strokeStyle = '#fff'; eg.lineJoin = 'round';
    for (const k of keys) eg.strokeText(k.wd, k.x, base);
    goldify(e, { depth: 0, texScale: .5 });
    g.drawImage(v, 0, 0, w, h); g.drawImage(e, 0, 0, w, h);
  }
  const L = { c, w, h, base, pad, tw: m.w, size, glow: o.glow ? glowOf(c, o.glow) : null };
  TXC.set(key, L); return L;
}
// draw a text layer centred at (cx, baselineY)
const TEXTS = [];   // on-screen text boxes this frame (for overflow checks)
function drawText(g, L, cx, by, alpha = 1, o = {}) {
  if (alpha <= 0.001) return;
  const x = cx - L.w / 2, y = by - L.base + (o.dy || 0);
  g.save(); g.globalAlpha *= alpha;
  if (L.glow) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= (o.glowA ?? .3); g.drawImage(L.glow, x - L.glow.pad, y - L.glow.pad, L.glow.lw, L.glow.lh); g.restore(); }
  g.drawImage(L.c, x, y, L.w, L.h);
  if (o.t !== undefined && o.shimmer !== false) shimmer(g, L.c, x, y, L.w, L.h, o.t, { period: o.period || 8, phase: o.phase || 0, k: .5, slot: 'txt' });
  g.restore();
  const M = g.getTransform(), p0 = new DOMPoint(cx - L.tw / 2, by - L.size).matrixTransform(M), p1 = new DOMPoint(cx + L.tw / 2, by + L.size * .45).matrixTransform(M);
  TEXTS.push({ x0: p0.x / S, y0: p0.y / S, x1: p1.x / S, y1: p1.y / S, a: alpha, id: o.id || '' });
}
// line reveal: soft fade, small upward drift
const reveal = (t, t0, d = .9) => ss(seg(t, t0, t0 + d));
const drift = (t, t0, d = 1.2, px = 14) => (1 - eo(seg(t, t0, t0 + d))) * px;

// ------------------------------------------------------------------ backdrop, light, dust, vignette
let PALM = null, VIGN = null, DOT = null, EMBER = null;
function makePalm() {   // aged palm-leaf texture: horizontal fibres, faint mottle, a few cracks
  return mk(W, H, g => {
    const R = mulberry(11);
    for (let i = 0; i < 520; i++) { const y = R() * H, a = .02 + R() * .05, x0 = R() * W * .3 - 200, len = W * (.4 + R() * .9);
      g.strokeStyle = R() < .5 ? `rgba(234,217,176,${a * .7})` : `rgba(0,0,0,${a * 1.6})`; g.lineWidth = .6 + R() * 1.6;
      g.beginPath(); g.moveTo(x0, y); for (let k = 1; k <= 8; k++) g.lineTo(x0 + len * k / 8, y + (R() - .5) * 2.4); g.stroke(); }
    const n = mk(W / 8, H / 8), ng = n.g, im = ng.createImageData(n.width, n.height), d = im.data;
    for (let y = 0; y < n.height; y++) for (let x = 0; x < n.width; x++) { const v = fbm(x / 30 * 8 / S / 8 * S, y / 18 * 8 / S / 8 * S, 4); const i = (y * n.width + x) * 4;
      d[i] = 120; d[i + 1] = 90; d[i + 2] = 40; d[i + 3] = clamp((v - .45) * 90, 0, 40); }
    ng.putImageData(im, 0, 0); g.imageSmoothingQuality = 'high'; g.drawImage(n, 0, 0, W, H);
  });
}
function makeVign() { return mk(W, H, g => { const gr = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.02);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.7, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,.72)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }); }
function makeDot() { return mk(24, 24, g => { const gr = g.createRadialGradient(12, 12, 0, 12, 12, 12); gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(.25, 'rgba(243,217,139,.75)'); gr.addColorStop(1, 'rgba(212,166,58,0)'); g.fillStyle = gr; g.fillRect(0, 0, 24, 24); }); }
function makeEmber() { return mk(24, 24, g => { const gr = g.createRadialGradient(12, 12, 0, 12, 12, 12); gr.addColorStop(0, 'rgba(255,230,170,1)'); gr.addColorStop(.3, 'rgba(240,140,50,.7)'); gr.addColorStop(1, 'rgba(179,38,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, 24, 24); }); }

function backdrop(g, t, o = {}) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, C.ink1); gr.addColorStop(1, C.ink0); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (o.palm !== 0) { g.globalAlpha = o.palm ?? .9; g.drawImage(PALM, 0, 0, W, H); g.globalAlpha = 1; }
}
// warm key light from a diya at (x, y)
function diyaLight(g, x, y, t, k = 1, r = 900) {
  if (k <= 0) return; const f = flick(t);
  g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, r * (.95 + .05 * f)); gr.addColorStop(0, `rgba(255,170,70,${.22 * k * f})`); gr.addColorStop(.35, `rgba(212,140,50,${.09 * k * f})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}
// a clay-and-gold diya with a living flame. s = scale, lit 0..1
const DIYA = {};
function diya(g, x, y, s, t, lit = 1, o = {}) {
  if (!DIYA.body) DIYA.body = goldify(mk(240, 120, q => { q.fillStyle = '#fff';
    q.beginPath(); q.moveTo(10, 30); q.bezierCurveTo(30, 110, 210, 110, 230, 30); q.bezierCurveTo(200, 44, 40, 44, 10, 30); q.fill();     // bowl
    q.beginPath(); q.moveTo(196, 34); q.quadraticCurveTo(232, 22, 238, 8); q.quadraticCurveTo(226, 36, 200, 44); q.fill();               // spout
    q.beginPath(); q.ellipse(120, 102, 46, 9, 0, 0, TAU); q.fill(); q.fillRect(98, 88, 44, 14);                                          // foot
    q.globalCompositeOperation = 'destination-out'; q.lineWidth = 2.5; q.strokeStyle = '#000';
    for (let i = 0; i < 9; i++) { q.beginPath(); q.arc(48 + i * 18, 62 + Math.sin(i / 8 * Math.PI) * 10, 4, 0, TAU); q.stroke(); }       // punched dots
    q.beginPath(); q.moveTo(30, 48); q.bezierCurveTo(70, 70, 170, 70, 212, 48); q.stroke(); }), { texScale: .35, depth: 2 });
  g.save(); g.translate(x, y); g.scale(s, s);
  if (lit > 0) { // flame at the spout tip (228, 10) in body space → centre the bowl on x
    const fx = 105, fy = -48, f = flick(t, o.seed || 0), sway = Math.sin(t * 2.1 + (o.seed || 0)) * 3 + (vn(t * 2, 3) - .5) * 4, hgt = 62 * lit * (.92 + .1 * f);
    g.save(); g.globalCompositeOperation = 'lighter';
    let gr = g.createRadialGradient(fx, fy - hgt * .4, 0, fx, fy - hgt * .4, 150 * lit); gr.addColorStop(0, `rgba(255,190,90,${.5 * lit})`); gr.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = gr; g.fillRect(fx - 160, fy - 220, 320, 320);
    const fl = new Path2D(); fl.moveTo(fx - 13 * lit, fy); fl.bezierCurveTo(fx - 16 * lit, fy - hgt * .45, fx + sway * .4, fy - hgt * .7, fx + sway, fy - hgt);
    fl.bezierCurveTo(fx + sway * .5 + 4, fy - hgt * .65, fx + 16 * lit, fy - hgt * .4, fx + 13 * lit, fy); fl.quadraticCurveTo(fx, fy + 10, fx - 13 * lit, fy);
    gr = g.createLinearGradient(0, fy + 6, 0, fy - hgt); gr.addColorStop(0, 'rgba(120,150,255,.9)'); gr.addColorStop(.18, 'rgba(255,245,210,1)'); gr.addColorStop(.55, 'rgba(255,190,70,.95)'); gr.addColorStop(1, 'rgba(230,90,20,.2)');
    g.fillStyle = gr; g.fill(fl); g.restore();
  }
  g.drawImage(DIYA.body, -120, -60, 240, 120);
  g.restore();
}

// gold dust: deterministic in t
function dust(g, t, o = {}) {
  const n = o.n || 110, R = mulberry(o.seed || 42), k = o.k ?? 1; if (k <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const r1 = R(), r2 = R(), r3 = R(), r4 = R(), r5 = R(), vy = 8 + 18 * r3, Hh = H + 80;
    const x = ((r1 * W + Math.sin(t * .18 * (1 + r3) + r4 * 6) * 50 + 9 * t * (r5 - .5)) % W + W) % W;
    const y = H + 40 - (((r2 * Hh + vy * t) % Hh) + Hh) % Hh;
    const tw = .2 + .55 * (.5 + .5 * Math.sin(t * (.8 + r3 * 1.6) + r4 * 10)), sz = (3 + 9 * r5 * r5) * (o.size || 1);
    g.globalAlpha = tw * k * (o.alpha ?? .7); g.drawImage(o.ember ? EMBER : DOT, x - sz / 2, y - sz / 2, sz, sz);
  }
  g.restore();
}
// embers that rise and settle (count-in/out with k)
function embers(g, t, t0, k = 1, o = {}) {
  const n = o.n || 70, R = mulberry(o.seed || 9); g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const r1 = R(), r2 = R(), r3 = R(), r4 = R(), life = 4 + 4 * r3, ph = ((t - t0 + r2 * life) % life + life) % life / life;
    const x = (o.x0 ?? 200) + r1 * (o.w ?? 1520) + Math.sin(ph * 6 + r4 * 9) * 30, y = (o.y0 ?? 980) - ph * (o.rise ?? 700) * (1 - .35 * ph);
    const a = Math.sin(ph * Math.PI) * k, sz = 4 + 10 * r4 * (1 - ph * .6);
    g.globalAlpha = a * .85; g.drawImage(EMBER, x - sz / 2, y - sz / 2, sz, sz);
  }
  g.restore();
}

// ------------------------------------------------------------------ ornaments
// paths for a lotus (n petals, radius r), a manjari (tulsi flower spike), a corner flourish
function lotusPath(q, cx, cy, r, n = 7, spread = Math.PI * .9) {
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * spread / (n - 1), L = r * (i === (n - 1) / 2 ? 1 : .82 - Math.abs(i - (n - 1) / 2) * .05), w = r * .2;
    const tx = cx + Math.cos(a) * L, ty = cy + Math.sin(a) * L, px = -Math.sin(a), py = Math.cos(a);
    q.moveTo(cx, cy); q.quadraticCurveTo(cx + Math.cos(a) * L * .5 + px * w, cy + Math.sin(a) * L * .5 + py * w, tx, ty);
    q.quadraticCurveTo(cx + Math.cos(a) * L * .5 - px * w, cy + Math.sin(a) * L * .5 - py * w, cx, cy); }
}
function manjariPath(q, x, y, len, ang = -Math.PI / 2, n = 7) {   // a spike of tiny florets with a stem
  const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
  for (let i = 0; i < n; i++) { const u = (i + 1) / (n + 1), cx = x + dx * len * u, cy = y + dy * len * u, s = len * .09 * (1 - u * .55);
    for (const side of [-1, 1]) { const ex = cx + px * s * side * 1.3 + dx * s * .6, ey = cy + py * s * side * 1.3 + dy * s * .6; q.moveTo(cx + s * .4 * side * px, cy + s * .4 * side * py); q.ellipse(ex, ey, s * .9, s * .5, Math.atan2(ey - cy, ex - cx), 0, TAU); } }
  q.moveTo(x + dx * len + 3, y + dy * len); q.arc(x + dx * len, y + dy * len, len * .03, 0, TAU);
}
function makeFrame() {
  const m = 38, d = 13; // outer inset, gap to inner rule
  const c = mk(W, H, g => {
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineJoin = 'round'; g.lineCap = 'round';
    // double border
    g.lineWidth = 3.2; g.strokeRect(m, m, W - 2 * m, H - 2 * m);
    g.lineWidth = 1.4; g.strokeRect(m + d, m + d, W - 2 * (m + d), H - 2 * (m + d));
    // pearl row between rules on top and bottom
    for (let x = m + 60; x < W - m - 60; x += 22) { if (Math.abs(x - W / 2) < 150) continue; for (const y of [m + d / 2, H - m - d / 2]) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); } }
    for (let y = m + 60; y < H - m - 60; y += 22) { if (Math.abs(y - H / 2) < 110) continue; for (const x of [m + d / 2, W - m - d / 2]) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); } }
    // corner flourishes
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      g.save(); g.translate(sx > 0 ? m : W - m, sy > 0 ? m : H - m); g.scale(sx, sy);
      g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(0, 120); g.bezierCurveTo(30, 70, 70, 30, 120, 0); g.stroke();            // sweeping curve
      g.beginPath(); g.moveTo(24, 24); g.bezierCurveTo(70, 26, 98, 52, 86, 82); g.bezierCurveTo(78, 100, 56, 98, 54, 82); g.bezierCurveTo(52, 68, 66, 62, 72, 72); g.stroke(); // spiral
      g.beginPath(); g.moveTo(24, 24); g.bezierCurveTo(26, 70, 52, 98, 82, 86); g.bezierCurveTo(100, 78, 98, 56, 82, 54); g.bezierCurveTo(68, 52, 62, 66, 72, 72); g.stroke();
      g.lineWidth = 1.6; g.beginPath(); g.moveTo(150, 7); g.lineTo(230, 7); g.moveTo(7, 150); g.lineTo(7, 230); g.stroke();
      const q = new Path2D(); lotusPath(q, 0, 0, 34, 5, Math.PI * .5); g.save(); g.translate(30, 30); g.rotate(Math.PI * .75); g.fill(q); g.restore();
      g.beginPath(); g.arc(13, 13, 5, 0, TAU); g.fill();
      for (const [x, y] of [[132, 18], [18, 132]]) { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
      g.restore();
    }
    // top centre lotus, bottom centre manjari pair, side manjaris
    const lp = new Path2D(); lotusPath(lp, W / 2, m + 4, 44, 7); g.save(); g.fillStyle = C.ink0; g.fillRect(W / 2 - 120, m - 30, 240, 44); g.restore(); g.fill(lp);
    g.lineWidth = 1.8; g.beginPath(); g.moveTo(W / 2 - 150, m); g.bezierCurveTo(W / 2 - 110, m - 2, W / 2 - 90, m + 22, W / 2 - 54, m + 6); g.moveTo(W / 2 + 150, m); g.bezierCurveTo(W / 2 + 110, m - 2, W / 2 + 90, m + 22, W / 2 + 54, m + 6); g.stroke();
    g.beginPath(); g.ellipse(W / 2, m + 6, 52, 7, 0, 0, TAU); g.fill();
    const mp = new Path2D(); manjariPath(mp, W / 2 - 14, H - m + 10, 70, -Math.PI / 2 - .5); manjariPath(mp, W / 2 + 14, H - m + 10, 70, -Math.PI / 2 + .5);
    g.save(); g.fillStyle = C.ink0; g.fillRect(W / 2 - 100, H - m - 20, 200, 40); g.restore(); g.fill(mp);
    g.lineWidth = 1.8; g.beginPath(); g.moveTo(W / 2 - 150, H - m); g.quadraticCurveTo(W / 2 - 60, H - m - 4, W / 2 - 14, H - m + 10); g.moveTo(W / 2 + 150, H - m); g.quadraticCurveTo(W / 2 + 60, H - m - 4, W / 2 + 14, H - m + 10); g.stroke();
    for (const sx of [m, W - m]) { const sp = new Path2D(); manjariPath(sp, sx, H / 2 + 60, 120, -Math.PI / 2, 8); g.save(); g.fillStyle = C.ink0; g.fillRect(sx - 18, H / 2 - 80, 36, 160); g.restore(); g.fill(sp);
      g.lineWidth = 1.8; g.beginPath(); g.moveTo(sx, H / 2 + 60); g.lineTo(sx, H / 2 + 100); g.stroke(); g.beginPath(); g.arc(sx, H / 2 + 72, 4, 0, TAU); g.fill(); }
  });
  // the ink-coloured knock-outs must stay dark, not gold: split them out
  const knock = mk(W, H, g => { g.drawImage(c, 0, 0, W, H); });
  const kd = knock.g.getImageData(0, 0, knock.width, knock.height), dd = kd.data;
  for (let i = 0; i < dd.length; i += 4) { if (dd[i] < 128) dd[i + 3] = 0; } knock.g.putImageData(kd, 0, 0);
  goldify(knock, { texScale: .45, depth: 1.4 });
  return knock;
}
let FRAME = null, FRAME_GLOW = null;
const IN = { x0: 70, y0: 70, x1: W - 70, y1: H - 70 };   // inner safe area (text never crosses this)
function drawFrame(g, t, a = 1) {
  if (a <= 0) return; g.save(); g.globalAlpha = a;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * .18; g.drawImage(FRAME_GLOW, -FRAME_GLOW.pad, -FRAME_GLOW.pad, FRAME_GLOW.lw, FRAME_GLOW.lh); g.restore();
  g.drawImage(FRAME, 0, 0, W, H); shimmer(g, FRAME, 0, 0, W, H, t, { period: 6.5, dur: 3, k: .7, slot: 'frame' });
  g.restore();
}

function initEngine() {
  GOLD_PAT = makeGoldTile(); GRAIN = makeGrain(); VERM_PAT = makeVermTile();
  PALM = makePalm(); VIGN = makeVign(); DOT = makeDot(); EMBER = makeEmber();
  FRAME = makeFrame(); FRAME_GLOW = glowOf(FRAME, 10);
}
