"use client";

import React, { useState } from "react";
import {
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { WorkspaceAppId } from "./types";

interface SmartTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (app: WorkspaceAppId, templateTitle: string, templateData?: any) => void;
}

export function SmartTemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: SmartTemplatesModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const templates = [
    {
      id: "tmpl_ppt_1",
      app: "powerpoint" as WorkspaceAppId,
      category: "presentation",
      title: "Agentic AI Project Review",
      description: "6-slide professional presentation with architecture diagrams, telemetry benchmarks, and conclusion.",
      badge: "Featured",
    },
    {
      id: "tmpl_ppt_2",
      app: "powerpoint" as WorkspaceAppId,
      category: "presentation",
      title: "Executive Pitch Deck",
      description: "High-impact investor slides covering problem statement, market size, product roadmap, and financials.",
      badge: "Popular",
    },
    {
      id: "tmpl_word_1",
      app: "word" as WorkspaceAppId,
      category: "document",
      title: "Software Engineering Specification",
      description: "Comprehensive system architecture document with component invariants, API contracts, and security audits.",
      badge: "Technical",
    },
    {
      id: "tmpl_excel_1",
      app: "excel" as WorkspaceAppId,
      category: "spreadsheet",
      title: "Quarterly Financial & Variance Model",
      description: "Pre-configured multi-sheet workbook with automated SUM, AVERAGE formulas, and dynamic chart ranges.",
      badge: "Finance",
    },
    {
      id: "tmpl_pub_1",
      app: "publisher" as WorkspaceAppId,
      category: "publisher",
      title: "Tech Conference Event Poster",
      description: "Print-ready high-resolution promotional poster with QR code placeholder and customizable brand kit.",
      badge: "Print Ready",
    },
    {
      id: "tmpl_acc_1",
      app: "access" as WorkspaceAppId,
      category: "database",
      title: "Asset & Inventory Management Schema",
      description: "Relational database schema with suppliers, products, and transaction tables with foreign-key relationships.",
      badge: "Database",
    },
  ];

  if (!isOpen) return null;

  const filtered = activeCategory === "all" ? templates : templates.filter((t) => t.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-3xl bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#111111]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#DB2777] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111] tracking-tight">
                Smart Templates Library
              </h2>
              <p className="text-xs text-neutral-500">
                Professional, ready-to-use templates for Word, Excel, PowerPoint, Publisher, and Access
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

        {/* Categories */}
        <div className="px-6 py-2.5 border-b border-[#E5E5E5] flex space-x-2 text-xs bg-white overflow-x-auto scrollbar-none">
          {["all", "presentation", "document", "spreadsheet", "publisher", "database"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-lg capitalize transition text-[11px] font-medium shadow-xs shrink-0 ${
                activeCategory === cat
                  ? "bg-black text-white"
                  : "bg-white border border-[#E5E5E5] text-neutral-600 hover:text-black hover:border-neutral-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-xl bg-white border border-[#E5E5E5] hover:border-neutral-400 flex flex-col justify-between transition group shadow-xs"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-[#E5E5E5] font-semibold">
                    {t.badge}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">
                    {t.app}
                  </span>
                </div>
                <h3 className="font-bold text-[#111111] text-sm group-hover:underline transition mb-1">
                  {t.title}
                </h3>
                <p className="text-neutral-500 text-[11px] leading-relaxed mb-4">
                  {t.description}
                </p>
              </div>

              <button
                onClick={() => {
                  onSelectTemplate(t.app, t.title);
                  onClose();
                }}
                className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition shadow-xs"
              >
                <span>Use Template</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E5E5E5] flex justify-end bg-[#F9FAFB]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#E5E5E5] hover:bg-neutral-100 text-neutral-700 font-medium text-xs transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default SmartTemplatesModal;
