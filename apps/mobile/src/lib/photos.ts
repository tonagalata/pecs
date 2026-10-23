// Photos are resized and copied into the app's own document folder. They never leave the device.
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';

const SIZE = 512;

async function pick(source: 'library' | 'camera'): Promise<string | null> {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0].uri;
}

export async function choosePhoto(source: 'library' | 'camera'): Promise<string | null> {
  const uri = await pick(source);
  if (!uri) return null;
  const small = await manipulateAsync(uri, [{ resize: { width: SIZE } }], { compress: 0.8, format: SaveFormat.JPEG });
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = new File(dir, `photo-${Date.now()}.jpg`);
  await new File(small.uri).copy(dest);
  return dest.uri;
}

export function deletePhoto(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // already gone
  }
}
