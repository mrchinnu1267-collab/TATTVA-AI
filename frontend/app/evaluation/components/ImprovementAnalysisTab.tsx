"use client";

import React, { useState, useEffect } from "react";
import { Lightbulb, CheckCircle2, XCircle, ArrowUpRight, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";

export function ImprovementAnalysisTab() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/evaluation/analysis");
      const data = await res.json();
      if (data.success) {
        setAnalyses(data.analyses || []);
      }
    } catch (err) {
      console.warn("Failed to load analyses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const handleUpdateStatus = async (analysisId: string, recId: string, newStatus: string) => {
    try {
      setUpdatingId(recId);
      await fetch("/api/evaluation/analysis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          recommendationId: recId,
          status: newStatus,
          reviewerName: "Lead AI Engineer",
        }),
      });
      await fetchAnalyses();
    } catch (err) {
      console.warn("Failed to update recommendation:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            AI Weakness Analysis & Improvement Workflow
          </h2>
          <p className="text-xs text-slate-400">
            Automated weakness clustering from benchmark failures with human approval governance
          </p>
        </div>
        <button
          onClick={fetchAnalyses}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Findings</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          Analyzing failure patterns...
        </div>
      ) : analyses.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400 text-sm space-y-2">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="font-semibold text-white">No Failure Patterns Recorded</p>
          <p className="text-xs text-slate-500">Run a benchmark evaluation in the Knowledge Lab to generate automatic failure analyses.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {analyses.map((analysis) => (
            <div key={analysis.id} className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-mono text-cyan-400">Run: {analysis.runId}</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">Model: {analysis.model} ({analysis.provider})</h3>
                </div>
                <div className="text-xs font-medium text-rose-400 bg-rose-950/40 border border-rose-900/50 px-3 py-1 rounded-full w-fit">
                  {analysis.totalErrors} Errors Analyzed
                </div>
              </div>

              {/* Weakness Clusters */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Identified Weakness Clusters</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.clusters?.map((c: any, cIdx: number) => (
                    <div key={cIdx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300 capitalize">{c.category.replace(/_/g, " ")}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/50 text-rose-400 font-mono">
                          {c.count} errors ({c.percentageOfErrors}%)
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Recommendations with Human Review */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Actionable Improvement Recommendations</h4>
                <div className="space-y-3">
                  {analysis.recommendations?.map((rec: any) => (
                    <div key={rec.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-cyan-950/50 text-cyan-400 border border-cyan-800 text-[10px] font-mono">
                              {rec.suggestedPatchArea}
                            </span>
                            <h5 className="font-bold text-white text-xs">{rec.title}</h5>
                          </div>
                          <p className="text-slate-300 text-[11px]">{rec.description}</p>
                          <p className="text-cyan-300/80 text-[11px] pt-1 font-mono">Action: {rec.actionableStep}</p>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full whitespace-nowrap ${
                            rec.humanApprovalStatus === "approved"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : rec.humanApprovalStatus === "implemented"
                              ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                              : rec.humanApprovalStatus === "rejected"
                              ? "bg-rose-950 text-rose-400 border border-rose-800"
                              : "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}
                        >
                          {rec.humanApprovalStatus.replace(/_/g, " ")}
                        </span>
                      </div>

                      {/* Review Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                        {rec.humanApprovalStatus === "pending_review" && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(analysis.id, rec.id, "approved")}
                              disabled={updatingId === rec.id}
                              className="px-3 py-1 rounded-lg bg-emerald-900/40 hover:bg-emerald-900/80 text-emerald-300 text-[11px] font-medium border border-emerald-800 cursor-pointer"
                            >
                              Approve Recommendation
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(analysis.id, rec.id, "rejected")}
                              disabled={updatingId === rec.id}
                              className="px-3 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/80 text-rose-300 text-[11px] font-medium border border-rose-900 cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {rec.humanApprovalStatus === "approved" && (
                          <button
                            onClick={() => handleUpdateStatus(analysis.id, rec.id, "implemented")}
                            disabled={updatingId === rec.id}
                            className="px-3 py-1 rounded-lg bg-cyan-900/40 hover:bg-cyan-900/80 text-cyan-300 text-[11px] font-medium border border-cyan-800 cursor-pointer"
                          >
                            Mark Implemented & Ready for Regression
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
