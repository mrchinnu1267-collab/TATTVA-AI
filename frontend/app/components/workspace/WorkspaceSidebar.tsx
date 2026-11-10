"use client";

import React from "react";
import Link from "next/link";
import {
  Home,
  LayoutGrid,
  Bot,
  Zap,
  Kanban,
  Layout,
  BookOpen,
  GraduationCap,
  Network,
  Target,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
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
    { id: "word", name: "Word", letter: "W" },
    { id: "excel", name: "Excel", letter: "X" },
    { id: "powerpoint", name: "PowerPoint", letter: "P" },
    { id: "outlook", name: "Outlook", letter: "O" },
    { id: "onenote", name: "OneNote", letter: "N" },
    { id: "publisher", name: "Publisher", letter: "P" },
    { id: "access", name: "Access", letter: "A" },
  ];

  const mainNavItems = [
    { id: "dashboard", label: "My Workspace", icon: LayoutGrid },
    { id: "ai_command_center", label: "AI Command Center", icon: Bot },
    { id: "projects", label: "Projects", icon: Kanban },
    { id: "canvas", label: "Smart Canvas", icon: Layout },
    { id: "research", label: "Research Lab", icon: BookOpen },
    { id: "learning", label: "Learning Mode", icon: GraduationCap },
    { id: "knowledge_graph", label: "Knowledge Graph", icon: Network },
    { id: "automation_center", label: "Automation Center", icon: Zap },
    { id: "focus_mode", label: "Focus Mode", icon: Target },
  ];

  return (
    <aside
      className={`bg-white text-[#111111] flex flex-col h-full border-r border-[#E5E5E5] transition-all duration-300 select-none z-20 shrink-0 font-sans ${
        isCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* 1. Brand Logo Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#E5E5E5] shrink-0">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center text-white shadow-xs shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-extrabold text-base tracking-tight text-[#111111]">
              TATTVA AI
            </span>
          )}
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* 2. Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div className="space-y-1">
          {/* Home Link */}
          <Link
            href="/chat"
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium text-neutral-600 hover:text-black hover:bg-neutral-100 transition"
            title="Home"
          >
            <Home className="w-4 h-4 shrink-0 text-black" />
            {!isCollapsed && <span>Home</span>}
          </Link>

          {/* Navigation Items */}
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs transition ${
                  isActive
                    ? "bg-neutral-100 text-black font-semibold shadow-xs"
                    : "text-neutral-600 hover:text-black hover:bg-neutral-100 font-medium"
                }`}
                title={item.label}
              >
                <Icon className="w-4 h-4 shrink-0 text-black" />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* APPS Section */}
        <div className="pt-2 border-t border-[#E5E5E5]">
          {!isCollapsed && (
            <div className="px-3 py-1 mb-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              <span>APPS</span>
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
                      ? "bg-neutral-100 text-black font-semibold"
                      : "text-neutral-600 hover:text-black hover:bg-neutral-100"
                  }`}
                  title={app.name}
                >
                  <span className="w-4 h-4 rounded bg-black text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                    {app.letter}
                  </span>
                  {!isCollapsed && <span className="truncate">{app.name}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Bottom Storage & Settings */}
      <div className="p-3 border-t border-[#E5E5E5] space-y-3 bg-white shrink-0">
        {!isCollapsed && (
          <div className="p-3 rounded-xl bg-neutral-50 border border-[#E5E5E5] space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-neutral-500 font-medium">Storage</span>
              <span className="text-neutral-700 font-mono">126 GB of 500 GB</span>
            </div>

            <div className="w-full h-1.5 rounded-full bg-neutral-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-black"
                style={{ width: "25.2%" }}
              />
            </div>

            <button
              onClick={() => {}}
              className="w-full py-1.5 text-center rounded-lg bg-black hover:bg-neutral-800 text-white text-[11px] font-semibold transition"
            >
              Upgrade Plan
            </button>
          </div>
        )}

        <button
          onClick={() => {}}
          className="w-full flex items-center space-x-3 px-3 py-1.5 rounded-xl text-xs text-neutral-600 hover:text-black hover:bg-neutral-100 transition"
          title="Settings"
        >
          <Settings className="w-4 h-4 shrink-0 text-black" />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
}

export default WorkspaceSidebar;
