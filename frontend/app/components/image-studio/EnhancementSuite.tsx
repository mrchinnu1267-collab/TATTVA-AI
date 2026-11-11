"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Sparkles,
  Maximize2,
  Sliders,
  Check,
  Download,
  FolderPlus,
  Loader2,
  ShieldCheck,
  Info,
  Layers,
  ArrowRight,
  Eye,
  RefreshCw,
  Zap,
} from "lucide-react";
import type {
  EnhancementOperation,
  ImageEnhancementResult,
  SuperResolutionModelId,
} from "../../lib/image-engine/upscaler/types";
import { triggerDownload } from "../../lib/download-helper";

interface EnhancementSuiteProps {
  baseImage: string | null;
  onImageEnhanced?: (result: ImageEnhancementResult) => void;
  isLoading?: boolean;
}

export function EnhancementSuite({
  baseImage,
  onImageEnhanced,
  isLoading = false,
}: EnhancementSuiteProps) {
  const [scale, setScale] = useState<2 | 4>(2);
  const [operations, setOperations] = useState<EnhancementOperation[]>([
    "upscale_2x",
    "detail_enhance",
    "noise_reduction",
    "sharpening",
  ]);
  const [preserveFaces, setPreserveFaces] = useState(true);
  const [preserveColors, setPreserveColors] = useState(true);
  const [preserveText, setPreserveText] = useState(true);
  const [modelChoice, setModelChoice] = useState<"auto" | SuperResolutionModelId>("auto");

  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ImageEnhancementResult | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [savedToWorkspace, setSavedToWorkspace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const toggleOperation = (op: EnhancementOperation) => {
    setOperations((prev) =>
      prev.includes(op) ? prev.filter((item) => item !== op) : [...prev, op]
    );
  };

  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleSliderMove(e.clientX);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  const handleEnhance = async () => {
    if (!baseImage) return;
    setProcessing(true);
    setError(null);
    setSavedToWorkspace(false);

    try {
      const activeOps: EnhancementOperation[] = [
        scale === 4 ? "upscale_4x" : "upscale_2x",
        ...operations.filter((op) => op !== "upscale_2x" && op !== "upscale_4x"),
      ];

      const res = await fetch("/api/image/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: baseImage,
          scale,
          operations: activeOps,
          model: modelChoice,
          preserveFaces,
          preserveColors,
          preserveText,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as ImageEnhancementResult;
      setResult(data);
      onImageEnhanced?.(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result?.enhancedImage) return;
    triggerDownload(result.enhancedImage, `tattva-enhanced-${result.scaleFactor}x-${Date.now()}.png`);
  };

  const handleSaveToWorkspace = async () => {
    if (!result?.enhancedImage) return;
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `enhanced-image-${result.scaleFactor}x.png`,
          content: result.enhancedImage,
          type: "image/png",
          metadata: {
            scale: result.scaleFactor,
            model: result.modelUsed,
            psnr: result.metrics.psnr,
            ssim: result.metrics.ssim,
          },
        }),
      });
      if (res.ok) {
        setSavedToWorkspace(true);
        setTimeout(() => setSavedToWorkspace(false), 3000);
      }
    } catch (err) {
      console.warn("[TATTVA Workspace] Save failed:", err);
    }
  };

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              AI Super-Resolution & Enhancement
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Phase F
              </span>
            </h3>
            <p className="text-xs text-neutral-500">
              Transform low-resolution images into crisp, high-definition assets with identity preservation.
            </p>
          </div>
        </div>

        {/* Scale Selector */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-1">
          <button
            type="button"
            onClick={() => setScale(2)}
            className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
              scale === 2
                ? "bg-[var(--card)] text-amber-600 shadow-sm dark:text-amber-400"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            2× Upscale
          </button>
          <button
            type="button"
            onClick={() => setScale(4)}
            className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
              scale === 4
                ? "bg-[var(--card)] text-amber-600 shadow-sm dark:text-amber-400"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            4× Super-Res
          </button>
        </div>
      </div>

      {/* Main Grid: Controls & Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-4 lg:col-span-5">
          {/* Operation Toggles */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-neutral-500" />
              Enhancement Operations
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { id: "detail_enhance" as const, label: "AI Detail Recovery", desc: "Hallucinate subtle textures" },
                { id: "noise_reduction" as const, label: "Noise Reduction", desc: "Suppress camera/ISO noise" },
                { id: "artifact_removal" as const, label: "Artifact Removal", desc: "Clear JPEG blocking" },
                { id: "sharpening" as const, label: "Edge Sharpening", desc: "Enhance contour clarity" },
                { id: "color_contrast_enhance" as const, label: "Color & Contrast", desc: "Dynamic range optimization" },
              ].map((op) => {
                const active = operations.includes(op.id);
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => toggleOperation(op.id)}
                    className={`flex flex-col text-left rounded-2xl border p-2.5 transition-all ${
                      active
                        ? "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300"
                        : "border-[var(--border)] bg-[var(--soft)] text-neutral-600 dark:text-neutral-400 hover:border-neutral-400"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-medium">{op.label}</span>
                      {active && <Check className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-0.5">{op.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preservation Guardrails */}
          <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-3">
            <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Strict Preservation Guardrails
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-neutral-600 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={preserveFaces}
                  onChange={(e) => setPreserveFaces(e.target.checked)}
                  className="rounded border-[var(--border)] text-amber-500 focus:ring-amber-500"
                />
                Face Identity
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-neutral-600 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={preserveColors}
                  onChange={(e) => setPreserveColors(e.target.checked)}
                  className="rounded border-[var(--border)] text-amber-500 focus:ring-amber-500"
                />
                RGB Color Fidelity
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-neutral-600 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={preserveText}
                  onChange={(e) => setPreserveText(e.target.checked)}
                  className="rounded border-[var(--border)] text-amber-500 focus:ring-amber-500"
                />
                Text & Typography
              </label>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Super-Resolution Model
            </label>
            <select
              value={modelChoice}
              onChange={(e) => setModelChoice(e.target.value as any)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="auto">Auto-Router (VRAM & Subject Aware)</option>
              <option value="real-esrgan-x4plus">Real-ESRGAN x4plus (Photographic)</option>
              <option value="real-esrgan-anime-6b">Real-ESRGAN Anime 6B (Illustrations)</option>
              <option value="swinir-realworld-sr">SwinIR Real-World (Transformer SR)</option>
              <option value="gfpgan-face-restore">GFPGAN v1.4 (Facial Landmark Restore)</option>
              <option value="neural-bilateral-lanczos">TATTVA Neural Bilateral Lanczos (Zero-VRAM)</option>
            </select>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleEnhance}
            disabled={!baseImage || processing || isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-xs font-semibold text-black transition-all hover:bg-amber-400 disabled:opacity-50 shadow-md shadow-amber-500/20"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enhancing Image ({scale}× Neural Pipeline)…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Enhance Image ({scale}×)
              </>
            )}
          </button>
        </div>

        {/* Preview & Before/After Slider Column */}
        <div className="space-y-4 lg:col-span-7">
          {/* Visual Container */}
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchMove={handleTouchMove}
            className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-neutral-950 aspect-square select-none max-h-[460px] flex items-center justify-center"
          >
            {!baseImage ? (
              <div className="text-center p-6 text-neutral-500">
                <Layers className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Upload or generate an image to activate AI Super-Resolution.</p>
              </div>
            ) : !result ? (
              // Original Preview before enhancement
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={baseImage}
                  alt="Original Low-Res Preview"
                  className="max-h-full max-w-full object-contain"
                />
                <span className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-md">
                  Original Image
                </span>
              </div>
            ) : (
              // Interactive Before/After Split Slider
              <div className="relative w-full h-full overflow-hidden">
                {/* Enhanced Image (Background full) */}
                <img
                  src={result.enhancedImage}
                  alt="Enhanced Result"
                  className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                />

                {/* Original Image (Clipped by slider position) */}
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={baseImage}
                    alt="Original Input"
                    className="absolute inset-0 h-full w-full object-contain"
                    style={{ width: containerRef.current?.clientWidth || "100%", maxWidth: "none" }}
                  />
                </div>

                {/* Vertical Divider Line with Grab Handle */}
                <div
                  onMouseDown={handleMouseDown}
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="h-7 w-7 rounded-full bg-white text-neutral-900 shadow-md flex items-center justify-center text-[10px] font-bold">
                    ⇄
                  </div>
                </div>

                {/* Labels */}
                <span className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-md z-10">
                  Original
                </span>
                <span className="absolute top-3 right-3 rounded-full bg-amber-500/90 px-2.5 py-1 text-[10px] font-semibold text-black backdrop-blur-md z-10">
                  Enhanced ({result.scaleFactor}×)
                </span>
              </div>
            )}
          </div>

          {/* Stats & Quality Scorecard (When Result Exists) */}
          {result && (
            <div className="space-y-3">
              {/* Image Dimensional Comparison */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-3 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 block">Resolution</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {result.originalWidth}×{result.originalHeight} → {result.enhancedWidth}×{result.enhancedHeight}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block">File Size</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {Math.round(result.originalSizeBytes / 1024)} KB → {Math.round(result.enhancedSizeBytes / 1024)} KB
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block">Model Architecture</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 truncate block">
                    {result.modelName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block">Latency</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {(result.latencyMs / 1000).toFixed(2)}s
                  </span>
                </div>
              </div>

              {/* Quality Metrics Scorecard */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Quality & Structural Similarity Scorecard
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--soft)] p-2">
                    <span className="text-[10px] text-neutral-400 block">PSNR (Fidelity)</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{result.metrics.psnr} dB</span>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--soft)] p-2">
                    <span className="text-[10px] text-neutral-400 block">SSIM (Structure)</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{result.metrics.ssim}</span>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--soft)] p-2">
                    <span className="text-[10px] text-neutral-400 block">Sharpness Gain</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">+{result.metrics.sharpnessGainPercent}%</span>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--soft)] p-2">
                    <span className="text-[10px] text-neutral-400 block">Color Alignment</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{result.metrics.colorFidelityScore}%</span>
                  </div>
                </div>

                <p className="text-[10px] text-neutral-400 leading-relaxed pt-1">
                  {result.metrics.explanation}
                </p>
              </div>

              {/* Action Buttons: Download & Save */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 dark:bg-neutral-100 px-4 py-2.5 text-xs font-semibold text-white dark:text-neutral-900 hover:opacity-90 transition-all"
                >
                  <Download className="h-4 w-4" />
                  Download Enhanced Image
                </button>
                <button
                  type="button"
                  onClick={handleSaveToWorkspace}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-[var(--soft)] transition-all"
                >
                  {savedToWorkspace ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <FolderPlus className="h-4 w-4" />
                      Save to Workspace
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
