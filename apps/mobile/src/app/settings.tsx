import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SupporterShell } from '@/components/SupporterShell';
import { Btn, Card, Row, Segmented, Toggle, Txt } from '@/components/ui';
import { installVoicePack, listVoices, speak, voicePackAvailable, voicePackLoaded } from '@/lib/speech';
import { useProfile } from '@/lib/store';
import { arasaacUrl, prefetchForOffline } from '@/lib/symbols';
import { FONTS } from '@/lib/theme';
import type { Settings } from '@/lib/types';

function Line({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const { palette } = useProfile();
  return (
    <Row style={{ borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10, flexWrap: 'wrap' }} gap={12}>
      <View style={{ flex: 1, minWidth: 180 }}>
        <Txt bold size={16}>{label}</Txt>
        {hint ? <Txt soft size={13}>{hint}</Txt> : null}
      </View>
      {children}
    </Row>
  );
}

export default function SettingsScreen() {
  const { profile, palette, state, updateSettings } = useProfile();
  const st = profile.settings;
  const set = <K extends keyof Settings>(k: K) => (v: Settings[K]) => updateSettings({ [k]: v } as Partial<Settings>);
  const [voices, setVoices] = useState<{ id: string; name: string }[]>([]);
  const [packMsg, setPackMsg] = useState('');
  const [offlineMsg, setOfflineMsg] = useState('');
  const [pin, setPin] = useState(st.pin ?? '');
  useEffect(() => { listVoices().then((v) => setVoices(v.map((x) => ({ id: x.identifier, name: `${x.name}${x.quality === 'Enhanced' ? ' (enhanced)' : ''}` })))); }, []);

  const downloadSymbols = async () => {
    setOfflineMsg('Downloading…');
    const urls = Object.values(profile.words).flatMap((w) => {
      if (w.symbol.kind === 'arasaac') return [arasaacUrl(w.symbol.id)];
      const id = w.lookup ? state.arasaacIds[w.lookup.toLowerCase()] : undefined;
      return id ? [arasaacUrl(id)] : [];
    });
    const ok = await prefetchForOffline(urls);
    setOfflineMsg(ok ? `${urls.length} symbols saved for offline use.` : 'Some symbols could not be downloaded. Try again with a connection.');
  };

  const resetProfile = () => {
    const go = () => { router.push('/setup'); };
    if (Platform.OS === 'web') go();
    else Alert.alert('Start a new board?', 'This sets up a new person. The current board stays available from Supporter home.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: go }]);
  };

  const input = { height: 46, width: 140, borderRadius: 12, borderWidth: 2, borderColor: palette.lineStrong, paddingHorizontal: 12, fontFamily: FONTS.body, fontSize: 18, color: palette.ink, backgroundColor: palette.surface } as const;
  return (
    <SupporterShell title="Settings" actions={<Txt soft size={15}>for {profile.name} · changes save straight away</Txt>}>
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingBottom: 30, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 340, gap: 14 }}>
          <Card>
            <Txt display size={18}>Voice and sound</Txt>
            <Line label="Voice" hint="Built into this device. Works offline and costs nothing.">
              <View style={{ maxWidth: 360, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <Btn label="Best available" selected={!st.voiceId} onPress={() => { updateSettings({ voiceId: undefined }); speak('Hello, this is my voice.', { ...st, voiceId: undefined }); }} />
                {voices.slice(0, 8).map((v) => (
                  <Btn key={v.id} label={v.name} selected={st.voiceId === v.id} onPress={() => { set('voiceId')(v.id); speak('Hello, this is my voice.', { ...st, voiceId: v.id }); }} />
                ))}
              </View>
            </Line>
            <Line label="Speed">
              <Segmented label="Speed" value={String(st.rate)} onChange={(v) => set('rate')(Number(v))} options={[{ value: '0.75', label: 'Slower' }, { value: '0.95', label: 'Normal' }, { value: '1.15', label: 'Faster' }]} />
            </Line>
            <Line label="When a picture is tapped" hint="Say the word, the whole message, or nothing until Speak">
              <Segmented label="When a picture is tapped" value={st.onTap} onChange={set('onTap')} options={[{ value: 'word', label: 'Word' }, { value: 'message', label: 'Message' }, { value: 'silent', label: 'Silent' }]} />
            </Line>
            {voicePackAvailable() ? (
              <Line label="HD voice pack" hint={packMsg || 'Natural-sounding recordings of common words, downloaded once (a few MB). Other sentences use the device voice.'}>
                <Toggle label="HD voice pack" value={st.hdVoice} onChange={async (v) => {
                  if (v && !voicePackLoaded()) {
                    setPackMsg('Downloading…');
                    const ok = await installVoicePack((d, t) => setPackMsg(`Downloading ${d} of ${t}…`));
                    setPackMsg(ok ? 'Installed.' : 'Download failed. Check the connection and try again.');
                    if (!ok) return;
                  }
                  set('hdVoice')(v);
                }} />
              </Line>
            ) : null}
          </Card>
          <Card>
            <Txt display size={18}>Display</Txt>
            <Line label="Words on buttons" hint="Or show only words, or only pictures">
              <Segmented label="Words on buttons" value={st.textPos} onChange={set('textPos')} options={[{ value: 'below', label: 'Below' }, { value: 'above', label: 'Above' }, { value: 'words', label: 'Words' }, { value: 'pictures', label: 'Pictures' }]} />
            </Line>
            <Line label="Text size"><Segmented label="Text size" value={st.textSize} onChange={set('textSize')} options={[{ value: 'M', label: 'M' }, { value: 'L', label: 'L' }, { value: 'XL', label: 'XL' }]} /></Line>
            <Line label="Colors"><Segmented label="Colors" value={st.theme} onChange={set('theme')} options={[{ value: 'light', label: 'Light' }, { value: 'dim', label: 'Low light' }, { value: 'contrast', label: 'High contrast' }]} /></Line>
            <Line label="Symbols" hint="ARASAAC needs a connection once per symbol, then works offline">
              <Segmented label="Symbols" value={st.symbolSet} onChange={set('symbolSet')} options={[{ value: 'arasaac', label: 'ARASAAC' }, { value: 'pictotalk', label: 'Built-in' }]} />
            </Line>
            {st.symbolSet === 'arasaac' ? (
              <Line label="Save symbols for offline use" hint={offlineMsg || 'Downloads every symbol on this board to the device.'}>
                <Btn icon="download" label="Download" onPress={downloadSymbols} />
              </Line>
            ) : null}
            <Line label="Show times on the schedule"><Toggle label="Show times on the schedule" value={st.showTimes} onChange={set('showTimes')} /></Line>
          </Card>
        </View>
        <View style={{ flex: 1, minWidth: 340, gap: 14 }}>
          <Card>
            <Txt display size={18}>Calm and sensory</Txt>
            <Line label="Reduce movement" hint="No sliding, bouncing, vibration or animated screens"><Toggle label="Reduce movement" value={st.reduceMotion} onChange={set('reduceMotion')} /></Line>
            <Line label="Show a gentle outline on press" hint="A clear sign the tap worked, without flashing"><Toggle label="Outline on press" value={st.highlight} onChange={set('highlight')} /></Line>
          </Card>
          <Card>
            <Txt display size={18}>Touch and access</Txt>
            <Line label="Choose a button by">
              <Segmented label="Choose a button by" value={st.selectMode} onChange={set('selectMode')} options={[{ value: 'tap', label: 'Tap' }, { value: 'release', label: 'Lift' }, { value: 'hold', label: 'Hold' }]} />
            </Line>
            {st.selectMode === 'hold' ? (
              <Line label="Hold for">
                <Segmented label="Hold for" value={String(st.holdMs)} onChange={(v) => set('holdMs')(Number(v))} options={[{ value: '400', label: '0.4 s' }, { value: '600', label: '0.6 s' }, { value: '1000', label: '1 s' }]} />
              </Line>
            ) : null}
            <Line label="Ignore repeat taps within">
              <Segmented label="Ignore repeat taps" value={String(st.debounceMs)} onChange={(v) => set('debounceMs')(Number(v))} options={[{ value: '0', label: 'Off' }, { value: '500', label: '0.5 s' }, { value: '1000', label: '1 s' }]} />
            </Line>
            <Line label="Extra space between buttons" hint="Fewer accidental taps on neighbors"><Toggle label="Extra space" value={st.extraGap} onChange={set('extraGap')} /></Line>
          </Card>
          <Card>
            <Txt display size={18}>Supporter lock</Txt>
            <Line label="To open the supporter area">
              <Segmented label="Lock type" value={st.lock} onChange={set('lock')} options={[{ value: 'sum', label: 'Hold + sum' }, { value: 'pin', label: 'PIN code' }]} />
            </Line>
            {st.lock === 'pin' ? (
              <Line label="PIN" hint="4 to 6 digits">
                <TextInput value={pin} onChangeText={(v) => { const d = v.replace(/\D/g, '').slice(0, 6); setPin(d); if (d.length >= 4) set('pin')(d); }} keyboardType="number-pad" secureTextEntry accessibilityLabel="PIN" style={input} />
              </Line>
            ) : null}
            <Line label={`Let ${profile.name} change these settings`} hint="Good for teens and adults. The lock becomes a settings button."><Toggle label="Self-manage" value={st.selfManage} onChange={set('selfManage')} /></Line>
          </Card>
          <Card>
            <Txt display size={18}>Privacy</Txt>
            <Txt size={15}>Boards, photos, recordings and settings are stored only on this device. PictoTalk has no accounts and sends nothing about what is said. Symbol searches go to ARASAAC.</Txt>
            <Btn label="Set up another person" onPress={resetProfile} />
          </Card>
        </View>
      </ScrollView>
    </SupporterShell>
  );
}
