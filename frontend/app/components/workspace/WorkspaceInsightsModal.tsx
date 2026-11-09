"use client";

import React from "react";
import {
  X,
  BarChart3,
  HardDrive,
  Cpu,
  Zap,
  Users,
  FileText,
  Presentation,
  Table,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import { WorkspaceItem } from "./types";

interface WorkspaceInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WorkspaceItem[];
}

export function WorkspaceInsightsModal({
  isOpen,
  onClose,
  items,
}: WorkspaceInsightsModalProps) {
  if (!isOpen) return null;

  const wordDocs = items.filter((i) => i.app === "word").length;
  const spreadsheets = items.filter((i) => i.app === "excel").length;
  const presentations = items.filter((i) => i.app === "powerpoint").length;
  const totalFiles = items.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-md">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Workspace Insights & Productivity Analytics
              </h2>
              <p className="text-xs text-slate-400">
                Real-time usage metrics, AI operations telemetry, and storage quotas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Analytics Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center space-x-2 text-blue-400 mb-1">
                <FileText className="w-4 h-4" />
                <span className="text-[11px] font-semibold">Word Docs</span>
              </div>
              <div className="text-2xl font-black text-white">{wordDocs}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center space-x-2 text-emerald-400 mb-1">
                <Table className="w-4 h-4" />
                <span className="text-[11px] font-semibold">Spreadsheets</span>
              </div>
              <div className="text-2xl font-black text-white">{spreadsheets}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center space-x-2 text-orange-400 mb-1">
                <Presentation className="w-4 h-4" />
                <span className="text-[11px] font-semibold">Presentations</span>
              </div>
              <div className="text-2xl font-black text-white">{presentations}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center space-x-2 text-purple-400 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-[11px] font-semibold">AI Operations</span>
              </div>
              <div className="text-2xl font-black text-white">1,482</div>
            </div>
          </div>

          {/* Storage Meter matching screenshot: 126 GB of 500 GB */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-white">Vault Storage Allocation</span>
              </div>
              <span className="font-mono text-indigo-400 font-bold">126 GB of 500 GB (25.2%)</span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: "25.2%" }}
              />
            </div>
          </div>

          {/* AI Telemetry Breakdown */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <span className="font-semibold text-white">AI Engine Performance Telemetry</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <div className="text-slate-400">Average Inference Latency</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">420ms</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <div className="text-slate-400">Context Cache Hit Rate</div>
                <div className="text-sm font-bold text-blue-400 mt-1">94.8%</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <div className="text-slate-400">Compliance & RLS Audits</div>
                <div className="text-sm font-bold text-purple-400 mt-1">100% Passed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
