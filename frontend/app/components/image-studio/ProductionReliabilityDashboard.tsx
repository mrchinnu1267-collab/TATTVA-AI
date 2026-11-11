"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  Clock,
  DollarSign,
  Layers,
  RotateCw,
  XCircle,
  CheckCircle,
  PauseCircle,
  Play,
  Zap,
  Cpu,
  Server,
  Lock,
} from "lucide-react";
import {
  ReliabilityDashboardMetrics,
  ImageJob,
  CircuitBreakerState,
} from "@/app/lib/image-engine/reliability/types";

export function ProductionReliabilityDashboard() {
  const [metrics, setMetrics] = useState<ReliabilityDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "circuit_breakers" | "budget">("overview");

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/image/jobs?view=metrics");
      const data = await res.json();
      if (data.success && data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Failed to load reliability metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 8000); // Polling every 8s
    return () => clearInterval(interval);
  }, []);

  const handleCancelJob = async (jobId: string) => {
    try {
      await fetch(`/api/image/jobs?id=${jobId}`, { method: "DELETE" });
      fetchMetrics();
    } catch (err) {
      console.error("Failed to cancel job:", err);
    }
  };

  if (!metrics) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--soft)] p-8 text-center text-neutral-500">
        <RotateCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
        <p className="text-xs">Loading production reliability telemetry…</p>
      </div>
    );
  }

  const providers = Object.values(metrics.providerHealth);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--soft)] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Production Reliability & Operations Dashboard (Phase K)
            </h2>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Real-time provider health, circuit breakers, asynchronous job queues, and cost telemetry.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Success Rate</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
            {metrics.overallSuccessRate}%
          </div>
          <p className="text-[10px] text-neutral-500">
            {metrics.successfulRequests} passed / {metrics.failedRequests} failed
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Latency (Mean / P95)</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
            {(metrics.averageLatencyMs / 1000).toFixed(1)}s
          </div>
          <p className="text-[10px] text-neutral-500">
            Median: {(metrics.medianLatencyMs / 1000).toFixed(1)}s • P95: {(metrics.p95LatencyMs / 1000).toFixed(1)}s
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Cost / Success</span>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
            ${metrics.averageCostPerSuccessUsd.toFixed(4)}
          </div>
          <p className="text-[10px] text-neutral-500">
            Total Spend: ${metrics.totalSpendUsd.toFixed(2)}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span>Active Queue</span>
            <Layers className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
            {metrics.activeQueueLength}
          </div>
          <p className="text-[10px] text-neutral-500">
            Concurrency ceiling: 3 max
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "overview"
              ? "bg-blue-500/10 text-blue-500 font-semibold"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Operational Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("circuit_breakers")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "circuit_breakers"
              ? "bg-blue-500/10 text-blue-500 font-semibold"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <Server className="h-4 w-4" />
          <span>Circuit Breakers ({providers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("jobs")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "jobs"
              ? "bg-blue-500/10 text-blue-500 font-semibold"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Job Queue ({metrics.recentJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("budget")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "budget"
              ? "bg-blue-500/10 text-blue-500 font-semibold"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Spending Budgets & Limits</span>
        </button>
      </div>

      {/* Tab 1: Operational Overview */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Provider Circuit Status Grid */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Provider Circuit Breaker Status
              </h3>
              <div className="space-y-2 text-xs">
                {providers.map((p) => (
                  <div
                    key={p.providerId}
                    className="flex items-center justify-between p-2 rounded-xl bg-neutral-500/5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100 uppercase">
                        {p.providerId}
                      </span>
                      {p.isQuotaExhausted && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500">
                          Quota Empty
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.circuitState === "CLOSED"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : p.circuitState === "HALF_OPEN"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {p.circuitState}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending Budget Gauge */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Workspace Spending Limits
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-neutral-600 dark:text-neutral-400 mb-1">
                    <span>Daily Budget: ${metrics.spendingLimit.currentDailySpendUsd.toFixed(2)} / ${metrics.spendingLimit.dailySpendingLimitUsd.toFixed(2)}</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">
                      {Math.round((metrics.spendingLimit.currentDailySpendUsd / metrics.spendingLimit.dailySpendingLimitUsd) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (metrics.spendingLimit.currentDailySpendUsd / metrics.spendingLimit.dailySpendingLimitUsd) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)] text-[11px] text-neutral-500">
                  <Lock className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Hard stop enabled: Prevents billing spikes automatically.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Circuit Breakers */}
      {activeTab === "circuit_breakers" && (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-neutral-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Successes</th>
                  <th className="py-2.5 px-3">Consecutive Failures</th>
                  <th className="py-2.5 px-3">Cooldown Remaining</th>
                  <th className="py-2.5 px-3">Quota Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {providers.map((p) => {
                  const cooldownSec = Math.max(0, Math.ceil((p.cooldownUntil - Date.now()) / 1000));
                  return (
                    <tr key={p.providerId} className="hover:bg-neutral-500/5">
                      <td className="py-3 px-3 font-bold uppercase text-neutral-900 dark:text-neutral-100">
                        {p.providerId}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.circuitState === "CLOSED"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : p.circuitState === "HALF_OPEN"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {p.circuitState}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400">
                        {p.successfulRequests}
                      </td>
                      <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400">
                        {p.consecutiveFailures}
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-500">
                        {cooldownSec > 0 ? `${cooldownSec}s` : "None"}
                      </td>
                      <td className="py-3 px-3">
                        {p.isQuotaExhausted ? (
                          <span className="text-amber-500 font-semibold">Exhausted</span>
                        ) : (
                          <span className="text-emerald-500 font-semibold">Available</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Background Job Queue */}
      {activeTab === "jobs" && (
        <div className="space-y-3">
          <div className="space-y-2">
            {metrics.recentJobs.map((job) => (
              <div
                key={job.id}
                className="p-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-neutral-400">{job.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        job.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : job.status === "processing"
                          ? "bg-blue-500/10 text-blue-500"
                          : job.status === "failed"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-neutral-500/10 text-neutral-400"
                      }`}
                    >
                      {job.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {job.status === "processing" && (
                      <button
                        onClick={() => handleCancelJob(job.id)}
                        className="text-red-500 hover:text-red-400 text-[10px] font-semibold"
                      >
                        Cancel
                      </button>
                    )}
                    <span className="text-[10px] text-neutral-400">
                      {new Date(job.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <p className="text-neutral-700 dark:text-neutral-300 italic truncate">
                  "{job.prompt}"
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      job.status === "failed" ? "bg-red-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${job.progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span>Stage: {job.currentStage.replace("_", " ")}</span>
                  <span>Cost: ${job.totalCostUsd.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Spending Budgets */}
      {activeTab === "budget" && (
        <div className="space-y-4 text-xs">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-3">
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100">
              Workspace Cost Policy Configuration
            </h3>
            <p className="text-neutral-500 text-[11px]">
              Budgets prevent unexpected API charges by gating multi-stage workflows before cloud model invocation.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-neutral-500/5 space-y-1">
                <span className="text-neutral-500">Daily Limit:</span>
                <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  ${metrics.spendingLimit.dailySpendingLimitUsd.toFixed(2)} USD
                </p>
              </div>
              <div className="p-3 rounded-xl bg-neutral-500/5 space-y-1">
                <span className="text-neutral-500">Monthly Limit:</span>
                <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  ${metrics.spendingLimit.monthlySpendingLimitUsd.toFixed(2)} USD
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

