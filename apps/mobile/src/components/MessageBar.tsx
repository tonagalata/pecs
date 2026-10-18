import React from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useMessage } from '@/lib/message';
import { useApp } from '@/lib/store';
import { FONTS, GROUP_COLORS } from '@/lib/theme';
import { Btn, Txt } from './ui';
import { SymbolImage } from './Tile';

/** Message strip with Speak / delete last / clear. `mode="text"` shows a sentence instead of chips. */
export function MessageBar({ mode = 'chips', height: baseHeight = 120 }: { mode?: 'chips' | 'text'; height?: number }) {
  const { palette, profile } = useApp();
  const msg = useMessage();
  const { width } = useWindowDimensions();
  const narrow = width < 640;
  const height = narrow ? Math.min(baseHeight, 84) : baseHeight;
  const chipH = height - 26;
  const side = narrow ? 64 : 96;
  return (
    <View style={{ height, flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1, minWidth: 0, backgroundColor: palette.surface, borderColor: palette.lineStrong, borderWidth: 2, borderRadius: 20, paddingHorizontal: 10, justifyContent: 'center' }}>
        {msg.items.length === 0 ? (
          <Txt soft size={narrow ? 15 : mode === 'text' ? 22 : 19} numberOfLines={2} style={{ paddingHorizontal: 8 }}>
            {narrow ? 'Your message' : mode === 'text' ? 'Tap words or type to build a message' : 'Tap pictures to make a message'}
          </Txt>
        ) : mode === 'text' ? (
          <Text numberOfLines={2} adjustsFontSizeToFit style={{ fontFamily: FONTS.bodyBold, fontSize: narrow ? 20 : 30, color: palette.ink, paddingHorizontal: 10 }}>{msg.text}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 8 }}>
            {msg.items.map((it, i) => {
              const w = it.wordId ? profile?.words[it.wordId] : undefined;
              const g = GROUP_COLORS[w?.group ?? 'misc'];
              return (
                <Pressable
                  key={it.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${it.text}`}
                  onPress={() => msg.removeAt(i)}
                  style={{ height: chipH, minWidth: chipH * 0.9, paddingHorizontal: 8, borderRadius: 14, borderWidth: 2, borderColor: g.edge, backgroundColor: palette.tintedTiles ? g.fill : palette.surfaceAlt, alignItems: 'center', justifyContent: 'center', gap: 2 }}
                >
                  {w ? <SymbolImage item={w} size={chipH * 0.58} /> : null}
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 16, color: palette.ink }}>{it.text}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
      <Btn kind="primary" icon="volume-2" label="Speak" vertical onPress={msg.speakAll} style={{ width: narrow ? 84 : 150, height }} textStyle={{ fontSize: narrow ? 16 : 21 }} />
      <Btn icon="delete" label={narrow ? undefined : 'Back'} vertical onPress={msg.backspace} accessibilityLabel="Delete last word" style={{ width: side, height }} />
      <Btn icon="x" label={narrow ? undefined : 'Clear'} vertical onPress={msg.clear} accessibilityLabel="Clear message" style={{ width: side, height }} />
    </View>
  );
}
