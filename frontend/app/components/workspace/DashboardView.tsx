"use client";

import React from "react";
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
} from "lucide-react";
import { WORKSPACE_APPS, WORKSPACE_APPS_LIST } from "./constants";
import { WorkspaceAppId, WorkspaceItem } from "./types";

interface DashboardViewProps {
  items: WorkspaceItem[];
  onOpenItem: (item: WorkspaceItem) => void;
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
  onNewItemForApp,
  onToggleStar,
  onTogglePin,
  onTrashItem,
  onExportItem,
  searchFilter = "",
}) => {
  // Recent non-trashed items
  const activeItems = items.filter((i) => !i.isTrashed);

  const filteredItems = searchFilter.trim()
    ? activeItems.filter(
        (i) =>
          i.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
          i.tags.some((t) => t.toLowerCase().includes(searchFilter.toLowerCase()))
      )
    : activeItems;

  const recentDocs = [...filteredItems]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 8);

  const pinnedDocs = activeItems.filter((i) => i.isPinned);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50 select-none">
      {/* 1. Welcome Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-md overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TATTVA AI Integrated Productivity Platform</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            My Workspace
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
            Create, edit, analyze, and present with seven unified productivity applications.
            Every file is saved persistently with genuine Office Open XML and standard formats.
          </p>

          <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-300">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{activeItems.length} Active Documents</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Encrypted Local Vault & Cloud Sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Seven Application Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Applications
            </h2>
            <p className="text-xs text-slate-500">
              Launch dedicated editors or create a new document in any format.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {WORKSPACE_APPS_LIST.map((app) => {
            const appFiles = activeItems.filter((i) => i.app === app.id);
            const latestFile = appFiles[0];

            return (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Header: Icon + Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      style={{ backgroundColor: app.color }}
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md group-hover:scale-105 transition-transform"
                    >
                      {app.letter}
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      .{app.defaultFormat}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-sm text-slate-800 tracking-tight">
                    {app.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mb-1">
                    {app.tagline}
                  </p>
                  <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                    {app.description}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{appFiles.length} files</span>
                    {latestFile && (
                      <span className="truncate max-w-[120px] text-slate-500">
                        {latestFile.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onNewItemForApp(app.id)}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-white shadow-xs transition flex items-center justify-center space-x-1"
                      style={{ backgroundColor: app.color }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New</span>
                    </button>
                    {latestFile && (
                      <button
                        onClick={() => onOpenItem(latestFile)}
                        className="py-1.5 px-3 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
                        title="Open most recent file"
                      >
                        Recent
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Pinned Documents (if any) */}
      {pinnedDocs.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Pin className="w-4 h-4 text-rose-500" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Pinned Items
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pinnedDocs.map((item) => {
              const meta = WORKSPACE_APPS_LIST.find((a) => a.id === item.app);
              return (
                <div
                  key={item.id}
                  onClick={() => onOpenItem(item)}
                  className="p-3 bg-white border border-rose-100 rounded-lg shadow-xs hover:border-rose-300 cursor-pointer transition flex items-center space-x-3"
                >
                  <div
                    style={{ backgroundColor: meta?.color || "#2563EB" }}
                    className="w-7 h-7 rounded flex items-center justify-center font-bold text-white text-xs shrink-0"
                  >
                    {meta?.letter || "F"}
                  </div>
                  <div className="truncate flex-1">
                    <div className="text-xs font-semibold text-slate-800 truncate">
                      {item.name}
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                      {item.format}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Recent Documents Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent Documents
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {recentDocs.length} shown
          </span>
        </div>

        {recentDocs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p>No documents found matching your filter.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-3">Application</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3">Last Modified</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDocs.map((doc) => {
                    const meta = WORKSPACE_APPS_LIST.find((a) => a.id === doc.app);
                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/80 transition group"
                      >
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
                              <span className="font-semibold text-slate-800 hover:text-blue-600 transition block truncate">
                                {doc.name}
                              </span>
                              {doc.description && (
                                <span className="text-[11px] text-slate-400 truncate block">
                                  {doc.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-slate-600 font-medium">
                            {meta?.name || doc.app}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold uppercase">
                            {doc.format}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-500">
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
                              className={`p-1.5 rounded hover:bg-slate-100 transition ${
                                doc.isStarred ? "text-amber-500" : "text-slate-400"
                              }`}
                              title={doc.isStarred ? "Unstar" : "Star"}
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </button>

                            <button
                              onClick={() => onTogglePin(doc.id)}
                              className={`p-1.5 rounded hover:bg-slate-100 transition ${
                                doc.isPinned ? "text-rose-500" : "text-slate-400"
                              }`}
                              title={doc.isPinned ? "Unpin" : "Pin"}
                            >
                              <Pin className="w-3.5 h-3.5 fill-current" />
                            </button>

                            <button
                              onClick={() => onExportItem(doc)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                              title="Export file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onTrashItem(doc.id)}
                              className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
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
