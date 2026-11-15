"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Clock,
  Download,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Layers,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  FolderPlus,
  Cloud,
  HardDrive,
  CheckCircle2,
} from "lucide-react";
import { triggerDownload } from "../../lib/download-helper";
import type { ImageStorageRecord } from "../../lib/image-engine/services/storage.service";

interface WorkspaceHistorySuiteProps {
  onLoadImage?: (imageUrl: string, prompt?: string) => void;
  workspaceId?: string;
}

export function WorkspaceHistorySuite({ onLoadImage, workspaceId = "default" }: WorkspaceHistorySuiteProps) {
  const [history, setHistory] = useState<ImageStorageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedWorkspaceId, setSavedWorkspaceId] = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState<"all" | "agent_a" | "agent_b">("all");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/image/storage?workspaceId=${encodeURIComponent(workspaceId)}&limit=50`);
      if (!res.ok) throw new Error("Failed to load workspace image history.");
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err.message || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this image record from storage?")) return;
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

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSaveToWorkspace = (id: string) => {
    setSavedWorkspaceId(id);
    setTimeout(() => setSavedWorkspaceId(null), 2000);
  };

  const filteredHistory = history.filter((item) => {
    if (filterAgent === "all") return true;
    if (filterAgent === "agent_a") return item.agentId === "agent_a" || item.provider.includes("agent_a");
    if (filterAgent === "agent_b") return item.agentId === "agent_b" || item.provider.includes("agent_b");
    return true;
  });

  return (
    <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--soft)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--foreground)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
            Workspace Image Gallery & Storage
          </h2>
          <span className="rounded-full bg-neutral-500/10 px-2 py-0.5 text-[10px] font-semibold text-neutral-400">
            {filteredHistory.length} Assets
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Agent Filter */}
          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--background)] p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setFilterAgent("all")}
              className={`px-2 py-0.5 rounded-md transition ${filterAgent === "all" ? "bg-[var(--soft)] font-bold text-[var(--foreground)]" : "text-neutral-400 hover:text-[var(--foreground)]"}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterAgent("agent_a")}
              className={`px-2 py-0.5 rounded-md transition ${filterAgent === "agent_a" ? "bg-indigo-500/20 text-indigo-400 font-bold" : "text-neutral-400 hover:text-[var(--foreground)]"}`}
            >
              Agent A
            </button>
            <button
              type="button"
              onClick={() => setFilterAgent("agent_b")}
              className={`px-2 py-0.5 rounded-md transition ${filterAgent === "agent_b" ? "bg-violet-500/20 text-violet-400 font-bold" : "text-neutral-400 hover:text-[var(--foreground)]"}`}
            >
              Agent B
            </button>
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[11px] text-neutral-400 hover:text-[var(--foreground)] transition"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Sync
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && history.length === 0 && (
        <div className="py-12 text-center text-xs text-neutral-400">
          Loading workspace image assets from Supabase...
        </div>
      )}

      {!loading && filteredHistory.length === 0 && !error && (
        <div className="py-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-neutral-400" />
          <p className="mt-2 text-xs font-medium text-neutral-400">No saved workspace images yet.</p>
          <p className="text-[10px] text-neutral-500 mt-1">
            Generate images with Image Agent A or Agent B to automatically persist them to Supabase Storage.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredHistory.map((item) => {
          const isAgentA = item.agentId === "agent_a" || item.provider.includes("agent_a");
          const isAgentB = item.agentId === "agent_b" || item.provider.includes("agent_b");
          const isSupabaseCloud = item.storageType === "supabase_storage";

          return (
            <div
              key={item.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] transition hover:border-neutral-400 shadow-sm"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-neutral-900/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.prompt}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  onError={(e) => {
                    // Graceful fallback for broken image previews
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231f2937'/><text x='50' y='50' fill='%239ca3af' font-size='8' text-anchor='middle' alignment-baseline='middle'>Private Vault Asset</text></svg>";
                  }}
                />
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  {/* Storage Status Pill */}
                  {isSupabaseCloud ? (
                    <span className="flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[9px] font-bold text-emerald-400 backdrop-blur-md border border-emerald-500/30">
                      <Cloud className="h-2.5 w-2.5" />
                      Supabase Cloud
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[9px] font-bold text-amber-400 backdrop-blur-md border border-amber-500/30">
                      <HardDrive className="h-2.5 w-2.5" />
                      Vault Fallback
                    </span>
                  )}
                </div>

                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {/* Agent Tag */}
                  {isAgentA && (
                    <span className="rounded-full bg-indigo-950/80 px-2 py-0.5 text-[9px] font-bold text-indigo-300 backdrop-blur-md border border-indigo-500/40">
                      Agent A
                    </span>
                  )}
                  {isAgentB && (
                    <span className="rounded-full bg-violet-950/80 px-2 py-0.5 text-[9px] font-bold text-violet-300 backdrop-blur-md border border-violet-500/40">
                      Agent B
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
                  
                  {item.originalPrompt && item.originalPrompt !== item.prompt && (
                    <p className="mt-1 line-clamp-1 text-[10px] text-neutral-400 italic" title={`Original Prompt: ${item.originalPrompt}`}>
                      Orig: {item.originalPrompt}
                    </p>
                  )}

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[9px] text-neutral-400">
                    <span className="rounded bg-neutral-500/10 px-1.5 py-0.5 font-mono">
                      {item.parameters?.width || 512} × {item.parameters?.height || 512}
                    </span>
                    <span className="rounded bg-neutral-500/10 px-1.5 py-0.5 font-mono uppercase">
                      {item.mimeType?.replace("image/", "") || "PNG"}
                    </span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2.5">
                  {onLoadImage ? (
                    <button
                      type="button"
                      onClick={() => onLoadImage(item.url, item.prompt)}
                      className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--soft)] px-2 py-1 text-[10px] font-semibold transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                      title="Open in Studio"
                    >
                      <Sparkles className="h-3 w-3" />
                      Load
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSaveToWorkspace(item.id)}
                      className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--soft)] px-2 py-1 text-[10px] font-semibold transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                      title="Save to My Workspace"
                    >
                      {savedWorkspaceId === item.id ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Saved</span>
                        </>
                      ) : (
                        <>
                          <FolderPlus className="h-3 w-3" />
                          <span>My Workspace</span>
                        </>
                      )}
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(item.id, item.prompt)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:text-[var(--foreground)] transition"
                      title="Copy Prompt"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerDownload(item.url, `tattva-${item.id}.png`)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:text-[var(--foreground)] transition"
                      title="Download Image"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:text-red-500 transition"
                      title="Delete Image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
