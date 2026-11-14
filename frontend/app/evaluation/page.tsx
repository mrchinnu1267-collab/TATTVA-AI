"use client";

/**
 * TATTVA AI - AI Evaluation Lab Dashboard
 * OpenAI MMMLU (Hindi) Benchmark Evaluation Suite
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  BrainCircuit,
  Play,
  Square,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  FileCode,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Sparkles,
  BarChart3,
  Clock,
  Layers,
  Database,
  Cpu,
  Info,
  Check,
  AlertCircle,
} from "lucide-react";
import type {
  EvaluationRunSummary,
  QuestionEvaluationResult,
  EvaluationLiveProgress,
} from "../lib/evaluation/mmmlu/types";

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  isAvailable: boolean;
  latencyTier?: string;
  strengths?: string[];
}

interface DatasetMetadata {
  name: string;
  filename: string;
  language: string;
  totalRows: number;
  validQuestions: number;
  invalidRows: number;
  subjectsCount: number;
  subjects: Array<{ name: string; count: number }>;
}

export default function AIEvaluationLabPage() {
  // Metadata & Models
  const [datasetMeta, setDatasetMeta] = useState<DatasetMetadata | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Configuration Controls
  const [selectedDataset, setSelectedDataset] = useState<string>("sample");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("hi-IN");
  const [selectedProvider, setSelectedProvider] = useState<string>("gemini");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.6-flash");
  const [sampleSize, setSampleSize] = useState<string>("25");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [concurrency, setConcurrency] = useState<number>(2);
  const [seedInput, setSeedInput] = useState<string>("");

  // Execution State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [progress, setProgress] = useState<EvaluationLiveProgress | null>(null);
  const [liveResults, setLiveResults] = useState<QuestionEvaluationResult[]>([]);
  const [completedSummary, setCompletedSummary] = useState<EvaluationRunSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History & Tabs
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [historyRuns, setHistoryRuns] = useState<Array<Omit<EvaluationRunSummary, "results">>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Table Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tableSubjectFilter, setTableSubjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Load dataset meta & available models on mount
  useEffect(() => {
    async function fetchMetadata() {
      try {
        setLoadingMeta(true);
        const res = await fetch("/api/evaluation/dataset");
        const data = await res.json();
        if (data.success) {
          setDatasetMeta(data.dataset);
          setAvailableModels(data.availableModels || []);

          // Auto-select first available model
          const firstAvailable = data.availableModels?.find((m: ModelOption) => m.isAvailable);
          if (firstAvailable) {
            setSelectedProvider(firstAvailable.provider);
            setSelectedModel(firstAvailable.id);
          }
        } else {
          setErrorMsg(data.error || "Failed to load MMMLU dataset metadata");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Network error loading dataset metadata");
      } finally {
        setLoadingMeta(false);
      }
    }
    fetchMetadata();
  }, []);

  // Filter models for selected provider
  const modelsForProvider = useMemo(() => {
    return availableModels.filter((m) => m.provider === selectedProvider);
  }, [availableModels, selectedProvider]);

  // Handle provider change
  const handleProviderChange = (newProvider: string) => {
    setSelectedProvider(newProvider);
    const firstForProv = availableModels.find((m) => m.provider === newProvider);
    if (firstForProv) {
      setSelectedModel(firstForProv.id);
    }
  };

  // Fetch History runs
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/evaluation/history");
      const data = await res.json();
      if (data.success) {
        setHistoryRuns(data.runs || []);
      }
    } catch (err) {
      console.warn("Failed to load history runs:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  // Start Evaluation (with streaming SSE)
  const handleStartEvaluation = async () => {
    setErrorMsg(null);
    setIsRunning(true);
    setProgress(null);
    setLiveResults([]);
    setCompletedSummary(null);

    const payload = {
      provider: selectedProvider,
      model: selectedModel,
      sampleSize: sampleSize === "all" ? "all" : Number(sampleSize),
      subject: selectedSubject,
      concurrency,
      seed: seedInput ? Number(seedInput) : undefined,
      dataset: selectedDataset,
      language: selectedLanguage,
      stream: true,
    };

    try {
      const response = await fetch("/api/evaluation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status} failed`);
      }

      if (!response.body) {
        throw new Error("No response body received from server");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const evtBlock of events) {
          if (!evtBlock.trim()) continue;
          const lines = evtBlock.split("\n");
          let eventType = "message";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              eventData = line.replace("data:", "").trim();
            }
          }

          if (!eventData) continue;

          try {
            const parsed = JSON.parse(eventData);

            if (eventType === "start") {
              setCurrentRunId(parsed.runId);
            } else if (eventType === "progress") {
              const p: EvaluationLiveProgress = parsed;
              setProgress(p);
              if (p.latestResult) {
                setLiveResults((prev) => [...prev, p.latestResult!]);
              }
            } else if (eventType === "complete") {
              const summary: EvaluationRunSummary = parsed;
              setCompletedSummary(summary);
              setLiveResults(summary.results);
              setIsRunning(false);
              fetchHistory();
            } else if (eventType === "error") {
              setErrorMsg(parsed.error || "Evaluation failed during run");
              setIsRunning(false);
            }
          } catch {
            // Ignore parse errors on raw tokens
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute evaluation job");
      setIsRunning(false);
    }
  };

  // Stop Evaluation
  const handleStopEvaluation = async () => {
    if (!currentRunId) return;
    try {
      await fetch("/api/evaluation/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: currentRunId }),
      });
      setIsRunning(false);
    } catch (err) {
      console.warn("Error stopping evaluation:", err);
    }
  };

  // Load a historical run into active view
  const handleViewHistoricalRun = async (runId: string) => {
    try {
      const res = await fetch(`/api/evaluation/history/${runId}`);
      const data = await res.json();
      if (data.success && data.run) {
        setCompletedSummary(data.run);
        setLiveResults(data.run.results || []);
        setActiveTab("current");
      }
    } catch (err) {
      console.warn("Failed to load historical run details:", err);
    }
  };

  // Compute active metrics
  const activeMetrics = useMemo(() => {
    if (completedSummary) {
      return {
        total: completedSummary.totalQuestions,
        attempted: completedSummary.attemptedQuestions,
        correct: completedSummary.correctAnswers,
        incorrect: completedSummary.incorrectAnswers,
        invalid: completedSummary.invalidResponses,
        failed: completedSummary.failedRequests,
        accuracy: completedSummary.accuracy,
      };
    }
    if (progress) {
      const valid = progress.correctCount + progress.incorrectCount;
      const acc = valid > 0 ? Math.round((progress.correctCount / valid) * 1000) / 10 : 0;
      return {
        total: progress.totalQuestions,
        attempted: progress.currentIndex,
        correct: progress.correctCount,
        incorrect: progress.incorrectCount,
        invalid: progress.invalidCount,
        failed: progress.failedCount,
        accuracy: acc,
      };
    }
    return {
      total: sampleSize === "all" ? datasetMeta?.validQuestions || 14042 : Number(sampleSize) || 25,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      invalid: 0,
      failed: 0,
      accuracy: 0,
    };
  }, [completedSummary, progress, sampleSize, datasetMeta]);

  // Filtered results for the table
  const filteredResults = useMemo(() => {
    return liveResults.filter((r) => {
      // Status filter
      if (statusFilter === "correct" && r.status !== "correct") return false;
      if (statusFilter === "incorrect" && r.status !== "incorrect") return false;
      if (statusFilter === "invalid" && r.status !== "invalid_response") return false;
      if (statusFilter === "error" && r.status !== "api_error") return false;

      // Subject filter
      if (tableSubjectFilter !== "all" && r.subject !== tableSubjectFilter) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.question.toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q) ||
          r.explanation?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [liveResults, statusFilter, tableSubjectFilter, searchQuery]);

  // Trigger Report Download
  const handleDownload = (format: "csv" | "json" | "pdf") => {
    const runId = completedSummary?.id || currentRunId;
    if (!runId) return;
    window.open(`/api/evaluation/export?runId=${runId}&format=${format}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/chat"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Chat</span>
          </Link>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-violet-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                AI Evaluation Lab
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  OpenAI MMMLU
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Empirical accuracy testing on Hindi academic benchmark (14,042 questions across 57 subjects)
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setActiveTab("current")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === "current"
                  ? "bg-cyan-500 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Active Evaluation
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === "history"
                  ? "bg-cyan-500 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Evaluation History
            </button>
          </div>

          {(completedSummary || liveResults.length > 0) && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload("csv")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
                title="Export evaluation results to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => handleDownload("json")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
                title="Export evaluation results to JSON"
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>JSON</span>
              </button>
              <button
                onClick={() => handleDownload("pdf")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
                title="Generate PDF evaluation report"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>PDF Report</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Error notification banner */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 flex items-center justify-between text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs text-rose-300 hover:text-white px-2 py-1 rounded bg-rose-900/50"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === "history" ? (
          /* ======================================================== */
          /* EVALUATION HISTORY TAB                                    */
          /* ======================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Evaluation Run History</h2>
                <p className="text-xs text-slate-400">Past benchmark runs with models, accuracy, and reports</p>
              </div>
              <button
                onClick={fetchHistory}
                disabled={loadingHistory}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
                <span>Refresh History</span>
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
                <span className="text-sm">Loading historical evaluation runs...</span>
              </div>
            ) : historyRuns.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-slate-800/60 bg-slate-900/40 text-slate-400">
                <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium">No evaluation runs recorded yet.</p>
                <p className="text-xs text-slate-500 mt-1">Configure and start an evaluation to see past runs here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {historyRuns.map((r) => (
                  <div
                    key={r.id}
                    className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2 py-0.5 rounded">
                          {r.provider.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                          {r.model}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {r.totalQuestions} Questions Tested • {Math.round(r.durationMs / 1000)}s
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-slate-400 uppercase font-semibold">Accuracy</div>
                          <div className="text-2xl font-black text-emerald-400">{r.accuracy}%</div>
                        </div>
                        <div className="text-right text-xs space-y-0.5">
                          <div className="text-emerald-400">{r.correctAnswers} Correct</div>
                          <div className="text-rose-400">{r.incorrectAnswers} Incorrect</div>
                          {r.invalidResponses > 0 && <div className="text-amber-400">{r.invalidResponses} Invalid</div>}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleViewHistoricalRun(r.id)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold text-center transition-colors"
                      >
                        Inspect Details
                      </button>
                      <button
                        onClick={() => window.open(`/api/evaluation/export?runId=${r.id}&format=pdf`, "_blank")}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Download PDF"
                      >
                        <FileText className="w-4 h-4 text-rose-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* ACTIVE EVALUATION LAB TAB                                 */
          /* ======================================================== */
          <div className="space-y-6">
            {/* SECTION A: OVERVIEW METRIC CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* Total Questions */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 relative overflow-hidden">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Questions</div>
                <div className="text-2xl font-black text-white mt-1.5">{activeMetrics.total}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Sample Size</div>
                <div className="absolute top-3 right-3 text-slate-700">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              {/* Questions Attempted */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 relative overflow-hidden">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attempted</div>
                <div className="text-2xl font-black text-cyan-400 mt-1.5">{activeMetrics.attempted}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {Math.round((activeMetrics.attempted / (activeMetrics.total || 1)) * 100)}% complete
                </div>
                <div className="absolute top-3 right-3 text-cyan-900/50">
                  <Play className="w-5 h-5" />
                </div>
              </div>

              {/* Correct Answers */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-emerald-900/40 relative overflow-hidden">
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Correct</div>
                <div className="text-2xl font-black text-emerald-400 mt-1.5">{activeMetrics.correct}</div>
                <div className="text-[11px] text-emerald-500/70 mt-0.5">Verified Hits</div>
                <div className="absolute top-3 right-3 text-emerald-900/40">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              {/* Incorrect Answers */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-rose-900/40 relative overflow-hidden">
                <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Incorrect</div>
                <div className="text-2xl font-black text-rose-400 mt-1.5">{activeMetrics.incorrect}</div>
                <div className="text-[11px] text-rose-500/70 mt-0.5">False Choices</div>
                <div className="absolute top-3 right-3 text-rose-900/40">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>

              {/* Invalid Responses */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-amber-900/40 relative overflow-hidden">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Invalid / Failed</div>
                <div className="text-2xl font-black text-amber-400 mt-1.5">
                  {activeMetrics.invalid} <span className="text-xs text-slate-500 font-normal">/ {activeMetrics.failed} err</span>
                </div>
                <div className="text-[11px] text-amber-500/70 mt-0.5">Malformed / Timeout</div>
                <div className="absolute top-3 right-3 text-amber-900/40">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              {/* Overall Accuracy */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-violet-950/40 border border-cyan-500/30 relative overflow-hidden shadow-lg shadow-cyan-950/20">
                <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Overall Accuracy</div>
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300 mt-1.5">
                  {activeMetrics.accuracy}%
                </div>
                <div className="text-[11px] text-cyan-400/70 mt-0.5">Score on Valid Attempts</div>
                <div className="absolute top-3 right-3 text-cyan-500/40">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* SECTION B: EVALUATION CONTROLS & LIVE PROGRESS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Controls Form */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/50 border border-slate-800/90 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    Evaluation Setup & Model Selection
                  </h3>
                  <span className="text-xs text-slate-400">
                    {datasetMeta ? `${datasetMeta.validQuestions} verified questions available` : "Loading dataset..."}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dataset Corpus Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Benchmark Dataset</label>
                    <select
                      value={selectedDataset}
                      onChange={(e) => setSelectedDataset(e.target.value)}
                      disabled={isRunning}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                    >
                      <option value="sample">456-Question Sample Benchmark (Canonical - Fast)</option>
                      <option value="full">14,042-Question Full Corpus</option>
                    </select>
                  </div>

                  {/* Evaluation Language */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Language</label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      disabled={isRunning}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                    >
                      <option value="hi-IN">Hindi (hi-IN) — Devanagari</option>
                    </select>
                  </div>

                  {/* Provider Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">AI Provider</label>
                    <select
                      value={selectedProvider}
                      onChange={(e) => handleProviderChange(e.target.value)}
                      disabled={isRunning}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                    >
                      <option value="gemini">Google Gemini (Recommended)</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="openai">OpenAI</option>
                      <option value="openrouter">OpenRouter Fleet</option>
                    </select>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      disabled={isRunning}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                    >
                      {modelsForProvider.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.isAvailable ? "✓ (Configured)" : "⚠️ (Missing Key)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Question Count Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Evaluation Sample Size</label>
                    <select
                      value={sampleSize}
                      onChange={(e) => setSampleSize(e.target.value)}
                      disabled={isRunning}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                    >
                      <option value="10">10 Questions (Fast Sanity Check)</option>
                      <option value="25">25 Questions (Default Standard)</option>
                      <option value="50">50 Questions (Comprehensive)</option>
                      <option value="100">100 Questions (Deep Evaluation)</option>
                      <option value="250">250 Questions (Extended Benchmark)</option>
                      <option value="456">456 Questions (Full Sample Benchmark)</option>
                      <option value="all">Full Corpus (All Questions)</option>
                    </select>
                  </div>

                  {/* Subject Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Subject Discipline</label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      disabled={isRunning}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                    >
                      <option value="all">All Subjects (Stratified Sample)</option>
                      {datasetMeta?.subjects?.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name.replace(/_/g, " ")} ({s.count} Qs)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Concurrency slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-300">Parallel Concurrency</label>
                      <span className="text-xs font-mono text-cyan-400">{concurrency} concurrent requests</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={concurrency}
                      onChange={(e) => setConcurrency(Number(e.target.value))}
                      disabled={isRunning}
                      className="w-full accent-cyan-500 bg-slate-950 rounded-lg cursor-pointer disabled:opacity-50"
                    />
                    <p className="text-[11px] text-slate-500">Higher values finish faster; lower values prevent 429 rate limits.</p>
                  </div>

                  {/* Optional Seed */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Reproducibility Seed (Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 42 (Leave empty for random sample)"
                      value={seedInput}
                      onChange={(e) => setSeedInput(e.target.value)}
                      disabled={isRunning}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Execution Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  {!isRunning ? (
                    <button
                      onClick={handleStartEvaluation}
                      className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>Start Benchmark Evaluation</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopEvaluation}
                      className="flex-1 py-3 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Stop Evaluation Run</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Live Progress Card */}
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/90 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      Live Run Diagnostics
                    </h3>
                    {isRunning ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        In Progress
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Idle / Finished</span>
                    )}
                  </div>

                  {/* Progress Meter */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-300">Test Progress</span>
                      <span className="text-cyan-400 font-mono">
                        {progress ? `${progress.percentage}%` : completedSummary ? "100%" : "0%"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progress ? progress.percentage : completedSummary ? 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Live Details Breakdown */}
                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Current Model</span>
                      <span className="font-semibold text-white">{selectedModel}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Evaluated Subject</span>
                      <span className="font-semibold text-slate-300">
                        {progress?.currentSubject?.replace(/_/g, " ") || selectedSubject.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Questions Answered</span>
                      <span className="font-mono text-white">
                        {activeMetrics.attempted} / {activeMetrics.total}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Elapsed Execution Time</span>
                      <span className="font-mono text-slate-300">
                        {progress ? `${Math.round(progress.elapsedMs / 1000)}s` : completedSummary ? `${Math.round(completedSummary.durationMs / 1000)}s` : "0s"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center">
                  <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Computed Accuracy</div>
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 mt-0.5">
                    {activeMetrics.accuracy}%
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION E: PERFORMANCE CHARTS & SUBJECT BREAKDOWN */}
            {(completedSummary || liveResults.length > 0) && (
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/90 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    Subject-Wise Accuracy Breakdown
                  </h3>
                  <span className="text-xs text-slate-400">Performance segmented by academic discipline</span>
                </div>

                {completedSummary && Object.keys(completedSummary.subjectAccuracy).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.values(completedSummary.subjectAccuracy).map((sub) => (
                      <div
                        key={sub.subject}
                        className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white capitalize">{sub.subject.replace(/_/g, " ")}</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {Math.round(sub.accuracy)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.round(sub.accuracy)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>{sub.correct} / {sub.total} correct</span>
                          <span>{sub.incorrect} incorrect</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    Subject breakdown will populate once evaluation finishes.
                  </p>
                )}
              </div>
            )}

            {/* SECTION D: EVALUATION RESULTS TABLE */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/90 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    Evaluated Questions & Model Decision Audit
                  </h3>
                  <p className="text-xs text-slate-400">
                    Showing {filteredResults.length} of {liveResults.length} evaluated questions
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Pills */}
                  <div className="flex rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-xs">
                    {(["all", "correct", "incorrect", "invalid"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                          statusFilter === s ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Search Box */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search question / explanation..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-48 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Table Data */}
              {filteredResults.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">No evaluation records matching current filters.</p>
                  <p className="text-xs text-slate-600 mt-1">Start a benchmark run above to see live results.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4 min-w-[320px]">Question (Hindi)</th>
                        <th className="py-3 px-3 text-center w-24">Expected</th>
                        <th className="py-3 px-3 text-center w-24">AI Answer</th>
                        <th className="py-3 px-4 text-center w-28">Result</th>
                        <th className="py-3 px-3 text-right w-20">Latency</th>
                        <th className="py-3 px-3 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredResults.map((r, idx) => {
                        const isExpanded = expandedRow === r.questionId;
                        return (
                          <React.Fragment key={r.questionId}>
                            <tr
                              onClick={() => setExpandedRow(isExpanded ? null : r.questionId)}
                              className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                            >
                              <td className="py-3 px-4 text-center font-mono text-slate-500">{idx + 1}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 font-medium text-[11px] border border-slate-700/60">
                                  {r.subject.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-200 line-clamp-2 leading-relaxed">
                                {r.question}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                                {r.expectedAnswer}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold">
                                <span
                                  className={
                                    r.isCorrect
                                      ? "text-emerald-400"
                                      : r.status === "invalid_response"
                                      ? "text-amber-400"
                                      : "text-rose-400"
                                  }
                                >
                                  {r.aiAnswer}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {r.isCorrect ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 font-bold border border-emerald-800/60 text-[11px]">
                                    <Check className="w-3 h-3" /> Correct
                                  </span>
                                ) : r.status === "invalid_response" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/60 text-amber-400 font-bold border border-amber-800/60 text-[11px]">
                                    <AlertTriangle className="w-3 h-3" /> Invalid
                                  </span>
                                ) : r.status === "api_error" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-400 font-bold border border-slate-700 text-[11px]">
                                    API Error
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/60 text-rose-400 font-bold border border-rose-800/60 text-[11px]">
                                    <XCircle className="w-3 h-3" /> Incorrect
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-400">{r.latencyMs}ms</td>
                              <td className="py-3 px-3 text-center text-slate-500">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </td>
                            </tr>

                            {/* Expanded Question Details Drawer */}
                            {isExpanded && (
                              <tr className="bg-slate-950/90 border-y border-cyan-900/40">
                                <td colSpan={8} className="p-5 space-y-4">
                                  <div className="space-y-2">
                                    <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                                      Full Hindi Question
                                    </div>
                                    <p className="text-sm text-slate-100 font-medium leading-relaxed bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                                      {r.question}
                                    </p>
                                  </div>

                                  {/* All Options */}
                                  <div className="space-y-1.5">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                      Multiple-Choice Options
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                      {(["A", "B", "C", "D"] as const).map((optKey) => {
                                        const isExpected = r.expectedAnswer === optKey;
                                        const isAiChoice = r.aiAnswer === optKey;
                                        return (
                                          <div
                                            key={optKey}
                                            className={`p-2.5 rounded-xl border transition-colors flex items-start gap-2 ${
                                              isExpected
                                                ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-semibold"
                                                : isAiChoice && !r.isCorrect
                                                ? "bg-rose-950/40 border-rose-500/50 text-rose-200"
                                                : "bg-slate-900/60 border-slate-800 text-slate-300"
                                            }`}
                                          >
                                            <span
                                              className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${
                                                isExpected
                                                  ? "bg-emerald-500 text-slate-950"
                                                  : isAiChoice && !r.isCorrect
                                                  ? "bg-rose-500 text-white"
                                                  : "bg-slate-800 text-slate-400"
                                              }`}
                                            >
                                              {optKey}
                                            </span>
                                            <span className="flex-1 leading-relaxed">{r.options[optKey]}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Model Explanation */}
                                  {r.explanation && (
                                    <div className="space-y-1">
                                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Model Explanation
                                      </div>
                                      <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                                        {r.explanation}
                                      </p>
                                    </div>
                                  )}

                                  {/* Raw response */}
                                  {r.rawResponse && (
                                    <div className="space-y-1">
                                      <div className="text-[11px] font-mono text-slate-500 uppercase">Raw Output</div>
                                      <pre className="text-[11px] font-mono text-slate-400 bg-black/60 p-2.5 rounded border border-slate-800/80 overflow-x-auto whitespace-pre-wrap">
                                        {r.rawResponse}
                                      </pre>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
