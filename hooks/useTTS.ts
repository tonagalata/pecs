"use client";

import { useState, useRef, useCallback } from "react";
import { getCachedUrl, setCachedUrl } from "@/lib/tts-cache";

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

      // 1. In-memory cache (synchronous, fastest)
      const memHit = memCache.get(phrase);
      if (memHit) {
        launchAudio(memHit);
        return;
      }

      // 2. IndexedDB cache (async, avoids network)
      try {
        const idbHit = await getCachedUrl(phrase);
        if (idbHit) {
          memCache.set(phrase, idbHit);
          launchAudio(idbHit);
          return;
        }
      } catch {
        // IDB unavailable — fall through to API
      }

      // 3. API (Turso server cache or Resemble generation)
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
            const url = json.url as string;
            memCache.set(phrase, url);
            setCachedUrl(phrase, url).catch(() => {});
            setIsLoading(false);
            launchAudio(url);
            return;
          }
        }
      } catch {
        // network failure or API error
      }

      setIsLoading(false);
      // 4. Browser speech fallback
      playBrowser(phrase);
    },
    [isPlaying, isLoading, stop, playBrowser]
  );

  return { isPlaying, isLoading, play, stop };
}
