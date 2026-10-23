// Native persistence: a single JSON document in AsyncStorage (a file in the app sandbox).
// Nothing is sent off the device.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pictotalk:state:v1';

export async function loadState<T>(): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveState<T>(state: T): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable: keep running from memory.
  }
}
