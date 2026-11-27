// RAKSHIO offline shell. Plain JS, no build step — it is served as-is
// from public/. Bump CACHE on every deploy; the old cache is deleted on
// activate, and the running page keeps the old worker until reload, so an
// update can never break the panic path mid-session.
const CACHE = 'rakshio-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/rakshio-bg.jpg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  // Hashed build assets never change content — cache first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(
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
        caches.match(event.request).then((hit) => hit ?? caches.match('/index.html')),
      ),
  );
});
