// Web: the browser reports when the network goes away and comes back.
import { useEffect, useState } from 'react';

const listeners = new Set<(online: boolean) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => listeners.forEach((fn) => fn(true)));
  window.addEventListener('offline', () => listeners.forEach((fn) => fn(false)));
}

export const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

/** Calls `fn` whenever the device goes online or offline. Returns an unsubscribe function. */
export function onConnectionChange(fn: (online: boolean) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useOnline(): boolean {
  const [value, setValue] = useState(isOnline);
  useEffect(() => onConnectionChange(setValue), []);
  return value;
}
