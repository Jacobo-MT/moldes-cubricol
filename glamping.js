'use strict';
// =================== Glamping tipo A (Cubricol) ===================
// Medidas de diseño fijadas el 9-nov-2026. Todo en cm.
// La cara de la puerta se mira de frente: x desde la esquina IZQUIERDA del suelo, z hacia arriba.
// y = 0 en la punta del marco (la "escalera"), la pared de la puerta está en y = VUELO y la de atrás en y = FONDO.
// 12-nov: largo total 390 = escalera de madera 80 + carpa 250 (de la puerta a la pared de atrás) + cubo 60.
const GL = {
  ROLLO: 207, SELLE: 3,   // 12-nov: el rollo mide 207 de ancho
    // 12-nov: selle de 3 cm, 1,5 en cada borde que se une
  TIRA: 4,                // 24-nov: franja que traen el cubo, la ventana y la puerta en los bordes que se pegan al techo
  TENS: 15, TENS_S: 3,    // tira de tensión: 15 que salen + 3 que se sellan; va debajo de la varilla del borde de adelante, de piso a piso
  DOB: 5, SUELO: 5,   // 5 = borde de adelante con varilla (24-nov: sobresale un poco y protege de la lluvia); 5 = borde al suelo, va atornillado
  // 24-nov-2026: medidas REALES de la estructura. Escalera 80 + carpa 240 + cubo 70 = 390 (310 sin la escalera).
  FONDO: 320, VUELO: 80,
  LADOS: [319, 149, 253],                                  // tubos medidos: largo · de la punta al quiebre · corto
  PERFIL: [[0, 0], [113, 298.3], [253.5, 248.7], [300, 0]],   // suelo izq · punta · quiebre · suelo der (sale de 319, 149, 253 y 300)
  // marco del cubo: 93 · 157 · 47 (más 1,5 de tubo a cada lado = 300); baja de 250 a 235,5 y la tapa inclinada mide 72
  CUBO: { w: 300, h: 250, hb: 235.5, d: 70, tapa: 72, x1: 94.5, x2: 251.5, tri: [52.5, 149] },
  CREM: [150], CREM_ALTO: 190, PCUBO: 70,                 // 24-nov: 1 cremallera centrada de 190 en cada puerta; las 2 del cubo miden 70
  VENT: { ancho: 70, sale: 50, en: 225, yc: 200, ojos: 160 },   // el techito sale 50 a 225 del piso por el tubo de 319 (210 de alto: alguien de 1,70 queda con los ojos en la ventana) y la lona baja derecha hasta el tubo; centrada en los 240
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
  const lados = GL.LADOS;
  const suelo = lados.reduce((a, b) => a + b, 0);
  // techo: franja A (adelante, todo el ancho del rollo) + franja B (atrás); la unión va sellada
  const tA = R - D - M, tB = GL.FONDO - tA;
  const techo = { largo: suelo + 2 * DS, a: tA, b: tB, anchoB: tB + M, sobra: R - (tB + M) };
  // cara de la puerta en 2 piezas: abajo (lo que da el rollo) y arriba
  const zJ = R - DS - M;                                       // la unión queda a esta altura
  const crem = GL.CREM.map(x => ({ x, z: GL.CREM_ALTO }));
  // cubo (visto desde atrás, la cara es el espejo del frente)
  const C = GL.CUBO, baseT = C.x2 - C.x1, [tc, tl] = C.tri;      // triángulo de atrás: base 157, lados 52,5 y 149
  const px = (tc * tc - tl * tl + baseT * baseT) / (2 * baseT);
  const cubo = {
    zf: R - DS - M,                                           // el fondo es más alto que el rollo: unión a esta altura
    chica: { arriba: C.w - C.x2, alto: C.h }, grande: { arriba: C.x1, alto: C.h },
    tri: { base: baseT, alto: Math.sqrt(tc * tc - px * px), pico: baseT - px },      // visto desde atrás
  };
  // ventana: techito de 70 × 50 y la bajada hasta el tubo largo (sale de la inclinación del tubo)
  const V = GL.VENT, u0 = V.en / lados[0], vx = P[1][0] * u0, vz = P[1][1] * u0, xf = vx - V.sale, zb = xf * P[1][1] / P[1][0];
  const vent = { vx, vz, xf, zb, baja: vz - zb, hueco: Math.hypot(V.sale, vz - zb), desde: V.en - Math.hypot(V.sale, vz - zb), y0: V.yc - V.ancho / 2, y1: V.yc + V.ancho / 2 };
  const g = { lados, suelo, techo, zJ, crem, cubo, vent };
  g.piezas = glPiezas(g);
  g.filas = glAcomodar(g);
  g.neto = g.filas.reduce((a, f) => a + f.len, 0);
  g.total = g.neto * 1.1;
  return g;
}

// ---------- las piezas, como un lego: número, color, forma y su sitio ----------
const GL_GRUPO = { techo: '#9cc0ef', frente: '#a6dcae', cubo: '#f6c48f', vent: '#cdb0ea', plast: '#8fe0d4', tira: '#c9ced3', tens: '#f2a3a8' };
const glArea = p => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
// Molde de corte: cada borde sale hacia afuera lo que le toca (selle o dobladillo).
// Si una punta queda muy aguda, se corta derecha (no se deja el pico largo).
// fl: bordes con franja de 4; la franja es una pestaña recta del largo del lado y las esquinas quedan libres (cruz gorda)
function glOffset(poly, al, fl, seguido) {
  const n = poly.length, sg = glArea(poly) > 0 ? 1 : -1;
  const L = poly.map((a, i) => {
    const b = poly[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = sg * dy / l, ny = -sg * dx / l, o = al[i], oF = fl && fl[i] ? o : 0;
    return { n: [nx, ny], f: oF, a: [a[0] + nx * o, a[1] + ny * o], b: [b[0] + nx * o, b[1] + ny * o], d: [dx / l, dy / l], o };
  });
  const out = [];
  for (let i = 0; i < n; i++) {
    const A = L[(i - 1 + n) % n], B = L[i], v = poly[i];
    if ((A.f || B.f) && !(seguido && seguido(v))) {
      const fA = [v[0] + A.n[0] * A.f, v[1] + A.n[1] * A.f], fB = [v[0] + B.n[0] * B.f, v[1] + B.n[1] * B.f];
      const llega = (N, F, fin) => {      // el borde normal N termina sobre la línea del lado que lleva la franja
        const d = N.d[0] * F.d[1] - N.d[1] * F.d[0], t = ((v[0] - fin[0]) * F.d[1] - (v[1] - fin[1]) * F.d[0]) / d, q = [fin[0] + N.d[0] * t, fin[1] + N.d[1] * t];
        return Math.hypot(q[0] - v[0], q[1] - v[1]) > 3 * Math.max(N.o, 1) ? fin : q;
      };
      if (A.f && B.f) out.push(fA, v, fB); else if (B.f) out.push(llega(A, B, A.b), v, fB); else out.push(fA, v, llega(B, A, B.a));
      continue;
    }
    const den = A.d[0] * B.d[1] - A.d[1] * B.d[0];
    if (Math.abs(den) < 1e-9) { out.push(B.a); continue; }
    const t = ((B.a[0] - A.b[0]) * B.d[1] - (B.a[1] - A.b[1]) * B.d[0]) / den;
    const p = [A.b[0] + A.d[0] * t, A.b[1] + A.d[1] * t];
    if (Math.hypot(p[0] - v[0], p[1] - v[1]) > 3 * Math.max(A.o, B.o, 1)) out.push(A.b, B.a); else out.push(p);
  }
  return out;
}
function glPiezas(g) {
  const P = GL.PERFIL, M = GL.SELLE / 2, D = GL.DOB, DS = GL.SUELO, T = GL.TIRA, C = GL.CUBO, v = g.vent, zJ = g.zJ, R = GL.ROLLO;
  const rect = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
  const lista = [];
  const add = o => {
    o.cant = o.cant || 1; o.col = GL_GRUPO[o.grupo];
    o.al = o.al || o.real.map(() => M);
    o.fl = o.al.map(x => x === T);      // 4 = franja contra el techo
    o.corte = glOffset(o.real, o.al, o.fl, o.seguido);
    const xs = o.corte.map(p => p[0]), ys = o.corte.map(p => p[1]);
    o.x0 = Math.min(...xs); o.y0 = Math.min(...ys); o.w = Math.max(...xs) - o.x0; o.h = Math.max(...ys) - o.y0;
    o.n = lista.length + 1; lista.push(o);
  };
  // al: lo que se le suma a cada borde, en orden (en los rectángulos: abajo, derecha, arriba, izquierda)
  add({ id: 'tA', nombre: 'Techo, franja A', grupo: 'techo', real: rect(g.suelo, g.techo.a), al: [D, DS, M, DS], nota: 'adelante, la de la escalera' });
  add({ id: 'tB', nombre: 'Techo, franja B', grupo: 'techo', real: rect(g.suelo, g.techo.b), al: [0, DS, M, DS], nota: 'el borde de atrás va exacto' });
  // cubo: cada lado es un solo corte; el fondo va en 2 porque es más alto que el rollo
  const PC = GL.PCUBO, lado = [[0, 0], [C.d, 0], [C.d, C.h], [0, C.hb]];
  add({ id: 'cLado', nombre: 'Lado del cubo', grupo: 'cubo', real: lado, al: [DS, M, M, M], nota: 'el lado del tubo de 253; un solo corte' });
  add({ id: 'cPL', nombre: 'Puerta de lado (cubo)', grupo: 'frente', real: [[0, 0], [C.d, 0], [C.d, C.hb], [0, C.h]], al: [DS, M, M, M], nota: 'el lado de la ventana; cremallera en la mitad' });
  add({ id: 'cPt', nombre: 'Puerta de atrás (cubo)', grupo: 'frente', real: rect(PC, C.hb), al: [DS, M, M, M], nota: `el fondo, del borde al tubo de ${PC}` });
  add({ id: 'cFA', nombre: 'Fondo del cubo, abajo', grupo: 'cubo', real: rect(C.w - PC, g.cubo.zf), al: [DS, M, M, M], nota: 'del tubo de la puerta al otro lado' });
  add({ id: 'cFB', nombre: 'Fondo del cubo, arriba', grupo: 'cubo', real: rect(C.w - PC, C.hb - g.cubo.zf), nota: 'completa el fondo' });
  add({ id: 'eG', nombre: 'Esquina grande', grupo: 'cubo', real: [[g.cubo.grande.arriba, 0], [g.cubo.grande.arriba, C.h], [0, C.h]], al: [M, M, T], nota: 'el inclinado trae la franja de 4' });
  add({ id: 'eC', nombre: 'Esquina chica', grupo: 'cubo', real: [[0, 0], [g.cubo.chica.arriba, C.h], [0, C.h]], al: [T, M, M], nota: 'el inclinado trae la franja de 4' });
  add({ id: 'tri', nombre: 'Triángulo de atrás', grupo: 'cubo', real: [[0, 0], [g.cubo.tri.base, 0], [g.cubo.tri.pico, g.cubo.tri.alto]], al: [T, T, T], nota: 'los 3 lados traen la franja de 4' });
  add({ id: 'tapa', nombre: 'Tapa del cubo', grupo: 'cubo', real: rect(C.w, C.tapa), nota: 'el techo del cubo, va inclinado' });
  add({ id: 'vCara', nombre: 'Cara de la ventana', grupo: 'plast', real: rect(GL.VENT.ancho, v.baja), al: [T, M, M, M], nota: 'PLÁSTICO; abajo trae la franja de 4' });
  add({ id: 'vCos', nombre: 'Costado de la ventana', grupo: 'plast', cant: 2, real: [[0, 0], [0, v.baja], [GL.VENT.sale, v.baja]], al: [M, M, T], nota: 'PLÁSTICO; el otro, volteado' });
  add({ id: 'vTe', nombre: 'Techito de la ventana', grupo: 'vent', real: rect(GL.VENT.ancho, GL.VENT.sale), al: [M, M, T, M], nota: 'LONA, tapa el sol; arriba franja de 4' });
  // puerta: se pone de última; los lados y la punta traen la franja de 4 para pegarse al techo
  const ab = glRecorte(P, 0, zJ), ar = glRecorte(P, zJ, 400), alP = poly => poly.map((a, i) => { const b = poly[(i + 1) % poly.length]; return Math.abs(a[1] - b[1]) > .01 ? T : a[1] < 1 ? DS : M; }), ai = glAncho(zJ)[0];
  add({ id: 'fAb', nombre: 'Puerta, abajo', grupo: 'frente', real: ab, al: alP(ab), seguido: v => v[1] > 1, nota: 'los 2 lados traen la franja de 4' });
  add({ id: 'fAr', nombre: 'Puerta, arriba', grupo: 'frente', real: ar.map(([x, z]) => [x - ai, z - zJ]), al: alP(ar), seguido: v => v[1] < 1, nota: 'todo menos abajo trae la franja de 4' });
  const tl = Math.ceil(Math.max(...g.crem.map(c => c.z)));
  add({ id: 'tira', nombre: 'Tira de cremallera', grupo: 'tira', cant: 3, real: rect(4, tl), al: [0, 0, 0, 0], nota: 'una por puerta; sin selle, va pegada encima' });
  add({ id: 'tens', nombre: 'Tira de tensión', grupo: 'tens', real: rect(g.techo.largo, GL.TENS), al: [0, 0, GL.TENS_S, 0], nota: 'pieza aparte: 3 se sellan y salen 15' });
  return lista;
}
const glP = (g, id) => g.piezas.find(p => p.id === id);
const glN = p => `<span class="gl-n" style="background:${p.col}">${p.n}</span>`;

// Acomoda las piezas en el rollo (207 de ancho), fila por fila. rot 1 = girada 90°.
function glAcomodar(g) {
  const GAP = 3, R = GL.ROLLO, P = id => glP(g, id);
  const filas = [];
  const fila = items => {      // items: [pieza, rot, x, y]; y medido desde el borde de arriba del rollo
    const pos = items.map(([p, rot, x, y]) => {
      let pts = p.corte.map(([a, b]) => [a - p.x0, b - p.y0]);
      if (rot === 1) pts = pts.map(([a, b]) => [p.h - b, a]);
      if (rot === 3) pts = pts.map(([a, b]) => [b, p.w - a]);
      if (rot === 2) pts = pts.map(([a, b]) => [p.w - a, p.h - b]);
      const w = rot % 2 ? p.h : p.w, h = rot % 2 ? p.w : p.h;
      return { p, pts: pts.map(([a, b]) => [x + a, y + (h - b)]), x, y, w, h };
    });
    const len = Math.max(...pos.map(q => q.x + q.w)), alto = Math.max(...pos.map(q => q.y + q.h));
    filas.push({ pos, len, alto, n: filas.length + 1 });
  };
  const corrido = (lista, y) => { let x = 0; return lista.map(([p, rot]) => { const it = [p, rot, x, y]; x += (rot ? p.h : p.w) + GAP; return it; }); };
  const b = P('tB'), t = P('tapa'), ti = P('tira'), vi = P('vTe'), tr = P('tri'), Y = b.h + GAP;
  fila([[P('tA'), 0, 0, 0]]);
  // sobrante del techo: la tira de tensión entera, el techito, el triángulo y el pedazo de arriba del fondo
  const eg = P('eG'), ec = P('eC'), te = P('tens'), la = P('cLado'), pl = P('cPL'), pa = P('cPt'), fb = P('cFB'), Y2 = Y + te.h + GAP, xF = vi.w + tr.w + 2 * GAP, xE = xF + fb.w + GAP;
  fila([[b, 0, 0, 0], [te, 0, 0, Y], [vi, 0, 0, Y2], [tr, 0, vi.w + GAP, Y2], [fb, 0, xF, Y2], [ti, 1, xF, Y2 + fb.h + GAP], [ti, 1, xF, Y2 + fb.h + ti.w + 2 * GAP], [ti, 1, xF, Y2 + fb.h + 2 * ti.w + 3 * GAP], [ec, 1, xE, Y2]]);
  fila([[P('cFA'), 0, 0, 0]]);
  fila([[la, 1, 0, 0], [pl, 1, 0, la.w + GAP]]);
  fila([[t, 0, 0, 0], [pa, 1, 0, t.h + GAP]]);
  fila([[eg, 1, 0, 0], [P('fAr'), 0, 0, eg.w + GAP]]);
  fila([[P('fAb'), 0, 0, 0]]);
  const ca = P('vCara'), co = P('vCos');
  // la cara y los 2 costados van en plástico: salen aparte, con los triángulos encajados uno al revés del otro
  const punta = Math.max(...co.corte.filter(c => c[1] - co.y0 < 3).map(c => c[0] - co.x0));
  fila([[ca, 0, 0, 0], [co, 0, ca.w + GAP, 0], [co, 2, ca.w + GAP + punta + GAP, 0]]);
  g.plast = filas.pop(); g.plast.pos.forEach(q => { q.p.plast = true; });
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
  caras.push({ pts: [L3(C.x1, F, C.h), L3(C.x2, F, C.h), L3(P[1][0], F, P[1][1])], col: '#e6eaf6', nombre: 'cubo', pz: n('tri') });
  caras.push({ pts: [L3(0, F, 0), L3(0, F, C.h), L3(C.x1, F, C.h)], col: '#e6eaf6', nombre: 'cubo', pz: n('eG') });
  caras.push({ pts: [L3(300, F, 0), L3(C.x2, F, C.h), L3(300, F, C.h)], col: '#e6eaf6', nombre: 'cubo', pz: n('eC') });
  // cubo: 2 lados y el fondo en 2
  const y1 = F + C.d, zf = g.cubo.zf;
  [[0, 'cPL'], [C.w, 'cLado']].forEach(([x, id]) => caras.push({ pts: [L3(x, F, 0), L3(x, y1, 0), L3(x, y1, C.hb), L3(x, F, C.h)], col: GL_COL.lona2, nombre: 'cubo', pz: n(id) }));
  const PC = GL.PCUBO;
  caras.push({ pts: [L3(0, y1, 0), L3(PC, y1, 0), L3(PC, y1, C.hb), L3(0, y1, C.hb)], col: GL_COL.lona, nombre: 'cubo', pz: n('cPt') });
  [[0, zf, 'cFA'], [zf, C.hb, 'cFB']].forEach(([a, b, id]) => caras.push({ pts: [L3(PC, y1, a), L3(C.w, y1, a), L3(C.w, y1, b), L3(PC, y1, b)], col: GL_COL.lona, nombre: 'cubo', pz: n(id) }));
  caras.push({ pts: [L3(0, F, C.h), L3(300, F, C.h), L3(300, y1, C.hb), L3(0, y1, C.hb)], col: '#f7f8fc', nombre: 'cubo', pz: n('tapa') });
  // ventana: techito, cara que baja derecha hasta el techo y 2 costados
  const W2 = g.vent, { vx, vz, xf, zb } = W2, ya = W2.y0, yb = W2.y1;
  caras.push({ pts: [L3(xf, ya, zb), L3(xf, yb, zb), L3(xf, yb, vz), L3(xf, ya, vz)], col: 'rgba(143,224,212,.45)', nombre: 'vent', pz: n('vCara') });
  [ya, yb].forEach(y => caras.push({ pts: [L3(xf, y, zb), L3(xf, y, vz), L3(vx, y, vz)], col: 'rgba(143,224,212,.45)', nombre: 'vent', pz: n('vCos') }));
  caras.push({ pts: [L3(xf, ya, vz), L3(xf, yb, vz), L3(vx, yb, vz), L3(vx, ya, vz)], col: '#f7f8fc', nombre: 'vent', pz: n('vTe') });
  return caras;
}
function gl3D(g, a, o = {}) {
  const P0 = GL.PERFIL, extra = [], sel = (o.piezas || (o.pieza ? [o.pieza] : [])).map(n => g.piezas[n - 1]), pz = sel[0] || null;
  for (let i = 0; i < P0.length - 1; i++) extra.push({ linea: true, pts: [[P0[i][0], 0, P0[i][1]], [P0[i + 1][0], 0, P0[i + 1][1]]], col: GL_COL.madera, w: 7 });
  const tira = pz && pz.id === 'tira', sep = o.sep || {}, VEC = { cubo: [0, 150, 0], vent: [-150, 0, 0], puerta: [0, -230, 0] };
  const corre = (c, u) => VEC[c.nombre] ? c.pts.map(q => q.map((v, i) => v + VEC[c.nombre][i] * u)) : c.pts;
  if ((pz && pz.id === 'tens') || o.tens) for (let i = 0; i < P0.length - 1; i++) extra.push({ linea: true, pts: [[P0[i][0], -3, P0[i][1]], [P0[i + 1][0], -3, P0[i + 1][1]]], col: GL_COL.rojo, w: 10 });
  if (o.franjas) {      // la franja de 4: por donde cada parte se pega al techo
    const v = g.vent, borde = (pts, nombre, cierra) => pts.forEach((q, i) => { const r = pts[i + 1] || (cierra && pts[0]); if (r) extra.push({ linea: true, franja: true, pts: [q, r], col: GL_COL.rojo, w: 5, nombre }); });
    if (o.franjas.includes('cubo')) borde(P0.map(([x, z]) => [x, GL.FONDO, z]), 'cubo');
    if (o.franjas.includes('puerta')) borde(P0.map(([x, z]) => [x, GL.VUELO, z]), 'puerta');
    if (o.franjas.includes('vent')) borde([[v.xf, v.y0, v.zb], [v.vx, v.y0, v.vz], [v.vx, v.y1, v.vz], [v.xf, v.y1, v.zb]], 'vent', true);
  }
  if (o.suelo) {
    const F = GL.FONDO, y1 = F + GL.CUBO.d, rojo = (a, b) => extra.push({ linea: true, pts: [a, b], col: GL_COL.rojo, w: 8 });
    rojo([0, 0, 0], [0, F, 0]); rojo([300, 0, 0], [300, F, 0]);   // las 3 puertas no se atornillan
    rojo([GL.PCUBO, y1, 0], [300, y1, 0]); rojo([300, y1, 0], [300, F, 0]);
  }
  if (o.cremalleras !== false) {
    const H = GL.CREM_ALTO, y1 = GL.FONDO + GL.CUBO.d, m = GL.PCUBO / 2;
    g.crem.forEach(c => extra.push({ linea: true, pts: [[c.x, GL.VUELO - 1, 0], [c.x, GL.VUELO - 1, H]], col: '#14181b', w: tira ? 9 : 2.5, nombre: 'puerta' }));
    extra.push({ linea: true, pts: [[-1, GL.FONDO + m, 0], [-1, GL.FONDO + m, H]], col: '#14181b', w: tira ? 9 : 2.5, nombre: 'cubo' }, { linea: true, pts: [[m, y1 + 1, 0], [m, y1 + 1, H]], col: '#14181b', w: tira ? 9 : 2.5, nombre: 'cubo' });
  }
  const k = 1, caras = [...glModelo(g, o), ...extra].filter(c => !(o.sin || []).includes(c.nombre)).map(c => { const pp = corre(c, sep[c.nombre] || 0).map(p => glProy(p, a, k)); return { ...c, pp, z: pp.reduce((s, p) => s + p[2], 0) / pp.length + (c.linea ? 2 : 0) }; });
  caras.sort((A, B) => A.z - B.z);   // lo de abajo en pantalla está más cerca: se dibuja de último
  const todos = [...caras.flatMap(c => c.pp), ...(o.sep ? glModelo(g, o).filter(c => sep[c.nombre] !== undefined).flatMap(c => corre(c, 1).map(p => glProy(p, a, k))) : [])], x0 = Math.min(...todos.map(p => p[0])) - 40, x1 = Math.max(...todos.map(p => p[0])) + 40;
  const y0 = Math.min(...todos.map(p => p[1])) - 40, y1 = Math.max(...todos.map(p => p[1])) + 50;
  let s = `<svg ${o.caja || ''} viewBox="${x0.toFixed(0)} ${y0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}" role="img" aria-label="Glamping en 3D">${FL}`;
  const piso = [[-60, -40, 0], [360, -40, 0], [360, 450, 0], [-60, 450, 0]].map(p => glProy(p, a, k));
  s += `<polygon points="${piso.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="#d9c3a5" stroke="#b08d64"/>`;
  caras.forEach(c => {
    if (c.linea) { s += `<line x1="${c.pp[0][0].toFixed(1)}" y1="${c.pp[0][1].toFixed(1)}" x2="${c.pp[1][0].toFixed(1)}" y2="${c.pp[1][1].toFixed(1)}" stroke="${c.col}" stroke-width="${c.w}" stroke-linecap="round"/>`; return; }
    let fill = c.col, dim = '', sw = 1.6;
    if (o.partes) fill = g.piezas[c.pz - 1].col;
    if (pz) { const e = sel.find(q => q.n === c.pz); if (e) { fill = e.col; sw = 3.5; } else if (c.nombre !== 'vidrio') dim = ' opacity=".3"'; }
    else if (o.resalta) { if (c.nombre === o.resalta) fill = '#f6d0d2'; else if (c.nombre !== 'vidrio') dim = ' opacity=".35"'; }
    s += `<polygon points="${c.pp.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${fill}" stroke="#2b3238" stroke-width="${sw}" stroke-linejoin="round"${dim}/>`;
  });
  (o.textos || []).forEach(([p3, t, col]) => { const p = glProy(p3, a, k); s += `<text x="${p[0].toFixed(1)}" y="${p[1].toFixed(1)}" font-size="22" text-anchor="middle" fill="${col || GL_COL.rojo}" stroke="#fff" stroke-width="5" paint-order="stroke">${t}</text>`; });
  return s + '</svg>';
}
// desde dónde se ve mejor cada pieza
const GL_VISTA = { cPL: 1.9, cPt: 3.3, tA: 0.55, tB: -0.6, fAb: 0.25, fAr: 0.25, eG: 2.6, eC: 3.6, tri: 3.1, tapa: 2.6, vCara: -1.1, vCos: -0.8, vTe: -1.1, tira: 0.2 };
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
    [[0, -14, -30, 'end'], [1, 10, -16, 'middle'], [2, 12, 0, 'start']].forEach(([i, dx, dy, ta]) => {
      const c = [(P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2];
      s += glAp(.6 + i * .4, glT(X(c[0]) + dx, Y(c[1]) + dy, n0(g.lados[i]), { ta, fs: 26, col: GL_COL.rojo }));
    });
  }
  if (o.partes) {
    const zj = g.zJ, [a, b] = glAncho(zj);
    s += `<polygon class="ap" points="${glPts(glRecorte(P, 0, zj), X, Y)}" fill="${GL_COL.pieza}" stroke="${GL_COL.piezaB}" stroke-width="2.5"/>`;
    s += `<polygon class="ap" style="--d:.7s" points="${glPts(glRecorte(P, zj, 400), X, Y)}" fill="#d5dbef" stroke="${GL_COL.piezaB}" stroke-width="2.5"/>`;
    s += glAp(1.2, `<line x1="${X(a) - 14}" y1="${Y(zj)}" x2="${X(b) + 14}" y2="${Y(zj)}" stroke="${GL_COL.rojo}" stroke-width="3" stroke-dasharray="8 5"/>` + glT(W - 6, Y(zj) - 10, `unión a ${n1(zj)}`, { ta: 'end', col: GL_COL.rojo, fs: 18 }));
    s += glAp(1.6, glT(X(150), Y(zj / 2), 'abajo', { fs: 26 }) + glT(X(160), Y(zj + 45), 'arriba', { fs: 22 }));
    if (o.partes === 2) s += glAp(2, glT(X(150), Y(0) + 34, `+ ${GL.SUELO} abajo: va atornillado al suelo`, { fs: 18, col: GL_COL.rojo }) + glT(X(48), Y(170), `+ ${GL.TIRA}`, { fs: 24, col: GL_COL.rojo, ta: 'end' }) + glT(X(292), Y(150), `+ ${GL.TIRA}`, { fs: 18, col: GL_COL.rojo, ta: 'start' }));
  }
  if (o.crem) g.crem.forEach((c, i) => {
    s += `<line class="${o.crem === 1 ? 'dib' : ''}" pathLength="1" style="--d:${.3 + i * .8}s" x1="${X(c.x)}" y1="${Y(0)}" x2="${X(c.x)}" y2="${Y(c.z)}" stroke="#14181b" stroke-width="4"/>`;
    if (o.crem === 1) s += glAp(.8 + i * .8, glT(X(c.x) + (i ? 10 : -10), Y(c.z / 2), n0(c.z), { ta: i ? 'start' : 'end', col: GL_COL.rojo, fs: 24 }));
  });
  if (o.crem === 1) s += glAp(2.2, flecha(X(0), Y(0) + 22, X(150), Y(0) + 22) + glT(X(75), Y(0) + 48, '150') + flecha(X(150), Y(0) + 22, X(300), Y(0) + 22) + glT(X(225), Y(0) + 48, '150'));
  if (o.tiras) g.crem.forEach(c => { s += glAp(.3, `<rect x="${X(c.x) - 4}" y="${Y(c.z)}" width="8" height="${c.z}" fill="#9aa6d6"/><line x1="${X(c.x)}" y1="${Y(0)}" x2="${X(c.x)}" y2="${Y(c.z)}" stroke="#14181b" stroke-width="2.5"/>`); });
  if (o.tiras) s += glAp(1, glT(X(150), Y(150), 'tira de 4 cm', { col: GL_COL.borde }) + flecha(X(140), Y(140), X(104), Y(120), GL_COL.borde));
  if (o.abre !== undefined) s += glAbre(X, Y, 0, 300, GL.CREM_ALTO, o.abre);
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
  s += glAp(1.3, glT(X(c.chica.arriba / 2), Y(C.h) - 10, n1(c.chica.arriba), { col: GL_COL.rojo, fs: 22 }) + glT(X(C.w - c.grande.arriba / 2), Y(C.h) - 10, n1(c.grande.arriba), { col: GL_COL.rojo, fs: 22 }));
  s += glAp(1.6, glT(X(-6), Y(125), '250', { ta: 'end', fs: 20 }) + glT(X(150), Y(110), 'entrada a la carpa', { fs: 18 }) + glT(X(150), Y(C.h) - 34, 'triángulo de atrás', { fs: 16, col: GL_COL.piezaB }));
  return s + '</svg>';
}

// Una puerta que se abre: cada mitad se enrolla hacia su lado y queda el triángulo abierto
function glAbre(X, Y, s0, s1, h, u) {
  const c = (s0 + s1) / 2, L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], A = [c, h], k = Math.min(1, u * 1.25);
  let s = `<polygon points="${glPts([[s0, 0], [s1, 0], A], X, Y)}" fill="#3a2f28"/>`;
  [s0, s1].forEach(e => {
    const C = [c, 0], Q = L(C, [e, 0], k), R = L(C, A, k);
    s += `<polygon points="${glPts([[e, 0], A, R, Q], X, Y)}" fill="${GL_COL.lona}" stroke="${GL_COL.borde}" stroke-width="2"/>`;
    if (k > .03) s += `<line x1="${X(Q[0])}" y1="${Y(Q[1])}" x2="${X(R[0])}" y2="${Y(R[1])}" stroke="#c4cdec" stroke-width="${6 + 8 * k}" stroke-linecap="round"/><line x1="${X(Q[0])}" y1="${Y(Q[1])}" x2="${X(R[0])}" y2="${Y(R[1])}" stroke="${GL_COL.borde}" stroke-width="1.5" stroke-dasharray="6 5"/>`;
    if (u > .85) { const M = L(Q, R, .45); s += `<rect x="${X(M[0]) - 4}" y="${Y(M[1]) - 14}" width="8" height="28" fill="#7a4a24" transform="rotate(${e < c ? -40 : 40} ${X(M[0])} ${Y(M[1])})"/>`; }
  });
  return s + (u < .2 ? `<line x1="${X(c)}" y1="${Y(0)}" x2="${X(c)}" y2="${Y(h)}" stroke="#14181b" stroke-width="3"/>` : '');
}
// Las 2 puertas del cubo, de frente: 70 de ancho, cremallera en la mitad
function glPuertaCubo(u, o = {}) {
  const W = 640, H = 560, P = GL.PCUBO, AL = GL.CUBO.hb, k = 1.75, X = x => W / 2 + (x - P / 2) * k, Y = z => 470 - z * k, h = GL.CREM_ALTO;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Puerta del cubo">${FL}<rect x="0" y="${Y(0)}" width="${W}" height="${H - Y(0)}" fill="#e8dcc4"/>`;
  s += `<rect x="${X(-40)}" y="${Y(AL)}" width="${40 * k}" height="${AL * k}" fill="${GL_COL.lona2}"/><rect x="${X(P)}" y="${Y(AL)}" width="${60 * k}" height="${AL * k}" fill="${GL_COL.lona2}"/>`;
  s += `<rect x="${X(0)}" y="${Y(AL)}" width="${P * k}" height="${AL * k}" fill="${GL_COL.lona}" stroke="${GL_COL.borde}" stroke-width="2.5"/>`;
  s += `<line x1="${X(P)}" y1="${Y(0)}" x2="${X(P)}" y2="${Y(AL)}" stroke="${o.tubo ? '#2f9e44' : '#2c5aa0'}" stroke-width="${o.tubo ? 9 : 6}"/><line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(AL)}" stroke="#2c5aa0" stroke-width="6"/>`;
  s += glAbre(X, Y, 0, P, h, u);
  s += flecha(X(0), Y(0) + 24, X(P), Y(0) + 24) + glT(X(P / 2), Y(0) + 54, P, { fs: 26 }) + flecha(X(P) + 22, Y(0), X(P) + 22, Y(h), GL_COL.rojo) + glT(X(P) + 32, Y(h / 2), h, { fs: 26, col: GL_COL.rojo, ta: 'start' });
  if (o.tubo) s += (glT(X(P) + 32, Y(AL) + 30, 'tubo nuevo', { fs: 22, col: '#2f9e44', ta: 'start' }));
  return s + glT(W / 2, 40, o.titulo || '', { fs: 26 }) + '</svg>';
}
// La ventana en la estructura: de frente al lado largo y de canto (con la bajada)
function glVisera(g, o = {}) {
  const V = GL.VENT, v = g.vent, L = GL.LADOS[0], W = 640, H = 500, k = .85, X = x => 40 + x * k, Y = t => 420 - t * k;      // izquierda: el lado largo de frente
  const T = (x1, y1, x2, y2, c, w, d) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${d ? ` stroke-dasharray="${d}"` : ''}/>`;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="La ventana en la estructura">${FL}<rect x="0" y="420" width="${W}" height="80" fill="#e8dcc4"/>`;
  s += T(X(0), Y(0), X(0), Y(L), '#e98a1e', 7) + T(X(240), Y(0), X(240), Y(L), '#e98a1e', 7) + T(X(0), Y(L), X(240), Y(L), '#e98a1e', 7) + T(X(85), Y(0), X(85), Y(L), '#e98a1e', 5) + T(X(155), Y(0), X(155), Y(L), '#e98a1e', 5);
  if (o.lona) s += glAp(.2, `<rect x="${X(85)}" y="${Y(V.en)}" width="${70 * k}" height="${v.hueco * k}" fill="#cdb0ea" stroke="${GL_COL.rojo}" stroke-width="3" stroke-dasharray="8 5"/>` + glT(X(120), Y(V.en - v.hueco / 2) - 10, 'hueco', { fs: 20 }) + glT(X(120), Y(V.en - v.hueco / 2) + 16, `70 × ${n1(v.hueco)}`, { fs: 20, col: GL_COL.rojo }));
  else s += glAp(.3, `<rect x="${X(85)}" y="${Y(V.en) - 2}" width="${70 * k}" height="24" fill="none" stroke="#702c9c" stroke-width="6"/>`) + glAp(.7, flecha(X(85), Y(V.en) + 46, X(155), Y(V.en) + 46, GL_COL.rojo) + glT(X(120), Y(V.en) + 76, '70', { fs: 26, col: GL_COL.rojo }));
  s += glAp(1.1, flecha(X(0), Y(V.en) - 18, X(85), Y(V.en) - 18) + glT(X(42), Y(V.en) - 26, '85', { fs: 24 }) + flecha(X(155), Y(V.en) - 18, X(240), Y(V.en) - 18) + glT(X(198), Y(V.en) - 26, '85', { fs: 24 }));
  s += glAp(1.5, flecha(X(22), Y(0), X(22), Y(V.en)) + glT(X(14) - 2, Y(60), n0(V.en), { fs: 22, ta: 'start' }) + glT(X(120), Y(L) - 14, 'lado largo (tubo de 319)', { fs: 19 }));
  if (o.lona) s += glAp(1.7, glT(X(120), 452, `empieza a ${n1(v.desde)} del piso, por el tubo`, { fs: 18, col: GL_COL.rojo }));
  const P = GL.PERFIL, q = .85, A = x => 372 + x * q, B = z => 420 - z * q;      // derecha: de canto
  s += `<polyline points="${P.map(([x, z]) => A(x) + ',' + B(z)).join(' ')}" fill="none" stroke="#e98a1e" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += glAp(1.9, T(A(v.vx), B(v.vz), A(v.xf), B(v.vz), '#702c9c', 8) + flecha(A(v.xf), B(v.vz) - 16, A(v.vx), B(v.vz) - 16, GL_COL.rojo) + glT(A(v.xf + 20) - 4, B(v.vz) - 28, '50', { fs: 26, col: GL_COL.rojo }));
  if (o.lona) s += glAp(2.3, T(A(v.xf), B(v.vz), A(v.xf), B(v.zb), '#5462b4', 5) + flecha(A(v.xf) - 18, B(v.vz), A(v.xf) - 18, B(v.zb), GL_COL.rojo) + glT(A(v.xf) - 26, B((v.vz + v.zb) / 2), n0(v.baja), { fs: 26, col: GL_COL.rojo, ta: 'end' }))
    + glAp(2.7, glT(A((v.vx + v.xf) / 2) + 34, B((v.vz + v.zb) / 2) + 26, n1(v.hueco), { fs: 24, col: GL_COL.rojo, ta: 'start' }));
  s += glT(A(170), 452, 'de canto', { fs: 20 });
  return s + '</svg>';
}
// Alguien de 1,70 parado adentro: los ojos a 160 quedan en la ventana
function glPersona(g) {
  const P = GL.PERFIL, v = g.vent, oj = GL.VENT.ojos, W = 640, H = 560, q = 1.4, A = x => 150 + x * q, B = z => 480 - z * q, px = v.vx + 2, C = '#4a545b';
  const L = (x1, y1, x2, y2, c, w, d) => `<line x1="${A(x1).toFixed(1)}" y1="${B(y1).toFixed(1)}" x2="${A(x2).toFixed(1)}" y2="${B(y2).toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${d ? ` stroke-dasharray="${d}"` : ''}/>`;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Una persona de 1,70 mira por la ventana">${FL}<rect x="0" y="480" width="${W}" height="80" fill="#e8dcc4"/>`;
  s += `<polyline points="${P.map(([x, z]) => A(x) + ',' + B(z)).join(' ')}" fill="none" stroke="#e98a1e" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += L(v.vx, v.vz, v.xf, v.vz, '#702c9c', 9) + L(v.xf, v.vz, v.xf, v.zb, '#2aa795', 5);
  // la persona, de lado, mirando a la ventana
  s += glAp(.3, `<circle cx="${A(px)}" cy="${B(158)}" r="${12 * q}" fill="${C}"/>` + L(px, 138, px, 84, C, 34) + L(px, 80, px, 6, C, 22) + L(px, 130, px - 4, 88, '#6b757c', 11) + L(px, 4, px - 9, 4, C, 12) + `<circle cx="${A(px - 8)}" cy="${B(oj)}" r="3.5" fill="#fff"/>`);
  s += glAp(1, L(px - 12, oj, -75, oj, GL_COL.rojo, 3, '10 7') + glT(A(-92), B(oj) - 12, 'mira', { fs: 22, col: GL_COL.rojo, ta: 'start' }));
  s += glAp(1.4, flecha(A(px + 26), B(0), A(px + 26), B(170), GL_COL.cota, 2) + glT(A(px + 32), B(96), '1,70', { fs: 28, ta: 'start' }));
  s += glAp(1.8, L(v.xf - 4, v.vz, -50, v.vz, GL_COL.cota, 1.5, '4 5') + flecha(A(-46), B(0), A(-46), B(v.vz), GL_COL.cota, 2) + glT(A(-52), B(100), n0(v.vz), { fs: 28, ta: 'end' }));
  s += glAp(2.2, L(v.xf - 4, v.zb, -20, v.zb, GL_COL.cota, 1.5, '4 5') + flecha(A(-16), B(0), A(-16), B(v.zb), GL_COL.cota, 2) + glT(A(-11), B(40), n0(v.zb), { fs: 28, ta: 'start' }));
  s += glT(A(150), 524, 'ojos a ' + oj + ' · visto desde la puerta', { fs: 22 });
  return s + '</svg>';
}
// La forma que se pega al techo: los lados crecen 4 y las esquinas quedan libres
function glFranjas(poly, o = {}) {
  const T = GL.TIRA, W = 640, H = 520, m = 90, xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
  const k = Math.min((W - 2 * m) / w, (H - 2 * m) / h), X = x => W / 2 + (x - x0 - w / 2) * k, Y = y => H / 2 - (y - y0 - h / 2) * k, sg = glArea(poly) > 0 ? 1 : -1, G = Math.max(T * k, 22);      // la franja se dibuja más ancha para que se vea
  const A = p => [X(p[0]), Y(p[1])], pt = l => l.map(q => q.map(v => v.toFixed(1)).join(',')).join(' ');
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Franja de 4 por cada lado, sin esquinas">${FL}<polygon points="${pt(poly.map(A))}" fill="${o.col || GL_COL.pieza}" stroke="${GL_COL.piezaB}" stroke-width="3"/>`;
  let n = 0;
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length], a = A(p), b = A(q), l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if ((o.sin || []).includes(i)) return;
    const N = [-sg * (b[1] - a[1]) / l, sg * (b[0] - a[0]) / l];
    s += glAp(.4 + n++ * .4, `<polygon points="${pt([a, b, [b[0] + N[0] * G, b[1] + N[1] * G], [a[0] + N[0] * G, a[1] + N[1] * G]])}" fill="#f6d0d2" stroke="${GL_COL.rojo}" stroke-width="2.5"/>` + glT((a[0] + b[0]) / 2 + N[0] * (G + 22), (a[1] + b[1]) / 2 + N[1] * (G + 22) + 8, `+${T}`, { fs: 24, col: GL_COL.rojo }) + (o.lados ? glT((a[0] + b[0]) / 2 - N[0] * 34, (a[1] + b[1]) / 2 - N[1] * 26 + 8, n1(Math.hypot(q[0] - p[0], q[1] - p[1])), { fs: 24 }) : ''));
  });
  return s + (o.nombre ? glT(X(x0 + w / 2), Y(y0 + h * .28) + 8, o.nombre, { fs: 24 }) : '') + '</svg>';
}
// De canto, en la punta de la escalera: dobladillo con varilla, la tira de 15 debajo y cómo se tensa
function glTension(u) {
  const E = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t), W = 640, H = 460, f = E((u - .2) / .3) * Math.PI / 2, jala = E((u - .5) / .12), corta = E((u - .85) / .1), L = corta > 0 ? 130 - corta * 62 : 130;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="La tira tensa la carpa">${FL}`;
  s += `<circle cx="232" cy="200" r="32" fill="#b07a45" stroke="#5b3a1c" stroke-width="3"/><circle cx="232" cy="200" r="24" fill="#8a5a30"/>`;
  s += `<path d="M620 160 H188" stroke="#5462b4" stroke-width="8" stroke-linecap="round"/><circle cx="174" cy="160" r="14" fill="#fff" stroke="#5462b4" stroke-width="7"/><circle cx="174" cy="160" r="6" fill="#14181b"/>`;
  s += `<path d="M262 167 H200 L191 176 V236 L${(191 + L * Math.sin(f)).toFixed(1)} ${(240 + L * Math.cos(f)).toFixed(1)}" fill="none" stroke="#d9606a" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += `<path d="M204 163.500 H260" stroke="${GL_COL.rojo}" stroke-width="3" stroke-dasharray="6 4"/>`;
  if (u > .6) { const y = 330 - E((u - .6) / .15) * 92; s += `<rect x="229" y="${y - 22}" width="6" height="40" fill="#6b757c"/><rect x="221" y="${y + 16}" width="22" height="8" rx="2" fill="#39444b"/>` + glT(250, y + 58, 'autoperforante', { fs: 20, ta: 'start' }); }
  if (u > .8) s += `<path d="M262 222 V262" stroke="${GL_COL.rojo}" stroke-width="3" stroke-dasharray="5 4"/>` + glT(276, 262, 'se corta el sobrante', { fs: 20, ta: 'start', col: GL_COL.rojo });
  s += glT(440, 142, 'lona del techo', { fs: 20, col: '#5462b4' }) + glT(160, 126, `borde de ${GL.DOB} con varilla`, { fs: 20 }) + glT(276, 216, 'tubo de la escalera', { fs: 20, ta: 'start' });
  s += glT(176, 236, `salen ${GL.TENS}`, { fs: 22, col: GL_COL.rojo, ta: 'end' }) + glT(274, 190, `sella ${GL.TENS_S}`, { fs: 20, col: GL_COL.rojo, ta: 'start' }) + (u > .5 ? glT(440, 330, 'adentro del techito', { fs: 18, ta: 'start', col: '#4a545b' }) : '');
  s += glT(W / 2, 60, u < .2 ? 'La tira cuelga debajo de la varilla' : u < .6 ? 'Se mete por dentro del techito y se jala' : u < .8 ? 'Se atornilla al tubo' : 'Queda tensa; se corta lo que sobra', { fs: 26 });
  return s + '</svg>';
}
// La tira de tensión abierta: lo que se sella debajo de la burbuja y lo que sale para jalar
function glTensAncho(p) {
  const W = 640, H = 470, k = 15, x0 = 120, x1 = 590, y0 = 120, ys = y0 + GL.TENS_S * k, y1 = ys + GL.TENS * k, z = [[x1, y0], [x1 - 14, y0 + 90], [x1 + 8, y0 + 180], [x1, y1]];
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="La tira de tensión: 3 de selle y 15 que salen">${FL}`;
  s += `<polygon points="${[[x0, y1], [x0, y0], ...z].map(q => q.join()).join(' ')}" fill="${p.col}" stroke="#14181b" stroke-width="3"/>`;
  s += glAp(.4, `<polygon points="${x0},${y0} ${x1},${y0} ${x1 - 7},${ys} ${x0},${ys}" fill="${GL_COL.rojo}" opacity=".35"/><path d="M${x0} ${ys} H${x1 - 7}" stroke="${GL_COL.rojo}" stroke-width="3" stroke-dasharray="9 6"/>` + glT(350, y0 + 31, 'se sella debajo de la burbuja', { fs: 24, col: GL_COL.rojo }));
  s += glAp(.9, flecha(x0 - 26, y0, x0 - 26, ys, GL_COL.rojo, 2) + glT(x0 - 46, (y0 + ys) / 2 + 10, GL.TENS_S, { fs: 30, col: GL_COL.rojo, ta: 'end' }));
  s += glAp(1.3, flecha(x0 - 26, ys, x0 - 26, y1, GL_COL.cota, 2) + glT(x0 - 46, (ys + y1) / 2 + 10, GL.TENS, { fs: 30, ta: 'end' }) + glT(350, (ys + y1) / 2 + 10, 'sale para jalar y atornillar', { fs: 24 }));
  s += glAp(1.7, glT(W / 2, 56, `largo ${n1(p.w)} · de piso a piso`, { fs: 26 }) + flecha(x0, 84, x1, 84, GL_COL.cota, 2));
  s += glAp(2, glT(W / 2, H - 30, `ancho de corte: ${GL.TENS + GL.TENS_S}`, { fs: 28 }));
  return s + '</svg>';
}
// De cerca: la tira de 4 de la ventana (o del cubo) doblada y sellada encima de la carpa triangular
function glTira4(que) {
  const W = 640, H = 400;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="La tira de 4 se pega encima de la carpa">${FL}`;
  s += `<path d="M30 300 H400" stroke="#5462b4" stroke-width="9" stroke-linecap="round"/>` + glT(60, 345, 'lona del techo', { fs: 22, ta: 'start', col: '#5462b4' });
  s += glAp(.4, `<path d="M400 60 V289 H280" fill="none" stroke="#b5541c" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>` + glT(416, 150, que, { fs: 22, ta: 'start', col: '#b5541c' }));
  s += glAp(1, `<rect x="280" y="291" width="120" height="6" fill="${GL_COL.rojo}"/>` + flecha(280, 250, 400, 250, GL_COL.rojo) + glT(335, 238, 'franja de 4', { fs: 28, col: GL_COL.rojo }));
  s += glAp(1.6, glT(340, 385, 'la franja se dobla y se sella a la lona', { fs: 22 }));
  return s + '</svg>';
}

// Una pieza en la mesa con sus medidas encima// Una pieza en la mesa con sus medidas encima
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

// El plástico de la ventana: las 3 piezas en un solo pedazo
function glPlastico(g) {
  const f = g.plast, m = 46, W = f.len + 2 * m + 20, H = f.alto + 2 * m;
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Cómo salen las piezas de plástico">${FL}`;
  s += `<rect x="${m}" y="${m / 2}" width="${f.len.toFixed(1)}" height="${f.alto.toFixed(1)}" fill="#eef9f7" stroke="#6bb5ab" stroke-dasharray="4 3"/>`;
  f.pos.forEach((q, i) => { s += glAp(.2 + i * .4, `<polygon points="${q.pts.map(([x, y]) => `${(m + x).toFixed(1)},${(m / 2 + y).toFixed(1)}`).join(' ')}" fill="${q.p.col}" stroke="#14181b" stroke-width="1.2"/>`
    + glBola(m + (i ? (i === 1 ? q.x + 17 : q.x + q.w - 15) : q.x + q.w / 2), m / 2 + (i === 1 ? 28 : i === 2 ? q.h - 26 : q.h / 2), q.p, i ? 8 : 12)); });
  s += glAp(1.4, flecha(m, m / 2 + f.alto + 10, m + f.len, m / 2 + f.alto + 10) + glT(m + f.len / 2, m / 2 + f.alto + 28, n1(f.len), { fs: 13 }) + flecha(m + f.len + 10, m / 2, m + f.len + 10, m / 2 + f.alto) + glT(m + f.len + 16, m / 2 + f.alto / 2 + 4, n1(f.alto), { fs: 13, ta: 'start' }));
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
  r += glT(92, 76, `${p.cant > 1 ? `<tspan fill="${GL_COL.rojo}">corta ${p.cant}</tspan> · ` : ''}${p.plast ? 'plástico transparente' : `fila ${p.fila} del rollo`}`, { fs: 21, ta: 'start', col: '#4a545b' });
  if (!o.sin3D) {
    r += glT(92, 108, p.nota, { fs: 19, ta: 'start', col: '#4a545b' });
    r += gl3D(g, glVista(p), { pieza: p.n, cremalleras: true, caja: `x="${W - 250}" y="2" width="246" height="${cab - 14}"` });
  }
  // la pieza: lo de afuera es el corte; la raya roja es donde se sella
  r += glAp(.1, `<polygon points="${pts(p.corte)}" fill="${p.col}" stroke="#14181b" stroke-width="3" stroke-linejoin="round"/>`);
  if (p.al.some(a => a > 0)) r += glAp(.5, `<polygon points="${pts(p.real)}" fill="none" stroke="${GL_COL.rojo}" stroke-width="2" stroke-dasharray="9 6"/>`);
  // medida de cada borde (la del corte), por fuera
  const c = p.corte, n = c.length, cx = c.reduce((a, q) => a + q[0], 0) / n, cy = c.reduce((a, q) => a + q[1], 0) / n;
  const dentro = p.w * s > 110 && p.h * s > 40;      // si no caben por dentro, van al lado de cada medida
  const suma = (a, b) => { let m = 1e9, v = 0; p.real.forEach((q, j) => { const t = p.real[(j + 1) % p.real.length], d = Math.hypot((q[0] + t[0] - a[0] - b[0]) / 2, (q[1] + t[1] - a[1] - b[1]) / 2); if (d < m) { m = d; v = p.al[j]; } }); return p.h * s > 40 ? v : 0; };
  c.forEach((a, i) => {
    const b = c[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 8) return;
    const mxp = X((a[0] + b[0]) / 2), myp = Y((a[1] + b[1]) / 2);
    let nx = -(Y(b[1]) - Y(a[1])), ny = X(b[0]) - X(a[0]); const ln = Math.hypot(nx, ny) || 1; nx /= ln; ny /= ln;
    if ((mxp - X(cx)) * nx + (myp - Y(cy)) * ny < 0) { nx = -nx; ny = -ny; }
    const la = Math.abs(nx) > .7;
    r += glAp(.8 + i * .2, glT(mxp + nx * (la ? 20 : 30), myp + ny * 30 + 9, n1(L), { fs: 26, ta: la ? (nx > 0 ? 'start' : 'end') : 'middle' }));
    if (!dentro) { const al = suma(a, b); if (al) r += glAp(1.6, glT(mxp + nx * (la ? 20 : 30), myp + ny * 30 + (ny < -.7 ? -20 : 33), `+${n1(al)}`, { fs: 19, col: GL_COL.rojo, ta: la ? (nx > 0 ? 'start' : 'end') : 'middle' })); }
  });
  // lo que se le sumó a cada borde, por dentro y en rojo
  if (p.al.some(a => a > 0) && dentro) {
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
// Bordes que tocan el suelo, con hacia dónde sale la franja (para afuera). Las 3 puertas no llevan.
function glBordesSuelo() {
  const F = GL.FONDO, y1 = F + GL.CUBO.d;
  return [
    [[0, 0], [0, F], [-1, 0]], [[300, 0], [300, y1], [1, 0]],
    [[GL.PCUBO, y1], [300, y1], [0, 1]],
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
  [[0, y1, C.hb], [300, y1, C.hb], [0, F, C.h], [300, F, C.h]].forEach(([x, y, z]) => tubo([x, y, 0], [x, y, z], 4));
  tubo([0, y1, C.hb], [300, y1, C.hb], 4); tubo([0, F, C.h], [300, F, C.h], 4); tubo([0, F, C.h], [0, y1, C.hb], 4); tubo([300, F, C.h], [300, y1, C.hb], 4);
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
    { t: 'Así queda: <b>lona</b>, con la ventana en <b>plástico</b>.', anim: { dur: 5000, f: u => gl3D(g, -0.7 + u * 1.4) } },
    { t: `Son <b>3 partes</b>: techo (azul), cubo (naranja) y ventana (verde agua). La <b>puerta</b> (verde) va aparte, al final.`, svg: () => gl3D(g, -.75, { partes: 1, sep: { cubo: 1, vent: 1, puerta: 1 } }) },
    { t: `Frente: <b>300</b> de base; los tubos miden <b>319</b>, <b>149</b> y <b>253</b>.`, svg: () => glCara(g, { medidas: true }) },
    { t: `Largo total <b>390</b>: escalera <b>80</b> + carpa <b>240</b> + cubo <b>70</b>.`, svg: () => gl3D(g, 0.75, { textos: [[[300, 200, -22], '240 carpa'], [[300, 40, 40], '80 escalera'], [[300, 355, -22], '70 cubo']] }) },
    { t: `Ventana de <b>70</b> de ancho en el lado del tubo de 319; sale <b>50</b> y baja derecha hasta el tubo.`, svg: () => gl3D(g, -0.9, { resalta: 'vent' }) },
    { t: `Alguien de <b>1,70</b> mira derecho por la ventana: va de <b>${n0(g.vent.zb)}</b> a <b>${n0(g.vent.vz)}</b> del piso.`, svg: () => glPersona(g) },
    { t: `Atrás, un cubo de <b>300</b> que sale <b>70</b> y baja de <b>250</b> a <b>235,5</b>.`, svg: () => gl3D(g, 2.7, { resalta: 'cubo' }) },
  ] }),
  lona: g => ({ titulo: 'Las piezas', arriba: `<div class="total"><span class="etq">Compra más o menos</span><b>${n0(Math.ceil(g.total / 100))} m</b><span>de rollo de ${n0(GL.ROLLO)} de ancho (ya con 10 % de desperdicio) y un pedazo de plástico de ${n0(Math.ceil(g.plast.len))} × ${n0(Math.ceil(g.plast.alto))} para la ventana</span></div>`, cuadros: [
    { t: `Son <b>${g.piezas.reduce((a, p) => a + p.cant, 0)} piezas</b>. Cada una tiene su <b>número</b> y su <b>color</b>: así sale del rollo.`, svg: () => glRollo(g), alto: true },
    { t: `Color = parte: <b>azul</b> techo, <b>naranja</b> cubo, <b>morado</b> techito de la ventana, <b>verde</b> puertas, <b>rosado</b> tira de tensión.`, svg: () => glRollo(g), alto: true },
    { t: `La cara y los 2 costados de la ventana van en <b>plástico</b>: salen de un pedazo de <b>${n1(g.plast.len)} × ${n1(g.plast.alto)}</b>.`, svg: () => glPlastico(g) },
    ...g.piezas.map(p => glFichaCu(g, p.id, `${glN(p)} <b>${p.nombre}</b>${p.cant > 1 ? ` (corta <b>${p.cant}</b>)` : ''}: los números son el borde <b>de corte</b>, ya con el selle.`)),
  ] }),
  techo: g => {
    const a = glP(g, 'tA'), b = glP(g, 'tB'), t = g.techo, J = a.h + b.h - GL.SELLE;
    return { titulo: 'Techo', cuadros: [
      { t: `La lona va de un suelo al otro <b>pasando por encima del pico</b>.`, anim: { dur: 3000, f: u => glPerfilTecho(g, u) } },
      { t: `Corta ${glN(a)} y ${glN(b)}. De la tira que sobra salen ${glN(glP(g, 'tens'))} ${glN(glP(g, 'vTe'))} ${glN(glP(g, 'tri'))} ${glN(glP(g, 'cFB'))}.`, svg: () => glRollo(g, { filas: [1, 2] }), alto: true },
      glFichaCu(g, 'tA'), glFichaCu(g, 'tB'),
      { t: `Sella ${glN(a)} con ${glN(b)} por el largo. Juntas miden <b>${n1(J)}</b> de ancho.`, svg: () => glMesa([[0, 0], [a.w, 0], [a.w, J], [0, J]], { m: 110, fs: 40, lineas: [[0, J - a.h + GL.SELLE / 2, a.w, J - a.h + GL.SELLE / 2]], cotas: [[[0, 0], [0, J], n1(J), 40]], textos: [[[a.w / 2, J - a.h / 2], 'A (adelante)'], [[a.w / 2, b.h / 2], 'B (atrás)'], [[a.w / 2, J - a.h + GL.SELLE / 2 + 14], 'selle', GL_COL.rojo]] }) },
      { t: `Adelante (escalera): borde de <b>${GL.DOB}</b> con varilla (sobresale y protege de la lluvia); debajo de esa burbuja se sella la tira ${glN(glP(g, 'tens'))} de piso a piso.`, svg: () => gl3D(g, -.35, { tens: 1 }) },
      glFichaCu(g, 'tens', `${glN(glP(g, 'tens'))} <b>Tira de tensión</b>: pieza aparte, se corta de <b>${GL.TENS + GL.TENS_S}</b> de ancho.`),
      { t: `De esos ${GL.TENS + GL.TENS_S}: <b>${GL.TENS_S}</b> se sellan debajo de la burbuja y salen <b>${GL.TENS}</b> para jalar.`, svg: () => glTensAncho(glP(g, 'tens')) },
      { t: `Así tensa la carpa: se mete por dentro, se atornilla y se <b>corta el sobrante</b>.`, anim: { dur: 8000, f: glTension } },
      { t: `Arriba se <b>abre un hueco</b> para la ventana (lo ves en el paso Ventana).`, svg: () => gl3D(g, -0.9, { resalta: 'vent' }) },
    ] };
  },
  ventana: g => {
    const V = GL.VENT, v = g.vent, a = glP(g, 'tA'), b = glP(g, 'tB'), J = a.h + b.h - GL.SELLE, L = a.w, x1 = L - GL.SUELO - v.desde, x0 = x1 - v.hueco, y1 = J - GL.DOB - v.y0, y0 = y1 - V.ancho;
    return { titulo: 'Ventana', cuadros: [
      { t: `Va en el lado largo, toda <b>sellada</b> a la carpa: arriba <b>lona</b>, lo demás <b>plástico</b>.`, svg: () => gl3D(g, -1.2, { resalta: 'vent' }) },
      { t: `A la altura de los ojos de alguien de <b>1,70</b>: de <b>${n0(v.zb)}</b> a <b>${n0(v.vz)}</b> del piso.`, svg: () => glPersona(g) },
      { t: `<b>2 tubos parados</b> de <b>319</b> separados <b>70</b>; a <b>${n0(V.en)}</b> del piso (por el tubo) de cada uno salen <b>50</b>.`, svg: () => glVisera(g) },
      { t: `El techito sale <b>50</b> y el plástico baja <b>${n0(v.baja)}</b> derecho hasta el tubo. Por el tubo son <b>${n1(v.hueco)}</b>: ese es el hueco.`, svg: () => glVisera(g, { lona: true }) },
      glFichaCu(g, 'vTe'), glFichaCu(g, 'vCara'), glFichaCu(g, 'vCos'),
      { t: `Arma la ventana: techito de lona ${glN(glP(g, 'vTe'))}, plástico ${glN(glP(g, 'vCara'))} y un costado ${glN(glP(g, 'vCos'))} a cada lado.`, svg: () => gl3D(g, -1, { piezas: ['vTe', 'vCara', 'vCos'].map(k => glP(g, k).n) }) },
      { t: `En el techo ya sellado, abre el hueco de <b>${V.ancho} × ${n1(v.hueco)}</b> del lado del tubo de 319.`, svg: () => glMesa([[0, 0], [L, 0], [L, J], [0, J]], { m: 110, fs: 36,
          lineas: [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]],
          cotas: [[[x1, (y0 + y1) / 2], [L, (y0 + y1) / 2], '', 0, GL_COL.rojo], [[(x0 + x1) / 2, y1], [(x0 + x1) / 2, J], n1(J - y1), 0, GL_COL.rojo], [[L, J], [L, 0], n1(J), 60], [[0, 0], [L, 0], n1(L), -60]],
          textos: [[[(x0 + x1) / 2, (y0 + y1) / 2 - 10], `${n1(v.hueco)} × ${V.ancho}`, GL_COL.rojo], [[x1 - 100, y0 - 34], n1(L - x1) + ' del borde', GL_COL.rojo], [[L / 2, J + 24], 'borde de adelante (escalera)'], [[L * .3, J / 2], 'techo']] }) },
      { t: `Alrededor la ventana trae una <b>franja de ${GL.TIRA}</b>: se sella encima de la carpa.`, svg: () => glTira4('la ventana') },
    ] };
  },
  cubo: g => {
    const la = glP(g, 'cLado'), fa = glP(g, 'cFA'), fb = glP(g, 'cFB');
    return { titulo: 'Cubo de atrás', cuadros: [
      { t: `Atrás va un cubo de <b>300</b> de ancho y <b>70</b> de fondo; baja de <b>250</b> a <b>235,5</b>.`, svg: () => gl3D(g, 2.7, { resalta: 'cubo' }) },
      { t: `Cada lado es <b>un solo corte</b>. El del tubo de 253 es ${glN(la)}; el del lado de la ventana es una <b>puerta</b> ${glN(glP(g, 'cPL'))}.`, svg: () => gl3D(g, 2.4, { piezas: [la.n, glP(g, 'cPL').n] }) },
      glFichaCu(g, 'cLado'),
      { t: `En el fondo, a <b>${GL.PCUBO}</b> del borde del lado de la ventana, va un <b>tubo nuevo</b>: de ahí al borde es la <b>puerta de atrás</b> ${glN(glP(g, 'cPt'))}.`, svg: () => gl3D(g, 3.3, { piezas: [glP(g, 'cPt').n] }) },
      { t: `El resto del fondo mide <b>235,5</b> de alto y el rollo <b>${n0(GL.ROLLO)}</b>: va en 2, ${glN(fa)} abajo y ${glN(fb)} arriba. La de arriba se sella <b>por encima</b>, para que el agua resbale.`, svg: () => gl3D(g, 2.9, { piezas: [fa.n, fb.n] }) },
      glFichaCu(g, 'cFA'), glFichaCu(g, 'cFB'),
      glFichaCu(g, 'tapa'),
      { t: `Visto desde atrás, el cubo es más ancho que la carpa: cierra <b>2 esquinas</b> (rojo).`, svg: () => glEsquinas(g) },
      glFichaCu(g, 'eG'), glFichaCu(g, 'eC'), glFichaCu(g, 'tri'),
      { t: `${['eG', 'eC', 'tri'].map(k => glN(glP(g, k))).join(' ')} traen una <b>franja de ${GL.TIRA}</b> en los bordes que se pegan al techo; el triángulo también abajo, contra la tapa ${glN(glP(g, 'tapa'))}.`, svg: () => glTira4('lona del cubo') },
    ] };
  },
  puerta: g => {
    const ab = glP(g, 'fAb'), ar = glP(g, 'fAr'), pl = glP(g, 'cPL'), pa = glP(g, 'cPt'), ti = glP(g, 'tira'), h = GL.CREM_ALTO;
    return { titulo: 'Puertas (van al final)', cuadros: [
      { t: `Son <b>3 puertas</b>: la de adelante, una en el <b>lado del cubo</b> (el de la ventana) y otra <b>atrás</b>. Todas con <b>1 cremallera</b> en la mitad, de <b>${h}</b>.`, svg: () => gl3D(g, -.45, { partes: 1 }) },
      { t: `Adelante: es más alta que el rollo, va en <b>2 piezas</b>, ${glN(ab)} y ${glN(ar)}.`, svg: () => glCara(g, { partes: 1 }) },
      glFichaCu(g, 'fAb'), glFichaCu(g, 'fAr'),
      { t: `Sella ${glN(ab)} con ${glN(ar)}. A los lados y arriba lleva la <b>franja de ${GL.TIRA}</b>; abajo <b>${GL.SUELO}</b> de dobladillo (la puerta <b>no</b> se atornilla).`, svg: () => glCara(g, { partes: 2 }) },
      { t: `<b>1 cremallera</b> recta en la mitad, a <b>150</b> de cada esquina, de <b>${h}</b> de alto.`, svg: () => glCara(g, { crem: 1 }) },
      glFichaCu(g, 'tira', `Cada cremallera va pegada a una tira ${glN(ti)} de <b>4 cm</b> sellada a la puerta (corta 3, una por puerta).`),
      { t: `Ya sellada, <b>corta la lona</b> por la mitad de la cremallera.`, svg: () => glCara(g, { crem: 2 }) },
      { t: `Para abrir: cada mitad <b>se enrolla hacia su lado</b> y queda <b>todo el triángulo abierto</b>; se amarra con <b>2 correas</b>.`, anim: { dur: 4000, f: u => glCara(g, { abre: u }) } },
      glFichaCu(g, 'cPL'),
      { t: `Puerta de lado ${glN(pl)}: <b>${GL.PCUBO}</b> de ancho, cremallera en la mitad, de <b>${h}</b>. Se abre igual.`, anim: { dur: 4000, f: u => glPuertaCubo(u, { titulo: 'Lado del cubo (el de la ventana)' }) } },
      glFichaCu(g, 'cPt'),
      { t: `Puerta de atrás ${glN(pa)}: del borde al <b>tubo nuevo</b> (verde), <b>${GL.PCUBO}</b>. Igual: cremallera en la mitad y se enrolla.`, anim: { dur: 4000, f: u => glPuertaCubo(u, { titulo: 'Atrás (fondo del cubo)', tubo: true }) } },
    ] };
  },
  unir: g => {
    const P = GL.PERFIL, E = u => { u = Math.max(0, Math.min(1, u * 1.4 - .2)); return 1 - u * u * (3 - 2 * u); }, T = GL.TIRA;
    return { titulo: 'Unir las partes', cuadros: [
      { t: `Donde una parte <b>toca el techo</b>, trae una <b>franja de ${T}</b> (en rojo).`, svg: () => gl3D(g, -.75, { partes: 1, franjas: ['cubo', 'vent', 'puerta'], sep: { cubo: 1, vent: 1, puerta: 1 } }) },
      { t: `La franja se dobla y <b>se sella a la lona del techo</b>.`, svg: () => glTira4('la parte que llega') },
      { t: `La franja va en <b>cada lado</b> que toca el techo; las <b>esquinas quedan libres</b>: la ventana queda como una cruz gorda.`, svg: () => glFranjas([[0, 0], [GL.VENT.ancho, 0], [GL.VENT.ancho, g.vent.hueco], [0, g.vent.hueco]], { lados: 1, nombre: 'ventana', col: GL_GRUPO.plast }) },
      { t: `El <b>cubo</b> igual: franja en los 3 lados que tocan el techo, sin esquinas.`, svg: () => glFranjas(P, { lados: 1, nombre: 'cubo', col: GL_GRUPO.cubo, sin: [3] }) },
      { t: `<b>1.</b> El <b>cubo</b> se pega al techo por toda la orilla de atrás.`, anim: { dur: 3200, f: u => gl3D(g, 2.45, { partes: 1, sin: ['puerta', 'vent'], franjas: ['cubo'], sep: { cubo: E(u) } }) } },
      { t: `<b>2.</b> La <b>ventana</b> se pega alrededor del hueco del techo.`, anim: { dur: 3200, f: u => gl3D(g, -1.15, { partes: 1, sin: ['puerta'], franjas: ['vent'], sep: { vent: E(u) } }) } },
      { t: `<b>3.</b> La <b>puerta</b> al final, por dentro del techo, a <b>${GL.VUELO}</b> del borde.`, anim: { dur: 3200, f: u => gl3D(g, -.45, { partes: 1, franjas: ['puerta'], sep: { puerta: E(u) } }) } },
      { t: `<b>4.</b> Adelante, la tira ${glN(glP(g, 'tens'))} tensa toda la carpa: se mete en el techito de la escalera y se atornilla.`, anim: { dur: 8000, f: glTension } },
    ] };
  },
  suelo: g => ({ titulo: 'Al suelo', cuadros: [
    { t: `Donde la lona toca el piso lleva una <b>franja de ${GL.SUELO} cm</b> acostada (rojo). Las <b>3 puertas</b> no.`, svg: () => glSuelo3D(g, 1, 'fija') },
    { t: `Al armar: cada franja se <b>atornilla al piso</b> con autoperforantes.`, anim: { dur: 7000, f: u => glSuelo3D(g, u, 'fija') } },
    { t: `De cerca: la lona baja por fuera del tubo y los <b>${GL.SUELO} cm</b> quedan en el piso.`, anim: { dur: 5000, f: u => glTornillos(u, 'fija') } },
    { t: `Para lavarla: se quitan los tornillos y la lona <b>sale entera por arriba</b>.`, anim: { dur: 7000, f: u => glSuelo3D(g, u, 'suelta') } },
    { t: `La estructura <b>no se desarma</b>: solo se levanta la lona.`, anim: { dur: 5000, f: u => glTornillos(u, 'suelta') } },
  ] }),
  final: g => ({ titulo: 'Listo', cuadros: [
    { t: `Así queda armado. Compra <b>${n0(Math.ceil(g.total / 100))} m</b> de lona y <b>3 cremalleras</b> de <b>${GL.CREM_ALTO + 10}</b>.`, anim: { dur: 6000, f: u => gl3D(g, 0.6 - u * 6.28) } },
  ], abajo: `<button class="cta verde" id="glCompartir">Enviar medidas por WhatsApp</button>` }),
};
const GL_PASOS = [['inicio', 'El glamping'], ['lona', 'Piezas'], ['techo', 'Techo'], ['cubo', 'Cubo'], ['ventana', 'Ventana'], ['puerta', 'Puerta'], ['unir', 'Unir'], ['suelo', 'Al suelo'], ['final', 'Listo']];

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
const GL_EST = `<button class="gl-est" onclick="abrirRender('glamping')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V8h18v13M3 21L9.500 3 17 8l4 13"/></svg><span><b>Estructura</b>todas las medidas de los tubos</span><i>▶</i></button>`;
function pintarGlamping() {
  glParar();
  const g = GL.g = glCalcular();
  GL.paso = Math.min(Math.max(0, GL.paso), GL_PASOS.length - 1);
  const i = GL.paso, [id] = GL_PASOS[i];
  $('#pillCarpa').textContent = 'Glamping 3 × 3,90';
  $('#glPasos').innerHTML = GL_PASOS.map(([k, t], j) => `<button data-paso="${j}" ${j === i ? 'aria-current="step"' : ''}><span>${j + 1}</span>${t}</button>`).join('');
  const esc = GL.esc = GL_ESC[id](g);
  $('#glCuerpo').innerHTML = `<h1>${esc.titulo}</h1>${i === 0 ? GL_EST : ''}${esc.arriba || ''}
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
      ${[['techo', 'Techo'], ['cubo', 'Cubo'], ['vent', 'Techito'], ['plast', 'Plástico'], ['frente', 'Puertas'], ['tira', 'Tiras'], ['tens', 'Tensión']].map(([k, t]) => `<span><i style="background:${GL_GRUPO[k]}"></i>${t}</span>`).join('')}
      <span class="gl-sel"><i></i>se sella: <b>1,5</b> de cada pieza (3 en total)</span>
      <span class="gl-sel">borde al suelo: <b>+5</b> (tornillos) · borde de adelante: <b>+5</b> (varilla) y debajo tira de <b>18</b> (3 de selle + 15) · cada lado contra el techo: <b>franja de 4</b>, sin esquinas</span>
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
  let t = `*GLAMPING 3 × 3,90* (rollo de ${n0(GL.ROLLO)} de ancho · selle ${n1(GL.SELLE)}: ${n1(GL.SELLE / 2)} en cada borde · borde al suelo ${GL.SUELO} (tornillos) · borde de adelante ${GL.DOB} (varilla) con tira de ${GL.TENS + GL.TENS_S} debajo: ${GL.TENS_S} de selle + ${GL.TENS} · cubo, ventana y puerta contra el techo: franja de ${GL.TIRA} por lado, esquinas libres)
Medidas de CORTE, ya con selle y dobladillo:
`;
  g.piezas.forEach(p => {
    const c = p.corte, bordes = c.map((a, i) => Math.hypot(c[(i + 1) % c.length][0] - a[0], c[(i + 1) % c.length][1] - a[1])).filter(L => L >= 8).map(n1);
    t += `
*${p.n}. ${p.nombre}*${p.cant > 1 ? ` (×${p.cant})` : ''}${p.plast ? ', en PLÁSTICO' : `, fila ${p.fila}`}: ${p.real.length === 4 && p.real.every(([x, y]) => (x === p.real[0][0] || x === p.real[2][0]) && (y === p.real[0][1] || y === p.real[2][1])) ? `${n1(p.w)} × ${n1(p.h)}` : `bordes ${bordes.join(' · ')}, alto ${n1(p.h)}`}${p.fl.some(Boolean) ? ` (franja de ${GL.TIRA} en el lado de ${p.real.map((a, i) => p.fl[i] ? n1(Math.hypot(p.real[(i + 1) % p.real.length][0] - a[0], p.real[(i + 1) % p.real.length][1] - a[1])) : 0).filter(Boolean).join(' y ')})` : ''}`;
  });
  t += `

*Puertas (3):* adelante, lado del cubo (el de la ventana) y atrás (del borde al tubo nuevo de ${GL.PCUBO}); cada una con 1 cremallera recta en la mitad de ${GL.CREM_ALTO} y 2 correas; se enrolla hacia los lados`;
  t += `
*Ventana:* hueco de ${GL.VENT.ancho} × ${n1(g.vent.hueco)}, empieza a ${n1(g.vent.desde)} del piso por el tubo de 319; los 2 tubos del techito salen a ${n0(GL.VENT.en)} (${n0(g.vent.vz)} de alto)
*Lona:* ≈ ${n0(Math.ceil(g.total / 100))} m de rollo de ${n0(GL.ROLLO)} de ancho
*Plástico transparente:* un pedazo de ${n0(Math.ceil(g.plast.len))} × ${n0(Math.ceil(g.plast.alto))}`;
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
