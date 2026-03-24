import { getDb } from "./db";

let initialized = false;

export async function initTtsCache(): Promise<void> {
  if (initialized) return;
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tts_cache (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      phrase_key TEXT    UNIQUE NOT NULL,
      phrase_text TEXT   NOT NULL,
      voice_id   TEXT    NOT NULL,
      audio_url  TEXT    NOT NULL,
      hit_count  INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_tts_cache_phrase_key ON tts_cache (phrase_key)"
  );
  initialized = true;
}
