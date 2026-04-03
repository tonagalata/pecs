import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — PictoTalk",
  description: "How PictoTalk handles your data.",
};

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Nunito', sans-serif; background: #FFFBF7; color: #1C1917; }
        .prose h2 { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 600; color: #1C1917; margin: 36px 0 12px; letter-spacing: -0.5px; }
        .prose p, .prose li { font-size: 16px; line-height: 1.75; color: #57534E; margin-bottom: 12px; }
        .prose ul { padding-left: 20px; }
        .prose li { list-style: disc; }
        .prose a { color: #FB923C; text-decoration: underline; }
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

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "64px clamp(20px,5vw,40px) 100px" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "clamp(36px,5vw,52px)", letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 16 }}>Privacy Policy</h1>
        <p style={{ color: "#A8A29E", fontSize: 14, marginBottom: 48 }}>Last updated: April 2026</p>

        <div className="prose">
          <p>PictoTalk is a free, open-use tool built to help people communicate. We take your privacy seriously and have designed the app to collect as little data as possible.</p>

          <h2>What we collect</h2>
          <p>We collect minimal data to keep the service running:</p>
          <ul>
            <li><strong>Text-to-speech requests</strong> — when a symbol or sentence is spoken, the text is sent to our TTS provider (Resemble.ai) to generate audio. This text is not linked to any account or identifier.</li>
            <li><strong>Anonymous usage analytics</strong> — we may collect basic, aggregated page-view data (e.g. via Netlify Analytics) to understand how the app is used. No personal information is included.</li>
          </ul>

          <h2>What we do NOT collect</h2>
          <ul>
            <li>No account or sign-up is required — we collect no names, emails, or passwords.</li>
            <li>Custom audio recordings are stored only on your device (IndexedDB) and never uploaded to our servers.</li>
            <li>Custom photos are stored only on your device (localStorage) and never uploaded.</li>
            <li>We do not use advertising trackers or sell data to third parties.</li>
          </ul>

          <h2>Cookies and local storage</h2>
          <p>PictoTalk uses browser localStorage and IndexedDB solely to save your board settings and custom content between sessions. This data never leaves your device.</p>

          <h2>Third-party services</h2>
          <ul>
            <li><strong>Resemble.ai</strong> — processes text phrases to generate speech audio. See <a href="https://www.resemble.ai/privacy" target="_blank" rel="noopener noreferrer">Resemble.ai's privacy policy</a>.</li>
            <li><strong>ARASAAC</strong> — pictogram images are served via the ARASAAC public API. See <a href="https://arasaac.org/legal" target="_blank" rel="noopener noreferrer">ARASAAC's terms</a>.</li>
            <li><strong>Netlify</strong> — the app is hosted on Netlify. See <a href="https://www.netlify.com/privacy/" target="_blank" rel="noopener noreferrer">Netlify's privacy policy</a>.</li>
          </ul>

          <h2>Children's privacy</h2>
          <p>PictoTalk is designed for use by and with children, under the supervision of a parent, caregiver, or educator. We do not knowingly collect personal information from children.</p>

          <h2>Changes to this policy</h2>
          <p>We may update this policy from time to time. Changes will be posted on this page with an updated date.</p>

          <h2>Contact</h2>
          <p>Questions about privacy? <Link href="/contact">Contact us here</Link>.</p>
        </div>
      </main>

      <footer style={{ background: "#141210", padding: "32px clamp(20px,5vw,80px)", textAlign: "center" }}>
        <p style={{ color: "#57534E", fontSize: 13 }}>© {new Date().getFullYear()} PictoTalk · <Link href="/privacy" style={{ color: "#78716C", textDecoration: "none" }}>Privacy</Link> · <Link href="/contact" style={{ color: "#78716C", textDecoration: "none" }}>Contact</Link></p>
      </footer>
    </>
  );
}
