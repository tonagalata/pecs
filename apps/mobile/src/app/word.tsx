import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { SupporterShell } from '@/components/SupporterShell';
import { SymbolImage } from '@/components/Tile';
import { Btn, Card, Row, Segmented, Txt } from '@/components/ui';
import { BUILTIN } from '@/lib/builtin';
import { choosePhoto, deletePhoto } from '@/lib/photos';
import { deleteRecording, keepRecording } from '@/lib/recordings';
import { speak } from '@/lib/speech';
import { useProfile } from '@/lib/store';
import { searchArasaac } from '@/lib/symbols';
import { FONTS, GROUP_COLORS, GROUP_ORDER, type Group } from '@/lib/theme';
import type { SymbolRef } from '@/lib/types';
import { uid } from '@/lib/vocab';

type Hit = { key: string; label: string; symbol: SymbolRef };

function firstFreeCell(cells: Record<string, string>, cols: number, rows: number): string | null {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!cells[`${r}:${c}`]) return `${r}:${c}`;
  return null;
}

export default function WordScreen() {
  const params = useLocalSearchParams<{ id?: string; page?: string; cell?: string }>();
  const { profile, palette, updateProfile } = useProfile();
  const existing = params.id ? profile.words[params.id] : undefined;

  const [label, setLabel] = useState(existing?.label ?? '');
  const [say, setSay] = useState(existing?.say ?? '');
  const [group, setGroup] = useState<Group>(existing?.group ?? 'noun');
  const [symbol, setSymbol] = useState<SymbolRef>(existing?.symbol ?? { kind: 'none' });
  const [fallback] = useState(existing?.fallback);
  const [pageId, setPageId] = useState(params.page ?? profile.pages[0]?.id);
  const [recording, setRecording] = useState<string | undefined>(existing?.recording);
  const [tab, setTab] = useState<'symbols' | 'photo'>(existing?.symbol.kind === 'photo' ? 'photo' : 'symbols');
  const [query, setQuery] = useState(existing?.label ?? '');
  const [hits, setHits] = useState<Hit[]>([]);
  const [offline, setOffline] = useState(false);
  const [recState, setRecState] = useState<'idle' | 'recording'>('idle');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const builtinHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.keys(BUILTIN).filter((k) => !q || k.includes(q)).slice(0, 30).map((k) => ({ key: `b:${k}`, label: k, symbol: { kind: 'builtin', key: k } as SymbolRef }));
  }, [query]);

  // Debounced ARASAAC search; falls back to the bundled symbols when offline.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await searchArasaac(q, ctl.signal);
        setOffline(false);
        setHits(res.map((h) => ({ key: `a:${h.id}`, label: h.keyword, symbol: { kind: 'arasaac', id: h.id } })));
      } catch {
        if (!ctl.signal.aborted) setOffline(true);
      }
    }, 350);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [query]);

  const startRec = async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecState('recording');
  };
  const stopRec = async () => {
    await recorder.stop();
    setRecState('idle');
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (recorder.uri) setRecording(await keepRecording(recorder.uri));
  };

  const save = () => {
    const text = label.trim();
    if (!text) return;
    if (existing) {
      if (existing.symbol.kind === 'photo' && (symbol.kind !== 'photo' || symbol.uri !== existing.symbol.uri)) deletePhoto(existing.symbol.uri);
      if (existing.recording && existing.recording !== recording) deleteRecording(existing.recording);
      updateProfile((p) => ({ ...p, words: { ...p.words, [existing.id]: { ...existing, label: text, say: say.trim() || undefined, group, symbol, recording, lookup: text } } }));
    } else {
      const id = uid('w');
      updateProfile((p) => {
        const pg = p.pages.find((x) => x.id === pageId) ?? p.pages[0];
        const cell = params.cell && !pg.cells[params.cell] ? params.cell : firstFreeCell(pg.cells, pg.cols, pg.rows);
        const pages = cell ? p.pages.map((x) => (x.id === pg.id ? { ...x, cells: { ...x.cells, [cell]: id } } : x)) : p.pages;
        return { ...p, pages, words: { ...p.words, [id]: { id, label: text, say: say.trim() || undefined, group, symbol, recording, lookup: text } } };
      });
    }
    router.back();
  };

  const preview = { symbol, fallback, lookup: label };
  const liveHits = query.trim() ? hits : [];
  const list = offline || liveHits.length === 0 ? builtinHits : liveHits;
  const g = GROUP_COLORS[group];
  const input = { height: 50, borderRadius: 12, borderWidth: 2, borderColor: palette.lineStrong, paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: 18, color: palette.ink, backgroundColor: palette.surface } as const;

  return (
    <SupporterShell title={existing ? `Edit “${existing.label}”` : 'Add a word'} actions={
      <Row><Btn label="Cancel" onPress={() => router.back()} /><Btn kind="primary" label="Save word" disabled={!label.trim()} onPress={save} /></Row>
    }>
      <View style={{ flex: 1, flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
        <Card style={{ flex: 1, minWidth: 340 }}>
          <Segmented label="Picture source" value={tab} onChange={setTab} options={[{ value: 'symbols', label: 'Symbols' }, { value: 'photo', label: 'Photo' }]} />
          {tab === 'symbols' ? (
            <>
              <TextInput value={query} onChangeText={setQuery} placeholder="Search symbols, like juice or park" placeholderTextColor={palette.inkSoft} accessibilityLabel="Search symbols" style={input} />
              <Txt soft size={14}>{offline ? 'No connection. Showing the built-in symbols.' : liveHits.length ? `${liveHits.length} ARASAAC symbols` : 'Built-in symbols'}</Txt>
              <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {list.map((h) => {
                  const on = JSON.stringify(h.symbol) === JSON.stringify(symbol);
                  return (
                    <Pressable key={h.key} accessibilityRole="button" accessibilityLabel={h.label} accessibilityState={{ selected: on }}
                      onPress={() => { setSymbol(h.symbol); if (!label.trim()) setLabel(h.label); }}
                      style={{ width: 112, height: 120, borderRadius: 16, borderWidth: on ? 4 : 2, borderColor: on ? palette.accent : palette.line, backgroundColor: on ? palette.accentSoft : palette.surface, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <SymbolImage item={{ symbol: h.symbol }} size={66} />
                      <Txt bold size={13} numberOfLines={1}>{h.label}</Txt>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Txt soft size={12}>Symbols from ARASAAC (arasaac.org), CC BY-NC-SA.</Txt>
            </>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', borderColor: palette.lineStrong, padding: 20 }}>
              {symbol.kind === 'photo' ? <SymbolImage item={{ symbol }} size={180} /> : null}
              <Txt bold size={19}>Use a real photo</Txt>
              <Txt soft size={16} center>Photos of the real cup, the real teacher or the real park are often easier to recognize. Photos stay on this device.</Txt>
              <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                {Platform.OS !== 'web' ? <Btn kind="primary" icon="camera" label="Take a photo" size="lg" onPress={async () => { const u = await choosePhoto('camera'); if (u) setSymbol({ kind: 'photo', uri: u }); }} /> : null}
                <Btn icon="image" label="Choose from photos" size="lg" onPress={async () => { const u = await choosePhoto('library'); if (u) setSymbol({ kind: 'photo', uri: u }); }} />
              </Row>
            </View>
          )}
        </Card>

        <ScrollView style={{ width: 380, flexGrow: 0 }} contentContainerStyle={{ gap: 14 }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 130, height: 130, borderRadius: 20, borderWidth: 3, borderColor: g.edge, backgroundColor: g.fill, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <SymbolImage item={preview} size={76} />
              <Txt bold size={17} color="#17302E">{label || 'new word'}</Txt>
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Txt soft size={15}>{`How it will look on ${profile.name}'s board.`}</Txt>
              <Btn icon="volume-2" label="Hear it" disabled={!label.trim()} onPress={() => speak(say || label, profile.settings, { recording })} />
            </View>
          </Card>
          <Card>
            <Txt bold size={15}>Word on the button</Txt>
            <TextInput value={label} onChangeText={setLabel} accessibilityLabel="Word on the button" style={input} />
            <Txt bold size={15}>What it says out loud (optional)</Txt>
            <TextInput value={say} onChangeText={setSay} placeholder={label} placeholderTextColor={palette.inkSoft} accessibilityLabel="What it says out loud" style={input} />
            {!existing ? (
              <>
                <Txt bold size={15}>Put it in</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {profile.pages.map((p) => <Btn key={p.id} label={p.name} selected={p.id === pageId} onPress={() => setPageId(p.id)} />)}
                </View>
              </>
            ) : null}
            <Txt bold size={15}>Color group</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {GROUP_ORDER.map((gk) => (
                <Pressable key={gk} accessibilityRole="radio" accessibilityState={{ checked: group === gk }} onPress={() => setGroup(gk)}
                  style={{ width: '23%', minHeight: 42, borderRadius: 10, borderWidth: group === gk ? 3 : 2, borderColor: group === gk ? '#17302E' : GROUP_COLORS[gk].edge, backgroundColor: GROUP_COLORS[gk].fill, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt bold size={12} color="#17302E">{GROUP_COLORS[gk].label}</Txt>
                </Pressable>
              ))}
            </View>
          </Card>
          <Card>
            <Txt bold size={15}>Voice</Txt>
            <Row style={{ flexWrap: 'wrap' }}>
              {recState === 'recording'
                ? <Btn kind="danger" icon="square" label="Stop" onPress={stopRec} />
                : <Btn icon="mic" label={recording ? 'Record again' : 'Record'} onPress={startRec} />}
              {recording && recState === 'idle' ? <Btn icon="play" label="Play" onPress={() => speak(label, profile.settings, { recording })} /> : null}
              {recording && recState === 'idle' ? <Btn kind="plain" icon="trash-2" accessibilityLabel="Delete recording" onPress={() => setRecording(undefined)} /> : null}
            </Row>
            <Txt soft size={14}>{recState === 'recording' ? 'Recording… say the word clearly, then tap Stop.' : recording ? 'This recording plays instead of the app voice.' : "Uses the device voice until you record one."}</Txt>
          </Card>
          {existing ? (
            <Btn kind="danger" label="Delete this word everywhere" onPress={() => {
              updateProfile((p) => {
                const words = { ...p.words }; delete words[existing.id];
                const pages = p.pages.map((pg) => ({ ...pg, cells: Object.fromEntries(Object.entries(pg.cells).filter(([, v]) => v !== existing.id)) }));
                return { ...p, words, pages };
              });
              if (existing.symbol.kind === 'photo') deletePhoto(existing.symbol.uri);
              if (existing.recording) deleteRecording(existing.recording);
              router.back();
            }} />
          ) : null}
        </ScrollView>
      </View>
    </SupporterShell>
  );
}
