"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Files,
  Star,
  Pin,
  Trash2,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Plus,
  FolderOpen,
  Settings,
} from "lucide-react";
import { WORKSPACE_APPS_LIST } from "./constants";
import { WorkspaceAppId } from "./types";

interface WorkspaceSidebarProps {
  currentView: string; // "dashboard" | "all" | "starred" | "pinned" | "trash" | WorkspaceAppId
  onSelectView: (view: string) => void;
  storageUsageBytes?: number;
  maxStorageBytes?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeWorkspaceName?: string;
  onNewFile?: (app?: WorkspaceAppId) => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  currentView,
  onSelectView,
  storageUsageBytes = 28400000, // ~28.4 MB
  maxStorageBytes = 1073741824, // 1 GB
  isCollapsed = false,
  onToggleCollapse,
  activeWorkspaceName = "Personal Workspace",
  onNewFile,
}) => {
  const usageMb = (storageUsageBytes / (1024 * 1024)).toFixed(1);
  const maxMb = (maxStorageBytes / (1024 * 1024)).toFixed(0);
  const usagePercent = Math.min(
    100,
    Math.round((storageUsageBytes / maxStorageBytes) * 100)
  );

  return (
    <aside
      className={`bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 transition-all duration-300 select-none z-20 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* 1. Header & Back to Chat */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <Link
            href="/chat"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
            title="Back to TATTVA AI Chat"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          {!isCollapsed && (
            <div className="truncate">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm tracking-tight text-white">
                  TATTVA AI
                </span>
                <span className="text-[10px] bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold px-1.5 py-0.2 rounded">
                  WORKSPACE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {activeWorkspaceName}
              </p>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* 2. New Document Action */}
      <div className="p-3 border-b border-slate-800/60">
        <button
          onClick={() => onNewFile && onNewFile()}
          className={`w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition ${
            isCollapsed ? "px-0" : ""
          }`}
          title="Create New File"
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && <span>New Document</span>}
        </button>
      </div>

      {/* 3. Navigation Links */}
      <div className="flex-1 overflow-y-auto p-2 space-y-6">
        {/* Core Navigation */}
        <div className="space-y-1">
          <button
            onClick={() => onSelectView("dashboard")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              currentView === "dashboard"
                ? "bg-blue-600/20 text-blue-400 font-semibold border-l-2 border-blue-500"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            title="Dashboard"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Dashboard</span>}
          </button>

          <button
            onClick={() => onSelectView("all")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              currentView === "all"
                ? "bg-blue-600/20 text-blue-400 font-semibold border-l-2 border-blue-500"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            title="All Documents"
          >
            <Files className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>All Documents</span>}
          </button>

          <button
            onClick={() => onSelectView("starred")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              currentView === "starred"
                ? "bg-blue-600/20 text-blue-400 font-semibold border-l-2 border-blue-500"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            title="Starred"
          >
            <Star className="w-4 h-4 shrink-0 text-amber-400" />
            {!isCollapsed && <span>Starred</span>}
          </button>

          <button
            onClick={() => onSelectView("pinned")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              currentView === "pinned"
                ? "bg-blue-600/20 text-blue-400 font-semibold border-l-2 border-blue-500"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            title="Pinned"
          >
            <Pin className="w-4 h-4 shrink-0 text-rose-400" />
            {!isCollapsed && <span>Pinned</span>}
          </button>

          <button
            onClick={() => onSelectView("trash")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              currentView === "trash"
                ? "bg-blue-600/20 text-blue-400 font-semibold border-l-2 border-blue-500"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            title="Recycle Bin"
          >
            <Trash2 className="w-4 h-4 shrink-0 text-slate-500" />
            {!isCollapsed && <span>Recycle Bin</span>}
          </button>
        </div>

        {/* 4. Productivity Applications (7 Apps) */}
        <div>
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Applications
            </div>
          )}
          <div className="space-y-1">
            {WORKSPACE_APPS_LIST.map((app) => {
              const isActive = currentView === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => onSelectView(app.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                  title={app.name}
                >
                  <div
                    style={{ backgroundColor: app.color }}
                    className="w-5 h-5 rounded flex items-center justify-center font-black text-white text-[11px] shadow-sm shrink-0"
                  >
                    {app.letter}
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 text-left truncate">
                      <span className="truncate">{app.name}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Storage Meter & Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                <span>Vault Storage</span>
              </span>
              <span className="text-slate-300 font-mono">
                {usageMb} MB / {maxMb} MB
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title={`Storage: ${usageMb} MB / ${maxMb} MB`}>
            <HardDrive className="w-4 h-4 text-blue-400" />
          </div>
        )}
      </div>
    </aside>
  );
};

export default WorkspaceSidebar;
