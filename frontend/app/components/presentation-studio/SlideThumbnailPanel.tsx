"use client";

import React from "react";
import { Plus, Copy, Trash2, ArrowUp, ArrowDown } from "lucide-react";
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
}: SlideThumbnailPanelProps) {
  return (
    <div className="w-32 sm:w-52 border-r border-neutral-800 bg-[#141414] flex flex-col shrink-0 select-none">
      {/* Header with New Slide button */}
      <div className="p-2 border-b border-neutral-800/80 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          Slides ({slides.length})
        </span>
        <button
          type="button"
          onClick={onAddSlide}
          className="p-1 rounded bg-[#C43E1C]/20 text-[#ff6842] hover:bg-[#C43E1C]/40 transition active:scale-95 flex items-center gap-1 text-[11px] font-semibold px-2"
          title="Add New Slide"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Thumbnails Scrollable List */}
      <div className="flex-1 p-2 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-neutral-700">
        {slides.map((slide, idx) => {
          const isActive = idx === currentSlideIndex;
          return (
            <div
              key={slide.id || idx}
              className={`group relative flex items-start gap-1.5 p-1 rounded-xl transition cursor-pointer ${
                isActive
                  ? "bg-[#C43E1C]/15 border-2 border-[#C43E1C] shadow-lg shadow-black/40"
                  : "hover:bg-neutral-800/70 border border-neutral-800/80"
              }`}
              onClick={() => onSelectSlide(idx)}
            >
              {/* Slide Number */}
              <span className="text-[10px] font-mono font-bold text-neutral-400 w-4 text-right pt-1 shrink-0">
                {idx + 1}
              </span>

              {/* 16:9 Thumbnail Canvas Preview */}
              <div
                className="flex-1 aspect-[16/9] rounded-lg border border-neutral-700/60 p-1.5 flex flex-col justify-between overflow-hidden shadow-inner relative"
                style={{
                  backgroundColor: theme.bg || "#0F172A",
                  color: theme.text || "#FFFFFF",
                }}
              >
                {/* Micro Category Pill */}
                <span
                  className="text-[6px] font-bold uppercase px-1 py-0.2 rounded w-fit"
                  style={{ backgroundColor: `${theme.accent}33`, color: theme.accent }}
                >
                  {slide.category || "SLIDE"}
                </span>

                {/* Micro Title */}
                <div className="text-[7.5px] font-bold truncate leading-tight mt-0.5">
                  {slide.title || `Slide ${idx + 1}`}
                </div>

                {/* Micro Bullet lines preview */}
                <div className="space-y-0.5 my-auto">
                  <div className="h-0.5 w-4/5 bg-neutral-600/60 rounded" />
                  <div className="h-0.5 w-3/5 bg-neutral-700/50 rounded" />
                </div>

                {/* Micro Footer Indicator */}
                <div className="text-[5.5px] text-right font-mono opacity-50">
                  {idx + 1} / {slides.length}
                </div>
              </div>

              {/* Hover Quick Action Menu (Desktop) */}
              <div className="absolute right-1.5 top-1.5 hidden group-hover:flex items-center gap-0.5 bg-neutral-900/90 rounded px-1 py-0.5 border border-neutral-700 shadow-md z-10">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveSlide(idx, idx - 1);
                  }}
                  title="Move Up"
                  className="p-0.5 hover:text-white text-neutral-400 disabled:opacity-30"
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
                  title="Move Down"
                  className="p-0.5 hover:text-white text-neutral-400 disabled:opacity-30"
                >
                  <ArrowDown className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateSlide(idx);
                  }}
                  title="Duplicate"
                  className="p-0.5 hover:text-white text-neutral-400"
                >
                  <Copy className="w-2.5 h-2.5" />
                </button>
                {slides.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSlide(idx);
                    }}
                    title="Delete"
                    className="p-0.5 hover:text-rose-400 text-neutral-400"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
