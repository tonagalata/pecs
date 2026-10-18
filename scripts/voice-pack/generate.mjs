#!/usr/bin/env node
// Generates the optional PictoTalk HD voice pack on your own computer, for free.
//
//   cd scripts/voice-pack && npm install
//   node generate.mjs                      # default voice af_heart, version kokoro-v1
//   node generate.mjs --voice am_michael --version kokoro-michael-v1
//
// Then upload (bucket name is printed by `npx sst deploy`, output "voicePackBucket"):
//   aws s3 sync out/kokoro-v1 s3://<voicePackBucket>/kokoro-v1 --cache-control "public,max-age=31536000,immutable"
//
// Requires ffmpeg on PATH (brew install ffmpeg) to compress clips to AAC (.m4a), ~3–8 KB each.
// Model: Kokoro-82M (Apache-2.0), run locally through kokoro-js / ONNX Runtime. No API costs.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KokoroTTS } from 'kokoro-js';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const voice = arg('voice', 'af_heart');
const version = arg('version', 'kokoro-v1');
const speed = Number(arg('speed', '0.95'));

// Must match normalize() in apps/mobile/src/lib/speech.ts
const normalize = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();

const lines = readFileSync(join(here, 'phrases.txt'), 'utf8')
  .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const unique = new Map();
for (const l of lines) if (!unique.has(normalize(l))) unique.set(normalize(l), l);

try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch {
  console.error('ffmpeg not found. Install it (macOS: brew install ffmpeg) and try again.');
  process.exit(1);
}

const out = join(here, 'out', version);
const tmp = join(here, 'out', '.tmp');
mkdirSync(out, { recursive: true });
mkdirSync(tmp, { recursive: true });

console.log(`Loading Kokoro (first run downloads ~90 MB)…`);
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });

const clips = {};
let n = 0;
for (const [key, text] of unique) {
  n += 1;
  const file = `${createHash('sha1').update(`${voice}:${key}`).digest('hex').slice(0, 16)}.m4a`;
  clips[key] = file;
  if (existsSync(join(out, file))) continue;
  const audio = await tts.generate(text, { voice, speed });
  const wav = join(tmp, 'clip.wav');
  await audio.save(wav);
  // Trim leading/trailing silence so word-by-word playback sounds tight, then encode AAC.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav,
    '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=1:stop_threshold=-45dB:stop_duration=0.15',
    '-ac', '1', '-c:a', 'aac', '-b:a', '48k', join(out, file)]);
  process.stdout.write(`\r${n}/${unique.size}  ${text.slice(0, 50).padEnd(50)}`);
}
rmSync(tmp, { recursive: true, force: true });

writeFileSync(join(out, 'manifest.json'), JSON.stringify({ voice: `kokoro:${voice}`, version, clips }, null, 1));
console.log(`\nDone: ${unique.size} clips in ${out}`);
console.log(`Upload: aws s3 sync ${out} s3://<voicePackBucket>/${version} --cache-control "public,max-age=31536000,immutable"`);
