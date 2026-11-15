// TATTVA AI - Production Service Worker (PWA)
const CACHE_NAME = 'tattva-ai-v4';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-192-v2.png',
  '/icon-512.png',
  '/icon-512-v2.png',
  '/maskable-icon-192.png',
  '/maskable-icon-192-v2.png',
  '/maskable-icon-512.png',
  '/maskable-icon-512-v2.png',
  '/favicon.png',
  '/favicon-v2.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon-v2.png',
  '/logo.png',
  '/logo-v2.png'
];

// Install: Cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Purge old cache versions immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for APIs, navigations, manifest and icons; cache-fallback for other static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests; never intercept cross-origin API or external calls
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never cache API calls or auth requests (Security & Accuracy)
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return;
  }

  // Never intercept SEO crawler files (sitemap.xml, robots.txt)
  if (
    url.pathname === '/sitemap.xml' ||
    url.pathname === '/robots.txt' ||
    url.pathname.endsWith('.xml') ||
    url.pathname.endsWith('.txt')
  ) {
    return;
  }

  // Always fetch manifest.json and icons NETWORK-FIRST so brand/icon updates apply immediately
  if (
    url.pathname === '/manifest.json' ||
    url.pathname.includes('icon') ||
    url.pathname.includes('logo') ||
    url.pathname.includes('favicon')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Other static assets (fonts, stylesheets): Cache-first with network fallback
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // HTML Page Navigations: Network-first with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cached) => {
        return cached || caches.match('/');
      });
    })
  );
});
