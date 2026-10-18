import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadState, saveState } from './storage';
import { resolveMissing } from './symbols';
import { loadInstalledPack } from './speech';
import { PALETTES, type Palette } from './theme';
import type { AppState, Level, Profile, Settings, Word } from './types';
import { createProfile, DEFAULT_SETTINGS } from './vocab';

const EMPTY: AppState = { version: 1, profiles: [], activeId: null, arasaacIds: {} };

interface Ctx {
  ready: boolean;
  state: AppState;
  profile: Profile | null;
  settings: Settings;
  palette: Palette;
  updateProfile: (fn: (p: Profile) => Profile) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  updateWord: (id: string, patch: Partial<Word>) => void;
  addProfile: (name: string, level: Level, settings?: Partial<Settings>) => Profile;
  setActive: (id: string) => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const saved = await loadState<AppState>();
      if (saved && saved.version === 1) setState(saved);
      setReady(true);
      loadInstalledPack().catch(() => {});
    })();
  }, []);

  // Debounced save of the whole document; it is small apart from web-embedded photos.
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveState(state); }, 300);
  }, [state, ready]);

  const profile = useMemo(() => state.profiles.find((p) => p.id === state.activeId) ?? null, [state]);

  // Fill in ARASAAC ids for words that only have a keyword, once, in the background.
  useEffect(() => {
    if (!profile || profile.settings.symbolSet !== 'arasaac') return;
    const keys = Object.values(profile.words).filter((w) => w.symbol.kind === 'none' && w.lookup).map((w) => w.lookup as string);
    const extra = profile.schedule.filter((s) => s.symbol.kind === 'none').map((s) => s.label.split(' ')[0]);
    const missing = [...keys, ...extra].filter((k) => !state.arasaacIds[k.toLowerCase()]);
    if (!missing.length) return;
    let cancelled = false;
    resolveMissing(missing, state.arasaacIds).then((found) => {
      if (cancelled || !Object.keys(found).length) return;
      setState((s) => ({ ...s, arasaacIds: { ...s.arasaacIds, ...found } }));
    }).catch(() => {});
    return () => { cancelled = true; };
    // Run when the active profile or its word list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile ? Object.keys(profile.words).length : 0, profile?.settings.symbolSet]);

  const updateProfile = useCallback((fn: (p: Profile) => Profile) => {
    setState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === s.activeId ? fn(p) : p)) }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    updateProfile((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
  }, [updateProfile]);

  const updateWord = useCallback((id: string, patch: Partial<Word>) => {
    updateProfile((p) => ({ ...p, words: { ...p.words, [id]: { ...p.words[id], ...patch } } }));
  }, [updateProfile]);

  const addProfile = useCallback((name: string, level: Level, patch?: Partial<Settings>) => {
    const base = createProfile(name, level);
    const p = patch ? { ...base, settings: { ...base.settings, ...patch } } : base;
    setState((s) => ({ ...s, profiles: [...s.profiles, p], activeId: p.id }));
    return p;
  }, []);

  const setActive = useCallback((id: string) => setState((s) => ({ ...s, activeId: id })), []);

  const settings = profile?.settings ?? DEFAULT_SETTINGS;
  const value: Ctx = {
    ready, state, profile, settings, palette: PALETTES[settings.theme],
    updateProfile, updateSettings, updateWord, addProfile, setActive,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

/** Profile is guaranteed on screens behind the setup redirect. */
export function useProfile() {
  const ctx = useApp();
  if (!ctx.profile) throw new Error('No active profile');
  return { ...ctx, profile: ctx.profile };
}
