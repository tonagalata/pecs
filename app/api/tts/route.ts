import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getDb } from "@/lib/db";
import { initTtsCache } from "@/lib/tts-cache";
import { uploadToR2 } from "@/lib/r2";

const RESEMBLE_ENDPOINT = "https://f.cluster.resemble.ai/synthesize";

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
    await initTtsCache();
    const db = getDb();

    // Cache hit
    const { rows } = await db.execute({
      sql: "SELECT audio_url FROM tts_cache WHERE phrase_key = ? LIMIT 1",
      args: [phraseKey],
    });

    if (rows.length > 0) {
      const cached = rows[0] as unknown as CacheRow;
      // Fire-and-forget hit_count increment
      db.execute({
        sql: "UPDATE tts_cache SET hit_count = hit_count + 1 WHERE phrase_key = ?",
        args: [phraseKey],
      }).catch(() => {});
      return NextResponse.json({ url: cached.audio_url, cached: true });
    }

    // Cache miss - generate with Resemble AI
    const resembleRes = await fetch(RESEMBLE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voice_uuid: voiceId,
        data: phrase,
        output_format: "wav",
        model: "chatterbox-turbo",
      }),
    });

    if (!resembleRes.ok) {
      return NextResponse.json(
        { error: `Resemble error ${resembleRes.status}` },
        { status: resembleRes.status }
      );
    }

    const json = await resembleRes.json();
    if (!json.success || !json.audio_content) {
      return NextResponse.json(
        { error: "No audio returned from Resemble" },
        { status: 502 }
      );
    }

    const audioBuffer = Buffer.from(json.audio_content as string, "base64");
    const r2Key = `tts/${phraseKey}.wav`;
    const audioUrl = await uploadToR2(r2Key, audioBuffer, "audio/wav");

    await db.execute({
      sql: "INSERT INTO tts_cache (phrase_key, phrase_text, voice_id, audio_url) VALUES (?, ?, ?, ?)",
      args: [phraseKey, phrase, voiceId, audioUrl],
    });

    return NextResponse.json({ url: audioUrl, cached: false });
  } catch (err) {
    console.error("[tts] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
