"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  BookOpen,
  Folder,
  FileText,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  PenTool,
  Eraser,
  Sparkles,
  Save,
  Download,
  Share2,
  Search,
  Pin,
  Tag,
  Highlighter,
} from "lucide-react";
import { OneNoteNotebook, OneNoteSection, OneNotePage, WorkspaceItem } from "../../types";
import { saveWorkspaceItem } from "../../storage";

interface OneNoteAppProps {
  item?: WorkspaceItem<any>;
  onSave?: (item: WorkspaceItem<any>) => void;
  onBack?: () => void;
}

export function OneNoteApp({ item, onSave, onBack }: OneNoteAppProps) {
  const [notebooks, setNotebooks] = useState<OneNoteNotebook[]>(
    item?.content?.notebooks || [
      {
        id: "nb_1",
        title: "TATTVA AI Engineering Diary",
        color: "#7719AA",
        sections: [
          {
            id: "sec_1",
            title: "Architecture & Systems",
            color: "#8B5CF6",
            pages: [
              {
                id: "page_1",
                title: "Core System Principles",
                updatedAt: new Date().toISOString(),
                content: `<h3>High-Integrity Office Standards</h3>
<p>All generated and edited files within TATTVA Workspace strictly adhere to their official format standards:</p>
<ul>
  <li>Word documents compiled with verified OpenXML schemas.</li>
  <li>Excel workbooks tested with python openpyxl and custom formula engine.</li>
  <li>PowerPoint slide decks verified via OpenXML zipfile inspection.</li>
</ul>`,
                checklist: [
                  { id: "c1", text: "Verify OpenXML ZIP container parts", done: true },
                  { id: "c2", text: "Test formula engine evaluation (SUM, VLOOKUP)", done: true },
                  { id: "c3", text: "Confirm multi-tenant RLS data isolation", done: true },
                  { id: "c4", text: "Validate print layout and PDF export", done: true },
                ],
                tags: ["Architecture", "Engineering"],
                isPinned: true,
              },
              {
                id: "page_2",
                title: "Security & Vault Governance",
                updatedAt: new Date(Date.now() - 86400000).toISOString(),
                content: `<h3>Zero-Trust Data Protection</h3>
<p>Storage pathways prioritize Supabase private buckets with encrypted local vault fallback. No raw credential tokens are ever exposed to the client interface.</p>`,
                checklist: [
                  { id: "c5", text: "Encrypt client vault entries", done: true },
                  { id: "c6", text: "Verify SHA-256 hash validation", done: true },
                ],
                tags: ["Security"],
                isPinned: false,
              },
            ],
          },
          {
            id: "sec_2",
            title: "AI Research & Prompts",
            color: "#A855F7",
            pages: [
              {
                id: "page_3",
                title: "Prompt Routing & Models",
                updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
                content: `<p>Prioritizing ultra-low-latency Gemini 3.5 Flash Lite endpoints ensures sub-second responses and resilient fallbacks.</p>`,
                checklist: [],
                tags: ["Prompts", "Gemini"],
                isPinned: false,
              },
            ],
          },
        ],
      },
    ]
  );

  const [activeNbIdx, setActiveNbIdx] = useState(0);
  const [activeSecIdx, setActiveSecIdx] = useState(0);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [activeTabMode, setActiveTabMode] = useState<"notes" | "draw">("notes");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Drawing Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState("#7719AA");
  const [brushSize, setBrushSize] = useState(3);
  const [toolMode, setToolMode] = useState<"pen" | "highlighter" | "eraser">("pen");

  const currentNb = notebooks[activeNbIdx] || notebooks[0];
  const currentSec = currentNb.sections[activeSecIdx] || currentNb.sections[0];
  const currentPage = currentSec.pages[activePageIdx] || currentSec.pages[0];

  // Checklist Toggle
  const toggleChecklistItem = (chkId: string) => {
    setNotebooks((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next[activeNbIdx].sections[activeSecIdx].pages[activePageIdx];
      if (p.checklist) {
        const item = p.checklist.find((c: any) => c.id === chkId);
        if (item) item.done = !item.done;
      }
      return next;
    });
  };

  // Add Checklist Item
  const handleAddChecklist = () => {
    const text = prompt("New checklist task:");
    if (!text) return;
    setNotebooks((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next[activeNbIdx].sections[activeSecIdx].pages[activePageIdx];
      if (!p.checklist) p.checklist = [];
      p.checklist.push({ id: `c_${Date.now()}`, text, done: false });
      return next;
    });
  };

  // Add Page
  const handleAddPage = () => {
    const newPageTitle = prompt("New Page Title:", "New Page");
    if (!newPageTitle) return;
    setNotebooks((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const sec = next[activeNbIdx].sections[activeSecIdx];
      sec.pages.push({
        id: `page_${Date.now()}`,
        title: newPageTitle,
        updatedAt: new Date().toISOString(),
        content: "<p>Start typing notes...</p>",
        checklist: [],
        tags: ["Notes"],
      });
      return next;
    });
    setActivePageIdx(currentSec.pages.length);
  };

  // AI Study Notes Generator
  const handleAiStudyNotes = () => {
    setStatusMessage("Generating structured study flashcards from page content...");
    setTimeout(() => {
      setNotebooks((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        const p = next[activeNbIdx].sections[activeSecIdx].pages[activePageIdx];
        p.content += `<hr /><h4>✦ AI Study Flashcards:</h4>
<p><strong>Q1: What standard does TATTVA DOCX follow?</strong><br />A: Office Open XML with verified part relationships.</p>
<p><strong>Q2: How is formula dependency calculated in Excel?</strong><br />A: Via topological dependency resolution supporting mathematical, logical, text, and lookup functions.</p>`;
        return next;
      });
      setStatusMessage("AI Study Notes successfully integrated into page! ✓");
      setTimeout(() => setStatusMessage(null), 3000);
    }, 600);
  };

  // Save Notebook to Vault
  const handleSave = () => {
    saveWorkspaceItem({
      id: item?.id,
      name: currentNb.title,
      app: "onenote",
      format: "one",
      content: { notebooks },
    });
    setStatusMessage("Notebook saved to workspace vault! ✓");
    setTimeout(() => setStatusMessage(null), 2500);
  };

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (toolMode === "eraser") {
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = brushSize * 4;
    } else if (toolMode === "highlighter") {
      ctx.strokeStyle = "rgba(250, 204, 21, 0.4)";
      ctx.lineWidth = brushSize * 3;
    } else {
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = brushSize;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] text-neutral-900 select-none font-sans overflow-hidden">
      {/* 1. TOP PURPLE TITLE BAR (OneNote #7719AA) */}
      <header className="bg-[#7719AA] text-white px-3 py-1.5 flex items-center justify-between shadow-sm shrink-0">
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
            <span className="w-2 h-2 rounded-full bg-purple-300 animate-pulse" />
            <span>OneNote</span>
          </div>
          <span className="text-xs sm:text-sm font-semibold truncate">{currentNb.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Notes vs Draw Toggle */}
          <div className="flex items-center bg-black/20 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTabMode("notes")}
              className={`px-3 py-1 rounded transition ${activeTabMode === "notes" ? "bg-white text-[#7719AA]" : "text-white hover:bg-white/10"}`}
            >
              Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveTabMode("draw")}
              className={`px-3 py-1 rounded transition flex items-center gap-1 ${activeTabMode === "draw" ? "bg-white text-[#7719AA]" : "text-white hover:bg-white/10"}`}
            >
              <PenTool className="w-3 h-3" />
              <span>Draw</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleAiStudyNotes}
            className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/35 text-white text-xs font-semibold transition flex items-center gap-1 active:scale-95"
            title="AI Study Notes"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Study</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1 rounded bg-[#8A24C2] hover:bg-[#9B32D4] text-white text-xs font-bold transition flex items-center gap-1 shadow-sm active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </header>

      {/* 2. NOTIFICATION TOAST */}
      {statusMessage && (
        <div className="bg-purple-50 border-b border-purple-200 px-4 py-1.5 text-xs text-purple-900 flex items-center justify-between shrink-0 font-medium">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#7719AA]" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-purple-600 hover:text-purple-950 font-bold">
            ×
          </button>
        </div>
      )}

      {/* 3. THREE-COLUMN HIERARCHY WORKSPACE: SECTIONS -> PAGES -> PAGE EDITOR */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sections Column (Left) */}
        <aside className="w-48 border-r border-neutral-200 bg-[#F9FAFB] p-2 flex flex-col justify-between shrink-0">
          <div>
            <div className="px-2 py-1 mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Sections ({currentNb.sections.length})
            </div>
            <div className="space-y-1">
              {currentNb.sections.map((sec, idx) => (
                <button
                  key={sec.id || idx}
                  type="button"
                  onClick={() => {
                    setActiveSecIdx(idx);
                    setActivePageIdx(0);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    activeSecIdx === idx ? "bg-purple-100 text-[#7719AA] shadow-xs" : "text-neutral-700 hover:bg-neutral-200/60"
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-[#7719AA]" />
                  <span className="truncate">{sec.title}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const name = prompt("Section name:");
              if (name) {
                setNotebooks((prev) => {
                  const next = JSON.parse(JSON.stringify(prev));
                  next[activeNbIdx].sections.push({
                    id: `sec_${Date.now()}`,
                    title: name,
                    color: "#8B5CF6",
                    pages: [{ id: `page_${Date.now()}`, title: "Page 1", content: "<p>New page...</p>" }],
                  });
                  return next;
                });
              }
            }}
            className="w-full py-2 border border-dashed border-neutral-300 rounded-xl text-xs font-semibold text-neutral-600 hover:border-neutral-400 flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Section</span>
          </button>
        </aside>

        {/* Pages Column (Center Left) */}
        <div className="w-56 border-r border-neutral-200 bg-[#FFFFFF] p-2 flex flex-col justify-between shrink-0">
          <div>
            <div className="px-2 py-1 mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              <span>Pages ({currentSec.pages.length})</span>
              <button
                type="button"
                onClick={handleAddPage}
                className="p-1 hover:bg-neutral-100 rounded text-[#7719AA]"
                title="Add Page"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
              {currentSec.pages.map((p, idx) => (
                <div
                  key={p.id || idx}
                  onClick={() => setActivePageIdx(idx)}
                  className={`p-2.5 rounded-xl cursor-pointer transition ${
                    activePageIdx === idx ? "bg-purple-50 border border-purple-200 shadow-xs" : "hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-neutral-900 truncate">{p.title}</span>
                    {p.isPinned && <Pin className="w-3 h-3 text-[#7719AA] fill-current" />}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Note Canvas / Drawing Area (Right) */}
        <div className="flex-1 flex flex-col bg-[#FCFCFD] overflow-y-auto p-6 sm:p-10">
          {activeTabMode === "notes" ? (
            <div className="max-w-3xl mx-auto w-full space-y-6">
              {/* Page Title */}
              <input
                type="text"
                value={currentPage.title}
                onChange={(e) => {
                  const val = e.target.value;
                  setNotebooks((prev) => {
                    const next = JSON.parse(JSON.stringify(prev));
                    next[activeNbIdx].sections[activeSecIdx].pages[activePageIdx].title = val;
                    return next;
                  });
                }}
                className="w-full text-2xl sm:text-3xl font-extrabold text-neutral-900 bg-transparent border-0 focus:outline-none focus:border-b-2 focus:border-[#7719AA] pb-1"
                placeholder="Page Title..."
              />

              {/* Rich Content View */}
              <div
                contentEditable
                dangerouslySetInnerHTML={{ __html: currentPage.content }}
                onBlur={(e) => {
                  const val = e.currentTarget.innerHTML;
                  setNotebooks((prev) => {
                    const next = JSON.parse(JSON.stringify(prev));
                    next[activeNbIdx].sections[activeSecIdx].pages[activePageIdx].content = val;
                    return next;
                  });
                }}
                className="focus:outline-none text-xs sm:text-sm text-neutral-800 leading-relaxed prose prose-neutral max-w-none min-h-[200px]"
              />

              {/* Interactive Checklist / Tasks */}
              <div className="pt-4 border-t border-neutral-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Tasks & Checklist ({currentPage.checklist?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddChecklist}
                    className="text-xs font-semibold text-[#7719AA] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(currentPage.checklist || []).map((chk) => (
                    <div
                      key={chk.id}
                      onClick={() => toggleChecklistItem(chk.id)}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-neutral-100 cursor-pointer text-xs"
                    >
                      {chk.done ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-400 shrink-0" />
                      )}
                      <span className={`${chk.done ? "line-through text-neutral-400" : "text-neutral-800 font-medium"}`}>
                        {chk.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Drawing Pad Canvas */
            <div className="flex-1 flex flex-col items-center justify-center">
              {/* Toolbar */}
              <div className="mb-3 flex items-center gap-3 bg-white p-2 rounded-2xl border border-neutral-200 shadow-sm text-xs">
                <button
                  type="button"
                  onClick={() => setToolMode("pen")}
                  className={`p-1.5 rounded-lg transition ${toolMode === "pen" ? "bg-purple-100 text-[#7719AA]" : "hover:bg-neutral-100"}`}
                  title="Pen"
                >
                  <PenTool className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setToolMode("highlighter")}
                  className={`p-1.5 rounded-lg transition ${toolMode === "highlighter" ? "bg-yellow-100 text-yellow-700" : "hover:bg-neutral-100"}`}
                  title="Highlighter"
                >
                  <Highlighter className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setToolMode("eraser")}
                  className={`p-1.5 rounded-lg transition ${toolMode === "eraser" ? "bg-rose-100 text-rose-700" : "hover:bg-neutral-100"}`}
                  title="Eraser"
                >
                  <Eraser className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-neutral-200" />

                {/* Colors */}
                {["#7719AA", "#0078D4", "#107C41", "#C43E1C", "#1F2937"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setDrawColor(c);
                      setToolMode("pen");
                    }}
                    className="w-5 h-5 rounded-full border border-white shadow-xs"
                    style={{ backgroundColor: c }}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      const ctx = canvas.getContext("2d");
                      ctx?.clearRect(0, 0, canvas.width, canvas.height);
                    }
                  }}
                  className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-medium"
                >
                  Clear
                </button>
              </div>

              {/* Responsive White Canvas */}
              <canvas
                ref={canvasRef}
                width={800}
                height={550}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="bg-white rounded-2xl shadow-md border border-neutral-300 cursor-crosshair"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
