'use strict';
// ===== Página de inicio: saludo, módulos del taller y catálogo de proyectos con su render =====
// Los proyectos tienen 3 cosas: el render (Blender), las medidas clave y, más adelante, fotos de la vida real.
// Para sumar fotos reales a un proyecto: poner las rutas en `reales` (ej. ['real/cochera-1.jpg']).

const PROYECTOS = [
  { id: 'plegable', nombre: 'Plegable', sub: 'con curva · 3 × 3', ir: 'carpa', render: 'piezas', poster: 'render/poster-plegable.jpg',
    medidas: [['Lados', '300 × 300'], ['Patas', '237'], ['Punta', '330 del piso'], ['Molde', '303 · gola 40']], reales: [] },
  { id: 'tres', nombre: '3 puntas', sub: 'plegable 6 × 3', ir: 'tres', render: 'tres', poster: 'render/poster-tres-puntas.jpg',
    medidas: [['Medida', '6 × 3 (hasta 6 × 6)'], ['Patas', '212'], ['Tubo del pico', '143,5'], ['Arista', '245 en todas']], reales: [] },
  { id: 'cochera', nombre: 'Cochera', sub: 'retráctil', ir: 'cochera', render: 'cochera', poster: 'render/poster-cochera.jpg',
    medidas: [['Medida', '4,70 × 2,25 × 2,27'], ['Arcos', '7 iguales'], ['Gajos', '6 de 1 molde'], ['Gajo', '638 × 123,7']], reales: [] },
  { id: 'glamping', nombre: 'Glamping', sub: 'campamento', ir: 'glamping', render: 'glamping', poster: 'render/poster-glamping.jpg',
    medidas: [['Medida', '3 × 3,90'], ['Largo', '0,80 + 2,40 + 0,70'], ['Ventana', '70, visera de 50'], ['Techo', '2 franjas de 2 m']], reales: [] },
  { id: 'bolso', nombre: 'Bolsito', sub: 'de herramientas', ir: 'bolso', render: 'bolso', poster: 'render/poster-bolsito.jpg',
    medidas: [['Piezas', '4'], ['Armado', '4 atrás del 1'], ['', '2 sobre 1 · 3 sobre 2']], reales: [] },
];

const MODULOS = [
  { id: 'estructura', t: 'Estructura', d: 'Medidas de tubos, patas y crucetas', c: 'azul', listo: false,
    ico: '<path d="M4 21V9l8-6 8 6v12M4 9h16M8 21v-8h8v8M12 3v18"/>' },
  { id: 'cortes', t: 'Carpa y sus cortes', d: 'Moldes, curva, patas y rollo', c: 'rojo', listo: true,
    ico: '<path d="M3 20V13Q8 12 12 4Q16 12 21 13V20Z"/><path d="M6 20l3-7M18 20l-3-7"/>' },
  { id: 'cotizar', t: 'Cotizaciones', d: 'Precio por lona, tubo y mano de obra', c: 'tinta', listo: false,
    ico: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>' },
  { id: 'catalogo', t: 'Proyectos', d: 'Catálogo con render y medidas', c: 'lona', listo: true,
    ico: '<rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/>' },
];

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function pintarInicio() {
  document.body.classList.add('en-inicio');
  const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#inSaludo').textContent = saludo();
  $('#inFecha').textContent = hoy.charAt(0).toUpperCase() + hoy.slice(1);
  $('#inModulos').innerHTML = MODULOS.map(m => `
    <button class="in-mod in-${m.c}" data-mod="${m.id}" ${m.listo ? '' : 'aria-disabled="true"'}>
      <svg viewBox="0 0 24 24" aria-hidden="true">${m.ico}</svg>
      <div><b>${m.t}</b><span>${m.d}</span></div>${m.listo ? '<i aria-hidden="true">›</i>' : '<em>Pronto</em>'}
    </button>`).join('');
}
function pintarProyectos() {
  $('#inProyectos').innerHTML = PROYECTOS.map(p => `
    <article class="in-proy">
      <button class="in-foto" data-render="${p.render}" aria-label="Ver el render de ${p.nombre}">
        <img src="${p.poster}" alt="" loading="lazy" width="528" height="360"><span class="in-play">▶ Render</span>
      </button>
      <div class="in-info">
        <h3>${p.nombre} <small>${p.sub}</small></h3>
        <dl>${p.medidas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        <div class="in-acc">
          <button class="in-btn" data-ir="${p.ir}">Moldes</button>
          ${p.reales.length ? `<button class="in-btn sec" data-real="${p.id}">En la vida real</button>`
            : '<span class="in-real">📷 En la vida real · pronto</span>'}
        </div>
      </div>
    </article>`).join('');
}

const clicInicio = e => {
  const m = e.target.closest('[data-mod]'), r = e.target.closest('[data-render]'), i = e.target.closest('[data-ir]');
  if (m) {
    const id = m.dataset.mod;
    if (id === 'cortes') ir('carpa');
    else if (id === 'catalogo') ir('proyectos');
    else { m.classList.remove('nada'); void m.offsetWidth; m.classList.add('nada'); }
  } else if (r) abrirRender(r.dataset.render);
  else if (i) ir(i.dataset.ir);
};
$('#v-inicio').addEventListener('click', clicInicio);
$('#v-proyectos').addEventListener('click', clicInicio);
$('.barra-logo').addEventListener('click', () => ir('inicio'));
if (st.vista === 'inicio') pintarInicio();
