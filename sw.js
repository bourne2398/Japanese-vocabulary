const CACHE_NAME = 'japanese-vocabulary-rebuild-20261017-v6';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=20261017-landscape-rebuild-v6',
  './app.js?v=20261017-landscape-rebuild-v6',
  './lesson-data-1-78.js?v=20261017-landscape-rebuild-v6',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('japanese-vocabulary-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Prefer fresh deployed assets; fall back to this build's offline cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put('./index.html', response.clone()));
        return response;
      }).catch(() => caches.open(CACHE_NAME).then(cache => cache.match('./index.html')))
    );
    return;
  }

  const isAppAsset = /\.(?:js|css|json|svg)(?:\?|$)/i.test(new URL(request.url).pathname + new URL(request.url).search);
  if (isAppAsset) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      }).catch(() => caches.open(CACHE_NAME).then(cache => cache.match(request)))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => cache.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })))
  );
});
