// The shared part of a profile ("board document"), and a three-way merge so a parent and a
// therapist can both edit while offline and nothing either of them did is lost.
//
// Shared: name, level, words, pages, phrases, schedule and its note.
// Never shared: settings (voice, lock, PIN, touch), message history and schedule progress.
import { toSlots, fromSlots } from './grid';
import type { Level, Page, Profile, ScheduleItem, Word } from './types';

export interface BoardDoc {
  v: 1;
  name: string;
  level: Level;
  words: Record<string, Word>;
  pages: Page[];
  phrases: string[];
  schedule: ScheduleItem[];
  scheduleNote?: string;
}

export function extractDoc(p: Profile): BoardDoc {
  return {
    v: 1, name: p.name, level: p.level, words: p.words, pages: p.pages,
    phrases: p.phrases, schedule: p.schedule, ...(p.scheduleNote ? { scheduleNote: p.scheduleNote } : {}),
  };
}

export function applyDoc(p: Profile, d: BoardDoc): Profile {
  const scheduleIndex = Math.min(p.scheduleIndex, Math.max(0, d.schedule.length - 1));
  return { ...p, name: d.name, level: d.level, words: d.words, pages: d.pages, phrases: d.phrases, schedule: d.schedule, scheduleNote: d.scheduleNote, scheduleIndex };
}

/** Keeps a viewer's board identical to the shared copy (they can still change their own settings). */
export function keepShared(prev: Profile, next: Profile): Profile {
  return applyDoc(next, extractDoc(prev));
}

export function isDoc(x: unknown): x is BoardDoc {
  const d = x as BoardDoc;
  return !!d && typeof d === 'object' && typeof d.words === 'object' && Array.isArray(d.pages) && Array.isArray(d.phrases ?? []) && Array.isArray(d.schedule ?? []);
}

/** Fill in anything an older or foreign document is missing. */
export function cleanDoc(d: BoardDoc): BoardDoc {
  return {
    v: 1, name: String(d.name ?? 'Board'), level: (['young', 'teen', 'adult'] as Level[]).includes(d.level) ? d.level : 'teen',
    words: d.words ?? {}, pages: (d.pages ?? []).map((p) => ({ ...p, cells: p.cells ?? {} })),
    phrases: d.phrases ?? [], schedule: d.schedule ?? [], ...(d.scheduleNote ? { scheduleNote: d.scheduleNote } : {}),
  };
}

export function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return a.length === bb.length && a.every((x, i) => equal(x, bb[i]));
  }
  const ao = a as Record<string, unknown>, bo = b as Record<string, unknown>;
  const ak = Object.keys(ao).filter((k) => ao[k] !== undefined), bk = Object.keys(bo).filter((k) => bo[k] !== undefined);
  return ak.length === bk.length && ak.every((k) => equal(ao[k], bo[k]));
}

/** One value: whoever changed it wins; if both did, this device wins. */
function pick<T>(base: T, mine: T, theirs: T): T {
  return equal(mine, base) ? theirs : mine;
}

/** Objects field by field. */
function mergeObject<T extends object>(base: T | undefined, mine: T | undefined, theirs: T | undefined): T | undefined {
  if (equal(mine, base)) return theirs;
  if (equal(theirs, base)) return mine;
  // Both changed. A deletion loses to an edit, so nobody's work disappears.
  if (!mine) return theirs;
  if (!theirs) return mine;
  if (!base) return mine;
  const out: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)]);
  const b = base as Record<string, unknown>, m = mine as Record<string, unknown>, t = theirs as Record<string, unknown>;
  for (const k of keys) {
    const v = pick(b[k], m[k], t[k]);
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

function mergeMap<T extends object>(base: Record<string, T>, mine: Record<string, T>, theirs: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)])) {
    const v = mergeObject(base[k], mine[k], theirs[k]);
    if (v) out[k] = v;
  }
  return out;
}

/** Map of primitive values (cells): per key, whoever changed it wins. */
function mergeValues(base: Map<number, string>, mine: Map<number, string>, theirs: Map<number, string>): Map<number, string> {
  const out = new Map<number, string>();
  for (const k of new Set([...base.keys(), ...mine.keys(), ...theirs.keys()])) {
    const v = pick(base.get(k), mine.get(k), theirs.get(k));
    if (v !== undefined) out.set(k, v);
  }
  // A word can only be in one space: if a merge put it in two, keep the one this device chose.
  const seen = new Map<string, number>();
  for (const [slot, id] of [...out.entries()].sort((a, b) => a[0] - b[0])) {
    const other = seen.get(id);
    if (other === undefined) { seen.set(id, slot); continue; }
    const keepMine = mine.get(slot) === id ? slot : other;
    out.delete(keepMine === slot ? other : slot);
    seen.set(id, keepMine);
  }
  return out;
}

function mergePage(base: Page | undefined, mine: Page | undefined, theirs: Page | undefined): Page | undefined {
  if (equal(mine, base)) return theirs;
  if (equal(theirs, base)) return mine;
  if (!mine) return theirs;
  if (!theirs) return mine;
  if (!base) return mine;
  const cols = pick(base.cols, mine.cols, theirs.cols);
  const rows = pick(base.rows, mine.rows, theirs.rows);
  // Cells are merged by slot, which doesn't change with the grid size, so a resize on one device
  // and new words on another combine correctly.
  const cells = fromSlots(mergeValues(toSlots(base), toSlots(mine), toSlots(theirs)), { cols, rows });
  return {
    ...mergeObject(base, mine, theirs)!,
    cols, rows, cells,
  };
}

/** Lists of items with ids, keeping the order of whoever reordered. */
function mergeList<T extends { id: string }>(base: T[], mine: T[], theirs: T[], each: (b?: T, m?: T, t?: T) => T | undefined): T[] {
  const by = (l: T[]) => new Map(l.map((x) => [x.id, x]));
  const B = by(base), M = by(mine), Th = by(theirs);
  const order = equal(mine.map((x) => x.id), base.map((x) => x.id)) ? theirs : mine;
  const ids: string[] = order.map((x) => x.id);
  for (const l of [mine, theirs]) for (const x of l) if (!ids.includes(x.id)) ids.push(x.id);
  const out: T[] = [];
  for (const id of ids) {
    const v = each(B.get(id), M.get(id), Th.get(id));
    if (v) out.push(v);
  }
  return out;
}

function mergeStrings(base: string[], mine: string[], theirs: string[]): string[] {
  if (equal(mine, base)) return theirs;
  if (equal(theirs, base)) return mine;
  const removed = new Set([...base.filter((x) => !mine.includes(x)), ...base.filter((x) => !theirs.includes(x))]);
  const out: string[] = [];
  for (const x of [...mine, ...theirs]) if (!removed.has(x) && !out.includes(x)) out.push(x);
  return out;
}

export function merge3(base: BoardDoc, mine: BoardDoc, theirs: BoardDoc): BoardDoc {
  if (equal(mine, base)) return theirs;
  if (equal(theirs, base)) return mine;
  const note = pick(base.scheduleNote, mine.scheduleNote, theirs.scheduleNote);
  return {
    v: 1,
    name: pick(base.name, mine.name, theirs.name),
    level: pick(base.level, mine.level, theirs.level),
    words: mergeMap(base.words, mine.words, theirs.words),
    pages: mergeList(base.pages, mine.pages, theirs.pages, mergePage),
    phrases: mergeStrings(base.phrases, mine.phrases, theirs.phrases),
    schedule: mergeList(base.schedule, mine.schedule, theirs.schedule, mergeObject),
    ...(note ? { scheduleNote: note } : {}),
  };
}

/** Small, fast, stable hash used to name photos and recordings (not for security). */
export function hashString(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x2b5e0c1d, h4 = 0x9e3779b9;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const mix = (a: number, b: number) => (Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909)) >>> 0;
  return [mix(h1, h2), mix(h2, h3), mix(h3, h4), mix(h4, h1), (str.length >>> 0)].map((n) => n.toString(36).padStart(7, '0')).join('').slice(0, 32);
}
