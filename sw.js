// Primero la red (para que siempre llegue la versión nueva); si no hay señal, lo guardado.
const CACHE = 'moldes-v43';
const BASE = ['./', 'index.html', 'app.css', 'app.js', 'render.js', 'cochera.js', 'glamping.js', 'bolso.js', 'tres.js', 'inicio.js', 'fondo/carpa-blanca.jpg', 'icons/logo-oscuro.png', 'manifest.webmanifest', 'icons/logo-claro.png', 'icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (/\.mp4(\?|$)/.test(e.request.url)) return;   // los videos van directo (el iPhone pide por partes)
  const mio = new URL(e.request.url).origin === location.origin;
  // los archivos de la app se piden siempre frescos (sin la copia del navegador)
  e.respondWith(
    (mio ? fetch(e.request.url, { cache: 'no-store' }) : fetch(e.request))
      .then(res => {
        if (res.ok || res.type === 'opaque') { const copia = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
