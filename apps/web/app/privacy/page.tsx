import type { Metadata } from "next";
import { Footer, Nav } from "../site";

export const metadata: Metadata = {
  title: "Privacy — PictoTalk",
  description: "PictoTalk collects nothing. Everything stays on your device.",
};

export default function PrivacyPage() {
  return (
    <>
      <Nav home={false} />
      <main className="prose">
        <h1>Privacy</h1>
        <p className="small">Last updated: October 2026</p>
        <p>PictoTalk is a free tool built to help people communicate. It is designed so that nothing about the person using it, or what they say, ever leaves their device.</p>

        <h2>What we collect</h2>
        <p>Nothing. PictoTalk has no accounts, no sign-up and no analytics about what is said or which buttons are pressed.</p>

        <h2>What stays on your device</h2>
        <ul>
          <li><strong>Boards, words and settings</strong> are saved in the app&apos;s own storage on the device (in the browser&apos;s storage on the web version).</li>
          <li><strong>Photos</strong> you add are resized and copied into the app&apos;s storage. They are never uploaded.</li>
          <li><strong>Voice recordings</strong> are saved on the device and played back from there. They are never uploaded.</li>
          <li><strong>Speech</strong> is produced by the voice built into your device (or, if you turn it on, a downloaded voice pack). The text being spoken is not sent to us or to any speech service.</li>
          <li><strong>Message history</strong> is off by default. If a supporter turns it on, the last 50 messages are kept on the device only.</li>
        </ul>

        <h2>Connections the app makes</h2>
        <ul>
          <li><strong>ARASAAC</strong>: when you search for a symbol or the board loads a symbol for the first time, the app requests it from ARASAAC&apos;s public service (or our cache of it). Searches contain the search word only. See <a href="https://arasaac.org/legal">ARASAAC&apos;s terms</a>.</li>
          <li><strong>HD voice pack</strong> (optional): downloaded once from our file host if you switch it on.</li>
          <li><strong>Hosting</strong>: this website and the web app are static files served by Amazon Web Services (S3 and CloudFront). Like any web host, AWS may keep standard technical request logs.</li>
        </ul>

        <h2>Children</h2>
        <p>PictoTalk is designed for use by and with children under the supervision of a parent, caregiver or educator. Because we collect no personal information, there is nothing for us to store, share or delete.</p>

        <h2>Removing your data</h2>
        <p>Delete the app (or clear the website&apos;s data in your browser) and everything it stored is gone.</p>

        <h2>Changes</h2>
        <p>If this ever changes, we will update this page and the date above.</p>
      </main>
      <Footer />
    </>
  );
}
