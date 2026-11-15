"use client";

/**
 * TATTVA AI - GSM8K Mathematical Reasoning Evaluation Tab
 * Displays overview metric cards, evaluation controls, topic breakdowns,
 * detailed question tables, and custom fine-tuning readiness.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import React, { useState, useEffect } from "react";
import {
  Calculator,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  Cpu,
  Download,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import type { Gsm8kEvalRunSummary, Gsm8kFineTuningReadinessReport } from "@/app/lib/evaluation/gsm8k/types";

interface Gsm8kMathEvalTabProps {
  availableModels: Array<{ id: string; name: string; isAvailable: boolean }>;
}

export const Gsm8kMathEvalTab: React.FC<Gsm8kMathEvalTabProps> = ({ availableModels }) => {
  const [selectedModel, setSelectedModel] = useState<string>(
    availableModels[0]?.id || "gemini-2.5-flash"
  );
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentRun, setCurrentRun] = useState<Gsm8kEvalRunSummary | null>(null);
  const [history, setHistory] = useState<Gsm8kEvalRunSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [readinessReport, setReadinessReport] = useState<Gsm8kFineTuningReadinessReport | null>(null);
  const [showFinetuning, setShowFinetuning] = useState<boolean>(false);

  useEffect(() => {
    fetchHistory();
    fetchReadiness();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/evaluation/gsm8k");
      if (res.ok) {
        const data = await res.json();
        if (data.history && data.history.length > 0) {
          setHistory(data.history);
          setCurrentRun(data.history[0]);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch GSM8K history:", err);
    }
  };

  const fetchReadiness = async () => {
    try {
      const res = await fetch("/api/evaluation/gsm8k/finetuning");
      if (res.ok) {
        const data = await res.json();
        setReadinessReport(data.report);
      }
    } catch (err) {
      console.warn("Failed to fetch fine-tuning readiness:", err);
    }
  };

  const handleStartEvaluation = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/evaluation/gsm8k", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selectedModel,
          questionCount,
          seed: 42,
          mockInference: true, // Safe default in UI to protect developer quotas
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Evaluation failed to complete");
      }

      const data = await res.json();
      setCurrentRun(data.summary);
      setHistory((prev) => [data.summary, ...prev.filter((r) => r.runId !== data.summary.runId)]);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900/40 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                GSM8K Mathematical Reasoning Evaluation
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                  OpenAI Dataset Benchmark
                </span>
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Rigorous empirical evaluation of multi-step arithmetic, algebra, fractions, and quantitative problem solving.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFinetuning(!showFinetuning)}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-2"
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
              {showFinetuning ? "Hide SFT Pipeline" : "Custom Model SFT"}
            </button>
          </div>
        </div>
      </div>

      {/* SFT Readiness Drawer */}
      {showFinetuning && readinessReport && (
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-semibold text-white">Custom TATTVA Mathematical SLM Fine-Tuning</h3>
            </div>
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
              Experimental Readiness (7,473 SFT Samples Available)
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            The GSM8K training split is prepared for Supervised Fine-Tuning (SFT) in Alpaca, ChatML, and Hugging Face formats with QLoRA 4-bit quantization.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400">Target Base Model</span>
              <p className="text-white font-medium mt-1">Qwen/Qwen2.5-Math-1.5B</p>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400">PEFT Method</span>
              <p className="text-emerald-400 font-medium mt-1">QLoRA (r=16, alpha=32, 4-bit)</p>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400">Hardware Profile</span>
              <p className="text-amber-400 font-medium mt-1">Min 6GB VRAM (Cloud GPU Recommended)</p>
            </div>
          </div>

          {readinessReport.warnings.map((w, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-amber-300/90 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls & Config */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Model Under Test
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isRunning}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Benchmark Dataset
            </label>
            <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-300 flex items-center justify-between">
              <span>OpenAI GSM8K (Evaluation Split)</span>
              <span className="text-xs text-emerald-400 font-medium">1,319 problems</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Sample Question Count
            </label>
            <div className="flex gap-2">
              {[5, 10, 25, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuestionCount(num)}
                  disabled={isRunning}
                  className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                    questionCount === num
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Strict Double-Blind Protection: Expected answers are never exposed to LLM prompts.</span>
          </div>

          <button
            onClick={handleStartEvaluation}
            disabled={isRunning}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg ${
              isRunning
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40"
            }`}
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Run GSM8K Benchmark
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {currentRun && (
        <div className="space-y-6">
          {/* Metric Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Mathematical Accuracy</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-400">{currentRun.accuracy}%</span>
                <span className="text-xs text-slate-500">
                  ({currentRun.correctAnswers}/{currentRun.totalQuestions})
                </span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Correct Solutions</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{currentRun.correctAnswers}</span>
                <span className="text-xs text-emerald-400">verified</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Incorrect / Invalid</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-rose-400">{currentRun.incorrectAnswers}</span>
                <span className="text-xs text-slate-500">
                  ({currentRun.invalidResponses} invalid)
                </span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Avg Response Latency</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{currentRun.avgResponseTimeMs}</span>
                <span className="text-xs text-slate-400">ms/problem</span>
              </div>
            </div>
          </div>

          {/* Mathematical Sub-Domain Breakdown */}
          {currentRun.topicBreakdown && currentRun.topicBreakdown.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Mathematical Performance by Sub-Domain
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {currentRun.topicBreakdown.map((topic) => (
                  <div key={topic.topic} className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-slate-300 capitalize">{topic.topic.replace("_", " ")}</span>
                      <span className="text-xs font-bold text-emerald-400">{topic.accuracy}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${topic.accuracy}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 mt-2">
                      <span>{topic.correct}/{topic.total} correct</span>
                      <span>{topic.avgLatencyMs}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Question Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Question-by-Question Evaluation Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Word Problem</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Expected Answer</th>
                    <th className="p-3">AI Extracted Answer</th>
                    <th className="p-3">Result</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {currentRun.questionResults.map((qr, idx) => (
                    <tr key={qr.questionId} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-3 max-w-md font-medium text-slate-200">
                        {qr.question}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 capitalize text-[11px]">
                          {qr.topic.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{qr.expectedAnswer}</td>
                      <td className="p-3 font-mono font-bold text-white">{qr.aiExtractedAnswer || "—"}</td>
                      <td className="p-3">
                        {qr.isCorrect ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Correct
                          </span>
                        ) : qr.isInvalid ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" /> Invalid
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30 flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" /> Incorrect
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400 font-mono">{qr.latencyMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
