"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Save,
  Download,
  Share2,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Table as TableIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Search,
  Printer,
  FileText,
  FileDown,
  RotateCcw,
  Check,
  ChevronDown,
  Eye,
  Columns,
  Maximize2,
  Type,
} from "lucide-react";
import { WordDocumentContent, WorkspaceItem } from "../../types";
import { saveWorkspaceItem } from "../../storage";

interface WordEditorProps {
  item?: WorkspaceItem<WordDocumentContent>;
  onSave?: (item: WorkspaceItem<WordDocumentContent>) => void;
  onBack?: () => void;
}

export function WordEditor({ item, onSave, onBack }: WordEditorProps) {
  const [title, setTitle] = useState(item?.name || "Untitled Document");
  const [author, setAuthor] = useState(item?.content?.author || "TATTVA Author");
  const [htmlContent, setHtmlContent] = useState(
    item?.content?.html ||
      `<h1>Executive Document Title</h1>
<p class="lead">Begin typing your comprehensive report, research document, or article...</p>
<hr />
<h2>1. Introduction & Overview</h2>
<p>This document is authored with TATTVA Word Editor. Use the ribbon controls above to format text, insert tables, add headings, and export standard DOCX/PDF files.</p>
<h2>2. Strategic Insights</h2>
<ul>
  <li>Clear typography with standard page dimensions.</li>
  <li>Real-time word and character telemetry.</li>
  <li>Verified Office Open XML and PDF compilation.</li>
</ul>`
  );

  const [activeTab, setActiveTab] = useState<"FILE" | "HOME" | "INSERT" | "LAYOUT" | "VIEW">("HOME");
  const [fontSize, setFontSize] = useState("16");
  const [fontFamily, setFontFamily] = useState("Calibri, sans-serif");
  const [margins, setMargins] = useState<"normal" | "narrow" | "wide">("normal");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  // Compute word & char count
  const updateCounts = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || "";
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(text.length);
    }
  }, []);

  useEffect(() => {
    updateCounts();
  }, [htmlContent, updateCounts]);

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
      setSaveStatus("unsaved");
      updateCounts();
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
      setSaveStatus("unsaved");
      updateCounts();
    }
  };

  const handleSave = () => {
    setSaveStatus("saving");
    setStatusMessage("Saving document to workspace vault...");

    const updatedItem = saveWorkspaceItem({
      id: item?.id,
      name: title,
      app: "word",
      format: "docx",
      content: {
        title,
        author,
        html: htmlContent,
        fontSize: Number(fontSize),
        fontFamily,
        margins,
        orientation,
        wordCount,
        charCount,
      },
    });

    if (onSave) onSave(updatedItem as WorkspaceItem<WordDocumentContent>);

    setSaveStatus("saved");
    setStatusMessage("Document saved successfully! ✓");
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleExport = async (targetFormat: "docx" | "pdf" | "txt") => {
    setStatusMessage(`Compiling verified ${targetFormat.toUpperCase()} package...`);
    try {
      const res = await fetch("/api/workspace/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: targetFormat,
          title,
          content: { html: htmlContent },
        }),
      });

      if (!res.ok) throw new Error("Compilation failed");
      const data = await res.json();

      if (data.dataUri) {
        const a = document.createElement("a");
        a.href = data.dataUri;
        a.download = data.filename || `${title}.${targetFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setStatusMessage(`Downloaded ${data.filename} ✓`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err: any) {
      setStatusMessage(`Export failed: ${err.message}`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleInsertTable = () => {
    const tableHtml = `
      <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; margin: 12px 0;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th>Column 1</th>
            <th>Column 2</th>
            <th>Column 3</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Data A</td><td>Data B</td><td>Data C</td></tr>
          <tr><td>Data D</td><td>Data E</td><td>Data F</td></tr>
        </tbody>
      </table>
    `;
    executeCommand("insertHTML", tableHtml);
  };

  const handleInsertImage = () => {
    const url = prompt("Enter image URL:", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80");
    if (url) {
      executeCommand("insertImage", url);
    }
  };

  const handleInsertLink = () => {
    const url = prompt("Enter link URL:", "https://tattva-ai.com");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6] text-neutral-900 select-none font-sans overflow-hidden">
      {/* 1. TOP BLUE TITLE BAR (Word #185ABD) */}
      <header className="bg-[#185ABD] text-white px-3 py-1.5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded hover:bg-black/20 text-white transition active:scale-95"
            title="Back to Workspace"
          >
            ←
          </button>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/20 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>Word</span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaveStatus("unsaved");
            }}
            className="bg-transparent border-0 focus:outline-none hover:bg-black/15 focus:bg-black/25 px-2 py-0.5 rounded text-white font-semibold text-xs sm:text-sm truncate cursor-text max-w-xs sm:max-w-md"
            title="Click to rename document"
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1 rounded bg-[#2B579A] hover:bg-[#3462a8] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Save Document (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport("docx")}
            className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/35 text-white text-xs font-semibold transition flex items-center gap-1 active:scale-95"
            title="Export DOCX file"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">DOCX</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport("pdf")}
            className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/35 text-white text-xs font-semibold transition flex items-center gap-1 active:scale-95"
            title="Export PDF file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="p-1 rounded hover:bg-black/20 text-white transition active:scale-95"
            title="Print Document (Ctrl+P)"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. NOTIFICATION TOAST */}
      {statusMessage && (
        <div className="bg-sky-50 border-b border-sky-200 px-4 py-1.5 text-xs text-sky-800 flex items-center justify-between shrink-0">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-sky-600 hover:text-sky-900 font-bold">
            ×
          </button>
        </div>
      )}

      {/* 3. WORD RIBBON MENU TABS */}
      <div className="bg-[#FFFFFF] border-b border-neutral-300 shrink-0 shadow-xs">
        <div className="flex items-center gap-1 px-3 pt-1 text-xs font-semibold text-neutral-600 overflow-x-auto scrollbar-none">
          {(["FILE", "HOME", "INSERT", "LAYOUT", "VIEW"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-t transition ${
                activeTab === tab
                  ? "bg-[#F3F4F6] text-[#185ABD] border-b-2 border-[#185ABD] font-bold"
                  : "hover:bg-neutral-100 text-neutral-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 4. RIBBON ACTIONS PANEL */}
        <div className="bg-[#F9FAFB] p-2 flex items-center gap-2 border-t border-neutral-200 overflow-x-auto text-xs text-neutral-800">
          {activeTab === "HOME" && (
            <>
              {/* Undo / Redo */}
              <div className="flex items-center gap-0.5 pr-2 border-r border-neutral-300">
                <button
                  type="button"
                  onClick={() => executeCommand("undo")}
                  className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 active:scale-95"
                  title="Undo"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("redo")}
                  className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 active:scale-95"
                  title="Redo"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Font Family & Size */}
              <div className="flex items-center gap-1 pr-2 border-r border-neutral-300">
                <select
                  value={fontFamily}
                  onChange={(e) => {
                    setFontFamily(e.target.value);
                    executeCommand("fontName", e.target.value);
                  }}
                  className="h-7 px-2 border border-neutral-300 rounded bg-white text-xs font-medium focus:outline-none"
                >
                  <option value="Calibri, sans-serif">Calibri</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="'Courier New', monospace">Courier New</option>
                  <option value="Georgia, serif">Georgia</option>
                </select>

                <select
                  value={fontSize}
                  onChange={(e) => {
                    setFontSize(e.target.value);
                    executeCommand("fontSize", "4");
                  }}
                  className="h-7 px-1.5 border border-neutral-300 rounded bg-white text-xs font-medium focus:outline-none"
                >
                  <option value="12">12</option>
                  <option value="14">14</option>
                  <option value="16">16</option>
                  <option value="18">18</option>
                  <option value="24">24</option>
                  <option value="32">32</option>
                </select>
              </div>

              {/* Basic Styles */}
              <div className="flex items-center gap-0.5 pr-2 border-r border-neutral-300">
                <button
                  type="button"
                  onClick={() => executeCommand("bold")}
                  className="p-1.5 rounded hover:bg-neutral-200 font-bold active:scale-95"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("italic")}
                  className="p-1.5 rounded hover:bg-neutral-200 italic active:scale-95"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("underline")}
                  className="p-1.5 rounded hover:bg-neutral-200 underline active:scale-95"
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("strikeThrough")}
                  className="p-1.5 rounded hover:bg-neutral-200 active:scale-95"
                  title="Strikethrough"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Headings */}
              <div className="flex items-center gap-1 pr-2 border-r border-neutral-300">
                <button
                  type="button"
                  onClick={() => executeCommand("formatBlock", "<h1>")}
                  className="px-2 py-1 rounded hover:bg-neutral-200 font-bold text-xs"
                  title="Heading 1"
                >
                  H1
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("formatBlock", "<h2>")}
                  className="px-2 py-1 rounded hover:bg-neutral-200 font-bold text-xs"
                  title="Heading 2"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("formatBlock", "<p>")}
                  className="px-2 py-1 rounded hover:bg-neutral-200 text-xs"
                  title="Normal Text"
                >
                  Normal
                </button>
              </div>

              {/* Alignment */}
              <div className="flex items-center gap-0.5 pr-2 border-r border-neutral-300">
                <button
                  type="button"
                  onClick={() => executeCommand("justifyLeft")}
                  className="p-1.5 rounded hover:bg-neutral-200"
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("justifyCenter")}
                  className="p-1.5 rounded hover:bg-neutral-200"
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("justifyRight")}
                  className="p-1.5 rounded hover:bg-neutral-200"
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("justifyFull")}
                  className="p-1.5 rounded hover:bg-neutral-200"
                  title="Justify"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lists */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => executeCommand("insertUnorderedList")}
                  className="p-1.5 rounded hover:bg-neutral-200"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("insertOrderedList")}
                  className="p-1.5 rounded hover:bg-neutral-200"
                  title="Numbered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {activeTab === "INSERT" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInsertTable}
                className="px-2.5 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100 flex items-center gap-1.5 font-medium"
              >
                <TableIcon className="w-3.5 h-3.5 text-[#185ABD]" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={handleInsertImage}
                className="px-2.5 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100 flex items-center gap-1.5 font-medium"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Picture</span>
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                className="px-2.5 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100 flex items-center gap-1.5 font-medium"
              >
                <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Link</span>
              </button>
              <button
                type="button"
                onClick={() => executeCommand("insertHorizontalRule")}
                className="px-2.5 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100 font-medium"
              >
                Horizontal Rule
              </button>
            </div>
          )}

          {activeTab === "LAYOUT" && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-neutral-600">Margins:</span>
                <select
                  value={margins}
                  onChange={(e) => setMargins(e.target.value as any)}
                  className="h-7 px-2 border border-neutral-300 rounded bg-white"
                >
                  <option value="normal">Normal (1 in)</option>
                  <option value="narrow">Narrow (0.5 in)</option>
                  <option value="wide">Wide (1.5 in)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-medium text-neutral-600">Orientation:</span>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as any)}
                  className="h-7 px-2 border border-neutral-300 rounded bg-white"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === "FILE" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1 rounded bg-[#185ABD] text-white font-bold"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => handleExport("docx")}
                className="px-3 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100"
              >
                Download DOCX
              </button>
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                className="px-3 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => handleExport("txt")}
                className="px-3 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100"
              >
                Download Plain Text
              </button>
            </div>
          )}

          {activeTab === "VIEW" && (
            <div className="flex items-center gap-3 text-neutral-600">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked readOnly className="rounded" />
                <span>Print Layout</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked readOnly className="rounded" />
                <span>Ruler Guides</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* 5. MAIN DOCUMENT WORKSPACE CANVAS */}
      <div className="flex-1 overflow-auto p-4 sm:p-10 flex justify-center bg-[#E5E7EB]">
        {/* Printable Paper Surface (A4 Dimensions Proportional) */}
        <div
          className={`bg-white shadow-xl rounded border border-neutral-300 min-h-[950px] transition-all duration-150 flex flex-col justify-between ${
            orientation === "portrait"
              ? "w-full max-w-[820px] p-8 sm:p-16"
              : "w-full max-w-[1100px] p-8 sm:p-14"
          } ${
            margins === "narrow" ? "p-4 sm:p-8" : margins === "wide" ? "p-10 sm:p-20" : ""
          }`}
          style={{ fontFamily }}
        >
          {/* Header */}
          <div className="text-[11px] font-mono text-neutral-400 border-b border-neutral-200 pb-2 mb-6 flex justify-between">
            <span>{title}</span>
            <span>TATTVA AI Intelligence Suite</span>
          </div>

          {/* Editable Content Region */}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
            className="flex-1 focus:outline-none leading-relaxed text-neutral-900 prose prose-neutral max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-p:my-2 cursor-text"
            style={{ fontSize: `${fontSize}px` }}
          />

          {/* Footer */}
          <div className="text-[11px] font-mono text-neutral-400 border-t border-neutral-200 pt-2 mt-8 flex justify-between">
            <span>Page 1 of 1</span>
            <span>Confidential & Verified</span>
          </div>
        </div>
      </div>

      {/* 6. BOTTOM WORD STATUS BAR */}
      <footer className="h-6 bg-[#185ABD] text-white flex items-center justify-between px-3 text-[11px] font-medium shrink-0 shadow-inner">
        <div className="flex items-center gap-3">
          <span>PAGE 1 OF 1</span>
          <span>•</span>
          <span>{wordCount} WORDS</span>
          <span>•</span>
          <span>{charCount} CHARACTERS</span>
          <span>•</span>
          <span className="hidden sm:inline">ENGLISH (US)</span>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span>{saveStatus === "saved" ? "✓ Saved to Vault" : saveStatus === "saving" ? "Saving..." : "Unsaved"}</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">100% Zoom</span>
        </div>
      </footer>
    </div>
  );
}

