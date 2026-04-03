// ── Service Worker · Cruz de Guía 2026 ──────────────────────
const CACHE_NAME = 'cruz-de-guia-v1';
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // Fuentes Google
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Cormorant+Garamond:wght@300;400;600&family=UnifrakturCook:wght@700&display=swap',
  // HLS.js
  'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js'
];

// Instalación: precachear recursos esenciales
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS.map(function(url) {
        return new Request(url, { mode: 'no-cors' });
      }));
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activación: limpiar cachés antiguas
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first para recursos propios, network-first para APIs
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // APIs externas (meteorología, noticias, streams): solo red, sin caché
  if (
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('archive.org') ||
    url.hostname.includes('upload.wikimedia.org') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('youtu.be') ||
    url.hostname.includes('ivoox.com') ||
    url.hostname.includes('canalsur.es') ||
    url.pathname.includes('.m3u8') ||
    url.pathname.includes('.mp3') ||
    url.pathname.includes('.m4a') ||
    url.pathname.includes('.ogg')
  ) {
    event.respondWith(fetch(event.request).catch(function() {
      return new Response('Contenido no disponible sin conexión', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }));
    return;
  }

  // Recursos propios: cache-first con fallback a red
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        // Guardar respuestas válidas en caché
        if (response && response.status === 200 && response.type !== 'opaque') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Página offline de emergencia
        return caches.match('./index.html');
      });
    })
  );
});
