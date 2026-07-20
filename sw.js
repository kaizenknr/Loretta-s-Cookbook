/* Loretta's Cookbook — service worker
   Makes the app work fully offline once installed, so it never "goes down."
   - App shell (HTML/icons/manifest): cache-first.
   - recipes.json: network-first (so newly dropped recipes appear when online),
     falling back to the cached copy when offline.
   Bump CACHE_VERSION whenever you change index.html or the icons. */
const CACHE_VERSION = 'lc-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // recipes.json — network-first so new drops show up, cache as fallback
  if (url.pathname.endsWith('recipes.json')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // navigations — serve app shell so deep links / offline still load
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  // everything else — cache-first
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
