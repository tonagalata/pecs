import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { router } from 'expo-router';
import { backupName, buildBackup, parseBackup, restoreProfile, type BackupFile } from '@/lib/backup';
import { openBackupFile, saveBackupFile } from '@/lib/backupFile';
import { useProfile } from '@/lib/store';
import { LEVEL_INFO } from '@/lib/vocab';
import { Btn, Card, Row, Segmented, Txt } from './ui';

/** Settings › Move to a new device: export and import backup files, and offline status on the web. */
export function BackupCard() {
  const { profile, state, palette, mutate, syncNow } = useProfile();
  const [scope, setScope] = useState<'this' | 'all'>('this');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [offline, setOffline] = useState('');

  // Web: ask the service worker whether the whole app is saved on this device.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.serviceWorker) return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; cached?: number; total?: number };
      if (d?.type !== 'pictotalk:status') return;
      setOffline(d.total && (d.cached ?? 0) >= d.total ? 'Ready to use offline on this device.' : `Saving the app for offline use (${d.cached ?? 0} of ${d.total ?? '?'} files)…`);
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    navigator.serviceWorker.ready.then((r) => r.active?.postMessage('pictotalk:status')).catch(() => {});
    const t = setTimeout(() => setOffline((o) => o || 'Open PictoTalk once with an internet connection to save it for offline use.'), 3000);
    return () => { navigator.serviceWorker.removeEventListener('message', onMsg); clearTimeout(t); };
  }, []);

  const exportNow = async () => {
    setBusy(true); setMsg('Preparing the file…');
    try {
      const ids = scope === 'all' ? state.profiles.map((p) => p.id) : [profile.id];
      const file = await buildBackup(state, ids);
      const r = await saveBackupFile(backupName(state, ids), JSON.stringify(file));
      setMsg(r === 'saved' ? `Backup saved${Platform.OS === 'web' ? ' to your downloads' : ''}. Open it on the new device in Settings › Import a backup.` : '');
    } catch (e) {
      setMsg(`Couldn’t make the backup: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const importNow = async () => {
    setMsg(''); setDone([]);
    try {
      const text = await openBackupFile();
      if (!text) return;
      setPending(parseBackup(text));
    } catch (e) {
      setPending(null);
      setMsg((e as Error).message);
    }
  };

  const restore = async (p: BackupFile['profiles'][number], mode: 'add' | 'replace') => {
    if (!pending) return;
    setBusy(true);
    try {
      const exists = state.profiles.find((x) => x.id === p.id);
      const next = await restoreProfile(pending, p, mode === 'add' && !!exists);
      const ids = pending.arasaacIds ?? {};
      mutate((s) => {
        const keep = s.profiles.find((x) => x.id === next.id);
        const profiles = mode === 'replace' && keep
          ? s.profiles.map((x) => (x.id === next.id ? { ...next, sync: keep.sync } : x))
          : [...s.profiles, next];
        return { ...s, profiles, activeId: next.id, arasaacIds: { ...ids, ...s.arasaacIds } };
      });
      if (mode === 'replace' && exists?.sync) setTimeout(() => { syncNow(next.id); }, 300);
      setDone((d) => [...d, p.id]);
      setMsg(`${next.name}’s board is on this device now.`);
    } catch (e) {
      setMsg(`Couldn’t import: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Txt display size={18}>Move to a new device</Txt>
      <Txt soft size={14}>A backup file has the board, its settings, photos and recordings. Message history is not included.</Txt>
      {state.profiles.length > 1 ? (
        <Segmented label="What to back up" value={scope} onChange={setScope} options={[{ value: 'this', label: `${profile.name} only` }, { value: 'all', label: `Everyone (${state.profiles.length})` }]} />
      ) : null}
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <Btn icon="download" label="Export backup" disabled={busy} onPress={exportNow} />
        <Btn icon="upload" label="Import a backup" disabled={busy} onPress={importNow} />
      </Row>
      {pending ? (
        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10 }}>
          <Txt bold size={16}>In this file (saved {new Date(pending.exportedAt).toLocaleDateString()}):</Txt>
          {pending.profiles.map((p) => {
            const exists = state.profiles.some((x) => x.id === p.id);
            const isDone = done.includes(p.id);
            return (
              <Row key={p.id} gap={8} style={{ flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 140 }}>
                  <Txt bold size={16}>{p.name}</Txt>
                  <Txt soft size={13}>{LEVEL_INFO[p.level]?.title ?? ''} · {Object.keys(p.words).length} words{exists ? ' · already on this device' : ''}</Txt>
                </View>
                {isDone ? <Txt soft size={14}>Done</Txt> : exists ? (
                  <>
                    <Btn kind="primary" label="Replace" disabled={busy} onPress={() => restore(p, 'replace')} />
                    <Btn label="Add as a copy" disabled={busy} onPress={() => restore(p, 'add')} />
                  </>
                ) : <Btn kind="primary" label="Add" disabled={busy} onPress={() => restore(p, 'add')} />}
              </Row>
            );
          })}
          <Btn kind="plain" label="Close" onPress={() => { setPending(null); setDone([]); }} />
        </View>
      ) : null}
      {msg ? <Txt size={15}>{msg}</Txt> : null}
      <Txt soft size={14}>To keep the same board up to date on several devices, or with a therapist, use Sharing instead.</Txt>
      <Btn kind="plain" icon="users" label="Open Sharing" onPress={() => router.replace('/share')} />
      {offline ? <Txt soft size={14}>{offline}</Txt> : null}
    </Card>
  );
}
