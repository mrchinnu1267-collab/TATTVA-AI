"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Paperclip,
  Download,
  Share2,
  Sparkles,
  Moon,
  Sun,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  Maximize2,
  RefreshCw,
  X,
  FileCode,
  Radio,
  Pin,
  PinOff,
  Search,
  Info,
  MoreVertical,
  Edit2,
  FolderArchive,
  User as UserIcon,
  Settings,
  ShieldCheck,
  HelpCircle,
  LogOut,
  ChevronUp,
  KeyRound,
  Menu,
  ArrowUp,
  Square,
  Globe,
  FileText,
  FileSpreadsheet,
  Code2,
  Compass,
  UploadCloud,
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown,
  Brain,
  Sliders,
  Languages,
  AlignLeft,
  AlertTriangle,
  Layers,
  Lock,
  LogIn,
  UserPlus,
  ChevronDown,
  ExternalLink,
  Play,
  Pause,
  Archive,
  Wrench,
  Cpu,
} from "lucide-react";
import type {
  MemoryItem,
  MemoryCategory,
  PersonalizationSettings,
  FeedbackCategory,
} from "../lib/memory-types";
import { DEFAULT_PERSONALIZATION_SETTINGS } from "../lib/memory-types";
import { triggerDownload } from "../lib/download-helper";
import {
  createAccount,
  loginUser,
  logoutUser,
  saveActiveSession,
  resetGuestCount,
  getActiveSessionName,
} from "../lib/local-auth";

type Role = "user" | "assistant";

type ChatAttachment = {
  name: string;
  type: string;
  data: string; // base64 data URI
  preview?: string;
  size?: number;
};

type ImageMetadata = {
  model?: string;
  provider?: string;
  seed?: number;
  generation_time_seconds?: number;
  width?: number;
  height?: number;
  isEdit?: boolean;
};

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  image?: string;
  kind?: "text" | "image";
  imageMetadata?: ImageMetadata;
  attachments?: ChatAttachment[];
  timestamp?: number;
  recalledMemories?: Array<{ id?: string; content: string; category?: string; importance?: number }>;
  userFeedback?: { rating: "positive" | "negative"; category?: string; comment?: string };
  citations?: Array<{ title: string; url: string; snippet?: string }>;
  toolsExecuted?: string[];
  reasoningPlan?: any;
  agentState?: any;
};

type ChatSession = {
  id: string;
  title: string;
  userEmail?: string;
  messages: ChatMessage[];
  updatedAt: number;
  is_pinned?: boolean;
  pinned_at?: number;
  is_archived?: boolean;
  archived_at?: number;
};

type EngineStatus = {
  localOnline: boolean;
  engine: string;
  models?: Array<{ id: string; name: string; loaded?: boolean }>;
  current_model?: string | null;
  gpu?: {
    available?: boolean;
    device?: string;
    total_vram_gb?: number;
    allocated_vram_gb?: number;
  };
};

const GUEST_CHAT_LIMIT = 5;
const CHAT_WORD_LIMIT = 100000; // 1 lakh words limit per chat

function getStorageKey(email?: string | null) {
  if (!email || !email.trim()) return "tattva_guest_chats";
  return `tattva_encrypted_chats_${email.toLowerCase().trim().replace(/[^a-z0-9]/g, "_")}`;
}

function formatChatDate(timestamp?: number) {
  if (!timestamp) return "Today";
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Today • ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday • ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function calculateChatWordCount(msgs: ChatMessage[]): number {
  return msgs.reduce((total, m) => {
    const text = m.content.trim();
    if (!text) return total;
    return total + text.split(/\s+/).filter(Boolean).length;
  }, 0);
}

/**
 * Universal File Download Helper: creates and downloads any file type instantly
 * Supports: .txt, .pdf, .xlsx, .xls, .docx, .doc, .dox, .pptx, .ppt, .pages, .xps, .numbers, .ods, .odp, .key, .rtf, .jpg, .png, etc.
 */
async function downloadGeneratedFile(content: string, rawTag = "txt", explicitFilename?: string) {
  const normalized = rawTag.toLowerCase().trim();

  // If the user requests a document format, route to backend Document Engine for genuine compiled binary (ReportLab, python-docx, python-pptx, openpyxl, pandas)
  const isBinaryDoc = ["pdf", "docx", "doc", "dox", "pptx", "ppt", "xlsx", "xls", "csv"].some((fmt) => normalized.includes(fmt));
  if (isBinaryDoc && !content.startsWith("data:") && !content.startsWith("%PDF")) {
    try {
      const targetFormat = normalized.includes("pdf")
        ? "pdf"
        : normalized.includes("docx") || normalized.includes("doc") || normalized.includes("dox")
        ? "docx"
        : normalized.includes("pptx") || normalized.includes("ppt")
        ? "pptx"
        : normalized.includes("xlsx") || normalized.includes("xls")
        ? "xlsx"
        : "csv";

      const res = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: content.slice(0, 2000),
          format: targetFormat,
          title: explicitFilename ? explicitFilename.replace(/\.[^/.]+$/, "") : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.success && data.data_uri) {
          const finalFilename = data.filename || explicitFilename || `tattva_${targetFormat}_${Date.now()}.${targetFormat}`;
          triggerDownload(data.data_uri, finalFilename, `application/${targetFormat}`);
          return;
        }
      }
    } catch (e) {
      console.warn("Real document compilation fallback triggered:", e);
    }
  }

  let ext = "txt";
  let mimeType = "text/plain";
  let blobData: BlobPart = content;

  // 1. PDF Documents (.pdf)
  if (normalized.includes("pdf")) {
    ext = "pdf";
    mimeType = "application/pdf";
    if (content.startsWith("%PDF")) {
      blobData = content;
    } else {
      // Build a standard valid PDF 1.4 document
      const escaped = content
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .replace(/\r/g, "");
      const lines = escaped.split("\n");
      let streamText = "BT /F1 12 Tf 50 780 Td 15 TL\n";
      for (const line of lines.slice(0, 50)) {
        streamText += `(${line.slice(0, 85)}) '\n`;
      }
      streamText += "ET";
      const pdfString = `%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n3 0 obj <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 4 0 R>>>> /MediaBox [0 0 595 842] /Contents 5 0 R>> endobj\n4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n5 0 obj <</Length ${streamText.length}>> stream\n${streamText}\nendstream endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000227 00000 n \n0000000305 00000 n \ntrailer <</Size 6 /Root 1 0 R>>\nstartxref\n${400 + streamText.length}\n%%EOF`;
      blobData = pdfString;
    }
  }
  // 2. Excel Spreadsheets (.xlsx, .xls)
  else if (normalized.includes("xlsx") || normalized.includes("xls") || normalized.includes("excel") || normalized.includes("spreadsheet")) {
    ext = normalized.includes("xls") && !normalized.includes("xlsx") ? "xls" : "xlsx";
    mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (!content.trim().startsWith("<?xml")) {
      const rows = content.trim().split("\n");
      let xmlRows = "";
      for (const row of rows) {
        const cells = row.split(/,|\t|\|/).map((c) => c.trim().replace(/^\||\|$/g, "")).filter(Boolean);
        if (cells.length) {
          xmlRows += "   <Row>\n";
          for (const cell of cells) {
            xmlRows += `    <Cell><Data ss:Type="String">${cell.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Data></Cell>\n`;
          }
          xmlRows += "   </Row>\n";
        }
      }
      blobData = `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n xmlns:o="urn:schemas-microsoft-com:office:office"\n xmlns:x="urn:schemas-microsoft-com:office:excel"\n xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n <Worksheet ss:Name="TATTVA_Sheet">\n  <Table>\n${xmlRows}  </Table>\n </Worksheet>\n</Workbook>`;
    }
  }
  // 3. Word Documents (.docx, .doc, .dox)
  else if (normalized.includes("docx") || normalized.includes("doc") || normalized.includes("dox")) {
    ext = normalized.includes("dox") ? "docx" : normalized.includes("doc") && !normalized.includes("docx") ? "doc" : "docx";
    mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const paragraphs = content
      .split("\n\n")
      .map((p) => `<p style="margin-bottom:12pt;font-family:Calibri,sans-serif;font-size:11pt;line-height:1.5;">${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
    blobData = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>\n<head><meta charset='utf-8'><title>TATTVA Document</title></head>\n<body style="padding:40pt;font-family:Calibri,sans-serif;">${paragraphs}</body>\n</html>`;
  }
  // 4. Rich Text Format (.rtf)
  else if (normalized.includes("rtf")) {
    ext = "rtf";
    mimeType = "application/rtf";
    const rtfEscaped = content.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\n/g, "\\par\n");
    blobData = `{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}\\viewkind4\\uc1\\pard\\lang1033\\f0\\fs22 ${rtfEscaped}}`;
  }
  // 5. PowerPoint Presentations (.pptx, .ppt, .odp, .key)
  else if (normalized.includes("pptx") || normalized.includes("ppt") || normalized.includes("odp") || normalized.includes("key")) {
    ext = normalized.includes("ppt") && !normalized.includes("pptx") ? "ppt" : normalized.includes("odp") ? "odp" : normalized.includes("key") ? "key" : "pptx";
    mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    const slides = content.split(/---|\n#{1,2}\s+/).filter(Boolean);
    const htmlSlides = slides
      .map((s, idx) => `<div style="page-break-after:always;padding:30pt;border:1px solid #ccc;margin-bottom:20pt;height:500pt;background:#fff;font-family:Arial,sans-serif;"><h2>Slide ${idx + 1}</h2><p>${s.replace(/\n/g, "<br/>")}</p></div>`)
      .join("");
    blobData = `<html><head><meta charset='utf-8'><title>TATTVA Presentation</title></head><body>${htmlSlides}</body></html>`;
  }
  // 6. Apple Pages & Apple Numbers
  else if (normalized.includes("pages")) {
    ext = "pages";
    mimeType = "application/x-iwork-pages-sffpages";
    blobData = content;
  } else if (normalized.includes("numbers") || normalized.includes("ods")) {
    ext = normalized.includes("ods") ? "ods" : "numbers";
    mimeType = "application/vnd.oasis.opendocument.spreadsheet";
    blobData = content;
  }
  // 7. XML Paper Specification (.xps)
  else if (normalized.includes("xps")) {
    ext = "xps";
    mimeType = "application/vnd.ms-xpsdocument";
    blobData = content;
  }
  // 8. Image files (.jpg, .jpeg, .png)
  else if (normalized.includes("jpg") || normalized.includes("jpeg")) {
    ext = "jpg";
    mimeType = "image/jpeg";
    blobData = content;
  } else if (normalized.includes("png")) {
    ext = "png";
    mimeType = "image/png";
    blobData = content;
  }
  // 9. Structured Data & Code files
  else if (normalized.includes("csv")) {
    ext = "csv";
    mimeType = "text/csv;charset=utf-8;";
    blobData = "\uFEFF" + content;
  } else if (normalized.includes("python") || normalized === "py") {
    ext = "py";
    mimeType = "text/x-python";
  } else if (normalized.includes("javascript") || normalized === "js") {
    ext = "js";
    mimeType = "text/javascript";
  } else if (normalized.includes("typescript") || normalized === "ts") {
    ext = "ts";
    mimeType = "text/typescript";
  } else if (normalized.includes("tsx") || normalized.includes("jsx")) {
    ext = "tsx";
    mimeType = "text/typescript";
  } else if (normalized.includes("html")) {
    ext = "html";
    mimeType = "text/html";
  } else if (normalized.includes("css")) {
    ext = "css";
    mimeType = "text/css";
  } else if (normalized.includes("json")) {
    ext = "json";
    mimeType = "application/json";
  } else if (normalized.includes("sql")) {
    ext = "sql";
    mimeType = "application/sql";
  } else if (normalized.includes("svg")) {
    ext = "svg";
    mimeType = "image/svg+xml";
  } else if (normalized.includes("markdown") || normalized === "md") {
    ext = "md";
    mimeType = "text/markdown";
  } else if (normalized.includes("sh") || normalized.includes("bash")) {
    ext = "sh";
    mimeType = "application/x-sh";
  } else if (normalized.includes("yaml") || normalized.includes("yml")) {
    ext = "yaml";
    mimeType = "text/yaml";
  } else {
    ext = "txt";
    mimeType = "text/plain";
  }

  const finalName = explicitFilename ? explicitFilename : `tattva-${normalized || "file"}-${Date.now()}.${ext}`;
  const blob = new Blob([blobData], { type: mimeType });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, finalName, mimeType);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function parseInlineMarkdown(text: string, isDark: boolean): React.ReactNode[] {
  if (!text) return [""];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIdx) {
      nodes.push(text.slice(lastIdx, m.index));
    }
    const token = m[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(<strong key={m.index} className="font-semibold text-inherit">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(<em key={m.index} className="italic text-inherit">{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={m.index}
          className={`px-1.5 py-0.5 rounded text-xs font-mono font-medium ${
            isDark ? "bg-neutral-800 text-neutral-200 border border-neutral-700/60" : "bg-neutral-100 text-neutral-800 border border-neutral-200"
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        nodes.push(
          <a
            key={m.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline inline-flex items-center gap-0.5"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }
    lastIdx = m.index + token.length;
  }
  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }
  return nodes.length > 0 ? nodes : [text];
}

function FormattedTextBlock({ text, isDark }: { text: string; isDark: boolean }) {
  const rawLines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Check for markdown table: line starts and ends with |
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|")) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith("|") && rawLines[i].trim().endsWith("|")) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0].split("|").slice(1, -1).map((c) => c.trim());
        // Skip separator row if it contains only dashes/colons
        const dataStartIndex = tableLines[1].replace(/[-:| ]/g, "").length === 0 ? 2 : 1;
        const dataRows = tableLines.slice(dataStartIndex).map((row) =>
          row.split("|").slice(1, -1).map((c) => c.trim())
        );

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-xl border border-black/[0.08] dark:border-neutral-800">
            <table className="min-w-full divide-y divide-black/[0.08] dark:divide-neutral-800 text-left text-xs sm:text-sm">
              <thead className={isDark ? "bg-neutral-900/80" : "bg-neutral-100/80"}>
                <tr>
                  {headerRow.map((h, hIdx) => (
                    <th key={hIdx} className="px-3.5 py-2.5 font-semibold text-neutral-700 dark:text-neutral-200">
                      {parseInlineMarkdown(h, isDark)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y divide-black/[0.05] dark:divide-neutral-800/60 ${isDark ? "bg-neutral-950/40" : "bg-white"}`}>
                {dataRows.map((r, rIdx) => (
                  <tr key={rIdx} className={isDark ? "hover:bg-neutral-900/50" : "hover:bg-neutral-50"}>
                    {r.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2 text-neutral-600 dark:text-neutral-300">
                        {parseInlineMarkdown(cell, isDark)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-inherit mt-3 mb-1">
          {parseInlineMarkdown(trimmed.replace(/^### /, ""), isDark)}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold text-inherit mt-4 mb-2">
          {parseInlineMarkdown(trimmed.replace(/^## /, ""), isDark)}
        </h2>
      );
    } else if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl font-extrabold text-inherit mt-4 mb-2">
          {parseInlineMarkdown(trimmed.replace(/^# /, ""), isDark)}
        </h1>
      );
    } else if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className={`border-l-4 pl-3.5 py-1 my-2 italic ${
            isDark ? "border-neutral-700 text-neutral-400" : "border-neutral-300 text-neutral-600"
          }`}
        >
          {parseInlineMarkdown(trimmed.replace(/^>\s*/, ""), isDark)}
        </blockquote>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 pl-2 my-0.5">
          <span className="text-inherit opacity-60">•</span>
          <span className="leading-relaxed">{parseInlineMarkdown(trimmed.replace(/^[-*]\s+/, ""), isDark)}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.)\s*(.*)$/);
      elements.push(
        <div key={`oli-${i}`} className="flex items-start gap-2 pl-2 my-0.5">
          <span className="font-semibold text-inherit opacity-75 shrink-0">{match?.[1]}</span>
          <span className="leading-relaxed">{parseInlineMarkdown(match?.[2] || "", isDark)}</span>
        </div>
      );
    } else if (!trimmed) {
      elements.push(<div key={`empty-${i}`} className="h-1.5" />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="leading-relaxed">
          {parseInlineMarkdown(line, isDark)}
        </p>
      );
    }

    i++;
  }

  return <div className="space-y-1.5">{elements}</div>;
}

/**
 * Minimalist Markdown Renderer with Clean Code Blocks (NO EMOJIS IN CODE), Copy & Universal File Download
 */
function MarkdownView({ content, isDark }: { content: string; isDark: boolean }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function copyCode(code: string, index: number) {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  // Matches ```ext:filename or ```ext or ```filename.ext
  const codeBlockRegex = /```([a-zA-Z0-9_.:-]*)\n([\s\S]*?)```/g;
  const parts: Array<{ type: "code" | "text"; lang?: string; filename?: string; code?: string; text?: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }
    const rawTag = (match[1] || "").trim();
    let lang = rawTag;
    let filename = "";
    if (rawTag.includes(":")) {
      const [l, f] = rawTag.split(":");
      lang = l.trim();
      filename = f.trim();
    } else if (rawTag.includes(".")) {
      filename = rawTag;
      lang = rawTag.split(".").pop() || "txt";
    }

    const cleanCode = (match[2] || "").trimEnd();
    parts.push({ type: "code", lang: lang || "file", filename, code: cleanCode });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }

  return (
    <div className="space-y-3 leading-relaxed text-[15px]">
      {parts.map((part, idx) => {
        if (part.type === "code" && part.code) {
          const isCopied = copiedIndex === idx;
          const displayLang = part.filename || part.lang || "file";
          return (
            <div
              key={idx}
              className={`my-3 overflow-hidden rounded-xl border shadow-sm ${
                isDark ? "border-neutral-800 bg-neutral-950 text-neutral-100" : "border-neutral-300 bg-neutral-950 text-neutral-100"
              }`}
            >
              <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-4 py-2 text-xs text-neutral-400">
                <span className="font-mono uppercase tracking-wider text-[11px] font-semibold">{displayLang}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadGeneratedFile(part.code!, part.lang, part.filename)}
                    className="flex items-center gap-1.5 rounded border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[11px] font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white"
                    title={`Download ${part.filename || `${part.lang} file`}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download {part.filename || `${(part.lang || "file").toUpperCase()}`}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyCode(part.code!, idx)}
                    className="flex items-center gap-1.5 rounded border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[11px] font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? "Copied" : "Copy code"}</span>
                  </button>
                </div>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-neutral-200">
                <code>{part.code}</code>
              </pre>
            </div>
          );
        }

        return <FormattedTextBlock key={idx} text={part.text || ""} isDark={isDark} />;
      })}
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();

  // Dark & Light Theme State
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isDark = theme === "dark";

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userEmail, setUserEmail] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tattva_user_session_email") || "";
    }
    return "";
  });
  const [guestChatCount, setGuestChatCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const email = localStorage.getItem("tattva_user_session_email");
      if (email) return 0;
      return parseInt(localStorage.getItem("tattva_guest_count") || "0", 10);
    }
    return 0;
  });
  const [authReady, setAuthReady] = useState(false);

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Voice Assistant: "Sare" states
  const [sareEnabled, setSareEnabled] = useState(false);
  const [sareStatus, setSareStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [isInfoBubbleOpen, setIsInfoBubbleOpen] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Long press menu state for images
  const [imageMenuOpen, setImageMenuOpen] = useState<{ image: string; x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active messages count ref to prevent auth hydration from wiping ongoing chats
  const messagesCountRef = useRef<number>(0);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<unknown>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const voiceBufferRef = useRef<string>("");
  const initialLoadDone = useRef(false);

  // Advanced AI Chat Composer State
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<"none" | "web" | "image" | "research" | "file" | "code">("none");
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState("");

  // User Profile & Logout System (ChatGPT-Style)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isManageAccountModalOpen, setIsManageAccountModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Self-Personalizing Memory & Feedback System (ChatGPT-Style)
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [memoryTab, setMemoryTab] = useState<"memories" | "preferences" | "analytics" | "privacy">("memories");
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [personalizationSettings, setPersonalizationSettings] = useState<PersonalizationSettings>(DEFAULT_PERSONALIZATION_SETTINGS);
  const [feedbackSummary, setFeedbackSummary] = useState<{ total: number; positive: number; negative: number; positivePercentage: number; categoriesCount: Record<string, number> } | null>(null);
  const [selectedMemoryCategory, setSelectedMemoryCategory] = useState<string>("all");
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [newMemoryCategory, setNewMemoryCategory] = useState<MemoryCategory>("preference");
  const [newMemoryImportance, setNewMemoryImportance] = useState(7);
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editMemoryContent, setEditMemoryContent] = useState("");

  // Per-Message Feedback modal state
  const [feedbackModalTarget, setFeedbackModalTarget] = useState<{ messageId: string; initialRating?: "positive" | "negative" } | null>(null);
  const [selectedFeedbackCategory, setSelectedFeedbackCategory] = useState<FeedbackCategory>("helpful");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Global Search state (ChatGPT-style)
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      session: ChatSession;
      matchType: "title" | "user" | "assistant";
      matchedSnippet: string;
      messageId?: string;
      timestamp: number;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Message Editing state (ChatGPT-style)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Smart Auto-Scroll & Scroll-to-bottom button
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isNearBottomRef = useRef(true);

  // Delete Conversation Confirmation Modal
  const [deleteConfirmSession, setDeleteConfirmSession] = useState<ChatSession | null>(null);

  // URL-based Share Modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Archive & Image Library Modal state
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(false);
  const [speechState, setSpeechState] = useState<"idle" | "speaking" | "paused">("idle");

  // Contextual dropdown menu & rename state
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");

  // User Custom Model API Keys (BYOK: Gemini, DashScope Qwen-Image, Hugging Face, Stability, OpenAI, Replicate)
  const [userApiKeys, setUserApiKeys] = useState<{
    gemini: string;
    dashscope: string;
    huggingface: string;
    stability: string;
    openai: string;
    replicate: string;
  }>({
    gemini: "",
    dashscope: "",
    huggingface: "",
    stability: "",
    openai: "",
    replicate: "",
  });

  // Load custom API keys from localStorage on mount
  useEffect(() => {
    try {
      const savedKeys = localStorage.getItem("tattva_user_api_keys");
      if (savedKeys) {
        const parsed = JSON.parse(savedKeys);
        setUserApiKeys({
          gemini: parsed.gemini || "",
          dashscope: parsed.dashscope || "",
          huggingface: parsed.huggingface || "",
          stability: parsed.stability || "",
          openai: parsed.openai || "",
          replicate: parsed.replicate || "",
        });
      }
    } catch {}
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K for global search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setSearchModalOpen(false);
        setActiveMenuSessionId(null);
        setRenamingSessionId(null);
        setIsAttachmentMenuOpen(false);
        setIsToolsMenuOpen(false);
        setIsProfileMenuOpen(false);
        setIsProfileModalOpen(false);
        setIsSettingsModalOpen(false);
        setIsHelpModalOpen(false);
        setIsManageAccountModalOpen(false);
        setIsMemoryModalOpen(false);
        setFeedbackModalTarget(null);
        setIsInfoBubbleOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close menus when clicking or tapping outside
  useEffect(() => {
    function handleClickOutside(e: Event) {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") return;

      if (!target.closest("[data-attachment-menu]")) {
        setIsAttachmentMenuOpen(false);
      }
      if (!target.closest("[data-tools-menu]")) {
        setIsToolsMenuOpen(false);
      }
      if (!target.closest("[data-profile-menu]")) {
        setIsProfileMenuOpen(false);
      }
      if (!target.closest("[data-branding-bubble]")) {
        setIsInfoBubbleOpen(false);
      }
      if (!target.closest("[data-session-menu]") && !target.closest("[data-session-action]")) {
        setActiveMenuSessionId(null);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // 300ms Debounced Global Search across all conversation titles, user messages, and AI responses
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      const q = searchQuery.toLowerCase().trim();
      const results: Array<{
        session: ChatSession;
        matchType: "title" | "user" | "assistant";
        matchedSnippet: string;
        messageId?: string;
        timestamp: number;
      }> = [];

      sessions.forEach((s) => {
        // 1. Search in Title
        if (s.title && s.title.toLowerCase().includes(q)) {
          results.push({
            session: s,
            matchType: "title",
            matchedSnippet: s.title,
            timestamp: s.updatedAt,
          });
        }

        // 2. Search in all messages
        (s.messages || []).forEach((m) => {
          if (m.content && m.content.toLowerCase().includes(q)) {
            const idx = m.content.toLowerCase().indexOf(q);
            const start = Math.max(0, idx - 45);
            const end = Math.min(m.content.length, idx + q.length + 45);
            const snippet =
              (start > 0 ? "..." : "") +
              m.content.slice(start, end) +
              (end < m.content.length ? "..." : "");

            results.push({
              session: s,
              matchType: m.role === "user" ? "user" : "assistant",
              matchedSnippet: snippet,
              messageId: m.id,
              timestamp: m.timestamp || s.updatedAt,
            });
          }
        });
      });

      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, sessions]);

  // Toggle Pin/Unpin chat
  function togglePinSession(sessionId: string, e?: React.MouseEvent) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setActiveMenuSessionId(null);

    let nextIsPinned = false;
    let nextUpdatedList: ChatSession[] = [];

    setSessions((prev) => {
      const target = prev.find((s) => s.id === sessionId);
      const isNowPinned = !target?.is_pinned;
      nextIsPinned = isNowPinned;
      const updated = prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              is_pinned: isNowPinned,
              pinned_at: isNowPinned ? Date.now() : undefined,
              updatedAt: Date.now(),
            }
          : s
      );

      // Re-sort: Pinned first (by pinned_at descending), then Recent by updatedAt
      updated.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        if (a.is_pinned && b.is_pinned) return (b.pinned_at || 0) - (a.pinned_at || 0);
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });

      nextUpdatedList = updated;
      return updated;
    });

    const key = getStorageKey(userEmail);
    try {
      localStorage.setItem(key, JSON.stringify(nextUpdatedList));
    } catch {
      // ignore
    }

    // Sync to cloud vault API
    fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail || "guest_user", sessions: nextUpdatedList }),
    }).catch(() => {});

    // Sync to Supabase if authenticated
    try {
      const supabase = createClient();
      supabase
        .from("conversations")
        .update({
          is_pinned: nextIsPinned,
          pinned_at: nextIsPinned ? new Date().toISOString() : null,
        })
        .eq("id", sessionId)
        .then();
    } catch {
      // ignore
    }

    showToast(nextIsPinned ? "Conversation pinned 📌" : "Conversation unpinned");
  }

  // Rename chat
  function startRenameSession(s: ChatSession, e?: React.MouseEvent) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setActiveMenuSessionId(null);
    setRenamingSessionId(s.id);
    setRenameInput(s.title || "New Conversation");
  }

  function submitRenameSession(sessionId: string, e?: React.FormEvent) {
    if (e) e.preventDefault();
    const newTitle = renameInput.trim();
    if (!newTitle) {
      setRenamingSessionId(null);
      return;
    }

    let nextUpdatedList: ChatSession[] = [];
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId ? { ...s, title: newTitle, updatedAt: Date.now() } : s
      );
      nextUpdatedList = updated;
      return updated;
    });
    setRenamingSessionId(null);

    const key = getStorageKey(userEmail);
    try {
      localStorage.setItem(key, JSON.stringify(nextUpdatedList));
    } catch {
      // ignore
    }

    // Sync to cloud vault API
    fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail || "guest_user", sessions: nextUpdatedList }),
    }).catch(() => {});

    // Sync to Supabase
    try {
      const supabase = createClient();
      supabase.from("conversations").update({ title: newTitle }).eq("id", sessionId).then();
    } catch {}

    showToast("Conversation renamed ✏️");
  }

  // Select Search Result and navigate to message
  function selectSearchResult(result: { session: ChatSession; messageId?: string }) {
    selectSession(result.session);
    setSearchModalOpen(false);
    if (result.messageId) {
      setHighlightedMessageId(result.messageId);
      setTimeout(() => {
        const el = document.getElementById(`msg-${result.messageId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 200);
      setTimeout(() => setHighlightedMessageId(null), 3000);
    }
  }

  // Show auto-dismissing toast
  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2500);
  }

  // Toggle Theme
  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("tattva_theme", nextTheme);
    if (typeof document !== "undefined") {
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }

  // Load chat sessions for a specific user email
  const loadUserSessions = useCallback(async (email?: string | null) => {
    setSessionsLoading(true);
    const key = getStorageKey(email);
    let loadedSessions: ChatSession[] = [];

    // 1. Instant local load
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Keep only non-empty chats in history
          loadedSessions = parsed.filter((s: ChatSession) => s.messages && s.messages.length > 0);
        }
      }
    } catch {
      // ignore
    }

    // 2. Fetch from secure cloud vault
    try {
      const res = await fetch(`/api/chats?email=${encodeURIComponent(email || "guest_user")}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sessions) && data.sessions.length > 0) {
          const cloudSessions = data.sessions.filter((s: ChatSession) => s.messages && s.messages.length > 0);
          const map = new Map<string, ChatSession>();
          loadedSessions.forEach((s) => map.set(s.id, s));
          cloudSessions.forEach((s: ChatSession) => {
            const existing = map.get(s.id);
            if (!existing || (s.updatedAt || 0) >= (existing.updatedAt || 0)) {
              map.set(s.id, s);
            }
          });
          loadedSessions = Array.from(map.values());
          try {
            localStorage.setItem(key, JSON.stringify(loadedSessions));
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.warn("Cloud sessions load error:", err);
    }

    // 3. Sort: Pinned first (by pinned_at descending), then Recent by updatedAt descending
    loadedSessions.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      if (a.is_pinned && b.is_pinned) return (b.pinned_at || 0) - (a.pinned_at || 0);
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    setSessions(loadedSessions);
    setSessionsLoading(false);

    // 4. Always start with a clean, empty New Chat interface without cluttering database/sidebar
    setCurrentSessionId("");
    setMessages([]);
    messagesCountRef.current = 0;
    setAttachments([]);
    setInput("");
    setError("");
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Save current active session
  const saveCurrentSession = useCallback((updatedMsgs: ChatMessage[], explicitSessionId?: string) => {
    if (!updatedMsgs || updatedMsgs.length === 0) return;

    setSessions((prev) => {
      const activeId = explicitSessionId || currentSessionId || crypto.randomUUID();
      if (!currentSessionId) {
        setCurrentSessionId(activeId);
      }

      const existing = prev.find((s) => s.id === activeId);
      const title =
        existing && existing.title !== "New Conversation"
          ? existing.title
          : updatedMsgs[0]?.content.slice(0, 36).trim() || "New Conversation";

      let updated: ChatSession[];
      if (existing) {
        updated = prev.map((s) =>
          s.id === activeId
            ? { ...s, messages: updatedMsgs, title, updatedAt: Date.now() }
            : s
        );
      } else {
        const fresh: ChatSession = {
          id: activeId,
          title,
          userEmail: userEmail || undefined,
          messages: updatedMsgs,
          updatedAt: Date.now(),
          is_pinned: false,
        };
        updated = [fresh, ...prev];
      }

      const key = getStorageKey(userEmail);
      try {
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {
        // quota exceeded fallback
      }

      // Sync to cloud vault
      fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail || "guest_user", sessions: updated }),
      }).catch(() => {});

      return updated;
    });
  }, [currentSessionId, userEmail]);

  // Create a brand new chat session (Clean reset without polluting history)
  function createNewChat() {
    if (speakingMessageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    setCurrentSessionId("");
    setMessages([]);
    messagesCountRef.current = 0;
    setAttachments([]);
    setInput("");
    setError("");
    showToast("Started fresh chat session ✦");
  }

  // Switch to another conversation
  function selectSession(session: ChatSession) {
    if (speakingMessageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    setCurrentSessionId(session.id);
    setMessages(session.messages || []);
    messagesCountRef.current = (session.messages || []).length;
    setAttachments([]);
    setInput("");
    setError("");
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }

  // Actual execution of session deletion
  function performDeleteSession(sessionId: string) {
    let nextUpdatedList: ChatSession[] = [];
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      nextUpdatedList = updated;
      return updated;
    });

    const key = getStorageKey(userEmail);
    try {
      localStorage.setItem(key, JSON.stringify(nextUpdatedList));
    } catch {
      // ignore
    }

    // Sync to cloud vault
    fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail || "guest_user", sessions: nextUpdatedList }),
    }).catch(() => {});

    // Sync deletion to Supabase
    try {
      const supabase = createClient();
      supabase.from("conversations").delete().eq("id", sessionId).then();
    } catch {
      // ignore
    }

    if (sessionId === currentSessionId) {
      createNewChat();
    }
    showToast("Chat deleted");
  }

  // Delete a session with confirmation support
  function deleteSession(sessionId: string, e?: React.MouseEvent) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setActiveMenuSessionId(null);
    const target = sessions.find((s) => s.id === sessionId);
    if (target) {
      setDeleteConfirmSession(target);
    } else {
      performDeleteSession(sessionId);
    }
  }

  // Archive a conversation
  function archiveSession(sessionId: string, e?: React.MouseEvent) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setActiveMenuSessionId(null);
    let nextUpdatedList: ChatSession[] = [];
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId ? { ...s, is_archived: true, archived_at: Date.now() } : s
      );
      nextUpdatedList = updated;
      return updated;
    });

    const key = getStorageKey(userEmail);
    try {
      localStorage.setItem(key, JSON.stringify(nextUpdatedList));
    } catch {}

    fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail || "guest_user", sessions: nextUpdatedList }),
    }).catch(() => {});

    try {
      const supabase = createClient();
      supabase.from("conversations").update({ is_archived: true }).eq("id", sessionId).then();
    } catch {}

    if (sessionId === currentSessionId) {
      createNewChat();
    }
    showToast("Conversation archived 📁");
  }

  // Restore archived conversation
  function restoreSession(sessionId: string) {
    let nextUpdatedList: ChatSession[] = [];
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId ? { ...s, is_archived: false, archived_at: undefined } : s
      );
      nextUpdatedList = updated;
      return updated;
    });

    const key = getStorageKey(userEmail);
    try {
      localStorage.setItem(key, JSON.stringify(nextUpdatedList));
    } catch {}

    fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail || "guest_user", sessions: nextUpdatedList }),
    }).catch(() => {});

    try {
      const supabase = createClient();
      supabase.from("conversations").update({ is_archived: false }).eq("id", sessionId).then();
    } catch {}

    showToast("Conversation restored ✦");
  }

  // Export all conversations to a downloadable JSON file
  function exportChatData() {
    const exportData = {
      app: "TATTVA AI",
      exportedAt: new Date().toISOString(),
      user: userEmail || "guest_user",
      conversationsCount: sessions.length,
      conversations: sessions,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tattva_ai_conversations_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Conversations exported as JSON 📥");
  }

  // Share chat session with unique URL & Public Share Modal
  async function shareChat(session?: ChatSession) {
    const baseTarget = session || sessions.find((s) => s.id === currentSessionId);
    if (!baseTarget) {
      showToast("Cannot share empty conversation.");
      return;
    }

    const targetSession: ChatSession = {
      ...baseTarget,
      messages:
        baseTarget.messages && baseTarget.messages.length > 0
          ? baseTarget.messages
          : baseTarget.id === currentSessionId && messages.length > 0
          ? messages
          : [],
    };

    if (!targetSession.messages.length) {
      showToast("Cannot share empty conversation.");
      return;
    }

    setIsSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: targetSession }),
      });

      if (res.ok) {
        const data = await res.json();
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setShareUrl(`${origin}${data.url}`);
        setShareCopied(false);
        setShareModalOpen(true);
        return;
      }
    } catch {
      // fallback if share endpoint fails
    } finally {
      setIsSharing(false);
    }

    // Fallback: transcript to clipboard
    const transcript = targetSession.messages
      .map((m) => `${m.role === "user" ? "User" : "TATTVA AI"}:\n${m.content}\n`)
      .join("\n---\n\n");
    const fullShareText = `TATTVA AI Chat — "${targetSession.title}"\nCreated by kotapati Gowtham Chowdary\n\n${transcript}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(fullShareText);
      showToast("Chat transcript copied to clipboard! 📋");
    }
  }

  // Single mount effect: Theme, Supabase auth check, recovery redirect, guest count
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    // Load saved theme
    const savedTheme = localStorage.getItem("tattva_theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
      if (typeof document !== "undefined") {
        if (savedTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    } else if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark");
    }

    // Check active local user session
    const cachedEmail = localStorage.getItem("tattva_user_session_email");
    if (cachedEmail) {
      setUserEmail(cachedEmail);
      resetGuestCount();
      setGuestChatCount(0);
      loadUserSessions(cachedEmail);
    } else {
      const count = parseInt(localStorage.getItem("tattva_guest_count") || "0", 10);
      setGuestChatCount(count);
      loadUserSessions(null);
    }

    // Supabase auth check
    try {
      const supabase = createClient();

      // Check if user arrived via recovery link
      if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
        router.replace("/reset-password");
        return;
      }

      supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
        if (data.session?.user) {
          setCurrentUser(data.session.user);
          const email = data.session.user.email || "";
          setUserEmail(email);
          localStorage.setItem("tattva_user_session_email", email);
          if (!cachedEmail || cachedEmail !== email) {
            loadUserSessions(email);
          }
        } else if (cachedEmail) {
          resetGuestCount();
          setGuestChatCount(0);
        }
        setAuthReady(true);
      }).catch(() => {
        setAuthReady(true);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((event: string, session: any) => {
        if (event === "PASSWORD_RECOVERY") {
          router.replace("/reset-password");
          return;
        }
        if (event === "SIGNED_IN" && session?.user) {
          setCurrentUser(session.user);
          const email = session.user.email || "";
          setUserEmail(email);
          localStorage.setItem("tattva_user_session_email", email);
          resetGuestCount();
          setGuestChatCount(0);
        }
        if (event === "SIGNED_OUT") {
          setCurrentUser(null);
          setUserEmail("");
          resetGuestCount();
          setGuestChatCount(0);
          localStorage.removeItem("tattva_user_session_email");
          localStorage.removeItem("supabase.auth.token");
          loadUserSessions(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    } catch {
      setAuthReady(true);
      loadUserSessions(null);
    }
  }, [loadUserSessions, router]);

  // 1. Trigger Logout Confirmation Modal (ChatGPT-Style)
  function handleLogout() {
    setIsProfileMenuOpen(false);
    setIsProfileModalOpen(false);
    setIsManageAccountModalOpen(false);
    setIsLogoutConfirmOpen(true);
  }

  // 2. Execute Secure Logout upon Confirmation
  async function handleConfirmLogout() {
    try {
      setIsLogoutConfirmOpen(false);
      await logoutUser();
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => {});
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      // 1. Clear application-level authentication state
      setCurrentUser(null);
      setUserEmail("");
      resetGuestCount();
      setGuestChatCount(0);

      // 2. Clear user-specific cached session keys
      if (typeof window !== "undefined") {
        localStorage.removeItem("tattva_user_session_email");
        localStorage.removeItem("tattva_user_session_name");
        localStorage.removeItem("tattva_remember_device");
        localStorage.removeItem("supabase.auth.token");
      }

      // 3. Reset in-memory sessions
      loadUserSessions(null);

      // 4. Show toast notification & Redirect to login page
      showToast("Signed out successfully ✦");
      router.push("/login?logged_out=true");
    }
  }

  // =========================================================================
  // SELF-PERSONALIZING MEMORY & FEEDBACK ENGINE HANDLERS
  // =========================================================================
  const loadUserMemoryData = useCallback(async (email?: string | null) => {
    try {
      const res = await fetch(`/api/memory?email=${encodeURIComponent(email || "guest_user")}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.memories)) setMemories(data.memories);
        if (data.settings) setPersonalizationSettings(data.settings);
        if (data.feedbackSummary) setFeedbackSummary(data.feedbackSummary);
      }
    } catch (e) {
      console.warn("Could not load user memory profile:", e);
    }
  }, []);

  // Sync memories whenever user email changes
  useEffect(() => {
    loadUserMemoryData(userEmail);
  }, [userEmail, loadUserMemoryData]);

  async function handleSaveNewMemory() {
    if (!newMemoryContent.trim()) {
      showToast("Memory content cannot be empty.");
      return;
    }
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail || "guest_user",
          content: newMemoryContent.trim(),
          category: newMemoryCategory,
          importance: newMemoryImportance,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.memory) {
          setMemories((prev) => [data.memory, ...prev.filter((m) => m.id !== data.memory.id)]);
          setNewMemoryContent("");
          setIsAddingMemory(false);
          showToast("New memory preserved in long-term memory 🧠");
        }
      }
    } catch {
      showToast("Failed to save memory.");
    }
  }

  async function handleUpdateMemory(memoryId: string, updates: Partial<MemoryItem>) {
    try {
      const res = await fetch("/api/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail || "guest_user",
          id: memoryId,
          updates,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.memory) {
          setMemories((prev) => prev.map((m) => (m.id === memoryId ? data.memory : m)));
          setEditingMemoryId(null);
          showToast("Memory updated ✏️");
        }
      }
    } catch {
      showToast("Failed to update memory.");
    }
  }

  async function handleDeleteMemory(memoryId: string) {
    try {
      const res = await fetch(`/api/memory?email=${encodeURIComponent(userEmail || "guest_user")}&id=${encodeURIComponent(memoryId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
        showToast("Memory forgotten 🗑️");
      }
    } catch {
      showToast("Failed to delete memory.");
    }
  }

  async function handleClearAllMemories() {
    if (!confirm("Are you sure you want to clear all stored memories? TATTVA will forget all saved preferences and project context.")) {
      return;
    }
    try {
      const res = await fetch(`/api/memory?email=${encodeURIComponent(userEmail || "guest_user")}&all=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMemories([]);
        showToast("All memories cleared 🧹");
      }
    } catch {
      showToast("Failed to clear memories.");
    }
  }

  async function handleUpdatePersonalizationSettings(updates: Partial<PersonalizationSettings>) {
    const nextSettings = { ...personalizationSettings, ...updates };
    setPersonalizationSettings(nextSettings);
    try {
      await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail || "guest_user",
          action: "update_settings",
          settings: nextSettings,
        }),
      });
      showToast("Personalization preferences updated ✨");
    } catch {
      // ignore
    }
  }

  async function handleQuickFeedback(messageId: string, rating: "positive" | "negative") {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          sessionId: currentSessionId,
          userEmail: userEmail || "guest_user",
          rating,
          category: rating === "positive" ? "helpful" : "not_helpful",
        }),
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, userFeedback: { rating, category: rating === "positive" ? "helpful" : "not_helpful" } }
            : m
        )
      );
      showToast(rating === "positive" ? "Thanks for your feedback! 👍" : "Feedback noted. Tell us how to improve 💡");
      if (rating === "negative") {
        setFeedbackModalTarget({ messageId, initialRating: "negative" });
        setSelectedFeedbackCategory("not_helpful");
        setFeedbackComment("");
      }
    } catch {
      showToast("Could not record feedback.");
    }
  }

  function openFeedbackModal(messageId: string, initialRating: "positive" | "negative" = "negative") {
    setFeedbackModalTarget({ messageId, initialRating });
    setSelectedFeedbackCategory(initialRating === "positive" ? "helpful" : "not_helpful");
    setFeedbackComment("");
  }

  async function handleSubmitFeedback() {
    if (!feedbackModalTarget) return;
    setIsSubmittingFeedback(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: feedbackModalTarget.messageId,
          sessionId: currentSessionId,
          userEmail: userEmail || "guest_user",
          rating: feedbackModalTarget.initialRating || "negative",
          category: selectedFeedbackCategory,
          comment: feedbackComment.trim() || undefined,
        }),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === feedbackModalTarget.messageId
            ? {
                ...m,
                userFeedback: {
                  rating: feedbackModalTarget.initialRating || "negative",
                  category: selectedFeedbackCategory,
                  comment: feedbackComment.trim(),
                },
              }
            : m
        )
      );

      if (selectedFeedbackCategory === "too_detailed") {
        setPersonalizationSettings((prev) => ({ ...prev, responseLength: "concise" }));
        showToast("Feedback recorded! TATTVA adapted: more concise responses prioritized 🧠");
      } else if (selectedFeedbackCategory === "too_short") {
        setPersonalizationSettings((prev) => ({ ...prev, responseLength: "detailed" }));
        showToast("Feedback recorded! TATTVA adapted: detailed responses prioritized 🧠");
      } else {
        showToast("Feedback submitted! TATTVA has adapted your preferences 🧠");
      }

      setFeedbackModalTarget(null);
    } catch {
      showToast("Failed to submit feedback.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  // Polling for local image engine status every 30s
  useEffect(() => {
    let mounted = true;
    async function checkEngine() {
      try {
        const res = await fetch("/api/generate-image", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) {
          setEngineStatus((prev) => {
            if (
              prev?.localOnline === data.localOnline &&
              prev?.current_model === data.current_model &&
              prev?.engine === data.engine
            ) {
              return prev;
            }
            return data;
          });
        }
      } catch {
        // ignore
      }
    }
    checkEngine();
    const interval = setInterval(checkEngine, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Smart scroll detection
  const handleChatScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distFromBottom < 180;
    isNearBottomRef.current = nearBottom;
    setShowScrollBtn(!nearBottom);
  }, []);

  // Smart Auto-scroll to bottom of chat: only when user is near the bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, statusMessage]);

  // Language detection helper for native fluency in Telugu, Southern languages, Hindi, and English
  function detectLanguage(text: string): { lang: string; name: string } {
    // Telugu script: \u0C00 - \u0C7F
    if (/[\u0C00-\u0C7F]/.test(text)) {
      return { lang: "te-IN", name: "Telugu" };
    }
    // Tamil script: \u0B80 - \u0BFF
    if (/[\u0B80-\u0BFF]/.test(text)) {
      return { lang: "ta-IN", name: "Tamil" };
    }
    // Kannada script: \u0C80 - \u0CFF
    if (/[\u0C80-\u0CFF]/.test(text)) {
      return { lang: "kn-IN", name: "Kannada" };
    }
    // Malayalam script: \u0D00 - \u0D7F
    if (/[\u0D00-\u0D7F]/.test(text)) {
      return { lang: "ml-IN", name: "Malayalam" };
    }
    // Hindi / Devanagari: \u0900 - \u097F
    if (/[\u0900-\u097F]/.test(text)) {
      return { lang: "hi-IN", name: "Hindi" };
    }
    return { lang: "en-IN", name: "English" };
  }

  // Select a natural, fluent female voice strictly excluding male voices across all OS and browsers
  function selectFemaleVoice(langCode: string): SpeechSynthesisVoice | null {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    // Names and tokens to strictly reject to prevent any robotic male voice
    const maleKeywords = [
      "david", "george", "mark", "richard", "james", "john", "ravi", "madhav",
      "male", "guy", "man", "sean", "stefan", "paul", "microsoft david", "microsoft mark",
      "microsoft george", "microsoft ravi", "microsoft stefan", "microsoft james",
      "microsoft richard", "heera - male"
    ];

    // Priority fluent female voice models (Edge Natural, Chrome, Siri, WebSpeech)
    const femaleKeywords = [
      "jenny", "aria", "zira", "neerja", "swara", "heera", "chitra", "shruti",
      "priya", "samantha", "victoria", "karen", "eva", "moira", "fiona", "tessa",
      "veena", "pallavi", "geeta", "vani", "ananya", "female", "woman",
      "google uk english female", "google us english", "natural"
    ];

    const isMale = (name: string) => {
      const lower = name.toLowerCase();
      return maleKeywords.some((kw) => lower.includes(kw));
    };

    const isFemale = (name: string) => {
      const lower = name.toLowerCase();
      return femaleKeywords.some((kw) => lower.includes(kw));
    };

    // Filter out male voices completely
    const nonMaleVoices = voices.filter((v) => !isMale(v.name));

    const prefix = langCode.slice(0, 2).toLowerCase();
    const langNonMale = nonMaleVoices.filter((v) => v.lang.toLowerCase().startsWith(prefix));

    // 1. Language-matching verified female voice
    const exactFemale = langNonMale.find((v) => isFemale(v.name));
    if (exactFemale) return exactFemale;

    // 2. Any language-matching non-male voice
    if (langNonMale.length > 0) return langNonMale[0];

    // 3. Indian / English verified female voice
    const verifiedFemale = nonMaleVoices.find((v) => isFemale(v.name));
    if (verifiedFemale) return verifiedFemale;

    // 4. Any remaining non-male voice
    if (nonMaleVoices.length > 0) return nonMaleVoices[0];

    // 5. Ultimate fallback if system only has 1 voice
    return voices[0] || null;
  }

  // Voice Assistant: Text-to-Speech synthesis with FEMALE VOICE and TELUGU / REGIONAL FLUENCY
  const speakText = useCallback((text: string, msgId: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported on this browser.");
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      setSareStatus("idle");
      return;
    }

    window.speechSynthesis.cancel();

    // Clean narration: strip code blocks, markdown links, asterisks, bullet points
    const cleanSpokenText = text
      .replace(/```[\s\S]*?```/g, "Code block provided in chat.")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/#{1,6}\s+/g, "")
      .replace(/[-*]\s+/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    if (!cleanSpokenText) return;

    const utterance = new SpeechSynthesisUtterance(cleanSpokenText);
    const { lang: detectedLang } = detectLanguage(cleanSpokenText);
    utterance.lang = detectedLang;

    // Explicit female voice selection
    const femaleVoice = selectFemaleVoice(detectedLang);
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.pitch = 1.15; // Natural pleasant female voice pitch
    utterance.rate = 1.0;

    utterance.onstart = () => {
      setSpeakingMessageId(msgId);
      setSareStatus("speaking");
    };

    utterance.onend = () => {
      setSpeakingMessageId(null);
      setSareStatus("idle");
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
      setSareStatus("idle");
    };

    window.speechSynthesis.speak(utterance);
  }, [speakingMessageId]);

  // Voice Recognition with 2-SECOND SILENCE AUTO-RESPONSE for Sare
  const startVoiceRecognition = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        (recognitionRef.current as { stop: () => void }).stop();
      } catch {
        // ignore
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsListening(false);
      setSareStatus("idle");
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognition as any)();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interimText = "";
        let finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        setInterimSpeech(interimText.trim());

        const clean = finalChunk.trim();
        if (clean) {
          voiceBufferRef.current = voiceBufferRef.current
            ? `${voiceBufferRef.current} ${clean}`
            : clean;

          const accumulated = voiceBufferRef.current.trim();
          setInput(accumulated);
          setInterimSpeech("");

          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
          }

          // In Sare Voice Conversation, if user stops speaking after 2 seconds,
          // Sare automatically responds quickly!
          if (sareEnabled) {
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
            }
            silenceTimerRef.current = setTimeout(() => {
              const textToSend = voiceBufferRef.current.trim();
              if (textToSend) {
                stopVoiceRecognition();
                setSareStatus("thinking");
                voiceBufferRef.current = "";
                sendMessage(textToSend);
              }
            }, 2000); // 2 seconds of silence
          }
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setInterimSpeech("");
        setSareStatus("idle");
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimSpeech("");
        if (sareStatus === "listening") {
          setSareStatus("idle");
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setSareStatus("listening");
    } catch {
      setIsListening(false);
      setSareStatus("idle");
    }
  }, [isListening, sareEnabled, sareStatus]);

  function stopVoiceRecognition() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        (recognitionRef.current as { stop: () => void }).stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setSareStatus("idle");
  }

  // Toggle Sare Voice Assistant
  function toggleSareVoiceMode() {
    if (sareEnabled) {
      setSareEnabled(false);
      stopVoiceRecognition();
      voiceBufferRef.current = "";
      if (speakingMessageId) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
      setSareStatus("idle");
      showToast("Sare Voice Assistant paused");
    } else {
      setSareEnabled(true);
      voiceBufferRef.current = "";
      showToast("Sare Voice Assistant activated ✦ Female voice & 2s auto-response ready!");
      startVoiceRecognition();
    }
  }

  // Auto-detect image generation request in prompt (inbuilt into text bar)
  function isImageGenerationPrompt(text: string, hasImgAttachment: boolean): boolean {
    if (hasImgAttachment) return true;
    const lower = text.toLowerCase().trim();
    return (
      lower.startsWith("generate image") ||
      lower.startsWith("generate an image") ||
      lower.startsWith("create image") ||
      lower.startsWith("create an image") ||
      lower.startsWith("draw ") ||
      lower.startsWith("draw an ") ||
      lower.startsWith("paint ") ||
      lower.startsWith("render ") ||
      lower.includes("generate an image of") ||
      lower.includes("make an image of") ||
      lower.includes("draw an image of") ||
      lower.includes("photo of ") ||
      lower.includes("picture of ")
    );
  }

  // Send message handler (supports text, code, image generation, and editing)
  async function sendMessage(explicitPrompt?: string) {
    const rawPrompt = (explicitPrompt !== undefined ? explicitPrompt : input).trim();
    if (!rawPrompt && attachments.length === 0) return;

    // Check 1 Lakh words limit per chat
    const currentWordCount = calculateChatWordCount(messages);
    if (messages.length > 0 && Number.isFinite(currentWordCount) && currentWordCount >= CHAT_WORD_LIMIT) {
      showToast("Chat reached 100,000 words limit. Auto-starting new chat session ✦");
      createNewChat();
      return;
    }

    const userMsgId = crypto.randomUUID();
    let promptToSend = rawPrompt;
    if (activeTool === "web") {
      promptToSend = `[Mode: Web Search & Fact Retrieval]: ${rawPrompt}`;
    } else if (activeTool === "research") {
      promptToSend = `[Mode: Deep Research & Comprehensive Analysis]: ${rawPrompt}`;
    } else if (activeTool === "file") {
      promptToSend = `[Mode: File & Document Analysis]: ${rawPrompt}`;
    } else if (activeTool === "code") {
      promptToSend = `[Mode: Code Architecture & Production Programming - Zero emojis in code]: ${rawPrompt}`;
    }

    // Ensure active session id exists
    const activeSessionId = currentSessionId || crypto.randomUUID();
    if (!currentSessionId) {
      setCurrentSessionId(activeSessionId);
    }

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: rawPrompt,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      timestamp: Date.now(),
    };

    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);
    messagesCountRef.current = updatedWithUser.length;
    saveCurrentSession(updatedWithUser, activeSessionId);

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    const attachedImages = attachments.filter((a) => a.type.startsWith("image/"));
    setAttachments([]);
    setLoading(true);
    setError("");

    // Setup AbortController for instant stop generation
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const wantsImage = activeTool === "image" || isImageGenerationPrompt(rawPrompt, attachedImages.length > 0);

    if (wantsImage) {
      setStatusMessage(
        attachedImages.length > 0
          ? "Targeting image modifications with pin-to-pin accuracy..."
          : "Rendering master-quality image via Realistic Vision V5.1 (DPMSolver++ Karras)..."
      );

      try {
        const payload: Record<string, unknown> = {
          prompt: rawPrompt,
          model: "realistic",
          userKeys: userApiKeys,
        };

        if (attachedImages.length > 0) {
          payload.image = attachedImages[0].data;
          payload.strength = 0.65;
        }

        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Image generation failed with HTTP ${res.status}`);
        }

        const data = await res.json();
        const assistantMsgId = crypto.randomUUID();
        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: "assistant",
          content: rawPrompt,
          image: data.image,
          kind: "image",
          imageMetadata: {
            model: data.model || "TATTVA Neural Vision HD",
            provider: data.provider || "TATTVA Proprietary Neural Engine",
            seed: data.seed,
            generation_time_seconds: data.generation_time_seconds,
            isEdit: attachedImages.length > 0,
          },
          timestamp: Date.now(),
        };

        const updatedWithAssistant = [...updatedWithUser, assistantMsg];
        setMessages(updatedWithAssistant);
        messagesCountRef.current = updatedWithAssistant.length;
        saveCurrentSession(updatedWithAssistant, activeSessionId);

        // Sare Voice narration for image
        if (sareEnabled) {
          speakText("I have created your image as requested.", assistantMsgId, () => {
            if (sareEnabled) startVoiceRecognition();
          });
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to generate image.");
      } finally {
        setLoading(false);
        setStatusMessage("");
        abortControllerRef.current = null;
      }
      return;
    }

    // Standard Chat & Code & File Maker flow
    setStatusMessage("TATTVA Intelligence reasoning...");
    try {
      const apiMessages = updatedWithUser.map((m) => ({
        role: m.role,
        content: m.id === userMsgId ? promptToSend : m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          mode: activeTool === "code" ? "chat" : undefined,
          userEmail: isUserAuthenticated ? userEmail : undefined,
          userName: isUserAuthenticated ? (currentUser?.user_metadata?.full_name || getActiveSessionName() || userEmail.split("@")[0]) : undefined,
          isAuthenticated: isUserAuthenticated,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Chat failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantMsgId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: data.content || "I am ready to assist you further.",
        kind: data.kind || "text",
        image: data.image,
        imageMetadata: data.imageMetadata,
        timestamp: Date.now(),
        recalledMemories: data.recalledMemories,
        citations: data.citations,
        toolsExecuted: data.toolsExecuted,
        reasoningPlan: data.reasoningPlan,
        agentState: data.agentState,
      };

      const updatedWithAssistant = [...updatedWithUser, assistantMsg];
      setMessages(updatedWithAssistant);
      messagesCountRef.current = updatedWithAssistant.length;
      saveCurrentSession(updatedWithAssistant, activeSessionId);

      // Refresh memory profile after response in case new memories were extracted
      loadUserMemoryData(userEmail);

      // Check if word limit reached after assistant response
      const wordCountAfter = calculateChatWordCount(updatedWithAssistant);
      if (wordCountAfter >= CHAT_WORD_LIMIT) {
        showToast("Word limit of 100,000 reached. Next message will continue in new chat ✦");
      }

      // Voice Assistant Sare: speak aloud automatically if enabled
      if (sareEnabled) {
        speakText(assistantMsg.content, assistantMsgId, () => {
          // Once Sare finishes speaking, resume listening for next user voice command
          if (sareEnabled) {
            startVoiceRecognition();
          }
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to complete request.");
    } finally {
      setLoading(false);
      setStatusMessage("");
      abortControllerRef.current = null;
    }
  }

  function stopGeneration() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setStatusMessage("");
    showToast("Generation stopped ⏹️");
  }

  // Inline Message Editing handlers (ChatGPT-style)
  function startEditingMessage(msg: ChatMessage) {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  }

  function cancelEditingMessage() {
    setEditingMessageId(null);
    setEditContent("");
  }

  async function saveAndResubmitEdit(msgId: string, newContent: string) {
    const trimmed = newContent.trim();
    if (!trimmed) return;

    const msgIdx = messages.findIndex((m) => m.id === msgId);
    if (msgIdx === -1) return;

    // Update the message and truncate subsequent messages
    const updatedMsg: ChatMessage = {
      ...messages[msgIdx],
      content: trimmed,
      timestamp: Date.now(),
    };

    const truncated = [...messages.slice(0, msgIdx), updatedMsg];
    setMessages(truncated);
    saveCurrentSession(truncated);
    setEditingMessageId(null);
    setEditContent("");

    // Trigger regeneration of AI response
    setLoading(true);
    setError("");
    setStatusMessage("TATTVA Intelligence reasoning...");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const apiMessages = truncated.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          mode: activeTool === "code" ? "chat" : undefined,
          userEmail: isUserAuthenticated ? userEmail : undefined,
          userName: isUserAuthenticated ? (currentUser?.user_metadata?.full_name || getActiveSessionName() || userEmail.split("@")[0]) : undefined,
          isAuthenticated: isUserAuthenticated,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Chat failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantMsgId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: data.content || "I am ready to assist you further.",
        kind: data.kind || "text",
        image: data.image,
        imageMetadata: data.imageMetadata,
        timestamp: Date.now(),
        recalledMemories: data.recalledMemories,
        citations: data.citations,
        toolsExecuted: data.toolsExecuted,
        reasoningPlan: data.reasoningPlan,
        agentState: data.agentState,
      };

      const updatedWithAssistant = [...truncated, assistantMsg];
      setMessages(updatedWithAssistant);
      messagesCountRef.current = updatedWithAssistant.length;
      saveCurrentSession(updatedWithAssistant);
      loadUserMemoryData(userEmail);

      if (sareEnabled) {
        speakText(assistantMsg.content, assistantMsgId, () => {
          if (sareEnabled) startVoiceRecognition();
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to update response.");
    } finally {
      setLoading(false);
      setStatusMessage("");
      abortControllerRef.current = null;
    }
  }

  // Regenerate Assistant response (ChatGPT-style)
  async function regenerateResponse(assistantMsgId: string) {
    const assistantIdx = messages.findIndex((m) => m.id === assistantMsgId);
    if (assistantIdx === -1) return;

    // Find preceding user prompt
    let userMsgIdx = -1;
    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        userMsgIdx = i;
        break;
      }
    }

    if (userMsgIdx === -1) {
      showToast("Cannot find prompt to regenerate.");
      return;
    }

    const truncated = messages.slice(0, userMsgIdx + 1);
    setMessages(truncated);
    saveCurrentSession(truncated);

    setLoading(true);
    setError("");
    setStatusMessage("Regenerating response with TATTVA Intelligence...");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const apiMessages = truncated.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          mode: activeTool === "code" ? "chat" : undefined,
          userEmail: isUserAuthenticated ? userEmail : undefined,
          userName: isUserAuthenticated ? (currentUser?.user_metadata?.full_name || getActiveSessionName() || userEmail.split("@")[0]) : undefined,
          isAuthenticated: isUserAuthenticated,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Regeneration failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      const newAssistantMsgId = crypto.randomUUID();
      const newAssistantMsg: ChatMessage = {
        id: newAssistantMsgId,
        role: "assistant",
        content: data.content || "I am ready to assist you further.",
        kind: data.kind || "text",
        image: data.image,
        imageMetadata: data.imageMetadata,
        timestamp: Date.now(),
        recalledMemories: data.recalledMemories,
        citations: data.citations,
        toolsExecuted: data.toolsExecuted,
        reasoningPlan: data.reasoningPlan,
        agentState: data.agentState,
      };

      const updated = [...truncated, newAssistantMsg];
      setMessages(updated);
      messagesCountRef.current = updated.length;
      saveCurrentSession(updated);
      loadUserMemoryData(userEmail);

      if (sareEnabled) {
        speakText(newAssistantMsg.content, newAssistantMsgId, () => {
          if (sareEnabled) startVoiceRecognition();
        });
      }
      showToast("Response regenerated ✦");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to regenerate response.");
    } finally {
      setLoading(false);
      setStatusMessage("");
      abortControllerRef.current = null;
    }
  }

  // Start Image Editing workflow in Chat
  function startEditingImage(imageSrc: string, prompt?: string) {
    const imageAttachment: ChatAttachment = {
      name: "source-image.png",
      type: "image/png",
      data: imageSrc,
      preview: imageSrc,
    };
    setAttachments([imageAttachment]);
    setActiveTool("image");
    setInput(prompt ? `Modify this image: ` : "Change this image: ");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    showToast("Image loaded for editing. Describe your requested changes 🎨");
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function processFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list || list.length === 0) return;

    setAttachmentUploading(true);
    let loadedCount = 0;

    list.forEach((file) => {
      // 25MB file size limit validation
      if (file.size > 25 * 1024 * 1024) {
        showToast(`"${file.name}" exceeds 25MB limit ⚠️`);
        loadedCount++;
        if (loadedCount >= list.length) setAttachmentUploading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type || "application/octet-stream",
            data: result,
            preview: file.type.startsWith("image/") ? result : undefined,
            size: file.size,
          },
        ]);
        loadedCount++;
        if (loadedCount >= list.length) {
          setAttachmentUploading(false);
          showToast(`Attached ${list.length === 1 ? file.name : `${list.length} files`} 📎`);
        }
      };
      reader.onerror = () => {
        loadedCount++;
        if (loadedCount >= list.length) setAttachmentUploading(false);
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle file picker attachments
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = "";
    setIsAttachmentMenuOpen(false);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToUpload: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) filesToUpload.push(file);
      }
    }

    if (filesToUpload.length > 0) {
      e.preventDefault();
      processFiles(filesToUpload);
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function downloadImage(dataUri: string, filename = "tattva-artwork.png") {
    triggerDownload(dataUri, filename, "image/png");
    showToast("Image downloaded ✦");
  }

  function copyMessage(text: string, msgId: string) {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    showToast("Copied to clipboard 📋");
    setTimeout(() => setCopiedMessageId(null), 2000);
  }



  // Long press handler for images
  function handleImageTouchStart(imgSrc: string, e: React.TouchEvent | React.MouseEvent) {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    longPressTimerRef.current = setTimeout(() => {
      setImageMenuOpen({ image: imgSrc, x: clientX, y: clientY });
    }, 500);
  }

  function handleImageTouchEnd() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  // User authentication status & access verification (ChatGPT-Style)
  const isUserAuthenticated = Boolean(
    (currentUser && currentUser.email) ||
    (userEmail && userEmail.trim().length > 0 && userEmail !== "guest_user")
  );
  const isGuest = !isUserAuthenticated;
  const remainingGuestChats = Infinity;
  const activeWordCount = calculateChatWordCount(messages);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-black selection:text-white ${
        isDark ? "bg-[#0d0e11] text-neutral-100" : "bg-white text-black"
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border border-black/10 bg-black text-white px-4 py-2 text-xs font-medium shadow-xl backdrop-blur-xl animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Image Context Menu (Long-press / right click) */}
      {imageMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs"
          onClick={() => setImageMenuOpen(null)}
        >
          <div
            className={`w-64 rounded-2xl border p-2 shadow-2xl backdrop-blur-2xl animate-scale-in ${
              isDark ? "border-neutral-800 bg-neutral-900 text-white" : "border-black/10 bg-white text-black"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-black/[0.06] text-xs font-semibold text-neutral-400">
              Image Actions
            </div>
            <div className="space-y-1 mt-1">
              <button
                type="button"
                onClick={() => {
                  downloadImage(imageMenuOpen.image);
                  setImageMenuOpen(null);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                  isDark ? "hover:bg-neutral-800" : "hover:bg-neutral-100"
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Download Image</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: "TATTVA AI Image", url: imageMenuOpen.image }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(imageMenuOpen.image);
                    showToast("Image URI copied 📋");
                  }
                  setImageMenuOpen(null);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                  isDark ? "hover:bg-neutral-800" : "hover:bg-neutral-100"
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span>Share Image</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttachments([
                    {
                      name: "modify-target.png",
                      type: "image/png",
                      data: imageMenuOpen.image,
                      preview: imageMenuOpen.image,
                    },
                  ]);
                  setImageMenuOpen(null);
                  textareaRef.current?.focus();
                  showToast("Image loaded for targeted modification ✦");
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                  isDark ? "hover:bg-neutral-800" : "hover:bg-neutral-100"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Modify This Image</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          1. TOP NAVIGATION BAR (MINIMALIST + LIQUID ACCENTS)
      ========================================================================= */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
          isDark ? "border-neutral-800/80 bg-[#0d0e11]/85" : "border-black/[0.06] bg-white/85"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isDark ? "text-neutral-400 hover:text-white hover:bg-neutral-800" : "text-neutral-500 hover:text-black hover:bg-neutral-100"
              }`}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>

            {/* Interactive TATTVA AI Branding Bubble */}
            <div className="relative" data-branding-bubble>
              <button
                type="button"
                onClick={() => setIsInfoBubbleOpen(!isInfoBubbleOpen)}
                className={`group flex items-center gap-2.5 rounded-2xl border px-3 py-1.5 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs ${
                  isDark
                    ? "border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-white hover:border-neutral-700"
                    : "border-black/[0.08] bg-white hover:bg-neutral-50 text-neutral-900 hover:border-black/20"
                }`}
                title="About TATTVA AI & Creator"
              >
                <div className="relative flex h-7 w-7 items-center justify-center rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-white p-0.5 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                  <img src="/logo.png" alt="TATTVA AI" className="h-full w-full object-contain" />
                </div>
                <div className="leading-tight text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold tracking-tight">TATTVA AI</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full border border-black/10 dark:border-white/10 text-neutral-400 font-normal">v1.0</span>
                  </div>
                  <span className="block text-[10px] text-neutral-500 dark:text-neutral-400 font-medium truncate max-w-[150px] sm:max-w-none">
                    by Kotapati Gowtham Chowdary
                  </span>
                </div>
                <Info className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 ml-0.5 shrink-0" />
              </button>

              {/* Elegant Popover */}
              {isInfoBubbleOpen && (
                <div
                  className={`absolute left-0 top-full mt-2 w-72 sm:w-84 rounded-2xl border p-4 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    isDark
                      ? "border-neutral-700 bg-neutral-900/95 text-neutral-200"
                      : "border-black/10 bg-white/95 text-neutral-800"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-neutral-800">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl overflow-hidden border border-black/10 bg-white p-0.5 shrink-0">
                        <img src="/logo.png" alt="TATTVA AI" className="h-full w-full object-contain" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-neutral-900 dark:text-white">TATTVA AI</h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 font-semibold text-neutral-500">v1.0.0</span>
                        </div>
                        <p className="text-[11px] text-neutral-500">Created by Kotapati Gowtham Chowdary</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsInfoBubbleOpen(false)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-3 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    <p className="font-medium text-neutral-900 dark:text-white mb-1">About</p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
                      An AI-powered intelligent assistant designed to help users with conversations, coding, reasoning, creative tasks, image generation and multimodal interactions.
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-black/[0.06] dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400">
                    <span>Engineered with Precision</span>
                    <span className="font-semibold text-neutral-600 dark:text-neutral-300">Next-Gen Intelligence</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Header Controls: Share & Theme Only */}
          <div className="flex items-center gap-2">
            {/* Share Chat Button */}
            <button
              type="button"
              onClick={() => shareChat()}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isDark
                  ? "border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800"
                  : "border-black/10 bg-white text-neutral-700 hover:text-black hover:bg-neutral-100"
              }`}
              title="Share this chat"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isDark
                  ? "border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800"
                  : "border-black/10 bg-white text-neutral-700 hover:text-black hover:bg-neutral-100"
              }`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. MAIN CONTENT AREA: SIDEBAR + CHAT STREAM
      ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop for Sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar: ChatGPT-Inspired Collapsible Sidebar */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col border-r transition-all duration-300 ease-in-out ${
            sidebarOpen
              ? "w-[280px] max-w-[85vw] translate-x-0"
              : "w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden pointer-events-none"
          } ${
            isDark ? "border-neutral-800 bg-[#121316]" : "border-black/[0.06] bg-neutral-50/95"
          } backdrop-blur-xl shadow-xl md:shadow-none`}
        >
          {/* Sidebar Top: Logo + Close Button */}
          <div className="p-3 border-b border-black/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-white shadow-xs">
                <img
                  src="/logo.png"
                  alt="TATTVA AI"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-xs font-bold tracking-tight text-neutral-800 dark:text-neutral-200">
                TATTVA AI
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className={`p-1.5 rounded-lg transition ${
                isDark ? "hover:bg-neutral-800 text-neutral-400 hover:text-white" : "hover:bg-neutral-200 text-neutral-600 hover:text-black"
              }`}
              title="Close sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons: New Chat & Global Search */}
          <div className="p-2 space-y-1.5 border-b border-black/[0.06]">
            {/* New Chat Button */}
            <button
              type="button"
              onClick={createNewChat}
              className={`flex items-center justify-between w-full rounded-xl px-3 py-2 text-xs font-semibold transition shadow-xs ${
                isDark
                  ? "bg-neutral-800 text-white hover:bg-neutral-700"
                  : "bg-black text-white hover:bg-neutral-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">✦</span>
            </button>

            {/* Search Conversations Button */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className={`flex items-center justify-between w-full rounded-xl border px-3 py-2 text-xs font-medium transition ${
                isDark
                  ? "border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800"
                  : "border-black/10 bg-white/80 text-neutral-700 hover:bg-neutral-100"
              }`}
              title="Search all conversations (Ctrl+K)"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-neutral-400" />
                <span>Search chats</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-500">
                ⌘K
              </kbd>
            </button>

            {/* Quick Links: Image Library & Archived Chats */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setIsImageLibraryOpen(true)}
                className={`flex items-center justify-center gap-1.5 flex-1 rounded-xl border py-1.5 px-2 text-[11px] font-medium transition cursor-pointer ${
                  isDark
                    ? "border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800"
                    : "border-black/10 bg-white/80 text-neutral-700 hover:bg-neutral-100"
                }`}
                title="Browse all generated images"
              >
                <ImageIcon className="w-3 h-3 text-amber-500" />
                <span>Images</span>
              </button>
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(true)}
                className={`flex items-center justify-center gap-1.5 flex-1 rounded-xl border py-1.5 px-2 text-[11px] font-medium transition cursor-pointer ${
                  isDark
                    ? "border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800"
                    : "border-black/10 bg-white/80 text-neutral-700 hover:bg-neutral-100"
                }`}
                title="View archived chats"
              >
                <FolderArchive className="w-3 h-3 text-blue-500" />
                <span>Archived</span>
                {sessions.filter((s) => s.is_archived).length > 0 && (
                  <span className="text-[9px] px-1 rounded-full bg-blue-500/20 text-blue-400 font-bold">
                    {sessions.filter((s) => s.is_archived).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Scrollable Chat History */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {/* Loading Skeleton */}
            {sessionsLoading && (
              <div className="space-y-2 p-2">
                <div className="h-8 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-xl animate-pulse" />
                <div className="h-8 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-xl animate-pulse" />
                <div className="h-8 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-xl animate-pulse" />
              </div>
            )}

            {/* Empty State */}
            {sessions.filter((s) => !s.is_archived).length === 0 && !sessionsLoading && (
              <div className="text-center py-8 px-3">
                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-neutral-400 opacity-60" />
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">No conversations yet</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Start typing to begin a chat</p>
              </div>
            )}

            {/* 1. PINNED CONVERSATIONS SECTION */}
            {sessions.filter((s) => s.is_pinned && !s.is_archived).length > 0 && (
              <div className="mb-2">
                <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <span>📌 Pinned</span>
                  </div>
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10">
                    {sessions.filter((s) => s.is_pinned && !s.is_archived).length}
                  </span>
                </div>

                <div className="space-y-1">
                  {sessions
                    .filter((s) => s.is_pinned && !s.is_archived)
                    .sort((a, b) => (b.pinned_at || 0) - (a.pinned_at || 0))
                    .map((s) => {
                      const active = s.id === currentSessionId;
                      const isRenaming = renamingSessionId === s.id;
                      const menuOpen = activeMenuSessionId === s.id;

                      return (
                        <div key={s.id} className={`relative group ${menuOpen ? "z-50" : "z-0"}`} data-session-menu="true">
                          {isRenaming ? (
                            <form
                              onSubmit={(e) => submitRenameSession(s.id, e)}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              data-session-menu="true"
                              className="flex items-center gap-1 p-1 w-full"
                            >
                              <input
                                type="text"
                                autoFocus
                                value={renameInput}
                                onChange={(e) => setRenameInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    submitRenameSession(s.id);
                                  } else if (e.key === "Escape") {
                                    setRenamingSessionId(null);
                                  }
                                }}
                                className="flex-1 text-xs rounded-lg border border-black/20 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 outline-none text-neutral-900 dark:text-white"
                              />
                              <button
                                type="submit"
                                title="Save title"
                                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Cancel"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenamingSessionId(null);
                                }}
                                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          ) : (
                            <div
                              onClick={() => selectSession(s)}
                              className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition ${
                                active
                                  ? isDark
                                    ? "bg-neutral-800 text-white font-semibold"
                                    : "bg-white text-black font-semibold shadow-xs border border-black/5"
                                  : isDark
                                  ? "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                                  : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Pin className="w-3 h-3 flex-shrink-0 text-neutral-500 fill-neutral-400/30" />
                                <span className="truncate">{s.title || "New Conversation"}</span>
                              </div>

                              <button
                                type="button"
                                data-session-menu="true"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuSessionId(menuOpen ? null : s.id);
                                }}
                                className={`p-1 rounded text-neutral-400 hover:text-black dark:hover:text-white transition opacity-70 sm:opacity-0 sm:group-hover:opacity-100 ${
                                  menuOpen ? "!opacity-100" : ""
                                }`}
                                title="Conversation options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Contextual Three-Dot Popover Menu */}
                          {menuOpen && (
                            <div
                              data-session-menu="true"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute right-1 top-full mt-1 z-50 w-44 rounded-xl border p-1 shadow-2xl text-xs backdrop-blur-xl ${
                                isDark
                                  ? "border-neutral-700 bg-neutral-900 text-neutral-200"
                                  : "border-black/10 bg-white text-neutral-800"
                              }`}
                            >
                              <button
                                type="button"
                                data-session-action="true"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  togglePinSession(s.id, e);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left cursor-pointer transition select-none"
                              >
                                <PinOff className="w-3.5 h-3.5" />
                                <span>Unpin conversation</span>
                              </button>
                              <button
                                type="button"
                                data-session-action="true"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  startRenameSession(s, e);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left cursor-pointer transition select-none"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Rename conversation</span>
                              </button>
                              <button
                                type="button"
                                data-session-action="true"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setActiveMenuSessionId(null);
                                  shareChat(s);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left cursor-pointer transition select-none"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>Share conversation</span>
                              </button>
                              <button
                                type="button"
                                data-session-action="true"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setActiveMenuSessionId(null);
                                  archiveSession(s.id, e);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left cursor-pointer transition select-none"
                              >
                                <FolderArchive className="w-3.5 h-3.5" />
                                <span>Archive conversation</span>
                              </button>
                              <div className="my-1 border-t border-black/5 dark:border-neutral-800" />
                              <button
                                type="button"
                                data-session-action="true"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  deleteSession(s.id, e);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-left cursor-pointer transition select-none"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete conversation</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 2. RECENT CHATS SECTION */}
            <div>
              <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                <span>Recent Chats</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10">
                  {sessions.filter((s) => !s.is_pinned && !s.is_archived).length}
                </span>
              </div>

              <div className="space-y-1">
                {sessions
                  .filter((s) => !s.is_pinned && !s.is_archived)
                  .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                  .map((s) => {
                    const active = s.id === currentSessionId;
                    const isRenaming = renamingSessionId === s.id;
                    const menuOpen = activeMenuSessionId === s.id;

                    return (
                      <div key={s.id} className={`relative group ${menuOpen ? "z-50" : "z-0"}`} data-session-menu="true">
                        {isRenaming ? (
                          <form
                            onSubmit={(e) => submitRenameSession(s.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            data-session-menu="true"
                            className="flex items-center gap-1 p-1 w-full"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={renameInput}
                              onChange={(e) => setRenameInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  submitRenameSession(s.id);
                                } else if (e.key === "Escape") {
                                  setRenamingSessionId(null);
                                }
                              }}
                              className="flex-1 text-xs rounded-lg border border-black/20 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 outline-none text-neutral-900 dark:text-white"
                            />
                            <button
                              type="submit"
                              title="Save title"
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Cancel"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingSessionId(null);
                              }}
                              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <div
                            onClick={() => selectSession(s)}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition ${
                              active
                                ? isDark
                                  ? "bg-neutral-800 text-white font-semibold"
                                  : "bg-white text-black font-semibold shadow-xs border border-black/5"
                                : isDark
                                ? "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                                : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                              <span className="truncate">{s.title || "New Conversation"}</span>
                            </div>

                            <button
                              type="button"
                              data-session-menu="true"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuSessionId(menuOpen ? null : s.id);
                              }}
                              className={`p-1 rounded text-neutral-400 hover:text-black dark:hover:text-white transition opacity-70 sm:opacity-0 sm:group-hover:opacity-100 ${
                                menuOpen ? "!opacity-100" : ""
                              }`}
                              title="Conversation options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Contextual Three-Dot Popover Menu */}
                        {menuOpen && (
                          <div
                            data-session-menu="true"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute right-1 top-full mt-1 z-50 w-44 rounded-xl border p-1 shadow-2xl text-xs backdrop-blur-xl ${
                              isDark
                                ? "border-neutral-700 bg-neutral-900 text-neutral-200"
                                : "border-black/10 bg-white text-neutral-800"
                            }`}
                          >
                            <button
                              type="button"
                              data-session-action="true"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                togglePinSession(s.id, e);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left cursor-pointer transition select-none"
                            >
                              <Pin className="w-3.5 h-3.5" />
                              <span>Pin conversation</span>
                            </button>
                            <button
                              type="button"
                              data-session-action="true"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                startRenameSession(s, e);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left cursor-pointer transition select-none"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Rename conversation</span>
                            </button>
                            <button
                              type="button"
                              data-session-action="true"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setActiveMenuSessionId(null);
                                shareChat(s);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left cursor-pointer transition select-none"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share conversation</span>
                            </button>
                            <button
                              type="button"
                              data-session-action="true"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setActiveMenuSessionId(null);
                                archiveSession(s.id, e);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left cursor-pointer transition select-none"
                            >
                              <FolderArchive className="w-3.5 h-3.5" />
                              <span>Archive conversation</span>
                            </button>
                            <div className="my-1 border-t border-black/5 dark:border-neutral-800" />
                            <button
                              type="button"
                              data-session-action="true"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                deleteSession(s.id, e);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-left cursor-pointer transition select-none"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete conversation</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* =========================================================================
              SIDEBAR PROFILE FOOTER (CHATGPT-STYLE USER PROFILE & DROPDOWN TRIGGER)
          ========================================================================= */}
          <div className="relative p-2 border-t border-black/[0.06] dark:border-neutral-800" data-profile-menu>
            {/* Profile Dropdown Menu (Floats upwards) */}
            {isProfileMenuOpen && (
              <div
                className={`absolute bottom-full left-2 right-2 mb-2 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-2xl text-xs z-50 animate-in fade-in zoom-in-95 duration-150 ${
                  isDark
                    ? "border-neutral-700 bg-neutral-900/95 text-neutral-200"
                    : "border-black/10 bg-white/95 text-neutral-800"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header item with email & account status */}
                <div className="px-3 py-2 border-b border-black/[0.06] dark:border-neutral-800/80">
                  <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                    {isGuest ? "Guest Access" : "Account"}
                  </p>
                  <p className="font-semibold text-xs truncate mt-0.5 text-neutral-900 dark:text-white">
                    {isGuest ? "Guest User (Logged Out)" : (currentUser?.user_metadata?.full_name || getActiveSessionName() || userEmail)}
                  </p>
                  <p className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${isGuest ? "bg-amber-500" : "bg-emerald-500"}`} />
                    <span>{isGuest ? "Trial Session • Unauthenticated" : userEmail}</span>
                  </p>
                </div>

                <div className="py-1 space-y-0.5">
                  {isGuest ? (
                    <>
                      {/* Guest Options */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          router.push("/login");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-semibold text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                      >
                        <LogIn className="w-4 h-4 text-blue-500" />
                        <span>Log In to Account</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          router.push("/signup");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-semibold text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                      >
                        <UserPlus className="w-4 h-4 text-emerald-500" />
                        <span>Create Free Account</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsSettingsModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                      >
                        <Settings className="w-4 h-4 text-neutral-500" />
                        <span>Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsHelpModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                      >
                        <HelpCircle className="w-4 h-4 text-neutral-500" />
                        <span>Help &amp; Support</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Authenticated User Options */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsProfileModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                      >
                        <UserIcon className="w-4 h-4 text-neutral-500" />
                        <span>My Profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsSettingsModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                      >
                        <Settings className="w-4 h-4 text-neutral-500" />
                        <span>Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsMemoryModalOpen(true);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Brain className="w-4 h-4 text-purple-500" />
                          <span>Memory &amp; Personalization</span>
                        </div>
                        {memories.length > 0 && (
                          <span className="rounded-full bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-300">
                            {memories.length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsManageAccountModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                      >
                        <ShieldCheck className="w-4 h-4 text-neutral-500" />
                        <span>Manage Account</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsHelpModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                      >
                        <HelpCircle className="w-4 h-4 text-neutral-500" />
                        <span>Help &amp; Support</span>
                      </button>

                      <div className="my-1 border-t border-black/[0.06] dark:border-neutral-800/80" />

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          createNewChat();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                      >
                        <Plus className="w-4 h-4 text-neutral-500" />
                        <span>New Conversation</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Log Out</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Profile Trigger Button in Sidebar Footer */}
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={`flex w-full items-center justify-between p-2 rounded-2xl transition-all ${
                isProfileMenuOpen
                  ? "bg-neutral-200 dark:bg-neutral-800"
                  : "hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70"
              }`}
              title="Open profile & account menu"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* User Avatar with Initials */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-xs ring-1 ${
                    isGuest
                      ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-amber-400/40"
                      : "bg-gradient-to-tr from-neutral-800 to-black text-white ring-black/10 dark:ring-white/20"
                  }`}
                >
                  {isGuest ? "G" : (userEmail ? userEmail[0].toUpperCase() : "U")}
                </div>
                {/* Display Name and Status */}
                <div className="text-left min-w-0">
                  <div className="text-xs font-semibold truncate text-neutral-900 dark:text-neutral-100">
                    {isGuest ? "Guest User" : (currentUser?.user_metadata?.full_name || getActiveSessionName() || userEmail.split("@")[0])}
                  </div>
                  <div className="text-[10px] text-neutral-400 truncate max-w-[130px] flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${isGuest ? "bg-amber-500" : "bg-emerald-500"}`} />
                    <span>{isGuest ? "Logged Out • Sign in" : userEmail}</span>
                  </div>
                </div>
              </div>

              {/* Profile Menu Trigger Indicator */}
              <div className="text-neutral-400 p-1">
                <MoreVertical className="w-4 h-4" />
              </div>
            </button>
          </div>
        </aside>

        {/* =========================================================================
            GLOBAL SEARCH MODAL (ChatGPT-Style Instant Search)
        ========================================================================= */}
        {searchModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSearchModalOpen(false)}
          >
            <div
              className={`w-full max-w-xl rounded-2xl border p-4 shadow-2xl transition-all ${
                isDark ? "border-neutral-800 bg-[#18181b] text-white" : "border-neutral-200 bg-white text-neutral-900"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input Bar */}
              <div className="flex items-center gap-3 border-b pb-3 border-neutral-200 dark:border-neutral-800">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search across all conversations, messages, or topics..."
                  className={`w-full bg-transparent text-sm outline-none placeholder-neutral-400 ${
                    isDark ? "text-white" : "text-black"
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-neutral-400 hover:text-neutral-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <kbd className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-500">
                  ESC
                </kbd>
              </div>

              {/* Results Status Header */}
              <div className="flex items-center justify-between py-2 text-xs text-neutral-400">
                <span>
                  {isSearching
                    ? "Searching..."
                    : searchQuery
                    ? `${searchResults.length} results found`
                    : "Type to search complete chat history"}
                </span>
                <span className="text-[11px]">Click to jump to conversation</span>
              </div>

              {/* Results Container */}
              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                {searchQuery.trim().length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400">
                    <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p>Search titles, questions, code snippets, or document creation history.</p>
                  </div>
                ) : searchResults.length === 0 && !isSearching ? (
                  <div className="py-8 text-center text-xs text-neutral-400">
                    <p>No conversations found matching &quot;{searchQuery}&quot;</p>
                  </div>
                ) : (
                  searchResults.map((r, idx) => (
                    <div
                      key={`${r.session.id}_${idx}`}
                      onClick={() => selectSearchResult(r)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                        isDark
                          ? "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 hover:border-neutral-700"
                          : "border-neutral-200 bg-neutral-50/70 hover:bg-white hover:border-neutral-300 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 font-bold truncate">
                          <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate">{r.session.title}</span>
                        </div>
                        <span
                          className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            r.matchType === "title"
                              ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300"
                              : r.matchType === "user"
                              ? "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-300"
                              : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300"
                          }`}
                        >
                          {r.matchType === "title"
                            ? "Title Match"
                            : r.matchType === "user"
                            ? "User Prompt"
                            : "AI Answer"}
                        </span>
                      </div>
                      <p className="text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                        {r.matchedSnippet}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Central Chat Stream */}
        <main
          ref={chatContainerRef}
          onScroll={handleChatScroll}
          className="flex-1 flex flex-col justify-between overflow-y-auto relative"
        >
          {/* Sare Voice Status Banner */}
          {sareEnabled && (
            <div
              className={`sticky top-0 z-20 flex items-center justify-between px-6 py-2.5 text-xs font-semibold backdrop-blur-md transition-colors ${
                sareStatus === "listening"
                  ? "bg-black text-white animate-pulse"
                  : sareStatus === "speaking"
                  ? "bg-neutral-800 text-white"
                  : isDark
                  ? "bg-neutral-900/90 text-neutral-300"
                  : "bg-neutral-100/90 text-black"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {sareStatus === "listening"
                    ? "Sare is listening to your voice... Speak anytime"
                    : sareStatus === "speaking"
                    ? "Sare is speaking..."
                    : sareStatus === "thinking"
                    ? "Sare is processing your voice..."
                    : "Sare Voice Assistant active"}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleSareVoiceMode}
                className="text-[11px] underline opacity-80 hover:opacity-100"
              >
                Turn off
              </button>
            </div>
          )}

          {/* Messages list */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
            {messages.length === 0 ? (
              <div className="my-auto py-10 sm:py-16 text-center max-w-xl mx-auto">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-white shadow-md mb-4 p-1">
                  <img
                    src="/logo.png"
                    alt="TATTVA AI"
                    className="h-full w-full object-contain"
                  />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">How can TATTVA AI help you today?</h2>
                <p className="mt-2 text-xs sm:text-sm text-neutral-500 leading-relaxed">
                  Ask complex questions in any language, write robust code without emojis, generate photorealistic
                  artworks, or talk directly using voice.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const isUser = msg.role === "user";
                const showDate =
                  !prevMsg ||
                  new Date(msg.timestamp || Date.now()).toDateString() !==
                    new Date(prevMsg.timestamp || Date.now()).toDateString();

                return (
                  <div key={msg.id}>
                    {/* Non-disturbing centered chat date divider */}
                    {showDate && (
                      <div className="my-6 flex items-center justify-center select-none">
                        <span
                          className={`rounded-full border px-3.5 py-1 text-[11px] font-medium shadow-xs backdrop-blur-md ${
                            isDark
                              ? "border-neutral-800 bg-neutral-900 text-neutral-400"
                              : "border-black/[0.08] bg-neutral-100/80 text-neutral-500"
                          }`}
                        >
                          {formatChatDate(msg.timestamp)}
                        </span>
                      </div>
                    )}

                    {isUser ? (
                      /* USER MESSAGE: Compact Bubble + Hover Edit/Copy Toolbar */
                      <div className="flex flex-col items-end gap-1.5 group/user w-full">
                        {editingMessageId === msg.id ? (
                          /* Inline Edit Form */
                          <div
                            className={`w-full max-w-2xl sm:max-w-3xl ml-auto rounded-2xl border p-3.5 shadow-sm transition-all ${
                              isDark
                                ? "border-neutral-700 bg-neutral-900 text-white"
                                : "border-neutral-300 bg-neutral-100 text-neutral-900"
                            }`}
                          >
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full bg-transparent resize-y min-h-[80px] p-1 text-sm focus:outline-none leading-relaxed"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex justify-end items-center gap-2 mt-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                              <button
                                type="button"
                                onClick={cancelEditingMessage}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                                  isDark
                                    ? "border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                                    : "border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700"
                                }`}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => saveAndResubmitEdit(msg.id, editContent)}
                                className="px-3.5 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition shadow-sm cursor-pointer"
                              >
                                Save &amp; Submit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              className={`relative max-w-[85%] sm:max-w-[75%] rounded-3xl px-4 py-2.5 sm:px-5 sm:py-3 text-[14px] sm:text-[15px] leading-relaxed break-words shadow-2xs ${
                                isDark
                                  ? "bg-neutral-800 text-neutral-100"
                                  : "bg-neutral-100 text-neutral-900"
                              }`}
                            >
                              {/* Attachments */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mb-2 flex flex-wrap gap-2">
                                  {msg.attachments.map((att, aIdx) => (
                                    <div
                                      key={aIdx}
                                      className="overflow-hidden rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-200 dark:bg-neutral-900"
                                    >
                                      {att.preview ? (
                                        <Image
                                          src={att.preview}
                                          alt={att.name}
                                          width={80}
                                          height={80}
                                          className="h-16 w-16 object-cover"
                                        />
                                      ) : (
                                        <div className="p-2 text-xs">📄 {att.name}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>

                            {/* User Message Action Toolbar on hover */}
                            <div className="flex items-center gap-1 opacity-0 group-hover/user:opacity-100 transition-opacity pr-1 text-xs text-neutral-400">
                              <button
                                type="button"
                                onClick={() => startEditingMessage(msg)}
                                className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white transition cursor-pointer"
                                title="Edit message"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => copyMessage(msg.content, msg.id)}
                                className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-black dark:hover:text-white transition cursor-pointer"
                                title="Copy text"
                              >
                                {copiedMessageId === msg.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      /* ASSISTANT MESSAGE: Clean Surface Presentation (No Box), Pure Typography */
                      <div className="flex gap-3 sm:gap-4 items-start w-full group/assistant">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-white shadow-sm mt-1 p-0.5">
                          <img
                            src="/logo.png"
                            alt="TATTVA AI"
                            className="h-full w-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Markdown / Text content rendered directly on conversation surface */}
                          <MarkdownView content={msg.content} isDark={isDark} />

                          {/* Grounded Web Research Citations */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                              <span className="text-[11px] font-medium text-neutral-500 mr-1 flex items-center gap-1">
                                <Globe className="w-3 h-3 text-blue-500" /> Sources:
                              </span>
                              {msg.citations.map((c, cIdx) => (
                                <a
                                  key={cIdx}
                                  href={c.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] border border-black/10 dark:border-neutral-700 bg-neutral-100/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-blue-500 transition-colors shadow-2xs"
                                  title={c.snippet || c.title}
                                >
                                  <span className="font-semibold text-neutral-400">[{cIdx + 1}]</span>
                                  <span className="max-w-[140px] truncate">{c.title}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Structured Reasoning & Verification Plan */}
                          {msg.reasoningPlan && (
                            <details className="mt-2.5 rounded-xl border border-black/[0.08] dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-2.5 text-xs">
                              <summary className="font-medium text-neutral-600 dark:text-neutral-400 cursor-pointer select-none flex items-center gap-1.5 hover:text-black dark:hover:text-white transition">
                                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Reasoning &amp; Verification Plan ({msg.reasoningPlan.steps?.length || 0} steps)</span>
                              </summary>
                              <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-indigo-500/30 text-neutral-600 dark:text-neutral-300">
                                {msg.reasoningPlan.steps?.map((st: any, sIdx: number) => (
                                  <div key={sIdx} className="text-[11px] leading-relaxed">
                                    <span className="font-semibold text-indigo-500">Step {st.stepNumber}:</span> {st.title} — {st.thought}
                                  </div>
                                ))}
                                {msg.reasoningPlan.verificationHypothesis && (
                                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                                    ✓ Verification: {msg.reasoningPlan.verificationHypothesis}
                                  </div>
                                )}
                              </div>
                            </details>
                          )}

                          {/* Generated Image Card */}
                          {msg.image && (
                            <div className="mt-4 overflow-hidden rounded-2xl border border-black/[0.1] dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 shadow-sm">
                              <div
                                className="relative group cursor-pointer overflow-hidden bg-black/5"
                                onClick={() => setLightboxImage(msg.image!)}
                                onTouchStart={(e) => handleImageTouchStart(msg.image!, e)}
                                onTouchEnd={handleImageTouchEnd}
                                onMouseDown={(e) => handleImageTouchStart(msg.image!, e)}
                                onMouseUp={handleImageTouchEnd}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setImageMenuOpen({ image: msg.image!, x: e.clientX, y: e.clientY });
                                }}
                              >
                                <Image
                                  src={msg.image}
                                  alt={msg.content}
                                  width={600}
                                  height={600}
                                  unoptimized
                                  className="w-full h-auto max-h-[500px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                                />

                                <div className="absolute top-3 right-3 flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingImage(msg.image!, msg.content);
                                    }}
                                    className="p-2 rounded-xl bg-black/75 text-white hover:bg-black transition shadow-md backdrop-blur-md"
                                    title="Edit / Refine this Image"
                                  >
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadImage(msg.image!);
                                    }}
                                    className="p-2 rounded-xl bg-black/75 text-white hover:bg-black transition shadow-md backdrop-blur-md"
                                    title="Download Image"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setImageMenuOpen({ image: msg.image!, x: e.clientX, y: e.clientY });
                                    }}
                                    className="p-2 rounded-xl bg-black/75 text-white hover:bg-black transition shadow-md backdrop-blur-md"
                                    title="Share / Actions"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-black/[0.06] dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 text-xs">
                                <div className="text-neutral-500 font-mono text-[11px] flex items-center gap-1.5">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">HD 1024px</span>
                                  <span>{msg.imageMetadata?.model || "TATTVA Neural Vision HD"}</span>
                                  {msg.imageMetadata?.generation_time_seconds && (
                                    <span> • {msg.imageMetadata.generation_time_seconds}s</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-neutral-400">Long-press image for options</span>
                              </div>
                            </div>
                          )}

                          {/* Assistant Action Toolbar */}
                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono opacity-60">TATTVA Intelligence</span>
                              {/* Recalled Memory Badge */}
                              {msg.recalledMemories && msg.recalledMemories.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setIsMemoryModalOpen(true)}
                                  className="flex items-center gap-1 rounded-md bg-purple-500/10 dark:bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 transition cursor-pointer"
                                  title={msg.recalledMemories.map((m) => `• [${m.category || "memory"}] ${m.content}`).join("\n")}
                                >
                                  <Brain className="w-3 h-3 text-purple-500" />
                                  <span>{msg.recalledMemories.length} recalled</span>
                                </button>
                              )}
                              {/* Tools Executed Badge */}
                              {msg.toolsExecuted && msg.toolsExecuted.length > 0 && (
                                <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                                  <Wrench className="w-3 h-3 text-emerald-500" />
                                  <span>{msg.toolsExecuted.join(", ")}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Feedback Thumbs Up / Down */}
                              <div className="flex items-center gap-0.5 border-r border-black/[0.06] dark:border-white/[0.06] pr-1.5 mr-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuickFeedback(msg.id, "positive")}
                                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                                    msg.userFeedback?.rating === "positive"
                                      ? "text-emerald-500 bg-emerald-500/10 font-bold"
                                      : "text-neutral-400 hover:text-emerald-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                  }`}
                                  title="Helpful response"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openFeedbackModal(msg.id, "negative")}
                                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                                    msg.userFeedback?.rating === "negative"
                                      ? "text-red-500 bg-red-500/10 font-bold"
                                      : "text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                  }`}
                                  title="Provide feedback"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => speakText(msg.content, msg.id)}
                                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                                  speakingMessageId === msg.id
                                    ? "bg-black text-white font-bold"
                                    : "text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                }`}
                                title="Listen to this response"
                              >
                                {speakingMessageId === msg.id ? (
                                  <VolumeX className="w-3.5 h-3.5" />
                                ) : (
                                  <Volume2 className="w-3.5 h-3.5" />
                                )}
                                <span>{speakingMessageId === msg.id ? "Stop" : "Speak"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => copyMessage(msg.content, msg.id)}
                                className="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                title="Copy descriptive text"
                              >
                                {copiedMessageId === msg.id ? (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                <span>{copiedMessageId === msg.id ? "Copied" : "Copy"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => regenerateResponse(msg.id)}
                                className="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                title="Regenerate response"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Regenerate</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Loading pulse indicator */}
            {loading && (
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-white shadow-sm animate-pulse p-0.5">
                  <img
                    src="/logo.png"
                    alt="TATTVA AI"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs shadow-sm ${
                    isDark ? "border-neutral-800 bg-neutral-900 text-neutral-200" : "border-black/[0.08] bg-white text-neutral-800"
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-black dark:bg-white animate-ping" />
                  <span className="font-medium">{statusMessage || "Processing with TATTVA Intelligence..."}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
                ⚠️ {error}
              </div>
            )}



            <div ref={chatBottomRef} />
          </div>

          {/* =========================================================================
              3. ADVANCED AI CHAT COMPOSER (CHATGPT-INSPIRED FLOATING COMPOSER)
          ========================================================================= */}
          <div
            className={`sticky bottom-0 z-20 w-full px-3 sm:px-6 pb-3 pt-2 pointer-events-none transition-colors duration-200 ${
              isDark
                ? "bg-gradient-to-t from-[#0d0e11] via-[#0d0e11]/95 to-transparent"
                : "bg-gradient-to-t from-white via-white/95 to-transparent"
            }`}
          >
            <div className="mx-auto max-w-3xl w-full pointer-events-auto relative">
              {/* Floating Scroll-to-Bottom Button */}
              {showScrollBtn && (
                <div className="absolute -top-12 right-0 sm:right-2 z-30">
                  <button
                    type="button"
                    onClick={() => {
                      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
                      setShowScrollBtn(false);
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer backdrop-blur-md ${
                      isDark
                        ? "bg-neutral-900/90 border-neutral-700 text-neutral-200 hover:text-white shadow-black/40"
                        : "bg-white/95 border-neutral-200 text-neutral-700 hover:text-black shadow-neutral-300/60"
                    }`}
                    title="Scroll to latest message"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}


              {/* Status / Interim Voice Banner */}
              {(statusMessage || interimSpeech || isListening) && (
                <div
                  className={`mb-2 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md border shadow-2xs ${
                    isDark
                      ? "bg-neutral-800/90 border-neutral-700 text-neutral-300"
                      : "bg-neutral-100 border-neutral-200 text-neutral-700"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isListening ? (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-neutral-500 animate-spin" />
                    )}
                    <span className="truncate">
                      {interimSpeech
                        ? `Listening: "${interimSpeech}"`
                        : isListening
                        ? "Listening for voice input... Speak naturally"
                        : statusMessage}
                    </span>
                  </div>
                  {isListening && (
                    <button
                      type="button"
                      onClick={stopVoiceRecognition}
                      className="text-[11px] font-semibold text-red-500 dark:text-red-400 hover:underline"
                    >
                      Done
                    </button>
                  )}
                </div>
              )}

              {/* Active Tool Badge Pill */}
              {activeTool !== "none" && (
                <div className="mb-2 flex items-center gap-1.5 px-1">
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border shadow-2xs ${
                      isDark
                        ? "border-neutral-700 bg-neutral-800 text-neutral-200"
                        : "border-neutral-200 bg-neutral-100 text-neutral-800"
                    }`}
                  >
                    {activeTool === "web" && <Globe className="w-3.5 h-3.5 text-blue-500" />}
                    {activeTool === "image" && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                    {activeTool === "research" && <Compass className="w-3.5 h-3.5 text-purple-500" />}
                    {activeTool === "file" && <FileText className="w-3.5 h-3.5 text-emerald-500" />}
                    {activeTool === "code" && <Code2 className="w-3.5 h-3.5 text-cyan-500" />}
                    <span className="font-semibold">
                      {activeTool === "web" && "Web Search Active"}
                      {activeTool === "image" && "Image Generation Active"}
                      {activeTool === "research" && "Deep Research Active"}
                      {activeTool === "file" && "File Analysis Active"}
                      {activeTool === "code" && "Code Assistance Active"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTool("none")}
                      className="ml-1 p-0.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-black dark:hover:text-white"
                      title="Clear tool mode"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Main Floating Input Card */}
              <div
                className={`relative rounded-3xl border p-2.5 sm:p-3 backdrop-blur-2xl transition-all ${
                  isDark
                    ? "border-neutral-700/80 bg-[#1a1b1f]/95 focus-within:border-neutral-500 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.6)]"
                    : "border-neutral-200/90 bg-white/95 focus-within:border-neutral-400 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                }`}
              >
                {/* Attachment Preview Chips */}
                {attachments.length > 0 && (
                  <div className="mb-2.5 flex flex-wrap gap-2 px-1">
                    {attachments.map((att, idx) => {
                      const isImg = att.type.startsWith("image/");
                      const isPdf = att.type.includes("pdf") || att.name.endsWith(".pdf");
                      const isSheet =
                        att.type.includes("sheet") ||
                        att.type.includes("csv") ||
                        att.name.endsWith(".xlsx") ||
                        att.name.endsWith(".csv");
                      const isDoc =
                        att.type.includes("word") ||
                        att.name.endsWith(".docx") ||
                        att.name.endsWith(".doc") ||
                        att.name.endsWith(".txt");

                      return (
                        <div
                          key={idx}
                          className="group relative flex items-center gap-2 rounded-2xl border border-black/10 dark:border-neutral-700 bg-neutral-100/80 dark:bg-neutral-800/80 p-1.5 pr-2.5 text-xs shadow-2xs transition hover:border-black/20"
                        >
                          {isImg && att.preview ? (
                            <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-black/5">
                              <Image
                                src={att.preview}
                                alt={att.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-neutral-700 border border-black/5 text-neutral-600 dark:text-neutral-200">
                              {isPdf ? (
                                <FileText className="w-4 h-4 text-red-500" />
                              ) : isSheet ? (
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                              ) : isDoc ? (
                                <FileText className="w-4 h-4 text-blue-600" />
                              ) : (
                                <FileCode className="w-4 h-4 text-neutral-500" />
                              )}
                            </div>
                          )}

                          <div className="max-w-[130px] sm:max-w-[180px] truncate">
                            <span className="block truncate font-medium text-neutral-800 dark:text-neutral-200 text-xs">
                              {att.name}
                            </span>
                            {att.size ? (
                              <span className="block text-[10px] text-neutral-400">
                                {formatFileSize(att.size)}
                              </span>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="p-1 rounded-full text-neutral-400 hover:text-red-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                            title="Remove file"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Hidden Categorized File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={pdfInputRef}
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={docInputRef}
                  type="file"
                  multiple
                  accept=".docx,.doc,.txt,.rtf,.odt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={sheetInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={codeInputRef}
                  type="file"
                  multiple
                  accept=".py,.ts,.tsx,.js,.json,.html,.css,.sql,.sh,.bat"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Multiline Auto-Expanding Textarea with Paste & Drag-and-Drop */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleTextareaChange}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      sendMessage();
                    }
                  }}
                  rows={1}
                  placeholder={
                    isListening
                      ? "Listening to voice input..."
                      : activeTool === "image"
                      ? "Describe the visual or modification with pin-to-pin accuracy..."
                      : activeTool === "code"
                      ? "Describe the program, algorithm, or architecture you need..."
                      : activeTool === "research"
                      ? "Enter topic or question for in-depth structured research..."
                      : activeTool === "web"
                      ? "Enter query to search real-time web with citations..."
                      : attachments.length > 0
                      ? "Ask anything about attached files, or describe changes..."
                      : "Ask anything, create files, write code, or generate images..."
                  }
                  className={`w-full resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-neutral-400 max-h-56 min-h-[40px] ${
                    isDark ? "text-white" : "text-black"
                  }`}
                />

                {/* Bottom Controls Bar inside Composer */}
                <div className="flex items-center justify-between pt-1 px-1">
                  {/* Left Controls: Attachment (+) Button & AI Tools Selector */}
                  <div className="flex items-center gap-1.5">
                    {/* Attachment (+) Button */}
                    <div className="relative" data-attachment-menu>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAttachmentMenuOpen(!isAttachmentMenuOpen);
                          setIsToolsMenuOpen(false);
                        }}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                          isAttachmentMenuOpen
                            ? isDark
                              ? "rotate-45 bg-white text-black border-transparent shadow-xs"
                              : "rotate-45 bg-neutral-900 text-white border-transparent shadow-xs"
                            : isDark
                            ? "border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700"
                            : "border-black/10 bg-neutral-100 text-neutral-600 hover:text-black hover:bg-neutral-200"
                        }`}
                        title="Attach images, PDFs, Word docs, sheets, or code"
                      >
                        <Plus className="w-4 h-4 transition-transform duration-200" />
                      </button>

                      {/* Advanced Plus (+) Feature & Media Dropdown Menu */}
                      {isAttachmentMenuOpen && (
                        <div
                          className={`absolute bottom-full left-0 mb-2 w-64 sm:w-72 rounded-2xl border p-2 shadow-2xl backdrop-blur-2xl text-xs z-50 animate-in fade-in zoom-in-95 duration-150 ${
                            isDark
                              ? "border-neutral-700 bg-neutral-900/95 text-neutral-200"
                              : "border-black/10 bg-white/95 text-neutral-800"
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* 1. Live Voice Mode */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsAttachmentMenuOpen(false);
                              router.push("/voice");
                            }}
                            className={`flex items-center gap-3 w-full rounded-xl px-3 py-2 text-left transition cursor-pointer ${
                              isDark ? "hover:bg-neutral-800 text-neutral-200" : "hover:bg-neutral-100 text-neutral-800"
                            }`}
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                              <Radio className="w-4 h-4 animate-pulse" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="block font-semibold text-xs">Live Voice Mode</span>
                              <span className="block text-[10px] text-neutral-400 truncate">Real-time voice conversation</span>
                            </div>
                          </button>

                          {/* 2. Image Studio */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsAttachmentMenuOpen(false);
                              router.push("/studio");
                            }}
                            className={`flex items-center gap-3 w-full rounded-xl px-3 py-2 text-left transition cursor-pointer ${
                              isDark ? "hover:bg-neutral-800 text-neutral-200" : "hover:bg-neutral-100 text-neutral-800"
                            }`}
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="block font-semibold text-xs">Image Studio</span>
                              <span className="block text-[10px] text-neutral-400 truncate">Generate &amp; edit AI artwork</span>
                            </div>
                          </button>

                          {/* 3. Media & Uploads */}
                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.click();
                              setIsAttachmentMenuOpen(false);
                            }}
                            className={`flex items-center gap-3 w-full rounded-xl px-3 py-2 text-left transition cursor-pointer ${
                              isDark ? "hover:bg-neutral-800 text-neutral-200" : "hover:bg-neutral-100 text-neutral-800"
                            }`}
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
                              <FolderArchive className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="block font-semibold text-xs">Media</span>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsAttachmentMenuOpen(false);
                                    router.push("/media");
                                  }}
                                  className="text-[10px] text-blue-500 hover:underline cursor-pointer"
                                  title="Open Media Studio"
                                >
                                  Studio ↗
                                </span>
                              </div>
                              <span className="block text-[10px] text-neutral-400 truncate">Upload images, audio, video &amp; files</span>
                            </div>
                          </button>

                          {/* Divider */}
                          <div className="my-1.5 border-t border-black/[0.06] dark:border-neutral-800" />

                          {/* 4. Voice Settings (ON / OFF) */}
                          <div
                            className={`flex items-center justify-between w-full rounded-xl px-3 py-2 transition ${
                              isDark ? "hover:bg-neutral-800/60" : "hover:bg-neutral-50"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-xl border shrink-0 ${
                                sareEnabled
                                  ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                                  : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                              }`}>
                                <Volume2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="block font-semibold text-xs">Voice Responses</span>
                                <span className="block text-[10px] text-neutral-400 truncate">
                                  {sareEnabled ? "Sare Voice is ON" : "Sare Voice is OFF"}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleSareVoiceMode()}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                sareEnabled ? "bg-emerald-500" : isDark ? "bg-neutral-700" : "bg-neutral-300"
                              }`}
                              title="Toggle voice responses"
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                  sareEnabled ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Divider */}
                          <div className="my-1.5 border-t border-black/[0.06] dark:border-neutral-800" />

                          {/* Quick File Categorized Uploads */}
                          <div className="grid grid-cols-2 gap-1 px-1">
                            <button
                              type="button"
                              onClick={() => {
                                imageInputRef.current?.click();
                                setIsAttachmentMenuOpen(false);
                              }}
                              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] transition cursor-pointer ${
                                isDark ? "hover:bg-neutral-800 text-neutral-300" : "hover:bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                              <span>Images</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                pdfInputRef.current?.click();
                                setIsAttachmentMenuOpen(false);
                              }}
                              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] transition cursor-pointer ${
                                isDark ? "hover:bg-neutral-800 text-neutral-300" : "hover:bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              <FileText className="w-3.5 h-3.5 text-red-500" />
                              <span>PDFs</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                docInputRef.current?.click();
                                setIsAttachmentMenuOpen(false);
                              }}
                              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] transition cursor-pointer ${
                                isDark ? "hover:bg-neutral-800 text-neutral-300" : "hover:bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-500" />
                              <span>Docs</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                sheetInputRef.current?.click();
                                setIsAttachmentMenuOpen(false);
                              }}
                              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] transition cursor-pointer ${
                                isDark ? "hover:bg-neutral-800 text-neutral-300" : "hover:bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Sheets</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Tools Menu Button & Popover */}
                    <div className="relative" data-tools-menu>
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsMenuOpen(!isToolsMenuOpen);
                          setIsAttachmentMenuOpen(false);
                        }}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all ${
                          activeTool !== "none" || isToolsMenuOpen
                            ? isDark
                              ? "border-neutral-600 bg-white text-black shadow-2xs"
                              : "border-neutral-900 bg-neutral-900 text-white shadow-2xs"
                            : isDark
                            ? "border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-700"
                            : "border-black/10 bg-neutral-100/80 text-neutral-700 hover:text-black hover:bg-neutral-200"
                        }`}
                        title="AI Tools & Capabilities"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tools</span>
                      </button>

                      {/* AI Tools Popover */}
                      {isToolsMenuOpen && (
                        <div
                          className={`absolute bottom-full left-0 mb-2 w-64 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-2xl text-xs z-50 animate-in fade-in zoom-in-95 duration-150 ${
                            isDark
                              ? "border-neutral-700 bg-neutral-900/95 text-neutral-200"
                              : "border-black/10 bg-white/95 text-neutral-800"
                          }`}
                        >
                          <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                            AI Capabilities
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTool(activeTool === "web" ? "none" : "web");
                              setIsToolsMenuOpen(false);
                            }}
                            className={`flex items-start gap-2.5 w-full rounded-xl p-2 text-left transition ${
                              activeTool === "web"
                                ? isDark
                                  ? "bg-neutral-800 text-white font-semibold"
                                  : "bg-neutral-100 text-black font-semibold"
                                : isDark
                                ? "hover:bg-neutral-800 text-neutral-300"
                                : "hover:bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            <Globe className="w-4 h-4 text-blue-500 mt-0.5" />
                            <div>
                              <div className="font-medium">Web Search</div>
                              <div className="text-[10px] text-neutral-400">Search real-time web for citations</div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTool(activeTool === "image" ? "none" : "image");
                              setIsToolsMenuOpen(false);
                            }}
                            className={`flex items-start gap-2.5 w-full rounded-xl p-2 text-left transition ${
                              activeTool === "image"
                                ? isDark
                                  ? "bg-neutral-800 text-white font-semibold"
                                  : "bg-neutral-100 text-black font-semibold"
                                : isDark
                                ? "hover:bg-neutral-800 text-neutral-300"
                                : "hover:bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            <Sparkles className="w-4 h-4 text-amber-500 mt-0.5" />
                            <div>
                              <div className="font-medium">Image Generation</div>
                              <div className="text-[10px] text-neutral-400">Realistic Vision &amp; FLUX visuals</div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTool(activeTool === "research" ? "none" : "research");
                              setIsToolsMenuOpen(false);
                            }}
                            className={`flex items-start gap-2.5 w-full rounded-xl p-2 text-left transition ${
                              activeTool === "research"
                                ? isDark
                                  ? "bg-neutral-800 text-white font-semibold"
                                  : "bg-neutral-100 text-black font-semibold"
                                : isDark
                                ? "hover:bg-neutral-800 text-neutral-300"
                                : "hover:bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            <Compass className="w-4 h-4 text-purple-500 mt-0.5" />
                            <div>
                              <div className="font-medium">Deep Research</div>
                              <div className="text-[10px] text-neutral-400">Exhaustive structured synthesis</div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTool(activeTool === "file" ? "none" : "file");
                              setIsToolsMenuOpen(false);
                            }}
                            className={`flex items-start gap-2.5 w-full rounded-xl p-2 text-left transition ${
                              activeTool === "file"
                                ? isDark
                                  ? "bg-neutral-800 text-white font-semibold"
                                  : "bg-neutral-100 text-black font-semibold"
                                : isDark
                                ? "hover:bg-neutral-800 text-neutral-300"
                                : "hover:bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            <FileText className="w-4 h-4 text-emerald-500 mt-0.5" />
                            <div>
                              <div className="font-medium">File Analysis</div>
                              <div className="text-[10px] text-neutral-400">Inspect PDFs, docs &amp; sheets</div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTool(activeTool === "code" ? "none" : "code");
                              setIsToolsMenuOpen(false);
                            }}
                            className={`flex items-start gap-2.5 w-full rounded-xl p-2 text-left transition ${
                              activeTool === "code"
                                ? isDark
                                  ? "bg-neutral-800 text-white font-semibold"
                                  : "bg-neutral-100 text-black font-semibold"
                                : isDark
                                ? "hover:bg-neutral-800 text-neutral-300"
                                : "hover:bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            <Code2 className="w-4 h-4 text-cyan-500 mt-0.5" />
                            <div>
                              <div className="font-medium">Code Assistance</div>
                              <div className="text-[10px] text-neutral-400">Production code, zero emojis</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Controls: Voice Input & Dynamic Send / Stop Button */}
                  <div className="flex items-center gap-2">
                    {/* Speech-to-Text Microphone Button with Live Status Indicator */}
                    <button
                      type="button"
                      onClick={startVoiceRecognition}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                        isListening
                          ? "bg-red-500 text-white shadow-md animate-pulse ring-2 ring-red-400/50"
                          : isDark
                          ? "text-neutral-400 hover:text-white hover:bg-neutral-800"
                          : "text-neutral-500 hover:text-black hover:bg-neutral-100"
                      }`}
                      title={isListening ? "Stop voice listening" : "Voice input (Speech-to-Text)"}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    {/* Dynamic Send / Stop Generation Button */}
                    {loading ? (
                      <button
                        type="button"
                        onClick={stopGeneration}
                        className={`flex h-8 w-8 items-center justify-center rounded-full shadow-md hover:scale-105 active:scale-95 transition-all ring-2 ring-neutral-400/30 ${
                          isDark ? "bg-white text-black" : "bg-neutral-900 text-white"
                        }`}
                        title="Stop generation"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!input.trim() && attachments.length === 0}
                        onClick={() => sendMessage()}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                          input.trim() || attachments.length > 0
                            ? isDark
                              ? "bg-white text-black shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                              : "bg-neutral-900 text-white shadow-md hover:bg-black hover:scale-105 active:scale-95 cursor-pointer"
                            : isDark
                            ? "bg-neutral-800 text-neutral-600 cursor-not-allowed opacity-50"
                            : "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed opacity-60"
                        }`}
                        title="Send message"
                      >
                        <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Small Friendly Disclaimer Description at the Bottom of Message Bar */}
              <p className={`mt-2 text-center text-[11px] leading-normal max-w-xl mx-auto select-none ${
                isDark ? "text-neutral-500" : "text-neutral-400"
              }`}>
                Notice: AI image generation is continuously learning. While we work to bring you 100% perfect images soon,
                we always deliver the best possible quality for your prompt.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* =========================================================================
          4. LIGHTBOX / FULLSCREEN MODAL (WITH DOWNLOAD & SHARE SYMBOLS)
      ========================================================================= */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-8 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightboxImage}
              alt="Fullscreen view"
              width={1024}
              height={1024}
              unoptimized
              className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl"
            />

            {/* Floating Top Control Symbols */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadImage(lightboxImage)}
                className="flex items-center gap-2 rounded-xl bg-black/80 text-white px-3 py-2 text-xs font-semibold backdrop-blur-md hover:bg-black transition"
                title="Download PNG"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: "TATTVA AI Artwork", url: lightboxImage }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(lightboxImage);
                    showToast("Image URI copied 📋");
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-black/80 text-white px-3 py-2 text-xs font-semibold backdrop-blur-md hover:bg-black transition"
                title="Share image"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-xl bg-black/80 text-white hover:bg-black transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PROFILE, SETTINGS, MANAGE ACCOUNT & HELP MODALS (CHATGPT-STYLE)
      ========================================================================= */}

      {/* 1. MY PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setIsProfileModalOpen(false)}>
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl backdrop-blur-2xl transition-all ${
              isDark ? "border-neutral-800 bg-[#121316] text-white" : "border-black/10 bg-white text-black"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">My Profile</h3>
                  <p className="text-[11px] text-neutral-400">Personal details &amp; credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-black dark:hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* User Avatar & Name Banner */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/70 border border-black/5 dark:border-neutral-700">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-neutral-800 to-black text-white text-base font-bold shadow-sm">
                  {userEmail ? userEmail[0].toUpperCase() : "G"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate text-neutral-900 dark:text-white">
                    {userEmail ? (currentUser?.user_metadata?.full_name || userEmail.split("@")[0]) : "Guest User"}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {userEmail || "Guest Session"}
                  </p>
                </div>
                <div className="shrink-0">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    isGuest ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isGuest ? "bg-amber-500" : "bg-emerald-500"}`} />
                    {isGuest ? "Guest" : "Verified Pro"}
                  </span>
                </div>
              </div>

              {/* Account Metadata Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl border border-black/[0.06] dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <span className="block text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Conversations</span>
                  <span className="block text-sm font-bold mt-1 text-neutral-900 dark:text-white">{sessions.length} chats</span>
                </div>
                <div className="p-3 rounded-xl border border-black/[0.06] dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <span className="block text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Security Tier</span>
                  <span className="block text-sm font-bold mt-1 text-emerald-600 dark:text-emerald-400">Supabase RLS</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="rounded-xl border border-black/10 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                >
                  Close
                </button>
                {isGuest ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      router.push("/login");
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-xs font-semibold hover:opacity-90 transition shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Log In to Account</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOG OUT CONFIRMATION MODAL (CHATGPT-STYLE) */}
      {isLogoutConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md transition-opacity animate-in fade-in duration-150"
          onClick={() => setIsLogoutConfirmOpen(false)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl transition-all ${
              isDark ? "border-neutral-800 bg-[#121316] text-white" : "border-black/10 bg-white text-neutral-900"
            }`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mb-4">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">Log out of TATTVA AI?</h3>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              You will be signed out of your account on this device. Your conversations, models, and personal memories remain securely saved in your account.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                  isDark
                    ? "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONVERSATION CONFIRMATION MODAL */}
      {deleteConfirmSession && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md transition-opacity animate-in fade-in duration-150"
          onClick={() => setDeleteConfirmSession(null)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl transition-all ${
              isDark ? "border-neutral-800 bg-[#121316] text-white" : "border-black/10 bg-white text-neutral-900"
            }`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">Delete conversation?</h3>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              This will permanently delete <span className="font-semibold text-neutral-800 dark:text-neutral-200">"{deleteConfirmSession.title}"</span>. This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmSession(null)}
                className={`rounded-xl border px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                  isDark
                    ? "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToDelete = deleteConfirmSession.id;
                  setDeleteConfirmSession(null);
                  performDeleteSession(idToDelete);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URL-BASED SHARE CHAT MODAL */}
      {shareModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md transition-opacity animate-in fade-in duration-150"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl transition-all ${
              isDark ? "border-neutral-800 bg-[#121316] text-white" : "border-black/10 bg-white text-neutral-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Share public link to chat</h3>
                  <p className="text-[11px] text-neutral-400">Anyone with this link will be able to view this conversation.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-5 space-y-3">
              <div className={`flex items-center gap-2 rounded-2xl border p-2 text-xs font-mono select-all ${
                isDark ? "border-neutral-800 bg-neutral-900 text-neutral-300" : "border-neutral-200 bg-neutral-100 text-neutral-800"
              }`}>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent px-2 focus:outline-none truncate"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold text-xs transition cursor-pointer shadow-xs ${
                    shareCopied
                      ? "bg-emerald-600 text-white"
                      : "bg-black dark:bg-white text-white dark:text-black hover:opacity-90"
                  }`}
                >
                  {shareCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                >
                  <span>Preview shared conversation</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.share({
                        title: "TATTVA AI Shared Chat",
                        url: shareUrl,
                      }).catch(() => {});
                    }}
                    className="text-neutral-400 hover:text-black dark:hover:text-white transition cursor-pointer"
                  >
                    Share via system...
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-black/[0.06] dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className={`rounded-xl border px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                  isDark
                    ? "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVED CHATS MODAL */}
      {isArchiveModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md transition-opacity animate-in fade-in duration-150"
          onClick={() => setIsArchiveModalOpen(false)}
        >
          <div
            className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl transition-all max-h-[85vh] flex flex-col ${
              isDark ? "border-neutral-800 bg-[#121316] text-white" : "border-black/10 bg-white text-neutral-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                  <FolderArchive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Archived Conversations</h3>
                  <p className="text-[11px] text-neutral-400">
                    {sessions.filter((s) => s.is_archived).length} archived {sessions.filter((s) => s.is_archived).length === 1 ? "conversation" : "conversations"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 space-y-2 pr-1">
              {sessions.filter((s) => s.is_archived).length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                  <FolderArchive className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No archived conversations</p>
                  <p className="text-[11px] mt-0.5">You can archive any chat from its 3-dot menu</p>
                </div>
              ) : (
                sessions
                  .filter((s) => s.is_archived)
                  .map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-xs transition ${
                        isDark ? "border-neutral-800 bg-neutral-900/60" : "border-neutral-200 bg-neutral-50"
                      }`}
                    >
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="font-semibold truncate text-neutral-900 dark:text-white">{s.title}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          {s.messages.length} messages • Archived {new Date(s.archived_at || s.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => restoreSession(s.id)}
                          className="px-2.5 py-1.5 rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold hover:bg-neutral-100 transition cursor-pointer"
                          title="Restore to chat list"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={(e) => deleteSession(s.id, e)}
                          className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                          title="Permanently delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-black/[0.06] dark:border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className={`rounded-xl border px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                  isDark
                    ? "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE LIBRARY MODAL */}
      {isImageLibraryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md transition-opacity animate-in fade-in duration-150"
          onClick={() => setIsImageLibraryOpen(false)}
        >
          <div
            className={`w-full max-w-4xl rounded-3xl border p-6 shadow-2xl transition-all max-h-[90vh] flex flex-col ${
              isDark ? "border-neutral-800 bg-[#121316] text-white" : "border-black/10 bg-white text-neutral-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Image Studio Library</h3>
                  <p className="text-[11px] text-neutral-400">All artworks created by TATTVA AI across your conversations</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImageLibraryOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto my-4 pr-1">
              {(() => {
                const userImages = sessions.flatMap((s) =>
                  s.messages
                    .filter((m) => m.image)
                    .map((m) => ({
                      id: m.id,
                      image: m.image!,
                      prompt: m.content,
                      timestamp: m.timestamp || s.updatedAt,
                      sessionId: s.id,
                      sessionTitle: s.title,
                      metadata: m.imageMetadata,
                    }))
                );

                if (userImages.length === 0) {
                  return (
                    <div className="text-center py-20 text-neutral-400">
                      <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40 text-amber-500" />
                      <p className="text-sm font-semibold">No images generated yet</p>
                      <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                        Ask TATTVA: "Generate an image of a serene mountain lake at dawn" or click Image Studio in the Plus menu.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {userImages.map((img, idx) => (
                      <div
                        key={img.id || idx}
                        className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 hover:scale-[1.02] shadow-xs flex flex-col ${
                          isDark ? "border-neutral-800 bg-neutral-900" : "border-neutral-200 bg-white"
                        }`}
                      >
                        <div
                          className="relative aspect-square cursor-pointer overflow-hidden bg-black/5"
                          onClick={() => {
                            setLightboxImage(img.image);
                          }}
                        >
                          <Image
                            src={img.image}
                            alt={img.prompt}
                            width={300}
                            height={300}
                            unoptimized
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end text-white text-[11px]">
                            <p className="line-clamp-2 leading-tight">{img.prompt}</p>
                          </div>
                        </div>

                        {/* Image Action Bar */}
                        <div className="p-2 flex items-center justify-between text-xs gap-1 border-t border-black/[0.06] dark:border-neutral-800">
                          <button
                            type="button"
                            onClick={() => {
                              setIsImageLibraryOpen(false);
                              startEditingImage(img.image, img.prompt);
                            }}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                            title="Edit this image in chat"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsImageLibraryOpen(false);
                                createNewChat();
                                sendMessage(img.prompt);
                              }}
                              className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white transition cursor-pointer"
                              title="Start new chat with this prompt"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadImage(img.image)}
                              className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white transition cursor-pointer"
                              title="Download full quality image"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-black/[0.06] dark:border-neutral-800 shrink-0 text-xs text-neutral-400">
              <span>Click any image to enlarge in full-screen lightbox</span>
              <button
                type="button"
                onClick={() => setIsImageLibraryOpen(false)}
                className={`rounded-xl border px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                  isDark
                    ? "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SETTINGS MODAL */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setIsSettingsModalOpen(false)}>
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl backdrop-blur-2xl transition-all ${
              isDark ? "border-neutral-800 bg-[#121316] text-white" : "border-black/10 bg-white text-black"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Preferences &amp; Settings</h3>
                  <p className="text-[11px] text-neutral-400">Customize your TATTVA AI experience</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-black dark:hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              {/* Setting 1: Theme Switcher */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/70 border border-black/5 dark:border-neutral-700">
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">Color Theme</p>
                  <p className="text-[11px] text-neutral-400">Current: {isDark ? "Dark Modern" : "Light Minimalist"}</p>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs hover:bg-neutral-50"
                >
                  {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-neutral-600" />}
                  <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                </button>
              </div>

              {/* Setting 2: Sare Voice Assistant Narration */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/70 border border-black/5 dark:border-neutral-700">
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">Sare Voice Auto-Narration</p>
                  <p className="text-[11px] text-neutral-400">Speak AI responses aloud automatically</p>
                </div>
                <button
                  type="button"
                  onClick={toggleSareVoiceMode}
                  className={`rounded-xl px-3 py-1.5 font-semibold transition cursor-pointer ${
                    sareEnabled
                      ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                      : "border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {sareEnabled ? "Enabled (ON)" : "Disabled (OFF)"}
                </button>
              </div>

              {/* Setting 3: Archived Conversations */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/70 border border-black/5 dark:border-neutral-700">
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">Archived Conversations</p>
                  <p className="text-[11px] text-neutral-400">
                    {sessions.filter((s) => s.is_archived).length} archived {sessions.filter((s) => s.is_archived).length === 1 ? "chat" : "chats"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsModalOpen(false);
                    setIsArchiveModalOpen(true);
                  }}
                  className="rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs hover:bg-neutral-50 transition cursor-pointer"
                >
                  Manage
                </button>
              </div>

              {/* Setting 4: Export Chat Data */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/70 border border-black/5 dark:border-neutral-700">
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">Export Conversations</p>
                  <p className="text-[11px] text-neutral-400">Download all your chat history as JSON</p>
                </div>
                <button
                  type="button"
                  onClick={exportChatData}
                  className="flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs hover:bg-neutral-50 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>

              {/* Setting 5: Model Providers & Custom API Keys (BYOK) */}
              <div className="p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/70 border border-black/5 dark:border-neutral-700 space-y-2.5">
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Custom Model API Keys (BYOK)</span>
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Use your own keys for Gemini 2.5 Flash Image, DashScope Qwen-Image, Stability AI, OpenAI, or Replicate
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Google Gemini API Key (gemini-2.5-flash-image / Nano Banana)</label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={userApiKeys.gemini}
                      onChange={(e) => setUserApiKeys((prev) => ({ ...prev, gemini: e.target.value }))}
                      className="w-full text-xs rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 outline-none font-mono text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Alibaba DashScope API Key (Qwen-Image 2512 / Qwen-Image-Edit)</label>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={userApiKeys.dashscope}
                      onChange={(e) => setUserApiKeys((prev) => ({ ...prev, dashscope: e.target.value }))}
                      className="w-full text-xs rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 outline-none font-mono text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Hugging Face Token (FLUX.1 / Qwen-Image-2512)</label>
                    <input
                      type="password"
                      placeholder="hf_..."
                      value={userApiKeys.huggingface}
                      onChange={(e) => setUserApiKeys((prev) => ({ ...prev, huggingface: e.target.value }))}
                      className="w-full text-xs rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 outline-none font-mono text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Stability AI API Key</label>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={userApiKeys.stability}
                      onChange={(e) => setUserApiKeys((prev) => ({ ...prev, stability: e.target.value }))}
                      className="w-full text-xs rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 outline-none font-mono text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">OpenAI API Key (DALL-E 3)</label>
                    <input
                      type="password"
                      placeholder="sk-proj-..."
                      value={userApiKeys.openai}
                      onChange={(e) => setUserApiKeys((prev) => ({ ...prev, openai: e.target.value }))}
                      className="w-full text-xs rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 outline-none font-mono text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Replicate API Token</label>
                    <input
                      type="password"
                      placeholder="r8_..."
                      value={userApiKeys.replicate}
                      onChange={(e) => setUserApiKeys((prev) => ({ ...prev, replicate: e.target.value }))}
                      className="w-full text-xs rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 outline-none font-mono text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.setItem("tattva_user_api_keys", JSON.stringify(userApiKeys));
                          showToast("Custom API Keys securely saved in browser vault 🔑");
                        } catch {
                          showToast("Failed to save keys");
                        }
                      }}
                      className="flex items-center gap-1 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-1.5 text-xs font-semibold shadow-xs hover:opacity-90 transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save API Keys</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Setting 6: Clear All Conversation History */}
              <div className="flex items-center justify-between p-3 rounded-2xl border border-red-500/20 bg-red-500/5">
                <div>
                  <p className="font-semibold text-red-600 dark:text-red-400">Clear All Chat History</p>
                  <p className="text-[11px] text-neutral-400">Permanently delete stored messages</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure you want to clear all conversation history? This cannot be undone.")) {
                      setMessages([]);
                      setSessions([]);
                      localStorage.removeItem(getStorageKey(userEmail));
                      createNewChat();
                      setIsSettingsModalOpen(false);
                      showToast("All conversation history cleared 🗑️");
                    }
                  }}
                  className="rounded-xl border border-red-500/30 bg-red-600 text-white px-3 py-1.5 font-semibold hover:bg-red-700 transition shadow-xs cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="rounded-xl bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-xs font-semibold shadow-xs hover:opacity-90 transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MANAGE ACCOUNT MODAL */}
      {isManageAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setIsManageAccountModalOpen(false)}>
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl backdrop-blur-2xl transition-all ${
              isDark ? "border-neutral-800 bg-[#121316] text-white" : "border-black/10 bg-white text-black"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Manage Account &amp; Security</h3>
                  <p className="text-[11px] text-neutral-400">Authentication &amp; credential security</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageAccountModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-black dark:hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/70 border border-black/5 dark:border-neutral-700">
                <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Registered Account Email</label>
                <p className="font-semibold text-neutral-900 dark:text-white text-sm">{userEmail}</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Encrypted with Supabase JWT &amp; Row Level Security</p>
              </div>

              {/* Password Reset Trigger */}
              <div className="p-3 rounded-2xl border border-black/10 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Password &amp; Access Recovery</p>
                    <p className="text-[11px] text-neutral-400">Receive a secure reset link in your email</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!userEmail) return;
                      try {
                        const supabase = createClient();
                        const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
                          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
                        });
                        if (error) throw error;
                        showToast("Password reset link sent to your email ✉️");
                        setIsManageAccountModalOpen(false);
                      } catch (err: unknown) {
                        showToast(err instanceof Error ? err.message : "Failed to send reset link");
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Reset Link</span>
                  </button>
                </div>
              </div>

              {/* Logout Button */}
              <div className="pt-2 flex items-center justify-between border-t border-black/[0.06] dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsManageAccountModalOpen(false)}
                  className="rounded-xl border border-black/10 dark:border-neutral-700 px-4 py-2 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white shadow-xs hover:bg-red-700 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. HELP & SUPPORT MODAL */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setIsHelpModalOpen(false)}>
          <div
            className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl backdrop-blur-2xl transition-all ${
              isDark ? "border-neutral-800 bg-[#121316] text-white" : "border-black/10 bg-white text-black"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Help &amp; Documentation</h3>
                  <p className="text-[11px] text-neutral-400">TATTVA AI Quick Reference &amp; Shortcuts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-black dark:hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <h4 className="font-bold text-neutral-900 dark:text-white">Keyboard Shortcuts</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-between">
                    <span>Global Search</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-700 font-mono text-[10px]">Ctrl + K</kbd>
                  </div>
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-between">
                    <span>Send Message</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-700 font-mono text-[10px]">Enter</kbd>
                  </div>
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-between">
                    <span>New Line in Chat</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-700 font-mono text-[10px]">Shift + Enter</kbd>
                  </div>
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-between">
                    <span>Dismiss Popups</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-700 font-mono text-[10px]">Escape</kbd>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-neutral-900 dark:text-white">Supported Binary File Generation</h4>
                <p className="text-[11px] text-neutral-500">
                  Ask TATTVA AI to generate files in natural language: <strong>PDF (ReportLab)</strong>, <strong>DOCX (Word)</strong>, <strong>PPTX (PowerPoint)</strong>, <strong>XLSX (Excel with formulas)</strong>, and <strong>CSV</strong>.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/70 border border-black/5 dark:border-neutral-700">
                <p className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">Creator &amp; Architectural Attribution</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  TATTVA AI was proudly conceptualized, engineered, and developed by <strong>kotapati Gowtham Chowdary</strong>.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsHelpModalOpen(false)}
                  className="rounded-xl bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-xs font-semibold shadow-xs hover:opacity-90 transition"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. SELF-PERSONALIZING MEMORY & INTELLIGENCE DASHBOARD MODAL
      ========================================================================= */}
      {isMemoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsMemoryModalOpen(false)}
        >
          <div
            className={`w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl backdrop-blur-2xl transition-all overflow-hidden ${
              isDark ? "border-neutral-800 bg-[#121316] text-white" : "border-black/10 bg-white text-neutral-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-black/[0.06] dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">Memory &amp; Personalization Engine</h3>
                    <span className="rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 px-2 py-0.5 text-[10px] font-bold">
                      Self-Adapting AI
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    TATTVA continuously learns your technical level, projects, and style to tailor answers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMemoryModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-black dark:hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-black/[0.06] dark:border-neutral-800 shrink-0 bg-neutral-50/50 dark:bg-neutral-900/50 overflow-x-auto">
              <button
                type="button"
                onClick={() => setMemoryTab("memories")}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition shrink-0 ${
                  memoryTab === "memories"
                    ? "border-purple-600 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Memories ({memories.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setMemoryTab("preferences")}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition shrink-0 ${
                  memoryTab === "preferences"
                    ? "border-purple-600 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Personalization Rules</span>
              </button>

              <button
                type="button"
                onClick={() => setMemoryTab("analytics")}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition shrink-0 ${
                  memoryTab === "analytics"
                    ? "border-purple-600 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Feedback Insights</span>
              </button>

              <button
                type="button"
                onClick={() => setMemoryTab("privacy")}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition shrink-0 ${
                  memoryTab === "privacy"
                    ? "border-purple-600 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Privacy &amp; Data</span>
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* TAB 1: MEMORIES LIST & ADD */}
              {memoryTab === "memories" && (
                <div className="space-y-4">
                  {/* Category Filter Chips & Add Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: "all", label: "All" },
                        { id: "preference", label: "Preferences" },
                        { id: "project", label: "Projects" },
                        { id: "technical_level", label: "Tech Level" },
                        { id: "language", label: "Language" },
                        { id: "instruction", label: "Directives" },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedMemoryCategory(cat.id)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                            selectedMemoryCategory === cat.id
                              ? "bg-purple-600 text-white shadow-xs"
                              : "border border-black/10 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddingMemory(!isAddingMemory)}
                      className="flex items-center gap-1 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Memory</span>
                    </button>
                  </div>

                  {/* Add Memory Form Card */}
                  {isAddingMemory && (
                    <div className="rounded-2xl border border-purple-500/30 bg-purple-50/40 dark:bg-purple-950/20 p-4 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300">New Long-Term Memory</span>
                        <button
                          type="button"
                          onClick={() => setIsAddingMemory(false)}
                          className="text-neutral-400 hover:text-black dark:hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        value={newMemoryContent}
                        onChange={(e) => setNewMemoryContent(e.target.value)}
                        placeholder="e.g. Always provide strict TypeScript types, or My project is called FoodFlow..."
                        className="w-full rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2.5 text-xs outline-none focus:border-purple-500 placeholder-neutral-400"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-neutral-500 font-medium">Category:</label>
                          <select
                            value={newMemoryCategory}
                            onChange={(e) => setNewMemoryCategory(e.target.value as MemoryCategory)}
                            className="rounded-lg border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1 text-xs outline-none"
                          >
                            <option value="preference">Preference</option>
                            <option value="project">Project Context</option>
                            <option value="technical_level">Technical Level</option>
                            <option value="language">Language Preference</option>
                            <option value="instruction">Strict Directive</option>
                            <option value="formatting">Formatting Style</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-neutral-500 font-medium">Importance:</label>
                          <select
                            value={newMemoryImportance}
                            onChange={(e) => setNewMemoryImportance(Number(e.target.value))}
                            className="rounded-lg border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-xs outline-none"
                          >
                            {[10, 9, 8, 7, 6, 5, 4, 3].map((num) => (
                              <option key={num} value={num}>
                                {num}/10 {num >= 9 ? "Critical" : num >= 7 ? "High" : "Normal"}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveNewMemory}
                          className="rounded-xl bg-purple-600 px-4 py-1.5 font-semibold text-white shadow-xs hover:bg-purple-700 transition ml-auto"
                        >
                          Save Memory
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Stored Memories */}
                  {memories.length === 0 ? (
                    <div className="text-center py-10 space-y-2 border border-dashed border-black/10 dark:border-neutral-800 rounded-2xl">
                      <Brain className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto" />
                      <p className="text-xs font-semibold text-neutral-500">No long-term memories stored yet</p>
                      <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
                        TATTVA will automatically remember your preferred tools, frameworks, and projects as you chat, or you can add them manually above.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {memories
                        .filter(
                          (m) =>
                            selectedMemoryCategory === "all" || m.category === selectedMemoryCategory
                        )
                        .map((item) => {
                          const isEditing = editingMemoryId === item.id;
                          const categoryColors: Record<string, string> = {
                            preference: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                            project: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                            technical_level: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                            language: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                            instruction: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
                            formatting: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
                          };

                          return (
                            <div
                              key={item.id}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                !item.active
                                  ? "opacity-50 border-black/[0.04] dark:border-neutral-800/50 bg-neutral-100/40 dark:bg-neutral-900/40"
                                  : isDark
                                  ? "border-neutral-800 bg-[#18191d] hover:border-neutral-700"
                                  : "border-black/[0.06] bg-neutral-50/70 hover:border-black/15 shadow-2xs"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${
                                        categoryColors[item.category] || categoryColors.preference
                                      }`}
                                    >
                                      {item.category.replace("_", " ")}
                                    </span>
                                    <span className="text-[10px] text-neutral-400 font-mono">
                                      ✦ {item.importance}/10 importance
                                    </span>
                                    <span className="text-[10px] text-neutral-400">
                                      • {item.source === "extracted" ? "Auto-Learned" : "Manual"}
                                    </span>
                                  </div>

                                  {isEditing ? (
                                    <div className="space-y-2 pt-1">
                                      <textarea
                                        rows={2}
                                        value={editMemoryContent}
                                        onChange={(e) => setEditMemoryContent(e.target.value)}
                                        className="w-full rounded-xl border border-black/15 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 text-xs outline-none focus:border-purple-500"
                                      />
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateMemory(item.id, { content: editMemoryContent })}
                                          className="rounded-lg bg-purple-600 px-3 py-1 text-[11px] font-semibold text-white shadow-xs"
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingMemoryId(null)}
                                          className="rounded-lg border px-3 py-1 text-[11px] font-semibold text-neutral-400"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs font-medium leading-relaxed text-neutral-900 dark:text-neutral-100">
                                      {item.content}
                                    </p>
                                  )}
                                </div>

                                {/* Memory Actions */}
                                {!isEditing && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMemory(item.id, { active: !item.active })}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                                        item.active
                                          ? "text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20"
                                          : "text-neutral-400 bg-neutral-200 dark:bg-neutral-800"
                                      }`}
                                      title={item.active ? "Pause memory" : "Activate memory"}
                                    >
                                      {item.active ? "Active" : "Paused"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMemoryId(item.id);
                                        setEditMemoryContent(item.content);
                                      }}
                                      className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white"
                                      title="Edit memory"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMemory(item.id)}
                                      className="p-1 rounded-lg text-neutral-400 hover:text-red-500"
                                      title="Delete memory"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {memories.length > 0 && (
                    <div className="pt-2 flex justify-between items-center text-xs text-neutral-400">
                      <span>Showing {memories.length} preserved memories</span>
                      <button
                        type="button"
                        onClick={handleClearAllMemories}
                        className="text-red-500 hover:text-red-600 font-semibold text-[11px]"
                      >
                        Clear All Memories
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PERSONALIZATION SETTINGS */}
              {memoryTab === "preferences" && (
                <div className="space-y-4 text-xs">
                  {/* Master Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl border border-black/[0.06] dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <div>
                      <p className="font-bold text-sm text-neutral-900 dark:text-white">Enable Self-Personalization</p>
                      <p className="text-[11px] text-neutral-400">
                        Allow TATTVA AI to continuously adapt answers based on recalled context
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdatePersonalizationSettings({ enabled: !personalizationSettings.enabled })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        personalizationSettings.enabled ? "bg-purple-600" : "bg-neutral-300 dark:bg-neutral-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          personalizationSettings.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Technical Knowledge Depth */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Technical Knowledge Depth
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "beginner", label: "Beginner", desc: "Intuitive analogies, minimal jargon" },
                        { id: "intermediate", label: "Intermediate", desc: "Clear practical depth and code" },
                        { id: "advanced", label: "Advanced", desc: "Architectural context & edge cases" },
                        { id: "expert", label: "Expert Architect", desc: "Zero fluff, high performance rigor" },
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => handleUpdatePersonalizationSettings({ technicalDepth: lvl.id as any })}
                          className={`p-2.5 rounded-xl border text-left transition ${
                            personalizationSettings.technicalDepth === lvl.id
                              ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 shadow-xs"
                              : "border-black/[0.08] dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          }`}
                        >
                          <p className="font-bold">{lvl.label}</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">{lvl.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Response Length */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Explanation Length
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: "concise", label: "Concise" },
                        { id: "balanced", label: "Balanced" },
                        { id: "detailed", label: "Detailed" },
                        { id: "deep_dive", label: "Deep Dive" },
                      ].map((len) => (
                        <button
                          key={len.id}
                          type="button"
                          onClick={() => handleUpdatePersonalizationSettings({ responseLength: len.id as any })}
                          className={`p-2 rounded-xl border text-center transition font-semibold text-xs ${
                            personalizationSettings.responseLength === len.id
                              ? "border-purple-600 bg-purple-600 text-white shadow-xs"
                              : "border-black/[0.08] dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                          }`}
                        >
                          {len.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conversational Tone & Language */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        Conversational Tone
                      </label>
                      <select
                        value={personalizationSettings.tone}
                        onChange={(e) => handleUpdatePersonalizationSettings({ tone: e.target.value as any })}
                        className="w-full rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 text-xs outline-none"
                      >
                        <option value="conversational">Warm &amp; Conversational</option>
                        <option value="direct">Direct &amp; Professional</option>
                        <option value="technical">Technical &amp; Academic</option>
                        <option value="empathic">Empathic &amp; Supportive</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        Language Override
                      </label>
                      <select
                        value={personalizationSettings.preferredLanguage}
                        onChange={(e) => handleUpdatePersonalizationSettings({ preferredLanguage: e.target.value })}
                        className="w-full rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 text-xs outline-none"
                      >
                        <option value="auto">Auto-Detect Language</option>
                        <option value="en">English</option>
                        <option value="te">Telugu (తేట తెలుగు పాండిత్యం)</option>
                        <option value="hi">Hindi (हिन्दी)</option>
                        <option value="ta">Tamil (தமிழ்)</option>
                        <option value="kn">Kannada (ಕನ್ನಡ)</option>
                        <option value="es">Spanish (Español)</option>
                      </select>
                    </div>
                  </div>

                  {/* Custom Permanent Directives */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Custom Permanent Directives
                    </label>
                    <textarea
                      rows={2}
                      value={personalizationSettings.customInstructions || ""}
                      onChange={(e) =>
                        setPersonalizationSettings((prev) => ({ ...prev, customInstructions: e.target.value }))
                      }
                      onBlur={() =>
                        handleUpdatePersonalizationSettings({
                          customInstructions: personalizationSettings.customInstructions,
                        })
                      }
                      placeholder="e.g. Always write code with Tailwind CSS v4, avoid using class components, prioritize async/await..."
                      className="w-full rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2.5 text-xs outline-none focus:border-purple-500 placeholder-neutral-400"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: FEEDBACK INSIGHTS */}
              {memoryTab === "analytics" && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3.5 rounded-2xl border border-black/[0.06] dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                      <p className="text-[10px] uppercase font-bold text-neutral-400">Helpful Rating</p>
                      <p className="text-xl font-bold mt-1 text-emerald-500">
                        {feedbackSummary?.positivePercentage ?? 100}%
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Satisfaction score</p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-black/[0.06] dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                      <p className="text-[10px] uppercase font-bold text-neutral-400">Total Feedback</p>
                      <p className="text-xl font-bold mt-1 text-neutral-900 dark:text-white">
                        {feedbackSummary?.total ?? 0}
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Responses evaluated</p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-black/[0.06] dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                      <p className="text-[10px] uppercase font-bold text-neutral-400">Issues Flagged</p>
                      <p className="text-xl font-bold mt-1 text-amber-500">
                        {feedbackSummary?.negative ?? 0}
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Adjustments made</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 space-y-2">
                    <h4 className="font-bold text-purple-700 dark:text-purple-300">How TATTVA Learns Safely</h4>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      When you submit feedback on a message (e.g. flagging an answer as <strong>Too detailed</strong> or <strong>Too short</strong>), TATTVA automatically updates your personal preference profile to deliver the right depth next time. Core model weights remain untouched and your private data is never shared.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: PRIVACY & DATA EXPORT */}
              {memoryTab === "privacy" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Encrypted &amp; User-Scoped Storage</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      All your recalled memories and preferences are strictly isolated to your authenticated account. They are never pooled, leaked to other users, or used to train shared public models.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl border border-black/[0.06] dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white">Export My Memory Profile</p>
                      <p className="text-[11px] text-neutral-400">Download your personal memories in JSON format</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify({ memories, settings: personalizationSettings }, null, 2)], {
                          type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        triggerDownload(url, `tattva_memories_${Date.now()}.json`, "application/json");
                        setTimeout(() => URL.revokeObjectURL(url), 60000);
                        showToast("Memories exported successfully 📁");
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs hover:bg-neutral-100"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSON</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl border border-red-500/20 bg-red-500/5">
                    <div>
                      <p className="font-bold text-red-600 dark:text-red-400">Purge All Memory Data</p>
                      <p className="text-[11px] text-neutral-400">Permanently delete all stored facts, projects, and directives</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAllMemories}
                      className="rounded-xl border border-red-500/30 bg-red-600 text-white px-3.5 py-1.5 font-semibold hover:bg-red-700 transition shadow-xs"
                    >
                      Purge Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. MESSAGE FEEDBACK MODAL (HOW WAS THIS RESPONSE?)
      ========================================================================= */}
      {feedbackModalTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setFeedbackModalTarget(null)}
        >
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl backdrop-blur-2xl transition-all ${
              isDark ? "border-neutral-800 bg-[#121316] text-white" : "border-black/10 bg-white text-black"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-white ${
                    feedbackModalTarget.initialRating === "positive"
                      ? "bg-emerald-600"
                      : "bg-neutral-800 dark:bg-neutral-700"
                  }`}
                >
                  {feedbackModalTarget.initialRating === "positive" ? (
                    <ThumbsUp className="w-4 h-4" />
                  ) : (
                    <ThumbsDown className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold">Feedback &amp; Personalization</h3>
                  <p className="text-[11px] text-neutral-400">Help TATTVA AI adapt to your preferences</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackModalTarget(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Select what describes this answer best:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "helpful", label: "Helpful", icon: ThumbsUp },
                    { id: "not_helpful", label: "Not helpful", icon: ThumbsDown },
                    { id: "too_detailed", label: "Too detailed", icon: AlignLeft },
                    { id: "too_short", label: "Too short", icon: Maximize2 },
                    { id: "incorrect_answer", label: "Incorrect answer", icon: AlertTriangle },
                    { id: "wrong_language", label: "Wrong language", icon: Languages },
                    { id: "other", label: "Other feedback", icon: MessageSquare },
                  ].map((opt) => {
                    const IconComponent = opt.icon;
                    const isSelected = selectedFeedbackCategory === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedFeedbackCategory(opt.id as FeedbackCategory)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition font-medium ${
                          isSelected
                            ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-xs"
                            : "border-black/[0.08] dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Tell us what you expected, or how TATTVA should adjust for you..."
                  className="w-full rounded-xl border border-black/10 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-2.5 text-xs outline-none focus:border-purple-600 placeholder-neutral-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-black/[0.06] dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setFeedbackModalTarget(null)}
                  className="rounded-xl border border-black/10 dark:border-neutral-800 px-3.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingFeedback}
                  onClick={handleSubmitFeedback}
                  className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50"
                >
                  {isSubmittingFeedback ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit &amp; Adapt</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
