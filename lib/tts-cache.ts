// Client-side IndexedDB cache for TTS audio URLs.
// Only import this from client-side code (hooks, components).

const DB_NAME = "pecs-tts";
const STORE_NAME = "audio-urls";
const DB_VERSION = 1;

let _db: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedUrl(key: string): Promise<string | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function setCachedUrl(key: string, url: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(url, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCachedUrl(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearCache(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
