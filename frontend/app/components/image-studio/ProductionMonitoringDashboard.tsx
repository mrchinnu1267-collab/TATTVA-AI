"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Cpu,
  DollarSign,
  Clock,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Server,
  Zap,
  Check,
  X,
  Sliders,
  ChevronRight,
  Database,
} from "lucide-react";
import type { ProductionMonitoringDashboardData } from "../../lib/image-engine/production-monitoring/types";

export function ProductionMonitoringDashboard({ onClose }: { onClose?: () => void }) {
  const [data, setData] = useState<ProductionMonitoringDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "accuracy" | "providers" | "failures" | "performance" | "alerts" | "improvement"
  >("overview");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/image/monitoring");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch production monitoring data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch("/api/image/monitoring/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, action: "acknowledge", acknowledgedBy: "lead_admin" }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(`Alert ${alertId} acknowledged.`);
        fetchMonitoringData();
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      console.error("Failed to acknowledge alert", err);
    }
  };

  const reviewImprovement = async (recommendationId: string, action: "approve" | "reject") => {
    try {
      const res = await fetch("/api/image/monitoring/improvement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId, action, reviewerName: "lead_admin" }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(`Recommendation ${recommendationId} ${action}d successfully.`);
        fetchMonitoringData();
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      console.error("Failed to review improvement", err);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-neutral-400">
        <RefreshCw className="h-8 w-8 animate-spin text-cyan-500 mb-3" />
        <p className="text-sm">Connecting to live Production Monitoring Hub...</p>
      </div>
    );
  }

  const sys = data?.systemOverview;
  const perf = data?.performanceTelemetry;
  const costs = data?.costTelemetry;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl backdrop-blur-md">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Production Monitoring & Accuracy Intelligence</h2>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                PHASE Q LIVE
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Observability engine tracking accuracy, multi-provider health, failure modes, latency quantiles, and spending guardrails.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMonitoringData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Telemetry
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

      {actionMessage && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {actionMessage}
        </div>
      )}

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
          <div className="text-[11px] font-medium text-neutral-500">Overall Accuracy</div>
          <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
            {data?.accuracyOverview.overallPassRate}%
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            {data?.accuracyOverview.verifiedGenerationsCount} verified samples
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
          <div className="text-[11px] font-medium text-neutral-500">Providers Online</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {sys?.providersOnlineCount} / {sys?.totalProvidersCount}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">All fallback tiers active</div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
          <div className="text-[11px] font-medium text-neutral-500">Median Latency</div>
          <div className="text-xl font-bold mt-1">
            {(perf?.generationLatency.medianMs || 2400) / 1000}s
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            P95: {(perf?.generationLatency.p95Ms || 4200) / 1000}s
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
          <div className="text-[11px] font-medium text-neutral-500">Cost per Success (CPSG)</div>
          <div className="text-xl font-bold text-emerald-500 mt-1">
            ${costs?.costPerSuccessfulGenerationUsd.toFixed(4)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Blended provider rate</div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
          <div className="text-[11px] font-medium text-neutral-500">Daily Spend</div>
          <div className="text-xl font-bold mt-1">
            ${costs?.currentDailySpendUsd.toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            Limit: ${costs?.dailySpendLimitUsd.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
          <div className="text-[11px] font-medium text-neutral-500">Active Alerts</div>
          <div className="text-xl font-bold text-amber-500 mt-1">
            {data?.activeAlerts.filter((a) => !a.acknowledged).length || 0}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Deduplicated & dampened</div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3 mb-6 text-xs font-semibold">
        {[
          { id: "overview", label: "System Overview", icon: Activity },
          { id: "accuracy", label: "Accuracy Dimensions", icon: ShieldCheck },
          { id: "providers", label: "Provider Health", icon: Server },
          { id: "failures", label: "Failure Analysis", icon: AlertTriangle },
          { id: "performance", label: "Latency & Costs", icon: Clock },
          { id: "alerts", label: "Intelligent Alerts", icon: ShieldAlert },
          { id: "improvement", label: "Continuous Improvement", icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all ${
                isActive
                  ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 font-bold"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-500" />
                7-Day Prompt Adherence Trend
              </h3>
              <div className="space-y-2">
                {data?.historicalTrends.dailyAccuracy.map((day) => (
                  <div key={day.date} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">{day.date}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${day.accuracy}%` }}
                        />
                      </div>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 w-12 text-right">
                        {day.accuracy}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-emerald-500" />
                Foundation Model Performance Rankings
              </h3>
              <div className="space-y-2.5">
                {data?.modelPerformance.rankings.map((model) => (
                  <div key={model.modelId} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 text-[10px] font-bold">
                        #{model.rank}
                      </span>
                      <span className="font-semibold">{model.modelId}</span>
                      <span className="text-[10px] text-neutral-500 uppercase">({model.provider})</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="font-bold text-emerald-500">{model.overallScore}%</div>
                        <div className="text-[9px] text-neutral-400">{model.sampleCount} samples</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. ACCURACY DIMENSIONS */}
      {activeTab === "accuracy" && (
        <div className="space-y-4">
          <div className="text-xs text-neutral-500 mb-2">
            Independent evaluation breakdown across all 9 primary accuracy dimensions. Sample counts represent grounded evaluations.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data?.accuracyOverview.dimensions.map((dim) => (
              <div key={dim.dimension} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold">{dim.label}</span>
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{dim.score}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden mb-3">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${dim.score}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-neutral-500">
                  <span>Method: {dim.evaluationMethod}</span>
                  <span>{dim.sampleCount} verified</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. PROVIDER HEALTH */}
      {activeTab === "providers" && (
        <div className="space-y-3">
          {data?.providerHealth.map((p) => (
            <div key={p.providerId} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      p.status === "healthy"
                        ? "bg-emerald-500"
                        : p.status === "degraded"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                  />
                  <h4 className="text-sm font-bold">{p.name}</h4>
                  <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-mono">
                    Breaker: {p.circuitBreakerState}
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-500">{p.successRate}% Success Rate</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="rounded-lg bg-[var(--card)] p-2">
                  <span className="text-neutral-500 text-[10px]">Response Time</span>
                  <div className="font-bold">{p.responseTimeMs} ms</div>
                </div>
                <div className="rounded-lg bg-[var(--card)] p-2">
                  <span className="text-neutral-500 text-[10px]">Requests</span>
                  <div className="font-bold">{p.totalRequests} ({p.failedRequests} errs)</div>
                </div>
                <div className="rounded-lg bg-[var(--card)] p-2">
                  <span className="text-neutral-500 text-[10px]">Remaining Quota</span>
                  <div className="font-bold">{p.quotaRemainingPercent}%</div>
                </div>
                <div className="rounded-lg bg-[var(--card)] p-2">
                  <span className="text-neutral-500 text-[10px]">Inference Availability</span>
                  <div className="font-bold text-emerald-500">
                    {p.isAvailableForInference ? "Online & Ready" : "Excluded / Cooldown"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: 4. FAILURES */}
      {activeTab === "failures" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              12-Category Failure Distribution
            </h3>
            <div className="space-y-2">
              {data?.failureAnalysis.distribution.map((fail) => (
                <div key={fail.category} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[10px] text-amber-500 block">
                      {fail.category.replace("_", " ")}
                    </span>
                    <span className="text-[11px] text-neutral-400">{fail.primaryCause}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm">{fail.count}</span>
                    <span className="text-[10px] text-neutral-500 block">({fail.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 5. PERFORMANCE & COSTS */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-500" />
                Generation Latency Quantiles
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-neutral-500">Mean Latency:</span>
                  <span className="font-bold">{perf?.generationLatency.meanMs} ms</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-neutral-500">Median (P50) Latency:</span>
                  <span className="font-bold">{perf?.generationLatency.medianMs} ms</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-neutral-500">P95 Latency:</span>
                  <span className="font-bold text-amber-500">{perf?.generationLatency.p95Ms} ms</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-neutral-500">Evaluation Overhead:</span>
                  <span className="font-bold text-cyan-500">{perf?.evaluationLatency.meanMs} ms</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                Spending Guardrails & CPSG
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-neutral-500">Cost Per Success:</span>
                  <span className="font-bold text-emerald-500">${costs?.costPerSuccessfulGenerationUsd.toFixed(4)} USD</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-neutral-500">Current Daily Spend:</span>
                  <span className="font-bold">${costs?.currentDailySpendUsd.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-neutral-500">Daily Spend Ceiling:</span>
                  <span className="font-bold">${costs?.dailySpendLimitUsd.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-neutral-500">Max Correction Loops:</span>
                  <span className="font-bold">{costs?.maxConsecutiveCorrectionLoops} loops max</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 6. ALERTS */}
      {activeTab === "alerts" && (
        <div className="space-y-3">
          {data?.activeAlerts.length === 0 ? (
            <div className="text-center p-8 text-neutral-400 text-xs">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              All systems healthy. No active alerts.
            </div>
          ) : (
            data?.activeAlerts.map((alt) => (
              <div key={alt.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        alt.severity === "critical"
                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      }`}
                    >
                      {alt.severity}
                    </span>
                    <h4 className="text-xs font-bold">{alt.title}</h4>
                  </div>
                  {!alt.acknowledged ? (
                    <button
                      onClick={() => acknowledgeAlert(alt.id)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                    >
                      Acknowledge
                    </button>
                  ) : (
                    <span className="text-[10px] text-neutral-400 font-semibold">Acknowledged</span>
                  )}
                </div>
                <p className="text-xs text-neutral-500">{alt.message}</p>
                <div className="flex items-center gap-3 text-[10px] text-neutral-400 mt-2">
                  <span>Occurrences: {alt.occurrenceCount}</span>
                  <span>Timestamp: {new Date(alt.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT: 7. CONTINUOUS IMPROVEMENT */}
      {activeTab === "improvement" && (
        <div className="space-y-4">
          <div className="text-xs text-neutral-500 mb-2">
            Governance-controlled improvement recommendations. Every prompt optimization or compiler refinement requires benchmark validation AND explicit administrator approval before production deployment.
          </div>
          {data?.improvementQueue.map((rec) => (
            <div key={rec.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 text-[10px] font-bold">
                    {rec.targetDimension}
                  </span>
                  <h4 className="text-xs font-bold">{rec.targetCategory}</h4>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    rec.approvalStatus === "approved" || rec.approvalStatus === "deployed"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  }`}
                >
                  Status: {rec.approvalStatus.replace("_", " ")}
                </span>
              </div>

              <div className="space-y-2 text-xs mb-4">
                <p className="text-neutral-500">
                  <strong className="text-neutral-800 dark:text-neutral-200">Weakness:</strong> {rec.detectedWeakness}
                </p>
                <p className="text-neutral-500">
                  <strong className="text-neutral-800 dark:text-neutral-200">Proposed Prefix:</strong>{" "}
                  <code className="text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono text-[11px]">
                    {rec.proposedPromptPrefix}
                  </code>
                </p>
                <div className="flex items-center gap-4 text-[11px]">
                  <span>Before: <strong>{rec.benchmarkScoreBefore}%</strong></span>
                  <span className="text-emerald-500 font-bold">Validated Lift: +{(rec.benchmarkScoreAfter - rec.benchmarkScoreBefore).toFixed(1)}%</span>
                  <span>Validation: <strong className="text-cyan-500 uppercase">{rec.validationVerdict}</strong></span>
                </div>
              </div>

              {rec.approvalStatus === "pending_review" && (
                <div className="flex items-center gap-2 border-t border-[var(--border)] pt-3">
                  <button
                    onClick={() => reviewImprovement(rec.id, "approve")}
                    className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-all shadow-md"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve for Production
                  </button>
                  <button
                    onClick={() => reviewImprovement(rec.id, "reject")}
                    className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

