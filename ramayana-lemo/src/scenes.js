'use strict';
// The painted scenes. Each scene: build(sc) once (static layers cached with their gold mask), draw(g, t, sc) live,
// lights(t, sc) in the scene's world units, focus (where the camera looks). All times come from timeline.json.

const lines = (sc, k) => sc.lines.filter(l => !k || l.kind === k);
const findLine = (sc, re) => sc.lines.find(l => re.test(l.text));
const build = (t, t0) => clamp((t - t0) / PACE.BUILD);        // every element is built in the same time
const HAIR = '#20140c';

// ------------------------------------------------------------------ shared pieces
function nightLayer(seed, avoid, o = {}) {
  return cacheLayer(g => {
    drawSky(g, starField(seed, o.stars ?? 26, [-80, -40, W + 160, (o.skyH ?? 700)], avoid));
    for (const c of (o.clouds || [])) drawCloud(g, ...c);
    if (o.spires !== false) {
      drawSpires(g, spireRange(seed + 1, -160, W + 160, o.base1 ?? 1110, o.h1?.[0] ?? 150, o.h1?.[1] ?? 260, [[LILAC, LILAC_D], [ASH, ASH_D], [AZUR, AZUR_D]]));
      if (o.near !== false) drawSpires(g, spireRange(seed + 2, -120, W + 120, o.base2 ?? 1150, o.h2?.[0] ?? 110, o.h2?.[1] ?? 190, [[VERDI, VERDI_D], [VERD, VERD_D]]));
    }
    if (o.extra) o.extra(g);
  }, [-160, -100, W + 320, H + 200]);
}
const rake = t => { const n = Math.floor(t / PACE.RAKE_P), u = (t - n * PACE.RAKE_P) / PACE.RAKE_D; if (u < 0 || u >= 1) return null;
  return { type: 'b', x: lerp(-700, W + 700, u), y: H / 2, nx: .9, ny: .44, w: 200, a: .7 }; };      // linear: the same speed every time
const diyaLight = (x, y, s, t, a = .5, r = 360) => { const [fx, fy] = flameTip(x, y, s); return { type: 'r', x: fx, y: fy, r, a: a * (.92 + .08 * Math.sin(t * 7.3) * Math.sin(t * 2.3)) }; };
const flamePool = (x, y, s, a = .3) => { const [fx, fy] = flameTip(x, y, s); return [fx, fy, 38 * s, a * .8]; };

// halo: gold disc with vermilion ring, punched rays, pearls (as in the style's figures)
function halo(g, cx, cy, R) {
  const ring = P2(q => q.arc(cx, cy, R + 11, 0, TAU)), disc = P2(q => q.arc(cx, cy, R, 0, TAU));
  g.fillStyle = VERM; g.fill(ring); rimShade(g, ring, VERM_D, 5); ink(g, ring, 2.4); maskErase(g, ring);
  leaf(g, disc, [cx - R, cy - R, R * 2, R * 2], { lw: 2, rimW: 6 });
  g.save(); g.clip(disc); g.strokeStyle = 'rgba(100,54,6,.5)'; g.lineWidth = 2;
  for (let a = 0; a < 28; a++) { const an = a / 28 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(an) * R * .5, cy + Math.sin(an) * R * .5); g.lineTo(cx + Math.cos(an) * R * .93, cy + Math.sin(an) * R * .93); g.stroke(); }
  g.restore(); pearls(g, cx, cy, R + 5.5, 30, 2.3, .9); gpush(cx, cy - R * .55, R * 1.3, 1.1);
}
// the sage, seen from behind (faceless): saffron shawl, hair knot, gold halo, seated on a mat
function sage(g, sx, sy, s = 1) {
  g.save(); g.translate(sx, sy); g.scale(s, s);
  halo(g, 0, -215, 78);
  const mat = P2(q => q.ellipse(0, 18, 175, 26, 0, 0, TAU)); paint(g, mat, OCHRE_D, WOOD, 6, 2.2); pearlLine(g, [[-150, 22], [150, 22]], 18, 2.2, .7);
  const legs = P2(q => q.ellipse(0, -6, 128, 32, 0, 0, TAU)); paint(g, legs, VERM_D, '#6a160c', 8, 2.4);
  const body = P2(q => { q.moveTo(-74, -18); q.bezierCurveTo(-84, -92, -64, -152, -34, -170); q.lineTo(34, -170); q.bezierCurveTo(64, -152, 84, -92, 74, -18); q.closePath(); });
  paint(g, body, VERM_L, VERM, 14, 2.6);
  hiLine(g, [[-60, -40], [-66, -100], [-40, -150]], 2, .6);
  const fold = new Path2D(); fold.moveTo(-30, -160); fold.quadraticCurveTo(-10, -90, -40, -24); fold.moveTo(26, -164); fold.quadraticCurveTo(12, -100, 30, -24); ink(g, fold, 1.8);
  const neck = P2(q => q.rect(-13, -188, 26, 24)); paint(g, neck, '#8a5a3a', '#5e3a22', 4, 2);
  const head = P2(q => q.ellipse(0, -214, 31, 36, 0, 0, TAU)); paint(g, head, HAIR, '#000', 4, 2.4);   // back of the head: hair
  const knot = P2(q => q.ellipse(0, -258, 19, 22, 0, 0, TAU)); paint(g, knot, HAIR, '#000', 3, 2.2);
  const band = P2(q => q.rect(-20, -244, 40, 7)); leaf(g, band, [-20, -244, 40, 7], { lw: 1.4, rimW: 1 });
  hiLine(g, [[-18, -270], [-6, -276]], 1.6, .6); hiLine(g, [[-24, -230], [-14, -244]], 1.6, .45);
  pearlLine(g, [[-70, -24], [70, -24]], 14, 2, .75);
  g.restore();
}
function veenaDrawing(g, cx, cy, s) {   // a rudra-veena style instrument in pigment and gold, held diagonally
  g.save(); g.translate(cx, cy); g.rotate(-.55); g.scale(s, s);
  const neck = P2(q => q.roundRect(-300, -14, 600, 28, 10)); paint(g, neck, WOOD, WOOD_D, 5, 2.4);
  for (let i = 0; i < 18; i++) { const x = -200 + i * 22; const f = P2(q => q.rect(x, -17, 4, 6)); leaf(g, f, [x, -17, 4, 6], { lw: .8, rim: false }); }
  for (const [x, r] of [[-250, 96], [250, 70]]) { const gd = P2(q => q.arc(x, 64, r, 0, TAU)); paint(g, gd, OCHRE_D, WOOD_D, 12, 2.6);
    const ring = P2(q => { q.arc(x, 64, r * .62, 0, TAU); q.arc(x, 64, r * .45, 0, TAU, true); }); leaf(g, ring, [x - r, 64 - r, r * 2, r * 2], { lw: 1.4, rimW: 2, rule: 'evenodd' }); pearls(g, x, 64, r * .8, 16, 2.2, .85); }
  const head = P2(q => { q.moveTo(300, -14); q.bezierCurveTo(350, -30, 372, -70, 344, -96); q.bezierCurveTo(326, -110, 300, -94, 312, -76); q.lineTo(300, 14); q.closePath(); }); leaf(g, head, [296, -110, 80, 124], { lw: 2, rimW: 3 });
  g.strokeStyle = 'rgba(251,246,234,.85)'; g.lineWidth = 1.2; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-280, -8 + k * 5); g.lineTo(300, -8 + k * 4); g.stroke(); }
  g.restore(); gpush(cx, cy, 200 * s, 1);
}
function bowDrawing(g, cx, cy, s) {   // Kodanda: a recurve bow and an arrow, gold cord on pigment
  g.save(); g.translate(cx, cy); g.rotate(-Math.PI / 4); g.scale(s, s);
  const limb = P2(q => { q.moveTo(-40, -380); q.bezierCurveTo(-10, -330, -190, -200, -190, 0); q.bezierCurveTo(-190, 200, -10, 330, -40, 380); });
  g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 22 + 3 * LWK; g.stroke(limb); g.strokeStyle = WOOD; g.lineWidth = 22; g.stroke(limb);
  hiLine(g, [[-168, -120], [-180, 0], [-168, 120]], 2.4, .55);
  leafCord(g, P2(q => { q.moveTo(-190, -40); q.lineTo(-190, 40); }), 30, { ink: 2.4 });
  for (const y of [-200, 200]) leafCord(g, P2(q => { q.moveTo(-150, y - 8); q.lineTo(-150, y + 8); }), 26, { ink: 2 });
  g.strokeStyle = 'rgba(42,26,16,.9)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-40, -378); g.lineTo(-40, 378); g.stroke();
  leafCord(g, P2(q => { q.moveTo(-40, 0); q.lineTo(390, 0); }), 9, { ink: 2.4 });
  const head = P2(q => { q.moveTo(440, 0); q.lineTo(380, -28); q.lineTo(394, 0); q.lineTo(380, 28); q.closePath(); }); leaf(g, head, [380, -28, 60, 56], { lw: 2, rimW: 3 });
  for (const sd of [-1, 1]) { const f = P2(q => { q.moveTo(-20, 0); q.quadraticCurveTo(0, 34 * sd, 50, 38 * sd); q.lineTo(30, 0); q.closePath(); }); paint(g, f, VERM, VERM_D, 4, 2); }
  g.restore(); gpush(cx, cy, 260 * s, 1);
}
function palmBundle(g, cx, cy) {   // a bundle of palm-leaf folios tied with cord
  for (let i = 0; i < 5; i++) { const y = cy - 40 + i * 18, p = P2(q => q.roundRect(cx - 120, y, 240, 22, 11)); paint(g, p, i % 2 ? '#d8bf86' : '#cdb278', '#a48a52', 5, 1.8); }
  for (const x of [cx - 60, cx + 60]) { const c = P2(q => q.rect(x - 4, cy - 48, 8, 112)); paint(g, c, VERM, VERM_D, 2, 1.6); }
  const plate = P2(q => q.roundRect(cx - 130, cy - 62, 260, 18, 6)); leaf(g, plate, [cx - 130, cy - 62, 260, 18], { lw: 1.8, rimW: 3 });
}

// ------------------------------------------------------------------ scenes
const SCN = {};

// 1. cold open: a dark night, one diya lit, a banderole opens with the question
SCN.coldopen = {
  focus: [960, 520],
  build(sc) { sc.L = nightLayer(11, [[160, 260, 1600, 420]], { stars: 24, extra: g => { const ledge = P2(q => q.roundRect(700, 900, 520, 60, 10)); paint(g, ledge, ROSE, ROSE_D, 10, 2.4); pearlLine(g, [[716, 916], [1204, 916]], 22, 2.6, .8); } }); },
  draw(g, t, sc) {
    drawCached(g, sc.L);
    const t0 = sc.start, lit = ss(clamp((t - t0 - .3) / .6));
    diya(g, 960, 880, 1.5, t, lit, 0);
    const open = clamp((t - t0 - 1.0) / PACE.BUILD); scroll(g, 960, 470, 1580, 330, open);
    if (open < 1) return;
    const pg = pages(sc.lines);
    pg.forEach((ls, pi) => {
      const pEnd = pi + 1 < pg.length ? pg[pi + 1][0].start : sc.end + 9, out = 1 - clamp((t - pEnd + .3) / .3);
      if (out <= 0) return; const big = ls.length > 1, size = fitSize(ls.map(l => l.text), 'tiro', big ? 62 : 54, 1380), lh = size * 1.45, y0 = 470 - (ls.length - 1) * lh / 2 + size * .33;
      ls.forEach((l, i) => { const t1 = Math.max(l.start, t0 + 2.0), w = tw(l.text, 'tiro', size); inkText(g, l.text, 960, y0 + i * lh, size, { fam: 'tiro', wipe: penWipe(t, t1, w), alpha: out, col: big ? '#6e1c10' : '#4a2c16', id: 'cold' }); });
    });
  },
  lights(t, sc) { const lit = ss(clamp((t - sc.start - .3) / .6)); return [diyaLight(960, 880, 1.5, t, .62 * lit, 640)]; },
  pools(t, sc) { return [flamePool(960, 880, 1.5, .3 * ss(clamp((t - sc.start - .3) / .6)))]; },
};
function pages(ls) { const out = []; for (const l of ls) { if (!out.length || l.page) out.push([]); out[out.length - 1].push(l); } return out; }

// 1b. the title: a gilded plaque lettered in leaf
SCN.title = {
  focus: [960, 520],
  build(sc) { sc.L = nightLayer(23, [[140, 150, 1640, 620]], { clouds: [[260, 150, 300, 90], [1680, 130, 260, 80]], extra: g => { const ledge = P2(q => q.roundRect(700, 900, 520, 60, 10)); paint(g, ledge, ROSE, ROSE_D, 10, 2.4); } }); },
  draw(g, t, sc) {
    drawCached(g, sc.L); diya(g, 960, 880, 1.5, t, 1, 0);
    const ls = sc.lines, last = ls[ls.length - 1], T = 'वाल्मीकि रामायण · बालकाण्ड · सर्ग १';
    if (ls.length > 1) { scroll(g, 960, 228, 900, 100, build(t, sc.start)); inkText(g, ls[0].text, 960, 244, 44, { fam: 'tiro', wipe: penWipe(t, Math.max(ls[0].start, sc.start + PACE.BUILD), tw(ls[0].text, 'tiro', 44)), id: 'title-pre' }); }
    plaque(g, 160, 360, 1600, 290, build(t, sc.start + .3));
    const size = fitSize([T], 'tiro', 92, 1440); goldText(g, T, 960, 535, size, { wipe: penWipe(t, last.start, tw(T, 'tiro', size)), id: 'title' });
    goldText(g, 'VALMIKI RAMAYANA · BALA KANDA · SARGA 1', 960, 735, 32, { fam: 'cinzel', wipe: penWipe(t, last.start + 1.2, 900), id: 'title-sub' });
  },
  lights(t, sc) { const last = sc.lines[sc.lines.length - 1], w = tw('वाल्मीकि रामायण · बालकाण्ड · सर्ग १', 'tiro', 92), u = penWipe(t, last.start, w);
    const L = [diyaLight(960, 880, 1.5, t, .5, 600)]; if (u > 0 && u < 1) L.push({ type: 'r', x: 960 - w / 2 + w * u, y: 510, r: 260, a: .8 }); return L; },
  pools(t) { return [flamePool(960, 880, 1.5)]; },
};

// 2. the channel: a holy card. Quatrefoil with lotus and tulsi manjari, the name lettered in leaf on a plaque
SCN.intro = {
  focus: [960, 500],
  build(sc) { sc.L = nightLayer(31, [[560, 80, 800, 760]], { stars: 22, spires: true, h1: [120, 200], h2: [80, 140] }); },
  draw(g, t, sc) {
    drawCached(g, sc.L);
    const t0 = sc.start, nameL = findLine(sc, /धर्म मंजरी/) || sc.lines[0];
    medallion(g, 960, 360, 240, build(t, t0), (q, r) => { lotusFlower(q, 960, 470, 190); manjari(q, 820, 470, 220, -Math.PI / 2 - .5); manjari(q, 1100, 470, 220, -Math.PI / 2 + .5); });
    plaque(g, 520, 620, 880, 220, build(t, t0 + .4));
    goldText(g, 'धर्म मंजरी', 960, 738, 84, { wipe: penWipe(t, nameL.start, tw('धर्म मंजरी', 'tiro', 88)), id: 'name' });
    goldText(g, 'DHARMA MANJARI', 960, 790, 26, { fam: 'cinzel', wipe: penWipe(t, nameL.start + 1, 300), id: 'name-sub' });
    for (const x of [400, 1520]) diya(g, x, 790, 1.1, t, 1, x);
    const l0 = sc.lines[0], k = build(t, l0.start) * (1 - clamp((t - l0.start - 6.5) / PACE.SCROLL));      // the name of the narrator on a small scroll
    if (k > 0) { scroll(g, 250, 680, 250, 76, k); if (k >= 1) inkText(g, 'अनीश', 250, 696, 40, { fam: 'tiro', id: 'anish' }); }
  },
  lights(t, sc) { const nameL = findLine(sc, /धर्म मंजरी/) || sc.lines[0], w = tw('धर्म मंजरी', 'tiro', 84), u = penWipe(t, nameL.start, w);
    const L = [diyaLight(400, 790, 1.1, t, .55, 520), diyaLight(1520, 790, 1.1, t, .55, 520), { type: 'r', x: 960, y: 230, r: 420, a: .35 * build(t, sc.start + 1) }];
    if (u > 0 && u < 1) L.push({ type: 'r', x: 960 - w / 2 + w * u, y: 716, r: 240, a: .8 }); return L; },
  pools(t) { return [flamePool(400, 790, 1.1), flamePool(1520, 790, 1.1)]; },
};

// 2b. the series: the seven kandas on seven plaques, Bala Kanda lit
const KANDAS = ['बालकाण्ड', 'अयोध्याकाण्ड', 'अरण्यकाण्ड', 'किष्किन्धाकाण्ड', 'सुन्दरकाण्ड', 'युद्धकाण्ड', 'उत्तरकाण्ड'];
SCN.series = {
  focus: [960, 470],
  build(sc) { sc.L = nightLayer(41, [[500, 60, 920, 760]], { stars: 26, h1: [110, 190], h2: [70, 120] }); },
  draw(g, t, sc) {
    drawCached(g, sc.L);
    KANDAS.forEach((k, i) => { const y = 92 + i * 104, b = build(t, sc.start + i * .3); plaque(g, 610, y, 700, 92, b, { r: 14, pad: 12 });
      if (b >= 1) goldText(g, k, 960, y + 62, 44, { wipe: penWipe(t, sc.start + i * .3 + PACE.BUILD, tw(k, 'tiro', 40)), id: 'kanda' }); });
    diya(g, 480, 170, .9, t, 1, 3);
  },
  lights(t, sc) { return [diyaLight(480, 170, .9, t, .7, 640), { type: 'r', x: 960, y: 138, r: 420, a: .7 * build(t, sc.start + 1.5) }, { type: 'r', x: 960, y: 470, r: 900, a: .2 }]; },
  pools() { return [flamePool(480, 170, .9)]; },
};
// 2c. one sarga, a hundred shlokas, three parts: three folios in medallions, the first lit
SCN.parts = {
  focus: [960, 470],
  build(sc) { sc.L = nightLayer(43, [[200, 60, 1520, 760]], { stars: 22, h1: [100, 170], h2: [60, 110] }); },
  draw(g, t, sc) {
    drawCached(g, sc.L);
    plaque(g, 360, 96, 1200, 140, build(t, sc.start));
    const H1 = 'बालकाण्ड · सर्ग १ · १०० श्लोक'; goldText(g, H1, 960, 188, 54, { wipe: penWipe(t, sc.start + PACE.BUILD, tw(H1, 'tiro', 54)), id: 'parts-h' });
    const tp = (findLine(sc, /तीन/) || sc.lines[0]).start;
    [520, 960, 1400].forEach((x, i) => { medallion(g, x, 470, 150, build(t, sc.start + .3 + i * .3), q => palmBundle(q, x, 480));
      goldText(g, ['भाग १', 'भाग २', 'भाग ३'][i], x, 740, 48, { wipe: penWipe(t, tp + i * .3, 140), id: 'part' }); });
  },
  lights(t, sc) { const tp = (findLine(sc, /तीन/) || sc.lines[0]).start, k = build(t, tp + 1);
    return [{ type: 'r', x: 520, y: 470, r: 360, a: .85 * k }, { type: 'r', x: 960, y: 150, r: 600, a: .3 }]; },
};

// 3. the ashram at night: spires, a river, a banyan with gold fruit, a hut, the sage at his fire; Narada's veena in the sky
SCN.ashram = {
  focus: [900, 560],
  build(sc) {
    sc.L = cacheLayer(g => {
      drawSky(g, starField(51, 30, [-80, -40, W + 160, 560], [[1040, 90, 180, 170], [1400, 120, 380, 380]]));
      const moon = P2(q => q.arc(1120, 170, 58, 0, TAU)); vellum(g, moon); triad(g, 1100, 154, 3, .5); triad(g, 1142, 192, 2.4, .45);
      for (const c of [[300, 170, 320, 90], [1560, 470, 300, 84]]) drawCloud(g, ...c);
      drawSpires(g, spireRange(52, -160, W + 160, 760, 260, 430, [[LILAC, LILAC_D], [ASH, ASH_D], [AZUR, AZUR_D]]));
      drawSpires(g, spireRange(53, -120, W + 120, 812, 150, 240, [[VERDI, VERDI_D], [VERD, VERD_D]]));
      const river = P2(q => q.rect(-200, 800, W + 400, 90)); paint(g, river, AZUR, AZUR_D, 10, 2.4);
      const bank = P2(q => { q.moveTo(-200, 880); q.bezierCurveTo(500, 860, 1300, 870, W + 200, 880); q.lineTo(W + 200, H + 200); q.lineTo(-200, H + 200); q.closePath(); }); paint(g, bank, VERD, VERD_D, 16, 2.6);
      for (let i = 0; i < 40; i++) triad(g, 40 + i * 48 + (i % 3) * 7, 930 + (i % 4) * 26, 2, .7);
      // banyan: trunk and aerial roots, crowns with white-lead triads and gold fruit
      const trunk = P2(q => { q.moveTo(370, 820); q.bezierCurveTo(390, 680, 400, 620, 380, 520); q.lineTo(480, 520); q.bezierCurveTo(460, 640, 470, 720, 520, 820); q.closePath(); }); paint(g, trunk, WOOD, WOOD_D, 10, 2.6);
      for (let i = 0; i < 6; i++) { const r = P2(q => q.rect(250 + i * 70, 560, 6, 260 + (i % 3) * 20)); paint(g, r, WOOD, null, 0, 1.6); }
      for (const [x, y, r] of [[300, 430, 150], [460, 370, 170], [600, 450, 130], [210, 520, 110], [530, 530, 140], [370, 560, 120]]) {
        const c = P2(q => q.arc(x, y, r, 0, TAU)); paint(g, c, VERD, VERD_D, 16, 2.6);
        for (let k = 0; k < 8; k++) triad(g, x + Math.cos(k * 2.4) * r * .6, y + Math.sin(k * 2.4) * r * .6, 2.2, .75);
        for (let k = 0; k < 4; k++) { const fx = x + Math.cos(k * 1.7 + 1) * r * .45, fy = y + Math.sin(k * 1.7 + 1) * r * .45, f = P2(q => q.arc(fx, fy, 9, 0, TAU)); leaf(g, f, [fx - 9, fy - 9, 18, 18], { lw: 1.4, rimW: 2 }); gpush(fx, fy, 22, .8); } }
      // hut: ochre walls, thatch, a gold-ground doorway
      const wall = P2(q => q.rect(1220, 650, 260, 150)); paint(g, wall, OCHRE, OCHRE_D, 10, 2.4);
      const roof = P2(q => { q.moveTo(1190, 660); q.lineTo(1350, 540); q.lineTo(1510, 660); q.closePath(); }); paint(g, roof, WOOD, WOOD_D, 10, 2.4);
      for (let i = 1; i < 9; i++) ink(g, P2(q => { q.moveTo(1350, 548); q.lineTo(1190 + i * 320 / 9, 660); }), 1.2);
      const door = P2(q => { q.moveTo(1322, 800); q.lineTo(1322, 712); q.arc(1350, 712, 28, Math.PI, 0); q.lineTo(1378, 800); q.closePath(); }); leaf(g, door, [1322, 684, 56, 116], { lw: 2, rimW: 4 });
      // the fire altar
      const alt = P2(q => q.rect(1030, 780, 90, 34)); paint(g, alt, ROSE, ROSE_D, 6, 2.2); pearlLine(g, [[1036, 796], [1114, 796]], 14, 2, .8);
      sage(g, 860, 800, 1);
    }, [-160, -100, W + 320, H + 200]);
  },
  draw(g, t, sc) {
    drawCached(g, sc.L);
    g.save(); g.beginPath(); g.rect(-200, 800, W + 400, 80); g.clip();            // river: white-lead ripples drifting at one speed
    for (let i = 0; i < 26; i++) { const y = 812 + (i % 5) * 14, x = ((i * 173 + t * 18) % (W + 300)) - 150; hiLine(g, [[x, y], [x + 40, y - 3], [x + 80, y]], 1.8, .6); }
    g.restore();
    const [wob, hg] = flameWob(t, 2), fx = 1075, fy = 780;                          // the fire
    for (const [w, h, c] of [[30, 64, VERM], [20, 44, OCHRE_L], [9, 22, WHITE]]) { const p = P2(q => { q.moveTo(fx - w, fy); q.bezierCurveTo(fx - w, fy - h * .5, fx + wob, fy - h * .7, fx + wob * 2, fy - h - hg * 2); q.bezierCurveTo(fx + w * .6, fy - h * .6, fx + w, fy - h * .3, fx + w, fy); q.closePath(); }); g.fillStyle = c; g.fill(p); if (c === VERM) { ink(g, p, 1.6); maskErase(g, p); } }
    const nl = findLine(sc, /नारद/);
    if (nl) { const k = build(t, nl.start); if (k > 0) { medallion(g, 1580, 300, 150 * k, 1, q => veenaDrawing(q, 1580, 300, .42)); } }
  },
  lights(t, sc) { const L = [{ type: 'r', x: 1075, y: 740, r: 560, a: .55 * (.9 + .1 * Math.sin(t * 6.1)) }]; const nl = findLine(sc, /नारद/);
    if (nl) L.push({ type: 'r', x: 1580, y: 300, r: 360, a: .75 * build(t, nl.start + .6) }); return L; },
  pools(t) { return [[1075, 740, 90, .3]]; },
};
function ultraP(g) { if (!g.__paint) { g.__paint = g.createPattern(PAINTC, 'repeat'); g.__paint.setTransform(new DOMMatrix().scale(1.1)); } return g.__paint; }

// 4. a shloka: lettered in leaf on a gilded plaque, written at chanting pace; the pen's light lights each word as it is laid
const devaNum = s => String(s).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);
const PL = { x: 130, y: 196, w: 1660, h: 500 };
function shlokaLayout(sc) {
  if (sc._lay) return sc._lay; const sl = lines(sc, 'shloka');
  const size = fitSize(sl.map(l => l.text), 'tiro', sl.length > 2 ? 64 : 74, PL.w - 220), lh = size * 1.5;
  const top = PL.y + 150 + (PL.h - 190 - (sl.length - 1) * lh) / 2 + size * .3;
  return (sc._lay = { sl, size, lh, top });
}
const PEN_CHANT = 400;   // shloka lines are written at one steady pace, close to the chanting
SCN.shloka = {
  focus: [960, 470],
  build(sc) { const motif = sc.arg.split(/\s+/)[1];
    sc.L = nightLayer(61 + (sc.idx || 0), [[100, 120, 1720, 620]], { stars: 18, h1: [110, 180], h2: [70, 120], clouds: [[220, 120, 220, 64], [1720, 110, 220, 64]] });
    sc.motif = motif; },
  draw(g, t, sc) {
    drawCached(g, sc.L); const L = shlokaLayout(sc), ref = sc.arg.split(/\s+/)[0];
    plaque(g, PL.x, PL.y, PL.w, PL.h, build(t, sc.start));
    medallion(g, 960, 186, 84, build(t, sc.start + .3), (q, r) => {
      if (sc.motif === 'veena') veenaDrawing(q, 960, 186, .2); else if (sc.motif === 'bow') bowDrawing(q, 960, 186, .17); else if (sc.motif === 'sage') { q.save(); q.translate(960, 236); q.scale(.3, .3); q.translate(-860, -800); sage(q, 860, 800, 1); q.restore(); } else lotusFlower(q, 960, 222, 70); });
    if (ref) { const R = '॥ बालकाण्ड · सर्ग १ · श्लोक ' + devaNum(ref.split('.').pop()) + ' ॥'; goldText(g, R, 960, 330, 34, { wipe: penWipe(t, sc.start + PACE.BUILD, tw(R, 'tiro', 34)), id: 'ref' }); }
    L.sl.forEach((l, i) => { const w = tw(l.text, 'tiro', L.size); goldText(g, l.text, 960, L.top + i * L.lh, L.size, { wipe: clamp((t - l.start) / (w / PEN_CHANT)), keys: true, id: 'shloka' }); });
  },
  lights(t, sc) { const L = shlokaLayout(sc), out = [{ type: 'r', x: 960, y: 186, r: 260, a: .45 * build(t, sc.start + .6) }];
    L.sl.forEach((l, i) => { const w = tw(l.text, 'tiro', L.size), u = (t - l.start) / (w / PEN_CHANT); if (u > 0 && u < 1.15) out.push({ type: 'r', x: 960 - w / 2 + w * Math.min(u, 1), y: L.top + i * L.lh - L.size * .35, r: 300, a: .9 * (u < 1 ? 1 : 1 - (u - 1) / .15) }); });
    return out; },
};

// 5. the sixteen-petal lotus: petals of leaf laid around a vermilion seed, each lit in turn as the qualities are named
SCN.lotus = {
  focus: [960, 470],
  build(sc) { sc.L = nightLayer(71, [[480, 40, 960, 860]], { stars: 26, h1: [110, 180], h2: [70, 110] }); },
  marks(sc) { const ls = sc.lines, whole = findLine(sc, /पूरा|पूर्ण/), m0 = whole ? whole.start + .4 : ls[0].start, m1 = Math.max(m0 + 4, ls[ls.length - 1].end - 1.5);
    return Array.from({ length: 16 }, (_, i) => lerp(m0, m1, i / 15)); },
  petal(k) { const ring = k % 2, a = (Math.floor(k / 2) + ring * .5) / 8 * TAU - Math.PI / 2, len = ring ? 250 : 320; return { a, len, w: ring ? 62 : 74 }; },
  draw(g, t, sc) {
    drawCached(g, sc.L); const cx = 960, cy = 470;
    const disc = P2(q => q.arc(cx, cy, 380, 0, TAU)); if (!sc._disc) sc._disc = 1;
    const db = build(t, sc.start); if (db > 0) { g.save(); g.globalAlpha = 1; const r = 380 * eo(db), d = P2(q => q.arc(cx, cy, r, 0, TAU)), rim = P2(q => { q.arc(cx, cy, r + 16, 0, TAU); q.arc(cx, cy, r, 0, TAU, true); });
      ultra(g, d); rimShade(g, d, ULTRA_D, 22); ink(g, d, 2.4); paint(g, rim, VERM, VERM_D, 5, 2.4); pearls(g, cx, cy, r + 8, 64, 2.6, .9); g.restore(); }
    for (let k = 15; k >= 0; k--) { const b = build(t, sc.start + .4 + k * .12); if (b <= 0) continue; const P = this.petal(k), len = P.len * (.4 + .6 * eo(b));
      g.save(); g.translate(cx, cy); g.rotate(P.a + Math.PI / 2);
      const p = P2(q => { q.moveTo(0, -40); q.bezierCurveTo(-P.w, -len * .35, -P.w * .7, -len * .8, 0, -len); q.bezierCurveTo(P.w * .7, -len * .8, P.w, -len * .35, 0, -40); });
      leaf(g, p, [-P.w, -len, P.w * 2, len], { lw: 2.2, rimW: 6 }); g.strokeStyle = 'rgba(100,54,6,.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, -60); g.lineTo(0, -len * .9); g.stroke();
      g.restore(); }
    const pb = build(t, sc.start + 2.2); if (pb > 0) { const pod = P2(q => q.arc(cx, cy, 64 * eo(pb), 0, TAU)); paint(g, pod, VERM, VERM_D, 10, 2.6);
      for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, s = P2(q => q.arc(cx + Math.cos(a) * 36 * pb, cy + Math.sin(a) * 36 * pb, 7, 0, TAU)); leaf(g, s, [cx - 50, cy - 50, 100, 100], { lw: 1.2, rimW: 1 }); }
      pearls(g, cx, cy, 52 * pb, 18, 2.2, .9); }
  },
  lights(t, sc) { const cx = 960, cy = 470, out = [], M = this.marks(sc);
    M.forEach((m, k) => { const P = this.petal(k), d = P.len * .6, x = cx + Math.cos(P.a) * d, y = cy + Math.sin(P.a) * d, u = t - m;
      if (u > 0) out.push({ type: 'r', x, y, r: 190, a: u < .5 ? u / .5 * 1.1 : lerp(1.1, .45, clamp((u - .5) / 1.5)) }); });
    const last = M[15] + 1.2; if (t > last) { const u = (t - last) / 2.4; if (u < 1) out.push({ type: 'o', x: cx, y: cy, rad: 900 * u, w: 70, a: .9 * (1 - u) }); }
    return out; },
};

// 6. राम: the name painted in layers (gold edge, then vermilion), a spark from the diya touches it and gold rings spread
SCN.rama = {
  focus: [960, 480],
  build(sc) { sc.L = nightLayer(81, [[300, 60, 1320, 760]], { stars: 28, h1: [100, 170], h2: [60, 110], extra: g => bowDrawing(g, 960, 470, .95) }); },
  key(sc) { return (findLine(sc, /राम/) || sc.lines[0]).start; },
  T: () => ({ size: 380, x: 960, y: 640 }),
  draw(g, t, sc) {
    drawCached(g, sc.L); const t0 = this.key(sc), { size, x, y } = this.T(), w = tw('राम', 'tiro', size), f = font('tiro', size);
    const u1 = penWipe(t, t0 - .2, w), u2 = penWipe(t, t0 - .2 + w / PACE.PEN, w);
    g.save(); g.font = f; g.textAlign = 'left'; const x0 = x - w / 2;
    if (u1 > 0) { g.save(); g.beginPath(); g.rect(x0 - 40, 0, (w + 80) * u1, H); g.clip();
      g.fillStyle = 'rgba(8,6,30,.6)'; g.fillText('राम', x0 + 10, y + 14);
      goldPat(g); g.strokeStyle = INK; g.lineWidth = 30; g.lineJoin = 'round'; g.strokeText('राम', x0, y); g.strokeStyle = g.__gp; g.lineWidth = 24; g.strokeText('राम', x0, y);
      if (MK) { MK.g.save(); MK.g.setTransform(MK.pre.multiply(g.getTransform())); MK.g.beginPath(); MK.g.rect(x0 - 40, 0, (w + 80) * u1, H); MK.g.clip(); MK.g.font = f; MK.g.lineWidth = 24; MK.g.lineJoin = 'round'; MK.g.strokeStyle = '#fff'; MK.g.strokeText('राम', x0, y); MK.g.restore(); }
      g.restore(); }
    if (u2 > 0) { g.save(); g.beginPath(); g.rect(x0 - 40, 0, (w + 80) * u2, H); g.clip(); g.fillStyle = VERM; g.fillText('राम', x0, y);
      const gr = g.createLinearGradient(0, y - size, 0, y); gr.addColorStop(0, 'rgba(255,170,140,.18)'); gr.addColorStop(1, 'rgba(60,0,0,.25)'); g.fillStyle = gr; g.fillText('राम', x0, y);
      if (MK) { MK.g.save(); MK.g.setTransform(MK.pre.multiply(g.getTransform())); MK.g.globalCompositeOperation = 'destination-out'; MK.g.font = f; MK.g.fillText('राम', x0, y); MK.g.restore(); }
      g.restore(); }
    g.restore(); reg('rama', 'राम', g, x0, y - size * .85, x0 + w, y + size * .2);
    diya(g, 330, 840, 1.2, t, 1, 4);
    const ts = this.touchT(sc); if (t > ts - 1.6 && t < ts) { const [sx, sy] = this.spark(t, sc); g.fillStyle = WHITE; g.beginPath(); g.arc(sx, sy, 6, 0, TAU); g.fill(); }
  },
  touchT(sc) { const { size } = this.T(), w = tw('राम', 'tiro', size); return this.key(sc) - .2 + 2 * w / PACE.PEN + .3; },
  contact() { return [740, 640]; },
  spark(t, sc) { const ts = this.touchT(sc), u = clamp((t - ts + 1.6) / 1.6), [fx, fy] = flameTip(330, 840, 1.2), [cx, cy] = this.contact(); return [lerp(fx, cx, u), lerp(fy, cy, u) - Math.sin(u * Math.PI) * 120]; },
  lights(t, sc) { const out = [diyaLight(330, 840, 1.2, t, .5, 520)], ts = this.touchT(sc), [cx, cy] = this.contact();
    if (t > ts - 1.6 && t < ts) { const [sx, sy] = this.spark(t, sc); out.push({ type: 'r', x: sx, y: sy, r: 220, a: .85 }); }
    if (t >= ts) { const u = t - ts; out.push({ type: 'r', x: cx, y: cy, r: 300, a: .9 * (1 - .5 * clamp(u / 1.5)) });
      for (const [d, a] of [[0, 1.05], [.4, .8]]) { const v = (u - d) / 2.4; if (v > 0 && v < 1) out.push({ type: 'o', x: cx, y: cy, rad: 1500 * v, w: 70, a: a * (1 - .5 * v) }); } }
    return out; },
  pools(t, sc) { const out = [flamePool(330, 840, 1.2)], ts = this.touchT(sc); if (t > ts - 1.6 && t < ts) out.push([...this.spark(t, sc), 46, .7]); return out; },
};

// 7. Ayodhya: the city at night, lamps along its walls; on the turn the lamps go out one by one, the gold sinks
const AYO_LAMPS = Array.from({ length: 15 }, (_, i) => [140 + i * 117, 612]);
SCN.ayodhya = {
  focus: [960, 520],
  build(sc) {
    sc.L = cacheLayer(g => {
      drawSky(g, starField(91, 30, [-80, -40, W + 160, 420]));
      for (const c of [[280, 150, 300, 84], [1640, 120, 280, 80]]) drawCloud(g, ...c);
      const R = mulberry(92), bld = [];
      for (let x = -40; x < W + 60; x += 120 + R() * 70) bld.push([x, 380 + R() * 110, 90 + R() * 60, R()]);
      for (const [x, top, w, r] of bld) { const body = P2(q => q.rect(x - w / 2, top, w, 640 - top)); paint(g, body, r < .33 ? LILAC : r < .66 ? AZUR : ROSE, r < .33 ? LILAC_D : r < .66 ? AZUR_D : ROSE_D, 12, 2.4);
        const dome = P2(q => { q.moveTo(x - w * .45, top); q.bezierCurveTo(x - w * .55, top - w * .5, x - w * .1, top - w * .62, x, top - w * .85); q.bezierCurveTo(x + w * .1, top - w * .62, x + w * .55, top - w * .5, x + w * .45, top); q.closePath(); });
        leaf(g, dome, [x - w * .55, top - w * .85, w * 1.1, w * .85], { lw: 2.2, rimW: 5 }); gpush(x, top - w * .45, w * .8, 1);
        const pen = P2(q => { q.moveTo(x, top - w * .85); q.lineTo(x, top - w * .85 - 44); q.lineTo(x + 30, top - w * .85 - 36); q.lineTo(x, top - w * .85 - 26); }); ink(g, pen, 2); paint(g, P2(q => { q.moveTo(x, top - w * .85 - 44); q.lineTo(x + 30, top - w * .85 - 36); q.lineTo(x, top - w * .85 - 26); q.closePath(); }), VERM, VERM_D, 2, 1.6);
        for (let wy = top + 30; wy < 600; wy += 70) { const wn = P2(q => { q.moveTo(x - 12, wy + 36); q.lineTo(x - 12, wy + 12); q.arc(x, wy + 12, 12, Math.PI, 0); q.lineTo(x + 12, wy + 36); q.closePath(); }); paint(g, wn, ULTRA_D, null, 0, 1.6); } }
      // the palace at the centre: a gold-ground arch and a great dome
      const pal = P2(q => q.rect(760, 360, 400, 300)); paint(g, pal, ROSE, ROSE_D, 14, 2.6);
      const pd = P2(q => { q.moveTo(800, 360); q.bezierCurveTo(780, 240, 900, 200, 960, 140); q.bezierCurveTo(1020, 200, 1140, 240, 1120, 360); q.closePath(); }); leaf(g, pd, [780, 140, 360, 220], { lw: 2.6, rimW: 8 }); gpush(960, 260, 260, 1.2);
      const kal = P2(q => { q.ellipse(960, 128, 14, 18, 0, 0, TAU); }); leaf(g, kal, [946, 110, 28, 36], { lw: 1.6, rimW: 2 });
      const arch = P2(q => { q.moveTo(900, 660); q.lineTo(900, 520); q.bezierCurveTo(900, 470, 1020, 470, 1020, 520); q.lineTo(1020, 660); q.closePath(); }); leaf(g, arch, [900, 470, 120, 190], { lw: 2.4, rimW: 6 });
      pearlLine(g, [[770, 380], [1150, 380]], 20, 2.6, .85);
      // the city wall with battlements
      const wall = P2(q => { q.moveTo(-200, 640); for (let x = -200; x < W + 200; x += 60) { q.lineTo(x, 640); q.lineTo(x, 620); q.lineTo(x + 34, 620); q.lineTo(x + 34, 640); } q.lineTo(W + 200, 760); q.lineTo(-200, 760); q.closePath(); });
      paint(g, wall, ROSE_D, '#7a3040', 10, 2.6); pearlLine(g, [[-200, 700], [W + 200, 700]], 26, 2.6, .7);
      const river = P2(q => q.rect(-200, 760, W + 400, 140)); paint(g, river, AZUR_D, ULTRA_D, 12, 2.4);
      const bank = P2(q => { q.moveTo(-200, 900); q.bezierCurveTo(600, 880, 1300, 890, W + 200, 900); q.lineTo(W + 200, H + 200); q.lineTo(-200, H + 200); q.closePath(); }); paint(g, bank, VERD, VERD_D, 14, 2.6);
    }, [-160, -100, W + 320, H + 200]);
  },
  turn(sc) { const l = findLine(sc, /मोड़|मोड/); return l ? l.start : sc.end + 99; },
  lampOn(i, t, sc) { const tt = this.turn(sc); const off = tt + (AYO_LAMPS.length - 1 - i) * .25; return t < off ? 1 : 1 - clamp((t - off) / .4); },   // right to left, one every 0.25 s
  draw(g, t, sc) {
    drawCached(g, sc.L);
    AYO_LAMPS.forEach(([x, y], i) => diya(g, x, y, .55, t, this.lampOn(i, t, sc), i));
    g.save(); g.beginPath(); g.rect(-200, 760, W + 400, 140); g.clip();
    for (let i = 0; i < 30; i++) { const y = 780 + (i % 6) * 18, x = ((i * 211 + t * 18) % (W + 300)) - 150; hiLine(g, [[x, y], [x + 50, y - 3], [x + 100, y]], 1.6, .45); }
    for (const [x] of AYO_LAMPS) { g.fillStyle = 'rgba(232,189,114,.35)'; g.fillRect(x + 20, 790, 6, 60); }
    g.restore();
  },
  lights(t, sc) { const out = []; AYO_LAMPS.forEach(([x, y], i) => { const k = this.lampOn(i, t, sc); if (k > 0) out.push(diyaLight(x, y, .55, t + i, .42 * k, 300)); });
    const tt = this.turn(sc), k = 1 - clamp((t - tt) / 3.6); if (k > 0) out.push({ type: 'r', x: 960, y: 260, r: 520, a: .45 * k }); return out; },
  pools(t, sc) { return AYO_LAMPS.map(([x, y], i) => flamePool(x, y, .55, .25 * this.lampOn(i, t, sc))); },
  noRake(t, sc) { return t > this.turn(sc); },
};

// 8. close: the whole painting. Four medallions of the story around a plaque, the inner border grows from the corners, the diya returns
SCN.close = {
  focus: [960, 520], zoomDir: -1,
  build(sc) { sc.L = nightLayer(101, [[100, 80, 1720, 760]], { stars: 22, h1: [90, 150], h2: [50, 90] }); },
  draw(g, t, sc) {
    drawCached(g, sc.L); const t0 = sc.start;
    const M4 = [[330, 250, q => { q.save(); q.translate(330, 300); q.scale(.28, .28); q.translate(-860, -800); sage(q, 860, 800, 1); q.restore(); }], [1590, 250, q => veenaDrawing(q, 1590, 250, .24)],
      [330, 650, q => lotusFlower(q, 330, 690, 90)], [1590, 650, q => bowDrawing(q, 1590, 650, .2)]];
    M4.forEach(([x, y, fn], i) => medallion(g, x, y, 130, build(t, t0 + i * .3), q => fn(q)));
    plaque(g, 560, 340, 800, 220, build(t, t0 + 1.2));
    const T = '॥ बालकाण्ड · सर्ग १ · भाग १ ॥', s = fitSize([T], 'tiro', 58, 680); goldText(g, T, 960, 470, s, { wipe: penWipe(t, t0 + 1.2 + PACE.BUILD, tw(T, 'tiro', s)), id: 'close' });
    // the painting's inner border grows from the four corners along its edges at one speed
    const u = clamp((t - t0 - .4) / 4), bx0 = 120, by0 = 90, bx1 = W - 120, by1 = 820;
    if (u > 0) for (const [ax, ay, dx, dy] of [[bx0, by0, 1, 1], [bx1, by0, -1, 1], [bx0, by1, 1, -1], [bx1, by1, -1, -1]]) {
      const lx = (bx1 - bx0) / 2 * u, ly = (by1 - by0) / 2 * u; leafCord(g, P2(q => { q.moveTo(ax + dx * lx, ay); q.lineTo(ax, ay); q.lineTo(ax, ay + dy * ly); }), 8, { ink: 2.4 }); }
    diya(g, 960, 700, 1.3, t, build(t, t0 + .6), 5);
  },
  lights(t, sc) { const u = clamp((t - sc.start - 1) / PACE.RAKE_D); return [diyaLight(960, 700, 1.3, t, .6 * build(t, sc.start + .6), 640)].concat(u > 0 && u < 1 ? [{ type: 'o', x: 960, y: 640, rad: 1400 * u, w: 80, a: .7 * (1 - u) }] : []); },
  pools(t, sc) { return [flamePool(960, 700, 1.3, .3 * build(t, sc.start + .6))]; },
};

// 9. end card (the rest of the voice): the next part, the follow cue: a gold bell that rings with rings of light
SCN.endcard = {
  focus: [960, 500],
  build(sc) { sc.L = nightLayer(111, [[260, 80, 1400, 760]], { stars: 24, h1: [90, 150], h2: [50, 90] }); },
  bell(t, sc) { const p = ((t - sc.start - 2.4) % 3.2 + 3.2) % 3.2, on = t > sc.start + 2.4; return { swing: on ? Math.sin(p * 9) * .32 * Math.exp(-p * 1.6) : 0, p, on }; },
  draw(g, t, sc) {
    drawCached(g, sc.L); const t0 = sc.start;
    plaque(g, 360, 120, 1200, 230, build(t, t0));
    const A = 'अगला भाग जल्द'; goldText(g, A, 960, 275, 104, { wipe: penWipe(t, t0 + PACE.BUILD, tw(A, 'tiro', 104)), id: 'next' });
    scroll(g, 960, 470, 900, 104, build(t, t0 + .6)); const B = 'Follow @dharmamanjari_';
    inkText(g, B, 960, 490, 50, { fam: 'cinzel', wipe: penWipe(t, t0 + .6 + PACE.BUILD, tw(B, 'cinzel', 50)), id: 'follow' });
    // the follow cue: a vermilion pill with a leaf border and a gold bell
    const k = build(t, t0 + 1.8); if (k > 0) { plaque(g, 740, 596, 440, 124, k, { r: 62, pad: 16 });
      if (k >= 1) { goldText(g, 'FOLLOW', 1000, 674, 44, { fam: 'cinzel', wt: 700, id: 'follow-btn' });
        const { swing } = this.bell(t, sc); g.save(); g.translate(850, 626); g.rotate(swing);
        const b = P2(q => { q.moveTo(-26, 44); q.quadraticCurveTo(-28, 0, 0, -2); q.quadraticCurveTo(28, 0, 26, 44); q.lineTo(34, 54); q.lineTo(-34, 54); q.closePath(); }); leaf(g, b, [-34, -2, 68, 56], { lw: 2.2, rimW: 4 });
        const cl = P2(q => q.arc(0, 60, 8, 0, TAU)); leaf(g, cl, [-8, 52, 16, 16], { lw: 1.6, rimW: 2 }); const top = P2(q => q.arc(0, -4, 6, 0, TAU)); leaf(g, top, [-6, -10, 12, 12], { lw: 1.4, rimW: 1 });
        g.restore(); gpush(850, 650, 70, 1.2); } }
    for (const x of [250, 1670]) diya(g, x, 760, 1.2, t, 1, x);
  },
  lights(t, sc) { const out = [diyaLight(250, 760, 1.2, t, .5, 520), diyaLight(1670, 760, 1.2, t, .5, 520)], { p, on } = this.bell(t, sc);
    if (on) { out.push({ type: 'r', x: 850, y: 650, r: 260, a: .9 * Math.exp(-p * .8) }); if (p < 2.2) out.push({ type: 'o', x: 850, y: 650, rad: 700 * p / 2.2, w: 50, a: .8 * (1 - p / 2.2) }); }
    return out; },
  pools() { return [flamePool(250, 760, 1.2), flamePool(1670, 760, 1.2)]; },
};
