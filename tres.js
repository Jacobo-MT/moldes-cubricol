'use strict';
// =================== Plegable de 3 puntas (6 × fondo) ===================
// 19-nov-2026. Todo en cm. Medidas de la estructura que dio Andrés (la de muestra mide 594 × 300):
//   · 2 módulos de 300 a lo largo; 3 tubos de pico en la línea del centro del fondo, a 150, 300 y 450.
//   · Tubo de pico: 143,5 desde abajo de la cruceta donde va puesto hasta la punta. Los 3 son iguales.
//   · De cada punta a cada esquina: 245 (medido en la 6 × 3).  · De la punta al piso: 335.
// De ahí: la punta sube H = √(245² − 150² − 150²) = 122,6 sobre la esquina de la gola
// (el centro de las crucetas queda 143,5 − 122,6 ≈ 21 más abajo que la esquina).
// Al cambiar el fondo, el tubo del pico NO cambia (dato de Andrés): H se queda igual.
// El techo son 4 piezas, como cualquier carpa: 2 lados de 6 m (4 esquinas: cubren las 3 puntas,
// arriba se sellan entre sí en línea recta de punta a punta) y 2 culatas (triángulos).
// 19-nov (corrección de Andrés): en el molde, la recta de la esquina de la gola a la punta mide EXACTO
// la arista de la estructura (245 en la 6 × 3), en las dos piezas; nada de holgura extra.
// La curva es la de la 3 × 3 que quedó bien: se hunde 13,5 a 85,5 de la punta (en la 6 × 3 tal cual;
// en otras medidas, en proporción al largo de la arista). Entre puntas la lona se comba sola: se corta recto.
const TP_DEF = { L: 600, F: 300, rollo: 153, pataL: 212, pataA: 40, pataB: 14, patas: 4 };
const TP = {
  L: 600, REAL: 594, POSTE: 143.5, ARISTA: 245, ALTO: 335,
  H: Math.sqrt(245 ** 2 - 150 ** 2 - 150 ** 2),
  HUNDE: 13.5, HUNDE_A: 85.5,   // curva de la 3 × 3: lo más hondo y a cuánto de la punta
  RAPIDAS: [[600, 200], [600, 300], [600, 400], [600, 500], [600, 600]],
  MIN: 100, MAX: 600, err: '',
  m: { ...TP_DEF, ...leerLS('tresP', {}) },
  f: 0, juega: false, timer: 0, raf: 0, paso: leerLS('tresPaso', 0), esc: null, g: null,
  puntos: leerLS('tresPuntos', null), d: 85.5, lado: 0, arrastra: false,
};
const nm = v => (v / 100).toLocaleString('es-CO', { maximumFractionDigits: 2 });   // metros con centímetros: 3,14
const TP_COL = { largo: '#9cc0ef', culata: '#a6dcae', pata: '#f6c48f', lona: '#eef1fb', sella: '#d9232a', mesa: '#e8dcc4', tubo: '#8d969d', curva: '#2f56c8' };

// ---------- cálculos ----------
function tpCalcular() {
  const m = TP.m, s = st.aj.selle, G = st.aj.gola, F = m.F, H = TP.H, L = m.L;
  const hipGeo = Math.sqrt(H * H + (L / 4) ** 2 + (F / 2) ** 2);
  const hip = hipGeo;                            // la recta del molde = la arista de la estructura (245 en la 6 × 3)
  const sag = TP.HUNDE * hip / TP.ARISTA;
  const largo = tpLado('largo', `Lado de ${nm(L)} m`, L, L / 2, hip, sag, G, s, m.rollo);
  const culata = tpLado('culata', `Culata (lado de ${nm(F)} m)`, F, 0, hip, sag, G, s, m.rollo);
  const g = { m, s, G, F, H, L, q: L / 4, hipGeo, hip, sag, lados: [largo, culata], patasMedio: F >= 500 };
  // piezas numeradas: cada franja de cada lado, y las patas
  let n = 1;
  g.piezas = [];
  g.lados.forEach(l => l.franjas.forEach(fr => { fr.n = n++; fr.col = TP_COL[l.id]; fr.cant = 2; fr.lado = l; g.piezas.push(fr); }));
  g.pata = { n: n++, nombre: 'Pata', col: TP_COL.pata, cant: m.patas, tipo: 'pata' };
  g.piezas.push(g.pata);
  g.ac = tpAcomodar(g);
  return g;
}

// Un lado: abajo la gola (rectángulo), encima el trapecio (o triángulo) hasta la punta.
// y = desde el borde de abajo de la gola. Cortado en franjas del ancho del rollo, montadas el selle.
function tpLado(id, nombre, base, top, hip, sag, G, s, R) {
  const Wb = base / 2 + s / 2, Wt = top > 0 ? top / 2 + s / 2 : 0;
  const off = Wb - Wt, S = Math.sqrt(hip * hip - off * off);   // así la recta esquina de la gola → punta mide justo la arista
  const yT = G + S, Ht = yT + (top > 0 ? s / 2 : 0);          // los lados de 6 m llevan medio selle arriba (se sellan entre sí)
  const pend = (Wt - Wb) / S;
  const half = y => y <= G ? Wb : Wb + pend * (y - G);       // recto: así se corta y se sella; la curva se marca después
  const Lc = Math.hypot(Wb - Wt, S);                          // = hip
  const u0 = TP.HUNDE_A / TP.ARISTA, beta = (1 - u0) / u0;   // lo más hondo a 85,5 de 245, como la 3 × 3
  const A = sag / (u0 * Math.pow(1 - u0, beta));
  const prof = u => A * u * Math.pow(1 - u, beta);
  const enRecta = d => {                                      // d desde la punta, por la recta punta → esquina de la gola
    const u = Math.min(1, Math.max(0, d / Lc)), f = prof(u);
    const Q = [Wt + u * (Wb - Wt), yT - u * S], nx = S / Lc, ny = (Wb - Wt) / Lc;
    return { f, Q, P: [Q[0] - f * nx, Q[1] - f * ny] };
  };
  const franjas = [];
  let y0 = 0;
  for (;;) {
    const y1 = Math.min(y0 + R, Ht);
    franjas.push({ y0, y1 });
    if (y1 >= Ht - 1e-6) break;
    y0 = y1 - s;
  }
  franjas.forEach((fr, i) => {
    const ult = i === franjas.length - 1;
    fr.alto = fr.y1 - fr.y0; fr.abajo = 2 * half(fr.y0); fr.arriba = ult && top === 0 ? 0 : 2 * half(fr.y1);
    fr.conGola = fr.y0 < G; fr.ult = ult; fr.idx = i;
    fr.nombre = franjas.length === 1 ? nombre : i === 0 ? 'franja con gola' : ult ? (top > 0 ? 'parte de arriba' : 'punta') : 'franja ' + (i + 1);
    fr.titulo = `${nombre}: ${fr.nombre}`;
  });
  return { id, nombre, base, top, off, S, Wb, Wt, yT, Ht, G, half, Lc, prof, enRecta, franjas };
}

// Forma de una franja como polígono [x, y] (y desde abajo de la franja), recta.
function tpForma(fr) {
  const l = fr.lado, ys = [fr.y0];
  if (l.G > fr.y0 && l.G < fr.y1) ys.push(l.G);
  ys.push(fr.y1);
  const pts = ys.map(y => [l.half(y), y - fr.y0]);
  if (fr.ult && l.top === 0) pts[pts.length - 1] = [0, fr.alto];
  return [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y]).filter(([x], i) => !(i === 0 && x === 0))];
}
const tpPata = g => { const m = g.m; return [[0, 0], [m.pataL, 0], [m.pataL, m.pataB], [0, m.pataA]]; };

// Acomodo en el rollo: cada franja 2 veces, una al derecho y otra al revés para encajarlas.
// Las patas van en la tira que sobra arriba de las franjas bajitas.
function tpAcomodar(g) {
  const R = g.m.rollo, GAP = 2, items = [], patas = [];
  let x = 0, pend = g.m.patas;
  const parAlto = g.m.pataA + g.m.pataB;
  g.lados.forEach(l => l.franjas.forEach(fr => {
    const h = fr.alto, hf = t => (fr.ult && l.top === 0 && t >= h - 1e-6) ? 0 : l.half(fr.y0 + t);
    let shift = 0, maxH = 0;
    for (let i = 0; i <= 200; i++) { const t = h * i / 200; shift = Math.max(shift, hf(t) + hf(h - t)); maxH = Math.max(maxH, hf(t)); }
    shift += GAP;
    const x0 = x;
    for (let k = 0; k < fr.cant; k++) items.push({ fr, cx: x + maxH + k * shift, flip: k % 2 === 1 });
    x += 2 * maxH + (fr.cant - 1) * shift;
    // ¿caben patas encima?
    const libre = R - h - GAP;
    if (pend > 0 && libre >= parAlto) {
      const filas = Math.floor(libre / parAlto), porFila = Math.floor((x - x0 + GAP) / (g.m.pataL + GAP));
      for (let f = 0; f < filas && pend > 0; f++) for (let c = 0; c < porFila && pend > 0; c++) {
        for (let j = 0; j < 2 && pend > 0; j++) { patas.push({ x0: x0 + c * (g.m.pataL + GAP), y0: h + GAP + f * parAlto, flip: j === 1 }); pend--; }
      }
    }
    x += GAP * 4;
  }));
  if (pend > 0) {                                      // las que no cupieron, aparte
    const pares = Math.max(1, Math.floor(R / parAlto)), cols = Math.ceil(Math.ceil(pend / 2) / pares);
    for (let k = 0; pend > 0; k++) {
      const par = Math.floor(k / 2), col = Math.floor(par / pares), fila = par % pares;
      patas.push({ x0: x + col * (g.m.pataL + GAP), y0: fila * parAlto, flip: k % 2 === 1 }); pend--;
    }
    x += cols * (g.m.pataL + GAP);
  }
  const largo = Math.max(...items.map(it => it.cx + it.fr.abajo / 2), ...patas.map(p => p.x0 + g.m.pataL), 0);
  return { items, patas, largo, R, comprar: Math.ceil(largo * 1.08 / 50) / 2 };
}

// ---------- 3D de la carpa ----------
const tpHex = (h, k) => { const n = parseInt(h.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(Math.min(255, v * k))); return `rgb(${c.join(',')})`; };
function tpModelo(g, o = {}) {
  const F = [], L = g.L, q = g.q, P = g.m.pataL, H = g.H, D = g.F, Gv = g.G - st.aj.varilla, Z = P;
  const col = k => o.col ? TP_COL[k] : TP_COL.lona;
  const ex = o.ex || 0;
  const valle = x => (x > q && x < 3 * q) ? 9 * Math.abs(Math.sin(Math.PI * (x - q) / q)) : 0;   // la comba entre puntas (solo dibujo)
  const N = 10, M = 5;
  // lados de 6 m
  [0, 1].forEach(lado => {
    const yb = lado ? D : 0, yt = D / 2, dy = lado ? ex : -ex;
    const pt = (s, t) => { const xb = s * L, xt = q + s * 2 * q, x = xb + (xt - xb) * t; return [x, yb + (yt - yb) * t + dy, Z + H * t - valle(xt) * t * t - 6 * Math.sin(Math.PI * t) * (s < .25 || s > .75 ? 1 : 0.4)]; };
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) F.push({ k: 'largo', pts: [pt(i / N, j / M), pt((i + 1) / N, j / M), pt((i + 1) / N, (j + 1) / M), pt(i / N, (j + 1) / M)], col: col('largo') });
    for (let i = 0; i < N; i++) { const x0 = i * L / N, x1 = (i + 1) * L / N; F.push({ k: 'largo', pts: [[x0, yb + dy, Z], [x1, yb + dy, Z], [x1, yb + dy, Z - Gv], [x0, yb + dy, Z - Gv]], col: col('largo') }); }
  });
  // culatas
  [0, 1].forEach(lado => {
    const xb = lado ? L : 0, xt = lado ? 3 * q : q, dx = lado ? ex : -ex;
    const pt = (s, t) => [xb + (xt - xb) * t + dx, s * D + (D / 2 - s * D) * t, Z + H * t - 6 * Math.sin(Math.PI * t)];
    for (let i = 0; i < 6; i++) for (let j = 0; j < M; j++) F.push({ k: 'culata', pts: [pt(i / 6, j / M), pt((i + 1) / 6, j / M), pt((i + 1) / 6, (j + 1) / M), pt(i / 6, (j + 1) / M)], col: col('culata') });
    F.push({ k: 'culata', pts: [[xb + dx, 0, Z], [xb + dx, D, Z], [xb + dx, D, Z - Gv], [xb + dx, 0, Z - Gv]], col: col('culata') });
  });
  // patas (tubos) y forros de pata en las esquinas
  const tubos = [[0, 0], [L / 2, 0], [L, 0], [0, D], [L / 2, D], [L, D]];
  if (g.patasMedio) tubos.push([0, D / 2], [L, D / 2]);
  const caja = (x0, y0, z0, x1, y1, z1, c, k) => {
    const p = (x, y, z) => [x, y, z];
    [[p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1)], [p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1)],
      [p(x1, y1, z0), p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1)], [p(x0, y1, z0), p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1)]].forEach(q => F.push({ k, pts: q, col: c }));
  };
  tubos.forEach(([x, y]) => caja(x - 2.5, y - 2.5, 0, x + 2.5, y + 2.5, Z, TP_COL.tubo, 'tubo'));
  if (o.patas) {
    const esq = [[0, 0, 1, 1], [L, 0, -1, 1], [L, D, -1, -1], [0, D, 1, -1]].slice(0, Math.min(4, g.m.patas));
    esq.forEach(([x, y, sx, sy]) => {
      const a = g.m.pataA / 2, b = g.m.pataB / 2, zb = Math.max(0, Z - g.m.pataL);
      F.push({ k: 'pata', pts: [[x, y, Z], [x + sx * a, y, Z], [x + sx * b, y, zb], [x, y, zb]], col: o.col ? TP_COL.pata : TP_COL.lona });
      F.push({ k: 'pata', pts: [[x, y, Z], [x, y + sy * a, Z], [x, y + sy * b, zb], [x, y, zb]], col: o.col ? TP_COL.pata : TP_COL.lona });
    });
  }
  return { F, c: [L / 2, D / 2, (Z + H) / 2] };
}
function tp3D(g, a, o = {}) {
  const { F, c } = tpModelo(g, o), e = o.e !== undefined ? o.e : 0.38;
  const ca = Math.cos(a), sa = Math.sin(a), ce = Math.cos(e), se = Math.sin(e);
  const pr = ([x, y, z]) => { const X = x - c[0], Y = y - c[1], Zz = z - c[2]; const x1 = X * ca - Y * sa, y1 = X * sa + Y * ca; return [x1, -(Zz * ce - y1 * se), y1 * ce + Zz * se]; };
  const luz = [-0.45, -0.5, 0.74];
  const el = F.map(f => {
    const P = f.pts.map(pr), W = f.pts, u = [W[1][0] - W[0][0], W[1][1] - W[0][1], W[1][2] - W[0][2]], v = [W[2][0] - W[0][0], W[2][1] - W[0][1], W[2][2] - W[0][2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const ln = Math.hypot(...n) || 1; n = n.map(q => q / ln);
    const k = 0.86 + 0.2 * Math.abs(n[0] * luz[0] + n[1] * luz[1] + n[2] * luz[2]);
    const op = o.solo && !o.solo.includes(f.k) && f.k !== 'tubo' ? .18 : 1;
    return { d: P.reduce((s, p) => s + p[2], 0) / P.length, svg: `<polygon points="${P.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${tpHex(f.col, k)}" ${op < 1 ? `fill-opacity="${op}" stroke-opacity="${op}"` : ''} stroke="#14181b" stroke-width=".5" stroke-linejoin="round"/>` };
  }).sort((A, B) => A.d - B.d);
  // encuadre fijo para que no salte al girar
  const Rh = Math.hypot(g.L / 2, g.F / 2) + 40 + (o.ex || 0), zt = TP.H + g.m.pataL;
  const top = -((zt - c[2]) * ce + Rh * se) - 30, bot = (c[2]) * ce + Rh * se + 20;
  let s = `<svg viewBox="${(-Rh).toFixed(0)} ${top.toFixed(0)} ${(2 * Rh).toFixed(0)} ${(bot - top).toFixed(0)}" role="img" aria-label="La carpa de 3 puntas en 3D">`;
  s += `<ellipse cx="0" cy="${(bot - 30).toFixed(0)}" rx="${(Rh * .8).toFixed(0)}" ry="${(Rh * .12).toFixed(0)}" fill="#14181b" opacity=".07"/>`;
  s += el.map(x => x.svg).join('');
  (o.textos || []).forEach(([p, t, col]) => { const q = pr(p); s += glT(q[0], q[1], t, { fs: 30, col: col || '#14181b' }); });
  return s + '</svg>';
}

// ---------- láminas 2D ----------
// Vista de frente (lado de 6 m) o de lado (culata), con alturas
function tpAlzado(g, vista) {
  const P = g.m.pataL, H = g.H, Gv = g.G - st.aj.varilla, ancho = vista === 'largo' ? g.L : g.F, q = g.q;
  const W = 760, m = 70, sc = Math.min((W - 2 * m - 60) / ancho, 380 / (P + H)), Hh = (P + H) * sc + 120;
  const X = x => m + x * sc, Y = z => Hh - 50 - z * sc;
  let s = `<svg viewBox="0 0 ${W} ${Hh.toFixed(0)}" role="img" aria-label="Vista con alturas">${FL}`;
  s += `<line x1="20" y1="${Y(0)}" x2="${W - 20}" y2="${Y(0)}" stroke="#14181b" stroke-width="2"/>`;
  const piso = vista === 'largo' ? [0, g.L / 2, g.L] : (g.patasMedio ? [0, g.F / 2, g.F] : [0, g.F]);
  piso.forEach(x => { s += `<rect x="${X(x) - 3}" y="${Y(P)}" width="6" height="${P * sc}" fill="${TP_COL.tubo}"/>`; });
  let techo;
  if (vista === 'largo') {
    const pts = [[0, P], [q, P + H]];
    for (let i = 1; i < 40; i++) { const x = q + i * 2 * q / 40; pts.push([x, P + H - 9 * Math.abs(Math.sin(Math.PI * (x - q) / q))]); }
    pts.push([3 * q, P + H], [g.L, P]);
    techo = pts;
    [q, 2 * q, 3 * q].forEach(x => { s += `<line x1="${X(x)}" y1="${Y(P - 21)}" x2="${X(x)}" y2="${Y(P + H)}" stroke="${TP_COL.tubo}" stroke-width="3" stroke-dasharray="6 4"/>`; });
  } else techo = [[0, P], [g.F / 2, P + H], [g.F, P]];
  s += `<polygon points="${techo.map(([x, z]) => X(x).toFixed(1) + ',' + Y(z).toFixed(1)).join(' ')} ${X(ancho)},${Y(P - Gv)} ${X(0)},${Y(P - Gv)}" fill="${vista === 'largo' ? TP_COL.largo : TP_COL.culata}" fill-opacity=".55" stroke="#14181b" stroke-width="2.5" stroke-linejoin="round"/>`;
  s += `<line x1="${X(0)}" y1="${Y(P)}" x2="${X(ancho)}" y2="${Y(P)}" stroke="#14181b" stroke-width="1" stroke-dasharray="4 4"/>`;
  // cotas
  const xd = X(ancho) + 34;
  s += flecha(xd, Y(0), xd, Y(P), '#14181b', 2) + glT(xd + 8, Y(P / 2), n1(P), { fs: 24, ta: 'start' });
  s += flecha(xd, Y(P), xd, Y(P + H), TP_COL.sella, 2) + glT(xd + 8, Y(P + H / 2), n1(H), { fs: 24, ta: 'start', col: TP_COL.sella });
  s += glT(X(ancho / 2), Y(0) + 36, `${n1(ancho)}`, { fs: 26 });
  s += glT(X(vista === 'largo' ? q : g.F / 2), Y(P + H) - 14, `punta a ${n1(P + H)} del piso`, { fs: 22 });
  s += glT(X(ancho / 2), Y(P - Gv / 2) + 8, `gola ${n1(g.G)}`, { fs: 20, col: '#4a545b' });
  return s + '</svg>';
}

// Vista desde arriba: dónde va cada pieza y la estructura que hay que alargar
function tpPlanta(g, modo) {
  const W = 760, m = 60, sc = Math.min((W - 2 * m) / g.L, 480 / g.F), Hh = g.F * sc + 2 * m + 40;
  const L = g.L, q = g.q, X = x => (W - L * sc) / 2 + x * sc, Y = y => m + 20 + y * sc, D = g.F;
  let s = `<svg viewBox="0 0 ${W} ${Hh.toFixed(0)}" role="img" aria-label="La carpa vista desde arriba">${FL}`;
  const pol = (pts, c) => `<polygon points="${pts.map(([x, y]) => X(x).toFixed(1) + ',' + Y(y).toFixed(1)).join(' ')}" fill="${c}" fill-opacity="${modo === 'piezas' ? .7 : .25}" stroke="#14181b" stroke-width="2" stroke-linejoin="round"/>`;
  s += pol([[0, 0], [L, 0], [3 * q, D / 2], [q, D / 2]], TP_COL.largo) + pol([[0, D], [L, D], [3 * q, D / 2], [q, D / 2]], TP_COL.largo);
  s += pol([[0, 0], [q, D / 2], [0, D]], TP_COL.culata) + pol([[L, 0], [3 * q, D / 2], [L, D]], TP_COL.culata);
  [q, 2 * q, 3 * q].forEach(x => { s += `<circle cx="${X(x)}" cy="${Y(D / 2)}" r="9" fill="${TP_COL.sella}" stroke="#14181b" stroke-width="2"/>`; });
  const tubos = [[0, 0], [L / 2, 0], [L, 0], [0, D], [L / 2, D], [L, D]];
  if (g.patasMedio) tubos.push([0, D / 2], [L, D / 2]);
  tubos.forEach(([x, y]) => { s += `<rect x="${X(x) - 7}" y="${Y(y) - 7}" width="14" height="14" fill="#39444b"/>`; });
  if (modo === 'piezas') {
    s += glT(X(L / 2), Y(D / 4) + 9, `lado de ${nm(L)} m`, { fs: 24 }) + glT(X(L / 2), Y(3 * D / 4) + 9, `lado de ${nm(L)} m`, { fs: 24 });
    s += glT(X(q * .37), Y(D / 2) + 8, 'culata', { fs: 20 }) + glT(X(L - q * .37), Y(D / 2) + 8, 'culata', { fs: 20 });
    s += glT(X(L / 2), Y(D / 2) - 16, 'sello recto de punta a punta', { fs: 18, col: TP_COL.sella });
  } else {
    const mod = n1(L / 2), muestra = L === 600 ? ' (hoy 297)' : '';
    s += flecha(X(0), Y(0) - 26, X(L / 2), Y(0) - 26) + glT(X(q), Y(0) - 34, mod + muestra, { fs: 22 });
    s += flecha(X(L / 2), Y(0) - 26, X(L), Y(0) - 26) + glT(X(3 * q), Y(0) - 34, mod + muestra, { fs: 22 });
    s += flecha(X(L) + 26, Y(0), X(L) + 26, Y(D)) + `<text transform="translate(${X(L) + 44} ${Y(D / 2)}) rotate(90)" font-size="22" text-anchor="middle">${n1(D)}</text>`;
    s += glT(X(L / 2), Y(D) + 40, L === 600 ? 'cada módulo +3 → 600 en total' : `2 módulos de ${mod}`, { fs: 22, col: TP_COL.sella });
  }
  return s + '</svg>';
}

// Un lado completo armado, con sus franjas numeradas y la curva de las aristas
function tpLadoSvg(g, l, o = {}) {
  const W = 760, m = 50, sc = Math.min((W - 2 * m) / (2 * l.Wb), 420 / l.Ht), Hh = l.Ht * sc + 2 * m + 30;
  const X = x => W / 2 + x * sc, Y = y => Hh - m - y * sc;
  let s = `<svg viewBox="0 0 ${W} ${Hh.toFixed(0)}" role="img" aria-label="${l.nombre} armado">${FL}`;
  l.franjas.forEach(fr => {
    const pts = tpForma(fr).map(([x, y]) => [x, y + fr.y0]);
    s += `<polygon points="${pts.map(([x, y]) => X(x).toFixed(1) + ',' + Y(y).toFixed(1)).join(' ')}" fill="${fr.col}" fill-opacity="${fr.idx % 2 ? .8 : .5}" stroke="#14181b" stroke-width="2" stroke-linejoin="round"/>`;
  });
  s += `<line x1="${X(-l.Wb)}" y1="${Y(l.G)}" x2="${X(l.Wb)}" y2="${Y(l.G)}" stroke="#14181b" stroke-width="1.2" stroke-dasharray="6 5"/>`;
  l.franjas.slice(0, -1).forEach(fr => {
    const y = fr.y1 - g.s / 2, w = l.half(y);
    s += `<line x1="${X(-w)}" y1="${Y(y)}" x2="${X(w)}" y2="${Y(y)}" stroke="${TP_COL.sella}" stroke-width="4"/>`;
  });
  l.franjas.forEach(fr => {
    const yc = fr.conGola && l.franjas.length > 1 ? (l.G + fr.y1) / 2 : fr.y0 + fr.alto * (l.top ? .5 : .33);
    s += glBola(X(0), Y(yc), fr, 22);
  });
  if (o.curva) {
    [1, -1].forEach(sx => {
      const pts = []; for (let i = 0; i <= 60; i++) { const k = l.enRecta(l.Lc * i / 60); pts.push([sx * k.P[0], k.P[1]]); }
      s += `<line x1="${X(sx * l.Wt)}" y1="${Y(l.yT)}" x2="${X(sx * l.Wb)}" y2="${Y(l.G)}" stroke="#14181b" stroke-width="1.5" stroke-dasharray="7 5"/>`;
      s += `<polyline points="${pts.map(([x, y]) => X(x).toFixed(1) + ',' + Y(y).toFixed(1)).join(' ')}" fill="none" stroke="${TP_COL.curva}" stroke-width="3.5"/>`;
    });
  }
  s += glT(X(0), Y(l.G / 2) + 7, `gola ${n1(l.G)}`, { fs: 20, col: '#4a545b' });
  s += flecha(X(-l.Wb), Y(0) + 22, X(l.Wb), Y(0) + 22) + glT(X(0), Y(0) + 48, n1(2 * l.Wb), { fs: 26 });
  s += flecha(X(l.Wb) + 20, Y(0), X(l.Wb) + 20, Y(l.Ht)) + `<text transform="translate(${X(l.Wb) + 38} ${Y(l.Ht / 2)}) rotate(90)" font-size="24" text-anchor="middle" fill="#14181b">alto ${n1(l.Ht)}</text>`;
  // la arista (la diagonal de la esquina de la gola a la punta), escrita sobre el borde izquierdo
  const ax0 = X(-l.Wb), ay0 = Y(l.G), ax1 = X(-l.Wt), ay1 = Y(l.yT), ang = Math.atan2(ay1 - ay0, ax1 - ax0) * 180 / Math.PI;
  const amx = (ax0 + ax1) / 2, amy = (ay0 + ay1) / 2, nx = (ay1 - ay0), ny = -(ax1 - ax0), nl = Math.hypot(nx, ny) || 1;
  s += `<line x1="${ax0}" y1="${ay0}" x2="${ax1}" y2="${ay1}" stroke="${TP_COL.curva}" stroke-width="5" opacity=".8"/>`;
  s += `<text transform="translate(${(amx + nx / nl * 18).toFixed(1)} ${(amy + ny / nl * 18).toFixed(1)}) rotate(${ang.toFixed(1)})" font-size="22" text-anchor="middle" fill="${TP_COL.curva}" stroke="#fff" stroke-width="4" paint-order="stroke">arista ${n1(l.Lc)}</text>`;
  if (l.top) s += glT(X(0), Y(l.Ht) - 12, `${n1(2 * l.half(l.Ht))} arriba (se sella con el otro lado largo)`, { fs: 20 });
  else s += glT(X(0), Y(l.Ht) - 12, 'punta', { fs: 22 });
  return s + '</svg>';
}

// Ficha de corte de una franja
function tpFicha(g, fr) {
  const l = fr.lado, poly = tpForma(fr), wMax = fr.abajo / 2;
  const W = 680, cab = 96, mx = 70, mt = 60, mb = 90;
  const s = Math.min((W - 2 * mx) / fr.abajo, 360 / fr.alto), ph = fr.alto * s, H = cab + mt + ph + mb + 40;
  const X = x => W / 2 + x * s, Y = y => cab + mt + ph - y * s;
  let r = `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" role="img" aria-label="Pieza ${fr.n}">${FL}`;
  r += `<rect x="2" y="${cab - 8}" width="${W - 4}" height="${(H - cab + 4).toFixed(0)}" rx="12" fill="${TP_COL.mesa}"/>`;
  r += glBola(46, 50, fr, 34) + glT(92, 44, l.nombre, { fs: 28, ta: 'start' });
  r += glT(92, 76, `<tspan fill="${TP_COL.sella}">corta 2</tspan> · ${fr.nombre}`, { fs: 20, ta: 'start', col: '#4a545b' });
  r += glAp(.1, `<polygon points="${poly.map(([x, y]) => X(x).toFixed(1) + ',' + Y(y).toFixed(1)).join(' ')}" fill="${fr.col}" stroke="#14181b" stroke-width="3" stroke-linejoin="round"/>`);
  if (fr.conGola) {
    const yg = l.G - fr.y0;
    r += glAp(.4, `<line x1="${X(-wMax)}" y1="${Y(yg)}" x2="${X(wMax)}" y2="${Y(yg)}" stroke="#14181b" stroke-width="1.5" stroke-dasharray="8 5"/>` + glT(X(0), Y(yg / 2) + 7, `gola ${n1(l.G)} (con ${n1(st.aj.varilla)} de varilla)`, { fs: 18, col: '#14181b' }));
  }
  // selle con la franja de arriba / con el otro lado
  if (!fr.ult || l.top) {
    const bh = (fr.ult ? g.s / 2 : g.s) * s, wt = fr.arriba / 2;
    r += glAp(.7, `<rect x="${X(-wt)}" y="${Y(fr.alto)}" width="${2 * wt * s}" height="${Math.max(3, bh)}" fill="${TP_COL.sella}" fill-opacity=".55"/>`);
    const nxt = l.franjas[fr.idx + 1];
    r += glAp(.8, glT(X(0), Y(fr.alto) + Math.max(3, bh) + 22, fr.ult ? `+${n1(g.s / 2)}: se sella con el otro lado largo` : `${n1(g.s)}: aquí se monta la ${nxt.n}`, { fs: 18, col: TP_COL.sella }));
  }
  // medio selle en las aristas
  const yA = Math.max(0, (fr.conGola ? l.G : fr.y0) - fr.y0);
  r += glAp(.9, glT(X(-(l.half(fr.y0 + (yA + fr.alto) / 2))) - 6, Y((yA + fr.alto) / 2), `+${n1(g.s / 2)}`, { fs: 18, ta: 'end', col: TP_COL.sella }));
  // medidas
  r += glAp(1.2, flecha(X(-wMax), Y(0) + 34, X(wMax), Y(0) + 34) + glT(X(0), Y(0) + 64, n1(fr.abajo), { fs: 32 }));
  r += glAp(1.3, (fr.arriba ? glT(X(0), Y(fr.alto) - 14, n1(fr.arriba), { fs: 30 }) : glT(X(0), Y(fr.alto) - 14, 'punta', { fs: 24 })));
  r += glAp(1.4, flecha(X(wMax) + 26, Y(0), X(wMax) + 26, Y(fr.alto)) + `<text transform="translate(${X(wMax) + 44} ${Y(fr.alto / 2)}) rotate(90)" font-size="30" text-anchor="middle" fill="#14181b" stroke="#fff" stroke-width="4" paint-order="stroke">${n1(fr.alto)}</text>`);
  const ly = H - 18;
  r += `<rect x="24" y="${ly - 14}" width="34" height="14" fill="${TP_COL.sella}" fill-opacity=".55"/>` + glT(64, ly, 'se sella', { fs: 17, ta: 'start', col: '#4a545b' });
  r += glT(W - 20, ly, 'lados rectos: la curva se marca con todo sellado', { fs: 15, ta: 'end', col: '#6b757c' });
  return r + '</svg>';
}

function tpFichaPata(g) {
  const m = g.m, p = g.pata, W = 680, cab = 96, s = Math.min(560 / m.pataL, 3.4), H = cab + 60 + m.pataA * s + 110;
  const X = x => 60 + x * s, Y = y => cab + 50 + (m.pataA - y) * s;
  let r = `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" role="img" aria-label="Pata">${FL}`;
  r += `<rect x="2" y="${cab - 8}" width="${W - 4}" height="${(H - cab + 4).toFixed(0)}" rx="12" fill="${TP_COL.mesa}"/>`;
  r += glBola(46, 50, p, 34) + glT(92, 44, 'Pata', { fs: 28, ta: 'start' });
  r += glT(92, 76, `<tspan fill="${TP_COL.sella}">corta ${m.patas}</tspan> · forro de pata, en las esquinas`, { fs: 20, ta: 'start', col: '#4a545b' });
  r += glAp(.1, `<polygon points="${tpPata(g).map(([x, y]) => X(x).toFixed(1) + ',' + Y(y).toFixed(1)).join(' ')}" fill="${p.col}" stroke="#14181b" stroke-width="3"/>`);
  r += glAp(.6, flecha(X(0), Y(0) + 30, X(m.pataL), Y(0) + 30) + glT(X(m.pataL / 2), Y(0) + 60, n1(m.pataL), { fs: 30 }));
  r += glAp(.8, glT(X(0) - 8, Y(m.pataA / 2) + 8, n1(m.pataA), { fs: 26, ta: 'end' }) + glT(X(m.pataL) + 8, Y(m.pataB / 2) + 8, n1(m.pataB), { fs: 26, ta: 'start' }));
  r += glT(W / 2, H - 18, `el lado de ${n1(m.pataA)} se sella en la esquina de la gola`, { fs: 17, col: '#4a545b' });
  return r + '</svg>';
}

function tpRollo(g) {
  const ac = g.ac, R = ac.R, FILA = 700, nF = Math.ceil(ac.largo / FILA), hF = R + 70;
  let s = `<rect x="0" y="0" width="${ac.largo}" height="${R}" fill="#f4f1ea" stroke="#14181b" stroke-width="2"/>`;
  const Yr = y => R - y;
  ac.items.forEach(it => {
    const poly = tpForma(it.fr), fy = it.flip ? (y => R - it.fr.alto + y) : (y => Yr(y));
    s += `<polygon points="${poly.map(([x, y]) => (it.cx + x).toFixed(1) + ',' + fy(y).toFixed(1)).join(' ')}" fill="${it.fr.col}" stroke="#14181b" stroke-width="1.5" stroke-linejoin="round"/>`;
    s += glT(it.cx, it.flip ? R - it.fr.alto + Math.min(it.fr.alto * .35, 60) + 8 : Yr(Math.min(it.fr.alto * .35, 60)) + 8, it.fr.n, { fs: 30 });
  });
  ac.patas.forEach(pt => {
    const m = g.m, L = m.pataL, a = m.pataA, b = m.pataB, y = pt.y0;
    const q = pt.flip ? [[0, y + a + b], [L, y + a + b], [L, y + b], [0, y + a]].map(([x, yy]) => [x, yy]) : [[0, y], [L, y], [L, y + b], [0, y + a]];
    s += `<polygon points="${q.map(([qx, qy]) => (pt.x0 + qx).toFixed(1) + ',' + Yr(qy).toFixed(1)).join(' ')}" fill="${TP_COL.pata}" stroke="#14181b" stroke-width="1.5"/>`;
  });
  for (let m = 100; m < ac.largo; m += 100) s += `<line x1="${m}" y1="${R}" x2="${m}" y2="${R + 10}" stroke="#14181b"/><text x="${m}" y="${R + 32}" font-size="22" text-anchor="middle" fill="#4a545b">${m / 100} m</text>`;
  // en filas de 7 m para que se lea en el celular
  let o = `<svg viewBox="-70 -10 ${FILA + 90} ${nF * hF}" role="img" aria-label="Las piezas en el rollo">`;
  for (let r = 0; r < nF; r++) {
    o += `<svg x="0" y="${r * hF}" width="${FILA + 4}" height="${hF}" viewBox="${r * FILA - 2} -6 ${FILA + 4} ${hF}" overflow="hidden">${s}</svg>`;
    o += `<text x="-10" y="${r * hF + R / 2 + 8}" font-size="22" text-anchor="end" fill="#4a545b">${n0(R)}</text>`;
  }
  return o + '</svg>';
}

// tabla de la curva de una arista: cada 20 cm desde la punta
function tpTabla(l) {
  const filas = []; for (let d = 20; d < l.Lc - 5; d += 20) filas.push([d, l.enRecta(d).f]);
  return filas;
}

// ---------- pasos ----------
const tpCampo = (k, t, paso, v) => `<div class="paso-num"><span class="etq">${t}</span><div class="stepper"><button data-tp="${k}" data-d="${-paso}" aria-label="Menos">−</button><input data-tpin="${k}" type="number" inputmode="decimal" step="${paso}" value="${v}"><button data-tp="${k}" data-d="${paso}" aria-label="Más">+</button></div></div>`;
const tpFichaCu = (g, fr) => ({ t: `${boNum(fr)} <b>${fr.lado.nombre}, ${fr.nombre}</b> (corta <b>2</b>): abajo <b>${n1(fr.abajo)}</b>, ${fr.arriba ? `arriba <b>${n1(fr.arriba)}</b>` : 'termina en <b>punta</b>'}, alto <b>${n1(fr.alto)}</b>.`, svg: () => tpFicha(g, fr), alto: true });
const boNum = p => `<span class="gl-n" style="background:${p.col}">${p.n}</span>`;
const TP_ESC = {
  carpa: g => {
    const m = g.m;
    return { titulo: `Plegable de 3 puntas`, arriba: `
      <h2>Medidas</h2>
      <div class="tamanos tp-fondos">${TP.RAPIDAS.map(([L, F]) => `<button data-tpmed="${L}x${F}" class="${L === m.L && F === m.F ? 'activo' : ''}"><b>${L / 100}×${F / 100}</b><span>metros</span></button>`).join('')}</div>
      <div class="co-tres bo-dos">
        <div class="paso-num"><span class="etq">Largo, donde van las 3 puntas (m)</span><div class="stepper"><button data-tpdimd="L" data-d="-0.01" aria-label="Menos largo">−</button><input data-tpdim="L" type="text" inputmode="decimal" value="${String(m.L / 100).replace('.', ',')}"><button data-tpdimd="L" data-d="0.01" aria-label="Más largo">+</button></div></div>
        <div class="paso-num"><span class="etq">Fondo (m)</span><div class="stepper"><button data-tpdimd="F" data-d="-0.01" aria-label="Menos fondo">−</button><input data-tpdim="F" type="text" inputmode="decimal" value="${String(m.F / 100).replace('.', ',')}"><button data-tpdimd="F" data-d="0.01" aria-label="Más fondo">+</button></div></div>
      </div>
      ${TP.err ? `<p class="aviso tp-err" role="alert">${TP.err}</p>` : ''}
      <h2>Lona</h2>
      <div class="co-tres bo-dos">${tpCampo('rollo', 'Ancho del rollo (cm)', 1, m.rollo)}</div>
      <h2>Patas</h2>
      <div class="co-tres bo-dos">${tpCampo('pataL', 'Largo (cm)', 1, m.pataL)}${tpCampo('patas', '¿Cuántas?', 1, m.patas)}${tpCampo('pataA', 'Lado ancho (cm)', .5, m.pataA)}${tpCampo('pataB', 'Lado angosto (cm)', .5, m.pataB)}</div>
      <p class="nota">Con patas de <b>${n1(m.pataL)}</b> la punta queda a <b>${n1(m.pataL + g.H)}</b> del piso (la de muestra: 335 con unos 212).</p>`, cuadros: [
      { t: `<b>${nm(g.L)} × ${nm(g.F)}</b> con <b>3 puntas</b> en fila. Las 3 puntas son iguales.`, anim: { dur: 7000, f: u => tp3D(g, -0.7 + u * 1.4, { patas: 1 }) } },
      { t: `De frente (lado de ${nm(g.L)} m): la punta sube <b>${n1(g.H)}</b> sobre la esquina. Entre puntas la lona se comba sola: se corta recto.`, svg: () => tpAlzado(g, 'largo') },
      { t: `De lado (lado de ${nm(g.F)} m)${g.patasMedio ? `: desde 5 m lleva <b>3 patas</b> en este lado` : ''}.`, svg: () => tpAlzado(g, 'culata') },
      { t: `Son <b>4 piezas</b> de techo: 2 <b>lados de ${nm(g.L)} m</b> (de 4 esquinas, cubren las 3 puntas) y 2 <b>culatas</b>.`, svg: () => tpPlanta(g, 'piezas') },
    ] };
  },
  piezas: g => ({ titulo: 'Las piezas', arriba: `<div class="total"><span class="etq">Lona justa</span><b>${n1(g.ac.largo / 100)} m</b><span>de rollo de ${n0(g.m.rollo)}. Compra <b>${n1(g.ac.comprar)} m</b> (8 % más).</span></div>`, cuadros: [
    { t: `Cada lado se corta en <b>franjas</b> del ancho del rollo (<b>${n0(g.m.rollo)}</b>) y se montan <b>${n1(g.s)}</b> para sellar.`, anim: { dur: 5000, f: u => tp3D(g, -0.6 + u * .5, { col: 1, patas: 1, ex: 40 * Math.sin(Math.PI * Math.min(1, u * 1.2)) }) } },
    ...g.lados.map(l => ({ t: `<b>${l.nombre}</b>: ${l.franjas.map(f => `${boNum(f)} ${n1(f.alto)}`).join(' + ')}${l.franjas.length > 1 ? ` − ${n1(g.s * (l.franjas.length - 1))} de selle` : ''} = <b>${n1(l.Ht)}</b> de alto con la gola. La <b style="color:${TP_COL.curva}">arista</b> (esquina de la gola → punta) mide <b>${n1(l.Lc)}</b>.`, svg: () => tpLadoSvg(g, l) })),
    { t: `Así sale del rollo: <b>${n1(g.ac.largo / 100)} m</b>. Una al derecho y otra al revés para gastar menos.`, svg: () => tpRollo(g), alto: true },
    ...g.lados.flatMap(l => l.franjas.map(fr => tpFichaCu(g, fr))),
    { t: `${boNum(g.pata)} <b>Pata</b> (corta <b>${g.m.patas}</b>): <b>${n1(g.m.pataL)}</b> × <b>${n1(g.m.pataA)}</b> arriba × <b>${n1(g.m.pataB)}</b> abajo.`, svg: () => tpFichaPata(g), alto: true },
  ] }),
  curva: null,   // pantalla propia, como la plegable (tpCurvaBase)
  estructura: g => ({ titulo: 'La estructura', arriba: `<p class="guia">La lona sale para <b>${n1(g.L)} × ${n1(g.F)}</b>.${g.L === 600 ? ` La estructura de muestra mide <b>${TP.REAL} × 300</b>: hay que alargarla <b>${600 - TP.REAL} cm</b> en el lado de 6 m, <b>3 por módulo</b>, repartidos igual en cada tubo.` : ' La estructura tiene que medir exactamente eso.'}</p>`, cuadros: [
    { t: `Cada módulo debe quedar de <b>${n1(g.L / 2)}</b>. Las puntas (en rojo) quedan en la mitad del fondo.`, svg: () => tpPlanta(g, 'estructura') },
    { t: `Tubo de pico: <b>${n1(TP.POSTE)}</b> desde abajo de la cruceta. Sobresale <b>${n1(g.H)}</b> por encima de la esquina; la cruceta queda unos <b>${n1(TP.POSTE - g.H)}</b> más abajo.`, svg: () => tpAlzado(g, 'largo') },
  ] }),
  final: g => ({ titulo: 'Listo', cuadros: [
    { t: `Plegable <b>${nm(g.L)} × ${nm(g.F)}</b> de 3 puntas: <b>${g.piezas.length - 1}</b> moldes de techo (cada uno ×2) y <b>${g.m.patas}</b> patas. Compra <b>${n1(g.ac.comprar)} m</b> de rollo de ${n0(g.m.rollo)}.`, anim: { dur: 8000, f: u => tp3D(g, -0.6 + u * 6.283, { patas: 1 }) } },
  ], abajo: `<button class="cta verde" id="tpCompartir">Enviar medidas por WhatsApp</button>
    <p class="aviso">Está calculada con las medidas de la estructura y la curva de la 3×3. Todavía no se ha comprobado con una carpa armada.</p>` }),
};
const TP_PASOS = [['carpa', 'La carpa'], ['piezas', 'Piezas'], ['curva', 'Curva'], ['estructura', 'Estructura'], ['final', 'Listo']];

// =================== reproductor ===================
function tpParar() { clearTimeout(TP.timer); cancelAnimationFrame(TP.raf); }
function tpCuadro(j) {
  tpParar();
  const esc = TP.esc, n = esc.cuadros.length;
  TP.f = Math.max(0, Math.min(n - 1, j));
  const cu = esc.cuadros[TP.f], caja = $('#tpSvg');
  caja.classList.toggle('alto', !!cu.alto);
  $('#tpTxt').innerHTML = cu.t;
  $('#tpDots').innerHTML = esc.cuadros.map((_, k) => `<button data-f="${k}" aria-label="Cuadro ${k + 1}" ${k === TP.f ? 'aria-current="true"' : ''}></button>`).join('');
  $('#tpPlay').textContent = TP.juega ? '❚❚' : '▶';
  const sigue = ms => { if (TP.juega) TP.timer = setTimeout(() => { if (TP.f < n - 1) tpCuadro(TP.f + 1); else { TP.juega = false; $('#tpPlay').textContent = '▶'; } }, ms); };
  if (cu.anim) {
    const t0 = performance.now();
    const paso = now => { const u = Math.min(1, (now - t0) / cu.anim.dur); caja.innerHTML = cu.anim.f(u); if (u < 1) TP.raf = requestAnimationFrame(paso); else sigue(1500); };
    TP.raf = requestAnimationFrame(paso);
  } else { caja.innerHTML = cu.svg(); sigue(4200); }
}
const tpNombre = () => `3 puntas ${nm(TP.m.L)}×${nm(TP.m.F)}`;
function pintarTres() {
  tpParar();
  const g = TP.g = tpCalcular();
  TP.paso = Math.min(Math.max(0, TP.paso), TP_PASOS.length - 1);
  const i = TP.paso, [id] = TP_PASOS[i];
  $('#pillCarpa').textContent = tpNombre();
  $('#tpPasos').innerHTML = TP_PASOS.map(([k, t], j) => `<button data-paso="${j}" ${j === i ? 'aria-current="step"' : ''}><span>${j + 1}</span>${t}</button>`).join('');
  if (id === 'curva') {
    TP.esc = null; tpCurvaBase(g);
  } else {
  const esc = TP.esc = TP_ESC[id](g);
  $('#tpCuerpo').innerHTML = `<h1>${esc.titulo}</h1>${esc.arriba || ''}
    <div class="co-lamina">
      <div class="co-svg" id="tpSvg"></div>
      <p class="co-frase" id="tpTxt" aria-live="polite"></p>
      <div class="co-ctrl">
        <button class="co-b" id="tpAnt" aria-label="Cuadro anterior">◀</button>
        <div class="co-dots" id="tpDots"></div>
        <button class="co-b" id="tpPlay" aria-label="Reproducir o pausar"></button>
        <button class="co-b" id="tpProx" aria-label="Cuadro siguiente">▶</button>
      </div>
    </div>
    <div class="gl-leyenda">
      ${[['largo', 'Lados largos'], ['culata', 'Culatas'], ['pata', 'Patas']].map(([k, t]) => `<span><i style="background:${TP_COL[k]}"></i>${t}</span>`).join('')}
      <span class="gl-sel"><i></i><em class="bo-em">se sella: <b>${n1(g.s)}</b> (${n1(g.s / 2)} en cada borde) · varilla <b>${n1(st.aj.varilla)}</b></em></span>
    </div>${esc.abajo || ''}`;
  }
  $('#tpAtras').hidden = i === 0;
  $('#tpSig').hidden = i === TP_PASOS.length - 1;
  $('#tpSig').textContent = `Siguiente: ${TP_PASOS[i + 1] ? TP_PASOS[i + 1][1] : ''} →`;
  const chip = $('#tpPasos [aria-current]'); if (chip) chip.scrollIntoView({ block: 'nearest', inline: 'center' });
  guardarLS('tresPaso', i);
  TP.juega = false;
  if (TP.esc) tpCuadro(0);
}
// =================== curva: igual que la primera plegable ===================
const tpCada20 = Lc => { const a = []; for (let d = 20; d < Lc - 5; d += 20) a.push(d); return a; };
function tpCurvaBase(g) {
  TP.lado = Math.min(TP.lado, g.lados.length - 1);
  if (TP.puntos === null) TP.puntos = tpCada20(g.lados[TP.lado].Lc);
  $('#tpCuerpo').innerHTML = `<h1>Marcar la curva</h1>
    <p class="guia">Con el lado ya sellado en recto, traza una línea recta de la <b>punta</b> a la <b>esquina de la gola</b>. Mueve el botón por la recta y mide en escuadra lo que se hunde.</p>
    <div class="seg" id="tpLadoSel">${g.lados.map((l, i) => `<button data-tplado="${i}" aria-pressed="${i === TP.lado}">${i === 0 ? `Lado de ${nm(g.L)} m` : 'Culata'}</button>`).join('')}</div>
    <div class="curva-dibujo" id="tpCurvaSvg"></div>
    <div class="lectura">
      <div class="dato azul"><span class="etq">Desde la punta</span><b id="tpLecD"></b></div>
      <div class="dato rojo"><span class="etq">Se hunde</span><b id="tpLecF"></b></div>
    </div>
    <div class="control">
      <button class="fino" data-tpmover="-1" aria-label="Un centímetro hacia la punta">−1</button>
      <input id="tpSlider" type="range" min="0" step="0.5" aria-label="Distancia desde la punta">
      <button class="fino" data-tpmover="1" aria-label="Un centímetro hacia la gola">+1</button>
    </div>
    <div class="acciones"><button class="cta" id="tpMarcar">Marcar este punto</button></div>
    <h2>Puntos marcados</h2>
    <div class="puntos" id="tpPuntos"></div>
    <div class="acciones dos">
      <button class="sec" id="tpCada20">Llenar cada 20 cm</button>
      <button class="sec" id="tpLimpiar">Borrar todos</button>
    </div>
    <p class="nota" id="tpCurvaNota"></p>`;
  $('#tpSlider').addEventListener('input', e => tpMoverA(parseFloat(e.target.value)));
  const caja = $('#tpCurvaSvg');
  caja.addEventListener('pointerdown', e => { TP.arrastra = true; caja.setPointerCapture(e.pointerId); tpArrastrar(e); });
  caja.addEventListener('pointermove', e => { if (TP.arrastra) tpArrastrar(e); });
  caja.addEventListener('pointerup', () => { TP.arrastra = false; });
  caja.addEventListener('pointercancel', () => { TP.arrastra = false; });
  tpPintarCurva();
}
// el lado completo a escala, punta arriba; el botón corre por la recta del lado derecho
function tpCurvaGeo(l) {
  const fs = l.Ht / 13, mx = fs * .5, mt = fs * 1.6, mb = fs * .4;
  return { fs, vbW: 2 * l.Wb + 2 * mx, vbH: l.Ht + mt + mb, X: x => x + l.Wb + mx, Y: y => l.Ht + mt - y,
    dDe: (cx, cy) => { const x = Math.abs(cx - l.Wb - mx), y = l.Ht + mt - cy; return ((x - l.Wt) * (l.Wb - l.Wt) + (y - l.yT) * (l.G - l.yT)) / l.Lc; } };
}
function tpPintarCurva() {
  const g = TP.g, l = g.lados[TP.lado];
  TP.d = Math.min(Math.max(TP.d, 0), l.Lc);
  const geo = tpCurvaGeo(l), { X, Y, fs } = geo;
  const hT = l.top ? l.half(l.Ht) : 0;
  const contorno = [[-l.Wb, 0], [l.Wb, 0], [l.Wb, l.G], ...(l.top ? [[hT, l.Ht], [-hT, l.Ht]] : [[0, l.yT]]), [-l.Wb, l.G]];
  let s = `<svg viewBox="0 0 ${geo.vbW.toFixed(1)} ${geo.vbH.toFixed(1)}" id="tpCurvaDibujo" role="img" aria-label="${l.nombre} con la recta de la punta a la gola">`;
  s += `<polygon class="lona" points="${contorno.map(([x, y]) => X(x).toFixed(1) + ',' + Y(y).toFixed(1)).join(' ')}"/>`;
  s += `<rect class="gola" x="${X(-l.Wb)}" y="${Y(l.G)}" width="${2 * l.Wb}" height="${l.G}"/>`;
  s += `<text x="${X(0)}" y="${Y(l.G / 2) + fs * .3}" font-size="${fs * .8}" text-anchor="middle" class="gris">gola</text>`;
  [1, -1].forEach(sx => { const c = []; for (let i = 0; i <= 60; i++) { const k = l.enRecta(l.Lc * i / 60); c.push(X(sx * k.P[0]).toFixed(1) + ',' + Y(k.P[1]).toFixed(1)); } s += `<polyline points="${c.join(' ')}" fill="none" stroke="#d9232a" stroke-width="1.5" stroke-dasharray="3 4" vector-effect="non-scaling-stroke" opacity=".5"/>`; });
  s += `<line class="recta" x1="${X(l.Wt)}" y1="${Y(l.yT)}" x2="${X(l.Wb)}" y2="${Y(l.G)}"/>`;
  s += `<line class="recta" x1="${X(-l.Wt)}" y1="${Y(l.yT)}" x2="${X(-l.Wb)}" y2="${Y(l.G)}" style="opacity:.35"/>`;
  TP.puntos.filter(d => d <= l.Lc).forEach(d => {
    const k = l.enRecta(d);
    s += `<line class="marca" x1="${X(k.Q[0])}" y1="${Y(k.Q[1])}" x2="${X(k.P[0])}" y2="${Y(k.P[1])}"/><circle class="punto" cx="${X(k.P[0])}" cy="${Y(k.P[1])}" r="${fs * .16}"/>`;
    s += `<circle class="punto" cx="${X(-k.P[0])}" cy="${Y(k.P[1])}" r="${fs * .13}" style="opacity:.35"/>`;
  });
  const k = l.enRecta(TP.d);
  s += `<line class="hunde" x1="${X(k.Q[0])}" y1="${Y(k.Q[1])}" x2="${X(k.P[0])}" y2="${Y(k.P[1])}"/>`;
  s += `<circle class="boton" cx="${X(k.Q[0])}" cy="${Y(k.Q[1])}" r="${fs * .32}"/>`;
  s += `<text x="${X(k.P[0]) - fs * .35}" y="${Y(k.P[1]) + fs * .9}" font-size="${fs * .9}" class="rojo" text-anchor="end">${n1(k.f)}</text>`;
  s += `<text x="${X(l.Wt)}" y="${Y(l.yT) - fs * .5}" font-size="${fs * .9}" text-anchor="${l.top ? 'start' : 'middle'}">punta</text>`;
  s += `<text x="${X(l.Wb) - fs * .3}" y="${Y(l.G) + fs * .85}" font-size="${fs * .65}" text-anchor="end" class="gris">esquina de la gola ↗</text>`;
  $('#tpCurvaSvg').innerHTML = s + '</svg>';
  $('#tpLecD').textContent = `${n1(TP.d)} cm`;
  $('#tpLecF').textContent = `${n1(k.f)} cm`;
  const sl = $('#tpSlider'); sl.max = l.Lc.toFixed(1); sl.value = TP.d;
  $$('#tpLadoSel button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.tplado === TP.lado));
  const lista = TP.puntos.map((d, i) => [d, i]).filter(([d]) => d <= l.Lc);
  $('#tpPuntos').innerHTML = lista.length
    ? lista.map(([d, i]) => `<div class="punto-fila"><div><span class="etq">Desde la punta</span><b>${n1(d)} cm</b></div><div class="hundeval"><span class="etq">Se hunde</span><b>${n1(l.enRecta(d).f)} cm</b></div><button class="quitar" data-tpquitar="${i}">Quitar</button></div>`).join('')
    : '<p class="vacio">Mueve el botón y toca «Marcar este punto».</p>';
  $('#tpCurvaNota').textContent = `La recta mide ${n1(l.Lc)} cm. Lo más hondo es a ${n1(l.Lc * TP.HUNDE_A / TP.ARISTA)} cm de la punta (${n1(g.sag)} cm). En la punta y en la esquina no se hunde nada.${l.top ? ' Las 2 aristas del lado largo son iguales; el borde de arriba va recto.' : ''}`;
  guardarLS('tresPuntos', TP.puntos);
}
function tpMoverA(d) { TP.d = Math.round(d * 2) / 2; tpPintarCurva(); }
function tpArrastrar(ev) {
  const svg = $('#tpCurvaDibujo'); if (!svg) return;
  const l = TP.g.lados[TP.lado], pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
  const c = pt.matrixTransform(svg.getScreenCTM().inverse());
  tpMoverA(Math.min(l.Lc, Math.max(0, tpCurvaGeo(l).dDe(c.x, c.y))));
}

function tpTexto(g) {
  let t = `*PLEGABLE 3 PUNTAS ${nm(g.L)} × ${nm(g.F)}* (rollo de ${n0(g.m.rollo)}, selle ${n1(g.s)}, gola ${n1(g.G)} con varilla)\nMedidas de CORTE (lados rectos; la curva se marca después):\n`;
  g.lados.forEach(l => {
    t += `\n*${l.nombre}* (cortar 2 de cada franja)\n`;
    l.franjas.forEach(fr => { t += `• ${fr.n}. ${fr.nombre}: abajo ${n1(fr.abajo)}, alto ${n1(fr.alto)}, ${fr.arriba ? 'arriba ' + n1(fr.arriba) : 'en punta'}\n`; });
    t += `Armado: alto ${n1(l.Ht)} con la gola · arista ${n1(l.Lc)}\n`;
    const pts = (TP.puntos || tpCada20(l.Lc)).filter(d => d <= l.Lc);
    t += `Curva (recta de ${n1(l.Lc)}), desde la punta → se hunde:\n` + pts.map(d => `   ${n1(d)} cm → ${n1(l.enRecta(d).f)} cm`).join('\n') + '\n';
  });
  t += `\n*Patas* (cortar ${g.m.patas}): largo ${n1(g.m.pataL)}, ancho ${n1(g.m.pataA)}, angosto ${n1(g.m.pataB)}`;
  t += `\n*Lona:* ${n1(g.ac.largo / 100)} m justos → comprar ${n1(g.ac.comprar)} m`;
  t += g.L === 600 ? `\n*Estructura:* alargar el lado de 6 m de ${TP.REAL} a 600 (3 cm por módulo)` : `\n*Estructura:* 2 módulos de ${n1(g.L / 2)} × ${n1(g.F)}`;
  return t;
}
function tpIr(j) { TP.paso = j; pintarTres(); window.scrollTo(0, 0); }
const TP_LIM = { rollo: [60, 330], pataL: [100, 320], pataA: [10, 100], pataB: [5, 100], patas: [0, 8] };
function tpCambiar(k, v) {
  if (!(v >= 0) || !TP_LIM[k]) return;
  const [a, b] = TP_LIM[k];
  TP.m[k] = Math.min(b, Math.max(a, k === 'patas' || k === 'rollo' || k === 'pataL' ? Math.round(v) : Math.round(v * 2) / 2));
  if (k === 'rollo' && TP.m.rollo <= st.aj.selle + 20) TP.m.rollo = TP_DEF.rollo;
  guardarLS('tresP', TP.m);
  const y = window.scrollY, f = TP.f; pintarTres(); window.scrollTo(0, y); if (TP.esc) tpCuadro(f);
}

$('#v-tres').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.paso) return tpIr(+b.dataset.paso);
  if (b.id === 'tpAtras') return tpIr(TP.paso - 1);
  if (b.id === 'tpSig') return tpIr(TP.paso + 1);
  if (b.dataset.tpmed) { const [L, F] = b.dataset.tpmed.split('x').map(Number); TP.err = ''; TP.m.L = L; TP.m.F = F; guardarLS('tresP', TP.m); const y = window.scrollY; pintarTres(); window.scrollTo(0, y); return; }
  if (b.dataset.tpdimd) return tpMedida(b.dataset.tpdimd, TP.m[b.dataset.tpdimd] / 100 + parseFloat(b.dataset.d));
  if (b.dataset.tp) return tpCambiar(b.dataset.tp, TP.m[b.dataset.tp] + parseFloat(b.dataset.d));
  if (b.dataset.tplado) { TP.lado = +b.dataset.tplado; return tpPintarCurva(); }
  if (b.dataset.tpmover) return tpMoverA(TP.d + parseFloat(b.dataset.tpmover));
  if (b.id === 'tpMarcar') { if (!TP.puntos.includes(TP.d)) TP.puntos.push(TP.d); TP.puntos.sort((x, y) => x - y); return tpPintarCurva(); }
  if (b.id === 'tpCada20') { TP.puntos = tpCada20(TP.g.lados[TP.lado].Lc); return tpPintarCurva(); }
  if (b.id === 'tpLimpiar') { TP.puntos = []; return tpPintarCurva(); }
  if (b.dataset.tpquitar) { TP.puntos.splice(+b.dataset.tpquitar, 1); return tpPintarCurva(); }
  if (b.dataset.f) { TP.juega = false; return tpCuadro(+b.dataset.f); }
  if (b.id === 'tpAnt') { TP.juega = false; return tpCuadro(TP.f - 1); }
  if (b.id === 'tpProx') { TP.juega = false; return tpCuadro(TP.f + 1); }
  if (b.id === 'tpPlay') { TP.juega = !TP.juega; if (TP.juega && TP.f === TP.esc.cuadros.length - 1) return tpCuadro(0); return tpCuadro(TP.f); }
  if (b.id === 'tpCompartir') {
    const t = tpTexto(TP.g);
    if (navigator.share) { try { await navigator.share({ text: t }); return; } catch (err) { if (err.name === 'AbortError') return; } }
    location.href = 'https://wa.me/?text=' + encodeURIComponent(t);
  }
});
$('#v-tres').addEventListener('change', e => {
  const k = e.target.dataset.tpin; if (k) return tpCambiar(k, parseFloat(String(e.target.value).replace(',', '.')));
  const d = e.target.dataset.tpdim; if (d) tpMedida(d, parseFloat(String(e.target.value).replace(',', '.')));
});
// largo y fondo en metros, con centímetros (ej. 4,5 × 3,14). Más de 6 × 6 no: el peso tumba la estructura.
function tpMedida(k, v) {
  const nombre = k === 'L' ? 'El largo' : 'El fondo';
  if (!(v > 0)) TP.err = `${nombre} no es un número válido.`;
  else if (v * 100 > TP.MAX + 1e-6) TP.err = `${nombre} no puede pasar de ${TP.MAX / 100} m: la 3 puntas llega hasta 6 × 6. Más grande, el peso de la lona tumba la estructura.`;
  else if (v * 100 < TP.MIN - 1e-6) TP.err = `${nombre} debe ser de al menos ${TP.MIN / 100} m.`;
  else { TP.err = ''; TP.m[k] = Math.round(v * 100); guardarLS('tresP', TP.m); }
  const y = window.scrollY; pintarTres(); window.scrollTo(0, y);
}
$('#tipoTres').addEventListener('click', () => ir('tres'));
document.addEventListener('visibilitychange', () => { if (document.hidden) tpParar(); });
