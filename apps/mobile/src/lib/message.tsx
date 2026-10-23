// The message being built. Kept in memory only (never saved unless the supporter turns on history).
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { speak } from './speech';
import { useApp } from './store';

export interface MsgItem {
  key: string;
  text: string;
  wordId?: string;
}

interface Ctx {
  items: MsgItem[];
  text: string;
  add: (item: Omit<MsgItem, 'key'>) => void;
  addText: (text: string) => void;
  setText: (text: string) => void;
  removeAt: (i: number) => void;
  backspace: () => void;
  clear: () => void;
  speakAll: () => void;
  speakOne: (text: string, wordId?: string) => void;
}

const MsgCtx = createContext<Ctx | null>(null);
let k = 0;

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const { profile, settings, updateProfile } = useApp();
  const [items, setItems] = useState<MsgItem[]>([]);
  const text = useMemo(() => items.map((i) => i.text).join(' ').replace(/\s+([.?!,])/g, '$1'), [items]);

  const speakOne = useCallback((t: string, wordId?: string) => {
    const rec = wordId ? profile?.words[wordId]?.recording : undefined;
    speak(t, settings, { recording: rec });
  }, [profile, settings]);

  const add = useCallback((item: Omit<MsgItem, 'key'>) => {
    const next = [...items, { ...item, key: `m${++k}` }];
    setItems(next);
    if (settings.onTap === 'word') speakOne(item.text, item.wordId);
    else if (settings.onTap === 'message') {
      speak(next.map((i) => i.text).join(' '), settings, { wordRecordings: next.map((i) => (i.wordId ? profile?.words[i.wordId]?.recording : undefined)) });
    }
  }, [items, settings, speakOne, profile]);

  const addText = useCallback((t: string) => setItems((p) => [...p, { key: `m${++k}`, text: t }]), []);
  const setText = useCallback((t: string) => setItems(t ? [{ key: `m${++k}`, text: t }] : []), []);
  const removeAt = useCallback((i: number) => setItems((p) => p.filter((_, j) => j !== i)), []);
  const backspace = useCallback(() => setItems((p) => p.slice(0, -1)), []);
  const clear = useCallback(() => setItems([]), []);

  const speakAll = useCallback(() => {
    if (!items.length) return;
    speak(text, settings, { wordRecordings: items.map((i) => (i.wordId ? profile?.words[i.wordId]?.recording : undefined)) });
    if (settings.keepHistory) updateProfile((p) => ({ ...p, history: [text, ...p.history].slice(0, 50) }));
  }, [items, text, settings, profile, updateProfile]);

  return (
    <MsgCtx.Provider value={{ items, text, add, addText, setText, removeAt, backspace, clear, speakAll, speakOne }}>
      {children}
    </MsgCtx.Provider>
  );
}

export function useMessage(): Ctx {
  const c = useContext(MsgCtx);
  if (!c) throw new Error('useMessage outside MessageProvider');
  return c;
}
