"use client";

import React, { useState } from "react";
import {
  X,
  Store,
  Play,
  Sparkles,
  ArrowRight,
  FileText,
  Table,
  Presentation,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

interface WorkflowMarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunWorkflow?: (workflowName: string) => void;
}

export function WorkflowMarketplaceModal({
  isOpen,
  onClose,
  onRunWorkflow,
}: WorkflowMarketplaceModalProps) {
  const templates = [
    {
      id: "wf_mkt_1",
      name: "Report → Presentation",
      description: "Extracts key findings from Word document and synthesizes a 6-slide PowerPoint deck with charts.",
      downloads: "1,240 runs",
      rating: "4.9 ★",
      badge: "Popular",
    },
    {
      id: "wf_mkt_2",
      name: "Excel → Dashboard",
      description: "Reads raw spreadsheet data, computes statistical variance, and generates interactive visual charts.",
      downloads: "890 runs",
      rating: "4.8 ★",
      badge: "Analytics",
    },
    {
      id: "wf_mkt_3",
      name: "PDF → Study Notes",
      description: "Scans lengthy PDF textbook or paper and distills it into bulleted chapter review notes.",
      downloads: "2,150 runs",
      rating: "5.0 ★",
      badge: "Education",
    },
    {
      id: "wf_mkt_4",
      name: "Meeting → Action Items",
      description: "Extracts action items, assigned owners, and dates from meeting notes, then drafts a recap email.",
      downloads: "640 runs",
      rating: "4.7 ★",
      badge: "Productivity",
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-indigo-500/30 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 text-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Workflow Marketplace</h2>
              <p className="text-xs text-slate-400">Discover and run verified automation templates</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition group"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-xs group-hover:text-indigo-300 transition">
                    {tmpl.name}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {tmpl.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{tmpl.description}</p>
                <div className="text-[10px] text-slate-500 flex items-center space-x-3 pt-1">
                  <span>{tmpl.downloads}</span>
                  <span>•</span>
                  <span className="text-amber-400">{tmpl.rating}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (onRunWorkflow) onRunWorkflow(tmpl.name);
                  onClose();
                }}
                className="flex items-center space-x-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-sm shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Template</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

