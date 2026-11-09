"use client";

import React, { useState } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Table,
  Presentation,
  ShieldCheck,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";

interface WorkspaceAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCompleted?: (resultItem: any) => void;
}

interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
}

export function WorkspaceAgentModal({
  isOpen,
  onClose,
  onTaskCompleted,
}: WorkspaceAgentModalProps) {
  const [selectedTask, setSelectedTask] = useState<string>("prepare_project_review");
  const [customGoal, setCustomGoal] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [requireConfirmation, setRequireConfirmation] = useState<boolean>(false);

  const defaultSteps: WorkflowStep[] = [
    { step: 1, title: "Locate Source Report", description: "Search workspace for relevant project specification", status: "pending" },
    { step: 2, title: "Extract Key Concepts", description: "Read executive summary and operational parameters", status: "pending" },
    { step: 3, title: "Query Corresponding Spreadsheet", description: "Locate metrics and telemetry workbook", status: "pending" },
    { step: 4, title: "Run Statistical Analysis", description: "Compute quarterly trends and variance benchmarks", status: "pending" },
    { step: 5, title: "Generate Visual Charts", description: "Render performance comparison and bar graphics", status: "pending" },
    { step: 6, title: "Architect Presentation Slides", description: "Draft 6-slide executive deck structure", status: "pending" },
    { step: 7, title: "Synthesize Diagrams & Graphics", description: "Insert architecture diagrams and data charts", status: "pending" },
    { step: 8, title: "Apply Verified Theme", description: "Style with Office Dark Modern & high-contrast Aptos", status: "pending" },
    { step: 9, title: "Verify OpenXML Compliance", description: "Inspect binary magic bytes and layout streams", status: "pending" },
    { step: 10, title: "Finalize & Save Deck", description: "Persist to workspace vault and notify user", status: "pending" },
  ];

  const [steps, setSteps] = useState<WorkflowStep[]>(defaultSteps);

  const handleStartAutomation = () => {
    setIsRunning(true);
    setCurrentStepIndex(0);

    // Simulate real progressive multi-step execution
    let current = 0;
    const interval = setInterval(() => {
      setSteps((prev) => {
        const next = [...prev];
        if (current > 0 && current <= next.length) {
          next[current - 1].status = "completed";
        }
        if (current < next.length) {
          next[current].status = "running";
        }
        return next;
      });

      current++;
      setCurrentStepIndex(current);

      if (current > defaultSteps.length) {
        clearInterval(interval);
        setIsRunning(false);
        if (onTaskCompleted) {
          onTaskCompleted({
            name: "Agentic AI - Project Review.pptx",
            app: "powerpoint",
            format: "pptx",
          });
        }
      }
    }, 700);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentStepIndex(0);
    setSteps(defaultSteps.map((s) => ({ ...s, status: "pending" })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                AI Agent Automation
              </h2>
              <p className="text-xs text-slate-400">
                Autonomous multi-step execution across Word, Excel, and PowerPoint
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

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Preset Workflows */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-2">
              Select or Describe Automation Goal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedTask("prepare_project_review")}
                className={`p-3 rounded-xl border text-left transition ${
                  selectedTask === "prepare_project_review"
                    ? "border-indigo-500 bg-indigo-950/40 text-white"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div className="font-semibold text-white mb-1">Project Review Presentation</div>
                <div className="text-[11px] text-slate-400">
                  Analyze report & spreadsheet data, generate charts, and compile PPTX deck.
                </div>
              </button>

              <button
                onClick={() => setSelectedTask("convert_data_to_presentation")}
                className={`p-3 rounded-xl border text-left transition ${
                  selectedTask === "convert_data_to_presentation"
                    ? "border-indigo-500 bg-indigo-950/40 text-white"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div className="font-semibold text-white mb-1">Spreadsheet to Deck</div>
                <div className="text-[11px] text-slate-400">
                  Convert raw tabular sheets into visual KPI presentation slides.
                </div>
              </button>
            </div>
          </div>

          {/* Stepper Execution Log */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200">Execution Pipeline (10 Steps)</span>
              <span className="text-[11px] text-slate-400">
                {steps.filter((s) => s.status === "completed").length} of {steps.length} completed
              </span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {steps.map((st) => (
                <div
                  key={st.step}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                    st.status === "completed"
                      ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200"
                      : st.status === "running"
                      ? "border-indigo-500/60 bg-indigo-950/40 text-white ring-1 ring-indigo-500"
                      : "border-slate-800/80 bg-slate-900/40 text-slate-400"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-800 text-slate-300">
                      {st.step}
                    </span>
                    <div>
                      <div className="font-medium text-xs text-white">{st.title}</div>
                      <div className="text-[10px] text-slate-400">{st.description}</div>
                    </div>
                  </div>

                  <div>
                    {st.status === "completed" && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {st.status === "running" && (
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    )}
                    {st.status === "pending" && (
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/80">
          <button
            onClick={handleReset}
            disabled={isRunning}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs transition"
            >
              Close
            </button>
            <button
              onClick={handleStartAutomation}
              disabled={isRunning}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute Automation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
