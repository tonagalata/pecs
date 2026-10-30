import React, { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/lib/store';
import { Btn, Icon, Txt } from './ui';

// Screens where an invitation would get in the way: first-time setup, joining, the lock, and the tour itself.
const QUIET = ['/setup', '/join', '/unlock', '/tutorial'];

/**
 * A one-time invitation to the tutorial, top right, on the first start. Never opens the tour by itself.
 * Dismissing it (or taking the tour) is remembered on this device; the tour stays in Settings.
 */
export function TutorialToast() {
  const { state, profile, palette, settings, mutate } = useApp();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const due = !!profile && !state.tutorialSeen && !QUIET.includes(path);
  // Wait a moment after the board appears so the invitation doesn't flash up with it.
  const [shown, setShown] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!due) return;
    const t = setTimeout(() => {
      setShown(true);
      if (settings.reduceMotion) anim.setValue(1);
      else Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
    }, 900);
    return () => clearTimeout(t);
  }, [due, anim, settings.reduceMotion]);

  if (!due || !shown) return null;
  const done = () => mutate((s) => ({ ...s, tutorialSeen: true }));
  const start = () => { done(); router.push('/tutorial'); };

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute', top: insets.top + 12, right: insets.right + 12, left: insets.left + 12, alignItems: 'flex-end',
        opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
      }}
      pointerEvents="box-none"
    >
      <View style={{
        width: 380, maxWidth: '100%', backgroundColor: palette.surface, borderRadius: 22, borderWidth: 1, borderColor: palette.line, padding: 16, gap: 12,
        shadowColor: '#0B1A18', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8,
      }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="compass" size={24} color={palette.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt display size={18} accessibilityRole="header">New to PictoTalk?</Txt>
            <Txt soft size={14}>A short guided tour for parents, teachers and therapists. About 3 minutes.</Txt>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={done} hitSlop={10}
            style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? palette.surfaceAlt : 'transparent' })}>
            <Icon name="x" size={20} color={palette.inkSoft} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn kind="primary" icon="play" label="Take the tour" onPress={start} style={{ flex: 1 }} />
          <Btn kind="plain" label="Not now" onPress={done} />
        </View>
        <Txt soft size={13}>You can open it any time from Settings.</Txt>
      </View>
    </Animated.View>
  );
}
