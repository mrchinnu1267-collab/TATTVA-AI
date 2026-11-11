"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Clock,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Layers,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { triggerDownload } from "../../lib/download-helper";
import type { ImageStorageRecord } from "../../lib/image-engine/services/storage.service";

interface WorkspaceHistorySuiteProps {
  onLoadImage: (imageUrl: string, prompt?: string) => void;
}

export function WorkspaceHistorySuite({ onLoadImage }: WorkspaceHistorySuiteProps) {
  const [history, setHistory] = useState<ImageStorageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/image/storage?limit=40");
      if (!res.ok) throw new Error("Failed to load workspace image history.");
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err.message || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/image/storage?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      // ignore
    }
  };

  const handleCopyPrompt = (id: string, prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--soft)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--foreground)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
            Workspace Image History & Vault
          </h2>
          <span className="rounded-full bg-neutral-500/10 px-2 py-0.5 text-[10px] font-semibold text-neutral-400">
            {history.length} Saved Assets
          </span>
        </div>
        <button
          type="button"
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-[var(--foreground)]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && history.length === 0 && (
        <div className="py-12 text-center text-xs text-neutral-400">
          Loading workspace history...
        </div>
      )}

      {!loading && history.length === 0 && !error && (
        <div className="py-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-neutral-400" />
          <p className="mt-2 text-xs font-medium text-neutral-400">No saved workspace images yet.</p>
          <p className="text-[10px] text-neutral-500 mt-1">
            Generate or edit an image and click "Save to Workspace" to track versions and accuracy scorecards.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] transition hover:border-neutral-400"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-neutral-900/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.prompt}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute top-2 right-2 flex items-center gap-1">
                {item.accuracyScorecard && (
                  <span className="flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-bold text-emerald-400 backdrop-blur-md">
                    <ShieldCheck className="h-3 w-3" />
                    {item.accuracyScorecard.overallAccuracy}%
                  </span>
                )}
                {item.version > 1 && (
                  <span className="flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-bold text-amber-400 backdrop-blur-md">
                    <Layers className="h-3 w-3" />
                    v{item.version}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-between p-3">
              <div>
                <p className="line-clamp-2 text-xs font-medium text-[var(--foreground)]" title={item.prompt}>
                  {item.prompt}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] text-neutral-400">
                  <span className="rounded bg-neutral-500/10 px-1.5 py-0.5 font-mono">{item.provider}</span>
                  <span className="rounded bg-neutral-500/10 px-1.5 py-0.5 font-mono">{item.model}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2.5">
                <button
                  type="button"
                  onClick={() => onLoadImage(item.url, item.prompt)}
                  className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--soft)] px-2 py-1 text-[10px] font-semibold transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                  title="Open in Studio"
                >
                  <Sparkles className="h-3 w-3" />
                  Load
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(item.id, item.prompt)}
                    className="rounded-lg p-1.5 text-neutral-400 hover:text-[var(--foreground)] transition"
                    title="Copy Prompt"
                  >
                    {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload(item.url, `tattva-${item.id}.png`)}
                    className="rounded-lg p-1.5 text-neutral-400 hover:text-[var(--foreground)] transition"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-1.5 text-neutral-400 hover:text-red-500 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

