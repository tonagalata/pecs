"use client";

import { useState } from "react";

type T = { w: string; img: string; g: string };

const TILES: T[] = [
  { w: "I", img: "i", g: "pron" }, { w: "want", img: "want", g: "verb" }, { w: "more", img: "more", g: "desc" },
  { w: "eat", img: "eat", g: "verb" }, { w: "drink", img: "drink", g: "verb" }, { w: "play", img: "play", g: "verb" },
  { w: "help", img: "help", g: "urgent" }, { w: "break", img: "break", g: "urgent" }, { w: "yes", img: "yes", g: "social" },
  { w: "no", img: "no", g: "social" }, { w: "stop", img: "stop", g: "urgent" }, { w: "finished", img: "finished", g: "desc" },
];

/** Uses the browser's own voice, exactly like the app: free, instant and nothing is sent anywhere. */
function say(text: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch {
    // speech not available
  }
}

export default function TryIt() {
  const [msg, setMsg] = useState<T[]>([]);
  return (
    <div className="try">
      <div className="try-bar">
        <div className="try-msg" aria-live="polite">
          {msg.length === 0 ? <span className="small" style={{ paddingLeft: 8 }}>Your message will show up here.</span> : null}
          {msg.map((m, i) => (
            <button key={i} className={`tile g-${m.g}`} aria-label={`Remove ${m.w}`} onClick={() => setMsg(msg.filter((_, j) => j !== i))}>
              <img src={`/symbols/${m.img}.png`} alt="" />
              <span>{m.w}</span>
            </button>
          ))}
        </div>
        <div className="try-controls">
          <button className="speak-btn" onClick={() => msg.length && say(msg.map((m) => m.w).join(" "))}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>
            Speak
          </button>
          <button className="icon-btn" aria-label="Delete last word" onClick={() => setMsg(msg.slice(0, -1))}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 5H9l-7 7 7 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" /><path d="m18 9-6 6M12 9l6 6" /></svg>
          </button>
          <button className="icon-btn" aria-label="Clear message" onClick={() => { window.speechSynthesis?.cancel(); setMsg([]); }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      <div className="try-grid">
        {TILES.map((t) => (
          <button key={t.w} className={`tile g-${t.g}`} onClick={() => { say(t.w); setMsg((m) => [...m, t]); }}>
            <img src={`/symbols/${t.img}.png`} alt="" />
            <span>{t.w}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
