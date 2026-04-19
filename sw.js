// ─── Cache version ────────────────────────────────────────────────────────────
// This timestamp is replaced at build/deploy time by the deploy script.
// Every new deploy gets a unique version → old caches are wiped automatically.
const CACHE_VERSION = '1776626623681';
const CACHE_NAME    = `smartwash-v${CACHE_VERSION}`;

// Static shell assets to pre-cache on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './favicon.svg',
  './icon-rounded.svg',
  './manifest.webmanifest',
];

// ─── Install: pre-cache shell, activate immediately ───────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())   // don't wait for old SW to die
  );
});

// ─── Activate: delete ALL old caches ──────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)   // keep only current version
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())        // take control of all open tabs
      .then(() => {
        // Tell every open tab to reload so they get fresh assets
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

// ─── Fetch strategy ───────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // API calls — never cache, always go to network
  if (url.hostname !== self.location.hostname) {
    return;
  }

  // HTML navigation — Network First (always try fresh, fall back to cache)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // JS / CSS / fonts — Network First (get fresh build assets, cache as fallback)
  const isAppAsset = /\.(js|css|woff2?|ttf)$/.test(url.pathname);
  if (isAppAsset) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Images / icons — Cache First (stable assets, serve from cache instantly)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match('./icon-rounded.svg') ?? null);
    })
  );
});
