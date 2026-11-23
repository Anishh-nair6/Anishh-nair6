'use strict';
// Maharshi Valmiki and Devarshi Narada, painted as in an Indian miniature: profile faces with the long almond eye,
// flat pigment inside ink, white-lead highlights, gold-leaf halos and ornaments. Local units: the figure stands (or sits)
// on (0,0) and faces +x; pass face = -1 to mirror. Poses are numbers that blend smoothly (never switched).

const SKIN_V = '#b97a4e', SKIN_VD = '#8a5532', SKIN_N = '#dcaa78', SKIN_ND = '#b07c50';
const BEARD = '#efe9dc', BEARD_D = '#c9c0ac', JATA = '#d8d1c2', JATA_D = '#a39a86';
const SAFF = '#e2762e', SAFF_D = '#b0501a';
const ease = t => eio(clamp(t));
const mixP = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

// a head in profile (facing +x), centre (0,0), unit ≈ 40 px. o: {skin, skinD, eye, brow, tilak: 'tripundra'|'urdhva', beard, mouth}
function profileHead(g, o) {
  const skin = o.skin, skinD = o.skinD;
  const head = P2(q => { q.moveTo(8, -42); q.bezierCurveTo(-30, -44, -44, -10, -38, 14); q.bezierCurveTo(-34, 32, -20, 40, -6, 42);
    q.lineTo(14, 44); q.quadraticCurveTo(26, 42, 30, 34); q.quadraticCurveTo(33, 28, 30, 25); q.quadraticCurveTo(27, 22, 30, 19);
    q.quadraticCurveTo(34, 16, 31, 12); q.lineTo(33, 9); q.quadraticCurveTo(43, 6, 41, 1); q.quadraticCurveTo(34, -10, 32, -18); q.quadraticCurveTo(33, -32, 22, -40); q.closePath(); });
  paint(g, head, skin, skinD, 6, 2.2);
  const ear = P2(q => q.ellipse(-6, 2, 7, 11, 0, 0, TAU)); paint(g, ear, skin, skinD, 3, 1.6);
  const ring = P2(q => q.arc(-6, 15, 4, 0, TAU)); leaf(g, ring, [-10, 11, 8, 8], { lw: 1, rimW: 1 });
  // the long eye of the miniatures
  const eye = P2(q => { q.moveTo(8, -7); q.quadraticCurveTo(17, -14, 27, -8); q.quadraticCurveTo(17, -2, 8, -7); q.closePath(); });
  g.fillStyle = WHITE; g.fill(eye); g.save(); g.clip(eye); g.fillStyle = '#20140c'; g.beginPath(); g.arc(21, -8, 3.4, 0, TAU); g.fill(); g.restore(); ink(g, eye, 1.4); maskErase(g, eye);
  const k = o.blink || 0; if (k > 0) { g.fillStyle = skin; g.save(); g.clip(eye); g.fillRect(6, -16, 24, 10 * k); g.restore(); }
  g.strokeStyle = o.brow || '#20140c'; g.lineWidth = 2.4 * LWK; g.lineCap = 'round'; g.beginPath(); g.moveTo(9, -15); g.quadraticCurveTo(20, -21, 30, -16); g.stroke();
  g.strokeStyle = 'rgba(42,26,16,.8)'; g.lineWidth = 1.4 * LWK; g.beginPath(); g.moveTo(24, 23); g.lineTo(30, 23); g.stroke();       // the mouth
  if (o.tilak === 'tripundra') { g.strokeStyle = WHITE; g.lineWidth = 2 * LWK; for (const y of [-30, -26, -22]) { g.beginPath(); g.moveTo(20, y); g.lineTo(31, y + 1); g.stroke(); } g.fillStyle = VERM; g.beginPath(); g.arc(31, -26, 2.4, 0, TAU); g.fill(); }
  if (o.tilak === 'urdhva') { g.strokeStyle = WHITE; g.lineWidth = 2 * LWK; g.beginPath(); g.moveTo(28, -18); g.lineTo(30, -36); g.moveTo(34, -18); g.lineTo(34, -34); g.stroke(); g.strokeStyle = VERM; g.beginPath(); g.moveTo(31, -20); g.lineTo(32, -33); g.stroke(); }
  hiLine(g, [[22, -38], [30, -30], [33, -20]], 1.6, .55);
}
function arm(g, sh, el, hd, col, colD, w = 22) { const a = tubePath([sh, el, hd], [w, w * .85, w * .7]); paint(g, a, col, colD, 5, 2); return a; }
function hand(g, x, y, r, col, colD, rot = 0) { const p = P2(q => q.ellipse(x, y, r, r * 1.3, rot, 0, TAU)); paint(g, p, col, colD, 3, 1.6); }

// ------------------------------------------------------------------ Maharshi Valmiki, seated in meditation
// pose: {ask 0..1 (front hand raised, palm up), namaste 0..1, breath (s), blink 0..1, look -1..1 (head tilt up/down)}
function valmiki(g, x, y, s, face, t, pose = {}) {
  const ask = ease(pose.ask || 0), nam = ease(pose.namaste || 0), br = Math.sin(t * 1.7) * 1.6, look = (pose.look || 0) * .12;
  g.save(); g.translate(x, y); g.scale(s * face, s);
  // deerskin seat
  const mat = P2(q => q.ellipse(0, 10, 160, 22, 0, 0, TAU)); paint(g, mat, OCHRE_D, WOOD, 7, 2.2); for (let i = -3; i <= 3; i++) triad(g, i * 40, 10, 2, .65);
  // halo behind the head
  const hx = 8, hy = -262 + br * .5;
  halo(g, hx, hy, 74);
  // back hair falling over the shoulders
  const hair = P2(q => { q.moveTo(-26, -290); q.bezierCurveTo(-58, -250, -62, -200, -54, -170); q.lineTo(-30, -178); q.bezierCurveTo(-30, -210, -14, -240, -6, -258); q.closePath(); }); paint(g, hair, JATA, JATA_D, 6, 2);
  // torso (bare, with the sacred thread and a saffron uttariya over the far shoulder)
  g.save(); g.translate(0, br);
  const torso = P2(q => { q.moveTo(-58, -40); q.bezierCurveTo(-64, -110, -66, -170, -40, -212); q.quadraticCurveTo(-6, -226, 26, -210); q.bezierCurveTo(42, -180, 44, -120, 40, -40); q.closePath(); });
  paint(g, torso, SKIN_V, SKIN_VD, 12, 2.4);
  ink(g, P2(q => { q.moveTo(-34, -206); q.quadraticCurveTo(10, -140, 36, -60); }), 1.2); g.strokeStyle = WHITE; g.lineWidth = 2; g.beginPath(); g.moveTo(-34, -206); g.quadraticCurveTo(10, -140, 36, -60); g.stroke();
  const utt = P2(q => { q.moveTo(-50, -214); q.lineTo(-20, -222); q.bezierCurveTo(-30, -150, -36, -96, -56, -44); q.lineTo(-62, -60); q.bezierCurveTo(-62, -120, -60, -170, -50, -214); q.closePath(); }); paint(g, utt, SAFF, SAFF_D, 6, 2);
  pearlLine(g, [[-30, -214], [-6, -176], [14, -150], [22, -120]], 9, 2.4, .9);                                   // rudraksha (white lead pearls)
  // neck and head
  const neck = P2(q => q.rect(-14, -232, 28, 26)); paint(g, neck, SKIN_V, SKIN_VD, 4, 2);
  g.save(); g.translate(hx, hy); g.rotate(-look); g.scale(1.05, 1.05);
  // jata: matted hair coiled high
  const jata = P2(q => { q.moveTo(-30, -24); q.bezierCurveTo(-46, -64, -26, -98, 0, -100); q.bezierCurveTo(26, -98, 30, -64, 18, -36); q.closePath(); }); paint(g, jata, JATA, JATA_D, 8, 2.2);
  for (let k = 0; k < 4; k++) ink(g, P2(q => { q.moveTo(-28 + k * 3, -40 - k * 14); q.quadraticCurveTo(-4, -50 - k * 14, 18 - k * 2, -40 - k * 14); }), 1.1);
  const knotBand = P2(q => q.rect(-20, -58, 36, 6)); leaf(g, knotBand, [-20, -58, 36, 6], { lw: 1, rimW: 1 });
  profileHead(g, { skin: SKIN_V, skinD: SKIN_VD, tilak: 'tripundra', brow: '#f4efe4', blink: pose.blink });
  // white beard and moustache
  const beard = P2(q => { q.moveTo(-2, 12); q.bezierCurveTo(6, 30, 28, 30, 32, 26); q.bezierCurveTo(36, 50, 30, 90, 10, 120); q.bezierCurveTo(4, 96, -8, 70, -12, 40); q.closePath(); }); paint(g, beard, BEARD, BEARD_D, 6, 2);
  for (let k = 0; k < 4; k++) hiLine(g, [[8 + k * 4, 40], [14 + k * 3, 70 + k * 6]], 1.2, .5);
  const mous = P2(q => { q.moveTo(22, 18); q.quadraticCurveTo(32, 14, 36, 21); q.quadraticCurveTo(30, 20, 22, 22); q.closePath(); }); paint(g, mous, BEARD, BEARD_D, 2, 1.2);
  g.restore();
  // arms: the far hand rests on the knee; the near hand moves (lap → asking → namaste), blended
  hand(g, -60, -54, 12, SKIN_V, SKIN_VD);
  const shN = [8, -200];
  const elLap = [34, -120], hdLap = [74, -72], elAsk = [70, -146], hdAsk = [122, -188], elNam = [44, -132], hdNam = [52, -196];
  const el = mixP(mixP(elLap, elAsk, ask), elNam, nam), hd = mixP(mixP(hdLap, hdAsk, ask), hdNam, nam);
  if (nam > .02) { const far = mixP([-40, -100], [46, -194], nam); arm(g, [-30, -200], [-10, -120], far, SKIN_V, SKIN_VD, 20); }
  arm(g, shN, el, hd, SKIN_V, SKIN_VD, 22); hand(g, hd[0], hd[1], 13, SKIN_V, SKIN_VD, -.4 - ask * .6 - nam * 1.2);
  if (ask < .5 && nam < .5) { const ms = P2(q => q.roundRect(hd[0] - 6, hd[1] - 8, 70, 14, 6)); paint(g, ms, '#d8bf86', '#a48a52', 3, 1.6); }   // palm-leaf folio in the lap
  g.restore();
  // crossed legs and the saffron dhoti, gold border
  const legs = P2(q => { q.moveTo(-124, 4); q.quadraticCurveTo(-128, -54, -46, -58); q.quadraticCurveTo(62, -66, 118, -26); q.quadraticCurveTo(132, 0, 112, 8); q.closePath(); }); paint(g, legs, SAFF, SAFF_D, 12, 2.6);
  ink(g, P2(q => { q.moveTo(-60, -40); q.quadraticCurveTo(10, -30, 80, -10); }), 1.4);
  leafCord(g, P2(q => { q.moveTo(-120, 2); q.quadraticCurveTo(0, 12, 112, 6); }), 5, { ink: 2 });
  const foot = P2(q => q.ellipse(96, -8, 20, 9, -.2, 0, TAU)); paint(g, foot, SKIN_V, SKIN_VD, 3, 1.6);
  g.restore();
}

// ------------------------------------------------------------------ Devarshi Narada, standing on a cloud, the mahati veena on his shoulder
// pose: {pluck 0..1 (how much he plays), bob (px), nod 0..1, blink, talk 0..1 (raised hand, blessing)}
function narada(g, x, y, s, face, t, pose = {}) {
  const pl = pose.pluck ?? 1, bob = Math.sin(t * 1.3) * 6, nod = (pose.nod || 0) * Math.sin(t * 3.2) * .06, talk = ease(pose.talk || 0);
  g.save(); g.translate(x, y + bob); g.scale(s * face, s);
  // cloud
  drawCloud(g, 0, 18, 260, 70, 5);
  // halo
  const hx = 10, hy = -372; halo(g, hx, hy, 66);
  // dhoti: white with a gold border; a rose uttariya
  const dhoti = P2(q => { q.moveTo(-40, -196); q.lineTo(34, -196); q.bezierCurveTo(46, -120, 52, -60, 46, -14); q.lineTo(-44, -14); q.bezierCurveTo(-52, -70, -48, -140, -40, -196); q.closePath(); }); paint(g, dhoti, WHITE, '#d8cfbf', 12, 2.4);
  for (let k = 0; k < 4; k++) ink(g, P2(q => { q.moveTo(-10 + k * 10, -180); q.quadraticCurveTo(-6 + k * 12, -100, -12 + k * 14, -18); }), 1.1);
  leafCord(g, P2(q => { q.moveTo(-44, -16); q.lineTo(46, -16); }), 6, { ink: 2 });
  for (const fx of [-18, 20]) { const f = P2(q => q.ellipse(fx + 10, -6, 18, 8, 0, 0, TAU)); paint(g, f, SKIN_N, SKIN_ND, 3, 1.6); }
  // torso
  const torso = P2(q => { q.moveTo(-40, -196); q.bezierCurveTo(-46, -250, -44, -300, -30, -330); q.quadraticCurveTo(0, -342, 30, -328); q.bezierCurveTo(40, -296, 40, -246, 34, -196); q.closePath(); });
  paint(g, torso, SKIN_N, SKIN_ND, 10, 2.4);
  const scarf = P2(q => { q.moveTo(-34, -330); q.bezierCurveTo(-10, -280, 20, -240, 40, -200); q.lineTo(30, -192); q.bezierCurveTo(6, -236, -24, -270, -42, -310); q.closePath(); }); paint(g, scarf, ROSE, ROSE_D, 5, 2);
  const tail = P2(q => { q.moveTo(-42, -310); q.bezierCurveTo(-70, -260, -76 + Math.sin(t * 1.1) * 6, -170, -66 + Math.sin(t * 1.1) * 8, -90); q.lineTo(-54, -96); q.bezierCurveTo(-60, -170, -54, -250, -34, -300); q.closePath(); }); paint(g, tail, ROSE, ROSE_D, 4, 1.8);
  pearlLine(g, [[-24, -326], [-4, -280], [18, -262], [30, -300]], 10, 2.6, .9);                                   // tulsi mala in white lead
  for (let k = 0; k < 5; k++) { const p = P2(q => q.arc(-20 + k * 11, -292 + Math.abs(k - 2) * 8, 4, 0, TAU)); paint(g, p, ROSE, ROSE_D, 1, 1); }
  const neck = P2(q => q.rect(-12, -352, 24, 26)); paint(g, neck, SKIN_N, SKIN_ND, 4, 2);
  // far arm holds the veena's neck up by the shoulder
  
  // the mahati veena, over the shoulder, diagonal
  g.save(); g.translate(-20, -250); g.rotate(-1.95);
  const neckV = P2(q => q.roundRect(-160, -10, 330, 20, 8)); paint(g, neckV, WOOD, WOOD_D, 4, 2.2);
  for (let i = 0; i < 12; i++) { const fx = -90 + i * 18, fr = P2(q => q.rect(fx, -13, 3, 5)); leaf(g, fr, [fx, -13, 3, 5], { lw: .6, rim: false }); }
  for (const [vx, r] of [[-160, 46], [170, 30]]) { const gd = P2(q => q.arc(vx, 30, r, 0, TAU)); paint(g, gd, OCHRE_D, WOOD_D, 8, 2.2);
    const band = P2(q => { q.arc(vx, 30, r * .7, 0, TAU); q.arc(vx, 30, r * .5, 0, TAU, true); }); leaf(g, band, [vx - r, 30 - r, 2 * r, 2 * r], { lw: 1.2, rimW: 1, rule: 'evenodd' }); }
  const pk = P2(q => { q.moveTo(170, -10); q.bezierCurveTo(200, -24, 214, -52, 194, -66); q.bezierCurveTo(182, -72, 172, -60, 180, -50); q.lineTo(168, 10); q.closePath(); }); leaf(g, pk, [166, -72, 50, 82], { lw: 1.6, rimW: 2 });
  const vib = pl * Math.sin(t * 40) * .8;
  g.strokeStyle = 'rgba(251,246,234,.9)'; g.lineWidth = 1; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-150, -6 + k * 4); g.quadraticCurveTo(0, -6 + k * 4 + (k === 1 ? vib : 0), 170, -6 + k * 3); g.stroke(); }
  g.restore();
  arm(g, [-24, -318], [-62, -292], [-57, -343], SKIN_N, SKIN_ND, 18); hand(g, -57, -345, 11, SKIN_N, SKIN_ND);
  // head with a tied shikha and a small gold crown band
  g.save(); g.translate(hx, hy); g.rotate(nod);
  const hairB = P2(q => { q.moveTo(-36, -8); q.bezierCurveTo(-46, -40, -20, -50, 6, -46); q.quadraticCurveTo(20, -44, 24, -38); q.lineTo(-30, 10); q.closePath(); }); paint(g, hairB, HAIR, '#000', 4, 2);
  profileHead(g, { skin: SKIN_N, skinD: SKIN_ND, tilak: 'urdhva', blink: pose.blink });
  const shikha = P2(q => q.ellipse(-16, -56, 14, 12, 0, 0, TAU)); paint(g, shikha, HAIR, '#000', 3, 2);
  const flower = P2(q => q.arc(-6, -62, 6, 0, TAU)); paint(g, flower, WHITE, '#d8cfbf', 2, 1.2);
  leafCord(g, P2(q => { q.moveTo(-32, -30); q.quadraticCurveTo(0, -42, 26, -36); }), 4, { ink: 1.6 });
  g.restore();
  // near arm: plucks (a small, steady rhythm) or lifts in blessing when he speaks
  const pr = Math.sin(t * 5.2) * .5 + .5, hdP = [16 + pr * 8 * pl, -158 - pr * 6 * pl], hdT = [56, -300];
  const hd = mixP(hdP, hdT, talk), el = mixP([44, -228], [44, -246], talk);
  arm(g, [16, -318], el, hd, SKIN_N, SKIN_ND, 19); hand(g, hd[0], hd[1], 11, SKIN_N, SKIN_ND, -.3 - talk);
  g.restore();
}
const blinkAt = (t, seed = 0) => { const p = ((t + seed * 1.7) % 4.3 + 4.3) % 4.3; return p < .14 ? Math.sin(p / .14 * Math.PI) : 0; };

// a flowing thread of gold dots from one point to another (speech, a question, an answer), drawn on at one speed
function speechThread(g, a, b, k, t, lift = 120) {
  if (k <= 0) return; const n = 22;
  for (let i = 0; i < n; i++) { const u = i / (n - 1); if (u > k) break;
    const x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * lift + Math.sin(t * 2 + i * .7) * 3, r = 3 + 2.5 * Math.sin(u * Math.PI);
    const p = P2(q => q.arc(x, y, r, 0, TAU)); leaf(g, p, [x - r, y - r, 2 * r, 2 * r], { lw: .8, rimW: 1 }); gpush(x, y, r * 3, .8); }
}
// small gold notes and petals drifting up from the veena
function notes(g, x, y, t, k = 1) {
  if (k <= 0) return; const R = mulberry(17);
  for (let i = 0; i < 9; i++) { const life = 3.4, ph = ((t * .5 + R() * life) % life) / life, sx = x + (R() - .5) * 60 + Math.sin(ph * 5 + i) * 26, sy = y - ph * 300, a = Math.sin(ph * Math.PI) * k;
    if (a < .05) continue; g.save(); g.globalAlpha = a; const r = 7 + 4 * R();
    if (i % 2) { const p = P2(q => star8(q, sx, sy, r, .45, ph * 2)); leaf(g, p, [sx - r, sy - r, 2 * r, 2 * r], { lw: 1, rimW: 1 }); gpush(sx, sy, r * 3, .7); }
    else { const p = P2(q => { q.ellipse(sx, sy, r * .8, r * .55, ph * 3, 0, TAU); }); paint(g, p, ROSE, ROSE_D, 2, 1.2); }
    g.restore(); }
}
