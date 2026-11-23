'use strict';
// Scene renderers. Each takes (g, t, sc): absolute time t (s) and its timeline scene sc {type, arg, start, end, lines}.
// Scene time comes only from timeline.json (built from the voiceover); no hand-set times except small visual lead-ins.

let TL = null;
const P = (t, sc) => clamp((t - sc.start) / Math.max(.001, sc.end - sc.start));
function cam(g, t, sc, z0 = 1, z1 = 1.06, cx = W / 2, cy = H / 2) { const z = lerp(z0, z1, eio(P(t, sc))); g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy); return z; }
const lineAt = (sc, k) => sc.lines.filter(l => l.kind === k);
// group a scene's lines into pages ('---' in the script starts a new page)
function pages(lines) { const out = []; for (const l of lines) { if (!out.length || l.page) out.push([]); out[out.length - 1].push(l); } return out; }
function fitSize(texts, fam, size, maxW, min = 30) { let s = size; while (s > min && Math.max(...texts.map(x => measure(x, fam, s).w)) > maxW) s -= 2; return s; }

// ------------------------------------------------------------------ 1. cold open: diya, palm leaf unrolls, the question
function leafShape(g, cx, cy, w, h) { const p = new Path2D(); p.moveTo(cx - w / 2 + h * .35, cy - h / 2); p.lineTo(cx + w / 2 - h * .35, cy - h / 2); p.quadraticCurveTo(cx + w / 2, cy - h / 2, cx + w / 2 + h * .06, cy); p.quadraticCurveTo(cx + w / 2, cy + h / 2, cx + w / 2 - h * .35, cy + h / 2);
  p.lineTo(cx - w / 2 + h * .35, cy + h / 2); p.quadraticCurveTo(cx - w / 2, cy + h / 2, cx - w / 2 - h * .06, cy); p.quadraticCurveTo(cx - w / 2, cy - h / 2, cx - w / 2 + h * .35, cy - h / 2); p.closePath(); return p; }
let LEAF = null;
function makeLeaf(w, h) {   // a long palm leaf (tala patra): warm umber, fibres, two binding holes, gold rules
  const c = mk(w + 40, h + 40, g => { g.translate(20, 20); const p = leafShape(g, w / 2, h / 2, w, h); g.save(); g.clip(p);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2b2238'); gr.addColorStop(.5, '#231b30'); gr.addColorStop(1, '#1a1426'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const R = mulberry(4); for (let i = 0; i < 160; i++) { const y = R() * h; g.strokeStyle = R() < .5 ? `rgba(234,217,176,${.03 + R() * .05})` : `rgba(0,0,0,${.08 + R() * .1})`; g.lineWidth = .6 + R(); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (R() - .5) * 4); g.stroke(); }
    g.restore(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3; g.stroke(p); });
  const l = mk(w + 40, h + 40, g => { g.translate(20, 20); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 2; g.stroke(leafShape(g, w / 2, h / 2, w - 14, h - 14));
    g.lineWidth = 1.2; for (const y of [26, h - 26]) { g.beginPath(); g.moveTo(h * .45, y); g.lineTo(w - h * .45, y); g.stroke(); }
    for (const x of [w * .22, w * .78]) { g.lineWidth = 2.4; g.beginPath(); g.arc(x, h / 2, 11, 0, TAU); g.stroke(); } });
  goldify(l, { texScale: .4, depth: 1 }); c.g.setTransform(S, 0, 0, S, 0, 0); c.g.drawImage(l, 0, 0, c.lw, c.lh);
  c.g.fillStyle = C.ink0; for (const x of [w * .22, w * .78]) { c.g.beginPath(); c.g.arc(20 + x, 20 + h / 2, 8, 0, TAU); c.g.fill(); }
  return c;
}
function sceneColdopen(g, t, sc) {
  const t0 = sc.start, lit = ss(seg(t, t0 + .1, t0 + 1.3));
  g.fillStyle = '#050409'; g.fillRect(0, 0, W, H);
  g.save(); g.globalAlpha = ss(seg(t, t0 + .8, t0 + 3)); backdrop(g, t, { palm: .5 }); g.restore();
  diyaLight(g, W / 2, 930, t, lit * 1.2, 1100);
  g.save(); cam(g, t, sc, 1, 1.04, W / 2, 520);
  // the leaf unrolls from the centre
  const lw = 1640, lh = 360, cy = 470, un = eio(seg(t, t0 + .7, t0 + 3.2));
  if (!LEAF) LEAF = makeLeaf(lw, lh);
  if (un > 0) { g.save(); const half = (lw / 2 + 40) * un; g.beginPath(); g.rect(W / 2 - half, 0, half * 2, H); g.clip();
    g.drawImage(LEAF, W / 2 - lw / 2 - 20, cy - lh / 2 - 20, LEAF.lw, LEAF.lh);
    // text pages on the leaf
    const pg = pages(sc.lines);
    pg.forEach((lines, pi) => {
      const pStart = lines[0].start, pEnd = pi + 1 < pg.length ? pg[pi + 1][0].start : sc.end + 1, out = 1 - ss(seg(t, pEnd - .5, pEnd + .1));
      if (t < pStart - .2 || out <= 0) return;
      const big = lines.length > 1, size = fitSize(lines.map(l => l.text), 'tiro', big ? 58 : 50, lw - 260), lhgt = size * 1.5, y0 = cy - (lines.length - 1) * lhgt / 2 + size * .35;
      lines.forEach((l, i) => { const L = textLayer(l.text, 'tiro', size, big ? 'gold' : 'cream', { glow: big ? 8 : 0 }); const tr = Math.max(l.start, t0 + 1.6);
        drawText(g, L, W / 2, y0 + i * lhgt, reveal(t, tr) * out, { dy: drift(t, tr), t, id: 'cold' }); });
    });
    g.restore();
    // rolled ends of the leaf
    for (const s of [-1, 1]) { const x = W / 2 + s * (lw / 2 * un); g.save(); const gr = g.createLinearGradient(x - 18, 0, x + 18, 0); gr.addColorStop(0, '#3a2c1a'); gr.addColorStop(.5, C.gold); gr.addColorStop(1, '#3a2c1a');
      g.globalAlpha = 1 - ss(seg(un, .96, 1)); g.fillStyle = gr; g.beginPath(); g.roundRect(x - 16, cy - lh / 2 - 8, 32, lh + 16, 14); g.fill(); g.restore(); }
  }
  g.restore();
  diya(g, W / 2 - 15, 930, .9, t, lit);
}

// ------------------------------------------------------------------ 1b. title card
function sceneTitle(g, t, sc) {
  backdrop(g, t); diyaLight(g, W / 2, 930, t, 1.1, 1100);
  g.save(); cam(g, t, sc, 1.0, 1.05);
  const ls = sc.lines, last = ls[ls.length - 1];
  for (let i = 0; i < ls.length - 1; i++) { const L = textLayer(ls[i].text, 'tiro', 46, 'cream'); drawText(g, L, W / 2, 360, reveal(t, ls[i].start) * (1 - .5 * reveal(t, last.start)), { dy: drift(t, ls[i].start), id: 'title-pre' }); }
  const T = textLayer('वाल्मीकि रामायण · बालकाण्ड · सर्ग १', 'tiro', 104, 'gold', { glow: 16 }), tr = last ? last.start : sc.start + 1;
  drawText(g, T, W / 2, 560, reveal(t, tr, 1.4), { dy: drift(t, tr, 1.6, 18), t, period: 5, phase: -tr - 1.2, id: 'title' });
  const sub = textLayer('VALMIKI RAMAYANA · BALA KANDA · SARGA 1', 'cinzel', 34, 'gold'); drawText(g, sub, W / 2, 660, reveal(t, tr + .8, 1.4), { id: 'title-sub' });
  rule(g, W / 2, 712, 520, reveal(t, tr + .6, 1.6));
  g.restore();
  diya(g, W / 2 - 15, 930, .9, t, 1);
}
// an ornamental gold rule with a small lotus at its centre (drawn growing outward by k)
let RULE = null;
function rule(g, cx, y, w, k = 1) {
  if (k <= 0) return;
  if (!RULE) RULE = goldify(mk(1000, 60, q => { q.fillStyle = '#fff'; q.strokeStyle = '#fff'; q.lineWidth = 2; q.beginPath(); q.moveTo(40, 30); q.lineTo(455, 30); q.moveTo(545, 30); q.lineTo(960, 30); q.stroke();
    q.lineWidth = 1; q.beginPath(); q.moveTo(120, 36); q.lineTo(455, 36); q.moveTo(545, 36); q.lineTo(880, 36); q.stroke();
    for (const x of [30, 970]) { q.beginPath(); q.moveTo(x, 22); q.lineTo(x + 8, 30); q.lineTo(x, 38); q.lineTo(x - 8, 30); q.fill(); }
    const p = new Path2D(); lotusPath(p, 500, 40, 34, 7); q.fill(p); }), { texScale: .4, depth: 1 });
  g.save(); g.beginPath(); g.rect(cx - w / 2 * k, y - 40, w * k, 80); g.clip(); g.drawImage(RULE, cx - w / 2, y - 30 * w / 1000 - 4, w, 60 * w / 1000 + 8); g.restore();
}

// ------------------------------------------------------------------ 2. channel intro: धर्म मंजरी
function sceneIntro(g, t, sc) {
  backdrop(g, t); diyaLight(g, W / 2, 1000, t, .9, 1200);
  g.save(); cam(g, t, sc, 1, 1.04);
  const t0 = sc.lines.length ? sc.lines[0].start : sc.start, wipe = eio(seg(t, t0 + .3, t0 + 2.6));
  // lotus with manjari spikes behind the name
  const lk = ss(seg(t, t0, t0 + 1.8));
  if (!ART.introLotus) ART.introLotus = goldify(mk(900, 420, q => { q.fillStyle = '#fff'; const p = new Path2D(); lotusPath(p, 450, 400, 330, 9, Math.PI * .95); q.fill(p);
    q.globalCompositeOperation = 'destination-out'; const p2 = new Path2D(); lotusPath(p2, 450, 400, 300, 9, Math.PI * .95); q.fill(p2); q.globalCompositeOperation = 'source-over';
    const p3 = new Path2D(); lotusPath(p3, 450, 400, 220, 7, Math.PI * .8); q.lineWidth = 2.4; q.strokeStyle = '#fff'; q.stroke(p3);
    const m = new Path2D(); manjariPath(m, 120, 400, 260, -Math.PI / 2 - .35, 9); manjariPath(m, 780, 400, 260, -Math.PI / 2 + .35, 9); q.fill(m); }), { texScale: .4, depth: 1.6 });
  g.save(); g.globalAlpha = lk * .55; g.drawImage(ART.introLotus, W / 2 - 450, 150, 900, 420); g.restore();
  const N = textLayer('धर्म मंजरी', 'tiro', 190, 'gold', { glow: 20 });
  g.save(); const x0 = W / 2 - N.w / 2; g.beginPath(); g.rect(x0, 0, N.w * wipe, H); g.clip(); drawText(g, N, W / 2, 610, 1, { t, period: 6, phase: -t0 - 2.5, id: 'intro-name' }); g.restore();
  if (wipe > 0 && wipe < 1) { g.save(); g.globalCompositeOperation = 'lighter'; const x = x0 + N.w * wipe, gr = g.createRadialGradient(x, 540, 0, x, 540, 80); gr.addColorStop(0, 'rgba(255,240,190,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - 80, 460, 160, 160); g.restore(); }
  const sub = textLayer('DHARMA MANJARI', 'cinzel', 40, 'gold'); drawText(g, sub, W / 2, 700, reveal(t, t0 + 2.2, 1.2), { id: 'intro-sub' });
  rule(g, W / 2, 745, 460, reveal(t, t0 + 2.4, 1.6));
  g.restore();
  // lower third: अनीश
  const l3 = reveal(t, t0 + 1.0, 1) * (1 - ss(seg(t, t0 + 6, t0 + 6.8)));
  if (l3 > 0) { g.save(); g.globalAlpha = l3; const y = 905, x = 150; const gr = g.createLinearGradient(x - 20, 0, x + 520, 0); gr.addColorStop(0, 'rgba(11,10,18,.85)'); gr.addColorStop(1, 'rgba(11,10,18,0)');
    g.fillStyle = gr; g.fillRect(x - 20, y - 60, 560, 96); g.restore();
    const A = textLayer('अनीश', 'tiro', 54, 'cream'); g.save(); g.globalAlpha = l3; g.drawImage(A.c, x - A.pad + (1 - l3) * -20, y - A.base + 8, A.w, A.h); g.restore();
    const r = mk(1, 1); void r; g.save(); g.globalAlpha = l3; g.fillStyle = C.gold; g.fillRect(x, y + 20, 300 * l3, 2); g.restore();
    TEXTS.push({ x0: x, y0: y - 54, x1: x + A.tw, y1: y + 20, a: l3, id: 'lower-third' }); }
}

// ------------------------------------------------------------------ 2b. the series: one sarga of 100 shlokas, in three parts
const KANDAS = ['बालकाण्ड', 'अयोध्याकाण्ड', 'अरण्यकाण्ड', 'किष्किन्धाकाण्ड', 'सुन्दरकाण्ड', 'युद्धकाण्ड', 'उत्तरकाण्ड'];
function sceneSeries(g, t, sc) {
  backdrop(g, t); diyaLight(g, W / 2, 900, t, .9, 1100);
  g.save(); cam(g, t, sc, 1.0, 1.06);
  if (!LEAF) LEAF = makeLeaf(1640, 360);
  const t0 = sc.start, hund = sc.lines.find(l => /सौ|१००/.test(l.text)), th = hund ? hund.start : t0 + (sc.end - t0) * .6;
  const part = sc.lines.find(l => /तीन/.test(l.text)), tp = part ? part.start : th + 3;
  // A: the seven kandas as a rack of palm leaves, Bala Kanda lit
  const kA = 1 - ss(seg(t, th - .8, th + .4));
  if (kA > 0) KANDAS.forEach((k, i) => { const a = ss(seg(t, t0 + .3 + i * .25, t0 + 1.4 + i * .25)) * kA, y = 215 + i * 96, lw = 1000, lh = 76;
    if (a <= 0) return; g.save(); g.globalAlpha = a * (i === 0 ? 1 : .7); g.drawImage(LEAF, W / 2 - lw / 2, y - lh / 2, lw, lh * LEAF.lh / (LEAF.lh - 40)); g.restore();
    if (i === 0) halo(g, W / 2, y, 140, t, a * .5 * ss(seg(t, t0 + 2.5, t0 + 4)));
    const L = textLayer(k, 'tiro', 42, i === 0 ? 'gold' : 'cream'); drawText(g, L, W / 2, y + 14, a * (i === 0 ? 1 : .75), { t: i === 0 ? t : undefined, id: 'kanda' }); });
  // B: one sarga of a hundred shlokas, in three parts; the first glows when the parts are named
  const kB = ss(seg(t, th - .2, th + 1.2));
  if (kB > 0) {
    for (let b = 0; b < 3; b++) {
      const k = ss(seg(t, th + b * .4, th + 1.4 + b * .4)), x = W / 2 + (b - 1) * 520, y = 540 + (1 - k) * 20;
      g.save(); g.globalAlpha = k * (b === 0 ? 1 : lerp(1, .45, ss(seg(t, tp, tp + 1.5))));
      for (let i = 0; i < 6; i++) g.drawImage(LEAF, x - 220 + i * 2, y - 40 + i * 9 - 27, 440, 440 * LEAF.lh / LEAF.lw);
      g.fillStyle = C.goldSh; g.fillRect(x - 130, y - 50, 6, 110); g.fillRect(x + 124, y - 50, 6, 110);
      g.restore();
      const lab = textLayer(['भाग १', 'भाग २', 'भाग ३'][b], 'tiro', 50, b === 0 ? 'gold' : 'cream');
      drawText(g, lab, x, y + 150, k * reveal(t, tp, 1) * (b === 0 ? 1 : .6), { t, id: 'series-label' });
      if (b === 0) halo(g, x, y + 10, 260, t, ss(seg(t, tp + .3, tp + 2)) * .7);
    }
    const top = textLayer('बालकाण्ड · सर्ग १ · १०० श्लोक', 'tiro', 58, 'gold', { glow: 8 }); drawText(g, top, W / 2, 290, kB, { t, id: 'series-top' });
  }
  g.restore();
}

// ------------------------------------------------------------------ 3. the ashram
function sceneAshram(g, t, sc) {
  if (!ART.ashram) ART.ashram = makeAshram(); const A = ART.ashram, p = eio(P(t, sc));
  g.fillStyle = C.ink0; g.fillRect(0, 0, W, H);
  g.save(); cam(g, t, sc, 1, 1.06, 900, 640);
  drawLayer(g, A.sky, -p * 10); drawLayer(g, A.hills, -p * 25);
  river(g, t, 830, 1010);
  drawLayer(g, A.trees, -p * 45); drawLayer(g, A.ground, -p * 60);
  // the fire beside the sage is the key light
  diyaLight(g, 1045, 760, t, 1.0, 700);
  g.save(); g.globalCompositeOperation = 'lighter'; const f = flick(t, 3);
  for (let k = 0; k < 3; k++) { const fx = 1030 + k * 15, hgt = 46 * f * (1 - k * .15) + 8 * Math.sin(t * 5 + k); const gr = g.createLinearGradient(0, 770, 0, 770 - hgt); gr.addColorStop(0, 'rgba(255,220,150,.95)'); gr.addColorStop(1, 'rgba(230,90,20,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(fx - 12, 770); g.quadraticCurveTo(fx - 10, 770 - hgt * .6, fx + Math.sin(t * 3 + k) * 4, 770 - hgt); g.quadraticCurveTo(fx + 10, 770 - hgt * .6, fx + 12, 770); g.fill(); }
  g.restore();
  // smoke of the fire rising in a thin gold thread
  g.save(); g.strokeStyle = 'rgba(234,217,176,.12)'; g.lineWidth = 3; g.beginPath(); for (let k = 0; k < 40; k++) { const y = 720 - k * 12, x = 1045 + Math.sin(k * .3 - t * .8) * (6 + k * .8); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.restore();
  drawLayer(g, A.fg, -p * 90);
  g.restore();
  // Narada arrives: a veena-light descends from the upper left when the narration names him
  const nl = sc.lines.find(l => /नारद/.test(l.text));
  if (nl) { const k = ss(seg(t, nl.start, nl.start + 2.5)); if (k > 0) { halo(g, 380, 230, 120, t, k * .8); g.save(); g.globalAlpha = k * .9; if (!ART.veena) ART.veena = makeVeena(); g.drawImage(ART.veena, 380 - 130, 230 - 100, 260, 200); g.restore(); } }
}

// ------------------------------------------------------------------ 4. a shloka page
let PAGE = null;
function makePage() {
  return mk(W, H, g => { const gr = g.createRadialGradient(W / 2, H * .45, 100, W / 2, H * .45, W * .62); gr.addColorStop(0, '#1d1834'); gr.addColorStop(1, '#0d0b17'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.globalAlpha = 1; g.drawImage(PALM, 0, 0, W, H);
    // faint ruled lines of a manuscript page
    g.strokeStyle = 'rgba(212,166,58,.06)'; g.lineWidth = 1; for (let y = 140; y < H - 120; y += 56) { g.beginPath(); g.moveTo(170, y); g.lineTo(W - 170, y); g.stroke(); } });
}
const DEVA_DIGITS = '०१२३४५६७८९';
const devaNum = s => String(s).replace(/[0-9]/g, d => DEVA_DIGITS[+d]);
function shlokaLayout(sc) {
  if (sc._lay) return sc._lay;
  const sl = lineAt(sc, 'shloka'), me = lineAt(sc, 'meaning');
  const size = fitSize(sl.map(l => l.text), 'tiro', sl.length > 2 ? 70 : 80, 1560, 40), lh = size * 1.62;
  const msize = Math.round(size * .6), mtexts = me.map(l => wrap(l.text, 'noto', msize, 1420)).flat().slice(0, 4), mlh = msize * 1.6;
  const blockH = sl.length * lh + (mtexts.length ? 70 + mtexts.length * mlh : 0);
  const top = clamp(540 - blockH / 2 + size * .5, 230, 600);
  sc._lay = { sl, me, size, lh, msize, mtexts, mlh, top, ruleY: top + (sl.length - 1) * lh + size * .55 + 40 };
  return sc._lay;
}
function sceneShloka(g, t, sc) {
  if (!PAGE) PAGE = makePage(); g.drawImage(PAGE, 0, 0, W, H);
  const [ref, motif] = sc.arg.split(/\s+/), L = shlokaLayout(sc);
  diyaLight(g, W / 2, 1040, t, .7, 1100);
  g.save(); cam(g, t, sc, 1, 1.035);
  // motif watermark behind the text
  if (motif === 'veena') {   // Narada's veena with its halo holds the page before the shloka, then recedes into a watermark
    if (!ART.veena) ART.veena = makeVeena(); if (!ART.clouds) ART.clouds = makeClouds();
    const f0 = (L.sl[0] ? L.sl[0].start : sc.start + 2) - .6, k = 1 - ss(seg(t, f0, f0 + 1.4));
    drawLayer(g, ART.clouds, 0, 0, .25 + .55 * k);
    halo(g, W / 2, 500, 360, t, lerp(.45, 1, k)); g.save(); g.globalAlpha = lerp(.16, 1, k); const vs = lerp(1, 1.05, k);
    g.drawImage(ART.veena, W / 2 - 650 * vs, 500 - 500 * vs, 1300 * vs, 1000 * vs); g.restore();
    if (k > 0) embers(g, t, sc.start, .6 * k, { n: 26, x0: 600, w: 700, y0: 700, rise: 500, seed: 3 });
  }
  if (motif === 'bow') { if (!ART.bow) ART.bow = makeBow(); g.save(); g.globalAlpha = .12; g.drawImage(ART.bow, W / 2 - 430, 520 - 430, 860, 860); g.restore(); halo(g, W / 2, 500, 360, t, .3); }
  if (motif === 'sage') { if (!ART.ashram) ART.ashram = makeAshram(); g.save(); g.globalAlpha = .1; drawLayer(g, ART.ashram.ground, 0, 0); g.restore(); }
  // reference
  const first = L.sl[0] ? L.sl[0].start : sc.start;
  if (ref) { const R = textLayer('॥ बालकाण्ड · सर्ग १ · श्लोक ' + devaNum(ref.split('.').pop()) + ' ॥', 'tiro', 36, 'gold'); drawText(g, R, W / 2, 168, reveal(t, motif === 'veena' ? first - .6 : sc.start + .2, 1.2), { id: 'ref' }); }
  // shloka lines, revealed as they are chanted; the line being chanted glows a little
  L.sl.forEach((l, i) => { const T = textLayer(l.text, 'tiro', L.size, 'gold', { glow: 12, keys: true }), y = L.top + i * L.lh, on = t >= l.start && t <= l.end + .4 ? 1 : 0;
    drawText(g, T, W / 2, y, reveal(t, l.start - .15), { dy: drift(t, l.start - .15), t, period: 9, phase: i * 1.3, glowA: .22 + .18 * on, id: 'shloka' }); });
  // meaning
  if (L.mtexts.length) {
    const mt = L.me[0].start; rule(g, W / 2, L.ruleY, 420, reveal(t, mt - .3, 1.2));
    L.mtexts.forEach((tx, i) => { const T = textLayer(tx, 'noto', L.msize, 'cream'); drawText(g, T, W / 2, L.ruleY + 40 + L.msize + i * L.mlh, reveal(t, mt + i * .25, 1.1), { dy: drift(t, mt + i * .25), id: 'meaning' }); });
  }
  g.restore();
}

// ------------------------------------------------------------------ 5. the sixteen-petal lotus
function sceneLotus(g, t, sc) {
  backdrop(g, t); diyaLight(g, W / 2, 1000, t, .7, 1000);
  if (!ART.petal) ART.petal = makePetal();
  const cx = W / 2, cy = 520, t0 = sc.start, form = k => ss(seg(t, t0 + .2 + k * .12, t0 + 1.4 + k * .12));
  // one petal per quality: petals light in turn across the qualities (lines of the scene, or evenly across its narration)
  const qs = sc.lines.length ? sc.lines : [{ start: t0, end: sc.end }];
  const q0 = qs[0].start, q1 = qs[qs.length - 1].end;
  const whole = sc.lines.find(l => /पूरा|पूर्ण/.test(l.text)), m0 = whole ? whole.start + .4 : q0, m1 = Math.max(m0 + 4, q1 - 1.5);
  const marks = Array.from({ length: 16 }, (_, i) => lerp(m0, m1, i / 15));
  g.save(); cam(g, t, sc, 1, 1.06, cx, cy);
  halo(g, cx, cy, 330, t, .4 + .4 * ss(seg(t, q1 - 2, q1)));
  for (let k = 0; k < 16; k++) {
    const ring = k % 2, a = (Math.floor(k / 2) + ring * .5) / 8 * TAU - Math.PI / 2, f = form(k), len = (ring ? 250 : 300) * (.5 + .5 * eo(f));
    const lit = ss(seg(t, marks[k], marks[k] + .6)), pulse = Math.exp(-Math.max(0, t - marks[k]) * 1.2) * lit;
    g.save(); g.translate(cx, cy); g.rotate(a + Math.PI / 2); g.globalAlpha = f * (.45 + .55 * lit);
    g.drawImage(ART.petal, -80 * len / 312, -320 * len / 312, 160 * len / 312, 330 * len / 312);
    if (pulse > .01) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = pulse * .9; g.drawImage(ART.petal, -80 * len / 312, -320 * len / 312, 160 * len / 312, 330 * len / 312); }
    g.restore();
  }
  // seed pod
  g.save(); const pod = ss(seg(t, t0 + 1, t0 + 2.4)); g.globalAlpha = pod; const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 70); gr.addColorStop(0, C.goldHi); gr.addColorStop(.7, C.gold); gr.addColorStop(1, C.goldSh);
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 64, 0, TAU); g.fill(); g.fillStyle = 'rgba(60,40,5,.6)'; for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; g.beginPath(); g.arc(cx + Math.cos(a) * 36, cy + Math.sin(a) * 36, 7, 0, TAU); g.fill(); } g.beginPath(); g.arc(cx, cy, 8, 0, TAU); g.fill(); g.restore();
  g.restore();
  
}

// ------------------------------------------------------------------ 6a. Narada (the veena with a halo)
function sceneNarada(g, t, sc) {
  backdrop(g, t); if (!ART.veena) ART.veena = makeVeena(); if (!ART.clouds) ART.clouds = makeClouds();
  const p = eio(P(t, sc)); diyaLight(g, W / 2, 900, t, .8, 1100);
  g.save(); cam(g, t, sc, 1, 1.06);
  drawLayer(g, ART.clouds, -p * 30, -p * 10, .8);
  halo(g, W / 2, 500, 360, t, ss(seg(t, sc.start, sc.start + 2)));
  g.save(); g.translate(W / 2, 520 - p * 12); g.rotate(Math.sin(t * .4) * .01); g.drawImage(ART.veena, -650, -500, 1300, 1000); g.restore();
  // a few notes rising from the strings
  embers(g, t, sc.start, .6, { n: 26, x0: 600, w: 700, y0: 700, rise: 500, seed: 3 });
  g.restore();
}

// ------------------------------------------------------------------ 6b. राम: gold lettering fills the frame, embers rise and settle
function sceneRama(g, t, sc) {
  backdrop(g, t); diyaLight(g, W / 2, 860, t, 1, 1200);
  const key = sc.lines.find(l => /राम/.test(l.text)) || sc.lines[0], t0 = key ? key.start : sc.start;
  if (!ART.bow) ART.bow = makeBow();
  g.save(); cam(g, t, sc, 1.0, 1.06);
  const k = ss(seg(t, t0 - .4, t0 + 1.6));
  g.save(); g.globalAlpha = .22 * k; g.drawImage(ART.bow, W / 2 - 470, 520 - 470, 940, 940); g.restore();
  halo(g, W / 2, 500, 420, t, k);
  const G = textLayer('राम', 'tiro', 460, 'gold', { glow: 30 }), V = textLayer('राम', 'tiro', 460, 'gold', { glow: 30, keys: true });
  // gold leaf is laid from below (like leaf on size), then the vermilion of the name comes up inside its gold edge
  const y = 690, fill = eio(seg(t, t0, t0 + 2.2)), vk = ss(seg(t, t0 + 2.2, t0 + 3.6));
  g.save(); g.beginPath(); g.rect(0, y + 140 - fill * 640, W, H); g.clip();
  drawText(g, G, W / 2, y, 1 - vk, { t, period: 5, phase: -t0, glowA: .35, id: 'rama' });
  drawText(g, V, W / 2, y, vk, { t, period: 5, phase: -t0, glowA: .3, id: 'rama' }); g.restore();
  g.restore();
  embers(g, t, t0, ss(seg(t, t0, t0 + 1)) * (1 - .6 * ss(seg(t, t0 + 5, t0 + 8))), { n: 90, seed: 12 });
  // narration lines under the name, small
  const sub = sc.lines.filter(l => l !== key);
  void sub;
}

// ------------------------------------------------------------------ 7. Ayodhya, the celebration, the turn
function sceneAyodhya(g, t, sc) {
  if (!ART.ayo) ART.ayo = makeAyodhya(); const A = ART.ayo, p = eio(P(t, sc));
  const turn = sc.lines.find(l => /मोड़|मोड/.test(l.text)), tt = turn ? turn.start : sc.end + 10;
  const fl = t > tt ? (t < tt + 1.6 ? .55 + .45 * Math.abs(Math.sin((t - tt) * 9)) * (1 - seg(t, tt, tt + 1.6)) : .55) : 1;   // the light flickers, then stays low
  const dim = lerp(1, .55, ss(seg(t, tt, tt + 1.6)));
  g.fillStyle = C.ink0; g.fillRect(0, 0, W, H);
  g.save(); cam(g, t, sc, 1, 1.06, W / 2, 600);
  drawLayer(g, A.sky, -p * 10);
  // celebration glow on the horizon
  g.save(); g.globalCompositeOperation = 'lighter'; const gk = ss(seg(t, sc.start, sc.start + 3)) * fl; const gr = g.createRadialGradient(W / 2, 760, 0, W / 2, 760, 1000); gr.addColorStop(0, `rgba(255,170,70,${.35 * gk})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
  drawLayer(g, A.far, -p * 30); drawLayer(g, A.near, -p * 55);
  cityLights(g, A, t, ss(seg(t, sc.start + .5, sc.start + 3)) * fl, ss(seg(t, tt, tt + 1.4)) * .6);
  river(g, t, 900, 1080, .8 * dim);
  g.restore();
  // lanterns floating up during the celebration, fewer after the turn
  embers(g, t, sc.start, .7 * dim, { n: 40, seed: 5, y0: 900, rise: 800 });
  if (t > tt) { g.fillStyle = `rgba(5,4,12,${.25 * ss(seg(t, tt, tt + 1.6))})`; g.fillRect(0, 0, W, H); }
}

// ------------------------------------------------------------------ 8. close: pull back from the manuscript, the diya returns, the book closes
function sceneClose(g, t, sc) {
  const p = P(t, sc), pull = eio(seg(p, 0, .55)), z = lerp(1, .62, pull);
  g.fillStyle = '#06050b'; g.fillRect(0, 0, W, H);
  diyaLight(g, W / 2, 960, t, ss(seg(p, .1, .4)) * 1.2, 1100);
  // the whole illuminated page, shrinking into a book on a dark ground
  g.save(); g.translate(W / 2, H / 2 - 40 * pull); g.scale(z, z); g.translate(-W / 2, -H / 2);
  if (!PAGE) PAGE = makePage(); g.drawImage(PAGE, 0, 0, W, H);
  const T = textLayer('॥ बालकाण्ड · सर्ग १ · भाग १ ॥', 'tiro', 76, 'gold', { glow: 10 }); drawText(g, T, W / 2, 560, reveal(t, sc.start + .4, 1.4) * (1 - ss(seg(p, .55, .75))), { t, id: 'close' });
  drawFrame(g, t, 1);
  // covers swing shut from both sides (book closing)
  const cl = eio(seg(p, .55, .9));
  if (cl > 0) for (const s of [-1, 1]) {
    const w = W / 2 * cl, x = s < 0 ? 0 : W - w;
    g.save(); const gr = g.createLinearGradient(x, 0, x + w, 0); const dark = '#120f24', edge = '#1e1938';
    gr.addColorStop(0, s < 0 ? dark : edge); gr.addColorStop(1, s < 0 ? edge : dark); g.fillStyle = gr; g.fillRect(x, 0, w, H);
    g.strokeStyle = rgba(C.gold, .9); g.lineWidth = 4; g.strokeRect(x + 30 * cl, 30, w - 60 * cl, H - 60); g.lineWidth = 1.5; g.strokeRect(x + 48 * cl, 48, w - 96 * cl, H - 96);
    g.fillStyle = `rgba(0,0,0,${.5 * (1 - cl)})`; g.fillRect(x, 0, w, H); g.restore();
  }
  if (cl > .98) { const em = ss(seg(p, .9, 1)); g.save(); g.globalAlpha = em; if (!ART.introLotus) sceneIntro(mk(4, 4).g, sc.start, { start: sc.start, end: sc.end, lines: [] }); g.drawImage(ART.introLotus, W / 2 - 300, H / 2 - 220, 600, 280); g.restore();
    const N = textLayer('धर्म मंजरी', 'tiro', 110, 'gold', { glow: 12 }); drawText(g, N, W / 2, H / 2 + 140, em, { t, id: 'close-name' }); }
  g.restore();
  diya(g, W / 2 - 15, 960, .9, t, ss(seg(p, .1, .4)));
}

// ------------------------------------------------------------------ end card (~8 s)
function sceneEndcard(g, t, sc) {
  backdrop(g, t); diyaLight(g, W / 2, 960, t, 1, 1100);
  const t0 = sc.start;
  g.save(); cam(g, t, sc, 1.0, 1.03);
  const A = textLayer('अगला भाग जल्द', 'tiro', 120, 'gold', { glow: 18 }); drawText(g, A, W / 2, 420, reveal(t, t0 + .3, 1.4), { dy: drift(t, t0 + .3, 1.6, 18), t, period: 4.5, phase: -t0, id: 'end-next' });
  rule(g, W / 2, 490, 560, reveal(t, t0 + .8, 1.4));
  const B = textLayer('Follow @dharmamanjari_', 'cinzel', 64, 'cream'); drawText(g, B, W / 2, 610, reveal(t, t0 + 1.2, 1.2), { id: 'end-follow' });
  // animated follow cue: a gold pill with a bell that rings, pulse rings every 1.6 s
  const k = reveal(t, t0 + 1.8, 1), bx = W / 2, by = 760, bw = 420, bh = 96;
  if (k > 0) {
    g.save(); g.globalAlpha = k;
    const ph = ((t - t0 - 1.8) % 1.6 + 1.6) % 1.6 / 1.6;
    g.strokeStyle = rgba(C.goldHi, .6 * (1 - ph)); g.lineWidth = 3; g.beginPath(); g.roundRect(bx - bw / 2 - ph * 40, by - bh / 2 - ph * 24, bw + ph * 80, bh + ph * 48, bh / 2 + ph * 24); g.stroke();
    if (!ART.pill) { const pl = mk(bw, bh, q => { q.strokeStyle = '#fff'; q.fillStyle = '#fff'; q.lineWidth = 3; q.beginPath(); q.roundRect(2, 2, bw - 4, bh - 4, bh / 2 - 2); q.stroke();
        q.lineWidth = 1.2; q.beginPath(); q.roundRect(10, 10, bw - 20, bh - 20, bh / 2 - 10); q.stroke();
        q.font = fontStr('cinzel', 40, 700); q.textAlign = 'left'; q.textBaseline = 'middle'; q.fillText('FOLLOW', bw / 2 - 70, bh / 2 + 3);
        q.save(); q.translate(bw / 2 - 120, bh / 2); q.beginPath(); q.moveTo(-18, 14); q.quadraticCurveTo(-18, -22, 0, -24); q.quadraticCurveTo(18, -22, 18, 14); q.lineTo(24, 20); q.lineTo(-24, 20); q.closePath(); q.fill(); q.beginPath(); q.arc(0, 25, 6, 0, TAU); q.fill(); q.restore(); });
      ART.pill = goldify(pl, { texScale: .4, depth: 1.4 }); }
    const press = 1 - .04 * Math.exp(-(((t - t0 - 2.6) % 3.2 + 3.2) % 3.2) * 6) * (t > t0 + 2.6 ? 1 : 0);
    g.translate(bx, by); g.scale(press, press);
    g.fillStyle = 'rgba(11,10,18,.85)'; g.beginPath(); g.roundRect(-bw / 2 + 4, -bh / 2 + 4, bw - 8, bh - 8, bh / 2 - 4); g.fill();
    const ring = Math.exp(-(((t - t0 - 2.6) % 3.2 + 3.2) % 3.2) * 1.5) * (t > t0 + 2.6 ? 1 : 0), bell = Math.sin((t - t0) * 9) * .3 * ring;
    g.save(); g.beginPath(); g.rect(-bw / 2 + 60, -bh / 2, 120, bh); g.clip(); g.translate(-120, 0); g.rotate(bell); g.translate(120, 0); g.drawImage(ART.pill, -bw / 2, -bh / 2, bw, bh); g.restore();
    g.save(); g.beginPath(); g.rect(-bw / 2, -bh / 2, 60, bh); g.rect(-bw / 2 + 180, -bh / 2, bw, bh); g.clip(); g.drawImage(ART.pill, -bw / 2, -bh / 2, bw, bh); g.restore();
    shimmer(g, ART.pill, -bw / 2, -bh / 2, bw, bh, t, { period: 3.2, phase: -t0, k: .8, slot: 'pill' });
    g.restore();
    TEXTS.push({ x0: bx - bw / 2, y0: by - bh / 2, x1: bx + bw / 2, y1: by + bh / 2, a: k, id: 'follow-pill' });
  }
  g.restore();
}

const SCENES = { coldopen: sceneColdopen, title: sceneTitle, intro: sceneIntro, series: sceneSeries, ashram: sceneAshram, shloka: sceneShloka, lotus: sceneLotus,
  narada: sceneNarada, rama: sceneRama, ayodhya: sceneAyodhya, close: sceneClose, endcard: sceneEndcard };
