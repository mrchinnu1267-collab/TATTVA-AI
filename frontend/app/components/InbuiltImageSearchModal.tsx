"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Search,
  X,
  ExternalLink,
  Camera,
  Loader2,
  Sparkles,
  Maximize2,
  Send,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export interface SelectedImagePayload {
  title: string;
  url: string;
  source: string;
  sourceUrl: string;
  creator?: string;
  license?: string;
}

interface InbuiltImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage?: (image: SelectedImagePayload) => void;
  onSendQueryToChat?: (query: string) => void;
  initialQuery?: string;
  isDark?: boolean;
}

interface ImageItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  originalUrl: string;
  width?: number;
  height?: number;
  source: string;
  sourceUrl: string;
  creator?: string;
  license?: string;
}

const POPULAR_SUGGESTIONS = [
  { label: "Red roses", icon: "🌹" },
  { label: "Sunflowers", icon: "🌻" },
  { label: "Different animals", icon: "🦁" },
  { label: "Sports cars", icon: "🏎️" },
  { label: "Forest landscapes", icon: "🌲" },
  { label: "Mountains", icon: "🏔️" },
  { label: "Architecture", icon: "🏛️" },
  { label: "Technology", icon: "💻" },
];

export default function InbuiltImageSearchModal({
  isOpen,
  onClose,
  onSelectImage,
  onSendQueryToChat,
  initialQuery = "",
  isDark = true,
}: InbuiltImageSearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialQuery && initialQuery !== query) {
        setQuery(initialQuery);
        handleSearch(initialQuery);
      } else if (!hasSearched && !query) {
        // Run a default popular search for immediate delight
        handleSearch("Red roses");
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialQuery]);

  const handleSearch = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setImageErrors({});

    try {
      const res = await fetch(`/api/images/search?q=${encodeURIComponent(q)}&pageSize=24`);
      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }
      const data = await res.json();
      setResults(data.results || []);
      setTotalResults(data.totalResults || 0);
      setHasSearched(true);
    } catch (err) {
      console.error("[InbuiltImageSearch] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load real photos");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative flex flex-col w-full max-w-5xl h-[88vh] max-h-[850px] rounded-3xl border shadow-2xl overflow-hidden transition-all animate-in zoom-in-95 duration-200 ${
          isDark
            ? "bg-[#18181b] border-neutral-700 text-neutral-100"
            : "bg-white border-neutral-200 text-neutral-900"
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
            isDark ? "border-neutral-800 bg-neutral-900/50" : "border-neutral-100 bg-neutral-50/80"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md">
              <Camera className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Web Image Search
                </h2>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/25">
                  Real Photographs
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Search live internet photography from Wikimedia Commons &amp; Openverse
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={query ? `/images?q=${encodeURIComponent(query)}` : "/images"}
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isDark
                  ? "border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-700"
                  : "border-neutral-200 bg-white text-neutral-700 hover:text-black hover:bg-neutral-100"
              }`}
              title="Open standalone search engine in new tab"
            >
              <span>Full Page</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition ${
                isDark
                  ? "text-neutral-400 hover:text-white hover:bg-neutral-800"
                  : "text-neutral-500 hover:text-black hover:bg-neutral-100"
              }`}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar & Suggestions */}
        <div
          className={`p-4 sm:p-5 border-b shrink-0 space-y-3 ${
            isDark ? "border-neutral-800 bg-[#1f1f23]" : "border-neutral-100 bg-white"
          }`}
        >
          <form onSubmit={onSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search real photos (e.g. red roses, sports cars, mountains, architecture)..."
                className={`w-full pl-11 pr-10 py-3 rounded-2xl border text-sm sm:text-base outline-none transition ${
                  isDark
                    ? "border-neutral-700 bg-neutral-900 text-white placeholder-neutral-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    : "border-neutral-300 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                }`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-200 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-sm transition shadow-md shrink-0 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4 stroke-[2.5]" />
              )}
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>

          {/* Quick Suggestions Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] font-semibold text-neutral-400 shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-400" /> Suggestions:
            </span>
            {POPULAR_SUGGESTIONS.map((sug) => (
              <button
                key={sug.label}
                type="button"
                onClick={() => {
                  setQuery(sug.label);
                  handleSearch(sug.label);
                }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition cursor-pointer select-none ${
                  query.toLowerCase() === sug.label.toLowerCase()
                    ? "bg-sky-500/20 border-sky-500/40 text-sky-300 font-bold"
                    : isDark
                    ? "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                    : "border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                <span>{sug.icon}</span>
                <span>{sug.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-3 animate-in fade-in">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              <p className="text-sm font-medium">
                Searching real photographs from Wikimedia Commons &amp; Openverse...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-base">Search encountered an issue</h3>
              <p className="text-xs text-neutral-400">{error}</p>
              <button
                type="button"
                onClick={() => handleSearch(query || "Red roses")}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && results.length === 0 && hasSearched && (
            <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto space-y-2">
              <Camera className="w-10 h-10 text-neutral-500 stroke-[1.5]" />
              <h3 className="font-semibold text-base">No real photographs found</h3>
              <p className="text-xs text-neutral-400">
                Try searching for broader keywords like &quot;flowers&quot;, &quot;animals&quot;, &quot;mountains&quot;, or &quot;architecture&quot;.
              </p>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                <span>
                  Showing {results.filter((img) => !imageErrors[img.id]).length} real photographs
                </span>
                <span className="text-[11px] font-mono opacity-80">
                  Openverse + Wikimedia Commons
                </span>
              </div>

              {/* Responsive Gallery Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {results.map((img) => {
                  if (imageErrors[img.id]) return null;

                  let cleanHost = img.source || "web";
                  if (img.sourceUrl) {
                    try {
                      cleanHost = new URL(img.sourceUrl).hostname.replace("www.", "");
                    } catch {}
                  }

                  const displayImgUrl = img.thumbnailUrl || img.originalUrl;

                  return (
                    <div
                      key={img.id}
                      className={`group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl ${
                        isDark
                          ? "border-neutral-800 bg-neutral-900/90 hover:border-sky-500/50"
                          : "border-neutral-200 bg-neutral-50 hover:border-sky-400"
                      }`}
                    >
                      {/* Image Preview Box */}
                      <div className="relative aspect-square w-full overflow-hidden bg-neutral-950">
                        <Image
                          src={displayImgUrl}
                          alt={img.title || "Web Image Result"}
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={() =>
                            setImageErrors((prev) => ({ ...prev, [img.id]: true }))
                          }
                        />

                        {/* Top Overlay Badge for Source & License */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-mono text-white/90 border border-white/10 uppercase">
                            {img.source}
                          </span>
                          {img.license && (
                            <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] font-mono text-neutral-300 border border-white/10 truncate max-w-[100px]">
                              {img.license}
                            </span>
                          )}
                        </div>

                        {/* Hover Quick Action Buttons */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-2 pointer-events-auto">
                          {onSelectImage && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectImage({
                                  title: img.title,
                                  url: img.originalUrl || img.thumbnailUrl,
                                  source: img.source,
                                  sourceUrl: img.sourceUrl,
                                  creator: img.creator,
                                  license: img.license,
                                });
                                onClose();
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg transition active:scale-95 cursor-pointer"
                              title="Insert this image into your chat prompt"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Use in Chat</span>
                            </button>
                          )}

                          <a
                            href={img.originalUrl || img.thumbnailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm shadow-md transition"
                            title="Open full resolution"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                      {/* Card Bottom Meta & Tiny Source Link */}
                      <div className="p-3 flex flex-col justify-between flex-1 space-y-1.5">
                        <p
                          className="text-xs font-semibold line-clamp-2 leading-snug"
                          title={img.title}
                        >
                          {img.title || "Photograph"}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-neutral-800/40 text-[10px]">
                          <a
                            href={img.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-mono underline decoration-sky-400/40 underline-offset-2 hover:decoration-sky-300 transition max-w-[130px] truncate"
                            title={`Open source at ${img.sourceUrl}`}
                          >
                            <span>{cleanHost}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>

                          {onSendQueryToChat && (
                            <button
                              type="button"
                              onClick={() => {
                                onSendQueryToChat(
                                  `Tell me about this and show photographs: ${img.title}`
                                );
                                onClose();
                              }}
                              className="inline-flex items-center gap-0.5 text-neutral-400 hover:text-white transition font-medium text-[10px]"
                              title="Ask TATTVA AI about this in chat"
                            >
                              <span>Ask AI</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t text-xs shrink-0 ${
            isDark ? "border-neutral-800 bg-neutral-900/50 text-neutral-400" : "border-neutral-100 bg-neutral-50 text-neutral-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>100% Free Open Web APIs (No Subscriptions)</span>
          </div>

          <a
            href="/images"
            className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold transition"
          >
            <span>Open Dedicated Image Search Engine</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

