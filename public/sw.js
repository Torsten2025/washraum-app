const CACHE_NAME = 'waschzeit-pwa-v0.3.0-test.3-admin-i18n-1';
const SHELL_ASSETS = [
  '/login.html',
  '/index.html',
  '/privacy.html',
  '/styles.css',
  '/i18n.js',
  '/intro-content.js',
  '/intro-media.js',
  '/login.js',
  '/app.js',
  '/reset.js',
  '/manifest.webmanifest',
  '/assets/app-icon.svg',
  '/assets/intro/media/manifest.json',
  '/assets/intro/media/resident-de-poster.png',
  '/assets/intro/media/resident-de.vtt',
  '/assets/intro/media/resident-de.txt',
  '/assets/intro/media/resident-en-poster.png',
  '/assets/intro/media/resident-en.vtt',
  '/assets/intro/media/resident-en.txt',
  '/assets/intro/media/house-admin-de-poster.png',
  '/assets/intro/media/house-admin-de.vtt',
  '/assets/intro/media/house-admin-de.txt',
  '/assets/intro/media/house-admin-en-poster.png',
  '/assets/intro/media/house-admin-en.vtt',
  '/assets/intro/media/house-admin-en.txt',
  '/assets/intro/media/superadmin-de-poster.png',
  '/assets/intro/media/superadmin-de.vtt',
  '/assets/intro/media/superadmin-de.txt',
  '/assets/intro/media/superadmin-en-poster.png',
  '/assets/intro/media/superadmin-en.vtt',
  '/assets/intro/media/superadmin-en.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clients) => Promise.all(clients.map((client) => client.postMessage({ type: 'SW_ACTIVATED' }))))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (
    requestUrl.origin !== self.location.origin
    || requestUrl.pathname.startsWith('/api/')
    || requestUrl.pathname.endsWith('.mp4')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || caches.match('/login.html')))
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'WaschZeit';
  const options = {
    body: payload.body || 'Es gibt einen neuen Hinweis im Waschplan.',
    icon: payload.icon || '/assets/app-icon.svg',
    badge: payload.badge || '/assets/app-icon.svg',
    tag: payload.tag || 'waschzeit',
    data: { url: payload.url || '/index.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/index.html', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.startsWith(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
