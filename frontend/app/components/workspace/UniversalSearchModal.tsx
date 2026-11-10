"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  FileText,
  Table,
  Presentation,
  Mail,
  BookOpen,
  Database,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { WorkspaceItem, WorkspaceAppId } from "./types";

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WorkspaceItem[];
  onOpenItem: (item: WorkspaceItem) => void;
}

export function UniversalSearchModal({
  isOpen,
  onClose,
  items,
  onOpenItem,
}: UniversalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [filterApp, setFilterApp] = useState<string>("all");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const filteredItems = items.filter((it) => {
    const matchesApp = filterApp === "all" || it.app === filterApp;
    const matchesQuery =
      !query.trim() ||
      it.name.toLowerCase().includes(query.toLowerCase()) ||
      it.tags?.some((t) => t.toLowerCase().includes(query.toLowerCase())) ||
      it.description?.toLowerCase().includes(query.toLowerCase());
    return matchesApp && matchesQuery;
  });

  const getAppLetter = (app: WorkspaceAppId) => {
    switch (app) {
      case "word": return "W";
      case "excel": return "X";
      case "powerpoint": return "P";
      case "outlook": return "O";
      case "onenote": return "N";
      case "publisher": return "P";
      case "access": return "A";
      default: return "F";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#111111]">
        {/* Search Bar */}
        <div className="p-4 border-b border-[#E5E5E5] flex items-center space-x-3 bg-white">
          <div className="w-8 h-8 rounded-lg bg-[#D97706] flex items-center justify-center text-white shadow-xs shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, apps, content, or ask TATTVA AI..."
            className="flex-1 bg-transparent text-sm text-[#111111] placeholder-neutral-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-neutral-100 text-neutral-600 border border-[#E5E5E5] rounded">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick App Filters */}
        <div className="px-4 py-2 border-b border-[#E5E5E5] bg-[#F9FAFB] flex space-x-2 text-xs overflow-x-auto scrollbar-none">
          {["all", "word", "excel", "powerpoint", "outlook", "onenote", "publisher", "access"].map((a) => (
            <button
              key={a}
              onClick={() => setFilterApp(a)}
              className={`px-2.5 py-1 rounded-lg capitalize transition text-[11px] font-medium shrink-0 shadow-xs ${
                filterApp === a
                  ? "bg-black text-white"
                  : "bg-white border border-[#E5E5E5] text-neutral-600 hover:text-black hover:border-neutral-400"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Search Results */}
        <div className="p-4 max-h-96 overflow-y-auto space-y-2 text-xs">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30 text-black" />
              <p className="font-medium text-neutral-600">No workspace items found matching &quot;{query}&quot;</p>
              <p className="text-[11px] mt-1 text-neutral-400">Try searching for keywords, tags, or file formats</p>
            </div>
          ) : (
            filteredItems.map((it) => (
              <div
                key={it.id}
                onClick={() => {
                  onOpenItem(it);
                  onClose();
                }}
                className="p-3 rounded-xl bg-white hover:bg-neutral-50 border border-[#E5E5E5] hover:border-neutral-400 cursor-pointer flex items-center justify-between transition group shadow-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-[#E5E5E5] flex items-center justify-center font-bold text-xs text-black">
                    {getAppLetter(it.app)}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#111111] group-hover:underline transition">
                      {it.name}
                    </div>
                    <div className="text-[10px] text-neutral-500 flex items-center space-x-2">
                      <span className="uppercase font-mono text-neutral-600 font-semibold">{it.format}</span>
                      <span>•</span>
                      <span>Updated {new Date(it.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-black transition" />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#E5E5E5] bg-[#F9FAFB] text-[10px] text-neutral-500 flex justify-between">
          <span>Use ⇅ arrows to navigate</span>
          <span>Press Enter to open</span>
        </div>
      </div>
    </div>
  );
}

export default UniversalSearchModal;
