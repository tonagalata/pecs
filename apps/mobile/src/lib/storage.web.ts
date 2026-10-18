// Web persistence: IndexedDB (no 5 MB localStorage cap, so photos and recordings fit).
// Calls navigator.storage.persist() so the browser is less likely to evict the board.
import { get, set } from 'idb-keyval';

const KEY = 'pictotalk:state:v1';
let askedPersist = false;

export async function loadState<T>(): Promise<T | null> {
  try {
    if (!askedPersist && typeof navigator !== 'undefined' && navigator.storage?.persist) {
      askedPersist = true;
      navigator.storage.persist().catch(() => {});
    }
    return ((await get(KEY)) as T | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function saveState<T>(state: T): Promise<void> {
  try {
    await set(KEY, state);
  } catch {
    // Private mode or blocked storage: keep running from memory.
  }
}
