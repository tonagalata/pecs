// Native: photos and recordings are files in the app's document folder.
import { Directory, File, Paths } from 'expo-file-system';

export interface MediaBytes { bytes: Uint8Array; type: string }

const TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', m4a: 'audio/mp4', mp4: 'audio/mp4', caf: 'audio/x-caf', aac: 'audio/aac', mp3: 'audio/mpeg', wav: 'audio/wav', webm: 'audio/webm', '3gp': 'audio/3gpp' };
const EXT: Record<string, string> = Object.fromEntries(Object.entries(TYPES).reverse().map(([e, t]) => [t, e]));

export async function readMedia(uri: string): Promise<MediaBytes | null> {
  try {
    const f = new File(uri);
    if (!f.exists) return null;
    const ext = (uri.split('?')[0].split('.').pop() ?? '').toLowerCase();
    return { bytes: await f.bytes(), type: TYPES[ext] ?? 'application/octet-stream' };
  } catch {
    return null;
  }
}

/** Saves bytes received from a shared board or a backup; returns the uri to put on the word. */
export async function writeMedia(id: string, data: MediaBytes): Promise<string> {
  const folder = data.type.startsWith('audio/') ? 'recordings' : 'photos';
  const dir = new Directory(Paths.document, folder);
  if (!dir.exists) dir.create({ intermediates: true });
  const f = new File(dir, `shared-${id}.${EXT[data.type] ?? 'bin'}`);
  if (!f.exists) f.write(data.bytes);
  return f.uri;
}
