"use client";

import { useState, useRef, useCallback } from "react";
import { getCachedUrl, setCachedUrl } from "@/lib/tts-cache";
import { getCustomRecording } from "@/lib/audio-recordings";

// Normalize single letters/numbers so TTS speaks them clearly:
// "P" → "the letter P",  "7" → "the number 7"
function normalizePhraseForSpeech(phrase: string): string {
  const t = phrase.trim();
  if (/^[A-Za-z]$/.test(t)) return `the letter ${t.toUpperCase()}`;
  if (/^\d{1,2}$/.test(t)) return `the number ${t}`;
  return phrase;
}

// Module-level in-memory cache shared across all hook instances (fastest layer)
const memCache = new Map<string, string>();

const PREFERRED_VOICES = [
  "Samantha", "Karen", "Moira", "Fiona",
  "Victoria", "Allison", "Susan", "Zoe", "Alice",
];

function getBrowserVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  for (const name of PREFERRED_VOICES) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return (
    voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female")) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

export interface UseTTSResult {
  isPlaying: boolean;
  isLoading: boolean;
  play: (phrase: string) => void;
  stop: () => void;
}

export function useTTS(voiceId?: string): UseTTSResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceIdRef = useRef(voiceId);
  voiceIdRef.current = voiceId;

  // Queue of phrases waiting to be spoken
  const queueRef = useRef<string[]>([]);
  // Whether we're currently playing or loading (ref so callbacks always see latest)
  const busyRef = useRef(false);
  // Stable ref to playPhrase so onended callbacks don't go stale
  const playPhraseRef = useRef<((phrase: string) => Promise<void>) | null>(null);

  const stop = useCallback(() => {
    queueRef.current = [];
    busyRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  // Called when a phrase finishes — plays the next queued item if any
  const playNext = useCallback(() => {
    busyRef.current = false;
    setIsPlaying(false);
    setIsLoading(false);
    const next = queueRef.current.shift();
    if (next) playPhraseRef.current?.(next);
  }, []);

  const playBrowser = useCallback((phrase: string, onEnd: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) { onEnd(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(phrase);
    utt.rate = 0.82;
    utt.pitch = 1.05;
    utt.volume = 1;
    const voice = getBrowserVoice();
    if (voice) utt.voice = voice;
    setIsPlaying(true);
    setIsLoading(false);
    utt.onend = () => onEnd();
    utt.onerror = () => onEnd();
    window.speechSynthesis.speak(utt);
  }, []);

  const playPhrase = useCallback(async (phrase: string) => {
    busyRef.current = true;
    const spokenPhrase = normalizePhraseForSpeech(phrase);

    const launchAudio = (url: string, owned = false) => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const audio = new Audio(url);
      audioRef.current = audio;
      setIsPlaying(true);
      setIsLoading(false);
      audio.onended = () => { if (owned) URL.revokeObjectURL(url); audioRef.current = null; playNext(); };
      audio.onerror = () => { if (owned) URL.revokeObjectURL(url); audioRef.current = null; playBrowser(spokenPhrase, playNext); };
      audio.play().catch(() => { if (owned) URL.revokeObjectURL(url); playBrowser(spokenPhrase, playNext); });
    };

    // 0. Custom device recording (keyed by original label — never leaves this device)
    try {
      const customBlob = await getCustomRecording(phrase);
      if (customBlob) { launchAudio(URL.createObjectURL(customBlob), true); return; }
    } catch { /* ignore */ }

    // 1. In-memory cache (synchronous, fastest)
    const memHit = memCache.get(spokenPhrase);
    if (memHit) { launchAudio(memHit); return; }

    // 2. IndexedDB cache (device storage — avoids network)
    try {
      const idbHit = await getCachedUrl(spokenPhrase);
      if (idbHit) { memCache.set(spokenPhrase, idbHit); launchAudio(idbHit); return; }
    } catch { /* IDB unavailable */ }

    // 3. API (Turso server cache or Resemble generation)
    setIsLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase: spokenPhrase, voiceId: voiceIdRef.current }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.url) {
          const url = json.url as string;
          memCache.set(spokenPhrase, url);
          setCachedUrl(spokenPhrase, url).catch(() => {});
          launchAudio(url);
          return;
        }
      }
    } catch { /* network failure */ }

    setIsLoading(false);
    // 4. Browser speech fallback
    playBrowser(spokenPhrase, playNext);
  }, [playBrowser, playNext]);

  // Keep ref current so onended callbacks always call the latest version
  playPhraseRef.current = playPhrase;

  const play = useCallback((phrase: string) => {
    if (!phrase.trim()) return;
    // If busy, queue the phrase — it will play after the current one finishes
    if (busyRef.current) {
      queueRef.current.push(phrase);
      return;
    }
    playPhrase(phrase);
  }, [playPhrase]);

  return { isPlaying, isLoading, play, stop };
}
