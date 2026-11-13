'use strict';
// ===== Cochera retráctil: guía VISUAL para alguien que nunca ha cortado lona =====
// Cada paso es una lámina que se dibuja sola, cuadro por cuadro, con una frase corta y los números encima del dibujo.
// Geometría: cerrada es una concha redonda; los arcos de cada punta giran en una bisagra a cada lado y,
// para abrir, suben y se recogen parados uno sobre otro. Todos los arcos son iguales y todos los gajos salen de UN molde.
//   R  = el menor entre el alto y la mitad del largo · hc = alto de la bisagra (faldón) · Lm = túnel fijo del medio

const CO = { c: { L: 500, W: 250, H: 250, paso: 0, ...leerLS('cochera4', {}) }, g: null, f: 0, juega: false, timer: 0, raf: 0, abre: 0 };
const coGuardar = () => guardarLS('cochera4', { L: CO.c.L, W: CO.c.W, H: CO.c.H, paso: CO.c.paso });
const CO_LIM = { L: [300, 900], W: [150, 400], H: [150, 350] };
const CO_SOLAPE = 5, CO_FIJO = 100;
// funda del arco: tira de 16 cm (3 + 10 que abrazan un tubo de 1" + 3); en las puntas el borde del gajo da la vuelta al tubo
const CO_FUNDA = 16, CO_SELLO_F = 3, CO_FUNDA_PISO = 13;
function cocheraNombre() { const c = CO.c; return `Cochera ${n1(c.L / 100)}×${n1(c.W / 100)}×${n1(c.H / 100)}`; }

const d2 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const d3 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const grados = th => n0(Math.abs(th) * 180 / Math.PI);
const B = v => `<b>${v}</b>`;

// =================== geometría ===================
function coArco(R, th, a, JW = 24, JA = 120) {
  const w = Math.max(0, R - a), b = Math.min(R, a), pts = [];
  const put = (x, r) => pts.push([x, r * Math.sin(th), r * Math.cos(th)]);
  for (let j = 0; j <= JW; j++) put(-a, w * j / JW);
  for (let j = 1; j <= JA; j++) { const f = Math.PI * (1 - j / JA); put(a * Math.cos(f), w + b * Math.sin(f)); }
  for (let j = JW - 1; j >= 0; j--) put(a, w * j / JW);
  let P = 0; for (let i = 1; i < pts.length; i++) P += d3(pts[i], pts[i - 1]);
  return { R, th, w, pts, P };
}
function coCorrer(F, m, lado) {
  return F.map((p, i) => {
    let j = i; while (j > 0 && d2(F[j], p) < 1e-9) j--;
    let k = i; while (k < F.length - 1 && d2(F[k], p) < 1e-9) k++;
    const tx = F[k][0] - F[j][0], ty = F[k][1] - F[j][1], l = Math.hypot(tx, ty) || 1;
    return [p[0] - lado * m * ty / l, p[1] + lado * m * tx / l];
  });
}
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

// Molde del gajo: cadena de cuadros con los bordes exactos al arco y los travesaños con la comba de la lona
function coGajo(R, a, dTh) {
  const S = 6, C = [];
  for (let j = 0; j <= S; j++) C.push(coArco(R, dTh * j / S, a).pts);
  const A = C[0], Bc = C[S], M = A.length - 1;
  const w = A.map((_, i) => { let t = 0; for (let j = 0; j < S; j++) t += d3(C[j][i], C[j + 1][i]); return t; });
  const f = A.map((p, i) => { const c = d3(p, Bc[i]); return c > 1e-6 ? w[i] / c : 1; });
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
    const dAA = d3(A[i], A[i + 1]), dBB = d3(Bc[i], Bc[i + 1]);
    if (!arranco) {
      if (dAA < 1e-9 && dBB < 1e-9) { FA.push(FA[i]); FB.push(FB[i]); continue; }
      FA.push([FA[i][0] + dAA, 0]);
      const cs = cand(FB[i], FA[i + 1], dBB, w[i + 1]);
      FB.push(cs[0][1] >= cs[1][1] ? cs[0] : cs[1]); arranco = true; continue;
    }
    const fm = (f[i] + f[i + 1]) / 2;
    FA.push(dAA < 1e-9 ? FA[i] : adelante(FA, i, cand(FA[i], FB[i], dAA, d3(A[i + 1], Bc[i]) * fm)));
    if (dBB < 1e-9) FB.push(FB[i]);
    else if (w[i + 1] < 1e-9) FB.push(FA[i + 1]);
    else FB.push(adelante(FB, i, cand(FA[i + 1], FB[i], w[i + 1], dBB)));
  }
  const t0 = FA[0], t1 = [(FA[M][0] + FB[M][0]) / 2, (FA[M][1] + FB[M][1]) / 2];
  const ang = Math.atan2(t1[1] - t0[1], t1[0] - t0[0]), cs = Math.cos(-ang), sn = Math.sin(-ang);
  const rot = p => { const x = p[0] - t0[0], y = p[1] - t0[1]; return [x * cs - y * sn, x * sn + y * cs]; };
  const ra = FA.map(rot), rb = FB.map(rot);
  const yc = (Math.max(...rb.map(p => p[1])) + Math.min(...ra.map(p => p[1]))) / 2;
  const ar = rb.map(p => [p[0], p[1] - yc]), ab = ra.map(p => [p[0], p[1] - yc]);
  const up = ar.map((p, i) => [(p[0] + ab[i][0]) / 2, (p[1] - ab[i][1]) / 2]);
  return { arriba: up, abajo: up.map(p => [p[0], -p[1]]), Lc: d2(t0, t1) };
}
function coPieza(m, mArriba, mAbajo) {
  const up = coCorrer(m.arriba, mArriba, 1), dn = coCorrer(m.abajo, mAbajo, -1), Lc = m.Lc;
  const contorno = [...dn, ...up.slice().reverse()];
  const tabla = [];
  for (let t = 0; t < Lc / 2 - 5; t += 20) tabla.push(t);
  tabla.push(Lc / 2);
  const filas = tabla.map(t => { const tt = Math.min(Math.max(t, .3), Lc - .3); return { x: t, up: coCorte(up, tt, true), dn: -coCorte(dn, tt, false) }; });
  const ys = contorno.map(p => p[1]), xs = contorno.map(p => p[0]);
  return { contorno, up, dn, Lc, filas, sube: Math.max(...ys), baja: -Math.min(...ys), ancho: Math.max(...ys) - Math.min(...ys), x0: Math.min(...xs), x1: Math.max(...xs), area: coArea(contorno) };
}

function coCalcular() {
  const c = CO.c, aj = st.aj, a = c.W / 2;
  const R = Math.min(c.H, c.L / 2), hc = c.H - R, Lm = c.L - 2 * R;
  const g = { error: '', a, R, hc, Lm, yF: -Lm / 2, yA: Lm / 2 };
  if (R < 100) { g.error = 'Con esas medidas la cochera queda muy pequeña.'; return g; }
  g.arco = coArco(R, 0, a);
  const mPiso = hc > 0 ? aj.selle / 2 : CO_FUNDA_PISO;
  let mejor = null;
  for (let N = 2; N <= 12; N++) {
    const m = coGajo(R, a, Math.PI / 2 / N), normal = coPieza(m, aj.selle / 2, aj.selle / 2), piso = coPieza(m, aj.selle / 2, mPiso);
    if (Math.max(normal.ancho, piso.ancho) > aj.rollo) continue;
    const prueba = { N, normal, piso };
    coPiezas(g, prueba);
    const largo = coAcomodo(prueba.items).largo;
    if (!mejor || largo < mejor.largo - 1) mejor = { ...prueba, largo }; else break;
  }
  if (!mejor) { g.error = 'Con estas medidas los gajos no caben en el rollo.'; return g; }
  Object.assign(g, { N: mejor.N, normal: mejor.normal, piso: mejor.piso, dTh: Math.PI / 2 / mejor.N });
  g.arcos = [];
  for (let k = 0; k <= g.N; k++) g.arcos.push({ y0: g.yF, th: -Math.PI / 2 + k * g.dTh, gira: !(Lm > 0 && k === g.N) });
  if (Lm > 0) {
    const n = Math.ceil(Lm / CO_FIJO);
    for (let j = 1; j < n; j++) g.arcos.push({ y0: g.yF + Lm * j / n, th: 0, gira: false });
    g.arcos.push({ y0: g.yA, th: 0, gira: false });
  }
  for (let k = 1; k <= g.N; k++) g.arcos.push({ y0: g.yA, th: k * g.dTh, gira: true });
  g.franjas = [];
  if (Lm > 0) {
    const need = Lm + aj.selle, R0 = aj.rollo;
    const n = Math.max(1, Math.ceil((need - aj.selle) / (R0 - aj.selle) - 1e-9)), total = need + (n - 1) * aj.selle, ws = Array(n).fill(R0);
    ws[n - 1] = total - (n - 1) * R0;
    if (n > 1 && ws[n - 1] < 40) { const dos = R0 + ws[n - 1]; ws[n - 2] = ws[n - 1] = dos / 2; }
    g.franjas = ws.map((w, i) => ({ w, nombre: 'T' + (i + 1) }));
    g.largoFranja = g.arco.P + 2 * hc + 2 * aj.varilla;
  }
  g.faldon = hc > 0 ? { largo: g.arco.P + 2 * CO_SOLAPE, alto: hc + aj.selle / 2 + aj.varilla } : null;
  coPiezas(g, g);
  Object.assign(g, coAcomodo(g.items));
  g.areaPiezas = g.items.reduce((t, it) => t + it.area, 0);
  g.areaRollo = g.largo * aj.rollo;
  g.caja = coCaja(g);
  return g;
}
function coPiezas(g, p) {
  p.items = [];
  for (let n = 0; n < 2 * (p.N - 1); n++) p.items.push({ tipo: 'gajo', t: p.normal, len: p.normal.x1 - p.normal.x0, across: p.normal.ancho, area: p.normal.area, nombre: 'gajo' });
  for (let n = 0; n < 2; n++) p.items.push({ tipo: 'gajo', piso: true, t: p.piso, len: p.piso.x1 - p.piso.x0, across: p.piso.ancho, area: p.piso.area, nombre: 'abajo' });
  const aj = st.aj, P = coArco(g.R, 0, g.a).P;
  if (g.hc > 0) { const f = { largo: P + 2 * CO_SOLAPE, alto: g.hc + aj.selle / 2 + aj.varilla }; for (let n = 0; n < 2; n++) p.items.push({ tipo: 'rect', len: f.largo, across: f.alto, area: f.largo * f.alto, nombre: 'faldón' }); }
  if (p === g) { const n = g.arcos.length - (g.hc === 0 ? 2 : 0); for (let k = 0; k < n; k++) p.items.push({ tipo: 'rect', len: P, across: CO_FUNDA, area: P * CO_FUNDA, nombre: 'funda' }); }
  if (p === g) g.franjas.forEach(fr => p.items.push({ tipo: 'rect', len: g.largoFranja, across: fr.w, area: fr.w * g.largoFranja, nombre: fr.nombre }));
}
function coAcomodo(items) {
  const R = st.aj.rollo, gap = 2, filas = [];
  items.slice().sort((a, b) => b.len - a.len || b.across - a.across).forEach(it => {
    let f = filas.find(f => Math.abs(f.len - it.len) < 0.5 && f.used + gap + it.across <= R + 1e-6);
    if (!f) { f = { len: it.len, used: -gap, items: [] }; filas.push(f); }
    it.y0 = f.used + gap; f.used = it.y0 + it.across; f.items.push(it);
  });
  let x = 0;
  filas.forEach(f => { f.x0 = x; x += f.len + gap; });
  return { filas, largo: Math.max(0, x - gap) };
}

// =================== 3D ===================
const CO_CAM = { a: -0.6, b: 0.36 };
function coProy(p) {
  const [x, y, z] = p, ca = Math.cos(CO_CAM.a), sa = Math.sin(CO_CAM.a), cb = Math.cos(CO_CAM.b), sb = Math.sin(CO_CAM.b);
  const xp = x * ca - y * sa, yp = x * sa + y * ca;
  return [xp, -z * cb - yp * sb, yp * cb - z * sb];
}
function coCaja(g) {
  const c = CO.c, pts = [];
  for (const x of [-g.a - 40, g.a + 40]) for (const y of [-c.L / 2 - 40, c.L / 2 + 40]) for (const z of [0, c.H + 20]) pts.push(coProy([x, y, z]));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}
// ángulo de un arco según lo abierta (0 cerrada … 1 abierta): los de adelante suben y se apilan parados
function coAng(g, ar, abre) {
  if (!abre || ar.th > -1e-6 || !ar.gira) return ar.th;
  const k = Math.round((ar.th + Math.PI / 2) / g.dTh), meta = -(g.N - k) * 0.03;
  return ar.th + (meta - ar.th) * abre;
}
function coArco3D(g, ar, abre) {
  const th = coAng(g, ar, abre);
  return coArco(g.R, th, g.a, 4, 18).pts.map(([x, y, z]) => [x, ar.y0 + y, g.hc + z]);
}
const CO_LUZ = (() => { const v = [-.45, -.55, .7], l = Math.hypot(...v); return v.map(t => t / l); })();
function coSombra(pts, rgb, k = .45) {
  const [a, b, c] = pts, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n) || 1;
  const s = 1 - k + k * Math.abs((n[0] * CO_LUZ[0] + n[1] * CO_LUZ[1] + n[2] * CO_LUZ[2]) / l);
  return `rgb(${rgb.map(t => Math.round(t * s)).join(',')})`;
}
function coCarro(g) {
  const c = CO.c, len = Math.min(450, c.L * .86), wid = Math.min(178, c.W * .72), s = Math.min(1, (c.H * .72) / 150), caras = [];
  const caja = (x0, x1, y0, y1, z0, z1, rgb) => {
    const P = (x, y, z) => [x, y, z];
    [[P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)], [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)],
     [P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)], [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)],
     [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)]].forEach(q => caras.push({ q, fill: coSombra(q, rgb, .5), op: 1 }));
  };
  [-1, 1].forEach(sx => [-1, 1].forEach(sy => caja(sx * wid / 2 - 12, sx * wid / 2 + 12, sy * len * .31 - 32, sy * len * .31 + 32, 0, 62 * s, [30, 34, 38])));
  caja(-wid / 2, wid / 2, -len / 2, len / 2, 28 * s, 92 * s, [96, 112, 128]);
  caja(-wid * .44, wid * .44, -len * .2, len * .27, 92 * s, 148 * s, [160, 186, 206]);
  return caras;
}
// opciones: abre, carro, lona, arcos, ver (gajos que se ven), rojo (gajos en rojo), nombres, cintas, cotas, manija, cae, piso
function co3D(g, o = {}) {
  const abre = o.abre || 0, polys = [], c = CO.c, aj = st.aj;
  const arcos = g.arcos.map(ar => coArco3D(g, ar, abre));
  const gajos = [];
  for (let i = 0; i < arcos.length - 1; i++) {
    const A = arcos[i], Bp = arcos[i + 1], ai = g.arcos[i], bi = g.arcos[i + 1];
    gajos.push({ A, B: Bp, tunel: !ai.gira && !bi.gira, nombre: '' });
  }
  const ix = coIdx(g);
  ix.ad.forEach((i, k) => { gajos[i].nombre = 'G' + (k + 1); });
  ix.at.forEach((i, k) => { gajos[i].nombre = 'G' + (g.N + k + 1); });
  // la lona
  if (o.lona !== false) gajos.forEach((gj, i) => {
    if (o.ver && !o.ver.includes(i)) return;
    if (o.sube && o.sube.i === i) return;
    const rojo = o.rojo && o.rojo.includes(i), rgb = rojo ? [217, 35, 42] : gj.tunel ? [205, 212, 236] : (i % 2 ? [214, 220, 242] : [196, 205, 236]);
    for (let j = 0; j < gj.A.length - 1; j++) {
      const q = [gj.A[j], gj.A[j + 1], gj.B[j + 1], gj.B[j]];
      polys.push({ q, fill: coSombra(q, rgb), op: rojo ? .92 : .8, lona: true });
    }
  });
  if (o.lona !== false && g.hc > 0) [0, arcos.length - 1].forEach(k => {
    const A = arcos[k];
    for (let j = 0; j < A.length - 1; j++) { const p = A[j], q = A[j + 1], q2 = [p, q, [q[0], q[1], q[2] - g.hc], [p[0], p[1], p[2] - g.hc]]; polys.push({ q: q2, fill: coSombra(q2, [176, 188, 228]), op: .85, lona: true }); }
  });
  let bx = g.caja;
  if (o.sube) {
    const i = o.sube.i, m = g.molde || (g.molde = coGajo(g.R, g.a, g.dTh)), ai = g.arcos[i], bi = g.arcos[i + 1];
    const yP = -c.L / 2 - 120, e = o.sube.u < .5 ? 2 * o.sube.u * o.sube.u : 1 - Math.pow(-2 * o.sube.u + 2, 2) / 2, alza = Math.sin(Math.PI * e) * 60;
    const a3 = coArco(g.R, ai.th, g.a).pts, b3 = coArco(g.R, bi.th, g.a).pts;
    const mezcla = (p3, y0, f) => { const w = [p3[0], y0 + p3[1], g.hc + p3[2]], pl = [f[0] - m.Lc / 2, yP + f[1], 0]; return pl.map((v, k) => v + (w[k] - v) * e + (k === 2 ? alza : 0)); };
    const A = a3.map((p3, j) => mezcla(p3, ai.y0, m.abajo[j])), Bq = b3.map((p3, j) => mezcla(p3, bi.y0, m.arriba[j]));
    for (let j = 0; j < A.length - 1; j += 3) { const k = Math.min(j + 3, A.length - 1), q = [A[j], A[k], Bq[k], Bq[j]]; polys.push({ q, fill: coSombra(q, [217, 35, 42], .3), op: .95 }); }
    const ex = [[-m.Lc / 2 - 20, yP - 90, 0], [m.Lc / 2 + 20, yP - 90, 0], [-m.Lc / 2 - 20, yP + 90, 0], [m.Lc / 2 + 20, yP + 90, 0]].map(coProy);
    const x0 = Math.min(bx.x, ...ex.map(v => v[0])), y0 = Math.min(bx.y, ...ex.map(v => v[1])), x1 = Math.max(bx.x + bx.w, ...ex.map(v => v[0])), y1 = Math.max(bx.y + bx.h, ...ex.map(v => v[1]));
    bx = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  if (o.carro) polys.push(...coCarro(g));
  polys.forEach(p => { const pr = p.q.map(coProy); p.pr = pr; p.z = pr.reduce((t, v) => t + v[2], 0) / pr.length; });
  polys.sort((a, b) => b.z - a.z);
  const P2 = p => { const v = coProy(p); return `${v[0].toFixed(1)},${v[1].toFixed(1)}`; };
  let s = `<svg viewBox="${bx.x.toFixed(0)} ${bx.y.toFixed(0)} ${bx.w.toFixed(0)} ${bx.h.toFixed(0)}" role="img" aria-label="La cochera en 3D">`;
  // piso
  const pisoQ = [[-g.a - 60, -c.L / 2 - 60, 0], [g.a + 60, -c.L / 2 - 60, 0], [g.a + 60, c.L / 2 + 60, 0], [-g.a - 60, c.L / 2 + 60, 0]];
  s += `<polygon points="${pisoQ.map(P2).join(' ')}" fill="#e3e7ea"/>`;
  const capa = polys.map(p => `<polygon points="${p.pr.map(v => `${v[0].toFixed(1)},${v[1].toFixed(1)}`).join(' ')}" fill="${p.fill}" fill-opacity="${p.op}" ${p.lona ? 'stroke="#5462b4" stroke-opacity=".25" stroke-width=".6"' : ''}/>`).join('');
  s += o.cae ? `<g class="cae">${capa}</g>` : capa;
  if (o.fundas) arcos.forEach(A => { s += `<polyline points="${A.map(P2).join(' ')}" fill="none" stroke="#1f8f4e" stroke-width="9" stroke-linejoin="round" stroke-opacity=".8"/>`; });
  if (o.arcos !== false) arcos.forEach((A, k) => { s += `<polyline points="${A.map(P2).join(' ')}" fill="none" stroke="${g.arcos[k].gira ? '#d9232a' : '#39444b'}" stroke-width="${o.lona === false ? 3.5 : 2.2}" stroke-linejoin="round" ${!g.arcos[k].gira ? 'stroke-dasharray="6 4"' : ''}/>`; });
  // bisagras
  [...new Set([g.yF, g.yA])].forEach(y => [-g.a, g.a].forEach(x => { const v = coProy([x, y, g.hc]); s += `<circle cx="${v[0]}" cy="${v[1]}" r="7" fill="#d9232a" stroke="#fff" stroke-width="2"/>`; }));
  if (o.costura) {
    const A = arcos[o.costura.k], n = A.length - 1, mid = Math.floor(n / 2), u = o.costura.u;
    const l1 = Math.round(Math.min(1, u * 2) * mid), l2 = Math.round(Math.max(0, u * 2 - 1) * (n - mid));
    [A.slice(mid - l1, mid + 1), A.slice(mid, mid + l2 + 1)].forEach(t => { if (t.length > 1) s += `<polyline points="${t.map(P2).join(' ')}" fill="none" stroke="#1f8f4e" stroke-width="8" stroke-linecap="round"/>`; });
    const vm = coProy(A[mid]), v = coProy(u < .5 ? A[mid - l1] : A[mid + l2]);
    s += `<circle cx="${vm[0]}" cy="${vm[1]}" r="6" fill="#fff" stroke="#1f8f4e" stroke-width="3"/><text x="${vm[0]}" y="${vm[1] - 14}" font-size="22" text-anchor="middle" class="verde-t">mitad</text>`;
    s += `<g transform="translate(${v[0].toFixed(1)} ${v[1].toFixed(1)})"><rect x="-16" y="-26" width="32" height="22" rx="4" fill="#39444b"/><rect x="-7" y="-38" width="14" height="13" rx="2" fill="#14181b"/></g>`;
  }
  if (o.nombres) gajos.forEach((gj, i) => {
    if (gj.tunel || (o.ver && !o.ver.includes(i))) return;
    const m = Math.floor(gj.A.length / 2), p = gj.A[m].map((t, k) => (t + gj.B[m][k]) / 2), v = coProy(p);
    const rojo = o.rojo && o.rojo.includes(i);
    s += `<g class="${o.quieto ? '' : 'ap'}"><circle cx="${v[0]}" cy="${v[1] - 6}" r="20" fill="${rojo ? '#fff' : '#14181b'}"/><text x="${v[0]}" y="${v[1] + 2}" font-size="22" text-anchor="middle" fill="${rojo ? '#d9232a' : '#fff'}" style="fill:${rojo ? '#d9232a' : '#fff'}">${gj.nombre.slice(1)}</text></g>`;
  });
  if (o.manija) { const A = arcos[0], m = A[Math.floor(A.length / 2)], v = coProy(m); s += `<g class="ap"><ellipse cx="${v[0]}" cy="${v[1] - 14}" rx="16" ry="12" fill="none" stroke="#14181b" stroke-width="5"/><text x="${v[0] - 26}" y="${v[1] - 30}" font-size="22" text-anchor="end">manija</text></g>`; }
  if (o.cotas) {
    const cota = (p, q, t, dx = 0, dy = 0) => { const a = coProy(p), b = coProy(q); s += `<g class="ap"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#14181b" stroke-width="2.5" marker-start="url(#fl)" marker-end="url(#fl)"/><text x="${(a[0] + b[0]) / 2 + dx}" y="${(a[1] + b[1]) / 2 + dy}" font-size="30" text-anchor="middle" class="co-cota">${t}</text></g>`; };
    s += `<defs><marker id="fl" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#14181b"/></marker></defs>`;
    cota([g.a + 30, -c.L / 2, 0], [g.a + 30, c.L / 2, 0], `largo ${n0(c.L)}`, 30, 30);
    cota([-g.a, -c.L / 2 - 30, 0], [g.a, -c.L / 2 - 30, 0], `ancho ${n0(c.W)}`, -10, 32);
    cota([g.a + 30, 0, 0], [g.a + 30, 0, c.H], `alto ${n0(c.H)}`, 62, 0);
  }
  if (o.etiquetas) o.etiquetas.forEach(([p, t, cl]) => { const v = coProy(p); s += `<text class="ap ${cl || ''}" x="${v[0]}" y="${v[1]}" font-size="26" text-anchor="middle">${t}</text>`; });
  return s + '</svg>';
}

// =================== dibujos 2D ===================
const coP = (arr, X, Y) => arr.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
const coPath = (arr, X, Y) => 'M' + arr.map(([x, y]) => `${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join('L');
const FL = `<defs><marker id="fl2" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>`;
const flecha = (x1, y1, x2, y2, col = '#14181b', w = 2, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" marker-start="url(#fl2)" marker-end="url(#fl2)" ${extra}/>`;
const IC = {
  pesa: (x, y, s = 14) => `<rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" rx="2" fill="#39444b"/>`,
  tijera: s => `<g transform="scale(${s})"><circle cx="-6" cy="8" r="4.5" fill="none" stroke="#14181b" stroke-width="2.2"/><circle cx="6" cy="8" r="4.5" fill="none" stroke="#14181b" stroke-width="2.2"/><path d="M-4 4L4 -12M4 4L-4 -12" stroke="#6b757c" stroke-width="3" stroke-linecap="round"/></g>`,
};

// Las rayitas de todo el gajo, medidas con el metro desde una punta
function coFilasTodo(t) {
  const xs = []; for (let x = 0; x <= t.Lc - 12; x += 20) xs.push(x); xs.push(t.Lc);
  return xs.map(x => { const xx = Math.min(Math.max(x, .3), t.Lc - .3); return { x, up: coCorte(t.up, xx, true), dn: -coCorte(t.dn, xx, false) }; });
}

// La mesa de corte vista desde arriba, con el gajo COMPLETO parado de punta a punta
// etapas: 1 lona, 2 línea, 3 rayitas, 4 puntos, 5 regla, 6 tijera, 7 listo
function coMesa(g, etapa) {
  const t = g.normal, R = st.aj.rollo, L = t.Lc, m = 26, W = R + 2 * m, H = L + 2 * m, xc = m + R / 2;
  const X = v => xc + v, Y = x => m + x, filas = coFilasTodo(t);
  const camino = 'M' + t.contorno.map(p => `${X(p[1]).toFixed(1)} ${Y(p[0]).toFixed(1)}`).join('L') + 'Z';
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Mesa de corte">${FL}`;
  s += `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="8" fill="#e8dcc4"/>`;
  s += `<rect class="${etapa === 1 ? 'desenrolla-v' : ''}" x="${m}" y="${m - 14}" width="${R}" height="${L + 28}" fill="#eef1fb" stroke="#b9c1de"/>`;
  [[m, m - 4], [m + R, m - 4], [m, m + L + 4], [m + R, m + L + 4]].forEach(([x, y], i) => { s += `<g class="${etapa === 1 ? 'ap' : ''}" style="--d:${.7 + i * .15}s">${IC.pesa(x, y, 16)}</g>`; });
  if (etapa === 1) s += `<g class="ap" style="--d:1.3s">${flecha(m + 4, Y(L / 2), m + R - 4, Y(L / 2), '#14181b', 2.5)}<text x="${xc}" y="${Y(L / 2) - 10}" font-size="26" text-anchor="middle" class="co-cota">${n0(R)}</text></g>`;
  if (etapa >= 2) {
    s += `<line class="${etapa === 2 ? 'dib' : ''}" pathLength="1" x1="${xc}" y1="${Y(0)}" x2="${xc}" y2="${Y(L)}" stroke="#5462b4" stroke-width="3" ${etapa > 2 ? 'stroke-dasharray="8 5"' : ''}/>`;
    if (etapa === 2) s += `<g class="ap" style="--d:1.2s">${flecha(m + 2, Y(70), xc - 2, Y(70), '#5462b4', 2)}${flecha(xc + 2, Y(70), m + R - 2, Y(70), '#5462b4', 2)}
      <text x="${(m + xc) / 2}" y="${Y(70) - 8}" font-size="20" text-anchor="middle" class="azul">${n1(R / 2)}</text><text x="${(xc + m + R) / 2}" y="${Y(70) - 8}" font-size="20" text-anchor="middle" class="azul">${n1(R / 2)}</text></g>
      <g class="ap" style="--d:1.8s"><text transform="translate(${xc - 10} ${Y(L / 2)}) rotate(-90)" font-size="24" text-anchor="middle" class="co-cota">${n1(L)} de punta a punta</text></g>`;
  }
  if (etapa >= 3) filas.forEach((r, i) => {
    const d = `style="--d:${(i * .07).toFixed(2)}s"`, cl = etapa === 3 ? 'ap' : '';
    s += `<line class="${cl}" ${d} x1="${xc - 7}" y1="${Y(r.x)}" x2="${xc + 7}" y2="${Y(r.x)}" stroke="#d9232a" stroke-width="2.5"/>`;
    if (etapa === 3 && r.x % 100 === 0) s += `<text class="ap" ${d} x="${xc - 12}" y="${Y(r.x) + 7}" font-size="20" text-anchor="end">${n0(r.x)}</text>`;
  });
  if (etapa === 3) s += `<text class="ap" style="--d:2.4s" x="${xc - 12}" y="${Y(L) + 7}" font-size="20" text-anchor="end">${n1(L)}</text>`;
  if (etapa >= 4 && etapa < 7) filas.forEach((r, i) => {
    const cl = etapa === 4 ? 'ap' : '', d = `style="--d:${(i * .06).toFixed(2)}s"`;
    s += `<circle class="${cl}" ${d} cx="${X(r.up)}" cy="${Y(r.x)}" r="3.5" fill="#d9232a"/><circle class="${cl}" ${d} cx="${X(-r.dn)}" cy="${Y(r.x)}" r="3.5" fill="#d9232a"/>`;
  });
  if (etapa === 5) s += `<path class="dib lento" pathLength="1" d="${camino}" fill="none" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/>`;
  if (etapa === 6) s += `<path d="${camino}" fill="none" stroke="#14181b" stroke-width="2.5"/><g>${IC.tijera(1.6)}<animateMotion dur="4s" fill="freeze" rotate="auto" path="${camino}"/></g>`;
  if (etapa >= 7) s += `<path class="levanta" d="${camino}" fill="#c4cdec" stroke="#14181b" stroke-width="2.5"/><text class="ap" style="--d:.6s" x="${xc}" y="${Y(L / 2) + 14}" font-size="44" text-anchor="middle">G1</text>`;
  return s + '</svg>';
}

// Zoom de una rayita: el metro, la escuadra y las dos medidas
function coEscuadra(g) {
  const t = g.normal, r = t.filas.find(f => f.x >= 100) || t.filas[Math.floor(t.filas.length / 2)], w = (r.up + r.dn) / 2;
  const s0 = 2.6, W = 360, H = 260, cx = W / 2, cy = 150, px = v => v * s0;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Medir con la escuadra">${FL}`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="#eef1fb"/>`;
  s += `<line x1="${cx}" y1="10" x2="${cx}" y2="${H - 10}" stroke="#5462b4" stroke-width="3" stroke-dasharray="10 6"/>`;
  s += `<rect x="${cx - 9}" y="10" width="18" height="${cy - 10}" fill="#f2c200" stroke="#a88400"/>`;
  for (let k = 0; k < 10; k++) s += `<line x1="${cx - 9}" y1="${cy - k * 14}" x2="${cx - 1}" y2="${cy - k * 14}" stroke="#14181b"/>`;
  s += `<text x="${cx - 14}" y="${cy - 4}" font-size="16" text-anchor="end">${n0(r.x)}</text>`;
  s += `<line x1="${cx - 16}" y1="${cy}" x2="${cx + 16}" y2="${cy}" stroke="#d9232a" stroke-width="3"/>`;
  s += `<g class="desliza"><path d="M${cx} ${cy} h${px(w) + 30} v14 h${-(px(w) + 16)} v60 h-14 z" fill="#c9ced3" stroke="#6b757c" stroke-width="1.5" opacity=".85"/></g>`;
  s += `<g class="ap" style="--d:1.2s">${flecha(cx + 4, cy - 14, cx + px(w), cy - 14, '#d9232a', 2.5)}<circle cx="${cx + px(w)}" cy="${cy}" r="5" fill="#d9232a"/><text x="${cx + px(w) / 2}" y="${cy - 22}" font-size="26" text-anchor="middle" class="rojo">${n1(w)}</text></g>`;
  s += `<g class="ap" style="--d:2s">${flecha(cx - 4, cy - 14, cx - px(w), cy - 14, '#d9232a', 2.5)}<circle cx="${cx - px(w)}" cy="${cy}" r="5" fill="#d9232a"/><text x="${cx - px(w) / 2}" y="${cy - 22}" font-size="26" text-anchor="middle" class="rojo">${n1(w)}</text></g>`;
  s += `<text x="${cx}" y="${H - 14}" font-size="15" text-anchor="middle" class="gris">metro sobre la lÃƒÂ­nea Ã‚Â· escuadra Ã‚Â· marca a cada lado</text>`;
  return s + '</svg>';
}

// Dos gajos lado a lado: punta con punta, rayita con rayita
function coDosGajos(g) {
  const t = g.normal, L = t.Lc, gap = 60, c1 = 20 + t.baja, c2 = c1 + t.sube + gap + t.baja, W = c2 + t.sube + 20, H = L + 40, Y = x => 20 + x;
  const pieza = (c, nom, fill) => `<path d="M${t.contorno.map(p => `${(c + p[1]).toFixed(1)} ${Y(p[0]).toFixed(1)}`).join('L')}Z" fill="${fill}" stroke="#5462b4" stroke-width="2"/><text x="${c}" y="${Y(L / 2) + 14}" font-size="40" text-anchor="middle">${nom}</text>`;
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Rayita con rayita">`;
  s += pieza(c1, 'G1', '#e3e8f8') + pieza(c2, 'G2', '#c4cdec');
  const filas = coFilasTodo(t).map(r => ({ ...r, k: Math.abs(r.x - L / 2) })).sort((a, b) => a.k - b.k);
  filas.forEach((r, i) => {
    const a = c1 + r.up, b = c2 - r.dn, d = `style="--d:${(.3 + i * .09).toFixed(2)}s"`;
    s += `<g class="ap" ${d}><line x1="${a}" y1="${Y(r.x)}" x2="${b}" y2="${Y(r.x)}" stroke="#1f8f4e" stroke-width="2" stroke-dasharray="4 3"/><line x1="${a - 6}" y1="${Y(r.x)}" x2="${a}" y2="${Y(r.x)}" stroke="#d9232a" stroke-width="3"/><line x1="${b}" y1="${Y(r.x)}" x2="${b + 6}" y2="${Y(r.x)}" stroke="#d9232a" stroke-width="3"/></g>`;
  });
  const ym = Y(L / 2), am = c1 + coCorte(t.up, L / 2, true), bm = c2 + coCorte(t.dn, L / 2, false);
  s += `<g class="ap"><line x1="${am - 14}" y1="${ym}" x2="${bm + 14}" y2="${ym}" stroke="#d9232a" stroke-width="5"/><text x="${(am + bm) / 2}" y="${ym - 12}" font-size="20" text-anchor="middle" class="rojo">mitad</text></g>`;
  return s + '</svg>';
}

// Sellar visto de canto: un borde encima del otro y la selladora aprieta
function coSelle(g) {
  const aj = st.aj, W = 360, H = 230;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Sellar">${FL}`;
  s += `<rect x="20" y="132" width="200" height="12" rx="3" fill="#c4cdec" stroke="#5462b4"/><text x="60" y="172" font-size="26" text-anchor="middle">G1</text>`;
  s += `<g class="baja"><rect x="160" y="120" width="180" height="12" rx="3" fill="#9aa8dc" stroke="#5462b4"/><text x="300" y="110" font-size="26" text-anchor="middle">G2</text></g>`;
  s += `<g class="ap" style="--d:1s"><rect x="160" y="120" width="60" height="24" fill="#d9232a" opacity=".35"/>${flecha(160, 158, 220, 158, '#d9232a', 2.5)}<text x="190" y="186" font-size="24" text-anchor="middle" class="rojo">${n1(aj.selle)} cm</text></g>`;
  s += `<g class="prensa"><rect x="150" y="62" width="80" height="54" rx="6" fill="#39444b"/><rect x="176" y="36" width="28" height="28" rx="4" fill="#14181b"/><text x="240" y="60" font-size="16" class="gris">selladora (calor)</text></g>`;
  s += `<text x="${W / 2}" y="${H - 10}" font-size="15" text-anchor="middle" class="gris">visto de lado: un borde encima del otro</text>`;
  return s + '</svg>';
}

// El gajo de abajo se corta como el G1, con un poco más en un borde
function coExtra(g) {
  const tn = g.normal, L = tn.Lc, wm = Math.max(tn.sube, tn.baja), xc = 120 + wm, W = xc + wm + 30, H = L + 40, Y = x => 20 + x, X = v => xc + v;
  const extra = CO_FUNDA_PISO - st.aj.selle / 2, borde = coCorrer(tn.dn, 7, -1);
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Gajo de abajo">`;
  s += `<path d="M${tn.contorno.map(p => `${X(p[1]).toFixed(1)} ${Y(p[0]).toFixed(1)}`).join('L')}Z" fill="#e3e8f8" stroke="#5462b4" stroke-width="2"/>`;
  s += `<path class="dib" pathLength="1" d="M${borde.map(p => `${X(p[1]).toFixed(1)} ${Y(p[0]).toFixed(1)}`).join('L')}" fill="none" stroke="#d9232a" stroke-width="9" stroke-linecap="round" opacity=".85"/>`;
  s += `<text x="${xc}" y="${Y(L / 2) + 14}" font-size="40" text-anchor="middle">G${g.N}</text>`;
  s += `<g class="ap" style="--d:1.4s"><text x="10" y="${Y(L / 2) - 8}" font-size="26" class="rojo">+${n1(extra)} cm</text><text x="10" y="${Y(L / 2) + 20}" font-size="18" class="rojo">solo aquí</text></g>`;
  return s + '</svg>';
}

// Plantilla: el primero sirve para cortar todos
function coPlantilla(g) {
  const t = g.normal, n = 2 * g.N, L = t.Lc, h = t.ancho, W = L + 80, H = h + (n - 1) * 26 + 40, conPiso = g.hc === 0;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Todos los gajos iguales">`;
  for (let i = n - 1; i >= 0; i--) {
    const piso = conPiso && i >= n - 2, dx = 20 + i * 8, dy = 20 + i * 26, tt = piso ? g.piso : t;
    s += `<g class="ap" style="--d:${(i * .25).toFixed(2)}s" transform="translate(${dx},${dy + tt.sube})"><polygon points="${coP(tt.contorno, x => x, y => -y)}" fill="${piso ? '#f6d0d2' : '#e3e8f8'}" stroke="${piso ? '#d9232a' : '#5462b4'}" stroke-width="2"/></g>`;
  }
  return s + '</svg>';
}

// La bisagra vista de lado y de cerca: las puntas de los arcos en un solo tornillo
// o: u (0 cerrada … 1 abierta), lona, parche, pasador, quieto (sin animaciones de aparecer)
function coBisagraLado(g, o = {}) {
  const Lt = 95, W = 300, alto = g.hc > 0, H = alto ? 220 : 210, cx = W / 2, cy = 128, u = o.u || 0, ap = o.quieto ? '' : 'ap';
  const arcs = g.arcos.filter(ar => ar.y0 === g.yF).map(ar => ({ ...ar, ang: coAng(g, ar, u) })).sort((a, b) => a.ang - b.ang);
  const P = (th, r) => [cx + r * Math.sin(th), cy - r * Math.cos(th)];
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="La bisagra de cerca">`;
  if (alto) s += `<rect x="${cx - 7}" y="${cy + 4}" width="14" height="${H - cy - 16}" fill="#9aa3a9" stroke="#39444b"/><text x="${cx + 14}" y="${H - 22}" font-size="14" class="gris">poste</text><line x1="0" y1="${H - 12}" x2="${W}" y2="${H - 12}" stroke="#39444b" stroke-width="3"/>`;
  else s += `<line x1="0" y1="${cy + 14}" x2="${W}" y2="${cy + 14}" stroke="#39444b" stroke-width="3"/>`;
  s += `<rect x="${cx - 34}" y="${cy + 5}" width="68" height="9" rx="2" fill="#9aa3a9" stroke="#39444b"/>`;
  if (!alto) s += `<text x="${cx}" y="${cy + 58}" font-size="13" text-anchor="middle" class="gris">platina atornillada al piso</text>`;
  if (o.lona) for (let i = 0; i < arcs.length - 1; i++) {
    const a = arcs[i].ang, b = arcs[i + 1].ang, r = Lt + 18, p = P(a, r), q = P(b, r);
    s += `<path d="M${cx} ${cy} L${p[0].toFixed(1)} ${p[1].toFixed(1)} A${r} ${r} 0 0 1 ${q[0].toFixed(1)} ${q[1].toFixed(1)}Z" fill="${i % 2 ? '#d7ddf3' : '#c4cdec'}" stroke="#5462b4" stroke-width=".8"/>`;
  }
  arcs.forEach(ar => { const p = P(ar.ang, Lt); s += `<line x1="${cx}" y1="${cy}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" stroke="${ar.gira ? '#d9232a' : '#39444b'}" stroke-width="7" stroke-linecap="round"/>`; });
  s += `<circle cx="${cx}" cy="${cy}" r="7" fill="#d9232a" stroke="#14181b" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="2.6" fill="#14181b"/>`;
  if (o.parche) s += `<g class="${ap}" style="--d:.6s"><circle cx="${cx}" cy="${cy}" r="15" fill="#9aa8dc" fill-opacity=".9" stroke="#14181b" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="2.6" fill="#fff" stroke="#14181b"/></g>
    <g class="${ap}" style="--d:1.2s"><text x="${cx}" y="${cy + 36}" font-size="14" text-anchor="middle">círculo de lona de 30 cm</text></g>`;
  else if (!o.lona) s += `<g class="${ap}" style="--d:.4s"><line x1="${cx + 4}" y1="${cy + 4}" x2="${cx + 60}" y2="${cy + 26}" stroke="#14181b"/><text x="${cx + 64}" y="${cy + 30}" font-size="14">tornillo</text></g>`;
  if (o.pasador) { const p = P(-Math.PI / 2 + .25, 26); s += `<g class="${ap}" style="--d:.5s"><circle cx="${p[0]}" cy="${cy + 2}" r="4.5" fill="#14181b"/><line x1="${p[0] - 4}" y1="${cy + 4}" x2="${p[0] - 30}" y2="${cy + 26}" stroke="#14181b"/><text x="${p[0] - 34}" y="${cy + 38}" font-size="14" text-anchor="end">pasador</text></g>`; }
  return s + '</svg>';
}

// La funda: una tira sellada por debajo de la unión de dos gajos; el tubo del arco pasa por adentro
function coFunda() {
  const W = 360, H = 250;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Funda del arco">${FL}`;
  s += `<rect x="10" y="80" width="190" height="9" rx="2" fill="#c4cdec" stroke="#5462b4"/><text x="40" y="70" font-size="22">G1</text>`;
  s += `<rect x="170" y="72" width="180" height="9" rx="2" fill="#9aa8dc" stroke="#5462b4"/><text x="320" y="62" font-size="22" text-anchor="middle">G2</text>`;
  s += `<rect x="170" y="72" width="30" height="17" fill="#d9232a" opacity=".35"/><text x="185" y="36" font-size="15" text-anchor="middle" class="rojo">selle de 3 cm</text><line x1="185" y1="40" x2="185" y2="70" stroke="#d9232a"/>`;
  s += `<circle class="ap" style="--d:1.6s" cx="185" cy="112" r="13" fill="#d9232a"/><text class="ap" style="--d:1.6s" x="250" y="124" font-size="16" class="rojo">tubo del arco</text>`;
  s += `<path class="dib" pathLength="1" d="M135 93 C130 150 240 150 235 93" stroke="#1f8f4e" stroke-width="6" fill="none"/>`;
  s += `<g class="ap" style="--d:1.2s"><rect x="124" y="88" width="22" height="9" fill="#d9232a" opacity=".6"/><rect x="224" y="88" width="22" height="9" fill="#d9232a" opacity=".6"/><text x="118" y="112" font-size="14" text-anchor="end" class="rojo">sella</text><text x="252" y="104" font-size="14" class="rojo">sella</text></g>`;
  s += `<g class="ap" style="--d:2s"><text x="${W / 2}" y="182" font-size="17" text-anchor="middle" class="verde-t">funda: tira de lona de ${CO_FUNDA} cm</text><text x="${W / 2}" y="204" font-size="14" text-anchor="middle" class="gris">${CO_SELLO_F} para sellar + ${CO_FUNDA - 2 * CO_SELLO_F} que abraza el tubo + ${CO_SELLO_F} para sellar</text></g>`;
  s += `<text x="${W / 2}" y="${H - 8}" font-size="14" text-anchor="middle" class="gris">corte visto de lado, por debajo de la cochera</text>`;
  return s + '</svg>';
}
// En los arcos de las puntas no hay vecino: el mismo borde del gajo da la vuelta al tubo
function coFundaPiso() {
  const W = 360, H = 220, extra = CO_FUNDA_PISO - st.aj.selle / 2;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Funda del arco de la punta">${FL}`;
  s += `<line x1="0" y1="134" x2="${W}" y2="134" stroke="#39444b" stroke-width="4"/><text x="12" y="156" font-size="14" class="gris">piso</text>`;
  s += `<path d="M350 84 H170" stroke="#5462b4" stroke-width="7" fill="none"/><text x="300" y="70" font-size="20" text-anchor="middle">G${CO.g ? CO.g.N : 3}</text>`;
  s += `<circle cx="170" cy="101" r="13" fill="#d9232a"/><text x="110" y="70" font-size="15" text-anchor="middle" class="rojo">tubo del arco de la punta</text><line x1="130" y1="74" x2="162" y2="92" stroke="#d9232a"/>`;
  s += `<path class="dib" pathLength="1" d="M170 84 A17 17 0 0 0 170 118 H222" stroke="#d9232a" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  s += `<g class="ap" style="--d:1.4s"><rect x="194" y="84" width="28" height="34" fill="#d9232a" opacity=".25"/><text x="208" y="182" font-size="15" text-anchor="middle" class="rojo">sella aquí</text><line x1="208" y1="166" x2="208" y2="120" stroke="#d9232a"/></g>`;
  s += `<g class="ap" style="--d:2s"><text x="${W / 2 + 60}" y="206" font-size="18" text-anchor="middle" class="rojo">este borde lleva ${n1(extra)} cm más</text></g>`;
  return s + '</svg>';
}
// Meter el tubo ya doblado por su funda, desde una punta
function coMeter(g, u) {
  const pts = g.arco.pts, P = g.arco.P, a = g.a, W = 2 * a + 120, H = g.R + 80, X = x => W / 2 + x, Y = z => H - 30 - z;
  let acc = 0, corte = pts.length;
  for (let i = 1; i < pts.length; i++) { acc += d3(pts[i], pts[i - 1]); if (acc > u * P) { corte = i; break; } }
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Meter el tubo en la funda">`;
  s += `<line x1="0" y1="${Y(0)}" x2="${W}" y2="${Y(0)}" stroke="#39444b" stroke-width="3"/>`;
  s += `<polyline points="${coP(pts.map(p => [p[0], p[2]]), X, Y)}" fill="none" stroke="#1f8f4e" stroke-opacity=".35" stroke-width="26" stroke-linejoin="round"/>`;
  s += `<text x="${X(0)}" y="${Y(g.R) - 22}" font-size="24" text-anchor="middle" class="verde-t">funda</text>`;
  if (corte > 1) s += `<polyline points="${coP(pts.slice(0, corte).map(p => [p[0], p[2]]), X, Y)}" fill="none" stroke="#d9232a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
  const q = pts[Math.min(corte, pts.length) - 1];
  s += `<text x="${X(-a)}" y="${Y(0) + 24}" font-size="20" text-anchor="middle" class="rojo">entra el tubo ↑</text>`;
  if (u > .02 && u < .98) s += `<circle cx="${X(q[0])}" cy="${Y(q[2])}" r="9" fill="#d9232a" stroke="#fff" stroke-width="2"/>`;
  return s + '</svg>';
}
// Sellar sobre la guía curva, como en la plegable
function coGuia() {
  const W = 360, H = 240;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Guía curva">`;
  s += `<rect x="10" y="96" width="160" height="12" fill="#c8a876"/><rect x="20" y="108" width="10" height="110" fill="#a8885a"/><rect x="150" y="108" width="10" height="110" fill="#a8885a"/><text x="90" y="134" font-size="16" text-anchor="middle" class="gris">mesa</text>`;
  s += `<line x1="0" y1="218" x2="${W}" y2="218" stroke="#39444b" stroke-width="3"/><text x="${W - 12}" y="236" font-size="14" text-anchor="end" class="gris">piso</text>`;
  s += `<path d="M150 96 Q290 96 330 216" stroke="#8a5a2b" stroke-width="10" fill="none"/><text x="266" y="178" font-size="16" text-anchor="end" fill="#8a5a2b" style="fill:#8a5a2b">guía curva</text>`;
  s += `<path class="dib" pathLength="1" d="M30 90 L150 90 Q284 90 322 210" stroke="#5462b4" stroke-width="5" fill="none"/>`;
  s += `<path class="dib" style="--d:.6s" pathLength="1" d="M30 84 L150 84 Q280 84 316 206" stroke="#9aa8dc" stroke-width="5" fill="none"/>`;
  s += `<g class="ap" style="--d:1.4s"><text x="60" y="78" font-size="15">los 2 bordes, uno encima del otro</text></g>`;
  s += `<g class="pasa-guia"><rect x="-22" y="-30" width="44" height="26" rx="4" fill="#39444b"/><rect x="-8" y="-44" width="16" height="15" rx="3" fill="#14181b"/><animateMotion dur="3s" fill="freeze" path="M60 84 L150 84 Q280 84 316 206" rotate="auto"/></g>`;
  return s + '</svg>';
}
// Medidas del gajo completo (azul) o de uno de los 2 de abajo (rojo)
function coMedidasGajo(g, piso) {
  const t = piso ? g.piso : g.normal, L = t.Lc, filas = coFilasTodo(t), wm = Math.max(t.sube, t.baja);
  const col = piso ? '#d9232a' : '#5462b4', fondo = piso ? '#f6d0d2' : '#eef1fb', raya = piso ? '#14181b' : '#d9232a';
  const xc = 140 + wm, W = xc + wm + 70, H = L + 80, X = v => xc + v, Y = x => 46 + x;
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Medidas del gajo">${FL}`;
  s += `<path d="M${t.contorno.map(p => `${X(p[1]).toFixed(1)} ${Y(p[0]).toFixed(1)}`).join('L')}Z" fill="${fondo}" stroke="${col}" stroke-width="2.5"/>`;
  s += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(L)}" stroke="${col}" stroke-width="2.5" stroke-dasharray="8 5"/>`;
  s += `<text x="58" y="16" font-size="13" text-anchor="end" class="gris">metro</text><text x="${xc}" y="16" font-size="13" text-anchor="middle" class="rojo">${piso ? 'lado del tubo ← | → lado normal' : '← de la línea a cada lado →'}</text>`;
  s += `<text x="58" y="32" font-size="13" text-anchor="end" class="gris">(cm)</text>`;
  filas.forEach((r, i) => {
    const d = `style="--d:${(i * .08).toFixed(2)}s"`, fin = i === filas.length - 1;
    s += `<g class="ap" ${d}><line x1="${X(-r.dn)}" y1="${Y(r.x)}" x2="${X(r.up)}" y2="${Y(r.x)}" stroke="${raya}" stroke-width="1.6"/>
      <circle cx="${X(r.up)}" cy="${Y(r.x)}" r="3" fill="${raya}"/><circle cx="${X(-r.dn)}" cy="${Y(r.x)}" r="3" fill="${raya}"/>
      <text x="58" y="${Y(r.x) + 5}" font-size="15" text-anchor="end" class="gris">${n1(r.x)}</text>
      <text x="${X(-r.dn) - 7}" y="${Y(r.x) + 5}" font-size="15" text-anchor="end" ${piso ? 'class="rojo"' : ''}>${n1(r.dn)}</text>
      <text x="${X(r.up) + 7}" y="${Y(r.x) + 5}" font-size="15">${n1(r.up)}</text></g>`;
    if (fin) s += `<text x="${xc}" y="${Y(r.x) + 26}" font-size="14" text-anchor="middle" class="gris">otra punta</text>`;
  });
  return s + '</svg>';
}

// Estructura: el tubo recto que se dobla
function coTubo(g, u) {
  const a = g.a, R = g.R, P = g.arco.P, pts = g.arco.pts, W = P + 60, H = R + 170;
  let acc = 0; const rec = pts.map((p, i) => { if (i) acc += d3(p, pts[i - 1]); return [acc - P / 2, 0]; });
  const e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const cur = pts.map((p, i) => [rec[i][0] + (p[0] - rec[i][0]) * e, rec[i][1] + (p[2] - rec[i][1]) * e]);
  const X = x => W / 2 + x, Y = z => H - 100 - z;
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="El tubo se dobla">${FL}`;
  s += `<polyline points="${coP(cur, X, Y)}" fill="none" stroke="#d9232a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (u < .05) s += `${flecha(X(-P / 2), Y(-28), X(P / 2), Y(-28))}<text x="${X(0)}" y="${Y(-28) + 44}" font-size="44" text-anchor="middle" class="co-cota">tubo de ${n1(P)}</text>`;
  if (u >= 1) {
    const w = g.arco.w;
    s += `<g class="ap">${flecha(X(-a), Y(-26), X(a), Y(-26))}<text x="${X(0)}" y="${Y(-26) + 32}" font-size="40" text-anchor="middle" class="co-cota">${n0(2 * a)}</text></g>`;
    if (w > 0) s += `<g class="ap" style="--d:.5s">${flecha(X(-a - 30), Y(0), X(-a - 30), Y(w))}<text x="${X(-a - 40)}" y="${Y(w / 2) + 10}" font-size="40" text-anchor="end" class="co-cota">${n0(w)}</text><text x="${X(-a - 40)}" y="${Y(w / 2) + 38}" font-size="26" text-anchor="end" class="gris">recto</text></g>`;
    s += `<g class="ap" style="--d:1s"><line x1="${X(0)}" y1="${Y(w)}" x2="${X(Math.min(a, R) * Math.cos(.8))}" y2="${Y(w + Math.min(a, R) * Math.sin(.8))}" stroke="#14181b" stroke-width="2.5"/><circle cx="${X(0)}" cy="${Y(w)}" r="5"/><text x="${X(30)}" y="${Y(w + 30)}" font-size="36" class="co-cota">radio ${n0(Math.min(a, R))}</text></g>`;
  }
  return s + '</svg>';
}
function coAbanico(g) {
  const R = g.R, W = 2 * R + 160, H = R + 90, X = y => W / 2 + y, Y = z => H - 40 - z;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Los arcos en abanico">${FL}`;
  s += `<path d="M${X(-R)} ${Y(0)} A${R} ${R} 0 0 1 ${X(R)} ${Y(0)}" fill="#eef1fb" stroke="#5462b4" stroke-width="2"/>`;
  for (let k = 0; k <= 2 * g.N; k++) {
    const th = -Math.PI / 2 + k * g.dTh, x = R * Math.sin(th), z = R * Math.cos(th);
    s += `<line class="ap" style="--d:${(k * .15).toFixed(2)}s" x1="${X(0)}" y1="${Y(0)}" x2="${X(x)}" y2="${Y(z)}" stroke="#d9232a" stroke-width="5" stroke-linecap="round"/>`;
    s += `<text class="ap" style="--d:${(k * .15).toFixed(2)}s" x="${X(x * 1.13)}" y="${Y(z * 1.13) + 8}" font-size="24" text-anchor="middle">${grados(th)}°</text>`;
  }
  const t1 = -g.dTh / 2;
  s += `<g class="ap" style="--d:2s"><path d="M${X(R * Math.sin(-g.dTh) * .84)} ${Y(R * Math.cos(-g.dTh) * .84)} A${R * .84} ${R * .84} 0 0 1 ${X(0)} ${Y(R * .84)}" fill="none" stroke="#14181b" stroke-width="2.5" marker-start="url(#fl2)" marker-end="url(#fl2)"/><text x="${X(R * .7 * Math.sin(t1))}" y="${Y(R * .7 * Math.cos(t1))}" font-size="26" text-anchor="middle" class="co-cota">${n0(R * g.dTh)}</text></g>`;
  s += `<circle cx="${X(0)}" cy="${Y(0)}" r="10" fill="#d9232a" stroke="#fff" stroke-width="3"/><line x1="0" y1="${Y(0)}" x2="${W}" y2="${Y(0)}" stroke="#39444b" stroke-width="3"/>`;
  return s + '</svg>';
}
function coBisagra(g) {
  const n = 2 * g.N + 1, W = 360, H = 230, x0 = 60, paso = Math.min(34, 220 / n);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="La bisagra">`;
  s += `<rect x="${x0 - 30}" y="112" width="${n * paso + 70}" height="14" rx="4" fill="#9aa3a9" stroke="#39444b"/>`;
  s += `<rect x="${x0 - 46}" y="98" width="18" height="42" rx="3" fill="#39444b"/>`;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * paso;
    s += `<g class="ap" style="--d:${(i * .12).toFixed(2)}s"><rect x="${x}" y="60" width="${paso * .55}" height="118" rx="5" fill="#d9232a"/></g>`;
    if (i < n - 1) s += `<rect class="ap" style="--d:${(i * .12 + .06).toFixed(2)}s" x="${x + paso * .6}" y="100" width="${paso * .3}" height="38" rx="2" fill="#f2c200" stroke="#a88400"/>`;
  }
  const xe = x0 + n * paso + 14;
  s += `<g class="ap" style="--d:${(n * .12 + .3).toFixed(2)}s"><rect x="${xe}" y="96" width="22" height="46" rx="3" fill="#14181b"/><text x="${xe + 11}" y="88" font-size="16" text-anchor="middle">tuerca</text></g>`;
  s += `<text x="${x0 + 10}" y="44" font-size="16" class="rojo">punta aplastada de cada arco (${n})</text><text x="${x0 - 37}" y="168" font-size="15" text-anchor="middle">tornillo</text><text x="${x0 + paso * 1.5}" y="${H - 14}" font-size="16" fill="#a88400" style="fill:#a88400">arandelas</text>`;
  return s + '</svg>';
}
// ¿cabe el carro? se prueba en 3D con las esquinas de un carro de 4,5 × 1,8 m
const CO_CARRO = [[90, 225, 72], [88, 160, 96], [72, 75, 148], [72, -60, 148], [88, -130, 98], [90, -225, 72]];
function coDentro(R, a, hc, Lm, [x, y, z]) {
  const yy = Math.max(0, Math.abs(y) - Lm / 2), zz = z - hc;
  if (Math.abs(x) >= a) return false;
  const w = Math.max(0, R - a), b = Math.min(R, a), rp = w + b * Math.sqrt(1 - (x / a) ** 2);
  if (zz < 0) return yy <= rp - 4;   // debajo de la bisagra: el faldón cae derecho
  return Math.hypot(yy, zz) <= rp - 4;
}
function coCabeCarro(L, W, H) {
  const R = Math.min(H, L / 2), hc = H - R, Lm = L - 2 * R;
  return CO_CARRO.every(p => coDentro(R, W / 2, hc, Lm, p));
}
function coLargoMin(W, H) { for (let L = 300; L <= 1200; L += 10) if (coCabeCarro(L, W, H)) return L; return 0; }
// de lado, cortado por la mitad
function coCabe(g) {
  const c = CO.c, L = c.L, H = c.H, W = L + 60, Hv = H + 70, X = y => 30 + L / 2 + y, Y = z => Hv - 30 - z;
  const alto = y => { const d = Math.max(0, Math.abs(y) - g.Lm / 2); return d < g.R ? g.hc + Math.sqrt(g.R * g.R - d * d) : 0; };
  const len = 450, carro = [[-225, 15], [-225, 75], [-200, 92], [-90, 98], [-55, 148], [70, 150], [120, 102], [215, 92], [225, 70], [225, 15]];
  const ok = coCabeCarro(c.L, c.W, c.H);
  const cerr = []; for (let i = 0; i <= 80; i++) { const y = -L / 2 + L * i / 80; cerr.push([y, alto(y)]); }
  let s = `<svg viewBox="0 0 ${W} ${Hv}" role="img" aria-label="¿Cabe el carro?">`;
  s += `<polygon points="${coP(cerr, X, Y)}" fill="#eef1fb" stroke="#5462b4" stroke-width="2.5"/>`;
  s += `<polygon class="ap" points="${coP(carro, X, Y)}" fill="${ok ? '#1f8f4e' : '#d9232a'}" fill-opacity=".8"/>`;
  [-150, 150].forEach(y => { s += `<circle class="ap" cx="${X(y)}" cy="${Y(32)}" r="30" fill="#14181b"/>`; });
  s += `<line x1="0" y1="${Y(0)}" x2="${W}" y2="${Y(0)}" stroke="#39444b" stroke-width="3"/>`;
  s += `<text x="${X(0)}" y="${Y(H) + 40}" font-size="34" text-anchor="middle" class="${ok ? 'verde-t' : 'rojo'}">${ok ? '✔ cabe un carro de 4,5 m' : '✘ las esquinas del carro se salen'}</text>`;
  return s + '</svg>';
}
function coRolloFilas(g) {
  const R = st.aj.rollo, Lmax = Math.max(...g.filas.map(f => f.len)), W = Lmax + 150, fh = R + 26, H = g.filas.length * fh + 10;
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Cómo sale del rollo">`;
  let acum = 0;
  g.filas.forEach((f, i) => {
    const y0 = 6 + i * fh, Yr = y => y0 + R - y;
    acum += f.len;
    s += `<g class="ap" style="--d:${(i * .3).toFixed(1)}s"><rect x="0" y="${y0}" width="${f.len}" height="${R}" fill="#f4f6fb" stroke="#b9c1de"/>`;
    f.items.forEach(it => {
      if (it.tipo === 'gajo') { const t = it.t; s += `<polygon points="${coP(t.contorno, x => x - t.x0, y => Yr(it.y0 + t.baja + y))}" fill="${it.piso ? '#f6d0d2' : '#c4cdec'}" stroke="${it.piso ? '#d9232a' : '#5462b4'}" stroke-width="2"/>`; }
      else s += `<rect x="0" y="${Yr(it.y0 + it.across)}" width="${it.len}" height="${it.across}" fill="#c4cdec" stroke="#5462b4" stroke-width="2"/><text x="${it.len / 2}" y="${Yr(it.y0 + it.across / 2) + 10}" font-size="30" text-anchor="middle">${it.nombre}</text>`;
    });
    s += `<text x="${f.len + 14}" y="${y0 + R / 2 + 14}" font-size="40" class="co-cota">${n1(acum / 100)} m</text></g>`;
  });
  return s + '</svg>';
}
function coRect(L, h, titulo, conVelcro) {
  const W = L + 60, H = h + 110, aj = st.aj;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${titulo}">${FL}`;
  s += `<rect class="ap" x="30" y="20" width="${L}" height="${h}" fill="#c4cdec" stroke="#5462b4" stroke-width="2"/>`;
  s += `<g class="ap" style="--d:.6s">${flecha(30, h + 46, 30 + L, h + 46)}<text x="${30 + L / 2}" y="${h + 88}" font-size="38" text-anchor="middle" class="co-cota">${n1(L)}</text></g>`;
  s += `<g class="ap" style="--d:1s"><text x="${30 + L / 2}" y="${20 + h / 2 + 14}" font-size="38" text-anchor="middle" class="co-cota">${n1(h)}</text></g>`;
  if (conVelcro) s += `<rect class="ap" style="--d:1.4s" x="30" y="20" width="${CO_SOLAPE * 3}" height="${h}" fill="#1f8f4e" opacity=".4"/><rect class="ap" style="--d:1.4s" x="${30 + L - CO_SOLAPE * 3}" y="20" width="${CO_SOLAPE * 3}" height="${h}" fill="#1f8f4e" opacity=".4"/><rect class="ap" style="--d:1.4s" x="30" y="${20 + h - aj.varilla * 3}" width="${L}" height="${aj.varilla * 3}" fill="#8a5a2b" opacity=".4"/>`;
  return s + '</svg>';
}

// =================== las láminas ===================
// Cada escena: { arriba, cuadros: [{ t: frase, svg() | anim:{dur, f(u)} | barra }], abajo }
function coIdx(g) { // índices de gajos (entre arcos) por mitad, del centro hacia afuera
  const ad = [], at = [];
  for (let i = 0; i < g.arcos.length - 1; i++) { const a = g.arcos[i], b = g.arcos[i + 1]; if (!a.gira && !b.gira) continue; if (b.th <= 0 && a.th < 0) ad.push(i); else if (a.th >= 0 && b.th > 0) at.push(i); }
  return { ad: ad.reverse(), at };
}
const CO_ESC = {
  inicio: g => {
    const ix = coIdx(g), N = g.N;
    return { titulo: 'Así es la cochera', cuadros: [
      { t: 'Cerrada tapa todo el carro.', svg: () => co3D(g, { carro: true }) },
      { t: 'Se abre subiendo los arcos de adelante.', anim: { dur: 3200, f: u => co3D(g, { carro: true, abre: Math.sin(u * Math.PI) }) } },
      { t: 'Mueve la barra y ábrela tú.', barra: true },
      { t: `Arcos rojos · ${B('bisagra')}: el punto rojo.`, svg: () => co3D(g, { carro: false, lona: false, etiquetas: [[[0, g.yF - g.R * .6, g.hc + g.R * .95], 'arcos', 'rojo'], [[g.a, g.yA, g.hc - 40], 'bisagra', 'rojo']] }) },
      { t: `Cada pedazo de lona es un ${B('gajo')}: va de un lado al otro.`, anim: { dur: 4200, f: u => co3D(g, { sube: { i: ix.ad[0], u: Math.min(1, Math.max(0, (u - .15) / .75)) }, quieto: true }) } },
      { t: `Son ${B(2 * N)}: del ${B('G1')} al ${B('G' + N)} adelante y del ${B('G' + (N + 1))} al ${B('G' + 2 * N)} atrás.`, svg: () => co3D(g, { nombres: true }) },
    ] };
  },
  medidas: g => ({ titulo: 'Medidas', arriba: coControlesMedidas(), cuadros: [
    { t: 'Medidas de la cochera cerrada.', svg: () => co3D(g, { cotas: true }) },
    { t: coCabeCarro(CO.c.L, CO.c.W, CO.c.H) ? `Cabe un carro de ${B('4,5 m')}.` : `Para un carro de 4,5 m: largo ${B(n1(coLargoMin(CO.c.W, CO.c.H) / 100) + ' m')}.`, svg: () => co3D(g, { carro: true }) },
    { t: 'De lado, con un carro de 4,5 m.', svg: () => coCabe(g) },
  ] }),
  arcos: g => ({ titulo: 'Los arcos', cuadros: [
    { t: `Un tubo de ${B(n1(g.arco.P))} se dobla así.`, anim: { dur: 2600, f: u => coTubo(g, u) } },
    { t: `Haz ${B(g.arcos.length + ' arcos')} iguales.`, svg: () => coTubo(g, 1) },
    { t: `Abiertos en abanico, cada ${B(grados(g.dTh) + '°')}.`, svg: () => coAbanico(g) },
    { t: `De cerca: las puntas van en ${B('un solo tornillo')} y giran.`, anim: { dur: 4000, f: u => coBisagraLado(g, { u: Math.sin(u * Math.PI), quieto: true }) } },
    { t: 'Visto de frente: tubo, arandela, tubo, arandela…', svg: () => coBisagra(g) },
    { t: g.hc > 0 ? `Bisagra a ${B(n0(g.hc) + ' cm')} del piso, en la mitad.` : 'Una bisagra a cada lado, en la mitad del largo.', svg: () => co3D(g, { lona: false, etiquetas: [[[g.a + 20, g.yA, g.hc + 20], 'bisagra', 'rojo']] }) },
  ] }),
  lona: g => ({ titulo: 'Lona', arriba: `<div class="total"><span class="etq">Compra</span><b>${n1(Math.ceil(g.largo / 50) / 2 + .5)} m</b><span>de rollo de ${n0(st.aj.rollo)} cm</span></div>`, cuadros: [
    { t: 'Así salen las piezas del rollo.', svg: () => coRolloFilas(g) },
    { t: g.hc === 0 ? `${B(2 * g.N)} gajos: ${B(2 * g.N - 2)} azules iguales y ${B(2)} rojos más anchos.` : `${B(2 * g.N)} gajos, todos iguales.`, svg: () => coPlantilla(g) },
    { t: `Y ${B(g.arcos.length - (g.hc === 0 ? 2 : 0))} tiras para las fundas de los arcos.`, svg: () => coFunda() },
  ] }),
  cortar: g => {
    const ix = coIdx(g), N = g.N;
    return { titulo: 'Cortar un gajo', cuadros: [
      { t: 'Extiende la lona. Pon pesas.', svg: () => coMesa(g, 1) },
      { t: `Raya la ${B('línea del centro')}, a lo largo.`, svg: () => coMesa(g, 2) },
      { t: `Con el metro, una rayita cada ${B('20 cm')}.`, svg: () => coMesa(g, 3) },
      { t: 'En cada rayita: escuadra y marca a cada lado.', svg: () => coEscuadra(g) },
      { t: `Medidas de cada rayita. Ya traen ${B(n1(st.aj.selle / 2) + ' cm')} para sellar en cada borde.`, svg: () => coMedidasGajo(g, false), alto: true },
      { t: 'Así quedan los puntos.', svg: () => coMesa(g, 4) },
      { t: `Une los puntos con una ${B('regla flexible')}.`, svg: () => coMesa(g, 5) },
      { t: 'Corta por la línea.', svg: () => coMesa(g, 6) },
      { t: `Listo el primero. Escríbele ${B('G1')}.`, svg: () => coMesa(g, 7) },
      { t: g.hc === 0 ? `Úsalo de plantilla: calca y corta ${B(2 * N - 3)} azules más.` : `Úsalo de plantilla: calca y corta los otros ${B(2 * N - 1)}.`, svg: () => coPlantilla(g) },
      ...(g.hc === 0 ? [
        { t: `El ${B('G' + N)} y el ${B('G' + 2 * N)} llegan al piso.`, svg: () => co3D(g, { rojo: [ix.ad[N - 1], ix.at[N - 1]], nombres: true }) },
        { t: 'Ese borde da la vuelta al tubo del arco de la punta.', svg: () => coFundaPiso() },
        { t: `Por eso esos 2 llevan ${B(n1(CO_FUNDA_PISO - st.aj.selle / 2) + ' cm')} más en ese borde.`, svg: () => coExtra(g) },
        { t: `Medidas de los 2 rojos (${B('G' + N)} y ${B('G' + 2 * N)}). Córtalos aparte.`, svg: () => coMedidasGajo(g, true), alto: true },
      ] : []),
    ] };
  },
  rectas: g => ({ titulo: 'Piezas rectas', cuadros: [
    ...g.franjas.map(f => ({ t: `Franja del túnel ${B(f.nombre)}.`, svg: () => coRect(g.largoFranja, f.w, f.nombre) })),
    ...(g.faldon ? [{ t: `Faldón: corta ${B(2)}. Cuelga debajo de la bisagra.`, svg: () => coRect(g.faldon.largo, g.faldon.alto, 'faldón', false) }] : []),
  ] }),
  sellar: g => {
    const ix = coIdx(g), N = g.N, todos = [...ix.ad, ...ix.at], G = k => B('G' + k);
    const pasos = [];
    for (let k = 1; k < N; k++) {
      const ver = ix.ad.slice(0, k + 1), arco = ix.ad[k - 1];
      pasos.push({ t: k === 1 ? `Sella el ${G(1)} con el ${G(2)}. Arranca arriba, en la mitad.` : `Ahora el ${G(k + 1)} al ${G(k)}, igual.`, anim: { dur: 3600, f: u => co3D(g, { ver, rojo: [ix.ad[k]], nombres: true, quieto: true, costura: { k: arco, u } }) } });
    }
    pasos.push({ t: `Haz igual atrás: del ${G(N + 1)} al ${G(2 * N)}.`, svg: () => co3D(g, { ver: todos, rojo: ix.at, nombres: true }) });
    if (g.Lm === 0) pasos.push({ t: `Por último une el ${G(1)} con el ${G(N + 1)}, arriba.`, anim: { dur: 3600, f: u => co3D(g, { ver: todos, nombres: true, quieto: true, costura: { k: ix.at[0], u } }) } });
    else pasos.push({ t: 'Une cada mitad con el túnel del medio.', svg: () => co3D(g, { nombres: true }) });
    return { titulo: 'Sellar', cuadros: [
      { t: `Pon el ${G(1)} y el ${G(2)} lado a lado: punta con punta, rayita con rayita.`, svg: () => coDosGajos(g) },
      { t: `Cada borde trae ${B(n1(st.aj.selle / 2))}: uno encima del otro quedan ${B(n1(st.aj.selle) + ' cm')} para sellar.`, svg: () => coSelle(g) },
      { t: 'Como en la plegable: sobre la guía curva, y sellas avanzando.', svg: () => coGuia() },
      ...pasos,
      { t: `Todas las puntas llegan al tornillo: refuérzalas con un círculo de lona, por dentro y por fuera.`, svg: () => coBisagraLado(g, { lona: true, parche: true }) },
    ] };
  },
  montar: g => ({ titulo: 'Montar', cuadros: [
    { t: `Los arcos van metidos en ${B('fundas')} de lona: sin huecos ni amarres.`, svg: () => co3D(g, { fundas: true }) },
    { t: `Debajo de cada unión de dos gajos se sella una ${B('tira')}: esa es la funda.`, svg: () => coFunda() },
    ...(g.hc === 0 ? [{ t: 'En las puntas, el mismo borde del gajo hace la funda.', svg: () => coFundaPiso() }] : []),
    { t: 'Mete cada tubo ya doblado por su funda, desde una punta.', anim: { dur: 3600, f: u => coMeter(g, u) } },
    { t: 'Atornilla las puntas de los arcos en la bisagra.', svg: () => coBisagraLado(g, { lona: true }) },
  ] }),
  mover: g => ({ titulo: 'Abrir y cerrar', cuadros: [
    { t: 'Cose una manija en el arco de adelante.', svg: () => co3D(g, { manija: true }) },
    { t: 'Sube la manija: se recoge sola.', anim: { dur: 3200, f: u => co3D(g, { manija: true, abre: Math.sin(u * Math.PI / 2) }) } },
    { t: 'Déjala como quieras: mueve la barra.', barra: true },
    { t: `Un ${B('pasador')} en la platina la deja quieta.`, svg: () => coBisagraLado(g, { u: .6, pasador: true }) },
  ], abajo: `<button class="cta verde" id="coCompartir">Enviar medidas por WhatsApp</button>` }),
};
function coControlesMedidas() {
  const c = CO.c;
  const paso = (k, nombre) => `<div class="paso-num"><span class="etq">${nombre} (m)</span>
    <div class="stepper"><button data-co="${k}" data-d="-10" aria-label="Menos ${nombre}">−</button><input data-coin="${k}" type="number" inputmode="decimal" step="0.1" value="${c[k] / 100}"><button data-co="${k}" data-d="10" aria-label="Más ${nombre}">+</button></div></div>`;
  return `<div class="co-tres">${paso('L', 'Largo')}${paso('W', 'Ancho')}${paso('H', 'Alto')}</div>`;
}
function coPasos(g) {
  const ps = [['inicio', 'La cochera'], ['medidas', 'Medidas']];
  if (g.error) return ps;
  ps.push(['arcos', 'Arcos'], ['lona', 'Lona'], ['cortar', 'Cortar']);
  if (g.franjas.length || g.faldon) ps.push(['rectas', 'Piezas rectas']);
  ps.push(['sellar', 'Sellar'], ['montar', 'Montar'], ['mover', 'Abrir y cerrar']);
  return ps;
}

// =================== reproductor ===================
function coParar() { clearTimeout(CO.timer); cancelAnimationFrame(CO.raf); }
function coCuadro(j) {
  coParar();
  const esc = CO.esc, n = esc.cuadros.length;
  CO.f = Math.max(0, Math.min(n - 1, j));
  const cu = esc.cuadros[CO.f], caja = $('#coSvg');
  caja.classList.toggle('alto', !!cu.alto);
  $('#coTxt').innerHTML = cu.t;
  $('#coDots').innerHTML = esc.cuadros.map((_, k) => `<button data-f="${k}" aria-label="Cuadro ${k + 1}" ${k === CO.f ? 'aria-current="true"' : ''}></button>`).join('');
  $('#coPlay').textContent = CO.juega ? '❚❚' : '▶';
  $('#coBarra').hidden = !cu.barra;
  const sigue = ms => { if (CO.juega && !cu.barra) CO.timer = setTimeout(() => { if (CO.f < n - 1) coCuadro(CO.f + 1); else { CO.juega = false; $('#coPlay').textContent = '▶'; } }, ms); };
  if (cu.anim) {
    const t0 = performance.now();
    const paso = now => { const u = Math.min(1, (now - t0) / cu.anim.dur); caja.innerHTML = cu.anim.f(u); if (u < 1) CO.raf = requestAnimationFrame(paso); else sigue(1500); };
    CO.raf = requestAnimationFrame(paso);
  } else if (cu.barra) {
    caja.innerHTML = co3D(CO.g, { carro: true, abre: CO.abre, manija: CO.c.paso > 1 });
    $('#coAbre').value = CO.abre;
  } else { caja.innerHTML = cu.svg(); sigue(3600); }
}

function pintarCochera() {
  coParar();
  const g = CO.g = coCalcular(), ps = coPasos(g);
  CO.c.paso = Math.min(Math.max(0, CO.c.paso), ps.length - 1);
  const i = CO.c.paso, [id] = ps[i];
  $('#pillCarpa').textContent = cocheraNombre();
  $('#coPasos').innerHTML = ps.map(([k, t], j) => `<button data-paso="${j}" ${j === i ? 'aria-current="step"' : ''}><span>${j + 1}</span>${t}</button>`).join('');
  if (g.error && id !== 'inicio' && id !== 'medidas') return;
  const esc = CO.esc = g.error ? { titulo: id === 'medidas' ? 'Medidas' : 'La cochera', arriba: id === 'medidas' ? coControlesMedidas() : '', cuadros: [{ t: g.error, svg: () => '' }] } : CO_ESC[id](g);
  $('#coCuerpo').innerHTML = `<h1>${esc.titulo}</h1>${esc.arriba || ''}
    <div class="co-lamina">
      <div class="co-svg" id="coSvg"></div>
      <div class="co-barra" id="coBarra" hidden><span>Cerrada</span><input type="range" id="coAbre" min="0" max="1" step="0.01" value="0" aria-label="Abrir"><span>Abierta</span></div>
      <p class="co-frase" id="coTxt" aria-live="polite"></p>
      <div class="co-ctrl">
        <button class="co-b" id="coAnt" aria-label="Cuadro anterior">◀</button>
        <div class="co-dots" id="coDots"></div>
        <button class="co-b" id="coPlay" aria-label="Reproducir o pausar"></button>
        <button class="co-b" id="coProx" aria-label="Cuadro siguiente">▶</button>
      </div>
    </div>${esc.abajo || ''}`;
  $('#coAtras').hidden = i === 0;
  $('#coSig').hidden = i === ps.length - 1;
  $('#coSig').textContent = `Siguiente: ${ps[i + 1] ? ps[i + 1][1] : ''} →`;
  const chip = $('#coPasos [aria-current]'); if (chip) chip.scrollIntoView({ block: 'nearest', inline: 'center' });
  coGuardar();
  CO.juega = false;   // el play arranca solo si lo tocan
  coCuadro(0);
}

function coTexto(g) {
  const t0 = g.normal;
  let t = `*${cocheraNombre().toUpperCase()} RETRÁCTIL*\n${g.arcos.length} arcos · tubo de ${n1(g.arco.P)} · cada ${grados(g.dTh)}°\n`;
  t += `\n*Gajos* (${2 * g.N}, un solo molde), punta a punta ${n1(t0.Lc)}\nDesde la punta → a cada lado (los 2 de abajo, lado de abajo):\n`;
  t += t0.filas.map((r, i) => `   ${n1(r.x)} → ${n1((r.up + r.dn) / 2)} (${n1(g.piso.filas[i].dn)})`).join('\n') + '\n';
  if (g.franjas.length) t += `\n*Túnel:* ` + g.franjas.map(f => `${f.nombre} ${n1(f.w)} × ${n1(g.largoFranja)}`).join(' · ') + '\n';
  if (g.faldon) t += `\n*Faldón* (cortar 2): ${n1(g.faldon.largo)} × ${n1(g.faldon.alto)}\n`;
  t += `\n*Lona:* ≈ ${n1(g.largo / 100)} m de rollo de ${n0(st.aj.rollo)}`;
  return t;
}

function coIr(j) { CO.c.paso = j; pintarCochera(); window.scrollTo(0, 0); }
function coFijar(k, cmv) { const [lo, hi] = CO_LIM[k]; CO.c[k] = Math.min(hi, Math.max(lo, Math.round(cmv / 5) * 5)); pintarCochera(); }

$('#v-cochera').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.paso) return coIr(+b.dataset.paso);
  if (b.id === 'coAtras') return coIr(CO.c.paso - 1);
  if (b.id === 'coSig') return coIr(CO.c.paso + 1);
  if (b.dataset.co) return coFijar(b.dataset.co, CO.c[b.dataset.co] + +b.dataset.d);
  if (b.dataset.f) { CO.juega = false; return coCuadro(+b.dataset.f); }
  if (b.id === 'coAnt') { CO.juega = false; return coCuadro(CO.f - 1); }
  if (b.id === 'coProx') { CO.juega = false; return coCuadro(CO.f + 1); }
  if (b.id === 'coPlay') { CO.juega = !CO.juega; if (CO.juega && CO.f === CO.esc.cuadros.length - 1) return coCuadro(0); return coCuadro(CO.f); }
  if (b.id === 'coCompartir') {
    const t = coTexto(CO.g);
    if (navigator.share) { try { await navigator.share({ text: t }); return; } catch (err) { if (err.name === 'AbortError') return; } }
    location.href = 'https://wa.me/?text=' + encodeURIComponent(t);
  }
});
$('#v-cochera').addEventListener('input', e => {
  if (e.target.id !== 'coAbre') return;
  CO.abre = +e.target.value;
  $('#coSvg').innerHTML = co3D(CO.g, { carro: true, abre: CO.abre, manija: CO.c.paso > 1 });
});
$('#v-cochera').addEventListener('change', e => {
  const k = e.target.dataset.coin; if (!k) return;
  const v = parseFloat(String(e.target.value).replace(',', '.'));
  coFijar(k, (v > 0 ? v : CO.c[k] / 100) * 100);
});
$('#tipoCochera').addEventListener('click', () => ir('cochera'));
document.addEventListener('visibilitychange', () => { if (document.hidden) coParar(); });
