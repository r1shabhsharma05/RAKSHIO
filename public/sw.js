// RAKSHIO offline shell. Plain JS, no build step — it is served as-is
// from public/. Bump CACHE on every deploy; the old cache is deleted on
// activate, and the running page keeps the old worker until reload, so an
// update can never break the panic path mid-session.
// Step 19 (A9): skipWaiting + clients.claim — without them the worker only
// takes control after a real reload, so an offline reload on the very
// first visit served a blank page.
const CACHE = 'rakshio-v3';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/rakshio-bg.jpg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Step 19 (A9): the first-visit page loads its JS/CSS before the worker
// takes control, so those requests never pass through the worker and are
// never cached — an offline reload then serves index.html with a dead
// script tag and a blank page. The app posts the asset URLs it loaded;
// the worker caches them, so the first-visit offline reload renders too.
// Per-URL catch: one bad URL must not fail the whole batch.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'cache-assets' || !Array.isArray(event.data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(event.data.urls.map((url) => cache.add(url).catch(() => undefined))),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  // Hashed build assets never change content — cache first.
  // ignoreVary: the server sends `Vary: Origin` on assets, and entries
  // cached via cache.add() carry no Origin header, so a plain match
  // returns null for the page's CORS asset requests (module scripts are
  // crossorigin) — the offline reload then failed with net::ERR_FAILED
  // even though the bundle was in the cache. Matching ignores Vary
  // because these are same-origin hashed files; the URL alone is the key.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request, { ignoreVary: true }).then(
        (hit) =>
          hit ??
          fetch(event.request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Shell and pages: network first so updates arrive, cache fallback offline.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() =>
        caches
          .match(event.request, { ignoreVary: true })
          .then((hit) => hit ?? caches.match('/index.html', { ignoreVary: true })),
      ),
  );
});
