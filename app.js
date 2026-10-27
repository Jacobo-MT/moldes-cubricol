'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// Molde 3x3 plegable que quedó bien (medidas del taller)
const REF = { lado: 300, H: 93, S: 180, sag: 13.5, sagTip: 85.5, cuerda: 234 };
const HIP0 = Math.hypot(REF.S, REF.lado / 2);
const K = HIP0 / Math.sqrt(REF.H ** 2 + 2 * (REF.lado / 2) ** 2);
const U0 = REF.sagTip / REF.cuerda;
const BETA = (1 - U0) / U0;
const PIN_HASH = '9b8f2fa45e4b5f1962f98a562df2f105c9b3bd7b9ef70aca4bc2fd07692b7958';

const DEF = { gola: 40, selle: 3, varilla: 3, rollo: 153, pataLargo: 237, pataArriba: 40, pataAbajo: 14, autoH: true, H: 93, autoSag: true, sag: 13.5 };
const AJUSTES = [
  ['gola', 'Gola cortada', 'cm', 'Ya incluye los 3 cm del borde con varilla.'],
  ['selle', 'Selle de unión', 'cm', 'Se reparte mitad y mitad entre las dos piezas.'],
  ['varilla', 'Borde con varilla', 'cm', ''],
  ['rollo', 'Ancho del rollo', 'cm', ''],
  ['pataLargo', 'Largo de la pata', 'cm', 'Del borde del techo al piso.'],
  ['pataArriba', 'Pata, lado ancho', 'cm', 'El que se sella en la esquina de la gola.'],
  ['pataAbajo', 'Pata, lado angosto', 'cm', ''],
  ['H', 'Pico sobre la gola', 'cm', 'Lo que sube el techo desde la gola hasta la punta.', 'autoH'],
  ['sag', 'Lo más hondo de la curva', 'cm', 'Medido en escuadra desde la recta.', 'autoSag'],
];

const leerLS = (k, d) => { try { const v = localStorage.getItem('mc_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const guardarLS = (k, v) => { try { localStorage.setItem('mc_' + k, JSON.stringify(v)); } catch (e) {} };

const st = {
  a: 300, b: 300, ...leerLS('carpa', {}),
  aj: { ...DEF, ...leerLS('ajustes', {}) },
  puntos: leerLS('puntos', null), d: REF.sagTip, lado: 0, vista: 'carpa', r: null,
};

const n1 = v => (Math.round(v * 10) / 10).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const n0 = v => Math.round(v).toLocaleString('es-CO');
const tam = () => `${n1(st.a / 100)}×${n1(st.b / 100)}`;

// ---------- geometría ----------
function calcular() {
  const p = st.aj, a = st.a, b = st.b;
  const H = p.autoH ? REF.H / REF.lado * Math.sqrt(a * b) : p.H;
  const hip = K * Math.sqrt(H * H + a * a / 4 + b * b / 4);
  const sag = p.autoSag ? REF.sag * hip / HIP0 : p.sag;
  const bases = a === b ? [[a, 4]] : [[a, 2], [b, 2]];
  return { H, hip, sag, lados: bases.map(([base, cant]) => lado(base, cant, hip, sag, p)) };
}

function lado(base, cant, hip, sag, p) {
  const half = base / 2, S = Math.sqrt(hip * hip - half * half);
  const W = half + p.selle / 2, G = p.gola, Ht = G + S, Lc = Math.hypot(W, S);
  const A = sag / (U0 * Math.pow(1 - U0, BETA));
  const prof = u => A * u * Math.pow(1 - u, BETA);
  // curva del lado derecho, de la punta (u=0) a la esquina de la gola (u=1), hundida hacia adentro
  const curva = [];
  for (let i = 0; i <= 600; i++) {
    const u = i / 600, f = prof(u);
    curva.push([u * W - f * S / Lc, Ht - u * S - f * W / Lc]);
  }
  const ancho = y => {
    if (y <= G) return W;
    if (y >= Ht) return 0;
    for (let i = 1; i < curva.length; i++) {
      const [x1, y1] = curva[i - 1], [x2, y2] = curva[i];
      if (y <= y1 && y >= y2) return x1 + (x2 - x1) * ((y1 - y) / ((y1 - y2) || 1));
    }
    return W;
  };
  const piezas = [];
  let y0 = 0;
  for (;;) {
    const y1 = Math.min(y0 + p.rollo, Ht);
    piezas.push({ y0, y1 });
    if (y1 >= Ht - 1e-6) break;
    y0 = y1 - p.selle;
  }
  piezas.forEach((pz, i) => {
    const ultima = i === piezas.length - 1;
    pz.alto = pz.y1 - pz.y0;
    pz.abajo = 2 * ancho(pz.y0);
    pz.arriba = ultima ? 0 : 2 * ancho(pz.y1);
    pz.nombre = piezas.length === 1 ? 'Lado completo' : i === 0 ? 'Franja con gola' : ultima ? 'Punta' : 'Franja ' + (i + 1);
  });
  return { base, cant, S, W, G, Ht, Lc, ancho, piezas, prof };
}

function enRecta(l, d) {
  const u = Math.min(1, Math.max(0, d / l.Lc)), f = l.prof(u);
  const Q = [u * l.W, l.Ht - u * l.S];
  return { f, Q, P: [Q[0] - f * l.S / l.Lc, Q[1] - f * l.W / l.Lc] };
}

function forma(l, y0, y1) {
  const ys = [];
  for (let y = y0; y < y1; y += 2) ys.push(y);
  if (l.G > y0 && l.G < y1) ys.push(l.G);
  ys.push(y1);
  ys.sort((a, b) => a - b);
  return [...ys.map(y => [l.ancho(y), y]), ...ys.slice().reverse().map(y => [-l.ancho(y), y])];
}
const pts = (arr, fx, fy) => arr.map(([x, y]) => `${fx(x).toFixed(1)},${fy(y).toFixed(1)}`).join(' ');

function acomodo(r) {
  const p = st.aj, items = [], gap = 2;
  let x = 0;
  r.lados.forEach(l => {
    for (let k = 0; k < l.cant; k++) l.piezas.forEach((pz, i) => {
      if (l.piezas.length > 1 && i === l.piezas.length - 1) return;
      items.push({ l, pz, cx: x + pz.abajo / 2, flip: false });
      x += pz.abajo + gap;
    });
  });
  r.lados.forEach(l => {
    if (l.piezas.length < 2) return;
    const pz = l.piezas[l.piezas.length - 1], w = pz.abajo;
    for (let k = 0; k < l.cant; k++) items.push({ l, pz, cx: x + k * (w / 2 + gap) + w / 2, flip: k % 2 === 1 });
    x += (l.cant + 1) * w / 2 + l.cant * gap;
  });
  const parAlto = p.pataArriba + p.pataAbajo;
  const pares = Math.max(1, Math.floor(p.rollo / parAlto));
  const columnas = Math.ceil(2 / pares);
  const patas = [];
  for (let k = 0; k < 4; k++) {
    const par = Math.floor(k / 2), col = Math.floor(par / pares), fila = par % pares;
    patas.push({ x0: x + col * (p.pataLargo + gap), y0: fila * parAlto, flip: k % 2 === 1 });
  }
  x += columnas * (p.pataLargo + gap);
  return { items, patas, largo: x };
}

// ---------- dibujos ----------
function svgLado(l) {
  const p = st.aj, m = 34, fs = Math.max(10, l.Ht / 13);
  const X = x => x + l.W + m, Y = y => l.Ht + m * .6 - y;
  let s = `<svg viewBox="0 0 ${(2 * l.W + 2 * m).toFixed(0)} ${(l.Ht + m * 1.6).toFixed(0)}" role="img" aria-label="Un lado armado">`;
  s += `<polygon class="lona" points="${pts(forma(l, 0, l.Ht), X, Y)}"/>`;
  s += `<rect class="gola" x="${X(-l.W)}" y="${Y(l.G)}" width="${2 * l.W}" height="${l.G}"/>`;
  l.piezas.slice(0, -1).forEach(pz => {
    const y = pz.y1 - p.selle / 2, w = l.ancho(y);
    s += `<line class="union" x1="${X(-w)}" y1="${Y(y)}" x2="${X(w)}" y2="${Y(y)}"/>`;
  });
  l.piezas.forEach(pz => {
    const yc = pz.y0 === 0 && l.piezas.length > 1 ? (l.G + pz.y1) / 2 : (pz.y0 + pz.y1) / 2 - (pz.y0 ? pz.alto * .15 : 0);
    s += `<text x="${X(0)}" y="${Y(yc)}" font-size="${fs}" text-anchor="middle">${pz.nombre}</text>`;
  });
  s += `<text x="${X(0)}" y="${Y(l.G / 2) + fs / 3}" font-size="${fs * .8}" text-anchor="middle" class="gris">gola</text>`;
  return s + '</svg>';
}

function svgPieza(l, pz) {
  const w = pz.abajo / 2, H = pz.alto, fs = Math.max(11, Math.max(2 * w, H) / 14), mx = fs * 1.2, mt = fs * 1.6, mb = fs * 2.2;
  const X = x => x + w + mx, Y = y => H + mt - (y - pz.y0);
  let s = `<svg viewBox="0 0 ${(2 * w + 2 * mx).toFixed(0)} ${(H + mt + mb).toFixed(0)}" role="img" aria-label="${pz.nombre}">`;
  s += `<polygon class="lona" points="${pts(forma(l, pz.y0, pz.y1), X, Y)}"/>`;
  if (l.G > pz.y0) s += `<rect class="gola" x="${X(-w)}" y="${Y(l.G)}" width="${2 * w}" height="${l.G - pz.y0}"/><text x="${X(0)}" y="${Y((pz.y0 + l.G) / 2) + fs / 3}" font-size="${fs * .85}" text-anchor="middle" class="gris">gola ${n1(l.G)}</text>`;
  s += `<line class="cota" x1="${X(-w)}" y1="${Y(pz.y0) + mb * .55}" x2="${X(w)}" y2="${Y(pz.y0) + mb * .55}"/>`;
  s += `<text x="${X(0)}" y="${Y(pz.y0) + mb * .55 - 5}" font-size="${fs}" text-anchor="middle">${n1(pz.abajo)}</text>`;
  if (pz.arriba) s += `<text x="${X(0)}" y="${Y(pz.y1) - 6}" font-size="${fs}" text-anchor="middle">${n1(pz.arriba)}</text>`;
  s += `<line class="fina" x1="${X(0)}" y1="${Y(pz.y0)}" x2="${X(0)}" y2="${Y(pz.y1)}"/>`;
  s += `<text x="${X(0) + 6}" y="${Y((pz.y0 + pz.y1) / 2 + (l.G > pz.y0 ? (l.G - pz.y0) / 2 : 0))}" font-size="${fs}">${n1(pz.alto)}</text>`;
  return s + '</svg>';
}

function svgPata() {
  const p = st.aj, L = p.pataLargo, a = p.pataArriba, b = p.pataAbajo, fs = 16, m = 34;
  let s = `<svg viewBox="0 0 ${a + 2 * m} ${L + 2 * m}" role="img" aria-label="Pata">`;
  s += `<polygon class="lona" points="${m},${m} ${m + a},${m} ${m + b},${m + L} ${m},${m + L}"/>`;
  s += `<text x="${m + a / 2}" y="${m - 8}" font-size="${fs}" text-anchor="middle">${n1(a)}</text>`;
  s += `<text x="${m + b / 2}" y="${m + L + fs + 4}" font-size="${fs}" text-anchor="middle">${n1(b)}</text>`;
  s += `<text x="${m - 8}" y="${m + L / 2}" font-size="${fs}" text-anchor="middle" transform="rotate(-90 ${m - 8} ${m + L / 2})">${n1(L)}</text>`;
  return s + '</svg>';
}

function svgRollo(r, ac) {
  const p = st.aj, R = p.rollo, W = ac.largo, sc = 140 / R, Yr = y => R - y;
  let s = `<svg width="${Math.ceil((W + 20) * sc)}" height="${Math.ceil((R + 26) * sc)}" viewBox="-10 -10 ${W + 20} ${R + 26}" role="img" aria-label="Piezas en el rollo">`;
  s += `<rect class="rollobg" x="0" y="0" width="${W}" height="${R}"/>`;
  ac.items.forEach(it => {
    const fy = it.flip ? (y => y - it.pz.y0) : (y => Yr(y - it.pz.y0));
    s += `<polygon class="lona" points="${pts(forma(it.l, it.pz.y0, it.pz.y1), x => it.cx + x, fy)}"/>`;
  });
  ac.patas.forEach(pt => {
    const L = p.pataLargo, a = p.pataArriba, b = p.pataAbajo, y = pt.y0;
    const q = pt.flip ? [[0, y + a], [L, y + b], [L, y + a + b], [0, y + a + b]] : [[0, y], [L, y], [L, y + b], [0, y + a]];
    s += `<polygon class="lona" points="${q.map(([qx, qy]) => `${(pt.x0 + qx).toFixed(1)},${Yr(qy).toFixed(1)}`).join(' ')}"/>`;
  });
  for (let m = 100; m < W; m += 100) s += `<text x="${m}" y="${R + 14}" font-size="10" text-anchor="middle" class="gris">${m / 100} m</text>`;
  return s + '</svg>';
}

// ---------- pantallas ----------
function pintarCarpa() {
  const clave = `${st.a / 100}x${st.b / 100}`;
  const fijo = ['2x2', '3x3', '4x4'].includes(clave);
  $$('#tamanos button').forEach(b => b.classList.toggle('activo', fijo ? b.dataset.s === clave : b.dataset.s === 'otra'));
  if (!fijo) $('#otra').hidden = false;
  if (document.activeElement !== $('#largo')) $('#largo').value = st.a / 100;
  if (document.activeElement !== $('#ancho')) $('#ancho').value = st.b / 100;
  $('#avisoCarpa').textContent = clave === '3x3' && st.aj.autoH
    ? 'La 3×3 está calibrada con el molde bueno del taller.'
    : `La ${tam()} está calculada en proporción a la 3×3. Conviene comprobarla con una carpa real.`;
}

function pintarPiezas(r) {
  const total = r.lados.reduce((t, l) => t + l.cant, 0);
  $('#piezasTitulo').textContent = `Plegable ${tam()}`;
  $('#piezasLista').innerHTML = r.lados.map(l => `
    <div class="vista">
      <div class="lado-titulo"><h2>${r.lados.length > 1 ? `Lado de ${n0(l.base)} cm` : `${total} lados iguales`}</h2><span class="nota">${l.piezas.length} pieza${l.piezas.length > 1 ? 's' : ''} por lado</span></div>
      <div class="pieza"><span class="etq">Así se arma un lado</span>${svgLado(l)}
        <p class="nota">${l.piezas.length > 1 ? `La raya roja es la unión: las piezas se montan ${n1(st.aj.selle)} cm para sellar.` : 'Sale de una sola pieza.'}</p></div>
      ${l.piezas.map(pz => `
        <div class="pieza">
          <div class="pieza-top"><h2>${pz.nombre}</h2><span class="cortar">Cortar ${l.cant}</span></div>
          ${svgPieza(l, pz)}
          <dl class="medidas">
            <div><dt>Ancho abajo</dt><dd>${n1(pz.abajo)} <small>cm</small></dd></div>
            <div><dt>Alto</dt><dd>${n1(pz.alto)} <small>cm</small></dd></div>
            <div class="ancho"><dt>${pz.arriba ? 'Ancho arriba' : 'Arriba'}</dt><dd>${pz.arriba ? n1(pz.arriba) + ' <small>cm</small>' : 'termina en punta'}</dd></div>
          </dl>
          ${!pz.arriba && l.piezas.length > 1 && pz.alto < 25 ? `<p class="aviso">Esta punta sale muy pequeña (${n1(pz.alto)} cm).</p>` : ''}
        </div>`).join('')}
    </div>`).join('');
}

// el lado completo a escala real, pico arriba; el botón corre por la recta del lado derecho
function curvaGeo(l) {
  const fs = l.Ht / 13, mx = fs * .5, mt = fs * 1.6, mb = fs * .4;
  return { fs, vbW: 2 * l.W + 2 * mx, vbH: l.Ht + mt + mb, X: x => x + l.W + mx, Y: y => l.Ht + mt - y,
    dDe: (cx, cy) => { const x = Math.abs(cx - l.W - mx), y = l.Ht + mt - cy; return (x * l.W - (y - l.Ht) * l.S) / l.Lc; } };
}

function pintarCurva(r) {
  st.lado = Math.min(st.lado, r.lados.length - 1);
  const l = r.lados[st.lado];
  if (st.puntos === null) st.puntos = cada20(l.Lc);
  st.d = Math.min(Math.max(st.d, 0), l.Lc);
  $('#ladoSel').hidden = r.lados.length < 2;
  $('#ladoSel').innerHTML = r.lados.map((x, i) => `<button data-i="${i}" aria-pressed="${i === st.lado}">Lado de ${n0(x.base)}</button>`).join('');

  const g = curvaGeo(l), { X, Y, fs } = g;
  let s = `<svg viewBox="0 0 ${g.vbW.toFixed(1)} ${g.vbH.toFixed(1)}" id="curvaDibujo" role="img" aria-label="Un lado con la recta de la punta a la gola">`;
  s += `<polygon class="lona" points="${pts(forma(l, 0, l.Ht), X, Y)}"/>`;
  s += `<rect class="gola" x="${X(-l.W)}" y="${Y(l.G)}" width="${2 * l.W}" height="${l.G}"/>`;
  s += `<text x="${X(0)}" y="${Y(l.G / 2) + fs * .3}" font-size="${fs * .8}" text-anchor="middle" class="gris">gola</text>`;
  s += `<line class="recta" x1="${X(0)}" y1="${Y(l.Ht)}" x2="${X(l.W)}" y2="${Y(l.G)}"/>`;
  s += `<line class="recta" x1="${X(0)}" y1="${Y(l.Ht)}" x2="${X(-l.W)}" y2="${Y(l.G)}" style="opacity:.35"/>`;
  st.puntos.filter(d => d <= l.Lc).forEach(d => {
    const k = enRecta(l, d);
    s += `<line class="marca" x1="${X(k.Q[0])}" y1="${Y(k.Q[1])}" x2="${X(k.P[0])}" y2="${Y(k.P[1])}"/><circle class="punto" cx="${X(k.P[0])}" cy="${Y(k.P[1])}" r="${fs * .16}"/>`;
    s += `<circle class="punto" cx="${X(-k.P[0])}" cy="${Y(k.P[1])}" r="${fs * .13}" style="opacity:.35"/>`;
  });
  const k = enRecta(l, st.d);
  s += `<line class="hunde" x1="${X(k.Q[0])}" y1="${Y(k.Q[1])}" x2="${X(k.P[0])}" y2="${Y(k.P[1])}"/>`;
  s += `<circle class="boton" cx="${X(k.Q[0])}" cy="${Y(k.Q[1])}" r="${fs * .32}"/>`;
  s += `<text x="${X(k.P[0]) - fs * .35}" y="${Y(k.P[1]) + fs * .9}" font-size="${fs * .9}" class="rojo" text-anchor="end">${n1(k.f)}</text>`;
  s += `<text x="${X(0)}" y="${Y(l.Ht) - fs * .5}" font-size="${fs * .9}" text-anchor="middle">punta</text>`;
  s += `<text x="${X(l.W) - fs * .3}" y="${Y(l.G) + fs * .85}" font-size="${fs * .65}" text-anchor="end" class="gris">esquina de la gola ↗</text>`;
  $('#curvaSvg').innerHTML = s + '</svg>';

  $('#lecD').textContent = `${n1(st.d)} cm`;
  $('#lecF').textContent = `${n1(k.f)} cm`;
  $('#slider').max = l.Lc.toFixed(1);
  $('#slider').value = st.d;
  const lista = st.puntos.map((d, i) => [d, i]).filter(([d]) => d <= l.Lc);
  $('#puntos').innerHTML = lista.length
    ? lista.map(([d, i]) => `<div class="punto-fila"><div><span class="etq">Desde la punta</span><b>${n1(d)} cm</b></div><div class="hundeval"><span class="etq">Se hunde</span><b>${n1(enRecta(l, d).f)} cm</b></div><button class="quitar" data-i="${i}">Quitar</button></div>`).join('')
    : '<p class="vacio">Mueve el botón y toca «Marcar este punto».</p>';
  $('#curvaNota').textContent = `La recta mide ${n1(l.Lc)} cm. Lo más hondo es a ${n1(l.Lc * U0)} cm de la punta (${n1(r.sag)} cm). En la punta y en la esquina no se hunde nada.`;
}

function pintarPatas() {
  const p = st.aj;
  $('#pataSvg').innerHTML = svgPata();
  $('#pataMedidas').innerHTML = `
    <div><dt>Largo</dt><dd>${n1(p.pataLargo)} <small>cm</small></dd></div>
    <div><dt>Lado ancho</dt><dd>${n1(p.pataArriba)} <small>cm</small></dd></div>
    <div><dt>Lado angosto</dt><dd>${n1(p.pataAbajo)} <small>cm</small></dd></div>`;
}

function pintarLona(r) {
  const ac = acomodo(r);
  $('#lonaTotal').textContent = `${n1(ac.largo / 100)} m`;
  $('#lonaRollo').textContent = `de rollo de ${n0(st.aj.rollo)} cm de ancho`;
  const filas = [];
  r.lados.forEach(l => l.piezas.forEach(pz => filas.push([`${pz.nombre}${r.lados.length > 1 ? ' · lado ' + n0(l.base) : ''}`, l.cant])));
  filas.push(['Patas', 4]);
  $('#lonaLista').innerHTML = filas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v} <small>piezas</small></dd></div>`).join('');
  $('#rolloSvg').innerHTML = svgRollo(r, ac);
  return ac;
}

function textoWhatsApp(r, ac) {
  let t = `*MOLDES CARPA PLEGABLE ${tam()}*\n`;
  r.lados.forEach(l => {
    t += `\n*Lado de ${n0(l.base)} cm* (cortar ${l.cant})\n`;
    l.piezas.forEach(pz => { t += `• ${pz.nombre}: abajo ${n1(pz.abajo)}, alto ${n1(pz.alto)}${pz.arriba ? ', arriba ' + n1(pz.arriba) : ', en punta'}\n`; });
    t += `Curva (recta de ${n1(l.Lc)} cm), desde la punta → se hunde:\n`;
    t += st.puntos.filter(d => d <= l.Lc).map(d => `   ${n1(d)} cm → ${n1(enRecta(l, d).f)} cm`).join('\n') + '\n';
  });
  t += `\n*Patas* (cortar 4): largo ${n1(st.aj.pataLargo)}, ancho ${n1(st.aj.pataArriba)}, angosto ${n1(st.aj.pataAbajo)}\n*Lona:* ≈ ${n1(ac.largo / 100)} m`;
  return t;
}

function pintarAjustes() {
  const p = st.aj;
  $('#ajustes').innerHTML = AJUSTES.map(([k, nombre, u, ayuda, auto]) => `
    <div class="ajuste">
      <label for="aj-${k}">${nombre} (${u})</label>
      <input id="aj-${k}" data-k="${k}" type="number" inputmode="decimal" step="0.5" value="${auto && p[auto] ? n1(k === 'H' ? st.r.H : st.r.sag).replace(',', '.') : p[k]}" ${auto && p[auto] ? 'disabled' : ''}>
      ${ayuda ? `<small>${ayuda}</small>` : ''}
      ${auto ? `<label class="auto"><input type="checkbox" data-auto="${auto}" ${p[auto] ? 'checked' : ''}> Calcular solo según el tamaño</label>` : ''}
    </div>`).join('');
}

const cada20 = Lc => { const a = []; for (let d = 20; d < Lc - 5; d += 20) a.push(d); return a; };

function pintar() {
  st.r = calcular();
  const r = st.r;
  $('#pillCarpa').textContent = `Plegable ${tam()}`;
  pintarCarpa();
  pintarPiezas(r);
  pintarCurva(r);
  pintarPatas();
  st.ac = pintarLona(r);
  guardarLS('carpa', { a: st.a, b: st.b });
  guardarLS('puntos', st.puntos);
}

function ir(v) {
  st.vista = v;
  $$('.vista[id^="v-"]').forEach(s => { s.hidden = s.id !== 'v-' + v; });
  $$('#tabs button').forEach(b => { if (b.dataset.v === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (v === 'ajustes') pintarAjustes();
  window.scrollTo(0, 0);
}

// ---------- eventos ----------
$('#tamanos').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.s === 'otra') { $('#otra').hidden = false; $$('#tamanos button').forEach(x => x.classList.toggle('activo', x === b)); return; }
  const [a, c] = b.dataset.s.split('x').map(Number);
  st.a = a * 100; st.b = c * 100; $('#otra').hidden = true; st.puntos = null; pintar();
});
function fijarMedida(id, v) {
  v = Math.min(6, Math.max(1, Math.round(v * 2) / 2));
  if (id === 'largo') st.a = v * 100; else st.b = v * 100;
  st.puntos = null; pintar();
}
$$('.stepper button').forEach(b => b.addEventListener('click', () => {
  const id = b.dataset.campo, v = parseFloat($('#' + id).value) || 3;
  fijarMedida(id, v + parseFloat(b.dataset.paso));
}));
['largo', 'ancho'].forEach(id => $('#' + id).addEventListener('change', e => fijarMedida(id, parseFloat(String(e.target.value).replace(',', '.')) || 3)));
$('#verMoldes').addEventListener('click', () => ir('piezas'));
$('#pillCarpa').addEventListener('click', () => ir('carpa'));
$('#btnAjustes').addEventListener('click', () => ir('ajustes'));
$('#cerrarAjustes').addEventListener('click', () => ir('piezas'));
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) ir(b.dataset.v); });

// curva
function moverA(d) { st.d = Math.round(d * 2) / 2; pintarCurva(st.r); }
$('#slider').addEventListener('input', e => moverA(parseFloat(e.target.value)));
$$('[data-mover]').forEach(b => b.addEventListener('click', () => moverA(st.d + parseFloat(b.dataset.mover))));
let arrastrando = false;
function arrastrar(ev) {
  const svg = $('#curvaDibujo'); if (!svg) return;
  const l = st.r.lados[st.lado];
  const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
  const c = pt.matrixTransform(svg.getScreenCTM().inverse());
  moverA(Math.min(l.Lc, Math.max(0, curvaGeo(l).dDe(c.x, c.y))));
}
$('#curvaSvg').addEventListener('pointerdown', e => { arrastrando = true; e.currentTarget.setPointerCapture(e.pointerId); arrastrar(e); });
$('#curvaSvg').addEventListener('pointermove', e => { if (arrastrando) arrastrar(e); });
$('#curvaSvg').addEventListener('pointerup', () => { arrastrando = false; });
$('#curvaSvg').addEventListener('pointercancel', () => { arrastrando = false; });
$('#marcar').addEventListener('click', () => {
  if (!st.puntos.includes(st.d)) st.puntos.push(st.d);
  st.puntos.sort((a, b) => a - b); guardarLS('puntos', st.puntos); pintarCurva(st.r);
});
$('#cada20').addEventListener('click', () => { st.puntos = cada20(st.r.lados[st.lado].Lc); guardarLS('puntos', st.puntos); pintarCurva(st.r); });
$('#limpiar').addEventListener('click', () => { st.puntos = []; guardarLS('puntos', st.puntos); pintarCurva(st.r); });
$('#puntos').addEventListener('click', e => { const b = e.target.closest('.quitar'); if (b) { st.puntos.splice(+b.dataset.i, 1); guardarLS('puntos', st.puntos); pintarCurva(st.r); } });
$('#ladoSel').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { st.lado = +b.dataset.i; pintarCurva(st.r); } });

// ajustes
$('#ajustes').addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.auto) st.aj[t.dataset.auto] = t.checked;
  else if (t.dataset.k) { const v = parseFloat(String(t.value).replace(',', '.')); if (v > 0) st.aj[t.dataset.k] = v; }
  if (!(st.aj.rollo > st.aj.selle + 10)) st.aj.rollo = DEF.rollo;
  guardarLS('ajustes', st.aj); pintar(); pintarAjustes();
});
$('#restaurar').addEventListener('click', () => { st.aj = { ...DEF }; guardarLS('ajustes', st.aj); pintar(); pintarAjustes(); });

// compartir
$('#compartir').addEventListener('click', async () => {
  const t = textoWhatsApp(st.r, st.ac);
  if (navigator.share) { try { await navigator.share({ text: t }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  location.href = 'https://wa.me/?text=' + encodeURIComponent(t);
});

// ---------- clave ----------
async function sha(t) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
let pin = '';
function pintarPin() { $$('#pinPuntos i').forEach((i, k) => i.classList.toggle('lleno', k < pin.length)); }
$('#teclado').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.k === 'borrar') pin = pin.slice(0, -1); else if (pin.length < 4) pin += b.textContent;
  $('#pinError').textContent = ''; pintarPin();
  if (pin.length === 4) {
    if (await sha(pin) === PIN_HASH) { guardarLS('ok', true); abrir(); }
    else { $('#pinPuntos').classList.add('mal'); $('#pinError').textContent = 'Clave incorrecta'; setTimeout(() => { pin = ''; pintarPin(); $('#pinPuntos').classList.remove('mal'); }, 400); }
  }
});
function abrir() { $('#pin').hidden = true; $('#app').hidden = false; pintar(); ir('carpa'); }
if (leerLS('ok', false)) abrir(); else $('#pin').hidden = false;

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
