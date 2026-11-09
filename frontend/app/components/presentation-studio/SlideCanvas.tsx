"use client";

import React, { useRef, useState } from "react";
import { Plus, Trash2, GripVertical, CheckCircle2 } from "lucide-react";
import { StudioSlide, PresentationTheme, SlideElement } from "./types";

interface SlideCanvasProps {
  slide: StudioSlide;
  slideIndex: number;
  totalSlides: number;
  theme: PresentationTheme;
  zoom: number;
  onUpdateSlide: (updated: Partial<StudioSlide>) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<SlideElement>) => void;
  onDeleteElement: (elementId: string) => void;
}

export function SlideCanvas({
  slide,
  slideIndex,
  totalSlides,
  theme,
  zoom,
  onUpdateSlide,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
}: SlideCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingTitle, setEditingTitle] = useState(false);

  const handleTitleChange = (val: string) => {
    onUpdateSlide({ title: val });
  };

  const handleCategoryChange = (val: string) => {
    onUpdateSlide({ category: val.toUpperCase() });
  };

  const handleTakeawayChange = (val: string) => {
    onUpdateSlide({ takeaway: val });
  };

  const handleBulletChange = (idx: number, val: string) => {
    const nextBullets = [...(slide.bullets || [])];
    nextBullets[idx] = val;
    onUpdateSlide({ bullets: nextBullets });
  };

  const handleAddBullet = () => {
    const nextBullets = [...(slide.bullets || []), "New strategic point or key concept"];
    onUpdateSlide({ bullets: nextBullets });
  };

  const handleDeleteBullet = (idx: number) => {
    const nextBullets = (slide.bullets || []).filter((_, i) => i !== idx);
    onUpdateSlide({ bullets: nextBullets });
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8 bg-[#181818] relative select-none"
      onClick={() => onSelectElement(null)}
    >
      {/* 16:9 Slide Surface */}
      <div
        className="relative aspect-[16/9] w-full max-w-[1020px] rounded-2xl shadow-2xl overflow-hidden border border-neutral-700/80 transition-transform duration-150 flex flex-col justify-between p-6 sm:p-10"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "center center",
          backgroundColor: theme.bg || "#0F172A",
          color: theme.text || "#FFFFFF",
          fontFamily: theme.fontFamily || "Inter, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Category Pill & Slide Counter */}
        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            value={slide.category || "ANALYSIS"}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase border border-transparent hover:border-white/30 focus:border-white/60 focus:outline-none transition cursor-text bg-black/20"
            style={{
              backgroundColor: `${theme.accent}26`,
              color: theme.accent,
            }}
            title="Click to edit slide category"
          />

          <span className="text-[11px] sm:text-xs font-mono font-bold tracking-widest text-neutral-400">
            {String(slideIndex + 1).padStart(2, "0")} / {String(totalSlides).padStart(2, "0")}
          </span>
        </div>

        {/* Slide Title */}
        <div className="my-2 sm:my-4">
          <textarea
            value={slide.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            rows={2}
            className="w-full bg-transparent border border-transparent hover:border-white/20 focus:border-white/40 focus:outline-none rounded-lg p-1 text-xl sm:text-3xl font-extrabold tracking-tight resize-none leading-snug cursor-text"
            style={{ color: theme.text }}
            placeholder="Slide Title..."
          />
        </div>

        {/* Slide Bullets / Main Body */}
        <div className="flex-1 flex flex-col justify-center space-y-2.5 sm:space-y-3.5 my-2">
          {(slide.bullets || []).map((bullet, idx) => (
            <div
              key={idx}
              className="group flex items-start gap-3 p-2.5 sm:p-3.5 rounded-xl border transition"
              style={{
                backgroundColor: theme.cardBg || "rgba(255, 255, 255, 0.04)",
                borderColor: theme.cardBorder || "rgba(255, 255, 255, 0.08)",
              }}
            >
              {/* Bullet Badge / Icon */}
              <span
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-mono text-[10px] sm:text-xs font-bold shrink-0 mt-0.5"
                style={{
                  backgroundColor: `${theme.accent}33`,
                  color: theme.accent,
                }}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>

              {/* Editable Bullet Text */}
              <textarea
                value={bullet}
                onChange={(e) => handleBulletChange(idx, e.target.value)}
                rows={1}
                className="flex-1 bg-transparent border-0 focus:outline-none text-xs sm:text-sm font-medium resize-none leading-relaxed cursor-text"
                style={{ color: theme.text }}
              />

              {/* Delete Bullet Button */}
              <button
                type="button"
                onClick={() => handleDeleteBullet(idx)}
                className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-400 transition"
                title="Remove bullet point"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Add Bullet Button */}
          <button
            type="button"
            onClick={handleAddBullet}
            className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-neutral-600/60 hover:border-neutral-400 text-neutral-400 hover:text-white transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Point</span>
          </button>
        </div>

        {/* Custom Placed Elements (Textboxes & Shapes) */}
        {(slide.elements || []).map((el) => {
          const isSelected = selectedElementId === el.id;
          return (
            <div
              key={el.id}
              className={`absolute cursor-move transition-shadow ${
                isSelected ? "ring-2 ring-blue-500 shadow-xl" : "hover:ring-1 hover:ring-white/40"
              }`}
              style={{
                left: `${el.x}%`,
                top: `${el.y}%`,
                width: `${el.width}%`,
                height: `${el.height}%`,
                backgroundColor: el.fill || "rgba(255, 255, 255, 0.1)",
                color: el.color || theme.text,
                borderRadius: el.shapeType === "circle" ? "9999px" : el.shapeType === "rounded" ? "16px" : "4px",
                borderColor: el.stroke || theme.accent,
                borderWidth: el.stroke ? "2px" : "0px",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement(el.id);
              }}
            >
              {isSelected && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteElement(el.id);
                  }}
                  className="absolute -top-3 -right-3 p-1 rounded-full bg-rose-600 text-white shadow hover:bg-rose-500 transition"
                  title="Delete element"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              {el.type === "textbox" ? (
                <textarea
                  value={el.content || ""}
                  onChange={(e) => onUpdateElement(el.id, { content: e.target.value })}
                  className="w-full h-full bg-transparent p-2 text-xs sm:text-sm border-0 focus:outline-none resize-none cursor-text"
                  placeholder="Text element..."
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2 text-xs font-bold text-center">
                  {el.content}
                </div>
              )}
            </div>
          );
        })}

        {/* Slide Footer: Takeaway Banner & Slide Number */}
        <div className="pt-2 sm:pt-4 border-t border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: theme.accent }} />
            <input
              type="text"
              value={slide.takeaway || `Establishes key principles and workflows for ${slide.title}.`}
              onChange={(e) => handleTakeawayChange(e.target.value)}
              className="flex-1 bg-transparent text-[11px] sm:text-xs italic border-0 focus:outline-none hover:border-b hover:border-white/30 truncate"
              style={{ color: `${theme.text}CC` }}
              placeholder="Key takeaway..."
            />
          </div>

          <span className="text-[10px] font-mono tracking-wider uppercase text-neutral-400">
            Slide {slideIndex + 1}
          </span>
        </div>
      </div>
    </div>
  );
}
