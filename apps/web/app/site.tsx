import Link from "next/link";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.pictotalk.org";
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "";

export function Arrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Check() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3F7D3A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function Nav({ home = true }: { home?: boolean }) {
  const h = home ? "" : "/";
  return (
    <header className="nav">
      <nav aria-label="Main" className="wrap">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 17.5h7" />
            </svg>
          </span>
          PictoTalk
        </Link>
        <div className="nav-links">
          <a href={`${h}#try`}>Try it</a>
          <a href={`${h}#ages`}>Who it&apos;s for</a>
          <a href={`${h}#features`}>Features</a>
          <a href={`${h}#supporters`}>For supporters</a>
          <a href={`${h}#faq`}>Questions</a>
        </div>
        <a className="btn btn-primary" href={APP_URL}>Open the board <Arrow /></a>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 20, color: "#fff" }}>PictoTalk</span>
          <nav aria-label="Footer">
            <Link href="/privacy/">Privacy</Link>
            <Link href="/contact/">Contact</Link>
            <a href="https://arasaac.org">ARASAAC</a>
          </nav>
        </div>
        <p>
          Pictographic symbols used in the app are the property of the Government of Aragón and were created by Sergio Palao for
          ARASAAC (arasaac.org), distributed under a Creative Commons BY-NC-SA license.
        </p>
        <p>© {new Date().getFullYear()} PictoTalk · pictotalk.org · Free, with no accounts and no data collection.</p>
      </div>
    </footer>
  );
}
