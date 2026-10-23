// Web: laptops and desktops are already landscape. On touch tablets, ask the browser to hold
// landscape. Browsers only allow this for installed web apps or in fullscreen (Android Chrome);
// Safari has no orientation lock, so there the board keeps its portrait layout.
type LockableOrientation = ScreenOrientation & { lock?: (o: 'landscape') => Promise<void> };

function isTablet() {
  const short = Math.min(window.screen.width, window.screen.height);
  return navigator.maxTouchPoints > 1 && short >= 600;
}

function tryLock() {
  const o = window.screen.orientation as LockableOrientation | undefined;
  o?.lock?.('landscape').catch(() => {});
}

export function lockTabletLandscape() {
  if (typeof window === 'undefined' || !isTablet()) return;
  tryLock();
  // Some browsers only allow the lock after the first touch.
  window.addEventListener('pointerdown', tryLock, { once: true });
  document.addEventListener('fullscreenchange', tryLock);
}
