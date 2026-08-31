const CACHE_NAME = 'planet-talent-assets-v22';
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache core assets needed for offline start
      return cache.addAll([
        OFFLINE_URL,
        '/manifest.json',
        '/favicon.svg',
        '/favicon.png',
        '/Logo de Planet Talent.PNG',
        '/logo_planet_talent.png',
        '/apple-touch-icon.png',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/icons/icon-maskable-512.png'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET (POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  
  // Identificar si la petición es para una imagen o fuente
  const isImage = event.request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i);
  const isFont = event.request.destination === 'font' || url.pathname.match(/\.(woff|woff2|ttf|otf)$/i);

  if (isImage || isFont) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Cache-first: devolver desde la caché si existe
        if (cachedResponse) {
          return cachedResponse;
        }

        // Si no está en caché, hacer la petición a la red
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
        });
      })
    );
  } else {
    // Para otras peticiones GET (HTML, JS, CSS), usar Network-first con fallback a caché
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          const offlineHtml = await cache.match(OFFLINE_URL);
          if (offlineHtml) {
            return offlineHtml;
          }
        }
        return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
      })
    );
  }
});
