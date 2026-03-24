"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useTTS } from "@/hooks/useTTS";

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

function arasaacUrl(id: number) {
  return `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;
}

function CardImage({ card, className }: { card: Card; className: string }) {
  if (card.pictogram_id) {
    return <img src={arasaacUrl(card.pictogram_id)} alt={card.label} className={className} />;
  }
  return <span className="text-7xl leading-none select-none">{card.emoji}</span>;
}

type AppMode = "child" | "parent";

export default function PecsBoard() {
  const [cards, setCards] = useState<Card[]>([]);
  const [sentence, setSentence] = useState<Card[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [mode, setMode] = useState<AppMode>("child");
  const [dragOverStrip, setDragOverStrip] = useState(false);
  const [dragCardId, setDragCardId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [preSelectModeEnabled, setPreSelectModeEnabled] = useState(true);
  const [menuCard, setMenuCard] = useState<Card | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [tappedId, setTappedId] = useState<number | null>(null);
  // Defer shuffle to client only — avoids SSR/client hydration mismatch from Math.random()
  const [mounted, setMounted] = useState(false);

  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isPlaying, isLoading, play, stop } = useTTS();
  const isSpeaking = isPlaying || isLoading;

  // Add card form
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState("Food");
  const [arasaacQuery, setArasaacQuery] = useState("");
  const [arasaacResults, setArasaacResults] = useState<ArasaacResult[]>([]);
  const [arasaacSearching, setArasaacSearching] = useState(false);
  const [selectedPictogram, setSelectedPictogram] = useState<ArasaacResult | null>(null);

  const [toast, setToast] = useState("");
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(""), 2800);
  }, []);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/cards");
    const data = await res.json();
    if (Array.isArray(data)) setCards(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchCards();
    const savedMode = localStorage.getItem("pecs:mode");
    if (savedMode === "parent" || savedMode === "child") setMode(savedMode);
    const savedPreselect = localStorage.getItem("pecs:preselect");
    if (savedPreselect !== null) setPreSelectModeEnabled(savedPreselect === "true");
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      stop();
    };
  }, [fetchCards]);

  useEffect(() => { localStorage.setItem("pecs:mode", mode); }, [mode]);
  useEffect(() => { localStorage.setItem("pecs:preselect", String(preSelectModeEnabled)); }, [preSelectModeEnabled]);

  // Single base filter — reused by preselectedCount, visibleCards, and categories
  const activeCards = useMemo(() => cards.filter((c) => c.status === "active"), [cards]);

  const preselectedCount = useMemo(
    () => activeCards.filter((c) => c.preselected === 1).length,
    [activeCards]
  );

  // Only shuffles after mount (client-side), and only when data/filters change
  const visibleCards = useMemo(() => {
    let pool = activeCards;
    if (preSelectModeEnabled) {
      const pre = pool.filter((c) => c.preselected === 1);
      pool = pre.length > 0 ? pre : pool;
    }
    if (activeCategory !== "All") pool = pool.filter((c) => c.category === activeCategory);
    if (!mounted) return pool;
    return [...pool].sort(() => Math.random() - 0.5);
  }, [activeCards, mode, preSelectModeEnabled, activeCategory, mounted]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(activeCards.map((c) => c.category)))],
    [activeCards]
  );

  const addToSentence = (card: Card) => {
    setTappedId(card.id);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setTappedId(null), 280);
    setSentence((prev) => [...prev, card]);
    play(card.label);
  };

  const removeFromSentence = (idx: number) => {
    setSentence((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDragStart = (cardId: number) => setDragCardId(cardId);
  const handleDragEnd = () => setDragCardId(null);
  const handleDrop = () => {
    if (dragCardId !== null) {
      const card = cards.find((c) => c.id === dragCardId);
      if (card) addToSentence(card);
    }
    setDragOverStrip(false);
    setDragCardId(null);
  };

  const togglePreselect = async (card: Card) => {
    const newVal = card.preselected === 1 ? 0 : 1;
    await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preselected: newVal === 1 }),
    });
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, preselected: newVal } : c)));
    setMenuCard(null);
  };

  const exitEditMode = useCallback(() => {
    setEditingLabel(null);
    setSelectedPictogram(null);
    setArasaacQuery("");
    setArasaacResults([]);
  }, []);

  const saveCardEdit = async (card: Card, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const patch: Record<string, unknown> = { label: trimmed };
    if (selectedPictogram) patch.pictogram_id = selectedPictogram._id;
    await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const newPicId = selectedPictogram?._id ?? card.pictogram_id;
    setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, label: trimmed, pictogram_id: newPicId ?? c.pictogram_id } : c));
    setMenuCard((prev) => prev?.id === card.id ? { ...prev, label: trimmed, pictogram_id: newPicId ?? prev.pictogram_id } : prev);
    exitEditMode();
  };

  const deleteCard = async (card: Card) => {
    await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    setMenuCard(null);
    showToast(`"${card.label}" removed`);
  };

  // Debounced ARASAAC search
  useEffect(() => {
    if (!arasaacQuery.trim()) { setArasaacResults([]); return; }
    const t = setTimeout(async () => {
      setArasaacSearching(true);
      try {
        const res = await fetch(`/api/arasaac?q=${encodeURIComponent(arasaacQuery)}`);
        setArasaacResults(await res.json());
      } catch {
        setArasaacResults([]);
      } finally {
        setArasaacSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [arasaacQuery]);

  const closeAddSheet = useCallback(() => {
    setShowAddSheet(false);
    setArasaacQuery("");
    setArasaacResults([]);
    setSelectedPictogram(null);
    setNewLabel("");
  }, []);

  const addCard = async () => {
    if (!selectedPictogram || !newLabel.trim()) { showToast("Pick a pictogram and add a label"); return; }
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pictogram_id: selectedPictogram._id, label: newLabel.trim(), category: newCategory }),
    });
    const card = await res.json();
    setCards((prev) => [...prev, card]);
    closeAddSheet();
    showToast("Card added!");
  };

  const isPreSelectActive = preSelectModeEnabled && preselectedCount > 0;

  return (
    <div className="h-full flex flex-col">

      {/* ─── Header ─── */}
      <div className={`flex-none flex items-center justify-between px-4 py-4 ${mode === "parent" ? "bg-violet-600" : "bg-blue-500"}`}>
        <span className="text-white font-bold text-xl" style={{ fontFamily: "'Baloo 2', cursive" }}>
          🗣️ PECS Board
        </span>
        <div className="flex items-center gap-3">

          {/* Preselect toggle */}
          <button
            onClick={() => setPreSelectModeEnabled((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all border-2 ${
              preSelectModeEnabled
                ? "border-white/70 bg-white/25 text-white"
                : "border-white/30 bg-white/10 text-white/50"
            }`}
          >
            {/* Toggle pill */}
            <span className={`relative w-10 h-6 rounded-full flex items-center flex-none transition-colors duration-200 ${preSelectModeEnabled ? "bg-white/70" : "bg-white/25"}`}>
              <span className={`absolute w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${preSelectModeEnabled ? "left-[18px]" : "left-0.5"}`} />
            </span>
            <span className="text-base leading-none">🎯</span>
            <span className="hidden sm:inline">{preSelectModeEnabled ? "Preselect on" : "Preselect off"}</span>
          </button>

          {/* Mode toggle */}
          <button
            onClick={() => setMode((m) => m === "child" ? "parent" : "child")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm bg-white/20 text-white border-2 border-white/50 active:bg-white/30 transition-all"
          >
            <span className="text-base leading-none">{mode === "child" ? "👩" : "👦"}</span>
            <span>{mode === "child" ? "Parent" : "Child"}</span>
          </button>

        </div>
      </div>

      {isPreSelectActive && (
        <div className="flex-none bg-violet-50 px-4 py-1.5 border-b border-violet-100">
          <span className="text-xs font-bold text-violet-600">
            ⭐ Showing {preselectedCount} preselected card{preselectedCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ─── Body: stacked on mobile · side-by-side on desktop ─── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* Sentence strip — top strip on mobile, fixed sidebar on desktop */}
        <aside className="flex-none flex flex-col bg-amber-50 border-b-4 border-amber-200 lg:border-b-0 lg:border-r-4 lg:w-80 xl:w-96">
          <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-none">
            <span className="font-bold text-amber-700 text-sm tracking-wide uppercase" style={{ fontFamily: "'Baloo 2', cursive" }}>
              My Sentence
            </span>
            <div className="flex items-center gap-2">
              {sentence.length > 0 && (
                <button
                  onClick={() => setSentence([])}
                  className="text-xs px-3 py-1.5 rounded-full font-bold border-2 border-red-300 text-red-500 bg-white active:bg-red-50"
                >
                  ✕ Clear
                </button>
              )}
              <button
                onClick={() => {
                  if (!sentence.length && !isSpeaking) { showToast("Tap a card first!"); return; }
                  play(sentence.map((c) => c.label).join(" "));
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm text-white bg-green-500 hover:bg-green-600 shadow-md active:scale-95 transition-transform"
              >
                {isSpeaking ? (
                  <>
                    <span className="flex gap-0.5 items-end h-4">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className="w-0.5 bg-white rounded-full animate-wave" style={{ animationDelay: `${i * 0.1}s`, height: 10 }} />
                      ))}
                    </span>
                    Speaking…
                  </>
                ) : <>🔊 Speak</>}
              </button>
            </div>
          </div>

          {/* Drop zone — fixed height on mobile, fills sidebar on desktop */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverStrip(true); }}
            onDragLeave={() => setDragOverStrip(false)}
            onDrop={handleDrop}
            className={`flex-1 mx-3 mb-3 rounded-2xl border-4 border-dashed transition-all flex flex-wrap items-start content-start gap-2 p-3 overflow-y-auto min-h-[180px] max-h-[36vh] lg:max-h-none lg:min-h-0 ${
              dragOverStrip ? "border-green-400 bg-green-50" : "border-amber-300 bg-amber-100/50"
            }`}
          >
            {sentence.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center min-h-[120px]">
                <p className="text-amber-300 italic text-sm select-none pointer-events-none text-center leading-relaxed">
                  Tap a picture card below{"\n"}to start your sentence
                </p>
              </div>
            ) : (
              sentence.map((card, idx) => (
                <button
                  key={`${card.id}-${idx}`}
                  onClick={() => removeFromSentence(idx)}
                  className="bg-white rounded-xl border-2 border-green-300 px-3 py-2 flex flex-col items-center gap-1 active:scale-95 transition-transform shadow-sm"
                >
                  <CardImage card={card} className="w-16 h-16 object-contain" />
                  <span className="text-xs font-bold text-green-700 text-center leading-tight">{card.label}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ─── Card grid area ─── */}
        <div className="flex-1 overflow-y-auto bg-sky-50">

          {/* Category tabs — sticky so they stay visible while scrolling */}
          {categories.length > 1 && (
            <div className="sticky top-0 z-10 flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar border-b border-sky-100 bg-white shadow-sm">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-none px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-blue-50 text-blue-600 border border-blue-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="p-4">
            {mode === "parent" && (
              <button
                onClick={() => setShowAddSheet(true)}
                className="w-full mb-4 py-4 rounded-3xl border-3 border-dashed border-blue-300 bg-blue-50 text-blue-500 font-bold text-base flex items-center justify-center gap-2 active:bg-blue-100 transition-colors"
              >
                <span className="text-2xl leading-none">＋</span> Add a card
              </button>
            )}

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : visibleCards.length === 0 ? (
              <div className="text-center py-16 text-gray-300 text-sm italic">No cards available.</div>
            ) : (
              <div className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
                {visibleCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => handleDragStart(card.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => { if (mode === "child") addToSentence(card); }}
                    className={`relative flex flex-col items-center rounded-3xl transition-all select-none ${
                      mode === "child" ? "cursor-pointer" : "cursor-default"
                    } ${tappedId === card.id ? "scale-90" : "scale-100"} ${
                      card.preselected === 1 ? "bg-violet-50 shadow-violet-100" : "bg-white shadow-blue-50"
                    } shadow-lg`}
                    style={{ border: `3px solid ${card.preselected === 1 ? "#c4b5fd" : "#bfdbfe"}` }}
                  >
                    {card.preselected === 1 && <span className="absolute top-2 left-2 text-sm">⭐</span>}
                    {mode === "parent" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuCard(card); }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-100 active:bg-gray-200 text-gray-500 text-base font-bold flex items-center justify-center"
                      >
                        ···
                      </button>
                    )}
                    <div className="pt-6 pb-4 px-3 flex flex-col items-center gap-2 w-full">
                      <CardImage card={card} className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />
                      <span className="text-sm sm:text-base font-extrabold text-gray-800 text-center leading-snug">{card.label}</span>
                      {mode === "parent" && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">
                          {card.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {mode === "parent" && !loading && (
              <div className="mt-6 bg-violet-50 border border-violet-200 rounded-2xl p-4">
                <p className="font-bold text-sm text-violet-700 mb-1">⭐ Preselect mode</p>
                <p className="text-xs text-violet-500 leading-relaxed">
                  Tap <strong>···</strong> on any card then <strong>Preselect</strong> to pin it for the child. Toggle{" "}
                  <strong>🎯</strong> on so the child sees only those cards.{" "}
                  {preselectedCount > 0 ? (
                    <strong>{preselectedCount} card{preselectedCount !== 1 ? "s" : ""} currently preselected.</strong>
                  ) : "No cards preselected — child sees all cards."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Add card sheet ─── */}
      {showAddSheet && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closeAddSheet} />
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center pointer-events-none">
            <div className="w-full max-w-lg pointer-events-auto bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl animate-slideup lg:animate-pop max-h-[90vh] flex flex-col">
              <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex-none">
                <p className="font-extrabold text-gray-800 text-lg">➕ Add a card</p>
                <p className="text-xs text-gray-400 mt-0.5">Search ARASAAC pictograms</p>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
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
                        className={`flex flex-col items-center p-2 rounded-2xl border-2 transition-all active:scale-95 ${
                          selectedPictogram?._id === pic._id ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-100 bg-white"
                        }`}
                      >
                        <img src={arasaacUrl(pic._id)} alt={pic.keywords[0]?.keyword ?? ""} className="w-14 h-14 object-contain" />
                        <span className="text-xs text-gray-500 text-center leading-tight mt-1 w-full truncate">{pic.keywords[0]?.keyword}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedPictogram && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-2xl border-2 border-blue-200">
                    <img src={arasaacUrl(selectedPictogram._id)} alt="" className="w-16 h-16 object-contain flex-none" />
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Label for this card"
                      className="flex-1 border-2 border-blue-200 rounded-xl px-3 py-2 text-base outline-none focus:border-blue-400 bg-white"
                      onKeyDown={(e) => e.key === "Enter" && addCard()}
                    />
                  </div>
                )}
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-blue-400"
                >
                  {["Food", "Actions", "Feelings", "Places", "People", "Objects", "Custom"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={addCard}
                  disabled={!selectedPictogram}
                  className="w-full py-4 rounded-2xl bg-green-500 text-white font-bold text-base active:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add card
                </button>
                <button onClick={closeAddSheet} className="w-full py-3 rounded-2xl bg-gray-100 text-gray-500 font-bold text-sm active:bg-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Card action sheet ─── */}
      {menuCard && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => { setMenuCard(null); exitEditMode(); }} />
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center pointer-events-none">
            <div className="w-full max-w-lg pointer-events-auto bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl animate-slideup lg:animate-pop max-h-[90vh] flex flex-col">
              <div className="flex items-center gap-4 px-6 pt-5 pb-4 border-b border-gray-100 flex-none">
                <CardImage
                  card={selectedPictogram ? { ...menuCard, pictogram_id: selectedPictogram._id } : menuCard}
                  className="w-14 h-14 object-contain flex-none"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-gray-800 text-lg leading-tight truncate">{menuCard.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{menuCard.category}</p>
                </div>
              </div>

              {editingLabel !== null ? (
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
                          onClick={() => {
                            setSelectedPictogram(pic);
                            setNewLabel(pic.keywords[0]?.keyword ?? editingLabel);
                            setEditingLabel(pic.keywords[0]?.keyword ?? editingLabel);
                          }}
                          className={`flex flex-col items-center p-2 rounded-2xl border-2 transition-all active:scale-95 ${
                            selectedPictogram?._id === pic._id ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-100 bg-white"
                          }`}
                        >
                          <img src={arasaacUrl(pic._id)} alt={pic.keywords[0]?.keyword ?? ""} className="w-14 h-14 object-contain" />
                          <span className="text-xs text-gray-500 text-center leading-tight mt-1 w-full truncate">{pic.keywords[0]?.keyword}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    autoFocus={!arasaacQuery}
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveCardEdit(menuCard, editingLabel); }}
                    placeholder="Card label"
                    className="w-full border-2 border-blue-200 rounded-2xl px-4 py-3 text-base font-bold outline-none focus:border-blue-400"
                  />
                  <button onClick={() => saveCardEdit(menuCard, editingLabel)} className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold text-base active:bg-blue-600">
                    Save changes
                  </button>
                  <button onClick={exitEditMode} className="w-full py-3 rounded-2xl bg-gray-100 text-gray-500 font-bold text-sm active:bg-gray-200">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 px-6 py-5">
                  <button onClick={() => { addToSentence(menuCard); setMenuCard(null); }} className="w-full py-4 rounded-2xl bg-green-500 text-white font-bold text-base active:bg-green-600">
                    + Add to sentence
                  </button>
                  <button
                    onClick={() => {
                      setEditingLabel(menuCard.label);
                      setSelectedPictogram(menuCard.pictogram_id ? { _id: menuCard.pictogram_id, keywords: [{ keyword: menuCard.label, type: 1 }] } : null);
                    }}
                    className="w-full py-4 rounded-2xl bg-blue-50 text-blue-600 font-bold text-base active:bg-blue-100 border border-blue-200"
                  >
                    ✏️ Edit card
                  </button>
                  <button
                    onClick={() => togglePreselect(menuCard)}
                    className={`w-full py-4 rounded-2xl font-bold text-base ${
                      menuCard.preselected === 1 ? "bg-violet-500 text-white active:bg-violet-600" : "bg-violet-100 text-violet-700 active:bg-violet-200"
                    }`}
                  >
                    {menuCard.preselected === 1 ? "⭐ Remove from preselect" : "☆ Add to preselect"}
                  </button>
                  <button onClick={() => deleteCard(menuCard)} className="w-full py-4 rounded-2xl bg-red-50 text-red-500 font-bold text-base active:bg-red-100 border border-red-200">
                    🗑 Remove card
                  </button>
                  <button onClick={() => setMenuCard(null)} className="w-full py-3 rounded-2xl bg-gray-100 text-gray-500 font-bold text-sm active:bg-gray-200">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-xl z-50 animate-pop whitespace-nowrap">
          {toast}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap');
        @keyframes pop { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-pop { animation: pop 0.18s ease; }
        @keyframes slideup { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideup { animation: slideup 0.22s ease; }
        @keyframes wave { 0%,100% { height: 4px; } 50% { height: 14px; } }
        .animate-wave { animation: wave 0.7s ease-in-out infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .border-3 { border-width: 3px; }
      `}</style>
    </div>
  );
}
