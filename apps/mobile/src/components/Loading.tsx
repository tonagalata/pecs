import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { PALETTES } from '@/lib/theme';

// Shown while the board, fonts and voices load. It uses no custom fonts or icon fonts (they may
// not be loaded yet) and matches the loader in public/index.html, so on web the page goes from
// that static loader to this one without a flash.
const P = PALETTES.light;

/** Web: if loading stalls (a dropped request, a stuck font), reload the page by itself. */
const STALL_MS = 5000;
const MAX_RELOADS = 3;
const RELOADS_KEY = 'pictotalk:reloads';

function reloadCount(): number {
  try { return Number(sessionStorage.getItem(RELOADS_KEY)) || 0; } catch { return MAX_RELOADS; }
}

/** Call once the app has loaded, so a later stall gets its full set of automatic reloads again. */
export function resetReloads() {
  if (Platform.OS !== 'web') return;
  try { sessionStorage.removeItem(RELOADS_KEY); } catch {}
}

function Mark() {
  const sq = { position: 'absolute' as const, width: 13, height: 13, borderRadius: 3, borderWidth: 3, borderColor: '#fff' };
  return (
    <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: P.accent }}>
      <View style={{ position: 'absolute', left: 14, top: 14, width: 44, height: 44 }}>
        <View style={[sq, { left: 5, top: 5 }]} />
        <View style={[sq, { left: 25, top: 5 }]} />
        <View style={[sq, { left: 5, top: 25 }]} />
        <View style={{ position: 'absolute', left: 25, top: 30, width: 14, height: 3, borderRadius: 2, backgroundColor: '#fff' }} />
      </View>
    </View>
  );
}

export function Loading() {
  const [reloading, setReloading] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const t = setTimeout(() => {
      const n = reloadCount();
      if (n >= MAX_RELOADS) { setGaveUp(true); return; }
      try { sessionStorage.setItem(RELOADS_KEY, String(n + 1)); } catch {}
      setReloading(true);
      window.location.reload();
    }, STALL_MS);
    return () => clearTimeout(t);
  }, []);

  const status = gaveUp ? 'Still loading. Check the internet connection.' : reloading ? 'Refreshing…' : 'Loading…';
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={status}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, backgroundColor: P.ground }}>
      <Mark />
      <Text style={{ fontSize: 26, fontWeight: '600', color: P.ink }}>PictoTalk</Text>
      <ActivityIndicator size="large" color={P.accent} />
      <Text style={{ fontSize: 17, color: P.inkSoft, textAlign: 'center' }}>{status}</Text>
    </View>
  );
}
