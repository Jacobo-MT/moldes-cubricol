'use strict';
// =================== Bolsito de herramientas (cartuchera de cinturón) ===================
// 18-nov-2026. Todo en cm. Sellado con calor, igual que las carpas.
// Capas, de atrás hacia adelante:
//   ① Espaldar: la pieza de atrás. Arriba se dobla 3 cm hacia atrás (refuerzo).
//   ④ Pasadores ×2: atrás, sellados arriba y abajo; por ahí pasa la correa.
//   ② Bolsillo grande: rodillo, metro, gafas y lo demás. Tiene fuelle: un pliegue en cada esquina de abajo.
//   ③ Tira de bolsillos: tijera, bisturí y lápices. Va sellada encima del ②.
// x = desde el borde izquierdo, y = desde abajo, z = hacia adelante (hacia quien mira).
const BO_DEF = {
  tijA: 5, tijG: 1.2,     // tijera: ancho y grueso de las hojas (los ojos de los dedos quedan afuera)
  bisA: 2.5, bisG: 1.5,   // bisturí
  lapA: 2, lapG: 1,       // 2 lápices juntos
  hondo: 6,               // fondo del bolsillo grande (el metro tiene unos 4 de grueso)
  cant: 3,                // cuántos bolsitos
};
const BO = {
  S: 3,          // selle del bolsillo grande y de los pasadores
  SC: 2,         // selle de la tira chica y de sus divisiones
  BOCA: 3,       // doblez de refuerzo arriba
  HG: 18,        // alto por dentro del bolsillo grande
  HC: 11,        // alto por dentro de los bolsillos chicos
  ARRIBA: 7,     // lo que sube el espaldar sobre el bolsillo grande
  HOLG: 1,       // holgura de los bolsillos chicos
  PAS_W: 5, PAS_DE: 5, PAS_LUZ: 5, PAS_EXTRA: 1,   // pasador: ancho, a cuánto del borde, hueco para la reata, holgura
  REATA: 3.8,    // 1½"
  ROLLO: 153,
  m: { ...BO_DEF, ...leerLS('bolso', {}) },
  f: 0, juega: false, timer: 0, raf: 0, paso: leerLS('bolsoPaso', 0), esc: null, g: null,
};
const BO_COL = { esp: '#9cc0ef', gr: '#a6dcae', tira: '#f6c48f', pas: '#cdb0ea', sella: '#d9232a', dobla: '#2f56c8', mesa: '#e8dcc4', reata: '#39444b' };
const r5 = v => Math.ceil(v * 2 - 1e-9) / 2;   // sube al medio centímetro

// ---------- cálculos ----------
function boCalcular() {
  const m = BO.m, S = BO.S, SC = BO.SC;
  // cada bolsillo chico: ancho + grueso + holgura (plano, la tela da la vuelta a la herramienta)
  const chicos = [
    { id: 'tij', nombre: 'Tijera', a: m.tijA, t: m.tijG },
    { id: 'bis', nombre: 'Bisturí', a: m.bisA, t: m.bisG },
    { id: 'lap', nombre: 'Lápices', a: m.lapA, t: m.lapG },
  ];
  let x = SC;
  chicos.forEach((c, i) => { c.s = r5(c.a + c.t + BO.HOLG); c.x0 = x; c.x1 = x + c.s; x = c.x1 + SC; });
  const tiraW = x, tiraH = SC + BO.HC;
  // el espaldar es tan ancho como la tira + 1 cm a cada lado + el selle del bolsillo grande
  const W = Math.ceil(tiraW + 2 + 2 * S), sg = W - 2 * S;      // sg = frente del bolsillo grande ya armado
  const hondo = m.hondo, HGt = S + BO.HG;                       // alto del bolsillo grande armado (con el selle de abajo)
  const H = HGt + BO.ARRIBA;                                    // espaldar terminado
  const grW = sg + 2 * hondo + 2 * S;                           // bolsillo grande cortado: el fuelle es lona de más
  const tira = { w: tiraW, h: tiraH, x0: S + hondo + r5((sg - tiraW) / 2), y0: S + 1 };   // sitio de la tira en el ② cortado
  // pasadores: el de arriba queda debajo del doblez de la boca
  const pT1 = H - BO.BOCA, pT0 = pT1 - S, pL1 = pT0, pL0 = pL1 - BO.PAS_LUZ, pB1 = pL0, pB0 = pB1 - S;
  const pas = { w: BO.PAS_W, h: S + BO.PAS_LUZ + BO.PAS_EXTRA + S, xs: [BO.PAS_DE, W - BO.PAS_DE - BO.PAS_W], y: [pB0, pB1, pL0, pL1, pT0, pT1] };
  const g = { m, chicos, tiraW, tiraH, W, H, sg, hondo, HGt, grW, tira, pas };
  g.piezas = boPiezas(g);
  return g;
}

function boPiezas(g) {
  const S = BO.S, SC = BO.SC, B = BO.BOCA, h = g.hondo, t = g.tira;
  const P = [];
  P.push({ n: 1, id: 'esp', nombre: 'Espaldar', col: BO_COL.esp, cant: 1, w: g.W, h: g.H + B,
    bandas: [[0, 0, S, g.HGt], [g.W - S, 0, S, g.HGt], [0, 0, g.W, S]],
    dobleces: [['y', g.H, 'dobla 3 hacia atrás']],
    zonas: [[0, 0, g.W, g.HGt, '② va aquí', BO_COL.gr], ...g.pas.xs.map(x => [x, g.pas.y[0], g.pas.w, g.pas.y[5] - g.pas.y[0], '④ atrás', BO_COL.pas, true])],
    mx: [S, ...g.pas.xs.flatMap(x => [x, x + g.pas.w]), g.W - S], my: [S, g.pas.y[1], g.pas.y[3], g.HGt, g.H],
    nota: 'la de atrás: va contra el cuerpo' });
  const A = S, Bm = S + h / 2, C = S + h, A2 = g.grW - S, B2 = g.grW - S - h / 2, C2 = g.grW - S - h;
  P.push({ n: 2, id: 'gr', nombre: 'Bolsillo grande', col: BO_COL.gr, cant: 1, w: g.grW, h: g.HGt + B,
    bandas: [[0, 0, S, g.HGt], [g.grW - S, 0, S, g.HGt], [0, 0, g.grW, S]],
    dobleces: [['y', g.HGt, 'dobla 3 hacia adentro'], ['x', Bm, 'B'], ['x', B2, 'B']],
    guias: [[A, 'A'], [C, 'C'], [A2, 'A'], [C2, 'C']],
    zonas: [[t.x0, t.y0, t.w, t.h, '③ va aquí', BO_COL.tira]],
    mx: [A, Bm, C, t.x0, t.x0 + t.w, C2, B2, A2], my: [S, t.y0, t.y0 + t.h, g.HGt],
    nota: 'rodillo, metro, gafas y lo demás' });
  P.push({ n: 3, id: 'tira', nombre: 'Tira de bolsillos', col: BO_COL.tira, cant: 1, w: g.tiraW, h: g.tiraH,
    bandas: [[0, 0, g.tiraW, SC], [0, 0, SC, g.tiraH], ...g.chicos.map(c => [c.x1, 0, SC, g.tiraH])],
    zonas: g.chicos.map(c => [c.x0, SC, c.s, BO.HC, c.nombre.toLowerCase(), null]),
    mx: g.chicos.flatMap(c => [c.x0, c.x1]), my: [SC],
    nota: 'tijera, bisturí y lápices' });
  P.push({ n: 4, id: 'pas', nombre: 'Pasador', col: BO_COL.pas, cant: 2, w: g.pas.w, h: g.pas.h,
    bandas: [[0, 0, g.pas.w, S], [0, g.pas.h - S, g.pas.w, S]],
    zonas: [[0, S, g.pas.w, g.pas.h - 2 * S, 'suelto', null]], mx: [], my: [S, g.pas.h - S],
    nota: 'atrás, por aquí pasa la correa' });
  return P;
}
const boP = (g, id) => g.piezas.find(p => p.id === id);
const boN = p => `<span class="gl-n" style="background:${p.col}">${p.n}</span>`;

// Acomoda N bolsitos en el rollo: columnas a lo largo, cada pieza con el lado largo atravesado
function boAcomodar(g, N) {
  const R = BO.ROLLO, GAP = 1, items = [];
  g.piezas.forEach(p => { for (let k = 0; k < p.cant * N; k++) items.push(p); });
  items.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  const cols = [], pos = [];
  items.forEach(p => {
    const largo = Math.max(p.w, p.h), corto = Math.min(p.w, p.h);
    // intenta meterla en una columna que ya existe (de pie o acostada)
    let hecho = false;
    for (const c of cols) {
      for (const [w, h] of [[corto, largo], [largo, corto]]) {
        if (w <= c.w + 1e-6 && c.y + h <= R + 1e-6) { pos.push({ p, x: c.x, y: c.y, w, h }); c.y += h + GAP; hecho = true; break; }
      }
      if (hecho) break;
    }
    if (!hecho) {
      const x = cols.reduce((s, c) => s + c.w + GAP, 0);
      const [w, h] = largo <= R ? [corto, largo] : [largo, corto];
      cols.push({ x, w, y: h + GAP }); pos.push({ p, x, y: 0, w, h });
    }
  });
  const largo = cols.reduce((s, c) => s + c.w + GAP, 0) - GAP;
  return { pos, largo, R };
}

// ---------- 3D: motor pequeño con luz y sombra ----------
const boHex = (h, k) => { const n = parseInt(h.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(Math.min(255, v * k))); return `rgb(${c.join(',')})`; };
function boModelo(g, o = {}) {
  const F = [], L = [], S = BO.S, W = g.W, H = g.H, h = g.hondo, HG = g.HGt;
  const ex = o.ex || {}, dz = (k, p) => [p[0], p[1], p[2] + (ex[k] || 0)];
  const CAPA = { pas: 0, reata: 0, esp: 1, gr: 2, tira: 3, herr: 4 }, ORD = { reata: 0, pas: 1 };
  const cara = (k, pts, col, extra = {}) => F.push({ pts: pts.map(p => dz(k, p)), col, capa: CAPA[k], ord: ORD[k] || 0, ...extra });
  const caja = (k, x0, y0, z0, x1, y1, z1, col) => {
    const q = (a, b, c, d) => cara(k, [a, b, c, d], col);
    const p = (x, y, z) => [x, y, z];
    q(p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1)); q(p(x0, y0, z0), p(x0, y1, z0), p(x1, y1, z0), p(x1, y0, z0));
    q(p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1), p(x1, y1, z0)); q(p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1));
    q(p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), p(x0, y1, z0)); q(p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1));
  };
  const cil = (k, cx, cz, y0, y1, r, col, n = 8) => {
    for (let i = 0; i < n; i++) {
      const a0 = 2 * Math.PI * i / n, a1 = 2 * Math.PI * (i + 1) / n;
      const P0 = [cx + r * Math.cos(a0), cz + r * Math.sin(a0)], P1 = [cx + r * Math.cos(a1), cz + r * Math.sin(a1)];
      cara(k, [[P0[0], y0, P0[1]], [P1[0], y0, P1[1]], [P1[0], y1, P1[1]], [P0[0], y1, P0[1]]], col);
    }
    cara(k, Array.from({ length: n }, (_, i) => [cx + r * Math.cos(2 * Math.PI * i / n), y1, cz + r * Math.sin(2 * Math.PI * i / n)]), col);
  };
  const linea = (k, pts, col, w) => L.push({ pts: pts.map(p => dz(k, p)), col, w, capa: CAPA[k] });
  const ver = k => !o.solo || o.solo.includes(k);
  const roja = (k, pts) => { if (o.sellos && o.sellos.includes(k)) cara(k, pts, BO_COL.sella, { op: .75, encima: true }); };

  // ① espaldar (con el doblez de atrás) y ④ pasadores
  if (ver('esp')) {
    caja('esp', 0, 0, -0.5, W, H, 0, BO_COL.esp);
    cara('esp', [[0, H - BO.BOCA, -0.52], [W, H - BO.BOCA, -0.52], [W, H, -0.52], [0, H, -0.52]], boHex(BO_COL.esp, .9));
  }
  if (ver('pas')) g.pas.xs.forEach(x => {
    const [b0, b1, l0, l1, t0, t1] = g.pas.y, z = -0.55, zl = -1.6, x1 = x + g.pas.w;
    cara('pas', [[x, b0, z], [x1, b0, z], [x1, b1, z], [x, b1, z]], BO_COL.pas);
    cara('pas', [[x, b1, z], [x1, b1, z], [x1, (l0 + l1) / 2, zl], [x, (l0 + l1) / 2, zl]], BO_COL.pas);
    cara('pas', [[x, (l0 + l1) / 2, zl], [x1, (l0 + l1) / 2, zl], [x1, t0, z], [x, t0, z]], BO_COL.pas);
    cara('pas', [[x, t0, z], [x1, t0, z], [x1, t1, z], [x, t1, z]], BO_COL.pas);
    roja('pas', [[x, b0, z - .02], [x1, b0, z - .02], [x1, b1, z - .02], [x, b1, z - .02]]);
    roja('pas', [[x, t0, z - .02], [x1, t0, z - .02], [x1, t1, z - .02], [x, t1, z - .02]]);
  });
  // ② bolsillo grande: abajo pegado al espaldar, arriba se abre lo hondo
  const zf = y => y <= S ? 0.05 : 0.05 + h * (y - S) / (HG - S);
  if (ver('gr')) {
    const k = 'gr', c = BO_COL.gr;
    cara(k, [[0, 0, .05], [W, 0, .05], [W, S, .05], [0, S, .05]], c);
    cara(k, [[0, 0, .05], [S, 0, .05], [S, HG, .05], [0, HG, .05]], c);
    cara(k, [[W - S, 0, .05], [W, 0, .05], [W, HG, .05], [W - S, HG, .05]], c);
    cara(k, [[S, S, .05], [S, HG, .05], [S, HG, zf(HG)]], boHex(c, .92));
    cara(k, [[W - S, S, .05], [W - S, HG, .05], [W - S, HG, zf(HG)]], boHex(c, .92));
    cara(k, [[S, S, zf(S)], [W - S, S, zf(S)], [W - S, HG - BO.BOCA, zf(HG - BO.BOCA)], [S, HG - BO.BOCA, zf(HG - BO.BOCA)]], c);
    cara(k, [[S, HG - BO.BOCA, zf(HG - BO.BOCA)], [W - S, HG - BO.BOCA, zf(HG - BO.BOCA)], [W - S, HG, zf(HG)], [S, HG, zf(HG)]], boHex(c, .88));
    roja(k, [[0, 0, .1], [W, 0, .1], [W, S, .1], [0, S, .1]]);
    roja(k, [[0, S, .1], [S, S, .1], [S, HG, .1], [0, HG, .1]]);
    roja(k, [[W - S, S, .1], [W, S, .1], [W, HG, .1], [W - S, HG, .1]]);
  }
  // ③ tira encima del frente del ② (ya armado: se le quita el fuelle)
  const tx0 = g.tira.x0 - g.hondo, ty0 = BO.S + 1, ty1 = ty0 + g.tiraH, zt = y => zf(y) + 0.25;
  if (ver('tira')) {
    const k = 'tira', c = BO_COL.tira;
    cara(k, [[tx0, ty0, zt(ty0)], [tx0 + g.tiraW, ty0, zt(ty0)], [tx0 + g.tiraW, ty1, zt(ty1) + .9], [tx0, ty1, zt(ty1) + .9]], c);
    const zz = y => zt(y) + .9 * (y - ty0) / (ty1 - ty0) + .03;
    g.chicos.forEach(ch => linea(k, [[tx0 + ch.x1 + BO.SC / 2, ty0, zz(ty0)], [tx0 + ch.x1 + BO.SC / 2, ty1, zz(ty1)]], boHex(c, .7), .25));
    linea(k, [[tx0 + BO.SC / 2, ty0, zz(ty0)], [tx0 + BO.SC / 2, ty1, zz(ty1)]], boHex(c, .7), .25);
    linea(k, [[tx0, ty0 + BO.SC / 2, zz(ty0)], [tx0 + g.tiraW, ty0 + BO.SC / 2, zz(ty0)]], boHex(c, .7), .25);
    if (o.sellos && o.sellos.includes('tira')) {
      roja(k, [[tx0, ty0, zz(ty0)], [tx0 + g.tiraW, ty0, zz(ty0)], [tx0 + g.tiraW, ty0 + BO.SC, zz(ty0 + BO.SC)], [tx0, ty0 + BO.SC, zz(ty0 + BO.SC)]]);
      [0, ...g.chicos.map(ch => ch.x1)].forEach(x => roja(k, [[tx0 + x, ty0, zz(ty0)], [tx0 + x + BO.SC, ty0, zz(ty0)], [tx0 + x + BO.SC, ty1, zz(ty1)], [tx0 + x, ty1, zz(ty1)]]));
    }
  }
  // herramientas: solo lo que asoma por arriba
  if (o.herr !== undefined && ver('herr')) {
    const u = o.herr, baja = (i) => Math.max(0, 1 - Math.max(0, u * 1.6 - i * .12)) * 28;   // caen una por una
    const k = 'herr', [cT, cB, cL] = g.chicos.map(ch => tx0 + (ch.x0 + ch.x1) / 2), zT = zt(ty1) + .5;
    // tijera: los dos ojos
    const dy0 = baja(0);
    [[-1.7, 3.6, 2.4], [1.9, 3.1, 2.1]].forEach(([dx, dy, r]) => {
      const pts = Array.from({ length: 17 }, (_, i) => [cT + dx + r * Math.cos(i * Math.PI / 8), ty1 + dy + dy0 + r * 1.2 * Math.sin(i * Math.PI / 8), zT]);
      linea(k, pts, '#d9232a', .9);
    });
    linea(k, [[cT - .6, ty1 - .4 + dy0, zT], [cT + .2, ty1 + 1.4 + dy0, zT]], '#9aa3ab', .7);
    // bisturí: mango amarillo
    const dy1 = baja(1); caja(k, cB - 1, ty1 - 1 + dy1, zT - .5, cB + 1, ty1 + 6 + dy1, zT + .6, '#f2c230');
    caja(k, cB - .4, ty1 + 6 + dy1, zT - .2, cB + .4, ty1 + 6.8 + dy1, zT + .3, '#39444b');
    // 2 lápices
    const dy2 = baja(2);
    caja(k, cL - .95, ty1 - 1 + dy2, zT - .4, cL - .05, ty1 + 5.5 + dy2, zT + .5, '#2f56c8');
    caja(k, cL + .05, ty1 - 1 + dy2, zT - .4, cL + .95, ty1 + 4.6 + dy2, zT + .5, '#d9232a');
    caja(k, cL - .95, ty1 + 5.5 + dy2, zT - .4, cL - .05, ty1 + 6.3 + dy2, zT + .5, '#f2a7b5');
    // bolsillo grande: rodillo (mango de madera), metro, gafas
    const zm = h * .5, dy3 = baja(3), dy4 = baja(4), dy5 = baja(5);
    cil(k, S + 4.5, zm, HG - 1 + dy3, HG + 7 + dy3, 1.3, '#b07a45');
    caja(k, S + 4.1, HG + 7 + dy3, zm - .4, S + 4.9, HG + 8.2 + dy3, zm + .4, '#39444b');
    caja(k, W / 2 + 1, HG - 2 + dy4, 1.2, W / 2 + 8, HG + 1.6 + dy4, 1.2 + 3.6, '#f2c230');
    caja(k, W / 2 + 1.5, HG + 1.6 + dy4, 2.2, W / 2 + 3.5, HG + 2.3 + dy4, 3.6, '#39444b');
    const gx = W - S - 5;
    caja(k, gx - 3, HG - 1 + dy5, h * .25, gx + 3, HG + 1.8 + dy5, h * .25 + 1.2, '#4a545b');
    linea(k, [[gx - 2.6, HG + 1.8 + dy5, h * .25 + .6], [gx - 2.2, HG + 6 + dy5, h * .25 + .6]], '#4a545b', .5);
    linea(k, [[gx + 2.6, HG + 1.8 + dy5, h * .25 + .6], [gx + 2.2, HG + 6 + dy5, h * .25 + .6]], '#4a545b', .5);
  }
  // correa por los pasadores (atrás)
  if (o.correa !== undefined) {
    const yc = (g.pas.y[2] + g.pas.y[3]) / 2, r = BO.REATA / 2, zc = -1.05, largo = 26, d = (1 - o.correa) * (W + largo);
    const x0 = -largo + d, x1 = Math.min(W + largo, W + largo * .2 + d + W);
    cara('reata', [[x0, yc - r, zc], [x1, yc - r, zc], [x1, yc + r, zc], [x0, yc + r, zc]], BO_COL.reata);
    if (o.correa >= 1) caja('reata', -10, yc - r - .6, zc - .9, -4, yc + r + .6, zc - .2, '#14181b');
  }
  return { F, L };
}
function bo3D(g, a, o = {}) {
  const { F, L } = boModelo(g, o), cx = g.W / 2, cy = g.H / 2 + 2, e = o.e !== undefined ? o.e : 0.32;
  const ca = Math.cos(a), sa = Math.sin(a), ce = Math.cos(e), se = Math.sin(e), deFrente = ca >= 0;
  const pr = ([x, y, z]) => { const X = x - cx, Y = y - cy; const x1 = X * ca + z * sa, z1 = -X * sa + z * ca; return [x1, -(Y * ce - z1 * se), z1 * ce + Y * se]; };
  // de frente se pinta primero lo de atrás; de espaldas, al revés
  const capa = c => deFrente ? c : (c === 0 ? 5 : c === 1 ? 1 : 0);
  const luz = [-0.4, 0.55, 0.73];
  const elems = [];
  F.forEach(f => {
    const P = f.pts.map(pr), [p0, p1, p2] = [P[0], P[1], P[2]];
    const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], v = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const ln = Math.hypot(...n) || 1; n = n.map(x => x / ln);
    if (n[2] < 0) n = n.map(x => -x);
    const k = 0.9 + 0.16 * Math.max(0, n[0] * luz[0] - n[1] * luz[1] + n[2] * luz[2]);
    const col = f.col.startsWith('#') ? boHex(f.col, k) : f.col;
    elems.push({ c: capa(f.capa), o: (deFrente ? 0 : f.ord) + (f.encima ? 9 : 0), d: P.reduce((s, p) => s + p[2], 0) / P.length, svg: `<polygon points="${P.map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ')}" fill="${col}" ${f.op ? `fill-opacity="${f.op}"` : ''} stroke="#14181b" stroke-width=".12" stroke-linejoin="round"/>` });
  });
  L.forEach(l => { const P = l.pts.map(pr); elems.push({ c: capa(l.capa), o: 8, d: 0, svg: `<polyline points="${P.map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ')}" fill="none" stroke="${l.col}" stroke-width="${l.w}" stroke-linecap="round" stroke-linejoin="round"/>` }); });
  elems.sort((A, B) => A.c - B.c || A.o - B.o || A.d - B.d);
  // encuadre fijo: no cambia al girar
  const ref = boModelo(g, { herr: 1, correa: o.correa !== undefined ? 1 : undefined }).F.flatMap(f => f.pts);
  const exz = Math.max(0, ...Object.values(o.ex || {}).map(Math.abs));
  const Rh = Math.max(...ref.map(([x, , z]) => Math.hypot(x - cx, Math.abs(z) + exz))) + 1;
  const yM = Math.max(...ref.map(p => p[1])), ym = Math.min(...ref.map(p => p[1]));
  const top = -((yM - cy) * ce + Rh * se) - 2, bot = (cy - ym) * ce + Rh * se + 2;
  let s = `<svg viewBox="${(-Rh - 1).toFixed(1)} ${top.toFixed(1)} ${(2 * Rh + 2).toFixed(1)} ${(bot - top).toFixed(1)}" role="img" aria-label="El bolsito en 3D">`;
  s += `<ellipse cx="0" cy="${(bot - 2.5).toFixed(1)}" rx="${(Rh * .75).toFixed(1)}" ry="${(Rh * .08).toFixed(1)}" fill="#14181b" opacity=".08"/>`;
  s += elems.map(x => x.svg).join('');
  const fs = (Rh / 9).toFixed(1);
  (o.textos || []).forEach(([p, t, col]) => { const q = pr(p); s += `<text x="${q[0].toFixed(1)}" y="${q[1].toFixed(1)}" font-size="${fs}" text-anchor="middle" fill="${col || '#14181b'}" stroke="#fff" stroke-width="${(Rh / 50).toFixed(2)}" paint-order="stroke">${t}</text>`; });
  return s + '</svg>';
}

// ---------- ficha de una pieza: el rectángulo de corte con todo marcado ----------
function boFicha(g, p, o = {}) {
  const W = 640, cab = 96, mx = 70, mt = 64, mb = 80;
  const s = Math.min((W - 2 * mx) / p.w, 380 / p.h), pw = p.w * s, ph = p.h * s, H = cab + mt + ph + mb + 60;
  const X = x => (W - pw) / 2 + x * s, Y = y => cab + mt + ph - y * s;
  let r = `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" role="img" aria-label="Pieza ${p.n}: ${p.nombre}">${FL}`;
  r += `<rect x="2" y="${cab - 8}" width="${W - 4}" height="${(H - cab + 4).toFixed(0)}" rx="12" fill="${BO_COL.mesa}"/>`;
  r += glBola(46, 50, p, 34) + glT(92, 44, p.nombre, { fs: 30, ta: 'start' });
  r += glT(92, 76, `${p.cant > 1 ? `<tspan fill="${BO_COL.sella}">corta ${p.cant}</tspan> · ` : ''}${p.nota}`, { fs: 20, ta: 'start', col: '#4a545b' });
  r += glAp(.1, `<rect x="${X(0)}" y="${Y(p.h)}" width="${pw}" height="${ph}" fill="${p.col}" stroke="#14181b" stroke-width="3"/>`);
  (p.zonas || []).forEach(([x, y, w, h, t, col, atras], i) => {
    if (col) r += glAp(.4, `<rect x="${X(x)}" y="${Y(y + h)}" width="${w * s}" height="${h * s}" fill="${col}" fill-opacity="${atras ? .55 : .35}" stroke="#14181b" stroke-width="1.5" stroke-dasharray="${atras ? '3 4' : '8 5'}"/>`);
    r += glAp(.5, glT(X(x + w / 2), Y(y + h / 2) + 7, t, { fs: Math.min(22, w * s / 3.2 + 6), col: '#14181b' }));
  });
  (p.bandas || []).forEach(([x, y, w, h], i) => { r += glAp(.7 + i * .1, `<rect x="${X(x)}" y="${Y(y + h)}" width="${w * s}" height="${h * s}" fill="${BO_COL.sella}" fill-opacity=".38"/>`); });
  (p.guias || []).forEach(([x, t]) => { r += glAp(1, `<line x1="${X(x)}" y1="${Y(0)}" x2="${X(x)}" y2="${Y(g.HGt)}" stroke="#14181b" stroke-width="1.5"/>` + glT(X(x), Y(0) + 24, t, { fs: 18 })); });
  (p.dobleces || []).forEach(([eje, v, t]) => {
    if (eje === 'y') r += glAp(1.2, `<line x1="${X(0)}" y1="${Y(v)}" x2="${X(p.w)}" y2="${Y(v)}" stroke="${BO_COL.dobla}" stroke-width="2.5" stroke-dasharray="10 6"/>` + glT(X(p.w / 2), Y(v) - 8, t, { fs: 18, col: BO_COL.dobla }));
    else r += glAp(1.2, `<line x1="${X(v)}" y1="${Y(0)}" x2="${X(v)}" y2="${Y(g.HGt)}" stroke="${BO_COL.dobla}" stroke-width="2.5" stroke-dasharray="10 6"/>` + glT(X(v), Y(0) + 24, t, { fs: 18, col: BO_COL.dobla }));
  });
  // medidas de corte
  r += glAp(1.4, flecha(X(0), Y(0) + 50, X(p.w), Y(0) + 50, '#14181b', 2) + glT(X(p.w / 2), Y(0) + 74, `${n1(p.w)}`, { fs: 30 }));
  r += glAp(1.4, flecha(X(0) - 26, Y(0), X(0) - 26, Y(p.h), '#14181b', 2) + `<text transform="translate(${X(0) - 36} ${Y(p.h / 2)}) rotate(-90)" font-size="30" text-anchor="middle" fill="#14181b" stroke="#fff" stroke-width="4" paint-order="stroke">${n1(p.h)}</text>`);
  // regla de arriba: dónde va cada raya, medido desde el borde izquierdo
  const xs = [...new Set((p.mx || []).map(v => Math.round(v * 10) / 10))].sort((a, b) => a - b);
  xs.forEach((v, i) => {
    const alto = i % 2 ? 26 : 8;
    r += glAp(1.8 + i * .08, `<line x1="${X(v)}" y1="${Y(p.h)}" x2="${X(v)}" y2="${Y(p.h) - 8 - alto}" stroke="#14181b" stroke-width="1.5"/>` + glT(X(v), Y(p.h) - 12 - alto, n1(v), { fs: 17 }));
  });
  const ys = [...new Set((p.my || []).map(v => Math.round(v * 10) / 10))].sort((a, b) => a - b);
  ys.forEach((v, i) => { r += glAp(1.8 + i * .08, `<line x1="${X(p.w)}" y1="${Y(v)}" x2="${X(p.w) + 10}" y2="${Y(v)}" stroke="#14181b" stroke-width="1.5"/>` + glT(X(p.w) + 14, Y(v) + 6, n1(v), { fs: 17, ta: 'start' })); });
  // leyenda
  const ly = H - 22;
  r += `<rect x="24" y="${ly - 14}" width="34" height="14" fill="${BO_COL.sella}" fill-opacity=".38"/>` + glT(64, ly, 'se sella', { fs: 17, ta: 'start', col: '#4a545b' });
  if ((p.dobleces || []).length) r += `<line x1="160" y1="${ly - 6}" x2="200" y2="${ly - 6}" stroke="${BO_COL.dobla}" stroke-width="2.5" stroke-dasharray="10 6"/>` + glT(206, ly, 'se dobla', { fs: 17, ta: 'start', col: '#4a545b' });
  r += glT(W - 20, ly, 'rayas medidas desde la izquierda y desde abajo', { fs: 15, ta: 'end', col: '#6b757c' });
  return r + '</svg>';
}

// ---------- el rollo ----------
function boRollo(g, N) {
  const ac = boAcomodar(g, N), R = ac.R, W = ac.largo + 150, H = R + 40;
  let s = `<svg viewBox="-4 -4 ${(W + 8).toFixed(0)} ${H + 8}" role="img" aria-label="Cómo sale del rollo">`;
  s += `<rect x="0" y="0" width="${ac.largo.toFixed(1)}" height="${R}" fill="#f4f6fb" stroke="#b9c1de" stroke-dasharray="6 4"/>`;
  ac.pos.forEach((q, i) => { s += glAp(i * .05, `<rect x="${q.x.toFixed(1)}" y="${q.y.toFixed(1)}" width="${q.w.toFixed(1)}" height="${q.h.toFixed(1)}" fill="${q.p.col}" stroke="#14181b" stroke-width="1.2"/>` + glBola(q.x + q.w / 2, q.y + q.h / 2, q.p, Math.max(3.5, Math.min(9, Math.min(q.w, q.h) * .35)))); });
  s += glT(ac.largo + 10, R / 2, `${n1(ac.largo / 100)} m`, { fs: 30, ta: 'start' });
  s += glT(ac.largo + 10, R / 2 + 26, `rollo de ${BO.ROLLO}`, { fs: 16, ta: 'start', col: '#6b757c' });
  return s + '</svg>';
}

// ---------- dibujos en plano ----------
// un bolsillo chico visto de frente, con la herramienta adentro y de dónde sale el ancho
function boBolsilloChico(g, c) {
  const W = 640, H = 420, s = 300 / Math.max(c.s + 2 * BO.SC, 8) > 30 ? 30 : 300 / (c.s + 2 * BO.SC);
  const x0 = W / 2 - (c.s / 2 + BO.SC) * s, yb = 330, X = x => x0 + x * s, Y = y => yb - y * s;
  let r = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bolsillo de ${c.nombre}">${FL}<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="12" fill="${BO_COL.mesa}"/>`;
  const tot = c.s + 2 * BO.SC, alto = Math.min(BO.HC + BO.SC, 250 / s);
  r += `<rect x="${X(0)}" y="${Y(alto)}" width="${tot * s}" height="${alto * s}" fill="${BO_COL.tira}" stroke="#14181b" stroke-width="2.5"/>`;
  r += `<rect x="${X(0)}" y="${Y(alto)}" width="${BO.SC * s}" height="${alto * s}" fill="${BO_COL.sella}" fill-opacity=".38"/><rect x="${X(BO.SC + c.s)}" y="${Y(alto)}" width="${BO.SC * s}" height="${alto * s}" fill="${BO_COL.sella}" fill-opacity=".38"/>`;
  // la herramienta, vista de canto (corte): ancho × grueso
  r += glAp(.4, `<rect x="${X(BO.SC + (c.s - c.a) / 2)}" y="${Y(alto * .55) - c.t * s / 2}" width="${c.a * s}" height="${c.t * s}" rx="4" fill="#39444b"/>`);
  r += glAp(.8, flecha(X(BO.SC + (c.s - c.a) / 2), Y(alto * .55) + c.t * s / 2 + 18, X(BO.SC + (c.s + c.a) / 2), Y(alto * .55) + c.t * s / 2 + 18, '#14181b', 2) + glT(X(BO.SC + c.s / 2), Y(alto * .55) + c.t * s / 2 + 44, `ancho ${n1(c.a)}`, { fs: 22 }));
  r += glAp(1.1, glT(X(BO.SC + (c.s + c.a) / 2) + 10, Y(alto * .55) + 8, `grueso ${n1(c.t)}`, { fs: 22, ta: 'start' }));
  r += glAp(1.5, flecha(X(BO.SC), Y(alto) - 22, X(BO.SC + c.s), Y(alto) - 22, BO_COL.sella, 2.5) + glT(X(BO.SC + c.s / 2), Y(alto) - 32, `${n1(c.s)} de bolsillo`, { fs: 26, col: BO_COL.sella }));
  r += glAp(2, glT(W / 2, 390, `${n1(c.a)} + ${n1(c.t)} + ${n1(BO.HOLG)} de holgura${c.s > c.a + c.t + BO.HOLG + .01 ? ', y se sube al medio cm' : ''} = ${n1(c.s)}`, { fs: 22, col: '#39444b' }));
  return r + '</svg>';
}

// el fuelle: corte visto desde arriba, en el fondo del bolsillo grande (esquina izquierda; la derecha es igual).
// u = 0 plano, u = 1 doblado. Las capas se dibujan separadas para que se entienda.
function boFuelle(g, u) {
  const W = 640, H = 360, h = g.hondo, S = BO.S, largo = S + h + 5, s = 540 / largo, gap = 22;
  const X = x => 50 + x * s, Y0 = 200, Y = z => Y0 - z;
  const A = S, Bx = S + h / 2, th = Math.PI * u;
  const B = [X(Bx), Y(0)], C = [B[0] + (h / 2) * s * Math.cos(th), Y(0) - Math.sin(th) * 70 - gap * u];
  const Cz = C[1], restoZ = Cz - gap * u;
  let r = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cómo se dobla el fuelle">${FL}<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="12" fill="${BO_COL.mesa}"/>`;
  r += glT(W / 2, 34, 'el fondo del ② visto desde arriba', { fs: 20, col: '#4a545b' });
  // ① espaldar debajo
  r += `<rect x="${X(0)}" y="${Y0 + 14}" width="${largo * s}" height="12" rx="3" fill="${BO_COL.esp}" stroke="#14181b" stroke-width="1.5"/>` + glT(X(largo) - 4, Y0 + 52, '① espaldar', { fs: 18, ta: 'end', col: '#4a545b' });
  // la lona del ②: borde que se sella, A→B, B→C y lo que sigue
  const linea = (pts, col) => `<polyline points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
  r += `<rect x="${X(0)}" y="${Y0 - 14}" width="${S * s}" height="28" fill="${BO_COL.sella}" fill-opacity=".35"/>`;
  r += linea([[X(0), Y(0)], [X(A), Y(0)], B], '#1f8f4e');
  r += linea([B, C], boHex(BO_COL.gr, .72));
  r += linea([C, [C[0] + 10 * u, restoZ], [X(largo), restoZ]], '#1f8f4e');
  [[X(A), Y(0), 'A', '#14181b'], [B[0], B[1], 'B', BO_COL.dobla], [C[0], C[1], 'C', '#14181b']].forEach(([x, y, t, col]) => {
    r += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${col}" stroke="#fff" stroke-width="2"/>` + glT(x, t === 'C' ? y - 18 : y + 42, t, { fs: 28, col });
  });
  r += glT(X(S / 2), Y0 + 74, 'sella', { fs: 20, col: BO_COL.sella });
  r += glT(W / 2, 300, u < .4 ? `A a ${n1(S)} · B a ${n1(S + h / 2)} · C a ${n1(S + h)} del borde` : `dobla en B hasta que C quede encima de A`, { fs: 26 });
  r += glT(W / 2, 334, `el pliegue queda adentro; al abrir, el bolsillo tiene ${n1(h)} de hondo`, { fs: 19, col: '#4a545b' });
  return r + '</svg>';
}

// la tira ③ baja sobre el ② en la mesa y se sella
function boMesaTira(g, u) {
  const gr = boP(g, 'gr'), ti = boP(g, 'tira'), t = g.tira, W = 640, s = (W - 80) / gr.w, H = gr.h * s + 120;
  const X = x => 40 + x * s, Y = y => 40 + gr.h * s - y * s, baja = Math.max(0, 1 - u / .5) * 60;
  let r = `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" role="img" aria-label="La tira sobre el bolsillo grande">${FL}<rect x="2" y="2" width="${W - 4}" height="${(H - 4).toFixed(0)}" rx="12" fill="${BO_COL.mesa}"/>`;
  r += `<rect x="${X(0)}" y="${Y(gr.h)}" width="${gr.w * s}" height="${gr.h * s}" fill="${gr.col}" stroke="#14181b" stroke-width="2.5"/>`;
  r += `<rect x="${X(t.x0)}" y="${Y(t.y0 + t.h)}" width="${t.w * s}" height="${t.h * s}" fill="none" stroke="#14181b" stroke-width="1.5" stroke-dasharray="8 5"/>`;
  r += `<g transform="translate(0 ${(-baja).toFixed(1)})"><rect x="${X(t.x0)}" y="${Y(t.y0 + t.h)}" width="${t.w * s}" height="${t.h * s}" fill="${ti.col}" stroke="#14181b" stroke-width="2.5"/>`;
  if (u > .55) ti.bandas.forEach(([x, y, w, h], i) => { if (u > .55 + i * .08) r += `<rect x="${X(t.x0 + x)}" y="${Y(t.y0 + y + h)}" width="${w * s}" height="${h * s}" fill="${BO_COL.sella}" fill-opacity=".55"/>`; });
  g.chicos.forEach(c => { r += glT(X(t.x0 + (c.x0 + c.x1) / 2), Y(t.y0 + t.h / 2) + 6, c.nombre.toLowerCase(), { fs: Math.min(16, c.s * s / 3.4 + 4) }); });
  r += `</g>` + glT(X(gr.w / 2), Y(gr.h) - 12, '② bolsillo grande, todavía plano', { fs: 18, col: '#4a545b' });
  r += glT(W / 2, H - 22, u > .55 ? `sella los lados, las divisiones y el fondo (${BO.SC} cm). La boca queda abierta.` : `pon ③ en su sitio: a ${n1(t.x0)} del borde y a ${n1(t.y0)} de abajo`, { fs: 20 });
  return r + '</svg>';
}

// cómo se lleva: figuras sencillas
function boLlevar(modo) {
  const W = 640, H = 420, bolsa = (x, y, w, h, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="5" fill="${BO_COL.esp}" stroke="#14181b" stroke-width="2.5"/><rect x="${-w / 2 + 4}" y="${-h / 2 + h * .3}" width="${w - 8}" height="${h * .68}" rx="3" fill="${BO_COL.gr}" stroke="#14181b" stroke-width="2"/><rect x="${-w / 2 + 12}" y="${-h / 2 + h * .52}" width="${w - 24}" height="${h * .42}" rx="2" fill="${BO_COL.tira}" stroke="#14181b" stroke-width="1.6"/></g>`;
  const correa = (pts, w = 7) => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${BO_COL.reata}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const gente = `<g fill="#cfd5da" stroke="#6b757c" stroke-width="2"><circle cx="320" cy="62" r="34"/><path d="M262 110 Q320 92 378 110 L392 250 L248 250 Z"/><path d="M252 250 L388 250 L378 400 L330 400 L320 300 L310 400 L262 400 Z"/><path d="M262 112 L226 236 L242 242 L276 140 Z"/><path d="M378 112 L414 236 L398 242 L364 140 Z"/></g>`;
  let r = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cómo se lleva">${FL}<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="12" fill="#f4f6fb"/>`;
  if (modo === 'cintura') r += gente + correa([[250, 236], [390, 236]]) + bolsa(372, 262, 54, 62) + glT(500, 240, 'cintura', { fs: 30 });
  else if (modo === 'pierna') r += gente + correa([[318, 318], [396, 318]]) + bolsa(366, 336, 40, 48) + glT(500, 330, 'pierna', { fs: 30 }) + glT(500, 360, 'la misma correa, más corta', { fs: 17, col: '#6b757c' });
  else if (modo === 'tubo') r += `<rect x="290" y="20" width="34" height="390" fill="#c9ced3" stroke="#6b757c" stroke-width="2"/><rect x="120" y="230" width="400" height="14" fill="#a0a8ae"/>` + correa([[280, 150], [334, 150]], 8) + bolsa(307, 182, 70, 80) + glT(500, 140, 'tubo de la carpa', { fs: 26 }) + glT(500, 172, 'o pata de la mesa', { fs: 20, col: '#6b757c' });
  else r += gente + correa([[350, 104], [402, 300]]) + correa([[290, 104], [402, 300]], 6) + bolsa(404, 310, 54, 62, -8) + glT(520, 200, 'hombro', { fs: 30 }) + glT(520, 230, 'con reata de 1,50', { fs: 18, col: '#6b757c' });
  return r + '</svg>';
}

// =================== las láminas ===================
const boFichaCu = (g, id) => { const p = boP(g, id); return { t: `${boN(p)} <b>${p.nombre}</b>${p.cant > 1 ? ` (corta <b>${p.cant}</b>)` : ''}: <b>${n1(p.w)} × ${n1(p.h)}</b>.`, svg: () => boFicha(g, p), alto: true }; };
const BO_ESC = {
  inicio: g => ({ titulo: 'El bolsito', cuadros: [
    { t: `Una cartuchera de lona para la <b>correa</b>: todo a la mano.`, anim: { dur: 6000, f: u => bo3D(g, -0.6 + u * 1.2, { herr: 1 }) } },
    { t: `Adelante, <b>tijera</b>, <b>bisturí</b> y <b>lápices</b>. Atrás, el bolsillo grande: <b>rodillo</b>, <b>metro</b> y <b>gafas</b>.`, svg: () => bo3D(g, -0.35, { herr: 1 }) },
    { t: `Mide <b>${n1(g.W)}</b> de ancho y <b>${n1(g.H)}</b> de alto. El bolsillo grande tiene <b>${n1(g.hondo)}</b> de hondo.`, svg: () => bo3D(g, 0.5, { herr: 1, textos: [[[g.W / 2, -3, 0], `${n1(g.W)} de ancho`], [[g.W + 3, g.H / 2, 0], `${n1(g.H)}`]] }) },
    { t: `Atrás tiene <b>2 pasadores</b>: la correa se amarra donde cada uno quiera.`, anim: { dur: 4000, f: u => bo3D(g, Math.PI - 0.5 + u * .6, { correa: Math.min(1, u * 1.4) }) } },
  ] }),
  herr: g => {
    const m = g.m, campo = (k, t, paso = .5) => `<div class="paso-num"><span class="etq">${t}</span><div class="stepper"><button data-bo="${k}" data-d="${-paso}" aria-label="Menos">−</button><input data-boin="${k}" type="number" inputmode="decimal" step="${paso}" value="${m[k]}"><button data-bo="${k}" data-d="${paso}" aria-label="Más">+</button></div></div>`;
    return { titulo: 'Herramientas', arriba: `<p class="guia">Mide <b>ancho</b> y <b>grueso</b> de cada herramienta, en la parte que entra al bolsillo. Si cambian, el molde se recalcula solo.</p>
      <h2>Tijera (las hojas)</h2><div class="co-tres bo-dos">${campo('tijA', 'Ancho cm')}${campo('tijG', 'Grueso cm', .1)}</div>
      <h2>Bisturí</h2><div class="co-tres bo-dos">${campo('bisA', 'Ancho cm')}${campo('bisG', 'Grueso cm', .1)}</div>
      <h2>Lápices (los 2 juntos)</h2><div class="co-tres bo-dos">${campo('lapA', 'Ancho cm')}${campo('lapG', 'Grueso cm', .1)}</div>
      <h2>Bolsillo grande</h2><div class="co-tres bo-dos">${campo('hondo', 'Hondo cm')}</div>
      <button class="sec" id="boRestaurar">Volver a las medidas comunes</button>`, cuadros: [
      ...g.chicos.map(c => ({ t: `Bolsillo de la <b>${c.nombre.toLowerCase()}</b>: <b>${n1(c.s)}</b> de ancho.`, svg: () => boBolsilloChico(g, c) })),
      { t: `El grande: <b>${n1(g.sg)}</b> de ancho y <b>${n1(g.hondo)}</b> de hondo. Caben rodillo, metro y gafas juntos.`, svg: () => bo3D(g, -0.2, { herr: 1, e: 0.75 }) },
    ] };
  },
  piezas: g => {
    const N = g.m.cant, ac = boAcomodar(g, N);
    return { titulo: 'Las piezas', arriba: `<div class="total"><span class="etq">Para ${N} bolsito${N > 1 ? 's' : ''}</span><b>${n1(Math.ceil(ac.largo * 1.1 / 10) / 10)} m</b><span>de rollo de ${BO.ROLLO} (con 10 % de desperdicio). También sale de retazos.</span></div>
      <div class="co-tres bo-dos"><div class="paso-num"><span class="etq">¿Cuántos bolsitos?</span><div class="stepper"><button data-bo="cant" data-d="-1" aria-label="Menos">−</button><input data-boin="cant" type="number" inputmode="numeric" step="1" value="${N}"><button data-bo="cant" data-d="1" aria-label="Más">+</button></div></div></div>`, cuadros: [
      { t: `Son <b>4 piezas</b> por bolsito (5 con el pasador repetido). Cada una con su <b>número</b> y su <b>color</b>.`, svg: () => bo3D(g, -0.5, { ex: { tira: 9, gr: 5, pas: -5 } }) },
      { t: `Así salen <b>${N}</b> del rollo de <b>${BO.ROLLO}</b>: <b>${n1(ac.largo / 100)} m</b> justos.`, svg: () => boRollo(g, N), alto: true },
      ...g.piezas.map(p => boFichaCu(g, p.id)),
    ] };
  },
  armar: g => {
    const pas = boP(g, 'pas'), esp = boP(g, 'esp'), gr = boP(g, 'gr'), ti = boP(g, 'tira');
    return { titulo: 'Armar', cuadros: [
      { t: `1. Dobla <b>${BO.BOCA}</b> arriba de ${boN(esp)} hacia atrás y séllalo: es el refuerzo.`, svg: () => bo3D(g, Math.PI - 0.45, { solo: ['esp'] }) },
      { t: `2. Atrás de ${boN(esp)}, sella los 2 ${boN(pas)} <b>arriba y abajo</b> (${BO.S} cm). El medio queda suelto.`, anim: { dur: 3500, f: u => bo3D(g, Math.PI - 0.45, { solo: ['esp', 'pas'], ex: { pas: -10 * Math.max(0, 1 - u * 1.5) }, sellos: u > .7 ? ['pas'] : [] }) } },
      { t: `3. Con ${boN(gr)} todavía plano, sella ${boN(ti)} encima.`, anim: { dur: 4500, f: u => boMesaTira(g, u) }, alto: true },
      { t: `4. El fuelle: en cada esquina de abajo de ${boN(gr)}, dobla en <b>B</b> para que <b>C</b> caiga sobre <b>A</b>.`, anim: { dur: 4000, f: u => boFuelle(g, Math.min(1, u * 1.3)) } },
      { t: `5. Dobla <b>${BO.BOCA}</b> en la boca de ${boN(gr)} hacia adentro y séllalo.`, svg: () => boFicha(g, gr), alto: true },
      { t: `6. Sella ${boN(gr)} sobre ${boN(esp)}: los <b>2 lados</b> y el <b>fondo</b> (${BO.S} cm), con los pliegues adentro.`, anim: { dur: 4000, f: u => bo3D(g, -0.5, { solo: ['esp', 'gr', 'tira'], ex: { gr: 14 * Math.max(0, 1 - u * 1.5), tira: 14 * Math.max(0, 1 - u * 1.5) }, sellos: u > .7 ? ['gr'] : [] }) } },
      { t: `Listo: mete las herramientas.`, anim: { dur: 3500, f: u => bo3D(g, -0.4, { herr: u }) } },
    ] };
  },
  correa: g => ({ titulo: 'Correa', cuadros: [
    { t: `Reata de <b>1½"</b> de <b>1,30 m</b> con una <b>hebilla de clic</b>. Pasa por los 2 pasadores.`, anim: { dur: 3500, f: u => bo3D(g, Math.PI - 0.5, { correa: u }) } },
    { t: `En la <b>cintura</b>, al lado de la mano que corta.`, svg: () => boLlevar('cintura') },
    { t: `En la <b>pierna</b>: más cómodo si trabajan agachados.`, svg: () => boLlevar('pierna') },
    { t: `En un <b>tubo</b> o en la <b>mesa</b>, mientras sellan.`, svg: () => boLlevar('tubo') },
    { t: `Cruzado al <b>hombro</b>, con una reata más larga.`, svg: () => boLlevar('hombro') },
  ] }),
  final: g => {
    const N = g.m.cant, ac = boAcomodar(g, N);
    return { titulo: 'Listo', cuadros: [
      { t: `Para <b>${N}</b>: <b>${n1(Math.ceil(ac.largo * 1.1 / 10) / 10)} m</b> de lona, <b>${n1(1.3 * N)} m</b> de reata de 1½" y <b>${N}</b> hebilla${N > 1 ? 's' : ''} de clic.`, anim: { dur: 7000, f: u => bo3D(g, -0.6 + u * 6.283, { herr: 1 }) } },
    ], abajo: `<button class="cta verde" id="boCompartir">Enviar medidas por WhatsApp</button>` };
  },
};
const BO_PASOS = [['inicio', 'El bolsito'], ['herr', 'Herramientas'], ['piezas', 'Piezas'], ['armar', 'Armar'], ['correa', 'Correa'], ['final', 'Listo']];

// =================== reproductor ===================
function boParar() { clearTimeout(BO.timer); cancelAnimationFrame(BO.raf); }
function boCuadro(j) {
  boParar();
  const esc = BO.esc, n = esc.cuadros.length;
  BO.f = Math.max(0, Math.min(n - 1, j));
  const cu = esc.cuadros[BO.f], caja = $('#boSvg');
  caja.classList.toggle('alto', !!cu.alto);
  $('#boTxt').innerHTML = cu.t;
  $('#boDots').innerHTML = esc.cuadros.map((_, k) => `<button data-f="${k}" aria-label="Cuadro ${k + 1}" ${k === BO.f ? 'aria-current="true"' : ''}></button>`).join('');
  $('#boPlay').textContent = BO.juega ? '❚❚' : '▶';
  const sigue = ms => { if (BO.juega) BO.timer = setTimeout(() => { if (BO.f < n - 1) boCuadro(BO.f + 1); else { BO.juega = false; $('#boPlay').textContent = '▶'; } }, ms); };
  if (cu.anim) {
    const t0 = performance.now();
    const paso = now => { const u = Math.min(1, (now - t0) / cu.anim.dur); caja.innerHTML = cu.anim.f(u); if (u < 1) BO.raf = requestAnimationFrame(paso); else sigue(1500); };
    BO.raf = requestAnimationFrame(paso);
  } else { caja.innerHTML = cu.svg(); sigue(4200); }
}
function pintarBolso() {
  boParar();
  const g = BO.g = boCalcular();
  BO.paso = Math.min(Math.max(0, BO.paso), BO_PASOS.length - 1);
  const i = BO.paso, [id] = BO_PASOS[i];
  $('#pillCarpa').textContent = 'Bolsito';
  $('#boPasos').innerHTML = BO_PASOS.map(([k, t], j) => `<button data-paso="${j}" ${j === i ? 'aria-current="step"' : ''}><span>${j + 1}</span>${t}</button>`).join('');
  const esc = BO.esc = BO_ESC[id](g);
  $('#boCuerpo').innerHTML = `<h1>${esc.titulo}</h1>${esc.arriba || ''}
    <div class="co-lamina">
      <div class="co-svg" id="boSvg"></div>
      <p class="co-frase" id="boTxt" aria-live="polite"></p>
      <div class="co-ctrl">
        <button class="co-b" id="boAnt" aria-label="Cuadro anterior">◀</button>
        <div class="co-dots" id="boDots"></div>
        <button class="co-b" id="boPlay" aria-label="Reproducir o pausar"></button>
        <button class="co-b" id="boProx" aria-label="Cuadro siguiente">▶</button>
      </div>
    </div>
    <div class="gl-leyenda">
      ${[['esp', '① Espaldar'], ['gr', '② Bolsillo grande'], ['tira', '③ Tira'], ['pas', '④ Pasadores']].map(([k, t]) => `<span><i style="background:${BO_COL[k]}"></i>${t}</span>`).join('')}
      <span class="gl-sel"><i></i><em class="bo-em">se sella: <b>${BO.S}</b> en el grande y los pasadores · <b>${BO.SC}</b> en la tira</em></span>
    </div>${esc.abajo || ''}`;
  $('#boAtras').hidden = i === 0;
  $('#boSig').hidden = i === BO_PASOS.length - 1;
  $('#boSig').textContent = `Siguiente: ${BO_PASOS[i + 1] ? BO_PASOS[i + 1][1] : ''} →`;
  const chip = $('#boPasos [aria-current]'); if (chip) chip.scrollIntoView({ block: 'nearest', inline: 'center' });
  guardarLS('bolsoPaso', i);
  BO.juega = false;
  boCuadro(0);
}
function boTexto(g) {
  const N = g.m.cant, ac = boAcomodar(g, N);
  let t = `*BOLSITO DE HERRAMIENTAS* (selle ${BO.S} en el bolsillo grande y los pasadores, ${BO.SC} en la tira)\nMedidas de CORTE:\n`;
  g.piezas.forEach(p => { t += `\n*${p.n}. ${p.nombre}*${p.cant > 1 ? ` (×${p.cant})` : ''}: ${n1(p.w)} × ${n1(p.h)}`; });
  const gr = boP(g, 'gr');
  t += `\n\n*Fuelle del 2:* rayas A ${n1(BO.S)}, B ${n1(BO.S + g.hondo / 2)}, C ${n1(BO.S + g.hondo)} desde cada lado; doblar en B hasta que C caiga en A`;
  t += `\n*Tira (3) sobre el 2:* a ${n1(g.tira.x0)} del borde izquierdo y ${n1(g.tira.y0)} de abajo`;
  t += `\n*Bolsillos chicos:* ${g.chicos.map(c => `${c.nombre.toLowerCase()} ${n1(c.s)}`).join(' · ')}`;
  t += `\n*Pasadores (4):* a ${n1(BO.PAS_DE)} de cada lado del 1, sellados a ${n1(g.pas.y[0])}–${n1(g.pas.y[1])} y ${n1(g.pas.y[4])}–${n1(g.pas.y[5])} de abajo`;
  t += `\n\n*Para ${N}:* ${n1(Math.ceil(ac.largo * 1.1 / 10) / 10)} m de lona (rollo de ${BO.ROLLO}), ${n1(1.3 * N)} m de reata de 1½", ${N} hebilla${N > 1 ? 's' : ''} de clic`;
  return t;
}
function boIr(j) { BO.paso = j; pintarBolso(); window.scrollTo(0, 0); }
function boCambiar(k, v) {
  if (!(v > 0)) return;
  BO.m[k] = k === 'cant' ? Math.min(20, Math.max(1, Math.round(v))) : Math.min(k === 'hondo' ? 15 : 12, Math.max(k === 'hondo' ? 2 : .3, Math.round(v * 10) / 10));
  guardarLS('bolso', BO.m);
  const y = window.scrollY, f = BO.f; pintarBolso(); window.scrollTo(0, y); boCuadro(f);
}

$('#v-bolso').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.paso) return boIr(+b.dataset.paso);
  if (b.id === 'boAtras') return boIr(BO.paso - 1);
  if (b.id === 'boSig') return boIr(BO.paso + 1);
  if (b.dataset.bo) return boCambiar(b.dataset.bo, BO.m[b.dataset.bo] + parseFloat(b.dataset.d));
  if (b.id === 'boRestaurar') { BO.m = { ...BO_DEF, cant: BO.m.cant }; guardarLS('bolso', BO.m); return pintarBolso(); }
  if (b.dataset.f) { BO.juega = false; return boCuadro(+b.dataset.f); }
  if (b.id === 'boAnt') { BO.juega = false; return boCuadro(BO.f - 1); }
  if (b.id === 'boProx') { BO.juega = false; return boCuadro(BO.f + 1); }
  if (b.id === 'boPlay') { BO.juega = !BO.juega; if (BO.juega && BO.f === BO.esc.cuadros.length - 1) return boCuadro(0); return boCuadro(BO.f); }
  if (b.id === 'boCompartir') {
    const t = boTexto(BO.g);
    if (navigator.share) { try { await navigator.share({ text: t }); return; } catch (err) { if (err.name === 'AbortError') return; } }
    location.href = 'https://wa.me/?text=' + encodeURIComponent(t);
  }
});
$('#v-bolso').addEventListener('change', e => { const k = e.target.dataset.boin; if (k) boCambiar(k, parseFloat(String(e.target.value).replace(',', '.'))); });
$('#tipoBolso').addEventListener('click', () => ir('bolso'));
document.addEventListener('visibilitychange', () => { if (document.hidden) boParar(); });
