"use client";

import React, { useState, useRef } from "react";
import {
  Layers,
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  Save,
  Download,
  Share2,
  Trash2,
  Plus,
  Move,
  Lock,
  Unlock,
  RotateCw,
  Palette,
  Layout,
  Printer,
  Sparkles,
} from "lucide-react";
import { PublisherPublication, PublisherElement, PublisherTemplateType, WorkspaceItem } from "../../types";
import { saveWorkspaceItem } from "../../storage";

interface PublisherStudioProps {
  item?: WorkspaceItem<any>;
  onSave?: (item: WorkspaceItem<any>) => void;
  onBack?: () => void;
}

export function PublisherStudio({ item, onSave, onBack }: PublisherStudioProps) {
  const [title, setTitle] = useState(item?.name || "AI Summit Event Flyer.pub");
  const [templateType, setTemplateType] = useState<PublisherTemplateType>(
    item?.content?.templateType || "poster_a4"
  );
  const [canvasBg, setCanvasBg] = useState(item?.content?.background || "#0D1117");
  const [elements, setElements] = useState<PublisherElement[]>(
    item?.content?.elements || [
      {
        id: "el_1",
        type: "badge",
        x: 10,
        y: 8,
        width: 32,
        height: 5,
        zIndex: 1,
        content: "ANNUAL SCIENTIFIC FORUM",
        fontSize: 11,
        fontWeight: "800",
        color: "#00E5FF",
        fill: "rgba(0, 229, 255, 0.12)",
        stroke: "#00E5FF",
        strokeWidth: 1.5,
        borderRadius: 24,
        align: "center",
      },
      {
        id: "el_2",
        type: "heading",
        x: 10,
        y: 16,
        width: 80,
        height: 18,
        zIndex: 2,
        content: "AUTONOMOUS INTELLIGENCE 2026",
        fontSize: 34,
        fontWeight: "900",
        color: "#FFFFFF",
        align: "left",
      },
      {
        id: "el_3",
        type: "text",
        x: 10,
        y: 36,
        width: 80,
        height: 10,
        zIndex: 3,
        content: "Pioneering verifiable agentic computing, automated reasoning pipelines, and next-generation cognitive architectures.",
        fontSize: 15,
        color: "#94A3B8",
        align: "left",
      },
      {
        id: "el_4",
        type: "shape",
        x: 10,
        y: 50,
        width: 80,
        height: 16,
        zIndex: 4,
        shapeType: "rounded",
        fill: "rgba(0, 130, 114, 0.15)",
        stroke: "#008272",
        strokeWidth: 2,
        borderRadius: 16,
        content: "Keynote Speaker: Kotapati Gowtham Chowdary • November 2026 • Bangalore",
        color: "#E2E8F0",
        fontSize: 14,
        fontWeight: "700",
        align: "center",
      },
      {
        id: "el_5",
        type: "badge",
        x: 10,
        y: 72,
        width: 38,
        height: 6,
        zIndex: 5,
        content: "REGISTRATION OPEN • TATTVA.AI",
        fontSize: 12,
        fontWeight: "800",
        color: "#10B981",
        fill: "rgba(16, 185, 129, 0.15)",
        stroke: "#10B981",
        strokeWidth: 1,
        borderRadius: 8,
        align: "center",
      },
    ]
  );

  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const selectedEl = elements.find((e) => e.id === selectedElId);

  // Add Element
  const handleAddElement = (type: "heading" | "text" | "shape" | "badge") => {
    const newEl: PublisherElement = {
      id: `el_${Date.now()}`,
      type,
      x: 20,
      y: 40,
      width: type === "heading" ? 60 : 40,
      height: type === "heading" ? 10 : 8,
      zIndex: elements.length + 1,
      content: type === "heading" ? "New Section Title" : type === "badge" ? "NEW BADGE" : "Editable text block...",
      fontSize: type === "heading" ? 24 : 14,
      fontWeight: type === "heading" ? "800" : "500",
      color: "#FFFFFF",
      fill: type === "shape" ? "rgba(0, 130, 114, 0.2)" : undefined,
      stroke: type === "shape" ? "#008272" : undefined,
      strokeWidth: 1,
      borderRadius: type === "shape" ? 12 : 4,
      align: "left",
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedElId(newEl.id);
  };

  // Update Selected Element
  const updateSelectedElement = (updates: Partial<PublisherElement>) => {
    if (!selectedElId) return;
    setElements((prev) => prev.map((el) => (el.id === selectedElId ? { ...el, ...updates } : el)));
  };

  // Delete Selected Element
  const handleDeleteElement = () => {
    if (!selectedElId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedElId));
    setSelectedElId(null);
  };

  // Save to Workspace Vault
  const handleSave = () => {
    saveWorkspaceItem({
      id: item?.id,
      name: title,
      app: "publisher",
      format: "pub",
      content: {
        title,
        templateType,
        background: canvasBg,
        elements,
      },
    });
    setStatusMessage("Design project saved to workspace vault! ✓");
    setTimeout(() => setStatusMessage(null), 2500);
  };

  // Export PDF or PNG
  const handleExport = async (format: "pdf" | "json") => {
    setStatusMessage(`Compiling high-resolution ${format.toUpperCase()} export...`);
    try {
      const res = await fetch("/api/workspace/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          title,
          content: { title, elements, background: canvasBg },
        }),
      });

      if (!res.ok) throw new Error("Compilation failed");
      const data = await res.json();

      if (data.dataUri) {
        const a = document.createElement("a");
        a.href = data.dataUri;
        a.download = data.filename || `${title}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setStatusMessage(`Exported ${data.filename} ✓`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err: any) {
      setStatusMessage(`Export error: ${err.message}`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#18181B] text-neutral-100 select-none font-sans overflow-hidden">
      {/* 1. TOP TEAL TITLE BAR (Publisher #008272) */}
      <header className="bg-[#008272] text-white px-3 py-1.5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded hover:bg-black/20 text-white transition active:scale-95"
            title="Back to Workspace"
          >
            ←
          </button>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/20 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />
            <span>Publisher</span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent border-0 focus:outline-none hover:bg-black/15 focus:bg-black/25 px-2 py-0.5 rounded text-white font-semibold text-xs sm:text-sm truncate cursor-text max-w-xs sm:max-w-md"
            title="Click to rename design project"
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1 rounded bg-[#006A5D] hover:bg-[#005B50] text-white text-xs font-bold transition flex items-center gap-1 shadow-sm active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport("pdf")}
            className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/35 text-white text-xs font-semibold transition flex items-center gap-1 active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print PDF</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport("json")}
            className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/35 text-white text-xs font-semibold transition flex items-center gap-1 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* 2. NOTIFICATION TOAST */}
      {statusMessage && (
        <div className="bg-teal-900/60 border-b border-teal-700/80 px-4 py-1.5 text-xs text-teal-200 flex items-center justify-between shrink-0">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-teal-400 hover:text-white font-bold">
            ×
          </button>
        </div>
      )}

      {/* 3. TOOLBAR PANEL */}
      <div className="bg-[#27272A] border-b border-neutral-700 p-2 flex items-center justify-between gap-4 text-xs overflow-x-auto shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Insert:</span>
          <button
            type="button"
            onClick={() => handleAddElement("heading")}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 flex items-center gap-1.5 font-semibold text-xs active:scale-95"
          >
            <Type className="w-3.5 h-3.5 text-teal-400" />
            <span>Heading</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddElement("text")}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 flex items-center gap-1.5 font-semibold text-xs active:scale-95"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text Box</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddElement("shape")}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 flex items-center gap-1.5 font-semibold text-xs active:scale-95"
          >
            <Square className="w-3.5 h-3.5 text-[#008272]" />
            <span>Card Shape</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddElement("badge")}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 flex items-center gap-1.5 font-semibold text-xs active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Badge</span>
          </button>
        </div>

        {/* Selected Element Controls */}
        {selectedEl && (
          <div className="flex items-center gap-2 border-l border-neutral-600 pl-4">
            <span className="text-[11px] text-neutral-400 font-mono truncate max-w-[120px]">{selectedEl.type}</span>
            <input
              type="color"
              value={selectedEl.color || "#FFFFFF"}
              onChange={(e) => updateSelectedElement({ color: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
              title="Text Color"
            />
            <button
              type="button"
              onClick={handleDeleteElement}
              className="p-1 rounded text-neutral-400 hover:text-rose-400 transition"
              title="Delete element"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 4. MAIN PUBLISHER WORKSPACE CANVAS */}
      <div className="flex-1 overflow-auto p-4 sm:p-10 flex items-center justify-center bg-[#121214] relative">
        {/* Printable Poster Canvas Surface (A4 Aspect Ratio) */}
        <div
          className="relative w-full max-w-[700px] aspect-[1/1.414] rounded-2xl shadow-2xl border border-neutral-700/80 overflow-hidden select-none transition-all"
          style={{ backgroundColor: canvasBg }}
          onClick={() => setSelectedElId(null)}
        >
          {elements.map((el) => {
            const isSelected = selectedElId === el.id;
            return (
              <div
                key={el.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElId(el.id);
                }}
                className={`absolute p-2 transition-all cursor-move ${
                  isSelected ? "ring-2 ring-[#008272] shadow-xl" : "hover:ring-1 hover:ring-white/30"
                }`}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.width}%`,
                  height: `${el.height}%`,
                  zIndex: el.zIndex,
                  backgroundColor: el.fill || "transparent",
                  borderColor: el.stroke,
                  borderWidth: el.stroke ? `${el.strokeWidth || 1}px` : 0,
                  borderRadius: `${el.borderRadius || 0}px`,
                  color: el.color || "#FFFFFF",
                  textAlign: el.align || "left",
                }}
              >
                {isSelected ? (
                  <textarea
                    value={el.content || ""}
                    onChange={(e) => updateSelectedElement({ content: e.target.value })}
                    className="w-full h-full bg-transparent border-0 focus:outline-none resize-none leading-tight"
                    style={{
                      fontSize: `${el.fontSize || 14}px`,
                      fontWeight: el.fontWeight || "normal",
                      color: el.color,
                      textAlign: el.align,
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      fontSize: `${el.fontSize || 14}px`,
                      fontWeight: el.fontWeight || "normal",
                      color: el.color,
                      textAlign: el.align,
                    }}
                  >
                    {el.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
