'use strict';
// Valmiki Ramayana · Bala Kanda · Sarga 1 · Part 1, in Gilded Illumination.
// Composition of one frame: scene(s) under their cameras → cloud-bank wipe → speech scroll → border → grain →
// light on gold (glint pass, glow, star flashes, lamp pools). Every motion runs at the tempo in PACE (paint.js).

let TL = null;
const SUB = { cx: 960, cy: 952, w: 1400, h: 104, size: 36 };
const NO_SUB = new Set(['coldopen', 'title']);

function sceneAt(t) { const s = TL.scenes; let i = 0; while (i + 1 < s.length && t >= s[i + 1].start) i++; return i; }
function camOf(i, t) {
  const sc = TL.scenes[i], S = SCN[sc.type], [fx, fy] = S.focus, dir = i % 2 ? 1 : -1;
  const z = S.zoomDir === -1 ? Math.exp(PACE.ZOOM * Math.max(0, sc.end - t)) : Math.exp(PACE.ZOOM * (t - sc.start + PACE.WIPE));
  const [ax, ay] = S.anchor || S.focus;   // the push zooms about the anchor; the framing at zoom 1 is set by focus
  return { x: ax + (fx - ax) / z + dir * PACE.DRIFT * (t - sc.start), y: ay + (fy - ay) / z, z, r: 0 };
}
const toScr = (M, x, y) => [M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f];
function lightsToScreen(M, Ls) { const z = Math.hypot(M.a, M.b);
  return Ls.map(L => { const [x, y] = toScr(M, L.x, L.y); return L.type === 'r' ? { ...L, x, y, r: L.r * z } : L.type === 'o' ? { ...L, x, y, rad: L.rad * z, w: L.w * z } : { ...L, x, y, w: L.w * z }; }); }

// draw scene i into FR (with the gold mask), clipped to a screen region
function drawScene(i, t, clipFn) {
  const sc = TL.scenes[i], S = SCN[sc.type], M = camMatrix(camOf(i, t));
  if (!sc.L) { S.build(sc); sc._built = true; }
  for (const o of TL.scenes) if (o.L && (o.end < t - 4 || o.start > t + 4)) o.L = null;   // keep memory small: only nearby scenes stay cached
  for (const g of [FRg, MCg]) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); if (clipFn) { g.beginPath(); clipFn(g); g.clip(); } }
  const n0 = GP.length; setZoom(Math.hypot(M.a, M.b)); FRg.setTransform(M);
  S.draw(FRg, t, sc);
  for (let k = n0; k < GP.length; k++) { const p = GP[k], [x, y] = toScr(M, p.x, p.y); GP[k] = { x, y, r: p.r * Math.hypot(M.a, M.b), k: p.k }; }
  for (const g of [FRg, MCg]) g.restore();
  let L = lightsToScreen(M, S.lights(t, sc)); const pools = (S.pools ? S.pools(t, sc) : []).map(([x, y, r, a]) => { const [X, Y] = toScr(M, x, y); return [X, Y, r * Math.hypot(M.a, M.b), a]; });
  if (!(S.noRake && S.noRake(t, sc))) { const rk = rake(t); if (rk) L.push(rk); }
  return { M, L, pools };
}
// the cloud bank: a column of scalloped clouds that crosses the frame at one speed, carrying the cut
function cloudBank(g, x) {
  const R = mulberry(5), hw = 210;
  for (const side of [1, -1]) {
    const p = P2(q => { q.moveTo(x, -40); for (let y = -40; y < H + 80; y += 120) { const r = 60 + R() * 18; q.arc(x + side * (hw - r * .3), y + 60, r, -Math.PI / 2, Math.PI / 2, side < 0); } q.lineTo(x, H + 80); q.closePath(); });
    paint(g, p, AZUR_L, AZUR, 14, 2.6);
  }
  const core = P2(q => q.rect(x - hw * .72, -40, hw * 1.44, H + 120)); g.fillStyle = AZUR_L; g.fill(core); maskErase(g, core);
  for (let y = 20; y < H; y += 120) { hiLine(g, [[x - 80, y], [x - 20, y - 18], [x + 40, y]], 2.4, .8); triad(g, x + 60, y + 50, 2.4, .85); triad(g, x - 90, y + 70, 2.2, .8); }
}

// ---------------------------------------------------------------- the speech scroll: fixed place, fixed size
let CAPS = [], RUNS = [];
function prepSubs() {
  CAPS = TL.captions.filter(c => !NO_SUB.has(c.scene));
  let wmax = 0; for (const c of CAPS) { c.lines = wrapWords(c.text, 'noto', SUB.size, 1360).slice(0, 2); for (const l of c.lines) wmax = Math.max(wmax, tw(l, 'noto', SUB.size)); }
  SUB.w = clamp(wmax + 130, 900, 1520);
  RUNS = []; for (const c of CAPS) { const r = RUNS[RUNS.length - 1]; if (r && c.start - r.end < 1.5) { r.end = c.end; r.caps.push(c); } else RUNS.push({ start: c.start, end: c.end, caps: [c] }); }
}
function capChars(c, t) {   // characters of caption c spoken by time t (interpolated between word starts)
  const W = (c.wt && c.wt.length ? c.wt : [[0, c.start]]).map((w, k) => k ? w : [w[0], Math.max(w[1], c.start)]), n = c.text.length; if (t < W[0][1]) return 0;
  for (let k = 0; k < W.length; k++) { const a = W[k], b = W[k + 1] || [n, Math.max(c.end, a[1] + .3)]; if (t < b[1]) return lerp(a[0], b[0], clamp((t - a[1]) / Math.max(.05, b[1] - a[1]))); }
  return n;
}
function subtitles(g, t) {
  const run = RUNS.find(r => t >= r.start - PACE.SCROLL && t < r.end + .3 + PACE.SCROLL); if (!run) return;
  const open = Math.min(clamp((t - run.start + PACE.SCROLL) / PACE.SCROLL), clamp((run.end + .3 + PACE.SCROLL - t) / PACE.SCROLL));
  scroll(g, SUB.cx, SUB.cy, SUB.w, SUB.h, open); if (open < 1) return;
  const i = run.caps.findIndex((c, k) => t >= c.start && (k + 1 === run.caps.length || t < run.caps[k + 1].start)); if (i < 0) return;
  const c = run.caps[i], next = run.caps[i + 1], out = next ? 1 - clamp((t - next.start + .25) / .25) : 1 - clamp((t - c.end - .3) / .3);
  const lh = SUB.size * 1.42, y0 = SUB.cy - (c.lines.length - 1) * lh / 2 + SUB.size * .36;
  // the pen follows the voice: characters are written up to the word being spoken now (+ a short lead)
  const n = c.text.length, said = capChars(c, t + .15); let off = 0;
  c.lines.forEach((l, k) => { const u = clamp((said - off) / l.length); off += l.length + 1; inkText(g, l, SUB.cx, y0 + k * lh, SUB.size, { wipe: u, alpha: out, wt: 500, id: 'sub' }); });
  void n;
}

// ---------------------------------------------------------------- the border: gold outer, vermilion band with pearls, gold cord
let BORDER = null;
function makeBorder() { return cacheLayer(g => {
  const outer = P2(q => { q.rect(0, 0, W, H); q.rect(W - 22, 22, -(W - 44), H - 44); }), band = P2(q => { q.rect(22, 22, W - 44, H - 44); q.rect(W - 50, 50, -(W - 100), H - 100); });
  leaf(g, outer, [0, 0, W, H], { rule: 'evenodd', line: false, rim: false });
  g.fillStyle = VERM; g.fill(band, 'evenodd'); rimShade(g, band, VERM_D, 7); ink(g, band, 2.6); maskErase(g, band);
  for (const [a, b] of [[[36, 36], [W - 36, 36]], [[W - 36, H - 36], [36, H - 36]], [[36, H - 36], [36, 36]], [[W - 36, 36], [W - 36, H - 36]]]) pearlLine(g, [a, b], 24, 3.4, .9);
  leafCord(g, P2(q => q.rect(52, 52, W - 104, H - 104)), 5, { ink: 2.4 });
  for (const [x, y] of [[36, 36], [W - 36, 36], [36, H - 36], [W - 36, H - 36], [W / 2, 36], [W / 2, H - 36]]) { const s = P2(q => star8(q, x, y, 20, .42, 0)); leaf(g, s, [x - 20, y - 20, 40, 40], { lw: 1.6, rimW: 3 }); gpush(x, y, 44, .9); }
}); }

// ---------------------------------------------------------------- one frame
function render(t) {
  t = clamp(t, 0, TL.duration - 1e-3); TX = []; GP = [];
  resetCtx(FRg); MCg.setTransform(1, 0, 0, 1, 0, 0); MCg.clearRect(0, 0, W, H); FRg.setTransform(1, 0, 0, 1, 0, 0); FRg.fillStyle = ULTRA_D; FRg.fillRect(0, 0, W, H);
  MK = { g: MCg, pre: new DOMMatrix(), col: '#fff' }; DIM = .72;
  const i = sceneAt(t), sc = TL.scenes[i];
  // a wipe is centred on each scene boundary: the incoming scene is left of the cloud front, the outgoing one right of it
  let tr = null; const b0 = sc.start, b1 = i + 1 < TL.scenes.length ? TL.scenes[i + 1].start : 1e9;
  if (i > 0 && t < b0 + PACE.WIPE / 2) tr = { a: i - 1, b: i, u: (t - b0 + PACE.WIPE / 2) / PACE.WIPE };
  else if (t > b1 - PACE.WIPE / 2) tr = { a: i, b: i + 1, u: (t - b1 + PACE.WIPE / 2) / PACE.WIPE };
  let main, other = null, front = 0;
  if (tr) { front = lerp(-260, W + 260, tr.u);
    other = drawScene(tr.a, t, g => g.rect(front, 0, W - front + 1, H));
    main = drawScene(tr.b, t, g => g.rect(0, 0, front + 1, H));
    if (tr.u < .5) { const s = main; main = other; other = s; } }
  else main = drawScene(i, t);
  FRg.setTransform(1, 0, 0, 1, 0, 0); setZoom(1);
  if (tr) cloudBank(FRg, front);
  subtitles(FRg, t);
  drawCached(FRg, BORDER);
  FRg.save(); FRg.globalCompositeOperation = 'multiply'; FRg.globalAlpha = .12; FRg.fillStyle = FRg.createPattern(GRAINC, 'repeat'); FRg.fillRect(0, 0, W, H); FRg.restore();
  MK = null;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(FR, 0, 0);
  const lightsScr = main.L.concat(other ? other.L : []), Mm = main.M, zi = 1 / Math.hypot(Mm.a, Mm.b), inv = Mm.inverse();
  const lightsW = lightsScr.map(L => { const p = new DOMPoint(L.x, L.y).matrixTransform(inv); return L.type === 'r' ? { ...L, x: p.x, y: p.y, r: L.r * zi } : L.type === 'o' ? { ...L, x: p.x, y: p.y, rad: L.rad * zi, w: L.w * zi } : { ...L, x: p.x, y: p.y, w: L.w * zi }; });
  glintPass(Mm, lightsW, .13); glowPass(.28);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, a] of main.pools.concat(other ? other.pools : [])) if (a > 0) pool(x, y, r, a);
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(W * .5, H * .45, H * .42, W / 2, H / 2, H * 1.05); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,8,40,.25)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  return TX.map(o => ({ ...o, a: 1 }));
}

window.ready = (async () => {
  TL = await (await fetch(Q.get('timeline') || '../timeline.json')).json();
  await Promise.all(['400 60px Tiro', '500 36px NotoDeva', '400 40px NotoDeva', '400 40px Cinzel', '700 40px Cinzel'].map(f => document.fonts.load(f, 'अआ राम Aa')));
  GOLDC = makeGold(); GOLDF = makeGoldFine(512, 3, 1); GOLDFF = makeGoldFine(1024, 9, 1.6); SPKC = makeSpk(); GRAINC = makeGrain(); PAINTC = makePaint();
  FR = cnv(W, H); FRg = FR.getContext('2d'); MC = cnv(W, H); MCg = MC.getContext('2d', { willReadFrequently: true });
  let si = 0; for (const sc of TL.scenes) if (sc.type === 'shloka') sc.idx = si++;
  BORDER = makeBorder(); prepSubs();
  if (Q.has('t')) render(+Q.get('t'));
  return { duration: TL.duration, frames: TL.frames, fps: TL.fps };
})();
window.frame = render;

// sound cues, taken from the same timeline the picture uses (tools/events.mjs writes them to work/events.json)
window.events = () => {
  const ev = [], E = (t, type, o = {}) => ev.push({ t: +t.toFixed(3), type, ...o });
  TL.scenes.forEach((sc, i) => { if (i) E(sc.start - PACE.WIPE / 2, 'wipe', { to: sc.type });
    if (sc.type === 'coldopen') E(sc.start + .3, 'light');
    if (sc.type === 'ashram') { const nl = sc.lines.find(l => /नारद/.test(l.text)); if (nl) E(nl.start + .2, 'narada'); }
    if (sc.type === 'title') E(sc.lines[sc.lines.length - 1].start, 'title');
    if (sc.type === 'lotus') SCN.lotus.marks(sc).forEach((m, k) => E(m, 'petal', { k }));
    if (sc.type === 'rama') E(SCN.rama.touchT(sc), 'touch');
    if (sc.type === 'ayodhya') { E(sc.start, 'festive'); E(SCN.ayodhya.turn(sc), 'turn'); }
    if (sc.type === 'close') E(sc.start + 1, 'close');
    if (sc.type === 'endcard') { for (let x = sc.start + 2.4; x < sc.end - .5; x += 3.2) E(x, 'bell'); E(sc.start, 'end'); }
    if (sc.type === 'shloka') E(sc.lines.find(l => l.kind === 'shloka')?.start ?? sc.start, 'chant'); });
  return { duration: TL.duration, scenes: TL.scenes.map(s => ({ type: s.type, start: s.start, end: s.end })), ev };
};

// thumbnail (1920x1080, downscaled to 1280x720): the title lettered in leaf on a plaque, a large diya whose light lights the gold
window.thumb = () => {
  TX = []; GP = []; resetCtx(FRg); MCg.setTransform(1, 0, 0, 1, 0, 0); MCg.clearRect(0, 0, W, H);
  MK = { g: MCg, pre: new DOMMatrix(), col: '#fff' }; DIM = .7; setZoom(1); FRg.setTransform(1, 0, 0, 1, 0, 0);
  const L = nightLayer(7, [[100, 100, 1720, 900]], { stars: 26, spires: false, clouds: [[260, 560, 300, 84], [1660, 560, 300, 84]] });
  drawCached(FRg, L);
  plaque(FRg, 110, 110, 1700, 330, 1);
  goldText(FRg, 'रामायण · बालकाण्ड · सर्ग १', 960, 322, fitSize(['रामायण · बालकाण्ड · सर्ग १'], 'tiro', 150, 1520));
  goldText(FRg, 'VALMIKI RAMAYANA · PART 1', 960, 530, 46, { fam: 'cinzel' });
  medallion(FRg, 960, 780, 170, 1, q => lotusFlower(q, 960, 850, 135));
  valmiki(FRg, 430, 1000, 1.0, 1, 2, { ask: .8, look: .3 }); narada(FRg, 1520, 990, .9, -1, 1.2, { pluck: 0, talk: .2 });
  diya(FRg, 960, 1000, 1.2, 3.3, 1, 1);
  drawCached(FRg, BORDER); MK = null;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(FR, 0, 0);
  const lights = [diyaLight(960, 1000, 1.2, 3.3, .8, 700), { type: 'r', x: 440, y: 700, r: 360, a: .6 }, { type: 'r', x: 1510, y: 640, r: 360, a: .6 }, { type: 'b', x: 760, y: 300, nx: .9, ny: .44, w: 260, a: .8 }, { type: 'r', x: 960, y: 780, r: 320, a: .7 }];
  glintPass(new DOMMatrix(), lights, .16); glowPass(.28);
  ctx.globalCompositeOperation = 'lighter'; for (const [x, y, r, a] of [flamePool(960, 1000, 1.2, .35)]) pool(x, y, r, a); ctx.globalCompositeOperation = 'source-over';
};
