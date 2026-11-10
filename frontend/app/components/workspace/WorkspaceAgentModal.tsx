"use client";

import React, { useState } from "react";
import {
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
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
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const defaultSteps: WorkflowStep[] = [
    { step: 1, title: "Locate Source Report", description: "Search workspace for relevant project specification", status: "pending" },
    { step: 2, title: "Extract Key Concepts", description: "Read executive summary and operational parameters", status: "pending" },
    { step: 3, title: "Query Corresponding Spreadsheet", description: "Locate metrics and telemetry workbook", status: "pending" },
    { step: 4, title: "Run Statistical Analysis", description: "Compute quarterly trends and variance benchmarks", status: "pending" },
    { step: 5, title: "Generate Visual Charts", description: "Render performance comparison and bar graphics", status: "pending" },
    { step: 6, title: "Architect Presentation Slides", description: "Draft 6-slide executive deck structure", status: "pending" },
    { step: 7, title: "Synthesize Diagrams & Graphics", description: "Insert architecture diagrams and data charts", status: "pending" },
    { step: 8, title: "Apply Verified Theme", description: "Style with Office Modern & high-contrast layout", status: "pending" },
    { step: 9, title: "Verify OpenXML Compliance", description: "Inspect binary magic bytes and layout streams", status: "pending" },
    { step: 10, title: "Finalize & Save Deck", description: "Persist to workspace vault and notify user", status: "pending" },
  ];

  const [steps, setSteps] = useState<WorkflowStep[]>(defaultSteps);

  const handleStartAutomation = () => {
    setIsRunning(true);
    setCurrentStepIndex(0);

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
    }, 600);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentStepIndex(0);
    setSteps(defaultSteps.map((s) => ({ ...s, status: "pending" })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#111111]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#5B21B6] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111] tracking-tight">
                AI Agent Automation
              </h2>
              <p className="text-xs text-neutral-500">
                Autonomous multi-step execution across Word, Excel, and PowerPoint
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

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-neutral-700">
          {/* Preset Workflows */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-2">
              Select or Describe Automation Goal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => setSelectedTask("prepare_project_review")}
                className={`p-3.5 rounded-xl border text-left transition shadow-xs ${
                  selectedTask === "prepare_project_review"
                    ? "border-black bg-neutral-50 text-black font-semibold"
                    : "border-[#E5E5E5] bg-white hover:border-neutral-400 text-neutral-600"
                }`}
              >
                <div className="font-bold text-xs text-[#111111] mb-1">Project Review Presentation</div>
                <div className="text-[11px] text-neutral-500 font-normal leading-relaxed">
                  Analyze report & spreadsheet data, generate charts, and compile PPTX deck.
                </div>
              </button>

              <button
                onClick={() => setSelectedTask("convert_data_to_presentation")}
                className={`p-3.5 rounded-xl border text-left transition shadow-xs ${
                  selectedTask === "convert_data_to_presentation"
                    ? "border-black bg-neutral-50 text-black font-semibold"
                    : "border-[#E5E5E5] bg-white hover:border-neutral-400 text-neutral-600"
                }`}
              >
                <div className="font-bold text-xs text-[#111111] mb-1">Spreadsheet to Deck</div>
                <div className="text-[11px] text-neutral-500 font-normal leading-relaxed">
                  Convert raw tabular sheets into visual KPI presentation slides.
                </div>
              </button>
            </div>
          </div>

          {/* Stepper Execution Log */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-[#111111]">Execution Pipeline (10 Steps)</span>
              <span className="text-[11px] text-neutral-500">
                {steps.filter((s) => s.status === "completed").length} of {steps.length} completed
              </span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {steps.map((st) => (
                <div
                  key={st.step}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                    st.status === "completed"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : st.status === "running"
                      ? "border-black bg-neutral-50 text-[#111111] ring-1 ring-black"
                      : "border-[#E5E5E5] bg-white text-neutral-500"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-neutral-100 border border-[#E5E5E5] text-neutral-700">
                      {st.step}
                    </span>
                    <div>
                      <div className="font-semibold text-xs text-[#111111]">{st.title}</div>
                      <div className="text-[10px] text-neutral-500">{st.description}</div>
                    </div>
                  </div>

                  <div>
                    {st.status === "completed" && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    {st.status === "running" && (
                      <Loader2 className="w-4 h-4 text-black animate-spin" />
                    )}
                    {st.status === "pending" && (
                      <Clock className="w-3.5 h-3.5 text-neutral-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-[#E5E5E5] flex items-center justify-between bg-[#F9FAFB]">
          <button
            onClick={handleReset}
            disabled={isRunning}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-neutral-500 hover:text-black hover:bg-neutral-100 text-xs transition disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-[#E5E5E5] hover:bg-neutral-100 text-neutral-700 text-xs transition"
            >
              Close
            </button>
            <button
              onClick={handleStartAutomation}
              disabled={isRunning}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-black hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
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
