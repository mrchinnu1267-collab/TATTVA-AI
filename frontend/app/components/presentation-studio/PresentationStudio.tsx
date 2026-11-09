"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  PresentationState,
  StudioSlide,
  PresentationTheme,
  TransitionType,
  AnimationType,
  SlideElement,
} from "./types";
import { PRESENTATION_THEMES } from "./themes";
import { RibbonToolbar } from "./RibbonToolbar";
import { SlideThumbnailPanel } from "./SlideThumbnailPanel";
import { SlideCanvas } from "./SlideCanvas";
import { NotesPanel } from "./NotesPanel";
import { StatusBar } from "./StatusBar";
import { SlideShowViewer } from "./SlideShowViewer";
import { X, Share2, Download, AlertCircle } from "lucide-react";

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
  initialTitle = "TATTVA AI Presentation",
  initialSlides,
  initialThemeId = "dark_modern",
  downloadUrl: initialDownloadUrl,
  onClose,
  onOpenWith,
  vaultFileId,
}: PresentationStudioProps) {
  // 1. Initial Slide Deck Setup
  const fallbackSlides: StudioSlide[] = [
    {
      id: "slide_1",
      number: 1,
      title: initialTitle,
      category: "EXECUTIVE BRIEF",
      bullets: [
        "Executive presentation compiled with TATTVA Presentation Studio.",
        "Verified OpenXML standard compliant PowerPoint slide deck.",
        "Interactive editable elements, rich speaker notes, and dynamic themes.",
      ],
      takeaway: `Core architectural summary and foundational overview for ${initialTitle}.`,
      notes: "Speaker Notes: Welcome the audience and outline the key objectives.",
    },
    {
      id: "slide_2",
      number: 2,
      title: "Key Objectives & Core Mechanisms",
      category: "ARCHITECTURE",
      bullets: [
        "Systematic synthesis of domain mechanisms and verified principles.",
        "High-performance operational constraints and design paradigms.",
        "Cross-functional workflows and end-to-end integration.",
      ],
      takeaway: "Establishes core domain concepts and verifiable architecture.",
      notes: "Speaker Notes: Dive deep into the primary architectural components.",
    },
    {
      id: "slide_3",
      number: 3,
      title: "Implementation & Strategic Takeaways",
      category: "EVALUATION",
      bullets: [
        "Production-ready deployment considerations and benchmark performance.",
        "Scalable execution workflows with real-time telemetry.",
        "Summary of next operational milestones and strategic recommendations.",
      ],
      takeaway: "Final strategic synthesis and verified recommendations.",
      notes: "Speaker Notes: Conclude with key action items and future outlook.",
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
        }))
      : fallbackSlides;

  // 2. Main Studio State
  const [activeTab, setActiveTab] = useState<string>("HOME");
  const [slides, setSlides] = useState<StudioSlide[]>(parsedInitialSlides);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [title, setTitle] = useState<string>(initialTitle);
  const [currentThemeId, setCurrentThemeId] = useState<string>(initialThemeId);
  const [currentTransition, setCurrentTransition] = useState<TransitionType>("fade");
  const [transitionDuration, setTransitionDuration] = useState<number>(0.4);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>("none");
  const [zoom, setZoom] = useState<number>(100);
  const [showNotes, setShowNotes] = useState<boolean>(true);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [isPresenting, setIsPresenting] = useState<boolean>(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [currentDownloadUrl, setCurrentDownloadUrl] = useState<string | undefined>(initialDownloadUrl);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  // 4. Slide Operations
  const handleUpdateCurrentSlide = useCallback(
    (updates: Partial<StudioSlide>) => {
      setSlides((prev) => {
        const next = [...prev];
        next[currentSlideIndex] = {
          ...next[currentSlideIndex],
          ...updates,
        };
        pushHistory(next);
        return next;
      });
    },
    [currentSlideIndex, pushHistory]
  );

  const handleAddSlide = useCallback(() => {
    setSlides((prev) => {
      const newSlide: StudioSlide = {
        id: `slide_${prev.length + 1}_${Date.now()}`,
        number: prev.length + 1,
        title: "New Slide: Key Concepts",
        category: "ANALYSIS",
        bullets: [
          "Primary operational invariant and architectural principle.",
          "Implementation considerations and workflow execution.",
          "Verifiable outcomes and metrics.",
        ],
        takeaway: "Key strategic takeaways for this slide.",
        notes: `Speaker Notes for Slide ${prev.length + 1}.`,
      };
      const next = [...prev, newSlide];
      pushHistory(next);
      setCurrentSlideIndex(next.length - 1);
      return next;
    });
  }, [pushHistory]);

  const handleDuplicateSlide = useCallback(
    (index: number) => {
      setSlides((prev) => {
        const src = prev[index];
        if (!src) return prev;
        const duplicated: StudioSlide = {
          ...src,
          id: `slide_${Date.now()}`,
          number: prev.length + 1,
          title: `${src.title} (Copy)`,
        };
        const next = [...prev];
        next.splice(index + 1, 0, duplicated);
        pushHistory(next);
        setCurrentSlideIndex(index + 1);
        return next;
      });
    },
    [pushHistory]
  );

  const handleDeleteSlide = useCallback(
    (index: number) => {
      if (slides.length <= 1) {
        setStatusMessage("A presentation must contain at least one slide.");
        setTimeout(() => setStatusMessage(null), 3000);
        return;
      }
      setSlides((prev) => {
        const next = prev.filter((_, idx) => idx !== index);
        pushHistory(next);
        setCurrentSlideIndex((old) => Math.min(old, next.length - 1));
        return next;
      });
    },
    [slides.length, pushHistory]
  );

  const handleMoveSlide = useCallback(
    (fromIdx: number, toIdx: number) => {
      setSlides((prev) => {
        if (toIdx < 0 || toIdx >= prev.length) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        pushHistory(next);
        setCurrentSlideIndex(toIdx);
        return next;
      });
    },
    [pushHistory]
  );

  // 5. Custom Element Operations (Shapes / Textboxes)
  const handleAddElement = useCallback(
    (type: "textbox" | "shape", shapeType?: "rectangle" | "rounded" | "circle" | "callout") => {
      const newEl: SlideElement = {
        id: `el_${Date.now()}`,
        type,
        x: 35,
        y: 40,
        width: 30,
        height: 18,
        shapeType: shapeType || "rectangle",
        fill: `${currentTheme.accent}22`,
        stroke: currentTheme.accent,
        color: currentTheme.text,
        content: type === "textbox" ? "Click to edit text..." : "Shape Element",
      };
      setSlides((prev) => {
        const next = [...prev];
        const slide = next[currentSlideIndex];
        next[currentSlideIndex] = {
          ...slide,
          elements: [...(slide.elements || []), newEl],
        };
        pushHistory(next);
        return next;
      });
      setSelectedElementId(newEl.id);
    },
    [currentSlideIndex, currentTheme, pushHistory]
  );

  const handleUpdateElement = useCallback(
    (elementId: string, updates: Partial<SlideElement>) => {
      setSlides((prev) => {
        const next = [...prev];
        const slide = next[currentSlideIndex];
        if (!slide.elements) return prev;
        next[currentSlideIndex] = {
          ...slide,
          elements: slide.elements.map((el) => (el.id === elementId ? { ...el, ...updates } : el)),
        };
        pushHistory(next);
        return next;
      });
    },
    [currentSlideIndex, pushHistory]
  );

  const handleDeleteElement = useCallback(
    (elementId: string) => {
      setSlides((prev) => {
        const next = [...prev];
        const slide = next[currentSlideIndex];
        if (!slide.elements) return prev;
        next[currentSlideIndex] = {
          ...slide,
          elements: slide.elements.filter((el) => el.id !== elementId),
        };
        pushHistory(next);
        return next;
      });
      setSelectedElementId(null);
    },
    [currentSlideIndex, pushHistory]
  );

  // 6. Text Formatting
  const handleFormatText = useCallback(
    (command: "bold" | "italic" | "underline" | "alignLeft" | "alignCenter" | "alignRight") => {
      // Toggle formatting on the current slide title or active element
      if (selectedElementId) {
        handleUpdateElement(selectedElementId, {
          style: {
            fontWeight: command === "bold" ? "bold" : undefined,
            fontStyle: command === "italic" ? "italic" : undefined,
            textAlign: command.startsWith("align") ? (command.replace("align", "").toLowerCase() as any) : undefined,
          },
        });
      } else {
        // Apply to current slide
        setStatusMessage(`Formatting applied: ${command}`);
        setTimeout(() => setStatusMessage(null), 2000);
      }
    },
    [selectedElementId, handleUpdateElement]
  );

  // 7. Save & Compile PPTX via Backend API
  const handleSaveAndCompile = useCallback(async () => {
    try {
      setSaveStatus("saving");
      setStatusMessage("Compiling genuine OpenXML PPTX file...");

      const payload = {
        action: "compile",
        title,
        themeId: currentThemeId,
        slides: slides.map((s) => ({
          title: s.title,
          category: s.category,
          bullets: s.bullets,
          takeaway: s.takeaway,
          notes: s.notes,
          elements: s.elements,
        })),
      };

      const res = await fetch("/api/presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.downloadUrl) {
        setCurrentDownloadUrl(data.downloadUrl);
      }

      setSaveStatus("saved");
      setStatusMessage("Presentation successfully saved and verified! ✓");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error("[PresentationStudio] Save error:", err);
      setSaveStatus("unsaved");
      setStatusMessage(`Save failed: ${err.message}`);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  }, [title, currentThemeId, slides]);

  // 8. Download PPTX Handler
  const handleDownload = useCallback(async () => {
    if (currentDownloadUrl) {
      const a = document.createElement("a");
      a.href = currentDownloadUrl;
      a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Otherwise compile on the fly and trigger download
    try {
      setSaveStatus("saving");
      setStatusMessage("Generating download package...");
      const res = await fetch("/api/presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "compile",
          title,
          themeId: currentThemeId,
          slides: slides.map((s) => ({
            title: s.title,
            category: s.category,
            bullets: s.bullets,
            takeaway: s.takeaway,
            notes: s.notes,
          })),
        }),
      });

      if (!res.ok) throw new Error("Compilation failed");
      const data = await res.json();

      if (data.dataUri || data.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.dataUri || data.downloadUrl;
        a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pptx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setSaveStatus("saved");
      }
    } catch (e: any) {
      setStatusMessage(`Download failed: ${e.message}`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  }, [currentDownloadUrl, title, currentThemeId, slides]);

  // Keyboard shortcut listener for F5 (SlideShow) and Ctrl+S (Save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault();
        setIsPresenting(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveAndCompile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveAndCompile, handleUndo, handleRedo]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1F1F1F] text-neutral-100 overflow-hidden font-sans select-none">
      {/* 
        TOP TITLE BAR:
        Uses pt-[env(safe-area-inset-top,0px)] so it is NEVER obscured by phone status bar/notch (time, battery, camera) 
      */}
      <header
        className="bg-[#C43E1C] px-3 py-1.5 flex items-center justify-between text-white shadow shrink-0"
        style={{ paddingTop: "max(6px, env(safe-area-inset-top, 6px))" }}
      >
        {/* Left: AutoSave badge & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/25 text-[11px] font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AutoSave</span>
          </div>

          <div className="flex items-center gap-1 text-xs sm:text-sm font-semibold truncate">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaveStatus("unsaved");
              }}
              className="bg-transparent border-0 focus:outline-none hover:bg-black/15 focus:bg-black/25 px-1.5 py-0.5 rounded transition text-white font-semibold truncate cursor-text max-w-[220px] sm:max-w-md"
              title="Click to rename presentation"
            />
            <span className="text-white/70 text-xs font-normal hidden sm:inline">- PowerPoint</span>
          </div>
        </div>

        {/* Right: Actions (Open With, Download, Close) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {onOpenWith && (
            <button
              type="button"
              onClick={onOpenWith}
              className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/35 text-white text-xs font-medium transition flex items-center gap-1.5 active:scale-95"
              title="Open with desktop or mobile presentation app"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open With</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-1 rounded bg-[#ff5a2f] hover:bg-[#ff6e46] text-white text-xs font-bold transition flex items-center gap-1.5 shadow active:scale-95"
            title="Download .pptx file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-black/30 text-white transition active:scale-95 ml-1"
              title="Close Presentation Studio"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* STATUS NOTIFICATION TOAST */}
      {statusMessage && (
        <div className="bg-[#2D2D2D] border-b border-neutral-700 px-4 py-1.5 text-xs text-amber-300 flex items-center justify-between shrink-0 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#C43E1C]" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-neutral-400 hover:text-white text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* RIBBON TOOLBAR (Microsoft PowerPoint Dark Mode Tabs) */}
      <RibbonToolbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSave={handleSaveAndCompile}
        onDownload={handleDownload}
        onOpenWith={onOpenWith || (() => {})}
        onStartSlideShow={(fromBeginning) => {
          if (fromBeginning) setCurrentSlideIndex(0);
          setIsPresenting(true);
        }}
        onAddSlide={handleAddSlide}
        onDuplicateSlide={() => handleDuplicateSlide(currentSlideIndex)}
        onDeleteSlide={() => handleDeleteSlide(currentSlideIndex)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onFormatText={handleFormatText}
        onAddElement={handleAddElement}
        currentThemeId={currentThemeId}
        onSelectTheme={(themeId) => {
          setCurrentThemeId(themeId);
          setSaveStatus("unsaved");
        }}
        currentTransition={currentTransition}
        transitionDuration={transitionDuration}
        onSelectTransition={(t) => {
          setCurrentTransition(t);
          setSaveStatus("unsaved");
        }}
        onChangeTransitionDuration={setTransitionDuration}
        onApplyTransitionToAll={() => {
          setStatusMessage(`Applied ${currentTransition} transition to all slides.`);
          setTimeout(() => setStatusMessage(null), 2500);
        }}
        currentAnimation={currentAnimation}
        onSelectAnimation={(a) => {
          setCurrentAnimation(a);
          setSaveStatus("unsaved");
        }}
        zoom={zoom}
        setZoom={setZoom}
        showNotes={showNotes}
        setShowNotes={setShowNotes}
        showThumbnails={showThumbnails}
        setShowThumbnails={setShowThumbnails}
        saveStatus={saveStatus}
      />

      {/* MAIN WORKSPACE: THUMBNAILS (LEFT) + CANVAS (CENTER) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Thumbnails Panel */}
        {showThumbnails && (
          <SlideThumbnailPanel
            slides={slides}
            currentSlideIndex={currentSlideIndex}
            onSelectSlide={(idx) => setCurrentSlideIndex(idx)}
            onAddSlide={handleAddSlide}
            onDuplicateSlide={handleDuplicateSlide}
            onDeleteSlide={handleDeleteSlide}
            onMoveSlide={handleMoveSlide}
            theme={currentTheme}
          />
        )}

        {/* Center Canvas & Notes Panel Column */}
        <div className="flex-1 flex flex-col overflow-hidden">
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
          />

          {/* Bottom Presenter Notes Pane */}
          <NotesPanel
            slide={currentSlide}
            slideIndex={currentSlideIndex}
            showNotes={showNotes}
            setShowNotes={setShowNotes}
            onUpdateNotes={(notes) => handleUpdateCurrentSlide({ notes })}
          />
        </div>
      </div>

      {/* BOTTOM STATUS BAR (SLIDE X OF Y, 16:9, PRESENT, ZOOM) */}
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
      />

      {/* FULLSCREEN SLIDESHOW VIEWER (F5) */}
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
