"use client";

import React from "react";
import {
  X,
  BarChart3,
  HardDrive,
  FileText,
  Presentation,
  Table,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#111111]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#0891B2] flex items-center justify-center text-white shadow-xs">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111] tracking-tight">
                Workspace Insights & Productivity Analytics
              </h2>
              <p className="text-xs text-neutral-500">
                Real-time usage metrics, AI operations telemetry, and storage quotas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Analytics Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-neutral-700">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs">
              <div className="flex items-center space-x-2 text-neutral-600 mb-1">
                <FileText className="w-4 h-4 text-black" />
                <span className="text-[11px] font-semibold">Word Docs</span>
              </div>
              <div className="text-2xl font-black text-[#111111]">{wordDocs}</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs">
              <div className="flex items-center space-x-2 text-neutral-600 mb-1">
                <Table className="w-4 h-4 text-black" />
                <span className="text-[11px] font-semibold">Spreadsheets</span>
              </div>
              <div className="text-2xl font-black text-[#111111]">{spreadsheets}</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs">
              <div className="flex items-center space-x-2 text-neutral-600 mb-1">
                <Presentation className="w-4 h-4 text-black" />
                <span className="text-[11px] font-semibold">Presentations</span>
              </div>
              <div className="text-2xl font-black text-[#111111]">{presentations}</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs">
              <div className="flex items-center space-x-2 text-neutral-600 mb-1">
                <Sparkles className="w-4 h-4 text-black" />
                <span className="text-[11px] font-semibold">AI Operations</span>
              </div>
              <div className="text-2xl font-black text-[#111111]">1,842</div>
            </div>
          </div>

          {/* Storage Meter: 126 GB of 500 GB */}
          <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] space-y-2 shadow-xs">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-black" />
                <span className="font-bold text-[#111111]">Vault Storage Allocation</span>
              </div>
              <span className="font-mono text-black font-bold">126 GB of 500 GB (25.2%)</span>
            </div>

            <div className="w-full h-2 rounded-full bg-neutral-100 border border-[#E5E5E5] overflow-hidden">
              <div
                className="h-full rounded-full bg-black transition-all duration-500"
                style={{ width: "25.2%" }}
              />
            </div>
          </div>

          {/* AI Telemetry Breakdown */}
          <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] space-y-3 shadow-xs">
            <span className="font-bold text-xs text-[#111111]">AI Engine Performance Telemetry</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
              <div className="p-3 rounded-lg bg-neutral-50 border border-[#E5E5E5]">
                <div className="text-neutral-500">Average Inference Latency</div>
                <div className="text-sm font-bold text-[#111111] mt-1">420ms</div>
              </div>
              <div className="p-3 rounded-lg bg-neutral-50 border border-[#E5E5E5]">
                <div className="text-neutral-500">Context Cache Hit Rate</div>
                <div className="text-sm font-bold text-[#111111] mt-1">94.8%</div>
              </div>
              <div className="p-3 rounded-lg bg-neutral-50 border border-[#E5E5E5]">
                <div className="text-neutral-500">Compliance & RLS Audits</div>
                <div className="text-sm font-bold text-emerald-700 mt-1">100% Passed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E5E5E5] flex justify-end bg-[#F9FAFB]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-black hover:bg-neutral-800 text-white font-medium text-xs transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceInsightsModal;
