// Native: expo-image keeps prefetched pictograms in its disk cache, which survives restarts.
import { Image } from 'expo-image';

export interface SaveResult { saved: number; failed: number }

export async function saveForOffline(urls: string[], onProgress?: (done: number, total: number) => void): Promise<SaveResult> {
  let saved = 0, failed = 0, done = 0;
  for (let i = 0; i < urls.length; i += 6) {
    await Promise.all(urls.slice(i, i + 6).map(async (url) => {
      const ok = await Image.prefetch(url, 'disk').catch(() => false);
      if (ok) saved += 1; else failed += 1;
      done += 1;
      onProgress?.(done, urls.length);
    }));
  }
  return { saved, failed };
}
