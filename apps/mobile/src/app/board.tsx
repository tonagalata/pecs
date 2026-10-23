import React, { useState } from 'react';
import { Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { router, type Href } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { HoldButton } from '@/components/HoldButton';
import { MessageBar } from '@/components/MessageBar';
import { BoardSyncBadge } from '@/components/SyncBadge';
import { EmptyCell, SymbolImage, Tile } from '@/components/Tile';
import { Btn, Icon, Row, Screen, Txt, type IconName } from '@/components/ui';
import { cellKey, sheetCount } from '@/lib/grid';
import { useLayout } from '@/lib/layout';
import { useMessage } from '@/lib/message';
import { speak } from '@/lib/speech';
import { useProfile } from '@/lib/store';
import type { Page } from '@/lib/types';

const PREDICT: Record<string, string[]> = {
  '': ['I', 'Can you', 'Please', 'I need', 'Yes', 'No'],
  i: ['want', 'need', 'feel', 'think', "don't", 'like'],
  want: ['to', 'a break', 'help', 'more', 'quiet', 'water'],
  need: ['a break', 'help', 'quiet', 'to go', 'time', 'water'],
  feel: ['tired', 'okay', 'sick', 'overwhelmed', 'anxious', 'good'],
  "don't": ['want', 'know', 'like', 'feel', 'understand', 'need'],
};

const LINKS: { label: string; href: Href; symbol?: string; icon?: IconName }[] = [
  { label: 'Feelings', href: '/feelings', symbol: 'happy' },
  { label: 'My day', href: '/schedule', symbol: 'bus' },
  { label: 'ABC', href: '/keyboard', icon: 'type' },
  { label: 'Show', href: '/show', icon: 'maximize' },
];

/**
 * The word grid. On a phone held upright the grid is shown rotated (rows become columns), so a
 * 6 × 4 board becomes 4 × 6 with tiles big enough to press. Every word keeps the same neighbors,
 * and the arrangement is always the same on that phone, so motor plans still hold.
 */
function Grid({ page, sheet, adult, transpose }: { page: Page; sheet: number; adult: boolean; transpose: boolean }) {
  const { profile, settings } = useProfile();
  const msg = useMessage();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const cols = transpose ? page.rows : page.cols;
  const rowsN = transpose ? page.cols : page.rows;
  const gap = settings.extraGap ? 14 : box.w < 500 ? 6 : adult ? 8 : 10;
  const cellW = box.w ? (box.w - gap * (cols - 1)) / cols : 0;
  const cellH = box.h ? (box.h - gap * (rowsN - 1)) / rowsN : 0;
  const img = Math.max(18, Math.min(cellW * 0.62, cellH * (adult ? 0.45 : 0.52)));
  const font = Math.max(11, Math.min(adult ? 19 : 22, cellW / 5));
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const rows = [];
  for (let r = 0; r < rowsN; r++) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      const key = transpose ? cellKey(sheet, c, r) : cellKey(sheet, r, c);
      const id = page.cells[key];
      const w = id ? profile.words[id] : undefined;
      cells.push(
        w && !w.hidden ? (
          <Tile key={`${page.id}:${w.id}`} label={w.label} group={w.group} symbol={w} imageSize={img} fontSize={font} cellWidth={cellW} cellHeight={cellH} variant={adult ? 'bar' : 'tinted'}
            style={{ borderRadius: cellW < 80 ? 12 : 18 }}
            onSelect={() => msg.add({ text: w.say ?? w.label, wordId: w.id })} />
        ) : <EmptyCell key={`${page.id}:e${key}`} />,
      );
    }
    rows.push(<View key={r} style={{ flex: 1, flexDirection: 'row', gap }}>{cells}</View>);
  }
  return <View style={{ flex: 1, gap }} onLayout={onLayout}>{box.w ? rows : null}</View>;
}

/** Big previous / next arrows beside the grid when a section has more words than fit. */
function PageArrow({ dir, sheet, count, section, compact, onPress }: { dir: -1 | 1; sheet: number; count: number; section: string; compact: boolean; onPress: () => void }) {
  const { palette, settings } = useProfile();
  const disabled = dir < 0 ? sheet === 0 : sheet >= count - 1;
  const target = sheet + dir + 1;
  // Black on the light theme; on dark themes black would vanish, so use the text color.
  const ink = settings.theme === 'light' ? '#000000' : palette.ink;
  return (
    <Pressable accessibilityRole="button" disabled={disabled}
      accessibilityLabel={dir < 0 ? `Previous page of ${section}, page ${target} of ${count}` : `Next page of ${section}, page ${target} of ${count}`}
      accessibilityState={{ disabled }} onPress={onPress}
      style={({ pressed }) => ({
        width: compact ? 56 : 96, borderRadius: compact ? 14 : 20, alignItems: 'center', justifyContent: 'center',
        backgroundColor: pressed ? palette.accentSoft : 'transparent', opacity: disabled ? 0.12 : 1,
      })}>
      <MaterialCommunityIcons name={dir < 0 ? 'arrow-left-bold' : 'arrow-right-bold'} size={compact ? 56 : 96} color={ink} />
    </Pressable>
  );
}

function Lock({ compact }: { compact: boolean }) {
  const { profile } = useProfile();
  if (profile.settings.selfManage) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/supporter')}
        style={{ width: compact ? 56 : 84, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Icon name="settings" size={24} />
        {!compact ? <Txt size={12} bold>Settings</Txt> : null}
      </Pressable>
    );
  }
  return (
    <HoldButton icon="lock" label={compact ? 'Hold' : 'Hold to unlock'} holdingLabel={compact ? 'Hold…' : 'Keep holding…'}
      accessibilityLabel="Supporter area" onDone={() => router.push('/unlock')} style={{ width: compact ? 60 : 88 }} />
  );
}

export default function Board() {
  const { profile, palette, updateProfile } = useProfile();
  const msg = useMessage();
  const L = useLayout();
  const adult = profile.level === 'adult';
  const [pageId, setPageId] = useState(profile.pages[0]?.id);
  const page = profile.pages.find((p) => p.id === pageId) ?? profile.pages[0];
  // Sections with more words than spaces are split into pages, turned with the big arrows.
  const sheets = page ? sheetCount(page, (id) => !!profile.words[id] && !profile.words[id].hidden) : 1;
  const [sheetState, setSheet] = useState(0);
  const sheet = Math.min(sheetState, sheets - 1);
  // Held upright (phone or iPad), wide grids are shown rotated so tiles stay close to square.
  const transpose = L.portrait && !!page && page.cols > page.rows;
  const compact = L.phone;
  const flat = L.phone && !L.portrait;
  const showPhrases = adult && L.wide;

  const last = (msg.items[msg.items.length - 1]?.text ?? '').toLowerCase().split(' ').pop() ?? '';
  const suggestions = PREDICT[last] ?? ['please', 'now', 'later', 'thank you', 'because', 'and'];

  const savePhrase = () => {
    const t = msg.text.trim();
    if (!t) return;
    const phrase = t.charAt(0).toUpperCase() + t.slice(1) + (/[.?!]$/.test(t) ? '' : '.');
    updateProfile((p) => ({ ...p, phrases: [phrase, ...p.phrases.filter((x) => x !== phrase)] }));
  };

  // Bottom bar: word groups and tools. Scrolls sideways on phones; the lock stays pinned.
  const barH = flat ? 46 : compact ? 62 : adult ? 64 : 96;
  const symbolSize = flat ? 0 : compact ? 28 : 44;
  const chip = (on: boolean) => ({
    flexGrow: compact ? 0 : 1, minWidth: compact ? 72 : L.medium ? 80 : 96, paddingHorizontal: compact ? 10 : 8, height: barH, borderRadius: compact ? 14 : 16,
    borderWidth: on ? 3 : 1.5, borderColor: on ? palette.accent : palette.line, backgroundColor: on ? palette.accentSoft : palette.surface,
    alignItems: 'center' as const, justifyContent: 'center' as const, gap: compact ? 2 : 4,
  });

  return (
    <Screen style={{ padding: flat ? 6 : L.pad, gap: flat ? 6 : L.phone ? 8 : 12 }}>
      <MessageBar mode={adult ? 'text' : 'chips'} height={adult ? 92 : 120} />
      {adult && !flat ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, flexGrow: 1 }}>
          {L.wide ? <Txt soft bold size={15} style={{ width: 52, alignSelf: 'center' }}>Next</Txt> : null}
          {suggestions.map((sug) => (
            <Btn key={sug} label={sug} onPress={() => msg.addText(sug)} style={{ flexGrow: 1, minWidth: compact ? 84 : 110, borderStyle: 'dashed', minHeight: compact ? 44 : 52 }} />
          ))}
        </ScrollView>
      ) : null}
      <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
        {sheets > 1 && page ? <PageArrow dir={-1} sheet={sheet} count={sheets} section={page.name} compact={compact} onPress={() => setSheet(Math.max(0, sheet - 1))} /> : null}
        <View style={{ flex: 1 }}>{page ? <Grid key={`${page.id}:${sheet}`} page={page} sheet={sheet} adult={adult} transpose={transpose} /> : null}</View>
        {sheets > 1 && page ? <PageArrow dir={1} sheet={sheet} count={sheets} section={page.name} compact={compact} onPress={() => setSheet(Math.min(sheets - 1, sheet + 1))} /> : null}
        {showPhrases ? (
          <View style={{ width: 280, backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 18, padding: 14, gap: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt display size={18}>Saved phrases</Txt>
              <Btn icon="plus" label="Save" disabled={!msg.text} onPress={savePhrase} style={{ minHeight: 40 }} />
            </Row>
            <ScrollView contentContainerStyle={{ gap: 8 }}>
              {profile.phrases.map((ph) => (
                <Pressable key={ph} accessibilityRole="button" onPress={() => speak(ph, profile.settings)}
                  style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.ground, minHeight: 52, justifyContent: 'center' }}>
                  <Txt bold size={17}>{ph}</Txt>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', height: barH, gap: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 8, flexGrow: 1 }}>
          {profile.pages.map((p) => {
            const on = p.id === page?.id;
            const iw = p.iconWord ? profile.words[p.iconWord] : undefined;
            return (
              <Pressable key={p.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { setPageId(p.id); setSheet(0); }} style={chip(on)}>
                {!adult && iw && symbolSize ? <SymbolImage item={iw} size={symbolSize} /> : null}
                <Txt bold size={compact ? 14 : 16} numberOfLines={1}>{p.name}</Txt>
              </Pressable>
            );
          })}
          {adult && !showPhrases ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/show')} style={chip(false)}>
              <Txt bold size={compact ? 14 : 16}>Phrases</Txt>
            </Pressable>
          ) : null}
          {LINKS.map((l) => (
            <Pressable key={l.label} accessibilityRole="link" onPress={() => router.push(l.href)} style={chip(false)}>
              {!adult && l.symbol && symbolSize ? <SymbolImage item={{ symbol: { kind: 'none' }, fallback: l.symbol }} size={symbolSize} /> : null}
              {!adult && l.icon && symbolSize ? <Icon name={l.icon} size={compact ? 24 : 34} /> : null}
              <Txt bold size={compact ? 14 : 16} numberOfLines={1}>{l.label}</Txt>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ justifyContent: 'center', gap: 4 }}>
          <BoardSyncBadge compact={compact} />
          <Lock compact={compact} />
        </View>
      </View>
    </Screen>
  );
}
