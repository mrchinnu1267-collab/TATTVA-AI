"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Play,
  RefreshCw,
  Server,
  Zap,
  BarChart3,
  Clock,
  CheckCircle2,
  Sliders,
  Plus,
  ArrowRight,
  ShieldAlert,
  Radio,
} from "lucide-react";

export function ReliabilityDashboard() {
  const [activeTab, setActiveTab] = useState<"sla" | "probes" | "incidents">("sla");
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [probes, setProbes] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Declare Incident Modal State
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newService, setNewService] = useState("Model Gateway (Gemini 2.5)");
  const [newSeverity, setNewSeverity] = useState("medium");
  const [newInitialMsg, setNewInitialMsg] = useState("");

  useEffect(() => {
    loadReliabilityData();
  }, []);

  async function loadReliabilityData() {
    setLoading(true);
    try {
      const [mRes, pRes, iRes] = await Promise.all([
        fetch("/api/reliability/metrics").then((r) => r.json()).catch(() => ({})),
        fetch("/api/reliability/probes").then((r) => r.json()).catch(() => ({})),
        fetch("/api/reliability/incidents").then((r) => r.json()).catch(() => ({})),
      ]);

      if (mRes?.metrics) setMetrics(mRes.metrics);
      if (mRes?.heatmap) setHeatmap(mRes.heatmap);
      if (pRes?.probes) setProbes(pRes.probes);
      if (iRes?.incidents) setIncidents(iRes.incidents);
    } catch (err) {
      console.error("Failed to load reliability telemetry:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunSyntheticProbes() {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/reliability/probes", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.probes) {
        setProbes(data.probes);
        setNotice({ type: "success", text: `Executed synthetic availability probes on ${data.probes.length} endpoints.` });
        // Reload metrics to reflect fresh latencies
        fetch("/api/reliability/metrics")
          .then((r) => r.json())
          .then((d) => d?.metrics && setMetrics(d.metrics));
      } else {
        setNotice({ type: "error", text: data.error || "Synthetic probe run failed." });
      }
    } catch {
      setNotice({ type: "error", text: "Network error running synthetic probes." });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeclareIncident(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newService.trim()) return;

    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/reliability/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "declare",
          title: newTitle,
          service: newService,
          severity: newSeverity,
          initialMessage: newInitialMsg || `Degradation detected on ${newService}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.incident) {
        setIncidents([data.incident, ...incidents]);
        setNotice({ type: "success", text: `Incident ${data.incident.id} declared.` });
        setShowDeclareModal(false);
        setNewTitle("");
        setNewInitialMsg("");
      }
    } catch {
      setNotice({ type: "error", text: "Failed to declare incident." });
    } finally {
      setLoading(false);
    }
  }

  async function handleMitigateIncident(incidentId: string, mitigationAction: string) {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/reliability/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mitigate",
          incidentId,
          mitigationAction,
        }),
      });
      const data = await res.json();
      if (res.ok && data.incident) {
        setIncidents(incidents.map((i) => (i.id === incidentId ? data.incident : i)));
        setNotice({ type: "success", text: `Mitigation successful: ${data.details}` });
      } else {
        setNotice({ type: "error", text: data.error || "Mitigation failed." });
      }
    } catch {
      setNotice({ type: "error", text: "Failed to execute mitigation playbook." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8 text-neutral-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Production Reliability Engineering
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/30">
                  Phase 48
                </span>
              </h1>
              <p className="text-sm text-neutral-400 mt-0.5">
                99.95% SLA verification, automated incident mitigation playbooks, circuit breakers, and latency heatmaps.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadReliabilityData()}
            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleRunSyntheticProbes}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Run Synthetic Probes
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("sla")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "sla"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          SLA, SLO & Latency Heatmaps
        </button>
        <button
          onClick={() => setActiveTab("probes")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "probes"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Radio className="w-4 h-4" />
          Synthetic Availability Probes ({probes.length})
        </button>
        <button
          onClick={() => setActiveTab("incidents")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "incidents"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Incidents & Automated Mitigation ({incidents.length})
        </button>
      </div>

      {notice && (
        <div
          className={`text-xs p-3 rounded-xl border flex items-center justify-between ${
            notice.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/15 border-red-500/30 text-red-300"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">
            ×
          </button>
        </div>
      )}

      {/* Quick Metrics Bar */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <span className="text-xs text-neutral-400 font-medium">Platform Uptime (SLA)</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{metrics.uptimePercent}%</div>
            <span className="text-[10px] text-neutral-500">Target: 99.95% SLA</span>
          </div>
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <span className="text-xs text-neutral-400 font-medium">MTBF (Mean Time Between Failures)</span>
            <div className="text-2xl font-bold text-white mt-1">{metrics.mtbfHours} hrs</div>
            <span className="text-[10px] text-neutral-500">High Reliability</span>
          </div>
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <span className="text-xs text-neutral-400 font-medium">MTTR (Mean Time to Recovery)</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{metrics.mttrMinutes} min</div>
            <span className="text-[10px] text-neutral-500">Automated Self-Healing</span>
          </div>
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <span className="text-xs text-neutral-400 font-medium">p95 / p99 Latency</span>
            <div className="text-2xl font-bold text-indigo-400 mt-1">{metrics.latencyP95Ms}ms / {metrics.latencyP99Ms}ms</div>
            <span className="text-[10px] text-neutral-500">p50: {metrics.latencyP50Ms}ms</span>
          </div>
        </div>
      )}

      {/* Tab 1: SLA & Heatmaps */}
      {activeTab === "sla" && (
        <div className="space-y-6">
          {/* Circuit Breakers Status */}
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Service Circuit Breakers</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Real-time circuit breaker states protecting against upstream cascade failures.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20">
                All Circuits Operational
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              {[
                { name: "Google Gemini 2.5", state: metrics?.circuitBreakerStatus?.gemini || "CLOSED" },
                { name: "DeepSeek V3", state: metrics?.circuitBreakerStatus?.deepseek || "CLOSED" },
                { name: "Cloudflare Workers AI", state: metrics?.circuitBreakerStatus?.cloudflare || "CLOSED" },
                { name: "Supabase PostgreSQL", state: metrics?.circuitBreakerStatus?.database || "CLOSED" },
              ].map((cb) => (
                <div key={cb.name} className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">{cb.name}</span>
                    <span className="text-[10px] text-neutral-500">Failure trip: 5 consecutive</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {cb.state}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Latency Heatmap */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-neutral-300 block">24-Hour Latency Distribution Heatmap</span>
                <span className="text-xs text-neutral-500">Aggregated percentiles across rolling 4-hour windows</span>
              </div>
            </div>
            <div className="divide-y divide-neutral-800">
              {heatmap.map((bin) => (
                <div key={bin.timeWindow} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-neutral-500" />
                    <span className="font-semibold text-neutral-200">{bin.timeWindow}</span>
                    <span className="text-neutral-500">({bin.requestCount} requests)</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-neutral-500 mr-1.5">p50:</span>
                      <span className="font-mono text-emerald-400 font-semibold">{bin.p50Ms}ms</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 mr-1.5">p90:</span>
                      <span className="font-mono text-cyan-400 font-semibold">{bin.p90Ms}ms</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 mr-1.5">p95:</span>
                      <span className="font-mono text-indigo-400 font-semibold">{bin.p95Ms}ms</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 mr-1.5">p99:</span>
                      <span className="font-mono text-amber-400 font-semibold">{bin.p99Ms}ms</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Synthetic Probes */}
      {activeTab === "probes" && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-300">Live Synthetic Availability Probes</span>
            <span className="text-xs text-neutral-500">{probes.length} recorded</span>
          </div>
          <div className="divide-y divide-neutral-800">
            {probes.map((prb) => (
              <div key={prb.id} className="px-6 py-4 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-neutral-200">{prb.name}</span>
                    <span className="font-mono text-neutral-500">{prb.endpoint}</span>
                  </div>
                  <span className="text-[11px] text-neutral-500">
                    Probed at {new Date(prb.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-semibold text-neutral-300">{prb.latencyMs}ms</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    prb.status === "healthy"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  }`}>
                    {prb.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Incidents & Automated Mitigation */}
      {activeTab === "incidents" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowDeclareModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Declare Manual Incident
            </button>
          </div>

          <div className="space-y-4">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs text-neutral-500">{inc.id}</span>
                      <h4 className="text-sm font-bold text-white">{inc.title}</h4>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        inc.severity === "high" || inc.severity === "critical"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        {inc.severity}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-400 mt-0.5 block">Service: {inc.service}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      inc.status === "resolved"
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    }`}>
                      {inc.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Mitigation Playbook Trigger if investigating */}
                {inc.status === "investigating" && (
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <span className="text-xs font-semibold text-neutral-300 block">
                      Trigger Automated Mitigation Playbook
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleMitigateIncident(inc.id, "provider_failover")}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                      >
                        Provider Failover
                      </button>
                      <button
                        onClick={() => handleMitigateIncident(inc.id, "reset_circuit_breaker")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                      >
                        Reset Circuit Breaker
                      </button>
                      <button
                        onClick={() => handleMitigateIncident(inc.id, "flush_cache")}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors"
                      >
                        Flush Semantic Cache
                      </button>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Incident Timeline
                  </span>
                  <div className="space-y-1.5">
                    {inc.timeline?.map((entry: any, idx: number) => (
                      <div key={idx} className="text-xs text-neutral-300 flex items-start gap-2">
                        <span className="text-neutral-500 font-mono text-[11px] shrink-0">
                          {new Date(entry.timestamp).toLocaleTimeString()}:
                        </span>
                        <span>
                          <strong className="text-neutral-200">{entry.actor}:</strong> {entry.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Declare Incident Modal */}
      {showDeclareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Declare Production Incident
              </h3>
              <button
                onClick={() => setShowDeclareModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeclareIncident} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 mb-1 block">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Upstream API 503 Errors"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 mb-1 block">Service</label>
                <input
                  type="text"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 mb-1 block">Severity</label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 mb-1 block">Initial Notes</label>
                <textarea
                  rows={3}
                  placeholder="Symptoms, affected regions..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowDeclareModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                >
                  Declare Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
