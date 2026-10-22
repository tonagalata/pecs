// Speech engine. Everything runs on the device; there is no per-phrase server call.
//
// Order of preference for any text:
//   1. A family recording attached to that word        (recorded on this device)
//   2. A clip from the HD voice pack, when switched on  (generated once with Kokoro, ~a few MB)
//      - whole phrase clip if one exists, else word-by-word if every word has a clip
//   3. The device's own text-to-speech voice             (iOS/Android system voices, Web Speech API)
//
// Option 3 handles any sentence instantly and offline, which is what removes the need to
// pre-generate and store every possible combination of words.
import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import type { Settings } from './types';

const PACK_URL = process.env.EXPO_PUBLIC_VOICE_PACK_URL ?? '';

interface PackManifest {
  voice: string;
  version: string;
  clips: Record<string, string>;
}

let manifest: PackManifest | null = null;
let packBase = '';
let player: AudioPlayer | null = null;
let queueToken = 0;
let audioReady = false;

export const normalize = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();

async function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
  } catch {
    // web or unsupported
  }
}

function playUri(uri: string, token: number): Promise<void> {
  return new Promise((resolve) => {
    if (token !== queueToken) return resolve();
    try {
      if (!player) player = createAudioPlayer(uri);
      else player.replace(uri);
      const sub = player.addListener('playbackStatusUpdate', (s) => {
        if (s.didJustFinish) { sub.remove(); resolve(); }
      });
      player.play();
      // Safety net: never block the queue on a missing finish event.
      setTimeout(() => { sub.remove(); resolve(); }, 8000);
    } catch {
      resolve();
    }
  });
}

let voicesCache: Speech.Voice[] | null = null;

/** Browsers fill in their voice list after page load; wait for it (briefly) before reading it. */
function browserVoicesLoaded(timeoutMs = 2500): Promise<void> {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth || synth.getVoices().length) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => { synth.removeEventListener('voiceschanged', finish); clearTimeout(timer); resolve(); };
    const timer = setTimeout(finish, timeoutMs);
    synth.addEventListener('voiceschanged', finish);
  });
}

export async function listVoices(): Promise<Speech.Voice[]> {
  if (voicesCache) return voicesCache;
  try {
    if (Platform.OS === 'web') await browserVoicesLoaded();
    const all = (await Speech.getAvailableVoicesAsync()).filter((v) => v.language?.toLowerCase().startsWith('en'));
    // An empty list on web usually means the browser hasn't loaded its voices yet: ask again next time.
    if (all.length || Platform.OS !== 'web') voicesCache = all;
    return all;
  } catch {
    return [];
  }
}

/** Prefer the voice the supporter chose, then any "Enhanced"/premium English voice. */
async function chooseVoice(preferred?: string): Promise<string | undefined> {
  const voices = await listVoices();
  if (preferred && voices.some((v) => v.identifier === preferred)) return preferred;
  const enhanced = voices.find((v) => v.quality === Speech.VoiceQuality.Enhanced && v.language.startsWith('en-US'))
    ?? voices.find((v) => v.quality === Speech.VoiceQuality.Enhanced);
  return enhanced?.identifier;
}

function deviceSpeak(text: string, settings: Pick<Settings, 'voiceId' | 'rate'>, token: number): Promise<void> {
  return new Promise(async (resolve) => {
    if (token !== queueToken) return resolve();
    const voice = await chooseVoice(settings.voiceId);
    Speech.speak(text, {
      voice, rate: settings.rate, language: 'en-US',
      onDone: () => resolve(), onStopped: () => resolve(), onError: () => resolve(),
    });
  });
}

function clipUri(text: string): string | null {
  if (!manifest) return null;
  const file = manifest.clips[normalize(text)];
  return file ? `${packBase}${file}` : null;
}

export async function stopSpeaking() {
  queueToken += 1;
  try { player?.pause(); } catch {}
  try { await Speech.stop(); } catch {}
}

export interface SpeakOptions {
  /** Recording to play instead of synthesizing (single word taps). */
  recording?: string;
  /** Per-word recordings, used when speaking a whole message. */
  wordRecordings?: (string | undefined)[];
}

export async function speak(text: string, settings: Pick<Settings, 'voiceId' | 'rate' | 'hdVoice'>, opts: SpeakOptions = {}) {
  const clean = text.trim();
  if (!clean && !opts.recording) return;
  await stopSpeaking();
  const token = queueToken;
  await ensureAudio();

  if (opts.recording) return playUri(opts.recording, token);

  const words = clean.split(/\s+/);
  const anyRecording = opts.wordRecordings?.some(Boolean);
  if (settings.hdVoice || anyRecording) {
    const whole = settings.hdVoice ? clipUri(clean) : null;
    if (whole) return playUri(whole, token);
    // Word-by-word only when every piece has audio; otherwise one natural device-voice sentence.
    const parts = opts.wordRecordings && opts.wordRecordings.length === words.length
      ? words.map((w, i) => opts.wordRecordings?.[i] ?? (settings.hdVoice ? clipUri(w) : null))
      : words.map((w) => (settings.hdVoice ? clipUri(w) : null));
    if (parts.every(Boolean)) {
      for (const p of parts) {
        if (token !== queueToken) return;
        await playUri(p as string, token);
      }
      return;
    }
  }
  return deviceSpeak(clean, settings, token);
}

/** Download the HD voice pack once. Native: into the app folder. Web: browser cache. */
export async function installVoicePack(onProgress?: (done: number, total: number) => void): Promise<boolean> {
  if (!PACK_URL) return false;
  try {
    const base = PACK_URL.replace(/\/?$/, '/');
    const m = (await (await fetch(`${base}manifest.json`)).json()) as PackManifest;
    if (Platform.OS === 'web') {
      manifest = m;
      packBase = base;
      return true;
    }
    const dir = new Directory(Paths.document, 'voicepack', m.version);
    if (!dir.exists) dir.create({ intermediates: true });
    const files = Array.from(new Set(Object.values(m.clips)));
    let done = 0;
    for (let i = 0; i < files.length; i += 8) {
      await Promise.all(files.slice(i, i + 8).map(async (f) => {
        const dest = new File(dir, f);
        if (!dest.exists) await File.downloadFileAsync(`${base}${f}`, dest);
        done += 1;
      }));
      onProgress?.(done, files.length);
    }
    new File(dir, 'manifest.json').write(JSON.stringify(m));
    manifest = m;
    packBase = dir.uri.replace(/\/?$/, '/');
    return true;
  } catch {
    return false;
  }
}

/** Load an already-installed pack at startup (no network). */
export async function loadInstalledPack(): Promise<boolean> {
  if (Platform.OS === 'web') return PACK_URL ? installVoicePack() : false;
  try {
    const root = new Directory(Paths.document, 'voicepack');
    if (!root.exists) return false;
    const versions = root.list().filter((d) => d instanceof Directory) as Directory[];
    const latest = versions.sort((a, b) => a.name.localeCompare(b.name)).pop();
    if (!latest) return false;
    const mf = new File(latest, 'manifest.json');
    if (!mf.exists) return false;
    manifest = JSON.parse(await mf.text()) as PackManifest;
    packBase = latest.uri.replace(/\/?$/, '/');
    return true;
  } catch {
    return false;
  }
}

export const voicePackAvailable = () => Boolean(PACK_URL);
export const voicePackLoaded = () => Boolean(manifest);

/**
 * Everything speech needs before the board opens: the device/browser voices and, if there is
 * one, the HD voice pack manifest. Never takes longer than `timeoutMs`, so a slow or missing
 * connection only means the board opens with the device voice.
 */
export async function prepareVoices(timeoutMs = 6000): Promise<void> {
  const work = Promise.all([listVoices(), loadInstalledPack()]).catch(() => {});
  await Promise.race([work, new Promise((r) => setTimeout(r, timeoutMs))]);
}
