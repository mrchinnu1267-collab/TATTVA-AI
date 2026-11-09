"use client";

import React, { useState } from "react";
import {
  Plus,
  Clock,
  Star,
  Pin,
  ExternalLink,
  Download,
  Trash2,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FolderOpen,
  Search,
  SlidersHorizontal,
  Share2,
  HardDrive,
  BarChart3,
  Layers,
  ChevronRight,
} from "lucide-react";
import { WORKSPACE_APPS, WORKSPACE_APPS_LIST } from "./constants";
import { WorkspaceAppId, WorkspaceItem } from "./types";

interface DashboardViewProps {
  items: WorkspaceItem[];
  onOpenItem: (item: WorkspaceItem) => void;
  onOpenApp: (appId: WorkspaceAppId) => void;
  onNewItemForApp: (appId: WorkspaceAppId) => void;
  onToggleStar: (itemId: string) => void;
  onTogglePin: (itemId: string) => void;
  onTrashItem: (itemId: string) => void;
  onExportItem: (item: WorkspaceItem) => void;
  searchFilter?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  items,
  onOpenItem,
  onOpenApp,
  onNewItemForApp,
  onToggleStar,
  onTogglePin,
  onTrashItem,
  onExportItem,
  searchFilter = "",
}) => {
  const [activeCategory, setActiveCategory] = useState<"all" | "recent" | "pinned" | "shared">("all");
  const [query, setQuery] = useState(searchFilter);

  // Filter active non-trashed items
  const activeItems = items.filter((i) => !i.isTrashed);

  const searchedItems = activeItems.filter((i) => {
    if (!query.trim()) return true;
    const lower = query.toLowerCase();
    return (
      i.name.toLowerCase().includes(lower) ||
      i.app.toLowerCase().includes(lower) ||
      (i.tags && i.tags.some((t) => t.toLowerCase().includes(lower)))
    );
  });

  const displayedItems = searchedItems.filter((i) => {
    if (activeCategory === "pinned") return i.isPinned;
    if (activeCategory === "shared") return i.isShared;
    return true;
  });

  const recentDocs = [...displayedItems]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  const pinnedDocs = activeItems.filter((i) => i.isPinned);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 bg-[#0B0F19] text-slate-100 select-none">
      {/* 1. Header Banner & Metric Overview */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800/80 p-6 md:p-8 shadow-xl overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>TATTVA AI Integrated Productivity Platform</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            MY WORKSPACE
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
            Seven full-featured office productivity applications powered by Google Gemini AI.
            Create, edit, analyze, and present with persistent local vault storage and verified Office Open XML export.
          </p>

          <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-300">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{activeItems.length} Active Documents</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Zero-Trust Vault & Cloud Sync</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span>126 GB of 500 GB Storage</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Action Launcher */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Quick Actions:
        </span>
        <button
          onClick={() => onNewItemForApp("word")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#185ABD]/20 border border-[#185ABD]/40 text-blue-300 hover:bg-[#185ABD]/30 transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Document</span>
        </button>
        <button
          onClick={() => onNewItemForApp("excel")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#107C41]/20 border border-[#107C41]/40 text-emerald-300 hover:bg-[#107C41]/30 transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Spreadsheet</span>
        </button>
        <button
          onClick={() => onNewItemForApp("powerpoint")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#C43E1C]/20 border border-[#C43E1C]/40 text-orange-300 hover:bg-[#C43E1C]/30 transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Presentation</span>
        </button>
        <button
          onClick={() => onNewItemForApp("outlook")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0078D4]/20 border border-[#0078D4]/40 text-sky-300 hover:bg-[#0078D4]/30 transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Compose Email</span>
        </button>
        <button
          onClick={() => onNewItemForApp("onenote")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#7719AA]/20 border border-[#7719AA]/40 text-purple-300 hover:bg-[#7719AA]/30 transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Note</span>
        </button>
        <button
          onClick={() => onNewItemForApp("publisher")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#008272]/20 border border-[#008272]/40 text-teal-300 hover:bg-[#008272]/30 transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Design Poster</span>
        </button>
        <button
          onClick={() => onNewItemForApp("access")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#A4373A]/20 border border-[#A4373A]/40 text-rose-300 hover:bg-[#A4373A]/30 transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Database</span>
        </button>
      </div>

      {/* 3. Seven Productivity Applications Responsive Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Applications</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                7 Available
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Launch dedicated office studios or create a new document in any standard format.
            </p>
          </div>
        </div>

        {/* 
          Grid Layout: 3 columns on large screens, matching user specification:
          [ Word ]       [ Excel ]       [ PowerPoint ]
          [ Outlook ]    [ OneNote ]     [ Publisher ]
          [ Access ]
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {WORKSPACE_APPS_LIST.map((app) => {
            const appFiles = activeItems.filter((i) => i.app === app.id);
            const latestFile = appFiles[0];

            return (
              <div
                key={app.id}
                className="bg-slate-900/70 hover:bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 p-5 shadow-lg transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
              >
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
                  style={{ backgroundColor: app.color }}
                />

                <div>
                  {/* Top Row: App Icon + Format Badge + Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      style={{ backgroundColor: app.color }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-2xl shadow-md group-hover:scale-105 transition-transform shrink-0"
                    >
                      {app.letter}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 font-semibold">
                        .{app.defaultFormat}
                      </span>
                      <span className="flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Ready</span>
                      </span>
                    </div>
                  </div>

                  {/* App Name & Tagline */}
                  <h3 className="font-extrabold text-base text-white tracking-tight">
                    {app.name}
                  </h3>
                  <p className="text-xs text-indigo-400 font-semibold mb-1">
                    {app.tagline}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {app.description}
                  </p>
                </div>

                {/* Card Bottom: Recent Files + Actions */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-medium">{appFiles.length} saved files</span>
                    {latestFile ? (
                      <span
                        onClick={() => onOpenItem(latestFile)}
                        className="truncate max-w-[140px] text-indigo-300 hover:underline cursor-pointer"
                        title={latestFile.name}
                      >
                        Recent: {latestFile.name}
                      </span>
                    ) : (
                      <span className="text-slate-500">No files yet</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onOpenApp(app.id)}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center justify-center space-x-1.5 hover:brightness-110 active:scale-98"
                      style={{ backgroundColor: app.color }}
                      title={`Open ${app.name} Studio`}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Open {app.name}</span>
                    </button>

                    <button
                      onClick={() => onNewItemForApp(app.id)}
                      className="py-2 px-3 rounded-xl text-xs font-semibold border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition flex items-center space-x-1 active:scale-98"
                      title={`Create a new ${app.name} document`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Filterable Document Center (All / Recent / Pinned / Shared) */}
      <div className="pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCategory === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              All Files ({activeItems.length})
            </button>
            <button
              onClick={() => setActiveCategory("pinned")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCategory === "pinned"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Pinned ({pinnedDocs.length})
            </button>
            <button
              onClick={() => setActiveCategory("shared")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCategory === "shared"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Shared ({activeItems.filter((i) => i.isShared).length})
            </button>
          </div>

          {/* Search box inside document table */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter files..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Documents Table */}
        {recentDocs.length === 0 ? (
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-8 text-center text-xs text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
            <p>No documents found matching your filter.</p>
          </div>
        ) : (
          <div className="bg-slate-900/70 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-3">Application</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3">Last Modified</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentDocs.map((doc) => {
                    const meta = WORKSPACE_APPS_LIST.find((a) => a.id === doc.app);
                    return (
                      <tr key={doc.id} className="hover:bg-slate-800/40 transition group">
                        <td className="py-3 px-4">
                          <div
                            onClick={() => onOpenItem(doc)}
                            className="flex items-center space-x-3 cursor-pointer"
                          >
                            <div
                              style={{ backgroundColor: meta?.color || "#2563EB" }}
                              className="w-7 h-7 rounded flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                            >
                              {meta?.letter || "F"}
                            </div>
                            <div className="truncate max-w-xs md:max-w-md">
                              <span className="font-semibold text-slate-200 hover:text-indigo-400 transition block truncate">
                                {doc.name}
                              </span>
                              {doc.description && (
                                <span className="text-[11px] text-slate-500 truncate block">
                                  {doc.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-slate-300 font-medium">{meta?.name || doc.app}</span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 font-semibold uppercase">
                            {doc.format}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-400">
                          {new Date(doc.updatedAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={() => onToggleStar(doc.id)}
                              className={`p-1.5 rounded hover:bg-slate-800 transition ${
                                doc.isStarred ? "text-amber-400" : "text-slate-500"
                              }`}
                              title={doc.isStarred ? "Unstar" : "Star"}
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </button>

                            <button
                              onClick={() => onTogglePin(doc.id)}
                              className={`p-1.5 rounded hover:bg-slate-800 transition ${
                                doc.isPinned ? "text-rose-400" : "text-slate-500"
                              }`}
                              title={doc.isPinned ? "Unpin" : "Pin"}
                            >
                              <Pin className="w-3.5 h-3.5 fill-current" />
                            </button>

                            <button
                              onClick={() => onExportItem(doc)}
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                              title="Export file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onTrashItem(doc.id)}
                              className="p-1.5 rounded hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 transition"
                              title="Move to Recycle Bin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardView;
