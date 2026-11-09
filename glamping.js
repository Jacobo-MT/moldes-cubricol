'use strict';
// =================== Glamping tipo A (Cubricol) ===================
// Medidas de diseño fijadas el 9-nov-2026. Todo en cm.
// La cara de la puerta se mira de frente: x desde la esquina IZQUIERDA del suelo, z hacia arriba.
// y = 0 en la punta del marco (la "escalera"), la pared de la puerta está en y = VUELO y la de atrás en y = FONDO.
// 9-nov: los 3,10 m de largo total INCLUYEN el cubo de 60: la carpa mide 250 (con la escalera) + 60 del cubo.
const GL = {
  ROLLO: 200, SELLE: 3.5, DOB: 5, FONDO: 250, VUELO: 50,
  PERFIL: [[0, 0], [125, 300], [265, 250], [300, 0]],   // suelo izq · pico · esquina pequeña · suelo der
  CUBO: { w: 300, h: 250, d: 60 },
  CREM: [100, 200],                                       // cremalleras: a 100 y 200 cm de la esquina izquierda
  VENT: { lado: 100, ancho: 120, sale: 50, zt: 260, yc: 150 },          // techito PLANO, sin punta
  f: 0, juega: true, timer: 0, raf: 0, paso: leerLS('glamping', 0), esc: null,
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
  const P = GL.PERFIL, S = GL.SELLE, D = GL.DOB, R = GL.ROLLO, M = S / 2;   // cada pieza trae la mitad del selle
  const lados = [glLen(P[0], P[1]), glLen(P[1], P[2]), glLen(P[2], P[3])];
  const suelo = lados.reduce((a, b) => a + b, 0);
  const techo = { largo: suelo + 2 * D, ancho: GL.FONDO + 2 * D };
  techo.juntas = 2 * R - S; techo.sobra = techo.juntas - techo.ancho;
  // cara de la puerta en 2 piezas: abajo (lo que da el rollo) y arriba
  const zJ = R - D - S / 2;                                  // la unión queda a esta altura
  const abajo = { poly: glRecorte(P, 0, zJ + S / 2), largo: P[3][0] + 2 * M, alto: R };
  const arribaP = glRecorte(P, zJ - S / 2, 400);
  const [ai, ad] = glAncho(zJ - S / 2);
  const arriba = { poly: arribaP, base: ad - ai, ai, pico: [P[1][0] - ai, P[1][1] - (zJ - S / 2)], esq: [P[2][0] - ai, P[2][1] - (zJ - S / 2)], alto: P[1][1] - (zJ - S / 2) + M };
  arriba.ancho = arriba.base + 2 * M;
  // cremalleras
  const crem = GL.CREM.map(x => ({ x, z: glZ(x) }));
  // cubo (visto desde atrás, la cara es el espejo del frente)
  const C = GL.CUBO, [bi, bd] = glAncho(C.h);
  const espejo = P.map(([x, z]) => [P[3][0] - x, z]);           // perfil visto desde atrás
  const [ei, ed] = [P[3][0] - bd, P[3][0] - bi];               // a 250 de alto, desde atrás
  const cubo = {
    banda: { ancho: C.w + 2 * C.d + 2 * M, alto: C.h + D + M, franjas: 0 },
    tapa: { largo: C.w + 2 * M, ancho: C.d + 2 * M },
    chica: { arriba: ei, alto: C.h }, grande: { arriba: C.w - ed, alto: C.h },
    tri: { base: ed - ei, alto: P[1][1] - C.h, pico: espejo[1][0] - ei },
  };
  cubo.banda.franjas = Math.ceil((cubo.banda.ancho - R) / (R - S)) + 1;
  cubo.banda.ultima = cubo.banda.ancho - (cubo.banda.franjas - 1) * (R - S);
  // ventana (buhardilla) en el lado largo, el que baja del pico a la esquina izquierda
  const V = GL.VENT, pend = P[1][0] / P[1][1];                 // cuánto entra el techo por cada cm que sube
  const xTop = pend * V.zt, xf = xTop - V.sale, zb = xf / pend;
  const vent = {
    cara: { ancho: V.ancho, alto: V.zt - zb }, zb,
    costado: { arriba: V.sale, alto: V.zt - zb },
    techito: { ancho: V.ancho, largo: V.sale },
    hueco: { ancho: V.ancho, largo: Math.hypot(V.zt - zb, V.sale) },
  };
  // rollo: cada fila es un pedazo de rollo de 200 de ancho
  const filas = [
    { nombre: 'Techo 1', len: techo.largo },
    { nombre: 'Techo 2 + sobrante', len: techo.largo, sobra: techo.sobra },
    { nombre: 'Frente, abajo', len: abajo.largo },
    { nombre: 'Frente, arriba', len: arriba.alto },
    ...Array.from({ length: cubo.banda.franjas }, (_, i) => ({ nombre: `Cubo ${i + 1}`, len: cubo.banda.alto, cubo: i })),
  ];
  const neto = filas.reduce((a, f) => a + f.len, 0);
  return { lados, suelo, techo, zJ, abajo, arriba, crem, cubo, vent, filas, neto, total: neto * 1.1 };
}

// ---------- 3D sencillo ----------
function glProy(p, a, k = 1) {
  const cx = 150, cy = 210, dx = p[0] - cx, dy = cy - p[1];      // con a = 0 se ve el frente (la puerta)
  const rx = dx * Math.cos(a) - dy * Math.sin(a), ry = dx * Math.sin(a) + dy * Math.cos(a);
  return [rx * k, (-p[2] * 0.9 + ry * 0.42) * k, ry];
}
function glModelo(g, o = {}) {
  const P = GL.PERFIL, F = GL.FONDO, W = GL.VUELO, C = GL.CUBO, V = GL.VENT, caras = [];
  const L3 = (x, y, z) => [x, y, z];
  for (let i = 0; i < P.length - 1; i++) caras.push({ pts: [L3(P[i][0], 0, P[i][1]), L3(P[i + 1][0], 0, P[i + 1][1]), L3(P[i + 1][0], F, P[i + 1][1]), L3(P[i][0], F, P[i][1])], col: i === 1 ? GL_COL.lona2 : GL_COL.lona, nombre: 'techo' });
  caras.push({ pts: P.map(([x, z]) => L3(x, W, z)), col: '#e6eaf6', nombre: 'puerta' });
  caras.push({ pts: P.map(([x, z]) => L3(x, F, z)), col: '#e6eaf6' });
  const y1 = F + C.d;
  caras.push({ pts: [L3(0, y1, 0), L3(300, y1, 0), L3(300, y1, C.h), L3(0, y1, C.h)], col: GL_COL.lona, nombre: 'cubo' });
  caras.push({ pts: [L3(0, F, 0), L3(0, y1, 0), L3(0, y1, C.h), L3(0, F, C.h)], col: GL_COL.lona2, nombre: 'cubo' });
  caras.push({ pts: [L3(300, F, 0), L3(300, y1, 0), L3(300, y1, C.h), L3(300, F, C.h)], col: GL_COL.lona2, nombre: 'cubo' });
  caras.push({ pts: [L3(0, F, C.h), L3(300, F, C.h), L3(300, y1, C.h), L3(0, y1, C.h)], col: '#f7f8fc', nombre: 'cubo' });
  // ventana
  const pend = P[1][0] / P[1][1], xf = pend * V.zt - V.sale, zb = g.vent.zb, ya = V.yc - V.ancho / 2, yb = V.yc + V.ancho / 2;
  caras.push({ pts: [L3(xf, ya, zb), L3(xf, yb, zb), L3(xf, yb, V.zt), L3(xf, ya, V.zt)], col: '#f7f8fc', nombre: 'vent' });
  caras.push({ pts: [L3(xf, ya, zb), L3(xf, ya, V.zt), L3(pend * V.zt, ya, V.zt)], col: GL_COL.lona2, nombre: 'vent' });
  caras.push({ pts: [L3(xf, yb, zb), L3(xf, yb, V.zt), L3(pend * V.zt, yb, V.zt)], col: GL_COL.lona2, nombre: 'vent' });
  caras.push({ pts: [L3(xf, ya, V.zt), L3(xf, yb, V.zt), L3(pend * V.zt, yb, V.zt), L3(pend * V.zt, ya, V.zt)], col: '#f7f8fc', nombre: 'vent' });
  caras.push({ pts: [L3(xf - .5, V.yc - 50, V.zt - 110), L3(xf - .5, V.yc + 50, V.zt - 110), L3(xf - .5, V.yc + 50, V.zt - 10), L3(xf - .5, V.yc - 50, V.zt - 10)], col: '#47627a', nombre: 'vidrio' });
  return caras;
}
function gl3D(g, a, o = {}) {
  const P0 = GL.PERFIL, extra = [];
  for (let i = 0; i < P0.length - 1; i++) extra.push({ linea: true, pts: [[P0[i][0], 0, P0[i][1]], [P0[i + 1][0], 0, P0[i + 1][1]]], col: GL_COL.madera, w: 7 });
  if (o.cremalleras !== false) g.crem.forEach(c => extra.push({ linea: true, pts: [[c.x, GL.VUELO - 1, 0], [c.x, GL.VUELO - 1, c.z - 3]], col: '#14181b', w: 2.5 }));
  const k = 1, caras = [...glModelo(g, o), ...extra].map(c => { const pp = c.pts.map(p => glProy(p, a, k)); return { ...c, pp, z: pp.reduce((s, p) => s + p[2], 0) / pp.length + (c.linea ? 2 : 0) }; });
  // normal hacia la cámara: se dibujan de atrás hacia adelante
  caras.sort((A, B) => A.z - B.z);   // lo de abajo en pantalla está más cerca: se dibuja de último
  const todos = caras.flatMap(c => c.pp), x0 = Math.min(...todos.map(p => p[0])) - 40, x1 = Math.max(...todos.map(p => p[0])) + 40;
  const y0 = Math.min(...todos.map(p => p[1])) - 40, y1 = Math.max(...todos.map(p => p[1])) + 50;
  let s = `<svg viewBox="${x0.toFixed(0)} ${y0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}" role="img" aria-label="Glamping en 3D">${FL}`;
  // piso de madera
  const piso = [[-60, -40, 0], [360, -40, 0], [360, 420, 0], [-60, 420, 0]].map(p => glProy(p, a, k));
  s += `<polygon points="${piso.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="#d9c3a5" stroke="#b08d64"/>`;
  caras.forEach(c => {
    if (c.linea) { s += `<line x1="${c.pp[0][0].toFixed(1)}" y1="${c.pp[0][1].toFixed(1)}" x2="${c.pp[1][0].toFixed(1)}" y2="${c.pp[1][1].toFixed(1)}" stroke="${c.col}" stroke-width="${c.w}" stroke-linecap="round"/>`; return; }
    const dim = o.resalta && c.nombre !== o.resalta && c.nombre !== 'vidrio' ? ' opacity=".35"' : '';
    s += `<polygon points="${c.pp.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${o.resalta && c.nombre === o.resalta ? '#f6d0d2' : c.col}" stroke="#2b3238" stroke-width="1.6" stroke-linejoin="round"${dim}/>`;
  });
  (o.textos || []).forEach(([p3, t, col]) => { const p = glProy(p3, a, k); s += `<text x="${p[0].toFixed(1)}" y="${p[1].toFixed(1)}" font-size="22" text-anchor="middle" fill="${col || GL_COL.rojo}" stroke="#fff" stroke-width="5" paint-order="stroke">${t}</text>`; });
  return s + '</svg>';
}

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
    if (o.partes === 2) s += glAp(2, glT(X(150), Y(0) + 34, '+ 5 de dobladillo abajo', { fs: 18, col: GL_COL.rojo }) + glT(X(30), Y(200), `+ ${n1(GL.SELLE / 2)}`, { fs: 18, col: GL_COL.rojo, ta: 'end' }) + glT(X(292), Y(150), `+ ${n1(GL.SELLE / 2)}`, { fs: 18, col: GL_COL.rojo, ta: 'start' }));
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

// El rollo de 2 m, fila por fila, con lo que sale de cada pedazo
function glRollo(g) {
  const R = GL.ROLLO, fh = R + 30, Lmax = Math.max(...g.filas.map(f => f.len)), W = Lmax + 190, H = g.filas.length * fh + 10;
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H}" role="img" aria-label="Cómo sale del rollo">`;
  let acum = 0;
  const pz = (x, y, w, h, t, col = GL_COL.pieza, fs = 22) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}" stroke="${GL_COL.piezaB}" stroke-width="2"/>${t ? glT(x + w / 2, y + h / 2 + 8, t, { fs }) : ''}`;
  g.filas.forEach((f, i) => {
    const y0 = 6 + i * fh; acum += f.len;
    let r = `<rect x="0" y="${y0}" width="${f.len}" height="${R}" fill="#f4f6fb" stroke="#b9c1de"/>`;
    if (i === 0) r += pz(0, y0, f.len, R, 'TECHO, franja 1', GL_COL.pieza, 30);
    else if (i === 1) {
      const so = f.sobra, t = g.cubo.tapa;
      r += pz(0, y0 + so, f.len, R - so, 'TECHO, franja 2', GL_COL.pieza, 30);
      // el sobrante (136,5 de ancho) alcanza para todas las piezas chicas
      const M = GL.SELLE / 2, tri = g.cubo.tri, v = g.vent, tw = tri.base + 2 * M, th = tri.alto + 2 * M;
      const tcw = v.techito.ancho + 2 * M, tch = v.techito.largo + 2 * M, vc = v.cara.ancho + 2 * M;
      r += pz(0, y0, t.largo, t.ancho, 'tapa del cubo', GL_COL.sobra, 18);
      r += pz(t.largo, y0, tw, th, 'triángulo atrás', GL_COL.sobra, 15);
      r += pz(t.largo + tw, y0, tcw, tch, 'techito', GL_COL.sobra, 15);
      r += pz(t.largo + tw + tcw, y0, vc, vc, 'cara ventana', GL_COL.sobra, 15);
      r += pz(0, y0 + t.ancho, v.costado.alto + 2 * M, v.costado.arriba + 2 * M, '2 costados', GL_COL.sobra, 15);
      r += pz(v.costado.alto + 2 * M, y0 + t.ancho, 276, 16, '', GL_COL.sobra) + glT(v.costado.alto + 2 * M + 138, y0 + t.ancho + 13, 'tiras de 4 cm', { fs: 13 });
    } else if (f.nombre === 'Frente, abajo') r += `<polygon points="${glPts(g.abajo.poly, x => x + GL.SELLE, z => y0 + R - GL.DOB - z)}" fill="${GL_COL.pieza}" stroke="${GL_COL.piezaB}" stroke-width="2"/>` + glT(f.len / 2, y0 + R / 2 + 8, 'FRENTE, abajo', { fs: 26 });
    else if (f.nombre === 'Frente, arriba') r += `<polygon points="${glPts(g.arriba.poly.map(([x, z]) => [z - (g.zJ - GL.SELLE / 2), x - g.arriba.ai]), x => x + GL.SELLE / 2, z => y0 + GL.SELLE + z)}" fill="${GL_COL.pieza}" stroke="${GL_COL.piezaB}" stroke-width="2"/>` + glT(f.len / 2 + 20, y0 + R - 20, 'FRENTE, arriba', { fs: 20 });
    else if (f.cubo !== undefined) {
      const c = g.cubo.banda, usa = f.cubo === c.franjas - 1 ? c.ultima : R;
      r += pz(0, y0, f.len, usa, `CUBO, franja ${f.cubo + 1}`, GL_COL.pieza, 24);
      if (f.cubo === c.franjas - 1) {
        const ch = g.cubo.chica, gr = g.cubo.grande, y1 = y0 + usa + 4;
        r += `<polygon points="${0},${y1} ${f.len},${y1} ${0},${y1 + gr.arriba + 7}" fill="${GL_COL.sobra}" stroke="${GL_COL.piezaB}" stroke-width="2"/>` + glT(70, y1 + 30, 'esquina grande', { fs: 15, ta: 'start' });
        r += `<polygon points="${f.len},${y1 + gr.arriba + 10} ${0},${y1 + gr.arriba + 10} ${f.len},${y1 + gr.arriba + 10 + ch.arriba + 7}" fill="${GL_COL.sobra}" stroke="${GL_COL.piezaB}" stroke-width="2"/>` + glT(f.len - 60, y1 + gr.arriba + 32, 'esquina chica', { fs: 15, ta: 'end' });
      }
    } else {
      const c = g.vent.cara, x0 = GL.SELLE, yb = y0 + GL.SELLE;
      r += `<polygon points="${glPts([[0, 0], [0, c.ancho], [c.alto, c.ancho], [c.alto, 0]], x => x0 + x, y => yb + y)}" fill="${GL_COL.pieza}" stroke="${GL_COL.piezaB}" stroke-width="2"/>` + `<rect x="${x0 + 10}" y="${yb + 10}" width="100" height="100" fill="#47627a" opacity=".7"/>` + glT(x0 + 60, yb + c.ancho + 40, 'cara de la ventana', { fs: 18 });
    }
    r += glT(f.len + 16, y0 + R / 2 + 14, `${n1(acum / 100)} m`, { fs: 40, ta: 'start' });
    s += glAp(i * .35, r);
  });
  return s + '</svg>';
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
    s += glT(X(150), Y(0) + 34, `de suelo a suelo: ${n0(g.suelo)} + 5 + 5 = ${n0(g.techo.largo)}`, { fs: 19 });
  }
  return s + '</svg>';
}

// =================== las láminas ===================
const GL_ESC = {
  inicio: g => ({ titulo: 'El glamping', cuadros: [
    { t: 'Así queda: <b>todo en lona</b>.', anim: { dur: 5000, f: u => gl3D(g, -0.7 + u * 1.4) } },
    { t: `Frente: <b>300</b> de base, pico de <b>300</b>, esquina pequeña de <b>250</b>.`, svg: () => glCara(g, { medidas: true }) },
    { t: `Largo total <b>310</b>: la carpa <b>250</b> (con <b>50</b> de escalera) + el cubo <b>60</b>.`, svg: () => gl3D(g, 0.75, { textos: [[[300, 125, -22], '250 carpa'], [[300, 25, 40], '50 escalera'], [[300, 280, -22], '60 cubo']] }) },
    { t: `Ventana de <b>100 × 100</b> que sale <b>50</b> arriba.`, svg: () => gl3D(g, -0.9, { resalta: 'vent' }) },
    { t: `Atrás, un cubo de <b>300 × 250</b> que sale <b>60</b>.`, svg: () => gl3D(g, 2.7, { resalta: 'cubo' }) },
  ] }),
  lona: g => ({ titulo: 'Lona', arriba: `<div class="total"><span class="etq">Compra más o menos</span><b>${n0(Math.ceil(g.total / 100))} m</b><span>de rollo de 2 m (ya con 10 % de desperdicio)</span></div>`, cuadros: [
    { t: `Así sale del rollo de <b>2 m</b>, pedazo por pedazo.`, svg: () => glRollo(g), alto: true },
    { t: `Lo <b>rosado</b> sale de lo que sobra del techo.`, svg: () => glRollo(g), alto: true },
  ] }),
  techo: g => ({ titulo: 'Techo', cuadros: [
    { t: `La lona va de un suelo al otro <b>pasando por encima del pico</b>.`, anim: { dur: 3000, f: u => glPerfilTecho(g, u) } },
    { t: `Corta <b>2 franjas</b> de <b>${n0(g.techo.largo)}</b> de largo.`, svg: () => glMesa([[0, 0], [g.techo.largo, 0], [g.techo.largo, 200], [0, 200]], { titulo: 'Franja del techo', m: 70, fs: 40, cotas: [[[0, 0], [g.techo.largo, 0], n0(g.techo.largo), -40], [[0, 0], [0, 200], '200', 40]] }) },
    { t: `Sella las dos por el largo: <b>${n1(GL.SELLE)}</b> de selle. Quedan <b>${n1(g.techo.juntas)}</b> de ancho.`, svg: () => glMesa([[0, 0], [g.techo.largo, 0], [g.techo.largo, g.techo.juntas], [0, g.techo.juntas]], { m: 70, fs: 40, cotas: [[[0, 0], [0, g.techo.juntas], n1(g.techo.juntas), 40]], textos: [[[g.techo.largo / 2, 200 - GL.SELLE / 2 + 12], 'selle', GL_COL.rojo]] }) },
    { t: `Mide <b>${n0(g.techo.ancho)}</b> (${GL.FONDO} + 5 + 5) y corta. Sobran <b>${n1(g.techo.sobra)}</b>: no los botes.`, svg: () => glMesa([[0, 0], [g.techo.largo, 0], [g.techo.largo, g.techo.juntas], [0, g.techo.juntas]], { m: 70, fs: 40, lineas: [[0, g.techo.ancho, g.techo.largo, g.techo.ancho]], cotas: [[[0, 0], [0, g.techo.ancho], n0(g.techo.ancho), 40], [[g.techo.largo, g.techo.ancho], [g.techo.largo, g.techo.juntas], n1(g.techo.sobra), -40, GL_COL.rojo]], textos: [[[g.techo.largo / 2, g.techo.ancho + g.techo.sobra / 2], 'sobrante: tapa del cubo, ventana, tiras, triángulo', GL_COL.rojo]] }) },
    { t: `Arriba se <b>abre un hueco</b> para la ventana (lo ves en el paso Ventana).`, svg: () => gl3D(g, -0.9, { resalta: 'vent' }) },
  ] }),
  frente: g => {
    const ab = g.abajo, ar = g.arriba, zJ = g.zJ, [li, ld] = glAncho(zJ + GL.SELLE / 2);
    return { titulo: 'Frente', cuadros: [
      { t: `El frente es más alto que el rollo: va en <b>2 piezas</b>.`, svg: () => glCara(g, { partes: 1 }) },
      { t: `Pieza de <b>abajo</b>: base <b>300</b>. A <b>${n1(zJ + GL.SELLE / 2)}</b> de alto mide desde la esquina izquierda.`, svg: () => glMesa(ab.poly, { titulo: 'Frente abajo', fs: 22, cotas: [[[0, 0], [300, 0], '300', -30]], puntos: [[[li, zJ + GL.SELLE / 2], n0(li)], [[ld, zJ + GL.SELLE / 2], n0(ld)]], textos: [[[150, 60], `${n1(zJ + GL.SELLE / 2)} de alto`]] }) },
      { t: `Pieza de <b>arriba</b>: base <b>${n1(ar.base)}</b>. Marca el pico y la esquina desde su punta izquierda.`, svg: () => glMesa(ar.poly.map(([x, z]) => [x - ar.ai, z - (zJ - GL.SELLE / 2)]), { titulo: 'Frente arriba', fs: 18, m: 50, cotas: [[[0, 0], [ar.base, 0], n1(ar.base), -26]], puntos: [[ar.pico, `${n1(ar.pico[0])} → ${n1(ar.pico[1])} alto`], [ar.esq, `${n1(ar.esq[0])} → ${n1(ar.esq[1])}`]] }) },
      { t: `Súmale <b>${n1(GL.SELLE / 2)}</b> de selle en los lados y arriba, y <b>5</b> de dobladillo abajo.`, svg: () => glCara(g, { partes: 2 }) },
    ] };
  },
  puerta: g => ({ titulo: 'Puerta', cuadros: [
    { t: `Dos cremalleras <b>rectas</b>, a <b>100</b> y a <b>200</b> de la esquina izquierda.`, svg: () => glCara(g, { crem: 1 }) },
    { t: `Cada una va pegada a una <b>tira de 4 cm</b> sellada al frente.`, svg: () => glCara(g, { tiras: true }) },
    { t: `Ya sellada, <b>corta la lona</b> por la mitad de cada cremallera.`, svg: () => glCara(g, { crem: 2 }) },
    { t: `Para entrar: abre de abajo hacia arriba, <b>enrolla</b> y amarra con <b>2 correas</b>.`, anim: { dur: 3500, f: u => glCara(g, { abre: u }) } },
  ] }),
  ventana: g => {
    const v = g.vent;
    return { titulo: 'Ventana', cuadros: [
      { t: `En el lado largo, la ventana sale <b>${GL.VENT.sale}</b> arriba y toca el techo abajo.`, svg: () => gl3D(g, -1.2, { resalta: 'vent' }) },
      { t: `Cara: <b>${v.cara.ancho}</b> de ancho y <b>${n0(v.cara.alto)}</b> de alto. El vidrio es de <b>100 × 100</b>.`, svg: () => glMesa([[0, 0], [v.cara.ancho, 0], [v.cara.ancho, v.cara.alto], [0, v.cara.alto]], { fs: 18, m: 50, cotas: [[[0, 0], [v.cara.ancho, 0], n0(v.cara.ancho), -24], [[v.cara.ancho, 0], [v.cara.ancho, v.cara.alto], n0(v.cara.alto), -24]], textos: [[[v.cara.ancho / 2, v.cara.alto / 2], 'vidrio 100 × 100', '#47627a']] }) },
      { t: `<b>2 costados</b>: triángulos de <b>${v.costado.arriba}</b> arriba por <b>${n0(v.costado.alto)}</b> de alto.`, svg: () => glMesa([[0, 0], [0, v.costado.alto], [v.costado.arriba, v.costado.alto]], { fs: 18, m: 50, cotas: [[[0, v.costado.alto], [v.costado.arriba, v.costado.alto], String(v.costado.arriba), 24], [[0, 0], [0, v.costado.alto], n0(v.costado.alto), 30]] }) },
      { t: `<b>1 techito plano</b> de <b>${v.techito.ancho} × ${v.techito.largo}</b>, sin punta.`, svg: () => glMesa([[0, 0], [v.techito.ancho, 0], [v.techito.ancho, v.techito.largo], [0, v.techito.largo]], { fs: 18, m: 50, cotas: [[[0, 0], [v.techito.ancho, 0], n0(v.techito.ancho), -24], [[v.techito.ancho, 0], [v.techito.ancho, v.techito.largo], n0(v.techito.largo), -26]] }) },
      { t: `En el techo, abre un hueco de <b>${v.hueco.ancho} × ${n0(v.hueco.largo)}</b> y sella todo alrededor.`, svg: () => glMesa([[0, 0], [v.hueco.ancho, 0], [v.hueco.ancho, v.hueco.largo], [0, v.hueco.largo]], { fs: 18, m: 50, cotas: [[[0, 0], [v.hueco.ancho, 0], n0(v.hueco.ancho), -24], [[v.hueco.ancho, 0], [v.hueco.ancho, v.hueco.largo], n0(v.hueco.largo), -26]], textos: [[[v.hueco.ancho / 2, v.hueco.largo / 2], 'hueco', GL_COL.rojo]] }) },
    ] };
  },
  cubo: g => {
    const c = g.cubo, b = c.banda, CU = GL.CUBO;
    return { titulo: 'Cubo de atrás', cuadros: [
      { t: `Atrás va un cubo de <b>300</b> de ancho, <b>250</b> de alto y <b>60</b> de fondo.`, svg: () => gl3D(g, 2.7, { resalta: 'cubo' }) },
      { t: `Los 2 lados y el fondo son <b>una sola banda</b> de <b>${n0(b.ancho)} × ${n1(b.alto)}</b>, hecha con <b>${b.franjas} franjas</b>.`, svg: () => glMesa([[0, 0], [b.ancho, 0], [b.ancho, b.alto], [0, b.alto]], { fs: 26, m: 60, lineas: [[GL.SELLE / 2 + CU.d, 0, GL.SELLE / 2 + CU.d, b.alto], [GL.SELLE / 2 + CU.d + CU.w, 0, GL.SELLE / 2 + CU.d + CU.w, b.alto]], cotas: [[[0, 0], [b.ancho, 0], n0(b.ancho), -34], [[b.ancho, 0], [b.ancho, b.alto], n1(b.alto), -34]], textos: [[[CU.d / 2, b.alto / 2], 'lado'], [[CU.d + CU.w / 2, b.alto / 2], 'fondo'], [[CU.d * 1.5 + CU.w, b.alto / 2], 'lado']] }) },
      { t: `La <b>tapa</b>: <b>${n0(c.tapa.largo)} × ${n0(c.tapa.ancho)}</b>, del sobrante del techo.`, svg: () => glMesa([[0, 0], [c.tapa.largo, 0], [c.tapa.largo, c.tapa.ancho], [0, c.tapa.ancho]], { fs: 22, m: 50, cotas: [[[0, 0], [c.tapa.largo, 0], n0(c.tapa.largo), -26], [[c.tapa.largo, 0], [c.tapa.largo, c.tapa.ancho], n0(c.tapa.ancho), -30]] }) },
      { t: `Visto desde atrás, el cubo es más ancho que la carpa: cierra <b>2 esquinas</b> (rojo).`, svg: () => glEsquinas(g) },
      { t: `Arriba del cubo, la pared de atrás: un <b>triángulo</b> de <b>${n1(c.tri.base)}</b> de base y <b>${n0(c.tri.alto)}</b> de alto.`, svg: () => glMesa([[0, 0], [c.tri.base, 0], [c.tri.pico, c.tri.alto]], { fs: 18, m: 50, cotas: [[[0, 0], [c.tri.base, 0], n1(c.tri.base), -24]], puntos: [[[c.tri.pico, c.tri.alto], `${n1(c.tri.pico)} → ${n0(c.tri.alto)}`]] }) },
    ] };
  },
  final: g => ({ titulo: 'Listo', cuadros: [
    { t: `Así queda armado. Compra <b>${n0(Math.ceil(g.total / 100))} m</b> de lona y <b>2 cremalleras</b> de <b>${n0(Math.ceil((g.crem[0].z + 10) / 10) * 10)}</b> y <b>${n0(Math.ceil((g.crem[1].z + 10) / 10) * 10)}</b>.`, anim: { dur: 6000, f: u => gl3D(g, 0.6 - u * 6.28) } },
  ], abajo: `<button class="cta verde" id="glCompartir">Enviar medidas por WhatsApp</button>` }),
};
const GL_PASOS = [['inicio', 'El glamping'], ['lona', 'Lona'], ['techo', 'Techo'], ['frente', 'Frente'], ['puerta', 'Puerta'], ['ventana', 'Ventana'], ['cubo', 'Cubo'], ['final', 'Listo']];

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
  $('#pillCarpa').textContent = 'Glamping 3 × 3,10';
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
    </div>${esc.abajo || ''}`;
  $('#glAtras').hidden = i === 0;
  $('#glSig').hidden = i === GL_PASOS.length - 1;
  $('#glSig').textContent = `Siguiente: ${GL_PASOS[i + 1] ? GL_PASOS[i + 1][1] : ''} →`;
  const chip = $('#glPasos [aria-current]'); if (chip) chip.scrollIntoView({ block: 'nearest', inline: 'center' });
  guardarLS('glamping', i);
  GL.juega = true;
  glCuadro(0);
}
function glTexto(g) {
  const c = g.cubo, v = g.vent;
  let t = `*GLAMPING 3 × 3,10* (rollo de 2 m, selle ${n1(GL.SELLE)}, dobladillo ${GL.DOB})\n`;
  t += `\n*Techo:* 2 franjas de ${n0(g.techo.largo)}, selladas por el largo y cortadas a ${n0(g.techo.ancho)} (sobran ${n1(g.techo.sobra)})\n`;
  t += `\n*Frente* (desde la esquina izquierda): base 300 · pico a 125 → 300 alto · esquina pequeña a 265 → 250 alto\n   Abajo: ${n0(g.abajo.largo)} × 200 · Arriba: base ${n1(g.arriba.base)}, pico ${n1(g.arriba.pico[0])} → ${n1(g.arriba.pico[1])}, esquina ${n1(g.arriba.esq[0])} → ${n1(g.arriba.esq[1])}\n`;
  t += `\n*Puerta:* cremalleras rectas a 100 y 200 (${n0(g.crem[0].z)} y ${n0(g.crem[1].z)} de largo), tiras de 4 cm, 2 correas\n`;
  t += `\n*Ventana* (sale ${GL.VENT.sale} arriba, techito plano): cara ${v.cara.ancho} × ${n0(v.cara.alto)}, vidrio 100 × 100 · 2 costados ${v.costado.arriba} × ${n0(v.costado.alto)} · techito ${v.techito.ancho} × ${v.techito.largo} · hueco en el techo ${v.hueco.ancho} × ${n0(v.hueco.largo)}\n`;
  t += `\n*Cubo:* banda ${n0(c.banda.ancho)} × ${n1(c.banda.alto)} (${c.banda.franjas} franjas) · tapa ${n0(c.tapa.largo)} × ${n0(c.tapa.ancho)} · esquinas ${n0(c.chica.arriba)} y ${n0(c.grande.arriba)} × 250 · triángulo de atrás ${n1(c.tri.base)} × ${n0(c.tri.alto)}\n`;
  t += `\n*Lona:* ≈ ${n0(Math.ceil(g.total / 100))} m de rollo de 2 m`;
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
