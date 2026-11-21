'use strict';
// Shri Ram Parivar: a 6 s gilded darshan. One painted picture (world units = 1920×1080 screen px at zoom 1).
// A diya burns before a dark gold ground; the family is painted in layers; a spark from the flame touches
// Rama's halo and the gold lights in rings; a band of light rakes across the finished picture.

const DUR = 6.0, BEAT = 60 / 90;
const B = n => n * BEAT;
const T_ARCH = .25, T_RS = B(1), T_LK = B(2), T_HN = B(3), T_PLQ = 2.55, T_WRITE = 2.8, T_SPARK = 2.95, TOUCH = B(5), T_RAKE = B(7), T_CHORD = B(8);
const RAMA = { x: 860, y: 660 }, SITA = { x: 1060, y: 660 }, LAKS = { x: 560, y: 862 }, HANU = { x: 1360, y: 862 };
const HALO_R = { x: RAMA.x, y: RAMA.y - 330, r: 86 };
const CONTACT = { x: HALO_R.x + HALO_R.r * Math.cos(.32), y: HALO_R.y + HALO_R.r * Math.sin(.32) };
const DIYA = { x: 960, y: 838 };
const SKIN_R = '#4a7fc0', SKIN_R_D = '#2d5590', SKIN_F = '#efc8a4', SKIN_F_D = '#c99a76', HAIR = '#20140c',
  HAN = '#b65a34', HAN_D = '#7c3519', HAN_L = '#efc2a2';

// ---------------------------------------------------------------- pigment helpers (from the style's world.js)
let PAINTC;
function makePaint() {   // ground ultramarine as paint: granular, deep, matte
  const s = 512, c = cnv(s, s), g = c.getContext('2d'); g.drawImage(GRAINC, 0, 0);
  const im = g.getImageData(0, 0, s, s), d = im.data, A = [20, 30, 98], Bc = [58, 82, 176];
  for (let i = 0; i < d.length; i += 4) { const v = d[i] / 255, u = clamp(v * 1.15 - .1); d[i] = lerp(A[0], Bc[0], u); d[i + 1] = lerp(A[1], Bc[1], u); d[i + 2] = lerp(A[2], Bc[2], u); }
  g.putImageData(im, 0, 0); return c;
}
function paint(g, path, fill, rim, rimW, lw = 2.4) { g.fillStyle = fill; g.fill(path); if (rim) rimShade(g, path, rim, rimW || 10); if (lw) ink(g, path, lw); maskErase(g, path); }
function fillC(g, path, fill, rim, rimW) { g.fillStyle = fill; g.fill(path); if (rim) rimShade(g, path, rim, rimW || 8); maskErase(g, path); }   // colour layer (ink comes later)

// ---------------------------------------------------------------- the picture: border, gold ground, arch, floor
const ARCH = P2(q => { q.moveTo(300, 905); q.lineTo(300, 340); q.bezierCurveTo(300, 190, 600, 110, 960, 66); q.bezierCurveTo(1320, 110, 1620, 190, 1620, 340); q.lineTo(1620, 905); q.closePath(); });
function archStars() { const R = mulberry(7), out = []; let n = 0;
  while (out.length < 34 && n++ < 2000) { const x = 330 + R() * 1260, y = 110 + R() * 520;
    if (!ctxPt(ARCH, x, y)) continue; if (Math.abs(x - 960) < 300 && y > 180) continue;                // behind the throne: hidden anyway
    if (Math.abs(x - LAKS.x) < 120 && y > 240) continue; if (Math.abs(x - HANU.x) < 150 && y > 420) continue;
    if (out.some(s => Math.hypot(s.x - x, s.y - y) < 80)) continue; out.push({ x, y, r: 12 + R() * 10, rot: R() }); }
  return out; }
let STARS;
function ctxPt(p, x, y) { return ctx.isPointInPath(p, x, y); }

function drawGround(g) {   // the whole panel is gold ground, with punched rows in the spandrels
  const all = P2(q => q.rect(0, 0, 1920, 1080));
  leaf(g, all, [0, 0, 1920, 1080], { line: false, rim: false });
  g.save(); g.clip(all); g.fillStyle = 'rgba(100,54,6,.5)';
  for (let y = 70; y < 900; y += 34) for (let x = 60; x < 1880; x += 34) { if (g.isPointInPath(ARCH, x, y)) continue; g.beginPath(); g.arc(x + (y / 34 % 2) * 17, y, 2.2, 0, TAU); g.fill(); }
  g.restore();
}
function drawArch(g, t) {
  const k = seg(t, T_ARCH, T_ARCH + .7); if (k <= 0) return;
  g.save();
  if (k < 1) {   // brush fill from the centre out: a ragged, stroke-like front
    const R0 = 1150 * eo(k), clip = new Path2D();
    for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU, r = R0 * (.86 + .14 * vn(Math.cos(a) * 3 + 9, Math.sin(a) * 3 + 4)), x = 960 + Math.cos(a) * r, y = 470 + Math.sin(a) * r * .8; i ? clip.lineTo(x, y) : clip.moveTo(x, y); }
    g.clip(clip);
  }
  if (!g.__paint) { g.__paint = g.createPattern(PAINTC, 'repeat'); g.__paint.setTransform(new DOMMatrix().scale(1.1)); }
  g.fillStyle = g.__paint; g.fill(ARCH); rimShade(g, ARCH, ULTRA_D, 22); maskErase(g, ARCH);
  for (const s of STARS) { const p = P2(q => star8(q, s.x, s.y, s.r, .42, s.rot)); leaf(g, p, [s.x - s.r, s.y - s.r, s.r * 2, s.r * 2], { lw: 1.4, rimW: 2 }); gpush(s.x, s.y, s.r * 2.2, .7); }
  g.restore();
  if (k >= 1) { ink(g, ARCH, 3.2); leafCord(g, P2(q => { q.moveTo(282, 905); q.lineTo(282, 340); q.bezierCurveTo(282, 176, 590, 92, 960, 46); q.bezierCurveTo(1330, 92, 1638, 176, 1638, 340); q.lineTo(1638, 905); }), 9, { ink: 3 });
    pearlLine(g, [[300, 900], [300, 340]], 22, 3, .85); pearlLine(g, [[1620, 340], [1620, 900]], 22, 3, .85); }
}
function drawFloor(g) {
  const fl = P2(q => q.rect(282, 878, 1356, 40)); paint(g, fl, VERDI, VERDI_D, 8, 2.4);
  pearlLine(g, [[300, 898], [1620, 898]], 26, 3, .85);
}
function drawBorder(g) {
  const outer = P2(q => { q.rect(0, 0, 1920, 1080); q.rect(1898, 22, -1876, 1036); }), band = P2(q => { q.rect(22, 22, 1876, 1036); q.rect(1870, 50, -1820, 980); });
  leaf(g, outer, [0, 0, 1920, 1080], { rule: 'evenodd', line: false, rim: false });
  paint(g, band, VERM, VERM_D, 7, 2.6);
  for (const [a, b] of [[[36, 36], [1884, 36]], [[1884, 1044], [36, 1044]], [[36, 1044], [36, 36]], [[1884, 36], [1884, 1044]]]) pearlLine(g, [a, b], 24, 3.4, .9);
  leafCord(g, P2(q => q.rect(52, 52, 1816, 976)), 5, { ink: 2.4 });
}

// ---------------------------------------------------------------- the throne and its gold back
const BACK = P2(q => { q.moveTo(726, 662); q.lineTo(726, 300); q.bezierCurveTo(726, 230, 790, 190, 850, 196); q.bezierCurveTo(900, 150, 1020, 150, 1070, 196);
  q.bezierCurveTo(1130, 190, 1194, 230, 1194, 300); q.lineTo(1194, 662); q.closePath(); });
function drawThrone(g) {
  leaf(g, BACK, [726, 150, 468, 512], { lw: 3, rimW: 10 });   // gold frame of the throne back, green panel inside (so Rama's gold dhoti reads)
  const inner = new Path2D(); inner.addPath(BACK, new DOMMatrix().translate(960, 662).scale(.9, .93).translate(-960, -662));
  paint(g, inner, VERD, VERD_D, 14, 2.6);
  g.save(); g.clip(inner); for (let y = 250; y < 660; y += 60) for (let x = 780; x < 1150; x += 60) triad(g, x + (y / 60 % 2) * 30, y, 2.2, .8); g.restore();
  gpush(960, 190, 120, 1); gpush(748, 420, 70, .8); gpush(1172, 420, 70, .8);
  const seat = P2(q => q.rect(706, 652, 508, 62)); paint(g, seat, VERM, VERM_D, 9, 2.6);
  leafCord(g, P2(q => { q.moveTo(706, 652); q.lineTo(1214, 652); }), 8, { ink: 2.6 });
  pearlLine(g, [[724, 684], [1196, 684]], 20, 2.8, .9);
  for (const [x, w] of [[690, 540], [656, 608]]) { const y = x === 690 ? 714 : 768, st = P2(q => q.rect(x, y, w, 54)); paint(g, st, x === 690 ? ROSE : LILAC, x === 690 ? ROSE_D : LILAC_D, 8, 2.4);
    hiLine(g, [[x + 10, y + 8], [x + w - 10, y + 8]], 2, .6); }
  for (let i = 0; i < 9; i++) triad(g, 700 + i * 65, 795, 2, .85);
}

// ---------------------------------------------------------------- figures: painted in layers (gold → colour → ink and white lead)
const L3 = k => [clamp(k * 3), clamp(k * 3 - 1), clamp(k * 3 - 2)];
function halo(g, cx, cy, R, k) {
  if (k <= 0) return; R *= eo(k);
  const ring = P2(q => q.arc(cx, cy, R + 11, 0, TAU)), disc = P2(q => q.arc(cx, cy, R, 0, TAU));
  g.fillStyle = VERM; g.fill(ring); rimShade(g, ring, VERM_D, 5); ink(g, ring, 2.4); maskErase(g, ring);
  leaf(g, disc, [cx - R, cy - R, R * 2, R * 2], { lw: 2, rimW: 6 });
  g.save(); g.clip(disc); g.strokeStyle = 'rgba(100,54,6,.5)'; g.lineWidth = 2;
  for (let a = 0; a < 28; a++) { const an = a / 28 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(an) * R * .5, cy + Math.sin(an) * R * .5); g.lineTo(cx + Math.cos(an) * R * .93, cy + Math.sin(an) * R * .93); g.stroke(); }
  g.restore(); pearls(g, cx, cy, R + 5.5, 30, 2.3, .9); gpush(cx, cy - R * .55, R * 1.3, 1.1);
}
function almond(q, cx, cy, w, h) { q.moveTo(cx - w, cy); q.quadraticCurveTo(cx, cy - h, cx + w, cy); q.quadraticCurveTo(cx, cy + h * .75, cx - w, cy); q.closePath(); }
function frontFace(g, cx, cy, rx, ry, o) {   // ink layer: almond eyes, brows, nose, lips, tilak or bindi
  for (const s of [-1, 1]) {
    const ex = cx + s * rx * .4, ey = cy - ry * .06, e = P2(q => almond(q, ex, ey, rx * .27, ry * .17));
    g.fillStyle = WHITE; g.fill(e); g.save(); g.clip(e); g.fillStyle = '#20140c'; g.beginPath(); g.arc(ex + s * -1, ey, ry * .1, 0, TAU); g.fill(); g.restore();
    ink(g, e, 1.6); g.strokeStyle = HAIR; g.lineWidth = 2.6 * LWK; g.beginPath(); g.moveTo(ex - rx * .3, ey - ry * .2); g.quadraticCurveTo(ex, ey - ry * .36, ex + rx * .3, ey - ry * .22); g.stroke();
  }
  g.strokeStyle = o.line || '#5a3420'; g.lineWidth = 1.9 * LWK; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - rx * .06, cy - ry * .12); g.quadraticCurveTo(cx - rx * .14, cy + ry * .28, cx + rx * .02, cy + ry * .3); g.stroke();
  const lip = P2(q => { q.moveTo(cx - rx * .24, cy + ry * .5); q.quadraticCurveTo(cx, cy + ry * .42, cx + rx * .24, cy + ry * .5); q.quadraticCurveTo(cx, cy + ry * .66, cx - rx * .24, cy + ry * .5); });
  g.fillStyle = '#b8402c'; g.fill(lip);
  if (o.tilak) { g.strokeStyle = WHITE; g.lineWidth = 2.6 * LWK; g.beginPath(); g.moveTo(cx - rx * .16, cy - ry * .72); g.quadraticCurveTo(cx, cy - ry * .2, cx + rx * .16, cy - ry * .72); g.stroke();
    g.strokeStyle = VERM; g.lineWidth = 2.6 * LWK; g.beginPath(); g.moveTo(cx, cy - ry * .66); g.lineTo(cx, cy - ry * .36); g.stroke(); }
  if (o.bindi) { g.fillStyle = VERM; g.beginPath(); g.arc(cx, cy - ry * .42, rx * .09, 0, TAU); g.fill(); }
}
function kireeta(g, cx, by, w, h) {   // tall crown: gold cone with bands and a vermilion jewel
  const c = P2(q => { q.moveTo(cx - w, by); q.bezierCurveTo(cx - w * .9, by - h * .5, cx - w * .3, by - h * .8, cx, by - h); q.bezierCurveTo(cx + w * .3, by - h * .8, cx + w * .9, by - h * .5, cx + w, by); q.closePath(); });
  leaf(g, c, [cx - w, by - h, w * 2, h], { lw: 2.2, rimW: 4 });
  leafCord(g, P2(q => { q.moveTo(cx - w - 3, by); q.lineTo(cx + w + 3, by); }), 6, { ink: 2 });
  leafCord(g, P2(q => { q.moveTo(cx - w * .82, by - h * .34); q.quadraticCurveTo(cx, by - h * .44, cx + w * .82, by - h * .34); }), 3.5, { ink: 1.6 });
  const j = P2(q => q.ellipse(cx, by - h * .2, w * .18, w * .22, 0, 0, TAU)); paint(g, j, VERM, VERM_D, 2, 1.6); pearls(g, cx, by - h * .2, w * .3, 10, 1.8, .9);
  const tip = P2(q => q.arc(cx, by - h - 5, 5, 0, TAU)); leaf(g, tip, [cx - 5, by - h - 10, 10, 10], { lw: 1.4, rimW: 1 });
  gpush(cx, by - h * .5, w * 2.2, 1);
}
function necklaces(g, cx, ny, w) {
  leafCord(g, P2(q => { q.moveTo(cx - w, ny); q.quadraticCurveTo(cx, ny + w * 1.1, cx + w, ny); }), 4.5, { ink: 1.8 });
  leafCord(g, P2(q => { q.moveTo(cx - w * 1.25, ny + 4); q.quadraticCurveTo(cx, ny + w * 1.9, cx + w * 1.25, ny + 4); }), 4, { ink: 1.6 });
  pearlLine(g, [[cx - w * .9, ny + w * .5], [cx, ny + w * .98], [cx + w * .9, ny + w * .5]], 9, 2, .9);
}
function bow(g, x, y0, y1, bend) {
  const p = P2(q => { q.moveTo(x, y0); q.quadraticCurveTo(x + bend, (y0 + y1) / 2, x, y1); });
  g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 7 + 3 * LWK; g.stroke(p); g.strokeStyle = WOOD; g.lineWidth = 7; g.stroke(p);
  hiLine(g, [[x + bend * .2, y0 + 30], [x + bend * .45, (y0 + y1) / 2], [x + bend * .2, y1 - 30]], 1.6, .55);
  g.strokeStyle = 'rgba(42,26,16,.85)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke();
  for (const yy of [y0, y1]) { const c = P2(q => q.arc(x, yy, 5, 0, TAU)); leaf(g, c, [x - 5, yy - 5, 10, 10], { lw: 1.2, rimW: 1 }); }
  leafCord(g, P2(q => { q.moveTo(x + bend * .45, (y0 + y1) / 2 - 22); q.lineTo(x + bend * .45, (y0 + y1) / 2 + 22); }), 9, { ink: 2 });
}

function drawRama(g, k) {
  const [la, lb, lc] = L3(k); if (la <= 0) return;
  g.save(); g.translate(RAMA.x, RAMA.y);
  const lap = P2(q => { q.moveTo(-50, -118); q.bezierCurveTo(-92, -100, -124, -40, -122, 8); q.bezierCurveTo(-120, 40, -70, 46, 0, 34); q.bezierCurveTo(70, 46, 120, 40, 122, 8); q.bezierCurveTo(124, -40, 92, -100, 50, -118); q.closePath(); });
  const torso = P2(q => { q.moveTo(-46, -116); q.bezierCurveTo(-50, -170, -66, -214, -64, -238); q.bezierCurveTo(-46, -256, -22, -262, -12, -266); q.lineTo(12, -266); q.bezierCurveTo(22, -262, 46, -256, 64, -238); q.bezierCurveTo(66, -214, 50, -170, 46, -116); q.closePath(); });
  const armR = tubePath([[-58, -230], [-96, -158], [-90, -206]], [28, 22, 18]), palmR = P2(q => { q.ellipse(-90, -222, 13, 19, -.1, 0, TAU); });
  const armL = tubePath([[58, -230], [96, -150], [104, -66]], [28, 22, 18]), fistL = P2(q => q.ellipse(106, -62, 14, 13, 0, 0, TAU));
  const neck = P2(q => q.rect(-14, -292, 28, 34)), head = P2(q => q.ellipse(0, -330, 40, 50, 0, 0, TAU));
  const hair = P2(q => { q.moveTo(-40, -350); q.bezierCurveTo(-60, -300, -70, -250, -74, -218); q.lineTo(-48, -232); q.lineTo(48, -232); q.lineTo(74, -218); q.bezierCurveTo(70, -250, 60, -300, 40, -350); q.closePath(); });
  const ears = [-1, 1].map(s => P2(q => q.ellipse(s * 40, -330, 8, 13, 0, 0, TAU)));
  g.globalAlpha = la; halo(g, 0, -330, HALO_R.r, la);
  if (lb > 0) { g.globalAlpha = lb;
    fillC(g, hair, HAIR); leaf(g, lap, [-124, -118, 248, 166], { line: false, rimW: 8 });   // the pitambar: gold-leaf dhoti
    fillC(g, torso, SKIN_R, SKIN_R_D, 10); fillC(g, neck, SKIN_R); ears.forEach(e => fillC(g, e, SKIN_R, SKIN_R_D, 3));
    fillC(g, head, SKIN_R, SKIN_R_D, 6); fillC(g, armR, SKIN_R, SKIN_R_D, 6); fillC(g, armL, SKIN_R, SKIN_R_D, 6); fillC(g, palmR, SKIN_R, SKIN_R_D, 3); fillC(g, fistL, SKIN_R, SKIN_R_D, 3);
    const sash = P2(q => { q.moveTo(-52, -124); q.quadraticCurveTo(0, -112, 52, -124); q.lineTo(54, -104); q.quadraticCurveTo(0, -92, -54, -104); q.closePath(); }); fillC(g, sash, VERM, VERM_D, 4);
    const hem = P2(q => { q.moveTo(-121, 4); q.bezierCurveTo(-118, 36, -70, 42, 0, 30); q.bezierCurveTo(70, 42, 118, 36, 121, 4); q.lineTo(121, 18); q.bezierCurveTo(116, 48, 70, 54, 0, 42); q.bezierCurveTo(-70, 54, -116, 48, -121, 18); q.closePath(); }); fillC(g, hem, VERM, VERM_D, 3);
  }
  if (lc > 0) { g.globalAlpha = lc;
    [lap, torso, armR, armL, palmR, fistL, head, ...ears].forEach(p => ink(g, p, 2.4));
    frontFace(g, 0, -330, 40, 50, { tilak: true });
    g.strokeStyle = 'rgba(251,246,234,.9)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-50, -236); g.quadraticCurveTo(-6, -170, 40, -120); g.stroke();   // sacred thread
    g.strokeStyle = SKIN_R_D; g.lineWidth = 1.8; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 18, -228); g.quadraticCurveTo(s * 34, -212, s * 40, -196); g.stroke(); }
    for (const dx of [-60, -22, 22, 60]) { g.strokeStyle = 'rgba(100,54,6,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(dx * .5, -104); g.quadraticCurveTo(dx * .9, -40, dx * 1.2, 20); g.stroke(); }
    hiLine(g, [[-44, -232], [-30, -180], [-38, -128]], 2, .6); hiLine(g, [[-98, -60], [-108, -10]], 2, .7);
    pearlLine(g, [[-110, 26], [0, 38], [110, 26]], 11, 2.2, .9);
    triad(g, -60, -40, 2, .9); triad(g, 62, -40, 2, .9);
  }
  g.globalAlpha = la;
  bow(g, 122, -330, 30, 38); ink(g, fistL, 2.2);
  necklaces(g, 0, -250, 34); kireeta(g, 0, -364, 40, 92);
  for (const s of [-1, 1]) { leafCord(g, P2(q => q.arc(s * 42, -308, 7, 0, TAU)), 3.5, { ink: 1.4 }); }
  for (const [ax, ay] of [[-74, -196], [76, -188]]) leafCord(g, P2(q => { q.moveTo(ax - 13, ay); q.lineTo(ax + 13, ay + 2); }), 6, { ink: 2 });
  g.restore();
}
function drawSita(g, k) {
  const [la, lb, lc] = L3(k); if (la <= 0) return;
  g.save(); g.translate(SITA.x, SITA.y); g.scale(.93, .93); g.translate(0, 50);
  const lap = P2(q => { q.moveTo(-48, -120); q.bezierCurveTo(-90, -100, -120, -40, -118, 8); q.bezierCurveTo(-116, 42, -66, 46, 0, 36); q.bezierCurveTo(66, 46, 116, 42, 118, 8); q.bezierCurveTo(120, -40, 90, -100, 48, -120); q.closePath(); });
  const torso = P2(q => { q.moveTo(-42, -118); q.bezierCurveTo(-46, -170, -60, -212, -58, -236); q.bezierCurveTo(-42, -252, -20, -258, -11, -262); q.lineTo(11, -262); q.bezierCurveTo(20, -258, 42, -252, 58, -236); q.bezierCurveTo(60, -212, 46, -170, 42, -118); q.closePath(); });
  const pallu = P2(q => { q.moveTo(-58, -236); q.bezierCurveTo(-30, -250, 10, -256, 40, -250); q.bezierCurveTo(54, -200, 50, -150, 44, -118); q.lineTo(10, -118); q.bezierCurveTo(4, -170, -24, -210, -58, -236); q.closePath(); });
  const armR = tubePath([[-54, -228], [-88, -156], [-56, -176]], [24, 19, 16]), handR = P2(q => q.ellipse(-50, -184, 12, 15, .3, 0, TAU));
  const armL = tubePath([[54, -228], [86, -150], [64, -78]], [24, 19, 16]), handL = P2(q => q.ellipse(58, -72, 13, 11, .4, 0, TAU));
  const neck = P2(q => q.rect(-12, -288, 24, 32)), head = P2(q => q.ellipse(0, -326, 37, 47, 0, 0, TAU));
  const hair = P2(q => { q.moveTo(-38, -348); q.bezierCurveTo(-56, -300, -66, -240, -70, -200); q.lineTo(-44, -226); q.lineTo(44, -226); q.lineTo(70, -200); q.bezierCurveTo(66, -240, 56, -300, 38, -348); q.closePath(); });
  const lotus = []; for (let i = -2; i <= 2; i++) lotus.push(P2(q => { const a = i * .42 - Math.PI / 2, x = -50, y = -198; q.moveTo(x, y); q.quadraticCurveTo(x + Math.cos(a - .35) * 30, y + Math.sin(a - .35) * 30, x + Math.cos(a) * 40, y + Math.sin(a) * 40); q.quadraticCurveTo(x + Math.cos(a + .35) * 30, y + Math.sin(a + .35) * 30, x, y); }));
  g.globalAlpha = la; halo(g, 0, -326, 78, la);
  if (lb > 0) { g.globalAlpha = lb;
    fillC(g, hair, HAIR); fillC(g, lap, VERM, VERM_D, 10); fillC(g, torso, VERDI, VERDI_D, 9); fillC(g, pallu, VERM, VERM_D, 7);
    fillC(g, neck, SKIN_F); fillC(g, head, SKIN_F, SKIN_F_D, 5); fillC(g, armR, SKIN_F, SKIN_F_D, 5); fillC(g, armL, SKIN_F, SKIN_F_D, 5);
    lotus.forEach((p, i) => fillC(g, p, i % 2 ? ROSE : '#e99aa6', ROSE_D, 3)); fillC(g, handR, SKIN_F, SKIN_F_D, 3); fillC(g, handL, SKIN_F, SKIN_F_D, 3);
  }
  if (lc > 0) { g.globalAlpha = lc;
    [lap, torso, pallu, armR, armL, head, handR, handL, ...lotus].forEach(p => ink(g, p, 2.2));
    frontFace(g, 0, -326, 37, 47, { bindi: true });
    g.strokeStyle = HAIR; g.lineWidth = 3; g.beginPath(); g.moveTo(-34, -352); g.quadraticCurveTo(0, -374, 34, -352); g.stroke();
    g.strokeStyle = VERM; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, -372); g.lineTo(0, -362); g.stroke();   // sindoor in the parting
    for (const dx of [-56, -18, 22, 58]) { g.strokeStyle = 'rgba(120,20,10,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(dx * .5, -104); g.quadraticCurveTo(dx * .9, -40, dx * 1.15, 22); g.stroke(); }
    hiLine(g, [[-40, -112], [-96, -40], [-110, 6]], 2, .6); hiLine(g, [[-50, -232], [-16, -246], [30, -246]], 2, .7);
    pearlLine(g, [[-108, 28], [0, 40], [108, 28]], 11, 2.2, .9); triad(g, 0, -150, 2, .9); triad(g, -60, -30, 2, .9); triad(g, 64, -30, 2, .9);
  }
  g.globalAlpha = la;
  leafCord(g, P2(q => { q.moveTo(-117, 14); q.bezierCurveTo(-112, 44, -66, 48, 0, 38); q.bezierCurveTo(66, 48, 112, 44, 117, 14); }), 7, { ink: 2.2 });   // zari border
  leafCord(g, P2(q => { q.moveTo(-56, -232); q.bezierCurveTo(-24, -210, 4, -170, 10, -120); }), 5, { ink: 2 });
  necklaces(g, 0, -246, 30);
  const crown = P2(q => { q.moveTo(-36, -350); q.lineTo(-38, -384); q.lineTo(-20, -372); q.lineTo(-10, -404); q.lineTo(0, -380); q.lineTo(10, -404); q.lineTo(20, -372); q.lineTo(38, -384); q.lineTo(36, -350); q.quadraticCurveTo(0, -362, -36, -350); q.closePath(); });
  leaf(g, crown, [-38, -404, 76, 54], { lw: 2, rimW: 3 }); pearlLine(g, [[-32, -356], [32, -356]], 8, 1.8, .9); gpush(0, -378, 70, 1);
  for (const s of [-1, 1]) leafCord(g, P2(q => q.arc(s * 38, -304, 6.5, 0, TAU)), 3.2, { ink: 1.4 });
  leafCord(g, P2(q => q.arc(-9, -318, 4, 0, TAU)), 1.8, { ink: 1 });   // nose ring
  for (const [ax, ay] of [[-74, -186], [76, -186]]) leafCord(g, P2(q => { q.moveTo(ax - 11, ay); q.lineTo(ax + 11, ay + 2); }), 5, { ink: 1.8 });
  g.restore();
}
function drawLakshmana(g, k) {
  const [la, lb, lc] = L3(k); if (la <= 0) return;
  g.save(); g.translate(LAKS.x, LAKS.y);
  const dhoti = P2(q => { q.moveTo(-50, -302); q.bezierCurveTo(-60, -220, -58, -110, -52, -22); q.lineTo(52, -22); q.bezierCurveTo(58, -110, 60, -220, 50, -302); q.closePath(); });
  const torso = P2(q => { q.moveTo(-46, -300); q.bezierCurveTo(-50, -350, -62, -394, -60, -418); q.bezierCurveTo(-44, -436, -20, -442, -11, -446); q.lineTo(11, -446); q.bezierCurveTo(20, -442, 44, -436, 60, -418); q.bezierCurveTo(62, -394, 50, -350, 46, -300); q.closePath(); });
  const armR = tubePath([[-56, -412], [-84, -334], [-90, -268]], [26, 21, 17]), fistR = P2(q => q.ellipse(-92, -262, 13, 13, 0, 0, TAU));
  const armL = tubePath([[56, -412], [84, -340], [62, -290]], [26, 21, 17]), handL = P2(q => q.ellipse(56, -288, 13, 12, .5, 0, TAU));
  const feet = [-1, 1].map(s => P2(q => q.ellipse(s * 24, -10, 22, 10, 0, 0, TAU)));
  const neck = P2(q => q.rect(-13, -474, 26, 34)), head = P2(q => q.ellipse(0, -512, 38, 48, 0, 0, TAU));
  const hair = P2(q => { q.moveTo(-38, -532); q.bezierCurveTo(-58, -480, -66, -436, -70, -402); q.lineTo(-44, -416); q.lineTo(44, -416); q.lineTo(70, -402); q.bezierCurveTo(66, -436, 58, -480, 38, -532); q.closePath(); });
  const ears = [-1, 1].map(s => P2(q => q.ellipse(s * 38, -512, 7.5, 12, 0, 0, TAU)));
  g.globalAlpha = la; halo(g, 0, -512, 76, la);
  if (lb > 0) { g.globalAlpha = lb;
    fillC(g, hair, HAIR); fillC(g, dhoti, VERDI, VERDI_D, 10); fillC(g, torso, SKIN_F, SKIN_F_D, 10); fillC(g, neck, SKIN_F); ears.forEach(e => fillC(g, e, SKIN_F, SKIN_F_D, 3));
    fillC(g, head, SKIN_F, SKIN_F_D, 5); fillC(g, armR, SKIN_F, SKIN_F_D, 6); fillC(g, armL, SKIN_F, SKIN_F_D, 6); fillC(g, fistR, SKIN_F, SKIN_F_D, 3); fillC(g, handL, SKIN_F, SKIN_F_D, 3);
    feet.forEach(f => fillC(g, f, SKIN_F, SKIN_F_D, 3));
    const sash = P2(q => { q.moveTo(-50, -308); q.quadraticCurveTo(0, -296, 50, -308); q.lineTo(52, -288); q.quadraticCurveTo(0, -276, -52, -288); q.closePath(); }); fillC(g, sash, VERM, VERM_D, 4);
  }
  if (lc > 0) { g.globalAlpha = lc;
    [dhoti, torso, armR, armL, fistR, handL, head, ...ears, ...feet].forEach(p => ink(g, p, 2.4));
    frontFace(g, 0, -512, 38, 48, { tilak: true });
    g.strokeStyle = 'rgba(251,246,234,.9)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-48, -416); g.quadraticCurveTo(-4, -350, 40, -304); g.stroke();
    g.strokeStyle = VERDI_D; g.lineWidth = 2.2; for (const dx of [-26, 0, 26]) { g.beginPath(); g.moveTo(dx, -280); g.quadraticCurveTo(dx * 1.1, -150, dx * 1.2, -26); g.stroke(); }
    hiLine(g, [[-46, -296], [-54, -160], [-48, -30]], 2.2, .65); hiLine(g, [[-40, -410], [-30, -360], [-38, -308]], 2, .6);
    pearlLine(g, [[-48, -34], [48, -34]], 10, 2.2, .9); triad(g, -24, -200, 2, .9); triad(g, 26, -130, 2, .9);
  }
  g.globalAlpha = la;
  bow(g, -104, -560, -40, -40); ink(g, fistR, 2.2);
  leafCord(g, P2(q => { q.moveTo(-50, -26); q.lineTo(50, -26); }), 6, { ink: 2 });
  necklaces(g, 0, -432, 32); kireeta(g, 0, -544, 37, 84);
  for (const s of [-1, 1]) leafCord(g, P2(q => q.arc(s * 40, -490, 6.5, 0, TAU)), 3.2, { ink: 1.4 });
  for (const [ax, ay] of [[-72, -376], [72, -376]]) leafCord(g, P2(q => { q.moveTo(ax - 12, ay); q.lineTo(ax + 12, ay + 2); }), 6, { ink: 2 });
  g.restore();
}
function drawHanuman(g, k) {
  const [la, lb, lc] = L3(k); if (la <= 0) return;
  g.save(); g.translate(HANU.x, HANU.y);   // kneels facing Rama (left), hands joined
  const tail = tubePath([[36, -60], [96, -40], [150, -60], [168, -120], [146, -160], [124, -146]], [20, 18, 15, 12, 10, 8]);
  const backLeg = tubePath([[14, -150], [28, -14], [88, -10]], [44, 34, 22]), frontLeg = tubePath([[0, -150], [-62, -116], [-64, -14]], [44, 34, 26]);
  const footF = P2(q => q.ellipse(-76, -10, 26, 11, 0, 0, TAU));
  const torso = P2(q => { q.moveTo(-34, -160); q.bezierCurveTo(-50, -210, -54, -262, -40, -292); q.bezierCurveTo(-20, -306, 18, -306, 30, -286); q.bezierCurveTo(40, -240, 38, -200, 34, -160); q.closePath(); });
  const chest = P2(q => q.ellipse(-12, -236, 22, 36, -.1, 0, TAU));
  const cloth = P2(q => { q.moveTo(-40, -176); q.quadraticCurveTo(0, -164, 40, -172); q.lineTo(46, -128); q.quadraticCurveTo(0, -112, -46, -130); q.closePath(); });
  const arm = tubePath([[-24, -282], [-46, -210], [-62, -246]], [24, 20, 16]), hands = P2(q => q.ellipse(-64, -262, 11, 24, -.15, 0, TAU));
  const head = P2(q => q.arc(-14, -338, 40, 0, TAU)), muzzle = P2(q => q.ellipse(-44, -322, 24, 20, -.1, 0, TAU)), facePlate = P2(q => q.ellipse(-30, -344, 24, 20, 0, 0, TAU));
  const ear = P2(q => q.ellipse(14, -342, 9, 13, 0, 0, TAU));
  const gadaShaft = polyPath([[70, -14], [92, -214]]), gadaHead = P2(q => q.ellipse(94, -236, 24, 30, .1, 0, TAU));
  g.globalAlpha = la; halo(g, -14, -340, 70, la);
  if (lb > 0) { g.globalAlpha = lb;
    fillC(g, tail, HAN, HAN_D, 5); fillC(g, backLeg, HAN, HAN_D, 8); fillC(g, torso, HAN, HAN_D, 9); fillC(g, chest, HAN_L, '#d9a080', 4); fillC(g, cloth, VERM, VERM_D, 5);
    fillC(g, frontLeg, HAN, HAN_D, 8); fillC(g, footF, HAN_L, '#d9a080', 3); fillC(g, arm, HAN, HAN_D, 6); fillC(g, hands, HAN_L, '#d9a080', 3);
    fillC(g, ear, HAN_L, '#d9a080', 3); fillC(g, head, HAN, HAN_D, 6); fillC(g, facePlate, HAN_L, '#d9a080', 4); fillC(g, muzzle, HAN_L, '#d9a080', 4);
  }
  if (lc > 0) { g.globalAlpha = lc;
    [tail, backLeg, torso, cloth, frontLeg, footF, arm, hands, ear, head, facePlate, muzzle].forEach(p => ink(g, p, 2.4));
    const e = P2(q => almond(q, -34, -348, 9, 5)); g.fillStyle = WHITE; g.fill(e); g.fillStyle = '#20140c'; g.beginPath(); g.arc(-37, -348, 2.8, 0, TAU); g.fill(); ink(g, e, 1.5);
    g.strokeStyle = HAN_D; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-50, -358); g.quadraticCurveTo(-34, -368, -18, -360); g.stroke();
    g.strokeStyle = '#5a3420'; g.lineWidth = 2; g.beginPath(); g.moveTo(-66, -314); g.quadraticCurveTo(-50, -306, -30, -312); g.stroke();
    g.fillStyle = '#5a3420'; g.beginPath(); g.arc(-62, -330, 2.4, 0, TAU); g.fill();
    g.strokeStyle = VERM; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-30, -372); g.lineTo(-30, -360); g.stroke();   // tilak
    hiLine(g, [[-38, -290], [-48, -230], [-36, -170]], 2, .6); hiLine(g, [[100, -50], [146, -64], [160, -114]], 1.8, .55);
    triad(g, 24, -230, 2, .9); triad(g, 50, -60, 2, .9); pearlLine(g, [[-40, -134], [42, -134]], 10, 2, .9);
  }
  g.globalAlpha = la;
  g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 10 + 3 * LWK; g.stroke(gadaShaft); leafCord(g, gadaShaft, 9, { ink: 0 });
  leaf(g, gadaHead, [70, -266, 48, 60], { lw: 2.2, rimW: 5 }); leafCord(g, P2(q => { q.moveTo(72, -236); q.quadraticCurveTo(94, -228, 116, -238); }), 3.5, { ink: 1.6 }); gpush(94, -240, 60, 1);
  const cap = P2(q => { q.moveTo(-50, -366); q.quadraticCurveTo(-40, -400, -14, -406); q.quadraticCurveTo(12, -400, 22, -370); q.quadraticCurveTo(-14, -380, -50, -366); q.closePath(); });
  leaf(g, cap, [-50, -406, 72, 40], { lw: 2, rimW: 3 }); gpush(-14, -390, 50, 1);
  leafCord(g, P2(q => { q.moveTo(-40, -280); q.quadraticCurveTo(-12, -258, 22, -282); }), 4.5, { ink: 1.8 });
  leafCord(g, P2(q => { q.moveTo(-58, -236); q.lineTo(-38, -230); }), 5, { ink: 1.8 });
  g.restore();
}

// ---------------------------------------------------------------- the diya and the spark
function flameT(t) { const f = Math.floor(t * 12) % 4; return [[0, 0], [1.6, 2.5], [-1.2, -1], [.8, 1.6]][f]; }
function drawDiya(g, t) {
  const { x, y } = DIYA;
  const bowl = P2(q => { q.moveTo(x - 46, y - 14); q.quadraticCurveTo(x - 40, y + 14, x, y + 16); q.quadraticCurveTo(x + 40, y + 14, x + 56, y - 18); q.lineTo(x + 40, y - 14); q.quadraticCurveTo(x, y - 8, x - 46, y - 14); q.closePath(); });
  const foot = P2(q => { q.moveTo(x - 20, y + 14); q.lineTo(x + 20, y + 14); q.lineTo(x + 26, y + 26); q.lineTo(x - 26, y + 26); q.closePath(); });
  leaf(g, foot, [x - 26, y + 14, 52, 12], { lw: 2, rimW: 2 }); leaf(g, bowl, [x - 46, y - 18, 102, 34], { lw: 2.2, rimW: 4 }); gpush(x, y, 70, .9);
  if (t > T_SPARK && t < TOUCH + .05) return;   // the flame has left the lamp (it becomes the spark)
  const [wob, hgt] = flameT(t), fx = x + 46, fy = y - 18, back = seg(t, TOUCH + .05, TOUCH + .5);
  const s = t > TOUCH ? ss(back) : 1;
  const fl = (w, h, c) => { const p = P2(q => { q.moveTo(fx, fy + 3); q.bezierCurveTo(fx - w, fy, fx - w * .7, fy - h * .5, fx + wob, fy - h - hgt); q.bezierCurveTo(fx + w * .7, fy - h * .5, fx + w, fy, fx, fy + 3); }); g.fillStyle = c; g.fill(p); return p; };
  const p1 = fl(11 * s, 30 * s, VERM); g.strokeStyle = 'rgba(42,26,16,.7)'; g.lineWidth = 1.3; g.stroke(p1); fl(7 * s, 20 * s, OCHRE_L); fl(3.5 * s, 10 * s, WHITE);
}
const flameTip = () => [DIYA.x + 46, DIYA.y - 40];
function sparkAt(t) {   // up the gap between Rama and Sita, to the right edge of his halo
  const u = eio(seg(t, T_SPARK, TOUCH)), [x0, y0] = flameTip();
  const x = lerp(x0, CONTACT.x, u) + Math.sin(u * Math.PI) * -22, y = lerp(y0, CONTACT.y, u);
  return [x, y];
}

// ---------------------------------------------------------------- plaque
const PLQ = { cx: 960, cy: 985, hh: 52 }, TITLE = 'SHRI RAM PARIVAR';
function drawPlaque(g, t) {
  const k = ss(seg(t, T_PLQ, T_PLQ + .3)); if (k <= 0) return;
  g.font = '60px Uncial'; const tw = g.measureText(TITLE).width, HW = tw / 2 + 70, hw = HW * (.3 + .7 * eo(k)), { cx, cy, hh } = PLQ;
  const outer = P2(q => q.roundRect(cx - hw, cy - hh, hw * 2, hh * 2, 26));
  leaf(g, outer, [cx - hw, cy - hh, hw * 2, hh * 2], { lw: 2.6, rimW: 6 });
  const inner = P2(q => q.rect(cx - hw + 18, cy - hh + 14, hw * 2 - 36, hh * 2 - 28));
  g.fillStyle = VELL; g.fill(inner); g.save(); g.clip(inner); g.globalAlpha = .45; g.fillStyle = g.__sp || (g.__sp = g.createPattern(SPKC, 'repeat')); g.fillRect(cx - hw, cy - hh, hw * 2, hh * 2); g.restore();
  rimShade(g, inner, '#cdb88c', 10); ink(g, inner, 2.2); maskErase(g, inner);
  const w = seg(t, T_WRITE, T_WRITE + .55); if (w <= 0) return;
  g.save(); g.beginPath(); g.rect(cx - tw / 2 - 6, cy - 60, (tw + 12) * eio(w), 120); g.clip();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#4a2c16'; g.font = '60px Uncial'; g.fillText(TITLE, cx, cy + 4);
  g.restore();
  if (w > 0) reg('title', TITLE, g, cx - tw / 2, cy - 34, cx + tw / 2, cy + 38);
}

// ---------------------------------------------------------------- light (glint pass from the style's film.js)
let FR, FRg, MC, MCg;
function resetCtx(g) { if (g.reset) g.reset(); g.__gp = g.__sp = g.__paint = g.__gf = g.__gff = null; }
function lightAt(lights, x, y) {
  let v = 0; for (const L of lights) {
    if (L.type === 'r') { const d = Math.hypot(x - L.x, y - L.y) / L.r; if (d < 1) v += L.a * Math.pow(1 - d, 1.4); }
    else if (L.type === 'b') { const d = ((x - L.x) * L.nx + (y - L.y) * L.ny) / L.w; v += L.a * Math.exp(-d * d); }
    else if (L.type === 'o') { const d = (Math.hypot(x - L.x, y - L.y) - L.rad) / L.w; v += L.a * Math.exp(-d * d); }
  } return v;
}
let GW, GWg, GWD, GWI;
function glintPass(M, lights, amb) {
  if (!lights.length && amb <= 0) { if (GWD) GWD.fill(0); return; }
  const md = MCg.getImageData(0, 0, W, H).data, img = ctx.getImageData(0, 0, W, H), fd = img.data;
  if (!GW) { GW = cnv(W / 4, H / 4); GWg = GW.getContext('2d'); GWD = new Float32Array(W / 4 * H / 4); GWI = GWg.createImageData(W / 4, H / 4); }
  GWD.fill(0); const QW = W / 4;
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
  ctx.filter = 'blur(10px)'; ctx.globalAlpha = .5; ctx.drawImage(GW, 0, 0, W, H); ctx.filter = 'blur(36px)'; ctx.globalAlpha = .45; ctx.drawImage(GW, 0, 0, W, H);
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

// ---------------------------------------------------------------- timeline
const cam = track([[0, [960, 760, Math.log(2.0)]], [.6, [960, 742, Math.log(1.9)]], [2.7, [960, 540, Math.log(1.0)]], [3.33, [948, 522, Math.log(1.04)]], [4.3, [960, 540, Math.log(1.0)]], [6, [960, 540, Math.log(1.0)]]]);
function lightsAt(t) {
  const L = [], [fx, fy] = flameTip(), fl = .45 + .08 * Math.sin(t * 23) * Math.sin(t * 7.3);
  if (!(t > T_SPARK && t < TOUCH + .05)) L.push({ type: 'r', x: fx, y: fy, r: 300, a: fl * (t > TOUCH ? ss(seg(t, TOUCH + .05, TOUCH + .5)) : 1) });
  if (t > T_SPARK && t <= TOUCH + .05) { const [sx, sy] = sparkAt(t); L.push({ type: 'r', x: sx, y: sy, r: 220, a: .85 }); }
  if (t > TOUCH) {
    const u = t - TOUCH;
    L.push({ type: 'r', x: CONTACT.x, y: CONTACT.y, r: 260, a: .9 * eo(seg(u, 0, .15)) * (1 - .45 * ss(seg(u, .4, 1.6))) });
    for (const [d, a] of [[0, 1.05], [.28, .8]]) { const v = seg(u, d, d + 1.7); if (v > 0 && v < 1) L.push({ type: 'o', x: CONTACT.x, y: CONTACT.y, rad: 1500 * eo(v), w: 70, a: a * (1 - .5 * v) }); }
  }
  if (t > T_RAKE - .2) { const v = seg(t, T_RAKE - .2, DUR); L.push({ type: 'b', x: lerp(-250, 2250, ss(v)), y: 540, nx: .9, ny: .44, w: 190, a: .85 }); }
  return L;
}
function render(t) {
  t = clamp(t, 0, DUR - 1e-4); TX = [];
  const [cx, cy, lz] = cam(t), C = { x: cx, y: cy, z: Math.exp(lz), r: 0 };
  resetCtx(FRg); MCg.setTransform(1, 0, 0, 1, 0, 0); MCg.clearRect(0, 0, W, H);
  MK = { g: MCg, pre: new DOMMatrix(), col: '#fff' };
  const M = camMatrix(C); setZoom(C.z); FRg.setTransform(M);
  DIM = t < TOUCH ? .85 : lerp(.85, .3, ss(seg(t, TOUCH, TOUCH + 1.2))); GP = [];
  drawGround(FRg); drawArch(FRg, t); drawFloor(FRg); drawThrone(FRg);
  drawLakshmana(FRg, seg(t, T_LK, T_LK + .62)); drawRama(FRg, seg(t, T_RS, T_RS + .62)); drawSita(FRg, seg(t, T_RS + .08, T_RS + .7));
  drawHanuman(FRg, seg(t, T_HN, T_HN + .62)); drawDiya(FRg, t); drawBorder(FRg); drawPlaque(FRg, t);
  FRg.setTransform(1, 0, 0, 1, 0, 0); FRg.save(); FRg.globalCompositeOperation = 'multiply'; FRg.globalAlpha = .14; FRg.fillStyle = FRg.createPattern(GRAINC, 'repeat'); FRg.fillRect(0, 0, W, H); FRg.restore();
  MK = null;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(FR, 0, 0);
  const lights = lightsAt(t), amb = t < TOUCH ? .05 : lerp(.05, .28, ss(seg(t, TOUCH, TOUCH + 1.1)));
  glintPass(M, lights, amb); glowPass(.55); flashes(M, lights);
  // the lamp's warm pool and the spark itself
  ctx.setTransform(M); ctx.globalCompositeOperation = 'lighter';
  const pools = []; if (!(t > T_SPARK && t < TOUCH + .05)) pools.push([...flameTip(), 56, .28]); if (t > T_SPARK && t <= TOUCH + .05) pools.push([...sparkAt(t), 46, .8]);
  for (const [x, y, r, a] of pools) { const rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(255,224,160,${a})`); rg.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  if (t > T_SPARK && t <= TOUCH + .05) { const [x, y] = sparkAt(t); ctx.fillStyle = 'rgba(255,250,232,.95)'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over'; ctx.setTransform(1, 0, 0, 1, 0, 0);
  const v = ctx.createRadialGradient(W * .5, H * .45, H * .42, W / 2, H / 2, H * 1.05); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,20,5,.24)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
function buildEvents() {
  const ev = [], E = (t, type, o = {}) => ev.push({ t: +t.toFixed(3), type, ...o });
  E(0, 'flame'); E(T_ARCH, 'arch'); E(T_RS, 'paint', { i: 0 }); E(T_LK, 'paint', { i: 1 }); E(T_HN, 'paint', { i: 2 }); E(B(4), 'silence');
  E(T_PLQ, 'plaque'); E(T_WRITE, 'write'); E(T_SPARK, 'spark'); E(TOUCH, 'touch'); E(T_RAKE, 'rake'); E(T_CHORD, 'chord');
  return ev;
}

(async () => {
  await document.fonts.load('60px Uncial', TITLE);
  GOLDC = makeGold(); GOLDF = makeGoldFine(512, 3, 1); GOLDFF = makeGoldFine(1024, 9, 1.6); SPKC = makeSpk(); GRAINC = makeGrain(); PAINTC = makePaint();
  STARS = archStars();
  FR = cnv(W, H); FRg = FR.getContext('2d'); MC = cnv(W, H); MCg = MC.getContext('2d', { willReadFrequently: true });
  window.DUR = DUR; window.render = render; window.EV = buildEvents();
  window.TEXTS = t => { render(t); return TX.map(o => ({ ...o })); };
  render(Q.get('t') ? +Q.get('t') : 5.5); window.READY = true;
})();
