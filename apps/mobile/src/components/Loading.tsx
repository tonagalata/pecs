import React from 'react';
import { Text, View } from 'react-native';
import { PALETTES } from '@/lib/theme';

// Shown while the board, fonts and voices load. It uses no custom fonts or icon fonts (they may
// not be loaded yet) and matches the loader in public/index.html, so on web the page goes from
// that static loader to this one without a flash.
const P = PALETTES.light;

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

export function Loading({ status, progress }: { status: string; progress: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={status} accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, backgroundColor: P.ground }}>
      <Mark />
      <Text style={{ fontSize: 26, fontWeight: '600', color: P.ink }}>PictoTalk</Text>
      <View style={{ width: 220, height: 8, borderRadius: 4, backgroundColor: P.line, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(12, progress * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: P.accent }} />
      </View>
      <Text style={{ fontSize: 17, color: P.inkSoft }}>{status}</Text>
    </View>
  );
}
