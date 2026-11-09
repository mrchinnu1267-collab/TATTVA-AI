"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Play,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Table,
  Presentation,
  Mail,
  Zap,
  ArrowRight,
  Shield,
  Loader2,
  Trash2,
} from "lucide-react";

interface AutomationWorkflow {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  lastRun?: string;
  status: "idle" | "running" | "success" | "failed";
}

export function AutomationCenterView() {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([
    {
      id: "wf_1",
      name: "Document Synthesis & Executive Briefing",
      trigger: "When a new DOCX report is uploaded",
      action: "Extract key sections, generate summary, and verify citations",
      enabled: true,
      lastRun: "2 hours ago",
      status: "success",
    },
    {
      id: "wf_2",
      name: "Meeting Action Items Extractor",
      trigger: "When a meeting ends or OneNote note is saved",
      action: "Identify pending tasks, assign deadlines, and send email digest",
      enabled: true,
      lastRun: "Yesterday",
      status: "success",
    },
    {
      id: "wf_3",
      name: "Excel Analytics & Automatic Charting",
      trigger: "When a new spreadsheet (.xlsx / .csv) is imported",
      action: "Compute statistical variance, detect missing values, and generate charts",
      enabled: true,
      lastRun: "3 days ago",
      status: "success",
    },
    {
      id: "wf_4",
      name: "Multi-Document Presentation Builder",
      trigger: "When user tags documents with #ProjectReview",
      action: "Compile 6-slide PowerPoint deck with architecture diagrams",
      enabled: false,
      lastRun: "Never",
      status: "idle",
    },
  ]);

  const [runningId, setRunningId] = useState<string | null>(null);

  const handleToggleWorkflow = (id: string) => {
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleRunWorkflow = (id: string) => {
    setRunningId(id);
    setTimeout(() => {
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, status: "success", lastRun: "Just now" } : w
        )
      );
      setRunningId(null);
    }, 1200);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-[#0B0F19] text-slate-200 select-none">
      {/* Hero Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 border border-purple-500/20 p-6 md:p-8 shadow-xl overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>Autonomous Workspace Pipelines</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Workspace Automation Center
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
            Create reusable background automations that trigger actions when files are uploaded, meetings end, or data is updated.
          </p>
        </div>
      </div>

      {/* Workflows List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-wide">
            Configured Pipelines ({workflows.length})
          </h2>
          <button
            onClick={() => {}}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Pipeline</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <span className="font-bold text-white text-xs">{wf.name}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.2 rounded-full border ${
                      wf.enabled
                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                        : "bg-slate-800 text-slate-500 border-slate-700"
                    }`}
                  >
                    {wf.enabled ? "ACTIVE" : "DISABLED"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                  <span className="text-indigo-400 font-medium">TRIGGER:</span>
                  <span>{wf.trigger}</span>
                  <span>→</span>
                  <span className="text-purple-400 font-medium">ACTION:</span>
                  <span>{wf.action}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Last run: {wf.lastRun}</span>
                </span>

                {/* Toggle Enable */}
                <button
                  onClick={() => handleToggleWorkflow(wf.id)}
                  className={`w-9 h-5 rounded-full p-0.5 transition ${
                    wf.enabled ? "bg-indigo-600" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      wf.enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>

                {/* Run Manually */}
                <button
                  onClick={() => handleRunWorkflow(wf.id)}
                  disabled={runningId === wf.id}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
                  title="Run Pipeline Manually"
                >
                  {runningId === wf.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>Run</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
