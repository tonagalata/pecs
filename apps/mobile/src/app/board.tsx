import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { router, type Href } from 'expo-router';
import { MessageBar } from '@/components/MessageBar';
import { EmptyCell, SymbolImage, Tile } from '@/components/Tile';
import { Btn, Icon, Row, Screen, Txt } from '@/components/ui';
import { useMessage } from '@/lib/message';
import { speak } from '@/lib/speech';
import { useProfile } from '@/lib/store';
import { FONTS } from '@/lib/theme';
import type { Page } from '@/lib/types';

const PREDICT: Record<string, string[]> = {
  '': ['I', 'Can you', 'Please', 'I need', 'Yes', 'No'],
  i: ['want', 'need', 'feel', 'think', "don't", 'like'],
  want: ['to', 'a break', 'help', 'more', 'quiet', 'water'],
  need: ['a break', 'help', 'quiet', 'to go', 'time', 'water'],
  feel: ['tired', 'okay', 'sick', 'overwhelmed', 'anxious', 'good'],
  "don't": ['want', 'know', 'like', 'feel', 'understand', 'need'],
};

function Grid({ page, adult }: { page: Page; adult: boolean }) {
  const { profile, settings } = useProfile();
  const msg = useMessage();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const gap = settings.extraGap ? 18 : adult ? 8 : 10;
  const cellW = box.w ? (box.w - gap * (page.cols - 1)) / page.cols : 0;
  const cellH = box.h ? (box.h - gap * (page.rows - 1)) / page.rows : 0;
  const img = Math.max(24, Math.min(cellW * 0.62, cellH * (adult ? 0.42 : 0.55)));
  const font = Math.max(10, Math.min(adult ? 19 : 22, cellW / 5.2));
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const rows = [];
  for (let r = 0; r < page.rows; r++) {
    const cells = [];
    for (let c = 0; c < page.cols; c++) {
      const id = page.cells[`${r}:${c}`];
      const w = id ? profile.words[id] : undefined;
      cells.push(
        w && !w.hidden ? (
          <Tile key={`${page.id}:${w.id}`} label={w.label} group={w.group} symbol={w} imageSize={img} fontSize={font} variant={adult ? 'bar' : 'tinted'}
            onSelect={() => msg.add({ text: w.say ?? w.label, wordId: w.id })} />
        ) : <EmptyCell key={`${page.id}:e${c}`} />,
      );
    }
    rows.push(<View key={r} style={{ flex: 1, flexDirection: 'row', gap }}>{cells}</View>);
  }
  return <View style={{ flex: 1, gap }} onLayout={onLayout}>{box.w ? rows : null}</View>;
}

function LockButton() {
  const { profile } = useProfile();
  const [hint, setHint] = useState(false);
  const self = profile.settings.selfManage;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={self ? 'Settings' : 'Supporter area. Press and hold for 2 seconds.'}
      onPress={() => { if (self) router.push('/supporter'); else { setHint(true); setTimeout(() => setHint(false), 2000); } }}
      onLongPress={() => router.push('/unlock')}
      delayLongPress={2000}
      style={{ width: 84, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: 0.75 }}
    >
      <Icon name={self ? 'settings' : 'lock'} size={24} />
      <Txt size={12} bold center>{self ? 'Settings' : hint ? 'Keep holding…' : 'Hold to unlock'}</Txt>
    </Pressable>
  );
}

export default function Board() {
  const { profile, palette, updateProfile } = useProfile();
  const msg = useMessage();
  const { width } = useWindowDimensions();
  const adult = profile.level === 'adult';
  const [pageId, setPageId] = useState(profile.pages[0]?.id);
  const page = profile.pages.find((p) => p.id === pageId) ?? profile.pages[0];
  const wide = width >= 900;

  const last = (msg.items[msg.items.length - 1]?.text ?? '').toLowerCase().split(' ').pop() ?? '';
  const suggestions = PREDICT[last] ?? ['please', 'now', 'later', 'thank you', 'because', 'and'];

  const links: { label: string; href: Href; icon?: string; feather?: React.ComponentProps<typeof Icon>['name'] }[] = useMemo(() => [
    { label: 'Feelings', href: '/feelings', icon: 'happy' },
    { label: 'My day', href: '/schedule', icon: 'bus' },
    { label: 'ABC', href: '/keyboard', feather: 'type' },
    { label: 'Show', href: '/show', feather: 'maximize' },
  ], []);

  const savePhrase = () => {
    const t = msg.text.trim();
    if (!t) return;
    const phrase = t.charAt(0).toUpperCase() + t.slice(1) + (/[.?!]$/.test(t) ? '' : '.');
    updateProfile((p) => ({ ...p, phrases: [phrase, ...p.phrases.filter((x) => x !== phrase)] }));
  };

  const tabH = adult ? 64 : 100;
  return (
    <Screen>
      <MessageBar mode={adult ? 'text' : 'chips'} height={adult ? 92 : 120} />
      {adult ? (
        <Row gap={8} style={{ height: 52 }}>
          {wide ? <Txt soft bold size={15} style={{ width: 52 }}>Next</Txt> : null}
          {suggestions.slice(0, width < 640 ? 4 : 6).map((sug) => (
            <Btn key={sug} label={sug} onPress={() => msg.addText(sug)} style={{ flex: 1, borderStyle: 'dashed', height: 52 }} />
          ))}
        </Row>
      ) : null}
      <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>{page ? <Grid page={page} adult={adult} /> : null}</View>
        {adult && wide ? (
          <View style={{ width: 280, backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 18, padding: 14, gap: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt display size={18}>Saved phrases</Txt>
              <Btn icon="plus" label="Save" disabled={!msg.text}
                onPress={savePhrase} style={{ minHeight: 40 }} />
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
      <ScrollView horizontal={!wide} scrollEnabled={!wide} contentContainerStyle={{ flexGrow: 1 }} style={{ flexGrow: 0, height: tabH }} showsHorizontalScrollIndicator={false}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 8, height: tabH }}>
          {profile.pages.map((p) => {
            const on = p.id === page?.id;
            const iw = p.iconWord ? profile.words[p.iconWord] : undefined;
            return (
              <Pressable key={p.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setPageId(p.id)}
                style={{ flex: 1, minWidth: 96, borderRadius: 16, borderWidth: on ? 3 : 1.5, borderColor: on ? palette.accent : palette.line, backgroundColor: on ? palette.accentSoft : palette.surface, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8 }}>
                {!adult && iw ? <SymbolImage item={iw} size={46} /> : null}
                <Txt bold size={adult ? 17 : 16} style={{ fontFamily: FONTS.bodyBold }}>{p.name}</Txt>
              </Pressable>
            );
          })}
          {links.map((l) => (
            <Pressable key={l.label} accessibilityRole="link" onPress={() => router.push(l.href)}
              style={{ flex: 1, minWidth: 96, borderRadius: 16, borderWidth: 1.5, borderColor: palette.line, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {!adult && l.icon ? <SymbolImage item={{ symbol: { kind: 'none' }, fallback: l.icon }} size={46} /> : null}
              {!adult && l.feather ? <Icon name={l.feather} size={36} /> : null}
              <Txt bold size={adult ? 17 : 16}>{l.label}</Txt>
            </Pressable>
          ))}
          <LockButton />
        </View>
      </ScrollView>
    </Screen>
  );

}

