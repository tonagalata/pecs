import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolImage } from '@/components/Tile';
import { Btn, Card, Row, Screen, Txt } from '@/components/ui';
import { useMessage } from '@/lib/message';
import { useLayout } from '@/lib/layout';
import { speak } from '@/lib/speech';
import { useProfile } from '@/lib/store';
import { BODY_PARTS, FEELINGS } from '@/lib/vocab';

const LEVELS = ['A little', 'Some', 'Quite a lot', 'A lot', 'The most ever'];
const BARS = ['#BFD7EA', '#9EC1DF', '#E9C27A', '#E3A04F', '#C9702E'];

function Step({ n, title }: { n: number; title: string }) {
  const { palette } = useProfile();
  return (
    <Row gap={10}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Txt bold size={15} color={palette.onAccent}>{n}</Txt>
      </View>
      <Txt bold size={19} accessibilityRole="header">{title}</Txt>
    </Row>
  );
}

export default function Feelings() {
  const { profile, palette } = useProfile();
  const msg = useMessage();
  const L = useLayout();
  const [feel, setFeel] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [part, setPart] = useState<string | null>(null);

  const bits: string[] = [];
  if (feel) bits.push(`I feel ${feel}.`);
  if (level) bits.push(`${LEVELS[level - 1]}.`);
  if (part) bits.push(part === 'ears' || part === 'teeth' ? `My ${part} hurt.` : `My ${part} hurts.`);
  const sentence = bits.join(' ');
  const f = FEELINGS.find((x) => x.label === feel);
  const sel = (on: boolean) => ({ borderWidth: on ? 4 : 2, borderColor: on ? palette.accent : palette.line, backgroundColor: on ? palette.accentSoft : palette.surface });

  return (
    <Screen style={{ padding: L.pad, gap: 10 }}>
      <Row>
        <Btn icon="chevron-left" label="Board" onPress={() => router.back()} />
        <Txt display size={L.compact ? 21 : 26} style={{ flex: 1 }}>How are you feeling?</Txt>
      </Row>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, flexDirection: L.compact ? 'column' : 'row', gap: L.phone ? 10 : 14 }}>
        <Card style={L.compact ? { minHeight: 330 } : { flex: 3 }}>
          <Step n={1} title="I feel…" />
          <View style={{ flex: 1, gap: 10 }}>
            {[0, 1, 2].map((r) => (
              <View key={r} style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                {FEELINGS.slice(r * 3, r * 3 + 3).map((x) => (
                  <Pressable key={x.id} accessibilityRole="button" accessibilityState={{ selected: feel === x.label }} onPress={() => setFeel(feel === x.label ? null : x.label)}
                    style={[{ flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 90 }, sel(feel === x.label)]}>
                    <SymbolImage item={{ symbol: x.arasaac ? { kind: 'arasaac', id: x.arasaac } : { kind: 'none' }, fallback: x.key }} size={L.compact ? 48 : 64} />
                    <Txt bold size={L.compact ? 15 : 18} numberOfLines={1}>{x.label}</Txt>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </Card>
        <Card style={L.compact ? { minHeight: 320 } : { flex: 1.3 }}>
          <Step n={2} title="How much?" />
          <View style={{ flex: 1, gap: 8, flexDirection: 'column-reverse' }}>
            {LEVELS.map((l, i) => (
              <Pressable key={l} accessibilityRole="button" accessibilityState={{ selected: level === i + 1 }} onPress={() => setLevel(level === i + 1 ? 0 : i + 1)}
                style={[{ flex: 1, minHeight: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 }, sel(level === i + 1)]}>
                <View style={{ width: 14 + i * 9, height: 18, borderRadius: 6, backgroundColor: BARS[i] }} />
                <Txt bold size={17}>{l}</Txt>
              </Pressable>
            ))}
          </View>
        </Card>
        <Card style={L.compact ? {} : { flex: 2 }}>
          <Step n={3} title="Does it hurt? Where?" />
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignContent: 'flex-start' }}>
            {BODY_PARTS.map((b) => (
              <Pressable key={b} accessibilityRole="button" accessibilityState={{ selected: part === b }} onPress={() => setPart(part === b ? null : b)}
                style={{ flexBasis: '46%', flexGrow: 1, minHeight: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: part === b ? palette.danger : palette.lineStrong, backgroundColor: part === b ? palette.danger : palette.surface }}>
                <Txt bold size={18} color={part === b ? '#FFFFFF' : palette.ink}>{b}</Txt>
              </Pressable>
            ))}
          </View>
        </Card>
      </ScrollView>
      <View style={{ flexDirection: L.compact ? 'column' : 'row', gap: 10 }}>
        <View style={{ flex: L.compact ? undefined : 1, minHeight: L.compact ? 64 : 100, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: 20, borderWidth: 2, borderColor: palette.lineStrong, backgroundColor: palette.surface }}>
          {f ? <SymbolImage item={{ symbol: f.arasaac ? { kind: 'arasaac', id: f.arasaac } : { kind: 'none' }, fallback: f.key }} size={L.compact ? 40 : 60} /> : null}
          <Txt bold size={L.compact ? 19 : 26} style={{ flex: 1 }}>{sentence || 'Choose a feeling to start.'}</Txt>
        </View>
        <Row gap={8}>
          <Btn kind="primary" icon="volume-2" label="Speak" disabled={!sentence} onPress={() => speak(sentence, profile.settings)} style={{ flex: L.compact ? 1 : undefined, width: L.compact ? undefined : 160, minHeight: L.compact ? 60 : 100 }} size="lg" />
          <Btn label={L.compact ? 'Add' : 'Add to message'} disabled={!sentence} onPress={() => { msg.addText(sentence); router.back(); }} style={{ minHeight: L.compact ? 60 : 100 }} />
          <Btn label={L.compact ? 'Reset' : 'Start again'} onPress={() => { setFeel(null); setLevel(0); setPart(null); }} style={{ minHeight: L.compact ? 60 : 100 }} />
        </Row>
      </View>
    </Screen>
  );
}
