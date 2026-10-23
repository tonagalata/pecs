// Board pages ("sheets") for sections with more words than the grid shows.
//
// Every space on a section has a slot number in reading order across its sheets:
//   slot = sheet × (cols × rows) + row × cols + col
// Cells are stored as "row:col" on the first sheet and "sheet:row:col" after it. Changing the
// grid size keeps every word's slot, so a 4 × 3 section with 12 words becomes three 2 × 2 sheets,
// and switching back to 4 × 3 puts every word exactly where it was. Nothing is ever dropped.
import type { Page } from './types';

export interface Pos { sheet: number; row: number; col: number }

export function parseKey(key: string): Pos | null {
  const n = key.split(':').map(Number);
  if (n.some((x) => !Number.isInteger(x) || x < 0)) return null;
  if (n.length === 2) return { sheet: 0, row: n[0], col: n[1] };
  if (n.length === 3) return { sheet: n[0], row: n[1], col: n[2] };
  return null;
}

export function cellKey(sheet: number, row: number, col: number): string {
  return sheet ? `${sheet}:${row}:${col}` : `${row}:${col}`;
}

export const capacity = (p: Pick<Page, 'cols' | 'rows'>) => Math.max(1, p.cols * p.rows);

export function keyToSlot(key: string, p: Pick<Page, 'cols' | 'rows'>): number | null {
  const pos = parseKey(key);
  if (!pos || pos.row >= p.rows || pos.col >= p.cols) return null;
  return pos.sheet * capacity(p) + pos.row * p.cols + pos.col;
}

export function slotToKey(slot: number, p: Pick<Page, 'cols' | 'rows'>): string {
  const cap = capacity(p);
  const sheet = Math.floor(slot / cap);
  const i = slot % cap;
  return cellKey(sheet, Math.floor(i / p.cols), i % p.cols);
}

/**
 * Cells as slot → word id. Words saved outside the grid by older versions (which hid the outer
 * spaces when a grid was made smaller) are placed after the last word, in reading order.
 */
export function toSlots(p: Pick<Page, 'cols' | 'rows' | 'cells'>): Map<number, string> {
  const slots = new Map<number, string>();
  const stray: { pos: Pos; id: string }[] = [];
  for (const [key, id] of Object.entries(p.cells)) {
    const s = keyToSlot(key, p);
    if (s === null || slots.has(s)) {
      const pos = parseKey(key);
      if (pos) stray.push({ pos, id });
    } else slots.set(s, id);
  }
  if (stray.length) {
    stray.sort((a, b) => a.pos.sheet - b.pos.sheet || a.pos.row - b.pos.row || a.pos.col - b.pos.col);
    let next = slots.size ? Math.max(...slots.keys()) + 1 : 0;
    for (const s of stray) { while (slots.has(next)) next++; slots.set(next++, s.id); }
  }
  return slots;
}

export function fromSlots(slots: Map<number, string>, p: Pick<Page, 'cols' | 'rows'>): Record<string, string> {
  const cells: Record<string, string> = {};
  for (const [slot, id] of slots) cells[slotToKey(slot, p)] = id;
  return cells;
}

/** True when every cell is a valid in-grid key (no repair needed). */
export function isNormal(p: Page): boolean {
  return Object.keys(p.cells).every((k) => keyToSlot(k, p) !== null);
}

export function normalizePage(p: Page): Page {
  return isNormal(p) ? p : { ...p, cells: fromSlots(toSlots(p), p) };
}

/** Change the grid size. Words keep their order; extra words move onto more sheets. */
export function resizePage(p: Page, cols: number, rows: number): Page {
  return { ...p, cols, rows, cells: fromSlots(toSlots(p), { cols, rows }) };
}

/** Pack words together in their current order, removing empty spaces between them. */
export function closeGaps(p: Page): Page {
  const slots = toSlots(p);
  const packed = new Map<number, string>();
  [...slots.keys()].sort((a, b) => a - b).forEach((s, i) => packed.set(i, slots.get(s) as string));
  return { ...p, cells: fromSlots(packed, p) };
}

/** Number of sheets needed to show every word (at least one). */
export function sheetCount(p: Pick<Page, 'cols' | 'rows' | 'cells'>, visible?: (id: string) => boolean): number {
  let max = -1;
  for (const [key, id] of Object.entries(p.cells)) {
    if (visible && !visible(id)) continue;
    const pos = parseKey(key);
    if (pos && pos.sheet > max) max = pos.sheet;
  }
  return Math.max(1, max + 1);
}

/** First empty space from `fromSheet` on, adding a new sheet when every space is taken. */
export function firstFreeKey(p: Pick<Page, 'cols' | 'rows' | 'cells'>, fromSheet = 0): string {
  const used = new Set(Object.keys(p.cells));
  const cap = capacity(p);
  for (let slot = fromSheet * cap; ; slot++) {
    const k = slotToKey(slot, p);
    if (!used.has(k)) return k;
  }
}
