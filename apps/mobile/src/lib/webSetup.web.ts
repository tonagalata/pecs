// Make the web app behave like an app on phones and iPads:
// - no text selection, magnifier or "Copy / Look up" callout when a button is pressed and held
// - no image drag / save-image sheet on long press
// - no pinch zoom (touch screens and laptop trackpads) and no double-tap zoom or 300 ms tap delay:
//   the board is sized to fill the screen, and text size is set in Settings instead
// - full-screen when added to the home screen, content inside the notch safe area
// - works offline once loaded (service worker)
let done = false;

function meta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
  el.content = content;
}

export function setupWeb() {
  if (done || typeof document === 'undefined') return;
  done = true;
  meta('viewport', 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  meta('apple-mobile-web-app-capable', 'yes');
  meta('mobile-web-app-capable', 'yes');
  meta('apple-mobile-web-app-status-bar-style', 'default');
  meta('apple-mobile-web-app-title', 'PictoTalk');
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root { height: 100%; overscroll-behavior: none; touch-action: pan-x pan-y; }
    body { position: fixed; inset: 0; overflow: hidden; }
    * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
    input, textarea, [contenteditable="true"] { -webkit-user-select: text; user-select: text; -webkit-touch-callout: default; }
    img { -webkit-user-drag: none; user-drag: none; pointer-events: none; }
    [role="button"], [role="tab"], [role="link"], [role="switch"], [role="radio"], button, a { touch-action: manipulation; cursor: pointer; }
  `;
  document.head.appendChild(style);
  // iOS Safari ignores user-scalable=no, so cancel its pinch gestures directly.
  const block = (e: Event) => e.preventDefault();
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, block, { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  // Trackpad pinch on laptops arrives as ctrl + wheel.
  window.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  // Offline support: app files and saved symbols are served by public/sw.js (production builds only).
  if (!__DEV__ && 'serviceWorker' in navigator) {
    const base = process.env.EXPO_BASE_URL ?? '';
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {});
  }
  // Long press on iOS/Android browsers opens a context menu; the board has no use for it.
  document.addEventListener('contextmenu', (e) => {
    const t = e.target as HTMLElement | null;
    if (!t?.closest('input, textarea')) e.preventDefault();
  });
}
