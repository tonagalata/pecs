"use client";

import Link from "next/link";
import { useState } from "react";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/contact", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data as unknown as Record<string, string>).toString(),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Nunito', sans-serif; background: #FFFBF7; color: #1C1917; }
        .field label { display: block; font-weight: 700; font-size: 14px; color: #1C1917; margin-bottom: 6px; }
        .field input, .field textarea, .field select {
          width: 100%;
          border: 1.5px solid #E7DDD3;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 15px;
          font-family: 'Nunito', sans-serif;
          color: #1C1917;
          background: white;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field input:focus, .field textarea:focus, .field select:focus {
          border-color: #FB923C;
          box-shadow: 0 0 0 3px rgba(251,146,60,0.15);
        }
        .field textarea { resize: vertical; min-height: 140px; }
        .submit-btn {
          background: #FB923C;
          color: white;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 16px;
          padding: 14px 36px;
          border-radius: 100px;
          border: none;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .submit-btn:hover:not(:disabled) { background: #EA7C28; transform: scale(1.02); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @media (max-width: 640px) {
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,251,247,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid #F5EDE0", padding: "20px clamp(20px,5vw,80px)", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/pecs-logo.svg" alt="PictoTalk" style={{ width: 32, height: 32, objectFit: "contain" }} />
          <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 22, color: "#1C1917", letterSpacing: -0.5 }}>PictoTalk</span>
        </Link>
        <Link href="/app" style={{ background: "#1C1917", color: "white", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, padding: "9px 22px", borderRadius: 100, textDecoration: "none" }}>
          Open App →
        </Link>
      </nav>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "64px clamp(20px,5vw,40px) 100px" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "clamp(36px,5vw,52px)", letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 12 }}>Get in touch</h1>
        <p style={{ color: "#78716C", fontSize: 17, lineHeight: 1.65, marginBottom: 48 }}>
          Questions, feedback, or just want to say hello? We&apos;d love to hear from you.
        </p>

        {status === "success" ? (
          <div style={{ background: "#DCFCE7", border: "1.5px solid #86EFAC", borderRadius: 20, padding: "40px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💛</div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 26, color: "#15803D", marginBottom: 8 }}>Message sent!</h2>
            <p style={{ color: "#166534", fontSize: 15 }}>Thanks for reaching out. We&apos;ll get back to you soon.</p>
            <button onClick={() => setStatus("idle")} style={{ marginTop: 24, background: "#15803D", color: "white", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, padding: "10px 24px", borderRadius: 100, border: "none", cursor: "pointer" }}>
              Send another message
            </button>
          </div>
        ) : (
          <form
            name="contact"
            method="POST"
            data-netlify="true"
            netlify-honeypot="bot-field"
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            {/* Netlify hidden fields */}
            <input type="hidden" name="form-name" value="contact" />
            <div style={{ display: "none" }}>
              <label>Don&apos;t fill this out: <input name="bot-field" /></label>
            </div>

            <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="field">
                <label htmlFor="name">Your name</label>
                <input id="name" name="name" type="text" placeholder="Jane Smith" required />
              </div>
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input id="email" name="email" type="email" placeholder="jane@example.com" required />
              </div>
            </div>

            <div className="field">
              <label htmlFor="subject">Subject</label>
              <select id="subject" name="subject" required>
                <option value="">Select a topic…</option>
                <option value="general">General question</option>
                <option value="feedback">Feedback or suggestion</option>
                <option value="bug">Report a bug</option>
                <option value="accessibility">Accessibility concern</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" placeholder="Tell us what's on your mind…" required />
            </div>

            {status === "error" && (
              <p style={{ background: "#FEE2E2", border: "1.5px solid #FECACA", borderRadius: 10, padding: "10px 16px", color: "#B91C1C", fontSize: 14, fontWeight: 600 }}>
                Something went wrong. Please try again or email us directly.
              </p>
            )}

            <div>
              <button type="submit" className="submit-btn" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send message →"}
              </button>
            </div>
          </form>
        )}
      </main>

      <footer style={{ background: "#141210", padding: "32px clamp(20px,5vw,80px)", textAlign: "center" }}>
        <p style={{ color: "#57534E", fontSize: 13 }}>© {new Date().getFullYear()} PictoTalk · <Link href="/privacy" style={{ color: "#78716C", textDecoration: "none" }}>Privacy</Link> · <Link href="/contact" style={{ color: "#78716C", textDecoration: "none" }}>Contact</Link></p>
      </footer>
    </>
  );
}
