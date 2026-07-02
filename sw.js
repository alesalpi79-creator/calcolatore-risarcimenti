const CACHE_NAME = 'calcolatore-risarcimenti-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/logo.png',
  './assets/icon-512.png'
];

// Installazione e caching degli asset statici
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Attivazione e pulizia dei vecchi cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Strategia di fetch: Stale-While-Revalidate (mostra subito la cache, aggiorna in background)
self.addEventListener('fetch', event => {
  // Ignora le richieste esterne (es. CDN di chart.js o html2pdf) per evitare errori di caching offline
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Avvia il recupero in background per aggiornare la cache
        fetch(event.request).then(networkResponse => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* Ignora errori di rete offline */});
        
        return cachedResponse;
      }
      
      return fetch(event.request);
    })
  );
});
