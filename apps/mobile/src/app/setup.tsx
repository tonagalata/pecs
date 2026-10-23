import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolImage } from '@/components/Tile';
import { Btn, Card, Row, Screen, Txt } from '@/components/ui';
import { listVoices, speak } from '@/lib/speech';
import { useLayout } from '@/lib/layout';
import { useApp } from '@/lib/store';
import { FONTS } from '@/lib/theme';
import type { Level, Settings } from '@/lib/types';
import { LEVEL_INFO } from '@/lib/vocab';

const ACCESS: { id: Settings['selectMode']; title: string; desc: string }[] = [
  { id: 'tap', title: 'Tap', desc: 'Selects as soon as the finger touches. The usual choice.' },
  { id: 'release', title: 'Tap and lift', desc: 'Selects when the finger lifts, so they can slide to the right picture first.' },
  { id: 'hold', title: 'Press and hold', desc: 'Selects after holding for a moment. Stops accidental taps.' },
];

function Choice({ on, onPress, children }: { on: boolean; onPress: () => void; children: React.ReactNode }) {
  const { palette } = useApp();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress}
      style={{ borderRadius: 18, borderWidth: on ? 3 : 2, borderColor: on ? palette.accent : palette.line, backgroundColor: on ? palette.accentSoft : palette.surface, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      {children}
    </Pressable>
  );
}

export default function Setup() {
  const { palette, addProfile, state } = useApp();
  const L = useLayout();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<Level>('young');
  const [access, setAccess] = useState<Settings['selectMode']>('tap');
  const [voices, setVoices] = useState<{ id: string; name: string }[]>([]);
  const [voice, setVoice] = useState<string | undefined>();
  const [rate, setRate] = useState(0.95);

  useEffect(() => {
    listVoices().then((v) => setVoices(v.slice(0, 6).map((x) => ({ id: x.identifier, name: x.name }))));
  }, []);

  const finish = () => {
    addProfile(name || 'Me', level, { selectMode: access, voiceId: voice, rate });
    router.replace('/board');
  };

  const shown = name.trim() || (level === 'adult' ? 'you' : 'them');
  return (
    <Screen style={{ padding: L.pad }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt display size={L.compact ? 18 : 22}>{L.compact ? 'Set up' : 'Set up PictoTalk'}</Txt>
        <Row gap={8}>
          {['Who', 'Pressing', 'Voice'].map((l, i) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: step === i + 1 ? palette.surface : 'transparent' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: step >= i + 1 ? palette.accent : palette.line, alignItems: 'center', justifyContent: 'center' }}>
                <Txt bold size={14} color={step >= i + 1 ? palette.onAccent : palette.inkSoft}>{i + 1}</Txt>
              </View>
              {!L.compact || step === i + 1 ? <Txt bold size={15}>{l}</Txt> : null}
            </View>
          ))}
        </Row>
        {state.profiles.length ? <Btn kind="plain" label="Cancel" onPress={() => router.back()} /> : <View style={{ width: 60 }} />}
      </Row>

      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 16 }} style={{ flex: 1 }}>
        {step === 1 ? (
          <>
            <Txt display size={L.compact ? 26 : 34} accessibilityRole="header">Who will be using PictoTalk?</Txt>
            <Txt soft size={18}>This sets a starting point. You can change everything later.</Txt>
            <View style={{ gap: 6, maxWidth: 520 }}>
              <Txt bold size={16}>Their first name (optional)</Txt>
              <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={palette.inkSoft} accessibilityLabel="First name"
                style={{ height: 56, borderRadius: 14, borderWidth: 2, borderColor: palette.lineStrong, paddingHorizontal: 16, fontSize: 20, fontFamily: FONTS.body, color: palette.ink, backgroundColor: palette.surface }} />
            </View>
            <View accessibilityRole="radiogroup" style={{ gap: 12 }}>
              {(Object.keys(LEVEL_INFO) as Level[]).map((l) => (
                <Choice key={l} on={level === l} onPress={() => setLevel(l)}>
                  <SymbolImage item={{ symbol: { kind: 'builtin', key: LEVEL_INFO[l].icon } }} size={56} />
                  <View style={{ flex: 1 }}>
                    <Txt display size={20}>{LEVEL_INFO[l].title}</Txt>
                    <Txt soft size={16}>{LEVEL_INFO[l].desc}</Txt>
                  </View>
                </Choice>
              ))}
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Txt display size={L.compact ? 26 : 34} accessibilityRole="header">How does {shown} press buttons?</Txt>
            <Txt soft size={18}>{"Pick what's easiest. If you're not sure, start with a normal tap."}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {ACCESS.map((a) => (
                <Pressable key={a.id} accessibilityRole="radio" accessibilityState={{ checked: access === a.id }} onPress={() => setAccess(a.id)}
                  style={{ flexGrow: 1, flexBasis: 260, minHeight: 180, padding: 20, borderRadius: 20, borderWidth: access === a.id ? 3 : 2, borderColor: access === a.id ? palette.accent : palette.line, backgroundColor: access === a.id ? palette.accentSoft : palette.surface, gap: 8 }}>
                  <Txt display size={22}>{a.title}</Txt>
                  <Txt soft size={17}>{a.desc}</Txt>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Txt display size={L.compact ? 26 : 34} accessibilityRole="header">Choose a voice</Txt>
            <Txt soft size={18}>Voices come from this device, so they work without internet. Tap one to hear it.</Txt>
            <View style={{ gap: 10, maxWidth: 640 }}>
              <Choice on={!voice} onPress={() => { setVoice(undefined); speak('Hello, I am ready to talk.', { rate, hdVoice: false }); }}>
                <Txt bold size={19} style={{ flex: 1 }}>Best available voice (recommended)</Txt>
              </Choice>
              {voices.map((v) => (
                <Choice key={v.id} on={voice === v.id} onPress={() => { setVoice(v.id); speak('Hello, I am ready to talk.', { voiceId: v.id, rate, hdVoice: false }); }}>
                  <Txt bold size={19} style={{ flex: 1 }}>{v.name}</Txt>
                </Choice>
              ))}
            </View>
            <Card style={{ maxWidth: 640 }}>
              <Txt bold size={18}>Speaking speed</Txt>
              <Row gap={8}>
                {[{ v: 0.75, l: 'Slower' }, { v: 0.95, l: 'Normal' }, { v: 1.15, l: 'Faster' }].map((o) => (
                  <Btn key={o.l} label={o.l} selected={rate === o.v} onPress={() => { setRate(o.v); speak('This is how I sound.', { voiceId: voice, rate: o.v, hdVoice: false }); }} style={{ flex: 1 }} />
                ))}
              </Row>
            </Card>
          </>
        ) : null}
      </ScrollView>

      <Row style={{ justifyContent: 'space-between' }}>
        <Btn label="Back" size="lg" onPress={() => setStep((s) => Math.max(1, s - 1))} style={{ opacity: step > 1 ? 1 : 0 }} disabled={step === 1} />
        {step < 3
          ? <Btn kind="primary" size="lg" label="Continue" onPress={() => setStep(step + 1)} style={{ paddingHorizontal: 36 }} />
          : <Btn kind="primary" size="lg" label={`Open ${name.trim() ? name.trim() + "'s" : 'the'} board`} onPress={finish} style={{ paddingHorizontal: 32 }} />}
      </Row>
    </Screen>
  );
}
