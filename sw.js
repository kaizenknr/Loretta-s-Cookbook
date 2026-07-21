/* Loretta's Cookbook — service worker
   Works fully offline once installed, but always prefers the latest online:
   - The app HTML (navigations): network-first, HTTP-cache bypassed, so a new
     deploy shows up on the very next open. Cache is only the offline fallback.
   - recipes.json: network-first (new drops appear), cached as fallback.
   - icons/splash: cache-first (they rarely change; CACHE_VERSION busts them).
   The page also auto-activates a new worker and reloads (see index.html). */
const CACHE_VERSION = 'lc-v9';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './splash.jpg'
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

// Let the page tell a freshly-installed worker to take over immediately.
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
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

  // navigations (the app HTML) — network-first, bypassing the HTTP cache so a new
  // deploy is always picked up; fall back to cache only when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // everything else — cache-first
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});

/* ---- Web Push: recipe drops + background cooking-timer alerts ----
   The server (see /api and HANDOFF.md §6c) sends a JSON payload:
   { title, body, url, tag }. Shows the notification even when the app
   is closed; tapping it focuses/opens the app. */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  const title = d.title || "Loretta's Cookbook";
  const opts = {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || './' }
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) { w.focus(); if (w.navigate && target !== './') w.navigate(target); return; }
      }
      return self.clients.openWindow(target);
    })
  );
});
