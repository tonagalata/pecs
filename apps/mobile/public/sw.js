// PictoTalk service worker for the web board: the whole app works with no internet once it has
// been opened one time.
//
//   app shell     every file of this build is downloaded at install (scripts/pwa.mjs writes the
//                 list below), then served from the cache. A new build gets a new cache, and the
//                 old one is removed once the new build has fully downloaded.
//   pages         every route is the same single-page index.html: network first (3 s), else saved.
//   HD voice      cache first; the app downloads the whole pack when HD voice is switched on.
//   ARASAAC       cache first; the app saves every symbol on the board in the background.
//   /api/         never cached (sharing and sync), and never intercepted.
const BUILD = '__PICTOTALK_BUILD__';
const PRECACHE = /* __PICTOTALK_PRECACHE__ */ [];
const SHELL = `pictotalk-shell-${BUILD}`;
const SYMBOLS = 'pictotalk-symbols-v1'; // keep in sync with src/lib/symbolCache.web.ts
const VOICE = 'pictotalk-voice-v1'; // keep in sync with src/lib/speech.ts
const BASE = new URL('./', self.location).pathname; // "/app/" on the server, "/" without a base URL
const INDEX = `${BASE}index.html`;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // Download in small batches; the index page must succeed, other files are retried on use.
    const urls = PRECACHE.map((p) => BASE + p);
    for (let i = 0; i < urls.length; i += 8) {
      await Promise.all(urls.slice(i, i + 8).map(async (url) => {
        if (await cache.match(url)) return;
        const res = await fetch(url, { cache: 'reload' }).catch(() => null);
        if (res && res.ok) await cache.put(url, res);
        else if (url === INDEX) throw new Error('index.html failed to download');
      }));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = new Set([SHELL, SYMBOLS, VOICE]);
    for (const key of await caches.keys()) if (key.startsWith('pictotalk-') && !keep.has(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function cacheFirst(cacheName, req, cors) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req.url, { ignoreSearch: false });
  if (hit) return hit;
  let res;
  // <img> requests are no-cors, whose responses hide their status. Ask with CORS (ARASAAC allows
  // it) so a missing pictogram is never saved as if it were an image.
  try { res = await fetch(cors ? new Request(req.url, { mode: 'cors', credentials: 'omit' }) : req); } catch (err) {
    if (cors) return fetch(req);
    throw err;
  }
  if (res.ok) cache.put(req.url, res.clone()).catch(() => {});
  return res;
}

// Network first, so a new build shows up on the first visit after it is deployed instead of the
// one before it. With no connection (or a very slow one) the saved copy opens instantly.
async function page() {
  const cache = await caches.open(SHELL);
  const net = fetch(INDEX, { cache: 'no-cache' }).then((res) => {
    if (res.ok) cache.put(INDEX, res.clone()).catch(() => {});
    return res;
  });
  const slow = new Promise((resolve) => setTimeout(resolve, 3000));
  const first = await Promise.race([net.catch(() => null), slow]);
  if (first && first.ok) return first;
  const hit = await cache.match(INDEX);
  if (hit) return hit;
  return net;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/\/pictograms\/\d+\/\d+_\d+\.png$/.test(url.pathname)) return e.respondWith(cacheFirst(SYMBOLS, req, true));
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith(`${BASE}api/`)) return;
  if (url.pathname.startsWith('/voice/')) return e.respondWith(cacheFirst(VOICE, req, false));
  if (!url.pathname.startsWith(BASE)) return;
  if (req.mode === 'navigate') return e.respondWith(page());
  if (url.pathname === `${BASE}sw.js`) return;
  e.respondWith(cacheFirst(SHELL, req, false));
});

// The app asks for this to show "Ready to use offline" in Settings.
self.addEventListener('message', (e) => {
  if (e.data === 'pictotalk:status') {
    caches.open(SHELL).then(async (cache) => {
      const have = (await cache.keys()).length;
      e.source?.postMessage({ type: 'pictotalk:status', build: BUILD, cached: have, total: PRECACHE.length });
    });
  }
});
