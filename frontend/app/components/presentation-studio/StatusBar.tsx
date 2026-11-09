"use client";

import React from "react";
import {
  FileText,
  Layers,
  Play,
  Minus,
  Plus,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  Grid,
  Book,
} from "lucide-react";
import { ViewMode } from "./types";

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
  saveStatus: "saved" | "unsaved" | "saving" | "failed";
  viewMode?: ViewMode;
  setViewMode?: (vm: ViewMode) => void;
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
  viewMode = "normal",
  setViewMode,
}: StatusBarProps) {
  const handleZoomOut = () => {
    setZoom((prev) => Math.max(50, prev - 10));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(150, prev + 10));
  };

  return (
    <footer className="h-6.5 bg-[#1F1F1F] text-[#CCCCCC] border-t border-[#303030] flex items-center justify-between px-3 text-[11px] font-medium select-none shrink-0">
      {/* Left Group: Slide 1 of 6, Accessibility, Language */}
      <div className="flex items-center space-x-4">
        <span className="font-semibold text-white">
          Slide {currentSlideIndex + 1} of {totalSlides}
        </span>

        <div className="hidden sm:flex items-center space-x-1 text-[#AAAAAA] hover:text-white transition cursor-pointer">
          <BookOpen className="w-3.5 h-3.5" />
          <span>English (India)</span>
        </div>

        <div className="hidden md:flex items-center space-x-1 text-[#AAAAAA] hover:text-white transition cursor-pointer">
          <span className="text-[10px]">♿ Accessibility: Good to go</span>
        </div>

        {/* Save Status */}
        <div className="flex items-center space-x-1 text-[10px]">
          {saveStatus === "saving" && (
            <span className="text-amber-400 flex items-center space-x-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>Saving...</span>
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>Saved</span>
            </span>
          )}
          {saveStatus === "unsaved" && (
            <span className="text-slate-400">Unsaved changes</span>
          )}
          {saveStatus === "failed" && (
            <span className="text-rose-400 flex items-center space-x-1">
              <AlertCircle className="w-2.5 h-2.5" />
              <span>Save failed</span>
            </span>
          )}
        </div>
      </div>

      {/* Right Group: Notes, Views, Zoom Slider */}
      <div className="flex items-center space-x-3">
        {/* Notes Toggle Button */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded transition ${
            showNotes ? "bg-white/20 text-white" : "hover:bg-white/10 text-[#CCCCCC]"
          }`}
          title="Toggle Speaker Notes"
        >
          <FileText className="w-3 h-3" />
          <span className="hidden sm:inline">Notes</span>
        </button>

        {/* View mode buttons */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={() => setViewMode && setViewMode("normal")}
            className={`p-1 rounded hover:bg-white/10 transition ${
              viewMode === "normal" ? "text-orange-400 font-bold" : "text-[#AAAAAA]"
            }`}
            title="Normal View"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode && setViewMode("slideSorter")}
            className={`p-1 rounded hover:bg-white/10 transition ${
              viewMode === "slideSorter" ? "text-orange-400 font-bold" : "text-[#AAAAAA]"
            }`}
            title="Slide Sorter"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode && setViewMode("readingView")}
            className={`p-1 rounded hover:bg-white/10 transition ${
              viewMode === "readingView" ? "text-orange-400 font-bold" : "text-[#AAAAAA]"
            }`}
            title="Reading View"
          >
            <Book className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onStartSlideShow}
            className="p-1 rounded hover:bg-white/10 text-[#AAAAAA] hover:text-white transition"
            title="Slide Show (F5)"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 pl-2">
          <button
            onClick={handleZoomOut}
            className="p-0.5 hover:text-white text-[#AAAAAA] transition"
            title="Zoom Out"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="range"
            min="50"
            max="150"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value, 10))}
            className="w-16 h-1 bg-[#444444] rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <button
            onClick={handleZoomIn}
            className="p-0.5 hover:text-white text-[#AAAAAA] transition"
            title="Zoom In"
          >
            <Plus className="w-3 h-3" />
          </button>
          <span className="font-mono text-[10px] w-8 text-right text-white">
            {zoom}%
          </span>
        </div>
      </div>
    </footer>
  );
}
