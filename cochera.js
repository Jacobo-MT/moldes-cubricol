'use strict';
// ===== Cochera retráctil: guía paso a paso para alguien que nunca ha cortado lona =====
// Cerrada es una concha redonda. Los arcos de cada punta giran sobre una bisagra a cada lado y,
// para abrir, suben y se recogen parados uno sobre otro, como la capota de un coche de bebé.
// Todos los arcos son IGUALES (mismo tubo doblado) y todos los gajos salen de UN solo molde.
//   R  = radio de la concha = el menor entre el alto y la mitad del largo
//   hc = alto de la bisagra (si el alto pasa de la mitad del largo, abajo va un faldón)
//   Lm = parte recta del medio (si el largo pasa de dos veces el alto, el medio es un túnel fijo)

const CO = { c: { L: 500, W: 250, H: 250, paso: 0, hechos: {}, ...leerLS('cochera3', {}) }, g: null };
const coGuardar = () => guardarLS('cochera3', CO.c);
const CO_LIM = { L: [300, 900], W: [150, 400], H: [150, 350] };
const CO_SOLAPE = 5;      // cm de cruce del faldón en la bisagra (lleva velcro)
const CO_CINTA = 40;      // una cinta de amarre cada 40 cm de arco
const CO_FIJO = 100;      // en el túnel del medio, un arco fijo cada 100 cm como máximo
function cocheraNombre() { const c = CO.c; return `Cochera ${n1(c.L / 100)}×${n1(c.W / 100)}×${n1(c.H / 100)}`; }

const d2 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const d3 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const grados = th => n0(Math.abs(th) * 180 / Math.PI);

// ---------- geometría ----------
// Un arco: paredes rectas y medio círculo arriba, inclinado th desde la vertical sobre la bisagra.
// x: a lo ancho · y: a lo largo · z: hacia arriba desde la bisagra
function coArco(R, th, a) {
  const w = Math.max(0, R - a), b = Math.min(R, a), JW = 24, JA = 120, pts = [];
  const put = (x, r) => pts.push([x, r * Math.sin(th), r * Math.cos(th)]);
  for (let j = 0; j <= JW; j++) put(-a, w * j / JW);
  for (let j = 1; j <= JA; j++) { const f = Math.PI * (1 - j / JA); put(a * Math.cos(f), w + b * Math.sin(f)); }
  for (let j = JW - 1; j >= 0; j--) put(a, w * j / JW);
  let P = 0; for (let i = 1; i < pts.length; i++) P += d3(pts[i], pts[i - 1]);
  return { R, th, w, pts, P };
}

// Corre una línea plana m cm hacia un lado (+1 izquierda, -1 derecha de su camino)
function coCorrer(F, m, lado) {
  return F.map((p, i) => {
    let j = i; while (j > 0 && d2(F[j], p) < 1e-9) j--;
    let k = i; while (k < F.length - 1 && d2(F[k], p) < 1e-9) k++;
    const tx = F[k][0] - F[j][0], ty = F[k][1] - F[j][1], l = Math.hypot(tx, ty) || 1;
    return [p[0] - lado * m * ty / l, p[1] + lado * m * tx / l];
  });
}
// Dónde cruza una línea quebrada la vertical x (el cruce más alto o el más bajo)
function coCorte(poly, x, mayor) {
  let r = null;
  for (let i = 1; i < poly.length; i++) {
    const [x1, y1] = poly[i - 1], [x2, y2] = poly[i];
    if ((x1 - x) * (x2 - x) > 0 || x1 === x2) continue;
    const y = y1 + (y2 - y1) * (x - x1) / (x2 - x1);
    if (r === null || (mayor ? y > r : y < r)) r = y;
  }
  return r;
}
const coArea = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; };

// El molde del gajo: la lona entre dos arcos separados dTh. Se despliega como una cadena de cuadros:
// los dos bordes miden exacto lo que el arco (así las uniones casan) y cada travesaño mide lo que
// mide la lona de un arco al otro, con su comba.
function coGajo(R, a, dTh) {
  const S = 6, C = [];
  for (let j = 0; j <= S; j++) C.push(coArco(R, dTh * j / S, a).pts);
  const A = C[0], B = C[S], M = A.length - 1;
  const w = A.map((_, i) => { let t = 0; for (let j = 0; j < S; j++) t += d3(C[j][i], C[j + 1][i]); return t; });
  const f = A.map((p, i) => { const c = d3(p, B[i]); return c > 1e-6 ? w[i] / c : 1; });
  const cand = (P, Q, dP, dQ) => {
    const d = d2(P, Q); if (d < 1e-9) return [P, P];
    const ex = (Q[0] - P[0]) / d, ey = (Q[1] - P[1]) / d, t = (dP * dP - dQ * dQ + d * d) / (2 * d), h = Math.sqrt(Math.max(0, dP * dP - t * t));
    const bx = P[0] + t * ex, by = P[1] + t * ey;
    return [[bx - h * ey, by + h * ex], [bx + h * ey, by - h * ex]];
  };
  const adelante = (F, i, cs) => {
    let j = i; while (j > 0 && d2(F[j], F[i]) < 1e-9) j--;
    if (d2(F[j], F[i]) < 1e-9) return cs[0][1] >= cs[1][1] ? cs[0] : cs[1];
    const tx = F[i][0] - F[j][0], ty = F[i][1] - F[j][1], g = c => tx * (c[0] - F[i][0]) + ty * (c[1] - F[i][1]);
    return g(cs[0]) >= g(cs[1]) ? cs[0] : cs[1];
  };
  const FA = [[0, 0]], FB = [[0, 0]];
  let arranco = false;
  for (let i = 0; i < M; i++) {
    const dAA = d3(A[i], A[i + 1]), dBB = d3(B[i], B[i + 1]);
    if (!arranco) {
      if (dAA < 1e-9 && dBB < 1e-9) { FA.push(FA[i]); FB.push(FB[i]); continue; }
      FA.push([FA[i][0] + dAA, 0]);
      const cs = cand(FB[i], FA[i + 1], dBB, w[i + 1]);
      FB.push(cs[0][1] >= cs[1][1] ? cs[0] : cs[1]); arranco = true; continue;
    }
    const fm = (f[i] + f[i + 1]) / 2;
    FA.push(dAA < 1e-9 ? FA[i] : adelante(FA, i, cand(FA[i], FB[i], dAA, d3(A[i + 1], B[i]) * fm)));
    if (dBB < 1e-9) FB.push(FB[i]);
    else if (w[i + 1] < 1e-9) FB.push(FA[i + 1]);
    else FB.push(adelante(FB, i, cand(FA[i + 1], FB[i], w[i + 1], dBB)));
  }
  // la línea del centro del gajo, de punta a punta, queda horizontal
  const t0 = FA[0], t1 = [(FA[M][0] + FB[M][0]) / 2, (FA[M][1] + FB[M][1]) / 2];
  const ang = Math.atan2(t1[1] - t0[1], t1[0] - t0[0]), cs = Math.cos(-ang), sn = Math.sin(-ang);
  const rot = p => { const x = p[0] - t0[0], y = p[1] - t0[1]; return [x * cs - y * sn, x * sn + y * cs]; };
  const ra = FA.map(rot), rb = FB.map(rot);
  const yc = (Math.max(...rb.map(p => p[1])) + Math.min(...ra.map(p => p[1]))) / 2;   // centra el gajo sobre su línea
  return { arriba: rb.map(p => [p[0], p[1] - yc]), abajo: ra.map(p => [p[0], p[1] - yc]), Lc: d2(t0, t1), anchoLona: Math.max(...w) };
}

// Con el molde y los márgenes de cada borde, la pieza lista para cortar y su tabla
function coPieza(m, mArriba, mAbajo) {
  const up = coCorrer(m.arriba, mArriba, 1), dn = coCorrer(m.abajo, mAbajo, -1), Lc = m.Lc;
  const contorno = [...dn, ...up.slice().reverse()];
  const tabla = [];
  for (let t = 0; t < Lc / 2 - 5; t += 20) tabla.push(t);
  tabla.push(Lc / 2);
  const filas = tabla.map(t => { const tt = Math.min(Math.max(t, .3), Lc - .3); return { x: t, up: coCorte(up, tt, true), dn: -coCorte(dn, tt, false) }; });
  const ys = contorno.map(p => p[1]), xs = contorno.map(p => p[0]);
  return { contorno, Lc, filas, sube: Math.max(...ys), baja: -Math.min(...ys), ancho: Math.max(...ys) - Math.min(...ys), x0: Math.min(...xs), x1: Math.max(...xs), area: coArea(contorno) };
}

function coCalcular() {
  const c = CO.c, aj = st.aj, a = c.W / 2;
  const R = Math.min(c.H, c.L / 2), hc = c.H - R, Lm = c.L - 2 * R;
  const g = { error: '', a, R, hc, Lm };
  if (R < 100) { g.error = 'Con esas medidas la cochera queda muy pequeña.'; return g; }
  const arco = coArco(R, 0, a);
  g.arco = arco;
  const mPiso = hc > 0 ? aj.selle / 2 : aj.varilla;   // el borde de abajo del último gajo: al faldón o al piso

  // cuántos gajos por punta: los menos que quepan en el rollo y gasten menos lona
  let mejor = null;
  for (let N = 2; N <= 12; N++) {
    const m = coGajo(R, a, Math.PI / 2 / N);
    const normal = coPieza(m, aj.selle / 2, aj.selle / 2), piso = coPieza(m, aj.selle / 2, mPiso);
    if (Math.max(normal.ancho, piso.ancho) > aj.rollo) continue;
    const prueba = { N, molde: m, normal, piso };
    coPiezas(g, prueba);
    const largo = coAcomodo(prueba.items).largo;
    if (!mejor || largo < mejor.largo - 1) mejor = { ...prueba, largo };
    else break;
  }
  if (!mejor) { g.error = 'Con estas medidas los gajos no caben en el rollo.'; return g; }
  Object.assign(g, { N: mejor.N, molde: mejor.molde, normal: mejor.normal, piso: mejor.piso, dTh: Math.PI / 2 / mejor.N });

  // arcos: los de cada punta giran; si hay túnel, los del medio son fijos
  g.arcos = [];
  const yF = -Lm / 2, yA = Lm / 2;
  for (let k = 0; k <= g.N; k++) g.arcos.push({ y0: yF, th: -Math.PI / 2 + k * g.dTh, gira: k < g.N || Lm === 0, punta: k === 0 ? 'adelante' : '' });
  if (Lm > 0) {
    const n = Math.ceil(Lm / CO_FIJO);
    for (let j = 1; j < n; j++) g.arcos.push({ y0: yF + Lm * j / n, th: 0, gira: false, fijo: true });
    g.arcos.push({ y0: yA, th: 0, gira: false, punta: '' });
  }
  for (let k = Lm > 0 ? 1 : 1; k <= g.N; k++) g.arcos.push({ y0: yA, th: k * g.dTh, gira: true, punta: k === g.N ? 'atrás' : '' });
  if (Lm > 0) g.arcos[g.N].gira = false;     // el parado de adelante queda fijo en el túnel
  g.franjas = [];
  if (Lm > 0) {
    const need = Lm + aj.selle, R0 = aj.rollo;
    const n = Math.max(1, Math.ceil((need - aj.selle) / (R0 - aj.selle) - 1e-9)), total = need + (n - 1) * aj.selle, ws = Array(n).fill(R0);
    ws[n - 1] = total - (n - 1) * R0;
    if (n > 1 && ws[n - 1] < 40) { const dos = R0 + ws[n - 1]; ws[n - 2] = ws[n - 1] = dos / 2; }
    g.franjas = ws.map((w, i) => ({ w, nombre: 'T' + (i + 1) }));
    g.largoFranja = arco.P + 2 * hc + 2 * aj.varilla;
  }
  g.faldon = hc > 0 ? { largo: arco.P + 2 * CO_SOLAPE, alto: hc + aj.selle / 2 + aj.varilla } : null;
  coPiezas(g, g);
  Object.assign(g, coAcomodo(g.items));
  g.areaPiezas = g.items.reduce((t, it) => t + it.area, 0);
  g.areaRollo = g.largo * aj.rollo;
  g.tuboFijo = arco.P + 2 * hc;
  g.cintas = g.arcos.reduce((t, ar) => t + Math.floor((ar.fijo || (Lm > 0 && ar.th === 0) ? g.tuboFijo : arco.P) / CO_CINTA) + 1, 0);
  return g;
}

function coPiezas(g, p) {
  p.items = [];
  const nn = 2 * (p.N - 1);
  for (let n = 0; n < nn; n++) p.items.push({ tipo: 'gajo', t: p.normal, len: p.normal.x1 - p.normal.x0, across: p.normal.ancho, area: p.normal.area, nombre: 'G' });
  for (let n = 0; n < 2; n++) p.items.push({ tipo: 'gajo', t: p.piso, len: p.piso.x1 - p.piso.x0, across: p.piso.ancho, area: p.piso.area, nombre: 'GP' });
  const aj = st.aj, P = coArco(g.R, 0, g.a).P;
  if (g.hc > 0) { const f = { largo: P + 2 * CO_SOLAPE, alto: g.hc + aj.selle / 2 + aj.varilla }; for (let n = 0; n < 2; n++) p.items.push({ tipo: 'rect', len: f.largo, across: f.alto, area: f.largo * f.alto, nombre: 'F' + (n + 1) }); }
  if (g.franjas && g.franjas.length && p === g) g.franjas.forEach(fr => p.items.push({ tipo: 'rect', len: g.largoFranja, across: fr.w, area: fr.w * g.largoFranja, nombre: fr.nombre }));
}

// Acomodo en el rollo: piezas del mismo largo lado a lado si caben a lo ancho
function coAcomodo(items) {
  const R = st.aj.rollo, gap = 2, filas = [];
  items.slice().sort((a, b) => b.len - a.len || b.across - a.across).forEach(it => {
    let f = filas.find(f => Math.abs(f.len - it.len) < 0.5 && f.used + gap + it.across <= R + 1e-6);
    if (!f) { f = { len: it.len, used: -gap, items: [] }; filas.push(f); }
    it.y0 = f.used + gap; f.used = it.y0 + it.across; f.items.push(it);
  });
  let x = 0;
  filas.forEach(f => { f.x0 = x; x += f.len + gap; });
  return { filas, largo: Math.max(0, x - gap), sobrantes: filas.filter(f => R - f.used >= 20).map(f => ({ ancho: R - f.used, largo: f.len })) };
}

// ---------- dibujos ----------
const coP = (arr, X, Y) => arr.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');

function coSvgFrente(g) {
  const c = CO.c, a = g.a, hc = g.hc, fs = Math.max(c.W, c.H) / 16, mx = fs * 2.4, mt = fs * .8, mb = fs * 2.6;
  const X = x => x + a + mx, Y = z => c.H + mt - z;
  const forma = [[-a, 0], ...g.arco.pts.map(p => [p[0], p[2] + hc]), [a, 0]];
  let s = `<svg viewBox="0 0 ${(c.W + 2 * mx).toFixed(0)} ${(c.H + mt + mb).toFixed(0)}" role="img" aria-label="La cochera vista de frente">`;
  s += `<polygon class="lona" points="${coP(forma, X, Y)}"/>`;
  if (hc > 0) s += `<rect class="gola" x="${X(-a)}" y="${Y(hc)}" width="${c.W}" height="${hc}"/><text x="${X(0)}" y="${Y(hc / 2) + fs * .35}" font-size="${fs * .75}" text-anchor="middle" class="gris">faldón ${n0(hc)}</text>`;
  if (g.arco.w > 0) s += `<line class="fina" x1="${X(-a)}" y1="${Y(hc + g.arco.w)}" x2="${X(a)}" y2="${Y(hc + g.arco.w)}"/><text x="${X(0)}" y="${Y(hc + g.arco.w / 2) + fs * .35}" font-size="${fs * .75}" text-anchor="middle" class="gris">pared recta ${n1(g.arco.w)}</text>`;
  s += `<text x="${X(0)}" y="${Y(hc + g.arco.w + Math.min(a, g.R) * .45) + fs * .3}" font-size="${fs * .75}" text-anchor="middle" class="gris">medio círculo</text>`;
  s += `<circle class="punto" cx="${X(-a)}" cy="${Y(hc)}" r="${fs * .3}"/><circle class="punto" cx="${X(a)}" cy="${Y(hc)}" r="${fs * .3}"/>`;
  s += `<line class="piso" x1="${X(-a) - mx * .7}" y1="${Y(0)}" x2="${X(a) + mx * .7}" y2="${Y(0)}"/>`;
  s += `<line class="cota" x1="${X(-a)}" y1="${Y(0) + fs}" x2="${X(a)}" y2="${Y(0) + fs}"/><text x="${X(0)}" y="${Y(0) + fs * 2.2}" font-size="${fs}" text-anchor="middle">ancho ${n0(c.W)}</text>`;
  const xc = X(a) + mx * .45;
  s += `<line class="cota" x1="${xc}" y1="${Y(0)}" x2="${xc}" y2="${Y(c.H)}"/><text x="${xc + fs * .4}" y="${Y(c.H / 2)}" font-size="${fs}" transform="rotate(-90 ${xc + fs * .4} ${Y(c.H / 2)})" text-anchor="middle" dy="${fs * .8}">alto ${n0(c.H)}</text>`;
  return s + '</svg>';
}

// Vista de lado. abre: 0 cerrada … 1 abierta (los arcos de adelante parados y apilados)
function coSvgLado(g, { etiquetas = false, abre = 0, titulo = '', chico = false } = {}) {
  const c = CO.c, L = c.L, H = c.H, hc = g.hc, R = g.R, Lm = g.Lm, fs = Math.max(L, H) / (chico ? 12 : 26), mx = fs * 1.2, mt = fs * (etiquetas || titulo ? 2.2 : 1), mb = chico ? fs * .6 : fs * 2.6;
  const X = y => y + L / 2 + mx, Y = z => H + mt - z, yF = -Lm / 2, yA = Lm / 2;
  // ángulo de cada arco según lo abierta
  const ang = ar => {
    if (!abre || ar.y0 > yF + 1e-6 || !ar.gira) return ar.th;
    const k = Math.round((ar.th + Math.PI / 2) / g.dTh), apilado = -(g.N - k) * 0.035;
    return ar.th + (apilado - ar.th) * abre;
  };
  const tops = g.arcos.map(ar => { const th = ang(ar); return [ar.y0 + R * Math.sin(th), hc + R * Math.cos(th), ar]; });
  let s = `<svg viewBox="0 0 ${(L + 2 * mx).toFixed(0)} ${(H + mt + mb).toFixed(0)}" role="img" aria-label="${titulo || 'La cochera vista de lado'}">`;
  const cerrada = [];
  for (let i = 0; i <= 40; i++) { const th = -Math.PI / 2 + Math.PI / 2 * i / 40; cerrada.push([yF + R * Math.sin(th), hc + R * Math.cos(th)]); }
  for (let i = 0; i <= 40; i++) { const th = Math.PI / 2 * i / 40; cerrada.push([yA + R * Math.sin(th), hc + R * Math.cos(th)]); }
  if (abre) s += `<polyline class="fantasma" points="${coP(cerrada, X, Y)}"/>`;
  // lona
  let techo;
  if (!abre) techo = cerrada;
  else {
    const giran = tops.filter(t => t[2].y0 <= yF + 1e-6 && t[2].gira).map(t => [t[0], t[1]]);
    const resto = cerrada.filter(p => p[0] >= yF - 1e-6 && !(Lm === 0 && p[0] < 0));
    techo = [[yF, hc], ...giran.sort((p, q) => p[0] - q[0]), ...resto];
  }
  s += `<polygon class="lona" points="${coP([...techo, [techo[techo.length - 1][0], hc], [techo[0][0], hc]], X, Y)}"/>`;
  if (hc > 0) {
    const ini = abre ? yF : -L / 2;
    s += `<rect class="lona faldon" x="${X(ini)}" y="${Y(hc)}" width="${L / 2 - ini}" height="${hc}"/>`;
    if (abre) { const t0 = tops[0]; s += `<line class="faldon-arriba" x1="${X(t0[0])}" y1="${Y(t0[1])}" x2="${X(t0[0])}" y2="${Y(t0[1] - hc)}"/>`; }
  }
  if (Lm > 0) s += `<rect class="lona" x="${X(yF)}" y="${Y(hc)}" width="${Lm}" height="${hc}" style="stroke:none"/>`;
  tops.forEach(([y, z, ar]) => { s += `<line class="${ar.gira ? 'arco' : 'arco fijo'}" x1="${X(ar.y0)}" y1="${Y(ar.th === 0 && !ar.gira && Lm > 0 ? 0 : hc)}" x2="${X(y)}" y2="${Y(z)}"/>`; });
  [...new Set([yF, yA])].forEach(y => { s += `<circle class="punto" cx="${X(y)}" cy="${Y(hc)}" r="${fs * .3}"/>`; });
  s += `<line class="piso" x1="0" y1="${Y(0)}" x2="${L + 2 * mx}" y2="${Y(0)}"/>`;
  if (titulo) s += `<text x="${X(0)}" y="${fs * 1.2}" font-size="${fs}" text-anchor="middle">${titulo}</text>`;
  if (!chico) s += `<line class="cota" x1="${X(-L / 2)}" y1="${Y(0) + fs}" x2="${X(L / 2)}" y2="${Y(0) + fs}"/><text x="${X(0)}" y="${Y(0) + fs * 2.2}" font-size="${fs}" text-anchor="middle">largo ${n0(L)}</text>`;
  if (etiquetas) {
    const et = (y, z, t, cl = '', anc = 'middle') => { s += `<text x="${X(y)}" y="${Y(z)}" font-size="${fs * .9}" text-anchor="${anc}" class="${cl}">${t}</text>`; };
    et(0, H + fs * .7, Lm > 0 ? 'gajos · túnel · gajos' : 'gajos de lona');
    et(yA + fs * .6, hc + fs * .9, 'bisagra', 'rojo', 'start');
    if (hc > 0) et(L / 2 - R * .45, hc / 2 - fs * .3, 'faldón', 'gris');
    et(yF - R * .62, hc + R * .42, 'arcos', 'rojo');
    et(-L / 2 + fs * 1.5, -fs * 1.9, 'adelante', 'gris'); et(L / 2 - fs * 1.5, -fs * 1.9, 'atrás', 'gris');
  }
  return s + '</svg>';
}

function coSvgGajo(g, t, piso) {
  const fs = t.Lc / 26, mx = fs * .6, mt = fs * .5, mb = fs * 2;
  const X = x => x - t.x0 + mx, Y = y => mt + t.sube - y;
  let s = `<svg viewBox="0 0 ${(t.x1 - t.x0 + 2 * mx).toFixed(0)} ${(t.ancho + mt + mb).toFixed(0)}" role="img" aria-label="Gajo">`;
  t.filas.forEach(r => [r.x, t.Lc - r.x].forEach(x => { s += `<line class="marca" x1="${X(x)}" y1="${Y(r.up)}" x2="${X(x)}" y2="${Y(-r.dn)}"/>`; }));
  s += `<polygon class="lona" points="${coP(t.contorno, X, Y)}" style="fill-opacity:.75"/>`;
  s += `<line class="recta" x1="${X(0)}" y1="${Y(0)}" x2="${X(t.Lc)}" y2="${Y(0)}"/>`;
  s += `<text x="${X(t.Lc / 2)}" y="${Y(0) - fs * .4}" font-size="${fs * .8}" text-anchor="middle" class="gris">línea del centro</text>`;
  if (piso) s += `<text x="${X(t.Lc / 2)}" y="${Y(-t.baja) - fs * .4}" font-size="${fs * .75}" text-anchor="middle" class="rojo">${g.hc > 0 ? 'lado del faldón' : 'lado del piso'}</text>`;
  s += `<line class="cota" x1="${X(0)}" y1="${Y(-t.baja) + fs * .6}" x2="${X(t.Lc)}" y2="${Y(-t.baja) + fs * .6}"/><text x="${X(t.Lc / 2)}" y="${Y(-t.baja) + fs * 1.75}" font-size="${fs}" text-anchor="middle">${n1(t.Lc)} de punta a punta</text>`;
  return s + '</svg>';
}

function coSvgRect(L, h, texto, { dobladillo = false, velcro = false } = {}) {
  const aj = st.aj, fs = L / 24, mx = fs * .6, mt = fs * .6, mb = fs * 2;
  let s = `<svg viewBox="0 0 ${(L + 2 * mx).toFixed(0)} ${(h + mt + mb).toFixed(0)}" role="img" aria-label="${texto}">`;
  s += `<rect class="lona" x="${mx}" y="${mt}" width="${L}" height="${h}"/>`;
  if (dobladillo) s += `<rect class="gola" x="${mx}" y="${mt + h - aj.varilla * 2}" width="${L}" height="${aj.varilla * 2}"/>`;
  else s += `<rect class="gola" x="${mx}" y="${mt}" width="${aj.varilla * 3}" height="${h}"/><rect class="gola" x="${mx + L - aj.varilla * 3}" y="${mt}" width="${aj.varilla * 3}" height="${h}"/>`;
  if (velcro) s += `<rect class="velcro" x="${mx}" y="${mt}" width="${CO_SOLAPE * 2}" height="${h}"/><rect class="velcro" x="${mx + L - CO_SOLAPE * 2}" y="${mt}" width="${CO_SOLAPE * 2}" height="${h}"/>`;
  s += `<text x="${mx + L / 2}" y="${mt + h / 2 + fs * .35}" font-size="${fs * .9}" text-anchor="middle">${texto}</text>`;
  s += `<line class="cota" x1="${mx}" y1="${mt + h + fs * .6}" x2="${mx + L}" y2="${mt + h + fs * .6}"/><text x="${mx + L / 2}" y="${mt + h + fs * 1.75}" font-size="${fs}" text-anchor="middle">${n1(L)}</text>`;
  return s + '</svg>';
}

function coSvgRollo(g) {
  const R = st.aj.rollo, W = g.largo, sc = 110 / R, Yr = y => R - y;
  let s = `<svg width="${Math.ceil((W + 20) * sc)}" height="${Math.ceil((R + 26) * sc)}" viewBox="-10 -10 ${W + 20} ${R + 26}" role="img" aria-label="Piezas en el rollo">`;
  s += `<rect class="rollobg" x="0" y="0" width="${W}" height="${R}"/>`;
  g.filas.forEach(f => f.items.forEach(it => {
    if (it.tipo === 'gajo') { const t = it.t; s += `<polygon class="lona" points="${coP(t.contorno, x => f.x0 + x - t.x0, y => Yr(it.y0 + t.baja + y))}"/>`; }
    else s += `<rect class="lona" x="${f.x0}" y="${Yr(it.y0 + it.across)}" width="${it.len}" height="${it.across}"/>`;
    s += `<text x="${f.x0 + it.len / 2}" y="${Yr(it.y0 + it.across / 2) + 9}" font-size="26" text-anchor="middle">${it.nombre}</text>`;
  }));
  for (let m = 100; m < W; m += 100) s += `<text x="${m}" y="${R + 14}" font-size="10" text-anchor="middle" class="gris">${m / 100} m</text>`;
  return s + '</svg>';
}

// ---------- pasos de la guía ----------
function coPasos(g) {
  const ps = [['inicio', 'Antes de empezar'], ['medidas', 'Medidas']];
  if (g.error) return ps;
  ps.push(['arcos', 'Arcos y bisagra'], ['lona', 'Lona y recortes'], ['gajos', 'Cortar gajos']);
  if (g.franjas.length || g.faldon) ps.push(['rectas', 'Cortar piezas rectas']);
  ps.push(['sellar', 'Sellar y armar'], ['mover', 'Abrir y cerrar']);
  return ps;
}

function coLista(id, items) {
  const h = CO.c.hechos[id] || [];
  return `<ol class="co-lista">${items.map((t, i) => `<li><button class="co-check" data-check="${id}:${i}" aria-pressed="${h.includes(i)}"><span class="co-caja" aria-hidden="true"></span><span class="co-num">${i + 1}</span><span class="co-txt">${t}</span></button></li>`).join('')}</ol>`;
}
const coMed = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
const cm = v => `${n1(v)} <small>cm</small>`;
const coEstados = g => `<div class="co-estados">
  <div>${coSvgLado(g, { chico: true, titulo: 'Cerrada' })}</div>
  <div>${coSvgLado(g, { chico: true, titulo: 'Medio abierta', abre: .5 })}</div>
  <div>${coSvgLado(g, { chico: true, titulo: 'Abierta', abre: 1 })}</div></div>`;

const CO_VISTA = {
  inicio(g) {
    const aj = st.aj;
    return `<h1>Cochera retráctil</h1>
      <p class="guia">Vas a hacer el forro de lona de una cochera que el cliente abre y cierra cuando quiera, como la capota de un coche de bebé. Cerrada es una concha redonda que tapa el carro. Para sacarlo, los arcos de adelante suben girando sobre una <b>bisagra</b> y se recogen parados, uno sobre otro.</p>
      ${g.error ? '' : `<div class="pieza"><span class="etq">Las partes (de lado, cerrada)</span>${coSvgLado(g, { etiquetas: true })}
        <p class="nota">Cada raya roja es un arco de tubo y el punto rojo es la bisagra donde giran. Entre cada par de arcos va un gajo de lona; la unión de dos gajos queda encima de un arco.</p></div>
      <div class="pieza"><span class="etq">Así se recoge</span>${coEstados(g)}</div>`}
      <h2>Palabras del taller</h2>
      <dl class="co-palabras">
        <div><dt>Arco</dt><dd>Tubo doblado en forma de U al revés que va de un lado al otro por encima del carro. Todos los arcos que giran son iguales.</dd></div>
        <div><dt>Bisagra</dt><dd>El tornillo donde giran los arcos de una punta. Hay una a cada lado.</dd></div>
        <div><dt>Gajo</dt><dd>Pieza larga en forma de hoja que va de una bisagra a la otra por encima, entre dos arcos. Todos salen del mismo molde.</dd></div>
        <div><dt>Selle</dt><dd>Los ${n1(aj.selle)} cm en que una pieza se monta encima de otra para pegarlas con calor. Cada pieza pone la mitad (${n1(aj.selle / 2)} cm).</dd></div>
        <div><dt>Dobladillo con varilla</dt><dd>El borde que toca el piso: se dobla ${n1(aj.varilla)} cm con una varilla adentro para que pese.</dd></div>
        <div><dt>Línea del centro</dt><dd>La raya derecha que se traza de una punta del gajo a la otra. Desde ahí se mide todo, hacia arriba y hacia abajo.</dd></div>
        <div><dt>Revés</dt><dd>El lado de la lona que queda por dentro. Ahí se marca y se escribe.</dd></div>
      </dl>
      <h2>Lo que necesitas</h2>
      ${coLista('herramientas', ['Metro (flexómetro) de 8 m.', 'Escuadra grande.', 'Tiza o marcador que se borre.', 'Hilo de marcar con tiza, para trazar rectas largas.', 'Una varilla delgada que se doble sin quebrarse, para unir los puntos de las curvas.', 'Tijera grande o bisturí.', 'Pesas para que la lona no se corra.', 'La selladora.', 'Varilla para los dobladillos.', 'Reata y velcro para amarrar la lona a los arcos.', `El rollo de lona de ${n0(aj.rollo)} cm de ancho (en el paso 4 ves cuántos metros).`])}
      <h2>Reglas de oro</h2>
      ${coLista('reglas', ['Mide dos veces y corta una sola vez.', 'Todas las medidas de esta guía están en <b>centímetros</b>.', 'Marca siempre por el <b>revés</b> de la lona.', 'Apenas cortes una pieza, escríbele su nombre por el revés.', 'Si algo no te cuadra, para y pregunta antes de cortar.'])}`;
  },

  medidas(g) {
    const c = CO.c;
    const paso = (k, nombre) => `<div class="paso-num"><span class="etq">${nombre} (m)</span>
      <div class="stepper"><button data-co="${k}" data-d="-10" aria-label="Menos ${nombre}">−</button><input data-coin="${k}" type="number" inputmode="decimal" step="0.1" value="${c[k] / 100}"><button data-co="${k}" data-d="10" aria-label="Más ${nombre}">+</button></div></div>`;
    const libre = y => { const d = Math.max(0, Math.abs(y) - g.Lm / 2); return d < g.R ? g.hc + Math.sqrt(g.R * g.R - d * d) : 0; };
    let forma = 'El largo es el doble del alto: la cochera es una concha redonda perfecta, sin parte recta ni faldón.';
    if (g.hc > 0) forma = `El alto pasa de la mitad del largo: las bisagras quedan a ${n0(g.hc)} cm del piso y abajo va un <b>faldón</b> de esa altura.`;
    if (g.Lm > 0) forma = `El largo pasa del doble del alto: en el medio queda un <b>túnel recto de ${n0(g.Lm)} cm</b> con arcos fijos, y una concha que se recoge en cada punta.`;
    return `<h1>Medidas de la cochera</h1>
      <p class="guia">Son las medidas de la cochera <b>cerrada</b>, por fuera. La base es de 5 × 2,5 × 2,5 m.</p>
      <div class="co-tres">${paso('L', 'Largo')}${paso('W', 'Ancho')}${paso('H', 'Alto')}</div>
      ${g.error ? `<p class="aviso co-error">${g.error}</p>` : `
      <p class="aviso">${forma}</p>
      <div class="pieza"><span class="etq">De lado</span>${coSvgLado(g)}</div>
      <div class="pieza"><span class="etq">De frente</span>${coSvgFrente(g)}</div>
      <h2>¿Cabe el carro?</h2>
      <dl class="medidas">
        ${coMed('Alto en el centro', cm(c.H))}
        ${coMed('A 1,5 m del centro', cm(libre(150)))}
        ${coMed('A 2 m del centro', cm(libre(200)))}
        ${coMed('A 2,25 m del centro', cm(libre(225)))}
      </dl>
      <p class="nota">Un carro de 4,5 m de largo llega a 2,25 m del centro por cada lado. Ahí están el capó y la cola, que son más bajos que el techo. Compara con lo que mide el carro del cliente.</p>`}`;
  },

  arcos(g) {
    const c = CO.c, giran = g.arcos.filter(a => a.gira).length, fijos = g.arcos.length - giran;
    return `<h1>Arcos y bisagra</h1>
      <p class="guia">La lona se corta según la posición de los arcos, así que la estructura tiene que quedar <b>igual a esto</b>.</p>
      <div class="pieza">${coSvgLado(g)}</div>
      <dl class="medidas">
        ${coMed('Arcos que giran', `${giran} <small>iguales</small>`)}
        ${coMed('Tubo de cada uno', cm(g.arco.P))}
        ${fijos ? coMed('Arcos fijos del túnel', fijos) + coMed('Tubo de cada fijo', cm(g.tuboFijo)) : ''}
        ${coMed('Separación entre arcos', `${n1(g.dTh * 180 / Math.PI)} <small>grados</small>`)}
        ${coMed('Arriba, de arco a arco', cm(g.R * g.dTh))}
      </dl>
      <p class="nota">Cada arco se dobla igual: paredes rectas de ${n1(g.arco.w)} cm y arriba medio círculo de ${n1(Math.min(g.a, g.R))} cm de radio, con ${n0(c.W)} cm de ancho entre patas.</p>
      <div class="co-tabla-wrap"><table class="co-tabla"><thead><tr><th>Arco</th><th>Dónde</th><th>Inclinado</th></tr></thead><tbody>
        ${g.arcos.map((ar, k) => `<tr><td class="num">${k + 1}</td><td>${ar.gira ? `Gira en la bisagra de ${ar.y0 < 0 || g.Lm === 0 && ar.th <= 0 ? 'adelante' : 'atrás'}` : 'Fijo'}${ar.punta ? ` · <b>punta ${ar.punta}</b>` : ''}</td><td class="num">${grados(ar.th)}°</td></tr>`).join('')}
      </tbody></table></div>
      ${coLista('arcos', [
        g.Lm > 0 ? `Hay dos bisagras a cada lado, a ${n0(g.hc)} cm del piso: una a ${n0(g.R)} cm de la punta de adelante y otra a ${n0(g.R)} cm de la de atrás.` : `La bisagra va en la mitad del largo (${n0(c.L / 2)} cm de cada punta), a ${n0(g.hc)} cm del piso, una a cada lado.`,
        'Los arcos que giran se montan en el mismo tornillo, uno junto al otro, con una arandela entre cada uno para que giren suave y se recojan sin rozarse.',
        'La bisagra lleva un seguro (tornillo de presión o pasador) para que los arcos se queden donde el cliente los deje.',
        'Cada bisagra va sobre una base pesada o anclada al piso.',
        'Arma la estructura cerrada y revisa con el metro que de arco a arco, arriba, haya lo mismo que dice arriba. Así la lona queda pareja.',
      ])}`;
  },

  lona(g) {
    const aj = st.aj, filas = [['Gajo', 2 * (g.N - 1), `${n1(g.normal.ancho)} × ${n1(g.normal.x1 - g.normal.x0)}`], [`Gajo de abajo (${g.hc > 0 ? 'va al faldón' : 'va al piso'})`, 2, `${n1(g.piso.ancho)} × ${n1(g.piso.x1 - g.piso.x0)}`]];
    g.franjas.forEach(f => filas.push([`Franja del túnel ${f.nombre}`, 1, `${n1(f.w)} × ${n1(g.largoFranja)}`]));
    if (g.faldon) filas.push(['Faldón', 2, `${n1(g.faldon.alto)} × ${n1(g.faldon.largo)}`]);
    filas.push(['Refuerzo de la bisagra (círculo)', 4 * (g.Lm > 0 ? 2 : 1), '30 de diámetro, de los sobrantes']);
    return `<h1>Lona y recortes</h1>
      <div class="total"><span class="etq">Necesitas</span><b>${n1(g.largo / 100)} m</b><span>de rollo de ${n0(aj.rollo)} cm de ancho · compra ${n1(Math.ceil(g.largo / 50) / 2 + .5)} m para tener margen</span></div>
      <h2>Lo que vas a cortar</h2>
      <div class="co-tabla-wrap"><table class="co-tabla"><thead><tr><th>Pieza</th><th>Cant.</th><th>Ancho × largo (cm)</th></tr></thead><tbody>
        ${filas.map(([n, q, m]) => `<tr><td>${n}</td><td class="num">${q}</td><td class="num">${m}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="nota">Todos los gajos salen del <b>mismo molde</b>; el de abajo solo cambia en el borde de abajo. Las medidas ya traen el selle (${n1(aj.selle / 2)} cm por unión) y el dobladillo (${n1(aj.varilla)} cm en lo que toca el piso). No les sumes nada.</p>
      <h2>Así se acomoda en el rollo</h2>
      <div class="rollo">${coSvgRollo(g)}</div>
      <dl class="medidas">
        ${coMed('Lona en la cochera', `${n1(g.areaPiezas / 1e4)} <small>m²</small>`)}
        ${coMed('Se aprovecha', `${n0(g.areaPiezas / g.areaRollo * 100)} <small>%</small>`)}
      </dl>
      ${g.sobrantes.length ? `<h2>Sobrantes que sirven</h2>${g.sobrantes.map(s => `<p class="aviso">Queda una tira de <b>${n1(s.ancho)} × ${n1(s.largo)} cm</b>. De ahí salen los refuerzos de la bisagra y la manija.</p>`).join('')}` : ''}
      <p class="nota">Los gajos tienen forma de hoja: lo que se bota es sobre todo lo de sus puntas. Es normal.</p>
      <h2>Otros materiales</h2>
      <dl class="medidas">
        ${coMed('Cintas de amarre', `${g.cintas} <small>de 25 cm</small>`)}
        ${coMed('Velcro', g.faldon ? `${n1(4 * g.faldon.alto / 100)} <small>m</small>` : `<small>no lleva</small>`)}
      </dl>
      <p class="aviso">Estas medidas salen del cálculo. Haz la primera cochera y comprueba que quedó bien antes de cortar muchas.</p>`;
  },

  gajos(g) {
    const aj = st.aj, t = g.normal, p = g.piso, total = 2 * g.N;
    return `<h1>Cortar los gajos</h1>
      <p class="guia">Son <b>${total} gajos</b> (${g.N} en cada punta) y <b>todos salen del mismo molde</b>. Solo los 2 de abajo, ${g.hc > 0 ? 'los que se pegan al faldón' : 'los que tocan el piso'}, llevan por ese lado ${n1(g.hc > 0 ? aj.selle / 2 : aj.varilla)} cm en vez de ${n1(aj.selle / 2)}.</p>
      <div class="pieza"><div class="pieza-top"><h2>Gajo</h2><span class="cortar">Cortar ${total - 2}</span></div>${coSvgGajo(g, t, false)}</div>
      <div class="pieza"><div class="pieza-top"><h2>Gajo de abajo</h2><span class="cortar">Cortar 2</span></div>${coSvgGajo(g, p, true)}</div>
      <dl class="medidas">${coMed('De punta a punta', cm(t.Lc))}${coMed('Lo más ancho', cm(t.ancho))}</dl>
      <h2>Tabla para marcar</h2>
      <p class="guia">Mide desde una punta por la línea del centro. En cada medida pon la escuadra y marca hacia cada lado lo que dice la tabla. Llega hasta la mitad; la otra mitad es igual, contando desde la otra punta.</p>
      <div class="co-tabla-wrap"><table class="co-tabla"><thead><tr><th>Desde la punta</th><th>A cada lado</th><th>Gajo de abajo: lado de abajo</th></tr></thead><tbody>
        ${t.filas.map((r, i) => `<tr><td class="num">${n1(r.x)}${Math.abs(r.x - t.Lc / 2) < .01 ? ' <small>(mitad)</small>' : ''}</td><td class="num">${n1((r.up + r.dn) / 2)}</td><td class="num rojo">${n1(p.filas[i].dn)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="nota">En el gajo de abajo, el lado de arriba se marca con la columna del medio, igual que un gajo normal.</p>
      ${coLista('gajos', [
        'Extiende el rollo con el <b>revés hacia arriba</b> y pon pesas.',
        `Traza con el hilo de tiza la <b>línea del centro</b>, de ${n1(t.Lc)} cm, a ${n1(aj.rollo / 2)} cm de la orilla (la mitad del rollo).`,
        'Sobre la línea marca un punto en cada medida de la primera columna, empezando en una punta. Al llegar a la mitad sigue hacia la otra punta con las mismas medidas en orden inverso.',
        'En cada punto pon la escuadra con un brazo sobre la línea y marca hacia arriba y hacia abajo la medida de la columna del medio.',
        'Une los puntos con la varilla flexible doblada (que no haga picos) y pasa el marcador. En las puntas la curva se cierra casi en punta.',
        'Corta por la línea. Marca con una rayita la mitad del largo en los dos bordes: sirve para sellar sin que se corra.',
        `Usa ese primer gajo como <b>plantilla</b>: ponlo encima de la lona, marca alrededor y corta los demás. Así salen los ${total - 2} idénticos.`,
        `Para los 2 gajos de abajo usa la misma plantilla, pero el borde de abajo márcalo con la columna roja.`,
        `Escribe por el revés: G1 a G${g.N} para la punta de adelante y G${g.N + 1} a G${total} para la de atrás. El gajo de abajo de cada punta es el último número.`,
      ])}`;
  },

  rectas(g) {
    const aj = st.aj, partes = [];
    if (g.franjas.length) partes.push(`
      <h2>Franjas del túnel</h2>
      <p class="guia">Tapan la parte recta del medio. Cada franja va de un lado del piso al otro por encima.</p>
      ${g.franjas.map(f => `<div class="pieza"><div class="pieza-top"><h2>${f.nombre}</h2><span class="cortar">${n1(f.w)} × ${n1(g.largoFranja)}</span></div>${coSvgRect(g.largoFranja, f.w, `${f.nombre} · ${n1(f.w)} de ancho`)}</div>`).join('')}
      <p class="nota">El largo sale de ${n1(g.arco.P)} del arco${g.hc > 0 ? ` + ${n1(g.hc)} de pared a cada lado` : ''} + ${n1(aj.varilla)} de dobladillo en cada pie.</p>`);
    if (g.faldon) partes.push(`
      <h2>Faldón</h2>
      <p class="guia">Cuelga del arco de la punta hasta el piso, de una bisagra a la otra pasando por la punta. Se cortan 2: adelante y atrás. Cerrada, cada faldón se cruza ${CO_SOLAPE} cm ${g.Lm > 0 ? 'con la pared del túnel' : 'con el otro'} debajo de la bisagra y se cierra con velcro.</p>
      <div class="pieza"><div class="pieza-top"><h2>Faldón</h2><span class="cortar">Cortar 2</span></div>${coSvgRect(g.faldon.largo, g.faldon.alto, 'va pegado al arco de la punta', { dobladillo: true, velcro: true })}
        <p class="nota">Abajo, la franja oscura es el dobladillo del piso. En las puntas, los cuadros son el cruce con velcro.</p></div>
      <p class="nota">El alto sale de ${n1(g.hc)} de faldón + ${n1(aj.selle / 2)} de selle + ${n1(aj.varilla)} de dobladillo. El largo, de ${n1(g.arco.P)} del arco + ${CO_SOLAPE} de cruce en cada lado.</p>`);
    return `<h1>Cortar las piezas rectas</h1>${partes.join('')}
      ${coLista('rectas', [
        'Haz primero un corte en escuadra de orilla a orilla del rollo: ese es tu cero.',
        'Mide el largo por las dos orillas, marca, une las marcas con el hilo de tiza y corta.',
        'Si la pieza es más angosta que el rollo, mide el ancho desde una orilla en las dos puntas y en la mitad, une y corta a lo largo.',
        'Marca con una rayita la mitad del largo y escríbele el nombre por el revés.',
      ])}`;
  },

  sellar(g) {
    const aj = st.aj, N = g.N, l = [
      'Haz una <b>prueba en seco</b>: pon los gajos de cada punta en el piso, en orden, como un abanico.',
      `Sella los gajos de una punta uno con otro, montándolos ${n1(aj.selle)} cm: G1 con G2, G2 con G3… hasta el G${N}, que es el de abajo. Empieza siempre en las rayitas de la mitad y sigue hacia cada punta.`,
      'Haz la otra punta igual.',
      g.Lm > 0 ? 'Sella las franjas del túnel una con otra, y luego cada concha al borde del túnel que le toca: empieza arriba, en la mitad, y baja hacia cada lado.' : 'Une las dos puntas sellando los dos G1 por su borde libre. Esa unión queda encima del arco del centro.',
      'Todas las puntas de los gajos llegan a la bisagra. Sella ahí un refuerzo redondo por dentro y otro por fuera y abre el hueco para el tornillo.',
    ];
    if (g.faldon) l.push('Pega cada faldón al borde de abajo del gajo de abajo, empezando en la rayita del centro y siguiendo hacia cada bisagra, sin estirar.');
    l.push(`Pon la lona sobre la estructura <b>cerrada</b> y amárrala a cada arco por dentro, con una cinta cada ${CO_CINTA} cm. Cada unión de gajos debe quedar encima de un arco.`);
    l.push('Si una unión hace arrugas o bolsas, suelta, junta otra vez las rayitas de la mitad y sella de nuevo.');
    return `<h1>Sellar y armar</h1>
      <p class="guia">Primero cada punta por separado, después se juntan.</p>
      ${coLista('sellar', l)}`;
  },

  mover(g) {
    const aj = st.aj;
    const l = [
      g.faldon ? `<b>Dobladillos:</b> el borde de abajo de cada faldón lleva varilla de ${n1(aj.varilla)} cm.` : `<b>Dobladillos:</b> el borde de abajo de los gajos de abajo lleva varilla de ${n1(aj.varilla)} cm${g.Lm > 0 ? ', igual que los pies del túnel' : ''}.`,
      g.faldon ? 'Pega el velcro en los extremos de los faldones para que cierren debajo de cada bisagra.' : 'Cose dos o tres argollas en el borde de abajo de cada punta para asegurarla al piso con estacas cuando haga viento.',
      'Cose una manija de lona en la mitad del arco de la punta de adelante, y otra en la de atrás si el cliente quiere abrir por los dos lados.',
      `<b>Para abrir:</b> ${g.faldon ? 'suelta el velcro, ' : ''}toma la manija y sube el arco de la punta. Los demás arcos de esa punta se van recogiendo solos porque la lona los jala, y quedan parados uno sobre otro.`,
      'Puede quedar medio abierta o del todo abierta: el seguro de la bisagra la deja donde el cliente quiera.',
      '<b>Para cerrar:</b> baja la manija hasta el piso.',
      'Abre y cierra la cochera cinco veces. Ningún arco debe rozar ni pellizcar la lona, y la lona no debe quedar tirante.',
    ];
    return `<h1>Abrir y cerrar</h1>
      <p class="guia">Esto es lo que la hace retráctil: la lona va amarrada a cada arco, así que al subir el primero los demás lo siguen y la lona se dobla como acordeón entre ellos.</p>
      <div class="pieza">${coEstados(g)}</div>
      ${coLista('mover', l)}
      <div class="total"><span class="etq">${cocheraNombre()}</span><b>${n1(g.largo / 100)} m</b><span>de lona · ${g.arcos.length} arcos · ${2 * g.N + g.franjas.length + (g.faldon ? 2 : 0)} piezas</span></div>
      <button class="cta verde" id="coCompartir">Enviar medidas por WhatsApp</button>
      <button class="sec" id="coReiniciar">Desmarcar todos los pasos</button>`;
  },
};

function coTexto(g) {
  const aj = st.aj, t0 = g.normal;
  let t = `*${cocheraNombre().toUpperCase()} RETRÁCTIL*\n${g.arcos.length} arcos · tubo de ${n1(g.arco.P)} · cada ${n1(g.dTh * 180 / Math.PI)}°\nBisagra a ${n0(g.hc)} cm del piso\n`;
  t += `\n*Gajos* (${2 * g.N}, todos del mismo molde), punta a punta ${n1(t0.Lc)}\nDesde la punta → a cada lado (gajo de abajo, lado de abajo):\n`;
  t += t0.filas.map((r, i) => `   ${n1(r.x)} → ${n1((r.up + r.dn) / 2)} (${n1(g.piso.filas[i].dn)})`).join('\n') + '\n';
  if (g.franjas.length) t += `\n*Túnel:* ` + g.franjas.map(f => `${f.nombre} ${n1(f.w)} × ${n1(g.largoFranja)}`).join(' · ') + '\n';
  if (g.faldon) t += `\n*Faldón* (cortar 2): ${n1(g.faldon.largo)} × ${n1(g.faldon.alto)}\n`;
  t += `\n*Lona:* ≈ ${n1(g.largo / 100)} m de rollo de ${n0(aj.rollo)}`;
  return t;
}

function pintarCochera() {
  const g = CO.g = coCalcular(), ps = coPasos(g);
  CO.c.paso = Math.min(Math.max(0, CO.c.paso), ps.length - 1);
  const i = CO.c.paso, [id] = ps[i];
  $('#pillCarpa').textContent = cocheraNombre();
  $('#coPasos').innerHTML = ps.map(([k, t], j) => `<button data-paso="${j}" ${j === i ? 'aria-current="step"' : ''}><span>${j + 1}</span>${t}</button>`).join('');
  $('#coCuerpo').innerHTML = `<p class="etq">Paso ${i + 1} de ${ps.length}</p>` + CO_VISTA[id](g);
  $('#coAtras').hidden = i === 0;
  $('#coSig').hidden = i === ps.length - 1;
  $('#coSig').textContent = `Siguiente: ${ps[i + 1] ? ps[i + 1][1] : ''} →`;
  const chip = $('#coPasos [aria-current]'); if (chip) chip.scrollIntoView({ block: 'nearest', inline: 'center' });
  coGuardar();
}

function coIr(j) { CO.c.paso = j; pintarCochera(); window.scrollTo(0, 0); }
function coFijar(k, cmv) {
  const [lo, hi] = CO_LIM[k];
  CO.c[k] = Math.min(hi, Math.max(lo, Math.round(cmv / 5) * 5));
  pintarCochera();
}

$('#v-cochera').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.paso) return coIr(+b.dataset.paso);
  if (b.id === 'coAtras') return coIr(CO.c.paso - 1);
  if (b.id === 'coSig') return coIr(CO.c.paso + 1);
  if (b.dataset.co) return coFijar(b.dataset.co, CO.c[b.dataset.co] + +b.dataset.d);
  if (b.dataset.check) {
    const [id, n] = b.dataset.check.split(':'), h = CO.c.hechos[id] || (CO.c.hechos[id] = []), k = +n, at = h.indexOf(k);
    if (at >= 0) h.splice(at, 1); else h.push(k);
    b.setAttribute('aria-pressed', at < 0); coGuardar(); return;
  }
  if (b.id === 'coReiniciar') { CO.c.hechos = {}; return pintarCochera(); }
  if (b.id === 'coCompartir') {
    const t = coTexto(CO.g);
    if (navigator.share) { try { await navigator.share({ text: t }); return; } catch (err) { if (err.name === 'AbortError') return; } }
    location.href = 'https://wa.me/?text=' + encodeURIComponent(t);
  }
});
$('#v-cochera').addEventListener('change', e => {
  const k = e.target.dataset.coin; if (!k) return;
  const v = parseFloat(String(e.target.value).replace(',', '.'));
  coFijar(k, (v > 0 ? v : CO.c[k] / 100) * 100);
});
$('#tipoCochera').addEventListener('click', () => ir('cochera'));
