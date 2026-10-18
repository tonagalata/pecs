import React, { useState } from 'react';
import { Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { SupporterShell } from '@/components/SupporterShell';
import { SymbolImage } from '@/components/Tile';
import { Btn, Card, Icon, Row, Segmented, Toggle, Txt } from '@/components/ui';
import { useProfile } from '@/lib/store';
import { GROUP_COLORS, GROUP_ORDER } from '@/lib/theme';

const SIZES = ['3x2', '4x3', '6x4', '8x5', '10x6'] as const;

export default function Editor() {
  const { profile, palette, updateProfile, updateWord } = useProfile();
  const [pageId, setPageId] = useState(profile.pages[0]?.id);
  const page = profile.pages.find((p) => p.id === pageId) ?? profile.pages[0];
  const [sel, setSel] = useState<string>('0:0');
  const [moving, setMoving] = useState<string | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  if (!page) return null;

  const setPage = (fn: (cells: Record<string, string>) => Record<string, string>, dims?: { cols: number; rows: number }) =>
    updateProfile((p) => ({ ...p, pages: p.pages.map((pg) => (pg.id === page.id ? { ...pg, ...(dims ?? {}), cells: fn(pg.cells) } : pg)) }));

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
  const cw = box.w ? (box.w - gap * (page.cols - 1)) / page.cols : 0;
  const ch = box.h ? (box.h - gap * (page.rows - 1)) / page.rows : 0;
  const img = Math.max(20, Math.min(cw * 0.55, ch * 0.5));
  const selId = page.cells[sel];
  const w = selId ? profile.words[selId] : undefined;

  const rows = [];
  for (let r = 0; r < page.rows; r++) {
    const cells = [];
    for (let c = 0; c < page.cols; c++) {
      const key = `${r}:${c}`;
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
        onChange={(v) => { const [cols, rows] = v.split('x').map(Number); setPage((cells) => cells, { cols, rows }); }} />
    }>
      <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
        {profile.pages.map((p) => <Btn key={p.id} label={p.name} selected={p.id === page.id} onPress={() => { setPageId(p.id); setSel('0:0'); setMoving(null); }} />)}
      </ScrollView>
      <Txt soft size={14}>Tap a space to edit it. Words never move unless you move them. Making the grid smaller only hides the outer spaces; nothing is lost.</Txt>
      <View style={{ flex: 1, flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 360, minHeight: 320, gap }} onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {box.w ? rows : null}
        </View>
        <Card style={{ width: 320, flexGrow: 0 }}>
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
      </View>
    </SupporterShell>
  );
}
