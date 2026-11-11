"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Activity,
  Layers,
  Filter,
  Play,
  RotateCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  ModelRankingRecord,
  BenchmarkCategory,
  FailedBenchmarkCase,
  HistoricalBenchmarkRun,
  BenchmarkRunSummary,
} from "@/app/lib/image-engine/model-benchmarking/types";

interface ModelIntelligenceDashboardProps {
  onSelectModel?: (modelId: string) => void;
}

export function ModelIntelligenceDashboard({ onSelectModel }: ModelIntelligenceDashboardProps) {
  const [activeTab, setActiveTab] = useState<"rankings" | "comparison" | "failures" | "history">("rankings");
  const [selectedCategory, setSelectedCategory] = useState<BenchmarkCategory | "all">("all");
  const [rankings, setRankings] = useState<ModelRankingRecord[]>([]);
  const [failedCases, setFailedCases] = useState<FailedBenchmarkCase[]>([]);
  const [historicalRuns, setHistoricalRuns] = useState<HistoricalBenchmarkRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [benchmarkSummary, setBenchmarkSummary] = useState<BenchmarkRunSummary | null>(null);
  const [comparedModelIds, setComparedModelIds] = useState<string[]>(["flux-1-dev", "gemini-3.1-flash-image"]);

  // Fetch live rankings
  const fetchRankings = async (category: string = "all") => {
    setLoading(true);
    try {
      const url = category === "all" ? "/api/image/benchmark" : `/api/image/benchmark?category=${category}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.rankings) {
        setRankings(data.rankings);
      }
    } catch (err) {
      console.error("Failed to load rankings:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch failed cases
  const fetchFailedCases = async () => {
    try {
      const res = await fetch("/api/image/benchmark?view=failed_cases");
      const data = await res.json();
      if (data.success && data.failedCases) {
        setFailedCases(data.failedCases);
      }
    } catch (err) {
      console.error("Failed to load failed cases:", err);
    }
  };

  // Fetch history
  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/image/benchmark?view=history");
      const data = await res.json();
      if (data.success && data.history) {
        setHistoricalRuns(data.history);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  useEffect(() => {
    fetchRankings(selectedCategory);
    fetchFailedCases();
    fetchHistory();
  }, [selectedCategory]);

  // Run Benchmark Audit
  const handleRunAudit = async () => {
    setRunningBenchmark(true);
    try {
      const res = await fetch("/api/image/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sampleLimit: 15,
          categoryFilter: selectedCategory === "all" ? undefined : selectedCategory,
        }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setBenchmarkSummary(data.summary);
        fetchRankings(selectedCategory);
        fetchHistory();
        fetchFailedCases();
      }
    } catch (err) {
      console.error("Benchmark audit execution failed:", err);
    } finally {
      setRunningBenchmark(false);
    }
  };

  const categories: Array<{ id: BenchmarkCategory | "all"; label: string }> = [
    { id: "all", label: "All Dimensions" },
    { id: "object_accuracy", label: "Object Accuracy" },
    { id: "attribute_accuracy", label: "Attributes & Colors" },
    { id: "spatial_accuracy", label: "Spatial & Topology" },
    { id: "composition", label: "Composition & Angles" },
    { id: "reference_accuracy", label: "Reference Fidelity" },
    { id: "text_accuracy", label: "Text & Typography" },
    { id: "visual_generation", label: "Photorealism & Style" },
  ];

  const toggleComparedModel = (modelId: string) => {
    if (comparedModelIds.includes(modelId)) {
      if (comparedModelIds.length > 1) {
        setComparedModelIds(comparedModelIds.filter((id) => id !== modelId));
      }
    } else {
      if (comparedModelIds.length < 3) {
        setComparedModelIds([...comparedModelIds, modelId]);
      }
    }
  };

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--soft)] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Model Intelligence & Accuracy Benchmark (Phase J)
            </h2>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Empirical instruction-following rankings evaluated across 500 ground-truth challenge prompts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAudit}
            disabled={runningBenchmark}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors shadow-sm"
          >
            {runningBenchmark ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                <span>Running Audit (15 Prompts)…</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Run Benchmark Audit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab("rankings")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "rankings"
              ? "bg-blue-500/10 text-blue-500 font-semibold"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Model Rankings</span>
        </button>

        <button
          onClick={() => setActiveTab("comparison")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "comparison"
              ? "bg-blue-500/10 text-blue-500 font-semibold"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Head-to-Head Comparison ({comparedModelIds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("failures")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "failures"
              ? "bg-blue-500/10 text-blue-500 font-semibold"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Failure Cases & Loop ({failedCases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "history"
              ? "bg-blue-500/10 text-blue-500 font-semibold"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Historical Runs ({historicalRuns.length})</span>
        </button>
      </div>

      {/* Category Pills (for rankings) */}
      {activeTab === "rankings" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? "bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 shadow-sm"
                  : "bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab 1: Rankings Leaderboard */}
      {activeTab === "rankings" && (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-neutral-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Overall Accuracy</th>
                  <th className="py-2.5 px-3">Text</th>
                  <th className="py-2.5 px-3">Spatial</th>
                  <th className="py-2.5 px-3">Count</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Cost / Success</th>
                  <th className="py-2.5 px-3">Pareto Tier</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rankings.map((r) => (
                  <tr
                    key={r.modelId}
                    className="hover:bg-neutral-500/5 transition-colors group cursor-pointer"
                    onClick={() => onSelectModel?.(r.modelId)}
                  >
                    <td className="py-3 px-3 font-bold text-neutral-900 dark:text-neutral-100">
                      {r.rank === 1 ? (
                        <span className="inline-flex items-center gap-1 text-amber-500">
                          <Trophy className="h-4 w-4" /> #1
                        </span>
                      ) : (
                        `#${r.rank}`
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-500 transition-colors">
                        {r.modelName}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {r.sampleCount} audited tests {r.isEmpirical ? "• Empirical" : "• Prior"}
                      </div>
                    </td>
                    <td className="py-3 px-3 uppercase text-[10px] font-semibold tracking-wider text-neutral-500">
                      {r.providerId}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-neutral-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              r.overallScore >= 90
                                ? "bg-emerald-500"
                                : r.overallScore >= 80
                                ? "bg-blue-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${r.overallScore}%` }}
                          />
                        </div>
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">
                          {r.overallScore}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400">
                      {r.dimensionScores.textAccuracy}%
                    </td>
                    <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400">
                      {r.dimensionScores.spatialAccuracy}%
                    </td>
                    <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400">
                      {r.dimensionScores.countFidelity}%
                    </td>
                    <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400">
                      {(r.averageLatencyMs / 1000).toFixed(1)}s
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-600 dark:text-neutral-400">
                      {r.costPerSuccessfulGenUsd === 0 ? "Free" : `$${r.costPerSuccessfulGenUsd.toFixed(4)}`}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          r.paretoTier === "optimal"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : r.paretoTier === "economy"
                            ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                            : "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20"
                        }`}
                      >
                        {r.paretoTier.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="checkbox"
                        checked={comparedModelIds.includes(r.modelId)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleComparedModel(r.modelId);
                        }}
                        className="rounded border-[var(--border)] text-blue-600 focus:ring-0 cursor-pointer"
                        title="Add to Comparison"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Head-to-Head Comparison Matrix */}
      {activeTab === "comparison" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Comparing {comparedModelIds.length} models across 8 accuracy dimensions</span>
            <span>Check/uncheck models from the Leaderboard tab to adjust</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparedModelIds.map((id) => {
              const record = rankings.find((r) => r.modelId === id);
              if (!record) return null;

              return (
                <div
                  key={id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-neutral-900 dark:text-neutral-100">{record.modelName}</h3>
                      <p className="text-[10px] text-neutral-500 uppercase">{record.providerId} • Rank #{record.rank}</p>
                    </div>
                    <span className="text-lg font-extrabold text-blue-500">{record.overallScore}%</span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[var(--border)] text-xs">
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Text & Typography:</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        {record.dimensionScores.textAccuracy}%
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Spatial Topology:</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        {record.dimensionScores.spatialAccuracy}%
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Exact Quantities:</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        {record.dimensionScores.countFidelity}%
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Object Presence:</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        {record.dimensionScores.objectAccuracy}%
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Reference Fidelity:</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        {record.dimensionScores.referenceConsistency}%
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>Visual Quality:</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        {record.dimensionScores.visualQuality}%
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)] flex justify-between text-[11px] text-neutral-500">
                    <span>Latency: {(record.averageLatencyMs / 1000).toFixed(1)}s</span>
                    <span>Cost: {record.costPerSuccessfulGenUsd === 0 ? "Free" : `$${record.costPerSuccessfulGenUsd.toFixed(4)}`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Failed Cases & Improvement Loop */}
      {activeTab === "failures" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Regression Library ({failedCases.length} cataloged edge cases)</span>
            <span className="text-emerald-500">Feeds iterative prompt compiler & router tuning</span>
          </div>

          <div className="space-y-2.5">
            {failedCases.map((f, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    Prompt #{f.promptId} ({f.category.replace("_", " ").toUpperCase()})
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-500">
                    {f.modelId}
                  </span>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 italic">"{f.prompt}"</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-red-500/10 text-[11px]">
                  <div>
                    <span className="text-neutral-500">Expected: </span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{f.expectedValue}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Detected: </span>
                    <span className="font-medium text-red-600 dark:text-red-400">{f.detectedValue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Historical Benchmark Runs */}
      {activeTab === "history" && (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-neutral-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Run ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Primary Model</th>
                  <th className="py-2.5 px-3">Prompts</th>
                  <th className="py-2.5 px-3">Overall Score</th>
                  <th className="py-2.5 px-3">Regression</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {historicalRuns.map((h) => (
                  <tr key={h.runId} className="hover:bg-neutral-500/5">
                    <td className="py-3 px-3 font-mono text-neutral-500">{h.runId}</td>
                    <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400">
                      {new Date(h.timestamp).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-neutral-900 dark:text-neutral-100">{h.modelId}</td>
                    <td className="py-3 px-3 text-neutral-500">{h.totalPromptsEvaluated}</td>
                    <td className="py-3 px-3 font-bold text-blue-500">{h.overallScore}%</td>
                    <td className="py-3 px-3">
                      {h.regressionDetected ? (
                        <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                          <AlertTriangle className="h-3.5 w-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                          <CheckCircle className="h-3.5 w-3.5" /> Passed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-neutral-500 max-w-xs truncate">{h.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

