const CACHE = "pecs-v1";

// Pre-cache the app shell on install
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["/", "/api/cards"]).catch(() => {}))
  );
});

// Remove old caches on activate
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // ARASAAC images: cache-first (they never change)
  if (url.hostname === "static.arasaac.org") {
    e.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((r) => {
              if (r.ok) {
                const clone = r.clone();
                cache.put(request, clone);
              }
              return r;
            })
        )
      )
    );
    return;
  }

  // API routes: network-first, fall back to cache so the app works offline
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(request)
        .then((r) => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return r;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // App shell (pages, assets): stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then((r) => {
        if (r.ok) {
          const clone = r.clone();
          cache.put(request, clone);
        }
        return r;
      });
      return cached ?? fetchPromise;
    })
  );
});
