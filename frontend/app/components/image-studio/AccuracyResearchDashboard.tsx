"use client";

import { useEffect, useState } from "react";
import {
  FlaskConical,
  GitFork,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Sliders,
  DollarSign,
  Clock,
  ShieldCheck,
  Eye,
  Camera,
  Sun,
  X,
  Play,
} from "lucide-react";
import type {
  SceneGraph,
  Benchmark200ComparisonReport,
  VRAMAllocationSpec,
  MultiStagePipelineResult,
} from "../../lib/image-engine/accuracy-research/types";

export function AccuracyResearchDashboard({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState<"scenegraph" | "benchmark" | "multistage" | "hardware">("benchmark");
  const [promptInput, setPromptInput] = useState("A red vintage sports car parked to the left of a blue Victorian house with two pine trees behind it");
  const [sceneGraph, setSceneGraph] = useState<SceneGraph | null>(null);
  const [benchmarkReport, setBenchmarkReport] = useState<Benchmark200ComparisonReport | null>(null);
  const [vramSpec, setVramSpec] = useState<VRAMAllocationSpec | null>(null);
  const [multiStageResult, setMultiStageResult] = useState<MultiStagePipelineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingGraph, setGeneratingGraph] = useState(false);
  const [executingPipeline, setExecutingPipeline] = useState(false);

  useEffect(() => {
    fetchResearchData();
  }, []);

  const fetchResearchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/image/research");
      const json = await res.json();
      if (json.success) {
        setBenchmarkReport(json.benchmarkSummary);
        setVramSpec(json.hardwareSafety);
      }
    } catch (err) {
      console.error("Failed to load research data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSceneGraph = async () => {
    try {
      setGeneratingGraph(true);
      const res = await fetch("/api/image/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scene_graph", prompt: promptInput }),
      });
      const json = await res.json();
      if (json.success) {
        setSceneGraph(json.graph);
      }
    } catch (err) {
      console.error("Failed to generate scene graph", err);
    } finally {
      setGeneratingGraph(false);
    }
  };

  const handleExecuteMultiStage = async () => {
    try {
      setExecutingPipeline(true);
      const res = await fetch("/api/image/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "multi_stage_pipeline", prompt: promptInput }),
      });
      const json = await res.json();
      if (json.success) {
        setMultiStageResult(json.result);
      }
    } catch (err) {
      console.error("Failed to execute multi-stage pipeline", err);
    } finally {
      setExecutingPipeline(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl backdrop-blur-md">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Advanced Accuracy Research & Next-Gen Techniques</h2>
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 border border-purple-500/20">
                PHASE R EXPERIMENTAL
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Controlled research environment investigating Scene Graphs, Multi-Stage Pipelines, Spatial Conditioning, and VRAM Optimization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchResearchData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Research Data
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3 mb-6 text-xs font-semibold">
        {[
          { id: "benchmark", label: "200-Prompt 5-Pipeline Benchmark", icon: TrendingUp },
          { id: "scenegraph", label: "Scene Graph Parser", icon: GitFork },
          { id: "multistage", label: "9-Stage Pipeline Lab", icon: Layers },
          { id: "hardware", label: "RTX 3050 VRAM Safety", icon: Cpu },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all ${
                isActive
                  ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-bold"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: 200-PROMPT 5-PIPELINE COMPARISON */}
      {activeTab === "benchmark" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Controlled 200-Prompt Comparative Architecture Matrix</h3>
              <p className="text-xs text-neutral-500">
                Empirical evaluation comparing baseline unassisted generation against experimental scene graph and multi-stage pipelines.
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500 border border-emerald-500/20">
              Top Lift: +{benchmarkReport?.accuracyLiftOverBaseline}% Over Baseline
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-neutral-400 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Architecture</th>
                  <th className="py-2.5 px-3 text-right">Adherence</th>
                  <th className="py-2.5 px-3 text-right">Object Count</th>
                  <th className="py-2.5 px-3 text-right">Spatial</th>
                  <th className="py-2.5 px-3 text-right">Text</th>
                  <th className="py-2.5 px-3 text-right">Reference</th>
                  <th className="py-2.5 px-3 text-right">Latency</th>
                  <th className="py-2.5 px-3 text-right">CPSG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {benchmarkReport?.architectures.map((arch) => (
                  <tr
                    key={arch.architectureType}
                    className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors ${
                      arch.architectureType === benchmarkReport.topPerformingArchitecture
                        ? "bg-purple-500/5 font-semibold"
                        : ""
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold flex items-center gap-1.5">
                        {arch.architectureType === benchmarkReport.topPerformingArchitecture && (
                          <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                        )}
                        {arch.architectureName}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-500">
                      {arch.overallAdherenceScore}%
                    </td>
                    <td className="py-3 px-3 text-right">{arch.objectCountAccuracy}%</td>
                    <td className="py-3 px-3 text-right">{arch.spatialAccuracy}%</td>
                    <td className="py-3 px-3 text-right">{arch.textAccuracy}%</td>
                    <td className="py-3 px-3 text-right">{arch.referenceFidelity}%</td>
                    <td className="py-3 px-3 text-right text-neutral-500">{arch.averageLatencyMs} ms</td>
                    <td className="py-3 px-3 text-right text-neutral-500">${arch.averageCostUsd.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SCENE GRAPH PARSER */}
      {activeTab === "scenegraph" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <label className="text-xs font-bold block mb-2">Prompt Instruction Input</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleGenerateSceneGraph}
                disabled={generatingGraph}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-semibold text-white transition-all shadow-md"
              >
                <GitFork className={`h-3.5 w-3.5 ${generatingGraph ? "animate-spin" : ""}`} />
                Generate Scene Graph
              </button>
            </div>
          </div>

          {sceneGraph && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-500 mb-3">
                  Entities & Attributes ({sceneGraph.nodes.length} Nodes)
                </h4>
                <div className="space-y-2.5">
                  {sceneGraph.nodes.map((node) => (
                    <div key={node.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">
                          {node.name} (Qty: {node.quantity})
                        </span>
                        <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 text-[9px] uppercase font-mono">
                          {node.layerDepth}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {node.attributes.map((attr, idx) => (
                          <span
                            key={idx}
                            className="rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 text-[10px] font-medium"
                          >
                            {attr.category}: {attr.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-500 mb-3">
                  Spatial & Semantic Edges ({sceneGraph.edges.length} Relationships)
                </h4>
                <div className="space-y-2">
                  {sceneGraph.edges.length === 0 ? (
                    <div className="text-xs text-neutral-400">No complex spatial edges detected.</div>
                  ) : (
                    sceneGraph.edges.map((edge) => (
                      <div
                        key={edge.id}
                        className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-purple-500">{edge.sourceNodeId}</span>
                          <span className="font-bold uppercase text-[10px] bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded">
                            {edge.relationship}
                          </span>
                          <span className="font-mono text-cyan-500">{edge.targetNodeId}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400">
                          Confidence: {Math.round(edge.confidence * 100)}%
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs text-neutral-500 space-y-1">
                  <div>
                    <strong>Camera:</strong> {sceneGraph.cameraSettings.angle} ({sceneGraph.cameraSettings.lens})
                  </div>
                  <div>
                    <strong>Lighting:</strong> {sceneGraph.lightingPlan.primaryLight}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 9-STAGE MULTI-STAGE PIPELINE LAB */}
      {activeTab === "multistage" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <div>
              <h4 className="text-sm font-bold">Execute Full 9-Stage Research Pipeline</h4>
              <p className="text-xs text-neutral-500">
                Measures latency, cost, and adherence lift at each progressive stage of image formation.
              </p>
            </div>
            <button
              onClick={handleExecuteMultiStage}
              disabled={executingPipeline}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-semibold text-white transition-all shadow-md"
            >
              <Play className={`h-3.5 w-3.5 ${executingPipeline ? "animate-spin" : ""}`} />
              Run 9-Stage Pipeline
            </button>
          </div>

          {multiStageResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <div className="text-[11px] text-neutral-500">Pre-Correction Score</div>
                  <div className="text-lg font-bold mt-0.5">{multiStageResult.preCorrectionAccuracy}%</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <div className="text-[11px] text-neutral-500">Final Post-Correction</div>
                  <div className="text-lg font-bold text-emerald-500 mt-0.5">
                    {multiStageResult.postCorrectionAccuracy}%
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <div className="text-[11px] text-neutral-500">Total Duration</div>
                  <div className="text-lg font-bold mt-0.5">
                    {(multiStageResult.totalLatencyMs / 1000).toFixed(2)}s
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <div className="text-[11px] text-neutral-500">Total Compute Cost</div>
                  <div className="text-lg font-bold text-purple-500 mt-0.5">
                    ${multiStageResult.totalCostUsd.toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                  Stage-by-Stage Latency & Gain Breakdown
                </h4>
                <div className="space-y-2">
                  {multiStageResult.stageMetrics.map((stage) => (
                    <div
                      key={stage.stage}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="font-semibold capitalize">{stage.stage.replace(/_/g, " ")}</span>
                        <span className="text-[10px] text-neutral-400">({stage.notes})</span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        {stage.accuracyGainPercent > 0 && (
                          <span className="text-[10px] font-bold text-emerald-500">
                            +{stage.accuracyGainPercent}%
                          </span>
                        )}
                        <span className="text-neutral-500">{stage.durationMs} ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HARDWARE & VRAM SAFETY */}
      {activeTab === "hardware" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-500" />
              NVIDIA RTX 3050 Laptop (4GB VRAM) Memory Guardrails
            </h4>
            <p className="text-xs text-neutral-500 mb-4">
              Hardware allocation safeguards ensuring local execution stays safely under the 3.6 GB ceiling. Oversized models are transparently routed to Cloud Serverless.
            </p>

            {vramSpec && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-3">
                  <span className="text-neutral-500 text-[10px]">Model Evaluated</span>
                  <div className="font-bold text-sm mt-0.5">{vramSpec.modelName}</div>
                  <div className="text-[10px] text-neutral-400 uppercase mt-1">Arch: {vramSpec.architectureFamily}</div>
                </div>

                <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-3">
                  <span className="text-neutral-500 text-[10px]">Precision & Memory</span>
                  <div className="font-bold text-sm mt-0.5">
                    {(vramSpec.estimatedVRAMBytes / (1024 * 1024 * 1024)).toFixed(2)} GB VRAM
                  </div>
                  <div className="text-[10px] text-neutral-400 uppercase mt-1">Format: {vramSpec.precision}</div>
                </div>

                <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-3">
                  <span className="text-neutral-500 text-[10px]">Safe Execution Mode</span>
                  <div className="font-bold text-sm text-emerald-500 mt-0.5">
                    {vramSpec.recommendedExecutionMode}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1">
                    {vramSpec.safeForRTX3050_4GB ? "Local CUDA Safe" : "Cloud Accelerated"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

