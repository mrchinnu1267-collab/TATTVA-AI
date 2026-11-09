"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Grid,
  List as ListIcon,
  Star,
  Pin,
  Trash2,
  Download,
  Copy,
  Edit2,
  RotateCcw,
  Plus,
  FolderOpen,
  ArrowUpDown,
  MoreVertical,
} from "lucide-react";
import { WORKSPACE_APPS_LIST } from "../constants";
import { WorkspaceItem, WorkspaceAppId } from "../types";

interface UnifiedFileManagerProps {
  items: WorkspaceItem[];
  filterMode?: "all" | "starred" | "pinned" | "trash" | WorkspaceAppId;
  onOpenItem: (item: WorkspaceItem) => void;
  onToggleStar: (itemId: string) => void;
  onTogglePin: (itemId: string) => void;
  onTrashItem: (itemId: string) => void;
  onRestoreItem: (itemId: string) => void;
  onDeletePermanently: (itemId: string) => void;
  onDuplicateItem: (itemId: string) => void;
  onRenameItem: (itemId: string, newName: string) => void;
  onExportItem: (item: WorkspaceItem) => void;
  onNewItemForApp: (appId: WorkspaceAppId) => void;
}

export const UnifiedFileManager: React.FC<UnifiedFileManagerProps> = ({
  items,
  filterMode = "all",
  onOpenItem,
  onToggleStar,
  onTogglePin,
  onTrashItem,
  onRestoreItem,
  onDeletePermanently,
  onDuplicateItem,
  onRenameItem,
  onExportItem,
  onNewItemForApp,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewLayout, setViewLayout] = useState<"list" | "grid">("list");
  const [selectedAppFilter, setSelectedAppFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");

  // Filter items
  const processedItems = useMemo(() => {
    let result = [...items];

    // Status filter
    if (filterMode === "trash") {
      result = result.filter((i) => i.isTrashed);
    } else {
      result = result.filter((i) => !i.isTrashed);
      if (filterMode === "starred") {
        result = result.filter((i) => i.isStarred);
      } else if (filterMode === "pinned") {
        result = result.filter((i) => i.isPinned);
      } else if (filterMode !== "all") {
        result = result.filter((i) => i.app === filterMode);
      }
    }

    // App secondary filter
    if (selectedAppFilter !== "all" && filterMode === "all") {
      result = result.filter((i) => i.app === selectedAppFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.format.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "date") {
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "size") {
        return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      }
      return 0;
    });

    return result;
  }, [items, filterMode, selectedAppFilter, searchQuery, sortBy]);

  const getTitle = () => {
    if (filterMode === "trash") return "Recycle Bin";
    if (filterMode === "starred") return "Starred Documents";
    if (filterMode === "pinned") return "Pinned Documents";
    if (filterMode === "all") return "All Documents";
    const app = WORKSPACE_APPS_LIST.find((a) => a.id === filterMode);
    return `${app?.name || filterMode} Files`;
  };

  const handlePromptRename = (item: WorkspaceItem) => {
    const newName = prompt("Rename document:", item.name);
    if (newName && newName.trim() && newName !== item.name) {
      onRenameItem(item.id, newName.trim());
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 select-none overflow-hidden">
      {/* 1. File Manager Toolbar */}
      <div className="p-4 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>{getTitle()}</span>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-normal">
              {processedItems.length} items
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
            />
          </div>

          {/* App Filter (if in All mode) */}
          {filterMode === "all" && (
            <select
              value={selectedAppFilter}
              onChange={(e) => setSelectedAppFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Apps</option>
              {WORKSPACE_APPS_LIST.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none"
          >
            <option value="date">Sort: Date</option>
            <option value="name">Sort: Name</option>
            <option value="size">Sort: Size</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewLayout("list")}
              className={`p-1 rounded ${
                viewLayout === "list" ? "bg-white shadow-xs text-blue-600" : "text-slate-400"
              }`}
              title="List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewLayout("grid")}
              className={`p-1 rounded ${
                viewLayout === "grid" ? "bg-white shadow-xs text-blue-600" : "text-slate-400"
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. File Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {processedItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
            <FolderOpen className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
            <p>No documents found in this view.</p>
          </div>
        ) : viewLayout === "list" ? (
          /* LIST VIEW */
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Modified</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedItems.map((item) => {
                  const meta = WORKSPACE_APPS_LIST.find((a) => a.id === item.app);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition group"
                    >
                      <td className="py-2.5 px-4">
                        <div
                          onClick={() => !item.isTrashed && onOpenItem(item)}
                          className={`flex items-center space-x-3 ${
                            item.isTrashed ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                          }`}
                        >
                          <div
                            style={{ backgroundColor: meta?.color || "#2563EB" }}
                            className="w-7 h-7 rounded flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                          >
                            {meta?.letter || "F"}
                          </div>
                          <div className="truncate max-w-sm">
                            <span className="font-semibold text-slate-800 hover:text-blue-600 transition block truncate">
                              {item.name}
                            </span>
                            {item.description && (
                              <span className="text-[11px] text-slate-400 truncate block">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold uppercase">
                          {item.format}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {item.sizeBytes
                          ? `${(item.sizeBytes / 1024).toFixed(1)} KB`
                          : "12 KB"}
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {new Date(item.updatedAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {item.isTrashed ? (
                            <>
                              <button
                                onClick={() => onRestoreItem(item.id)}
                                className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 transition"
                                title="Restore file"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) {
                                    onDeletePermanently(item.id);
                                  }
                                }}
                                className="p-1.5 rounded hover:bg-rose-50 text-rose-600 transition"
                                title="Delete permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => onToggleStar(item.id)}
                                className={`p-1.5 rounded hover:bg-slate-100 transition ${
                                  item.isStarred ? "text-amber-500" : "text-slate-400"
                                }`}
                                title={item.isStarred ? "Unstar" : "Star"}
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                              </button>

                              <button
                                onClick={() => onTogglePin(item.id)}
                                className={`p-1.5 rounded hover:bg-slate-100 transition ${
                                  item.isPinned ? "text-rose-500" : "text-slate-400"
                                }`}
                                title={item.isPinned ? "Unpin" : "Pin"}
                              >
                                <Pin className="w-3.5 h-3.5 fill-current" />
                              </button>

                              <button
                                onClick={() => handlePromptRename(item)}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                                title="Rename"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onDuplicateItem(item.id)}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                                title="Duplicate"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onExportItem(item)}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onTrashItem(item.id)}
                                className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                                title="Recycle"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {processedItems.map((item) => {
              const meta = WORKSPACE_APPS_LIST.find((a) => a.id === item.app);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div
                        style={{ backgroundColor: meta?.color || "#2563EB" }}
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-base shadow-sm"
                      >
                        {meta?.letter || "F"}
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                        .{item.format}
                      </span>
                    </div>

                    <h3
                      onClick={() => !item.isTrashed && onOpenItem(item)}
                      className="font-bold text-xs text-slate-800 hover:text-blue-600 cursor-pointer line-clamp-2"
                    >
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.updatedAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <div className="flex items-center space-x-1">
                      {item.isTrashed ? (
                        <button
                          onClick={() => onRestoreItem(item.id)}
                          className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                          title="Restore"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => onToggleStar(item.id)}
                            className={`p-1 rounded hover:bg-slate-100 ${
                              item.isStarred ? "text-amber-500" : "text-slate-400"
                            }`}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={() => onExportItem(item)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onTrashItem(item.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedFileManager;
