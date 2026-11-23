'use strict';
// ===== Ventana del render: el video se maneja con el dedo (pausa, atrás, adelante, poquito a poco, más lento) =====
// La lista de videos está en RENDERS (app.js). Una entrada puede ser un video o una lista de videos con `tab`.
const MR = { v: $('#mrVideo'), t: null, pide: null, arrastra: null, toco: false, vel: 0, lista: [] };
const MR_VEL = [['Normal', 1], ['Lento', .5], ['Muy lento', .25], ['Rápido', 2]];
const mrDur = () => (isFinite(MR.v.duration) && MR.v.duration) || 0;
const mrAhora = () => MR.t !== null ? MR.t : MR.v.currentTime;

// un salto a la vez: si el dedo va más rápido que el video, solo cuenta el último
function mrIrA(t) {
  const d = mrDur(); if (!d) return;
  t = Math.min(d - .03, Math.max(0, t));
  MR.t = t; mrPinta(t);
  if (MR.v.seeking) { MR.pide = t; return; }
  MR.v.currentTime = t;
}
MR.v.addEventListener('seeked', () => {
  if (MR.pide !== null) { const t = MR.pide; MR.pide = null; MR.v.currentTime = t; } else MR.t = null;
});
function mrPinta(t) {
  const d = mrDur(); if (!d) return;
  const l = $('#mrLinea'); l.value = t / d * 1000; l.style.setProperty('--p', (t / d * 100).toFixed(2) + '%');
}
function mrEstado() {
  const p = MR.v.paused;
  $('#mrPlayD').setAttribute('d', p ? 'M7 4l13 8-13 8z' : 'M6 4h4v16H6zM14 4h4v16h-4z');
  $('#mrPlay').setAttribute('aria-label', p ? 'Reproducir' : 'Pausar');
}
function mrPlay() { MR.v.play().catch(() => {}); }
function mrPausaMano() { MR.toco = true; MR.v.pause(); mrEstado(); }
function mrAlternar() { MR.toco = false; if (MR.v.paused) mrPlay(); else MR.v.pause(); mrEstado(); }
['play', 'pause'].forEach(e => MR.v.addEventListener(e, mrEstado));
function mrLoop() {
  if ($('#modalRender').hidden) return;
  if (MR.t === null && mrDur()) mrPinta(MR.v.currentTime);
  requestAnimationFrame(mrLoop);
}
function mrVel(i) { MR.vel = i; MR.v.defaultPlaybackRate = MR.v.playbackRate = MR_VEL[i][1]; $('#mrVel').textContent = MR_VEL[i][0]; }

function mrCarga(i) {
  const r = MR.lista[i];
  $$('#mrTabs button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
  MR.t = MR.pide = null; MR.toco = false;
  if (MR.v.getAttribute('src') !== r.src) { MR.v.preload = 'auto'; MR.v.src = r.src; } else MR.v.currentTime = 0;
  $('#mrTitulo').textContent = r.titulo; $('#mrNota').textContent = r.nota;
  $('#mrMarcas').innerHTML = (r.marcas || []).map(([n, t]) => `<button data-t="${t}">${n}</button>`).join('');
  $('#mrLinea').value = 0; $('#mrLinea').style.setProperty('--p', '0%');
  mrVel(0); mrPlay();
}
function abrirRender(clave, i = 0) {
  if (!RENDERS[clave]) return;
  MR.lista = [].concat(RENDERS[clave]);
  $('#mrTabs').hidden = MR.lista.length < 2;
  $('#mrTabs').innerHTML = MR.lista.map(r => `<button>${r.tab || ''}</button>`).join('');
  $('#modalRender').hidden = false; mrCarga(i); requestAnimationFrame(mrLoop);
}
function cerrarRender() { MR.v.pause(); $('#modalRender').hidden = true; }

$('#btnRender').addEventListener('click', () => abrirRender(st.vista));
$('#mrCerrar').addEventListener('click', cerrarRender);
$('#modalRender').addEventListener('click', e => { if (e.target.id === 'modalRender') cerrarRender(); });
$('#mrTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) mrCarga([...$$('#mrTabs button')].indexOf(b)); });
$('#mrMarcas').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { mrPausaMano(); mrIrA(+b.dataset.t); } });
$('#mrVel').addEventListener('click', () => mrVel((MR.vel + 1) % MR_VEL.length));
$('#mrPlay').addEventListener('click', mrAlternar);
$('#mrAtras2').addEventListener('click', () => mrIrA(mrAhora() - 2));
$('#mrAdel2').addEventListener('click', () => mrIrA(mrAhora() + 2));
$('#mrLinea').addEventListener('input', e => { mrPausaMano(); mrIrA(e.target.value / 1000 * mrDur()); });

// «poquito»: un toque mueve un cuadro; si se deja oprimido, sigue andando (también hacia atrás)
[['#mrPaso0', -1], ['#mrPaso1', 1]].forEach(([id, s]) => {
  const b = $(id); let h = 0, espera = 0;
  const paso = () => mrIrA(mrAhora() + s / 24);
  const para = () => { clearTimeout(espera); clearInterval(h); };
  b.addEventListener('pointerdown', e => {
    if (e.button) return;
    para(); mrPausaMano(); paso();
    espera = setTimeout(() => { h = setInterval(paso, 42); }, 300);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, para));
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('click', e => { if (e.detail === 0) { mrPausaMano(); paso(); } });   // con el teclado
});

// deslizar el dedo sobre el video lo mueve adelante y atrás; un toque lo pausa o lo sigue
{
  const m = $('#mrMarco'); let x0 = 0, t0 = 0, movio = false;
  m.addEventListener('pointerdown', e => {
    if (e.button) return;
    MR.arrastra = e.pointerId; x0 = e.clientX; t0 = mrAhora(); movio = false;
    try { m.setPointerCapture(e.pointerId); } catch (_) { /* sin captura también sirve */ }
  });
  m.addEventListener('pointermove', e => {
    if (MR.arrastra !== e.pointerId) return;
    const dx = e.clientX - x0;
    if (!movio) { if (Math.abs(dx) < 8) return; movio = true; mrPausaMano(); }
    mrIrA(t0 + dx / m.clientWidth * Math.min(12, mrDur()));
  });
  const fin = e => {
    if (MR.arrastra !== e.pointerId) return;
    MR.arrastra = null;
    if (!movio && e.type === 'pointerup') mrAlternar();
  };
  m.addEventListener('pointerup', fin); m.addEventListener('pointercancel', fin);
}
document.addEventListener('keydown', e => {
  if ($('#modalRender').hidden) return;
  if (e.key === 'Escape') cerrarRender();
  else if (e.target.tagName === 'INPUT') return;
  else if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); mrAlternar(); }
  else if (e.key === 'ArrowLeft') mrIrA(mrAhora() - .5);
  else if (e.key === 'ArrowRight') mrIrA(mrAhora() + .5);
});
