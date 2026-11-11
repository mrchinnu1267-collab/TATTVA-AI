"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Wand2,
  Paintbrush,
  Eraser,
  Square,
  Sparkles,
  RotateCcw,
  RotateCw,
  Layers,
  Download,
  Eye,
  Sliders,
  Scissors,
  Maximize2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Expand,
  Image as ImageIcon,
} from "lucide-react";
import type {
  EditingOperationType,
  EditingIntent,
  EditSnapshot,
  ImageEditingResult,
  DirectionalExpansion,
} from "../../lib/image-engine/editing/types";
import { triggerDownload } from "../../lib/download-helper";

interface EditingSuiteProps {
  baseImage: string | null;
  onImageEdited?: (result: ImageEditingResult) => void;
  isLoading?: boolean;
}

export function EditingSuite({
  baseImage,
  onImageEdited,
  isLoading = false,
}: EditingSuiteProps) {
  // Instruction & Intent state
  const [instruction, setInstruction] = useState("");
  const [detectedIntent, setDetectedIntent] = useState<EditingIntent | null>(null);
  const [detectingIntent, setDetectingIntent] = useState(false);

  // Active tool & mask parameters
  const [activeTool, setActiveTool] = useState<"brush" | "eraser" | "rectangle" | "auto">("brush");
  const [brushSize, setBrushSize] = useState(35);
  const [featherRadius, setFeatherRadius] = useState(4);
  const [dilationRadius, setDilationRadius] = useState(6);
  const [maskDataUri, setMaskDataUri] = useState<string | null>(null);
  const [showMaskOverlay, setShowMaskOverlay] = useState(true);

  // Outpainting expand offsets
  const [expandTop, setExpandTop] = useState(0);
  const [expandBottom, setExpandBottom] = useState(0);
  const [expandLeft, setExpandLeft] = useState(0);
  const [expandRight, setExpandRight] = useState(0);

  // Edit execution state
  const [processing, setProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<ImageEditingResult | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [error, setError] = useState<string | null>(null);

  // History stack for Undo/Redo
  const [history, setHistory] = useState<EditSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Canvas drawing refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const compareContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingCompare = useRef(false);

  // Debounced Intent Detection
  useEffect(() => {
    if (!instruction.trim() || instruction.length < 3) {
      setDetectedIntent(null);
      return;
    }

    const timer = setTimeout(async () => {
      setDetectingIntent(true);
      try {
        const res = await fetch("/api/image/edit/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction }),
        });
        const data = await res.json();
        if (data.success && data.intent) {
          setDetectedIntent(data.intent);
        }
      } catch {
        // Ignore network glitches
      } finally {
        setDetectingIntent(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [instruction]);

  // Initialize Canvas
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset canvas to transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  // Handle Canvas Drawing
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    draw(e);
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setMaskDataUri(canvas.toDataURL("image/png"));
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (activeTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      // Pure white with 80% opacity for mask overlay visualization
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  // Clear Mask
  const handleClearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setMaskDataUri(null);
  };

  // Invert Mask
  const handleInvertMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const alpha = d[i + 3];
      // Invert: if pixel was drawn, make transparent; if transparent, fill with white
      if (alpha > 30) {
        d[i + 3] = 0;
      } else {
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
        d[i + 3] = 210;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    setMaskDataUri(canvas.toDataURL("image/png"));
  };

  // Auto-Segment Subject
  const handleAutoSegment = async () => {
    if (!baseImage) return;
    try {
      const res = await fetch("/api/image/edit/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ width: 1024, height: 1024 }),
      });
      const data = await res.json();
      if (data.success && data.mask) {
        setMaskDataUri(data.mask);
      }
    } catch {
      // Fallback: draw central ellipse
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height * 0.52, canvas.width * 0.28, canvas.height * 0.38, 0, 0, 2 * Math.PI);
      ctx.fill();
      setMaskDataUri(canvas.toDataURL("image/png"));
    }
  };

  // Execute Edit
  const handleExecuteEdit = async () => {
    if (!baseImage) {
      setError("Please generate or upload a base image first.");
      return;
    }
    if (!instruction.trim()) {
      setError("Please provide an editing instruction.");
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      const expand: DirectionalExpansion | undefined =
        expandTop || expandBottom || expandLeft || expandRight
          ? { top: expandTop, bottom: expandBottom, left: expandLeft, right: expandRight }
          : undefined;

      const res = await fetch("/api/image/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: baseImage,
          instruction: instruction.trim(),
          operation: detectedIntent?.operation,
          mask: maskDataUri || undefined,
          expand,
          maskOptions: {
            featherRadiusPx: featherRadius,
            dilationRadiusPx: dilationRadius,
          },
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Image editing failed.");
      }

      setCurrentResult(data);

      // Append to history stack
      const newSnapshot: EditSnapshot = {
        id: data.snapshotId || `snap_${Date.now()}`,
        operation: data.operation,
        instruction: instruction.trim(),
        imageUrl: data.editedImage,
        maskUrl: data.maskUsed,
        unmaskedPreservedPercent: data.unmaskedPreservedPercent,
        timestamp: new Date().toISOString(),
        dimensions: data.dimensions,
        isTransparentPng: data.isTransparent,
      };

      setHistory((prev) => [...prev.slice(0, historyIndex + 1), newSnapshot]);
      setHistoryIndex((prev) => prev + 1);

      if (onImageEdited) {
        onImageEdited(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessing(false);
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setHistoryIndex((prev) => prev - 1);
      setCurrentResult((prev) => (prev ? { ...prev, editedImage: target.imageUrl } : null));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setHistoryIndex((prev) => prev + 1);
      setCurrentResult((prev) => (prev ? { ...prev, editedImage: target.imageUrl } : null));
    }
  };

  // Compare Slider Dragging
  const handleCompareMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCompare.current || !compareContainerRef.current) return;
    const rect = compareContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setSliderPosition(Math.round((x / rect.width) * 100));
  };

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6 shadow-sm mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Wand2 className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              AI Image Editing & Natural-Language Manipulation
            </h3>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Phase H
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Select regions to replace, erase objects, swap backgrounds with transparent PNG export, or outpaint canvas borders.
          </p>
        </div>

        {/* Undo / Redo / History Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={historyIndex <= 0}
            onClick={handleUndo}
            title="Undo Edit"
            className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--soft)] px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 disabled:opacity-40 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Undo
          </button>
          <button
            type="button"
            disabled={historyIndex >= history.length - 1}
            onClick={handleRedo}
            title="Redo Edit"
            className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--soft)] px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 disabled:opacity-40 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
          >
            <RotateCw className="h-3.5 w-3.5" /> Redo
          </button>
          {history.length > 0 && (
            <span className="text-[11px] font-mono text-neutral-400 ml-1">
              v{historyIndex + 1}/{history.length}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 border border-red-500/20">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Interactive Canvas & Tool Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Canvas & Comparison */}
        <div className="lg:col-span-2 space-y-3">
          {/* Canvas Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTool("brush")}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                  activeTool === "brush"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                }`}
              >
                <Paintbrush className="h-3.5 w-3.5" /> Brush
              </button>
              <button
                type="button"
                onClick={() => setActiveTool("eraser")}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                  activeTool === "eraser"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                }`}
              >
                <Eraser className="h-3.5 w-3.5" /> Eraser
              </button>
              <button
                type="button"
                onClick={handleAutoSegment}
                className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 transition"
              >
                <Scissors className="h-3.5 w-3.5 text-amber-500" /> Auto-Segment
              </button>
              <button
                type="button"
                onClick={handleInvertMask}
                className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition"
                title="Invert Selection"
              >
                Invert
              </button>
              <button
                type="button"
                onClick={handleClearMask}
                className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs text-neutral-500 hover:text-red-500 transition"
                title="Clear Selection"
              >
                Clear
              </button>
            </div>

            {/* Brush Size Slider */}
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>Size:</span>
              <input
                type="range"
                min="10"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-20 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="font-mono text-[10px] w-6">{brushSize}px</span>
            </div>
          </div>

          {/* Canvas Viewport / Before-After Comparison */}
          {currentResult ? (
            <div className="space-y-2">
              <div
                ref={compareContainerRef}
                onMouseDown={() => (isDraggingCompare.current = true)}
                onMouseUp={() => (isDraggingCompare.current = false)}
                onMouseLeave={() => (isDraggingCompare.current = false)}
                onMouseMove={handleCompareMouseMove}
                className="relative aspect-square w-full rounded-2xl overflow-hidden border border-[var(--border)] cursor-ew-resize select-none bg-[var(--soft)]"
              >
                {/* Background Pattern for Transparency */}
                {currentResult.isTransparent && (
                  <div className="absolute inset-0 bg-[radial-gradient(#ccc_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                )}

                {/* Base Image (Underneath) */}
                {baseImage && (
                  <img
                    src={baseImage}
                    alt="Original"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )}

                {/* Edited Image (Clipped by Slider) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={currentResult.editedImage}
                    alt="Edited"
                    className="absolute inset-0 h-full w-full object-contain max-w-none"
                    style={{ width: compareContainerRef.current?.clientWidth || "100%" }}
                  />
                </div>

                {/* Split Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md text-neutral-800 text-[10px] font-bold">
                    ↔
                  </div>
                </div>

                {/* Badges */}
                <span className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-xs">
                  Edited ({sliderPosition}%)
                </span>
                <span className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-xs">
                  Original
                </span>
              </div>

              {/* Preservation Banner */}
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Unmasked Area Preservation Guarantee:
                </span>
                <span className="font-mono font-bold">
                  {currentResult.unmaskedPreservedPercent.toFixed(1)}% pixels preserved
                </span>
              </div>
            </div>
          ) : (
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--soft)] flex items-center justify-center">
              {baseImage ? (
                <>
                  <img
                    src={baseImage}
                    alt="Canvas Base"
                    className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                  />
                  {/* Drawing Mask Layer */}
                  <canvas
                    ref={canvasRef}
                    width={1024}
                    height={1024}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onMouseMove={draw}
                    className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
                    style={{ opacity: showMaskOverlay ? 0.75 : 0 }}
                  />
                </>
              ) : (
                <div className="text-center p-6 text-neutral-400">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 text-neutral-500" />
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    No active image loaded
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Generate an image above or upload one to start editing.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Instruction Box, Intent Details & Action Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
              Natural-Language Editing Instruction
            </label>
            <textarea
              rows={3}
              placeholder="e.g. 'Remove the photobomber in the background', 'Change the car color to emerald green', 'Remove background and make transparent'..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Live Intent Classification Feedback */}
          {detectedIntent && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-500">Detected Intent:</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">
                  {detectedIntent.operation.replace(/_/g, " ")}
                </span>
              </div>

              {detectedIntent.isAmbiguous && (
                <div className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400 text-[11px] bg-amber-500/10 p-2 rounded-xl">
                  <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{detectedIntent.clarificationPrompt}</span>
                </div>
              )}

              {detectedIntent.targetSubject && (
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  Target: <strong>{detectedIntent.targetSubject}</strong>
                </div>
              )}
              {detectedIntent.replacementSubject && (
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  Replacement: <strong>{detectedIntent.replacementSubject}</strong>
                </div>
              )}
            </div>
          )}

          {/* Outpainting Boundary Offsets (Collapsible if outpaint) */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-3">
            <h5 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-1.5">
              <Expand className="h-3.5 w-3.5 text-amber-500" /> Canvas Boundary Outpainting (px)
            </h5>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-neutral-500">Top Expand</label>
                <input
                  type="number"
                  min="0"
                  max="512"
                  step="64"
                  value={expandTop}
                  onChange={(e) => setExpandTop(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-neutral-500">Bottom Expand</label>
                <input
                  type="number"
                  min="0"
                  max="512"
                  step="64"
                  value={expandBottom}
                  onChange={(e) => setExpandBottom(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-neutral-500">Left Expand</label>
                <input
                  type="number"
                  min="0"
                  max="512"
                  step="64"
                  value={expandLeft}
                  onChange={(e) => setExpandLeft(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-neutral-500">Right Expand</label>
                <input
                  type="number"
                  min="0"
                  max="512"
                  step="64"
                  value={expandRight}
                  onChange={(e) => setExpandRight(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Mask Boundary Feathering & Dilation Controls */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--soft)] p-3 space-y-2">
            <h5 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-amber-500" /> Seam Blending Controls
            </h5>
            <div className="flex items-center justify-between text-[11px] text-neutral-500">
              <span>Feathering (Soft Blur):</span>
              <span className="font-mono font-semibold">{featherRadius}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="16"
              value={featherRadius}
              onChange={(e) => setFeatherRadius(parseInt(e.target.value))}
              className="w-full h-1 bg-neutral-300 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
              <span>Edge Dilation (Expansion):</span>
              <span className="font-mono font-semibold">{dilationRadius}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              value={dilationRadius}
              onChange={(e) => setDilationRadius(parseInt(e.target.value))}
              className="w-full h-1 bg-neutral-300 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Action Trigger Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              disabled={processing || !baseImage || !instruction.trim()}
              onClick={handleExecuteEdit}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50 transition"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Performing AI Edit...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" /> Apply AI Edit
                </>
              )}
            </button>

            {currentResult && (
              <button
                type="button"
                onClick={() =>
                  triggerDownload(
                    currentResult.editedImage,
                    `tattva-edited-${Date.now()}.${currentResult.isTransparent ? "png" : "jpg"}`
                  )
                }
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--soft)] py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
              >
                <Download className="h-3.5 w-3.5" /> Download Edited Image {currentResult.isTransparent && "(Transparent PNG)"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

