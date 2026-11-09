"use client";

import React, { useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Star,
  Eye,
  EyeOff,
  MoreVertical,
} from "lucide-react";
import { StudioSlide, PresentationTheme } from "./types";

interface SlideThumbnailPanelProps {
  slides: StudioSlide[];
  currentSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onAddSlide: () => void;
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
    <div className="w-36 sm:w-56 border-r border-[#2B2B2B] bg-[#1E1E1E] flex flex-col shrink-0 select-none">
      {/* Header */}
      <div className="p-2 border-b border-[#2D2D2D] flex items-center justify-between bg-[#252525]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A0]">
          Slides ({slides.length})
        </span>
        <button
          type="button"
          onClick={onAddSlide}
          className="p-1 rounded bg-[#EA580C]/20 text-[#FF7A33] hover:bg-[#EA580C]/30 transition active:scale-95 flex items-center gap-1 text-[11px] font-semibold px-2 border border-[#EA580C]/30"
          title="Add New Slide"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Slide</span>
        </button>
      </div>

      {/* Thumbnails List */}
      <div className="flex-1 p-2 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-[#444444]">
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
              className={`group relative flex items-start gap-1.5 p-1 rounded-lg transition cursor-pointer ${
                isActive
                  ? "bg-[#EA580C]/15 border-2 border-[#EA580C] shadow-lg shadow-black/50"
                  : "hover:bg-[#2A2A2A] border border-[#333333]"
              } ${isHidden ? "opacity-50" : ""}`}
              onClick={() => onSelectSlide(idx)}
            >
              {/* Left Column: Slide Number + Transition Star */}
              <div className="flex flex-col items-center w-4 pt-1 shrink-0">
                <span className="text-[11px] font-mono font-bold text-[#888888]">
                  {idx + 1}
                </span>
                {/* Transition star indicator matching PowerPoint screenshot */}
                <span className="text-[8px] text-[#A0A0A0] mt-0.5">★</span>
              </div>

              {/* 16:9 Thumbnail Canvas Preview */}
              <div
                className="flex-1 aspect-[16/9] rounded border border-[#444444] p-1.5 flex flex-col justify-between overflow-hidden shadow-inner relative"
                style={{
                  backgroundColor: slide.background || theme.bg || "#0F172A",
                  color: theme.text || "#FFFFFF",
                }}
              >
                {/* Category Pill */}
                <span
                  className="text-[6px] font-bold uppercase px-1 py-0.2 rounded w-fit"
                  style={{ backgroundColor: `${theme.accent}33`, color: theme.accent }}
                >
                  {slide.category || "SLIDE"}
                </span>

                {/* Title */}
                <div className="text-[8px] font-bold truncate leading-tight mt-0.5 text-white">
                  {slide.title || `Slide ${idx + 1}`}
                </div>

                {/* Process Dots / Mini bullets */}
                <div className="space-y-0.5 my-auto">
                  <div className="h-0.5 w-4/5 bg-slate-500/60 rounded" />
                  <div className="h-0.5 w-3/5 bg-slate-600/50 rounded" />
                </div>

                {/* Slide Number in bottom right */}
                <div className="text-[5.5px] text-right font-mono opacity-50">
                  {idx + 1}
                </div>
              </div>

              {/* Hover Actions (Move Up / Down, Duplicate, Delete) */}
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
