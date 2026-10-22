import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Card, Icon, Row, Screen, Txt } from '@/components/ui';
import { useApp } from '@/lib/store';
import { joinBoard, SyncError } from '@/lib/sync';
import { FONTS } from '@/lib/theme';

/** Joining a board someone shared: a therapist, teacher or family member enters their code. */
export default function Join() {
  const { palette, addSharedProfile, state } = useApp();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const shown = clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
  const input = { height: 56, borderRadius: 14, borderWidth: 2, borderColor: palette.lineStrong, paddingHorizontal: 16, fontFamily: FONTS.body, fontSize: 20, color: palette.ink, backgroundColor: palette.surface } as const;

  const join = async () => {
    setBusy(true); setError('');
    try {
      const { link, doc } = await joinBoard(clean, name.trim());
      addSharedProfile(doc, link);
      router.replace(link.role === 'view' ? '/board' : '/supporter');
    } catch (e) {
      setError(e instanceof SyncError && e.kind === 'offline' ? 'No connection. Joining needs the internet once; after that the board works offline.' : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Btn icon="chevron-left" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace(state.profiles.length ? '/supporter' : '/setup'))} />
      </Row>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 16 }}>
        <Card style={{ width: 560, maxWidth: '100%', gap: 14 }}>
          <Row gap={14}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="users" color={palette.accent} /></View>
            <View style={{ flex: 1 }}>
              <Txt display size={24} accessibilityRole="header">Join a shared board</Txt>
              <Txt soft size={16}>For therapists, teachers and family. Enter the code you were sent.</Txt>
            </View>
          </Row>
          <View style={{ gap: 6 }}>
            <Txt bold size={17}>Invite code</Txt>
            <TextInput value={shown} onChangeText={setCode} placeholder="K7PQ-4XM2" placeholderTextColor={palette.inkSoft} autoCapitalize="characters" autoCorrect={false}
              accessibilityLabel="Invite code" style={[input, { fontSize: 26, letterSpacing: 3, textAlign: 'center' }]} />
          </View>
          <View style={{ gap: 6 }}>
            <Txt bold size={17}>Your name</Txt>
            <Txt soft size={14}>So the family knows who you are, like “Ms. Rivera, speech therapist”.</Txt>
            <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={palette.inkSoft} accessibilityLabel="Your name" style={input} autoComplete="name" />
          </View>
          {error ? <Txt size={15} color={palette.danger}>{error}</Txt> : null}
          <Btn kind="primary" size="lg" label={busy ? 'Joining…' : 'Join board'} disabled={busy || clean.length !== 8 || !name.trim()} onPress={join} />
          <Txt soft size={14}>The board is copied to this device and keeps working offline. Changes are shared when you’re online.</Txt>
        </Card>
      </ScrollView>
    </Screen>
  );
}
