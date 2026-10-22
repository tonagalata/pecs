import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { PALETTES } from '@/lib/theme';

// Shown while the board, fonts and voices load. It uses no custom fonts or icon fonts (they may
// not be loaded yet) and matches the loader in public/index.html, so on web the page goes from
// that static loader to this one without a flash.
const P = PALETTES.light;

/** Web: after this long since the page opened, ask the person to refresh. */
const SLOW_MS = 5000;

/** When the page started opening; set by public/index.html, so the 5 s spans both loaders. */
function msSincePageOpened(): number {
  const w = window as Window & { __pictotalkStart?: number };
  return Date.now() - (w.__pictotalkStart ?? performance.timeOrigin);
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
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const t = setTimeout(() => setSlow(true), Math.max(0, SLOW_MS - msSincePageOpened()));
    return () => clearTimeout(t);
  }, []);

  return (
    <View accessibilityRole={slow ? undefined : 'progressbar'} accessibilityLabel={slow ? undefined : 'Loading'}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, backgroundColor: P.ground }}>
      <Mark />
      <Text style={{ fontSize: 26, fontWeight: '600', color: P.ink }}>PictoTalk</Text>
      {slow ? (
        <>
          <Text accessibilityLiveRegion="polite" style={{ fontSize: 17, color: P.inkSoft, textAlign: 'center' }}>This is taking longer than usual.</Text>
          <Pressable accessibilityRole="button" onPress={() => window.location.reload()}
            style={{ minWidth: 160, minHeight: 52, paddingHorizontal: 28, borderRadius: 999, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: P.onAccent }}>Refresh</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={P.accent} />
          <Text style={{ fontSize: 17, color: P.inkSoft }}>Loading…</Text>
        </>
      )}
    </View>
  );
}
