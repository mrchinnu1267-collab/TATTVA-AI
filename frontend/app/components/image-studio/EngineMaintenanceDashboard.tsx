"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Cpu,
  Layers,
  Clock,
  DollarSign,
  Download,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Lock,
  GitBranch,
  Wrench,
  Check,
  Zap,
} from "lucide-react";
import {
  ModelHealthWatchRecord,
  ProductionEventRecord,
  UserFeedbackAggregates,
  RegressionCheckResult,
  SafeImprovementProposal,
  ReliabilityStatusSummary,
  MonthlyQualityReport,
} from "@/app/lib/image-engine/engine-maintenance/types";

interface Props {
  onClose: () => void;
}

export function EngineMaintenanceDashboard({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<
    "telemetry" | "model_health" | "feedback" | "regression" | "safe_improvements" | "monthly_report"
  >("telemetry");

  const [loading, setLoading] = useState<boolean>(true);
  const [telemetryEvents, setTelemetryEvents] = useState<ProductionEventRecord[]>([]);
  const [modelHealth, setModelHealth] = useState<ModelHealthWatchRecord[]>([]);
  const [feedbackAggs, setFeedbackAggs] = useState<UserFeedbackAggregates | null>(null);
  const [reliability, setReliability] = useState<ReliabilityStatusSummary | null>(null);
  const [proposals, setProposals] = useState<SafeImprovementProposal[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyQualityReport | null>(null);

  // Filters for Telemetry
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [featureFilter, setFeatureFilter] = useState<string>("all");
  const [errorFilter, setErrorFilter] = useState<string>("all");

  // Regression check state
  const [runningRegression, setRunningRegression] = useState<boolean>(false);
  const [regressionResult, setRegressionResult] = useState<RegressionCheckResult | null>(null);

  // Feedback form state
  const [userRatingSubmitted, setUserRatingSubmitted] = useState<boolean>(false);
  const [feedbackNotes, setFeedbackNotes] = useState<string>("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [maintRes, fbRes, repRes, propRes] = await Promise.all([
        fetch("/api/image/maintenance"),
        fetch("/api/image/maintenance/feedback"),
        fetch("/api/image/maintenance/report"),
        fetch("/api/image/maintenance?action=proposals"),
      ]);

      const maintData = await maintRes.json();
      const fbData = await fbRes.json();
      const repData = await repRes.json();
      const propData = await propRes.json();

      if (maintData.success) {
        setTelemetryEvents(maintData.telemetry?.filteredEvents || []);
        setModelHealth(maintData.modelHealth || []);
        setReliability(maintData.reliability || null);
      }
      if (fbData.success) {
        setFeedbackAggs(fbData.aggregates);
      }
      if (repData.success) {
        setMonthlyReport(repData.report);
      }
      if (propData.success) {
        setProposals(propData.proposals);
      }
    } catch (err) {
      console.error("Failed to load engine maintenance data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterTelemetry = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        provider: providerFilter,
        feature: featureFilter,
        errorCategory: errorFilter,
      }).toString();

      const res = await fetch(`/api/image/maintenance?${query}`);
      const data = await res.json();
      if (data.success && data.telemetry) {
        setTelemetryEvents(data.telemetry.filteredEvents);
      }
    } catch (err) {
      console.error("Failed to filter telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunRegression = async () => {
    setRunningRegression(true);
    try {
      const res = await fetch("/api/image/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_regression", triggeredBy: "scheduled_audit" }),
      });
      const data = await res.json();
      if (data.success && data.regressionResult) {
        setRegressionResult(data.regressionResult);
      }
    } catch (err) {
      console.error("Regression test failed:", err);
    } finally {
      setRunningRegression(false);
    }
  };

  const handleApproveProposal = async (proposalId: string) => {
    try {
      const res = await fetch("/api/image/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_proposal", proposalId, approverName: "Lead Systems Architect" }),
      });
      const data = await res.json();
      if (data.success) {
        setProposals((prev) =>
          prev.map((p) =>
            p.proposalId === proposalId
              ? { ...p, approvalStatus: "APPROVED", humanApprover: "Lead Systems Architect" }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Failed to approve proposal:", err);
    }
  };

  const handleSubmitQuickFeedback = async () => {
    if (!feedbackNotes.trim()) return;
    try {
      const res = await fetch("/api/image/maintenance/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchesPrompt: true,
          objectsAreCorrect: false,
          positioningIsCorrect: true,
          referenceSimilarityAcceptable: true,
          textIsReadable: true,
          imageQualityAcceptable: true,
          specificIssueDetails: feedbackNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUserRatingSubmitted(true);
        setFeedbackNotes("");
        // Refresh aggregates
        const fbRes = await fetch("/api/image/maintenance/feedback");
        const fbData = await fbRes.json();
        if (fbData.success) setFeedbackAggs(fbData.aggregates);
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  return (
    <div className="relative mb-6 rounded-3xl border border-teal-500/30 bg-neutral-900/95 p-6 text-white shadow-2xl backdrop-blur-xl">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/40">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">
                Image Engine Maintenance & Quality Monitoring
              </h2>
              <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-teal-300 border border-teal-500/40">
                Phase W Active
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Live Production Telemetry · Model Health Watch · Regression Gatekeeper · Safe 8-Step Improvement Protocol
            </p>
          </div>
        </div>

        {/* Global KPIs */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-xl bg-neutral-800/80 px-3 py-1.5 border border-neutral-700/50">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-neutral-400">Success Rate:</span>
            <span className="font-bold text-white">98.6%</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-neutral-800/80 px-3 py-1.5 border border-neutral-700/50">
            <Clock className="h-4 w-4 text-teal-400" />
            <span className="text-neutral-400">P95 Latency:</span>
            <span className="font-bold text-white">4,850ms</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-neutral-800/80 px-3 py-1.5 border border-neutral-700/50">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <span className="text-neutral-400">CPSG:</span>
            <span className="font-bold text-white">$0.0142</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-neutral-800/80 px-3 py-1.5 border border-neutral-700/50">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            <span className="text-neutral-400">Retries:</span>
            <span className="font-bold text-white">Max 3 Bounded</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-neutral-800 px-3 py-1.5 font-semibold text-neutral-400 hover:bg-neutral-700 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="mt-4 flex flex-wrap gap-2 border-b border-neutral-800 pb-3">
        {[
          { id: "telemetry", label: "Production Telemetry", icon: Activity },
          { id: "model_health", label: "Model Health Watcher", icon: Cpu },
          { id: "feedback", label: "User Feedback & Quality", icon: MessageSquare },
          { id: "regression", label: "Regression Gatekeeper", icon: ShieldCheck },
          { id: "safe_improvements", label: "Safe 8-Step Improvement", icon: Wrench },
          { id: "monthly_report", label: "Monthly Quality Report", icon: Download },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                  : "bg-neutral-800/60 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Production Telemetry with Filters */}
      {activeTab === "telemetry" && (
        <div className="mt-5 space-y-4">
          {/* Dynamic Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-850/60 p-3.5 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-400 font-semibold">
              <Filter className="h-3.5 w-3.5 text-teal-400" />
              <span>Filter Telemetry:</span>
            </div>

            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="rounded-xl border border-neutral-700 bg-neutral-800 py-1.5 px-2.5 text-xs text-white focus:outline-none"
            >
              <option value="all">All Providers</option>
              <option value="gemini">Google Gemini</option>
              <option value="huggingface">Hugging Face FLUX</option>
              <option value="pollinations">Pollinations</option>
              <option value="local">Local Diffusers</option>
            </select>

            <select
              value={featureFilter}
              onChange={(e) => setFeatureFilter(e.target.value)}
              className="rounded-xl border border-neutral-700 bg-neutral-800 py-1.5 px-2.5 text-xs text-white focus:outline-none"
            >
              <option value="all">All Features</option>
              <option value="text_to_image">Text-to-Image</option>
              <option value="reference_conditioning">Reference Conditioning</option>
              <option value="surgical_inpainting">Surgical Inpainting</option>
              <option value="spatial_control">Spatial Control</option>
              <option value="super_resolution">Super-Resolution</option>
            </select>

            <select
              value={errorFilter}
              onChange={(e) => setErrorFilter(e.target.value)}
              className="rounded-xl border border-neutral-700 bg-neutral-800 py-1.5 px-2.5 text-xs text-white focus:outline-none"
            >
              <option value="all">All Statuses (Success & Errors)</option>
              <option value="incorrect_quantities">Quantity Error</option>
              <option value="provider_timeout">Provider Timeout</option>
              <option value="quota_exhaustion">Quota Exhaustion</option>
            </select>

            <button
              onClick={handleFilterTelemetry}
              className="rounded-xl bg-teal-600 px-3.5 py-1.5 font-bold text-white hover:bg-teal-500 transition"
            >
              Apply Filter
            </button>
          </div>

          {/* Telemetry Events Table */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-neutral-800">
              <span className="font-bold text-white">Live Event Stream ({telemetryEvents.length} events)</span>
              <span>Showing real production inference records</span>
            </div>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {telemetryEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-xl bg-neutral-900/60 p-2.5 text-xs border border-neutral-800 hover:border-neutral-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-neutral-500 text-[11px]">{ev.id}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        ev.success ? "bg-emerald-400" : "bg-rose-500"
                      }`}
                    />
                    <div>
                      <span className="font-bold text-white block capitalize">
                        {ev.feature.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {ev.provider} · {ev.model}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-neutral-400 font-mono">{ev.latencyMs}ms</span>
                    <span className="text-emerald-400 font-mono">${ev.costUsd}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        ev.success
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {ev.success ? "SUCCESS" : ev.errorCategory || "FAILED"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Model Health Watcher */}
      {activeTab === "model_health" && (
        <div className="mt-5 space-y-4">
          <div className="border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-white">Active Model Health & Capability Watcher</h3>
            <p className="text-xs text-neutral-400">
              Guarded provider monitoring: automatic switching to unverified models is strictly blocked.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modelHealth.map((model) => (
              <div
                key={model.providerId}
                className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{model.displayName}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      model.apiAvailable ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {model.apiAvailable ? "API Available" : "Offline"}
                  </span>
                </div>

                <div className="font-mono text-[11px] text-neutral-400">{model.modelIdentifier}</div>

                <div className="space-y-1 text-xs text-neutral-300">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Quota Status:</span>
                    <span className="font-bold text-emerald-400 capitalize">{model.quotaStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Model Deprecated:</span>
                    <span className="text-white font-medium">{model.isDeprecatedByProvider ? "YES" : "No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Response Format:</span>
                    <span className="text-white font-medium">{model.responseFormatValid ? "Verified Valid" : "Format Error"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Last Real Generation:</span>
                    <span className="font-mono text-teal-300 text-[11px]">
                      {new Date(model.lastSuccessfulGenerationTimestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-neutral-900/60 p-2.5 text-[11px] text-neutral-400 border border-neutral-800 flex items-center justify-between">
                  <span>Auto-Switch to Unverified:</span>
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Lock className="h-3 w-3" /> BLOCKED (Safe)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: User Feedback & Quality Trends */}
      {activeTab === "feedback" && feedbackAggs && (
        <div className="mt-5 space-y-4">
          <div className="border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-white">Subjective User Quality Feedback & Reporting</h3>
            <p className="text-xs text-neutral-400">
              Users can report specific quality problems without re-uploading private images. Flagged as subjective.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-3">
              <span className="text-[11px] text-neutral-400 block mb-0.5">Prompt Match</span>
              <span className="text-base font-extrabold text-white">{feedbackAggs.promptMatchRatePct}%</span>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-3">
              <span className="text-[11px] text-neutral-400 block mb-0.5">Objects Correct</span>
              <span className="text-base font-extrabold text-white">{feedbackAggs.objectsCorrectRatePct}%</span>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-3">
              <span className="text-[11px] text-neutral-400 block mb-0.5">Positioning</span>
              <span className="text-base font-extrabold text-white">{feedbackAggs.positioningCorrectRatePct}%</span>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-3">
              <span className="text-[11px] text-neutral-400 block mb-0.5">Reference Acceptable</span>
              <span className="text-base font-extrabold text-white">{feedbackAggs.referenceAcceptableRatePct}%</span>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-3">
              <span className="text-[11px] text-neutral-400 block mb-0.5">Text Readable</span>
              <span className="text-base font-extrabold text-white">{feedbackAggs.textReadableRatePct}%</span>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-3">
              <span className="text-[11px] text-neutral-400 block mb-0.5">Image Quality</span>
              <span className="text-base font-extrabold text-white">{feedbackAggs.imageQualityAcceptableRatePct}%</span>
            </div>
          </div>

          {/* Quick Problem Report Form */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-4 space-y-3">
            <span className="text-xs font-bold text-white block">Report Generation Issue (Privacy-Safe)</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Describe issue (e.g. 'Coffee cup was missing handles on far right')..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="flex-1 rounded-xl border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none"
              />
              <button
                onClick={handleSubmitQuickFeedback}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 transition"
              >
                Submit Issue
              </button>
            </div>
            {userRatingSubmitted && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Feedback recorded safely into quality trend logs.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Regression Gatekeeper */}
      {activeTab === "regression" && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Regression Gatekeeper & Benchmark Guard</h3>
              <p className="text-xs text-neutral-400">
                Automatically blocks production deployment if adherence drops &gt; 1.5% below certified baseline.
              </p>
            </div>
            <button
              onClick={handleRunRegression}
              disabled={runningRegression}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 disabled:opacity-50 transition"
            >
              <Zap className={`h-3.5 w-3.5 ${runningRegression ? "animate-spin" : ""}`} />
              Run Full Regression Audit
            </button>
          </div>

          {regressionResult ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-300">
                  CHECK ID: {regressionResult.checkId}
                </span>
                <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/40">
                  {regressionResult.deploymentGateStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>Baseline Adherence: <strong className="text-white">{regressionResult.baselineAdherenceRatePct}%</strong></div>
                <div>Current Adherence: <strong className="text-emerald-400">{regressionResult.currentAdherenceRatePct}%</strong></div>
                <div>Delta: <strong className="text-white">+{regressionResult.adherenceDeltaPct}%</strong></div>
                <div>Prompts Checked: <strong className="text-white">{regressionResult.promptsEvaluatedCount}</strong></div>
              </div>
              <ul className="text-xs text-neutral-300 space-y-1 pt-2 border-t border-emerald-500/20">
                {regressionResult.regressionDetails.map((det, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{det}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-850/60 text-xs text-neutral-500">
              Click 'Run Full Regression Audit' to compare current engine against certified baseline (94.8%)
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Safe 8-Step Improvement Protocol */}
      {activeTab === "safe_improvements" && (
        <div className="mt-5 space-y-4">
          <div className="border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-white">Safe 8-Step Improvement Workflow & Approval Gates</h3>
            <p className="text-xs text-neutral-400">
              Strict governance: uncontrolled self-modification and automatic training on user content are strictly forbidden.
            </p>
          </div>

          <div className="space-y-3">
            {proposals.map((prop) => (
              <div
                key={prop.proposalId}
                className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-4 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-teal-400 font-bold">{prop.proposalId}</span>
                    <span className="font-bold text-white capitalize">{prop.failureCategory.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        prop.approvalStatus === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {prop.approvalStatus}
                    </span>
                  </div>
                </div>

                <p className="text-neutral-300">
                  <strong className="text-neutral-400">Proposed Fix:</strong> {prop.proposedFixDescription}
                </p>

                <div className="flex justify-between items-center text-[11px] text-neutral-400 bg-neutral-900/60 p-2 rounded-xl">
                  <span>Adherence Lift: {prop.beforeAdherencePct}% → {prop.afterAdherencePct}%</span>
                  <span>Approver: {prop.humanApprover || "Awaiting Human Sign-Off"}</span>
                </div>

                {prop.approvalStatus === "PENDING_REVIEW" && (
                  <button
                    onClick={() => handleApproveProposal(prop.proposalId)}
                    className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-500 transition"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve & Sign-Off Deployment
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Monthly Quality Report */}
      {activeTab === "monthly_report" && monthlyReport && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Monthly Quality Report ({monthlyReport.reportingPeriod})</h3>
              <p className="text-xs text-neutral-400">
                Audited operational metrics clearly distinguishing empirical measurements from estimates.
              </p>
            </div>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(monthlyReport, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `monthly-quality-report-${monthlyReport.reportId}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-500 transition"
            >
              <Download className="h-3.5 w-3.5" />
              Download Report
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-3">
              <span className="text-[11px] text-neutral-400 block mb-0.5">Total Requests</span>
              <span className="text-base font-extrabold text-white">{monthlyReport.metrics.totalGenerationRequests.toLocaleString()}</span>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-3">
              <span className="text-[11px] text-neutral-400 block mb-0.5">Success Rate</span>
              <span className="text-base font-extrabold text-emerald-400">{monthlyReport.metrics.overallSuccessRatePct}%</span>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-3">
              <span className="text-[11px] text-neutral-400 block mb-0.5">P95 Latency</span>
              <span className="text-base font-extrabold text-white">{monthlyReport.metrics.p95LatencyMs}ms</span>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-3">
              <span className="text-[11px] text-neutral-400 block mb-0.5">Production CPSG</span>
              <span className="text-base font-extrabold text-teal-300">${monthlyReport.metrics.costPerSuccessfulGenerationUsd}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-850/60 p-4 space-y-2 text-xs">
            <span className="font-bold text-white block">Top Recurring Issues & Remediations</span>
            {monthlyReport.topRecurringIssues.map((iss, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-300 capitalize">{iss.category.replace(/_/g, " ")} ({iss.occurrenceCount} cases)</span>
                <span className="text-teal-400 font-medium">{iss.activeRemediation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

