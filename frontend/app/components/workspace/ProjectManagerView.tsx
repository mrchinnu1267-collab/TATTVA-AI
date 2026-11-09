"use client";

import React, { useState } from "react";
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Sparkles,
  BarChart3,
  Kanban,
  FileText,
  Loader2,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  status: "todo" | "in_progress" | "done";
  assignee: string;
  dueDate: string;
}

export function ProjectManagerView() {
  const [activeTab, setActiveTab] = useState<"board" | "timeline" | "calendar" | "reports">("board");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: "t1", title: "Finalize system architecture requirements", priority: "High", status: "todo", assignee: "Kotapati G.", dueDate: "Tomorrow" },
    { id: "t2", title: "Design UI/UX for PowerPoint studio", priority: "Medium", status: "todo", assignee: "Sarah C.", dueDate: "Nov 12" },
    { id: "t3", title: "Setup testing environment & mock runners", priority: "Low", status: "todo", assignee: "Alex R.", dueDate: "Nov 14" },
    { id: "t4", title: "Develop core offline-first sync modules", priority: "High", status: "in_progress", assignee: "Kotapati G.", dueDate: "Today" },
    { id: "t5", title: "Integrate Gemini AI tool-calling engine", priority: "High", status: "in_progress", assignee: "David K.", dueDate: "Nov 11" },
    { id: "t6", title: "Testing & OpenXML binary verification", priority: "Medium", status: "in_progress", assignee: "Sarah C.", dueDate: "Nov 13" },
    { id: "t7", title: "Project proposal & stakeholder signoff", priority: "High", status: "done", assignee: "Kotapati G.", dueDate: "Completed" },
    { id: "t8", title: "Research & competitive benchmark analysis", priority: "Medium", status: "done", assignee: "Alex R.", dueDate: "Completed" },
    { id: "t9", title: "Database design & schema migration", priority: "High", status: "done", assignee: "David K.", dueDate: "Completed" },
  ]);

  const handleGenerateAIPlan = async () => {
    setIsGeneratingPlan(true);
    setTimeout(() => {
      const generatedTask: TaskItem = {
        id: `t_${Date.now()}`,
        title: "Automated regression testing across all 7 workspace apps",
        priority: "High",
        status: "todo",
        assignee: "Kotapati G.",
        dueDate: "Nov 15",
      };
      setTasks((prev) => [generatedTask, ...prev]);
      setIsGeneratingPlan(false);
    }, 1000);
  };

  const getPriorityClass = (p: "High" | "Medium" | "Low") => {
    switch (p) {
      case "High":
        return "bg-rose-950/60 text-rose-300 border-rose-800/60";
      case "Medium":
        return "bg-amber-950/60 text-amber-300 border-amber-800/60";
      case "Low":
        return "bg-emerald-950/60 text-emerald-300 border-emerald-800/60";
    }
  };

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F19] text-slate-200 select-none overflow-hidden">
      {/* Top Header matching reference screenshot */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md shrink-0">
        <div className="flex items-center space-x-3">
          <h1 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Project Manager</span>
            <span className="text-xs font-normal text-slate-400">Agentic AI Development</span>
          </h1>

          <div className="flex items-center space-x-1 pl-4 border-l border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab("board")}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                activeTab === "board" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                activeTab === "timeline" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                activeTab === "calendar" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Calendar
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleGenerateAIPlan}
            disabled={isGeneratingPlan}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs text-white font-semibold shadow-md transition disabled:opacity-50"
          >
            {isGeneratingPlan ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>AI Plan</span>
          </button>

          <button
            onClick={() => {}}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="flex-1 overflow-x-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: To Do */}
        <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="font-bold text-xs text-white">To Do</span>
              <span className="text-xs text-slate-500">({todoTasks.length})</span>
            </div>
            <button className="text-slate-500 hover:text-white">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {todoTasks.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500/50 space-y-2 cursor-pointer transition shadow-xs"
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-mono px-2 py-0.2 rounded border ${getPriorityClass(t.priority)}`}>
                    {t.priority}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{t.dueDate}</span>
                  </span>
                </div>
                <h4 className="font-semibold text-xs text-white leading-snug">{t.title}</h4>
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span>{t.assignee}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="font-bold text-xs text-white">In Progress</span>
              <span className="text-xs text-slate-500">({inProgressTasks.length})</span>
            </div>
            <button className="text-slate-500 hover:text-white">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {inProgressTasks.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500/50 space-y-2 cursor-pointer transition shadow-xs"
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-mono px-2 py-0.2 rounded border ${getPriorityClass(t.priority)}`}>
                    {t.priority}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{t.dueDate}</span>
                  </span>
                </div>
                <h4 className="font-semibold text-xs text-white leading-snug">{t.title}</h4>
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span>{t.assignee}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Done */}
        <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-bold text-xs text-white">Done</span>
              <span className="text-xs text-slate-500">({doneTasks.length})</span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {doneTasks.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2 transition shadow-xs opacity-80"
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-mono px-2 py-0.2 rounded border ${getPriorityClass(t.priority)}`}>
                    {t.priority}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">Verified</span>
                </div>
                <h4 className="font-semibold text-xs text-slate-300 line-through leading-snug">{t.title}</h4>
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <span>{t.assignee}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

