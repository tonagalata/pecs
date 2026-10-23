// PictoTalk service worker for the web board: keeps the board working without internet.
//   ARASAAC pictograms   cache first (saved by Settings > Save symbols for offline use, and as shown)
//   app code and assets  cache first (file names are content-hashed, so they never go stale)
//   pages                network first, falling back to the saved page when offline
const SYMBOLS = 'pictotalk-symbols-v1'; // keep in sync with src/lib/symbolCache.web.ts
const SHELL = 'pictotalk-shell-v1';
const BASE = new URL('./', self.location).pathname; // "/app/" on the server, "/" without a base URL

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

async function symbol(req) {
  const cache = await caches.open(SYMBOLS);
  const hit = await cache.match(req.url);
  if (hit) return hit;
  // <img> requests are no-cors, whose responses hide their status. Ask with CORS (ARASAAC allows
  // it) so a missing pictogram is never saved as if it were an image.
  let res;
  try { res = await fetch(req.url, { mode: 'cors', credentials: 'omit' }); } catch { return fetch(req); }
  if (res.ok) cache.put(req.url, res.clone()).catch(() => {});
  return res;
}

async function asset(req) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone()).catch(() => {});
  return res;
}

async function page(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    // Single-page app: every route is the same index.html, so one copy covers all of them.
    if (res.ok) cache.put(BASE, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(BASE);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/\/pictograms\/\d+\/\d+_\d+\.png$/.test(url.pathname)) return e.respondWith(symbol(req));
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (req.mode === 'navigate') return e.respondWith(page(req));
  if (url.pathname.startsWith(`${BASE}_expo/static/`) || url.pathname.startsWith(`${BASE}assets/`)) e.respondWith(asset(req));
});
