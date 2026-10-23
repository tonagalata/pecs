// Native: save a backup through the share sheet (iOS: Save to Files, AirDrop, Mail) or into a
// folder the person picks (Android), and open one with the system file picker.
import { Platform, Share } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

export async function saveBackupFile(name: string, json: string): Promise<'saved' | 'cancelled'> {
  if (Platform.OS === 'android') {
    let dir: Directory;
    try { dir = await Directory.pickDirectoryAsync(); } catch { return 'cancelled'; }
    const f = dir.createFile(name, 'application/json');
    f.write(json);
    return 'saved';
  }
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.write(json);
  const r = await Share.share({ url: f.uri, title: name });
  return r.action === Share.dismissedAction ? 'cancelled' : 'saved';
}

export async function openBackupFile(): Promise<string | null> {
  const res = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (res.canceled) return null;
  return await res.result.text();
}
