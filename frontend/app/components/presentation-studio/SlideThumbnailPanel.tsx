"use client";

import React, { useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  MoreVertical,
} from "lucide-react";
import { StudioSlide, PresentationTheme, SlideLayout } from "./types";

interface SlideThumbnailPanelProps {
  slides: StudioSlide[];
  currentSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onAddSlide: (layout?: SlideLayout) => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onMoveSlide: (fromIndex: number, toIndex: number) => void;
  theme: PresentationTheme;
  onToggleHideSlide?: (index: number) => void;
}

export function SlideThumbnailPanel({
  slides,
  currentSlideIndex,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlide,
  theme,
  onToggleHideSlide,
}: SlideThumbnailPanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onMoveSlide(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  return (
    <div className="w-40 sm:w-56 border-r border-[#2B2B2B] bg-[#1E1E1E] flex flex-col shrink-0 select-none">
      {/* Header with New Slide button */}
      <div className="p-2 border-b border-[#2D2D2D] flex items-center justify-between bg-[#252525]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A0]">
          Slides ({slides.length})
        </span>
        <button
          type="button"
          onClick={() => onAddSlide("titleAndContent")}
          className="p-1 rounded bg-[#C43E1C]/20 text-[#FF6842] hover:bg-[#C43E1C]/30 transition active:scale-95 flex items-center gap-1 text-[11px] font-semibold px-2 border border-[#C43E1C]/30"
          title="Add New Slide"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Slide</span>
        </button>
      </div>

      {/* Thumbnails Scrollable List */}
      <div className="flex-1 p-2.5 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-[#444444]">
        {slides.map((slide, idx) => {
          const isActive = idx === currentSlideIndex;
          const isHidden = Boolean(slide.isHidden);

          return (
            <div
              key={slide.id || idx}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
              className={`group relative flex items-start gap-2 p-1 rounded-sm transition cursor-pointer ${
                isActive
                  ? "bg-[#C43E1C]/15 ring-2 ring-[#C43E1C]"
                  : "hover:bg-[#2A2A2A] border border-transparent"
              } ${isHidden ? "opacity-50" : ""}`}
              onClick={() => onSelectSlide(idx)}
            >
              {/* Slide Number on Left (Matching Reference 2) */}
              <div className="flex flex-col items-center w-3 pt-1 shrink-0">
                <span className="text-[11px] font-mono font-medium text-[#888888]">
                  {idx + 1}
                </span>
              </div>

              {/* 
                16:9 Thumbnail Canvas Preview 
                Clean White #FFFFFF by default matching Reference 2!
              */}
              <div
                className="flex-1 aspect-[16/9] rounded-xs border border-[#444444] p-2 flex flex-col justify-center items-center overflow-hidden shadow-xs relative bg-white"
                style={{
                  backgroundColor: slide.background || (theme.isDark ? theme.bg : "#FFFFFF"),
                  color: theme.isDark ? theme.text : "#000000",
                }}
              >
                {/* Miniature Preview Content */}
                {slide.layout === "title" ? (
                  <div className="w-full flex flex-col items-center justify-center text-center space-y-1">
                    <div className="w-4/5 h-2 bg-slate-800/80 rounded-xs" />
                    <div className="w-1/2 h-1 bg-slate-400/60 rounded-xs" />
                  </div>
                ) : slide.layout === "process" ? (
                  <div className="w-full flex items-center justify-center space-x-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-start justify-center space-y-1 pl-1">
                    <div className="w-3/5 h-1.5 bg-slate-800 rounded-xs mb-1" />
                    <div className="w-4/5 h-1 bg-slate-400/70 rounded-xs" />
                    <div className="w-2/3 h-1 bg-slate-400/50 rounded-xs" />
                  </div>
                )}
              </div>

              {/* Quick Actions (Move, Duplicate, Delete) */}
              <div className="absolute right-1.5 top-1.5 hidden group-hover:flex items-center gap-0.5 bg-[#181818]/95 rounded px-1 py-0.5 border border-[#444444] shadow-md z-10">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveSlide(idx, idx - 1);
                  }}
                  className="p-1 hover:text-white text-[#AAAAAA] disabled:opacity-20"
                  title="Move Up"
                >
                  <ArrowUp className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === slides.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveSlide(idx, idx + 1);
                  }}
                  className="p-1 hover:text-white text-[#AAAAAA] disabled:opacity-20"
                  title="Move Down"
                >
                  <ArrowDown className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateSlide(idx);
                  }}
                  className="p-1 hover:text-white text-[#AAAAAA]"
                  title="Duplicate Slide"
                >
                  <Copy className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  disabled={slides.length <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSlide(idx);
                  }}
                  className="p-1 hover:text-rose-400 text-[#AAAAAA] disabled:opacity-20"
                  title="Delete Slide"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
