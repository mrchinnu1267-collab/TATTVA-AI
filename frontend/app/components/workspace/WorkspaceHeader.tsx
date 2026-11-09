"use client";

import React, { useState } from "react";
import {
  Search,
  Plus,
  Upload,
  Bell,
  User,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import { WorkspaceAppId } from "./types";

interface WorkspaceHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onImportFile?: (file: File) => void;
  onNewItem?: (app?: WorkspaceAppId) => void;
  activeWorkspaceName?: string;
  onSwitchWorkspace?: (name: string) => void;
  userName?: string;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onImportFile,
  onNewItem,
  activeWorkspaceName = "Personal Workspace",
  onSwitchWorkspace,
  userName = "Kotapati Gowtham Chowdary",
}) => {
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportFile) {
      onImportFile(file);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 select-none z-10 shadow-xs">
      {/* 1. Search Bar */}
      <div className="flex items-center space-x-3 w-72 md:w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents, sheets, slides, emails..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-transparent focus:border-blue-500 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none transition"
          />
        </div>
      </div>

      {/* 2. Workspace Selector */}
      <div className="relative">
        <button
          onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="truncate max-w-[140px]">{activeWorkspaceName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {showWorkspaceMenu && (
          <div className="absolute left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 text-xs">
            <div className="px-3 py-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-400">
              Workspaces
            </div>
            <button
              onClick={() => {
                onSwitchWorkspace && onSwitchWorkspace("Personal Workspace");
                setShowWorkspaceMenu(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between font-medium text-slate-700"
            >
              <span>Personal Workspace</span>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                Active
              </span>
            </button>
            <button
              onClick={() => {
                onSwitchWorkspace && onSwitchWorkspace("Enterprise Research Lab");
                setShowWorkspaceMenu(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-600"
            >
              <span>Enterprise Research Lab</span>
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={() => {
                const name = prompt("Enter new workspace name:");
                if (name && onSwitchWorkspace) onSwitchWorkspace(name);
                setShowWorkspaceMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-blue-600 hover:bg-blue-50 font-semibold flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Workspace</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Action Buttons & Profile */}
      <div className="flex items-center space-x-2">
        {/* Import File Button */}
        <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer shadow-xs transition">
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Import</span>
          <input
            type="file"
            onChange={handleFileInput}
            accept=".docx,.xlsx,.pptx,.pdf,.csv,.json,.txt"
            className="hidden"
          />
        </label>

        {/* New Item Dropdown / Action */}
        <button
          onClick={() => onNewItem && onNewItem()}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* User Profile Avatar */}
        <div className="flex items-center space-x-2 pl-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
            {userName.charAt(0)}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-medium text-slate-800 leading-none">
              {userName.split(" ")[0]}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
              <ShieldCheck className="w-2.5 h-2.5 inline" />
              <span>Verified Account</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default WorkspaceHeader;
