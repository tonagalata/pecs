import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SupporterShell } from '@/components/SupporterShell';
import { SymbolImage } from '@/components/Tile';
import { Btn, Card, Icon, Row, Toggle, Txt } from '@/components/ui';
import { useProfile } from '@/lib/store';
import { FONTS } from '@/lib/theme';
import { LEVEL_INFO } from '@/lib/vocab';

export default function SupporterHome() {
  const { profile, state, palette, setActive, updateWord, updateProfile, updateSettings } = useProfile();
  const [phrase, setPhrase] = useState('');
  const hidden = Object.values(profile.words).filter((w) => w.hidden);
  const shown = Object.values(profile.words).length - hidden.length;
  const core = profile.pages[0];

  return (
    <SupporterShell title="Supporter home" actions={
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {state.profiles.map((p) => (
          <Btn key={p.id} label={p.name} selected={p.id === profile.id} onPress={() => setActive(p.id)} />
        ))}
        <Btn icon="user-plus" label="Add person" onPress={() => router.push('/setup')} />
        <Btn icon="log-in" label="Join with a code" onPress={() => router.push('/join')} />
      </Row>
    }>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Txt display size={28} color={palette.onAccent}>{profile.name.charAt(0).toUpperCase()}</Txt>
          </View>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Txt display size={23}>{profile.name}</Txt>
            <Txt soft size={16}>{LEVEL_INFO[profile.level].title} · {core?.cols} × {core?.rows} board · {shown} words showing{hidden.length ? `, ${hidden.length} hidden` : ''}</Txt>
            {profile.sync ? <Txt soft size={14}>Shared · you {profile.sync.role === 'owner' ? 'shared it' : profile.sync.role === 'edit' ? 'can edit' : 'can view'}</Txt> : null}
          </View>
          <Btn kind="primary" label="Edit board" onPress={() => router.push('/editor')} />
          <Btn label={`See it as ${profile.name}`} onPress={() => router.replace('/board')} />
        </Card>

        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          {[
            { icon: 'plus' as const, t: 'Add a word', d: 'Symbol, photo or voice', go: '/word' as const },
            { icon: 'calendar' as const, t: 'Plan the day', d: 'Picture schedule', go: '/plan' as const },
            { icon: 'sliders' as const, t: 'Access & sensory', d: 'Touch, sound, colors', go: '/settings' as const },
          ].map((a) => (
            <Pressable key={a.t} accessibilityRole="link" onPress={() => router.push(a.go)} style={{ flexGrow: 1, flexBasis: 200, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderRadius: 18, padding: 16, gap: 8 }}>
              <Icon name={a.icon} />
              <Txt bold size={18}>{a.t}</Txt>
              <Txt soft size={15}>{a.d}</Txt>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Card style={{ flex: 1, minWidth: 300 }}>
            <Txt display size={19}>Words waiting to be shown</Txt>
            <Txt soft size={15}>These words are on the board but hidden. Turn one on when you start teaching it. It appears in its own spot.</Txt>
            {hidden.length === 0 ? <Txt soft size={15}>No hidden words.</Txt> : hidden.map((w) => (
              <Row key={w.id} style={{ borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 8 }}>
                <SymbolImage item={w} size={40} />
                <Txt bold size={18} style={{ flex: 1 }}>{w.label}</Txt>
                <Toggle label={`Show ${w.label}`} value={false} onChange={() => updateWord(w.id, { hidden: false })} />
              </Row>
            ))}
          </Card>

          <View style={{ flex: 1, minWidth: 300, gap: 14 }}>
            <Card>
              <Txt display size={19}>Saved phrases</Txt>
              <Row>
                <TextInput value={phrase} onChangeText={setPhrase} placeholder="Add a phrase, like “I need a minute.”" placeholderTextColor={palette.inkSoft} accessibilityLabel="New phrase"
                  style={{ flex: 1, height: 48, borderRadius: 12, borderWidth: 2, borderColor: palette.lineStrong, paddingHorizontal: 12, fontFamily: FONTS.body, fontSize: 16, color: palette.ink, backgroundColor: palette.surface }} />
                <Btn icon="plus" accessibilityLabel="Add phrase" disabled={!phrase.trim()} onPress={() => { updateProfile((p) => ({ ...p, phrases: [phrase.trim(), ...p.phrases] })); setPhrase(''); }} />
              </Row>
              {profile.phrases.map((ph) => (
                <Row key={ph}>
                  <Txt size={16} style={{ flex: 1 }}>{ph}</Txt>
                  <Btn kind="plain" icon="trash-2" accessibilityLabel={`Delete ${ph}`} onPress={() => updateProfile((p) => ({ ...p, phrases: p.phrases.filter((x) => x !== ph) }))} />
                </Row>
              ))}
            </Card>
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt display size={19}>Message history</Txt>
                <Toggle label="Keep message history" value={profile.settings.keepHistory} onChange={(v) => updateSettings({ keepHistory: v })} />
              </Row>
              <Txt soft size={15}>{profile.settings.keepHistory
                ? 'Kept on this device only. Shows the last 50 spoken messages.'
                : 'Off. When on, the last 50 messages are kept on this device only, to help plan which words to teach next.'}</Txt>
              {profile.settings.keepHistory ? profile.history.slice(0, 8).map((h, i) => <Txt key={i} size={16}>• {h}</Txt>) : null}
              {profile.history.length ? <Btn kind="plain" label="Clear history" onPress={() => updateProfile((p) => ({ ...p, history: [] }))} /> : null}
            </Card>
            <View style={{ backgroundColor: palette.accentSoft, borderRadius: 20, padding: 16, gap: 6 }}>
              <Txt display size={17}>Tip: talk with the board</Txt>
              <Txt size={16}>Point to words on the board while you speak, like “I want more”. Seeing others use it is how most people learn. No need to ask them to copy you.</Txt>
            </View>
          </View>
        </View>
      </ScrollView>
    </SupporterShell>
  );
}
