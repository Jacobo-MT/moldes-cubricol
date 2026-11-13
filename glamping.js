'use strict';
// =================== Glamping tipo A (Cubricol) ===================
// Medidas de diseño fijadas el 9-nov-2026. Todo en cm.
// La cara de la puerta se mira de frente: x desde la esquina IZQUIERDA del suelo, z hacia arriba.
// y = 0 en la punta del marco (la "escalera"), la pared de la puerta está en y = VUELO y la de atrás en y = FONDO.
// 12-nov: largo total 390 = escalera de madera 80 + carpa 250 (de la puerta a la pared de atrás) + cubo 60.
const GL = {
  ROLLO: 207, SELLE: 3,   // 12-nov: el rollo mide 207 de ancho
    // 12-nov: selle de 3 cm, 1,5 en cada borde que se une
  DOB: 3, SUELO: 5,   // 3 = dobladillo con varilla (borde suelto); 5 = borde al suelo, va atornillado
  FONDO: 330, VUELO: 80,
  PERFIL: [[0, 0], [125, 300], [265, 250], [300, 0]],   // suelo izq · pico · esquina pequeña · suelo der
  CUBO: { w: 300, h: 250, d: 60 },
  CREM: [100, 200],                                       // cremalleras: a 100 y 200 cm de la esquina izquierda
  VENT: { lado: 100, ancho: 120, sale: 50, zt: 260, yc: 205 },   // centrada en los 250 de la carpa          // techito PLANO, sin punta
  f: 0, juega: false, timer: 0, raf: 0, paso: leerLS('glamping', 0), esc: null,
};
const GL_COL = { lona: '#eef1fb', lona2: '#dfe4f3', borde: '#5462b4', pieza: '#c4cdec', piezaB: '#5462b4', rojo: '#d9232a', madera: '#b07a45', oscuro: '#39444b', cota: '#14181b', sobra: '#f6d0d2' };

// ---------- cálculos ----------
const glLen = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
// altura del techo en x (cara de la puerta)
function glZ(x) { const P = GL.PERFIL; for (let i = 0; i < P.length - 1; i++) { const [x0, z0] = P[i], [x1, z1] = P[i + 1]; if (x >= x0 && x <= x1) return z0 + (z1 - z0) * (x - x0) / (x1 - x0); } return 0; }
// ancho de la cara a la altura z: de dónde a dónde
function glAncho(z) { const P = GL.PERFIL; const izq = P[1][0] * z / P[1][1]; const der = z <= P[2][1] ? P[3][0] - (P[3][0] - P[2][0]) * z / P[2][1] : P[2][0] - (P[2][0] - P[1][0]) * (z - P[2][1]) / (P[1][1] - P[2][1]); return [izq, der]; }
// recorta un polígono entre dos alturas
function glRecorte(poly, z0, z1) {
  const corta = (pts, zc, arriba) => { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const ina = arriba ? a[1] >= zc : a[1] <= zc, inb = arriba ? b[1] >= zc : b[1] <= zc; if (ina) out.push(a); if (ina !== inb) { const t = (zc - a[1]) / (b[1] - a[1]); out.push([a[0] + t * (b[0] - a[0]), zc]); } } return out; };
  return corta(corta(poly, z0, true), z1, false);
}
function glCalcular() {
  const P = GL.PERFIL, S = GL.SELLE, D = GL.DOB, DS = GL.SUELO, R = GL.ROLLO, M = S / 2;   // cada borde que se sella trae la mitad del selle
  const lados = [glLen(P[0], P[1]), glLen(P[1], P[2]), glLen(P[2], P[3])];
  const suelo = lados.reduce((a, b) => a + b, 0);
  // techo: franja A (adelante, todo el ancho del rollo) + franja B (atrás); la unión va sellada
  const tA = R - D - M, tB = GL.FONDO - tA;
  const techo = { largo: suelo + 2 * DS, a: tA, b: tB, anchoB: tB + 2 * M, sobra: R - (tB + 2 * M) };
  // cara de la puerta en 2 piezas: abajo (lo que da el rollo) y arriba
  const zJ = R - DS - M;                                       // la unión queda a esta altura
  const crem = GL.CREM.map(x => ({ x, z: glZ(x) }));
  // cubo (visto desde atrás, la cara es el espejo del frente)
  const C = GL.CUBO, [bi, bd] = glAncho(C.h);
  const espejo = P.map(([x, z]) => [P[3][0] - x, z]);
  const [ei, ed] = [P[3][0] - bd, P[3][0] - bi];
  const cubo = {
    banda: C.w + 2 * C.d,                                     // lado + fondo + lado, ya armado
    chica: { arriba: ei, alto: C.h }, grande: { arriba: C.w - ed, alto: C.h },
    tri: { base: ed - ei, alto: P[1][1] - C.h, pico: espejo[1][0] - ei },
  };
  // ventana (buhardilla) en el lado largo, el que baja del pico a la esquina izquierda
  const V = GL.VENT, pend = P[1][0] / P[1][1];
  const xTop = pend * V.zt, xf = xTop - V.sale, zb = xf / pend;
  const vent = {
    cara: { ancho: V.ancho, alto: V.zt - zb }, zb,
    costado: { arriba: V.sale, alto: V.zt - zb },
    techito: { ancho: V.ancho, largo: V.sale },
    hueco: { ancho: V.ancho, largo: Math.hypot(V.zt - zb, V.sale) },
  };
  const g = { lados, suelo, techo, zJ, crem, cubo, vent };
  g.piezas = glPiezas(g);
  g.filas = glAcomodar(g);
  g.neto = g.filas.reduce((a, f) => a + f.len, 0);
  g.total = g.neto * 1.1;
  return g;
}

// ---------- las piezas, como un lego: número, color, forma y su sitio ----------
const GL_GRUPO = { techo: '#9cc0ef', frente: '#a6dcae', cubo: '#f6c48f', vent: '#cdb0ea', tira: '#c9ced3' };
const glArea = p => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
// Molde de corte: cada borde sale hacia afuera lo que le toca (selle o dobladillo).
// Si una punta queda muy aguda, se corta derecha (no se deja el pico largo).
function glOffset(poly, al) {
  const n = poly.length, sg = glArea(poly) > 0 ? 1 : -1;
  const L = poly.map((a, i) => {
    const b = poly[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = sg * dy / l, ny = -sg * dx / l, o = al[i];
    return { a: [a[0] + nx * o, a[1] + ny * o], b: [b[0] + nx * o, b[1] + ny * o], d: [dx / l, dy / l], o };
  });
  const out = [];
  for (let i = 0; i < n; i++) {
    const A = L[(i - 1 + n) % n], B = L[i], v = poly[i];
    const den = A.d[0] * B.d[1] - A.d[1] * B.d[0];
    if (Math.abs(den) < 1e-9) { out.push(B.a); continue; }
    const t = ((B.a[0] - A.b[0]) * B.d[1] - (B.a[1] - A.b[1]) * B.d[0]) / den;
    const p = [A.b[0] + A.d[0] * t, A.b[1] + A.d[1] * t];
    if (Math.hypot(p[0] - v[0], p[1] - v[1]) > 3 * Math.max(A.o, B.o, 1)) out.push(A.b, B.a); else out.push(p);
  }
  return out;
}
function glPiezas(g) {
  const P = GL.PERFIL, M = GL.SELLE / 2, D = GL.DOB, DS = GL.SUELO, C = GL.CUBO, v = g.vent, zJ = g.zJ, R = GL.ROLLO;
  const rect = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
  const lista = [];
  const add = o => {
    o.cant = o.cant || 1; o.col = GL_GRUPO[o.grupo];
    o.al = o.al || o.real.map(() => M);
    o.corte = glOffset(o.real, o.al);
    const xs = o.corte.map(p => p[0]), ys = o.corte.map(p => p[1]);
    o.x0 = Math.min(...xs); o.y0 = Math.min(...ys); o.w = Math.max(...xs) - o.x0; o.h = Math.max(...ys) - o.y0;
    o.n = lista.length + 1; lista.push(o);
  };
  // al: lo que se le suma a cada borde, en orden (en los rectángulos: abajo, derecha, arriba, izquierda)
  add({ id: 'tA', nombre: 'Techo, franja A', grupo: 'techo', real: rect(g.suelo, g.techo.a), al: [D, DS, M, DS], nota: 'adelante, la de la escalera' });
  add({ id: 'tB', nombre: 'Techo, franja B', grupo: 'techo', real: rect(g.suelo, g.techo.b), al: [M, DS, M, DS], nota: 'atrás, la que llega al cubo' });
  const ab = glRecorte(P, 0, zJ);
  add({ id: 'fAb', nombre: 'Frente, abajo', grupo: 'frente', real: ab, al: ab.map((a, i) => { const b = ab[(i + 1) % ab.length]; return a[1] === 0 && b[1] === 0 ? DS : M; }), nota: 'la pared de la puerta' });
  const ai = glAncho(zJ)[0];
  add({ id: 'fAr', nombre: 'Frente, arriba', grupo: 'frente', real: glRecorte(P, zJ, 400).map(([x, z]) => [x - ai, z - zJ]), nota: 'la punta de la pared de la puerta' });
  // banda del cubo (lado + fondo + lado) en franjas del ancho del rollo
  let s = 0, k = 0;
  while (s < g.cubo.banda - 0.01) {
    const w = Math.min(R - 2 * M, g.cubo.banda - s); k++;
    add({ id: 'c' + k, nombre: `Cubo, franja ${k}`, grupo: 'cubo', real: rect(w, C.h), al: [DS, M, M, M], s0: s, s1: s + w, nota: 'los lados y el fondo del cubo' });
    s += w;
  }
  add({ id: 'eG', nombre: 'Esquina grande', grupo: 'cubo', real: [[g.cubo.grande.arriba, 0], [g.cubo.grande.arriba, C.h], [0, C.h]], nota: 'cierra el hueco entre la carpa y el cubo' });
  add({ id: 'eC', nombre: 'Esquina chica', grupo: 'cubo', real: [[0, 0], [g.cubo.chica.arriba, C.h], [0, C.h]], nota: 'el hueco del otro lado' });
  add({ id: 'tri', nombre: 'Triángulo de atrás', grupo: 'cubo', real: [[0, 0], [g.cubo.tri.base, 0], [g.cubo.tri.pico, g.cubo.tri.alto]], nota: 'la punta de atrás, encima del cubo' });
  add({ id: 'tapa', nombre: 'Tapa del cubo', grupo: 'cubo', real: rect(C.w, C.d), nota: 'el techo del cubo' });
  add({ id: 'vCara', nombre: 'Cara de la ventana', grupo: 'vent', real: rect(v.cara.ancho, v.cara.alto), nota: 'donde va el vidrio' });
  add({ id: 'vCos', nombre: 'Costado de la ventana', grupo: 'vent', cant: 2, real: [[0, 0], [0, v.costado.alto], [v.costado.arriba, v.costado.alto]], nota: 'uno a cada lado de la ventana' });
  add({ id: 'vTe', nombre: 'Techito de la ventana', grupo: 'vent', real: rect(v.techito.ancho, v.techito.largo), nota: 'plano, sin punta' });
  const tl = Math.ceil(Math.max(...g.crem.map(c => c.z)));
  add({ id: 'tira', nombre: 'Tira de cremallera', grupo: 'tira', cant: 2, real: rect(4, tl), al: [0, 0, 0, 0], nota: 'sin selle: va pegada encima del frente' });
  return lista;
}
const glP = (g, id) => g.piezas.find(p => p.id === id);
const glN = p => `<span class="gl-n" style="background:${p.col}">${p.n}</span>`;

// Acomoda las piezas en el rollo (207 de ancho), fila por fila. rot 1 = girada 90°.
function glAcomodar(g) {
  const GAP = 3, P = id => glP(g, id), cubos = g.piezas.filter(p => /^c\d/.test(p.id));
  const filas = [];
  const fila = items => {      // items: [pieza, rot, x, y]; y medido desde el borde de arriba del rollo
    const pos = items.map(([p, rot, x, y]) => {
      let pts = p.corte.map(([a, b]) => [a - p.x0, b - p.y0]);
      if (rot) pts = pts.map(([a, b]) => [p.h - b, a]);
      const w = rot ? p.h : p.w, h = rot ? p.w : p.h;
      return { p, pts: pts.map(([a, b]) => [x + a, y + (h - b)]), x, y, w, h };
    });
    const len = Math.max(...pos.map(q => q.x + q.w)), alto = Math.max(...pos.map(q => q.y + q.h));
    filas.push({ pos, len, alto, n: filas.length + 1 });
  };
  const corrido = (lista, y) => { let x = 0; return lista.map(([p, rot]) => { const it = [p, rot, x, y]; x += (rot ? p.h : p.w) + GAP; return it; }); };
  const b = P('tB'), t = P('tapa'), ti = P('tira'), te = P('vTe'), tr = P('tri'), co = P('vCos'), Y = b.h + GAP;
  fila([[P('tA'), 0, 0, 0]]);
  // sobrante del techo: tapa, techito, triángulo y un costado; debajo, las 2 tiras
  const xTe = t.w + GAP, xTr = xTe + te.w + GAP, xCo = xTr + tr.w + GAP;
  fila([[b, 0, 0, 0], [t, 0, 0, Y], [te, 0, xTe, Y], [tr, 0, xTr, Y], [co, 1, xCo, Y],
        [ti, 1, 0, Y + t.h + GAP], [ti, 1, xTe, Y + Math.max(te.h, tr.h) + GAP]]);
  fila([[P('fAb'), 0, 0, 0]]);
  fila([[P('fAr'), 1, 0, 0]]);
  cubos.slice(0, -1).forEach(c => fila([[c, 1, 0, 0]]));
  const u = cubos[cubos.length - 1], eg = P('eG'), ec = P('eC');
  fila([[u, 1, 0, 0], [eg, 1, 0, u.w + GAP], [ec, 1, 0, u.w + eg.w + 2 * GAP]]);
  const ca = P('vCara');
  fila([[ca, 0, 0, 0], [co, 1, 0, ca.h + GAP]]);
  filas.forEach(f => f.pos.forEach(q => { if (!q.p.fila) q.p.fila = f.n; }));
  return filas;
}

// ---------- 3D sencillo ----------
function glProy(p, a, k = 1) {
  const cx = 150, cy = 195, dx = p[0] - cx, dy = cy - p[1];      // con a = 0 se ve el frente (la puerta)
  const rx = dx * Math.cos(a) - dy * Math.sin(a), ry = dx * Math.sin(a) + dy * Math.cos(a);
  return [rx * k, (-p[2] * 0.9 + ry * 0.42) * k, ry];
}
function glModelo(g, o = {}) {
  const P = GL.PERFIL, F = GL.FONDO, W = GL.VUELO, C = GL.CUBO, V = GL.VENT, caras = [], n = id => glP(g, id).n;
  const L3 = (x, y, z) => [x, y, z], yA = g.techo.a;
  // techo: franja A adelante (y de 0 a yA) y franja B atrás
  for (let i = 0; i < P.length - 1; i++) [[0, yA, 'tA'], [yA, F, 'tB']].forEach(([y0, y1, id]) =>
    caras.push({ pts: [L3(P[i][0], y0, P[i][1]), L3(P[i + 1][0], y0, P[i + 1][1]), L3(P[i + 1][0], y1, P[i + 1][1]), L3(P[i][0], y1, P[i][1])], col: i === 1 ? GL_COL.lona2 : GL_COL.lona, nombre: 'techo', pz: n(id) }));
  // pared de la puerta (metida), en 2 piezas
  caras.push({ pts: glRecorte(P, 0, g.zJ).map(([x, z]) => L3(x, W, z)), col: '#e6eaf6', nombre: 'puerta', pz: n('fAb') });
  caras.push({ pts: glRecorte(P, g.zJ, 400).map(([x, z]) => L3(x, W, z)), col: '#e6eaf6', nombre: 'puerta', pz: n('fAr') });
  // pared de atrás: triángulo encima del cubo y las 2 esquinas
  caras.push({ pts: glRecorte(P, C.h, 400).map(([x, z]) => L3(x, F, z)), col: '#e6eaf6', nombre: 'cubo', pz: n('tri') });
  const xi = glAncho(C.h)[0], xd = glAncho(C.h)[1];
  caras.push({ pts: [L3(0, F, 0), L3(0, F, C.h), L3(xi, F, C.h)], col: '#e6eaf6', nombre: 'cubo', pz: n('eG') });
  caras.push({ pts: [L3(300, F, 0), L3(xd, F, C.h), L3(300, F, C.h)], col: '#e6eaf6', nombre: 'cubo', pz: n('eC') });
  // banda del cubo: lado izq (x=0), fondo, lado der (x=300); cada franja cubre un tramo
  const y1 = F + C.d, camino = [[0, F], [0, y1], [C.w, y1], [C.w, F]], tramos = [0, C.d, C.d + C.w, 2 * C.d + C.w];
  const punto = s => { for (let i = 0; i < 3; i++) if (s <= tramos[i + 1] + 1e-6) { const t = (s - tramos[i]) / (tramos[i + 1] - tramos[i]); return [camino[i][0] + (camino[i + 1][0] - camino[i][0]) * t, camino[i][1] + (camino[i + 1][1] - camino[i][1]) * t]; } return camino[3]; };
  g.piezas.filter(p => p.s1 !== undefined).forEach(p => {
    const cortes = [p.s0, ...tramos.filter(t => t > p.s0 && t < p.s1), p.s1];
    for (let i = 0; i < cortes.length - 1; i++) {
      const a = punto(cortes[i]), b = punto(cortes[i + 1]);
      caras.push({ pts: [L3(a[0], a[1], 0), L3(b[0], b[1], 0), L3(b[0], b[1], C.h), L3(a[0], a[1], C.h)], col: a[1] === b[1] ? GL_COL.lona : GL_COL.lona2, nombre: 'cubo', pz: p.n });
    }
  });
  caras.push({ pts: [L3(0, F, C.h), L3(300, F, C.h), L3(300, y1, C.h), L3(0, y1, C.h)], col: '#f7f8fc', nombre: 'cubo', pz: n('tapa') });
  // ventana
  const pend = P[1][0] / P[1][1], xf = pend * V.zt - V.sale, zb = g.vent.zb, ya = V.yc - V.ancho / 2, yb = V.yc + V.ancho / 2;
  caras.push({ pts: [L3(xf, ya, zb), L3(xf, yb, zb), L3(xf, yb, V.zt), L3(xf, ya, V.zt)], col: '#f7f8fc', nombre: 'vent', pz: n('vCara') });
  caras.push({ pts: [L3(xf, ya, zb), L3(xf, ya, V.zt), L3(pend * V.zt, ya, V.zt)], col: GL_COL.lona2, nombre: 'vent', pz: n('vCos') });
  caras.push({ pts: [L3(xf, yb, zb), L3(xf, yb, V.zt), L3(pend * V.zt, yb, V.zt)], col: GL_COL.lona2, nombre: 'vent', pz: n('vCos') });
  caras.push({ pts: [L3(xf, ya, V.zt), L3(xf, yb, V.zt), L3(pend * V.zt, yb, V.zt), L3(pend * V.zt, ya, V.zt)], col: '#f7f8fc', nombre: 'vent', pz: n('vTe') });
  caras.push({ pts: [L3(xf - .5, V.yc - 50, V.zt - 110), L3(xf - .5, V.yc + 50, V.zt - 110), L3(xf - .5, V.yc + 50, V.zt - 10), L3(xf - .5, V.yc - 50, V.zt - 10)], col: '#47627a', nombre: 'vidrio' });
  return caras;
}
function gl3D(g, a, o = {}) {
  const P0 = GL.PERFIL, extra = [], sel = (o.piezas || (o.pieza ? [o.pieza] : [])).map(n => g.piezas[n - 1]), pz = sel[0] || null;
  for (let i = 0; i < P0.length - 1; i++) extra.push({ linea: true, pts: [[P0[i][0], 0, P0[i][1]], [P0[i + 1][0], 0, P0[i + 1][1]]], col: GL_COL.madera, w: 7 });
  const tira = pz && pz.id === 'tira';
  if (o.suelo) {
    const F = GL.FONDO, y1 = F + GL.CUBO.d, rojo = (a, b) => extra.push({ linea: true, pts: [a, b], col: GL_COL.rojo, w: 8 });
    rojo([0, 0, 0], [0, F, 0]); rojo([300, 0, 0], [300, F, 0]); GL.CREM.forEach((c, i) => rojo([i ? c : 0, GL.VUELO, 0], [i ? 300 : c, GL.VUELO, 0]));   // la puerta no se atornilla
    rojo([0, F, 0], [0, y1, 0]); rojo([0, y1, 0], [300, y1, 0]); rojo([300, y1, 0], [300, F, 0]);
  }
  if (o.cremalleras !== false) g.crem.forEach(c => extra.push({ linea: true, pts: [[c.x, GL.VUELO - 1, 0], [c.x, GL.VUELO - 1, c.z - 3]], col: tira ? '#14181b' : '#14181b', w: tira ? 9 : 2.5 }));
  const k = 1, caras = [...glModelo(g, o), ...extra].map(c => { const pp = c.pts.map(p => glProy(p, a, k)); return { ...c, pp, z: pp.reduce((s, p) => s + p[2], 0) / pp.length + (c.linea ? 2 : 0) }; });
  caras.sort((A, B) => A.z - B.z);   // lo de abajo en pantalla está más cerca: se dibuja de último
  const todos = caras.flatMap(c => c.pp), x0 = Math.min(...todos.map(p => p[0])) - 40, x1 = Math.max(...todos.map(p => p[0])) + 40;
  const y0 = Math.min(...todos.map(p => p[1])) - 40, y1 = Math.max(...todos.map(p => p[1])) + 50;
  let s = `<svg ${o.caja || ''} viewBox="${x0.toFixed(0)} ${y0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}" role="img" aria-label="Glamping en 3D">${FL}`;
  const piso = [[-60, -40, 0], [360, -40, 0], [360, 450, 0], [-60, 450, 0]].map(p => glProy(p, a, k));
  s += `<polygon points="${piso.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="#d9c3a5" stroke="#b08d64"/>`;
  caras.forEach(c => {
    if (c.linea) { s += `<line x1="${c.pp[0][0].toFixed(1)}" y1="${c.pp[0][1].toFixed(1)}" x2="${c.pp[1][0].toFixed(1)}" y2="${c.pp[1][1].toFixed(1)}" stroke="${c.col}" stroke-width="${c.w}" stroke-linecap="round"/>`; return; }
    let fill = c.col, dim = '', sw = 1.6;
    if (pz) { const e = sel.find(q => q.n === c.pz); if (e) { fill = e.col; sw = 3.5; } else if (c.nombre !== 'vidrio') dim = ' opacity=".3"'; }
    else if (o.resalta) { if (c.nombre === o.resalta) fill = '#f6d0d2'; else if (c.nombre !== 'vidrio') dim = ' opacity=".35"'; }
    s += `<polygon points="${c.pp.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${fill}" stroke="#2b3238" stroke-width="${sw}" stroke-linejoin="round"${dim}/>`;
  });
  (o.textos || []).forEach(([p3, t, col]) => { const p = glProy(p3, a, k); s += `<text x="${p[0].toFixed(1)}" y="${p[1].toFixed(1)}" font-size="22" text-anchor="middle" fill="${col || GL_COL.rojo}" stroke="#fff" stroke-width="5" paint-order="stroke">${t}</text>`; });
  return s + '</svg>';
}
// desde dónde se ve mejor cada pieza
const GL_VISTA = { tA: 0.55, tB: -0.6, fAb: 0.25, fAr: 0.25, eG: 2.6, eC: 3.6, tri: 3.1, tapa: 2.6, vCara: -1.1, vCos: -0.8, vTe: -1.1, tira: 0.2 };
const glVista = p => GL_VISTA[p.id] !== undefined ? GL_VISTA[p.id] : 2.75;

// ---------- dibujos planos ----------
const glPts = (arr, X, Y) => arr.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
const glT = (x, y, t, o = {}) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.fs || 20}" text-anchor="${o.ta || 'middle'}" ${o.cls ? `class="${o.cls}"` : ''} fill="${o.col || GL_COL.cota}" stroke="#fff" stroke-width="4" paint-order="stroke" ${o.extra || ''}>${t}</text>`;
const glAp = (d, inner) => `<g class="ap" style="--d:${d}s">${inner}</g>`;

// La cara de la puerta, vista de frente
function glCara(g, o = {}) {
  const P = GL.PERFIL, m = 50, W = 300 + 2 * m, H = 300 + 2 * m + 50, X = x => m + x, Y = z => m + 300 - z;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cara de la puerta">${FL}`;
  s += `<rect x="0" y="${Y(0)}" width="${W}" height="${H - Y(0)}" fill="#e8dcc4"/>`;
  s += `<polygon points="${glPts(P, X, Y)}" fill="${GL_COL.lona}" stroke="${GL_COL.borde}" stroke-width="2.5"/>`;
  if (o.medidas) {
    s += glAp(.2, flecha(X(0), Y(0) + 22, X(300), Y(0) + 22) + glT(X(150), Y(0) + 48, '300', { fs: 24 }));
    s += glAp(.6, `<line x1="${X(P[1][0])}" y1="${Y(0)}" x2="${X(P[1][0])}" y2="${Y(300)}" stroke="${GL_COL.rojo}" stroke-width="2" stroke-dasharray="6 5"/>` + glT(X(P[1][0]) - 8, Y(150), '300 alto', { ta: 'end', col: GL_COL.rojo }));
    s += glAp(1, `<line x1="${X(P[2][0])}" y1="${Y(0)}" x2="${X(P[2][0])}" y2="${Y(250)}" stroke="${GL_COL.rojo}" stroke-width="2" stroke-dasharray="6 5"/>` + glT(X(P[2][0]) - 8, Y(120), '250', { ta: 'end', col: GL_COL.rojo }));
    s += glAp(1.4, flecha(X(0), Y(0) + 70, X(P[1][0]), Y(0) + 70, GL_COL.borde) + glT(X(P[1][0] / 2), Y(0) + 64, '125', { col: GL_COL.borde }));
    s += glAp(1.8, flecha(X(P[2][0]), Y(0) + 70, X(300), Y(0) + 70, GL_COL.borde) + glT(X(282), Y(0) + 64, '35', { col: GL_COL.borde }));
  }
  if (o.partes) {
    const zj = g.zJ, [a, b] = glAncho(zj);
    s += `<polygon class="ap" points="${glPts(glRecorte(P, 0, zj), X, Y)}" fill="${GL_COL.pieza}" stroke="${GL_COL.piezaB}" stroke-width="2.5"/>`;
    s += `<polygon class="ap" style="--d:.7s" points="${glPts(glRecorte(P, zj, 400), X, Y)}" fill="#d5dbef" stroke="${GL_COL.piezaB}" stroke-width="2.5"/>`;
    s += glAp(1.2, `<line x1="${X(a) - 14}" y1="${Y(zj)}" x2="${X(b) + 14}" y2="${Y(zj)}" stroke="${GL_COL.rojo}" stroke-width="3" stroke-dasharray="8 5"/>` + glT(X(b) + 18, Y(zj) + 6, `unión a ${n0(zj)}`, { ta: 'start', col: GL_COL.rojo, fs: 18 }));
    s += glAp(1.6, glT(X(150), Y(zj / 2), 'abajo', { fs: 26 }) + glT(X(160), Y(zj + 45), 'arriba', { fs: 22 }));
    if (o.partes === 2) s += glAp(2, glT(X(150), Y(0) + 34, `+ ${GL.SUELO} abajo: va atornillado al suelo`, { fs: 18, col: GL_COL.rojo }) + glT(X(30), Y(200), `+ ${n1(GL.SELLE / 2)}`, { fs: 18, col: GL_COL.rojo, ta: 'end' }) + glT(X(292), Y(150), `+ ${n1(GL.SELLE / 2)}`, { fs: 18, col: GL_COL.rojo, ta: 'start' }));
  }
  if (o.crem) g.crem.forEach((c, i) => {
    s += `<line class="${o.crem === 1 ? 'dib' : ''}" pathLength="1" style="--d:${.3 + i * .8}s" x1="${X(c.x)}" y1="${Y(0)}" x2="${X(c.x)}" y2="${Y(c.z)}" stroke="#14181b" stroke-width="4"/>`;
    if (o.crem === 1) s += glAp(.8 + i * .8, glT(X(c.x) + (i ? 10 : -10), Y(c.z / 2), n0(c.z), { ta: i ? 'start' : 'end', col: GL_COL.rojo, fs: 24 }));
  });
  if (o.crem === 1) s += glAp(2.2, flecha(X(0), Y(0) + 22, X(100), Y(0) + 22) + glT(X(50), Y(0) + 48, '100') + flecha(X(100), Y(0) + 22, X(200), Y(0) + 22, GL_COL.rojo) + glT(X(150), Y(0) + 48, 'entrada 100', { col: GL_COL.rojo }));
  if (o.tiras) g.crem.forEach(c => { s += glAp(.3, `<rect x="${X(c.x) - 4}" y="${Y(c.z)}" width="8" height="${c.z}" fill="#9aa6d6"/><line x1="${X(c.x)}" y1="${Y(0)}" x2="${X(c.x)}" y2="${Y(c.z)}" stroke="#14181b" stroke-width="2.5"/>`); });
  if (o.tiras) s += glAp(1, glT(X(150), Y(150), 'tira de 4 cm', { col: GL_COL.borde }) + flecha(X(140), Y(140), X(104), Y(120), GL_COL.borde));
  if (o.abre !== undefined) {
    const [a, b] = g.crem, zt = Math.min(a.z, b.z), u = o.abre, rollo = zt * u;
    s += `<polygon points="${glPts([[a.x, 0], [b.x, 0], [b.x, b.z], [a.x, a.z]], X, Y)}" fill="#3a2f28"/>`;
    s += `<rect x="${X(a.x)}" y="${Y(zt)}" width="${b.x - a.x}" height="${zt - rollo}" fill="${GL_COL.lona}" stroke="${GL_COL.borde}"/>`;
    s += `<polygon points="${glPts([[a.x, zt], [b.x, zt], [b.x, b.z], [a.x, a.z]], X, Y)}" fill="${GL_COL.lona}"/>`;
    if (u > .05) s += `<rect x="${X(a.x) - 4}" y="${Y(zt - rollo) - 9}" width="${b.x - a.x + 8}" height="${Math.min(22, 8 + 14 * u)}" rx="9" fill="#d5dbef" stroke="${GL_COL.borde}"/>`;
    [a.x + 25, b.x - 25].forEach(x => { s += `<rect x="${X(x) - 3}" y="${Y(zt) + 2}" width="6" height="${u > .95 ? 36 : 22}" fill="#7a4a24"/>`; });
    g.crem.forEach(c => { s += `<line x1="${X(c.x)}" y1="${Y(0)}" x2="${X(c.x)}" y2="${Y(c.z)}" stroke="#14181b" stroke-width="2.5"/>`; });
  }
  return s + '</svg>';
}

// El cubo visto desde atrás: la carpa adentro y las 2 esquinas que hay que cerrar
function glEsquinas(g) {
  const P = GL.PERFIL.map(([x, z]) => [300 - x, z]), C = GL.CUBO, c = g.cubo, m = 50, W = 300 + 2 * m, H = 300 + 2 * m, X = x => m + x, Y = z => m + 300 - z;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Esquinas del cubo">${FL}<rect x="0" y="${Y(0)}" width="${W}" height="${m}" fill="#e8dcc4"/>`;
  s += `<polygon points="${glPts(P, X, Y)}" fill="#f4f6fb" stroke="#b9c1de" stroke-width="2" stroke-dasharray="6 4"/>`;
  s += `<rect x="${X(0)}" y="${Y(C.h)}" width="${C.w}" height="${C.h}" fill="none" stroke="${GL_COL.piezaB}" stroke-width="3"/>`;
  s += glAp(.5, `<polygon points="${glPts([[0, 0], [0, C.h], [c.chica.arriba, C.h]], X, Y)}" fill="${GL_COL.sobra}" stroke="${GL_COL.rojo}" stroke-width="2.5"/>`);
  s += glAp(.9, `<polygon points="${glPts([[C.w, 0], [C.w, C.h], [C.w - c.grande.arriba, C.h]], X, Y)}" fill="${GL_COL.sobra}" stroke="${GL_COL.rojo}" stroke-width="2.5"/>`);
  s += glAp(1.3, glT(X(c.chica.arriba / 2), Y(C.h) - 10, n0(c.chica.arriba), { col: GL_COL.rojo, fs: 22 }) + glT(X(C.w - c.grande.arriba / 2), Y(C.h) - 10, n0(c.grande.arriba), { col: GL_COL.rojo, fs: 22 }));
  s += glAp(1.6, glT(X(-6), Y(125), '250', { ta: 'end', fs: 20 }) + glT(X(150), Y(110), 'entrada a la carpa', { fs: 18 }) + glT(X(150), Y(C.h) - 34, 'triángulo de atrás', { fs: 16, col: GL_COL.piezaB }));
  return s + '</svg>';
}

// Una pieza en la mesa con sus medidas encima
function glMesa(poly, o = {}) {
  const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), minz = Math.min(...zs), maxz = Math.max(...zs);
  const m = o.m || 60, W = maxx - minx + 2 * m, H = maxz - minz + 2 * m, X = x => m + x - minx, Y = z => m + maxz - z;
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="${o.titulo || 'Pieza'}">${FL}`;
  s += `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="10" fill="#e8dcc4"/>`;
  if (o.rollo) s += `<rect class="desenrolla" x="${X(minx) - 10}" y="${Y(o.rollo) }" width="${maxx - minx + 20}" height="${o.rollo}" fill="#f4f6fb" stroke="#b9c1de"/>`;
  s += `<polygon class="${o.dib ? 'dib lento' : 'ap'}" pathLength="1" style="--d:.3s" points="${glPts(poly, X, Y)}" fill="${o.dib ? 'none' : GL_COL.pieza}" stroke="${GL_COL.piezaB}" stroke-width="3"/>`;
  if (o.dib) s += `<polygon class="levanta" style="animation-delay:3s" points="${glPts(poly, X, Y)}" fill="${GL_COL.pieza}" stroke="${GL_COL.piezaB}" stroke-width="3"/>`;
  (o.lineas || []).forEach(([x1, z1, x2, z2]) => { s += glAp(.6, `<line x1="${X(x1)}" y1="${Y(z1)}" x2="${X(x2)}" y2="${Y(z2)}" stroke="${GL_COL.rojo}" stroke-width="2.5" stroke-dasharray="10 6"/>`); });
  (o.cotas || []).forEach(([a, b, t, off, col], i) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L * (off || 0), nz = dx / L * (off || 0);
    const A = [X(a[0] + nx), Y(a[1] + nz)], B = [X(b[0] + nx), Y(b[1] + nz)];
    s += glAp(.8 + i * .45, flecha(A[0], A[1], B[0], B[1], col || GL_COL.cota, 2) + glT((A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 8, t, { fs: o.fs || 24, col: col || GL_COL.cota }));
  });
  (o.puntos || []).forEach(([p, t], i) => { s += glAp(1 + i * .4, `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="6" fill="${GL_COL.rojo}"/>` + glT(X(p[0]), Y(p[1]) - 14, t, { col: GL_COL.rojo, fs: o.fs || 24 })); });
  (o.textos || []).forEach(([p, t, col], i) => { s += glAp(1.2 + i * .3, glT(X(p[0]), Y(p[1]), t, { col: col || GL_COL.cota, fs: o.fs || 24 })); });
  return s + '</svg>';
}

// número de pieza en un círculo de su color
const glBola = (x, y, p, r = 20) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${p.col}" stroke="#14181b" stroke-width="2.5"/><text x="${x.toFixed(1)}" y="${(y + r * 0.38).toFixed(1)}" font-size="${r * 1.1}" text-anchor="middle" fill="#14181b">${p.n}</text>`;

// El rollo, fila por fila: cada pieza con su color y su número
function glRollo(g, o = {}) {
  const R = GL.ROLLO, fh = R + 40, Lmax = Math.max(...g.filas.map(f => f.len)), W = Lmax + 200, filas = o.filas ? g.filas.filter(f => o.filas.includes(f.n)) : g.filas, H = filas.length * fh + 10;
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H}" role="img" aria-label="Cómo sale del rollo">`;
  let acum = 0;
  g.filas.forEach(f => { f.hasta = (acum += f.len); });
  filas.forEach((f, i) => {
    const y0 = 6 + i * fh;
    let r = `<rect x="0" y="${y0}" width="${f.len.toFixed(1)}" height="${R}" fill="#f4f6fb" stroke="#b9c1de" stroke-dasharray="6 4"/>`;
    f.pos.forEach(q => { r += `<polygon points="${q.pts.map(([x, y]) => `${x.toFixed(1)},${(y0 + y).toFixed(1)}`).join(' ')}" fill="${q.p.col}" stroke="#14181b" stroke-width="2"/>`; });
    f.pos.forEach(q => { const rr = Math.max(14, Math.min(26, Math.min(q.w, q.h) * 0.42 + 6)); r += glBola(q.x + q.w / 2, y0 + q.y + q.h / 2, q.p, rr); });
    r += glT(f.len + 16, y0 + R / 2 + 4, `${n1(f.len / 100)} m`, { fs: 36, ta: 'start' });
    r += glT(f.len + 16, y0 + R / 2 + 40, `(van ${n1(f.hasta / 100)})`, { fs: 22, ta: 'start', col: '#6b757c' });
    s += glAp(i * .3, r);
  });
  return s + '</svg>';
}

// Ficha de una pieza: su número, su forma con la medida de cada borde y dónde va
function glFicha(g, p, o = {}) {
  const W = 640, cab = o.sin3D ? 92 : 190, mx = 95, my = 60;
  const s = Math.min((W - 2 * mx) / p.w, 400 / p.h, 2.4), ph = p.h * s, H = cab + ph + 2 * my + 100;
  const X = x => mx + ((W - 2 * mx) - p.w * s) / 2 + (x - p.x0) * s, Y = y => cab + my + ph - (y - p.y0) * s;
  const pts = arr => arr.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  let r = `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" role="img" aria-label="Pieza ${p.n}: ${p.nombre}">${FL}`;
  r += `<rect x="2" y="${cab - 8}" width="${W - 4}" height="${(H - cab + 4).toFixed(0)}" rx="12" fill="#e8dcc4"/>`;
  // cabecera: número, nombre, cuántas y de dónde sale
  r += glBola(46, 52, p, 34);
  r += glT(92, 44, p.nombre, { fs: 30, ta: 'start' });
  r += glT(92, 76, `${p.cant > 1 ? `<tspan fill="${GL_COL.rojo}">corta ${p.cant}</tspan> · ` : ''}fila ${p.fila} del rollo`, { fs: 21, ta: 'start', col: '#4a545b' });
  if (!o.sin3D) {
    r += glT(92, 108, p.nota, { fs: 19, ta: 'start', col: '#4a545b' });
    r += gl3D(g, glVista(p), { pieza: p.n, cremalleras: true, caja: `x="${W - 250}" y="2" width="246" height="${cab - 14}"` });
  }
  // la pieza: lo de afuera es el corte; la raya roja es donde se sella
  r += glAp(.1, `<polygon points="${pts(p.corte)}" fill="${p.col}" stroke="#14181b" stroke-width="3" stroke-linejoin="round"/>`);
  if (p.al.some(a => a > 0)) r += glAp(.5, `<polygon points="${pts(p.real)}" fill="none" stroke="${GL_COL.rojo}" stroke-width="2" stroke-dasharray="9 6"/>`);
  // medida de cada borde (la del corte), por fuera
  const c = p.corte, n = c.length, cx = c.reduce((a, q) => a + q[0], 0) / n, cy = c.reduce((a, q) => a + q[1], 0) / n;
  c.forEach((a, i) => {
    const b = c[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 8) return;
    const mxp = X((a[0] + b[0]) / 2), myp = Y((a[1] + b[1]) / 2);
    let nx = -(Y(b[1]) - Y(a[1])), ny = X(b[0]) - X(a[0]); const ln = Math.hypot(nx, ny) || 1; nx /= ln; ny /= ln;
    if ((mxp - X(cx)) * nx + (myp - Y(cy)) * ny < 0) { nx = -nx; ny = -ny; }
    r += glAp(.8 + i * .2, glT(mxp + nx * 30, myp + ny * 30 + 9, n1(L), { fs: 26 }));
  });
  // lo que se le sumó a cada borde, por dentro y en rojo
  if (p.al.some(a => a > 0) && p.w * s > 110) {
    const re = p.real, m = re.length, rx = re.reduce((a, q) => a + q[0], 0) / m, ry = re.reduce((a, q) => a + q[1], 0) / m;
    re.forEach((a, i) => {
      const b = re[(i + 1) % m], al = p.al[i]; if (!al || Math.hypot(b[0] - a[0], b[1] - a[1]) * s < 70) return;
      const mxp = X((a[0] + b[0]) / 2), myp = Y((a[1] + b[1]) / 2);
      let nx = -(Y(b[1]) - Y(a[1])), ny = X(b[0]) - X(a[0]); const ln = Math.hypot(nx, ny) || 1; nx /= ln; ny /= ln;
      if ((mxp - X(rx)) * nx + (myp - Y(ry)) * ny > 0) { nx = -nx; ny = -ny; }
      r += glAp(1.6, glT(mxp + nx * 22, myp + ny * 22 + 6, `+${n1(al)}`, { fs: 17, col: GL_COL.rojo }));
    });
  }
  // si no es un rectángulo: caja de referencia y cada punta medida desde la esquina de abajo a la izquierda
  const esRect = p.real.length === 4 && p.real.every(([x, y]) => (x === p.real[0][0] || x === p.real[2][0]) && (y === p.real[0][1] || y === p.real[2][1]));
  if (!esRect) {
    r += glAp(1.2, `<rect x="${X(p.x0)}" y="${Y(p.y0 + p.h)}" width="${p.w * s}" height="${ph}" fill="none" stroke="#6b757c" stroke-width="1.5" stroke-dasharray="3 5"/>`);
    r += glAp(1.2, `<circle cx="${X(p.x0)}" cy="${Y(p.y0)}" r="7" fill="#14181b"/>` + glT(X(p.x0) - 10, Y(p.y0) + 28, '0', { fs: 20, ta: 'end' }));
    let k = 0; const hechos = [[p.x0, p.y0]];
    p.corte.forEach(([x, y]) => {
      const dx = x - p.x0, dy = y - p.y0;
      if (hechos.some(([a, b]) => Math.hypot(a - x, b - y) < 10)) return;   // puntas cortadas: un solo letrero
      hechos.push([x, y]);
      if (dy < 0.5 && Math.abs(dx - p.w) < 0.5) return;
      const lx = X(x), ly = Y(y), der = lx > X(p.x0) + p.w * s / 2;
      r += glAp(1.8 + k++ * .3, `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="6" fill="${GL_COL.rojo}"/>` + glT(lx + (der ? 12 : -12), ly - 12, `${n1(dx)} → ${n1(dy)}`, { fs: 19, col: GL_COL.rojo, ta: der ? 'start' : 'end' }));
    });
  }
  // leyenda
  const ly = H - 26;
  if (p.al.some(a => a > 0)) {
    r += `<line x1="24" y1="${ly - 6}" x2="74" y2="${ly - 6}" stroke="${GL_COL.rojo}" stroke-width="3" stroke-dasharray="9 6"/>` + glT(84, ly, `aquí se sella · en rojo lo que ya se le sumó al borde`, { fs: 18, ta: 'start', col: '#4a545b' });
    if (!esRect) r += glT(24, ly - 30, `● 45 → 108 = a 45 del borde izquierdo y a 108 de alto, desde el 0`, { fs: 18, ta: 'start', col: GL_COL.rojo });
  } else r += glT(24, ly, 'sin selle: se corta tal cual', { fs: 18, ta: 'start', col: '#4a545b' });
  return r + '</svg>';
}

// Perfil (vista de canto) con la franja que pasa por encima del pico
function glPerfilTecho(g, u) {
  const P = GL.PERFIL, m = 50, W = 300 + 2 * m, H = 300 + 2 * m, X = x => m + x, Y = z => m + 300 - z;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="La franja pasa por encima del pico">${FL}`;
  s += `<rect x="0" y="${Y(0)}" width="${W}" height="${m}" fill="#e8dcc4"/>`;
  s += `<polygon points="${glPts(P, X, Y)}" fill="#f4f6fb" stroke="#b9c1de" stroke-width="2"/>`;
  // recorrido de la lona hasta la fracción u
  const tot = g.suelo; let falta = tot * u; const pts = [P[0]];
  for (let i = 0; i < P.length - 1 && falta > 0; i++) { const L = glLen(P[i], P[i + 1]), t = Math.min(1, falta / L); pts.push([P[i][0] + (P[i + 1][0] - P[i][0]) * t, P[i][1] + (P[i + 1][1] - P[i][1]) * t]); falta -= L; }
  s += `<polyline points="${glPts(pts, X, Y)}" fill="none" stroke="${GL_COL.piezaB}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (u >= 1) {
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    [[0, -38, 0], [1, 0, -22], [2, 42, 0]].forEach(([i, dx, dz]) => { const c = mid(P[i], P[i + 1]); s += glT(X(c[0]) + dx, Y(c[1]) + dz, n0(g.lados[i]), { fs: 24, col: GL_COL.rojo }); });
    s += glT(X(150), Y(0) + 34, `de suelo a suelo: ${n0(g.suelo)} + ${GL.SUELO} + ${GL.SUELO} = ${n0(g.techo.largo)}`, { fs: 19 });
  }
  return s + '</svg>';
}

// =================== borde al suelo: la franja de 5 cm acostada en el piso, con tornillos ===================
// Bordes que tocan el suelo, con hacia dónde sale la franja (para afuera). La puerta no lleva.
function glBordesSuelo() {
  const F = GL.FONDO, W = GL.VUELO, y1 = F + GL.CUBO.d, [c1, c2] = GL.CREM;
  return [
    [[0, 0], [0, y1], [-1, 0]], [[300, 0], [300, y1], [1, 0]],
    [[0, W], [c1, W], [0, -1]], [[c2, W], [300, W], [0, -1]],
    [[0, y1], [300, y1], [0, 1]],
  ];
}
// El glamping entero: franjas en el piso + tornillos. modo 'fija' los pone; 'suelta' los quita y la lona sale por arriba.
function glSuelo3D(g, u, modo) {
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t), FW = 16, PASO = 45, SUBE = 260;   // la franja se dibuja un poco más ancha para que se vea
  const a = 0.5 + (modo === 'fija' ? u * 0.35 : 0.85 - u * 0.25);
  const sube = modo === 'suelta' ? ease((u - 0.42) / 0.5) * SUBE : 0;
  const items = [];
  // estructura (se queda): perfiles adelante, en la puerta y atrás, cumbreras y el cubo
  const P = GL.PERFIL, F = GL.FONDO, W = GL.VUELO, C = GL.CUBO, y1 = F + C.d, est = '#39444b';
  const tubo = (p, q, w = 5, col = est) => items.push({ linea: true, pts: [p, q], col, w });
  for (let i = 0; i < P.length - 1; i++) {
    tubo([P[i][0], 0, P[i][1]], [P[i + 1][0], 0, P[i + 1][1]], 8, GL_COL.madera);
    [W, F].forEach(y => tubo([P[i][0], y, P[i][1]], [P[i + 1][0], y, P[i + 1][1]]));
  }
  P.forEach(([x, z]) => tubo([x, 0, z], [x, F, z], 4));
  [[0, y1], [300, y1], [0, F], [300, F]].forEach(([x, y]) => tubo([x, y, 0], [x, y, C.h], 4));
  tubo([0, y1, C.h], [300, y1, C.h], 4); tubo([0, F, C.h], [0, y1, C.h], 4); tubo([300, F, C.h], [300, y1, C.h], 4);
  // la lona (sube entera al soltarla)
  glModelo(g).forEach(c => items.push({ ...c, pts: c.pts.map(([x, y, z]) => [x, y, z + sube]), lona: true }));
  // las franjas de 5 cm en el piso
  const tornillos = [];
  glBordesSuelo().forEach(([p, q, n]) => {
    const A = [p[0] + n[0] * FW, p[1] + n[1] * FW], B = [q[0] + n[0] * FW, q[1] + n[1] * FW];
    items.push({ pts: [[p[0], p[1], 0.5 + sube], [q[0], q[1], 0.5 + sube], [B[0], B[1], 0.5 + sube], [A[0], A[1], 0.5 + sube]], col: '#f6d0d2', borde: GL_COL.rojo, lona: true, plano: true, n });
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n0 = Math.max(1, Math.round(L / PASO));
    for (let k = 0; k < n0; k++) { const t = (k + 0.5) / n0; tornillos.push([p[0] + (q[0] - p[0]) * t + n[0] * FW / 2, p[1] + (q[1] - p[1]) * t + n[1] * FW / 2, n]); }
  });
  const NT = tornillos.length;
  tornillos.forEach(([x, y, n], i) => {
    const vis = modo === 'fija' ? ease((u * 1.15 - i / NT * 0.85) / 0.05) : 1 - ease((u * 1.1 - i / NT * 0.38) / 0.05);
    const seVe = n[0] * Math.sin(a) - n[1] * Math.cos(a) > 0.05;
    if (vis > 0.02 && seVe) items.push({ punto: true, pts: [[x, y, 1]], o: vis, n });
  });
  // proyección y orden (de atrás hacia adelante)
  const pr = items.map(c => { const pp = c.pts.map(p => glProy(p, a)); return { ...c, pp, z: pp.reduce((s, p) => s + p[2], 0) / pp.length + (c.linea ? 2 : 0) + (c.plano || c.punto ? (c.n[0] * Math.sin(a) - c.n[1] * Math.cos(a) > 0.05 && !sube ? (c.punto ? 2e6 : 1e6) : -1e6) : 0) }; });   // tornillos siempre encima de las franjas
  pr.sort((A, B) => A.z - B.z);
  // caja fija para que no salte el dibujo mientras sube la lona
  const AL = 300 + (modo === 'suelta' ? SUBE : 0), caja = [[-30, -30, 0], [330, -30, 0], [330, 420, 0], [-30, 420, 0], [0, 0, AL], [300, 400, AL], [0, 400, AL], [300, 0, AL]].map(p => glProy(p, a));
  const x0 = Math.min(...caja.map(p => p[0])) - 20, x1 = Math.max(...caja.map(p => p[0])) + 20, yy0 = Math.min(...caja.map(p => p[1])) - 50, yy1 = Math.max(...caja.map(p => p[1])) + 20;
  let s = `<svg viewBox="${x0.toFixed(0)} ${yy0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(yy1 - yy0).toFixed(0)}" role="img" aria-label="${modo === 'fija' ? 'Franjas de 5 cm atornilladas al piso' : 'La lona sale entera por arriba'}">${FL}`;
  // piso de madera (la plataforma)
  const piso = [[-60, -60, 0], [360, -60, 0], [360, 460, 0], [-60, 460, 0]].map(p => glProy(p, a));
  s += `<polygon points="${piso.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="#d9c3a5" stroke="#b08d64"/>`;
  for (let k = 1; k < 13; k++) { const yk = -60 + k * 40, A = glProy([-60, yk, 0], a), B = glProy([360, yk, 0], a); s += `<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" stroke="#c4a882" stroke-width="1.5"/>`; }
  const opL = sube > 0 ? 0.92 : 1;
  pr.forEach(c => {
    if (c.linea) { s += `<line x1="${c.pp[0][0].toFixed(1)}" y1="${c.pp[0][1].toFixed(1)}" x2="${c.pp[1][0].toFixed(1)}" y2="${c.pp[1][1].toFixed(1)}" stroke="${c.col}" stroke-width="${c.w}" stroke-linecap="round"/>`; return; }
    if (c.punto) { const [x, y] = c.pp[0]; const k = 0.6 + 0.4 * c.o;   // al aparecer, el tornillo baja y entra
      s += `<g opacity="${c.o.toFixed(2)}" transform="translate(${x.toFixed(1)} ${(y - (1 - c.o) * 14).toFixed(1)}) scale(${k.toFixed(2)})"><ellipse rx="6.5" ry="4" fill="#e9ecef" stroke="#14181b" stroke-width="1.8"/><path d="M-3.5 0H3.5M0 -2.2V2.2" stroke="#14181b" stroke-width="1.8"/></g>`; return; }
    s += `<polygon points="${c.pp.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${c.col}" stroke="${c.borde || '#2b3238'}" stroke-width="${c.borde ? 2 : 1.6}" stroke-linejoin="round" opacity="${c.lona && !c.plano ? opL : 1}"/>`;
  });
  if (modo === 'suelta' && u > 0.45) { const A = glProy([150, 200, 330 + sube * 0.4], a), B = glProy([150, 200, 330 + sube * 0.4 + 90], a); s += flecha(A[0] + 200, A[1], B[0] + 200, B[1], GL_COL.rojo, 5); }
  return s + '</svg>';
}

// De cerca y cortado: la lona baja por fuera del tubo y la franja de 5 cm se acuesta en el piso; el tornillo baja al piso.
function glTornillos(u, modo) {
  const W = 640, H = 440, yS = 330, xT = 330, ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  const xL = xT - 4, xF = xL - 50, xt = xL - 25;           // lona, punta de la franja (5 cm = 50 px), tornillo
  const sube = modo === 'suelta' ? ease((u - 0.45) / 0.45) * 230 : 0;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="La franja de 5 cm atornillada al piso">${FL}`;
  s += `<rect x="0" y="${yS}" width="${W}" height="${H - yS}" fill="#c9a77c"/>`;
  for (let i = 0; i < 5; i++) s += `<line x1="0" y1="${yS + 22 + i * 20}" x2="${W}" y2="${yS + 22 + i * 20}" stroke="#a9875c" stroke-width="2"/>`;
  s += `<rect x="${xT}" y="${yS - 60}" width="60" height="60" fill="#5b666e" stroke="#2b3238" stroke-width="2.5"/><rect x="${xT + 10}" y="${yS - 50}" width="40" height="40" fill="#c9a77c" stroke="#2b3238" stroke-width="1.5"/>`;
  s += `<rect x="${xT + 16}" y="70" width="28" height="${yS - 130}" fill="#5b666e" stroke="#2b3238" stroke-width="2"/>`;
  s += `<g transform="translate(0 ${-sube})"><path d="M${xL} 70 V${yS - 3} H${xF}" fill="none" stroke="#5462b4" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/></g>`;
  // tornillo: baja (fija) o sube y se va (suelta)
  const L = 46;
  let tip = modo === 'fija' ? yS - 10 + ease((u - 0.15) / 0.4) * (L - 2) : yS + L - 12 - ease(u / 0.3) * (L - 2);
  const tOp = modo === 'suelta' ? 1 - ease((u - 0.3) / 0.1) : 1;
  s += `<g opacity="${tOp}"><rect x="${xt - 3}" y="${tip - L}" width="6" height="${L}" fill="#9aa3aa"/><path d="M${xt - 3} ${tip - 8}L${xt} ${tip}L${xt + 3} ${tip - 8}Z" fill="#9aa3aa"/><rect x="${xt - 11}" y="${tip - L - 7}" width="22" height="7" rx="2" fill="#c4cad0" stroke="#2b3238" stroke-width="1.5"/></g>`;
  // taladro vertical, encima del tornillo
  const tal = modo === 'fija' ? (u < 0.58 ? 1 : 1 - ease((u - 0.58) / 0.1)) : (u < 0.32 ? 1 : 1 - ease((u - 0.32) / 0.1));
  if (tal > 0.01) {
    const hy = tip - L - 7 - (modo === 'fija' && u > 0.58 ? ease((u - 0.58) / 0.1) * 60 : 0), gira = Math.floor(u * 60) % 2;
    s += `<g opacity="${tal}" transform="translate(${xt} ${hy})"><rect x="-3" y="-22" width="6" height="22" fill="#6b757c"/><rect x="-22" y="-100" width="44" height="80" rx="10" fill="#e8b21a" stroke="#14181b" stroke-width="2.5"/><rect x="18" y="-86" width="58" height="26" rx="8" fill="#e8b21a" stroke="#14181b" stroke-width="2.5"/>${gira ? '<path d="M-14 -10a14 6 0 0 0 28 0" fill="none" stroke="#14181b" stroke-width="2"/>' : ''}</g>`;
  }
  // medidas y nombres
  if (sube < 5) s += flecha(xF, yS - 26, xL, yS - 26, GL_COL.rojo, 2) + glT((xF + xL) / 2 - 40, yS - 34, '5 cm', { fs: 22, col: GL_COL.rojo, ta: 'end' });
  s += glT(xL - 14, 110, 'lona', { fs: 20, col: '#5462b4', ta: 'end' }) + glT(xT + 70, yS - 30, 'tubo de la estructura', { fs: 18, ta: 'start' }) + glT(560, yS + 60, 'piso', { fs: 20 });
  if (modo === 'fija') s += glT(W / 2, 36, `La franja de <tspan fill="${GL_COL.rojo}">5 cm</tspan> se acuesta en el piso`, { fs: 26 }) + (u > 0.75 ? glT(W / 2, 66, 'y se atornilla al piso con autoperforantes', { fs: 22, col: GL_COL.rojo }) : '');
  else s += glT(W / 2, 36, u < 0.45 ? 'Se saca el tornillo' : 'La lona sube y sale', { fs: 26 }) + (u > 0.75 ? glT(W / 2, 66, 'el tubo se queda en su sitio', { fs: 22, col: '#4a545b' }) : '');
  return s + '</svg>';
}

// =================== las láminas ===================
const glFichaCu = (g, id, t) => { const p = glP(g, id); return { t: t || `${glN(p)} <b>${p.nombre}</b>${p.cant > 1 ? ` (corta <b>${p.cant}</b>)` : ''}.`, svg: () => glFicha(g, p), alto: true }; };
const GL_ESC = {
  inicio: g => ({ titulo: 'El glamping', cuadros: [
    { t: 'Así queda: <b>todo en lona</b>.', anim: { dur: 5000, f: u => gl3D(g, -0.7 + u * 1.4) } },
    { t: `Frente: <b>300</b> de base, pico de <b>300</b>, esquina pequeña de <b>250</b>.`, svg: () => glCara(g, { medidas: true }) },
    { t: `Largo total <b>390</b>: escalera <b>80</b> + carpa <b>250</b> + cubo <b>60</b>.`, svg: () => gl3D(g, 0.75, { textos: [[[300, 205, -22], '250 carpa'], [[300, 40, 40], '80 escalera'], [[300, 360, -22], '60 cubo']] }) },
    { t: `Ventana de <b>100 × 100</b> que sale <b>50</b> arriba.`, svg: () => gl3D(g, -0.9, { resalta: 'vent' }) },
    { t: `Atrás, un cubo de <b>300 × 250</b> que sale <b>60</b>.`, svg: () => gl3D(g, 2.7, { resalta: 'cubo' }) },
  ] }),
  lona: g => ({ titulo: 'Las piezas', arriba: `<div class="total"><span class="etq">Compra más o menos</span><b>${n0(Math.ceil(g.total / 100))} m</b><span>de rollo de ${n0(GL.ROLLO)} de ancho (ya con 10 % de desperdicio)</span></div>`, cuadros: [
    { t: `Son <b>${g.piezas.reduce((a, p) => a + p.cant, 0)} piezas</b>. Cada una tiene su <b>número</b> y su <b>color</b>: así sale del rollo.`, svg: () => glRollo(g), alto: true },
    { t: `Color = parte: <b>azul</b> techo, <b>verde</b> frente, <b>naranja</b> cubo, <b>morado</b> ventana.`, svg: () => glRollo(g), alto: true },
    ...g.piezas.map(p => glFichaCu(g, p.id, `${glN(p)} <b>${p.nombre}</b>${p.cant > 1 ? ` (corta <b>${p.cant}</b>)` : ''}: los números son el borde <b>de corte</b>, ya con el selle.`)),
  ] }),
  techo: g => {
    const a = glP(g, 'tA'), b = glP(g, 'tB'), t = g.techo, J = a.h + b.h - GL.SELLE;
    return { titulo: 'Techo', cuadros: [
      { t: `La lona va de un suelo al otro <b>pasando por encima del pico</b>.`, anim: { dur: 3000, f: u => glPerfilTecho(g, u) } },
      { t: `Corta ${glN(a)} y ${glN(b)}. De la tira que sobra salen ${glN(glP(g, 'vCos'))} ${glN(glP(g, 'vTe'))} ${glN(glP(g, 'tri'))}.`, svg: () => glRollo(g, { filas: [1, 2] }), alto: true },
      glFichaCu(g, 'tA'), glFichaCu(g, 'tB'),
      { t: `Sella ${glN(a)} con ${glN(b)} por el largo. Juntas miden <b>${n1(J)}</b> de ancho.`, svg: () => glMesa([[0, 0], [a.w, 0], [a.w, J], [0, J]], { m: 110, fs: 40, lineas: [[0, J - a.h + GL.SELLE / 2, a.w, J - a.h + GL.SELLE / 2]], cotas: [[[0, 0], [0, J], n1(J), 40]], textos: [[[a.w / 2, J - a.h / 2], 'A (adelante)'], [[a.w / 2, b.h / 2], 'B (atrás)'], [[a.w / 2, J - a.h + GL.SELLE / 2 + 14], 'selle', GL_COL.rojo]] }) },
      { t: `Arriba se <b>abre un hueco</b> para la ventana (lo ves en el paso Ventana).`, svg: () => gl3D(g, -0.9, { resalta: 'vent' }) },
    ] };
  },
  frente: g => {
    const ab = glP(g, 'fAb'), ar = glP(g, 'fAr');
    return { titulo: 'Frente', cuadros: [
      { t: `El frente es más alto que el rollo: va en <b>2 piezas</b>, ${glN(ab)} abajo y ${glN(ar)} arriba.`, svg: () => glCara(g, { partes: 1 }) },
      glFichaCu(g, 'fAb'), glFichaCu(g, 'fAr'),
      { t: `Sella ${glN(ab)} con ${glN(ar)}. Abajo lleva <b>${GL.SUELO}</b> para atornillar al suelo.`, svg: () => glCara(g, { partes: 2 }) },
    ] };
  },
  puerta: g => ({ titulo: 'Puerta', cuadros: [
    { t: `Dos cremalleras <b>rectas</b>, a <b>100</b> y a <b>200</b> de la esquina izquierda.`, svg: () => glCara(g, { crem: 1 }) },
    glFichaCu(g, 'tira', `Cada una va pegada a una tira ${glN(glP(g, 'tira'))} de <b>4 cm</b> sellada al frente.`),
    { t: `Así quedan las tiras sobre el frente.`, svg: () => glCara(g, { tiras: true }) },
    { t: `Ya sellada, <b>corta la lona</b> por la mitad de cada cremallera.`, svg: () => glCara(g, { crem: 2 }) },
    { t: `Para entrar: abre de abajo hacia arriba, <b>enrolla</b> y amarra con <b>2 correas</b>.`, anim: { dur: 3500, f: u => glCara(g, { abre: u }) } },
  ] }),
  ventana: g => {
    const v = g.vent;
    return { titulo: 'Ventana', cuadros: [
      { t: `En el lado largo, la ventana sale <b>${GL.VENT.sale}</b> arriba y toca el techo abajo.`, svg: () => gl3D(g, -1.2, { resalta: 'vent' }) },
      glFichaCu(g, 'vCara'), glFichaCu(g, 'vCos'), glFichaCu(g, 'vTe'),
      { t: `En el techo, abre un hueco de <b>${v.hueco.ancho} × ${n0(v.hueco.largo)}</b> y sella todo alrededor.`, svg: () => glMesa([[0, 0], [v.hueco.ancho, 0], [v.hueco.ancho, v.hueco.largo], [0, v.hueco.largo]], { fs: 18, m: 50, cotas: [[[0, 0], [v.hueco.ancho, 0], n0(v.hueco.ancho), -24], [[v.hueco.ancho, 0], [v.hueco.ancho, v.hueco.largo], n0(v.hueco.largo), -26]], textos: [[[v.hueco.ancho / 2, v.hueco.largo / 2], 'hueco', GL_COL.rojo]] }) },
    ] };
  },
  cubo: g => {
    const cs = g.piezas.filter(p => p.s1 !== undefined);
    return { titulo: 'Cubo de atrás', cuadros: [
      { t: `Atrás va un cubo de <b>300</b> de ancho, <b>250</b> de alto y <b>60</b> de fondo.`, svg: () => gl3D(g, 2.7, { resalta: 'cubo' }) },
      { t: `Los 2 lados y el fondo son <b>una sola banda</b>: ${cs.map(glN).join(' ')} selladas una al lado de la otra.`, svg: () => gl3D(g, 2.75, { piezas: cs.map(p => p.n) }) },
      ...cs.map(p => glFichaCu(g, p.id)),
      glFichaCu(g, 'tapa'),
      { t: `Visto desde atrás, el cubo es más ancho que la carpa: cierra <b>2 esquinas</b> (rojo).`, svg: () => glEsquinas(g) },
      glFichaCu(g, 'eG'), glFichaCu(g, 'eC'), glFichaCu(g, 'tri'),
    ] };
  },
  suelo: g => ({ titulo: 'Al suelo', cuadros: [
    { t: `Donde la lona toca el piso lleva una <b>franja de ${GL.SUELO} cm</b> acostada (rojo). La <b>puerta</b> no.`, svg: () => glSuelo3D(g, 1, 'fija') },
    { t: `Al armar: cada franja se <b>atornilla al piso</b> con autoperforantes.`, anim: { dur: 7000, f: u => glSuelo3D(g, u, 'fija') } },
    { t: `De cerca: la lona baja por fuera del tubo y los <b>${GL.SUELO} cm</b> quedan en el piso.`, anim: { dur: 5000, f: u => glTornillos(u, 'fija') } },
    { t: `Para lavarla: se quitan los tornillos y la lona <b>sale entera por arriba</b>.`, anim: { dur: 7000, f: u => glSuelo3D(g, u, 'suelta') } },
    { t: `La estructura <b>no se desarma</b>: solo se levanta la lona.`, anim: { dur: 5000, f: u => glTornillos(u, 'suelta') } },
  ] }),
  final: g => ({ titulo: 'Listo', cuadros: [
    { t: `Así queda armado. Compra <b>${n0(Math.ceil(g.total / 100))} m</b> de lona y <b>2 cremalleras</b> de <b>${n0(Math.ceil((g.crem[0].z + 10) / 10) * 10)}</b> y <b>${n0(Math.ceil((g.crem[1].z + 10) / 10) * 10)}</b>.`, anim: { dur: 6000, f: u => gl3D(g, 0.6 - u * 6.28) } },
  ], abajo: `<button class="cta verde" id="glCompartir">Enviar medidas por WhatsApp</button>` }),
};
const GL_PASOS = [['inicio', 'El glamping'], ['lona', 'Piezas'], ['techo', 'Techo'], ['frente', 'Frente'], ['puerta', 'Puerta'], ['ventana', 'Ventana'], ['cubo', 'Cubo'], ['suelo', 'Al suelo'], ['final', 'Listo']];

// =================== reproductor ===================
function glParar() { clearTimeout(GL.timer); cancelAnimationFrame(GL.raf); }
function glCuadro(j) {
  glParar();
  const esc = GL.esc, n = esc.cuadros.length;
  GL.f = Math.max(0, Math.min(n - 1, j));
  const cu = esc.cuadros[GL.f], caja = $('#glSvg');
  caja.classList.toggle('alto', !!cu.alto);
  $('#glTxt').innerHTML = cu.t;
  $('#glDots').innerHTML = esc.cuadros.map((_, k) => `<button data-f="${k}" aria-label="Cuadro ${k + 1}" ${k === GL.f ? 'aria-current="true"' : ''}></button>`).join('');
  $('#glPlay').textContent = GL.juega ? '❚❚' : '▶';
  const sigue = ms => { if (GL.juega) GL.timer = setTimeout(() => { if (GL.f < n - 1) glCuadro(GL.f + 1); else { GL.juega = false; $('#glPlay').textContent = '▶'; } }, ms); };
  if (cu.anim) {
    const t0 = performance.now();
    const paso = now => { const u = Math.min(1, (now - t0) / cu.anim.dur); caja.innerHTML = cu.anim.f(u); if (u < 1) GL.raf = requestAnimationFrame(paso); else sigue(1500); };
    GL.raf = requestAnimationFrame(paso);
  } else { caja.innerHTML = cu.svg(); sigue(4200); }
}
function pintarGlamping() {
  glParar();
  const g = GL.g = glCalcular();
  GL.paso = Math.min(Math.max(0, GL.paso), GL_PASOS.length - 1);
  const i = GL.paso, [id] = GL_PASOS[i];
  $('#pillCarpa').textContent = 'Glamping 3 × 3,90';
  $('#glPasos').innerHTML = GL_PASOS.map(([k, t], j) => `<button data-paso="${j}" ${j === i ? 'aria-current="step"' : ''}><span>${j + 1}</span>${t}</button>`).join('');
  const esc = GL.esc = GL_ESC[id](g);
  $('#glCuerpo').innerHTML = `<h1>${esc.titulo}</h1>${esc.arriba || ''}
    <div class="co-lamina">
      <div class="co-svg" id="glSvg"></div>
      <p class="co-frase" id="glTxt" aria-live="polite"></p>
      <div class="co-ctrl">
        <button class="co-b" id="glAnt" aria-label="Cuadro anterior">◀</button>
        <div class="co-dots" id="glDots"></div>
        <button class="co-b" id="glPlay" aria-label="Reproducir o pausar"></button>
        <button class="co-b" id="glProx" aria-label="Cuadro siguiente">▶</button>
      </div>
    </div>
    <div class="gl-leyenda">
      ${[['techo', 'Techo'], ['frente', 'Frente'], ['cubo', 'Cubo'], ['vent', 'Ventana'], ['tira', 'Tiras']].map(([k, t]) => `<span><i style="background:${GL_GRUPO[k]}"></i>${t}</span>`).join('')}
      <span class="gl-sel"><i></i>se sella: <b>1,5</b> de cada pieza (3 en total)</span>
      <span class="gl-sel">borde al suelo: <b>+5</b> (tornillos) · borde suelto: <b>+3</b> (varilla)</span>
    </div>${esc.abajo || ''}`;
  $('#glAtras').hidden = i === 0;
  $('#glSig').hidden = i === GL_PASOS.length - 1;
  $('#glSig').textContent = `Siguiente: ${GL_PASOS[i + 1] ? GL_PASOS[i + 1][1] : ''} →`;
  const chip = $('#glPasos [aria-current]'); if (chip) chip.scrollIntoView({ block: 'nearest', inline: 'center' });
  guardarLS('glamping', i);
  GL.juega = false;   // el play arranca solo si lo tocan
  glCuadro(0);
}
function glTexto(g) {
  let t = `*GLAMPING 3 × 3,90* (rollo de ${n0(GL.ROLLO)} de ancho · selle ${n1(GL.SELLE)}: ${n1(GL.SELLE / 2)} en cada borde · borde al suelo ${GL.SUELO} (tornillos) · borde suelto ${GL.DOB} (varilla))
Medidas de CORTE, ya con selle y dobladillo:
`;
  g.piezas.forEach(p => {
    const c = p.corte, bordes = c.map((a, i) => Math.hypot(c[(i + 1) % c.length][0] - a[0], c[(i + 1) % c.length][1] - a[1])).filter(L => L >= 8).map(n1);
    t += `
*${p.n}. ${p.nombre}*${p.cant > 1 ? ` (×${p.cant})` : ''}, fila ${p.fila}: ${p.real.length === 4 && p.real.every(([x, y]) => (x === p.real[0][0] || x === p.real[2][0]) && (y === p.real[0][1] || y === p.real[2][1])) ? `${n1(p.w)} × ${n1(p.h)}` : `bordes ${bordes.join(' · ')}, alto ${n1(p.h)}`}`;
  });
  t += `

*Puerta:* cremalleras rectas a 100 y 200 (${n0(g.crem[0].z)} y ${n0(g.crem[1].z)} de largo), 2 correas`;
  t += `
*Lona:* ≈ ${n0(Math.ceil(g.total / 100))} m de rollo de ${n0(GL.ROLLO)} de ancho`;
  return t;
}
function glIr(j) { GL.paso = j; pintarGlamping(); window.scrollTo(0, 0); }

$('#v-glamping').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.paso) return glIr(+b.dataset.paso);
  if (b.id === 'glAtras') return glIr(GL.paso - 1);
  if (b.id === 'glSig') return glIr(GL.paso + 1);
  if (b.dataset.f) { GL.juega = false; return glCuadro(+b.dataset.f); }
  if (b.id === 'glAnt') { GL.juega = false; return glCuadro(GL.f - 1); }
  if (b.id === 'glProx') { GL.juega = false; return glCuadro(GL.f + 1); }
  if (b.id === 'glPlay') { GL.juega = !GL.juega; if (GL.juega && GL.f === GL.esc.cuadros.length - 1) return glCuadro(0); return glCuadro(GL.f); }
  if (b.id === 'glCompartir') {
    const t = glTexto(GL.g);
    if (navigator.share) { try { await navigator.share({ text: t }); return; } catch (err) { if (err.name === 'AbortError') return; } }
    location.href = 'https://wa.me/?text=' + encodeURIComponent(t);
  }
});
$('#tipoGlamping').addEventListener('click', () => ir('glamping'));
document.addEventListener('visibilitychange', () => { if (document.hidden) glParar(); });
