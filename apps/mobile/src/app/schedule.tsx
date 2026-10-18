import React from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolImage } from '@/components/Tile';
import { Btn, Icon, Row, Screen, Txt } from '@/components/ui';
import { useLayout } from '@/lib/layout';
import { speak } from '@/lib/speech';
import { useProfile } from '@/lib/store';
import type { ScheduleItem } from '@/lib/types';

const sym = (s: ScheduleItem) => ({ symbol: s.symbol, fallback: s.fallback, lookup: s.label.split(' ')[0] });

function Big({ item, label, strong }: { item: ScheduleItem; label: string; strong?: boolean }) {
  const { palette } = useProfile();
  const L = useLayout();
  const img = L.phone ? 96 : 180;
  return (
    <View style={{ flex: 1, backgroundColor: palette.surface, borderRadius: 26, borderWidth: strong ? 4 : 2, borderColor: strong ? palette.accent : palette.lineStrong, alignItems: 'center', justifyContent: 'center', gap: L.phone ? 6 : 12, padding: L.phone ? 10 : 16 }}>
      <Txt display size={L.phone ? 17 : 24} color={strong ? palette.accent : palette.inkSoft}>{label}</Txt>
      <SymbolImage item={sym(item)} size={img} />
      <Txt display size={L.phone ? 20 : 30} center>{item.label}</Txt>
    </View>
  );
}

export default function Schedule() {
  const { profile, palette, updateProfile } = useProfile();
  const L = useLayout();
  const items = profile.schedule;
  const idx = Math.min(profile.scheduleIndex, Math.max(0, items.length - 1));
  const now = items[idx];
  const next = items[Math.min(idx + 1, items.length - 1)];
  const setIdx = (i: number) => updateProfile((p) => ({ ...p, scheduleIndex: Math.max(0, Math.min(p.schedule.length - 1, i)) }));

  if (!now) {
    return (
      <Screen>
        <Row><Btn icon="chevron-left" label="Board" onPress={() => router.back()} /><Txt display size={26}>My day</Txt></Row>
        <Txt soft size={20}>No plan yet. A supporter can make one in the supporter area.</Txt>
      </Screen>
    );
  }


  return (
    <Screen style={{ padding: L.pad, gap: 10 }}>
      <Row>
        <Btn icon="chevron-left" label="Board" onPress={() => router.back()} />
        <Txt display size={L.compact ? 21 : 26} style={{ flex: 1 }}>My day</Txt>
      </Row>
      <View style={{ flex: 1, flexDirection: L.compact ? 'column' : 'row', gap: L.phone ? 10 : 16 }}>
        <View style={{ flex: L.compact ? undefined : 2, gap: L.phone ? 10 : 14 }}>
          {profile.scheduleNote ? (
            <View style={{ backgroundColor: '#FFF4DB', borderColor: '#D9A93E', borderWidth: 2, borderRadius: 18, padding: 14 }}>
              <Txt bold size={15} color="#7A5A12">Something is different today</Txt>
              <Txt bold size={19} color="#17302E">{profile.scheduleNote}</Txt>
            </View>
          ) : null}
          <View style={{ flex: L.compact ? undefined : 1, height: L.compact ? 220 : undefined, flexDirection: 'row', gap: L.phone ? 8 : 14, alignItems: 'stretch' }}>
            <Big item={now} label="FIRST" strong />
            <View style={{ justifyContent: 'center' }}><Icon name="arrow-right" size={L.phone ? 22 : 36} color={palette.inkSoft} /></View>
            <Big item={next} label="THEN" />
          </View>
          <Row>
            <Btn kind="primary" icon="check" label="I'm finished" size={L.phone ? 'lg' : 'xl'} style={{ flex: 1, backgroundColor: palette.success }}
              onPress={() => { speak(`${now.label}, finished. Next, ${next.label}.`, profile.settings); setIdx(idx + 1); }} />
            <Btn label={L.phone ? 'Back one' : 'Go back one'} size={L.phone ? 'lg' : 'xl'} onPress={() => setIdx(idx - 1)} />
          </Row>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: palette.surface, borderRadius: 22, borderWidth: 1, borderColor: palette.line }} contentContainerStyle={{ padding: 12, gap: 6 }}>
          {items.map((it, i) => {
            const done = i < idx, cur = i === idx;
            return (
              <Row key={it.id} gap={12} style={{ padding: 10, borderRadius: 14, opacity: done ? 0.55 : 1, borderWidth: cur ? 3 : 0, borderColor: palette.accent, backgroundColor: cur ? palette.accentSoft : 'transparent' }}>
                {profile.settings.showTimes && it.time ? <Txt bold soft size={15} style={{ width: 50 }}>{it.time}</Txt> : null}
                <SymbolImage item={sym(it)} size={42} />
                <Txt bold size={19} style={{ flex: 1, textDecorationLine: done ? 'line-through' : 'none' }}>{it.label}</Txt>
                {done ? <Icon name="check" color={palette.success} /> : null}
                {cur ? <Txt bold size={14} color={palette.onAccent} style={{ backgroundColor: palette.accent, paddingHorizontal: 10, borderRadius: 999, overflow: 'hidden' }}>Now</Txt> : null}
              </Row>
            );
          })}
        </ScrollView>
      </View>
    </Screen>
  );
}
