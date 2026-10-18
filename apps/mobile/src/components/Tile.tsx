import React, { useRef, useState } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/lib/store';
import { resolveSymbol, type SymbolInput } from '@/lib/symbols';
import { FONTS, GROUP_COLORS, TEXT_SCALE, type Group } from '@/lib/theme';

export function SymbolImage({ item, size, style }: { item: SymbolInput; size: number; style?: StyleProp<ViewStyle> }) {
  const { settings, state, palette } = useApp();
  const resolved = resolveSymbol(item, settings.symbolSet, state.arasaacIds);
  const id = typeof resolved.source === 'object' && resolved.source && 'uri' in resolved.source ? String(resolved.source.uri) : String(resolved.source);
  const [failed, setFailed] = useState<string | null>(null);
  // Offline or not cached yet: show the bundled symbol instead of a blank tile.
  const source = failed === id && resolved.placeholder ? resolved.placeholder : resolved.source;
  const placeholder = failed === id ? null : resolved.placeholder;
  if (!source) return <View style={{ width: size, height: size }} />;
  const back = palette.symbolBack !== 'transparent';
  return (
    <View style={[{ width: size, height: size, borderRadius: back ? 10 : 0, backgroundColor: back ? palette.symbolBack : 'transparent', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image
        key={id}
        source={source}
        onError={() => setFailed(id)}
        placeholder={placeholder ?? undefined}
        placeholderContentFit="contain"
        contentFit={item.symbol.kind === 'photo' ? 'cover' : 'contain'}
        cachePolicy="disk"
        transition={0}
        style={{ width: back ? size - 6 : size, height: back ? size - 6 : size, borderRadius: item.symbol.kind === 'photo' ? 10 : 0 }}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const noop = () => {};

/** Applies the supporter's selection mode (tap / lift / hold) and ignores bouncing double taps. */
export function useSelect(onSelect: () => void) {
  const { settings } = useApp();
  const last = useRef(0);
  const fire = () => {
    const now = Date.now();
    if (now - last.current < settings.debounceMs) return;
    last.current = now;
    if (!settings.reduceMotion) Haptics.selectionAsync().catch(() => {});
    onSelect();
  };
  // react-native-web only tracks a press when onPress is present, so tap/hold also pass a no-op onPress.
  if (settings.selectMode === 'tap') return { onPressIn: fire, onPress: noop };
  if (settings.selectMode === 'hold') return { onLongPress: fire, delayLongPress: settings.holdMs, onPress: noop };
  return { onPress: fire };
}

export interface TileProps {
  label: string;
  group: Group;
  symbol: SymbolInput;
  onSelect: () => void;
  variant?: 'tinted' | 'bar';
  imageSize: number;
  fontSize?: number;
  hidden?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Tile({ label, group, symbol, onSelect, variant = 'tinted', imageSize, fontSize = 20, hidden, style, accessibilityLabel }: TileProps) {
  const { palette, settings } = useApp();
  const [flash, setFlash] = useState(false);
  const handlers = useSelect(() => {
    if (settings.highlight) {
      setFlash(true);
      setTimeout(() => setFlash(false), 280);
    }
    onSelect();
  });
  const g = GROUP_COLORS[group];
  const tinted = variant === 'tinted' && palette.tintedTiles;
  const fs = fontSize * TEXT_SCALE[settings.textSize];
  const hasPicture = symbol.symbol.kind !== 'none' || !!symbol.fallback;
  const showImg = settings.textPos !== 'words' && hasPicture;
  const showText = settings.textPos !== 'pictures';
  const text = showText ? (
    <Text numberOfLines={fs < 14 ? 1 : 2} adjustsFontSizeToFit ellipsizeMode="clip" style={{ fontFamily: FONTS.bodyBold, fontSize: showImg ? fs : fs * 1.25, color: palette.ink, textAlign: 'center', lineHeight: fs * 1.15 }}>{label}</Text>
  ) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      {...handlers}
      style={({ pressed }) => [
        {
          flex: 1, flexBasis: 0, minWidth: 0, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 4, gap: 4, overflow: 'hidden',
          backgroundColor: hidden ? 'transparent' : tinted ? g.fill : palette.surface,
          borderWidth: hidden ? 2 : tinted ? 3 : 1, borderStyle: hidden ? 'dashed' : 'solid',
          borderColor: hidden ? palette.lineStrong : tinted ? g.edge : palette.line,
          borderBottomWidth: hidden ? 2 : tinted ? 3 : 6, borderBottomColor: hidden ? palette.lineStrong : g.edge,
          transform: [{ scale: pressed && !settings.reduceMotion ? 0.96 : 1 }],
          opacity: hidden ? 0.5 : 1,
        },
        flash ? { borderColor: palette.focus, borderWidth: 4, borderBottomColor: palette.focus } : null,
        style,
      ]}
    >
      {settings.textPos === 'above' ? text : null}
      {showImg ? <SymbolImage item={symbol} size={imageSize} /> : null}
      {settings.textPos !== 'above' ? text : null}
    </Pressable>
  );
}

export function EmptyCell() {
  const { palette } = useApp();
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flex: 1, flexBasis: 0, minWidth: 0, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', borderColor: palette.line, opacity: 0.6 }} />;
}
