// Web: photos are resized and kept as small data URLs inside IndexedDB with the rest of the board.
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export async function choosePhoto(source: 'library' | 'camera'): Promise<string | null> {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.length) return null;
  const small = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 512 } }], { compress: 0.75, format: SaveFormat.JPEG, base64: true });
  return small.base64 ? `data:image/jpeg;base64,${small.base64}` : small.uri;
}

export function deletePhoto(_uri: string) {
  // Data URLs are removed with the word itself.
}
