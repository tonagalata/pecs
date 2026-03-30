import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getDb } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";

const RESEMBLE_ENDPOINT = "https://f.cluster.resemble.ai/synthesize";

const inFlight = new Map<string, Promise<string>>();

interface CacheRow {
  audio_url: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const phrase: string = (body.phrase ?? "").trim();
  const voiceId: string = body.voiceId ?? process.env.RESEMBLE_VOICE_UUID ?? "";

  if (!phrase) {
    return NextResponse.json({ error: "phrase is required" }, { status: 400 });
  }

  const apiKey = process.env.RESEMBLE_API_KEY;
  if (!apiKey || !voiceId) {
    return NextResponse.json({ error: "Resemble not configured" }, { status: 503 });
  }

  const phraseKey = createHash("sha256")
    .update(`${phrase}:${voiceId}`)
    .digest("hex");

  try {
    const db = getDb();

    const { rows } = await db.execute({
      sql: "SELECT audio_url FROM tts_cache WHERE phrase_key = ? LIMIT 1",
      args: [phraseKey],
    });

    if (rows.length > 0) {
      const cached = rows[0] as unknown as CacheRow;
      db.execute({
        sql: "UPDATE tts_cache SET hit_count = hit_count + 1 WHERE phrase_key = ?",
        args: [phraseKey],
      }).catch(() => {});
      return NextResponse.json({ url: cached.audio_url, cached: true });
    }

    if (inFlight.has(phraseKey)) {
      const url = await inFlight.get(phraseKey)!;
      return NextResponse.json({ url, cached: false });
    }

    const generatePromise = (async (): Promise<string> => {
      const resembleRes = await fetch(RESEMBLE_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voice_uuid: voiceId,
          data: phrase,
          output_format: "mp3", // changed from "opus"
        }),
      });

      if (!resembleRes.ok) {
        const errText = await resembleRes.text().catch(() => "(unreadable)");
        throw new Error(`Resemble error ${resembleRes.status}: ${errText}`);
      }

      const json = await resembleRes.json();
      if (!json.success || !json.audio_content) {
        throw new Error("No audio returned from Resemble");
      }

      const audioBuffer = Buffer.from(json.audio_content as string, "base64");
      const r2Key = `tts/${phraseKey}.mp3`;                          // changed from .opus
      const audioUrl = await uploadToR2(r2Key, audioBuffer, "audio/mpeg"); // changed from audio/ogg

      await db.execute({
        sql: `INSERT INTO tts_cache (phrase_key, phrase_text, voice_id, audio_url)
              VALUES (?, ?, ?, ?)
              ON CONFLICT (phrase_key) DO NOTHING`,
        args: [phraseKey, phrase, voiceId, audioUrl],
      });

      return audioUrl;
    })();

    inFlight.set(phraseKey, generatePromise);

    try {
      const url = await generatePromise;
      return NextResponse.json({ url, cached: false });
    } finally {
      inFlight.delete(phraseKey);
    }
  } catch (err) {
    console.error("[tts] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}