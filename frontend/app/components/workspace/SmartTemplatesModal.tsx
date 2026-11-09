"use client";

import React, { useState } from "react";
import {
  X,
  FileText,
  Table,
  Presentation,
  BookOpen,
  Layout,
  Database,
  ArrowRight,
  Sparkles,
  CheckCircle2,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-3xl bg-[#0F172A] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Smart Templates Library
              </h2>
              <p className="text-xs text-slate-400">
                Professional, ready-to-use templates for Word, Excel, PowerPoint, Publisher, and Access
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

        {/* Categories */}
        <div className="px-6 py-2.5 border-b border-slate-800 flex space-x-2 text-xs">
          {["all", "presentation", "document", "spreadsheet", "publisher", "database"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-lg capitalize transition text-[11px] font-medium ${
                activeCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-white"
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
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 flex flex-col justify-between transition group"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                    {t.badge}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-slate-500">
                    {t.app}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm group-hover:text-indigo-300 transition mb-1">
                  {t.title}
                </h3>
                <p className="text-slate-400 text-[11px] leading-relaxed mb-4">
                  {t.description}
                </p>
              </div>

              <button
                onClick={() => {
                  onSelectTemplate(t.app, t.title);
                  onClose();
                }}
                className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-sm"
              >
                <span>Use Template</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

