"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useTTS } from "@/hooks/useTTS";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Card {
  id: number;
  emoji: string | null;
  pictogram_id: number | null;
  label: string;
  category: string;
  status: "active" | "deleted";
  preselected: number;
  sort_order: number;
  created_at: string;
}

interface ArasaacResult {
  _id: number;
  keywords: { keyword: string; type: number }[];
}

type AppMode = "child" | "parent";
type ParentTab = "dashboard" | "preselected" | "library" | "settings";

// ─── Utilities ────────────────────────────────────────────────────────────────

function arasaacUrl(id: number) {
  return `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;
}

const CATEGORY_COLORS: Record<string, [string, string]> = {
  Starters: ["#2563EB", "#EFF6FF"],
  Food:     ["#F59E0B", "#FFFBEB"],
  Actions:  ["#10B981", "#ECFDF5"],
  Feelings: ["#EF4444", "#FEF2F2"],
  People:   ["#3B82F6", "#EFF6FF"],
  Objects:  ["#F97316", "#FFF7ED"],
  Custom:   ["#8B5CF6", "#F5F3FF"],
  Places:   ["#6366F1", "#EEF2FF"],
  Toys:     ["#14B8A6", "#F0FDFA"],
  ABCs:     ["#EC4899", "#FDF2F8"],
  Numbers:  ["#06B6D4", "#ECFEFF"],
};

const COLOR_CYCLE: [string, string][] = [
  ["#3B82F6", "#EFF6FF"],
  ["#F59E0B", "#FFFBEB"],
  ["#10B981", "#ECFDF5"],
  ["#EF4444", "#FEF2F2"],
  ["#8B5CF6", "#F5F3FF"],
  ["#F97316", "#FFF7ED"],
];

function getCardColors(category: string, index = 0): [string, string] {
  return CATEGORY_COLORS[category] ?? COLOR_CYCLE[index % COLOR_CYCLE.length];
}

function CardImage({ card, className }: { card: Card; className: string }) {
  if (card.pictogram_id) {
    return <img src={arasaacUrl(card.pictogram_id)} alt={card.label} className={className} />;
  }
  if (card.emoji === "__photo__") {
    const url = typeof window !== "undefined" ? localStorage.getItem(`pecs:photo:${card.id}`) : null;
    if (url) return <img src={url} alt={card.label} className={className} />;
    return <span className="text-4xl leading-none select-none">📷</span>;
  }
  return <span className="text-5xl leading-none select-none">{card.emoji}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PecsBoard() {
  // Core
  const [cards, setCards] = useState<Card[]>([]);
  const [sentence, setSentence] = useState<Card[]>([]);
  const [mode, setMode] = useState<AppMode>("child");
  const [loading, setLoading] = useState(true);
  const [shuffledCards, setShuffledCards] = useState<Card[]>([]);
  const [localPhotoIds, setLocalPhotoIds] = useState<Set<number>>(new Set());
  const [tappedId, setTappedId] = useState<number | null>(null);

  // Parent tabs
  const [parentTab, setParentTab] = useState<ParentTab>("dashboard");

  // Preselect (board cards)
  const [preselectedIds, setPreselectedIds] = useState<Set<number>>(new Set());

  // Library
  const [libraryCategory, setLibraryCategory] = useState("All");
  const [librarySearch, setLibrarySearch] = useState("");
  const [preselectedSearch, setPreselectedSearch] = useState("");
  const [dashboardSearch, setDashboardSearch] = useState("");

  // Create/Edit card
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingPictogram, setEditingPictogram] = useState<ArasaacResult | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState("Food");
  const [addMode, setAddMode] = useState<"search" | "camera">("search");

  // ARASAAC
  const [arasaacQuery, setArasaacQuery] = useState("");
  const [arasaacResults, setArasaacResults] = useState<ArasaacResult[]>([]);
  const [arasaacSearching, setArasaacSearching] = useState(false);
  const [selectedPictogram, setSelectedPictogram] = useState<ArasaacResult | null>(null);

  // Camera
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Voice settings
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [testVoiceOutput, setTestVoiceOutput] = useState("");

  // Child board filter
  const [showPreselectedOnly, setShowPreselectedOnly] = useState(false);

  // Child lock/settings
  const [showChildSettings, setShowChildSettings] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toast
  const [toast, setToast] = useState("");
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // PWA install
  const [installPrompt, setInstallPrompt] = useState<{ prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);

  // Refs
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isPlaying, isLoading, play, stop } = useTTS();
  const isSpeaking = isPlaying || isLoading;

  // ── Helpers ──
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(""), 2800);
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    const constraints: MediaStreamConstraints[] = [
      { video: { facingMode: { exact: "environment" } } },
      { video: { facingMode: "environment" } },
      { video: true },
    ];
    for (const c of constraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        cameraStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        return;
      } catch { /* try next */ }
    }
    showToast("Camera not available");
  }, [stopCamera, showToast]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setCapturedBlob(blob);
      setCapturedPhotoUrl(canvas.toDataURL("image/jpeg"));
      stopCamera();
    }, "image/jpeg", 0.85);
  }, [stopCamera]);

  // ── Data fetching ──
  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cards");
      const data = await res.json();
      if (Array.isArray(data)) setCards(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();

    const savedMode = localStorage.getItem("pecs:mode");
    if (savedMode === "parent" || savedMode === "child") setMode(savedMode as AppMode);

    try {
      const ids = JSON.parse(localStorage.getItem("pecs:preselected-ids") ?? "[]");
      if (Array.isArray(ids)) setPreselectedIds(new Set(ids));
    } catch { /* ignore */ }

    const photoIds = new Set<number>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("pecs:photo:")) {
        const id = parseInt(key.slice(11), 10);
        if (!isNaN(id)) photoIds.add(id);
      }
    }
    setLocalPhotoIds(photoIds);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as unknown as { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> });
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      stop();
      stopCamera();
    };
  }, [fetchCards, stop, stopCamera]);

  useEffect(() => { localStorage.setItem("pecs:mode", mode); }, [mode]);

  // ── Derived data ──
  const activeCards = useMemo(
    () => cards.filter((c) => c.status === "active" && !(c.emoji === "__photo__" && !localPhotoIds.has(c.id))),
    [cards, localPhotoIds]
  );

  // Starters row (action phrases) shown separately at the top of the board
  const starterCards = useMemo(
    () => activeCards.filter((c) => c.category === "Starters"),
    [activeCards]
  );

  // Main grid cards — Starters are excluded (they live in their own row)
  const mainCards = useMemo(
    () => activeCards.filter((c) => c.category !== "Starters"),
    [activeCards]
  );

  const preselectedCards = useMemo(
    () => mainCards.filter((c) => preselectedIds.has(c.id)),
    [mainCards, preselectedIds]
  );

  const boardCards = useMemo(() => {
    if (showPreselectedOnly && preselectedCards.length > 0) return preselectedCards;
    return mainCards;
  }, [mainCards, preselectedCards, showPreselectedOnly]);

  useEffect(() => {
    setShuffledCards([...boardCards].sort(() => Math.random() - 0.5));
  }, [boardCards]);

  const visibleCards = shuffledCards.length > 0 ? shuffledCards : boardCards;

  const libraryCards = useMemo(() => {
    let pool = activeCards;
    if (libraryCategory !== "All") pool = pool.filter((c) => c.category === libraryCategory);
    if (librarySearch) pool = pool.filter((c) => c.label.toLowerCase().includes(librarySearch.toLowerCase()));
    return pool;
  }, [activeCards, libraryCategory, librarySearch]);

  const dashboardCards = useMemo(() => {
    if (!dashboardSearch) return activeCards;
    return activeCards.filter((c) => c.label.toLowerCase().includes(dashboardSearch.toLowerCase()));
  }, [activeCards, dashboardSearch]);

  const libraryCategories = useMemo(
    () => ["All", ...Array.from(new Set(activeCards.map((c) => c.category)))],
    [activeCards]
  );

  // ── Interaction handlers ──
  const addToSentence = useCallback((card: Card) => {
    setTappedId(card.id);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setTappedId(null), 280);
    setSentence((prev) => [...prev, card]);
    if (ttsEnabled) play(card.label);
  }, [ttsEnabled, play]);

  const togglePreselect = useCallback((cardId: number) => {
    setPreselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      localStorage.setItem("pecs:preselected-ids", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const deleteCard = useCallback(async (card: Card) => {
    await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    showToast(`"${card.label}" removed`);
  }, [showToast]);

  const saveCardEdit = async () => {
    if (!editingCard || !editingLabel.trim()) return;
    const patch: Record<string, unknown> = { label: editingLabel.trim() };
    if (editingPictogram) patch.pictogram_id = editingPictogram._id;
    await fetch(`/api/cards/${editingCard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setCards((prev) => prev.map((c) => c.id === editingCard.id ? {
      ...c,
      label: editingLabel.trim(),
      pictogram_id: editingPictogram?._id ?? c.pictogram_id,
    } : c));
    setEditingCard(null);
    showToast("Card updated!");
  };

  const closeCreateCard = useCallback(() => {
    setShowCreateCard(false);
    setNewLabel("");
    setNewCategory("Food");
    setArasaacQuery("");
    setArasaacResults([]);
    setSelectedPictogram(null);
    setAddMode("search");
    setCapturedBlob(null);
    setCapturedPhotoUrl(null);
    stopCamera();
  }, [stopCamera]);

  const addCard = async () => {
    if (!selectedPictogram || !newLabel.trim()) { showToast("Pick a pictogram and add a label"); return; }
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pictogram_id: selectedPictogram._id, label: newLabel.trim(), category: newCategory }),
    });
    const card = await res.json();
    setCards((prev) => [...prev, card]);
    closeCreateCard();
    showToast("Card added!");
  };

  const addPhotoCard = async () => {
    if (!capturedBlob || !newLabel.trim()) { showToast("Capture a photo and add a label"); return; }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", capturedBlob, "photo.jpg");
      const uploadRes = await fetch("/api/upload-photo", { method: "POST", body: formData });
      const { url } = await uploadRes.json();
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: "__photo__", label: newLabel.trim(), category: newCategory }),
      });
      const card = await res.json();
      localStorage.setItem(`pecs:photo:${card.id}`, url);
      setLocalPhotoIds((prev) => new Set(prev).add(card.id));
      setCards((prev) => [...prev, card]);
      closeCreateCard();
      showToast("Card added!");
    } catch {
      showToast("Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ARASAAC debounced search
  useEffect(() => {
    if (!arasaacQuery.trim()) { setArasaacResults([]); return; }
    const t = setTimeout(async () => {
      setArasaacSearching(true);
      try {
        const res = await fetch(`/api/arasaac?q=${encodeURIComponent(arasaacQuery)}`);
        setArasaacResults(await res.json());
      } catch { setArasaacResults([]); }
      finally { setArasaacSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [arasaacQuery]);

  // Camera: start/stop
  useEffect(() => {
    if (showCreateCard && addMode === "camera" && !capturedPhotoUrl) {
      const t = setTimeout(startCamera, 0);
      return () => { clearTimeout(t); stopCamera(); };
    }
    return () => stopCamera();
  }, [showCreateCard, addMode, capturedPhotoUrl, startCamera, stopCamera]);

  // ────────────────────────────────────────────────────────────────────────────
  // CHILD MODE
  // ────────────────────────────────────────────────────────────────────────────
  if (mode === "child") {
    return (
      <div className="h-full flex flex-col" style={{ background: "#F0F7FF", fontFamily: "'Nunito', sans-serif" }}>

        {/* Sentence Strip */}
        <div className="flex-none bg-white border-b-2 border-sky-100 px-3 py-2.5 min-h-[72px] flex items-center gap-2">
          {sentence.length === 0 ? (
            <p className="text-gray-400 text-sm font-semibold flex-1 text-center select-none">
              Tap a card to start building your message…
            </p>
          ) : (
            <>
              <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {sentence.map((card, idx) => {
                  const [border, bg] = getCardColors(card.category, idx);
                  return (
                    <button
                      key={`${card.id}-${idx}`}
                      onClick={() => setSentence((prev) => prev.filter((_, i) => i !== idx))}
                      className="flex-none flex flex-col items-center rounded-2xl px-2 py-1.5 gap-0.5 active:scale-90 transition-transform shadow-sm"
                      style={{ border: `2px solid ${border}`, backgroundColor: bg, minWidth: 58 }}
                    >
                      <CardImage card={card} className="w-10 h-10 object-contain" />
                      <span className="font-bold text-gray-700 text-center leading-tight" style={{ fontSize: 10 }}>{card.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  if (ttsEnabled) play(sentence.map((c) => c.label).join(" "));
                }}
                className={`flex-none w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md active:scale-90 transition-all ${isSpeaking ? "bg-green-400" : "bg-green-500"}`}
              >
                {isSpeaking ? (
                  <span className="flex gap-0.5 items-end h-5">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="w-1 bg-white rounded-full animate-wave" style={{ animationDelay: `${i * 0.1}s`, height: 10 }} />
                    ))}
                  </span>
                ) : <span className="text-xl">🔊</span>}
              </button>
              <button
                onClick={() => { stop(); setSentence([]); }}
                className="flex-none w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-400 font-bold flex items-center justify-center active:scale-90 transition-transform"
              >
                ✕
              </button>
            </>
          )}
        </div>

        {/* Starter Cards Row */}
        {starterCards.length > 0 && (
          <div className="flex-none flex gap-2 px-3 pt-3 pb-1 overflow-x-auto no-scrollbar">
            {starterCards.map((card) => {
              const [border, bg] = getCardColors(card.category);
              return (
                <button
                  key={card.id}
                  onClick={() => addToSentence(card)}
                  className="flex-none flex items-center gap-2 rounded-2xl px-3 py-2 shadow-sm active:scale-90 transition-transform"
                  style={{ border: `2.5px solid ${border}`, backgroundColor: bg }}
                >
                  <CardImage card={card} className="w-8 h-8 object-contain" />
                  <span className="font-extrabold text-blue-800 text-sm whitespace-nowrap">{card.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Card Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : visibleCards.length === 0 ? (
            <div className="text-center py-16 text-gray-300 text-sm italic">No cards available.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleCards.map((card, idx) => {
                const [border, bg] = getCardColors(card.category, idx);
                return (
                  <button
                    key={card.id}
                    onClick={() => addToSentence(card)}
                    className={`flex flex-col items-center justify-center rounded-3xl py-5 px-3 gap-3 select-none shadow-sm transition-transform active:scale-90 ${tappedId === card.id ? "animate-tap" : ""}`}
                    style={{ border: `3px solid ${border}`, backgroundColor: bg, minHeight: 160 }}
                  >
                    <CardImage card={card} className="w-20 h-20 object-contain drop-shadow-sm" />
                    <span className="text-base font-extrabold text-gray-800 text-center leading-snug">{card.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100">
          {/* Preselected toggle */}
          <button
            onClick={() => setShowPreselectedOnly((v) => !v)}
            disabled={preselectedCards.length === 0}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              showPreselectedOnly && preselectedCards.length > 0
                ? "bg-violet-100 text-violet-600 border border-violet-200"
                : "bg-gray-100 text-gray-400 border border-transparent"
            } disabled:opacity-30`}
          >
            <span>{showPreselectedOnly ? "⭐" : "☆"}</span>
            Preselected
          </button>

          {/* Lock */}
          <button
            onMouseDown={() => { holdTimerRef.current = setTimeout(() => setShowChildSettings(true), 1500); }}
            onMouseUp={() => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); }}
            onTouchStart={() => { holdTimerRef.current = setTimeout(() => setShowChildSettings(true), 1500); }}
            onTouchEnd={() => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); }}
            className="flex flex-col items-center gap-0.5 opacity-40 select-none"
          >
            <span className="text-xl">🔒</span>
            <span className="text-xs text-gray-400 font-semibold">Hold</span>
          </button>
        </div>

        {/* Child Settings Modal */}
        {showChildSettings && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowChildSettings(false)} />
            <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl p-6 max-w-xs mx-auto">
              <p className="font-extrabold text-gray-800 text-lg mb-4 text-center">Settings</p>
              {installPrompt && (
                <button
                  onClick={async () => {
                    await installPrompt.prompt();
                    const { outcome } = await installPrompt.userChoice;
                    if (outcome === "accepted") setInstallPrompt(null);
                    setShowChildSettings(false);
                  }}
                  className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold text-base mb-3 flex items-center justify-center gap-2"
                >
                  ⬇️ Install App
                </button>
              )}
              <button
                onClick={() => { setMode("parent"); setParentTab("dashboard"); setShowChildSettings(false); }}
                className="w-full py-4 rounded-2xl bg-violet-500 text-white font-bold text-base mb-3"
              >
                👩 Switch to Parent Mode
              </button>
              <button
                onClick={() => setShowChildSettings(false)}
                className="w-full py-3 rounded-2xl bg-gray-100 text-gray-500 font-bold text-sm"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {toast && <Toast msg={toast} />}
        <canvas ref={canvasRef} className="hidden" />
        <GlobalStyles />
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PARENT MODE
  // ────────────────────────────────────────────────────────────────────────────

  // Board preview slots (8 slots max)
  const boardPreviewSlots = Array.from({ length: 8 }, (_, i) => {
    const pre = activeCards.filter((c) => preselectedIds.has(c.id));
    return pre[i] ?? null;
  });

  return (
    <div className="h-full flex flex-col bg-gray-50" style={{ fontFamily: "'Nunito', sans-serif" }}>

      {/* ── DASHBOARD TAB ── */}
      {parentTab === "dashboard" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-none flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100">
            <button
              onClick={() => { setMode("child"); }}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-lg active:bg-gray-200"
            >
              ←
            </button>
            <h1 className="flex-1 font-extrabold text-gray-800 text-lg text-center">Parent Setup Dashboard</h1>
            <div className="w-9" />
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {/* Card Library */}
            <div className="mt-4 mb-2">
              <h2 className="font-extrabold text-gray-800 text-base mb-3">Card Library</h2>
              <div className="relative mb-3">
                <input
                  type="text"
                  value={dashboardSearch}
                  onChange={(e) => setDashboardSearch(e.target.value)}
                  placeholder="Search PECS Cards..."
                  className="w-full bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-700 outline-none border-2 border-transparent focus:border-blue-300 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {dashboardCards.slice(0, 16).map((card) => {
                    const [border, bg] = getCardColors(card.category);
                    const isPre = preselectedIds.has(card.id);
                    return (
                      <button
                        key={card.id}
                        onClick={() => togglePreselect(card.id)}
                        className="relative flex flex-col items-center rounded-2xl p-2 gap-1 transition-all active:scale-95"
                        style={{
                          border: `2px solid ${isPre ? border : "#E5E7EB"}`,
                          backgroundColor: isPre ? bg : "#F9FAFB",
                        }}
                      >
                        <CardImage card={card} className="w-12 h-12 object-contain" />
                        <span className="text-xs font-bold text-gray-700 text-center leading-tight line-clamp-1">{card.label}</span>
                        {/* + / ✓ badge */}
                        <span
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs shadow"
                          style={{ backgroundColor: isPre ? "#10B981" : "#3B82F6" }}
                        >
                          {isPre ? "✓" : "+"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Board Preview */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-extrabold text-gray-800 text-base">Live Board Preview</h2>
                <button
                  onClick={() => {
                    setPreselectedIds(new Set());
                    localStorage.setItem("pecs:preselected-ids", "[]");
                    showToast("Board cleared");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500 font-bold text-xs active:bg-gray-200"
                >
                  Reorder
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 p-3 bg-blue-50 rounded-2xl border-2 border-blue-100">
                {boardPreviewSlots.map((card, i) =>
                  card ? (
                    <button
                      key={card.id}
                      onClick={() => togglePreselect(card.id)}
                      className="flex flex-col items-center rounded-xl p-2 gap-1 bg-white border-2 border-blue-200 active:scale-95 transition-transform"
                    >
                      <CardImage card={card} className="w-10 h-10 object-contain" />
                      <span className="text-xs font-bold text-gray-700 text-center leading-tight line-clamp-1">{card.label}</span>
                    </button>
                  ) : (
                    <button
                      key={`empty-${i}`}
                      onClick={() => setParentTab("library")}
                      className="flex flex-col items-center justify-center rounded-xl py-3 gap-1 bg-white border-2 border-dashed border-blue-200 text-blue-300 active:bg-blue-50"
                    >
                      <span className="text-lg">＋</span>
                      <span className="text-xs font-semibold" style={{ fontSize: 9 }}>Add Card</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Save & Go to Child Mode */}
            <button
              onClick={() => { setMode("child"); }}
              className="mt-5 w-full py-4 rounded-2xl bg-blue-500 text-white font-extrabold text-base flex items-center justify-center gap-2 active:bg-blue-600 shadow-md"
            >
              Save &amp; Go to Child Mode
              <span>↗</span>
            </button>
          </div>
        </div>
      )}

      {/* ── PRESELECTED TAB ── */}
      {parentTab === "preselected" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-none flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100">
            <button
              onClick={() => setParentTab("dashboard")}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-lg active:bg-gray-200"
            >
              ←
            </button>
            <h1 className="flex-1 font-extrabold text-gray-800 text-lg text-center">Preselected Cards</h1>
            <button
              onClick={() => { setPreselectedIds(new Set()); localStorage.setItem("pecs:preselected-ids", "[]"); showToast("Cleared"); }}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 text-xs font-bold active:bg-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <div className="flex-none px-4 pt-3 pb-3 bg-white border-b border-gray-100">
            <div className="relative flex items-center">
              <svg className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={preselectedSearch}
                onChange={(e) => setPreselectedSearch(e.target.value)}
                placeholder="Search cards…"
                className="w-full bg-gray-100 rounded-2xl pl-9 pr-9 py-2.5 text-sm text-gray-700 outline-none border-2 border-transparent focus:border-blue-300 focus:bg-white transition-colors"
              />
              {preselectedSearch && (
                <button
                  onClick={() => setPreselectedSearch("")}
                  className="absolute right-3 w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold hover:bg-gray-400 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
            {preselectedCards.length > 0 && (
              <p className="text-xs text-gray-400 font-semibold mt-2">
                {preselectedCards.length} card{preselectedCards.length !== 1 ? "s" : ""} selected — tap to toggle
              </p>
            )}
            {preselectedCards.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">Tap cards to add them to the child&apos;s board.</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {activeCards.filter((c) => !preselectedSearch || c.label.toLowerCase().includes(preselectedSearch.toLowerCase())).map((card) => {
                  const [border, bg] = getCardColors(card.category);
                  const isPre = preselectedIds.has(card.id);
                  return (
                    <button
                      key={card.id}
                      onClick={() => togglePreselect(card.id)}
                      className="relative flex flex-col items-center rounded-2xl p-2 gap-1 transition-all active:scale-95"
                      style={{
                        border: `2px solid ${isPre ? border : "#E5E7EB"}`,
                        backgroundColor: isPre ? bg : "#F9FAFB",
                      }}
                    >
                      <CardImage card={card} className="w-14 h-14 object-contain" />
                      <span className="text-xs font-bold text-gray-700 text-center leading-tight line-clamp-1">{card.label}</span>
                      <span
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs shadow"
                        style={{ backgroundColor: isPre ? "#10B981" : "#D1D5DB" }}
                      >
                        {isPre ? "✓" : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LIBRARY TAB ── */}
      {parentTab === "library" && (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header */}
          <div className="flex-none flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100">
            <button
              onClick={() => setParentTab("dashboard")}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-lg active:bg-gray-200"
            >
              ←
            </button>
            <h1 className="flex-1 font-extrabold text-gray-800 text-lg text-center">
              {libraryCategory === "All" ? "Manage Custom Library" : `Manage Library · ${libraryCategory}`}
            </h1>
            <div className="w-9" />
          </div>

          {/* Search */}
          <div className="flex-none px-4 pt-3 pb-2 bg-white">
            <div className="relative flex items-center">
              <svg className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Search cards…"
                className="w-full bg-gray-100 rounded-2xl pl-9 pr-9 py-2.5 text-sm text-gray-700 outline-none border-2 border-transparent focus:border-blue-300 focus:bg-white transition-colors"
              />
              {librarySearch && (
                <button
                  onClick={() => setLibrarySearch("")}
                  className="absolute right-3 w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold hover:bg-gray-400 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Category chips */}
          <div className="flex-none flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar bg-white border-b border-gray-100">
            {libraryCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setLibraryCategory(cat)}
                className="flex-none px-4 py-1.5 rounded-full font-bold text-sm transition-all active:scale-95"
                style={
                  libraryCategory === cat
                    ? { backgroundColor: "#3B82F6", color: "#fff" }
                    : { backgroundColor: "#F3F4F6", color: "#6B7280" }
                }
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Card grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-24 pt-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : libraryCards.length === 0 ? (
              <div className="text-center py-12 text-gray-300 text-sm italic">No cards found.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {libraryCards.map((card) => {
                  const [border, bg] = getCardColors(card.category);
                  return (
                    <div
                      key={card.id}
                      className="relative flex flex-col items-center rounded-2xl p-3 gap-2 bg-white shadow-sm"
                      style={{ border: `2px solid ${border}` }}
                    >
                      {/* Edit & delete icons */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={() => { setEditingCard(card); setEditingLabel(card.label); setEditingPictogram(null); setArasaacQuery(""); setArasaacResults([]); }}
                          className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-500 text-xs active:scale-90"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteCard(card)}
                          className="w-7 h-7 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-400 text-xs active:scale-90"
                        >
                          🗑
                        </button>
                      </div>
                      <CardImage card={card} className="w-16 h-16 object-contain mt-4" />
                      <span className="text-sm font-extrabold text-gray-800 text-center leading-snug">{card.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FAB */}
          <button
            onClick={() => setShowCreateCard(true)}
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-500 text-white text-2xl flex items-center justify-center shadow-xl active:scale-90 transition-transform z-10"
          >
            ＋
          </button>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {parentTab === "settings" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-none flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100">
            <button
              onClick={() => setParentTab("dashboard")}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-lg active:bg-gray-200"
            >
              ←
            </button>
            <h1 className="flex-1 font-extrabold text-gray-800 text-lg text-center">Voice Settings</h1>
            <div className="w-9" />
          </div>

          <div className="flex-1 overflow-y-auto pb-6">
            {/* TTS Section */}
            <div className="mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 font-extrabold text-sm tracking-wide" style={{ backgroundColor: "#FFB3B3", color: "#7F1D1D" }}>
                TEXT-TO-SPEECH
              </div>
              <div className="bg-white px-4 py-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Enable Text-to-Speech</span>
                  <button
                    onClick={() => setTtsEnabled((v) => !v)}
                    className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${ttsEnabled ? "bg-green-500" : "bg-gray-200"}`}
                  >
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${ttsEnabled ? "left-6" : "left-1"}`} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    const phrase = "I want to play.";
                    setTestVoiceOutput(phrase);
                    if (ttsEnabled) play(phrase);
                  }}
                  className="w-full py-3.5 rounded-2xl font-extrabold text-white text-base flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  style={{ backgroundColor: "#F97316" }}
                >
                  🔊 Test Voice
                </button>
                {testVoiceOutput && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <span>💬</span>
                    <span className="italic">{testVoiceOutput}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Switch to child mode */}
            <div className="mx-4 mt-4">
              <button
                onClick={() => setMode("child")}
                className="w-full py-4 rounded-2xl bg-blue-500 text-white font-extrabold text-base active:bg-blue-600 shadow-md"
              >
                👦 Go to Child Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAVIGATION ── */}
      <nav className="flex-none flex items-stretch bg-white border-t border-gray-100">
        {[
          { id: "dashboard" as ParentTab, icon: "🏠", label: "Home" },
          { id: "preselected" as ParentTab, icon: "⭐", label: "Preselected" },
          { id: "library" as ParentTab, icon: "📚", label: "Library" },
          { id: "settings" as ParentTab, icon: "⚙️", label: "Settings" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setParentTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors active:bg-gray-50 ${parentTab === tab.id ? "text-blue-500" : "text-gray-400"}`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-xs font-bold">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ── CREATE CUSTOM CARD SHEET ── */}
      {showCreateCard && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closeCreateCard} />
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center pointer-events-none">
            <div className="w-full max-w-lg pointer-events-auto bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl animate-slideup lg:animate-pop max-h-[92vh] flex flex-col">
              {/* Sheet header */}
              <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-gray-100 flex-none">
                <button onClick={closeCreateCard} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-lg active:bg-gray-200">
                  ←
                </button>
                <p className="flex-1 font-extrabold text-gray-800 text-lg">Create Custom Card</p>
              </div>

              {/* Tab switcher */}
              <div className="flex gap-2 px-5 pt-4 pb-2 flex-none">
                <button
                  onClick={() => { setAddMode("search"); stopCamera(); setCapturedBlob(null); setCapturedPhotoUrl(null); }}
                  className={`flex-1 py-2.5 rounded-2xl font-bold text-sm transition-all ${addMode === "search" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"}`}
                >
                  🔍 Search Pictogram
                </button>
                <button
                  onClick={() => setAddMode("camera")}
                  className={`flex-1 py-2.5 rounded-2xl font-bold text-sm transition-all ${addMode === "camera" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"}`}
                >
                  📷 Photo
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

                {/* ── Pictogram search mode ── */}
                {addMode === "search" && (
                  <>
                    {/* Upload / camera placeholder */}
                    {!selectedPictogram && (
                      <div className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-2 py-8">
                        <span className="text-4xl text-gray-300">📷</span>
                        <p className="text-gray-400 font-semibold text-sm">Search for a pictogram below</p>
                      </div>
                    )}
                    {selectedPictogram && (
                      <div className="flex items-center justify-center p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
                        <img src={arasaacUrl(selectedPictogram._id)} alt="" className="w-24 h-24 object-contain" />
                      </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                      <input
                        type="text"
                        value={arasaacQuery}
                        onChange={(e) => setArasaacQuery(e.target.value)}
                        placeholder="Search pictograms… e.g. apple, play, happy"
                        className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-blue-400 pr-12"
                        autoFocus
                      />
                      {arasaacSearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                      )}
                    </div>

                    {arasaacResults.length > 0 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {arasaacResults.map((pic) => (
                          <button
                            key={pic._id}
                            onClick={() => { setSelectedPictogram(pic); setNewLabel(pic.keywords[0]?.keyword ?? ""); }}
                            className={`flex flex-col items-center p-2 rounded-2xl border-2 transition-all active:scale-95 ${selectedPictogram?._id === pic._id ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-white"}`}
                          >
                            <img src={arasaacUrl(pic._id)} alt="" className="w-12 h-12 object-contain" />
                            <span className="text-xs text-gray-500 text-center mt-1 truncate w-full">{pic.keywords[0]?.keyword}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Card Label */}
                    {selectedPictogram && (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-gray-600 mb-1">Card Label</label>
                          <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="e.g., Favorite Blanket"
                            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-blue-400"
                            onKeyDown={(e) => e.key === "Enter" && addCard()}
                          />
                        </div>
                        {/* Record Audio button */}
                        <button className="w-full py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center gap-2">
                          🎙 Record Audio
                        </button>
                      </>
                    )}

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-blue-400"
                      >
                        {["Food", "Toys", "Actions", "Feelings", "People", "Objects", "Places", "Custom"].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Card Preview */}
                    {selectedPictogram && (
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">Card Preview</label>
                        <div
                          className="flex flex-col items-center rounded-2xl p-4 gap-2 w-32 mx-auto shadow-sm"
                          style={{ border: `2px solid ${getCardColors(newCategory)[0]}`, backgroundColor: getCardColors(newCategory)[1] }}
                        >
                          <img src={arasaacUrl(selectedPictogram._id)} alt="" className="w-16 h-16 object-contain" />
                          <span className="text-sm font-extrabold text-gray-800 text-center">{newLabel || "Card Label"}</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={addCard}
                      disabled={!selectedPictogram || !newLabel.trim()}
                      className="w-full py-4 rounded-2xl bg-blue-500 text-white font-extrabold text-base active:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Save to Library
                    </button>
                  </>
                )}

                {/* ── Camera mode ── */}
                {addMode === "camera" && (
                  <>
                    {!capturedPhotoUrl ? (
                      <>
                        <div className="rounded-2xl overflow-hidden bg-black w-full" style={{ aspectRatio: "4/3" }}>
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        </div>
                        <button
                          onClick={capturePhoto}
                          className="w-full py-4 rounded-2xl bg-blue-500 text-white font-extrabold text-lg active:bg-blue-600"
                        >
                          📸 Capture Photo
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "4/3" }}>
                          <img src={capturedPhotoUrl} alt="Captured" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-600 mb-1">Card Label</label>
                          <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="e.g., Favorite Blanket"
                            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-blue-400"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && addPhotoCard()}
                          />
                        </div>
                        <button className="w-full py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center gap-2">
                          🎙 Record Audio
                        </button>
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-blue-400"
                        >
                          {["Food", "Toys", "Actions", "Feelings", "People", "Objects", "Places", "Custom"].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                        <div className="flex gap-3">
                          <button
                            onClick={() => { setCapturedBlob(null); setCapturedPhotoUrl(null); startCamera(); }}
                            className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold text-base active:bg-gray-200"
                          >
                            ↩ Retake
                          </button>
                          <button
                            onClick={addPhotoCard}
                            disabled={uploadingPhoto || !newLabel.trim()}
                            className="flex-[2] py-4 rounded-2xl bg-blue-500 text-white font-extrabold text-base active:bg-blue-600 disabled:opacity-40"
                          >
                            {uploadingPhoto ? "Uploading…" : "Save to Library"}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}

                <button onClick={closeCreateCard} className="w-full py-3 rounded-2xl bg-gray-100 text-gray-500 font-bold text-sm active:bg-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── EDIT CARD SHEET ── */}
      {editingCard && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => { setEditingCard(null); setArasaacQuery(""); setArasaacResults([]); }} />
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center pointer-events-none">
            <div className="w-full max-w-lg pointer-events-auto bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl animate-slideup lg:animate-pop max-h-[85vh] flex flex-col">
              <div className="flex items-center gap-4 px-6 pt-5 pb-4 border-b border-gray-100 flex-none">
                <CardImage card={editingPictogram ? { ...editingCard, pictogram_id: editingPictogram._id } : editingCard} className="w-12 h-12 object-contain" />
                <div className="flex-1">
                  <p className="font-extrabold text-gray-800 text-lg">Edit Card</p>
                  <p className="text-xs text-gray-400">{editingCard.category}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                <div className="relative">
                  <input
                    type="text"
                    value={arasaacQuery}
                    onChange={(e) => setArasaacQuery(e.target.value)}
                    placeholder="Search new pictogram…"
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-blue-400 pr-12"
                  />
                  {arasaacSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                  )}
                </div>
                {arasaacResults.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {arasaacResults.map((pic) => (
                      <button
                        key={pic._id}
                        onClick={() => { setEditingPictogram(pic); setEditingLabel(pic.keywords[0]?.keyword ?? editingLabel); }}
                        className={`flex flex-col items-center p-2 rounded-2xl border-2 transition-all active:scale-95 ${editingPictogram?._id === pic._id ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-white"}`}
                      >
                        <img src={arasaacUrl(pic._id)} alt="" className="w-12 h-12 object-contain" />
                        <span className="text-xs text-gray-500 text-center mt-1 truncate w-full">{pic.keywords[0]?.keyword}</span>
                      </button>
                    ))}
                  </div>
                )}
                <input
                  autoFocus
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveCardEdit(); }}
                  placeholder="Card label"
                  className="w-full border-2 border-blue-200 rounded-2xl px-4 py-3 text-base font-bold outline-none focus:border-blue-400"
                />
                <button onClick={saveCardEdit} className="w-full py-4 rounded-2xl bg-blue-500 text-white font-extrabold text-base active:bg-blue-600">
                  Save Changes
                </button>
                <button
                  onClick={() => { setEditingCard(null); setArasaacQuery(""); setArasaacResults([]); }}
                  className="w-full py-3 rounded-2xl bg-gray-100 text-gray-500 font-bold text-sm active:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {toast && <Toast msg={toast} />}
      <canvas ref={canvasRef} className="hidden" />
      <GlobalStyles />
    </div>
  );
}

// ─── Small shared components ──────────────────────────────────────────────────

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-xl z-[60] animate-pop whitespace-nowrap">
      {msg}
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Baloo+2:wght@600;700;800&display=swap');
      @keyframes pop { from { transform: scale(0.85) translateX(-50%); opacity: 0; } to { transform: scale(1) translateX(-50%); opacity: 1; } }
      .animate-pop { animation: pop 0.18s ease; }
      @keyframes slideup { from { transform: translateY(100%); } to { transform: translateY(0); } }
      .animate-slideup { animation: slideup 0.22s ease; }
      @keyframes wave { 0%,100% { height: 4px; } 50% { height: 14px; } }
      .animate-wave { animation: wave 0.7s ease-in-out infinite; }
      @keyframes tap { 0% { transform: scale(0.88); } 60% { transform: scale(1.04); } 100% { transform: scale(1); } }
      .animate-tap { animation: tap 0.28s ease; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>
  );
}
