import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';
import { onConnectionChange } from './connection';
import { applyDoc, equal, extractDoc, keepShared, merge3, type BoardDoc } from './doc';
import { normalizePage } from './grid';
import { loadState, saveState } from './storage';
import { saveForOffline } from './symbolCache';
import { SyncError, syncOnce } from './sync';
import { offlineSymbolUrls, resolveMissing } from './symbols';
import { installVoicePack, prepareVoices, voicePackAvailable, voicePackLoaded } from './speech';
import { PALETTES, type Palette } from './theme';
import type { AppState, Level, Profile, Settings, SyncLink, Word } from './types';
import { createProfile, DEFAULT_SETTINGS, REPLACED_ARASAAC, uid } from './vocab';

const EMPTY: AppState = { version: 1, profiles: [], activeId: null, arasaacIds: {} };

interface Ctx {
  ready: boolean;
  /** Device voices and the HD voice pack manifest are loaded (or gave up after a timeout). */
  voicesReady: boolean;
  state: AppState;
  profile: Profile | null;
  settings: Settings;
  palette: Palette;
  updateProfile: (fn: (p: Profile) => Profile) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  updateWord: (id: string, patch: Partial<Word>) => void;
  addProfile: (name: string, level: Level, settings?: Partial<Settings>) => Profile;
  setActive: (id: string) => void;
  /** Whole-state change, for backups and sharing. */
  mutate: (fn: (s: AppState) => AppState) => void;
  /** Link (or unlink, with undefined) a profile to a shared board. */
  setSyncLink: (profileId: string, link: SyncLink | undefined) => void;
  /** Add a board shared with this device and make it the active one. */
  addSharedProfile: (doc: BoardDoc, link: SyncLink) => Profile;
  /** Exchange changes with the shared copy now. */
  syncNow: (profileId?: string) => Promise<void>;
  syncing: boolean;
}

const AppCtx = createContext<Ctx | null>(null);

/** Give built-in words saved with a broken ARASAAC pictogram the corrected one. */
function fixBrokenSymbols(s: AppState): AppState {
  const profiles = s.profiles.map((p) => {
    let changed = false;
    const words = { ...p.words };
    for (const [id, fix] of Object.entries(REPLACED_ARASAAC)) {
      const w = words[id];
      if (w?.symbol.kind === 'arasaac' && w.symbol.id === fix.from) { words[id] = { ...w, symbol: { kind: 'arasaac', id: fix.to } }; changed = true; }
    }
    // Older versions hid words that didn't fit a smaller grid; they now go onto extra pages.
    const pages = p.pages.map(normalizePage);
    if (pages.some((pg, i) => pg !== p.pages[i])) changed = true;
    return changed ? { ...p, words, pages } : p;
  });
  return { ...s, profiles };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  useLayoutEffect(() => { stateRef.current = state; }, [state]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadState<AppState>();
      if (saved && saved.version === 1) setState(fixBrokenSymbols(saved));
      setReady(true);
      await prepareVoices();
      setVoicesReady(true);
      // HD voice is on by default: fetch the pack in the background if it isn't on the device yet.
      const wantsHd = saved?.profiles?.length ? saved.profiles.some((p) => p.settings.hdVoice) : DEFAULT_SETTINGS.hdVoice;
      if (wantsHd && voicePackAvailable() && !voicePackLoaded()) installVoicePack().catch(() => {});
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

  // --- Shared boards: exchange changes in the background whenever there is a connection --------
  const inFlight = useRef(new Map<string, Promise<void>>());
  const again = useRef(new Set<string>());
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Runs another sync after one finishes (set below; a ref so runSync doesn't refer to itself).
  const rerun = useRef<(id: string) => void>(() => {});

  const runSync = useCallback((id: string): Promise<void> => {
    const running = inFlight.current.get(id);
    if (running) { again.current.add(id); return running; }
    const p = stateRef.current.profiles.find((x) => x.id === id);
    if (!p?.sync || p.sync.status === 'removed') return Promise.resolve();
    const boardId = p.sync.boardId;
    const job = (async () => {
      if (id === stateRef.current.activeId) setSyncing(true);
      try {
        const r = await syncOnce(p);
        let more = false;
        setState((s) => ({
          ...s,
          profiles: s.profiles.map((cur) => {
            if (cur.id !== id || cur.sync?.boardId !== boardId) return cur;
            // Keep anything changed here while the sync was running.
            const now = extractDoc(cur);
            const doc = equal(now, r.sent) ? r.doc : merge3(r.sent, now, r.doc);
            if (!equal(doc, r.doc)) more = true;
            return { ...applyDoc(cur, doc), sync: r.link };
          }),
        }));
        if (more) again.current.add(id);
      } catch (e) {
        const err = e instanceof SyncError ? e : new SyncError('error', String((e as Error)?.message ?? e));
        const status: SyncLink['status'] = err.kind === 'offline' ? 'offline' : err.kind === 'removed' ? 'removed' : 'error';
        setState((s) => ({ ...s, profiles: s.profiles.map((cur) => (cur.id === id && cur.sync?.boardId === boardId ? { ...cur, sync: { ...cur.sync, status, error: err.message } } : cur)) }));
      } finally {
        inFlight.current.delete(id);
        if (id === stateRef.current.activeId) setSyncing(false);
        if (again.current.delete(id)) setTimeout(() => { rerun.current(id); }, 500);
      }
    })();
    inFlight.current.set(id, job);
    return job;
  }, []);

  useEffect(() => { rerun.current = (id) => { runSync(id); }; }, [runSync]);

  const syncAll = useCallback(() => {
    for (const p of stateRef.current.profiles) if (p.sync && p.sync.status !== 'removed') runSync(p.id);
  }, [runSync]);

  const syncNow = useCallback(async (profileId?: string) => {
    const id = profileId ?? stateRef.current.activeId;
    if (!id) return;
    // A manual sync also retries a board marked as removed, in case access came back.
    setState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === id && p.sync?.status === 'removed' ? { ...p, sync: { ...p.sync, status: 'error' } } : p)) }));
    await new Promise((r) => setTimeout(r, 0));
    await runSync(id);
  }, [runSync]);

  // When the board opens, every 30 s while it's on screen, when the app comes back, and when the
  // connection returns.
  useEffect(() => {
    if (!ready) return;
    syncAll();
    const timer = setInterval(() => { if (RNAppState.currentState === 'active') syncAll(); }, 30_000);
    const sub = RNAppState.addEventListener('change', (st) => { if (st === 'active') syncAll(); });
    // Share changes made while offline the moment the connection comes back.
    const off = onConnectionChange((online) => { if (online) syncAll(); });
    return () => { clearInterval(timer); sub.remove(); off(); };
  }, [ready, syncAll]);

  /** A few seconds after the last edit to a shared board, send it. */
  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const id = stateRef.current.activeId;
      if (id) runSync(id);
    }, 2500);
  }, [runSync]);

  // Web: save every symbol on the active board for offline use, quietly, as words change.
  useEffect(() => {
    if (!ready || !profile || profile.settings.symbolSet !== 'arasaac' || Platform.OS !== 'web') return;
    const t = setTimeout(() => { saveForOffline(offlineSymbolUrls(profile, state.arasaacIds)).catch(() => {}); }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, profile?.id, profile?.words, profile?.schedule, state.arasaacIds, profile?.settings.symbolSet]);

  const updateProfile = useCallback((fn: (p: Profile) => Profile) => {
    setState((s) => ({
      ...s,
      profiles: s.profiles.map((p) => {
        if (p.id !== s.activeId) return p;
        const next = fn(p);
        // People with view-only access can change their own settings but not the shared board.
        return p.sync?.role === 'view' && p.sync.status !== 'removed' ? keepShared(p, next) : next;
      }),
    }));
    if (stateRef.current.profiles.find((p) => p.id === stateRef.current.activeId)?.sync) scheduleSync();
  }, [scheduleSync]);

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

  const mutate = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);

  const setSyncLink = useCallback((profileId: string, link: SyncLink | undefined) => {
    setState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === profileId ? { ...p, sync: link } : p)) }));
  }, []);

  const addSharedProfile = useCallback((doc: BoardDoc, link: SyncLink) => {
    const base = createProfile(doc.name, doc.level);
    const p: Profile = { ...applyDoc({ ...base, id: uid('p'), history: [], scheduleIndex: 0 }, doc), sync: link };
    setState((s) => ({ ...s, profiles: [...s.profiles, p], activeId: p.id }));
    return p;
  }, []);

  const settings = profile?.settings ?? DEFAULT_SETTINGS;
  const value: Ctx = {
    ready, voicesReady, state, profile, settings, palette: PALETTES[settings.theme],
    updateProfile, updateSettings, updateWord, addProfile, setActive,
    mutate, setSyncLink, addSharedProfile, syncNow, syncing,
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
