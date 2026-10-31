"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Download,
  Sparkles,
  RefreshCw,
  Trash2,
  History,
  ArrowRight,
  Check,
  Copy,
  Layers,
  Table as TableIcon,
  FolderArchive,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Radio,
} from "lucide-react";
import { triggerDownload } from "../lib/download-helper";

type DocFormat = "pdf" | "docx" | "pptx" | "xlsx" | "csv" | "txt" | "md";

interface DocumentHistoryItem {
  id: string;
  filename: string;
  format: DocFormat;
  title: string;
  sizeBytes: number;
  dataUri: string;
  timestamp: number;
  prompt: string;
}

const FORMAT_OPTIONS: Array<{
  id: DocFormat;
  label: string;
  badge: string;
  icon: string;
  desc: string;
  engine: string;
}> = [
  {
    id: "pdf",
    label: "PDF Document",
    badge: "ReportLab",
    icon: "📄",
    desc: "Page numbering, running headers & footers, typography",
    engine: "ReportLab Platypus",
  },
  {
    id: "docx",
    label: "Word Document",
    badge: "python-docx",
    icon: "📝",
    desc: "1-inch margins, styled headings, data tables",
    engine: "python-docx v1.2",
  },
  {
    id: "pptx",
    label: "PowerPoint Slides",
    badge: "python-pptx",
    icon: "📊",
    desc: "16:9 widescreen presentation, title & bullet cards",
    engine: "python-pptx v1.0",
  },
  {
    id: "xlsx",
    label: "Excel Spreadsheet",
    badge: "openpyxl",
    icon: "📈",
    desc: "Multiple sheets, formulas (=SUM, =AVERAGE), zebra styling",
    engine: "openpyxl v3.1",
  },
  {
    id: "csv",
    label: "CSV Tabular Data",
    badge: "pandas",
    icon: "📋",
    desc: "Comma-separated records with pandas escaping",
    engine: "pandas v3.1",
  },
  {
    id: "md",
    label: "Markdown File",
    badge: "Standard",
    icon: "📑",
    desc: "Structured headings, code blocks, checklists",
    engine: "UTF-8 Markdown",
  },
  {
    id: "txt",
    label: "Plain Text",
    badge: "UTF-8",
    icon: "📄",
    desc: "Standard clean unformatted text documentation",
    engine: "UTF-8 Text",
  },
];

const TEMPLATE_PROMPTS = [
  {
    title: "Executive Strategic Plan (PDF)",
    format: "pdf" as DocFormat,
    prompt: "Create an Executive Strategic AI Roadmap with executive summary, market opportunity, Q1-Q4 operational milestones, and risk mitigation table.",
  },
  {
    title: "Company Financial Model (XLSX)",
    format: "xlsx" as DocFormat,
    prompt: "Generate an annual corporate revenue, operating expense, marketing spend, and net margin forecast with formulas (=SUM) and quarterly breakdowns.",
  },
  {
    title: "Series A Investor Pitch Deck (PPTX)",
    format: "pptx" as DocFormat,
    prompt: "Build an investor pitch deck covering Problem Statement, AI Technology Advantage, Traction & Metrics, Market Size (TAM/SAM), and 18-month Milestones.",
  },
  {
    title: "SaaS Service Level Agreement (DOCX)",
    format: "docx" as DocFormat,
    prompt: "Generate an enterprise SaaS Service Level Agreement (SLA) with uptime commitments, incident response times, scheduled maintenance, and remedies table.",
  },
  {
    title: "Customer Retention & Churn Data (CSV)",
    format: "csv" as DocFormat,
    prompt: "Generate structured tabular customer retention records with User ID, Subscription Tier, Lifetime Value, NPS Score, and Churn Risk Level.",
  },
];

export default function MediaDocumentPage() {
  const [format, setFormat] = useState<DocFormat>("pdf");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStage, setProgressStage] = useState("");
  const [error, setError] = useState("");
  const [currentDoc, setCurrentDoc] = useState<DocumentHistoryItem | null>(null);
  const [structuredPreview, setStructuredPreview] = useState<any>(null);
  const [history, setHistory] = useState<DocumentHistoryItem[]>([]);
  const [copied, setCopied] = useState(false);

  // Load document history
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tattva_document_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHistory(parsed);
          setCurrentDoc(parsed[0]);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  function saveToHistory(item: DocumentHistoryItem) {
    setHistory((prev) => {
      const updated = [item, ...prev.filter((i) => i.id !== item.id)].slice(0, 30);
      try {
        localStorage.setItem("tattva_document_history", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }

  function clearHistory() {
    if (confirm("Clear your generated file history?")) {
      setHistory([]);
      localStorage.removeItem("tattva_document_history");
    }
  }

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed || trimmed.length < 3) {
      setError("Please describe the document you want to generate in at least 3 characters.");
      return;
    }

    setIsGenerating(true);
    setError("");
    setProgressStage("Analyzing prompt with AI & structuring logical sections...");

    try {
      const res = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, format }),
      });

      setProgressStage("Compiling validated binary in Python document engine...");

      const data = await res.json();
      if (!res.ok || !data.success || !data.data_uri) {
        throw new Error(data.error || "Failed to generate document binary.");
      }

      const item: DocumentHistoryItem = {
        id: `doc_${Date.now()}`,
        filename: data.filename,
        format: data.format,
        title: data.title || "TATTVA Generated Document",
        sizeBytes: data.size_bytes || 0,
        dataUri: data.data_uri,
        timestamp: Date.now(),
        prompt: trimmed,
      };

      setCurrentDoc(item);
      setStructuredPreview(data.structured_data || null);
      saveToHistory(item);
      setProgressStage("Complete!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Document generation failed.");
    } finally {
      setIsGenerating(false);
      setProgressStage("");
    }
  }

  function downloadDoc(item: DocumentHistoryItem | null = currentDoc) {
    if (!item || !item.dataUri) return;
    triggerDownload(item.dataUri, item.filename);
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-black selection:text-white flex flex-col justify-between antialiased">
      {/* =========================================================================
          TOP NAVIGATION BAR (ALL 4 REQUIRED OPTIONS TOGETHER IN THE SAME PLACE)
      ========================================================================= */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white shadow-xs">
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="leading-tight">
                <span className="text-sm font-bold tracking-tight text-neutral-900">TATTVA AI</span>
                <span className="block text-[10px] font-medium text-neutral-400">Document &amp; Media Studio</span>
              </div>
            </a>
          </div>

          {/* ALL 4 OPTIONS IN SAME PLACE AS IN THE NAVIGATION */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 1. Live Voice Mode */}
            <a
              href="/voice"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 shadow-xs"
              title="ChatGPT-Style Live Voice Mode"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
              <span>Live Voice Mode</span>
            </a>

            {/* 2. Image Studio */}
            <a
              href="/studio"
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50 shadow-xs"
              title="AI Image Generation Studio"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>Image Studio</span>
            </a>

            {/* 3. Media / Document Studio (Active) */}
            <div
              className="flex items-center gap-1.5 rounded-xl border border-black bg-black px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
              title="AI Document & File Generation Engine"
            >
              <FolderArchive className="w-3.5 h-3.5 text-white" />
              <span>Media</span>
            </div>

            {/* 4. Chat Link */}
            <a
              href="/chat"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 shadow-xs"
            >
              <span>Back to Chat</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* MAIN STUDIO WORKBENCH */}
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 py-6 flex-1">
        {/* Header Intro */}
        <div className="border-b border-neutral-200 pb-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                AI DOCUMENT GENERATION ENGINE
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                Natural Language to Professional Files
              </h1>
              <p className="mt-1 text-xs text-neutral-500 max-w-2xl">
                Describe your requirements and generate verified binary files with ReportLab (PDF), python-docx (DOCX), python-pptx (PPTX), openpyxl (XLSX), and pandas (CSV).
              </p>
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="self-start sm:self-auto inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-red-600 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>
        </div>

        {/* Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          {/* LEFT: FORMAT SELECTOR & PROMPT EDITOR */}
          <div className="space-y-6">
            {/* Format Selection Card */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-3">
                1. Select Target Format
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    disabled={isGenerating}
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                      format === f.id
                        ? "border-black bg-black text-white shadow-xs"
                        : "border-neutral-200 bg-neutral-50/60 text-neutral-800 hover:border-neutral-300 hover:bg-neutral-100"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-base">{f.icon}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase font-semibold ${
                          format === f.id ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700"
                        }`}
                      >
                        {f.badge}
                      </span>
                    </div>
                    <span className="font-bold text-xs mt-2 truncate w-full">{f.label}</span>
                    <span
                      className={`text-[10px] mt-0.5 line-clamp-1 ${
                        format === f.id ? "text-neutral-300" : "text-neutral-400"
                      }`}
                    >
                      {f.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Editor Card */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="media-doc-prompt" className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  2. Describe Document Content
                </label>
                <span className="text-[11px] text-neutral-400">
                  Supports English, Telugu, Hindi, etc.
                </span>
              </div>

              <textarea
                id="media-doc-prompt"
                rows={6}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                placeholder="e.g. Generate an annual financial forecast for a cloud software company with Q1-Q4 revenue, operating expenses, sales commission, marketing spend, and calculated net margin formulas..."
                className="w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 text-sm leading-relaxed text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black disabled:opacity-50"
              />

              {/* Quick Template Chips */}
              <div className="mt-4">
                <span className="block text-[11px] font-semibold text-neutral-500 mb-2">
                  Template Prompts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_PROMPTS.map((t) => (
                    <button
                      key={t.title}
                      type="button"
                      onClick={() => {
                        setFormat(t.format);
                        setPrompt(t.prompt);
                        setError("");
                      }}
                      className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] text-neutral-700 hover:border-neutral-300 hover:bg-white transition"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || prompt.trim().length < 3}
                className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-black text-sm font-semibold text-white shadow-md transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isGenerating ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>{progressStage || "Generating verified document..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate {format.toUpperCase()} Document</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Notice */}
            {error && (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}
          </div>

          {/* RIGHT: DOCUMENT PREVIEW & DOWNLOAD BENCH */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Document Workbench</h2>
                  <p className="text-[11px] text-neutral-400">Binary verification &amp; export preview</p>
                </div>

                {currentDoc && (
                  <button
                    type="button"
                    onClick={() => downloadDoc(currentDoc)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download {currentDoc.format.toUpperCase()}</span>
                  </button>
                )}
              </div>

              {/* Preview Canvas Area */}
              <div className="min-h-[420px] p-6 bg-neutral-50/50 flex flex-col justify-center">
                {isGenerating ? (
                  <div className="text-center py-12" role="status">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
                      <FileText className="h-7 w-7 text-black animate-pulse" />
                    </div>
                    <h3 className="mt-4 text-sm font-bold text-neutral-900">Compiling Document</h3>
                    <p className="mt-1 text-xs text-neutral-500 max-w-xs mx-auto">
                      {progressStage || "Formatting typography, margins & tables..."}
                    </p>
                    <div className="mt-4 mx-auto h-1.5 w-44 overflow-hidden rounded-full bg-neutral-200">
                      <div className="h-full w-2/3 animate-pulse bg-black rounded-full" />
                    </div>
                  </div>
                ) : currentDoc ? (
                  <div className="space-y-4">
                    {/* File Card Banner */}
                    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white font-mono font-bold text-xs uppercase shadow-xs">
                            {currentDoc.format}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                              {currentDoc.title}
                            </h3>
                            <span className="text-[11px] font-mono text-neutral-500 block mt-0.5">
                              {currentDoc.filename} • {(currentDoc.sizeBytes / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified Binary</span>
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                        <span className="text-neutral-500">Prompt: {currentDoc.prompt.slice(0, 50)}...</span>
                        <button
                          type="button"
                          onClick={() => downloadDoc(currentDoc)}
                          className="font-semibold text-black hover:underline"
                        >
                          Save file →
                        </button>
                      </div>
                    </div>

                    {/* Structured Content Preview Breakdown */}
                    {structuredPreview && (
                      <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                          Document Structure Preview
                        </span>

                        {structuredPreview.sections && structuredPreview.sections.length > 0 && (
                          <div className="space-y-2">
                            {structuredPreview.sections.map((sec: any, idx: number) => (
                              <div key={idx} className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3 text-xs">
                                <span className="font-bold text-neutral-900 block">{sec.heading}</span>
                                <p className="text-neutral-600 text-[11px] mt-1 line-clamp-2">{sec.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {structuredPreview.slides && structuredPreview.slides.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {structuredPreview.slides.map((sl: any, idx: number) => (
                              <div key={idx} className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-2.5 text-xs">
                                <span className="font-semibold text-neutral-900 block text-[11px]">Slide {idx + 1}: {sl.title}</span>
                                <span className="text-[10px] text-neutral-400 block mt-0.5">{sl.bullets?.length || 0} bullet points</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {structuredPreview.sheets && structuredPreview.sheets.length > 0 && (
                          <div className="space-y-2">
                            {structuredPreview.sheets.map((sh: any, idx: number) => (
                              <div key={idx} className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-2.5 text-xs">
                                <span className="font-semibold text-neutral-900 block text-[11px]">Worksheet: {sh.title}</span>
                                <span className="text-[10px] text-neutral-400 block mt-0.5">{sh.rows?.length || 0} rows • {sh.formulas?.length || 0} calculated formulas</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-500 shadow-2xs">
                      <FolderArchive className="w-6 h-6" />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-neutral-900">Awaiting File Request</h3>
                    <p className="mt-1 text-xs text-neutral-400 max-w-xs mx-auto">
                      Choose a format (PDF, DOCX, PPTX, XLSX, CSV) and describe what you need to generate.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* RECENT FILES HISTORY */}
            {history.length > 0 && (
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-neutral-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                      File History ({history.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-neutral-400">Click to reload</span>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {history.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setCurrentDoc(doc)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition ${
                        currentDoc?.id === doc.id
                          ? "border-black bg-neutral-50 font-semibold"
                          : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="rounded bg-black text-white px-1.5 py-0.5 text-[9px] font-mono uppercase">
                          {doc.format}
                        </span>
                        <span className="truncate max-w-[200px] text-neutral-800">{doc.title}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {(doc.sizeBytes / 1024).toFixed(1)} KB
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadDoc(doc);
                          }}
                          className="p-1 hover:text-black transition"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full py-5 px-6 border-t border-neutral-100 bg-white text-xs text-neutral-500">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3">
          <span>TATTVA AI Document Engine • Crafted by kotapati Gowtham Chowdary ✨</span>
          <div className="flex items-center gap-4 text-[11px]">
            <a href="/chat" className="hover:text-black transition">Chat</a>
            <span>•</span>
            <a href="/voice" className="hover:text-black transition">Voice Assistant</a>
            <span>•</span>
            <a href="/studio" className="hover:text-black transition">Image Studio</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
