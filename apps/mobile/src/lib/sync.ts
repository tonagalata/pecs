// Sharing a board with therapists, teachers and family, and keeping every copy in step.
//
// Each device keeps its own full copy and the board always works offline. When a device is online
// it exchanges changes with the PictoTalk server (server/api.mjs): it sends what changed here,
// takes what changed elsewhere, and merges the two (src/lib/doc.ts), so edits made at the same
// time on different devices are all kept. Photos and recordings travel separately as media ids.
import { Platform } from 'react-native';
import { cleanDoc, equal, extractDoc, hashString, isDoc, merge3, type BoardDoc } from './doc';
import { readMedia, writeMedia } from './media';
import type { Profile, ShareRole, SyncLink } from './types';

export const SYNC_URL = (process.env.EXPO_PUBLIC_SYNC_URL
  ?? (Platform.OS === 'web' && typeof location !== 'undefined' ? location.origin : 'https://pictotalk.org')).replace(/\/$/, '');

export class SyncError extends Error {
  constructor(public kind: 'offline' | 'removed' | 'denied' | 'error', message: string, public status = 0) { super(message); }
}

interface Member { id: string; name: string; role: ShareRole; joinedAt: string; lastSeen: string; me: boolean }

async function call<T>(server: string, path: string, opts: { method?: string; token?: string; body?: unknown; raw?: { bytes: Uint8Array; type: string } } = {}): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let body: BodyInit | undefined;
  if (opts.raw) { headers['Content-Type'] = opts.raw.type; body = opts.raw.bytes as unknown as BodyInit; }
  else if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body); }
  let res: Response;
  try {
    res = await fetch(`${server}/api${path}`, { method: opts.method ?? 'GET', headers, body });
  } catch {
    throw new SyncError('offline', 'No connection. Changes are saved on this device and will be shared when it is back online.');
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.ok || res.status === 409) return { status: res.status, data };
  const msg = data?.error ?? `Server error (${res.status})`;
  if (res.status === 401 || (res.status === 403 && /No access/.test(msg))) throw new SyncError('removed', msg, res.status);
  if (res.status === 403) throw new SyncError('denied', msg, res.status);
  if (res.status === 503) throw new SyncError('error', msg, res.status);
  throw new SyncError('error', msg, res.status);
}

// --- Photos and recordings ------------------------------------------------------------------------

const REF = 'media:';
type Uploader = (id: string, uri: string) => Promise<void>;

function eachMedia(doc: BoardDoc, fn: (uri: string) => string): BoardDoc {
  const words: BoardDoc['words'] = {};
  for (const [id, w] of Object.entries(doc.words)) {
    let next = w;
    if (w.symbol.kind === 'photo') { const u = fn(w.symbol.uri); if (u !== w.symbol.uri) next = { ...next, symbol: { kind: 'photo', uri: u } }; }
    if (w.recording) { const u = fn(w.recording); if (u !== w.recording) next = { ...next, recording: u }; }
    words[id] = next;
  }
  return { ...doc, words };
}

/** Replace this device's photo/recording uris with media ids, uploading any the server lacks. */
async function toRemote(doc: BoardDoc, media: Record<string, string>, upload: Uploader | null): Promise<{ doc: BoardDoc; media: Record<string, string>; pending: [string, string][] }> {
  const byUri = new Map(Object.entries(media).map(([id, uri]) => [uri, id]));
  const out = { ...media };
  const pending: [string, string][] = [];
  const remote = eachMedia(doc, (uri) => {
    if (!uri || uri.startsWith(REF)) return uri;
    let id = byUri.get(uri);
    if (!id) { id = hashString(uri); pending.push([id, uri]); byUri.set(uri, id); }
    return REF + id;
  });
  if (upload) {
    for (const [id, uri] of pending) { await upload(id, uri); out[id] = uri; }
  }
  return { doc: remote, media: out, pending };
}

/** Replace media ids with files on this device, downloading the ones it doesn't have yet. */
async function toLocal(doc: BoardDoc, link: Pick<SyncLink, 'server' | 'boardId' | 'token'>, media: Record<string, string>): Promise<{ doc: BoardDoc; media: Record<string, string> }> {
  const out = { ...media };
  const need = new Set<string>();
  eachMedia(doc, (uri) => { if (uri.startsWith(REF) && !out[uri.slice(REF.length)]) need.add(uri.slice(REF.length)); return uri; });
  for (const id of need) {
    try {
      const res = await fetch(`${link.server}/api/boards/${link.boardId}/media/${id}`, { headers: { Authorization: `Bearer ${link.token}` } });
      if (!res.ok) continue;
      const type = res.headers.get('content-type') ?? 'application/octet-stream';
      out[id] = await writeMedia(id, { bytes: new Uint8Array(await res.arrayBuffer()), type });
    } catch {
      // Offline: shown without the photo / with the device voice until the next sync.
    }
  }
  return { doc: eachMedia(doc, (uri) => (uri.startsWith(REF) && out[uri.slice(REF.length)] ? out[uri.slice(REF.length)] : uri)), media: out };
}

function uploader(link: Pick<SyncLink, 'server' | 'boardId' | 'token'>): Uploader {
  return async (id, uri) => {
    const data = await readMedia(uri);
    if (!data) return; // the file is gone; the word keeps its picture fallback
    await call(link.server, `/boards/${link.boardId}/media/${id}`, { method: 'PUT', token: link.token, raw: data });
  };
}

// --- Starting, joining, managing ------------------------------------------------------------------

export async function startSharing(p: Profile, ownerName: string, server = SYNC_URL): Promise<SyncLink> {
  const local = extractDoc(p);
  const { doc, pending } = await toRemote(local, {}, null);
  const { data } = await call<{ boardId: string; token: string; rev: number; me: { id: string; name: string } }>(server, '/boards', { method: 'POST', body: { doc, name: ownerName } });
  const link: SyncLink = { server, boardId: data.boardId, token: data.token, role: 'owner', memberId: data.me.id, memberName: data.me.name, rev: data.rev, base: doc, media: {}, lastSync: Date.now(), status: 'ok' };
  const up = uploader(link);
  for (const [id, uri] of pending) { await up(id, uri).catch(() => {}); link.media[id] = uri; }
  return link;
}

export async function joinBoard(code: string, name: string, server = SYNC_URL): Promise<{ link: SyncLink; doc: BoardDoc }> {
  const { data } = await call<{ boardId: string; token: string; role: ShareRole; rev: number; doc: unknown; me: { id: string; name: string } }>(server, '/join', { method: 'POST', body: { code, name } });
  if (!isDoc(data.doc)) throw new SyncError('error', 'The shared board could not be read.');
  const remote = cleanDoc(data.doc);
  const base: SyncLink = { server, boardId: data.boardId, token: data.token, role: data.role, memberId: data.me.id, memberName: data.me.name, rev: data.rev, base: remote, media: {}, lastSync: Date.now(), status: 'ok' };
  const { doc, media } = await toLocal(remote, base, {});
  return { link: { ...base, media }, doc };
}

export async function createInvite(link: SyncLink, role: 'edit' | 'view') {
  return (await call<{ code: string; role: string; expiresAt: string }>(link.server, `/boards/${link.boardId}/invites`, { method: 'POST', token: link.token, body: { role } })).data;
}

export async function listMembers(link: SyncLink): Promise<Member[]> {
  return (await call<{ members: Member[] }>(link.server, `/boards/${link.boardId}/members`, { token: link.token })).data.members;
}

export async function setMemberRole(link: SyncLink, memberId: string, role: 'edit' | 'view') {
  await call(link.server, `/boards/${link.boardId}/members/${memberId}`, { method: 'PATCH', token: link.token, body: { role } });
}

export async function removeMember(link: SyncLink, memberId: string) {
  await call(link.server, `/boards/${link.boardId}/members/${memberId}`, { method: 'DELETE', token: link.token });
}

/** Owner: delete the shared copy. Everyone keeps the copy on their own device. */
export async function stopSharing(link: SyncLink) {
  await call(link.server, `/boards/${link.boardId}`, { method: 'DELETE', token: link.token });
}

export type { Member };

// --- Sync ----------------------------------------------------------------------------------------

export interface SyncResult {
  /** The merged board, with this device's photo and recording uris. */
  doc: BoardDoc;
  /** What this device sent (to merge in any edits made while the sync was running). */
  sent: BoardDoc;
  link: SyncLink;
  changed: boolean;
}

export async function syncOnce(p: Profile): Promise<SyncResult> {
  const link = p.sync;
  if (!link) throw new SyncError('error', 'Not shared');
  const sent = extractDoc(p);
  const base = isDoc(link.base) ? cleanDoc(link.base) : null;

  // Viewers only take the shared copy.
  if (link.role === 'view') {
    const { data } = await call<{ rev: number; unchanged?: boolean; doc?: unknown; role: ShareRole }>(link.server, `/boards/${link.boardId}?rev=${link.rev}`, { token: link.token });
    const role = data.role ?? link.role;
    if (data.unchanged && base) {
      const { doc, media } = await toLocal(base, link, link.media);
      return { doc, sent, link: { ...link, role, media, lastSync: Date.now(), status: 'ok', error: undefined }, changed: !equal(doc, sent) };
    }
    if (!isDoc(data.doc)) throw new SyncError('error', 'The shared board could not be read.');
    const remote = cleanDoc(data.doc);
    const { doc, media } = await toLocal(remote, link, link.media);
    return { doc, sent, link: { ...link, role, rev: data.rev, base: remote, media, lastSync: Date.now(), status: 'ok', error: undefined }, changed: true };
  }

  const { doc: mine, media: uploaded } = await toRemote(sent, link.media, uploader(link));
  const got = await call<{ rev: number; unchanged?: boolean; doc?: unknown; role: ShareRole }>(link.server, `/boards/${link.boardId}?rev=${link.rev}`, { token: link.token });
  let role = got.data.role ?? link.role;
  let theirs: BoardDoc, rev: number;
  if (got.data.unchanged && base) { theirs = base; rev = link.rev; }
  else {
    if (!isDoc(got.data.doc)) throw new SyncError('error', 'The shared board could not be read.');
    theirs = cleanDoc(got.data.doc); rev = got.data.rev;
  }
  let merged = merge3(base ?? theirs, mine, theirs);
  // Someone else may save in between; take their version and merge again.
  for (let i = 0; i < 4 && !equal(merged, theirs) && (role === 'edit' || role === 'owner'); i++) {
    const put = await call<{ rev: number; doc?: unknown }>(link.server, `/boards/${link.boardId}`, { method: 'PUT', token: link.token, body: { doc: merged, baseRev: rev } })
      .catch((e: unknown) => {
        // Access was changed to view-only: stop sending, keep what's on the server.
        if (e instanceof SyncError && e.kind === 'denied') { role = 'view'; return null; }
        throw e;
      });
    if (!put) { merged = theirs; break; }
    if (put.status === 200) { rev = put.data.rev; theirs = merged; break; }
    theirs = cleanDoc(put.data.doc as BoardDoc);
    rev = put.data.rev;
    merged = merge3(base ?? theirs, mine, theirs);
  }
  // Still conflicting after several tries: keep everything as it is here and try again later.
  if (!equal(merged, theirs)) throw new SyncError('error', 'The board is being changed on another device. Trying again shortly.');
  const { doc, media } = await toLocal(merged, link, uploaded);
  return {
    doc, sent,
    link: { ...link, role, rev, base: merged, media, lastSync: Date.now(), status: 'ok', error: undefined },
    changed: !equal(doc, sent),
  };
}
