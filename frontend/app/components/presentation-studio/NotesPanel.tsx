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
  if (!showNotes) {
    return (
      <div
        onClick={() => setShowNotes(true)}
        className="h-7 border-t border-[#2A2A2A] bg-[#1A1A1A] hover:bg-[#222222] text-[#888888] hover:text-[#CCCCCC] px-4 flex items-center justify-between text-xs cursor-pointer select-none transition"
      >
        <span className="font-medium text-[11px]">
          {slide?.notes ? `Notes: ${slide.notes.slice(0, 50)}...` : "Click to add notes"}
        </span>
        <ChevronUp className="w-3.5 h-3.5" />
      </div>
    );
  }

  return (
    <div className="border-t border-[#2A2A2A] bg-[#1C1C1C] flex flex-col shrink-0 select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#252525] border-b border-[#333333] text-xs">
        <div className="flex items-center gap-2 text-[#CCCCCC] font-semibold">
          <FileText className="w-3.5 h-3.5 text-[#EA580C]" />
          <span>Presenter Notes (Slide {slideIndex + 1})</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#888888] font-mono">
            {slide?.notes ? `${slide.notes.length} chars` : "Speaker notes saved per slide"}
          </span>
          <button
            type="button"
            onClick={() => setShowNotes(false)}
            className="p-1 text-[#888888] hover:text-white transition"
            title="Collapse notes pane"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editable Notes Textarea */}
      <div className="p-3">
        <textarea
          value={slide?.notes || ""}
          onChange={(e) => onUpdateNotes(e.target.value)}
          placeholder={`Add speaker notes for Slide ${slideIndex + 1}... (Saved persistently and preserved in OpenXML PPTX)`}
          rows={3}
          className="w-full bg-[#141414] border border-[#333333] focus:border-[#EA580C] rounded-lg p-2.5 text-xs text-[#E0E0E0] placeholder-[#666666] focus:outline-none resize-none leading-relaxed transition font-sans"
        />
      </div>
    </div>
  );
}
