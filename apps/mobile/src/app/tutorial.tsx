import React, { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SymbolImage, Tile } from '@/components/Tile';
import { Btn, Icon, Row, Screen, Segmented, Toggle, Txt, type IconName } from '@/components/ui';
import { useLayout } from '@/lib/layout';
import { speak } from '@/lib/speech';
import { useApp } from '@/lib/store';
import { FONTS, GROUP_COLORS, type Group } from '@/lib/theme';
import type { SymbolInput } from '@/lib/symbols';

/**
 * Guided tour for parents, teachers and therapists. Opened from the first-start invitation
 * (TutorialToast) or Settings, never by itself. Illustrations use the person's own words where
 * the board has them, and nothing here changes the board or settings.
 */

interface Step {
  eyebrow: string;
  title: string;
  lead: string;
  points: { icon: IconName; text: string }[];
  Art: React.ComponentType;
}

/** The person's own picture for a word, or the bundled one. */
function useSym() {
  const { profile } = useApp();
  return (id: string, key = id): SymbolInput => profile?.words[id] ?? { symbol: { kind: 'none' }, fallback: key };
}

// --- Illustrations --------------------------------------------------------------------------

/** A static board tile in its Fitzgerald colors. */
function Chip({ id, label, group, size = 76, dim, selected }: { id: string; label: string; group: Group; size?: number; dim?: boolean; selected?: boolean }) {
  const { palette } = useApp();
  const sym = useSym();
  const g = GROUP_COLORS[group];
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 5, alignItems: 'center', justifyContent: 'center', gap: 2,
      backgroundColor: palette.tintedTiles ? g.fill : palette.surface, borderWidth: selected ? 4 : 3, borderColor: selected ? palette.accent : g.edge,
      opacity: dim ? 0.4 : 1,
    }}>
      <SymbolImage item={sym(id)} size={size * 0.5} />
      <Text numberOfLines={1} style={{ fontFamily: FONTS.bodyBold, fontSize: Math.max(11, size / 6.2), color: palette.ink }}>{label}</Text>
      {dim ? <View style={{ position: 'absolute', top: 5, right: 5 }}><Icon name="eye-off" size={14} color={palette.inkSoft} /></View> : null}
    </View>
  );
}

function Bubble({ children }: { children: React.ReactNode }) {
  const { palette } = useApp();
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ backgroundColor: palette.accent, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="volume-2" size={22} color={palette.onAccent} />
        <Txt display size={22} color={palette.onAccent}>{children}</Txt>
      </View>
      <View style={{ width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: palette.accent }} />
    </View>
  );
}

function WelcomeArt() {
  const L = useLayout();
  const size = L.compact ? 64 : L.wide ? 104 : 84;
  return (
    <View style={{ alignItems: 'center', gap: 18 }}>
      <Bubble>I want more.</Bubble>
      <View style={{ gap: 10 }}>
        <Row gap={10}>
          <Chip id="i" label="I" group="pron" size={size} />
          <Chip id="want" label="want" group="verb" size={size} />
          <Chip id="more" label="more" group="desc" size={size} />
        </Row>
        <Row gap={10}>
          <Chip id="what" label="what" group="q" size={size} />
          <Chip id="yes" label="yes" group="social" size={size} />
          <Chip id="help" label="help" group="urgent" size={size} />
        </Row>
      </View>
    </View>
  );
}

/** A working miniature of the board: tap pictures, then Speak. Uses its own message, not the board's. */
function TalkArt() {
  const { palette, settings } = useApp();
  const L = useLayout();
  const sym = useSym();
  const [said, setSaid] = useState<{ id: string; label: string; group: Group }[]>([]);
  const words: { id: string; label: string; group: Group }[] = [
    { id: 'i', label: 'I', group: 'pron' }, { id: 'want', label: 'want', group: 'verb' }, { id: 'more', label: 'more', group: 'desc' },
    { id: 'eat', label: 'eat', group: 'verb' }, { id: 'drink', label: 'drink', group: 'verb' }, { id: 'help', label: 'help', group: 'urgent' },
  ];
  const size = L.compact ? 76 : 96;
  const text = said.map((w) => w.label).join(' ');
  return (
    <View style={{ gap: 14, width: size * 3 + 20, maxWidth: '100%' }}>
      <View style={{ minHeight: 64, backgroundColor: palette.surface, borderWidth: 2, borderColor: palette.lineStrong, borderRadius: 16, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {said.length === 0 ? <Txt soft size={15} style={{ paddingHorizontal: 6 }}>Try it: tap the pictures below</Txt> : said.map((w, i) => (
          <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Remove ${w.label}`} onPress={() => setSaid((s) => s.filter((_, j) => j !== i))}
            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 2, borderColor: GROUP_COLORS[w.group].edge, backgroundColor: palette.tintedTiles ? GROUP_COLORS[w.group].fill : palette.surfaceAlt }}>
            <Txt bold size={15}>{w.label}</Txt>
          </Pressable>
        ))}
      </View>
      <Row gap={8}>
        <Btn kind="primary" icon="volume-2" label="Speak" style={{ flex: 1 }} disabled={!said.length} onPress={() => speak(text, settings)} />
        <Btn icon="delete" accessibilityLabel="Delete last word" disabled={!said.length} onPress={() => setSaid((s) => s.slice(0, -1))} />
        <Btn icon="x" accessibilityLabel="Clear message" disabled={!said.length} onPress={() => setSaid([])} />
      </Row>
      <View style={{ gap: 10 }}>
        {[words.slice(0, 3), words.slice(3)].map((row, r) => (
          <Row key={r} gap={10}>
            {row.map((w) => (
              <View key={w.id} style={{ width: size, height: size }}>
                <Tile label={w.label} group={w.group} symbol={sym(w.id)} imageSize={size * 0.5} fontSize={16} cellWidth={size} cellHeight={size}
                  onSelect={() => { setSaid((s) => [...s, w].slice(-6)); if (settings.onTap === 'word') speak(w.label, settings); }} />
              </View>
            ))}
          </Row>
        ))}
      </View>
    </View>
  );
}

function ColorsArt() {
  const L = useLayout();
  const size = L.compact ? 64 : 78;
  const groups: { g: Group; id: string; label: string }[] = [
    { g: 'pron', id: 'i', label: 'I' }, { g: 'verb', id: 'go', label: 'go' }, { g: 'desc', id: 'big', label: 'big' },
    { g: 'noun', id: 'apple', label: 'apple' }, { g: 'q', id: 'where', label: 'where' }, { g: 'social', id: 'please', label: 'please' },
    { g: 'urgent', id: 'stop', label: 'stop' },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, maxWidth: (size + 14) * 4 }}>
      {groups.map((x) => (
        <View key={x.g} style={{ alignItems: 'center', gap: 6 }}>
          <Chip id={x.id} label={x.label} group={x.g} size={size} />
          <Txt bold size={13} soft>{GROUP_COLORS[x.g].label}</Txt>
        </View>
      ))}
    </View>
  );
}

function MoreArt() {
  const { palette } = useApp();
  const sym = useSym();
  const tools: { label: string; key?: string; icon?: IconName }[] = [
    { label: 'Feelings', key: 'happy' }, { label: 'My day', key: 'bus' }, { label: 'ABC', icon: 'type' }, { label: 'Show', icon: 'maximize' },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 320 }}>
      {tools.map((t) => (
        <View key={t.label} style={{ width: 138, height: 118, borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.line, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {t.key ? <SymbolImage item={sym(t.key)} size={52} /> : <Icon name={t.icon!} size={40} />}
          <Txt bold size={17}>{t.label}</Txt>
        </View>
      ))}
    </View>
  );
}

function LockArt() {
  const { palette, settings } = useApp();
  const [p] = useState(() => new Animated.Value(settings.reduceMotion ? 0.7 : 0));
  useEffect(() => {
    if (settings.reduceMotion) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(p, { toValue: 1, duration: 2000, useNativeDriver: false }),
      Animated.delay(700),
      Animated.timing(p, { toValue: 0, duration: 0, useNativeDriver: false }),
      Animated.delay(500),
    ]));
    loop.start();
    return () => loop.stop();
  }, [p, settings.reduceMotion]);
  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <View style={{ width: 150, alignItems: 'center', gap: 8, backgroundColor: palette.surface, borderRadius: 22, borderWidth: 1.5, borderColor: palette.line, paddingVertical: 18 }}>
        <Icon name="lock" size={34} color={palette.accent} />
        <Txt bold size={14} color={palette.accent}>Keep holding…</Txt>
        <View style={{ width: 90, height: 7, borderRadius: 4, backgroundColor: palette.line, overflow: 'hidden' }}>
          <Animated.View style={{ height: 7, backgroundColor: palette.accent, width: p.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
        </View>
      </View>
      <Icon name="arrow-down" size={26} color={palette.inkSoft} />
      <View style={{ width: 240, backgroundColor: palette.surface, borderRadius: 22, padding: 16, gap: 10, borderWidth: 1.5, borderColor: palette.line }}>
        <Txt bold size={17}>What is 3 + 4?</Txt>
        <View style={{ height: 46, borderRadius: 12, borderWidth: 2, borderColor: palette.lineStrong, backgroundColor: palette.ground, alignItems: 'center', justifyContent: 'center' }}>
          <Txt display size={24}>7</Txt>
        </View>
        <View style={{ height: 40, borderRadius: 12, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Txt bold size={15} color={palette.onAccent}>Continue</Txt>
        </View>
      </View>
    </View>
  );
}

function EditArt() {
  const { palette } = useApp();
  const L = useLayout();
  const size = L.compact ? 62 : 74;
  const empty = (
    <View style={{ width: size, height: size, borderRadius: size / 5, borderWidth: 2, borderStyle: 'dashed', borderColor: palette.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="plus" size={22} color={palette.inkSoft} />
    </View>
  );
  const sources: { icon: IconName; label: string }[] = [{ icon: 'search', label: 'Symbol' }, { icon: 'camera', label: 'Photo' }, { icon: 'mic', label: 'Your voice' }];
  return (
    <View style={{ alignItems: 'center', gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Row gap={8}><Chip id="i" label="I" group="pron" size={size} /><Chip id="want" label="want" group="verb" size={size} /><Chip id="more" label="more" group="desc" size={size} /></Row>
        <Row gap={8}><Chip id="mom" label="Mom" group="pron" size={size} selected /><Chip id="play" label="play" group="verb" size={size} /><Chip id="finished" label="finished" group="desc" size={size} dim /></Row>
        <Row gap={8}><Chip id="park" label="park" group="noun" size={size} />{empty}<Chip id="music" label="music" group="noun" size={size} /></Row>
      </View>
      <Row gap={8} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        {sources.map((s) => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.line }}>
            <Icon name={s.icon} size={16} color={palette.accent} />
            <Txt bold size={14}>{s.label}</Txt>
          </View>
        ))}
      </Row>
    </View>
  );
}

/** Real controls with their own state: trying them here changes nothing. */
function FitArt() {
  const { palette } = useApp();
  const [mode, setMode] = useState<'tap' | 'release' | 'hold'>('tap');
  const [theme, setTheme] = useState<'light' | 'dim' | 'contrast'>('light');
  const [calm, setCalm] = useState(true);
  const line = { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 12, gap: 8 } as const;
  return (
    <View style={{ width: 360, maxWidth: '100%', backgroundColor: palette.surface, borderRadius: 22, borderWidth: 1, borderColor: palette.line, padding: 18, gap: 12 }}>
      <Txt display size={18}>Access & sensory</Txt>
      <View style={line}>
        <Txt bold size={15}>Choose a button by</Txt>
        <Segmented label="Choose a button by" value={mode} onChange={setMode} options={[{ value: 'tap', label: 'Tap' }, { value: 'release', label: 'Lift' }, { value: 'hold', label: 'Hold' }]} />
      </View>
      <View style={line}>
        <Txt bold size={15}>Colors</Txt>
        <Segmented label="Colors" value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Light' }, { value: 'dim', label: 'Low light' }, { value: 'contrast', label: 'High contrast' }]} />
      </View>
      <Row style={line}>
        <Txt bold size={15} style={{ flex: 1 }}>Reduce movement</Txt>
        <Toggle label="Reduce movement" value={calm} onChange={setCalm} />
      </Row>
    </View>
  );
}

function DayArt() {
  const { palette } = useApp();
  const L = useLayout();
  const sym = useSym();
  const img = L.compact ? 64 : 88;
  const card = (label: string, word: string, key: string, strong: boolean) => (
    <View style={{ flex: 1, alignItems: 'center', gap: 8, padding: 14, borderRadius: 22, backgroundColor: palette.surface, borderWidth: strong ? 4 : 2, borderColor: strong ? palette.accent : palette.lineStrong }}>
      <Txt display size={16} color={strong ? palette.accent : palette.inkSoft}>{label}</Txt>
      <SymbolImage item={sym(key)} size={img} />
      <Txt display size={20}>{word}</Txt>
    </View>
  );
  return (
    <View style={{ width: 340, maxWidth: '100%', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.surface, borderRadius: 14, borderWidth: 2, borderColor: palette.focus, paddingVertical: 10, paddingHorizontal: 12 }}>
        <Icon name="info" size={20} color={palette.focus} />
        <Txt size={14} style={{ flex: 1 }}>No swimming today. We will go to the park instead.</Txt>
      </View>
      <Row gap={10} style={{ alignItems: 'stretch' }}>
        {card('FIRST', 'school', 'school', true)}
        {card('THEN', 'park', 'park', false)}
      </Row>
    </View>
  );
}

function TeamArt() {
  const { palette } = useApp();
  const people: { name: string; role: string }[] = [{ name: 'Mom', role: 'Shared it' }, { name: 'Teacher', role: 'Can edit' }, { name: 'Therapist', role: 'Can view' }];
  const badges: { icon: IconName; label: string }[] = [{ icon: 'wifi-off', label: 'Works offline' }, { icon: 'refresh-cw', label: 'Syncs later' }, { icon: 'save', label: 'Backups' }];
  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <View style={{ width: 84, height: 84, borderRadius: 26, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="grid" size={40} color={palette.onAccent} />
      </View>
      {/* One line down to each card: card width 100 + gap 10, less the line's own 2 px. */}
      <Row gap={108}>{[0, 1, 2].map((i) => <View key={i} style={{ width: 2, height: 22, backgroundColor: palette.lineStrong }} />)}</Row>
      <Row gap={10} style={{ alignItems: 'stretch' }}>
        {people.map((p) => (
          <View key={p.name} style={{ width: 100, alignItems: 'center', gap: 6, padding: 10, borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.line }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Txt display size={18} color={palette.accent}>{p.name.charAt(0)}</Txt>
            </View>
            <Txt bold size={14}>{p.name}</Txt>
            <Txt soft size={12}>{p.role}</Txt>
          </View>
        ))}
      </Row>
      <Row gap={8} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        {badges.map((b) => (
          <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1.5, borderColor: palette.line, backgroundColor: palette.surface }}>
            <Icon name={b.icon} size={14} color={palette.success} />
            <Txt bold size={13}>{b.label}</Txt>
          </View>
        ))}
      </Row>
    </View>
  );
}

function ModelArt() {
  const { palette } = useApp();
  const L = useLayout();
  const size = L.compact ? 76 : L.wide ? 104 : 84;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ maxWidth: 300, backgroundColor: palette.surface, borderRadius: 20, borderWidth: 1.5, borderColor: palette.line, paddingVertical: 12, paddingHorizontal: 18 }}>
        <Txt size={20}>{'Let’s get '}<Txt bold size={20} color={palette.accent}>more</Txt>{' juice!'}</Txt>
      </View>
      <View style={{ width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: palette.line, marginBottom: 10 }} />
      <Row gap={10}>
        <Chip id="want" label="want" group="verb" size={size} />
        <View>
          <Chip id="more" label="more" group="desc" size={size} selected />
          <View style={{ position: 'absolute', right: -18, bottom: -26 }}>
            <MaterialCommunityIcons name="hand-pointing-up" size={52} color={palette.ink} />
          </View>
        </View>
        <Chip id="juice" label="juice" group="noun" size={size} />
      </Row>
    </View>
  );
}

// --- Steps ------------------------------------------------------------------------------------

function buildSteps(name: string): Step[] {
  return [
    {
      eyebrow: 'Welcome', title: 'A voice, in pictures', Art: WelcomeArt,
      lead: `PictoTalk is a picture board that speaks. This tour shows parents, teachers and therapists how to use it every day, and how to set it up so it fits ${name}.`,
      points: [
        { icon: 'message-circle', text: `The board is for ${name}: tap a picture and it speaks.` },
        { icon: 'lock', text: 'The supporter area is for you: editing, schedules, sharing and settings.' },
        { icon: 'clock', text: 'About 3 minutes. Use the arrows, or tap the bar at the bottom to jump to any step.' },
      ],
    },
    {
      eyebrow: 'On the board', title: 'Tap pictures to build a message', Art: TalkArt,
      lead: 'Each picture adds a word to the message strip at the top of the board. Speak reads the whole message aloud. Try it here.',
      points: [
        { icon: 'volume-2', text: 'Pictures can also say their word as they’re tapped. Choose this in Settings, under “When a picture is tapped”.' },
        { icon: 'delete', text: 'Back removes the last word and Clear empties the strip. Tap a word in the strip to take just that one out.' },
        { icon: 'star', text: 'Single words count. “More” or “help” on its own is real communication.' },
      ],
    },
    {
      eyebrow: 'On the board', title: 'Every word has its own home', Art: ColorsArt,
      lead: 'Words never move unless you move them. Finding “want” in the same spot every time builds muscle memory, so talking gets faster and easier.',
      points: [
        { icon: 'droplet', text: 'Colors show the kind of word, following the Modified Fitzgerald Key used across AAC.' },
        { icon: 'layers', text: 'The sections along the bottom hold more words. When a section is full, big arrows turn its pages.' },
        { icon: 'eye-off', text: 'New words can wait, hidden in their spot, until you start teaching them.' },
      ],
    },
    {
      eyebrow: 'On the board', title: 'More ways to talk', Art: MoreArt,
      lead: 'The bottom bar also has tools for moments the word grid doesn’t cover.',
      points: [
        { icon: 'smile', text: 'Feelings: say how they feel, how much, and where it hurts.' },
        { icon: 'calendar', text: 'My day: a picture schedule showing what happens first and what comes next.' },
        { icon: 'type', text: 'ABC: type with a keyboard, with word suggestions.' },
        { icon: 'maximize', text: 'Show: big text to show someone, like at a shop counter. It flips around for the person opposite.' },
      ],
    },
    {
      eyebrow: 'For supporters', title: 'Your space, behind a gentle lock', Art: LockArt,
      lead: 'Hold the lock in the bottom corner of the board for 2 seconds, then answer a quick sum. Children don’t open it by accident; adults get in quickly.',
      points: [
        { icon: 'hash', text: 'Prefer a PIN? Set one in Settings, under Supporter lock.' },
        { icon: 'user-check', text: 'Teens and adults can manage their own settings. The lock then becomes a Settings button.' },
        { icon: 'home', text: 'Supporter home lists hidden words and saved phrases, and recent messages if you turn history on.' },
      ],
    },
    {
      eyebrow: 'For supporters', title: 'Make the board their own', Art: EditArt,
      lead: 'In Boards, tap any space to edit it. Add the people, foods, places and favorite things that matter in their life.',
      points: [
        { icon: 'search', text: 'Pick from thousands of ARASAAC symbols, or use a photo of the real thing.' },
        { icon: 'mic', text: 'Record a familiar voice for a word, like a parent’s or a sibling’s.' },
        { icon: 'grid', text: 'Change the grid size as skills grow. Words keep their order, and switching back restores the layout.' },
        { icon: 'move', text: 'Words only move on purpose: tap Move, then tap the new spot.' },
      ],
    },
    {
      eyebrow: 'For supporters', title: 'Fit it to how they move, see and hear', Art: FitArt,
      lead: 'Settings are saved for each person and apply straight away. Try the controls here; they don’t change anything.',
      points: [
        { icon: 'mouse-pointer', text: 'Choose a button by tap, lift (slide to the right picture first) or hold. You can also ignore repeat taps.' },
        { icon: 'sun', text: 'Low light and high contrast colors, bigger text, and words above, below or instead of pictures.' },
        { icon: 'pause-circle', text: 'Reduce movement turns off sliding, bouncing and vibration.' },
        { icon: 'volume-2', text: 'Choose the voice and its speed. The HD voice pack sounds natural and works offline.' },
      ],
    },
    {
      eyebrow: 'For supporters', title: 'Plan the day in pictures', Art: DayArt,
      lead: `Make a step-by-step plan in Schedules. ${name} sees it under My day on the board: what happens first, and what comes next.`,
      points: [
        { icon: 'list', text: 'Add steps with optional times, and reorder them as the day changes.' },
        { icon: 'info', text: 'Something different today? Add a heads-up note at the top, like “No swimming today.”' },
        { icon: 'check-circle', text: 'Tapping “I’m finished” together moves on to the next step, which makes changes between activities calmer.' },
      ],
    },
    {
      eyebrow: 'Working together', title: 'Share the board with the team', Art: TeamArt,
      lead: 'Home, school and therapy can all use the same board. Invite people from Sharing with a short code. Nobody needs an account.',
      points: [
        { icon: 'users', text: 'Choose who can edit and who can only view. You can remove someone at any time.' },
        { icon: 'wifi-off', text: 'Everything works without internet. Changes are shared when the connection comes back.' },
        { icon: 'save', text: 'Save a backup file in Settings before big changes, or to move to a new device.' },
        { icon: 'shield', text: 'Nothing about what is said leaves the device. Message history is off unless you turn it on.' },
      ],
    },
    {
      eyebrow: 'The most important tip', title: 'Talk with the board, not just about it', Art: ModelArt,
      lead: 'People learn a picture board the way babies learn to speak: by seeing others use it, many times a day.',
      points: [
        { icon: 'mouse-pointer', text: 'Point to words as you talk: “Let’s get more juice.” Use one or two words more than they use now.' },
        { icon: 'smile', text: 'No pressure and no quizzes. Don’t ask them to copy you or to “show me”.' },
        { icon: 'heart', text: 'Honor every message, even “no” and “stop”. It shows their words have power.' },
        { icon: 'clock', text: 'Keep the board within reach all day, not just at therapy time, and give plenty of time to answer.' },
      ],
    },
  ];
}

// --- Screen -----------------------------------------------------------------------------------

export default function Tutorial() {
  const { profile, state, palette, settings, mutate } = useApp();
  const L = useLayout();
  const steps = buildSteps(profile?.name ?? 'them');
  // `dir` is the side the current step slid in from.
  const [{ i, dir }, setPos] = useState({ i: 0, dir: 1 });
  const step = steps[i];
  const last = i === steps.length - 1;
  const wide = L.width >= 860;

  // Opening the tour counts as taking up the invitation.
  useEffect(() => { if (!state.tutorialSeen) mutate((s) => ({ ...s, tutorialSeen: true })); }, [state.tutorialSeen, mutate]);

  const close = () => { if (router.canGoBack()) router.back(); else router.replace(profile ? '/board' : '/setup'); };

  // Each step fades and slides in from the side it came from.
  const [anim] = useState(() => new Animated.Value(1));
  const go = (n: number) => {
    if (n < 0 || n >= steps.length || n === i) return;
    setPos({ i: n, dir: n > i ? 1 : -1 });
  };
  useEffect(() => {
    if (settings.reduceMotion) { anim.setValue(1); return; }
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [i, anim, settings.reduceMotion]);

  // Arrow keys and Escape on web.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && i < steps.length - 1) setPos({ i: i + 1, dir: 1 });
      else if (e.key === 'ArrowLeft' && i > 0) setPos({ i: i - 1, dir: -1 });
      else if (e.key === 'Escape') { if (router.canGoBack()) router.back(); else router.replace('/board'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, steps.length]);

  const motion = { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [dir * 28, 0] }) }] };
  const stage = (
    <View style={{
      flex: wide ? 1.05 : undefined, minHeight: wide ? undefined : 260, borderRadius: 28, backgroundColor: palette.accentSoft,
      alignItems: 'center', justifyContent: 'center', padding: L.compact ? 16 : 28, overflow: 'hidden',
    }}>
      <step.Art key={i} />
    </View>
  );
  const words = (
    <View style={{ flex: wide ? 1 : undefined, justifyContent: wide ? 'center' : 'flex-start', gap: 14, paddingVertical: wide ? 8 : 4 }}>
      <Txt bold size={14} color={palette.accent} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{step.eyebrow}</Txt>
      <Txt display size={L.compact ? 26 : 34} accessibilityRole="header">{step.title}</Txt>
      <Txt size={L.compact ? 17 : 19} soft>{step.lead}</Txt>
      <View style={{ gap: 12, marginTop: 6 }}>
        {step.points.map((pt) => (
          <Row key={pt.text} gap={12} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={pt.icon} size={17} color={palette.accent} />
            </View>
            <Txt size={16} style={{ flex: 1, paddingTop: 5 }}>{pt.text}</Txt>
          </Row>
        ))}
      </View>
    </View>
  );

  return (
    <Screen style={{ padding: L.pad, gap: L.compact ? 10 : 16 }}>
      <Row gap={10} style={{ minHeight: 48 }}>
        <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="compass" size={20} color={palette.onAccent} />
        </View>
        <Txt display size={L.compact ? 17 : 19} style={{ flex: 1 }}>PictoTalk guide</Txt>
        <Txt soft bold size={15} accessibilityLiveRegion="polite">{i + 1} of {steps.length}</Txt>
        <Btn kind="plain" icon="x" accessibilityLabel="Close the tour" onPress={close} />
      </Row>

      <Animated.View style={[{ flex: 1, width: '100%', maxWidth: 1240, alignSelf: 'center' }, motion]}>
        {wide ? (
          <View style={{ flex: 1, flexDirection: 'row', gap: 40 }}>{stage}{words}</View>
        ) : (
          <ScrollView key={i} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingBottom: 12 }}>{stage}{words}</ScrollView>
        )}
      </Animated.View>

      <View style={{ width: '100%', maxWidth: 1240, alignSelf: 'center', gap: 12 }}>
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 6 }}>
          {steps.map((s, n) => (
            <Pressable key={n} accessibilityRole="tab" accessibilityLabel={`Step ${n + 1}: ${s.title}`} accessibilityState={{ selected: n === i }} onPress={() => go(n)}
              hitSlop={{ top: 12, bottom: 12 }} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: n <= i ? palette.accent : palette.lineStrong, opacity: n < i ? 0.45 : 1 }} />
          ))}
        </View>
        <Row gap={10}>
          {i === 0
            ? <Btn kind="plain" label="Skip the tour" onPress={close} />
            : <Btn icon="arrow-left" label={L.compact ? undefined : 'Back'} accessibilityLabel="Previous step" onPress={() => go(i - 1)} size="lg" />}
          <View style={{ flex: 1 }} />
          <Btn kind="primary" size="lg" label={last ? 'Done' : i === 0 ? 'Start the tour' : 'Next'} onPress={() => (last ? close() : go(i + 1))} style={{ minWidth: L.compact ? 150 : 200 }}>
            <Icon name={last ? 'check' : 'arrow-right'} size={22} color={palette.onAccent} />
          </Btn>
        </Row>
      </View>
    </Screen>
  );
}
