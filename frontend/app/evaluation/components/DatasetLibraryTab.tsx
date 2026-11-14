"use client";

import React, { useState, useEffect } from "react";
import { Database, CheckCircle2, XCircle, FileText, Upload, RefreshCw, ShieldCheck, Tag } from "lucide-react";

export function DatasetLibraryTab() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [inspectDataset, setInspectDataset] = useState<any | null>(null);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/evaluation/datasets");
      const data = await res.json();
      if (data.success) {
        setDatasets(data.datasets || []);
      }
    } catch (err) {
      console.warn("Failed to load dataset library:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/evaluation/datasets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      setDatasets((prev) =>
        prev.map((d) => (d.id === id ? { ...d, isActive: !current } : d))
      );
    } catch (err) {
      console.warn("Failed to toggle status:", err);
    }
  };

  const handleInspect = async (id: string) => {
    try {
      const res = await fetch(`/api/evaluation/datasets/${id}?sample=true`);
      const data = await res.json();
      if (data.success) {
        setInspectDataset(data);
      }
    } catch (err) {
      console.warn("Failed to inspect dataset:", err);
    }
  };

  const filtered = datasets.filter((d) => {
    if (activeFilter === "all") return true;
    return d.categories?.includes(activeFilter) || d.language === activeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Centralized Dataset Management Library
          </h2>
          <p className="text-xs text-slate-400">
            Canonical benchmark repositories, licensing checks, multi-format ingestion (CSV, JSON, JSONL), and multilingual collections
          </p>
        </div>
        <button
          onClick={fetchDatasets}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Datasets</span>
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2 text-xs">
        {["all", "knowledge", "reasoning", "multilingual", "instruction_following", "conversational", "te-IN", "hi-IN"].map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1 rounded-full border transition-all ${
              activeFilter === f
                ? "bg-cyan-500/10 border-cyan-500 text-cyan-300 font-medium"
                : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {f === "all" ? "All Datasets" : f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Dataset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm">
            Loading verified datasets...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm">
            No datasets found matching filter.
          </div>
        ) : (
          filtered.map((d) => (
            <div
              key={d.id}
              className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {d.format.toUpperCase()}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      d.isActive
                        ? "bg-emerald-950/50 border border-emerald-800/60 text-emerald-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {d.isActive ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3" />}
                    {d.isActive ? "Active" : "Disabled"}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white line-clamp-1">{d.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{d.description}</p>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Language</span>
                  <span className="font-semibold text-slate-200">{d.language}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Records</span>
                  <span className="font-semibold text-cyan-400">{d.recordCount.toLocaleString()} Qs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>License</span>
                  <span className="text-[11px] text-slate-400">{d.license}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {d.categories?.map((cat: string) => (
                    <span key={cat} className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleInspect(d.id)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                >
                  Inspect Schema
                </button>
                <button
                  onClick={() => toggleStatus(d.id, d.isActive)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    d.isActive
                      ? "border-rose-900/50 text-rose-300 hover:bg-rose-950/30"
                      : "border-emerald-900/50 text-emerald-300 hover:bg-emerald-950/30"
                  }`}
                >
                  {d.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inspect Modal */}
      {inspectDataset && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{inspectDataset.dataset.name}</h3>
                <p className="text-xs text-slate-400">{inspectDataset.dataset.relativePath}</p>
              </div>
              <button
                onClick={() => setInspectDataset(null)}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                <div>Source: <span className="text-white font-medium">{inspectDataset.dataset.source}</span></div>
                <div>License: <span className="text-white font-medium">{inspectDataset.dataset.license}</span></div>
                <div>Format: <span className="text-white font-medium">{inspectDataset.dataset.format.toUpperCase()}</span></div>
                <div>Schema: <span className="text-white font-medium">{inspectDataset.dataset.schemaType}</span></div>
              </div>

              <h4 className="font-bold text-slate-200 mt-2">Sample Records (Ground Truth Answer Masked):</h4>
              <div className="space-y-2">
                {inspectDataset.sampleRecords?.map((rec: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 font-mono text-[11px]">
                    <div className="text-cyan-400 font-bold">[{rec.subject || "general"}] Question {idx + 1}:</div>
                    <div className="text-slate-200">{rec.question}</div>
                    {rec.options && (
                      <div className="grid grid-cols-2 gap-1 text-slate-400 text-[10px] mt-1 pl-2">
                        <div>A: {rec.options.A}</div>
                        <div>B: {rec.options.B}</div>
                        <div>C: {rec.options.C}</div>
                        <div>D: {rec.options.D}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
