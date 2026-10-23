// Backups: move a board to a new phone, tablet or computer, or keep a copy somewhere safe.
// A backup is one JSON file with the boards, their settings, and their photos and recordings.
// Message history and sharing access are never included.
import { toBase64, fromBase64 } from './base64';
import { hashString } from './doc';
import { normalizePage } from './grid';
import { readMedia, writeMedia } from './media';
import type { AppState, Profile } from './types';
import { DEFAULT_SETTINGS, uid } from './vocab';

export const BACKUP_FORMAT = 'pictotalk-backup';

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  profiles: Profile[];
  arasaacIds: Record<string, number>;
  media: Record<string, { type: string; data: string }>;
}

const REF = 'media:';

function mapMedia(p: Profile, fn: (uri: string) => string): Profile {
  const words: Profile['words'] = {};
  for (const [id, w] of Object.entries(p.words)) {
    let next = w;
    if (w.symbol.kind === 'photo' && w.symbol.uri) next = { ...next, symbol: { kind: 'photo', uri: fn(w.symbol.uri) } };
    if (w.recording) next = { ...next, recording: fn(w.recording) };
    words[id] = next;
  }
  return { ...p, words };
}

export async function buildBackup(state: AppState, profileIds: string[]): Promise<BackupFile> {
  const media: BackupFile['media'] = {};
  const uris = new Map<string, string>();
  const profiles: Profile[] = [];
  for (const p of state.profiles.filter((x) => profileIds.includes(x.id))) {
    const { sync: _sync, ...rest } = p;
    const clean: Profile = { ...rest, history: [], settings: { ...rest.settings } };
    mapMedia(clean, (uri) => { if (!uri.startsWith(REF)) uris.set(uri, hashString(uri)); return uri; });
    profiles.push(clean);
  }
  for (const [uri, id] of uris) {
    const m = await readMedia(uri);
    if (m) media[id] = { type: m.type, data: toBase64(m.bytes) };
  }
  return {
    format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(),
    profiles: profiles.map((p) => mapMedia(p, (uri) => (uris.has(uri) && media[uris.get(uri)!] ? REF + uris.get(uri) : uri))),
    arasaacIds: state.arasaacIds, media,
  };
}

export function parseBackup(text: string): BackupFile {
  let data: BackupFile;
  try { data = JSON.parse(text); } catch { throw new Error('This file isn’t a PictoTalk backup.'); }
  if (data?.format !== BACKUP_FORMAT || !Array.isArray(data.profiles)) throw new Error('This file isn’t a PictoTalk backup.');
  if (data.version > 1) throw new Error('This backup was made by a newer version of PictoTalk. Update the app, then try again.');
  data.profiles = data.profiles.filter((p) => p && typeof p.words === 'object' && Array.isArray(p.pages));
  if (!data.profiles.length) throw new Error('There are no boards in this file.');
  return data;
}

/** Turns a profile from a backup into one for this device (photos and recordings saved here). */
export async function restoreProfile(file: BackupFile, p: Profile, newId: boolean): Promise<Profile> {
  const saved = new Map<string, string>();
  for (const id of Object.keys(file.media)) {
    const uses = JSON.stringify(p.words).includes(REF + id);
    if (!uses) continue;
    const m = file.media[id];
    saved.set(id, await writeMedia(id, { type: m.type, bytes: fromBase64(m.data) }));
  }
  const restored = mapMedia(p, (uri) => (uri.startsWith(REF) ? saved.get(uri.slice(REF.length)) ?? '' : uri));
  return {
    ...restored,
    id: newId ? uid('p') : p.id,
    phrases: restored.phrases ?? [],
    schedule: restored.schedule ?? [],
    scheduleIndex: 0,
    history: [],
    pages: restored.pages.map((pg) => normalizePage({ ...pg, cells: pg.cells ?? {} })),
    settings: { ...DEFAULT_SETTINGS, ...restored.settings },
    sync: undefined,
  };
}

export function backupName(state: AppState, ids: string[]): string {
  const day = new Date().toISOString().slice(0, 10);
  const who = ids.length === 1 ? state.profiles.find((p) => p.id === ids[0])?.name ?? 'board' : 'everyone';
  return `pictotalk-${who.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'board'}-${day}.json`;
}
