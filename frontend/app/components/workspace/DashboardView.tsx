"use client";

import React, { useState } from "react";
import {
  Plus,
  Clock,
  Star,
  Pin,
  Download,
  Trash2,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FolderOpen,
  Search,
  HardDrive,
  BarChart3,
  Users,
  Bot,
  Mic,
  Target,
  History,
  Store,
  Brain,
  Kanban,
  PenTool,
  BookOpen,
  ExternalLink,
  Mail,
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
  onSendViaEmail?: (item: WorkspaceItem) => void;
  searchFilter?: string;
  onOpenAssistant?: () => void;
  onOpenModal?: (modalType: string) => void;
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
  onSendViaEmail,
  searchFilter = "",
  onOpenAssistant,
  onOpenModal,
}) => {
  const [activeCategory, setActiveCategory] = useState<"all" | "pinned" | "shared">("all");
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
    .slice(0, 15);

  const pinnedDocs = activeItems.filter((i) => i.isPinned);
  const sharedDocs = activeItems.filter((i) => i.isShared);

  // 6 Application Cards matching reference screenshot
  const ecosystemAppCards = [
    {
      id: "ai-agent",
      title: "AI Agent Automation",
      description: "Automate multi-step tasks (e.g., report → analysis → presentation)",
      iconBg: "bg-[#5B21B6]", // Purple
      icon: Bot,
      action: () => (onOpenAssistant ? onOpenAssistant() : onOpenApp("powerpoint")),
    },
    {
      id: "collaboration",
      title: "Real-Time Collaboration",
      description: "Edit together, comment, and track changes live",
      iconBg: "bg-[#2563EB]", // Blue
      icon: Users,
      action: () => (onOpenModal ? onOpenModal("collab") : onOpenApp("word")),
    },
    {
      id: "doc-intel",
      title: "Document Intelligence",
      description: "Summarize, extract, compare, OCR, and analyze documents",
      iconBg: "bg-[#059669]", // Emerald
      icon: FileText,
      action: () => (onOpenModal ? onOpenModal("doc-intel") : onOpenApp("word")),
    },
    {
      id: "universal-search",
      title: "Universal Search",
      description: "Find anything across all workspace apps and files",
      iconBg: "bg-[#D97706]", // Amber
      icon: Search,
      action: () => (onOpenModal ? onOpenModal("search") : undefined),
    },
    {
      id: "insights",
      title: "Workspace Insights",
      description: "Usage, activity, AI operations and productivity analytics",
      iconBg: "bg-[#0891B2]", // Cyan
      icon: BarChart3,
      action: () => (onOpenModal ? onOpenModal("insights") : onOpenApp("excel")),
    },
    {
      id: "templates",
      title: "Smart Templates",
      description: "Professional, ready-to-use templates for every need",
      iconBg: "bg-[#DB2777]", // Pink/Rose
      icon: Sparkles,
      action: () => (onOpenModal ? onOpenModal("templates") : onOpenApp("publisher")),
    },
  ];

  // 8 Additional Advanced Feature Cards matching reference screenshot
  const advancedFeatureCards = [
    {
      id: "voice",
      title: "Voice Workspace",
      subtitle: "Dictation & Commands",
      icon: Mic,
      action: () => (onOpenAssistant ? onOpenAssistant() : undefined),
    },
    {
      id: "focus",
      title: "Focus Mode",
      subtitle: "Deep Work Timer",
      icon: Target,
      action: () => (onOpenModal ? onOpenModal("focus") : undefined),
    },
    {
      id: "history",
      title: "Version History",
      subtitle: "Track & Restore",
      icon: History,
      action: () => (onOpenModal ? onOpenModal("history") : undefined),
    },
    {
      id: "market",
      title: "Workflow Market",
      subtitle: "Automation Hub",
      icon: Store,
      action: () => (onOpenModal ? onOpenModal("market") : undefined),
    },
    {
      id: "memory",
      title: "Project Memory",
      subtitle: "Persistent Context",
      icon: Brain,
      action: () => (onOpenModal ? onOpenModal("memory") : undefined),
    },
    {
      id: "board",
      title: "Project Board",
      subtitle: "Kanban & Timeline",
      icon: Kanban,
      action: () => (onOpenModal ? onOpenModal("board") : undefined),
    },
    {
      id: "canvas",
      title: "Smart Canvas",
      subtitle: "Visual Mindmap",
      icon: PenTool,
      action: () => (onOpenModal ? onOpenModal("canvas") : undefined),
    },
    {
      id: "research",
      title: "Research Lab",
      subtitle: "Sources & Citations",
      icon: BookOpen,
      action: () => (onOpenModal ? onOpenModal("research") : undefined),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 bg-white text-[#111111] select-none">
      {/* 1. Header Hero Banner matching reference screenshot */}
      <div className="relative rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5] p-6 md:p-8 overflow-hidden shadow-xs">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-[#E5E5E5] text-neutral-700 text-xs font-semibold mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>TATTVA AI Integrated Productivity Platform</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#111111]">
            MY WORKSPACE
          </h1>
          <p className="text-xs md:text-sm text-neutral-600 mt-2 leading-relaxed">
            Seven full-featured office productivity applications powered by Google Gemini AI. Create, edit, analyze, and present with persistent local vault storage and verified Office Open XML export.
          </p>

          <div className="mt-5 flex flex-wrap gap-5 text-xs text-neutral-700 font-medium">
            <div className="flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-black" />
              <span>{activeItems.length > 0 ? activeItems.length : 21} Active Documents</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-black" />
              <span>Zero-Trust Vault & Cloud Sync</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <HardDrive className="w-4 h-4 text-black" />
              <span>126 GB of 500 GB Storage</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Actions Row matching reference screenshot */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-1 shrink-0">
          QUICK ACTIONS:
        </span>
        <button
          onClick={() => onNewItemForApp("word")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#111111] hover:bg-black hover:text-white transition-colors duration-150 shrink-0 font-medium shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Document</span>
        </button>
        <button
          onClick={() => onNewItemForApp("excel")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#111111] hover:bg-black hover:text-white transition-colors duration-150 shrink-0 font-medium shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Spreadsheet</span>
        </button>
        <button
          onClick={() => onNewItemForApp("powerpoint")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#111111] hover:bg-black hover:text-white transition-colors duration-150 shrink-0 font-medium shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Presentation</span>
        </button>
        <button
          onClick={() => onNewItemForApp("outlook")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#111111] hover:bg-black hover:text-white transition-colors duration-150 shrink-0 font-medium shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Compose Email</span>
        </button>
        <button
          onClick={() => onNewItemForApp("onenote")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#111111] hover:bg-black hover:text-white transition-colors duration-150 shrink-0 font-medium shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Note</span>
        </button>
        <button
          onClick={() => onNewItemForApp("publisher")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#111111] hover:bg-black hover:text-white transition-colors duration-150 shrink-0 font-medium shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Design Poster</span>
        </button>
        <button
          onClick={() => onNewItemForApp("access")}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#111111] hover:bg-black hover:text-white transition-colors duration-150 shrink-0 font-medium shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Database</span>
        </button>
      </div>

      {/* 3. The Seven Core Office Productivity Applications Grid */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-[#111111] tracking-tight">Applications</h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 border border-[#E5E5E5] text-neutral-600 font-mono font-medium">
              7 Available
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 hidden sm:inline">
            Verified Office Open XML &bull; Zero-Trust Local Vault &bull; Instant AI Generation
          </span>
        </div>

        {/* 7 Applications Grid: Word, Excel, PowerPoint, Outlook, OneNote, Publisher, Access */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {WORKSPACE_APPS_LIST.map((app) => {
            const appItems = activeItems.filter((i) => i.app === app.id);
            const recentAppFiles = [...appItems]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 2);

            return (
              <div
                key={app.id}
                className="bg-white border border-[#E5E5E5] hover:border-black rounded-2xl p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Top card header */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center space-x-3">
                      <div
                        style={{ backgroundColor: app.color }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-xs group-hover:scale-105 transition-transform shrink-0"
                      >
                        {app.letter}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h3 className="font-bold text-sm text-[#111111] leading-tight group-hover:text-black">
                            {app.name}
                          </h3>
                          <span className="text-[9.5px] uppercase font-mono px-1.5 py-0.2 bg-neutral-100 text-neutral-600 rounded border border-[#E5E5E5]">
                            {app.defaultFormat}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 font-medium leading-tight mt-0.5">
                          {app.tagline}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Ready</span>
                    </span>
                  </div>

                  {/* App Description */}
                  <p className="text-[11.5px] text-neutral-600 leading-relaxed mb-3 line-clamp-2">
                    {app.description}
                  </p>

                  {/* Recent Files for this App */}
                  <div className="bg-neutral-50 rounded-xl border border-[#E5E5E5] p-2.5 mb-3 text-xs">
                    <div className="flex items-center justify-between text-[10.5px] font-semibold text-neutral-500 mb-1">
                      <span>Recent Files</span>
                      <span className="font-mono text-neutral-400">
                        {appItems.length} {appItems.length === 1 ? "document" : "documents"}
                      </span>
                    </div>

                    {recentAppFiles.length === 0 ? (
                      <div className="text-[11px] text-neutral-400 italic py-0.5">
                        No files yet. Click &quot;New&quot; to create one.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {recentAppFiles.map((rf) => (
                          <div
                            key={rf.id}
                            onClick={() => onOpenItem(rf)}
                            className="flex items-center justify-between p-1 rounded-md hover:bg-white text-neutral-800 hover:text-black cursor-pointer transition text-[11px] border border-transparent hover:border-[#E5E5E5]"
                            title={`Open ${rf.name}`}
                          >
                            <span className="truncate max-w-[180px] font-medium">{rf.name}</span>
                            <span className="text-[10px] text-neutral-400 font-mono shrink-0 ml-1">
                              {new Date(rf.updatedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center space-x-2 pt-2 border-t border-[#E5E5E5]">
                  <button
                    onClick={() => onOpenApp(app.id)}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition shadow-xs"
                  >
                    <span>Open {app.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onNewItemForApp(app.id)}
                    className="flex items-center justify-center space-x-1 py-1.5 px-3 rounded-xl bg-white hover:bg-neutral-100 border border-[#E5E5E5] text-neutral-800 hover:text-black font-semibold text-xs transition shadow-xs"
                    title={`Create a new ${app.name} file`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Workspace Ecosystem Capabilities */}
      <div>
        <div className="flex items-center space-x-2 mb-3">
          <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
            Workspace Ecosystem Capabilities
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {ecosystemAppCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={card.action}
                className="bg-white border border-[#E5E5E5] hover:border-black rounded-xl p-3.5 shadow-xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-white mb-2.5 shadow-xs group-hover:scale-105 transition-transform ${card.iconBg}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-[#111111] mb-1 leading-snug group-hover:text-black">
                    {card.title}
                  </h4>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    {card.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Additional Advanced Features Section (8 Minimalist Cards) */}
      <div>
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-neutral-800 mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
          <span>Additional Advanced Features</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {advancedFeatureCards.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                onClick={feat.action}
                className="bg-white border border-[#E5E5E5] hover:border-black rounded-xl p-3 shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center cursor-pointer group"
              >
                <Icon className="w-4 h-4 text-neutral-800 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-[#111111] block leading-tight">
                  {feat.title}
                </span>
                <span className="text-[9.5px] text-neutral-500 block leading-tight mt-0.5">
                  {feat.subtitle}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Document Center (All / Pinned / Shared) with Clean Minimalist Table */}
      <div className="pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCategory === "all"
                  ? "bg-black text-white"
                  : "bg-white border border-[#E5E5E5] text-neutral-600 hover:text-black hover:border-neutral-400"
              }`}
            >
              All Files ({activeItems.length})
            </button>
            <button
              onClick={() => setActiveCategory("pinned")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCategory === "pinned"
                  ? "bg-black text-white"
                  : "bg-white border border-[#E5E5E5] text-neutral-600 hover:text-black hover:border-neutral-400"
              }`}
            >
              Pinned ({pinnedDocs.length})
            </button>
            <button
              onClick={() => setActiveCategory("shared")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCategory === "shared"
                  ? "bg-black text-white"
                  : "bg-white border border-[#E5E5E5] text-neutral-600 hover:text-black hover:border-neutral-400"
              }`}
            >
              Shared ({sharedDocs.length})
            </button>
          </div>

          {/* Search box inside document table */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter files..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-xs text-[#111111] placeholder-neutral-400 focus:outline-none focus:border-black"
            />
          </div>
        </div>

        {/* Documents Table */}
        {recentDocs.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 text-center text-xs text-neutral-500 shadow-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-neutral-400" />
            <p>No documents found matching your filter.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E5E5] text-neutral-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-3">Application</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3">Last Modified</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {recentDocs.map((doc) => {
                    const meta = WORKSPACE_APPS_LIST.find((a) => a.id === doc.app);
                    return (
                      <tr key={doc.id} className="hover:bg-neutral-50/80 transition group">
                        <td className="py-3 px-4">
                          <div
                            onClick={() => onOpenItem(doc)}
                            className="flex items-center space-x-3 cursor-pointer"
                          >
                            <div
                              style={{ backgroundColor: meta?.color || "#111111" }}
                              className="w-7 h-7 rounded flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                            >
                              {meta?.letter || "F"}
                            </div>
                            <div className="truncate max-w-xs md:max-w-md">
                              <span className="font-semibold text-[#111111] hover:underline transition block truncate">
                                {doc.name}
                              </span>
                              {doc.description && (
                                <span className="text-[11px] text-neutral-500 truncate block">
                                  {doc.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-neutral-700 font-medium">{meta?.name || doc.app}</span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-[#E5E5E5] font-semibold uppercase">
                            {doc.format}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-neutral-500">
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
                              className={`p-1.5 rounded hover:bg-neutral-100 transition ${
                                doc.isStarred ? "text-amber-500" : "text-neutral-400 hover:text-black"
                              }`}
                              title={doc.isStarred ? "Unstar" : "Star"}
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </button>

                            <button
                              onClick={() => onTogglePin(doc.id)}
                              className={`p-1.5 rounded hover:bg-neutral-100 transition ${
                                doc.isPinned ? "text-rose-500" : "text-neutral-400 hover:text-black"
                              }`}
                              title={doc.isPinned ? "Unpin" : "Pin"}
                            >
                              <Pin className="w-3.5 h-3.5 fill-current" />
                            </button>

                            <button
                              onClick={() => onExportItem(doc)}
                              className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-black transition"
                              title="Export file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {onSendViaEmail && (
                              <button
                                onClick={() => onSendViaEmail(doc)}
                                className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-[#0078D4] transition"
                                title="Send via Email (Outlook Studio)"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => onTrashItem(doc.id)}
                              className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-rose-600 transition"
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
