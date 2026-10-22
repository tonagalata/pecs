import type { Group, ThemeName } from './theme';

/** Where a word's picture comes from. Photos and recordings never leave the device. */
export type SymbolRef =
  | { kind: 'arasaac'; id: number }
  | { kind: 'builtin'; key: string }
  | { kind: 'photo'; uri: string }
  | { kind: 'none' };

export interface Word {
  id: string;
  label: string;
  /** What is spoken, when it differs from the label ("a break" vs "break"). */
  say?: string;
  group: Group;
  symbol: SymbolRef;
  /** Keyword used to look up an ARASAAC pictogram when no id is known yet. */
  lookup?: string;
  /** Built-in symbol used offline before an ARASAAC symbol has been cached. */
  fallback?: string;
  /** On-device recording (file uri on native, data URL on web). */
  recording?: string;
  /** Hidden words keep their cell so motor plans are never disturbed. */
  hidden?: boolean;
}

/** A page is a fixed grid. Cells are keyed "row:col" so resizing never moves words. */
export interface Page {
  id: string;
  name: string;
  iconWord?: string;
  cols: number;
  rows: number;
  cells: Record<string, string>;
}

export type Level = 'young' | 'teen' | 'adult';

export interface ScheduleItem {
  id: string;
  label: string;
  time?: string;
  symbol: SymbolRef;
  fallback?: string;
}

export interface Settings {
  voiceId?: string;
  rate: number;
  onTap: 'word' | 'message' | 'silent';
  hdVoice: boolean;
  textPos: 'below' | 'above' | 'words' | 'pictures';
  textSize: 'M' | 'L' | 'XL';
  theme: ThemeName;
  reduceMotion: boolean;
  highlight: boolean;
  selectMode: 'tap' | 'release' | 'hold';
  holdMs: number;
  debounceMs: number;
  extraGap: boolean;
  lock: 'sum' | 'pin';
  pin?: string;
  selfManage: boolean;
  symbolSet: 'arasaac' | 'pictotalk';
  showTimes: boolean;
  keyboardLayout: 'qwerty' | 'abc';
  keepHistory: boolean;
}

export type ShareRole = 'owner' | 'edit' | 'view';

/** This board is shared: how this device reaches the shared copy. See src/lib/sync.ts. */
export interface SyncLink {
  server: string;
  boardId: string;
  /** Secret for this device. Never exported in backups. */
  token: string;
  role: ShareRole;
  memberId: string;
  memberName: string;
  /** Server revision of `base`. */
  rev: number;
  /** The shared board as last agreed with the server (photos and recordings as media ids). */
  base: unknown;
  /** Media id -> file uri (native) or data URL (web) on this device. */
  media: Record<string, string>;
  lastSync?: number;
  status?: 'ok' | 'offline' | 'error' | 'removed';
  error?: string;
}

export interface Profile {
  id: string;
  name: string;
  level: Level;
  words: Record<string, Word>;
  pages: Page[];
  phrases: string[];
  schedule: ScheduleItem[];
  scheduleIndex: number;
  scheduleNote?: string;
  history: string[];
  settings: Settings;
  sync?: SyncLink;
}

export interface AppState {
  version: 1;
  profiles: Profile[];
  activeId: string | null;
  /** keyword -> ARASAAC pictogram id, resolved once online and reused offline. */
  arasaacIds: Record<string, number>;
}
