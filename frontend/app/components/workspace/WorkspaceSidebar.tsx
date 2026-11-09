"use client";

import React from "react";
import Link from "next/link";
import {
  Home,
  LayoutGrid,
  Bot,
  Zap,
  Share2,
  Clock,
  Star,
  Folder,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Kanban,
  Layout,
  BookOpen,
  GraduationCap,
  Network,
  Target,
} from "lucide-react";

interface WorkspaceSidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  storageUsageBytes?: number;
  maxStorageBytes?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeWorkspaceName?: string;
  onNewFile?: () => void;
  activeApp?: string | null;
  onSelectApp?: (app: string) => void;
}

export function WorkspaceSidebar({
  currentView,
  onSelectView,
  storageUsageBytes = 135291469824, // ~126 GB
  maxStorageBytes = 536870912000, // 500 GB
  isCollapsed = false,
  onToggleCollapse,
  activeWorkspaceName = "Project Review",
  onNewFile,
  activeApp = null,
  onSelectApp,
}: WorkspaceSidebarProps) {
  const officeApps = [
    { id: "word", name: "Word", letter: "W", color: "bg-[#185ABD]" },
    { id: "excel", name: "Excel", letter: "X", color: "bg-[#107C41]" },
    { id: "powerpoint", name: "PowerPoint", letter: "P", color: "bg-[#C43E1C]" },
    { id: "outlook", name: "Outlook", letter: "O", color: "bg-[#0078D4]" },
    { id: "onenote", name: "OneNote", letter: "N", color: "bg-[#7719AA]" },
    { id: "publisher", name: "Publisher", letter: "P", color: "bg-[#008272]" },
    { id: "access", name: "Access", letter: "A", color: "bg-[#A4373A]" },
  ];

  const workspacesList = [
    { id: "ws_proj", name: "Project Review", color: "bg-emerald-400" },
    { id: "ws_res", name: "Research", color: "bg-blue-400" },
    { id: "ws_acad", name: "Academic", color: "bg-amber-400" },
    { id: "ws_pers", name: "Personal", color: "bg-purple-400" },
  ];

  return (
    <aside
      className={`bg-[#0A0D14] text-slate-300 flex flex-col h-full border-r border-slate-800/80 transition-all duration-300 select-none z-20 shrink-0 ${
        isCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* 1. Brand Logo Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800/60 shrink-0">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <span className="font-extrabold text-base tracking-tight text-white">
              TATTVA AI
            </span>
          )}
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* 2. Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div className="space-y-1">
          {/* Home */}
          <Link
            href="/chat"
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 transition"
            title="Home"
          >
            <Home className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Home</span>}
          </Link>

          {/* My Workspace (Active glowing purple pill) */}
          <button
            onClick={() => onSelectView("dashboard")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              currentView === "dashboard"
                ? "bg-gradient-to-r from-purple-700/80 to-indigo-600/80 text-white shadow-lg shadow-purple-900/30 border border-purple-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
            title="My Workspace"
          >
            <LayoutGrid className="w-4 h-4 shrink-0 text-purple-300" />
            {!isCollapsed && <span>My Workspace</span>}
          </button>

          {/* AI Command Center */}
          <button
            onClick={() => onSelectView("ai_command_center")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
              currentView === "ai_command_center"
                ? "bg-indigo-900/40 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
            title="AI Command Center"
          >
            <Bot className="w-4 h-4 shrink-0 text-indigo-400" />
            {!isCollapsed && <span>AI Command Center</span>}
          </button>

          {/* AI Project Manager */}
          <button
            onClick={() => onSelectView("projects")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
              currentView === "projects"
                ? "bg-indigo-900/40 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
            title="AI Project Manager"
          >
            <Kanban className="w-4 h-4 shrink-0 text-blue-400" />
            {!isCollapsed && <span>Projects</span>}
          </button>

          {/* Smart Canvas */}
          <button
            onClick={() => onSelectView("canvas")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
              currentView === "canvas"
                ? "bg-indigo-900/40 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
            title="Smart Canvas"
          >
            <Layout className="w-4 h-4 shrink-0 text-purple-400" />
            {!isCollapsed && <span>Smart Canvas</span>}
          </button>

          {/* Research Lab */}
          <button
            onClick={() => onSelectView("research")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
              currentView === "research"
                ? "bg-indigo-900/40 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
            title="Research Lab"
          >
            <BookOpen className="w-4 h-4 shrink-0 text-emerald-400" />
            {!isCollapsed && <span>Research Lab</span>}
          </button>

          {/* Smart Learning Mode */}
          <button
            onClick={() => onSelectView("learning")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
              currentView === "learning"
                ? "bg-indigo-900/40 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
            title="Smart Learning Mode"
          >
            <GraduationCap className="w-4 h-4 shrink-0 text-pink-400" />
            {!isCollapsed && <span>Learning Mode</span>}
          </button>

          {/* Knowledge Graph */}
          <button
            onClick={() => onSelectView("knowledge_graph")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
              currentView === "knowledge_graph"
                ? "bg-indigo-900/40 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
            title="Knowledge Graph"
          >
            <Network className="w-4 h-4 shrink-0 text-cyan-400" />
            {!isCollapsed && <span>Knowledge Graph</span>}
          </button>

          {/* Automation Center */}
          <button
            onClick={() => onSelectView("automation_center")}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
              currentView === "automation_center"
                ? "bg-purple-900/40 text-purple-300 border border-purple-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
            title="Automation Center"
          >
            <Zap className="w-4 h-4 shrink-0 text-amber-400" />
            {!isCollapsed && <span>Automation Center</span>}
          </button>

          {/* Focus Mode */}
          <button
            onClick={() => onSelectView("focus_mode")}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 transition"
            title="Focus Mode"
          >
            <Target className="w-4 h-4 shrink-0 text-rose-400" />
            {!isCollapsed && <span>Focus Mode</span>}
          </button>
        </div>

        {/* 7 Productivity Applications Section */}
        <div className="pt-2 border-t border-slate-800/60">
          {!isCollapsed && (
            <div className="flex items-center justify-between px-3 py-1 mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Apps</span>
            </div>
          )}

          <div className="space-y-0.5">
            {officeApps.map((app) => {
              const isAppActive = currentView === "dashboard" && activeApp === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => {
                    if (onSelectApp) {
                      onSelectApp(app.id);
                    } else {
                      onSelectView("dashboard");
                    }
                  }}
                  className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs transition text-left ${
                    isAppActive
                      ? "bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                  title={app.name}
                >
                  <span
                    className={`w-4 h-4 rounded-sm ${app.color} flex items-center justify-center font-black text-[9px] text-white shrink-0 shadow-xs`}
                  >
                    {app.letter}
                  </span>
                  {!isCollapsed && <span className="truncate">{app.name}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Workspaces Section */}
        {!isCollapsed && (
          <div className="pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between px-3 py-1 mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Workspaces</span>
              <button
                onClick={() => {}}
                className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Create Workspace"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5">
              {workspacesList.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => onSelectView("dashboard")}
                  className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800/40 transition text-left"
                >
                  <span className={`w-2 h-2 rounded-sm ${ws.color}`} />
                  <span className="truncate">{ws.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Storage & Settings */}
      <div className="p-3 border-t border-slate-800/60 space-y-3 bg-[#080B11] shrink-0">
        {!isCollapsed && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-medium">Storage</span>
              <span className="text-slate-300 font-mono">126 GB of 500 GB</span>
            </div>

            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                style={{ width: "25.2%" }}
              />
            </div>

            <button
              onClick={() => {}}
              className="w-full py-1 text-center rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-[11px] font-semibold transition"
            >
              Upgrade Plan
            </button>
          </div>
        )}

        <button
          onClick={() => {}}
          className="w-full flex items-center space-x-3 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800/50 transition"
          title="Settings"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
}

export default WorkspaceSidebar;
