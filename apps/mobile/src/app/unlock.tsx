import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Icon, Row, Screen, Txt } from '@/components/ui';
import { useProfile } from '@/lib/store';

export default function Unlock() {
  const { profile, palette } = useProfile();
  const usePin = profile.settings.lock === 'pin' && !!profile.settings.pin;
  const [[a, b]] = useState(() => [3 + Math.floor(Math.random() * 7), 2 + Math.floor(Math.random() * 8)]);
  const answer = usePin ? profile.settings.pin! : String(a + b);
  const [v, setV] = useState('');
  const [wrong, setWrong] = useState(false);
  const press = (d: string) => { setWrong(false); setV((x) => (x + d).slice(0, usePin ? 6 : 3)); };
  const check = () => { if (v === answer) router.replace('/supporter'); else { setWrong(true); setV(''); } };
  return (
    <Screen style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,33,31,0.75)' }}>
      <View accessibilityViewIsModal style={{ width: 440, maxWidth: '100%', backgroundColor: palette.surface, borderRadius: 28, padding: 26, gap: 14 }}>
        <Row gap={14}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="lock" color={palette.accent} /></View>
          <View><Txt display size={23} accessibilityRole="header">Supporter area</Txt><Txt soft size={15}>For parents, teachers and therapists</Txt></View>
        </Row>
        <Txt bold size={19}>{usePin ? 'Enter your PIN' : `What is ${a} + ${b}?`}</Txt>
        <View accessibilityLiveRegion="polite" style={{ height: 62, borderRadius: 16, borderWidth: wrong ? 3 : 2, borderColor: wrong ? palette.danger : palette.lineStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ground }}>
          <Txt display size={30}>{usePin ? '•'.repeat(v.length) : v || ' '}</Txt>
        </View>
        {wrong ? <Txt bold size={15} color={palette.danger}>{"That's not it. Try again."}</Txt> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
            <Btn key={k} label={k} size="lg" style={{ width: '31%', flexGrow: 1 }} accessibilityLabel={k === 'C' ? 'Clear' : k === '⌫' ? 'Delete' : k}
              onPress={() => (k === 'C' ? setV('') : k === '⌫' ? setV((x) => x.slice(0, -1)) : press(k))} />
          ))}
        </View>
        <Row>
          <Btn label="Back to board" size="lg" style={{ flex: 1 }} onPress={() => router.back()} />
          <Btn kind="primary" label="Continue" size="lg" style={{ flex: 1 }} onPress={check} disabled={!v} />
        </Row>
      </View>
    </Screen>
  );
}
