// Picture lookup. ARASAAC pictograms are fetched from ARASAAC's free public API/CDN and cached on
// the device by expo-image. Until a pictogram is cached (or with no connection) the bundled
// PictoTalk symbol is shown, so the board works offline from the very first launch.
import { Image, type ImageSource } from 'expo-image';
import { BUILTIN } from './builtin';
import type { SymbolRef } from './types';

const API = process.env.EXPO_PUBLIC_ARASAAC_API ?? 'https://api.arasaac.org/v1';
/** Point this at the SST CloudFront cache in production (see infra/README.md). */
const STATIC = process.env.EXPO_PUBLIC_ARASAAC_STATIC ?? 'https://static.arasaac.org';

export function arasaacUrl(id: number, size: 300 | 500 = 300): string {
  return `${STATIC}/pictograms/${id}/${id}_${size}.png`;
}

export interface SymbolInput {
  symbol: SymbolRef;
  fallback?: string;
  lookup?: string;
}

/** Returns the image to show and the bundled fallback to show while it loads. */
export function resolveSymbol(
  w: SymbolInput,
  set: 'arasaac' | 'pictotalk',
  ids: Record<string, number>,
): { source: ImageSource | number | null; placeholder: number | null } {
  const placeholder = w.fallback && BUILTIN[w.fallback] ? BUILTIN[w.fallback] : null;
  const s = w.symbol;
  if (s.kind === 'photo') return { source: { uri: s.uri }, placeholder: null };
  if (s.kind === 'builtin') return { source: BUILTIN[s.key] ?? placeholder, placeholder: null };
  if (set === 'pictotalk') return { source: placeholder, placeholder: null };
  if (s.kind === 'arasaac') return { source: { uri: arasaacUrl(s.id) }, placeholder };
  const key = (w.lookup ?? '').toLowerCase();
  if (key && ids[key]) return { source: { uri: arasaacUrl(ids[key]) }, placeholder };
  return { source: placeholder, placeholder: null };
}

export interface ArasaacHit {
  id: number;
  keyword: string;
}

/** Free-text symbol search (used when adding a word). */
export async function searchArasaac(query: string, signal?: AbortSignal): Promise<ArasaacHit[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await fetch(`${API}/pictograms/en/search/${encodeURIComponent(q)}`, { signal });
  if (!res.ok) return [];
  const json = (await res.json()) as { _id: number; keywords?: { keyword: string }[] }[];
  return json.slice(0, 40).map((p) => ({ id: p._id, keyword: p.keywords?.[0]?.keyword ?? q }));
}

/** Best single match for a keyword (used to fill in ids for the default vocabulary). */
export async function bestArasaacId(keyword: string): Promise<number | null> {
  try {
    const res = await fetch(`${API}/pictograms/en/bestsearch/${encodeURIComponent(keyword)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { _id: number }[];
    return json[0]?._id ?? null;
  } catch {
    return null;
  }
}

/** Resolve missing ids a few at a time; returns only the newly found ones. */
export async function resolveMissing(keywords: string[], known: Record<string, number>): Promise<Record<string, number>> {
  const todo = Array.from(new Set(keywords.map((k) => k.toLowerCase()))).filter((k) => k && !known[k]);
  const found: Record<string, number> = {};
  for (let i = 0; i < todo.length; i += 6) {
    const batch = todo.slice(i, i + 6);
    const ids = await Promise.all(batch.map(bestArasaacId));
    batch.forEach((k, j) => { if (ids[j]) found[k] = ids[j] as number; });
  }
  return found;
}

/** Download every pictogram the board uses so it keeps working without internet. */
export async function prefetchForOffline(urls: string[]): Promise<boolean> {
  if (!urls.length) return true;
  try {
    return await Image.prefetch(urls, 'disk');
  } catch {
    return false;
  }
}
