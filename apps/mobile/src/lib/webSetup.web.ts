// Make the web app behave like an app on phones and iPads:
// - no text selection, magnifier or "Copy / Look up" callout when a button is pressed and held
// - no image drag / save-image sheet on long press
// - no double-tap zoom or 300 ms tap delay
// - full-screen when added to the home screen, content inside the notch safe area
let done = false;

function meta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
  el.content = content;
}

export function setupWeb() {
  if (done || typeof document === 'undefined') return;
  done = true;
  meta('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
  meta('apple-mobile-web-app-capable', 'yes');
  meta('mobile-web-app-capable', 'yes');
  meta('apple-mobile-web-app-status-bar-style', 'default');
  meta('apple-mobile-web-app-title', 'PictoTalk');
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root { height: 100%; overscroll-behavior: none; }
    body { position: fixed; inset: 0; overflow: hidden; }
    * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
    input, textarea, [contenteditable="true"] { -webkit-user-select: text; user-select: text; -webkit-touch-callout: default; }
    img { -webkit-user-drag: none; user-drag: none; pointer-events: none; }
    [role="button"], [role="tab"], [role="link"], [role="switch"], [role="radio"], button, a { touch-action: manipulation; cursor: pointer; }
  `;
  document.head.appendChild(style);
  // Long press on iOS/Android browsers opens a context menu; the board has no use for it.
  document.addEventListener('contextmenu', (e) => {
    const t = e.target as HTMLElement | null;
    if (!t?.closest('input, textarea')) e.preventDefault();
  });
}
