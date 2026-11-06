"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Mic,
  MicOff,
  X,
  ExternalLink,
  Download,
  Heart,
  Share2,
  Clock,
  Sparkles,
  Filter,
  ChevronDown,
  Layers,
  Camera,
  Maximize2,
  RefreshCw,
  Sun,
  Moon,
  MessageSquare,
  MapPin,
  Check,
  Globe,
  SlidersHorizontal,
  ArrowLeft,
  User,
  ShieldCheck,
  Image as ImageIcon,
} from "lucide-react";
import {
  ImageSearchResultItem,
  ImageCategory,
  ImageOrientation,
  ImageSize,
  ImageProviderId,
  SearchEngineResponse,
} from "../lib/image-search/types";
import { trackImageGeneration } from "../lib/gtag";

// Quick category pills
const CATEGORIES: { label: string; value: ImageCategory }[] = [
  { label: "All", value: "all" },
  { label: "Photographs", value: "photograph" },
  { label: "Illustrations", value: "illustration" },
  { label: "Wallpapers", value: "wallpaper" },
  { label: "3D Renders", value: "3d" },
  { label: "Nature", value: "nature" },
  { label: "Animals", value: "animals" },
  { label: "Automotive", value: "automotive" },
  { label: "Architecture", value: "architecture" },
  { label: "Technology", value: "technology" },
];

export default function WebImageSearchPage() {
  // Query & Results
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [results, setResults] = useState<ImageSearchResultItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [relatedSearches, setRelatedSearches] = useState<string[]>([]);
  const [providersUsed, setProvidersUsed] = useState<string[]>([]);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<ImageCategory>("all");
  const [selectedOrientation, setSelectedOrientation] = useState<ImageOrientation>("all");
  const [selectedSize, setSelectedSize] = useState<ImageSize>("all");
  const [selectedProvider, setSelectedProvider] = useState<ImageProviderId>("all");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Autocomplete Suggestions & History
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<ImageSearchResultItem[]>([]);
  const [activeTab, setActiveTab] = useState<"search" | "favorites" | "history">("search");

  // Preview Modal / Drawer
  const [selectedImage, setSelectedImage] = useState<ImageSearchResultItem | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Theme
  const [isDark, setIsDark] = useState(false);

  // Voice Search
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const observerSentinelRef = useRef<HTMLDivElement>(null);

  // Toast notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Hydrate Search History & Favorites from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("tattva_image_search_history");
      if (savedHistory) setSearchHistory(JSON.parse(savedHistory));

      const savedFavs = localStorage.getItem("tattva_image_search_favorites");
      if (savedFavs) setFavorites(JSON.parse(savedFavs));

      const savedTheme = localStorage.getItem("tattva_theme");
      if (savedTheme === "dark") setIsDark(true);
    } catch {}
  }, []);

  // Save history
  const addQueryToHistory = useCallback((q: string) => {
    if (!q.trim()) return;
    setSearchHistory((prev) => {
      const updated = [q.trim(), ...prev.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 15);
      try {
        localStorage.setItem("tattva_image_search_history", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Toggle Favorite
  const toggleFavorite = useCallback((item: ImageSearchResultItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) => {
      const isFav = prev.some((f) => f.id === item.id);
      let updated: ImageSearchResultItem[];
      if (isFav) {
        updated = prev.filter((f) => f.id !== item.id);
        showToast("Removed from favorites");
      } else {
        updated = [item, ...prev];
        showToast("Saved to favorites ♥");
      }
      try {
        localStorage.setItem("tattva_image_search_favorites", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [showToast]);

  // Primary Search Fetcher
  const executeSearch = useCallback(
    async (searchQuery: string, pageNum: number = 1, append: boolean = false) => {
      const clean = searchQuery.trim();
      if (!clean) return;

      if (pageNum === 1) {
        setLoading(true);
        setActiveTab("search");
        try {
          trackImageGeneration("search", selectedCategory);
        } catch {
          // ignore
        }
      } else {
        setLoadingMore(true);
      }

      setIsSuggestionsOpen(false);

      try {
        const params = new URLSearchParams({
          q: clean,
          page: String(pageNum),
          pageSize: "24",
          type: selectedCategory,
          orientation: selectedOrientation,
          size: selectedSize,
          provider: selectedProvider,
        });

        const res = await fetch(`/api/images/search?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: SearchEngineResponse = await res.json();

        if (append) {
          setResults((prev) => {
            const seen = new Set(prev.map((i) => i.id));
            const fresh = (data.results || []).filter((i) => !seen.has(i.id));
            return [...prev, ...fresh];
          });
        } else {
          setResults(data.results || []);
          setActiveQuery(clean);
          addQueryToHistory(clean);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }

        setTotalResults(data.totalResults || (data.results?.length ?? 0));
        setRelatedSearches(data.relatedSearches || []);
        setLatencyMs(data.latencyMs || null);
        setProvidersUsed(data.providersUsed || ["Openverse", "Wikimedia Commons"]);
        setPage(pageNum);
      } catch (err) {
        console.error("Search failed:", err);
        showToast("Image search failed. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      selectedCategory,
      selectedOrientation,
      selectedSize,
      selectedProvider,
      addQueryToHistory,
      showToast,
    ]
  );

  // Initial popular search on mount
  useEffect(() => {
    executeSearch("Rose flowers", 1);
    setQuery("Rose flowers");
  }, []);

  // Re-run search when category changes
  const handleCategoryChange = (cat: ImageCategory) => {
    setSelectedCategory(cat);
    if (activeQuery) {
      setTimeout(() => {
        executeSearch(activeQuery, 1);
      }, 50);
    }
  };

  // Autocomplete fetcher
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/images/suggestions?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch {}
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Voice Search (Web Speech API)
  const toggleVoiceSearch = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast("Voice recognition is not supported on this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const spoken = event.results?.[0]?.[0]?.transcript || "";
        if (spoken) {
          setQuery(spoken);
          executeSearch(spoken, 1);
        }
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Download Image helper
  const handleDownload = async (item: ImageSearchResultItem) => {
    try {
      showToast("Downloading image...");
      const res = await fetch(item.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const safeName = item.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "tattva_image";
      a.download = `${safeName}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast("Image downloaded 📥");
    } catch {
      window.open(item.url, "_blank");
    }
  };

  // Active filters count
  const activeFiltersCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedOrientation !== "all" ? 1 : 0) +
    (selectedSize !== "all" ? 1 : 0) +
    (selectedProvider !== "all" ? 1 : 0);

  const resetFilters = () => {
    setSelectedCategory("all");
    setSelectedOrientation("all");
    setSelectedSize("all");
    setSelectedProvider("all");
    if (activeQuery) {
      setTimeout(() => executeSearch(activeQuery, 1), 50);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDark ? "bg-[#0f1012] text-neutral-100" : "bg-[#fbfbfd] text-neutral-900"
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="rounded-full bg-neutral-900/90 text-white dark:bg-white/95 dark:text-neutral-900 px-4 py-2 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Google Images Style Header */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors ${
          isDark
            ? "border-neutral-800/80 bg-[#0f1012]/90 text-white"
            : "border-black/[0.08] bg-white/90 text-neutral-900 shadow-2xs"
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-6">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/chat" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-400 flex items-center justify-center text-white shadow-sm font-bold text-base">
                T
              </div>
              <h1 className="hidden xs:flex flex-col">
                <span className="font-bold text-sm tracking-tight leading-none group-hover:text-sky-500 transition">
                  TATTVA AI
                </span>
                <span className="text-[10px] font-semibold text-sky-500 tracking-wider uppercase mt-0.5">
                  Images
                </span>
              </h1>
            </Link>
          </div>

          {/* Central Google-Style Omnibox Search Bar */}
          <div ref={searchContainerRef} className="flex-1 max-w-2xl relative">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeSearch(query, 1);
              }}
              className="relative flex items-center"
            >
              <div className="absolute left-3.5 text-neutral-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>

              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsSuggestionsOpen(true);
                }}
                onFocus={() => setIsSuggestionsOpen(true)}
                placeholder="Search for any photos, flowers, cars, places, animals..."
                className={`w-full rounded-full pl-10 pr-20 py-2 sm:py-2.5 text-xs sm:text-sm font-normal outline-none transition-all shadow-xs border ${
                  isDark
                    ? "bg-neutral-800/80 border-neutral-700 text-white focus:bg-neutral-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    : "bg-neutral-100/80 border-black/10 text-neutral-900 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                }`}
              />

              {/* Right Input Actions: Clear & Mic */}
              <div className="absolute right-2.5 flex items-center gap-1">
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition"
                    title="Clear query"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleVoiceSearch}
                  className={`p-1.5 rounded-full transition cursor-pointer ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "text-neutral-400 hover:text-sky-500"
                  }`}
                  title="Search by voice"
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="submit"
                  className="hidden sm:flex p-1.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white transition shadow-xs cursor-pointer"
                  title="Search"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Instant Suggestions Dropdown */}
            {isSuggestionsOpen && (suggestions.length > 0 || searchHistory.length > 0) && (
              <div
                className={`absolute top-full left-0 right-0 mt-2 rounded-2xl border shadow-2xl overflow-hidden z-50 text-xs py-1.5 backdrop-blur-2xl animate-in fade-in duration-150 ${
                  isDark
                    ? "bg-[#18191c]/98 border-neutral-700 text-white"
                    : "bg-white/98 border-black/10 text-neutral-900"
                }`}
              >
                {/* Search History Chips if query is short */}
                {(!query.trim() || query.length < 2) && searchHistory.length > 0 && (
                  <div className="px-3 py-1.5 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Recent Searches
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchHistory([]);
                          localStorage.removeItem("tattva_image_search_history");
                        }}
                        className="text-[10px] text-neutral-400 hover:text-red-400 transition"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {searchHistory.slice(0, 6).map((h, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setQuery(h);
                            executeSearch(h, 1);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-sky-500/10 hover:text-sky-500 transition text-left truncate max-w-[150px]"
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Autocomplete Suggestions */}
                {suggestions.map((sug, sIdx) => (
                  <div
                    key={sIdx}
                    onClick={() => {
                      setQuery(sug);
                      executeSearch(sug, 1);
                    }}
                    className="flex items-center justify-between px-3.5 py-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="font-medium truncate">{sug}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-mono">search</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-2">
            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
                activeFiltersCount > 0 || isFilterPanelOpen
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-500"
                  : isDark
                  ? "border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white"
                  : "border-black/10 bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="h-4 w-4 rounded-full bg-sky-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Favorites Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "favorites" ? "search" : "favorites")}
              className={`p-2 rounded-full border transition cursor-pointer relative ${
                activeTab === "favorites"
                  ? "border-pink-500 bg-pink-500/10 text-pink-500"
                  : isDark
                  ? "border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white"
                  : "border-black/10 bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
              title="Saved Favorites"
            >
              <Heart className={`w-4 h-4 ${favorites.length > 0 ? "fill-pink-500 text-pink-500" : ""}`} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Dark / Light Mode Switch */}
            <button
              type="button"
              onClick={() => {
                const next = !isDark;
                setIsDark(next);
                localStorage.setItem("tattva_theme", next ? "dark" : "light");
              }}
              className={`p-2 rounded-full border transition cursor-pointer ${
                isDark
                  ? "border-neutral-700 bg-neutral-800 text-amber-300 hover:text-white"
                  : "border-black/10 bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Back to Chat Link */}
            <Link
              href="/chat"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs hover:opacity-90 transition shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>AI Chat</span>
            </Link>
          </div>
        </div>

        {/* Categories Horizontal Scroll Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-1 pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-semibold">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => handleCategoryChange(cat.value)}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition cursor-pointer border ${
                selectedCategory === cat.value
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent shadow-xs"
                  : isDark
                  ? "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:bg-neutral-800"
                  : "border-black/5 bg-neutral-100/80 text-neutral-600 hover:text-black hover:bg-neutral-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {isFilterPanelOpen && (
          <div
            className={`border-t px-4 sm:px-6 py-3.5 text-xs animate-in slide-in-from-top-2 duration-150 ${
              isDark ? "border-neutral-800 bg-[#141518]" : "border-black/5 bg-neutral-50"
            }`}
          >
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                {/* Orientation Filter */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-400">Orientation:</span>
                  <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                    {(["all", "landscape", "portrait", "square"] as ImageOrientation[]).map((ori) => (
                      <button
                        key={ori}
                        type="button"
                        onClick={() => {
                          setSelectedOrientation(ori);
                          setTimeout(() => executeSearch(activeQuery, 1), 50);
                        }}
                        className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer font-medium ${
                          selectedOrientation === ori
                            ? "bg-sky-500 text-white font-bold shadow-xs"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        {ori}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Filter */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-400">Size:</span>
                  <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                    {(["all", "large", "medium", "small"] as ImageSize[]).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setSelectedSize(sz);
                          setTimeout(() => executeSearch(activeQuery, 1), 50);
                        }}
                        className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer font-medium ${
                          selectedSize === sz
                            ? "bg-sky-500 text-white font-bold shadow-xs"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        {sz === "large" ? "HD Large" : sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source / Provider Filter */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-400">Source:</span>
                  <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                    {(["all", "openverse", "wikimedia"] as ImageProviderId[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setSelectedProvider(p);
                          setTimeout(() => executeSearch(activeQuery, 1), 50);
                        }}
                        className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer font-medium ${
                          selectedProvider === p
                            ? "bg-sky-500 text-white font-bold shadow-xs"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        {p === "all" ? "All Sources" : p === "openverse" ? "Openverse" : "Wikimedia"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3 py-1 rounded-lg text-sky-500 hover:underline font-semibold cursor-pointer"
                >
                  Reset all filters
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Related Searches Pills Bar (Google Images Style) */}
        {activeTab === "search" && relatedSearches.length > 0 && (
          <div className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[11px] font-semibold text-neutral-400 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-500" /> Related:
            </span>
            {relatedSearches.map((rel, rIdx) => (
              <button
                key={rIdx}
                type="button"
                onClick={() => {
                  setQuery(rel);
                  executeSearch(rel, 1);
                }}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer whitespace-nowrap shadow-2xs ${
                  isDark
                    ? "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-sky-500 hover:text-sky-400"
                    : "border-black/10 bg-white text-neutral-700 hover:border-sky-500 hover:text-sky-600"
                }`}
              >
                <Search className="w-2.5 h-2.5 opacity-60" />
                <span>{rel}</span>
              </button>
            ))}
          </div>
        )}

        {/* Status Bar */}
        <div className="mb-4 flex items-center justify-between text-xs text-neutral-400 px-1 font-mono">
          <div>
            {activeTab === "favorites" ? (
              <span>Your Saved Favorite Photos ({favorites.length})</span>
            ) : (
              <span>
                {loading ? (
                  "Retrieving real photographs across Openverse & Wikimedia Commons..."
                ) : (
                  <>
                    About <strong className="text-neutral-700 dark:text-neutral-200">{totalResults}</strong> photographs{" "}
                    {latencyMs ? `(${latencyMs} ms)` : ""}
                  </>
                )}
              </span>
            )}
          </div>
          {providersUsed.length > 0 && activeTab === "search" && (
            <div className="hidden sm:flex items-center gap-1 text-[11px]">
              <span>Grounded via:</span>
              <strong className="text-neutral-700 dark:text-neutral-200">{providersUsed.join(", ")}</strong>
            </div>
          )}
        </div>

        {/* Favorites View */}
        {activeTab === "favorites" && (
          <div>
            {favorites.length === 0 ? (
              <div className="text-center py-24 max-w-sm mx-auto space-y-3">
                <div className="w-16 h-16 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center mx-auto border border-pink-500/20">
                  <Heart className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base">No Favorite Photos Yet</h3>
                <p className="text-xs text-neutral-400">
                  Click the heart icon on any photo result to bookmark your favorite high-resolution images here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("search")}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Explore Images
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {favorites.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedImage(item)}
                    className="group relative overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 aspect-square bg-neutral-900 cursor-pointer shadow-sm hover:shadow-xl transition-all"
                  >
                    <Image
                      src={item.thumbnail || item.url}
                      alt={item.title}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(item, e)}
                        className="p-1.5 rounded-full bg-black/60 text-pink-500 backdrop-blur-md shadow-xs hover:scale-110 transition"
                      >
                        <Heart className="w-3.5 h-3.5 fill-pink-500" />
                      </button>
                    </div>
                    {/* Source link on the bottom very smally */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 pt-4 flex items-center justify-between text-[9px] font-mono text-neutral-300">
                      <span className="truncate max-w-[120px]">{item.source}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-neutral-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Results Grid */}
        {activeTab === "search" && (
          <div>
            {loading ? (
              /* Loading Skeletons */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {Array.from({ length: 15 }).map((_, sIdx) => (
                  <div
                    key={sIdx}
                    className="aspect-square rounded-2xl bg-neutral-200/60 dark:bg-neutral-800/60 animate-pulse border border-black/5 dark:border-white/5"
                  />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-24 max-w-md mx-auto space-y-3">
                <div className="w-16 h-16 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto border border-sky-500/20">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base">No Photographs Found</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  We could not find real photos matching &ldquo;{activeQuery}&rdquo;. Try another topic like &ldquo;sunflowers&rdquo;, &ldquo;sports cars&rdquo;, &ldquo;mountains&rdquo;, or reset filters.
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  {["Sunflowers", "Sports cars", "Snow mountains", "Forest landscape"].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => {
                        setQuery(sample);
                        executeSearch(sample, 1);
                      }}
                      className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs font-semibold hover:bg-sky-500 hover:text-white transition"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {results.map((item, idx) => {
                  if (imageErrors[item.id]) return null;
                  const isFav = favorites.some((f) => f.id === item.id);

                  // Extract clean host
                  let cleanHost = item.source || "web";
                  if (item.sourceUrl) {
                    try {
                      cleanHost = new URL(item.sourceUrl).hostname.replace("www.", "");
                    } catch {}
                  }

                  return (
                    <div
                      key={item.id + idx}
                      onClick={() => setSelectedImage(item)}
                      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 aspect-square cursor-pointer bg-neutral-900 shadow-sm hover:shadow-xl ${
                        isDark
                          ? "border-white/10 hover:border-sky-500/50 shadow-black/40"
                          : "border-black/10 hover:border-sky-400 shadow-neutral-200"
                      }`}
                    >
                      {/* Real Photograph */}
                      <Image
                        src={item.thumbnail || item.url}
                        alt={item.title}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => {
                          setImageErrors((prev) => ({ ...prev, [item.id]: true }));
                        }}
                      />

                      {/* Top Action Pills: Dimensions & Favorite Button */}
                      <div className="absolute top-2.5 inset-x-2.5 z-10 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {item.width && item.height ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-mono font-bold text-white/90 border border-white/10">
                            {item.width >= 1920 ? "HD " : ""}
                            {item.width}×{item.height}
                          </span>
                        ) : (
                          <span />
                        )}

                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(item, e)}
                          className={`p-1.5 rounded-full backdrop-blur-md transition shadow-xs hover:scale-110 ${
                            isFav
                              ? "bg-black/80 text-pink-500"
                              : "bg-black/60 text-white hover:text-pink-400 hover:bg-black/90"
                          }`}
                          title={isFav ? "Saved to Favorites" : "Add to Favorites"}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-pink-500 text-pink-500" : ""}`} />
                        </button>
                      </div>

                      {/* Top Gradient scrim for title */}
                      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 via-black/30 to-transparent p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-5">
                        <p className="text-white text-[11px] font-semibold line-clamp-1 drop-shadow-sm">
                          {item.title}
                        </p>
                      </div>

                      {/* Bottom Overlay Bar: Shows the source link in the bottom of the image very smally */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-5 flex items-end justify-between gap-1 z-10">
                        {/* Tiny Source Link */}
                        {item.sourceUrl ? (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 max-w-[85%] truncate rounded-md bg-black/75 hover:bg-black px-1.5 py-0.5 text-[9px] font-mono text-neutral-300 hover:text-white backdrop-blur-md border border-white/15 transition-colors shadow-2xs"
                            title={`Original Source: ${item.sourceUrl}`}
                          >
                            <Globe className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                            <span className="truncate">{cleanHost}</span>
                            <ExternalLink className="w-2 h-2 text-neutral-400 shrink-0 opacity-70" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[9px] font-mono text-neutral-300 backdrop-blur-md border border-white/10">
                            <Globe className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                            <span className="truncate">{cleanHost}</span>
                          </span>
                        )}

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-medium backdrop-blur-md shrink-0 border border-white/10">
                          <Maximize2 className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Load More Pagination */}
            {results.length > 0 && !loading && (
              <div className="mt-8 mb-12 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => executeSearch(activeQuery, page + 1, true)}
                  className="px-6 py-3 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 transition shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading more photographs...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      <span>Load More Images</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
          PREMIUM GOOGLE-IMAGES STYLE FULLSCREEN PREVIEW MODAL
      ========================================================================= */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-2 sm:p-6 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className={`relative w-full max-w-5xl max-h-[92vh] flex flex-col md:flex-row rounded-3xl border shadow-2xl overflow-hidden transition-colors ${
              isDark ? "bg-[#16171b] border-neutral-800 text-white" : "bg-white border-black/10 text-neutral-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Big Image Viewport */}
            <div className="flex-1 bg-black/95 relative min-h-[300px] sm:min-h-[420px] md:min-h-[550px] flex items-center justify-center p-4 overflow-hidden">
              <Image
                src={selectedImage.url}
                alt={selectedImage.title}
                width={selectedImage.width || 1200}
                height={selectedImage.height || 900}
                unoptimized
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
              />

              {/* Close Button Mobile */}
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="md:hidden absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-black transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Comprehensive Details & Metadata Panel */}
            <div className="w-full md:w-96 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto max-h-[45vh] md:max-h-[92vh] border-t md:border-t-0 md:border-l border-black/10 dark:border-white/10 space-y-4">
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
                    {selectedImage.provider === "openverse" ? "Openverse CC" : "Wikimedia Commons"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="hidden md:flex p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition text-neutral-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="text-base sm:text-lg font-bold leading-snug">
                  {selectedImage.title}
                </h2>

                {/* Creator Attribution */}
                {selectedImage.creator && (
                  <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Photo by: <strong>{selectedImage.creator}</strong></span>
                  </div>
                )}

                {/* License Tag */}
                {selectedImage.license && (
                  <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>License: <strong>{selectedImage.license}</strong></span>
                    {selectedImage.licenseUrl && (
                      <a
                        href={selectedImage.licenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-500 hover:underline inline-flex items-center gap-0.5"
                      >
                        Deed <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* Technical Specs */}
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Dimensions</span>
                    <strong className="text-neutral-900 dark:text-white">
                      {selectedImage.width && selectedImage.height
                        ? `${selectedImage.width} × ${selectedImage.height}`
                        : "Full Resolution"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Source Domain</span>
                    <strong className="text-neutral-900 dark:text-white truncate block">
                      {selectedImage.source}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-black/10 dark:border-white/10">
                <a
                  href={selectedImage.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white transition shadow-xs cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                  <span>Visit Website / Original Page</span>
                  <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(selectedImage)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(selectedImage)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 transition cursor-pointer"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        favorites.some((f) => f.id === selectedImage.id)
                          ? "fill-pink-500 text-pink-500"
                          : "text-neutral-400"
                      }`}
                    />
                    <span>Favorite</span>
                  </button>
                </div>

                <a
                  href={selectedImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-[11px] text-sky-500 hover:underline pt-1"
                >
                  Open direct high-res photo link ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

