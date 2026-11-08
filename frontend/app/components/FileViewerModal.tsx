"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Search,
  Copy,
  Check,
  Printer,
  ExternalLink,
  Presentation,
  FileSpreadsheet,
  FileText,
  Code2,
  FileCode,
  Sparkles,
  Layers,
  Table as TableIcon,
  Play,
  RotateCcw,
  Smartphone,
  Laptop,
  CheckCircle2,
} from "lucide-react";

export interface GeneratedDocument {
  fileId: string;
  filename: string;
  format: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl?: string;
  title?: string;
  archetype?: string;
  dataUri?: string;
  summary?: string;
  outlineMarkdown?: string;
}

export interface FileViewerModalProps {
  file: GeneratedDocument;
  onClose: () => void;
  isDark?: boolean;
}

// -------------------------------------------------------------
// Helper: Convert DataURI or fetch URL to Blob / BlobURL
// -------------------------------------------------------------
function dataUriToBlob(dataUri: string): Blob {
  const commaIndex = dataUri.indexOf(",");
  const byteString = atob(commaIndex > 0 ? dataUri.slice(commaIndex + 1) : dataUri);
  const mimeMatch = dataUri.match(/data:([^;]+);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}

// -------------------------------------------------------------
// Universal File Viewer Modal Component
// -------------------------------------------------------------
export function FileViewerModal({ file, onClose, isDark = true }: FileViewerModalProps) {
  const format = (file.format || "").toLowerCase().replace(/^\./, "");
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [showOpenWith, setShowOpenWith] = useState<boolean>(false);

  // Blob URL state for binary streaming (PDF, etc.)
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    if (file.dataUri) {
      try {
        const blob = dataUriToBlob(file.dataUri);
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        console.warn("Could not create blob URL from dataUri:", err);
      }
    } else if (file.downloadUrl) {
      setBlobUrl(`${file.downloadUrl}${file.downloadUrl.includes("?") ? "&" : "?"}inline=true`);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file.dataUri, file.downloadUrl]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showOpenWith) {
          setShowOpenWith(false);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showOpenWith]);

  // Trigger Download helper
  const handleDownload = () => {
    if (blobUrl) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (file.downloadUrl) {
      const a = document.createElement("a");
      a.href = file.downloadUrl;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Trigger Native Mobile Share or Open With Chooser
  const handleOpenWithClick = async () => {
    if (typeof navigator !== "undefined" && navigator.canShare && navigator.share) {
      try {
        let blob: Blob;
        if (file.dataUri) {
          blob = dataUriToBlob(file.dataUri);
        } else if (file.downloadUrl) {
          const res = await fetch(file.downloadUrl);
          blob = await res.blob();
        } else {
          blob = new Blob([file.outlineMarkdown || ""], { type: file.mimeType || "text/plain" });
        }

        const nativeFile = new File([blob], file.filename, {
          type: file.mimeType || "application/octet-stream",
        });

        if (navigator.canShare({ files: [nativeFile] })) {
          await navigator.share({
            files: [nativeFile],
            title: file.filename,
            text: `Open ${file.filename} in compatible application`,
          });
          return;
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("Native share could not complete:", err);
        } else {
          return; // User dismissed share sheet
        }
      }
    }

    // Fall back to the structured Open With dialog
    setShowOpenWith(true);
  };

  // Copy text helper
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format category badge styling
  const isPpt = ["pptx", "ppt"].includes(format);
  const isSheet = ["xlsx", "xls", "csv"].includes(format);
  const isPdf = format === "pdf";
  const isCode = ["py", "ts", "js", "java", "c", "cpp", "sql", "html", "css"].includes(format);
  const isData = ["json", "xml"].includes(format);
  const isDoc = ["docx", "doc", "rtf"].includes(format);

  const badgeColor = isPpt
    ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : isSheet
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : isPdf
    ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
    : isCode
    ? "text-violet-400 bg-violet-500/10 border-violet-500/20"
    : isData
    ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
    : "text-blue-400 bg-blue-500/10 border-blue-500/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`flex flex-col w-full h-full ${
          isFullscreen ? "max-w-none max-h-none rounded-none" : "sm:max-w-6xl sm:max-h-[92vh] sm:rounded-2xl"
        } border transition-all overflow-hidden ${
          isDark
            ? "bg-neutral-950 text-neutral-100 border-neutral-800 shadow-2xl"
            : "bg-white text-neutral-900 border-neutral-200 shadow-2xl"
        }`}
      >
        {/* ============================================================ */}
        {/* HEADER TOOLBAR */}
        {/* ============================================================ */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
            isDark ? "bg-neutral-900/90 border-neutral-800" : "bg-neutral-50/90 border-neutral-200"
          }`}
        >
          {/* File Meta */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex items-center justify-center w-9 h-9 rounded-xl border shrink-0 ${badgeColor}`}>
              {isPpt ? (
                <Presentation className="w-4 h-4" />
              ) : isSheet ? (
                <FileSpreadsheet className="w-4 h-4" />
              ) : isCode ? (
                <Code2 className="w-4 h-4" />
              ) : isData ? (
                <FileCode className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate font-mono tracking-tight max-w-[220px] sm:max-w-md">
                {file.filename}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <span className="uppercase font-bold tracking-wider">{format}</span>
                <span>•</span>
                <span>{Math.round((file.sizeBytes || 1024) / 1024) || 1} KB</span>
                <span>•</span>
                <span className="text-emerald-500 flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3 inline" /> Verified
                </span>
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Zoom Controls */}
            {!isCode && (
              <div
                className={`hidden sm:flex items-center rounded-lg border text-xs ${
                  isDark ? "bg-neutral-800/80 border-neutral-700 text-neutral-300" : "bg-neutral-100 border-neutral-300 text-neutral-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(50, z - 15))}
                  title="Zoom Out"
                  className="px-2 py-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-l-lg transition"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 py-1 font-mono text-[11px] min-w-[42px] text-center select-none">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(200, z + 15))}
                  title="Zoom In"
                  className="px-2 py-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-r-lg transition"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Print Button (PDF & DOCX) */}
            {(isPdf || isDoc) && (
              <button
                type="button"
                onClick={() => window.print()}
                title="Print document"
                className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                  isDark ? "border-neutral-700 hover:bg-neutral-800 text-neutral-300" : "border-neutral-300 hover:bg-neutral-100 text-neutral-700"
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            )}

            {/* Open With Button */}
            <button
              type="button"
              onClick={handleOpenWithClick}
              title="Open with external application or share"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open With</span>
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              title="Download file"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D95B26] hover:bg-[#E26630] text-white text-xs font-semibold transition shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className={`p-1.5 rounded-lg border transition ${
                isDark ? "border-neutral-700 hover:bg-neutral-800 text-neutral-400" : "border-neutral-300 hover:bg-neutral-100 text-neutral-600"
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              title="Close viewer (Return to chat)"
              className="p-1.5 rounded-lg bg-neutral-200/70 dark:bg-neutral-800 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 text-neutral-500 dark:text-neutral-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* VIEWPORT CONTENT AREA (TAILORED BY FORMAT) */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-auto relative p-2 sm:p-6 flex flex-col items-center">
          {/* 1. PPTX VIEWER */}
          {isPpt && (
            <PptxSlideViewer
              file={file}
              zoom={zoom}
              isDark={isDark}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          )}

          {/* 2. SPREADSHEET / CSV VIEWER */}
          {isSheet && (
            <SpreadsheetViewer
              file={file}
              zoom={zoom}
              isDark={isDark}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          )}

          {/* 3. PDF VIEWER */}
          {isPdf && (
            <PdfDocumentViewer
              file={file}
              blobUrl={blobUrl}
              zoom={zoom}
              isDark={isDark}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          )}

          {/* 4. DOCX VIEWER */}
          {isDoc && (
            <DocxDocumentViewer
              file={file}
              zoom={zoom}
              isDark={isDark}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          )}

          {/* 5. CODE FILE VIEWER */}
          {isCode && (
            <CodeFileViewer
              file={file}
              format={format}
              isDark={isDark}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onCopy={handleCopyText}
              copied={copied}
            />
          )}

          {/* 6. DATA / TEXT / MARKDOWN VIEWER */}
          {(!isPpt && !isSheet && !isPdf && !isDoc && !isCode) && (
            <TextDataViewer
              file={file}
              format={format}
              isDark={isDark}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onCopy={handleCopyText}
              copied={copied}
            />
          )}
        </div>

        {/* ============================================================ */}
        {/* OPEN WITH COMPATIBILITY CHOOSER DIALOG */}
        {/* ============================================================ */}
        {showOpenWith && (
          <OpenWithModal
            file={file}
            format={format}
            blobUrl={blobUrl}
            isDark={isDark}
            onClose={() => setShowOpenWith(false)}
            onDownload={handleDownload}
          />
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 1. PPTX SLIDE VIEWER COMPONENT (16:9 Widescreen + Thumbnails)
// -------------------------------------------------------------
interface SlideItem {
  number: number;
  title: string;
  category?: string;
  bullets: string[];
  takeaway?: string;
}

function parseSlidesFromContent(content?: string, fallbackTitle = "Presentation"): SlideItem[] {
  if (!content) {
    return [
      {
        number: 1,
        title: fallbackTitle,
        category: "OVERVIEW",
        bullets: ["Presentation slide generated by TATTVA AI Suite"],
      },
    ];
  }

  const slides: SlideItem[] = [];
  // Match patterns like "### Slide 1: Title" or "# Slide 1" or slides listed in outline
  const rawParts = content.split(/(?:###?\s*Slide\s*\d+:?|---|\n(?=# Slide))/i).filter(Boolean);

  let slideIndex = 1;
  for (const part of rawParts) {
    const lines = part.trim().split("\n").filter((l) => l.trim().length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/^#+\s*/, "").replace(/^Slide\s*\d+:?\s*/i, "").trim();
      const bullets: string[] = [];
      let category = "ANALYSIS";
      let takeaway = "";

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (/^category:\s*/i.test(line)) {
          category = line.replace(/^category:\s*/i, "").trim();
        } else if (/^takeaway:\s*/i.test(line)) {
          takeaway = line.replace(/^takeaway:\s*/i, "").trim();
        } else if (/^[-*•\d.]+\s+/.test(line)) {
          bullets.push(line.replace(/^[-*•\d.]+\s+/, "").trim());
        } else if (line.length > 0 && !line.startsWith("#")) {
          bullets.push(line);
        }
      }

      if (firstLine.length > 0) {
        slides.push({
          number: slideIndex++,
          title: firstLine,
          category,
          bullets: bullets.length > 0 ? bullets : ["Detailed conceptual breakdown and strategic highlights."],
          takeaway: takeaway || undefined,
        });
      }
    }
  }

  if (slides.length === 0) {
    slides.push({
      number: 1,
      title: fallbackTitle,
      category: "PRESENTATION",
      bullets: content.split("\n").filter((l) => l.trim().length > 0).slice(0, 6),
    });
  }

  return slides;
}

function PptxSlideViewer({
  file,
  zoom,
  isDark,
  searchTerm,
  onSearchChange,
}: {
  file: GeneratedDocument;
  zoom: number;
  isDark: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
}) {
  const slides = useMemo(
    () => parseSlidesFromContent(file.outlineMarkdown || file.summary, file.title || file.filename),
    [file.outlineMarkdown, file.summary, file.title, file.filename]
  );

  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isSlidePresentationMode, setIsSlidePresentationMode] = useState<boolean>(false);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Home") {
        setCurrentSlideIndex(0);
      } else if (e.key === "End") {
        setCurrentSlideIndex(slides.length - 1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length]);

  const activeSlide = slides[currentSlideIndex] || slides[0];

  return (
    <div className="w-full h-full flex flex-col items-center justify-between gap-4">
      {/* Presentation Top bar */}
      <div className="w-full flex items-center justify-between px-2 text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            Slide {currentSlideIndex + 1} of {slides.length}
          </span>
          <span className="hidden sm:inline">• 16:9 Widescreen Layout</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSlidePresentationMode(!isSlidePresentationMode)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-medium transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSlidePresentationMode ? "Exit Slideshow" : "Present"}</span>
          </button>
        </div>
      </div>

      {/* Main Slide Canvas (16:9 Aspect Ratio) */}
      <div
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
        className={`w-full max-w-4xl aspect-[16/9] rounded-2xl border p-6 sm:p-10 flex flex-col justify-between shadow-xl transition-all relative overflow-hidden select-none ${
          isDark
            ? "bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border-neutral-800 text-neutral-100"
            : "bg-gradient-to-br from-white via-neutral-50 to-neutral-100 border-neutral-300 text-neutral-900"
        }`}
      >
        {/* Subtle decorative accent */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Slide Header */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {activeSlide.category || "PRESENTATION"}
            </span>
            <span className="text-xs font-mono opacity-50">
              {String(activeSlide.number).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight font-sans leading-tight">
            {activeSlide.title}
          </h2>
        </div>

        {/* Slide Bullets */}
        <div className="my-auto py-4 space-y-3">
          {activeSlide.bullets.map((bullet, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs shrink-0 mt-0.5 font-bold">
                •
              </span>
              <p className="text-sm sm:text-base leading-relaxed text-neutral-300 dark:text-neutral-200 font-normal">
                {bullet}
              </p>
            </div>
          ))}
        </div>

        {/* Key Takeaway & Footer */}
        <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs opacity-75">
          <div className="flex items-center gap-1.5 text-amber-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{activeSlide.takeaway || "TATTVA AI Autonomous Intelligence"}</span>
          </div>
          <span className="font-mono text-[11px] opacity-60">TATTVA Presentation Suite</span>
        </div>
      </div>

      {/* Slide Navigation Controls & Thumbnails Strip */}
      <div className="w-full max-w-4xl flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={currentSlideIndex === 0}
            onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
            className="p-2 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono px-3">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <button
            type="button"
            disabled={currentSlideIndex === slides.length - 1}
            onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
            className="p-2 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Thumbnails strip */}
        <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-thin">
          {slides.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlideIndex(idx)}
              className={`flex flex-col items-center justify-between w-24 h-14 p-1.5 rounded-lg border text-[9px] shrink-0 transition-all font-mono ${
                idx === currentSlideIndex
                  ? "border-amber-500 bg-amber-500/15 shadow-sm text-amber-400 ring-1 ring-amber-500"
                  : isDark
                  ? "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700"
                  : "border-neutral-300 bg-neutral-100 text-neutral-600 hover:border-neutral-400"
              }`}
            >
              <span className="font-bold">SLIDE {s.number}</span>
              <span className="truncate w-full text-center text-[8px] opacity-75">{s.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. SPREADSHEET & CSV VIEWER COMPONENT (Grid, Sheets, fx bar)
// -------------------------------------------------------------
interface SheetData {
  title: string;
  headers: string[];
  rows: string[][];
}

function parseSpreadsheetFromContent(content?: string, filename = "Workbook.xlsx"): SheetData[] {
  if (!content) {
    return [
      {
        title: "Sheet1",
        headers: ["Column A", "Column B", "Column C"],
        rows: [["Data 1", "Data 2", "Data 3"]],
      },
    ];
  }

  const sheets: SheetData[] = [];
  // Check for multiple sheet indicators: "### Sheet: Name"
  const rawSheets = content.split(/###?\s*Sheet:\s*/i).filter(Boolean);

  if (rawSheets.length > 1) {
    for (const raw of rawSheets) {
      const lines = raw.trim().split("\n");
      const title = lines[0].trim() || `Sheet ${sheets.length + 1}`;
      const tableLines = lines.slice(1).filter((l) => l.includes("|") || l.includes(","));
      const parsed = parseTableLines(tableLines);
      if (parsed.headers.length > 0) {
        sheets.push({ title, ...parsed });
      }
    }
  } else {
    // Single sheet table or CSV parsing
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const parsed = parseTableLines(lines);
    sheets.push({
      title: filename.replace(/\.[a-zA-Z0-9]+$/, ""),
      ...parsed,
    });
  }

  return sheets.length > 0
    ? sheets
    : [
        {
          title: "Sheet1",
          headers: ["Item", "Category", "Value"],
          rows: [["Sample Record", "General", "100"]],
        },
      ];
}

function parseTableLines(lines: string[]): { headers: string[]; rows: string[][] } {
  const tableLines = lines.filter((l) => l.includes("|") && !l.includes("---"));
  if (tableLines.length > 0) {
    const headers = tableLines[0]
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    const rows = tableLines.slice(1).map((line) =>
      line
        .split("|")
        .map((c) => c.trim())
        .filter((_, i, arr) => i > 0 && i < arr.length - 1)
    );
    return { headers, rows };
  }

  // Fallback CSV comma parser
  const csvLines = lines.filter((l) => l.includes(","));
  if (csvLines.length > 0) {
    const headers = csvLines[0].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const rows = csvLines.slice(1).map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "").trim()));
    return { headers, rows };
  }

  return { headers: ["Column 1", "Column 2"], rows: [["Value 1", "Value 2"]] };
}

function SpreadsheetViewer({
  file,
  zoom,
  isDark,
  searchTerm,
  onSearchChange,
}: {
  file: GeneratedDocument;
  zoom: number;
  isDark: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
}) {
  const sheets = useMemo(
    () => parseSpreadsheetFromContent(file.outlineMarkdown || file.summary, file.filename),
    [file.outlineMarkdown, file.summary, file.filename]
  );

  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number; val: string } | null>({
    col: 0,
    row: 0,
    val: sheets[0]?.rows?.[0]?.[0] || "",
  });
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const currentSheet = sheets[activeSheetIndex] || sheets[0];

  // Column labels (A, B, C, D, ...)
  const colLetter = (idx: number) => String.fromCharCode(65 + (idx % 26));

  const filteredRows = useMemo(() => {
    let rows = [...currentSheet.rows];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter((r) => r.some((cell) => cell.toLowerCase().includes(q)));
    }
    if (sortColumn !== null) {
      rows.sort((a, b) => {
        const valA = a[sortColumn] || "";
        const valB = b[sortColumn] || "";
        const numA = parseFloat(valA.replace(/[^0-9.-]/g, ""));
        const numB = parseFloat(valB.replace(/[^0-9.-]/g, ""));
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortAsc ? numA - numB : numB - numA;
        }
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return rows;
  }, [currentSheet.rows, searchTerm, sortColumn, sortAsc]);

  return (
    <div className="w-full h-full flex flex-col rounded-xl border border-neutral-700 bg-neutral-900 overflow-hidden shadow-lg">
      {/* Formula & Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-950 text-xs font-mono text-neutral-300 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            fx
          </span>
          <span className="font-semibold text-neutral-400">
            [{selectedCell ? `${colLetter(selectedCell.col)}${selectedCell.row + 1}` : "A1"}]:
          </span>
          <span className="truncate max-w-sm text-neutral-200">
            {selectedCell?.val || ""}
          </span>
        </div>

        {/* Filter input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search cells..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-md bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 w-32 sm:w-48 font-sans"
          />
        </div>
      </div>

      {/* Grid Table Container */}
      <div
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
        className="flex-1 overflow-auto relative"
      >
        <table className="w-full text-left border-collapse text-xs font-mono select-none">
          <thead>
            <tr className="bg-neutral-800/90 text-neutral-400 sticky top-0 z-10 border-b border-neutral-700">
              <th className="w-12 px-2 py-2 text-center border-r border-neutral-700 font-normal">#</th>
              {currentSheet.headers.map((h, i) => (
                <th
                  key={i}
                  onClick={() => {
                    if (sortColumn === i) {
                      setSortAsc(!sortAsc);
                    } else {
                      setSortColumn(i);
                      setSortAsc(true);
                    }
                  }}
                  className="px-4 py-2 border-r border-neutral-700 font-semibold cursor-pointer hover:bg-neutral-700/50 transition whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      <span className="text-emerald-400 font-normal mr-1.5">{colLetter(i)}</span>
                      {h}
                    </span>
                    {sortColumn === i && (
                      <span className="text-emerald-400">{sortAsc ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b border-neutral-800/60 hover:bg-emerald-500/5 transition ${
                  rowIdx % 2 === 0 ? "bg-neutral-900" : "bg-neutral-900/60"
                }`}
              >
                <td className="w-12 px-2 py-1.5 text-center text-neutral-500 border-r border-neutral-800 select-none bg-neutral-950/40 font-mono">
                  {rowIdx + 1}
                </td>
                {currentSheet.headers.map((_, colIdx) => {
                  const val = row[colIdx] || "";
                  const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                  return (
                    <td
                      key={colIdx}
                      onClick={() => setSelectedCell({ col: colIdx, row: rowIdx, val })}
                      className={`px-4 py-1.5 border-r border-neutral-800/60 whitespace-nowrap transition cursor-cell ${
                        isSelected
                          ? "bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500"
                          : "text-neutral-200"
                      }`}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheets Tabs Bar (Bottom) */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-neutral-800 bg-neutral-950 shrink-0 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {sheets.map((sheet, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setActiveSheetIndex(idx);
                setSelectedCell(null);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                idx === activeSheetIndex
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              }`}
            >
              {sheet.title}
            </button>
          ))}
        </div>
        <span className="text-neutral-500 text-[11px] font-mono shrink-0">
          {filteredRows.length} rows • {currentSheet.headers.length} cols
        </span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. PDF DOCUMENT VIEWER (Embedded Object / Fallback Layout)
// -------------------------------------------------------------
function PdfDocumentViewer({
  file,
  blobUrl,
  zoom,
  isDark,
  searchTerm,
  onSearchChange,
}: {
  file: GeneratedDocument;
  blobUrl: string | null;
  zoom: number;
  isDark: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
}) {
  const [embedFailed, setEmbedFailed] = useState<boolean>(false);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {blobUrl && !embedFailed ? (
        <div
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          className="w-full h-full max-w-5xl rounded-xl overflow-hidden border border-neutral-700 bg-neutral-900 shadow-2xl flex flex-col"
        >
          <object
            data={`${blobUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=${zoom}`}
            type="application/pdf"
            onError={() => setEmbedFailed(true)}
            className="w-full h-full min-h-[70vh] border-0"
          >
            <iframe
              src={`${blobUrl}#toolbar=1`}
              className="w-full h-full min-h-[70vh] border-0"
              title={file.filename}
            />
          </object>
        </div>
      ) : (
        /* Fallback Reader Layout */
        <DocxDocumentViewer
          file={file}
          zoom={zoom}
          isDark={isDark}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 4. DOCX FORMATTED DOCUMENT VIEWER
// -------------------------------------------------------------
function DocxDocumentViewer({
  file,
  zoom,
  isDark,
  searchTerm,
  onSearchChange,
}: {
  file: GeneratedDocument;
  zoom: number;
  isDark: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
}) {
  const content = file.outlineMarkdown || file.summary || "";
  const lines = content.split("\n");

  return (
    <div
      style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
      className={`w-full max-w-4xl p-8 sm:p-14 rounded-2xl border shadow-xl leading-relaxed transition-all my-4 ${
        isDark
          ? "bg-neutral-900 border-neutral-800 text-neutral-100"
          : "bg-white border-neutral-200 text-neutral-900"
      }`}
    >
      {/* Document Cover Header */}
      <div className="border-b pb-6 mb-8 border-neutral-700/60">
        <div className="flex items-center justify-between mb-3">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
            {file.archetype ? file.archetype.replace(/_/g, " ") : "RESEARCH DOCUMENT"}
          </span>
          <span className="text-xs font-mono text-neutral-500">
            Verified Format: .{file.format.toUpperCase()}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans">
          {file.title || file.filename.replace(/\.[a-zA-Z0-9]+$/, "")}
        </h1>
        <p className="text-xs text-neutral-400 mt-2 font-mono">
          Prepared by TATTVA AI Intelligence Suite • Comprehensive Verified Structure
        </p>
      </div>

      {/* Render Document Lines Formatted */}
      <div className="space-y-4 font-sans text-sm sm:text-base">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-lg font-bold text-neutral-100 mt-6 pt-2 border-t border-neutral-800">
                {trimmed.replace(/^###\s*/, "")}
              </h3>
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h2 key={idx} className="text-xl font-bold text-blue-400 mt-8 mb-2">
                {trimmed.replace(/^##\s*/, "")}
              </h2>
            );
          }
          if (trimmed.startsWith("# ")) {
            return (
              <h1 key={idx} className="text-2xl font-black text-neutral-100 mt-8 mb-3">
                {trimmed.replace(/^#\s*/, "")}
              </h1>
            );
          }
          if (/^[-*•]\s+/.test(trimmed)) {
            return (
              <div key={idx} className="flex items-start gap-2.5 ml-3">
                <span className="text-blue-400 mt-1">•</span>
                <p className="text-neutral-300">{trimmed.replace(/^[-*•]\s+/, "")}</p>
              </div>
            );
          }
          if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
            return (
              <p key={idx} className="font-mono text-xs bg-neutral-950/60 p-2 rounded border border-neutral-800 overflow-x-auto text-blue-300">
                {trimmed}
              </p>
            );
          }
          if (trimmed.length === 0) {
            return <div key={idx} className="h-2" />;
          }
          return (
            <p key={idx} className="text-neutral-300 leading-relaxed font-normal">
              {trimmed}
            </p>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 5. SOURCE CODE FILE VIEWER
// -------------------------------------------------------------
function CodeFileViewer({
  file,
  format,
  isDark,
  searchTerm,
  onSearchChange,
  onCopy,
  copied,
}: {
  file: GeneratedDocument;
  format: string;
  isDark: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onCopy: (txt: string) => void;
  copied: boolean;
}) {
  const codeText = file.outlineMarkdown || file.summary || "# No code content provided";
  const lines = codeText.split("\n");

  return (
    <div className="w-full max-w-5xl h-full flex flex-col rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-2xl font-mono text-xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-neutral-900 text-neutral-300">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
          <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
          <span className="ml-2 font-semibold text-neutral-200">{file.filename}</span>
          <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
            {format}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCopy(codeText)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition text-[11px]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy Code"}</span>
          </button>
        </div>
      </div>

      {/* Code Body with Line Numbers */}
      <div className="flex-1 overflow-auto p-4 flex">
        {/* Line Numbers */}
        <div className="select-none text-neutral-600 text-right pr-4 border-r border-neutral-800 shrink-0 font-mono">
          {lines.map((_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Content */}
        <div className="pl-4 flex-1 text-neutral-200 overflow-x-auto font-mono">
          {lines.map((line, i) => (
            <div key={i} className="leading-6 whitespace-pre hover:bg-white/5 rounded px-1 transition">
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 6. TEXT / DATA / MARKDOWN VIEWER
// -------------------------------------------------------------
function TextDataViewer({
  file,
  format,
  isDark,
  searchTerm,
  onSearchChange,
  onCopy,
  copied,
}: {
  file: GeneratedDocument;
  format: string;
  isDark: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onCopy: (txt: string) => void;
  copied: boolean;
}) {
  const rawText = file.outlineMarkdown || file.summary || "";

  return (
    <div className="w-full max-w-4xl h-full flex flex-col rounded-xl border border-neutral-800 bg-neutral-900 p-6 overflow-hidden shadow-xl text-neutral-100">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
        <span className="font-semibold text-sm">{file.filename}</span>
        <button
          type="button"
          onClick={() => onCopy(rawText)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy Content"}</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs p-4 bg-neutral-950 rounded-lg border border-neutral-800 whitespace-pre-wrap leading-relaxed">
        {rawText}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// OPEN WITH MODAL (COMPATIBLE APPLICATIONS CHOOSER)
// -------------------------------------------------------------
function OpenWithModal({
  file,
  format,
  blobUrl,
  isDark,
  onClose,
  onDownload,
}: {
  file: GeneratedDocument;
  format: string;
  blobUrl: string | null;
  isDark: boolean;
  onClose: () => void;
  onDownload: () => void;
}) {
  // Compatible app suggestions based on file format
  const suggestions = useMemo(() => {
    switch (format) {
      case "pdf":
        return [
          { name: "Adobe Acrobat Reader", type: "Desktop / Mobile App", icon: "📄" },
          { name: "Google Drive PDF Viewer", type: "Web / Android / iOS", icon: "🌐" },
          { name: "Browser PDF Viewer", type: "Native Tab", icon: "🔍" },
        ];
      case "pptx":
      case "ppt":
        return [
          { name: "Microsoft PowerPoint", type: "Desktop / Office 365", icon: "📊" },
          { name: "Google Slides", type: "Web / Android / iOS", icon: "🖼️" },
          { name: "Keynote", type: "macOS / iOS", icon: "🖥️" },
        ];
      case "docx":
      case "doc":
        return [
          { name: "Microsoft Word", type: "Desktop / Office 365", icon: "📝" },
          { name: "Google Docs", type: "Web / Android / iOS", icon: "📄" },
          { name: "LibreOffice Writer", type: "Desktop App", icon: "💼" },
        ];
      case "xlsx":
      case "xls":
      case "csv":
        return [
          { name: "Microsoft Excel", type: "Desktop / Office 365", icon: "📈" },
          { name: "Google Sheets", type: "Web / Android / iOS", icon: "📊" },
          { name: "Apple Numbers", type: "macOS / iOS", icon: "🔢" },
        ];
      case "py":
      case "ts":
      case "js":
      case "java":
      case "c":
      case "cpp":
      case "sql":
        return [
          { name: "Visual Studio Code", type: "Desktop Editor", icon: "💻" },
          { name: "PyCharm / IDE", type: "Language Environment", icon: "🐍" },
          { name: "Notepad++ / TextEdit", type: "Lightweight Editor", icon: "✏️" },
        ];
      default:
        return [
          { name: "System Default Application", type: "OS Associated Viewer", icon: "📁" },
          { name: "Web Browser", type: "Browser Preview", icon: "🌐" },
        ];
    }
  }, [format]);

  // Open in new tab if browser supports
  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, "_blank");
    } else if (file.downloadUrl) {
      window.open(file.downloadUrl, "_blank");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl transition-all ${
          isDark ? "bg-neutral-900 border-neutral-700 text-neutral-100" : "bg-white border-neutral-300 text-neutral-900"
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-700/60 mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-500" />
            <h4 className="font-bold text-sm">Open With Compatible App</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-400 mb-4">
          Select an option below to open <span className="font-mono text-neutral-200">{file.filename}</span> using your device&apos;s installed apps or online tools:
        </p>

        {/* Action 1: Download & Open in Installed OS App */}
        <div className="space-y-2 mb-4">
          <button
            type="button"
            onClick={() => {
              onDownload();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-800 text-left transition group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">💻</span>
              <div>
                <p className="font-semibold text-xs text-neutral-200 group-hover:text-amber-400 transition">
                  Download &amp; Open in Default App
                </p>
                <p className="text-[11px] text-neutral-400">
                  Opens via your OS file associations (Word, Excel, Acrobat, etc.)
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-amber-400 transition" />
          </button>

          {/* Action 2: Open in Browser Tab (if supported) */}
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-800 text-left transition group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🌐</span>
              <div>
                <p className="font-semibold text-xs text-neutral-200 group-hover:text-blue-400 transition">
                  Open in New Browser Tab
                </p>
                <p className="text-[11px] text-neutral-400">
                  Preview in full web window
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-blue-400 transition" />
          </button>
        </div>

        {/* Compatible Installed Apps List */}
        <div className="pt-3 border-t border-neutral-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
            Compatible Software for .{format.toUpperCase()}:
          </p>
          <div className="space-y-1.5">
            {suggestions.map((app, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-neutral-950/40 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span>{app.icon}</span>
                  <span className="font-medium text-neutral-300">{app.name}</span>
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">{app.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

