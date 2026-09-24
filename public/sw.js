const CACHE_PREFIX = 'aniwhere-core-';
const CACHE_NAME = `${CACHE_PREFIX}v4`;
const CORE_ROUTES = ['/', '/discover', '/saved', '/compare', '/bagsakan', '/bagsakan/preview', '/buyer', '/manifest.webmanifest', '/favicon.svg', '/ani/ani-avatar.webp'];

async function cacheCore() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(
    CORE_ROUTES.map(async (route) => {
      const response = await fetch(route, { cache: 'reload' });
      if (response.ok) await cache.put(route, response);
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheCore().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

async function networkFirstNavigation(request) {
  const url = new URL(request.url);
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      // Cache only the pathname, never the farmer's query string.
      await cache.put(url.pathname, response.clone());
    }
    return response;
  } catch {
    return (
      (await cache.match(url.pathname)) ||
      (await cache.match('/')) ||
      new Response('AniWhere is offline and this page has not been cached yet.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    );
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith('/generated/routes/')) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  if (['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)) {
    event.respondWith(cacheFirstAsset(request));
  }
});
