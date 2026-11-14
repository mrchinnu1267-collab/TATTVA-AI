"use client";

import React, { useState, useEffect } from "react";
import { Swords, Play, Sparkles, CheckCircle2, XCircle, Zap, ShieldAlert, BarChart3, Clock } from "lucide-react";

export function ModelComparisonTab() {
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModelA, setSelectedModelA] = useState<string>("gemini-2.5-flash");
  const [selectedModelB, setSelectedModelB] = useState<string>("gemini-3.6-flash");
  const [sampleSize, setSampleSize] = useState<number>(10);
  const [seed, setSeed] = useState<number>(42);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [report, setReport] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch("/api/evaluation/dataset");
        const data = await res.json();
        if (data.success && data.availableModels) {
          setAvailableModels(data.availableModels);
          const configured = data.availableModels.filter((m: any) => m.isAvailable);
          if (configured.length >= 2) {
            setSelectedModelA(configured[0].id);
            setSelectedModelB(configured[1].id);
          }
        }
      } catch (err) {
        console.warn("Failed to load models:", err);
      }
    }
    loadModels();
  }, []);

  const handleStartComparison = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    setReport(null);

    const modelAObj = availableModels.find((m) => m.id === selectedModelA);
    const modelBObj = availableModels.find((m) => m.id === selectedModelB);

    if (!modelAObj || !modelBObj) {
      setErrorMsg("Please select valid models for comparison.");
      setIsRunning(false);
      return;
    }

    const payload = {
      comparisonName: `${modelAObj.name} vs ${modelBObj.name} Head-to-Head`,
      sampleSize,
      seed,
      targets: [
        { provider: modelAObj.provider, model: modelAObj.id },
        { provider: modelBObj.provider, model: modelBObj.id },
      ],
    };

    try {
      const res = await fetch("/api/evaluation/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Comparison failed");
      }
      setReport(data.comparison);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute comparison");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Swords className="w-5 h-5 text-amber-400" />
          Model Arena & Head-to-Head Comparison
        </h2>
        <p className="text-xs text-slate-400">
          Fair, empirical side-by-side benchmarking on identical question sets with identical PRNG seeds
        </p>
      </div>

      {/* Comparison Controls */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Model A (Challenger)</label>
            <select
              value={selectedModelA}
              onChange={(e) => setSelectedModelA(e.target.value)}
              disabled={isRunning}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Model B (Defender)</label>
            <select
              value={selectedModelB}
              onChange={(e) => setSelectedModelB(e.target.value)}
              disabled={isRunning}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Sample Size</label>
            <select
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              disabled={isRunning}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
            >
              <option value={10}>10 Questions (Quick)</option>
              <option value={25}>25 Questions (Standard)</option>
              <option value={50}>50 Questions (Deep)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Fair Benchmark Seed</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              disabled={isRunning}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleStartComparison}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isRunning ? <Sparkles className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
            <span>{isRunning ? "Benchmarking Both Models..." : "Run Side-by-Side Arena"}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Comparison Report Display */}
      {report && (
        <div className="space-y-6 animate-in fade-in">
          {/* Winner Banner */}
          {report.winnerModel && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-slate-900 border border-amber-500/40 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Arena Winner
                </div>
                <h3 className="text-lg font-black text-white">{report.winnerModel.model}</h3>
                <p className="text-xs text-slate-300">{report.winnerModel.reason}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-amber-400">{report.winnerModel.accuracy}%</div>
                <div className="text-[11px] text-slate-400">{report.winnerModel.avgLatencyMs}ms avg latency</div>
              </div>
            </div>
          )}

          {/* Model Scorecards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.models.map((m: any, idx: number) => (
              <div key={idx} className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {m.provider}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">{m.model}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-cyan-400">{m.accuracy}%</span>
                    <span className="block text-[10px] text-slate-500">Accuracy</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
                    <span className="text-emerald-400 font-bold text-sm block">{m.correctAnswers}</span>
                    <span className="text-[10px] text-slate-400">Correct</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
                    <span className="text-rose-400 font-bold text-sm block">{m.incorrectAnswers}</span>
                    <span className="text-[10px] text-slate-400">Incorrect</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
                    <span className="text-cyan-400 font-bold text-sm block">{m.averageResponseTimeMs}ms</span>
                    <span className="text-[10px] text-slate-400">Avg Latency</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Question-by-Question Deltas */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
            <div className="p-4 border-b border-slate-800 font-bold text-sm text-white">
              Question Alignment & Consensus Matrix ({report.questionDeltas.length} Questions)
            </div>
            <div className="divide-y divide-slate-800/60 text-xs">
              {report.questionDeltas.map((d: any, idx: number) => (
                <div key={idx} className="p-4 space-y-2 hover:bg-slate-900/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-mono text-[11px]">Q{d.questionId} • [{d.subject}]</span>
                    <span className="text-[11px] text-slate-400">
                      Expected: <strong className="text-emerald-400 font-mono">{d.expectedAnswer}</strong>
                    </span>
                  </div>
                  <p className="text-slate-200">{d.question}</p>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    {Object.entries(d.modelAnswers).map(([key, val]: [string, any]) => (
                      <div
                        key={key}
                        className={`p-2 rounded-lg border flex items-center justify-between ${
                          val.isCorrect
                            ? "bg-emerald-950/30 border-emerald-900/40 text-emerald-300"
                            : "bg-rose-950/30 border-rose-900/40 text-rose-300"
                        }`}
                      >
                        <span className="truncate max-w-[150px]">{key.split(":")[1]}</span>
                        <span>Answer: {val.aiAnswer} ({val.latencyMs}ms)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
