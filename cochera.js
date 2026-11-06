'use strict';
// ===== Cochera retráctil: guía VISUAL para alguien que nunca ha cortado lona =====
// Cada paso es una lámina que se dibuja sola, cuadro por cuadro, con una frase corta y los números encima del dibujo.
// Geometría: cerrada es una concha redonda; los arcos de cada punta giran en una bisagra a cada lado y,
// para abrir, suben y se recogen parados uno sobre otro. Todos los arcos son iguales y todos los gajos salen de UN molde.
//   R  = el menor entre el alto y la mitad del largo · hc = alto de la bisagra (faldón) · Lm = túnel fijo del medio

const CO = { c: { L: 500, W: 250, H: 250, paso: 0, ...leerLS('cochera4', {}) }, g: null, f: 0, juega: true, timer: 0, raf: 0, abre: 0 };
const coGuardar = () => guardarLS('cochera4', { L: CO.c.L, W: CO.c.W, H: CO.c.H, paso: CO.c.paso });
const CO_LIM = { L: [300, 900], W: [150, 400], H: [150, 350] };
const CO_SOLAPE = 5, CO_CINTA = 40, CO_FIJO = 100;
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
  return { arriba: rb.map(p => [p[0], p[1] - yc]), abajo: ra.map(p => [p[0], p[1] - yc]), Lc: d2(t0, t1) };
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
  const mPiso = hc > 0 ? aj.selle / 2 : aj.varilla;
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
  g.cintas = g.arcos.reduce((t, ar) => t + Math.floor(g.arco.P / CO_CINTA) + 1, 0);
  g.caja = coCaja(g);
  return g;
}
function coPiezas(g, p) {
  p.items = [];
  for (let n = 0; n < 2 * (p.N - 1); n++) p.items.push({ tipo: 'gajo', t: p.normal, len: p.normal.x1 - p.normal.x0, across: p.normal.ancho, area: p.normal.area, nombre: 'gajo' });
  for (let n = 0; n < 2; n++) p.items.push({ tipo: 'gajo', piso: true, t: p.piso, len: p.piso.x1 - p.piso.x0, across: p.piso.ancho, area: p.piso.area, nombre: 'abajo' });
  const aj = st.aj, P = coArco(g.R, 0, g.a).P;
  if (g.hc > 0) { const f = { largo: P + 2 * CO_SOLAPE, alto: g.hc + aj.selle / 2 + aj.varilla }; for (let n = 0; n < 2; n++) p.items.push({ tipo: 'rect', len: f.largo, across: f.alto, area: f.largo * f.alto, nombre: 'faldón' }); }
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
  if (o.carro) polys.push(...coCarro(g));
  polys.forEach(p => { const pr = p.q.map(coProy); p.pr = pr; p.z = pr.reduce((t, v) => t + v[2], 0) / pr.length; });
  polys.sort((a, b) => b.z - a.z);
  const bx = g.caja, P2 = p => { const v = coProy(p); return `${v[0].toFixed(1)},${v[1].toFixed(1)}`; };
  let s = `<svg viewBox="${bx.x.toFixed(0)} ${bx.y.toFixed(0)} ${bx.w.toFixed(0)} ${bx.h.toFixed(0)}" role="img" aria-label="La cochera en 3D">`;
  // piso
  const pisoQ = [[-g.a - 60, -c.L / 2 - 60, 0], [g.a + 60, -c.L / 2 - 60, 0], [g.a + 60, c.L / 2 + 60, 0], [-g.a - 60, c.L / 2 + 60, 0]];
  s += `<polygon points="${pisoQ.map(P2).join(' ')}" fill="#e3e7ea"/>`;
  const capa = polys.map(p => `<polygon points="${p.pr.map(v => `${v[0].toFixed(1)},${v[1].toFixed(1)}`).join(' ')}" fill="${p.fill}" fill-opacity="${p.op}" ${p.lona ? 'stroke="#5462b4" stroke-opacity=".25" stroke-width=".6"' : ''}/>`).join('');
  s += o.cae ? `<g class="cae">${capa}</g>` : capa;
  if (o.arcos !== false) arcos.forEach((A, k) => { s += `<polyline points="${A.map(P2).join(' ')}" fill="none" stroke="${g.arcos[k].gira ? '#d9232a' : '#39444b'}" stroke-width="${o.lona === false ? 3.5 : 2.2}" stroke-linejoin="round" ${!g.arcos[k].gira ? 'stroke-dasharray="6 4"' : ''}/>`; });
  // bisagras
  [...new Set([g.yF, g.yA])].forEach(y => [-g.a, g.a].forEach(x => { const v = coProy([x, y, g.hc]); s += `<circle cx="${v[0]}" cy="${v[1]}" r="7" fill="#d9232a" stroke="#fff" stroke-width="2"/>`; }));
  if (o.cintas) arcos.forEach(A => {
    let acc = CO_CINTA / 2;
    for (let j = 1; j < A.length; j++) { const d = d3(A[j], A[j - 1]); acc += d; if (acc >= CO_CINTA) { acc -= CO_CINTA; const v = coProy(A[j]); s += `<circle class="ap" style="--d:${(j * .02).toFixed(2)}s" cx="${v[0].toFixed(1)}" cy="${v[1].toFixed(1)}" r="4.5" fill="#1f8f4e" stroke="#fff" stroke-width="1.5"/>`; } }
  });
  if (o.nombres) gajos.forEach((gj, i) => {
    if (gj.tunel || (o.ver && !o.ver.includes(i))) return;
    const m = Math.floor(gj.A.length / 2), p = gj.A[m].map((t, k) => (t + gj.B[m][k]) / 2), v = coProy(p);
    const rojo = o.rojo && o.rojo.includes(i);
    s += `<g class="ap"><circle cx="${v[0]}" cy="${v[1] - 6}" r="20" fill="${rojo ? '#fff' : '#14181b'}"/><text x="${v[0]}" y="${v[1] + 2}" font-size="22" text-anchor="middle" fill="${rojo ? '#d9232a' : '#fff'}" style="fill:${rojo ? '#d9232a' : '#fff'}">${gj.nombre.slice(1)}</text></g>`;
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

// La mesa de corte, vista desde arriba con el gajo parado: se ve media hoja (la otra mitad es igual).
// etapas: 1 lona, 2 línea, 3 rayitas, 4 puntos, 5 varilla, 6 tijera, 7 listo
function coMesa(g, etapa) {
  const t = g.normal, R = st.aj.rollo, L2 = t.Lc / 2, m = 30, W = R + 2 * m, H = L2 + 2 * m + 26, xc = m + R / 2;
  const X = v => xc + v, Y = x => m + x;
  const up = t.up.filter(p => p[0] <= L2 + .5), dn = t.dn.filter(p => p[0] <= L2 + .5);
  const camino = 'M' + up.slice().reverse().map(p => `${X(p[1]).toFixed(1)} ${Y(p[0]).toFixed(1)}`).join('L') + 'L' + dn.map(p => `${X(p[1]).toFixed(1)} ${Y(p[0]).toFixed(1)}`).join('L');
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Mesa de corte">${FL}`;
  s += `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="6" fill="#e8dcc4"/>`;
  s += `<rect class="${etapa === 1 ? 'desenrolla-v' : ''}" x="${m}" y="${m - 14}" width="${R}" height="${L2 + 28}" fill="#eef1fb" stroke="#b9c1de"/>`;
  [[m, m - 6], [m + R, m - 6], [m, m + L2 + 6], [m + R, m + L2 + 6]].forEach(([x, y], i) => { s += `<g class="${etapa === 1 ? 'ap' : ''}" style="--d:${.7 + i * .15}s">${IC.pesa(x, y, 12)}</g>`; });
  s += `<text x="${xc}" y="${H - 8}" font-size="11" text-anchor="middle" class="gris">↓ sigue: la otra mitad es igual</text>`;
  if (etapa === 1) s += `<g class="ap" style="--d:1.2s">${flecha(m, m + L2 / 2, m + R, m + L2 / 2, '#14181b', 1.5)}<text x="${xc}" y="${m + L2 / 2 - 6}" font-size="14" text-anchor="middle" class="co-cota">${n0(R)}</text></g>`;
  if (etapa >= 2) {
    s += `<line class="${etapa === 2 ? 'dib' : ''}" pathLength="1" x1="${xc}" y1="${Y(0)}" x2="${xc}" y2="${Y(L2)}" stroke="#5462b4" stroke-width="2.5" ${etapa > 2 ? 'stroke-dasharray="7 4"' : ''}/>`;
    if (etapa === 2) s += `<g class="ap" style="--d:1.2s">${flecha(m, m + 40, xc, m + 40, '#5462b4', 1.5)}${flecha(xc, m + 40, m + R, m + 40, '#5462b4', 1.5)}
      <text x="${(m + xc) / 2}" y="${m + 34}" font-size="13" text-anchor="middle" class="azul">${n1(R / 2)}</text><text x="${(xc + m + R) / 2}" y="${m + 34}" font-size="13" text-anchor="middle" class="azul">${n1(R / 2)}</text>
      <text x="${xc + 6}" y="${m + L2 * .6}" font-size="13" class="co-cota">${n1(t.Lc)} en total</text></g>`;
  }
  if (etapa >= 3) t.filas.forEach((r, i) => {
    const d = `style="--d:${(i * .1).toFixed(2)}s"`, cl = etapa === 3 ? 'ap' : '';
    s += `<line class="${cl}" ${d} x1="${xc - 5}" y1="${Y(r.x)}" x2="${xc + 5}" y2="${Y(r.x)}" stroke="#d9232a" stroke-width="2"/>`;
    if (etapa === 3) s += `<text class="ap" ${d} x="${xc - 8}" y="${Y(r.x) + 4}" font-size="10" text-anchor="end">${Math.abs(r.x - L2) < .1 ? 'mitad' : n0(r.x)}</text>`;
  });
  if (etapa >= 4 && etapa < 7) t.filas.forEach((r, i) => {
    const cl = etapa === 4 ? 'ap' : '', d = `style="--d:${(i * .09).toFixed(2)}s"`;
    s += `<circle class="${cl}" ${d} cx="${X(r.up)}" cy="${Y(r.x)}" r="2.6" fill="#d9232a"/><circle class="${cl}" ${d} cx="${X(-r.dn)}" cy="${Y(r.x)}" r="2.6" fill="#d9232a"/>`;
  });
  if (etapa === 5) s += `<path class="dib lento" pathLength="1" d="${camino}" fill="none" stroke="#8a5a2b" stroke-width="4" stroke-linecap="round"/>`;
  if (etapa === 6) s += `<path d="${camino}" fill="none" stroke="#14181b" stroke-width="2"/><g>${IC.tijera(1.1)}<animateMotion dur="3s" fill="freeze" rotate="auto" path="${camino}"/></g>`;
  if (etapa >= 7) s += `<path class="levanta" d="${camino}Z" fill="#c4cdec" stroke="#14181b" stroke-width="2"/><text class="ap" style="--d:.6s" x="${xc}" y="${Y(L2 * .55)}" font-size="26" text-anchor="middle">G1</text>`;
  return s + '</svg>';
}

// Las medidas del gajo: media hoja parada, con cada medida escrita a la altura de su rayita
function coMedidasGajo(g, piso) {
  const t = piso ? g.piso : g.normal, L2 = t.Lc / 2, wmax = Math.max(t.sube, t.baja), mx = 70, W = 2 * wmax + 2 * mx + 40, H = L2 + 60;
  const X = v => mx + wmax + v, Y = x => 30 + x;
  const lado = t.contorno.filter(p => p[0] <= L2 + .5);
  const up = t.up.filter(p => p[0] <= L2 + .5).map(p => [p[1], p[0]]), dn = t.dn.filter(p => p[0] <= L2 + .5).map(p => [p[1], p[0]]);
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Medidas del gajo">${FL}`;
  s += `<path d="${coPath([...up, ...dn.slice().reverse()], v => X(v), Y)}" fill="#eef1fb" stroke="#5462b4" stroke-width="2"/>`;
  s += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(L2)}" stroke="#5462b4" stroke-width="2.5" stroke-dasharray="8 5"/>`;
  t.filas.forEach((r, i) => {
    const d = `style="--d:${(i * .12).toFixed(2)}s"`;
    s += `<g class="ap" ${d}><line x1="${X(-r.dn)}" y1="${Y(r.x)}" x2="${X(r.up)}" y2="${Y(r.x)}" stroke="#d9232a" stroke-width="1.6"/>
      <circle cx="${X(r.up)}" cy="${Y(r.x)}" r="3" fill="#d9232a"/><circle cx="${X(-r.dn)}" cy="${Y(r.x)}" r="3" fill="#d9232a"/>
      <text x="${mx - 8}" y="${Y(r.x) + 5}" font-size="14" text-anchor="end" class="gris">${Math.abs(r.x - L2) < .1 ? 'mitad' : n0(r.x)}</text>
      <text x="${X(wmax) + 12}" y="${Y(r.x) + 6}" font-size="17">${n1(piso ? r.dn : (r.up + r.dn) / 2)}</text></g>`;
  });
  s += `<text x="${mx - 8}" y="18" font-size="13" text-anchor="end" class="gris">desde la punta</text><text x="${X(wmax) + 12}" y="18" font-size="13" class="rojo">${piso ? 'lado de abajo' : 'a cada lado'}</text>`;
  s += `<text x="${X(0)}" y="${Y(L2) + 26}" font-size="15" text-anchor="middle">⇅ la otra mitad es igual</text>`;
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
  s += `<text x="${cx}" y="${H - 14}" font-size="15" text-anchor="middle" class="gris">metro sobre la línea · escuadra · marca a cada lado</text>`;
  return s + '</svg>';
}

// El gajo de abajo: su borde de abajo lleva más tela
function coBordeAbajo(g) {
  const aj = st.aj, W = 360, H = 210, piso = g.hc === 0;
  const tira = (x, extra, titulo, col) => `<g transform="translate(${x},0)">
    <text x="80" y="24" font-size="17" text-anchor="middle">${titulo}</text>
    <rect x="20" y="40" width="120" height="90" fill="#eef1fb" stroke="#5462b4"/>
    <rect x="20" y="130" width="120" height="${extra * 12}" fill="${col}" opacity=".35" stroke="${col}"/>
    <line x1="20" y1="130" x2="140" y2="130" stroke="#5462b4" stroke-width="2" stroke-dasharray="6 4"/>
    ${flecha(152, 130, 152, 130 + extra * 12, col, 2)}<text x="158" y="${136 + extra * 6}" font-size="20" class="co-cota">${n1(extra)}</text></g>`;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Borde de abajo">${FL}`;
  s += tira(0, aj.selle / 2, 'gajo', '#5462b4');
  s += tira(180, piso ? aj.varilla : aj.selle / 2, 'gajo de abajo', '#d9232a');
  if (piso) s += `<g class="ap" style="--d:.8s"><circle cx="${260}" cy="${130 + aj.varilla * 6}" r="5" fill="#8a5a2b"/><text x="260" y="${H - 8}" font-size="15" text-anchor="middle" class="gris">ahí va la varilla</text></g>`;
  return s + '</svg>';
}

// Plantilla: el primero sirve para cortar todos
function coPlantilla(g) {
  const t = g.normal, n = 2 * g.N, L = t.Lc, h = t.ancho, W = L + 80, H = h + (n - 1) * 26 + 40;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Todos los gajos iguales">`;
  for (let i = n - 1; i >= 0; i--) {
    const piso = i >= n - 2, dx = 20 + i * 8, dy = 20 + i * 26, tt = piso ? g.piso : t;
    s += `<g class="ap" style="--d:${(i * .25).toFixed(2)}s" transform="translate(${dx},${dy + tt.sube})"><polygon points="${coP(tt.contorno, x => x, y => -y)}" fill="${piso ? '#f6d0d2' : '#e3e8f8'}" stroke="${piso ? '#d9232a' : '#5462b4'}" stroke-width="2"/></g>`;
  }
  s += `<text x="${W / 2}" y="${H - 8}" font-size="26" text-anchor="middle">${2 * (g.N - 1)} azules + 2 rojos (los de abajo)</text>`;
  return s + '</svg>';
}

// Sellar: dos piezas montadas, la selladora pasa
function coSelle(g) {
  const aj = st.aj, W = 360, H = 220;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Sellar">${FL}`;
  s += `<rect x="20" y="40" width="320" height="70" fill="#d7ddf3" stroke="#5462b4"/>`;
  s += `<g class="baja"><rect x="20" y="96" width="320" height="70" fill="#c4cdec" stroke="#5462b4" opacity=".92"/></g>`;
  s += `<rect class="ap" style="--d:1s" x="20" y="96" width="320" height="14" fill="#d9232a" opacity=".45"/>`;
  s += `<g class="ap" style="--d:1s">${flecha(348, 96, 348, 110, '#d9232a', 2)}<text x="300" y="30" font-size="22" class="rojo">${n1(aj.selle)} cm</text><line x1="320" y1="34" x2="346" y2="100" stroke="#d9232a"/></g>`;
  s += `<g class="pasa"><rect x="0" y="86" width="44" height="34" rx="4" fill="#39444b"/><rect x="8" y="70" width="28" height="18" rx="3" fill="#14181b"/></g>`;
  s += `<text x="${W / 2}" y="${H - 14}" font-size="16" text-anchor="middle" class="gris">una encima de la otra · pasa la selladora</text>`;
  return s + '</svg>';
}
function coMitades(g) {
  const t = g.normal, L = t.Lc, W = L + 60, H = t.ancho * 2 + 90, sc = 1;
  const X = x => 30 + x;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Empieza en la mitad">${FL}`;
  [0, 1].forEach(k => { const y0 = 20 + t.sube + k * (t.ancho - 3); s += `<polygon points="${coP(t.contorno, X, y => y0 - y)}" fill="${k ? '#c4cdec' : '#e3e8f8'}" stroke="#5462b4" stroke-width="2" ${k ? 'class="baja"' : ''}/>`; });
  const yj = 20 + t.sube + t.baja;
  s += `<g class="ap" style="--d:.8s"><line x1="${X(L / 2)}" y1="${yj - 22}" x2="${X(L / 2)}" y2="${yj + 22}" stroke="#d9232a" stroke-width="5"/><text x="${X(L / 2)}" y="${yj - 30}" font-size="24" text-anchor="middle" class="rojo">mitad con mitad</text></g>`;
  s += `<g class="ap" style="--d:1.6s">${flecha(X(L / 2) + 14, yj + 36, X(L - 20), yj + 36, '#1f8f4e', 4)}${flecha(X(L / 2) - 14, yj + 36, X(20), yj + 36, '#1f8f4e', 4)}<text x="${X(L / 2)}" y="${yj + 66}" font-size="24" text-anchor="middle" class="verde-t">sella hacia las puntas</text></g>`;
  return s + '</svg>';
}
function coRefuerzo(g) {
  const W = 360, H = 240, cx = 180, cy = 150;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Refuerzo de la bisagra">`;
  for (let k = 0; k < 7; k++) { const a = Math.PI * (1 - k / 6); s += `<line x1="${cx}" y1="${cy}" x2="${cx + 170 * Math.cos(a)}" y2="${cy - 140 * Math.sin(a)}" stroke="#5462b4" stroke-width="2"/>`; }
  s += `<path d="M10 ${cy} L${cx} ${cy} L350 ${cy}" stroke="#14181b" stroke-width="2"/>`;
  s += `<circle class="ap" style="--d:.5s" cx="${cx}" cy="${cy}" r="48" fill="#c4cdec" stroke="#14181b" stroke-width="2"/>`;
  s += `<circle class="ap" style="--d:1.2s" cx="${cx}" cy="${cy}" r="7" fill="#fff" stroke="#14181b" stroke-width="2"/>`;
  s += `<text class="ap" style="--d:.5s" x="${cx + 56}" y="${cy + 40}" font-size="18">círculo de 30</text><text class="ap" style="--d:1.2s" x="${cx + 14}" y="${cy - 14}" font-size="16" class="rojo">hueco del tornillo</text>`;
  s += `<text x="${W / 2}" y="${H - 10}" font-size="15" text-anchor="middle" class="gris">uno por dentro y otro por fuera</text>`;
  return s + '</svg>';
}
function coCinta() {
  const W = 360, H = 200;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cinta de amarre">`;
  s += `<rect x="20" y="40" width="320" height="22" fill="#c4cdec" stroke="#5462b4"/><text x="30" y="32" font-size="16" class="gris">lona</text>`;
  s += `<circle cx="180" cy="90" r="20" fill="#d9232a"/><text x="244" y="96" font-size="16" class="rojo">arco (tubo)</text>`;
  s += `<path class="dib" pathLength="1" d="M160 62 C130 90 140 128 180 128 C220 128 230 90 200 62" fill="none" stroke="#1f8f4e" stroke-width="7"/>`;
  s += `<text x="${W / 2}" y="${H - 12}" font-size="16" text-anchor="middle">cinta con velcro · una cada ${CO_CINTA} cm</text>`;
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
  s += `<g class="ap" style="--d:${(n * .12 + .3).toFixed(2)}s"><rect x="${xe}" y="96" width="22" height="46" rx="3" fill="#14181b"/><text x="${xe + 11}" y="88" font-size="16" text-anchor="middle">seguro</text></g>`;
  s += `<text x="${x0 + 10}" y="44" font-size="16" class="rojo">${n} arcos</text><text x="${x0 + paso * 1.5}" y="${H - 14}" font-size="16" fill="#a88400" style="fill:#a88400">arandelas</text>`;
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
  inicio: g => ({ titulo: 'Así es la cochera', cuadros: [
    { t: 'Cerrada tapa todo el carro.', svg: () => co3D(g, { carro: true }) },
    { t: 'Se abre subiendo los arcos de adelante.', anim: { dur: 3200, f: u => co3D(g, { carro: true, abre: Math.sin(u * Math.PI) }) } },
    { t: 'Mueve la barra y ábrela tú.', barra: true },
    { t: `Arcos rojos · ${B('bisagra')}: el punto rojo.`, svg: () => co3D(g, { carro: false, lona: false, etiquetas: [[[0, g.yF - g.R * .6, g.hc + g.R * .95], 'arcos', 'rojo'], [[g.a, g.yA, g.hc - 40], 'bisagra', 'rojo']] }) },
    { t: `La lona son ${B(2 * g.N + ' gajos')} iguales.`, svg: () => co3D(g, { nombres: true }) },
  ] }),
  medidas: g => ({ titulo: 'Medidas', arriba: coControlesMedidas(), cuadros: [
    { t: 'Medidas de la cochera cerrada.', svg: () => co3D(g, { cotas: true }) },
    { t: coCabeCarro(CO.c.L, CO.c.W, CO.c.H) ? `Cabe un carro de ${B('4,5 m')}.` : `Para un carro de 4,5 m: largo ${B(n1(coLargoMin(CO.c.W, CO.c.H) / 100) + ' m')}.`, svg: () => co3D(g, { carro: true }) },
    { t: 'De lado, con un carro de 4,5 m.', svg: () => coCabe(g) },
  ] }),
  arcos: g => ({ titulo: 'Los arcos', cuadros: [
    { t: `Un tubo de ${B(n1(g.arco.P))} se dobla así.`, anim: { dur: 2600, f: u => coTubo(g, u) } },
    { t: `Haz ${B(g.arcos.length + ' arcos')} iguales.`, svg: () => coTubo(g, 1) },
    { t: `Abiertos en abanico, cada ${B(grados(g.dTh) + '°')}.`, svg: () => coAbanico(g) },
    { t: 'Todos en el mismo tornillo, con arandelas.', svg: () => coBisagra(g) },
    { t: g.hc > 0 ? `Bisagra a ${B(n0(g.hc) + ' cm')} del piso, en la mitad.` : 'La bisagra va en el piso, en la mitad.', svg: () => co3D(g, { lona: false, etiquetas: [[[g.a + 20, g.yA, g.hc + 20], 'bisagra', 'rojo']] }) },
  ] }),
  lona: g => ({ titulo: 'Lona', arriba: `<div class="total"><span class="etq">Compra</span><b>${n1(Math.ceil(g.largo / 50) / 2 + .5)} m</b><span>de rollo de ${n0(st.aj.rollo)} cm</span></div>`, cuadros: [
    { t: 'Así salen las piezas del rollo.', svg: () => coRolloFilas(g) },
    { t: `${B(2 * (g.N - 1))} gajos azules + ${B(2)} rojos.`, svg: () => coPlantilla(g) },
  ] }),
  cortar: g => ({ titulo: 'Cortar un gajo', cuadros: [
    { t: 'Extiende la lona. Pon pesas.', svg: () => coMesa(g, 1) },
    { t: `Raya la ${B('línea del centro')}.`, svg: () => coMesa(g, 2) },
    { t: `Rayita cada ${B('20 cm')}.`, svg: () => coMesa(g, 3) },
    { t: 'En cada rayita: escuadra y marca a cada lado.', svg: () => coEscuadra(g) },
    { t: 'Estas son las medidas de cada rayita.', svg: () => coMedidasGajo(g, false), alto: true },
    { t: 'Así quedan los puntos.', svg: () => coMesa(g, 4) },
    { t: `Une los puntos con la ${B('varilla')}.`, svg: () => coMesa(g, 5) },
    { t: 'Corta por la línea.', svg: () => coMesa(g, 6) },
    { t: `Listo el primero. Escríbele ${B('G1')}.`, svg: () => coMesa(g, 7) },
    { t: 'Úsalo de plantilla para los demás.', svg: () => coPlantilla(g) },
    { t: `Los 2 de abajo: ese borde lleva más.`, svg: () => coBordeAbajo(g) },
    { t: 'Medidas del borde de abajo.', svg: () => coMedidasGajo(g, true), alto: true },
  ] }),
  rectas: g => ({ titulo: 'Piezas rectas', cuadros: [
    ...g.franjas.map(f => ({ t: `Franja del túnel ${B(f.nombre)}.`, svg: () => coRect(g.largoFranja, f.w, f.nombre) })),
    ...(g.faldon ? [{ t: `Faldón: corta ${B(2)}. Verde = velcro.`, svg: () => coRect(g.faldon.largo, g.faldon.alto, 'faldón', true) }] : []),
  ] }),
  sellar: g => {
    const ix = coIdx(g), todos = [...ix.ad, ...ix.at], vis = [];
    const pasos = [];
    ix.ad.forEach((i, k) => { vis.push(i); const v = vis.slice(); pasos.push({ t: k ? `Pega el ${B('G' + (k + 1))}.` : `Empieza por el ${B('G1')}, el de arriba.`, svg: () => co3D(g, { ver: v, rojo: [i], nombres: true, lona: true }) }); });
    pasos.push({ t: 'Haz igual la otra mitad.', svg: () => co3D(g, { ver: todos, rojo: ix.at, nombres: true }) });
    return { titulo: 'Sellar', cuadros: [
      { t: `Monta una sobre otra ${B(n1(st.aj.selle) + ' cm')}.`, svg: () => coSelle(g) },
      { t: 'Empieza en la mitad y sigue a las puntas.', svg: () => coMitades(g) },
      ...pasos,
      { t: 'Refuerzo redondo en la bisagra.', svg: () => coRefuerzo(g) },
    ] };
  },
  montar: g => ({ titulo: 'Montar', cuadros: [
    { t: 'Arma los arcos cerrados.', svg: () => co3D(g, { lona: false }) },
    { t: 'Pon la lona encima.', svg: () => co3D(g, { cae: true }) },
    { t: `Amarra a cada arco: ${B(g.cintas + ' cintas')}.`, svg: () => co3D(g, { cintas: true }) },
    { t: 'Así va cada cinta.', svg: () => coCinta() },
  ] }),
  mover: g => ({ titulo: 'Abrir y cerrar', cuadros: [
    { t: 'Cose una manija en el arco de adelante.', svg: () => co3D(g, { manija: true }) },
    { t: 'Sube la manija: se recoge sola.', anim: { dur: 3200, f: u => co3D(g, { manija: true, abre: Math.sin(u * Math.PI / 2) }) } },
    { t: 'Déjala como quieras: mueve la barra.', barra: true },
    { t: 'El seguro la deja quieta.', svg: () => coBisagra(g) },
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
  CO.juega = true;
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
