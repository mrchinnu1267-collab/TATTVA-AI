"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
  CheckCircle2,
} from "lucide-react";
import { StudioSlide, PresentationTheme, TransitionType } from "./types";

interface SlideShowViewerProps {
  slides: StudioSlide[];
  initialSlideIndex?: number;
  theme: PresentationTheme;
  transition: TransitionType;
  transitionDuration: number;
  onClose: () => void;
}

export function SlideShowViewer({
  slides,
  initialSlideIndex = 0,
  theme,
  transition,
  transitionDuration,
  onClose,
}: SlideShowViewerProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(initialSlideIndex);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const currentSlide = slides[currentIndex] || slides[0];

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp" || e.key === "Backspace") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "f" || e.key === "F") {
        toggleBrowserFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, onClose]);

  // Auto-hide controls
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  };

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      goNext();
    } else if (diff < -50) {
      goPrev();
    }
  };

  // Determine transition CSS
  const getTransitionStyle = (): React.CSSProperties => {
    const durSec = `${transitionDuration || 0.4}s`;
    switch (transition) {
      case "fade":
        return { animation: `fadeIn ${durSec} ease-in-out` };
      case "push":
        return { animation: `slideInRight ${durSec} ease-out` };
      case "wipe":
        return { animation: `wipeIn ${durSec} ease-in-out` };
      case "split":
        return { animation: `scaleIn ${durSec} ease-out` };
      default:
        return { animation: `fadeIn 0.25s ease` };
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-2 sm:p-8 select-none overflow-hidden"
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.99); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes wipeIn {
          from { clip-path: inset(0 100% 0 0); }
          to { clip-path: inset(0 0 0 0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Floating Top Control Bar (with Safe-Area Margins for Mobile Notches) */}
      <div
        className={`absolute top-4 left-4 right-4 flex items-center justify-between z-20 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-white text-xs font-mono font-bold">
          <span>Slide {currentIndex + 1} of {slides.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleBrowserFullscreen}
            className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/80 border border-white/10 transition active:scale-95"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/40 transition active:scale-95"
            title="Exit Presentation (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 16:9 Presentation Canvas */}
      <div
        key={currentSlide.id || currentIndex}
        style={{
          ...getTransitionStyle(),
          backgroundColor: theme.bg || "#0F172A",
          color: theme.text || "#FFFFFF",
          fontFamily: theme.fontFamily || "Inter, sans-serif",
        }}
        className="w-full max-w-[1280px] aspect-[16/9] rounded-2xl shadow-2xl p-6 sm:p-14 flex flex-col justify-between border border-white/10 relative overflow-hidden"
      >
        {/* Top Slide Meta: Category Badge & Slide Count */}
        <div className="flex items-center justify-between gap-4">
          <span
            className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase border border-transparent shadow-sm"
            style={{
              backgroundColor: `${theme.accent}33`,
              color: theme.accent,
            }}
          >
            {currentSlide.category || "PRESENTATION"}
          </span>

          <span className="text-xs sm:text-sm font-mono font-bold tracking-widest text-neutral-400">
            {String(currentIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>
        </div>

        {/* Slide Title */}
        <div className="my-4 sm:my-6">
          <h1
            className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight"
            style={{ color: theme.text }}
          >
            {currentSlide.title}
          </h1>
        </div>

        {/* Bullets List */}
        <div className="flex-1 flex flex-col justify-center space-y-3 sm:space-y-4 my-2">
          {(currentSlide.bullets || []).map((bullet, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-3.5 sm:p-5 rounded-2xl border transition"
              style={{
                backgroundColor: theme.cardBg || "rgba(255, 255, 255, 0.05)",
                borderColor: theme.cardBorder || "rgba(255, 255, 255, 0.1)",
              }}
            >
              <span
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-mono text-xs sm:text-sm font-bold shrink-0 mt-0.5 shadow-sm"
                style={{
                  backgroundColor: `${theme.accent}33`,
                  color: theme.accent,
                }}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <p
                className="text-sm sm:text-lg md:text-xl font-medium leading-relaxed"
                style={{ color: theme.text }}
              >
                {bullet}
              </p>
            </div>
          ))}
        </div>

        {/* Custom Elements Rendered */}
        {(currentSlide.elements || []).map((el) => (
          <div
            key={el.id}
            className="absolute flex items-center justify-center p-3 text-sm font-bold text-center"
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
          >
            {el.content}
          </div>
        ))}

        {/* Bottom Bar: Takeaway & Slide Number */}
        <div className="pt-3 sm:pt-6 border-t border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: theme.accent }} />
            <p
              className="text-xs sm:text-sm md:text-base italic truncate"
              style={{ color: `${theme.text}CC` }}
            >
              {currentSlide.takeaway || `Key takeaways and verifiable architecture for ${currentSlide.title}.`}
            </p>
          </div>

          <span className="text-xs font-mono tracking-wider uppercase text-neutral-400">
            Slide {currentIndex + 1}
          </span>
        </div>
      </div>

      {/* Floating Bottom Navigation Controls */}
      <div
        className={`absolute bottom-6 flex items-center gap-3 z-20 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="p-3 rounded-full bg-black/70 backdrop-blur-md text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black border border-white/20 transition active:scale-95"
          title="Previous Slide (Left Arrow)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="px-4 py-2 rounded-full bg-black/70 backdrop-blur-md text-white font-mono text-xs border border-white/20">
          {currentIndex + 1} / {slides.length}
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={currentIndex === slides.length - 1}
          className="p-3 rounded-full bg-black/70 backdrop-blur-md text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black border border-white/20 transition active:scale-95"
          title="Next Slide (Right Arrow / Space)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

