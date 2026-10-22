import { Alert, Platform, Share } from 'react-native';

/** Yes/no question that works on phones, tablets and the web. */
export function confirm(title: string, message: string, ok: string, destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: ok, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export function notify(title: string, message: string) {
  if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`); return; }
  Alert.alert(title, message);
}

/** Share sheet where there is one; otherwise copy to the clipboard. Returns what happened. */
export async function shareText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      try { await nav.share({ text }); return 'shared'; } catch (e) { if ((e as Error)?.name === 'AbortError') return 'failed'; }
    }
    try { await nav?.clipboard?.writeText(text); return 'copied'; } catch { return 'failed'; }
  }
  try { await Share.share({ message: text }); return 'shared'; } catch { return 'failed'; }
}

export function ago(ms?: number | string): string {
  if (!ms) return 'never';
  const t = typeof ms === 'string' ? new Date(ms).getTime() : ms;
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} day${d === 1 ? '' : 's'} ago` : new Date(t).toLocaleDateString();
}
