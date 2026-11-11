"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Brush,
  Eraser,
  RotateCcw,
  Undo2,
  Redo2,
  Maximize2,
  Layers,
  Sparkles,
  Columns2,
  Check,
  X,
  Plus,
  Trash2,
  Compass,
} from "lucide-react";
import type { SpatialBoundingBox, SceneDepthLayer } from "../../lib/image-engine/spatial-control/types";

interface SpatialEditingSuiteProps {
  baseImage: string | null;
  onApplyInpaint: (maskDataUri: string, inpaintPrompt: string) => Promise<void>;
  onApplyOutpaint: (expand: { top: number; bottom: number; left: number; right: number }, outpaintPrompt: string) => Promise<void>;
  onUpdateSpatialBoxes: (boxes: SpatialBoundingBox[]) => void;
  isLoading: boolean;
}

export function SpatialEditingSuite({
  baseImage,
  onApplyInpaint,
  onApplyOutpaint,
  onUpdateSpatialBoxes,
  isLoading,
}: SpatialEditingSuiteProps) {
  const [activeTab, setActiveTab] = useState<"spatial" | "inpaint" | "outpaint" | "compare">("spatial");

  // Spatial Layout state
  const [boxes, setBoxes] = useState<SpatialBoundingBox[]>([
    {
      id: "box-1",
      label: "Main Subject",
      x: 0.35,
      y: 0.3,
      width: 0.35,
      height: 0.45,
      layer: "foreground",
      importance: "critical",
    },
  ]);

  // Inpaint Canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [inpaintPrompt, setInpaintPrompt] = useState("");
  const [historyStack, setHistoryStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  // Outpaint state
  const [outpaintDirections, setOutpaintDirections] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 256,
  });
  const [outpaintPrompt, setOutpaintPrompt] = useState("");

  // Before/After comparison
  const [compareSlider, setCompareSlider] = useState(50);
  const [previousImage, setPreviousImage] = useState<string | null>(null);

  // Sync spatial boxes
  const updateBoxes = (newBoxes: SpatialBoundingBox[]) => {
    setBoxes(newBoxes);
    onUpdateSpatialBoxes(newBoxes);
  };

  const addBox = () => {
    const newBox: SpatialBoundingBox = {
      id: `box-${Date.now()}`,
      label: `Object ${boxes.length + 1}`,
      x: 0.2 + (boxes.length * 0.1) % 0.5,
      y: 0.35,
      width: 0.25,
      height: 0.35,
      layer: "midground",
    };
    updateBoxes([...boxes, newBox]);
  };

  const removeBox = (id: string) => {
    updateBoxes(boxes.filter((b) => b.id !== id));
  };

  const modifyBox = (id: string, updates: Partial<SpatialBoundingBox>) => {
    updateBoxes(boxes.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  // Canvas drawing setup
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistoryStack([]);
    setRedoStack([]);
  }, []);

  useEffect(() => {
    if (activeTab === "inpaint") {
      initCanvas();
    }
  }, [activeTab, initCanvas]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setHistoryStack((prev) => [...prev.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setRedoStack((prev) => [...prev, currentData]);

    const prevData = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));
    ctx.putImageData(prevData, 0, 0);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nextData = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistoryStack((prev) => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    ctx.putImageData(nextData, 0, 0);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    saveCanvasState();
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.fillStyle = "white"; // White mask indicates regions to modify
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleApplyInpaint = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maskDataUri = canvas.toDataURL("image/png");
    if (baseImage) setPreviousImage(baseImage);
    await onApplyInpaint(maskDataUri, inpaintPrompt);
    setActiveTab("compare");
  };

  const handleApplyOutpaint = async () => {
    if (baseImage) setPreviousImage(baseImage);
    await onApplyOutpaint(outpaintDirections, outpaintPrompt);
    setActiveTab("compare");
  };

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--soft)] p-4 sm:p-5">
      {/* Mode navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("spatial")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "spatial"
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "text-neutral-500 hover:text-[var(--foreground)]"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            Spatial Positioning
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("inpaint")}
            disabled={!baseImage}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
              activeTab === "inpaint"
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "text-neutral-500 hover:text-[var(--foreground)]"
            }`}
          >
            <Brush className="h-3.5 w-3.5" />
            Inpaint & Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("outpaint")}
            disabled={!baseImage}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
              activeTab === "outpaint"
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "text-neutral-500 hover:text-[var(--foreground)]"
            }`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Outpainting
          </button>
          {previousImage && baseImage && (
            <button
              type="button"
              onClick={() => setActiveTab("compare")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "compare"
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "text-neutral-500 hover:text-[var(--foreground)]"
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              Before / After
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: SPATIAL POSITIONING & SCENE LAYOUT */}
      {activeTab === "spatial" && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                2D Spatial Scene Layout
              </h3>
              <p className="text-[10px] text-neutral-400">
                Position subjects in Foreground, Midground, or Background tiers
              </p>
            </div>
            <button
              type="button"
              onClick={addBox}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs font-semibold text-neutral-600 transition hover:text-[var(--foreground)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Object
            </button>
          </div>

          {/* Interactive 2D Visual Preview Canvas */}
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-neutral-900/90 p-2">
            {/* Grid guides */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-white" />
              <div className="border-r border-white" />
              <div />
            </div>

            {/* Render bounding boxes */}
            {boxes.map((box) => {
              const color =
                box.layer === "foreground"
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                  : box.layer === "midground"
                  ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-300"
                  : "border-sky-400 bg-sky-500/20 text-sky-300";

              return (
                <div
                  key={box.id}
                  style={{
                    left: `${box.x * 100}%`,
                    top: `${box.y * 100}%`,
                    width: `${box.width * 100}%`,
                    height: `${box.height * 100}%`,
                  }}
                  className={`absolute rounded-xl border-2 p-1.5 shadow-md backdrop-blur-xs flex flex-col justify-between overflow-hidden transition-all ${color}`}
                >
                  <span className="truncate text-[10px] font-bold leading-none">{box.label}</span>
                  <span className="text-[8px] uppercase tracking-wider opacity-80">{box.layer}</span>
                </div>
              );
            })}
          </div>

          {/* Box controls list */}
          <div className="space-y-2">
            {boxes.map((box) => (
              <div
                key={box.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2.5 text-xs"
              >
                <input
                  type="text"
                  value={box.label}
                  onChange={(e) => modifyBox(box.id, { label: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--soft)] px-2 py-1 text-xs outline-none"
                  placeholder="Object label..."
                />
                <select
                  value={box.layer}
                  onChange={(e) => modifyBox(box.id, { layer: e.target.value as SceneDepthLayer })}
                  className="rounded-lg border border-[var(--border)] bg-[var(--soft)] px-2 py-1 text-xs outline-none"
                >
                  <option value="foreground">Foreground</option>
                  <option value="midground">Midground</option>
                  <option value="background">Background</option>
                </select>
                <select
                  value={box.x < 0.25 ? "left" : box.x > 0.55 ? "right" : "center"}
                  onChange={(e) => {
                    const pos = e.target.value;
                    const newX = pos === "left" ? 0.08 : pos === "right" ? 0.65 : 0.35;
                    modifyBox(box.id, { x: newX });
                  }}
                  className="rounded-lg border border-[var(--border)] bg-[var(--soft)] px-2 py-1 text-xs outline-none"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeBox(box.id)}
                  className="text-neutral-400 hover:text-red-500"
                  title="Remove box"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: INPAINTING & LOCALIZED EDITING */}
      {activeTab === "inpaint" && baseImage && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--foreground)]">Brush Size:</span>
              <input
                type="range"
                min="10"
                max="80"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24 accent-fuchsia-500"
              />
              <span className="text-[10px] text-neutral-400">{brushSize}px</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyStack.length === 0}
                className="rounded-lg border border-[var(--border)] p-1.5 text-neutral-500 hover:text-[var(--foreground)] disabled:opacity-30"
                title="Undo brush stroke"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="rounded-lg border border-[var(--border)] p-1.5 text-neutral-500 hover:text-[var(--foreground)] disabled:opacity-30"
                title="Redo brush stroke"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={initCanvas}
                className="rounded-lg border border-[var(--border)] p-1.5 text-neutral-500 hover:text-red-500"
                title="Clear mask"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Mask Canvas Overlay */}
          <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-2xl border border-[var(--border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={baseImage}
              alt="Inpaint Target"
              className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            />
            <canvas
              ref={canvasRef}
              width={512}
              height={512}
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onMouseMove={draw}
              className="absolute inset-0 h-full w-full cursor-crosshair opacity-65 mix-blend-screen"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Inpainting Prompt (Describe modification)
            </label>
            <input
              type="text"
              value={inpaintPrompt}
              onChange={(e) => setInpaintPrompt(e.target.value)}
              placeholder="e.g. replace the dog with a fluffy orange tabby cat..."
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyInpaint}
            disabled={isLoading || !inpaintPrompt.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-fuchsia-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-fuchsia-500 disabled:opacity-40"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Local Inpaint
          </button>
        </div>
      )}

      {/* TAB 3: OUTPAINTING & CANVAS EXPANSION */}
      {activeTab === "outpaint" && baseImage && (
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              Canvas Expansion (Outpaint)
            </h3>
            <p className="text-[10px] text-neutral-400">
              Extend scenery boundaries seamlessly into panoramic perspectives
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setOutpaintDirections((prev) => ({ ...prev, left: prev.left ? 0 : 256 }))}
              className={`rounded-xl border p-2 text-center transition ${
                outpaintDirections.left ? "border-fuchsia-500 bg-fuchsia-500/10 font-bold" : "border-[var(--border)]"
              }`}
            >
              Extend Left (+256px)
            </button>
            <button
              type="button"
              onClick={() => setOutpaintDirections((prev) => ({ ...prev, right: prev.right ? 0 : 256 }))}
              className={`rounded-xl border p-2 text-center transition ${
                outpaintDirections.right ? "border-fuchsia-500 bg-fuchsia-500/10 font-bold" : "border-[var(--border)]"
              }`}
            >
              Extend Right (+256px)
            </button>
            <button
              type="button"
              onClick={() => setOutpaintDirections((prev) => ({ ...prev, top: prev.top ? 0 : 256 }))}
              className={`rounded-xl border p-2 text-center transition ${
                outpaintDirections.top ? "border-fuchsia-500 bg-fuchsia-500/10 font-bold" : "border-[var(--border)]"
              }`}
            >
              Extend Top (+256px)
            </button>
            <button
              type="button"
              onClick={() => setOutpaintDirections((prev) => ({ ...prev, bottom: prev.bottom ? 0 : 256 }))}
              className={`rounded-xl border p-2 text-center transition ${
                outpaintDirections.bottom ? "border-fuchsia-500 bg-fuchsia-500/10 font-bold" : "border-[var(--border)]"
              }`}
            >
              Extend Bottom (+256px)
            </button>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Outpaint Continuation Prompt
            </label>
            <input
              type="text"
              value={outpaintPrompt}
              onChange={(e) => setOutpaintPrompt(e.target.value)}
              placeholder="e.g. wide panoramic view of snow-capped mountains at sunset..."
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyOutpaint}
            disabled={isLoading || !outpaintPrompt.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-fuchsia-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-fuchsia-500 disabled:opacity-40"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Generate Outpainted Canvas
          </button>
        </div>
      )}

      {/* TAB 4: BEFORE / AFTER COMPARISON SLIDER */}
      {activeTab === "compare" && previousImage && baseImage && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              Before / After Split Comparison
            </span>
            <span className="text-[10px] text-neutral-400">Drag slider to compare</span>
          </div>

          <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-2xl border border-[var(--border)] select-none">
            {/* After image (background) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={baseImage} alt="After Edit" className="absolute inset-0 h-full w-full object-cover" />

            {/* Before image (clipped foreground) */}
            <div
              style={{ width: `${compareSlider}%` }}
              className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-white shadow-xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previousImage}
                alt="Before Edit"
                className="absolute inset-0 h-full w-full max-w-none object-cover"
                style={{ width: "100%", height: "100%" }}
              />
              <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                Before
              </span>
            </div>
            <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
              After
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={compareSlider}
            onChange={(e) => setCompareSlider(Number(e.target.value))}
            className="w-full accent-fuchsia-500"
          />
        </div>
      )}
    </div>
  );
}
