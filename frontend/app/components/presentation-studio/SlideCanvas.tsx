"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  CheckCircle2,
  Move,
  CornerDownRight,
  Maximize2,
} from "lucide-react";
import { StudioSlide, PresentationTheme, SlideElement, DrawingPath } from "./types";

interface SlideCanvasProps {
  slide: StudioSlide;
  slideIndex: number;
  totalSlides: number;
  theme: PresentationTheme;
  zoom: number;
  onUpdateSlide: (updated: Partial<StudioSlide>) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<SlideElement>) => void;
  onDeleteElement: (elementId: string) => void;
  showRuler?: boolean;
  showGridlines?: boolean;
  showGuides?: boolean;
  drawingTool?: "none" | "pen" | "highlighter" | "eraser";
  drawingColor?: string;
  drawingWidth?: number;
}

export function SlideCanvas({
  slide,
  slideIndex,
  totalSlides,
  theme,
  zoom,
  onUpdateSlide,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  showRuler = false,
  showGridlines = false,
  showGuides = false,
  drawingTool = "none",
  drawingColor = "#EA580C",
  drawingWidth = 4,
}: SlideCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingPath | null>(null);

  // Editable handlers
  const handleTitleChange = (val: string) => onUpdateSlide({ title: val });
  const handleCategoryChange = (val: string) => onUpdateSlide({ category: val.toUpperCase() });
  const handleTakeawayChange = (val: string) => onUpdateSlide({ takeaway: val });

  const handleBulletChange = (idx: number, val: string) => {
    const next = [...(slide.bullets || [])];
    next[idx] = val;
    onUpdateSlide({ bullets: next });
  };

  const handleAddBullet = () => {
    const next = [...(slide.bullets || []), "New strategic point or operational mechanism"];
    onUpdateSlide({ bullets: next });
  };

  const handleDeleteBullet = (idx: number) => {
    const next = (slide.bullets || []).filter((_, i) => i !== idx);
    onUpdateSlide({ bullets: next });
  };

  // Drawing event handlers
  const handleMouseDownCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingTool === "none") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPath: DrawingPath = {
      id: `draw_${Date.now()}`,
      tool: drawingTool,
      color: drawingColor,
      width: drawingWidth,
      points: [{ x, y }],
    };
    setCurrentDrawing(newPath);
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentDrawing || drawingTool === "none") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setCurrentDrawing((prev) => {
      if (!prev) return null;
      return { ...prev, points: [...prev.points, { x, y }] };
    });
  };

  const handleMouseUpCanvas = () => {
    if (currentDrawing) {
      const nextDrawings = [...(slide.drawings || []), currentDrawing];
      onUpdateSlide({ drawings: nextDrawings });
      setCurrentDrawing(null);
    }
  };

  return (
    <div
      className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8 bg-[#181818] relative select-none"
      onClick={() => onSelectElement(null)}
    >
      {/* 16:9 Presentation Surface */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMoveCanvas}
        onMouseUp={handleMouseUpCanvas}
        className="relative aspect-[16/9] w-full max-w-[1020px] rounded-xl shadow-2xl overflow-hidden border border-[#3A3A3A] transition-transform duration-150 flex flex-col justify-between p-6 sm:p-10"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "center center",
          backgroundColor: slide.background || theme.bg || "#0F172A",
          color: theme.text || "#FFFFFF",
          fontFamily: theme.fontFamily || "Segoe UI, Inter, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gridlines Overlay */}
        {showGridlines && (
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        )}

        {/* Guides Overlay (Center crosshairs) */}
        {showGuides && (
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-orange-500/30" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-orange-500/30" />
          </div>
        )}

        {/* 1. Header: Colored Accent Lines (matching screenshot) + Category Pill + Slide Number */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-2">
            {/* Multi-color accent bars matching PowerPoint screenshot */}
            <div className="flex flex-col space-y-1">
              <div className="w-16 h-1 bg-[#EA580C] rounded-full" />
              <div className="w-24 h-1 bg-[#10B981] rounded-full" />
              <div className="w-14 h-1 bg-[#00E5FF] rounded-full" />
            </div>

            <div className="pt-2">
              <input
                type="text"
                value={slide.category || "FOUNDATIONS"}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border border-transparent hover:border-white/30 focus:border-orange-500 focus:outline-none transition bg-black/20"
                style={{
                  backgroundColor: `${theme.accent}26`,
                  color: theme.accent,
                }}
                title="Click to edit category"
              />
            </div>
          </div>

          <span className="text-[11px] font-mono font-bold tracking-widest text-[#888888]">
            {String(slideIndex + 1).padStart(2, "0")} / {String(totalSlides).padStart(2, "0")}
          </span>
        </div>

        {/* 2. Main Slide Center Area */}
        <div className="relative z-10 my-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Column: Title + Bullets + Badges */}
          <div className="md:col-span-8 space-y-4">
            {/* Title */}
            <input
              type="text"
              value={slide.title || ""}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full text-2xl sm:text-3xl font-extrabold tracking-tight bg-transparent border border-transparent hover:border-white/20 focus:border-orange-500 focus:outline-none rounded px-2 py-1 leading-snug"
              style={{ color: theme.text }}
              placeholder="Presentation Slide Title..."
            />

            {/* Bullets List */}
            <div className="space-y-2 pl-2">
              {(slide.bullets || []).map((bullet, idx) => (
                <div key={idx} className="group/bullet flex items-start space-x-2">
                  <div
                    className="w-2 h-2 rounded-full mt-2 shrink-0"
                    style={{ backgroundColor: theme.accent }}
                  />
                  <input
                    type="text"
                    value={bullet}
                    onChange={(e) => handleBulletChange(idx, e.target.value)}
                    className="flex-1 bg-transparent text-xs sm:text-sm leading-relaxed border border-transparent hover:border-white/20 focus:border-orange-500 focus:outline-none rounded px-2 py-0.5"
                    style={{ color: theme.subtext }}
                  />
                  <button
                    onClick={() => handleDeleteBullet(idx)}
                    className="opacity-0 group-hover/bullet:opacity-100 text-slate-500 hover:text-rose-400 p-1 transition"
                    title="Remove bullet"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <button
                onClick={handleAddBullet}
                className="flex items-center space-x-1.5 text-xs text-orange-400 hover:text-orange-300 transition pl-4 pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add key point</span>
              </button>
            </div>

            {/* Feature Pills / Badges (matching screenshot) */}
            <div className="flex flex-wrap gap-2 pt-2">
              {["FIELD CAPTURE", "OFFLINE-FIRST", "LIVE DECISION SUPPORT"].map((badge, bIdx) => (
                <div
                  key={bIdx}
                  className="px-3 py-1 rounded-md text-[10px] font-bold tracking-wider border border-[#3A3A3A] bg-black/40 text-[#CCCCCC]"
                >
                  {badge}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: 4-Step Vertical Timeline (Matching screenshot!) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-2">
            <div className="relative flex flex-col space-y-4">
              {/* Connecting vertical line */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-[#444444]" />

              {[
                { num: "1", title: "CAPTURE", color: "#EA580C" },
                { num: "2", title: "VERIFY", color: "#10B981" },
                { num: "3", title: "SYNC", color: "#00E5FF" },
                { num: "4", title: "ACT", color: "#FFFFFF" },
              ].map((step, sIdx) => (
                <div key={sIdx} className="relative z-10 flex items-center space-x-3">
                  <div
                    style={{ backgroundColor: step.color }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-black font-extrabold text-xs shadow-md"
                  >
                    {step.num}
                  </div>
                  <span className="font-extrabold text-xs tracking-wider text-white">
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Freeform Custom Elements (Text boxes, Tables, Shapes, Process Diagrams) */}
        {slide.elements &&
          slide.elements.map((el) => {
            const isSelected = selectedElementId === el.id;

            return (
              <div
                key={el.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(el.id);
                }}
                className={`absolute transition-all cursor-move ${
                  isSelected ? "ring-2 ring-orange-500 rounded shadow-lg" : ""
                }`}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: el.w ? `${el.w}%` : "auto",
                  minHeight: el.h ? `${el.h}%` : "auto",
                  zIndex: el.zIndex || 15,
                }}
              >
                {/* 8-point Selection Handles */}
                {isSelected && (
                  <>
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-orange-500 rounded-full border border-white" />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border border-white" />
                    <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-orange-500 rounded-full border border-white" />
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border border-white" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteElement(el.id);
                      }}
                      className="absolute -top-6 right-0 p-1 rounded bg-rose-600 text-white shadow hover:bg-rose-700"
                      title="Delete element"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}

                {/* Textbox / Text */}
                {(el.type === "text" || el.type === "textbox") && (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      onUpdateElement(el.id, { content: e.currentTarget.innerText })
                    }
                    className="p-2 text-xs focus:outline-none"
                    style={{
                      fontSize: el.fontSize ? `${el.fontSize}px` : "14px",
                      color: el.color || theme.text,
                      fontWeight: el.bold ? "bold" : "normal",
                      fontStyle: el.italic ? "italic" : "normal",
                      textDecoration: el.underline ? "underline" : "none",
                      textAlign: el.align || "left",
                    }}
                  >
                    {el.content || "Double click to edit text..."}
                  </div>
                )}

                {/* Shape */}
                {el.type === "shape" && (
                  <div
                    className="w-full h-full min-h-[40px] flex items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: el.fill || theme.accent,
                      borderColor: el.stroke || "transparent",
                      borderWidth: el.strokeWidth ? `${el.strokeWidth}px` : "0px",
                      borderRadius:
                        el.shapeType === "circle"
                          ? "50%"
                          : el.shapeType === "rounded"
                          ? "12px"
                          : "4px",
                    }}
                  >
                    {el.content && (
                      <span className="text-xs font-semibold p-2 text-white">
                        {el.content}
                      </span>
                    )}
                  </div>
                )}

                {/* Table */}
                {el.type === "table" && el.tableData && (
                  <div className="bg-slate-900/90 border border-slate-700 rounded-lg overflow-hidden shadow-md">
                    <table className="w-full text-xs">
                      <tbody>
                        {el.tableData.map((row, rI) => (
                          <tr
                            key={rI}
                            className={
                              rI === 0
                                ? "bg-orange-600/30 font-bold border-b border-slate-700"
                                : "border-b border-slate-800"
                            }
                          >
                            {row.map((cell, cI) => (
                              <td key={cI} className="p-2 text-slate-200">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

        {/* 4. Freehand Drawing Paths SVG Overlay */}
        {(slide.drawings || currentDrawing) && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
            {[...(slide.drawings || []), ...(currentDrawing ? [currentDrawing] : [])].map(
              (path) => {
                if (!path.points || path.points.length < 2) return null;
                const d = path.points.reduce(
                  (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x}% ${pt.y}%`,
                  ""
                );
                return (
                  <path
                    key={path.id}
                    d={d}
                    stroke={path.color}
                    strokeWidth={path.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={path.tool === "highlighter" ? 0.4 : 1.0}
                  />
                );
              }
            )}
          </svg>
        )}

        {/* 5. Footer: Tagline & Copyright / Presentation Title */}
        <div className="relative z-10 pt-4 flex items-center justify-between text-[10px] text-[#777777] border-t border-[#2A2A2A]">
          <span className="font-mono tracking-wider uppercase font-semibold">
            {slide.title || "TATTVA AI PRESENTATION"}
          </span>
          <span className="italic">
            {slide.takeaway || "A trusted digital trail from field evidence to action."}
          </span>
        </div>
      </div>
    </div>
  );
}
