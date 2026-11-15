"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Clock,
  Download,
  Trash2,
  RefreshCw,
  Layers,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  FolderPlus,
  Cloud,
  HardDrive,
  CheckCircle2,
  Edit2,
  Maximize2,
  X,
  FileCheck2,
} from "lucide-react";
import { triggerDownload } from "../../lib/download-helper";
import type { ImageStorageRecord } from "../../lib/image-engine/services/storage.service";

interface WorkspaceHistorySuiteProps {
  onLoadImage?: (imageUrl: string, prompt?: string) => void;
  workspaceId?: string;
  refreshTrigger?: number;
}

export function WorkspaceHistorySuite({
  onLoadImage,
  workspaceId = "default",
  refreshTrigger,
}: WorkspaceHistorySuiteProps) {
  const [history, setHistory] = useState<ImageStorageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedWorkspaceId, setSavedWorkspaceId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "imported" | "preview" | "agent_a" | "agent_b">("all");

  // Inline Rename State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPromptText, setEditPromptText] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Lightbox Modal State
  const [lightboxItem, setLightboxItem] = useState<ImageStorageRecord | null>(null);

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
  }, [fetchHistory, refreshTrigger]);

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

  const handleStartRename = (item: ImageStorageRecord) => {
    setEditingId(item.id);
    setEditPromptText(item.prompt);
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditPromptText("");
  };

  const handleSaveRename = async (id: string) => {
    if (!editPromptText.trim()) return;
    setIsRenaming(true);
    try {
      const res = await fetch(`/api/image/storage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          prompt: editPromptText.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to rename image.");
      }

      setHistory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, prompt: editPromptText.trim() } : item))
      );
      setEditingId(null);
      setEditPromptText("");
    } catch (err: any) {
      alert(err.message || "Error renaming asset.");
    } finally {
      setIsRenaming(false);
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
    const isImported =
      item.sourceClassification === "user_uploaded_image" ||
      item.parameters?.provenance === "user_uploaded_image" ||
      item.operation === "user_assisted_import";

    const isPreview =
      item.sourceClassification === "local_procedural_fallback" ||
      item.storageType === "vault_fallback";

    if (filterType === "all") return true;
    if (filterType === "imported") return isImported;
    if (filterType === "preview") return isPreview;
    if (filterType === "agent_a") return item.agentId === "agent_a" || item.provider.includes("agent_a");
    if (filterType === "agent_b") return item.agentId === "agent_b" || item.provider.includes("agent_b");
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Provenance Filter */}
          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--background)] p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-2 py-0.5 rounded-md transition ${
                filterType === "all"
                  ? "bg-[var(--soft)] font-bold text-[var(--foreground)]"
                  : "text-neutral-400 hover:text-[var(--foreground)]"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType("imported")}
              className={`px-2 py-0.5 rounded-md transition ${
                filterType === "imported"
                  ? "bg-emerald-500/20 text-emerald-400 font-bold"
                  : "text-neutral-400 hover:text-[var(--foreground)]"
              }`}
            >
              Imported
            </button>
            <button
              type="button"
              onClick={() => setFilterType("preview")}
              className={`px-2 py-0.5 rounded-md transition ${
                filterType === "preview"
                  ? "bg-amber-500/20 text-amber-400 font-bold"
                  : "text-neutral-400 hover:text-[var(--foreground)]"
              }`}
            >
              Previews
            </button>
            <button
              type="button"
              onClick={() => setFilterType("agent_a")}
              className={`px-2 py-0.5 rounded-md transition ${
                filterType === "agent_a"
                  ? "bg-indigo-500/20 text-indigo-400 font-bold"
                  : "text-neutral-400 hover:text-[var(--foreground)]"
              }`}
            >
              Agent A
            </button>
            <button
              type="button"
              onClick={() => setFilterType("agent_b")}
              className={`px-2 py-0.5 rounded-md transition ${
                filterType === "agent_b"
                  ? "bg-violet-500/20 text-violet-400 font-bold"
                  : "text-neutral-400 hover:text-[var(--foreground)]"
              }`}
            >
              Agent B
            </button>
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[11px] text-neutral-400 hover:text-[var(--foreground)] transition cursor-pointer"
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
            Import images from your external AI tools using the User-Assisted Workflow above to automatically persist them to Supabase Storage.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredHistory.map((item) => {
          const isAgentA = item.agentId === "agent_a" || item.provider.includes("agent_a") || item.provider.includes("tool_a");
          const isAgentB = item.agentId === "agent_b" || item.provider.includes("agent_b") || item.provider.includes("tool_b");
          const isSupabaseCloud = item.storageType === "supabase_storage";

          const isImported =
            item.sourceClassification === "user_uploaded_image" ||
            item.parameters?.provenance === "user_uploaded_image" ||
            item.operation === "user_assisted_import";

          const isLocalPreview =
            item.sourceClassification === "local_procedural_fallback" ||
            (!isImported && item.storageType === "vault_fallback");

          const isEditing = editingId === item.id;

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
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231f2937'/><text x='50' y='50' fill='%239ca3af' font-size='8' text-anchor='middle' alignment-baseline='middle'>Private Vault Asset</text></svg>";
                  }}
                />

                {/* Storage Status Pill */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
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

                {/* Provenance Pill */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {isImported ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-950/80 px-2 py-0.5 text-[9px] font-bold text-emerald-300 backdrop-blur-md border border-emerald-500/40">
                      <FileCheck2 className="h-2.5 w-2.5" />
                      User Imported
                    </span>
                  ) : isLocalPreview ? (
                    <span className="flex items-center gap-1 rounded-full bg-amber-950/80 px-2 py-0.5 text-[9px] font-bold text-amber-300 backdrop-blur-md border border-amber-500/40">
                      Local Preview
                    </span>
                  ) : isAgentA ? (
                    <span className="rounded-full bg-indigo-950/80 px-2 py-0.5 text-[9px] font-bold text-indigo-300 backdrop-blur-md border border-indigo-500/40">
                      Agent A
                    </span>
                  ) : (
                    <span className="rounded-full bg-violet-950/80 px-2 py-0.5 text-[9px] font-bold text-violet-300 backdrop-blur-md border border-violet-500/40">
                      Agent B
                    </span>
                  )}
                </div>

                {/* Quick Action Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLightboxItem(item)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition cursor-pointer"
                    title="Fullscreen Preview"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload(item.url, `tattva-${item.id}.png`)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition cursor-pointer"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between p-3">
                <div>
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={editPromptText}
                        onChange={(e) => setEditPromptText(e.target.value)}
                        className="w-full text-xs p-1.5 rounded-lg border border-indigo-500 bg-[var(--background)] text-[var(--foreground)] outline-none"
                        autoFocus
                        disabled={isRenaming}
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSaveRename(item.id)}
                          disabled={isRenaming}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                        >
                          {isRenaming ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          disabled={isRenaming}
                          className="px-2 py-0.5 rounded text-[10px] text-neutral-400 hover:text-[var(--foreground)] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-1">
                      <p className="line-clamp-2 text-xs font-medium text-[var(--foreground)]" title={item.prompt}>
                        {item.prompt}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleStartRename(item)}
                        className="shrink-0 p-1 text-neutral-400 hover:text-[var(--foreground)] transition cursor-pointer"
                        title="Rename Title"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {item.originalPrompt && item.originalPrompt !== item.prompt && (
                    <p
                      className="mt-1 line-clamp-1 text-[10px] text-neutral-400 italic"
                      title={`Original Prompt: ${item.originalPrompt}`}
                    >
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
                      className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--soft)] px-2 py-1 text-[10px] font-semibold transition hover:border-[var(--foreground)] hover:text-[var(--foreground)] cursor-pointer"
                      title="Open in Studio"
                    >
                      <Sparkles className="h-3 w-3" />
                      Load
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSaveToWorkspace(item.id)}
                      className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--soft)] px-2 py-1 text-[10px] font-semibold transition hover:border-[var(--foreground)] hover:text-[var(--foreground)] cursor-pointer"
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
                      className="rounded-lg p-1.5 text-neutral-400 hover:text-[var(--foreground)] transition cursor-pointer"
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
                      className="rounded-lg p-1.5 text-neutral-400 hover:text-[var(--foreground)] transition cursor-pointer"
                      title="Download Image"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:text-red-500 transition cursor-pointer"
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

      {/* Lightbox Modal */}
      {lightboxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fluid-modal-in">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-[#12131a] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white truncate max-w-md">
                  {lightboxItem.prompt}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {lightboxItem.sourceClassification === "user_uploaded_image"
                    ? "User Imported Asset"
                    : lightboxItem.sourceClassification === "local_procedural_fallback"
                    ? "Local Procedural Preview"
                    : "Verified Storage"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Preview Container */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 min-h-[350px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxItem.url}
                alt={lightboxItem.prompt}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>

            {/* Footer Details */}
            <div className="p-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400 bg-black/20">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  <strong>Dimensions:</strong> {lightboxItem.parameters?.width || 512} ×{" "}
                  {lightboxItem.parameters?.height || 512}
                </span>
                <span>
                  <strong>Format:</strong> {lightboxItem.mimeType?.replace("image/", "").toUpperCase() || "PNG"}
                </span>
                <span>
                  <strong>Size:</strong>{" "}
                  {lightboxItem.fileSizeBytes
                    ? `${(lightboxItem.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                    : "Standard"}
                </span>
                <span>
                  <strong>Uploaded:</strong> {new Date(lightboxItem.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyPrompt(lightboxItem.id, lightboxItem.prompt)}
                  className="px-3 py-1.5 rounded-xl border border-white/10 text-white hover:bg-white/10 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Prompt</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerDownload(lightboxItem.url, `tattva-${lightboxItem.id}.png`)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition font-medium flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download High-Res</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
