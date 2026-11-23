const CACHE_NAME = 'planet-talent-casting-v36';
const OFFLINE_URL = '/';
const CASTING_URL = '/casting';
const CASTING_VIDEO_PATH = '/assets/aistudio/Casting_Planet_2c988d68.mp4';

const CORE_ASSETS = [
  '/',
  '/casting',
  '/manifest.json',
  '/manifest-casting.json',
  '/favicon.svg',
  '/favicon.png',
  '/Logo de Planet Talent.PNG',
  '/logo_planet_talent.png',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/assets/aistudio/casting_flyer_top.jpg',
  '/assets/aistudio/casting_video_poster.jpg',
];

async function cacheAppShellAndMedia(cache) {
  await Promise.allSettled(
    CORE_ASSETS.map(async (url) => {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (res.ok && res.status === 200) {
        await cache.put(url, res.clone());
      }
    })
  );

  // Precachear bundles JS/CSS de Vite descubiertos en el HTML inicial
  try {
    const htmlRes = await cache.match(OFFLINE_URL);
    if (htmlRes) {
      const html = await htmlRes.clone().text();
      const assetMatches = new Set();
      const assetRegex = /(?:src|href)=["'](\/assets\/[^"']+\.(?:js|css))["']/g;
      let match;
      while ((match = assetRegex.exec(html)) !== null) {
        assetMatches.add(match[1]);
      }
      await Promise.allSettled(
        Array.from(assetMatches).map(async (assetUrl) => {
          const res = await fetch(new Request(assetUrl, { cache: 'reload' }));
          if (res.ok && res.status === 200) {
            await cache.put(assetUrl, res);
          }
        })
      );
    }
  } catch {
    // ignore HTML parsing errors
  }

  // Precachear explícitamente el video MP4 completo (200 OK sin Range) para reproducción offline
  try {
    const videoRes = await fetch(new Request(CASTING_VIDEO_PATH, { cache: 'reload' }));
    if (videoRes.ok && videoRes.status === 200) {
      await cache.put(CASTING_VIDEO_PATH, videoRes);
    }
  } catch {
    // ignore if offline during install
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cacheAppShellAndMedia(cache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  return self.clients.claim();
});

async function handleVideoRangeRequest(request, pathname) {
  const cachedVideo = await caches.match(pathname);
  if (!cachedVideo) {
    try {
      const fullRes = await fetch(new Request(pathname));
      if (fullRes.ok && fullRes.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(pathname, fullRes.clone());
        return serveRangeOrFull(fullRes, request);
      }
    } catch {
      return new Response('Video offline unavailable', { status: 503 });
    }
    return fetch(request);
  }
  return serveRangeOrFull(cachedVideo, request);
}

async function serveRangeOrFull(response, request) {
  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) {
    return response;
  }

  const buffer = await response.arrayBuffer();
  const totalLength = buffer.byteLength;
  const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  if (!match) {
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(totalLength),
        'Accept-Ranges': 'bytes',
      },
    });
  }

  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), totalLength - 1) : totalLength - 1;
  if (start >= totalLength || start > end) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${totalLength}` },
    });
  }

  const sliced = buffer.slice(start, end + 1);
  return new Response(sliced, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Range': `bytes ${start}-${end}/${totalLength}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(sliced.byteLength),
      'Content-Type': 'video/mp4',
    },
  });
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // No cachear endpoints API
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Soporte completo offline + Range 206 para el video MP4 del casting
  if (url.pathname.match(/\.(mp4|webm)$/i)) {
    event.respondWith(handleVideoRangeRequest(event.request, url.pathname));
    return;
  }

  const isGoogleFont =
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com';
  const isImage =
    event.request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i);
  const isFont =
    event.request.destination === 'font' ||
    url.pathname.match(/\.(woff|woff2|ttf|otf)$/i);
  const isStaticBundle = url.pathname.startsWith('/assets/') && url.pathname.match(/\.(js|css)$/i);

  if (isStaticBundle) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        })
    );
    return;
  }

  if (isImage || isFont || isGoogleFont) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              (networkResponse.status === 200 || networkResponse.type === 'opaque')
            ) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
      })
    );
    return;
  }

  // Navegación y otros GET: Network-first con fallback robusto a caché offline
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse =
          (await caches.match(event.request)) ||
          (await caches.match(url.pathname));
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(CASTING_URL)) ||
            (await cache.match(OFFLINE_URL)) ||
            new Response('Offline', { status: 503 })
          );
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});
