import TryIt from "./TryIt";
import { APP_STORE_URL, APP_URL, Arrow, Check, Footer, Nav } from "./site";

type M = { w: string; img: string; g: string };
const tile = (w: string, img: string, g: string): M => ({ w, img, g });

const HERO_MSG = [tile("I", "i", "pron"), tile("want", "want", "verb"), tile("juice", "juice", "noun")];
const HERO_GRID = [
  tile("I", "i", "pron"), tile("want", "want", "verb"), tile("go", "go", "verb"), tile("more", "more", "desc"), tile("yes", "yes", "social"), tile("help", "help", "urgent"),
  tile("you", "you", "pron"), tile("need", "need", "verb"), tile("eat", "eat", "verb"), tile("drink", "drink", "verb"), tile("no", "no", "social"), tile("stop", "stop", "urgent"),
  tile("like", "like", "verb"), tile("not", "not", "desc"), tile("play", "play", "verb"), tile("look", "look", "verb"), tile("finished", "finished", "desc"), tile("break", "break", "urgent"),
];
const EDIT_GRID: (M & { hidden?: boolean })[] = [
  tile("I", "i", "pron"), tile("want", "want", "verb"), tile("go", "go", "verb"), tile("more", "more", "desc"), tile("yes", "yes", "social"), tile("help", "help", "urgent"),
  tile("you", "you", "pron"), tile("need", "need", "verb"), tile("eat", "eat", "verb"), { ...tile("look", "look", "verb"), hidden: true }, tile("no", "no", "social"), tile("stop", "stop", "urgent"),
  { ...tile("feel", "feel", "verb"), hidden: true }, { ...tile("where", "where", "q"), hidden: true }, { ...tile("what", "what", "q"), hidden: true }, tile("bathroom", "bathroom", "noun"), tile("home", "home", "noun"), tile("hurt", "hurt", "urgent"),
];

function MiniTile({ t, big }: { t: M & { hidden?: boolean }; big?: boolean }) {
  if (t.hidden) {
    return (
      <div className="tile" style={{ background: "transparent", borderStyle: "dashed", borderColor: "#9AA8A5", color: "#485A57" }}>
        <img src={`/symbols/${t.img}.png`} alt="" style={{ opacity: 0.3 }} />
        <span>hidden</span>
      </div>
    );
  }
  return (
    <div className={`tile g-${t.g}`}>
      <img src={`/symbols/${t.img}.png`} alt="" style={big ? { width: 48, height: 48 } : undefined} />
      <span style={big ? { fontSize: 14 } : undefined}>{t.w}</span>
    </div>
  );
}

const FEATURES = [
  { img: "happy", t: "How I feel, where it hurts", d: "Pick a feeling, how strong it is, and where it hurts. PictoTalk turns it into a clear sentence." },
  { img: "bus", t: "My day, in pictures", d: "A First / Then board and a visual schedule show what's happening now and what comes next." },
  { img: "talk", t: "Show my message", d: "Fill the screen with your message in large text, and flip it so the person across the table can read it." },
  { img: "think", t: "Type to speak", d: "A big-key keyboard with word suggestions and saved phrases for the things you say most." },
  { img: "mom", t: "A voice they know", d: "Use the device's own voice, or record a parent, sibling or the person themselves saying any word." },
  { img: "home", t: "Real photos and ARASAAC symbols", d: "Free ARASAAC symbols built in, plus your own photos of family, favorite foods and places." },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <section id="top" className="wrap hero">
          <div>
            <p className="pill">Free · No account · Works offline</p>
            <h1>Say what you mean, with pictures, words, or both.</h1>
            <p className="lead">
              PictoTalk is a free communication board for autistic children, teens and adults. Tap pictures to build a message, and your device says it out loud.
            </p>
            <div className="actions">
              <a className="btn btn-primary btn-lg" href={APP_URL}>Start talking <Arrow /></a>
              {APP_STORE_URL ? <a className="btn btn-ghost btn-lg" href={APP_STORE_URL}>Get the iPad &amp; iPhone app</a> : <a className="btn btn-ghost btn-lg" href={`${APP_URL}/setup`}>Set it up for someone</a>}
            </div>
            <p className="small" style={{ marginTop: 22 }}>
              On iPad and iPhone, and in any web browser. Once it&apos;s set up it works without internet.
            </p>
          </div>
          <div>
            <div className="tablet" aria-hidden="true">
              <div className="tablet-screen">
                <div className="mini-bar">
                  {HERO_MSG.map((t) => <div key={t.w} className="mini-msg"><MiniTile t={t} /></div>)}
                  <div style={{ flex: 1 }} />
                  <span className="mini-speak">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>
                  </span>
                </div>
                <div className="mini-grid">{HERO_GRID.map((t) => <MiniTile key={t.w} t={t} />)}</div>
              </div>
            </div>
          </div>
        </section>

        <section id="try" className="band">
          <div className="wrap section">
            <div className="section-head section-head-row">
              <div style={{ maxWidth: 640 }}>
                <h2>Try it right here</h2>
                <p>Tap a few pictures to build a message. Press <strong>Speak</strong> to hear it. Tap a picture in the message to take it out.</p>
              </div>
              <p className="small" style={{ margin: 0 }}>Sound plays only when you tap. Nothing moves on its own.</p>
            </div>
            <TryIt />
          </div>
        </section>

        <section id="ages" className="wrap section">
          <div className="section-head">
            <h2>One app that grows with the person</h2>
            <p>Pick a starting profile and PictoTalk sets the size, number of words and look to match. Every setting can be changed later.</p>
          </div>
          <div className="grid-3">
            <article className="card">
              <div className="preview" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                {[tile("I", "i", "pron"), tile("want", "want", "verb"), tile("more", "more", "desc"), tile("apple", "apple", "noun"), tile("help", "help", "urgent"), tile("yes", "yes", "social")].map((t) => <MiniTile key={t.w} t={t} big />)}
              </div>
              <div><h3>Young learners</h3><p>Big pictures and a few choices at a time. More words can be revealed one by one as the child is ready.</p></div>
              <ul><li>Up to 24 pictures on screen</li><li>Speaks each picture as it&apos;s tapped</li><li>Locked so settings can&apos;t be changed by accident</li></ul>
            </article>
            <article className="card">
              <div className="preview">
                <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", fontSize: 16, fontWeight: 700 }}>I need a quiet place for a few minutes.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
                  {[["I", "pron"], ["need", "verb"], ["quiet", "desc"], ["where", "q"], ["think", "verb"], ["later", "desc"], ["thanks", "social"], ["ABC", "misc"]].map(([w, g]) => (
                    <div key={w} style={{ background: "#fff", border: "1px solid var(--line)", borderBottom: `4px solid var(--${g === "misc" ? "ink-3" : g + "-e"})`, borderRadius: 8, padding: "10px 4px", textAlign: "center", fontWeight: 700, fontSize: 14 }}>{w}</div>
                  ))}
                </div>
              </div>
              <div><h3>Teens and adults</h3><p>A grown-up look with more words, sentences you can save, and a keyboard for typing. No cartoon styling.</p></div>
              <ul><li>Up to 60 words, with or without pictures</li><li>Word suggestions and saved phrases</li><li>The person can manage their own settings</li></ul>
            </article>
            <article className="card">
              <div className="preview">
                {[["Edit Sam's board", "6 × 4"], ["Record Mom's voice", "12 words"], ["Plan tomorrow", "7 steps"]].map(([a, b]) => (
                  <div key={a} style={{ display: "flex", justifyContent: "space-between", background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", fontSize: 15 }}><strong>{a}</strong><span className="small" style={{ fontSize: 13 }}>{b}</span></div>
                ))}
              </div>
              <div><h3>Parents, teachers and therapists</h3><p>A separate supporter area, behind a lock, to set up boards, add photos, record voices and plan the day.</p></div>
              <ul><li>Hide words without losing their place</li><li>Use real photos of people and places</li><li>Make picture schedules in minutes</li></ul>
            </article>
          </div>
        </section>

        <section className="band-soft">
          <div className="wrap section">
            <div className="section-head">
              <h2>Built to feel calm and predictable</h2>
              <p>These choices come from how picture communication is taught and from what makes a screen easier to use for many autistic people.</p>
            </div>
            <div className="grid-4">
              <div className="card card-plain"><div className="icon-chip"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E5C73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg></div><h3 style={{ fontSize: 21 }}>Words stay where they are</h3><p>Every word keeps its spot, so the hand learns where to go. New words fill empty spaces instead of moving others around.</p></div>
              <div className="card card-plain"><div className="swatches">{["pron", "verb", "desc", "noun", "q", "social"].map((g) => <span key={g} style={{ background: `var(--${g})`, borderColor: `var(--${g}-e)` }} />)}</div><h3 style={{ fontSize: 21 }}>Colors that mean something</h3><p>People are yellow, actions green, describing words blue, things orange, questions purple. It&apos;s the color key many speech therapists already use.</p></div>
              <div className="card card-plain"><div className="icon-chip"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E5C73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" /></svg></div><h3 style={{ fontSize: 21 }}>Calm by default</h3><p>Soft colors, no flashing, no surprise sounds, no pop-ups. A low-light theme and a high-contrast theme are one tap away.</p></div>
              <div className="card card-plain"><div className="icon-chip"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E5C73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11V5a2 2 0 0 1 4 0v6" /><path d="M13 10a2 2 0 0 1 4 0v2" /><path d="M17 11a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L4.5 15a2 2 0 0 1 3.4-2.1L9 14.5" /></svg></div><h3 style={{ fontSize: 21 }}>Easy to press</h3><p>Large buttons with space between them. Choose tap, tap and lift, or press and hold, and ignore accidental double taps.</p></div>
            </div>
          </div>
        </section>

        <section id="features" className="wrap section">
          <div className="section-head"><h2>More than a picture board</h2></div>
          <div className="grid-3">
            {FEATURES.map((f) => (
              <div key={f.t} className="card feature">
                <img src={`/symbols/${f.img}.png`} alt="" />
                <div><h3>{f.t}</h3><p>{f.d}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="band">
          <div className="wrap section">
            <div className="section-head">
              <h2>Private and free, by design</h2>
              <p>PictoTalk speaks using the voice built into your device, so it works instantly, even without internet, and nothing you say is sent anywhere.</p>
            </div>
            <div className="grid-3">
              <div className="card card-plain" style={{ background: "var(--ground)" }}><span className="stat">0</span><h3 style={{ fontSize: 20 }}>Accounts</h3><p>No sign-up, no email, no passwords. Open it and start.</p></div>
              <div className="card card-plain" style={{ background: "var(--ground)" }}><span className="stat">0</span><h3 style={{ fontSize: 20 }}>Data collected</h3><p>Boards, photos and voice recordings stay on the device they were made on.</p></div>
              <div className="card card-plain" style={{ background: "var(--ground)" }}><span className="stat">$0</span><h3 style={{ fontSize: 20 }}>For families, always</h3><p>No subscriptions and no in-app purchases.</p></div>
            </div>
          </div>
        </section>

        <section id="supporters" className="band-soft">
          <div className="wrap section split">
            <div>
              <h2>Set up in minutes, change any time</h2>
              <p className="muted" style={{ marginTop: 14 }}>Press and hold the lock in the corner, answer a quick question, and you&apos;re in the supporter area. The board stays exactly as the person left it.</p>
              <ul className="checks">
                <li><Check /><span><strong>Reveal words gradually.</strong> Hide words until they&apos;re taught. They keep their place.</span></li>
                <li><Check /><span><strong>Choose a grid size</strong> from 6 big pictures up to 60 small ones.</span></li>
                <li><Check /><span><strong>Add a word</strong> with a symbol search, a photo from the camera roll, and an optional voice recording.</span></li>
                <li><Check /><span><strong>Several people, one device.</strong> Keep a separate board for each person.</span></li>
              </ul>
            </div>
            <div>
              <div className="card" style={{ background: "var(--ground)" }}>
                <div className="board-head">
                  <strong style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 600 }}>Sam&apos;s board</strong>
                  <span style={{ display: "flex", gap: 6 }}>
                    {["4 × 3", "6 × 4", "8 × 5"].map((s) => <span key={s} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 14, fontWeight: 700, background: s === "6 × 4" ? "var(--accent)" : "#fff", color: s === "6 × 4" ? "#fff" : "var(--ink)", border: "1px solid var(--line-2)" }}>{s}</span>)}
                  </span>
                </div>
                <div className="mini-grid">{EDIT_GRID.map((t) => <MiniTile key={t.w} t={t} />)}</div>
                <p className="small" style={{ fontSize: 15 }}>Dashed spaces are hidden words. They appear in the same place when switched on.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="quote">
          <p>“There&apos;s nothing more frustrating than not being able to communicate.”</p>
          <p className="small" style={{ fontWeight: 700 }}>Dr. Temple Grandin</p>
        </section>

        <section id="faq" className="band-soft">
          <div className="faq section">
            <h2 style={{ marginBottom: 32 }}>Questions people ask</h2>
            <details open><summary>Is PictoTalk really free?</summary><p>Yes. There&apos;s nothing to buy, no subscription and no account to make.</p></details>
            <details><summary>Is it only for children?</summary><p>No. The teen and adult profile has a grown-up look, more words, a keyboard and saved phrases.</p></details>
            <details><summary>Does it need internet?</summary><p>No. Speech uses the voice built into your device and the board is stored on the device. A connection is only used to search for new symbols and download them once.</p></details>
            <details><summary>What do you collect?</summary><p>Nothing. There are no accounts, no analytics on what is said, and photos and recordings never leave the device.</p></details>
            <details><summary>Can it replace a speech therapist or a dedicated communication device?</summary><p>PictoTalk is a tool, not therapy. It works best alongside a speech and language therapist, who can help choose words and teach them.</p></details>
            <details><summary>Where do the symbols come from?</summary><p>From ARASAAC, a free symbol library used by schools and therapists around the world. A built-in set is included for use without internet.</p></details>
          </div>
        </section>

        <section className="cta">
          <div className="wrap">
            <div className="cta-text">
              <h2 className="cta-title">Ready when you are</h2>
              <p>Open the board now, or take two minutes to set it up for someone.</p>
            </div>
            <div className="actions">
              <a className="btn btn-light btn-lg" href={APP_URL}>Start talking</a>
              {APP_STORE_URL ? <a className="btn btn-outline-light btn-lg" href={APP_STORE_URL}>App Store</a> : <a className="btn btn-outline-light btn-lg" href={`${APP_URL}/setup`}>Set it up</a>}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
