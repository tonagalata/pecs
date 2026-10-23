import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';
import { SupporterShell } from '@/components/SupporterShell';
import { Btn, Card, Icon, Row, Segmented, Txt } from '@/components/ui';
import { ago, confirm, copyText } from '@/lib/confirm';
import { useProfile } from '@/lib/store';
import { useSyncStatus } from '@/lib/syncStatus';
import { createInvite, listMembers, removeMember, setMemberRole, startSharing, stopSharing, SyncError, type Member } from '@/lib/sync';
import { FONTS } from '@/lib/theme';
import type { ShareRole } from '@/lib/types';

const ROLE: Record<ShareRole, string> = { owner: 'Shared it', edit: 'Can edit', view: 'Can view' };
const msgOf = (e: unknown) => (e instanceof SyncError || e instanceof Error ? e.message : String(e));

export default function ShareScreen() {
  const { profile, palette, setSyncLink, syncNow, syncing } = useProfile();
  const sync = useSyncStatus();
  const link = profile.sync;
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<'edit' | 'view'>('edit');
  const [invite, setInvite] = useState<{ code: string; role: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState<'yes' | 'no' | ''>('');
  const [members, setMembers] = useState<Member[] | null>(null);

  const input = { height: 50, borderRadius: 12, borderWidth: 2, borderColor: palette.lineStrong, paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: 18, color: palette.ink, backgroundColor: palette.surface } as const;

  const loadMembers = useCallback(async () => {
    if (!link || link.status === 'removed') return;
    try { setMembers(await listMembers(link)); } catch { setMembers(null); }
  }, [link]);
  useEffect(() => {
    if (!link || link.status === 'removed') return;
    let live = true;
    listMembers(link).then((m) => { if (live) setMembers(m); }, () => { if (live) setMembers(null); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link?.boardId, link?.role, link?.status]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(msgOf(e)); } finally { setBusy(false); }
  };

  if (!link) {
    return (
      <SupporterShell title="Share this board">
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 24, maxWidth: 760 }}>
          <Card>
            <Row gap={14}>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="users" color={palette.accent} /></View>
              <View style={{ flex: 1 }}>
                <Txt display size={21}>Work on {profile.name}’s board together</Txt>
                <Txt soft size={16}>Invite a speech therapist, teacher or family member. They see the same board on their own phone, tablet or computer, and can help add and arrange words.</Txt>
              </View>
            </Row>
            {[
              ['wifi-off', 'The board always works offline. Changes are shared when a device is online, and edits made at the same time on two devices are both kept.'],
              ['shield', 'Only the board is shared: words, pictures, photos, recordings, phrases and the schedule. Message history and settings stay on this device.'],
              ['user-check', 'You choose who can edit and who can only look, and you can remove anyone or stop sharing at any time.'],
            ].map(([icon, t]) => (
              <Row key={icon} gap={12} style={{ borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10 }}>
                <Icon name={icon as 'shield'} size={22} color={palette.accent} />
                <Txt size={16} style={{ flex: 1 }}>{t}</Txt>
              </Row>
            ))}
          </Card>
          <Card>
            <Txt bold size={17}>Your name</Txt>
            <Txt soft size={14}>Shown to the people you invite, like “Maya’s mom”.</Txt>
            <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={palette.inkSoft} accessibilityLabel="Your name" style={input} autoComplete="name" />
            {error ? <Txt size={15} color={palette.danger}>{error}</Txt> : null}
            <Btn kind="primary" size="lg" icon="share-2" label={busy ? 'Starting…' : 'Start sharing'} disabled={busy || !name.trim()}
              onPress={() => run(async () => { setSyncLink(profile.id, await startSharing(profile, name.trim())); })} />
          </Card>
        </ScrollView>
      </SupporterShell>
    );
  }

  const status = { color: sync.kind === 'error' || sync.kind === 'removed' ? palette.danger : sync.kind === 'offline' ? palette.inkSoft : palette.accent };

  const makeInvite = () => run(async () => {
    const inv = await createInvite(link, role);
    setInvite(inv); setCopied('');
  });

  return (
    <SupporterShell title="Sharing" actions={
      <Btn icon="refresh-cw" label={syncing ? 'Sharing…' : 'Sync now'} disabled={syncing} onPress={() => { syncNow().then(loadMembers); }} />
    }>
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingBottom: 30, alignItems: 'flex-start' }}>
        <View style={{ flexGrow: 1, flexBasis: 320, minWidth: 0, gap: 14 }}>
          <Card>
            <Txt display size={19}>{profile.name}’s board is shared</Txt>
            <Txt soft size={15}>You: {link.memberName} · {ROLE[link.role]}</Txt>
            <Row gap={10} style={{ alignItems: 'flex-start' }}>
              {syncing ? <ActivityIndicator color={palette.accent} /> : <Icon name={sync.icon} size={22} color={status.color} />}
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={16}>{sync.long}</Txt>
                {link.status !== 'removed' ? <Txt soft size={14}>Last shared {ago(link.lastSync)}.</Txt> : null}
              </View>
            </Row>
            {link.role === 'view' && link.status !== 'removed' ? (
              <Txt soft size={15}>You can see this board and use it, but changes to words and pages aren’t saved. Ask {members?.find((m) => m.role === 'owner')?.name ?? 'the person who shared it'} for edit access.</Txt>
            ) : null}
            {link.status === 'removed' ? (
              <Btn label="Keep it as my own board" onPress={() => setSyncLink(profile.id, undefined)} />
            ) : null}
          </Card>

          {link.role === 'owner' && link.status !== 'removed' ? (
            <Card>
              <Txt display size={19}>Invite someone</Txt>
              <Txt soft size={15}>Create a code and send it to them. It works once and expires in 7 days.</Txt>
              <Segmented label="Access" value={role} onChange={(v) => { setRole(v); setInvite(null); }} options={[{ value: 'edit', label: 'Can edit' }, { value: 'view', label: 'Can view only' }]} />
              <Btn kind="primary" icon="user-plus" label={busy ? 'Creating…' : 'Create invite code'} disabled={busy} onPress={makeInvite} />
              {invite ? (
                <View style={{ backgroundColor: palette.accentSoft, borderRadius: 16, padding: 16, gap: 8, alignItems: 'center' }}>
                  <Txt soft size={14}>Invite code ({invite.role === 'view' ? 'can view' : 'can edit'})</Txt>
                  <Txt display size={36} selectable accessibilityLabel={`Invite code ${invite.code.split('').join(' ')}`} style={{ letterSpacing: 3 }}>{invite.code}</Txt>
                  <Txt soft size={14}>Expires {new Date(invite.expiresAt).toLocaleDateString()}</Txt>
                  <Btn icon={copied === 'yes' ? 'check' : 'copy'} label={copied === 'yes' ? 'Copied' : 'Copy code'}
                    onPress={async () => setCopied((await copyText(invite.code)) ? 'yes' : 'no')} />
                  {copied === 'no' ? <Txt size={14}>Couldn’t copy. Read the code out or write it down.</Txt> : null}
                </View>
              ) : null}
            </Card>
          ) : null}
          {error ? <Txt size={15} color={palette.danger}>{error}</Txt> : null}
        </View>

        <View style={{ flexGrow: 1, flexBasis: 320, minWidth: 0, gap: 14 }}>
          {link.status !== 'removed' ? (
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt display size={19}>People on this board</Txt>
                <Btn kind="plain" icon="refresh-cw" accessibilityLabel="Refresh list" onPress={loadMembers} />
              </Row>
              {members === null ? <Txt soft size={15}>Connect to the internet to see who has access.</Txt> : members.map((m) => (
                <View key={m.id} style={{ borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10, gap: 8 }}>
                  <Row>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt bold size={17}>{m.name.charAt(0).toUpperCase()}</Txt>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt bold size={17}>{m.name}{m.me ? ' (you)' : ''}</Txt>
                      <Txt soft size={14}>{ROLE[m.role]} · active {ago(m.lastSeen)}</Txt>
                    </View>
                  </Row>
                  {link.role === 'owner' && m.role !== 'owner' ? (
                    <Row gap={8} style={{ flexWrap: 'wrap' }}>
                      <Segmented label={`Access for ${m.name}`} value={m.role as 'edit' | 'view'} onChange={(v) => run(async () => { await setMemberRole(link, m.id, v); await loadMembers(); })}
                        options={[{ value: 'edit', label: 'Can edit' }, { value: 'view', label: 'Can view' }]} />
                      <Btn kind="danger" icon="user-x" label="Remove" onPress={async () => {
                        if (!(await confirm(`Remove ${m.name}?`, `${m.name} will no longer see changes to ${profile.name}’s board. Their own copy stays on their device.`, 'Remove', true))) return;
                        run(async () => { await removeMember(link, m.id); await loadMembers(); });
                      }} />
                    </Row>
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}

          <Card>
            {link.role === 'owner' ? (
              <>
                <Txt display size={18}>Stop sharing</Txt>
                <Txt soft size={15}>Deletes the shared copy from the server. Everyone keeps the copy on their own device, but changes are no longer shared.</Txt>
                <Btn kind="danger" label="Stop sharing" disabled={busy} onPress={async () => {
                  if (!(await confirm('Stop sharing?', `Nobody else will receive changes to ${profile.name}’s board. This can’t be undone, but you can share again later with new codes.`, 'Stop sharing', true))) return;
                  run(async () => {
                    await stopSharing(link).catch((e) => { if (!(e instanceof SyncError && e.kind === 'removed')) throw e; });
                    setSyncLink(profile.id, undefined); setMembers(null); setInvite(null);
                  });
                }} />
              </>
            ) : link.status !== 'removed' ? (
              <>
                <Txt display size={18}>Leave this board</Txt>
                <Txt soft size={15}>You stop receiving changes. A copy of the board stays on this device.</Txt>
                <Btn kind="danger" label="Leave" disabled={busy} onPress={async () => {
                  if (!(await confirm('Leave this board?', 'You can join again later with a new invite code.', 'Leave', true))) return;
                  run(async () => {
                    await removeMember(link, link.memberId).catch((e) => { if (!(e instanceof SyncError && e.kind === 'removed')) throw e; });
                    setSyncLink(profile.id, undefined);
                  });
                }} />
              </>
            ) : null}
          </Card>
        </View>
      </ScrollView>
    </SupporterShell>
  );
}
