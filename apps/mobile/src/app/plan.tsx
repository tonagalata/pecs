import React, { useState } from 'react';
import { ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SupporterShell } from '@/components/SupporterShell';
import { SymbolImage } from '@/components/Tile';
import { Btn, Card, Row, Txt } from '@/components/ui';
import { BUILTIN } from '@/lib/builtin';
import { useProfile } from '@/lib/store';
import { FONTS } from '@/lib/theme';
import type { ScheduleItem } from '@/lib/types';
import { uid } from '@/lib/vocab';

export default function Plan() {
  const { profile, palette, updateProfile } = useProfile();
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('');
  const items = profile.schedule;
  const set = (fn: (s: ScheduleItem[]) => ScheduleItem[]) => updateProfile((p) => ({ ...p, schedule: fn(p.schedule) }));
  const move = (i: number, d: number) => set((s) => { const n = [...s]; const j = i + d; if (j < 0 || j >= n.length) return s; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const input = { height: 48, borderRadius: 12, borderWidth: 2, borderColor: palette.lineStrong, paddingHorizontal: 12, fontFamily: FONTS.body, fontSize: 17, color: palette.ink, backgroundColor: palette.surface } as const;

  const add = () => {
    const t = label.trim();
    if (!t) return;
    const key = Object.keys(BUILTIN).find((k) => t.toLowerCase().includes(k));
    set((s) => [...s, { id: uid('s'), label: t, time: time.trim() || undefined, symbol: { kind: 'none' }, fallback: key }]);
    setLabel(''); setTime('');
  };

  return (
    <SupporterShell title={`${profile.name}'s day`} actions={<Btn kind="primary" label="See the schedule" onPress={() => router.push('/schedule')} />}>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
        <Card>
          <Txt display size={19}>Something different today?</Txt>
          <Txt soft size={15}>A heads-up shown at the top of the schedule, like “No swimming today. We will go to the park instead.” Leave empty to hide it.</Txt>
          <TextInput value={profile.scheduleNote ?? ''} onChangeText={(v) => updateProfile((p) => ({ ...p, scheduleNote: v || undefined }))} accessibilityLabel="Change for today" style={input} />
        </Card>
        <Card>
          <Txt display size={19}>Steps</Txt>
          {items.map((it, i) => (
            <Row key={it.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: palette.line, paddingTop: i ? 8 : 0 }}>
              <SymbolImage item={{ symbol: it.symbol, fallback: it.fallback, lookup: it.label.split(' ')[0] }} size={44} />
              <TextInput value={it.time ?? ''} onChangeText={(v) => set((s) => s.map((x) => (x.id === it.id ? { ...x, time: v } : x)))} placeholder="time" placeholderTextColor={palette.inkSoft} accessibilityLabel={`Time for ${it.label}`} style={[input, { width: 72 }]} />
              <TextInput value={it.label} onChangeText={(v) => set((s) => s.map((x) => (x.id === it.id ? { ...x, label: v } : x)))} accessibilityLabel="Step name" style={[input, { flex: 1 }]} />
              <Btn icon="arrow-up" accessibilityLabel="Move up" onPress={() => move(i, -1)} />
              <Btn icon="arrow-down" accessibilityLabel="Move down" onPress={() => move(i, 1)} />
              <Btn kind="plain" icon="trash-2" accessibilityLabel={`Delete ${it.label}`} onPress={() => set((s) => s.filter((x) => x.id !== it.id))} />
            </Row>
          ))}
          <Row style={{ borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10 }}>
            <TextInput value={time} onChangeText={setTime} placeholder="time" placeholderTextColor={palette.inkSoft} accessibilityLabel="New step time" style={[input, { width: 90 }]} />
            <TextInput value={label} onChangeText={setLabel} onSubmitEditing={add} placeholder="Add a step, like Lunch" placeholderTextColor={palette.inkSoft} accessibilityLabel="New step" style={[input, { flex: 1 }]} />
            <Btn kind="primary" icon="plus" label="Add" onPress={add} disabled={!label.trim()} />
          </Row>
          <Row>
            <Btn label="Start the day again" onPress={() => updateProfile((p) => ({ ...p, scheduleIndex: 0 }))} />
          </Row>
        </Card>
      </ScrollView>
    </SupporterShell>
  );
}
