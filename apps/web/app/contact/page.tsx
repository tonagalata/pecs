import type { Metadata } from "next";
import { Footer, Nav } from "../site";

export const metadata: Metadata = { title: "Contact — PictoTalk" };

const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@pictotalk.org";

export default function ContactPage() {
  return (
    <>
      <Nav home={false} />
      <main className="prose">
        <h1>Contact</h1>
        <p>Questions, ideas, or a word list that would help your family or classroom? We&apos;d like to hear from you.</p>
        <p><a className="btn btn-primary btn-lg" href={`mailto:${EMAIL}?subject=PictoTalk`}>Email {EMAIL}</a></p>
        <h2>Speech and language therapists</h2>
        <p>If you use PictoTalk with clients and have suggestions for the starting vocabulary or layout, please tell us. Starting boards are shaped by people who teach communication every day.</p>
      </main>
      <Footer />
    </>
  );
}
