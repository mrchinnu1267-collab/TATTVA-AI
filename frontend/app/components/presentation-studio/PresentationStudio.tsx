"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  PresentationState,
  StudioSlide,
  PresentationTheme,
  TransitionType,
  AnimationType,
  SlideElement,
  ViewMode,
} from "./types";
import { PRESENTATION_THEMES } from "./themes";
import { RibbonToolbar } from "./RibbonToolbar";
import { SlideThumbnailPanel } from "./SlideThumbnailPanel";
import { SlideCanvas } from "./SlideCanvas";
import { NotesPanel } from "./NotesPanel";
import { StatusBar } from "./StatusBar";
import { SlideShowViewer } from "./SlideShowViewer";
import { AIAssistantPanel } from "./AIAssistantPanel";
import {
  Save,
  RotateCcw,
  RotateCw,
  Play,
  Search,
  MessageSquare,
  Share2,
  Minus,
  Square,
  X,
  Zap,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface PresentationStudioProps {
  initialTitle?: string;
  initialSlides?: Array<{
    number?: number;
    title: string;
    category?: string;
    bullets: string[];
    takeaway?: string;
    notes?: string;
  }>;
  initialThemeId?: string;
  downloadUrl?: string;
  onClose?: () => void;
  onOpenWith?: () => void;
  vaultFileId?: string;
}

export function PresentationStudio({
  initialTitle = "SMART INSPECT SIH IDEA Professional",
  initialSlides,
  initialThemeId = "dark_modern",
  downloadUrl: initialDownloadUrl,
  onClose,
  onOpenWith,
  vaultFileId,
}: PresentationStudioProps) {
  // 1. Initial Slide Deck Setup (matching reference presentation)
  const fallbackSlides: StudioSlide[] = [
    {
      id: "slide_1",
      number: 1,
      title: "SMART-INSPECT",
      category: "FOUNDATIONS",
      bullets: [
        "Real-time monitoring & inspection for field-level welfare operations.",
        "A trusted digital trail from field evidence to verified executive action.",
        "Field capture, offline-first execution, and live decision support.",
      ],
      takeaway: "A trusted digital trail from field evidence to action.",
      notes: "Speaker Notes: Welcome the stakeholders and introduce the SMART-INSPECT core mission.",
      elements: [
        {
          id: "el_proc_1",
          type: "process",
          x: 65,
          y: 20,
          w: 30,
          h: 60,
          processSteps: [
            { step: 1, title: "CAPTURE", desc: "Field Capture", color: "#EA580C" },
            { step: 2, title: "VERIFY", desc: "Offline-First", color: "#10B981" },
            { step: 3, title: "SYNC", desc: "Live Decision Support", color: "#00E5FF" },
            { step: 4, title: "ACT", desc: "Automated Triggers", color: "#FFFFFF" },
          ],
        },
      ],
    },
    {
      id: "slide_2",
      number: 2,
      title: "Core Cognitive Architecture",
      category: "ARCHITECTURE",
      bullets: [
        "Foundation models act as unified natural language understanding engines.",
        "Hierarchical planners decompose complex multi-step inspection workflows.",
        "Encrypted state stores maintain local integrity and synchronise on reconnect.",
      ],
      takeaway: "Decoupled architecture guarantees zero data loss under intermittent networks.",
      notes: "Speaker Notes: Emphasize the offline-first sync capability and cryptography.",
    },
    {
      id: "slide_3",
      number: 3,
      title: "Field Deployment & Verification Results",
      category: "EVALUATION",
      bullets: [
        "Benchmarked 99.4% inspection accuracy across 12,000+ field assessments.",
        "Sub-second verification feedback latency via client-side neural validation.",
        "Full OpenXML compliance with automated audit reports generated on-demand.",
      ],
      takeaway: "Production-ready scalability with verified domain compliance.",
      notes: "Speaker Notes: Review benchmarks and summarize strategic next steps.",
    },
  ];

  const parsedInitialSlides: StudioSlide[] =
    initialSlides && initialSlides.length > 0
      ? initialSlides.map((s, idx) => ({
          id: `slide_${idx + 1}_${Date.now()}`,
          number: s.number || idx + 1,
          title: s.title || `Slide ${idx + 1}`,
          category: s.category || "ANALYSIS",
          bullets: s.bullets && s.bullets.length > 0 ? s.bullets : ["Key domain mechanism."],
          takeaway: s.takeaway || undefined,
          notes: s.notes || `Speaker Notes: Discussion points for ${s.title}.`,
          elements: (s as any).elements || [],
        }))
      : fallbackSlides;

  // 2. Main Studio State
  const [activeTab, setActiveTab] = useState<string>("Home");
  const [slides, setSlides] = useState<StudioSlide[]>(parsedInitialSlides);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [title, setTitle] = useState<string>(initialTitle);
  const [currentThemeId, setCurrentThemeId] = useState<string>(initialThemeId);
  const [currentTransition, setCurrentTransition] = useState<TransitionType>("fade");
  const [transitionDuration, setTransitionDuration] = useState<number>(0.7);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>("none");
  const [zoom, setZoom] = useState<number>(84); // 84% zoom matching screenshot!
  const [showNotes, setShowNotes] = useState<boolean>(true);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [isPresenting, setIsPresenting] = useState<boolean>(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving" | "failed">("saved");
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [showRuler, setShowRuler] = useState<boolean>(false);
  const [showGridlines, setShowGridlines] = useState<boolean>(false);
  const [showGuides, setShowGuides] = useState<boolean>(false);
  const [drawingTool, setDrawingTool] = useState<"none" | "pen" | "highlighter" | "eraser">("none");
  const [drawingColor, setDrawingColor] = useState<string>("#EA580C");
  const [drawingWidth, setDrawingWidth] = useState<number>(4);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 3. Undo/Redo State History Stack
  const [history, setHistory] = useState<StudioSlide[][]>([parsedInitialSlides]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isUndoRedoAction = useRef<boolean>(false);

  const currentTheme: PresentationTheme =
    PRESENTATION_THEMES.find((t) => t.id === currentThemeId) || PRESENTATION_THEMES[0];

  const currentSlide: StudioSlide = slides[currentSlideIndex] || slides[0] || fallbackSlides[0];

  // Helper to push history state
  const pushHistory = useCallback((newSlides: StudioSlide[]) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newSlides];
    });
    setHistoryIndex((prev) => prev + 1);
    setSaveStatus("unsaved");
  }, [historyIndex]);

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const targetIndex = historyIndex - 1;
      setHistoryIndex(targetIndex);
      setSlides(history[targetIndex]);
      setSaveStatus("unsaved");
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const targetIndex = historyIndex + 1;
      setHistoryIndex(targetIndex);
      setSlides(history[targetIndex]);
      setSaveStatus("unsaved");
    }
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Update whole presentation state (used by AI agent)
  const handleUpdatePresentationFromAI = (next: PresentationState) => {
    setSlides(next.slides);
    setTitle(next.title);
    setCurrentThemeId(next.theme.id);
    if (next.currentSlideIndex !== undefined) {
      setCurrentSlideIndex(next.currentSlideIndex);
    }
    pushHistory(next.slides);
  };

  // Slide CRUD actions
  const handleAddSlide = useCallback((layout?: string) => {
    const newSlide: StudioSlide = {
      id: `slide_${Date.now()}`,
      number: slides.length + 1,
      title: layout === "title" ? title : `Key Analysis Point ${slides.length + 1}`,
      category: "ANALYSIS",
      bullets: [
        "Verified architectural specification and domain principles.",
        "Systematic operational workflows with high-integrity telemetry.",
      ],
      takeaway: "High-value synthesis callout.",
      notes: "Speaker notes: Outline the critical takeaways.",
      elements: [],
    };
    const nextSlides = [...slides, newSlide];
    setSlides(nextSlides);
    setCurrentSlideIndex(nextSlides.length - 1);
    pushHistory(nextSlides);
  }, [slides, title, pushHistory]);

  const handleDuplicateSlide = useCallback((idx: number) => {
    const target = slides[idx];
    if (!target) return;
    const clone: StudioSlide = {
      ...target,
      id: `slide_${Date.now()}`,
      title: `${target.title} (Copy)`,
      elements: target.elements ? JSON.parse(JSON.stringify(target.elements)) : [],
    };
    const nextSlides = [...slides];
    nextSlides.splice(idx + 1, 0, clone);
    nextSlides.forEach((s, i) => (s.number = i + 1));
    setSlides(nextSlides);
    setCurrentSlideIndex(idx + 1);
    pushHistory(nextSlides);
  }, [slides, pushHistory]);

  const handleDeleteSlide = useCallback((idx: number) => {
    if (slides.length <= 1) return;
    const nextSlides = slides.filter((_, i) => i !== idx);
    nextSlides.forEach((s, i) => (s.number = i + 1));
    setSlides(nextSlides);
    setCurrentSlideIndex(Math.min(idx, nextSlides.length - 1));
    pushHistory(nextSlides);
  }, [slides, pushHistory]);

  const handleMoveSlide = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= slides.length) return;
    const nextSlides = [...slides];
    const [moved] = nextSlides.splice(fromIndex, 1);
    nextSlides.splice(toIndex, 0, moved);
    nextSlides.forEach((s, i) => (s.number = i + 1));
    setSlides(nextSlides);
    setCurrentSlideIndex(toIndex);
    pushHistory(nextSlides);
  }, [slides, pushHistory]);

  const handleUpdateCurrentSlide = useCallback((updates: Partial<StudioSlide>) => {
    setSlides((prev) => {
      const next = [...prev];
      next[currentSlideIndex] = { ...next[currentSlideIndex], ...updates };
      pushHistory(next);
      return next;
    });
  }, [currentSlideIndex, pushHistory]);

  // Elements actions
  const handleAddElement = useCallback(
    (type: "textbox" | "shape" | "table" | "process" | "image", shapeType?: any) => {
      const newEl: SlideElement = {
        id: `el_${Date.now()}`,
        type,
        x: 20,
        y: 35,
        w: type === "textbox" ? 50 : 30,
        h: type === "textbox" ? 15 : 20,
        content: type === "textbox" ? "Click to edit text..." : undefined,
        shapeType: shapeType || "rectangle",
        fill: currentTheme.accent,
        tableData:
          type === "table"
            ? [
                ["Feature", "SMART-INSPECT", "Legacy System"],
                ["Offline-First Sync", "Yes (Verified)", "No"],
                ["Telemetry Feedback", "< 400ms", "> 3500ms"],
              ]
            : undefined,
        processSteps:
          type === "process"
            ? [
                { step: 1, title: "CAPTURE", desc: "Field Capture", color: "#EA580C" },
                { step: 2, title: "VERIFY", desc: "Offline-First", color: "#10B981" },
                { step: 3, title: "SYNC", desc: "Live Decision Support", color: "#00E5FF" },
                { step: 4, title: "ACT", desc: "Automated Triggers", color: "#FFFFFF" },
              ]
            : undefined,
      };

      const current = slides[currentSlideIndex];
      const nextEls = [...(current.elements || []), newEl];
      handleUpdateCurrentSlide({ elements: nextEls });
      setSelectedElementId(newEl.id);
    },
    [slides, currentSlideIndex, currentTheme, handleUpdateCurrentSlide]
  );

  const handleUpdateElement = useCallback(
    (elementId: string, updates: Partial<SlideElement>) => {
      const current = slides[currentSlideIndex];
      const nextEls = (current.elements || []).map((el) =>
        el.id === elementId ? { ...el, ...updates } : el
      );
      handleUpdateCurrentSlide({ elements: nextEls });
    },
    [slides, currentSlideIndex, handleUpdateCurrentSlide]
  );

  const handleDeleteElement = useCallback(
    (elementId: string) => {
      const current = slides[currentSlideIndex];
      const nextEls = (current.elements || []).filter((el) => el.id !== elementId);
      handleUpdateCurrentSlide({ elements: nextEls });
      setSelectedElementId(null);
    },
    [slides, currentSlideIndex, handleUpdateCurrentSlide]
  );

  // Formatting text
  const handleFormatText = (command: string) => {
    if (!selectedElementId) return;
    const current = slides[currentSlideIndex];
    const target = current.elements?.find((e) => e.id === selectedElementId);
    if (!target) return;

    if (command === "bold") handleUpdateElement(selectedElementId, { bold: !target.bold });
    else if (command === "italic") handleUpdateElement(selectedElementId, { italic: !target.italic });
    else if (command === "underline") handleUpdateElement(selectedElementId, { underline: !target.underline });
    else if (command === "strikethrough") handleUpdateElement(selectedElementId, { strikethrough: !target.strikethrough });
    else if (command === "alignLeft") handleUpdateElement(selectedElementId, { align: "left" });
    else if (command === "alignCenter") handleUpdateElement(selectedElementId, { align: "center" });
    else if (command === "alignRight") handleUpdateElement(selectedElementId, { align: "right" });
    else if (command === "alignJustify") handleUpdateElement(selectedElementId, { align: "justify" });
  };

  // Compile & Download Genuine PPTX
  const handleDownloadPptx = async () => {
    try {
      setSaveStatus("saving");
      const res = await fetch("/api/presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "compile",
          presentation: {
            title,
            subtitle: "Verified Presentation Deck",
            theme: currentTheme,
            slides,
          },
        }),
      });

      if (!res.ok) throw new Error("Compilation failed in Python engine");
      const data = await res.json();

      if (data.document?.dataUri || data.document?.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.document.dataUri || data.document.downloadUrl;
        a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pptx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setSaveStatus("saved");
      }
    } catch (err) {
      console.error(err);
      setSaveStatus("failed");
    }
  };

  // Save changes
  const handleSave = () => {
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
    }, 400);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault();
        setIsPresenting(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Full presentation state bundle for AI Assistant
  const presentationStateObj: PresentationState = {
    id: vaultFileId || "pres_current",
    title,
    subtitle: "",
    theme: currentTheme,
    transition: { type: currentTransition, duration: transitionDuration },
    slides,
    currentSlideIndex,
    selectedElementId,
    zoom,
    showNotes,
    showThumbnails,
    isSlideShow: isPresenting,
    viewMode,
    saveStatus,
    autoSave,
    showRuler,
    showGridlines,
    showGuides,
    drawingTool,
    drawingColor,
    drawingWidth,
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#181818] text-[#E0E0E0] overflow-hidden font-sans select-none">
      {/* 
        1. TOP TITLE BAR (Exactly matching Microsoft PowerPoint screenshot!)
        AutoSave toggle, Save, Undo, Redo, Present, Title with Saved dropdown, Search, User Initials, Window buttons
      */}
      <header className="h-10 bg-[#1C1C1C] border-b border-[#2B2B2B] px-3 flex items-center justify-between text-xs select-none shrink-0 shadow-xs">
        {/* Left: AutoSave toggle + Quick Access Toolbar */}
        <div className="flex items-center space-x-2.5">
          {/* PowerPoint Brand Icon */}
          <div className="w-5 h-5 rounded bg-[#C43E1C] flex items-center justify-center font-black text-white text-[11px] shadow-sm">
            P
          </div>

          {/* AutoSave Toggle matching screenshot */}
          <div
            onClick={() => setAutoSave(!autoSave)}
            className="flex items-center space-x-1.5 cursor-pointer text-[11px] font-semibold"
          >
            <span>AutoSave</span>
            <div
              className={`w-7 h-4 rounded-full p-0.5 transition-colors ${
                autoSave ? "bg-[#EA580C]" : "bg-[#444444]"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-transform ${
                  autoSave ? "translate-x-3" : "translate-x-0"
                }`}
              />
            </div>
            <span className="text-[10px] text-[#A0A0A0]">{autoSave ? "On" : "Off"}</span>
          </div>

          {/* Quick Access Icons: Save, Undo, Redo, Present */}
          <div className="flex items-center space-x-1 pl-1 border-l border-[#333333]">
            <button
              onClick={handleSave}
              className="p-1 rounded hover:bg-[#2A2A2A] text-[#CCCCCC] hover:text-white transition"
              title="Save (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-1 rounded hover:bg-[#2A2A2A] text-[#CCCCCC] hover:text-white disabled:opacity-30 transition"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-1 rounded hover:bg-[#2A2A2A] text-[#CCCCCC] hover:text-white disabled:opacity-30 transition"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPresenting(true)}
              className="p-1 rounded hover:bg-[#2A2A2A] text-[#CCCCCC] hover:text-white transition"
              title="Start From Beginning (F5)"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Presentation Filename with "• Saved v" and Search bar */}
        <div className="flex items-center space-x-3 max-w-md w-full justify-center">
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-[#2A2A2A] cursor-pointer">
            <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
              {title}
            </span>
            <span className="text-[11px] text-[#999999]">• Saved</span>
            <ChevronDown className="w-3 h-3 text-[#777777]" />
          </div>

          <div className="relative hidden md:block w-48">
            <Search className="w-3 h-3 absolute left-2.5 top-2 text-[#777777]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141414] border border-[#333333] rounded pl-7 pr-2 py-1 text-[11px] text-[#CCCCCC] focus:outline-none focus:border-[#EA580C]"
            />
          </div>
        </div>

        {/* Right: Comments, Orange Share Button, User Profile Initial "MK", Window Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded hover:bg-[#2A2A2A] text-[#CCCCCC]"
            title="Comments"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-[11px]">Comments</span>
          </button>

          {/* Orange Share Button matching screenshot */}
          <button
            onClick={handleDownloadPptx}
            className="flex items-center space-x-1 px-3 py-1 bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded font-semibold text-xs shadow-sm transition"
            title="Export / Share Presentation"
          >
            <Share2 className="w-3 h-3" />
            <span>Share</span>
          </button>

          {/* User Profile initials "MK" in green circle matching screenshot */}
          <div
            className="w-6 h-6 rounded-full bg-[#107C41] flex items-center justify-center font-bold text-white text-[10px] shadow-sm shrink-0"
            title="Kotapati Gowtham Chowdary (Verified Account)"
          >
            MK
          </div>

          {/* Window controls (Minimize, Maximize, Close) matching screenshot */}
          <div className="flex items-center space-x-1 pl-1">
            <button
              onClick={() => {}}
              className="p-1 hover:bg-[#2A2A2A] text-[#888888] hover:text-white rounded"
              title="Minimize"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={() => {}}
              className="p-1 hover:bg-[#2A2A2A] text-[#888888] hover:text-white rounded"
              title="Maximize"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-rose-700 text-[#888888] hover:text-white rounded transition"
              title="Close PowerPoint Studio"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. 12 RIBBON TABS & CONTEXTUAL TOOLBAR */}
      <RibbonToolbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSave={handleSave}
        onDownload={handleDownloadPptx}
        onOpenWith={() => {}}
        onStartSlideShow={(fromBeg) => {
          if (fromBeg) setCurrentSlideIndex(0);
          setIsPresenting(true);
        }}
        onAddSlide={handleAddSlide}
        onDuplicateSlide={() => handleDuplicateSlide(currentSlideIndex)}
        onDeleteSlide={() => handleDeleteSlide(currentSlideIndex)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onFormatText={handleFormatText}
        onAddElement={handleAddElement}
        currentThemeId={currentThemeId}
        onSelectTheme={setCurrentThemeId}
        currentTransition={currentTransition}
        transitionDuration={transitionDuration}
        onSelectTransition={setCurrentTransition}
        onChangeTransitionDuration={setTransitionDuration}
        onApplyTransitionToAll={() => {
          const updated = slides.map((s) => ({
            ...s,
            transition: currentTransition,
            transitionDuration,
          }));
          setSlides(updated);
          pushHistory(updated);
        }}
        currentAnimation={currentAnimation}
        onSelectAnimation={setCurrentAnimation}
        zoom={zoom}
        setZoom={setZoom}
        showNotes={showNotes}
        setShowNotes={setShowNotes}
        showThumbnails={showThumbnails}
        setShowThumbnails={setShowThumbnails}
        viewMode={viewMode}
        setViewMode={setViewMode}
        saveStatus={saveStatus}
        showRuler={showRuler}
        setShowRuler={setShowRuler}
        showGridlines={showGridlines}
        setShowGridlines={setShowGridlines}
        showGuides={showGuides}
        setShowGuides={setShowGuides}
        drawingTool={drawingTool}
        setDrawingTool={setDrawingTool}
        drawingColor={drawingColor}
        setDrawingColor={setDrawingColor}
        onToggleAIAssistant={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
        isAIAssistantOpen={isAIAssistantOpen}
      />

      {/* 3. MAIN WORKSPACE (Left Thumbnails + Center 16:9 Canvas + Right AI Assistant) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Thumbnails Panel */}
        {showThumbnails && (
          <SlideThumbnailPanel
            slides={slides}
            currentSlideIndex={currentSlideIndex}
            onSelectSlide={setCurrentSlideIndex}
            onAddSlide={handleAddSlide}
            onDuplicateSlide={handleDuplicateSlide}
            onDeleteSlide={handleDeleteSlide}
            onMoveSlide={handleMoveSlide}
            theme={currentTheme}
          />
        )}

        {/* Central Workspace + Bottom Notes */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#141414]">
          <SlideCanvas
            slide={currentSlide}
            slideIndex={currentSlideIndex}
            totalSlides={slides.length}
            theme={currentTheme}
            zoom={zoom}
            onUpdateSlide={handleUpdateCurrentSlide}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            showRuler={showRuler}
            showGridlines={showGridlines}
            showGuides={showGuides}
            drawingTool={drawingTool}
            drawingColor={drawingColor}
            drawingWidth={drawingWidth}
          />

          {/* Notes Panel ("Click to add notes" expandable panel) */}
          <NotesPanel
            slide={currentSlide}
            slideIndex={currentSlideIndex}
            showNotes={showNotes}
            setShowNotes={setShowNotes}
            onUpdateNotes={(notes) => handleUpdateCurrentSlide({ notes })}
          />
        </div>

        {/* Right Docked Gemini AI Presentation Assistant Panel */}
        <AIAssistantPanel
          isOpen={isAIAssistantOpen}
          onClose={() => setIsAIAssistantOpen(false)}
          presentation={presentationStateObj}
          onUpdatePresentation={handleUpdatePresentationFromAI}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
        />
      </div>

      {/* 4. BOTTOM STATUS BAR (Slide 1 of 6, English, Accessibility, Zoom Slider) */}
      <StatusBar
        currentSlideIndex={currentSlideIndex}
        totalSlides={slides.length}
        showNotes={showNotes}
        setShowNotes={setShowNotes}
        showThumbnails={showThumbnails}
        setShowThumbnails={setShowThumbnails}
        onStartSlideShow={() => setIsPresenting(true)}
        zoom={zoom}
        setZoom={setZoom}
        saveStatus={saveStatus}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* 5. FULLSCREEN SLIDESHOW VIEWER (Triggered by F5 or Present button) */}
      {isPresenting && (
        <SlideShowViewer
          slides={slides}
          initialSlideIndex={currentSlideIndex}
          theme={currentTheme}
          transition={currentTransition}
          transitionDuration={transitionDuration}
          onClose={() => setIsPresenting(false)}
        />
      )}
    </div>
  );
}

export default PresentationStudio;
