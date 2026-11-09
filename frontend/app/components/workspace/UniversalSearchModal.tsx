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
  Clock,
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

  const getAppIcon = (app: WorkspaceAppId) => {
    switch (app) {
      case "word":
        return <FileText className="w-4 h-4 text-blue-400" />;
      case "excel":
        return <Table className="w-4 h-4 text-emerald-400" />;
      case "powerpoint":
        return <Presentation className="w-4 h-4 text-orange-400" />;
      case "outlook":
        return <Mail className="w-4 h-4 text-sky-400" />;
      case "onenote":
        return <BookOpen className="w-4 h-4 text-purple-400" />;
      case "access":
        return <Database className="w-4 h-4 text-rose-400" />;
      default:
        return <FileText className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-900/90">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, apps, content, or ask TATTVA AI..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 rounded">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick App Filters */}
        <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/50 flex space-x-2 text-xs overflow-x-auto">
          {["all", "word", "excel", "powerpoint", "outlook", "onenote", "publisher", "access"].map((a) => (
            <button
              key={a}
              onClick={() => setFilterApp(a)}
              className={`px-2.5 py-1 rounded-lg capitalize transition text-[11px] font-medium shrink-0 ${
                filterApp === a
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-800/70 text-slate-400 hover:text-white"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Search Results */}
        <div className="p-4 max-h-96 overflow-y-auto space-y-2 text-xs">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-400" />
              <p>No workspace items found matching &quot;{query}&quot;</p>
              <p className="text-[11px] mt-1 text-slate-600">Try searching for keywords, tags, or file formats</p>
            </div>
          ) : (
            filteredItems.map((it) => (
              <div
                key={it.id}
                onClick={() => {
                  onOpenItem(it);
                  onClose();
                }}
                className="p-3 rounded-xl bg-slate-900/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 cursor-pointer flex items-center justify-between transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-indigo-900/40 transition">
                    {getAppIcon(it.app)}
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-indigo-300 transition">
                      {it.name}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                      <span className="uppercase font-mono text-slate-500">{it.format}</span>
                      <span>•</span>
                      <span>Updated {new Date(it.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition" />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-900/90 text-[10px] text-slate-500 flex justify-between">
          <span>Use ⇅ arrows to navigate</span>
          <span>Press Enter to open</span>
        </div>
      </div>
    </div>
  );
}

