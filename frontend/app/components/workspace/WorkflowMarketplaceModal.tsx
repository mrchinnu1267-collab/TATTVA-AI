"use client";

import React from "react";
import {
  X,
  Store,
  Play,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-white border border-[#E5E5E5] rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 text-[#111111]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-[#E5E5E5] flex items-center justify-center text-black shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111] tracking-tight">Workflow Marketplace</h2>
              <p className="text-xs text-neutral-500">Discover and run verified automation templates</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="p-4 rounded-2xl bg-white border border-[#E5E5E5] hover:border-neutral-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition group shadow-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-[#111111] group-hover:underline transition">
                    {tmpl.name}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-[#E5E5E5] font-semibold">
                    {tmpl.badge}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-snug">{tmpl.description}</p>
                <div className="text-[10px] text-neutral-400 flex items-center space-x-3 pt-1">
                  <span>{tmpl.downloads}</span>
                  <span>•</span>
                  <span className="text-amber-500 font-semibold">{tmpl.rating}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (onRunWorkflow) onRunWorkflow(tmpl.name);
                  onClose();
                }}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition shadow-xs shrink-0"
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

export default WorkflowMarketplaceModal;
