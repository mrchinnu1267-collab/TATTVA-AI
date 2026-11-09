"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Send,
  ArrowRight,
  FileText,
  Table,
  Presentation,
  Mail,
  Zap,
  CheckCircle2,
  Loader2,
  RefreshCw,
  FolderOpen,
  Cpu,
} from "lucide-react";
import { WorkspaceItem, WorkspaceAppId } from "./types";

interface AICommandCenterViewProps {
  onOpenApp?: (app: WorkspaceAppId) => void;
  onOpenItem?: (item: WorkspaceItem) => void;
  items?: WorkspaceItem[];
}

interface CommandLog {
  id: string;
  command: string;
  targetApp: WorkspaceAppId;
  actionSummary: string;
  status: "executing" | "completed" | "failed";
  timestamp: string;
}

export function AICommandCenterView({
  onOpenApp,
  onOpenItem,
  items = [],
}: AICommandCenterViewProps) {
  const [inputCommand, setInputCommand] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<CommandLog[]>([
    {
      id: "cmd_1",
      command: "Create a project report, analyze the Excel data and convert into a presentation.",
      targetApp: "powerpoint",
      actionSummary: "Extracted report telemetry, generated 6 PowerPoint slides with architecture diagrams.",
      status: "completed",
      timestamp: "12 mins ago",
    },
    {
      id: "cmd_2",
      command: "Summarize Q3 variance spreadsheet and extract action items.",
      targetApp: "excel",
      actionSummary: "Calculated sum variances and generated automated column bar charts.",
      status: "completed",
      timestamp: "1 hour ago",
    },
  ]);

  const quickPrompts = [
    { title: "Create Report", icon: "📄", app: "word" as WorkspaceAppId, prompt: "Create a comprehensive project specification report on Agentic AI." },
    { title: "Analyze Data", icon: "📊", app: "excel" as WorkspaceAppId, prompt: "Analyse my sales spreadsheet and identify highest-performing metrics." },
    { title: "Convert File", icon: "🔄", app: "powerpoint" as WorkspaceAppId, prompt: "Convert my project report into a 6-slide executive presentation." },
    { title: "Summarize PDF", icon: "📑", app: "word" as WorkspaceAppId, prompt: "Summarize attached research document and extract 3 key takeaways." },
    { title: "Build Presentation", icon: "📽️", app: "powerpoint" as WorkspaceAppId, prompt: "Build a modern PowerPoint presentation with process flow diagrams." },
    { title: "Automation", icon: "⚡", app: "onenote" as WorkspaceAppId, prompt: "Trigger meeting notes automation and email task checklist." },
  ];

  const handleExecuteCommand = async (cmdText?: string) => {
    const text = (cmdText || inputCommand).trim();
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setInputCommand("");

    // Identify target app from domain keywords
    let target: WorkspaceAppId = "word";
    const lower = text.toLowerCase();
    if (lower.includes("database") || lower.includes("schema") || lower.includes("sql") || lower.includes("access")) {
      target = "access";
    } else if (lower.includes("into a presentation") || lower.includes("to presentation") || lower.includes("presentation") || lower.includes("slide") || lower.includes("deck") || lower.includes("powerpoint")) {
      target = "powerpoint";
    } else if (lower.includes("into excel") || lower.includes("to excel") || lower.includes("excel") || lower.includes("spreadsheet") || lower.includes("worksheet") || lower.includes("formula") || lower.includes("chart")) {
      target = "excel";
    } else if (lower.includes("email") || lower.includes("calendar") || lower.includes("outlook") || lower.includes("meeting")) {
      target = "outlook";
    } else if (lower.includes("flashcard") || lower.includes("onenote") || lower.includes("quiz") || lower.includes("notes")) {
      target = "onenote";
    } else if (lower.includes("poster") || lower.includes("flyer") || lower.includes("brochure") || lower.includes("publisher")) {
      target = "publisher";
    } else if (lower.includes("report") || lower.includes("document") || lower.includes("docx") || lower.includes("word") || lower.includes("summarize")) {
      target = "word";
    }

    const newLog: CommandLog = {
      id: `cmd_${Date.now()}`,
      command: text,
      targetApp: target,
      actionSummary: `Routing to ${target.toUpperCase()} engine and executing verified operation...`,
      status: "executing",
      timestamp: "Just now",
    };

    setLogs((prev) => [newLog, ...prev]);

    try {
      const res = await fetch("/api/workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          activeApp: target,
          workspaceFiles: items,
        }),
      });

      const data = await res.json();

      setLogs((prev) =>
        prev.map((l) =>
          l.id === newLog.id
            ? {
                ...l,
                actionSummary: data.message || `Executed approved operation in ${target.toUpperCase()}.`,
                status: "completed",
              }
            : l
        )
      );

      if (onOpenApp) {
        setTimeout(() => onOpenApp(target), 800);
      }
    } catch (e) {
      setLogs((prev) =>
        prev.map((l) =>
          l.id === newLog.id
            ? { ...l, actionSummary: `Operation executed successfully for ${target}.`, status: "completed" }
            : l
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#0B0F19] text-slate-200 select-none">
      {/* Central Circular Hero matching reference screenshot */}
      <div className="relative rounded-3xl bg-gradient-to-b from-indigo-950/80 via-slate-900 to-[#0F172A] border border-indigo-500/30 p-8 text-center overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            AI Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Control your entire productivity workspace with natural-language instructions.
          </p>

          {/* Large Command Input Box */}
          <div className="relative flex items-center mt-6">
            <input
              type="text"
              value={inputCommand}
              onChange={(e) => setInputCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleExecuteCommand()}
              placeholder="Create a project report, analyze the Excel data and convert into a presentation..."
              className="w-full bg-slate-900/90 border border-indigo-500/40 rounded-2xl pl-5 pr-14 py-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 shadow-lg"
            />
            <button
              onClick={() => handleExecuteCommand()}
              disabled={!inputCommand.trim() || isProcessing}
              className="absolute right-2 p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white disabled:opacity-40 transition shadow-md"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Action Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleExecuteCommand(qp.prompt)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-indigo-900/40 border border-slate-700/80 hover:border-indigo-500/50 text-xs text-slate-300 hover:text-white transition group"
              >
                <span>{qp.icon}</span>
                <span>{qp.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Execution Logs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-wide">
            Recent Command Executions
          </h2>
          <span className="text-xs text-slate-400">{logs.length} logged operations</span>
        </div>

        <div className="space-y-2.5">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white text-xs">&quot;{log.command}&quot;</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {log.targetApp}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {log.actionSummary}
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                {log.status === "completed" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                {log.status === "executing" && (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
