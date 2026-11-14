"use client";

import React, { useState, useEffect } from "react";
import { MessageSquareText, Play, Sparkles, CheckCircle2, AlertTriangle, XCircle, Languages, Wrench, ArrowRightLeft } from "lucide-react";

export function ConversationalEvalTab() {
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [selectedProvider, setSelectedProvider] = useState<string>("gemini");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [summary, setSummary] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch("/api/evaluation/dataset");
        const data = await res.json();
        if (data.success && data.availableModels) {
          setAvailableModels(data.availableModels);
          const first = data.availableModels.find((m: any) => m.isAvailable);
          if (first) {
            setSelectedModel(first.id);
            setSelectedProvider(first.provider);
          }
        }
      } catch (err) {
        console.warn("Failed to load models:", err);
      }
    }
    loadModels();
  }, []);

  const handleRunConversational = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    setSummary(null);

    try {
      const res = await fetch("/api/evaluation/conversational", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          datasetId: "conversational-multiturn-eval",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Conversational evaluation failed");
      }
      setSummary(data.summary);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute evaluation");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageSquareText className="w-5 h-5 text-violet-400" />
          Conversational & Multilingual Evaluation Lab
        </h2>
        <p className="text-xs text-slate-400">
          Evaluates multi-turn context retention, Telugu-English code-switching, tool selection discernment & topic shifting
        </p>
      </div>

      {/* Controls */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Model</label>
            <select
              value={selectedModel}
              onChange={(e) => {
                const found = availableModels.find((m) => m.id === e.target.value);
                if (found) {
                  setSelectedModel(found.id);
                  setSelectedProvider(found.provider);
                }
              }}
              disabled={isRunning}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end justify-end">
            <button
              onClick={handleRunConversational}
              disabled={isRunning}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-violet-950/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isRunning ? <Sparkles className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isRunning ? "Evaluating Multi-turn Dialogue..." : "Run Conversational Suite"}</span>
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Results Display */}
      {summary && (
        <div className="space-y-6 animate-in fade-in">
          {/* Summary Score */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Overall Score</span>
              <div className="text-3xl font-black text-violet-400 mt-1">{summary.overallScore}/100</div>
              <span className="text-[10px] text-slate-500">Rubric Weighted</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-emerald-900/40">
              <span className="text-[11px] text-emerald-400 uppercase font-semibold">Passed Cases</span>
              <div className="text-3xl font-black text-emerald-400 mt-1">{summary.passedCases}</div>
              <span className="text-[10px] text-emerald-500/60">Fully compliant</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-amber-900/40">
              <span className="text-[11px] text-amber-400 uppercase font-semibold">Partial Cases</span>
              <div className="text-3xl font-black text-amber-400 mt-1">{summary.partialCases}</div>
              <span className="text-[10px] text-amber-500/60">Minor criteria miss</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-rose-900/40">
              <span className="text-[11px] text-rose-400 uppercase font-semibold">Failed Cases</span>
              <div className="text-3xl font-black text-rose-400 mt-1">{summary.failedCases}</div>
              <span className="text-[10px] text-rose-500/60">Major hallucination</span>
            </div>
          </div>

          {/* Test Case Inspection Cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Multi-Turn Dialogue Test Results</h3>
            {summary.results.map((r: any, idx: number) => (
              <div key={idx} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-400 text-[11px]">Case {idx + 1}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase font-bold">
                      {r.category.replace(/_/g, " ")}
                    </span>
                    <span className="text-slate-500 text-[10px]">{r.language}</span>
                  </div>
                  <span
                    className={`font-black text-sm ${
                      r.score >= 80 ? "text-emerald-400" : r.score >= 50 ? "text-amber-400" : "text-rose-400"
                    }`}
                  >
                    Score: {r.score}/100
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono">PROMPT & CONTEXT:</span>
                  <p className="text-slate-200">{r.prompt}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono">AI RESPONSE:</span>
                  <p className="text-slate-300 whitespace-pre-wrap">{r.aiResponse}</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {r.criteriaPassed.map((c: string, cIdx: number) => (
                    <span key={cIdx} className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" /> {c}
                    </span>
                  ))}
                  {r.criteriaFailed.map((c: string, cIdx: number) => (
                    <span key={cIdx} className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/30 border border-rose-900/40 px-2 py-0.5 rounded">
                      <XCircle className="w-3 h-3" /> {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
