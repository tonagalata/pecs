import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useApp } from '@/lib/store';
import { Icon, Txt, type IconName } from './ui';

/**
 * Press-and-hold control with visible progress. Used for the supporter lock so a child can't
 * open settings with a tap, while adults get clear feedback that holding is working.
 * Selection, the iOS callout and the context menu are suppressed globally on web (webSetup.web.ts).
 */
export function HoldButton({ ms = 2000, icon, label, holdingLabel = 'Keep holding…', onDone, onTap, style, accessibilityLabel }: {
  ms?: number; icon: IconName; label: string; holdingLabel?: string; onDone: () => void; onTap?: () => void;
  style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const { palette } = useApp();
  const [p, setP] = useState(0);
  const start = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fired = useRef(false);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    start.current = null;
    setP(0);
  };
  useEffect(() => stop, []);

  const begin = () => {
    fired.current = false;
    start.current = Date.now();
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      if (start.current == null) return;
      const v = Math.min(1, (Date.now() - start.current) / ms);
      setP(v);
      if (v >= 1 && !fired.current) {
        fired.current = true;
        stop();
        onDone();
      }
    }, 40);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={`Press and hold for ${Math.round(ms / 1000)} seconds`}
      // Screen readers activate with a double tap; let that open it directly.
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => onDone()}
      onPressIn={begin}
      onPressOut={() => { const short = !fired.current && p < 0.25; stop(); if (short) onTap?.(); }}
      onPress={() => {}}
      hitSlop={6}
      style={[{ alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6 }, style]}
    >
      <Icon name={icon} size={24} color={p > 0 ? palette.accent : palette.inkSoft} />
      <Txt size={12} bold center color={p > 0 ? palette.accent : palette.inkSoft} numberOfLines={2}>{p > 0 ? holdingLabel : label}</Txt>
      <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: p > 0 ? palette.line : 'transparent', overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(p * 100)}%`, height: 5, backgroundColor: palette.accent }} />
      </View>
    </Pressable>
  );
}
