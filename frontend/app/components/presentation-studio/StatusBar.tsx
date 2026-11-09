"use client";

import React from "react";
import {
  FileText,
  Layers,
  Play,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface StatusBarProps {
  currentSlideIndex: number;
  totalSlides: number;
  showNotes: boolean;
  setShowNotes: (show: boolean) => void;
  showThumbnails: boolean;
  setShowThumbnails: (show: boolean) => void;
  onStartSlideShow: () => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  saveStatus: "saved" | "unsaved" | "saving";
}

export function StatusBar({
  currentSlideIndex,
  totalSlides,
  showNotes,
  setShowNotes,
  showThumbnails,
  setShowThumbnails,
  onStartSlideShow,
  zoom,
  setZoom,
  saveStatus,
}: StatusBarProps) {
  const handleZoomOut = () => {
    setZoom((prev) => Math.max(50, prev - 10));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(150, prev + 10));
  };

  return (
    <footer className="h-7 bg-[#C43E1C] text-white flex items-center justify-between px-3 text-[11px] font-semibold select-none shrink-0 shadow-md">
      {/* Left Group: Slide Count, Language, Status */}
      <div className="flex items-center gap-3">
        <span className="tracking-wider uppercase font-bold">
          SLIDE {currentSlideIndex + 1} OF {totalSlides}
        </span>
        <span className="hidden sm:inline text-white/50">•</span>
        <span className="hidden sm:inline tracking-wide font-normal">
          ENGLISH (US)
        </span>
        <span className="hidden sm:inline text-white/50">•</span>
        <span className="hidden sm:inline text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-mono">
          16:9 Widescreen
        </span>

        {/* Save Status Badge */}
        <div className="flex items-center gap-1.5 ml-2 text-[10px]">
          {saveStatus === "saving" ? (
            <span className="inline-flex items-center gap-1 text-white/80">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </span>
          ) : saveStatus === "unsaved" ? (
            <span className="inline-flex items-center gap-1 text-amber-200">
              <AlertCircle className="w-3 h-3" />
              <span>Unsaved changes</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              <span>Saved to Vault</span>
            </span>
          )}
        </div>
      </div>

      {/* Right Group: Toggles, SlideShow, Zoom */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notes Toggle */}
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
            showNotes ? "bg-black/30 text-white" : "hover:bg-black/20 text-white/80"
          }`}
          title="Toggle Presenter Notes Pane"
        >
          <FileText className="w-3 h-3" />
          <span className="hidden sm:inline text-[10px]">NOTES</span>
        </button>

        {/* Thumbnails Toggle */}
        <button
          type="button"
          onClick={() => setShowThumbnails(!showThumbnails)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
            showThumbnails ? "bg-black/30 text-white" : "hover:bg-black/20 text-white/80"
          }`}
          title="Toggle Slide Thumbnails Pane"
        >
          <Layers className="w-3 h-3" />
          <span className="hidden sm:inline text-[10px]">THUMBNAILS</span>
        </button>

        {/* Slide Show Button */}
        <button
          type="button"
          onClick={onStartSlideShow}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/20 hover:bg-black/40 text-white transition active:scale-95"
          title="Start Slide Show (F5)"
        >
          <Play className="w-3 h-3 fill-current" />
          <span className="text-[10px]">PRESENT</span>
        </button>

        {/* Zoom Controls */}
        <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-white/20">
          <button
            type="button"
            onClick={handleZoomOut}
            className="hover:bg-black/20 p-0.5 rounded transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <input
            type="range"
            min="50"
            max="150"
            step="5"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-16 h-1 bg-black/30 rounded-lg appearance-none cursor-pointer accent-white"
          />
          <button
            type="button"
            onClick={handleZoomIn}
            className="hover:bg-black/20 p-0.5 rounded transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <span className="w-8 text-right font-mono text-[10px]">{zoom}%</span>
        </div>
      </div>
    </footer>
  );
}

