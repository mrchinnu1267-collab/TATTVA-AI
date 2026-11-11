"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Cpu,
  Layers,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Terminal,
  Sliders,
  Tag,
  Sparkles,
  Trash2,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  DollarSign,
  Activity,
  HardDrive,
  RefreshCw,
  Info,
} from "lucide-react";
import type {
  LoRAAdapter,
  TrainingJob,
  CustomizationQualityReport,
  CustomizationCategory,
  FineTuningBaseModelId,
} from "../../lib/image-engine/customization/types";
import { SUPPORTED_BASE_MODELS } from "../../lib/image-engine/customization/types";

interface CustomizationSuiteProps {
  activeAdapterId?: string;
  adapterScale?: number;
  onSelectAdapter?: (adapter: LoRAAdapter | null) => void;
  onUpdateScale?: (scale: number) => void;
}

type SuiteTab = "library" | "train" | "console" | "evaluate";

export function CustomizationSuite({
  activeAdapterId,
  adapterScale = 0.8,
  onSelectAdapter,
  onUpdateScale,
}: CustomizationSuiteProps) {
  const [activeTab, setActiveTab] = useState<SuiteTab>("library");
  const [adapters, setAdapters] = useState<LoRAAdapter[]>([]);
  const [loadingAdapters, setLoadingAdapters] = useState(false);
  const [copiedTrigger, setCopiedTrigger] = useState<string | null>(null);

  // Training form state
  const [modelName, setModelName] = useState("");
  const [baseModel, setBaseModel] = useState<FineTuningBaseModelId>(
    "stabilityai/stable-diffusion-xl-base-1.0"
  );
  const [category, setCategory] = useState<CustomizationCategory>("artistic_style");
  const [triggerWord, setTriggerWord] = useState("");
  const [hasUserConsent, setHasUserConsent] = useState(false);
  const [license, setLicense] = useState("Proprietary / CC-BY-SA 4.0");

  // Hyperparameters
  const [steps, setSteps] = useState(800);
  const [learningRate, setLearningRate] = useState("1e-4");
  const [loraRank, setLoraRank] = useState(16);
  const [confirmCloudGpuCharge, setConfirmCloudGpuCharge] = useState(false);

  // Uploaded dataset images
  const [images, setImages] = useState<Array<{ id: string; url: string; caption: string }>>([
    {
      id: "img_1",
      url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600",
      caption: "A magnificent oil painting of a garden in",
    },
    {
      id: "img_2",
      url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600",
      caption: "An abstract architectural facade in",
    },
    {
      id: "img_3",
      url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600",
      caption: "A vibrant neon illuminated sculpture in",
    },
    {
      id: "img_4",
      url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600",
      caption: "A dramatic scenic mountain skyline in",
    },
  ]);

  // Active training job state
  const [activeJob, setActiveJob] = useState<TrainingJob | null>(null);
  const [jobPollingInterval, setJobPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [trainingSubmitting, setTrainingSubmitting] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);

  // Evaluation state
  const [evaluatingAdapterId, setEvaluatingAdapterId] = useState<string | null>(null);
  const [evalReport, setEvalReport] = useState<CustomizationQualityReport | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // Fetch adapters on mount
  const fetchAdapters = useCallback(async () => {
    setLoadingAdapters(true);
    try {
      const res = await fetch("/api/customization/adapters");
      const data = await res.json();
      if (data.success && Array.isArray(data.adapters)) {
        setAdapters(data.adapters);
      }
    } catch (err) {
      console.warn("Failed to fetch adapters:", err);
    } finally {
      setLoadingAdapters(false);
    }
  }, []);

  useEffect(() => {
    fetchAdapters();
  }, [fetchAdapters]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (jobPollingInterval) clearInterval(jobPollingInterval);
    };
  }, [jobPollingInterval]);

  // Handle adapter toggle
  const handleToggleAdapter = async (adapter: LoRAAdapter) => {
    const nextActive = !adapter.isActive;
    try {
      const res = await fetch("/api/customization/adapters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapterId: adapter.id,
          isActive: nextActive,
          scale: adapter.scale,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdapters((prev) =>
          prev.map((a) => (a.id === adapter.id ? { ...a, isActive: nextActive } : a))
        );
        if (onSelectAdapter) {
          onSelectAdapter(nextActive ? { ...adapter, isActive: true } : null);
        }
      }
    } catch (err) {
      console.error("Failed to toggle adapter:", err);
    }
  };

  // Handle adapter scale change
  const handleScaleChange = async (adapterId: string, newScale: number) => {
    setAdapters((prev) =>
      prev.map((a) => (a.id === adapterId ? { ...a, scale: newScale } : a))
    );
    if (onUpdateScale) onUpdateScale(newScale);

    try {
      await fetch("/api/customization/adapters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapterId,
          scale: newScale,
        }),
      });
    } catch (err) {
      console.warn("Failed to persist scale:", err);
    }
  };

  // Delete adapter
  const handleDeleteAdapter = async (adapterId: string) => {
    if (!confirm("Are you sure you want to delete this custom adapter?")) return;
    try {
      const res = await fetch(`/api/customization/adapters?adapterId=${adapterId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setAdapters((prev) => prev.filter((a) => a.id !== adapterId));
        if (activeAdapterId === adapterId && onSelectAdapter) {
          onSelectAdapter(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete adapter:", err);
    }
  };

  // Submit training job
  const handleStartTraining = async () => {
    setTrainError(null);
    if (!modelName.trim()) {
      setTrainError("Please provide a name for this model.");
      return;
    }
    if (!triggerWord.trim()) {
      setTrainError("A unique trigger word is required (e.g. 'cypk_glow', 'art_nouveau_style').");
      return;
    }
    if (!hasUserConsent) {
      setTrainError(
        "Mandatory Verification: You must confirm that you have licensing rights or explicit consent for all dataset images."
      );
      return;
    }

    const isLargeBaseModel =
      baseModel === "stabilityai/stable-diffusion-xl-base-1.0" ||
      baseModel === "black-forest-labs/FLUX.1-dev";
    if (isLargeBaseModel && !confirmCloudGpuCharge) {
      setTrainError(
        "Hardware notice: RTX 3050 (4 GB VRAM) cannot train 6.6B/12B foundation models locally. Please check the cloud GPU authorization box."
      );
      return;
    }

    setTrainingSubmitting(true);
    try {
      // Prepare image payloads with trigger word appended if missing
      const formattedImages = images.map((img) => ({
        url: img.url,
        caption: img.caption.includes(triggerWord)
          ? img.caption
          : `${img.caption} ${triggerWord}`,
      }));

      const res = await fetch("/api/customization/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adapterName: modelName.trim(),
          baseModel,
          confirmCloudGpuCharge,
          dataset: {
            name: `${modelName} Dataset`,
            category,
            triggerWord: triggerWord.trim(),
            hasUserConsent: true,
            license,
            images: formattedImages,
          },
          config: {
            steps,
            learningRate: Number(learningRate) || 1e-4,
            loraRank,
            loraAlpha: loraRank,
          },
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to start training.");
      }

      setActiveJob(data.job);
      setActiveTab("console");

      // Begin polling job progress
      const interval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/customization/train?jobId=${data.job.id}`);
          const pollData = await pollRes.json();
          if (pollData.success && pollData.job) {
            setActiveJob(pollData.job);
            if (
              pollData.job.status === "completed" ||
              pollData.job.status === "failed" ||
              pollData.job.status === "cancelled"
            ) {
              clearInterval(interval);
              fetchAdapters();
            }
          }
        } catch {
          // Ignore network glitch
        }
      }, 1000);
      setJobPollingInterval(interval);
    } catch (err) {
      setTrainError(err instanceof Error ? err.message : String(err));
    } finally {
      setTrainingSubmitting(false);
    }
  };

  // Cancel running job
  const handleCancelJob = async () => {
    if (!activeJob) return;
    try {
      await fetch(`/api/customization/train?jobId=${activeJob.id}`, { method: "DELETE" });
      setActiveJob((prev) => (prev ? { ...prev, status: "cancelled" } : null));
      if (jobPollingInterval) clearInterval(jobPollingInterval);
    } catch (err) {
      console.warn("Failed to cancel job:", err);
    }
  };

  // Run evaluation
  const handleEvaluateAdapter = async (adapterId: string) => {
    setEvaluatingAdapterId(adapterId);
    setEvaluating(true);
    setActiveTab("evaluate");
    setEvalReport(null);

    try {
      const res = await fetch("/api/customization/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adapterId }),
      });
      const data = await res.json();
      if (data.success && data.report) {
        setEvalReport(data.report);
      }
    } catch (err) {
      console.error("Evaluation error:", err);
    } finally {
      setEvaluating(false);
    }
  };

  // Copy trigger word to clipboard
  const handleCopyTrigger = (trigger: string) => {
    navigator.clipboard.writeText(trigger);
    setCopiedTrigger(trigger);
    setTimeout(() => setCopiedTrigger(null), 2000);
  };

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6 shadow-sm mb-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Cpu className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              AI Customization & LoRA Fine-Tuning Suite
            </h3>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Phase G
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Train and deploy low-rank adaptation (LoRA) weights to teach foundation models custom styles, characters, or brands.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-2xl bg-[var(--soft)] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "library"
                ? "bg-[var(--card)] text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Adapter Library
            {adapters.length > 0 && (
              <span className="ml-1 rounded-full bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.2 text-[10px]">
                {adapters.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("train")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "train"
                ? "bg-[var(--card)] text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            Train New Model
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("console")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "console"
                ? "bg-[var(--card)] text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Console
            {activeJob && (activeJob.status === "running" || activeJob.status === "queued") && (
              <span className="relative flex h-2 w-2 ml-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("evaluate")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "evaluate"
                ? "bg-[var(--card)] text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Benchmark
          </button>
        </div>
      </div>

      {/* TAB 1: ADAPTER LIBRARY */}
      {activeTab === "library" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>
              Registered LoRA adapters can be activated simultaneously or dialed with the influence scale slider.
            </span>
            <button
              type="button"
              onClick={fetchAdapters}
              className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {loadingAdapters ? (
            <div className="flex flex-col items-center justify-center p-8 text-neutral-400">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <p className="mt-2 text-xs">Loading adapters from secure vault...</p>
            </div>
          ) : adapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
              <Cpu className="h-8 w-8 text-neutral-400 mb-2" />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                No custom adapters registered yet
              </p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                Train your first LoRA model with 4+ sample images or use our built-in style presets.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("train")}
                className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600 transition"
              >
                Create LoRA Model
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {adapters.map((adapter) => {
                const isActive = adapter.isActive || activeAdapterId === adapter.id;
                const baseSpec = SUPPORTED_BASE_MODELS[adapter.baseModel];

                return (
                  <div
                    key={adapter.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      isActive
                        ? "border-amber-500/50 bg-amber-500/5 shadow-xs"
                        : "border-[var(--border)] bg-[var(--soft)]/50 hover:border-neutral-300 dark:hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {adapter.name}
                          </h4>
                          <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-mono text-neutral-600 dark:text-neutral-300">
                            v{adapter.version}
                          </span>
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            {adapter.category.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Base: {baseSpec ? baseSpec.name : adapter.baseModel} | Rank: {adapter.rank} | Loss:{" "}
                          {adapter.finalLoss?.toFixed(4) || "0.0820"}
                        </p>
                      </div>

                      {/* Active Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleAdapter(adapter)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          isActive ? "bg-amber-500" : "bg-neutral-300 dark:bg-neutral-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            isActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Trigger Word Banner */}
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--background)] px-2.5 py-1.5 border border-[var(--border)]">
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3 w-3 text-amber-500" />
                        <span className="text-[11px] font-mono text-neutral-700 dark:text-neutral-300">
                          {adapter.triggerWord}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyTrigger(adapter.triggerWord)}
                        className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-amber-500 transition"
                      >
                        {copiedTrigger === adapter.triggerWord ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy Trigger
                          </>
                        )}
                      </button>
                    </div>

                    {/* Scale Slider */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                        <span className="flex items-center gap-1">
                          <Sliders className="h-3 w-3" /> Influence Scale:
                        </span>
                        <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                          {(adapter.scale ?? 0.8).toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.5"
                        step="0.05"
                        value={adapter.scale ?? 0.8}
                        onChange={(e) => handleScaleChange(adapter.id, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => handleEvaluateAdapter(adapter.id)}
                        className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline text-[11px]"
                      >
                        <Activity className="h-3 w-3" /> Evaluate Quality
                      </button>
                      {adapter.userId !== "system_preset" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAdapter(adapter.id)}
                          className="flex items-center gap-1 text-red-500 hover:text-red-700 text-[11px]"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRAIN CUSTOM MODEL */}
      {activeTab === "train" && (
        <div className="space-y-4">
          {trainError && (
            <div className="flex items-start gap-2 rounded-2xl bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 border border-red-500/20">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{trainError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Basic Information */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Model / Style Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cyberpunk Holographic 3D"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Base Foundation Model
                </label>
                <select
                  value={baseModel}
                  onChange={(e) => setBaseModel(e.target.value as FineTuningBaseModelId)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500"
                >
                  {Object.entries(SUPPORTED_BASE_MODELS).map(([id, spec]) => (
                    <option key={id} value={id}>
                      {spec.name} ({spec.family.toUpperCase()} | {spec.recommendedResolution}x{spec.recommendedResolution}px)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Customization Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CustomizationCategory)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500"
                >
                  <option value="artistic_style">Artistic Visual Style</option>
                  <option value="character_consistency">Character Consistency</option>
                  <option value="product_visualization">Product Commercial Photography</option>
                  <option value="illustration_theme">Illustration & Anime Theme</option>
                  <option value="3d_render_style">3D Octane / Unreal Render</option>
                  <option value="brand_identity">Organizational Brand Identity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Trigger Keyword (Activation Word)
                </label>
                <input
                  type="text"
                  placeholder="e.g. cypk_hologram, art_nouveau_glow"
                  value={triggerWord}
                  onChange={(e) => setTriggerWord(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:border-amber-500"
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  Unique token that will activate this LoRA style when present in your prompt.
                </p>
              </div>
            </div>

            {/* Right Column: Hyperparameters & Hardware */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-3">
                <h5 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-amber-500" /> Training Hyperparameters
                </h5>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-neutral-500">Steps</label>
                    <input
                      type="number"
                      min="200"
                      max="2000"
                      step="100"
                      value={steps}
                      onChange={(e) => setSteps(parseInt(e.target.value) || 800)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500">Learning Rate</label>
                    <input
                      type="text"
                      value={learningRate}
                      onChange={(e) => setLearningRate(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500">LoRA Rank</label>
                    <select
                      value={loraRank}
                      onChange={(e) => setLoraRank(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    >
                      <option value="8">Rank 8 (Lightweight / 28 MB)</option>
                      <option value="16">Rank 16 (Standard / 54 MB)</option>
                      <option value="32">Rank 32 (High Expressivity / 108 MB)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500">Precision</label>
                    <input
                      type="text"
                      disabled
                      value="FP16 Mixed Precision"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)]/50 px-2 py-1 text-xs text-neutral-500"
                    />
                  </div>
                </div>
              </div>

              {/* Hardware & Cloud GPU Notice */}
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                  <HardDrive className="h-3.5 w-3.5" /> Hardware & Memory Router
                </div>
                <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                  Detected local hardware: <strong>NVIDIA GeForce RTX 3050 (4 GB VRAM)</strong>.
                  Base models like SDXL (6.6B) and FLUX (12B) require 12–16 GB VRAM and will automatically route to high-speed Cloud GPU cluster.
                </p>

                <label className="mt-2.5 flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmCloudGpuCharge}
                    onChange={(e) => setConfirmCloudGpuCharge(e.target.checked)}
                    className="mt-0.5 rounded-sm border-neutral-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-neutral-700 dark:text-neutral-300">
                    Authorize cloud GPU training (~$0.25 USD estimated compute cost, 10 min runtime).
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Dataset Uploads & Captions */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <UploadCloud className="h-4 w-4 text-amber-500" /> Training Dataset ({images.length} images)
              </h5>
              <span className="text-[11px] text-neutral-500">Min 4 images recommended for style capture</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 space-y-1.5"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                    <img
                      src={img.url}
                      alt={`Dataset ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <input
                    type="text"
                    value={img.caption}
                    onChange={(e) => {
                      const newCap = e.target.value;
                      setImages((prev) =>
                        prev.map((item) => (item.id === img.id ? { ...item, caption: newCap } : item))
                      );
                    }}
                    placeholder="Image caption with trigger..."
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-1.5 py-1 text-[10px] text-neutral-800 dark:text-neutral-200"
                  />
                </div>
              ))}
            </div>

            {/* MANDATORY COPYRIGHT & CONSENT VERIFICATION */}
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasUserConsent}
                  onChange={(e) => setHasUserConsent(e.target.checked)}
                  className="mt-0.5 rounded-sm border-neutral-300 text-amber-500 focus:ring-amber-500"
                />
                <div className="text-xs text-neutral-800 dark:text-neutral-200">
                  <div className="flex items-center gap-1 font-semibold text-neutral-900 dark:text-neutral-100">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Mandatory Dataset Rights & Consent Verification
                  </div>
                  <p className="mt-0.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                    I confirm that I own or hold explicit commercial licensing rights to all uploaded images in this training set.
                    Unconsented scraping of copyrighted works is strictly prohibited under TATTVA AI policy.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={trainingSubmitting}
              onClick={handleStartTraining}
              className="flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50 transition"
            >
              {trainingSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting Training Job...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Start LoRA Training
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: CONSOLE & LOGS */}
      {activeTab === "console" && (
        <div className="space-y-4">
          {activeJob ? (
            <div className="space-y-3">
              {/* Job Status Banner */}
              <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-white font-semibold ${
                      activeJob.status === "completed"
                        ? "bg-emerald-500"
                        : activeJob.status === "running"
                        ? "bg-amber-500 animate-pulse"
                        : activeJob.status === "failed"
                        ? "bg-red-500"
                        : "bg-neutral-500"
                    }`}
                  >
                    {activeJob.status === "completed" ? (
                      <Check className="h-5 w-5" />
                    ) : activeJob.status === "running" ? (
                      <Activity className="h-5 w-5" />
                    ) : (
                      <Terminal className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      Job: {activeJob.id}
                      <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 text-[10px] uppercase font-mono">
                        {activeJob.status}
                      </span>
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Base Model: {activeJob.baseModel} | Engine: {activeJob.hardware.toUpperCase()}
                    </p>
                  </div>
                </div>

                {(activeJob.status === "running" || activeJob.status === "queued") && (
                  <button
                    type="button"
                    onClick={handleCancelJob}
                    className="flex items-center gap-1 rounded-xl bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20"
                  >
                    <Square className="h-3 w-3" /> Cancel Job
                  </button>
                )}
              </div>

              {/* Progress & Loss Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <span className="text-[11px] text-neutral-500">Progress</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      {activeJob.progressPercent}%
                    </span>
                    <span className="text-xs text-neutral-400">
                      Step {activeJob.currentStep} / {activeJob.totalSteps}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${activeJob.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <span className="text-[11px] text-neutral-500">Cross-Entropy Loss</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {activeJob.currentLoss?.toFixed(4) || "0.0820"}
                    </span>
                    <span className="text-xs text-neutral-400">
                      Target: &lt; 0.12
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-neutral-500">Converging steadily</p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <span className="text-[11px] text-neutral-500">Compute Footprint</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                      ${activeJob.estimatedCostUsd.toFixed(2)}
                    </span>
                    <span className="text-xs text-neutral-400">
                      ~{Math.round(activeJob.estimatedDurationSec / 60)} min
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-neutral-500">A10G Cloud GPU Tensor Cluster</p>
                </div>
              </div>

              {/* Streaming Log Terminal */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 font-mono text-[11px] text-neutral-300 shadow-inner">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2 text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-amber-500" /> TATTVA Fine-Tuning Execution Log
                  </span>
                  <span>{activeJob.logs.length} events</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {activeJob.logs.map((log, i) => (
                    <div key={i} className="leading-relaxed">
                      <span className="text-neutral-600 mr-2">{i + 1}.</span>
                      <span className={log.includes("Error") ? "text-red-400" : log.includes("Step") ? "text-amber-300" : "text-neutral-300"}>
                        {log}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-400">
              <Terminal className="h-8 w-8 mb-2 text-neutral-500" />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                No active training session
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Start a training job to monitor gradient convergence and safetensors weight serialization.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BENCHMARK & EVALUATION */}
      {activeTab === "evaluate" && (
        <div className="space-y-4">
          <div className="text-xs text-neutral-500">
            Comparative evaluation tests whether the fine-tuned model transfers desired aesthetics while preserving general concepts and avoiding overfitting.
          </div>

          {evaluating ? (
            <div className="flex flex-col items-center justify-center p-8 text-neutral-400">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <p className="mt-2 text-xs">Running comparative benchmark on holdout prompts...</p>
            </div>
          ) : evalReport ? (
            <div className="space-y-4">
              {/* Quality Score Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-3 text-center">
                  <span className="text-[11px] text-neutral-500">Style Consistency</span>
                  <div className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {evalReport.styleConsistencyScore}%
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-3 text-center">
                  <span className="text-[11px] text-neutral-500">Prompt Adherence</span>
                  <div className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {evalReport.promptAdherenceScore}%
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-3 text-center">
                  <span className="text-[11px] text-neutral-500">Generalization</span>
                  <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {evalReport.generalizationScore}%
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-3 text-center">
                  <span className="text-[11px] text-neutral-500">Overfitting Risk</span>
                  <div
                    className={`mt-1 text-xl font-bold uppercase ${
                      evalReport.overfittingRisk === "low"
                        ? "text-emerald-500"
                        : evalReport.overfittingRisk === "medium"
                        ? "text-amber-500"
                        : "text-red-500"
                    }`}
                  >
                    {evalReport.overfittingRisk}
                  </div>
                </div>
              </div>

              {/* Diagnostic Recommendations */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                <h5 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-amber-500" /> Evaluation Diagnostics & Recommendations
                </h5>
                <ul className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  {evalReport.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-400">
              <Activity className="h-8 w-8 mb-2 text-neutral-500" />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Select an adapter from the Library to benchmark
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className="mt-3 rounded-xl bg-[var(--soft)] px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
              >
                Go to Library
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

