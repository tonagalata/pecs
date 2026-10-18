import type { Group } from './theme';
import type { Level, Page, Profile, ScheduleItem, Settings, SymbolRef, Word } from './types';

/**
 * Master vocabulary. [label, group, builtin symbol key, known ARASAAC id?, spoken text?]
 * ARASAAC ids come from the original PictoTalk seed data; words without an id are
 * looked up once by keyword (see symbols.ts) and cached on the device.
 */
type Def = [string, Group, string, number?, string?];

const D: Record<string, Def> = {
  i: ['I', 'pron', 'i'], you: ['you', 'pron', 'you'], we: ['we', 'pron', 'we'], he: ['he', 'pron', 'he'],
  she: ['she', 'pron', 'she'], they: ['they', 'pron', 'we'], me: ['me', 'pron', 'i'], my: ['my', 'pron', 'i'],
  your: ['your', 'pron', 'you'],
  mom: ['Mom', 'pron', 'mom', 2458], dad: ['Dad', 'pron', 'dad', 31146], teacher: ['teacher', 'pron', 'teacher', 6556],
  friend: ['friend', 'pron', 'friend'], doctor_p: ['doctor', 'pron', 'doctor', 6561], sister: ['sister', 'pron', 'she', 2422],
  brother: ['brother', 'pron', 'he', 2423],
  want: ['want', 'verb', 'want', 7650], need: ['need', 'verb', 'need', 5023], go: ['go', 'verb', 'go'],
  eat: ['eat', 'verb', 'eat'], drink: ['drink', 'verb', 'drink', 6061], like: ['like', 'verb', 'like'],
  play: ['play', 'verb', 'play', 23392], look: ['look', 'verb', 'look'], feel: ['feel', 'verb', 'feel'],
  think: ['think', 'verb', 'think'], know: ['know', 'verb', 'know'], can: ['can', 'verb', 'go'],
  read: ['read', 'verb', 'read', 7141], draw: ['draw', 'verb', 'draw', 4951], swim: ['swim', 'verb', 'swim'],
  walk: ['walk', 'verb', 'walk', 29951], sleep: ['sleep', 'verb', 'sleep', 6479], help: ['help', 'urgent', 'help', 4997],
  stop: ['stop', 'urgent', 'stop', 5466], brk: ['break', 'urgent', 'break', undefined, 'a break'],
  hurt: ['hurt', 'urgent', 'hurt'], more: ['more', 'desc', 'more', 3833], not: ['not', 'desc', 'not'],
  dont: ["don't", 'desc', 'not'], finished: ['finished', 'desc', 'finished', 3766], different: ['different', 'desc', 'different'],
  now: ['now', 'desc', 'now'], later: ['later', 'desc', 'later'], here: ['here', 'desc', 'here'], there: ['there', 'desc', 'there'],
  quiet: ['quiet', 'desc', 'quiet'], tired: ['tired', 'desc', 'tired', 35537], sick: ['sick', 'desc', 'sick', 7040],
  hot: ['hot', 'desc', 'hot'], cold: ['cold', 'desc', 'cold'], big: ['big', 'desc', 'big'], little: ['little', 'desc', 'little'],
  yes: ['yes', 'social', 'yes', 5827], no: ['no', 'social', 'no', 5464], please: ['please', 'social', 'please'],
  thanks: ['thank you', 'social', 'thankyou'],
  what: ['what', 'q', 'what'], where: ['where', 'q', 'where'], when: ['when', 'q', 'when'], who: ['who', 'q', 'who'],
  why: ['why', 'q', 'what'], how: ['how', 'q', 'what'], because: ['because', 'misc', 'because'],
  bathroom: ['bathroom', 'noun', 'bathroom', 5921], home: ['home', 'noun', 'home', 6964], school: ['school', 'noun', 'school', 32446],
  outside: ['outside', 'noun', 'outside', 5475], shop: ['shop', 'noun', 'shop', 35695], park: ['park', 'noun', 'park'],
  car: ['car', 'noun', 'car'], bus: ['bus', 'noun', 'bus'], doctor: ['doctor', 'noun', 'doctor', 6561], dentist: ['dentist', 'noun', 'dentist'],
  bedroom: ['bedroom', 'noun', 'sleep'], work: ['work', 'noun', 'school'],
  apple: ['apple', 'noun', 'apple', 2462], banana: ['banana', 'noun', 'banana', 2530], sandwich: ['sandwich', 'noun', 'sandwich', 2281],
  cookie: ['cookie', 'noun', 'cookie', 8312], pizza: ['pizza', 'noun', 'pizza'], cereal: ['cereal', 'noun', 'cereal'],
  snack: ['snack', 'noun', 'snack'], water: ['water', 'noun', 'water'], juice: ['juice', 'noun', 'juice', 11461], milk: ['milk', 'noun', 'milk'],
  music: ['music', 'noun', 'music', 24791], tablet: ['tablet', 'noun', 'tablet', 28099], tv: ['TV', 'noun', 'tv'],
  toy: ['toys', 'noun', 'toy', 9813], bath: ['bath', 'noun', 'bath'], head: ['head', 'noun', 'head'], stomach: ['stomach', 'noun', 'tummy'],
  medicine: ['medicine', 'noun', 'sick'], loud: ['too loud', 'desc', 'quiet'],
};

export function makeWord(id: string): Word {
  const [label, group, fallback, arasaac, say] = D[id];
  const symbol: SymbolRef = arasaac ? { kind: 'arasaac', id: arasaac } : { kind: 'none' };
  return { id, label, group, symbol, fallback, lookup: label, ...(say ? { say } : {}) };
}

function page(id: string, name: string, cols: number, rows: number, grid: (string | null)[][], iconWord?: string): Page {
  const cells: Record<string, string> = {};
  grid.forEach((row, r) => row.forEach((w, c) => { if (w) cells[`${r}:${c}`] = w; }));
  return { id, name, cols, rows, cells, iconWord };
}

/** Fill a fringe page row by row; the remaining cells stay empty for words added later. */
function fringe(id: string, name: string, cols: number, rows: number, words: string[], iconWord: string): Page {
  const grid: (string | null)[][] = [];
  for (let r = 0; r < rows; r++) grid.push(words.slice(r * cols, r * cols + cols));
  return page(id, name, cols, rows, grid, iconWord);
}

const CORE_6x4 = [
  ['i', 'want', 'go', 'more', 'yes', 'help'],
  ['you', 'need', 'eat', 'drink', 'no', 'stop'],
  ['like', 'not', 'play', 'look', 'finished', 'brk'],
  ['feel', 'where', 'what', 'bathroom', 'home', 'hurt'],
];

const CORE_8x5 = [
  ['i', 'you', 'we', 'want', 'need', 'like', 'dont', 'yes'],
  ['go', 'stop', 'help', 'feel', 'think', 'know', 'can', 'no'],
  ['more', 'different', 'finished', 'now', 'later', 'here', 'there', 'please'],
  ['what', 'where', 'when', 'who', 'why', 'how', 'because', 'thanks'],
  ['brk', 'quiet', 'hurt', 'tired', 'eat', 'drink', 'bathroom', 'home'],
];

export const DEFAULT_SETTINGS: Settings = {
  rate: 0.95, onTap: 'word', hdVoice: false, textPos: 'below', textSize: 'L', theme: 'light',
  reduceMotion: true, highlight: true, selectMode: 'tap', holdMs: 600, debounceMs: 500, extraGap: false,
  lock: 'sum', selfManage: false, symbolSet: 'arasaac', showTimes: true, keyboardLayout: 'qwerty', keepHistory: false,
};

const DEFAULT_SCHEDULE: [string, string, string][] = [
  ['7:30', 'Breakfast', 'cereal'], ['8:00', 'Get dressed', 'shirt'], ['8:20', 'Bus to school', 'bus'],
  ['9:00', 'Reading', 'read'], ['12:00', 'Lunch', 'sandwich'], ['3:30', 'Park', 'park'],
  ['5:00', 'Home', 'home'], ['7:00', 'Bath and bed', 'sleep'],
];

let counter = 0;
export function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createProfile(name: string, level: Level): Profile {
  let pages: Page[];
  let hide: string[] = [];
  let ids: string[];
  if (level === 'adult') {
    pages = [
      page('core', 'Main words', 8, 5, CORE_8x5, 'i'),
      fringe('people', 'People', 8, 5, ['mom', 'dad', 'he', 'she', 'they', 'friend', 'doctor_p', 'teacher', 'my', 'your'], 'friend'),
      fringe('places', 'Places', 8, 5, ['home', 'school', 'work', 'shop', 'outside', 'park', 'car', 'bus', 'bathroom', 'bedroom', 'doctor', 'dentist'], 'home'),
      fringe('health', 'Body & health', 8, 5, ['sick', 'hurt', 'head', 'stomach', 'tired', 'sleep', 'hot', 'cold', 'water', 'medicine', 'loud'], 'hurt'),
    ];
  } else {
    pages = [
      page('core', 'Main', 6, 4, CORE_6x4, 'i'),
      fringe('food', 'Food', 6, 4, ['apple', 'banana', 'sandwich', 'cookie', 'pizza', 'cereal', 'snack', 'water', 'juice', 'milk'], 'apple'),
      fringe('people', 'People', 6, 4, ['mom', 'dad', 'sister', 'brother', 'teacher', 'friend', 'doctor_p', 'me'], 'friend'),
      fringe('places', 'Places', 6, 4, ['home', 'school', 'outside', 'shop', 'park', 'car', 'bus', 'bathroom'], 'home'),
      fringe('play', 'Play', 6, 4, ['music', 'tablet', 'tv', 'toy', 'read', 'draw', 'swim', 'walk', 'bath', 'sleep'], 'toy'),
    ];
    if (level === 'young') hide = ['like', 'not', 'look', 'feel', 'where', 'what'];
  }
  ids = Array.from(new Set(pages.flatMap((p) => Object.values(p.cells))));
  const words: Record<string, Word> = {};
  for (const id of ids) words[id] = { ...makeWord(id), ...(hide.includes(id) ? { hidden: true } : {}) };
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    selfManage: level === 'adult',
    textSize: level === 'young' ? 'XL' : 'L',
  };
  const phrases = level === 'young' ? [] : [
    'I need a minute.', 'Please give me some space.', "I understand, I just can't talk right now.",
    'Can you write it down?', 'Please speak more slowly.', 'Yes, please.', 'No, thank you.',
  ];
  return {
    id: uid('p'), name: name.trim() || 'Me', level, words, pages, phrases,
    schedule: DEFAULT_SCHEDULE.map(([time, label, key]) => ({ id: uid('s'), time, label, symbol: { kind: 'none' }, fallback: key } as ScheduleItem)),
    scheduleIndex: 0, history: [], settings,
  };
}

/** Feelings check-in vocabulary (fixed set, shown on its own screen). */
export const FEELINGS: { id: string; label: string; key: string; arasaac?: number }[] = [
  { id: 'happy', label: 'happy', key: 'happy', arasaac: 35533 }, { id: 'calm', label: 'calm', key: 'calm' },
  { id: 'excited', label: 'excited', key: 'excited' }, { id: 'tired', label: 'tired', key: 'tired', arasaac: 35537 },
  { id: 'sad', label: 'sad', key: 'sad', arasaac: 35545 }, { id: 'angry', label: 'angry', key: 'angry', arasaac: 35539 },
  { id: 'scared', label: 'scared', key: 'scared', arasaac: 35535 }, { id: 'overwhelmed', label: 'overwhelmed', key: 'overwhelmed' },
  { id: 'sick', label: 'sick', key: 'sick', arasaac: 7040 },
];

export const BODY_PARTS = ['head', 'ears', 'teeth', 'throat', 'chest', 'tummy', 'arm', 'back', 'leg', 'foot'];

export const LEVEL_INFO: Record<Level, { title: string; desc: string; icon: string }> = {
  young: { title: 'Young child', desc: 'About 2 to 8 years. Big pictures, a few at a time.', icon: 'play' },
  teen: { title: 'Older child or teen', desc: 'More words, pictures with every word.', icon: 'friend' },
  adult: { title: 'Adult', desc: 'Words first, a keyboard, saved phrases.', icon: 'think' },
};
