"use client";

import React from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { StudioSlide } from "./types";

interface NotesPanelProps {
  slide: StudioSlide;
  slideIndex: number;
  showNotes: boolean;
  setShowNotes: (show: boolean) => void;
  onUpdateNotes: (notes: string) => void;
}

export function NotesPanel({
  slide,
  slideIndex,
  showNotes,
  setShowNotes,
  onUpdateNotes,
}: NotesPanelProps) {
  if (!showNotes) return null;

  return (
    <div className="border-t border-neutral-800 bg-[#161616] flex flex-col shrink-0 select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1C1C1C] border-b border-neutral-800/80 text-xs">
        <div className="flex items-center gap-2 text-neutral-300 font-semibold">
          <FileText className="w-3.5 h-3.5 text-[#C43E1C]" />
          <span>Presenter Notes (Slide {slideIndex + 1})</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-neutral-500 font-mono">
            {slide.notes ? `${slide.notes.length} chars` : "Click below to add presenter notes"}
          </span>
          <button
            type="button"
            onClick={() => setShowNotes(false)}
            className="p-1 text-neutral-400 hover:text-white transition"
            title="Collapse notes pane"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editable Notes Textarea */}
      <div className="p-3">
        <textarea
          value={slide.notes || ""}
          onChange={(e) => onUpdateNotes(e.target.value)}
          placeholder={`Add speaker notes for Slide ${slideIndex + 1}... (These notes will be compiled into your PPTX file and will be visible during presentation mode)`}
          rows={3}
          className="w-full bg-[#111111] border border-neutral-800/90 focus:border-neutral-700 rounded-xl p-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none resize-none leading-relaxed transition font-sans"
        />
      </div>
    </div>
  );
}
