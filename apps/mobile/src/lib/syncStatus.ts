// One place for the online / offline and "changes waiting" wording, so the badge in the supporter
// area, the badge on the board and the Sharing page always say the same thing.
import { useMemo } from 'react';
import type { IconName } from '@/components/ui';
import { useOnline } from './connection';
import { useProfile } from './store';
import { pendingChanges } from './sync';

export type SyncKind = 'online' | 'offline' | 'waiting' | 'sharing' | 'shared' | 'error' | 'removed';

export interface SyncStatus {
  kind: SyncKind;
  online: boolean;
  /** Changes made here that the shared copy doesn't have yet. */
  pending: number;
  shared: boolean;
  icon: IconName;
  /** A few words, for badges. */
  short: string;
  /** A sentence, for the Sharing page and screen readers. */
  long: string;
}

export const changes = (n: number) => `${n} change${n === 1 ? '' : 's'}`;

export function useSyncStatus(): SyncStatus {
  const { profile, syncing } = useProfile();
  const online = useOnline();
  const link = profile.sync;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pending = useMemo(() => pendingChanges(profile), [profile.words, profile.pages, profile.phrases, profile.schedule, profile.name, profile.level, profile.scheduleNote, link?.base, link?.media, link?.role, link?.status]);
  const base = { online, pending, shared: !!link };

  if (!link) {
    return online
      ? { ...base, kind: 'online', icon: 'wifi', short: 'Online', long: 'Online.' }
      : { ...base, kind: 'offline', icon: 'wifi-off', short: 'Offline', long: 'Offline. The board works as usual without internet.' };
  }
  if (link.status === 'removed') {
    return { ...base, kind: 'removed', icon: 'alert-circle', short: 'Not shared', long: 'This board is no longer shared with this device. Your copy stays here and still works.' };
  }
  if (!online || link.status === 'offline') {
    return pending
      ? { ...base, kind: 'offline', icon: 'wifi-off', short: `Offline · ${changes(pending)} waiting`, long: `Offline. ${changes(pending)} saved on this device will be shared as soon as it is back online.` }
      : { ...base, kind: 'offline', icon: 'wifi-off', short: 'Offline', long: 'Offline. Changes are saved on this device and shared when it is back online.' };
  }
  if (syncing) {
    return { ...base, kind: 'sharing', icon: 'refresh-cw', short: pending ? `Sharing ${changes(pending)}…` : 'Sharing…', long: pending ? `Sharing ${changes(pending)} now.` : 'Checking for changes now.' };
  }
  if (link.status === 'error') {
    return { ...base, kind: 'error', icon: 'alert-triangle', short: pending ? `${changes(pending)} waiting` : 'Can’t share', long: `${link.error ?? 'Could not reach the server.'}${pending ? ` ${changes(pending)} waiting to share.` : ''}` };
  }
  if (pending) {
    return { ...base, kind: 'waiting', icon: 'upload-cloud', short: `${changes(pending)} waiting`, long: `${changes(pending)} waiting to share. They are sent a few seconds after the last edit.` };
  }
  return { ...base, kind: 'shared', icon: 'check-circle', short: 'Up to date', long: 'All changes shared.' };
}
