"use client";

import React from "react";
import {
  Download,
  Eye,
  Share2,
  FileText,
  FileSpreadsheet,
  Presentation,
  Code2,
  FileCode,
  CheckCircle2,
} from "lucide-react";
import type { GeneratedDocument } from "./FileViewerModal";

interface FileAttachmentCardProps {
  docItem: GeneratedDocument;
  onOpen: (doc: GeneratedDocument) => void;
  onDownload: (doc: GeneratedDocument) => void;
  onOpenWith: (doc: GeneratedDocument) => void;
  isDark?: boolean;
}

export function FileAttachmentCard({
  docItem,
  onOpen,
  onDownload,
  onOpenWith,
  isDark = true,
}: FileAttachmentCardProps) {
  const fmt = (docItem.format || "").toLowerCase().replace(/^\./, "");
  const isCode = ["py", "ts", "js", "java", "c", "cpp", "sql", "html", "css"].includes(fmt);
  const isData = ["json", "xml"].includes(fmt);
  const isSheet = ["xlsx", "xls", "csv"].includes(fmt);
  const isPpt = ["pptx", "ppt"].includes(fmt);
  const isPdf = fmt === "pdf";

  const badgeClass = isPpt
    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : isSheet
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : isPdf
    ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
    : isCode
    ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
    : isData
    ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
    : "bg-blue-500/15 text-blue-400 border-blue-500/30";

  const sizeKb = Math.round((docItem.sizeBytes || 1024) / 1024) || 1;

  return (
    <div
      className={`my-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-2xl border shadow-sm transition-all ${
        isDark
          ? "border-neutral-800 bg-neutral-900/90 text-neutral-100 hover:border-neutral-700"
          : "border-black/10 bg-neutral-50 text-neutral-900 hover:border-black/20"
      }`}
    >
      {/* File Info */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${badgeClass}`}>
          {isPpt ? (
            <Presentation className="w-5 h-5" />
          ) : isSheet ? (
            <FileSpreadsheet className="w-5 h-5" />
          ) : isCode ? (
            <Code2 className="w-5 h-5" />
          ) : isData ? (
            <FileCode className="w-5 h-5" />
          ) : (
            <FileText className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate font-mono tracking-tight" title={docItem.filename}>
            {docItem.filename}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-300">
              .{fmt.toUpperCase()}
            </span>
            <span>•</span>
            <span>{sizeKb} KB</span>
            <span>•</span>
            <span className="inline-flex items-center gap-0.5 text-emerald-500">
              <CheckCircle2 className="w-3 h-3 inline" /> Ready
            </span>
          </div>
        </div>
      </div>

      {/* Responsive Actions: Open, Download, Open With */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
        {/* 1. Open Button (Primary In-App Viewer) */}
        <button
          type="button"
          onClick={() => onOpen(docItem)}
          title={`Open ${docItem.filename} inside TATTVA AI viewer`}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
        >
          <Eye className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 stroke-[2.5]" />
          <span>Open</span>
        </button>

        {/* 2. Download Button (Native Download) */}
        <button
          type="button"
          onClick={() => onDownload(docItem)}
          title={`Download ${docItem.filename} to your device`}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D95B26] hover:bg-[#E26630] text-white text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Download</span>
        </button>

        {/* 3. Open With Option (Native Sharesheet on Mobile, Chooser on Desktop) */}
        <button
          type="button"
          onClick={() => onOpenWith(docItem)}
          title={`Open with compatible applications on your device`}
          className="inline-flex items-center justify-center p-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition cursor-pointer active:scale-95"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="sr-only">Open With</span>
        </button>
      </div>
    </div>
  );
}

