// Family voice recordings: saved into the app's document folder, played instead of the synthetic voice.
import { Directory, File, Paths } from 'expo-file-system';

export async function keepRecording(tempUri: string): Promise<string> {
  const dir = new Directory(Paths.document, 'recordings');
  if (!dir.exists) dir.create({ intermediates: true });
  const ext = tempUri.split('.').pop()?.split('?')[0] || 'm4a';
  const dest = new File(dir, `rec-${Date.now()}.${ext}`);
  await new File(tempUri).copy(dest);
  return dest.uri;
}

export function deleteRecording(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // already gone
  }
}
