import React from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/lib/store';
import { SyncBadge } from './SyncBadge';
import { Btn, Icon, Txt, type IconName } from './ui';

const NAV: { href: Href; label: string; icon: IconName; match: string }[] = [
  { href: '/supporter', label: 'Home', icon: 'home', match: '/supporter' },
  { href: '/editor', label: 'Boards', icon: 'grid', match: '/editor' },
  { href: '/word', label: 'Add a word', icon: 'plus-square', match: '/word' },
  { href: '/plan', label: 'Schedules', icon: 'calendar', match: '/plan' },
  { href: '/share', label: 'Sharing', icon: 'users', match: '/share' },
  { href: '/settings', label: 'Settings', icon: 'sliders', match: '/settings' },
];

/** Sidebar on tablets, a top strip on phones. */
export function SupporterShell({ children, title, actions }: { children: React.ReactNode; title: string; actions?: React.ReactNode }) {
  const { palette, profile } = useApp();
  const path = usePathname();
  const { width } = useWindowDimensions();
  const side = width >= 820;
  const nav = NAV.map((n) => {
    const on = path === n.match;
    return (
      <Pressable key={n.label} accessibilityRole="link" accessibilityState={{ selected: on }} onPress={() => router.replace(n.href)}
        style={{ minHeight: 50, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: on ? palette.accentSoft : 'transparent' }}>
        <Icon name={n.icon} size={21} />
        <Txt bold size={17}>{n.label}</Txt>
      </Pressable>
    );
  });
  const back = <Btn kind="primary" icon="chevron-left" label={`Back to ${profile?.name ?? 'the'}${profile ? "'s" : ''} board`} onPress={() => router.replace('/board')} />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.ground, flexDirection: side ? 'row' : 'column' }}>
      {side ? (
        <View style={{ width: 250, backgroundColor: palette.surface, borderRightWidth: 1, borderRightColor: palette.line, padding: 14, gap: 4 }}>
          <Txt display size={19} style={{ paddingHorizontal: 8, paddingVertical: 12 }}>PictoTalk</Txt>
          {nav}
          <View style={{ flex: 1 }} />
          {back}
        </View>
      ) : (
        <View style={{ backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.line, paddingVertical: 6, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Btn kind="primary" icon="chevron-left" accessibilityLabel="Back to the board" onPress={() => router.replace('/board')} style={{ minWidth: 48 }} />
          <ScrollView horizontal contentContainerStyle={{ gap: 4 }} showsHorizontalScrollIndicator={false}>{nav}</ScrollView>
        </View>
      )}
      <View style={{ flex: 1, padding: side ? 20 : 12, gap: side ? 14 : 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Txt display size={side ? 28 : 22} style={{ flex: 1, minWidth: 160 }} accessibilityRole="header">{title}</Txt>
          {profile ? <SyncBadge /> : null}
          {actions}
        </View>
        {profile?.sync?.role === 'view' && profile.sync.status !== 'removed' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.accentSoft, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 }}>
            <Icon name="eye" size={20} />
            <Txt size={15} style={{ flex: 1 }}>View only. This board is shared with you to look at; changes to words and pages aren’t saved.</Txt>
          </View>
        ) : null}
        {children}
      </View>
    </SafeAreaView>
  );
}
