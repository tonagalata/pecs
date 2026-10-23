import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useProfile } from '@/lib/store';
import { useSyncStatus, type SyncStatus } from '@/lib/syncStatus';
import { Icon, Txt } from './ui';

function colors(s: SyncStatus, palette: ReturnType<typeof useProfile>['palette']) {
  if (s.kind === 'error' || s.kind === 'removed') return { bg: palette.surface, fg: palette.danger, line: palette.danger };
  if (s.kind === 'offline') return { bg: palette.surfaceAlt, fg: palette.inkSoft, line: palette.lineStrong };
  if (s.kind === 'waiting' || s.kind === 'sharing') return { bg: palette.accentSoft, fg: palette.ink, line: palette.accent };
  return { bg: palette.surface, fg: palette.success, line: palette.line };
}

/** Online / offline and "changes waiting" pill for the supporter area. Opens Sharing for shared boards. */
export function SyncBadge() {
  const { palette } = useProfile();
  const s = useSyncStatus();
  const c = colors(s, palette);
  return (
    <Pressable accessibilityRole={s.shared ? 'button' : 'text'} accessibilityLabel={s.long} disabled={!s.shared}
      onPress={() => router.push('/share')}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 999,
        borderWidth: 1.5, borderColor: c.line, backgroundColor: pressed ? palette.accentSoft : c.bg })}>
      <Icon name={s.icon} size={16} color={c.fg} />
      <Txt bold size={14} color={s.kind === 'shared' || s.kind === 'online' ? palette.ink : c.fg}>{s.short}</Txt>
    </Pressable>
  );
}

/**
 * Small, quiet badge on the board itself: only for shared boards, and only when something is worth
 * knowing (offline, changes waiting, a problem). Not pressable, so it can't pull anyone off the board.
 */
export function BoardSyncBadge({ compact }: { compact: boolean }) {
  const { palette } = useProfile();
  const s = useSyncStatus();
  if (!s.shared || s.kind === 'shared') return null;
  const c = colors(s, palette);
  return (
    <View accessible accessibilityLabel={s.long}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, alignSelf: 'center', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 999, borderWidth: 1, borderColor: c.line, backgroundColor: c.bg }}>
      <Icon name={s.icon} size={compact ? 12 : 14} color={c.fg} />
      {s.pending ? <Txt bold size={compact ? 11 : 12} color={c.fg}>{s.pending}</Txt> : null}
    </View>
  );
}
