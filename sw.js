const CACHE_NAME = 'whatsapp-bot-cache-v1';

// We don't pre-cache in a network-first strategy, just activate.
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Clean up old caches on activation.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Network-first caching strategy.
self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // If we get a valid response, we cache it and return it.
        return caches.open(CACHE_NAME).then(cache => {
          // Do not cache chrome-extension urls
          if (!event.request.url.startsWith('http')) {
              return networkResponse;
          }
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // If the fetch fails (e.g., offline), we try to get it from the cache.
        return caches.match(event.request).then(response => {
          return response || new Response("You are offline. Please check your internet connection.");
        });
      })
  );
});
