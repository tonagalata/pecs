"use client";

import { useEffect, useRef, useState } from "react";

// ─── Pictogram tile data ───────────────────────────────────────────────────
const TILES = [
  { emoji: "🍎", label: "Apple", color: "#FEE2E2", border: "#FECACA" },
  { emoji: "🏠", label: "Home", color: "#DBEAFE", border: "#BFDBFE" },
  { emoji: "🎵", label: "Music", color: "#EDE9FE", border: "#DDD6FE" },
  { emoji: "🐶", label: "Dog", color: "#FEF9C3", border: "#FEF08A" },
  { emoji: "💧", label: "Water", color: "#CFFAFE", border: "#A5F3FC" },
  { emoji: "❤️", label: "Love", color: "#FCE7F3", border: "#FBCFE8" },
  { emoji: "⭐", label: "Star", color: "#FEF3C7", border: "#FDE68A" },
  { emoji: "🌳", label: "Tree", color: "#DCFCE7", border: "#BBF7D0" },
  { emoji: "🎨", label: "Art", color: "#FFE4E6", border: "#FECDD3" },
  { emoji: "🚗", label: "Car", color: "#E0F2FE", border: "#BAE6FD" },
  { emoji: "📚", label: "Books", color: "#F0FDF4", border: "#BBF7D0" },
  { emoji: "🌙", label: "Moon", color: "#EEF2FF", border: "#C7D2FE" },
];

const FEATURES = [
  {
    icon: "🖼️",
    title: "ARASAAC Pictograms",
    desc: "Thousands of globally recognised pictograms, free and built-in, no setup required.",
    color: "#FEF3C7",
    accent: "#F59E0B",
  },
  {
    icon: "🎙️",
    title: "Record Your Voice",
    desc: "Record custom audio for any symbol, a parent's voice, a teacher's tone, a favourite sound.",
    color: "#EDE9FE",
    accent: "#8B5CF6",
  },
  {
    icon: "📸",
    title: "Photo Uploads",
    desc: "Upload real photos of people, places and objects that matter to your learner.",
    color: "#DBEAFE",
    accent: "#3B82F6",
  },
  {
    icon: "✨",
    title: "Auto Sentence Speak",
    desc: "Tap multiple symbols and it automatically speak the sentence for you.",
    color: "#DCFCE7",
    accent: "#22C55E",
  },
  {
    icon: "📖",
    title: "Preselected Learning Sets",
    desc: "Curated symbol sets for daily routines, emotions, school and more, ready in seconds.",
    color: "#FCE7F3",
    accent: "#EC4899",
  },
  {
    icon: "🔊",
    title: "Soft Teaching Voice",
    desc: "A calm, warm voice reads every symbol and sentence, gentle for all learners.",
    color: "#CFFAFE",
    accent: "#06B6D4",
  },
];

// ─── Animated counter ──────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}

// ─── Tile component ────────────────────────────────────────────────────────
function PictoTile({
  emoji,
  label,
  color,
  border,
  delay = 0,
  loading = false,
}: {
  emoji: string;
  label: string;
  color: string;
  border: string;
  delay?: number;
  loading?: boolean;
}) {
  const [active, setActive] = useState(false);
  return (
    <button
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      disabled={loading}
      className="picto-tile"
      style={{
        background: color,
        border: `2px solid ${border}`,
        borderRadius: 20,
        padding: "14px 10px 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        cursor: loading ? "wait" : "pointer",
        transform: active && !loading ? "scale(1.08) translateY(-4px)" : "scale(1)",
        boxShadow: active && !loading ? `0 12px 32px ${border}88` : `0 2px 8px ${border}44`,
        transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        animationDelay: `${delay}ms`,
        outline: "none",
        width: "100%",
        position: "relative",
        opacity: loading ? 0.75 : 1,
      }}
      aria-label={label}
    >
      {loading && (
        <span style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          border: `2.5px solid ${border}`,
          borderTopColor: "transparent",
          animation: "spin 0.7s linear infinite",
          pointerEvents: "none",
        }} />
      )}
      <span style={{ fontSize: 36, lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", fontFamily: "'Nunito', sans-serif", letterSpacing: 0.3, textTransform: "uppercase" }}>
        {label}
      </span>
    </button>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function Home() {
  const [sentenceBuilt, setSentenceBuilt] = useState<string[]>([]);
  const [speakingLabel, setSpeakingLabel] = useState<string | null>(null);
  const symbolCount = useCountUp(12500, 2000);

  const currentAudio = useRef<HTMLAudioElement | null>(null);

  const speak = async (text: string) => {
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current = null;
    }

    setSpeakingLabel(text);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase: text }),
      });
      if (!res.ok) throw new Error(`TTS API ${res.status}`);
      const { url } = await res.json();
      const audio = new Audio(url);
      currentAudio.current = audio;
      audio.play();
    } catch {
      // Fallback to browser speechSynthesis
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.85;
      utt.pitch = 1.05;
      const preferred = ["Samantha", "Karen", "Moira", "Fiona"];
      const doSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const voice = preferred.map((n) => voices.find((v) => v.name.includes(n))).find(Boolean)
          ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
        if (voice) utt.voice = voice;
        window.speechSynthesis.speak(utt);
      };
      if (window.speechSynthesis.getVoices().length > 0) {
        doSpeak();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          doSpeak();
        };
      }
    } finally {
      setSpeakingLabel(null);
    }
  };

  const toggleTile = (tile: typeof TILES[number]) => {
    const isSelected = sentenceBuilt.includes(tile.label);
    setSentenceBuilt((prev) =>
      isSelected ? prev.filter((w) => w !== tile.label) : [...prev, tile.label]
    );
    if (!isSelected) speak(tile.label);
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'Nunito', sans-serif;
          background: #FFFBF7;
          color: #1C1917;
          overflow-x: hidden;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(251,146,60,0.4); }
          70% { box-shadow: 0 0 0 16px rgba(251,146,60,0); }
          100% { box-shadow: 0 0 0 0 rgba(251,146,60,0); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .fade-up { animation: fadeUp 0.7s ease both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }
        .delay-5 { animation-delay: 0.5s; }
        .float-a { animation: float 5s ease-in-out infinite; }
        .float-b { animation: floatB 6s ease-in-out infinite; }
        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #FB923C;
          color: white;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 18px;
          padding: 18px 40px;
          border-radius: 100px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          animation: pulse-ring 2.5s ease infinite;
          transition: background 0.2s, transform 0.2s;
          letter-spacing: 0.2px;
        }
        .cta-btn:hover {
          background: #EA7C28;
          transform: scale(1.04);
          animation: none;
        }
        .nav-link {
          font-weight: 600;
          color: #78716C;
          text-decoration: none;
          font-size: 15px;
          transition: color 0.15s;
        }
        .nav-link:hover { color: #FB923C; }
        .feature-card {
          background: white;
          border-radius: 24px;
          padding: 28px;
          border: 1.5px solid #F5F0EA;
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s;
        }
        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 48px rgba(0,0,0,0.08);
        }
        .marquee-track {
          display: flex;
          gap: 16px;
          animation: marquee 28s linear infinite;
          width: max-content;
        }
        .marquee-track:hover { animation-play-state: paused; }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #FEF3C7;
          color: #92400E;
          font-size: 13px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 100px;
          border: 1.5px solid #FDE68A;
        }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .nav-links { display: none !important; }
          .hero-float { display: none !important; }
          .cta-btn { font-size: 15px !important; padding: 14px 24px !important; }
          .cta-secondary { font-size: 14px !important; padding: 13px 22px !important; }
          .demo-section { padding-top: 60px !important; padding-bottom: 60px !important; }
          .features-section { padding-top: 60px !important; padding-bottom: 60px !important; }
          .mission-section { padding-top: 60px !important; padding-bottom: 60px !important; }
          .cta-section { padding-top: 60px !important; padding-bottom: 60px !important; min-height: fit-content !important; }
          .tile-grid { grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)) !important; gap: 10px !important; }
          .picto-tile { padding: 10px 6px 8px !important; border-radius: 14px !important; }
          .picto-tile span:first-of-type { font-size: 28px !important; }
          .sentence-row { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .sentence-actions { margin-left: 0 !important; width: 100% !important; justify-content: flex-end !important; }
          .footer-inner { flex-direction: column !important; align-items: center !important; text-align: center !important; }
          .hero-stats { margin-top: 48px !important; gap: 24px !important; }
          .features-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,251,247,0.88)", backdropFilter: "blur(16px)", borderBottom: "1px solid #F5EDE0", padding: "20px clamp(20px,5vw,80px)", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/pecs-logo.svg" alt="PictoTalk" style={{ width: 32, height: 32, objectFit: "contain" }} />
          <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 22, color: "#1C1917", letterSpacing: -0.5 }}>PictoTalk</span>
        </div>
        <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#demo" className="nav-link">Try it</a>
        </div>
        <a href="/app" style={{ background: "#1C1917", color: "white", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, padding: "9px 22px", borderRadius: 100, textDecoration: "none", transition: "background 0.2s", whiteSpace: "nowrap" }}>
          Get Started →
        </a>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "92vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px clamp(20px,5vw,80px) 60px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -120, right: -120, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, #FED7AA 0%, transparent 70%)", opacity: 0.5, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #DDD6FE 0%, transparent 70%)", opacity: 0.45, pointerEvents: "none" }} />

        <div className="float-a hero-float" style={{ position: "absolute", top: 120, left: "8%", background: "#FEE2E2", border: "2px solid #FECACA", borderRadius: 16, padding: "10px 14px", fontSize: 28, boxShadow: "0 4px 16px #FECACA44", pointerEvents: "none" }}>🍎</div>
        <div className="float-b hero-float" style={{ position: "absolute", top: 180, right: "9%", background: "#DBEAFE", border: "2px solid #BFDBFE", borderRadius: 16, padding: "10px 14px", fontSize: 28, boxShadow: "0 4px 16px #BFDBFE44", pointerEvents: "none" }}>🏠</div>
        <div className="float-a hero-float" style={{ position: "absolute", bottom: 180, left: "12%", background: "#DCFCE7", border: "2px solid #BBF7D0", borderRadius: 16, padding: "10px 14px", fontSize: 28, boxShadow: "0 4px 16px #BBF7D044", animationDelay: "1.2s", pointerEvents: "none" }}>⭐</div>
        <div className="float-b hero-float" style={{ position: "absolute", bottom: 160, right: "11%", background: "#FCE7F3", border: "2px solid #FBCFE8", borderRadius: 16, padding: "10px 14px", fontSize: 28, boxShadow: "0 4px 16px #FBCFE844", animationDelay: "0.8s", pointerEvents: "none" }}>🎨</div>

        <div className="fade-up" style={{ marginBottom: 28 }}>
          <span className="badge"><span>✦</span>100% free · forever · no account needed</span>
        </div>

        <h1 className="fade-up delay-1" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "clamp(44px, 7vw, 84px)", lineHeight: 1.1, letterSpacing: -2, color: "#1C1917", maxWidth: 820, marginBottom: 24 }}>
          Every child{" "}<em style={{ color: "#FB923C", fontStyle: "italic" }}>deserves</em><br />a voice
        </h1>

        <p className="fade-up delay-2" style={{ fontSize: "clamp(17px, 2.2vw, 21px)", color: "#78716C", maxWidth: 560, lineHeight: 1.65, marginBottom: 44 }}>
          PictoTalk is a free, mobile-friendly picture communication board powered by ARASAAC pictograms, built for families, therapists, and classrooms everywhere.
        </p>

        <div className="fade-up delay-3" style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <a href="/app" className="cta-btn"><span>🚀</span>Get Started, it&apos;s free</a>
          <a href="#demo" className="cta-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "white", color: "#1C1917", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 17, padding: "17px 36px", borderRadius: 100, border: "2px solid #E7DDD3", textDecoration: "none", transition: "border-color 0.2s, transform 0.2s" }}>
            See how it works ↓
          </a>
        </div>

        <div className="fade-up delay-5 hero-stats" style={{ display: "flex", gap: "clamp(24px,5vw,64px)", marginTop: 72, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { value: `${symbolCount.toLocaleString()}+`, label: "ARASAAC symbols" },
            { value: "100%", label: "Free forever" },
            { value: "0", label: "Accounts needed" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "clamp(32px,4vw,48px)", color: "#1C1917", lineHeight: 1, letterSpacing: -1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "#A8A29E", fontWeight: 600, marginTop: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div style={{ borderTop: "1.5px solid #F5EDE0", borderBottom: "1.5px solid #F5EDE0", padding: "20px 0", overflow: "hidden", background: "#FFFDF9", minHeight: 120 }}>
        <div className="marquee-track">
          {[...TILES, ...TILES].map((t, i) => (
            <div key={i} style={{ background: t.color, border: `1.5px solid ${t.border}`, borderRadius: 14, padding: "10px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 72, flexShrink: 0 }}>
              <span style={{ fontSize: 28 }}>{t.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#57534E", textTransform: "uppercase", letterSpacing: 0.5 }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── DEMO ── */}
      <section id="demo" className="demo-section" style={{ padding: "100px clamp(20px,5vw,80px)", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(34px,5vw,56px)", fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.15 }}>Try it right here</span>
          <p style={{ color: "#78716C", fontSize: 17, marginTop: 14, maxWidth: 480, margin: "14px auto 0", lineHeight: 1.6 }}>Tap the symbols below to build a sentence, just like in the real app.</p>
        </div>

        <div style={{ background: "white", border: "2px solid #F5EDE0", borderRadius: 24, padding: "20px 24px", marginBottom: 32, minHeight: 80, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {sentenceBuilt.length === 0 ? (
            <span style={{ color: "#C4B5A8", fontSize: 16, fontStyle: "italic", fontFamily: "'Fraunces', serif" }}>Tap symbols below to build your sentence…</span>
          ) : (
            <div className="sentence-row" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", width: "100%" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: 1 }}>
                {sentenceBuilt.map((w, i) => (
                  <span key={i} style={{ background: "#FEF3C7", border: "1.5px solid #FDE68A", borderRadius: 12, padding: "8px 16px", fontSize: 20, fontWeight: 700, color: "#92400E" }}>{w}</span>
                ))}
              </div>
              <div className="sentence-actions" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => speak(sentenceBuilt.join(" "))} style={{ background: "#DCFCE7", border: "1.5px solid #86EFAC", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, color: "#15803D", cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>🔊 Speak</button>
                <button onClick={() => { setSentenceBuilt([]); window.speechSynthesis?.cancel(); }} style={{ background: "#FEE2E2", border: "1.5px solid #FECACA", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, color: "#B91C1C", cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>Clear ✕</button>
              </div>
            </div>
          )}
        </div>

        <div className="tile-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 16 }}>
          {TILES.map((tile, i) => (
            <div key={tile.label} onClick={() => speakingLabel === null && toggleTile(tile)}>
              <PictoTile {...tile} delay={i * 40} loading={speakingLabel === tile.label} />
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <a href="/app" className="cta-btn" style={{ fontSize: 16, padding: "14px 32px" }}>Open the full app →</a>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="features-section" style={{ background: "#FFF8F2", borderTop: "1.5px solid #F5EDE0", borderBottom: "1.5px solid #F5EDE0", padding: "100px clamp(20px,5vw,80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(32px,4.5vw,52px)", fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.2, marginBottom: 14 }}>
              Everything you need,{" "}<em style={{ color: "#FB923C" }}>nothing you don&apos;t</em>
            </h2>
            <p style={{ color: "#78716C", fontSize: 17, maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>Thoughtfully designed for learners, caregivers, and educators, with more features on the way.</p>
          </div>
          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card">
                <div style={{ width: 52, height: 52, borderRadius: 16, background: f.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 16, border: `1.5px solid ${f.accent}33` }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, letterSpacing: -0.5, marginBottom: 8, color: "#1C1917" }}>{f.title}</h3>
                <p style={{ color: "#78716C", fontSize: 15, lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="mission-section" style={{ padding: "100px clamp(20px,5vw,80px)", maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 28, animation: "float 4s ease-in-out infinite", display: "inline-block" }}>💛</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(26px,4vw,44px)", lineHeight: 1.35, letterSpacing: -1, color: "#1C1917", marginBottom: 24 }}>
          &ldquo;There&apos;s nothing more frustrating than not being able to communicate.&rdquo;
        </h2>
        <p style={{ color: "#A8A29E", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Dr. Temple Grandin.</p>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="cta-section" style={{ background: "#1C1917", padding: "100px clamp(20px,5vw,80px)", textAlign: "center", position: "relative", overflow: "hidden", minHeight: "fit-content" }}>
        <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, #FB923C33 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, color: "#FB923C", textTransform: "uppercase", letterSpacing: 2, display: "block", marginBottom: 20 }}>✦ No signup · No payment · No limits</span>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "clamp(36px,5.5vw,68px)", color: "white", letterSpacing: -2, lineHeight: 1.1, marginBottom: 20 }}>
            Start communicating<br /><em style={{ color: "#FB923C" }}>right now</em>
          </h2>
          <p style={{ color: "#A8A29E", fontSize: 17, marginBottom: 44, maxWidth: 420, margin: "0 auto 44px", lineHeight: 1.6 }}>No account. No download needed. Just open the app and go, on any device, anywhere.</p>
          <a href="/app" className="cta-btn" style={{ fontSize: 20, padding: "22px 52px" }}><span>🚀</span>Get Started Free</a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#141210", padding: "40px clamp(20px,5vw,80px)" }}>
        <div className="footer-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
              <img src="/pecs-logo.svg" alt="PictoTalk" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 18, color: "white" }}>PictoTalk</span>
            <span style={{ color: "#ffffff", fontSize: 14, marginLeft: 8 }}>pictotalk.org</span>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { label: "About", href: "#" },
              { label: "Privacy", href: "/privacy" },
              { label: "ARASAAC", href: "https://arasaac.org" },
              { label: "Contact", href: "/contact" },
            ].map((l) => (
              <a key={l.label} href={l.href} style={{ color: "#ffffff", fontSize: 14, fontWeight: 600, textDecoration: "none", transition: "color 0.15s" }}>{l.label}</a>
            ))}
          </div>
          <p style={{ color: "#ffffff", fontSize: 13 }}>© {new Date().getFullYear()} PictoTalk · Free forever</p>
        </div>
      </footer>
    </>
  );
}
