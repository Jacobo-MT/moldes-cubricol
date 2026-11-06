'use strict';
// ===== Cochera plegable: guía paso a paso para alguien que nunca ha cortado lona =====
// Forma: túnel de arcos (paredes rectas + medio círculo arriba). Cada punta puede ser
// redonda (arcos que giran sobre la misma bisagra → gajos), plana (culata) o abierta (boca).

const CO = { c: { L: 500, W: 250, H: 250, atras: 'redondo', frente: 'abierto', paso: 0, hechos: {}, ...leerLS('cochera', {}) }, g: null };
const coGuardar = () => guardarLS('cochera', CO.c);
const CO_EXT = { abierto: 'Abierta', redondo: 'Redonda', plano: 'Plana' };
const CO_LIM = { L: [200, 1000], W: [150, 400], H: [150, 350] };
function cocheraNombre() { const c = CO.c; return `Cochera ${n1(c.L / 100)}×${n1(c.W / 100)}×${n1(c.H / 100)}`; }

// ---------- geometría ----------
// Perfil del arco visto de frente, de pie a pie por encima. Paredes rectas hasta hw, luego media elipse.
function coPerfil(W, H) {
  const a = W / 2, hw = Math.max(0, H - a), b = Math.min(H, a), pts = [];
  if (hw > 0) for (let i = 0; i <= 40; i++) pts.push([-a, hw * i / 40]);
  for (let i = hw > 0 ? 1 : 0; i <= 300; i++) { const f = Math.PI * (1 - i / 300); pts.push([a * Math.cos(f), hw + b * Math.sin(f)]); }
  if (hw > 0) for (let i = 39; i >= 0; i--) pts.push([a, hw * i / 40]);
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const P = s[s.length - 1];
  const zEn = d => {
    d = Math.min(P, Math.max(0, d));
    let lo = 0, hi = s.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m] <= d) lo = m; else hi = m; }
    const t = (d - s[lo]) / ((s[hi] - s[lo]) || 1);
    return pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t;
  };
  return { a, hw, b, pts, P, zEn, curvaLargo: P - 2 * hw };
}

// Mitad derecha del contorno de la culata, con selle alrededor y dobladillo abajo: [[altura, medio ancho], …]
function coMitadCulata(p, m, v) {
  const out = [[0, p.a + m]];
  if (p.hw > 0) out.push([v + p.hw, p.a + m]);
  for (let i = p.hw > 0 ? 1 : 0; i <= 200; i++) {
    const f = Math.PI / 2 * i / 200, c = Math.cos(f), sn = Math.sin(f);
    const nx = c / p.a, nz = sn / p.b, nl = Math.hypot(nx, nz);
    out.push([v + p.hw + p.b * sn + m * nz / nl, p.a * c + m * nx / nl]);
  }
  return out;
}
function coInterp(tabla, y) {
  if (y <= tabla[0][0]) return tabla[0][1];
  for (let i = 1; i < tabla.length; i++) {
    const [y1, x1] = tabla[i - 1], [y2, x2] = tabla[i];
    if (y <= y2) return x1 + (x2 - x1) * ((y - y1) / ((y2 - y1) || 1));
  }
  return 0;
}

function coCalcular() {
  const c = CO.c, aj = st.aj, gap = 2, sel = aj.selle, v = aj.varilla, R = aj.rollo;
  const p = coPerfil(c.W, c.H);
  const fondo = e => e === 'redondo' ? c.H : 0;
  const df = fondo(c.frente), Lb = c.L - df - fondo(c.atras);
  const marg = e => e === 'abierto' ? v : sel / 2;
  const g = { p, df, Lb, error: '', franjas: [], gajos: null, culata: null, Lt: p.P + 2 * v };
  if (Lb < 0) { g.error = `Con las dos puntas así, el largo tiene que ser de al menos ${n1((c.L - Lb) / 100)} m (cada punta redonda ocupa lo mismo que el alto).`; return g; }

  // Cuerpo: franjas a lo ancho del rollo, cada una del largo del arco
  if (Lb > 0) {
    const need = Lb + marg(c.frente) + marg(c.atras);
    const n = Math.max(1, Math.ceil((need - sel) / (R - sel) - 1e-9));
    const total = need + (n - 1) * sel, ws = Array(n).fill(R);
    ws[n - 1] = total - (n - 1) * R;
    if (n > 1 && ws[n - 1] < 40) { const dos = R + ws[n - 1]; ws[n - 2] = ws[n - 1] = dos / 2; }
    let x = df - marg(c.frente);
    g.franjas = ws.map((w, i) => { const f = { w, nombre: 'F' + (i + 1), x0: x }; x += w - sel; return f; });
    g.costurasCuerpo = g.franjas.slice(1).map(f => f.x0 + sel / 2);
  }

  // Puntas redondas: gajos (la menor cantidad que gaste menos rollo)
  const redondas = ['frente', 'atras'].filter(e => c[e] === 'redondo');
  if (redondas.length) {
    let mejor = null;
    for (let N = 2; N <= 14; N++) {
      const t = Math.tan(Math.PI / (4 * N)), wN = 2 * c.H * t + sel, wE = 2 * c.H * t + sel / 2 + v;
      if (wE > R || wN > R) continue;
      const k = Math.max(1, Math.floor((R + gap) / (Math.max(wN, wE) + gap)));
      const rollo = Math.ceil(N * redondas.length / k) * (p.P + gap);
      if (!mejor || rollo < mejor.rollo - 1) mejor = { N, t, wN, wE, k, rollo };
    }
    if (!mejor) { g.error = 'Con ese alto los gajos no caben en el rollo.'; return g; }
    const tabla = [];
    for (let d = 0; d < p.P / 2 - 5; d += 20) tabla.push(d);
    tabla.push(p.P / 2);
    mejor.tabla = tabla.map(d => { const h = p.zEn(d) * mejor.t; return { d, h, normal: h + sel / 2, piso: h + v, union: h + sel / 2 }; });
    mejor.extremos = redondas;
    g.gajos = mejor;
  }

  // Puntas planas: culata, en piezas del ancho del rollo apiladas de abajo hacia arriba
  const planas = ['frente', 'atras'].filter(e => c[e] === 'plano');
  if (planas.length) {
    const mit = coMitadCulata(p, sel / 2, v), Hc = v + c.H + sel / 2, anch = y => coInterp(mit, y), piezas = [];
    let y0 = 0;
    for (;;) { const y1 = Math.min(y0 + R, Hc); piezas.push({ y0, y1 }); if (y1 >= Hc - 1e-6) break; y0 = y1 - sel; }
    piezas.forEach((pz, i) => {
      pz.alto = pz.y1 - pz.y0; pz.abajo = 2 * anch(pz.y0);
      pz.arriba = i === piezas.length - 1 ? 0 : 2 * anch(pz.y1);
      pz.nombre = piezas.length === 1 ? 'C1' : 'C' + (i + 1);
      pz.tabla = [];
      for (let y = pz.y0; y < pz.y1 - 3; y += 10) pz.tabla.push([y - pz.y0, anch(y)]);
      pz.tabla.push([pz.alto, anch(pz.y1)]);
      pz.tabla = pz.tabla.filter((r, j, t) => j === 0 || j === t.length - 1 || Math.abs(r[1] - t[j - 1][1]) > .05 || Math.abs(r[1] - t[j + 1][1]) > .05);
    });
    g.culata = { piezas, anch, Hc, ancho: 2 * (p.a + sel / 2), extremos: planas };
  }

  coAcomodo(g);
  return g;
}

// Acomodo en el rollo: piezas del mismo largo se ponen lado a lado si caben a lo ancho
function coAcomodo(g) {
  const aj = st.aj, R = aj.rollo, gap = 2, items = [];
  g.franjas.forEach(f => items.push({ tipo: 'franja', len: g.Lt, across: f.w, f, nombre: f.nombre }));
  if (g.gajos) {
    let k = 1;
    g.gajos.extremos.forEach(() => {
      for (let i = 0; i < g.gajos.N; i++) {
        const orilla = i === g.gajos.N - 1;
        items.push({ tipo: 'gajo', len: g.p.P, across: orilla ? g.gajos.wE : g.gajos.wN, orilla, nombre: 'G' + k++ });
      }
    });
  }
  if (g.culata) g.culata.extremos.forEach(() => g.culata.piezas.forEach(pz => items.push({ tipo: 'culata', len: g.culata.ancho, across: pz.alto, pz, nombre: pz.nombre })));
  items.sort((a, b) => b.len - a.len || b.across - a.across);
  const filas = [];
  items.forEach(it => {
    let f = filas.find(f => Math.abs(f.len - it.len) < 0.5 && f.used + gap + it.across <= R + 1e-6);
    if (!f) { f = { len: it.len, used: -gap, items: [] }; filas.push(f); }
    it.y0 = f.used + gap; f.used = it.y0 + it.across; f.items.push(it);
  });
  let x = 0;
  filas.forEach(f => { f.x0 = x; x += f.len + gap; });
  g.filas = filas; g.items = items; g.rolloLargo = Math.max(0, x - gap);

  // área de lona que de verdad queda en piezas
  let area = 0;
  items.forEach(it => {
    if (it.tipo === 'franja') area += it.across * it.len;
    else if (it.tipo === 'gajo') {
      for (let s = 0; s < it.len; s += 2) { const h = g.p.zEn(s + 1) * g.gajos.t; area += 2 * (2 * h + aj.selle / 2 + (it.orilla ? aj.varilla : aj.selle / 2)); }
    } else for (let y = it.pz.y0; y < it.pz.y1; y += 1) area += 2 * g.culata.anch(y + .5) * Math.min(1, it.pz.y1 - y);
  });
  g.areaPiezas = area;
  g.areaRollo = g.rolloLargo * R;
  g.sobrantes = filas.filter(f => R - f.used >= 20).map(f => ({ ancho: R - f.used, largo: f.len }));
}

// ---------- dibujos ----------
const coP = (arr, X, Y) => arr.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');

function coSvgFrente(g) {
  const c = CO.c, p = g.p, fs = Math.max(c.W, c.H) / 16, mx = fs * 2.4, mt = fs * .8, mb = fs * 2.6;
  const X = x => x + p.a + mx, Y = z => c.H + mt - z;
  let s = `<svg viewBox="0 0 ${(c.W + 2 * mx).toFixed(0)} ${(c.H + mt + mb).toFixed(0)}" role="img" aria-label="La cochera vista de frente">`;
  s += `<polygon class="lona" points="${coP(p.pts, X, Y)}"/>`;
  if (p.hw > 0) s += `<line class="fina" x1="${X(-p.a)}" y1="${Y(p.hw)}" x2="${X(p.a)}" y2="${Y(p.hw)}"/><text x="${X(0)}" y="${Y(p.hw / 2) + fs * .35}" font-size="${fs * .8}" text-anchor="middle" class="gris">pared recta ${n1(p.hw)}</text>`;
  s += `<text x="${X(0)}" y="${Y(p.hw + p.b * .45) + fs * .35}" font-size="${fs * .8}" text-anchor="middle" class="gris">curva</text>`;
  s += `<line class="piso" x1="${X(-p.a) - mx * .7}" y1="${Y(0)}" x2="${X(p.a) + mx * .7}" y2="${Y(0)}"/>`;
  s += `<line class="cota" x1="${X(-p.a)}" y1="${Y(0) + fs}" x2="${X(p.a)}" y2="${Y(0) + fs}"/><text x="${X(0)}" y="${Y(0) + fs * 2.2}" font-size="${fs}" text-anchor="middle">ancho ${n0(c.W)}</text>`;
  const xc = X(p.a) + mx * .45;
  s += `<line class="cota" x1="${xc}" y1="${Y(0)}" x2="${xc}" y2="${Y(c.H)}"/><text x="${xc + fs * .4}" y="${Y(c.H / 2)}" font-size="${fs}" transform="rotate(-90 ${xc + fs * .4} ${Y(c.H / 2)})" text-anchor="middle" dy="${fs * .8}">alto ${n0(c.H)}</text>`;
  return s + '</svg>';
}

function coSvgLado(g, etiquetas) {
  const c = CO.c, H = c.H, L = c.L, df = g.df, Lb = g.Lb, fs = Math.max(L, H) / 26, mx = fs * 1.2, mt = fs * (etiquetas ? 2.4 : 1), mb = fs * 2.6;
  const X = u => u + mx, Y = z => H + mt - z, top = [];
  if (c.frente === 'redondo') for (let i = 0; i <= 40; i++) { const th = Math.PI / 2 * (1 - i / 40); top.push([df - H * Math.sin(th), H * Math.cos(th)]); }
  else top.push([0, 0], [0, H]);
  top.push([df, H], [df + Lb, H]);
  if (c.atras === 'redondo') for (let i = 0; i <= 40; i++) { const th = Math.PI / 2 * i / 40; top.push([df + Lb + H * Math.sin(th), H * Math.cos(th)]); }
  else top.push([L, H], [L, 0]);
  let s = `<svg viewBox="0 0 ${(L + 2 * mx).toFixed(0)} ${(H + mt + mb).toFixed(0)}" role="img" aria-label="La cochera vista de lado">`;
  s += `<polygon class="lona" points="${coP(top, X, Y)}"/>`;
  (g.costurasCuerpo || []).forEach(u => { s += `<line class="union" x1="${X(u)}" y1="${Y(0)}" x2="${X(u)}" y2="${Y(H)}"/>`; });
  const radiales = (u0, dir) => {
    s += `<line class="union" x1="${X(u0)}" y1="${Y(0)}" x2="${X(u0)}" y2="${Y(H)}"/>`;
    for (let k = 1; k < g.gajos.N; k++) { const th = Math.PI / 2 * k / g.gajos.N; s += `<line class="union" x1="${X(u0)}" y1="${Y(0)}" x2="${X(u0 + dir * H * Math.sin(th))}" y2="${Y(H * Math.cos(th))}"/>`; }
    s += `<circle class="punto" cx="${X(u0)}" cy="${Y(0)}" r="${fs * .25}"/>`;
  };
  if (c.frente === 'redondo') radiales(df, -1);
  if (c.atras === 'redondo') radiales(df + Lb, 1);
  if (c.frente === 'abierto') s += `<line class="boca" x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(H)}"/>`;
  if (c.atras === 'abierto') s += `<line class="boca" x1="${X(L)}" y1="${Y(0)}" x2="${X(L)}" y2="${Y(H)}"/>`;
  s += `<line class="piso" x1="0" y1="${Y(0)}" x2="${L + 2 * mx}" y2="${Y(0)}"/>`;
  s += `<line class="cota" x1="${X(0)}" y1="${Y(0) + fs}" x2="${X(L)}" y2="${Y(0) + fs}"/><text x="${X(L / 2)}" y="${Y(0) + fs * 2.2}" font-size="${fs}" text-anchor="middle">largo ${n0(L)}</text>`;
  if (etiquetas) {
    const et = (u, z, t, cl = '') => { s += `<text x="${X(u)}" y="${Y(z)}" font-size="${fs * .9}" text-anchor="middle" class="${cl}">${t}</text>`; };
    if (Lb > 0) et(df + Lb / 2, H + fs * .7, 'cuerpo: franjas');
    if (c.frente === 'redondo') et(df / 2, H * .5, 'gajos', 'rojo'); else et(fs * 2.2, H * .5, c.frente === 'plano' ? 'culata' : 'boca', 'rojo');
    if (c.atras === 'redondo') et(L - H / 2, H * .5, 'gajos', 'rojo'); else et(L - fs * 2.2, H * .5, c.atras === 'plano' ? 'culata' : 'boca', 'rojo');
    et(fs * 1.2, -fs * 1.9, 'frente', 'gris'); et(L - fs * 1.2, -fs * 1.9, 'atrás', 'gris');
  }
  return s + '</svg>';
}

function coSvgFranja(g, f) {
  const L = g.Lt, w = f.w, fs = L / 24, mx = fs * .6, mt = fs * .6, mb = fs * 2;
  let s = `<svg viewBox="0 0 ${(L + 2 * mx).toFixed(0)} ${(w + mt + mb).toFixed(0)}" role="img" aria-label="Franja ${f.nombre}">`;
  s += `<rect class="lona" x="${mx}" y="${mt}" width="${L}" height="${w}"/>`;
  s += `<rect class="gola" x="${mx}" y="${mt}" width="${st.aj.varilla * 3}" height="${w}"/><rect class="gola" x="${mx + L - st.aj.varilla * 3}" y="${mt}" width="${st.aj.varilla * 3}" height="${w}"/>`;
  s += `<text x="${mx + L / 2}" y="${mt + w / 2 + fs * .35}" font-size="${fs}" text-anchor="middle">${f.nombre} · ${n1(w)} de ancho</text>`;
  s += `<line class="cota" x1="${mx}" y1="${mt + w + fs * .6}" x2="${mx + L}" y2="${mt + w + fs * .6}"/><text x="${mx + L / 2}" y="${mt + w + fs * 1.75}" font-size="${fs}" text-anchor="middle">${n1(L)}</text>`;
  return s + '</svg>';
}

function coFormaGajo(g, orilla) {
  const gj = g.gajos, P = g.p.P, aj = st.aj, up = [], dn = [];
  for (let d = 0; d <= P + .01; d += Math.min(4, P / 100)) {
    const h = g.p.zEn(d) * gj.t;
    up.push([d, h + aj.selle / 2]); dn.push([d, -(h + (orilla ? aj.varilla : aj.selle / 2))]);
  }
  return [...up, ...dn.reverse()];
}

function coSvgGajo(g, orilla) {
  const gj = g.gajos, P = g.p.P, aj = st.aj, sup = gj.t * CO.c.H + aj.selle / 2, inf = gj.t * CO.c.H + (orilla ? aj.varilla : aj.selle / 2);
  const fs = P / 26, mx = fs * .6, mt = fs * .5, mb = fs * 2;
  const X = d => d + mx, Y = y => mt + sup - y;
  let s = `<svg viewBox="0 0 ${(P + 2 * mx).toFixed(0)} ${(sup + inf + mt + mb).toFixed(0)}" role="img" aria-label="Gajo">`;
  gj.tabla.forEach(r => { [r.d, P - r.d].forEach(d => { const h = g.p.zEn(d) * gj.t; s += `<line class="marca" x1="${X(d)}" y1="${Y(h + aj.selle / 2)}" x2="${X(d)}" y2="${Y(-(h + (orilla ? aj.varilla : aj.selle / 2)))}"/>`; }); });
  s += `<polygon class="lona" points="${coP(coFormaGajo(g, orilla), X, Y)}" style="fill-opacity:.75"/>`;
  s += `<line class="recta" x1="${X(0)}" y1="${Y(0)}" x2="${X(P)}" y2="${Y(0)}"/>`;
  s += `<text x="${X(P / 2)}" y="${Y(0) - fs * .4}" font-size="${fs * .8}" text-anchor="middle" class="gris">línea de centro</text>`;
  if (orilla) s += `<text x="${X(P / 2)}" y="${Y(-inf) - fs * .3}" font-size="${fs * .8}" text-anchor="middle" class="rojo">lado del piso</text>`;
  s += `<line class="cota" x1="${X(0)}" y1="${Y(-inf) + fs * .6}" x2="${X(P)}" y2="${Y(-inf) + fs * .6}"/><text x="${X(P / 2)}" y="${Y(-inf) + fs * 1.75}" font-size="${fs}" text-anchor="middle">${n1(P)} de punta a punta</text>`;
  return s + '</svg>';
}

function coSvgCulata(g, pz) {
  const cu = g.culata, w = pz.abajo / 2, H = pz.alto, fs = Math.max(2 * w, H) / 16, mx = fs * 1.2, mt = fs * 1.6, mb = fs * 2.2;
  const X = x => x + w + mx, Y = y => H + mt - (y - pz.y0), ys = [];
  for (let y = pz.y0; y < pz.y1; y += 2) ys.push(y);
  ys.push(pz.y1);
  const forma = [...ys.map(y => [cu.anch(y), y]), ...ys.slice().reverse().map(y => [-cu.anch(y), y])];
  let s = `<svg viewBox="0 0 ${(2 * w + 2 * mx).toFixed(0)} ${(H + mt + mb).toFixed(0)}" role="img" aria-label="Culata ${pz.nombre}">`;
  s += `<polygon class="lona" points="${coP(forma, X, Y)}"/>`;
  if (pz.y0 === 0) s += `<rect class="gola" x="${X(-w)}" y="${Y(st.aj.varilla * 3)}" width="${2 * w}" height="${st.aj.varilla * 3}"/>`;
  s += `<line class="recta" x1="${X(0)}" y1="${Y(pz.y0)}" x2="${X(0)}" y2="${Y(pz.y1)}"/>`;
  s += `<line class="cota" x1="${X(-w)}" y1="${Y(pz.y0) + mb * .5}" x2="${X(w)}" y2="${Y(pz.y0) + mb * .5}"/><text x="${X(0)}" y="${Y(pz.y0) + mb * .5 - 5}" font-size="${fs}" text-anchor="middle">${n1(pz.abajo)}</text>`;
  if (pz.arriba) s += `<text x="${X(0)}" y="${Y(pz.y1) - 6}" font-size="${fs}" text-anchor="middle">${n1(pz.arriba)}</text>`;
  s += `<text x="${X(0) + 6}" y="${Y(pz.y0 + H * .45)}" font-size="${fs}">${n1(H)}</text>`;
  return s + '</svg>';
}

function coSvgRollo(g) {
  const R = st.aj.rollo, W = g.rolloLargo, sc = 140 / R, Yr = y => R - y;
  let s = `<svg width="${Math.ceil((W + 20) * sc)}" height="${Math.ceil((R + 26) * sc)}" viewBox="-10 -10 ${W + 20} ${R + 26}" role="img" aria-label="Piezas en el rollo">`;
  s += `<rect class="rollobg" x="0" y="0" width="${W}" height="${R}"/>`;
  g.filas.forEach(f => f.items.forEach(it => {
    const x0 = f.x0, yc = it.y0 + it.across / 2;
    if (it.tipo === 'franja') s += `<rect class="lona" x="${x0}" y="${Yr(it.y0 + it.across)}" width="${it.len}" height="${it.across}"/>`;
    else if (it.tipo === 'gajo') {
      const sup = g.gajos.t * CO.c.H + st.aj.selle / 2, yCentro = it.y0 + it.across - sup;
      s += `<polygon class="lona" points="${coP(coFormaGajo(g, it.orilla), d => x0 + d, y => Yr(yCentro + y))}"/>`;
    } else {
      const pz = it.pz, cu = g.culata, ys = [];
      for (let y = pz.y0; y <= pz.y1; y += 2) ys.push(y);
      const cx = x0 + cu.ancho / 2;
      const forma = [...ys.map(y => [cx + cu.anch(y), it.y0 + y - pz.y0]), ...ys.slice().reverse().map(y => [cx - cu.anch(y), it.y0 + y - pz.y0])];
      s += `<polygon class="lona" points="${forma.map(([x, y]) => `${x.toFixed(1)},${Yr(y).toFixed(1)}`).join(' ')}"/>`;
    }
    s += `<text x="${x0 + it.len / 2}" y="${Yr(yc) + 9}" font-size="26" text-anchor="middle">${it.nombre}</text>`;
  }));
  for (let m = 100; m < W; m += 100) s += `<text x="${m}" y="${R + 14}" font-size="10" text-anchor="middle" class="gris">${m / 100} m</text>`;
  return s + '</svg>';
}

// ---------- pasos de la guía ----------
function coPasos(g) {
  const ps = [['inicio', 'Antes de empezar'], ['medidas', 'Medidas']];
  if (g.error) return ps;
  ps.push(['lona', 'Lona y recortes']);
  if (g.franjas.length) ps.push(['franjas', 'Cortar franjas']);
  if (g.gajos) ps.push(['gajos', 'Cortar gajos']);
  if (g.culata) ps.push(['culata', 'Cortar culata']);
  ps.push(['sellar', 'Sellar'], ['terminar', 'Terminar']);
  return ps;
}

// lista de pasos con casilla para ir tachando
function coLista(id, items) {
  const h = CO.c.hechos[id] || [];
  return `<ol class="co-lista">${items.map((t, i) => `<li><button class="co-check" data-check="${id}:${i}" aria-pressed="${h.includes(i)}"><span class="co-caja" aria-hidden="true"></span><span class="co-num">${i + 1}</span><span class="co-txt">${t}</span></button></li>`).join('')}</ol>`;
}
const coMed = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
const cm = v => `${n1(v)} <small>cm</small>`;

const CO_VISTA = {
  inicio(g) {
    const c = CO.c;
    return `<h1>Cochera plegable</h1>
      <p class="guia">Vas a hacer el forro de lona de una cochera: un túnel de arcos de tubo que se recoge como un acordeón. No necesitas saber nada antes: sigue los pasos en orden y ve tachando cada uno.</p>
      <div class="pieza"><span class="etq">Las partes (vista de lado)</span>${g.error ? '' : coSvgLado(g, true)}
        <p class="nota">Las rayas rojas son las uniones selladas. El punto rojo es la bisagra donde giran los arcos de la punta redonda.</p></div>
      <h2>Palabras del taller</h2>
      <dl class="co-palabras">
        <div><dt>Franja</dt><dd>Tira de lona cortada a lo ancho completo del rollo. Varias franjas, una al lado de la otra, forman el cuerpo del túnel.</dd></div>
        <div><dt>Gajo</dt><dd>Pieza larga en forma de hoja, como un gajo de naranja. Varios gajos unidos hacen la punta redonda.</dd></div>
        <div><dt>Culata</dt><dd>La pared plana que cierra una punta, con la forma del arco.</dd></div>
        <div><dt>Selle</dt><dd>Los ${n1(st.aj.selle)} cm en que una pieza se monta encima de otra para pegarlas con calor. Cada pieza pone la mitad (${n1(st.aj.selle / 2)} cm).</dd></div>
        <div><dt>Dobladillo con varilla</dt><dd>El borde que se dobla con una varilla adentro para que pese y quede firme. Se le dejan ${n1(st.aj.varilla)} cm.</dd></div>
        <div><dt>Línea de centro</dt><dd>Raya recta por la mitad de la pieza. Desde ahí se mide todo, hacia un lado y hacia el otro.</dd></div>
        <div><dt>Revés</dt><dd>El lado de la lona que queda por dentro de la cochera. Ahí se marca y se escribe.</dd></div>
      </dl>
      <h2>Lo que necesitas</h2>
      ${coLista('herramientas', ['Metro (flexómetro) de 5 m o más.', 'Escuadra grande (de carpintero o de 60 cm).', 'Tiza o marcador que se borre.', 'Hilo de marcar con tiza, o una regla larga de aluminio, para trazar rectas largas.', 'Una varilla delgada que se doble sin quebrarse, para unir los puntos de las curvas.', 'Tijera grande o bisturí.', 'Pesas (ladrillos, libros) para que la lona no se corra.', 'La selladora.', `Varilla para los dobladillos.`, `El rollo de lona de ${n0(st.aj.rollo)} cm de ancho (en el paso 3 ves cuántos metros).`])}
      <h2>Reglas de oro</h2>
      ${coLista('reglas', ['Mide dos veces y corta una sola vez.', 'Todas las medidas de esta guía están en <b>centímetros</b>.', 'Marca siempre por el <b>revés</b> de la lona.', 'Apenas cortes una pieza, escríbele su nombre (F1, G1, C1…) por el revés con marcador.', 'Si algo no te cuadra, para y pregunta antes de cortar: la lona cortada no se recupera.'])}`;
  },

  medidas(g) {
    const c = CO.c;
    const paso = (k, nombre) => `<div class="paso-num"><span class="etq">${nombre} (m)</span>
      <div class="stepper"><button data-co="${k}" data-d="-10" aria-label="Menos ${nombre}">−</button><input data-coin="${k}" type="number" inputmode="decimal" step="0.1" value="${c[k] / 100}"><button data-co="${k}" data-d="10" aria-label="Más ${nombre}">+</button></div></div>`;
    const ext = (k, nombre) => `<div class="paso-num"><span class="etq">${nombre}</span><div class="seg">${Object.entries(CO_EXT).map(([v, t]) => `<button data-ext="${k}" data-v="${v}" aria-pressed="${c[k] === v}">${t}</button>`).join('')}</div></div>`;
    return `<h1>Medidas de la cochera</h1>
      <p class="guia">Son las medidas de la cochera <b>armada</b>, por fuera. La base es de 5 × 2,5 × 2,5 m; cámbialas si el cliente pide otra.</p>
      <div class="co-tres">${paso('L', 'Largo')}${paso('W', 'Ancho')}${paso('H', 'Alto')}</div>
      ${ext('frente', 'Punta de adelante')}
      ${ext('atras', 'Punta de atrás')}
      <p class="nota"><b>Abierta</b>: por ahí entra el carro. <b>Redonda</b>: los arcos giran sobre la bisagra y bajan hasta el piso (la de la foto roja). <b>Plana</b>: una pared recta.</p>
      ${g.error ? `<p class="aviso co-error">${g.error}</p>` : `
      <div class="pieza"><span class="etq">De frente</span>${coSvgFrente(g)}
        <p class="nota">${g.p.hw > 0 ? `Paredes rectas de ${n1(g.p.hw)} cm y arriba un medio círculo de ${n1(g.p.a)} cm de radio.` : 'Es más bajo que la mitad del ancho: el techo es una curva de pie a pie, sin pared recta.'} Del piso por encima hasta el otro lado del piso hay <b>${n1(g.p.P)} cm</b>: ese es el largo del arco.</p></div>
      <div class="pieza"><span class="etq">De lado</span>${coSvgLado(g, false)}
        <p class="nota">${g.Lb > 0 ? `El cuerpo recto mide ${n1(g.Lb)} cm.` : 'No queda cuerpo recto: las dos puntas se juntan.'}${['frente', 'atras'].some(e => c[e] === 'redondo') ? ` Cada punta redonda ocupa ${n1(c.H)} cm del largo (lo mismo que el alto).` : ''}</p></div>`}`;
  },

  lona(g) {
    const aj = st.aj, filas = [];
    const grupos = {};
    g.franjas.forEach(f => { const k = n1(f.w); grupos[k] = (grupos[k] || 0) + 1; });
    Object.entries(grupos).forEach(([w, q]) => filas.push(['Franja del cuerpo', q, `${w} × ${n1(g.Lt)}`]));
    if (g.gajos) {
      const e = g.gajos.extremos.length;
      if (g.gajos.N > 1) filas.push(['Gajo', (g.gajos.N - 1) * e, `${n1(g.gajos.wN)} × ${n1(g.p.P)}`]);
      filas.push(['Gajo de orilla (va al piso)', e, `${n1(g.gajos.wE)} × ${n1(g.p.P)}`]);
    }
    if (g.culata) g.culata.piezas.forEach(pz => filas.push([`Culata ${pz.nombre}`, g.culata.extremos.length, `${n1(pz.abajo)} × ${n1(pz.alto)}`]));
    const aprov = g.areaPiezas / g.areaRollo * 100;
    return `<h1>Lona y recortes</h1>
      <div class="total"><span class="etq">Necesitas</span><b>${n1(g.rolloLargo / 100)} m</b><span>de rollo de ${n0(aj.rollo)} cm de ancho · compra ${n1(Math.ceil(g.rolloLargo / 50) / 2 + .5)} m para tener margen</span></div>
      <h2>Lo que vas a cortar</h2>
      <div class="co-tabla-wrap"><table class="co-tabla"><thead><tr><th>Pieza</th><th>Cant.</th><th>Medida (cm)</th></tr></thead><tbody>
        ${filas.map(([n, q, m]) => `<tr><td>${n}</td><td class="num">${q}</td><td class="num">${m}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="nota">Las medidas ya traen el selle (${n1(aj.selle / 2)} cm por cada unión) y el dobladillo (${n1(aj.varilla)} cm en los bordes que tocan el piso o la boca). No les sumes nada.</p>
      <h2>Así se acomoda en el rollo</h2>
      <div class="rollo">${coSvgRollo(g)}</div>
      <dl class="medidas">
        ${coMed('Lona en la carpa', `${n1(g.areaPiezas / 1e4)} <small>m²</small>`)}
        ${coMed('Se aprovecha', `${n0(aprov)} <small>%</small>`)}
      </dl>
      ${g.sobrantes.length ? `<h2>Sobrantes que sirven</h2>${g.sobrantes.map(s => `<p class="aviso">Queda una tira de <b>${n1(s.ancho)} × ${n1(s.largo)} cm</b>. Guárdala: sirve para patas, refuerzos de las esquinas o bolsillos.</p>`).join('')}` : ''}
      ${g.gajos ? '<p class="nota">Los gajos tienen forma de hoja: lo que se bota es sobre todo lo que queda en sus puntas. Es normal.</p>' : ''}
      <p class="aviso">Estas medidas salen del cálculo. Antes de cortar muchas, haz la primera cochera y comprueba que quedó bien.</p>`;
  },

  franjas(g) {
    const aj = st.aj, c = CO.c, ultima = g.franjas[g.franjas.length - 1], angosta = ultima.w < aj.rollo - .5;
    const lista = [
      'Extiende el rollo sobre la mesa con el <b>revés hacia arriba</b>. Pon pesas en las orillas para que no se corra.',
      'Haz el corte de arranque: pon la escuadra contra la orilla del rollo, traza una raya derecha de orilla a orilla y corta. Esa raya es tu <b>cero</b>.',
      `Desde el cero mide <b>${n1(g.Lt)} cm</b> a lo largo del rollo, por las dos orillas. Marca un punto en cada orilla.`,
      'Une los dos puntos con el hilo de tiza o la regla, revisa con la escuadra que la raya quede derecha y corta.',
      `Escribe <b>F1</b> por el revés. Repite para cortar ${g.franjas.length > 1 ? `las ${g.franjas.length} franjas` : 'la franja'}.`,
    ];
    if (angosta) lista.push(`La última franja (<b>${ultima.nombre}</b>) va más angosta: mide <b>${n1(ultima.w)} cm</b> desde una orilla, en las dos puntas y en la mitad. Une las tres marcas y corta a lo largo. Guarda la tira que sobra.`);
    lista.push('Comprueba: dobla cada franja por la mitad del largo. Las dos puntas deben quedar parejas.');
    return `<h1>Cortar las franjas del cuerpo</h1>
      <p class="guia">El cuerpo es la parte recta del túnel. Cada franja pasa por encima de la cochera de un lado del piso al otro.</p>
      <dl class="medidas">
        ${coMed('Franjas', g.franjas.length)}
        ${coMed('Largo de cada una', cm(g.Lt))}
      </dl>
      <p class="nota">¿De dónde sale el largo? El arco mide ${n1(g.p.P)} cm de piso a piso, y se le suman ${n1(aj.varilla)} cm de dobladillo en cada pie: ${n1(g.p.P)} + ${n1(aj.varilla)} + ${n1(aj.varilla)} = ${n1(g.Lt)}.</p>
      ${g.franjas.map(f => `<div class="pieza"><div class="pieza-top"><h2>${f.nombre}</h2><span class="cortar">${n1(f.w)} cm</span></div>${coSvgFranja(g, f)}</div>`).join('')}
      <p class="nota">Las zonas oscuras de las puntas son el dobladillo de los pies. ${c.frente === 'abierto' || c.atras === 'abierto' ? `La orilla de la franja que queda en la boca lleva ${n1(aj.varilla)} cm de dobladillo; ya está sumado al ancho.` : ''}</p>
      ${coLista('franjas', lista)}`;
  },

  gajos(g) {
    const aj = st.aj, gj = g.gajos, P = g.p.P, e = gj.extremos.length;
    return `<h1>Cortar los gajos</h1>
      <p class="guia">La punta redonda se hace con <b>${gj.N} gajos</b>${e > 1 ? ' en cada punta' : ''}. Todos son iguales, menos el <b>gajo de orilla</b>: es el último, el que queda en el piso, y por ese lado lleva dobladillo en vez de selle.</p>
      <dl class="medidas">
        ${coMed('Largo', cm(P))}
        ${coMed('Lo más ancho', cm(gj.wN))}
        ${coMed('Gajos normales', (gj.N - 1) * e)}
        ${coMed('Gajos de orilla', e)}
      </dl>
      <div class="pieza"><div class="pieza-top"><h2>Gajo</h2><span class="cortar">Cortar ${(gj.N - 1) * e}</span></div>${coSvgGajo(g, false)}</div>
      <div class="pieza"><div class="pieza-top"><h2>Gajo de orilla</h2><span class="cortar">Cortar ${e}</span></div>${coSvgGajo(g, true)}</div>
      <h2>Tabla para marcar</h2>
      <p class="guia">Mide desde una punta por la línea de centro. En cada medida pon la escuadra y marca hacia cada lado lo que dice la tabla. Llega hasta la mitad; la otra mitad es igual, contando desde la otra punta.</p>
      <div class="co-tabla-wrap"><table class="co-tabla"><thead><tr><th>Desde la punta</th><th>Gajo: a cada lado</th><th>Orilla: lado del piso</th></tr></thead><tbody>
        ${gj.tabla.map(r => `<tr><td class="num">${n1(r.d)}${r.d === P / 2 ? ' <small>(mitad)</small>' : ''}</td><td class="num">${n1(r.normal)}</td><td class="num rojo">${n1(r.piso)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="nota">En el gajo de orilla, el otro lado (el de unión) se marca con la columna del medio, igual que un gajo normal.</p>
      ${coLista('gajos', [
        `Corta del rollo un pedazo de <b>${n1(P)} cm</b> de largo con el corte en escuadra, igual que las franjas.${gj.k > 1 ? ` A lo ancho caben ${gj.k} gajos.` : ''}`,
        `Traza la línea de centro a lo largo, con el hilo de tiza${gj.k > 1 ? '' : `, a ${n1(aj.rollo / 2)} cm de la orilla (la mitad del rollo)`}.`,
        'Sobre la línea de centro, marca un punto en cada medida de la primera columna de la tabla, empezando en una punta.',
        'En cada punto pon la escuadra con un brazo sobre la línea de centro y marca hacia arriba y hacia abajo la medida de la segunda columna.',
        'Desde la mitad sigue hacia la otra punta con las mismas medidas, en orden inverso.',
        'Une los puntos con la varilla flexible doblada sobre ellos (que no haga picos) y pasa el marcador. En las puntas la curva termina casi en punta.',
        'Corta por la línea. Escribe <b>G1</b> por el revés y marca con una rayita el centro del largo, en los dos bordes.',
        `Usa ese primer gajo como plantilla: ponlo encima de la lona, marca alrededor y corta los demás. Así salen idénticos.`,
        `Para el gajo de orilla, el lado del piso se marca con la columna roja (${n1(aj.varilla)} cm de dobladillo en vez de ${n1(aj.selle / 2)} cm de selle).`,
      ])}`;
  },

  culata(g) {
    const cu = g.culata, e = cu.extremos.length;
    return `<h1>Cortar la culata</h1>
      <p class="guia">La culata es la pared plana. ${cu.piezas.length > 1 ? `No cabe en el ancho del rollo, así que sale en <b>${cu.piezas.length} piezas</b> apiladas: la de arriba se monta ${n1(st.aj.selle)} cm sobre la de abajo.` : 'Sale de una sola pieza.'}${e > 1 ? ' Corta una para cada punta plana.' : ''}</p>
      ${cu.piezas.map(pz => `
        <div class="pieza"><div class="pieza-top"><h2>Culata ${pz.nombre}</h2><span class="cortar">Cortar ${e}</span></div>${coSvgCulata(g, pz)}
          <div class="co-tabla-wrap"><table class="co-tabla"><thead><tr><th>Altura desde abajo</th><th>A cada lado del centro</th><th>Ancho total</th></tr></thead><tbody>
          ${pz.tabla.map(([y, x]) => `<tr><td class="num">${n1(y)}</td><td class="num">${n1(x)}</td><td class="num">${n1(2 * x)}</td></tr>`).join('')}
          </tbody></table></div></div>`).join('')}
      ${coLista('culata', [
        'Corta del rollo un pedazo del ancho total de abajo de la tabla, con el corte en escuadra.',
        'Traza la línea de centro de abajo hacia arriba, en escuadra con la orilla del rollo.',
        'Sobre esa línea marca las alturas de la tabla, empezando abajo en 0.',
        'En cada altura pon la escuadra y marca hacia cada lado la medida de la columna del medio.',
        'Une los puntos con la varilla flexible y corta por la línea.',
        'Escribe C1, C2… por el revés.',
      ])}`;
  },

  sellar(g) {
    const aj = st.aj, c = CO.c, l = [];
    l.push('Haz una <b>prueba en seco</b>: pon todas las piezas en el piso como van a quedar, sin sellar, y revisa que los bordes coincidan.');
    l.push('Antes de sellar cualquier unión, haz coincidir primero las <b>rayitas del centro</b> de las dos piezas y sujétalas con pinzas. Después sigue hacia cada punta.');
    if (g.franjas.length > 1) l.push(`<b>Cuerpo:</b> monta F2 sobre F1 ${n1(aj.selle)} cm por la orilla larga y sella de un pie al otro. Sigue con F3 si hay.`);
    if (g.gajos) {
      l.push(`<b>Punta redonda:</b> une G1 con G2 por un lado, montados ${n1(aj.selle)} cm, empezando por la rayita del centro. Luego G3 al G2, y así. El gajo de orilla va de último.`);
      l.push('Las puntas de los gajos se juntan todas en un mismo punto en cada pie: esa es la bisagra. Ahí refuerza con un parche de los sobrantes.');
      if (g.franjas.length) l.push('<b>Une la punta al cuerpo:</b> el lado libre de G1 contra la orilla de la franja que da a la punta. Empieza arriba, en el centro, y sella hacia cada pie.');
    }
    if (g.culata) {
      if (g.culata.piezas.length > 1) l.push(`<b>Culata:</b> monta C2 sobre C1 ${n1(aj.selle)} cm y sella derecho.`);
      l.push('Pega la culata a la orilla de la franja de esa punta: empieza en el centro de arriba y baja hacia cada lado siguiendo la curva, sin estirar la lona.');
    }
    l.push('Si una unión hace arrugas o bolsas, suelta, vuelve a poner las rayitas del centro juntas y sella de nuevo.');
    return `<h1>Sellar y armar</h1>
      <p class="guia">Sella siempre en este orden: primero las piezas iguales entre sí, después las partes grandes.</p>
      ${coLista('sellar', l)}`;
  },

  terminar(g) {
    const aj = st.aj, c = CO.c, l = [`<b>Dobladillo de los pies:</b> en los dos bordes largos que tocan el piso, dobla ${n1(aj.varilla)} cm con la varilla adentro y sella.`];
    if (g.gajos) l.push('<b>Dobladillo del gajo de orilla:</b> el borde que queda en el piso, igual que los pies.');
    if (g.culata) l.push('<b>Dobladillo de la culata:</b> el borde de abajo.');
    if (['frente', 'atras'].some(e => c[e] === 'abierto')) l.push(`<b>Boca:</b> la orilla por donde entra el carro también lleva dobladillo con varilla de ${n1(aj.varilla)} cm.`);
    l.push('Pon el forro sobre la estructura armada. Debe quedar justo: ni tirante ni con bolsas.', 'Amarra la lona a cada arco por dentro (con cintas o velcro), para que se pliegue junto con los tubos.', 'Abre y cierra la cochera tres veces. Revisa que ninguna unión se tire.');
    return `<h1>Terminar</h1>
      ${coLista('terminar', l)}
      <div class="total"><span class="etq">${cocheraNombre()}</span><b>${n1(g.rolloLargo / 100)} m</b><span>de lona · ${g.items.length} piezas</span></div>
      <button class="cta verde" id="coCompartir">Enviar medidas por WhatsApp</button>
      <button class="sec" id="coReiniciar">Desmarcar todos los pasos</button>`;
  },
};

function coTexto(g) {
  const c = CO.c, aj = st.aj;
  let t = `*${cocheraNombre().toUpperCase()}*\nAdelante: ${CO_EXT[c.frente]} · Atrás: ${CO_EXT[c.atras]}\nArco de piso a piso: ${n1(g.p.P)} cm\n`;
  if (g.franjas.length) t += `\n*Franjas* (largo ${n1(g.Lt)}):\n` + g.franjas.map(f => `• ${f.nombre}: ${n1(f.w)} de ancho`).join('\n') + '\n';
  if (g.gajos) {
    const e = g.gajos.extremos.length;
    t += `\n*Gajos*: ${(g.gajos.N - 1) * e} normales + ${e} de orilla, largo ${n1(g.p.P)}\nDesde la punta → a cada lado (orilla, lado piso):\n`;
    t += g.gajos.tabla.map(r => `   ${n1(r.d)} → ${n1(r.normal)} (${n1(r.piso)})`).join('\n') + '\n';
  }
  if (g.culata) g.culata.piezas.forEach(pz => {
    t += `\n*Culata ${pz.nombre}* (cortar ${g.culata.extremos.length}), altura → a cada lado:\n` + pz.tabla.map(([y, x]) => `   ${n1(y)} → ${n1(x)}`).join('\n') + '\n';
  });
  t += `\n*Lona:* ≈ ${n1(g.rolloLargo / 100)} m de rollo de ${n0(aj.rollo)}`;
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
  if (b.dataset.ext) { CO.c[b.dataset.ext] = b.dataset.v; return pintarCochera(); }
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
