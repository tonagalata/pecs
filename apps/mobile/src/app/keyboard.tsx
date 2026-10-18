import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Row, Screen, Txt } from '@/components/ui';
import { useMessage } from '@/lib/message';
import { speak } from '@/lib/speech';
import { useProfile } from '@/lib/store';
import { FONTS } from '@/lib/theme';

const DICT = ['a', 'about', 'again', 'all', 'am', 'and', 'are', 'break', 'can', 'could', 'do', 'done', "don't", 'feel', 'for', 'go', 'going', 'good', 'have', 'help', 'here', 'home', 'how', 'hurts', 'I', 'in', 'is', 'it', 'just', 'know', 'later', 'like', 'listen', 'me', 'minute', 'more', 'my', 'need', 'no', 'not', 'now', 'okay', 'please', 'quiet', 'really', 'slowly', 'some', 'space', 'sorry', 'stop', 'talk', 'tell', 'thank', 'that', 'the', 'there', 'think', 'tired', 'to', 'understand', 'wait', 'want', 'what', 'when', 'where', 'why', 'with', 'yes', 'you'];
const NEXT: Record<string, string[]> = { need: ['a', 'to', 'help', 'some', 'quiet'], i: ['need', 'want', 'feel', 'am', "don't"], a: ['break', 'minute', 'moment', 'drink', 'hug'], to: ['go', 'talk', 'rest', 'leave', 'eat'] };

function Key({ label, onPress, flex = 1, alt, a11y }: { label: string; onPress: () => void; flex?: number; alt?: boolean; a11y?: string }) {
  const { palette } = useProfile();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y ?? label} onPress={onPress}
      style={({ pressed }) => ({ flex, minWidth: 0, borderRadius: 14, borderWidth: 1, borderBottomWidth: 3, borderColor: palette.lineStrong, backgroundColor: pressed ? palette.accentSoft : alt ? palette.surfaceAlt : palette.surface, alignItems: 'center', justifyContent: 'center' })}>
      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: label.length > 1 ? 18 : 28, color: palette.ink }}>{label}</Text>
    </Pressable>
  );
}

export default function Keyboard() {
  const { profile, palette, updateSettings } = useProfile();
  const msg = useMessage();
  const [text, setTextState] = useState(msg.text ? msg.text + ' ' : '');
  const set = (t: string) => { setTextState(t); msg.setText(t.trim()); };
  const abc = profile.settings.keyboardLayout === 'abc';
  const rows = abc ? ['abcdefghij', 'klmnopqrs', 'tuvwxyz'] : ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  const parts = text.split(' ');
  const partial = parts[parts.length - 1].toLowerCase();
  const prev = (parts[parts.length - 2] ?? '').toLowerCase();
  let words = partial ? DICT.filter((w) => w.toLowerCase().startsWith(partial)).slice(0, 5) : (NEXT[prev] ?? ['I', 'please', 'you', 'the', 'can']);
  if (words.length < 5) words = [...words, ...['please', 'now', 'thank you', 'okay', 'yes']].slice(0, 5);
  const pick = (w: string) => { const base = parts.slice(0, -1).join(' '); set((base ? base + ' ' : '') + w + ' '); };


  return (
    <Screen>
      <Row>
        <Btn icon="chevron-left" label="Pictures" onPress={() => router.back()} />
        <Txt display size={22} style={{ flex: 1 }}>Type to speak</Txt>
        <Btn label={abc ? 'A to Z' : 'QWERTY'} onPress={() => updateSettings({ keyboardLayout: abc ? 'qwerty' : 'abc' })} accessibilityLabel="Change keyboard layout" />
      </Row>
      <Row style={{ height: 140, alignItems: 'stretch' }}>
        <View style={{ flex: 1, backgroundColor: palette.surface, borderWidth: 2, borderColor: palette.lineStrong, borderRadius: 20, padding: 18 }}>
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 34, color: text ? palette.ink : palette.inkSoft }}>{text || 'Start typing…'}</Text>
        </View>
        <View style={{ width: 160, gap: 10 }}>
          <Btn kind="primary" icon="volume-2" label="Speak" onPress={() => speak(text, profile.settings)} style={{ flex: 1 }} />
          <Row gap={10}>
            <Btn icon="maximize" accessibilityLabel="Show full screen" onPress={() => router.push('/show')} style={{ flex: 1 }} />
            <Btn icon="x" accessibilityLabel="Clear" onPress={() => set('')} style={{ flex: 1 }} />
          </Row>
        </View>
      </Row>
      <Row gap={8} style={{ height: 60 }}>
        {words.map((w) => <Btn key={w} kind="soft" label={w} onPress={() => pick(w)} style={{ flex: 1, height: 60 }} textStyle={{ fontSize: 21 }} />)}
      </Row>
      <View style={{ flex: 1, gap: 8 }}>
        {rows.map((r, i) => (
          <View key={r} style={{ flex: 1, flexDirection: 'row', gap: 8, paddingHorizontal: [0, 40, 120][i] }}>
            {r.split('').map((c) => <Key key={c} label={c} onPress={() => set(text + c)} />)}
          </View>
        ))}
        <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
          <Key label="." alt onPress={() => set(text.replace(/\s+$/, '') + '. ')} a11y="period" />
          <Key label="?" alt onPress={() => set(text.replace(/\s+$/, '') + '? ')} a11y="question mark" />
          <Key label="space" flex={5} onPress={() => set(text + ' ')} />
          <Key label="⌫" alt flex={1.5} onPress={() => set(text.slice(0, -1))} a11y="Delete letter" />
          <Key label="Delete word" alt flex={1.5} onPress={() => set(text.replace(/\s*\S+\s*$/, ' ').replace(/^\s+$/, ''))} />
        </View>
      </View>
    </Screen>
  );
}
