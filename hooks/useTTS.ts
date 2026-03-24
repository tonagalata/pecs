"use client";

import { useState, useRef, useCallback } from "react";

// Module-level in-memory cache shared across all hook instances
const memCache = new Map<string, string>();
const LS_PREFIX = "tts:";

function readCache(phrase: string): string | null {
  const hit = memCache.get(phrase);
  if (hit) return hit;
  try {
    const stored = localStorage.getItem(LS_PREFIX + phrase);
    if (stored) {
      memCache.set(phrase, stored);
      return stored;
    }
  } catch {
    // localStorage unavailable (private browsing, permissions, etc.)
  }
  return null;
}

function writeCache(phrase: string, url: string): void {
  memCache.set(phrase, url);
  try {
    localStorage.setItem(LS_PREFIX + phrase, url);
  } catch {
    // ignore write failures
  }
}

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
  // Keep voiceId accessible inside callbacks without causing re-renders
  const voiceIdRef = useRef(voiceId);
  voiceIdRef.current = voiceId;

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const playBrowser = useCallback((phrase: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(phrase);
    utt.rate = 0.82;
    utt.pitch = 1.05;
    utt.volume = 1;
    const voice = getBrowserVoice();
    if (voice) utt.voice = voice;
    setIsPlaying(true);
    utt.onend = () => setIsPlaying(false);
    utt.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utt);
  }, []);

  const play = useCallback(
    async (phrase: string) => {
      if (!phrase.trim()) return;

      if (isPlaying || isLoading) {
        stop();
        return;
      }

      const launchAudio = (url: string) => {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        const audio = new Audio(url);
        audioRef.current = audio;
        setIsPlaying(true);
        audio.onended = () => { setIsPlaying(false); audioRef.current = null; };
        audio.onerror = () => { setIsPlaying(false); audioRef.current = null; playBrowser(phrase); };
        audio.play().catch(() => playBrowser(phrase));
      };

      // 1. In-memory cache (fastest)
      const memHit = readCache(phrase);
      if (memHit) {
        launchAudio(memHit);
        return;
      }

      // 2. API (Turso cache or Resemble generation)
      setIsLoading(true);
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phrase, voiceId: voiceIdRef.current }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.url) {
            writeCache(phrase, json.url as string);
            setIsLoading(false);
            launchAudio(json.url as string);
            return;
          }
        }
      } catch {
        // network failure or API error
      }

      setIsLoading(false);
      // 3. Browser speech fallback
      playBrowser(phrase);
    },
    [isPlaying, isLoading, stop, playBrowser]
  );

  return { isPlaying, isLoading, play, stop };
}
