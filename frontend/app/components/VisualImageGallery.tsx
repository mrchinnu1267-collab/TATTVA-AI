"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ExternalLink, Search, Camera } from "lucide-react";
import { WebImageResult } from "../lib/web-image-search";

interface VisualImageGalleryProps {
  images: WebImageResult[];
  onSelectImage?: (url: string) => void;
  isDark?: boolean;
}

export default function VisualImageGallery({
  images,
  onSelectImage,
  isDark = true,
}: VisualImageGalleryProps) {
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState(false);

  if (!images || images.length === 0) return null;

  // Filter out broken images
  const validImages = images.filter((_, idx) => !imageErrors[idx]);
  if (validImages.length === 0) return null;

  // By default show up to 3 cards side-by-side matching the user's screenshot
  const displayedImages = expanded ? validImages : validImages.slice(0, 3);
  const remainingCount = validImages.length - 3;

  return (
    <div className="my-3 space-y-2 select-none animate-in fade-in duration-300">
      {/* Header Badge */}
      <div className="flex items-center justify-between text-xs px-1 text-neutral-400">
        <div className="flex items-center gap-1.5 font-medium">
          <Search className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-neutral-300 font-semibold">Web Image Results</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
            {validImages.length} photos
          </span>
        </div>
        {remainingCount > 0 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-[11px] text-sky-400 hover:text-sky-300 font-medium transition cursor-pointer"
          >
            Show all ({validImages.length})
          </button>
        )}
      </div>

      {/* Grid of Cards matching user screenshot */}
      <div
        className={`grid gap-2.5 sm:gap-3.5 ${
          displayedImages.length === 1
            ? "grid-cols-1 max-w-sm"
            : displayedImages.length === 2
            ? "grid-cols-2 max-w-lg"
            : "grid-cols-2 sm:grid-cols-3"
        }`}
      >
        {displayedImages.map((img, idx) => {
          const isThirdCard = idx === 2 && !expanded && remainingCount > 0;

          return (
            <div
              key={img.url + idx}
              onClick={() => {
                if (isThirdCard) {
                  setExpanded(true);
                } else if (onSelectImage) {
                  onSelectImage(img.url);
                }
              }}
              className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer aspect-square bg-neutral-900 shadow-md ${
                isDark
                  ? "border-white/10 hover:border-sky-500/50 shadow-black/40"
                  : "border-black/10 hover:border-sky-400 shadow-neutral-200"
              }`}
            >
              {/* Actual Web Image */}
              <Image
                src={img.url}
                alt={img.title || "Web image result"}
                fill
                unoptimized
                sizes="(max-width: 640px) 50vw, 33vw"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={() => {
                  setImageErrors((prev) => ({ ...prev, [idx]: true }));
                }}
              />

              {/* Gradient Scrim on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5 sm:p-3">
                <p className="text-white text-xs font-semibold line-clamp-1 drop-shadow-sm">
                  {img.title}
                </p>
                <div className="flex items-center justify-between text-[10px] text-neutral-300 mt-0.5">
                  <span className="truncate max-w-[120px]">{img.source}</span>
                  {img.sourceUrl && (
                    <a
                      href={img.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded bg-black/40 hover:bg-black/80 text-white transition"
                      title="Open source website"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Number Badge on the 3rd card matching user screenshot: "📷 4" */}
              {isThirdCard ? (
                <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-white text-xs font-bold shadow-lg border border-white/10">
                  <Camera className="w-3.5 h-3.5" />
                  <span>+{remainingCount + 1}</span>
                </div>
              ) : (
                <div className="absolute bottom-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-medium">
                  <Camera className="w-2.5 h-2.5 text-sky-400" />
                  <span>View</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

