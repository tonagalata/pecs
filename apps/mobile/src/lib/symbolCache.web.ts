// Web: the browser's normal cache can drop images at any time, so pictograms are stored in Cache
// Storage, where public/sw.js serves them from when the device is offline.
export interface SaveResult { saved: number; failed: number }

/** Must match SYMBOLS in public/sw.js. */
const SYMBOLS = 'pictotalk-symbols-v1';

export async function saveForOffline(urls: string[], onProgress?: (done: number, total: number) => void): Promise<SaveResult> {
  if (typeof caches === 'undefined') return { saved: 0, failed: urls.length };
  const cache = await caches.open(SYMBOLS);
  let saved = 0, failed = 0, done = 0;
  for (let i = 0; i < urls.length; i += 6) {
    await Promise.all(urls.slice(i, i + 6).map(async (url) => {
      try {
        if (await cache.match(url)) saved += 1;
        else {
          const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
          if (res.ok) { await cache.put(url, res); saved += 1; } else failed += 1;
        }
      } catch {
        failed += 1;
      }
      done += 1;
      onProgress?.(done, urls.length);
    }));
  }
  return { saved, failed };
}
