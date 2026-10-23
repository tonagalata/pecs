import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolImage } from '@/components/Tile';
import { Btn, Row, Screen } from '@/components/ui';
import { useLayout } from '@/lib/layout';
import { useMessage } from '@/lib/message';
import { speak } from '@/lib/speech';
import { useProfile } from '@/lib/store';
import { FONTS } from '@/lib/theme';

const QUICK = ['I need a break. Please give me a few minutes.', 'Please wait. I am thinking.', "I don't understand. Can you show me?", 'It is too loud for me.', 'I need help, please.'];

/** Full-screen message to show someone, plus the person's saved phrases (one tap to show and speak). */
export default function Show() {
  const { profile } = useProfile();
  const msg = useMessage();
  const L = useLayout();
  const phrases = Array.from(new Set([...(msg.text ? [msg.text] : []), ...profile.phrases, ...QUICK]));
  const [text, setText] = useState(phrases[0]);
  const [flip, setFlip] = useState(false);
  const [size, setSize] = useState(L.phone ? 44 : 88);
  const fromBoard = msg.text && text === msg.text;
  const pics = fromBoard ? msg.items.map((i) => (i.wordId ? profile.words[i.wordId] : undefined)).filter(Boolean).slice(0, 6) : [];
  const pick = (p: string) => { setText(p); speak(p, profile.settings); };

  return (
    <Screen style={{ backgroundColor: '#FFFFFF', padding: L.pad, gap: 10 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: L.phone ? 16 : 32, transform: [{ rotate: flip ? '180deg' : '0deg' }] }}>
        {pics.length ? <Row gap={L.phone ? 8 : 16} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>{pics.map((w, i) => <SymbolImage key={i} item={w!} size={L.phone ? 64 : 120} />)}</Row> : null}
        <Text style={{ fontFamily: FONTS.display, fontSize: size, lineHeight: size * 1.15, color: '#0E1A19', textAlign: 'center', maxWidth: 1100 }}>{text}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
        {phrases.map((p) => <Btn key={p} label={p.length > 34 ? p.slice(0, 32) + '…' : p} selected={text === p} onPress={() => pick(p)} />)}
      </ScrollView>
      <Row gap={L.compact ? 6 : 8} style={{ borderTopWidth: 2, borderTopColor: '#E3E9E7', paddingTop: 10 }}>
        <Btn icon="x" label={L.compact ? undefined : 'Close'} accessibilityLabel="Close" size={L.compact ? 'md' : 'lg'} onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        <Btn label="A−" size={L.compact ? 'md' : 'lg'} accessibilityLabel="Smaller text" onPress={() => setSize((v) => Math.max(28, v - 10))} />
        <Btn label="A+" size={L.compact ? 'md' : 'lg'} accessibilityLabel="Bigger text" onPress={() => setSize((v) => Math.min(140, v + 10))} />
        <Btn icon="refresh-cw" label={L.compact ? undefined : 'Flip'} accessibilityLabel="Flip for the person opposite" size={L.compact ? 'md' : 'lg'} onPress={() => setFlip((f) => !f)} />
        <Btn kind="primary" icon="volume-2" label="Speak" size="lg" onPress={() => speak(text, profile.settings)} />
      </Row>
    </Screen>
  );
}
