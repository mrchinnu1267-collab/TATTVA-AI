"use client";

import React from "react";
import {
  Play,
  Save,
  Download,
  Share2,
  Plus,
  Copy,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  Table as TableIcon,
  Palette,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { PRESENTATION_THEMES } from "./themes";
import { TransitionType, AnimationType } from "./types";

interface RibbonToolbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSave: () => void;
  onDownload: () => void;
  onOpenWith: () => void;
  onStartSlideShow: (fromBeginning: boolean) => void;
  onAddSlide: () => void;
  onDuplicateSlide: () => void;
  onDeleteSlide: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onFormatText: (command: "bold" | "italic" | "underline" | "alignLeft" | "alignCenter" | "alignRight") => void;
  onAddElement: (type: "textbox" | "shape", shapeType?: "rectangle" | "rounded" | "circle" | "callout") => void;
  currentThemeId: string;
  onSelectTheme: (themeId: string) => void;
  currentTransition: TransitionType;
  transitionDuration: number;
  onSelectTransition: (type: TransitionType) => void;
  onChangeTransitionDuration: (duration: number) => void;
  onApplyTransitionToAll: () => void;
  currentAnimation: AnimationType;
  onSelectAnimation: (anim: AnimationType) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  showNotes: boolean;
  setShowNotes: (show: boolean) => void;
  showThumbnails: boolean;
  setShowThumbnails: (show: boolean) => void;
  saveStatus: "saved" | "unsaved" | "saving";
}

const TABS = [
  "FILE",
  "HOME",
  "INSERT",
  "DESIGN",
  "TRANSITIONS",
  "ANIMATIONS",
  "SLIDE SHOW",
  "REVIEW",
  "VIEW",
];

const TRANSITIONS: { id: TransitionType; label: string }[] = [
  { id: "none", label: "None" },
  { id: "morph", label: "Morph" },
  { id: "fade", label: "Fade" },
  { id: "push", label: "Push" },
  { id: "wipe", label: "Wipe" },
  { id: "split", label: "Split" },
  { id: "reveal", label: "Reveal" },
];

const ANIMATIONS: { id: AnimationType; label: string }[] = [
  { id: "none", label: "None" },
  { id: "appear", label: "Appear" },
  { id: "fadeIn", label: "Fade In" },
  { id: "flyIn", label: "Fly In" },
  { id: "zoomIn", label: "Zoom In" },
  { id: "bounce", label: "Bounce" },
];

export function RibbonToolbar({
  activeTab,
  setActiveTab,
  onSave,
  onDownload,
  onOpenWith,
  onStartSlideShow,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onFormatText,
  onAddElement,
  currentThemeId,
  onSelectTheme,
  currentTransition,
  transitionDuration,
  onSelectTransition,
  onChangeTransitionDuration,
  onApplyTransitionToAll,
  currentAnimation,
  onSelectAnimation,
  zoom,
  setZoom,
  showNotes,
  setShowNotes,
  showThumbnails,
  setShowThumbnails,
  saveStatus,
}: RibbonToolbarProps) {
  return (
    <div className="flex flex-col bg-[#1E1E1E] border-b border-neutral-700/80 text-neutral-200 select-none shrink-0 shadow-md">
      {/* 1. TABS HEADER ROW */}
      <div className="flex items-center px-2 bg-[#252526] border-b border-neutral-700/60 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("FILE")}
          className={`px-3 py-1.5 font-bold tracking-wider text-[11px] transition ${
            activeTab === "FILE"
              ? "bg-[#C43E1C] text-white"
              : "bg-[#C43E1C]/80 hover:bg-[#C43E1C] text-white"
          }`}
        >
          FILE
        </button>

        {TABS.slice(1).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-[11px] font-medium transition whitespace-nowrap ${
              activeTab === tab
                ? "bg-[#1E1E1E] text-white border-t-2 border-[#C43E1C] font-semibold"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
            }`}
          >
            {tab}
          </button>
        ))}

        <div className="ml-auto hidden sm:flex items-center gap-2 pr-2 text-[10px] text-neutral-400 font-mono">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              saveStatus === "saved"
                ? "bg-emerald-500"
                : saveStatus === "saving"
                ? "bg-amber-400 animate-pulse"
                : "bg-rose-400"
            }`}
          />
          <span className="capitalize">{saveStatus}</span>
        </div>
      </div>

      {/* 2. TAB CONTROLS STRIP */}
      <div className="px-3 py-2 bg-[#1E1E1E] min-h-[58px] flex items-center overflow-x-auto scrollbar-none text-xs gap-3">
        {/* ================= FILE TAB ================= */}
        {activeTab === "FILE" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
            >
              <Save className="w-4 h-4" />
              <span>Save & Compile PPTX</span>
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#C43E1C] hover:bg-[#a93315] text-white font-semibold transition"
            >
              <Download className="w-4 h-4" />
              <span>Download PPTX</span>
            </button>
            <button
              type="button"
              onClick={onOpenWith}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Open With External App</span>
            </button>
          </div>
        )}

        {/* ================= HOME TAB ================= */}
        {activeTab === "HOME" && (
          <div className="flex items-center gap-3 divide-x divide-neutral-700/60">
            {/* Undo / Redo */}
            <div className="flex items-center gap-1 pr-2">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="p-1.5 rounded hover:bg-neutral-800 disabled:opacity-30 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
                className="p-1.5 rounded hover:bg-neutral-800 disabled:opacity-30 transition"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Slides Operations */}
            <div className="flex items-center gap-1.5 px-2">
              <button
                type="button"
                onClick={onAddSlide}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#C43E1C]/20 hover:bg-[#C43E1C]/30 text-[#ff6842] border border-[#C43E1C]/40 font-medium transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Slide</span>
              </button>
              <button
                type="button"
                onClick={onDuplicateSlide}
                className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 transition"
                title="Duplicate Slide"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onDeleteSlide}
                className="p-1.5 rounded hover:bg-rose-950/60 text-rose-400 transition"
                title="Delete Slide"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Font Formatting */}
            <div className="flex items-center gap-1 px-2">
              <button
                type="button"
                onClick={() => onFormatText("bold")}
                className="p-1.5 rounded hover:bg-neutral-800 font-bold transition"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onFormatText("italic")}
                className="p-1.5 rounded hover:bg-neutral-800 italic transition"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onFormatText("underline")}
                className="p-1.5 rounded hover:bg-neutral-800 underline transition"
                title="Underline"
              >
                <Underline className="w-4 h-4" />
              </button>
            </div>

            {/* Paragraph Alignment */}
            <div className="flex items-center gap-1 px-2">
              <button
                type="button"
                onClick={() => onFormatText("alignLeft")}
                className="p-1.5 rounded hover:bg-neutral-800 transition"
                title="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onFormatText("alignCenter")}
                className="p-1.5 rounded hover:bg-neutral-800 transition"
                title="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onFormatText("alignRight")}
                className="p-1.5 rounded hover:bg-neutral-800 transition"
                title="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= INSERT TAB ================= */}
        {activeTab === "INSERT" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddElement("textbox")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition"
            >
              <Type className="w-4 h-4 text-sky-400" />
              <span>Text Box</span>
            </button>
            <button
              type="button"
              onClick={() => onAddElement("shape", "rectangle")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition"
            >
              <Square className="w-4 h-4 text-emerald-400" />
              <span>Rectangle</span>
            </button>
            <button
              type="button"
              onClick={() => onAddElement("shape", "rounded")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition"
            >
              <Square className="w-4 h-4 text-amber-400 rounded-sm" />
              <span>Card / Pill</span>
            </button>
            <button
              type="button"
              onClick={() => onAddElement("shape", "circle")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition"
            >
              <Circle className="w-4 h-4 text-purple-400" />
              <span>Circle / Node</span>
            </button>
          </div>
        )}

        {/* ================= DESIGN TAB (THEMES) ================= */}
        {activeTab === "DESIGN" && (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-0.5">
            <span className="text-[11px] text-neutral-400 uppercase font-semibold mr-1">
              Themes:
            </span>
            {PRESENTATION_THEMES.map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => onSelectTheme(th.id)}
                className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition ${
                  currentThemeId === th.id
                    ? "border-[#C43E1C] bg-[#C43E1C]/15 ring-1 ring-[#C43E1C]"
                    : "border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700"
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-black/30 shadow-inner shrink-0"
                  style={{ backgroundColor: th.accent }}
                />
                <span className="text-[11px] font-medium whitespace-nowrap text-neutral-200">
                  {th.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ================= TRANSITIONS TAB ================= */}
        {activeTab === "TRANSITIONS" && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-neutral-400 uppercase font-semibold">
              Slide Transition:
            </span>
            <div className="flex items-center gap-1.5">
              {TRANSITIONS.map((tr) => (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => onSelectTransition(tr.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium border transition ${
                    currentTransition === tr.id
                      ? "bg-[#C43E1C] border-[#C43E1C] text-white font-bold"
                      : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  {tr.label}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-neutral-700" />

            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-neutral-400">Duration:</span>
              <select
                value={transitionDuration}
                onChange={(e) => onChangeTransitionDuration(parseFloat(e.target.value))}
                className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-white text-[11px]"
              >
                <option value={0.5}>0.5s Fast</option>
                <option value={1.0}>1.0s Standard</option>
                <option value={1.5}>1.5s Smooth</option>
                <option value={2.0}>2.0s Slow</option>
              </select>
            </div>

            <button
              type="button"
              onClick={onApplyTransitionToAll}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[11px] font-medium transition"
            >
              Apply To All
            </button>
          </div>
        )}

        {/* ================= ANIMATIONS TAB ================= */}
        {activeTab === "ANIMATIONS" && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-400 uppercase font-semibold mr-1">
              Element Animation:
            </span>
            {ANIMATIONS.map((an) => (
              <button
                key={an.id}
                type="button"
                onClick={() => onSelectAnimation(an.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium border transition ${
                  currentAnimation === an.id
                    ? "bg-[#C43E1C] border-[#C43E1C] text-white font-bold"
                    : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {an.label}
              </button>
            ))}
          </div>
        )}

        {/* ================= SLIDE SHOW TAB ================= */}
        {activeTab === "SLIDE SHOW" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStartSlideShow(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#C43E1C] hover:bg-[#a93315] text-white font-bold transition shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>From Beginning (F5)</span>
            </button>
            <button
              type="button"
              onClick={() => onStartSlideShow(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-medium transition"
            >
              <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
              <span>From Current Slide (Shift+F5)</span>
            </button>
          </div>
        )}

        {/* ================= REVIEW TAB ================= */}
        {activeTab === "REVIEW" && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition ${
                showNotes
                  ? "bg-[#C43E1C]/20 border-[#C43E1C] text-[#ff6842]"
                  : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Speaker Notes Pane</span>
            </button>
          </div>
        )}

        {/* ================= VIEW TAB ================= */}
        {activeTab === "VIEW" && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition ${
                showThumbnails
                  ? "bg-[#C43E1C]/20 border-[#C43E1C] text-[#ff6842]"
                  : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Thumbnails Pane</span>
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                className="p-1.5 rounded hover:bg-neutral-800 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-mono text-[11px]">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(180, z + 10))}
                className="p-1.5 rounded hover:bg-neutral-800 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(100)}
                className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[10px] ml-1 transition"
              >
                100% Fit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
