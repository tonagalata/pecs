// Is this phone or tablet online? Used for the online / offline badge and to share waiting
// changes the moment the connection comes back. See connection.web.ts for the web board.
import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

let online = true;
const listeners = new Set<(online: boolean) => void>();

function set(next: boolean) {
  if (next === online) return;
  online = next;
  listeners.forEach((fn) => fn(next));
}

// "Reachable" is unknown (null) for a moment after a change; only a definite false counts as offline.
const fromState = (s: Network.NetworkState) => s.isConnected !== false && s.isInternetReachable !== false;
Network.getNetworkStateAsync().then((s) => set(fromState(s))).catch(() => {});
Network.addNetworkStateListener((s) => set(fromState(s)));

export const isOnline = () => online;

/** Calls `fn` whenever the device goes online or offline. Returns an unsubscribe function. */
export function onConnectionChange(fn: (online: boolean) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useOnline(): boolean {
  const [value, setValue] = useState(online);
  useEffect(() => onConnectionChange(setValue), []);
  return value;
}
