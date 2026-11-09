"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Table as TableIcon,
  BarChart2,
  Image as ImageIcon,
  Layers,
  Video,
  Plus,
  Trash2,
  Move,
  CornerDownRight,
  RotateCw,
} from "lucide-react";
import { StudioSlide, PresentationTheme, SlideElement, SlideLayout, DrawingPath } from "./types";

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
  onAddElement: (type: "textbox" | "shape" | "table" | "process" | "image", shapeType?: any) => void;
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
  onAddElement,
  showRuler = false,
  showGridlines = false,
  showGuides = false,
  drawingTool = "none",
  drawingColor = "#C43E1C",
  drawingWidth = 4,
}: SlideCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingPath | null>(null);

  // Dragging & Resizing State
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; elX: number; elY: number; elW: number; elH: number } | null>(null);

  // In-place text editing
  const [editingElementId, setEditingElementId] = useState<string | null>(null);

  // Canvas drawing handlers
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
    // 1. Freehand Drawing
    if (currentDrawing && drawingTool !== "none") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setCurrentDrawing((prev) => (prev ? { ...prev, points: [...prev.points, { x, y }] } : null));
      return;
    }

    // 2. Element Dragging & Resizing
    if (dragStart && selectedElementId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const deltaXPercent = ((e.clientX - dragStart.mouseX) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStart.mouseY) / rect.height) * 100;

      if (activeHandle === "move") {
        const nextX = Math.max(0, Math.min(100 - (dragStart.elW || 10), dragStart.elX + deltaXPercent));
        const nextY = Math.max(0, Math.min(100 - (dragStart.elH || 10), dragStart.elY + deltaYPercent));
        onUpdateElement(selectedElementId, { x: Math.round(nextX * 10) / 10, y: Math.round(nextY * 10) / 10 });
      } else if (activeHandle === "se") {
        const nextW = Math.max(5, Math.min(100 - dragStart.elX, dragStart.elW + deltaXPercent));
        const nextH = Math.max(5, Math.min(100 - dragStart.elY, dragStart.elH + deltaYPercent));
        onUpdateElement(selectedElementId, { w: Math.round(nextW * 10) / 10, h: Math.round(nextH * 10) / 10 });
      } else if (activeHandle === "e") {
        const nextW = Math.max(5, Math.min(100 - dragStart.elX, dragStart.elW + deltaXPercent));
        onUpdateElement(selectedElementId, { w: Math.round(nextW * 10) / 10 });
      } else if (activeHandle === "s") {
        const nextH = Math.max(5, Math.min(100 - dragStart.elY, dragStart.elH + deltaYPercent));
        onUpdateElement(selectedElementId, { h: Math.round(nextH * 10) / 10 });
      }
    }
  };

  const handleMouseUpCanvas = () => {
    if (currentDrawing) {
      const nextDrawings = [...(slide.drawings || []), currentDrawing];
      onUpdateSlide({ drawings: nextDrawings });
      setCurrentDrawing(null);
    }
    setDragStart(null);
    setActiveHandle(null);
  };

  const startDrag = (e: React.MouseEvent, el: SlideElement, handle: string) => {
    e.stopPropagation();
    onSelectElement(el.id);
    setActiveHandle(handle);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      elX: el.x,
      elY: el.y,
      elW: el.w || 30,
      elH: el.h || 15,
    });
  };

  // Ensure default title/subtitle elements exist if slide layout has them
  const layout = slide.layout || "title";
  const elements = slide.elements || [];

  return (
    <div
      className="flex-1 overflow-auto flex flex-col items-center justify-center p-4 sm:p-8 bg-[#181818] relative select-none"
      onClick={() => {
        onSelectElement(null);
        setEditingElementId(null);
      }}
    >
      {/* Optional Top Ruler */}
      {showRuler && (
        <div className="w-full max-w-[1020px] h-4 bg-[#222222] border-b border-[#333333] mb-1 flex items-center px-4 text-[9px] font-mono text-slate-400 justify-between select-none">
          <span>0 cm</span>
          <span>5 cm</span>
          <span>10 cm</span>
          <span>15 cm</span>
          <span>20 cm</span>
          <span>25 cm</span>
          <span>30 cm</span>
        </div>
      )}

      {/* 
        16:9 Central Presentation Canvas
        Pure White #FFFFFF by default matching Reference 2!
      */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMoveCanvas}
        onMouseUp={handleMouseUpCanvas}
        className="relative aspect-[16/9] w-full max-w-[1020px] rounded-xs shadow-2xl overflow-hidden border border-[#D1D5DB] transition-transform duration-100 flex flex-col"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "center center",
          backgroundColor: slide.background || theme.bg || "#FFFFFF",
          color: theme.text || "#000000",
          fontFamily: theme.fontFamily || "Calibri, Aptos, 'Segoe UI', Arial, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gridlines Overlay */}
        {showGridlines && (
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        )}

        {/* Guides Overlay (Crosshairs) */}
        {showGuides && (
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/40" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/40" />
          </div>
        )}

        {/* 
          LAYOUT TEMPLATE 1: TITLE SLIDE (Matching Reference 2!)
          "Click to add title" (Large centered dashed box)
          "Click to add subtitle" (Medium centered dashed box)
        */}
        {layout === "title" && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 relative z-10">
            {/* Title Placeholder Box */}
            <div
              onClick={() => setEditingElementId("title_placeholder")}
              className={`w-4/5 max-w-2xl py-4 px-6 text-center rounded border transition-all ${
                editingElementId === "title_placeholder"
                  ? "border-blue-500 bg-blue-50/20 ring-1 ring-blue-500"
                  : "border-dashed border-slate-300 hover:border-slate-400"
              }`}
            >
              {editingElementId === "title_placeholder" ? (
                <textarea
                  autoFocus
                  rows={2}
                  value={slide.title || ""}
                  onChange={(e) => onUpdateSlide({ title: e.target.value })}
                  onBlur={() => setEditingElementId(null)}
                  placeholder="Click to add title"
                  className="w-full text-center text-4xl sm:text-5xl font-bold bg-transparent border-0 focus:outline-none resize-none leading-tight"
                  style={{ color: theme.text || "#000000" }}
                />
              ) : (
                <h1
                  className={`text-4xl sm:text-5xl font-bold tracking-tight cursor-text ${
                    slide.title ? "" : "text-slate-400 font-normal"
                  }`}
                  style={{ color: slide.title ? theme.text : undefined }}
                >
                  {slide.title || "Click to add title"}
                </h1>
              )}
            </div>

            {/* Subtitle Placeholder Box */}
            <div
              onClick={() => setEditingElementId("subtitle_placeholder")}
              className={`w-3/5 max-w-xl mt-6 py-3 px-6 text-center rounded border transition-all ${
                editingElementId === "subtitle_placeholder"
                  ? "border-blue-500 bg-blue-50/20 ring-1 ring-blue-500"
                  : "border-dashed border-slate-300 hover:border-slate-400"
              }`}
            >
              {editingElementId === "subtitle_placeholder" ? (
                <textarea
                  autoFocus
                  rows={2}
                  value={slide.subtitle || ""}
                  onChange={(e) => onUpdateSlide({ subtitle: e.target.value })}
                  onBlur={() => setEditingElementId(null)}
                  placeholder="Click to add subtitle"
                  className="w-full text-center text-xl sm:text-2xl font-normal bg-transparent border-0 focus:outline-none resize-none leading-snug"
                  style={{ color: theme.subtext || "#4B5563" }}
                />
              ) : (
                <h2
                  className={`text-xl sm:text-2xl cursor-text ${
                    slide.subtitle ? "" : "text-slate-400"
                  }`}
                  style={{ color: slide.subtitle ? theme.subtext : undefined }}
                >
                  {slide.subtitle || "Click to add subtitle"}
                </h2>
              )}
            </div>
          </div>
        )}

        {/* 
          LAYOUT TEMPLATE 2: TITLE AND CONTENT
          Header: "Click to add title"
          Body: "Click to add text" with bullet points and quick-insert shortcuts
        */}
        {layout === "titleAndContent" && (
          <div className="flex-1 flex flex-col p-8 sm:p-12 relative z-10">
            {/* Title Header */}
            <div
              onClick={() => setEditingElementId("title_placeholder")}
              className={`w-full py-2 px-4 rounded border transition-all ${
                editingElementId === "title_placeholder"
                  ? "border-blue-500 ring-1 ring-blue-500"
                  : "border-dashed border-slate-300 hover:border-slate-400"
              }`}
            >
              {editingElementId === "title_placeholder" ? (
                <input
                  type="text"
                  autoFocus
                  value={slide.title || ""}
                  onChange={(e) => onUpdateSlide({ title: e.target.value })}
                  onBlur={() => setEditingElementId(null)}
                  placeholder="Click to add title"
                  className="w-full text-3xl font-bold bg-transparent border-0 focus:outline-none"
                  style={{ color: theme.text || "#000000" }}
                />
              ) : (
                <h1
                  className={`text-3xl font-bold cursor-text ${
                    slide.title ? "" : "text-slate-400 font-normal"
                  }`}
                >
                  {slide.title || "Click to add title"}
                </h1>
              )}
            </div>

            {/* Content Body Box */}
            <div
              onClick={() => setEditingElementId("content_placeholder")}
              className={`flex-1 mt-4 p-4 rounded border flex flex-col justify-between transition-all ${
                editingElementId === "content_placeholder"
                  ? "border-blue-500 ring-1 ring-blue-500"
                  : "border-dashed border-slate-300 hover:border-slate-400"
              }`}
            >
              {editingElementId === "content_placeholder" || (slide.bullets && slide.bullets.length > 0) ? (
                <div className="space-y-2 text-base leading-relaxed">
                  {(slide.bullets || ["Click to add text"]).map((bullet, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-slate-500 mt-1">•</span>
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => {
                          const next = [...(slide.bullets || [])];
                          next[idx] = e.target.value;
                          onUpdateSlide({ bullets: next });
                        }}
                        className="flex-1 bg-transparent border-0 focus:outline-none text-base"
                        style={{ color: theme.text }}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const next = [...(slide.bullets || []), "New point"];
                      onUpdateSlide({ bullets: next });
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 pl-4 font-semibold"
                  >
                    + Add bullet point
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <span className="text-lg mb-4">Click to add text</span>
                  {/* Quick Insert Icons (Table, Chart, SmartArt, Picture) */}
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => onAddElement("table")}
                      className="p-2 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition"
                      title="Insert Table"
                    >
                      <TableIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onAddElement("process")}
                      className="p-2 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition"
                      title="Insert SmartArt Process"
                    >
                      <Layers className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onAddElement("image")}
                      className="p-2 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition"
                      title="Insert Pictures"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 
          LAYOUT TEMPLATE 3: PROCESS / TIMELINE (Matching Reference 1 presentation content!)
          Header + Process Badges (1. Capture, 2. Verify, 3. Sync, 4. Act)
        */}
        {layout === "process" && (
          <div className="flex-1 flex flex-col p-8 sm:p-12 relative z-10 justify-between">
            {/* Header */}
            <div>
              <input
                type="text"
                value={slide.title || "SMART-INSPECT"}
                onChange={(e) => onUpdateSlide({ title: e.target.value })}
                className="w-full text-3xl font-extrabold tracking-tight bg-transparent border-0 focus:outline-none"
                style={{ color: theme.text }}
              />
              <p className="text-sm text-slate-500 mt-1">
                {slide.subtitle || "Real-time monitoring & inspection for field-level welfare operations"}
              </p>
            </div>

            {/* Process Flow Cards (1 Capture -> 2 Verify -> 3 Sync -> 4 Act) */}
            <div className="grid grid-cols-4 gap-4 my-auto">
              {[
                { num: "1", title: "CAPTURE", desc: "Field Capture", color: "#EA580C" },
                { num: "2", title: "VERIFY", desc: "Offline-First", color: "#10B981" },
                { num: "3", title: "SYNC", desc: "Live Decision Support", color: "#00E5FF" },
                { num: "4", title: "ACT", desc: "Automated Triggers", color: "#64748B" },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col items-center text-center space-y-2"
                >
                  <div
                    style={{ backgroundColor: step.color }}
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm"
                  >
                    {step.num}
                  </div>
                  <span className="font-bold text-xs tracking-wider text-slate-800">{step.title}</span>
                  <span className="text-[11px] text-slate-500 leading-tight">{step.desc}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-100">
              <span className="font-semibold uppercase tracking-wider">{slide.title || "TATTVA AI"}</span>
              <span className="italic">{slide.takeaway || "A trusted digital trail from field evidence to action."}</span>
            </div>
          </div>
        )}

        {/* 
          FREEFORM CUSTOM INSERTED ELEMENTS
          (Textboxes, Shapes, Tables, Images, Process Diagrams with 8 Selection Handles!)
        */}
        {elements.map((el) => {
          const isSelected = selectedElementId === el.id;

          return (
            <div
              key={el.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement(el.id);
              }}
              className={`absolute cursor-move group/el ${
                isSelected ? "ring-2 ring-blue-500 rounded" : "hover:ring-1 hover:ring-blue-300 rounded"
              }`}
              style={{
                left: `${el.x}%`,
                top: `${el.y}%`,
                width: el.w ? `${el.w}%` : "auto",
                minHeight: el.h ? `${el.h}%` : "auto",
                zIndex: el.zIndex || 10,
              }}
            >
              {/* 8-Point Selection Handles for True Resizing & Dragging */}
              {isSelected && (
                <>
                  {/* Top-Left */}
                  <div
                    onMouseDown={(e) => startDrag(e, el, "nw")}
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize z-20 shadow-xs"
                  />
                  {/* Top-Mid */}
                  <div
                    onMouseDown={(e) => startDrag(e, el, "n")}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-ns-resize z-20 shadow-xs"
                  />
                  {/* Top-Right */}
                  <div
                    onMouseDown={(e) => startDrag(e, el, "ne")}
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize z-20 shadow-xs"
                  />
                  {/* Mid-Right */}
                  <div
                    onMouseDown={(e) => startDrag(e, el, "e")}
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-ew-resize z-20 shadow-xs"
                  />
                  {/* Bottom-Right */}
                  <div
                    onMouseDown={(e) => startDrag(e, el, "se")}
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize z-20 shadow-xs"
                  />
                  {/* Bottom-Mid */}
                  <div
                    onMouseDown={(e) => startDrag(e, el, "s")}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-ns-resize z-20 shadow-xs"
                  />
                  {/* Bottom-Left */}
                  <div
                    onMouseDown={(e) => startDrag(e, el, "sw")}
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize z-20 shadow-xs"
                  />
                  {/* Mid-Left */}
                  <div
                    onMouseDown={(e) => startDrag(e, el, "w")}
                    className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-ew-resize z-20 shadow-xs"
                  />

                  {/* Move Handle Bar & Delete Action */}
                  <div
                    onMouseDown={(e) => startDrag(e, el, "move")}
                    className="absolute -top-7 left-0 flex items-center space-x-1 bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-semibold cursor-move shadow-md z-30"
                  >
                    <Move className="w-2.5 h-2.5" />
                    <span>Drag</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteElement(el.id);
                      }}
                      className="hover:text-rose-200 ml-1 p-0.5"
                      title="Delete object"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </>
              )}

              {/* Text / Textbox Content */}
              {(el.type === "text" || el.type === "textbox") && (
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdateElement(el.id, { content: e.currentTarget.innerText })}
                  className="p-2 text-base leading-snug focus:outline-none"
                  style={{
                    fontSize: el.fontSize ? `${el.fontSize}px` : "18px",
                    fontWeight: el.bold ? "bold" : "normal",
                    fontStyle: el.italic ? "italic" : "normal",
                    textDecoration: el.underline ? "underline" : "none",
                    color: el.color || theme.text || "#000000",
                    textAlign: el.align || "left",
                  }}
                >
                  {el.content || "Click to add text"}
                </div>
              )}

              {/* Shape Content */}
              {el.type === "shape" && (
                <div
                  className="w-full h-full min-h-[40px] flex items-center justify-center shadow-xs"
                  style={{
                    backgroundColor: el.fill || theme.accent,
                    borderColor: el.stroke || "transparent",
                    borderWidth: el.strokeWidth ? `${el.strokeWidth}px` : "0px",
                    borderRadius: el.shapeType === "circle" ? "50%" : el.shapeType === "rounded" ? "12px" : "4px",
                  }}
                >
                  {el.content && <span className="text-xs font-semibold p-2 text-white">{el.content}</span>}
                </div>
              )}

              {/* Table Content */}
              {el.type === "table" && el.tableData && (
                <div className="bg-white border border-slate-300 rounded overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <tbody>
                      {el.tableData.map((row, rI) => (
                        <tr
                          key={rI}
                          className={rI === 0 ? "bg-slate-100 font-bold border-b border-slate-300" : "border-b border-slate-200"}
                        >
                          {row.map((cell, cI) => (
                            <td key={cI} className="p-2 text-slate-800">
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

        {/* Freehand Drawings SVG Canvas Overlay */}
        {(slide.drawings || currentDrawing) && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
            {[...(slide.drawings || []), ...(currentDrawing ? [currentDrawing] : [])].map((path) => {
              if (!path.points || path.points.length < 2) return null;
              const d = path.points.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x}% ${pt.y}%`, "");
              return (
                <path
                  key={path.id}
                  d={d}
                  stroke={path.color}
                  strokeWidth={path.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={path.tool === "highlighter" ? 0.35 : 1.0}
                />
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
