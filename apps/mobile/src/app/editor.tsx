import React, { useState } from 'react';
import { Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { SupporterShell } from '@/components/SupporterShell';
import { SymbolImage } from '@/components/Tile';
import { Btn, Card, Icon, Row, Segmented, Toggle, Txt } from '@/components/ui';
import { cellKey, closeGaps, parseKey, resizePage, sheetCount } from '@/lib/grid';
import { useLayout } from '@/lib/layout';
import { useProfile } from '@/lib/store';
import { GROUP_COLORS, GROUP_ORDER } from '@/lib/theme';

const SIZES = ['2x2', '3x2', '3x3', '4x3', '6x4', '8x5', '10x6'] as const;

export default function Editor() {
  const { profile, palette, updateProfile, updateWord } = useProfile();
  const L = useLayout();
  const [pageId, setPageId] = useState(profile.pages[0]?.id);
  const page = profile.pages.find((p) => p.id === pageId) ?? profile.pages[0];
  const [sel, setSel] = useState<string>('0:0');
  const [moving, setMoving] = useState<string | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [sheetState, setSheet] = useState(0);
  const [extra, setExtra] = useState(0);
  if (!page) return null;
  // Pages within this section: every page that has a word, plus any empty ones added here.
  const used = sheetCount(page);
  const sheets = used + extra;
  const sheet = Math.min(sheetState, sheets - 1);
  const goSheet = (n: number) => { setSheet(n); setSel(cellKey(n, 0, 0)); };

  const setPage = (fn: (cells: Record<string, string>) => Record<string, string>) =>
    updateProfile((p) => ({ ...p, pages: p.pages.map((pg) => (pg.id === page.id ? { ...pg, cells: fn(pg.cells) } : pg)) }));
  const transformPage = (fn: (pg: typeof page) => typeof page) =>
    updateProfile((p) => ({ ...p, pages: p.pages.map((pg) => (pg.id === page.id ? fn(pg) : pg)) }));
  const resize = (cols: number, rows: number) => {
    // Keep the selected word in view: find which page it lands on at the new size.
    const id = page.cells[sel];
    transformPage((pg) => resizePage(pg, cols, rows));
    const next = resizePage(page, cols, rows);
    const key = id ? Object.entries(next.cells).find(([, v]) => v === id)?.[0] : undefined;
    const n = key ? parseKey(key)?.sheet ?? 0 : 0;
    setExtra(0); setSheet(n); setSel(key ?? cellKey(n, 0, 0));
  };

  const tap = (key: string) => {
    if (moving) {
      // Swap the two cells. Only moves the supporter asks for ever change a word's position.
      setPage((cells) => {
        const next = { ...cells };
        const a = cells[moving], b = cells[key];
        delete next[moving]; delete next[key];
        if (a) next[key] = a;
        if (b) next[moving] = b;
        return next;
      });
      setMoving(null);
    }
    setSel(key);
  };

  const gap = 8;
  // Same orientation as the board on this device (rotated when held upright).
  const transpose = L.portrait && page.cols > page.rows;
  const nCols = transpose ? page.rows : page.cols;
  const nRows = transpose ? page.cols : page.rows;
  const cw = box.w ? (box.w - gap * (nCols - 1)) / nCols : 0;
  const ch = box.h ? (box.h - gap * (nRows - 1)) / nRows : 0;
  const img = Math.max(20, Math.min(cw * 0.55, ch * 0.5));
  const selId = page.cells[sel];
  const w = selId ? profile.words[selId] : undefined;

  const rows = [];
  for (let r = 0; r < nRows; r++) {
    const cells = [];
    for (let c = 0; c < nCols; c++) {
      const key = transpose ? cellKey(sheet, c, r) : cellKey(sheet, r, c);
      const id = page.cells[key];
      const word = id ? profile.words[id] : undefined;
      const g = GROUP_COLORS[word?.group ?? 'misc'];
      const isSel = sel === key;
      cells.push(
        <Pressable key={key} accessibilityRole="button" accessibilityLabel={word ? `Edit ${word.label}` : 'Empty space'} accessibilityState={{ selected: isSel }} onPress={() => tap(key)}
          style={{ flex: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2,
            backgroundColor: word && !word.hidden ? g.fill : 'transparent',
            borderWidth: isSel ? 4 : 2, borderStyle: word && !word.hidden ? 'solid' : 'dashed',
            borderColor: isSel ? palette.accent : word && !word.hidden ? g.edge : palette.lineStrong,
            opacity: moving && moving !== key ? 0.85 : 1 }}>
          {word ? (
            <>
              <SymbolImage item={word} size={img} style={{ opacity: word.hidden ? 0.35 : 1 }} />
              <Txt bold size={Math.min(16, cw / 5)} style={{ opacity: word.hidden ? 0.5 : 1 }} color="#17302E" numberOfLines={1}>{word.label}</Txt>
              {word.hidden ? <View style={{ position: 'absolute', top: 4, right: 4 }}><Icon name="eye-off" size={16} color={palette.inkSoft} /></View> : null}
            </>
          ) : <Icon name="plus" size={22} color={palette.inkSoft} />}
        </Pressable>,
      );
    }
    rows.push(<View key={r} style={{ flex: 1, flexDirection: 'row', gap }}>{cells}</View>);
  }

  return (
    <SupporterShell title={`${profile.name}'s board`} actions={
      <Segmented label="Grid size" value={`${page.cols}x${page.rows}` as (typeof SIZES)[number]}
        options={SIZES.map((sz) => ({ value: sz, label: sz.replace('x', ' × ') }))}
        onChange={(v) => { const [cols, rows] = v.split('x').map(Number); resize(cols, rows); }} />
    }>
      <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
        {profile.pages.map((p) => <Btn key={p.id} label={p.name} selected={p.id === page.id} onPress={() => { setPageId(p.id); setSel('0:0'); setMoving(null); setSheet(0); setExtra(0); }} />)}
      </ScrollView>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <Btn icon="chevron-left" accessibilityLabel="Previous page" disabled={sheet === 0} onPress={() => goSheet(sheet - 1)} />
        <Txt bold size={16} style={{ minWidth: 92, textAlign: 'center' }}>Page {sheet + 1} of {sheets}</Txt>
        <Btn icon="chevron-right" accessibilityLabel="Next page" disabled={sheet >= sheets - 1} onPress={() => goSheet(sheet + 1)} />
        <Btn icon="plus" label="Add a page" onPress={() => { setExtra(extra + 1); goSheet(sheets); }} />
        {used > 1 ? <Btn icon="minimize-2" label="Close up gaps" onPress={() => { transformPage(closeGaps); goSheet(0); }} /> : null}
      </Row>
      <Txt soft size={14}>Tap a space to edit it. Words never move unless you move them. When a section has more words than the grid holds, they continue on the next page and {profile.name} turns pages with big arrows. Changing the grid size keeps every word in the same order, and changing it back restores the layout.</Txt>
      <ScrollView style={{ flex: 1 }} scrollEnabled={L.compact} contentContainerStyle={{ flexGrow: 1, flexDirection: L.compact ? 'column' : 'row', gap: 16 }}>
        <View style={L.compact ? { height: Math.round(L.width * 1.25), gap } : { flex: 1, minWidth: 360, minHeight: 320, gap }} onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {box.w ? rows : null}
        </View>
        <Card style={L.compact ? {} : { width: 320, flexGrow: 0 }}>
          {moving ? (
            <>
              <Txt display size={19}>Moving “{profile.words[page.cells[moving]]?.label}”</Txt>
              <Txt soft size={15}>Tap the space it should go to. If a word is already there, the two swap places.</Txt>
              <Btn label="Cancel move" onPress={() => setMoving(null)} />
            </>
          ) : w ? (
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Row gap={14}>
                <View style={{ width: 96, height: 96, borderRadius: 18, borderWidth: 3, borderColor: GROUP_COLORS[w.group].edge, backgroundColor: GROUP_COLORS[w.group].fill, alignItems: 'center', justifyContent: 'center' }}>
                  <SymbolImage item={w} size={58} />
                  <Txt bold size={14} color="#17302E">{w.label}</Txt>
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <Btn icon="edit-2" label="Edit word" onPress={() => router.push({ pathname: '/word', params: { id: w.id } })} />
                  <Btn icon="move" label="Move" onPress={() => setMoving(sel)} />
                </View>
              </Row>
              <Txt bold size={15}>Color group</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {GROUP_ORDER.map((gk) => (
                  <Pressable key={gk} accessibilityRole="radio" accessibilityState={{ checked: w.group === gk }} onPress={() => updateWord(w.id, { group: gk })}
                    style={{ width: '23%', minHeight: 42, borderRadius: 10, borderWidth: w.group === gk ? 3 : 2, borderColor: w.group === gk ? '#17302E' : GROUP_COLORS[gk].edge, backgroundColor: GROUP_COLORS[gk].fill, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt bold size={12} color="#17302E">{GROUP_COLORS[gk].label}</Txt>
                  </Pressable>
                ))}
              </View>
              <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.line, paddingVertical: 10 }}>
                <View style={{ flex: 1 }}><Txt bold size={16}>Show on board</Txt><Txt soft size={13}>Hidden words keep their space</Txt></View>
                <Toggle label="Show on board" value={!w.hidden} onChange={(v) => updateWord(w.id, { hidden: !v })} />
              </Row>
              <Btn kind="danger" label="Remove from this space" onPress={() => setPage((cells) => { const n = { ...cells }; delete n[sel]; return n; })} />
              <Txt soft size={13} center>Removing leaves an empty space. Other words stay put.</Txt>
            </ScrollView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Icon name="plus-square" size={40} color={palette.inkSoft} />
              <Txt display size={19}>Empty space</Txt>
              <Txt soft size={15} center>Put a new word here. It will stay in this spot.</Txt>
              <Btn kind="primary" label="Add a word here" onPress={() => router.push({ pathname: '/word', params: { page: page.id, cell: sel } })} />
            </View>
          )}
        </Card>
      </ScrollView>
    </SupporterShell>
  );
}
