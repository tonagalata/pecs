// Installing the web board as an app (PWA). Chrome, Edge and Android offer an install prompt,
// which has to be caught when it fires (soon after the page opens) and shown later from Settings.
// iPhone and iPad have no prompt: Share › Add to Home Screen is the only way.
type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: Prompt | null = null;
let installed = false;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((fn) => fn());

export function listenForInstall() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as Prompt; changed(); });
  window.addEventListener('appinstalled', () => { deferred = null; installed = true; changed(); });
}

export type InstallState = 'installed' | 'prompt' | 'ios' | 'other';

export function installState(): InstallState {
  if (typeof window === 'undefined') return 'other';
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
  if (installed || standalone) return 'installed';
  if (deferred) return 'prompt';
  // iPadOS reports itself as a Mac, but has a touch screen.
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios ? 'ios' : 'other';
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const p = deferred;
  deferred = null;
  await p.prompt();
  const { outcome } = await p.userChoice;
  changed();
  return outcome === 'accepted';
}

export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
