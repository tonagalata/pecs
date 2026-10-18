import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolImage } from '@/components/Tile';
import { Btn, Row, Screen } from '@/components/ui';
import { useMessage } from '@/lib/message';
import { speak } from '@/lib/speech';
import { useProfile } from '@/lib/store';
import { FONTS } from '@/lib/theme';

const QUICK = ['I need a break. Please give me a few minutes.', 'Please wait. I am thinking.', "I don't understand. Can you show me?", 'It is too loud for me.', 'I need help, please.'];

export default function Show() {
  const { profile } = useProfile();
  const msg = useMessage();
  const [text, setText] = useState(msg.text || QUICK[0]);
  const [flip, setFlip] = useState(false);
  const [size, setSize] = useState(88);
  const fromBoard = msg.text && text === msg.text;
  const pics = fromBoard ? msg.items.map((i) => (i.wordId ? profile.words[i.wordId] : undefined)).filter(Boolean).slice(0, 6) : [];
  return (
    <Screen style={{ backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32, transform: [{ rotate: flip ? '180deg' : '0deg' }] }}>
        {pics.length ? <Row gap={16}>{pics.map((w, i) => <SymbolImage key={i} item={w!} size={120} />)}</Row> : null}
        <Text style={{ fontFamily: FONTS.display, fontSize: size, lineHeight: size * 1.12, color: '#0E1A19', textAlign: 'center', maxWidth: 1100 }}>{text}</Text>
      </View>
      <Row style={{ flexWrap: 'wrap', borderTopWidth: 2, borderTopColor: '#E3E9E7', paddingTop: 12 }} gap={8}>
        <Btn icon="x" label="Close" size="lg" onPress={() => router.back()} />
        {msg.text ? <Btn label="My message" size="lg" selected={text === msg.text} onPress={() => setText(msg.text)} /> : null}
        {QUICK.map((q) => <Btn key={q} label={q.split(/[.?]/)[0]} size="lg" selected={text === q} onPress={() => setText(q)} />)}
        <View style={{ flex: 1 }} />
        <Btn label="A−" size="lg" accessibilityLabel="Smaller text" onPress={() => setSize((v) => Math.max(48, v - 12))} />
        <Btn label="A+" size="lg" accessibilityLabel="Bigger text" onPress={() => setSize((v) => Math.min(140, v + 12))} />
        <Btn icon="refresh-cw" label="Flip" size="lg" onPress={() => setFlip((f) => !f)} />
        <Btn kind="primary" icon="volume-2" label="Speak" size="lg" onPress={() => speak(text, profile.settings)} />
      </Row>
    </Screen>
  );
}
