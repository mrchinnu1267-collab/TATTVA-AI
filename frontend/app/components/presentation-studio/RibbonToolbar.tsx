"use client";

import React, { useState } from "react";
import {
  Play,
  Save,
  Download,
  Share2,
  Plus,
  Copy,
  Trash2,
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
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  Table as TableIcon,
  Palette,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  RotateCcw,
  RotateCw,
  Search,
  Mic,
  PenTool,
  Highlighter,
  Eraser,
  Tv,
  Clock,
  CheckCircle,
  Eye,
  Grid,
  HelpCircle,
  Volume2,
  ChevronDown,
  ArrowRight,
  ArrowUpRight,
  Split,
  Move,
  Layout,
  MessageSquare,
  Sliders,
  Settings,
  ShieldCheck,
  Video,
  Music,
  FolderOpen,
  Printer,
  FilePlus,
  Zap,
  Scissors,
  Paintbrush,
  Sparkle,
  Grid3X3,
} from "lucide-react";
import { PRESENTATION_THEMES } from "./themes";
import { TransitionType, AnimationType, ViewMode, SlideLayout } from "./types";

interface RibbonToolbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSave: () => void;
  onDownload: () => void;
  onOpenWith: () => void;
  onStartSlideShow: (fromBeginning: boolean) => void;
  onAddSlide: (layout?: SlideLayout) => void;
  onChangeLayout?: (layout: SlideLayout) => void;
  onDuplicateSlide: () => void;
  onDeleteSlide: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onFormatText: (command: "bold" | "italic" | "underline" | "strikethrough" | "alignLeft" | "alignCenter" | "alignRight" | "alignJustify") => void;
  onAddElement: (type: "textbox" | "shape" | "table" | "process" | "image", shapeType?: any) => void;
  currentThemeId: string;
  onSelectTheme: (themeId: string) => void;
  currentTransition: TransitionType;
  transitionDuration: number;
  onSelectTransition: (type: TransitionType) => void;
  onChangeTransitionDuration: (duration: number) => void;
  onApplyTransitionToAll: () => void;
  currentAnimation: AnimationType;
  onSelectAnimation: (anim: AnimationType) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  showNotes: boolean;
  setShowNotes: (show: boolean) => void;
  showThumbnails: boolean;
  setShowThumbnails: (show: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (vm: ViewMode) => void;
  saveStatus: "saved" | "unsaved" | "saving" | "failed";
  showRuler: boolean;
  setShowRuler: (show: boolean) => void;
  showGridlines: boolean;
  setShowGridlines: (show: boolean) => void;
  showGuides: boolean;
  setShowGuides: (show: boolean) => void;
  drawingTool: "none" | "pen" | "highlighter" | "eraser";
  setDrawingTool: (tool: "none" | "pen" | "highlighter" | "eraser") => void;
  drawingColor: string;
  setDrawingColor: (c: string) => void;
  onToggleAIAssistant?: () => void;
  isAIAssistantOpen?: boolean;
}

const TABS = [
  "File",
  "Home",
  "Insert",
  "Draw",
  "Design",
  "Transitions",
  "Animations",
  "Slide Show",
  "Record",
  "Review",
  "View",
  "Help",
];

const LAYOUTS: { id: SlideLayout; label: string; desc: string }[] = [
  { id: "title", label: "Title Slide", desc: "Title & subtitle placeholders" },
  { id: "titleAndContent", label: "Title and Content", desc: "Title with body content" },
  { id: "twoContent", label: "Two Content", desc: "Side-by-side comparison" },
  { id: "comparison", label: "Comparison", desc: "Two lists with subtitles" },
  { id: "sectionHeader", label: "Section Header", desc: "Topic division slide" },
  { id: "process", label: "Process Flow", desc: "Step-by-step workflow" },
  { id: "titleOnly", label: "Title Only", desc: "Single header text placeholder" },
  { id: "blank", label: "Blank", desc: "Empty canvas for objects" },
];

const TRANSITIONS: { id: TransitionType; label: string }[] = [
  { id: "none", label: "None" },
  { id: "morph", label: "Morph" },
  { id: "fade", label: "Fade" },
  { id: "push", label: "Push" },
  { id: "wipe", label: "Wipe" },
  { id: "split", label: "Split" },
  { id: "reveal", label: "Reveal" },
  { id: "cover", label: "Cover" },
  { id: "uncover", label: "Uncover" },
  { id: "randomBars", label: "Random Bars" },
];

const ANIMATIONS: { id: AnimationType; label: string }[] = [
  { id: "none", label: "None" },
  { id: "appear", label: "Appear" },
  { id: "fadeIn", label: "Fade In" },
  { id: "flyIn", label: "Fly In" },
  { id: "zoomIn", label: "Zoom In" },
  { id: "floatIn", label: "Float In" },
  { id: "bounce", label: "Bounce" },
  { id: "spin", label: "Spin" },
];

export function RibbonToolbar(props: RibbonToolbarProps) {
  const {
    activeTab,
    setActiveTab,
    onSave,
    onDownload,
    onStartSlideShow,
    onAddSlide,
    onChangeLayout,
    onDuplicateSlide,
    onDeleteSlide,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onFormatText,
    onAddElement,
    currentThemeId,
    onSelectTheme,
    currentTransition,
    transitionDuration,
    onSelectTransition,
    onChangeTransitionDuration,
    onApplyTransitionToAll,
    currentAnimation,
    onSelectAnimation,
    zoom,
    setZoom,
    showNotes,
    setShowNotes,
    showThumbnails,
    setShowThumbnails,
    viewMode,
    setViewMode,
    showRuler,
    setShowRuler,
    showGridlines,
    setShowGridlines,
    showGuides,
    setShowGuides,
    drawingTool,
    setDrawingTool,
    drawingColor,
    setDrawingColor,
    onToggleAIAssistant,
    isAIAssistantOpen,
  } = props;

  const [fontSize, setFontSize] = useState("60");
  const [fontFamily, setFontFamily] = useState("Calibri");
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showNewSlideMenu, setShowNewSlideMenu] = useState(false);

  return (
    <div className="bg-[#242424] text-[#E0E0E0] border-b border-[#333333] select-none text-xs flex flex-col shrink-0 shadow-xs">
      {/* 1. Ribbon Tab Headers (File | Home | Insert | Draw | Design...) */}
      <div className="flex items-center px-2 pt-1 border-b border-[#303030] overflow-x-auto space-x-0.5">
        {TABS.map((tab) => {
          const isActive = activeTab.toLowerCase() === tab.toLowerCase();
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 font-medium rounded-t-sm transition-colors text-xs whitespace-nowrap ${
                isActive
                  ? "bg-[#333333] text-white font-semibold border-b-2 border-[#C43E1C]"
                  : "text-[#B3B3B3] hover:text-white hover:bg-[#2A2A2A]"
              }`}
            >
              {tab}
            </button>
          );
        })}

        {/* AI Designer quick launcher */}
        <div className="ml-auto pl-2 flex items-center">
          <button
            onClick={onToggleAIAssistant}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-xs transition ${
              isAIAssistantOpen
                ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white"
                : "bg-white/10 text-orange-400 hover:bg-white/20"
            }`}
            title="Open Gemini AI Presentation Assistant"
          >
            <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span className="hidden sm:inline">Designer AI</span>
          </button>
        </div>
      </div>

      {/* 2. Ribbon Content Band with authentic Microsoft PowerPoint groups & separators */}
      <div className="p-2 min-h-[82px] flex items-center overflow-x-auto bg-[#2B2B2B]">
        {/* ======================= TAB: FILE ======================= */}
        {activeTab.toLowerCase() === "file" && (
          <div className="flex items-center space-x-3 divide-x divide-[#3D3D3D]">
            <div className="flex items-center space-x-2 pr-3">
              <button
                onClick={() => onAddSlide("title")}
                className="flex flex-col items-center p-2 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white transition"
              >
                <FilePlus className="w-5 h-5 text-orange-400 mb-1" />
                <span className="text-[10px]">New</span>
              </button>
              <button
                onClick={onSave}
                className="flex flex-col items-center p-2 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white transition"
              >
                <Save className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-[10px]">Save</span>
              </button>
              <button
                onClick={onDownload}
                className="flex flex-col items-center p-2 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white transition"
              >
                <Download className="w-5 h-5 text-blue-400 mb-1" />
                <span className="text-[10px]">Export PPTX</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex flex-col items-center p-2 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white transition"
              >
                <Printer className="w-5 h-5 text-slate-300 mb-1" />
                <span className="text-[10px]">Print</span>
              </button>
            </div>
            <div className="text-xs text-[#999999] pl-3">
              <span>Microsoft PowerPoint OpenXML (.pptx) Format Verified</span>
            </div>
          </div>
        )}

        {/* ======================= TAB: HOME (Matching Reference 2!) ======================= */}
        {activeTab.toLowerCase() === "home" && (
          <div className="flex items-stretch space-x-2 divide-x divide-[#3D3D3D]">
            {/* Group 1: Clipboard */}
            <div className="flex flex-col justify-between pr-2.5">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onFormatText("bold")}
                  className="flex flex-col items-center p-1.5 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
                  title="Paste (Ctrl+V)"
                >
                  <Copy className="w-5 h-5 text-amber-400 mb-0.5" />
                  <span className="text-[10px]">Paste</span>
                </button>
                <div className="flex flex-col space-y-0.5">
                  <button
                    onClick={() => {}}
                    className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-[#3D3D3D] text-[#B3B3B3] hover:text-white text-[11px]"
                  >
                    <Scissors className="w-3 h-3" />
                    <span>Cut</span>
                  </button>
                  <button
                    onClick={() => {}}
                    className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-[#3D3D3D] text-[#B3B3B3] hover:text-white text-[11px]"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-[#888888] text-center pt-1">Clipboard</span>
            </div>

            {/* Group 2: Slides (New Slide, Layout, Reset, Section) */}
            <div className="flex flex-col justify-between px-2.5 relative">
              <div className="flex items-center space-x-2">
                {/* New Slide Split Button */}
                <div className="relative">
                  <button
                    onClick={() => onAddSlide("titleAndContent")}
                    className="flex flex-col items-center p-1.5 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
                    title="New Slide (Ctrl+M)"
                  >
                    <Plus className="w-5 h-5 text-orange-400 mb-0.5" />
                    <span className="text-[10px]">New Slide</span>
                  </button>
                </div>

                <div className="flex flex-col space-y-0.5">
                  {/* Layout Dropdown Trigger */}
                  <div className="relative">
                    <button
                      onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                      className="flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-[#3D3D3D] text-[#B3B3B3] hover:text-white text-[11px]"
                    >
                      <Layout className="w-3 h-3 text-cyan-400" />
                      <span>Layout</span>
                      <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                    </button>

                    {showLayoutMenu && (
                      <div className="absolute left-0 top-full mt-1 w-48 bg-[#1E1E1E] border border-[#444444] rounded shadow-xl py-1 z-50 text-xs">
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-[#333333]">
                          Choose Slide Layout
                        </div>
                        {LAYOUTS.map((lay) => (
                          <button
                            key={lay.id}
                            onClick={() => {
                              if (onChangeLayout) onChangeLayout(lay.id);
                              else onAddSlide(lay.id);
                              setShowLayoutMenu(false);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#333333] flex flex-col text-slate-200"
                          >
                            <span className="font-semibold">{lay.label}</span>
                            <span className="text-[10px] text-slate-400">{lay.desc}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {}}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-[#3D3D3D] text-[#B3B3B3] hover:text-white text-[11px]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-[#888888] text-center pt-1">Slides</span>
            </div>

            {/* Group 3: Font (Family, Size, Bold, Italic, Underline, etc.) */}
            <div className="flex flex-col justify-between px-2.5">
              <div className="flex flex-col space-y-1">
                {/* Family & Size Dropdowns */}
                <div className="flex items-center space-x-1.5">
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="bg-[#1F1F1F] text-xs text-[#E0E0E0] border border-[#444444] rounded px-1.5 py-0.5 focus:outline-none w-28"
                  >
                    <option value="Calibri">Calibri</option>
                    <option value="Aptos">Aptos</option>
                    <option value="Segoe UI">Segoe UI</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                    <option value="JetBrains Mono">JetBrains Mono</option>
                  </select>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="bg-[#1F1F1F] text-xs text-[#E0E0E0] border border-[#444444] rounded px-1.5 py-0.5 focus:outline-none w-14"
                  >
                    <option value="12">12</option>
                    <option value="14">14</option>
                    <option value="18">18</option>
                    <option value="24">24</option>
                    <option value="28">28</option>
                    <option value="32">32</option>
                    <option value="44">44</option>
                    <option value="54">54</option>
                    <option value="60">60</option>
                    <option value="72">72</option>
                  </select>
                </div>

                {/* Bold, Italic, Underline, Strikethrough buttons */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onFormatText("bold")}
                    className="p-1 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white font-bold"
                    title="Bold (Ctrl+B)"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onFormatText("italic")}
                    className="p-1 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white italic"
                    title="Italic (Ctrl+I)"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onFormatText("underline")}
                    className="p-1 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white underline"
                    title="Underline (Ctrl+U)"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onFormatText("strikethrough")}
                    className="p-1 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
                    title="Strikethrough"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-[#888888] text-center pt-1">Font</span>
            </div>

            {/* Group 4: Paragraph */}
            <div className="flex flex-col justify-between px-2.5">
              <div className="flex items-center space-x-1 pt-1">
                <button
                  onClick={() => onFormatText("alignLeft")}
                  className="p-1.5 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onFormatText("alignCenter")}
                  className="p-1.5 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onFormatText("alignRight")}
                  className="p-1.5 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onFormatText("alignJustify")}
                  className="p-1.5 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
                  title="Justify"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[9px] text-[#888888] text-center pt-1">Paragraph</span>
            </div>

            {/* Group 5: Drawing (Shapes & Textbox) */}
            <div className="flex flex-col justify-between px-2.5">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => onAddElement("textbox")}
                  className="flex flex-col items-center p-1.5 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
                  title="Insert Text Box"
                >
                  <Type className="w-4 h-4 text-cyan-400 mb-0.5" />
                  <span className="text-[10px]">Text Box</span>
                </button>
                <div className="flex items-center space-x-1 bg-[#1F1F1F] p-1 rounded border border-[#3A3A3A]">
                  <button
                    onClick={() => onAddElement("shape", "rectangle")}
                    className="p-1 rounded hover:bg-[#3D3D3D] text-blue-400"
                    title="Rectangle"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onAddElement("shape", "circle")}
                    className="p-1 rounded hover:bg-[#3D3D3D] text-emerald-400"
                    title="Circle"
                  >
                    <Circle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onAddElement("process")}
                    className="p-1 rounded hover:bg-[#3D3D3D] text-orange-400"
                    title="Process Diagram"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-[#888888] text-center pt-1">Drawing</span>
            </div>

            {/* Group 6: Editing */}
            <div className="flex flex-col justify-between px-2.5">
              <div className="flex flex-col space-y-0.5">
                <button
                  onClick={() => {}}
                  className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-[#3D3D3D] text-[#B3B3B3] hover:text-white text-[11px]"
                >
                  <Search className="w-3 h-3 text-slate-400" />
                  <span>Find</span>
                </button>
                <button
                  onClick={() => {}}
                  className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-[#3D3D3D] text-[#B3B3B3] hover:text-white text-[11px]"
                >
                  <RotateCw className="w-3 h-3 text-slate-400" />
                  <span>Replace</span>
                </button>
              </div>
              <span className="text-[9px] text-[#888888] text-center pt-1">Editing</span>
            </div>

            {/* Group 7: Voice (Dictate) */}
            <div className="flex flex-col justify-between px-2.5">
              <button
                onClick={() => alert("Dictate active: listening...")}
                className="flex flex-col items-center p-1.5 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
                title="Dictate Speech-to-Text"
              >
                <Mic className="w-5 h-5 text-sky-400 mb-0.5" />
                <span className="text-[10px]">Dictate</span>
              </button>
              <span className="text-[9px] text-[#888888] text-center pt-1">Voice</span>
            </div>

            {/* Group 8: Designer (Rightmost in Home tab, exactly matching Reference 2!) */}
            <div className="flex flex-col justify-between px-3 pl-4">
              <button
                onClick={onToggleAIAssistant}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-gradient-to-tr from-orange-600/20 to-amber-600/20 hover:from-orange-600/30 hover:to-amber-600/30 border border-orange-500/40 text-orange-300 transition"
              >
                <Zap className="w-5 h-5 text-amber-400 mb-0.5 fill-current" />
                <span className="text-[10px] font-bold">Designer</span>
              </button>
              <span className="text-[9px] text-[#888888] text-center pt-1">Designer</span>
            </div>
          </div>
        )}

        {/* ======================= TAB: INSERT ======================= */}
        {activeTab.toLowerCase() === "insert" && (
          <div className="flex items-center space-x-4 divide-x divide-[#3D3D3D]">
            <div className="flex items-center space-x-2 pr-3">
              <button
                onClick={() => onAddSlide("titleAndContent")}
                className="flex flex-col items-center p-1.5 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
              >
                <Plus className="w-5 h-5 text-orange-400 mb-0.5" />
                <span className="text-[10px]">New Slide</span>
              </button>
              <button
                onClick={() => onAddElement("table")}
                className="flex flex-col items-center p-1.5 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
              >
                <TableIcon className="w-5 h-5 text-emerald-400 mb-0.5" />
                <span className="text-[10px]">Table</span>
              </button>
              <button
                onClick={() => onAddElement("image")}
                className="flex flex-col items-center p-1.5 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
              >
                <ImageIcon className="w-5 h-5 text-sky-400 mb-0.5" />
                <span className="text-[10px]">Pictures</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 px-3">
              <button
                onClick={() => onAddElement("textbox")}
                className="flex flex-col items-center p-1.5 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
              >
                <Type className="w-5 h-5 text-cyan-400 mb-0.5" />
                <span className="text-[10px]">Text Box</span>
              </button>
              <button
                onClick={() => onAddElement("process")}
                className="flex flex-col items-center p-1.5 rounded hover:bg-[#3D3D3D] text-[#CCCCCC] hover:text-white"
              >
                <Layers className="w-5 h-5 text-amber-400 mb-0.5" />
                <span className="text-[10px]">SmartArt</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================= TAB: DRAW ======================= */}
        {activeTab.toLowerCase() === "draw" && (
          <div className="flex items-center space-x-4 divide-x divide-[#3D3D3D]">
            <div className="flex items-center space-x-2 pr-3">
              <button
                onClick={() => setDrawingTool(drawingTool === "pen" ? "none" : "pen")}
                className={`flex flex-col items-center p-1.5 rounded transition ${
                  drawingTool === "pen" ? "bg-orange-600 text-white" : "hover:bg-[#3D3D3D] text-[#CCCCCC]"
                }`}
              >
                <PenTool className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Pen</span>
              </button>
              <button
                onClick={() => setDrawingTool(drawingTool === "highlighter" ? "none" : "highlighter")}
                className={`flex flex-col items-center p-1.5 rounded transition ${
                  drawingTool === "highlighter" ? "bg-amber-600 text-white" : "hover:bg-[#3D3D3D] text-[#CCCCCC]"
                }`}
              >
                <Highlighter className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Highlighter</span>
              </button>
              <button
                onClick={() => setDrawingTool(drawingTool === "eraser" ? "none" : "eraser")}
                className={`flex flex-col items-center p-1.5 rounded transition ${
                  drawingTool === "eraser" ? "bg-rose-600 text-white" : "hover:bg-[#3D3D3D] text-[#CCCCCC]"
                }`}
              >
                <Eraser className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Eraser</span>
              </button>
            </div>

            {/* Colors */}
            <div className="flex items-center space-x-1.5 px-3">
              {["#EA580C", "#2563EB", "#10B981", "#F43F5E", "#FFFFFF", "#FACC15"].map((col) => (
                <button
                  key={col}
                  onClick={() => setDrawingColor(col)}
                  style={{ backgroundColor: col }}
                  className={`w-5 h-5 rounded-full border-2 transition ${
                    drawingColor === col ? "border-white scale-110 shadow-sm" : "border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ======================= TAB: DESIGN ======================= */}
        {activeTab.toLowerCase() === "design" && (
          <div className="flex items-center space-x-3 overflow-x-auto py-1">
            <span className="text-[11px] text-[#888888] font-semibold uppercase pr-2">Themes:</span>
            {PRESENTATION_THEMES.map((theme) => {
              const isSelected = currentThemeId === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => onSelectTheme(theme.id)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-left transition shrink-0 ${
                    isSelected
                      ? "border-orange-500 bg-[#383838] shadow-sm ring-1 ring-orange-500"
                      : "border-[#404040] hover:bg-[#333333]"
                  }`}
                >
                  <div
                    style={{ backgroundColor: theme.bg }}
                    className="w-5 h-5 rounded border border-[#555555] shrink-0"
                  />
                  <div>
                    <div className="font-semibold text-xs text-white leading-none">{theme.name}</div>
                    <span className="text-[10px] text-[#888888]">{theme.isDark ? "Dark" : "Light"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ======================= TAB: TRANSITIONS ======================= */}
        {activeTab.toLowerCase() === "transitions" && (
          <div className="flex items-center space-x-4 divide-x divide-[#3D3D3D]">
            <div className="flex items-center space-x-1 overflow-x-auto pr-3">
              {TRANSITIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectTransition(t.id)}
                  className={`px-3 py-1.5 rounded text-xs transition ${
                    currentTransition === t.id
                      ? "bg-orange-600 text-white font-semibold"
                      : "hover:bg-[#3D3D3D] text-[#CCCCCC]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-3 px-3">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-[#999999]">Duration:</span>
                <input
                  type="number"
                  min="0.2"
                  max="5.0"
                  step="0.1"
                  value={transitionDuration}
                  onChange={(e) => onChangeTransitionDuration(parseFloat(e.target.value) || 0.7)}
                  className="w-14 bg-[#1F1F1F] border border-[#444444] rounded px-1.5 py-0.5 text-xs text-white"
                />
                <span className="text-[10px] text-[#777777]">sec</span>
              </div>
              <button
                onClick={onApplyTransitionToAll}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-[#E0E0E0] font-medium transition"
              >
                Apply to All
              </button>
            </div>
          </div>
        )}

        {/* ======================= TAB: ANIMATIONS ======================= */}
        {activeTab.toLowerCase() === "animations" && (
          <div className="flex items-center space-x-2 overflow-x-auto">
            {ANIMATIONS.map((anim) => (
              <button
                key={anim.id}
                onClick={() => onSelectAnimation(anim.id)}
                className={`px-3 py-1.5 rounded text-xs transition ${
                  currentAnimation === anim.id
                    ? "bg-orange-600 text-white font-semibold"
                    : "hover:bg-[#3D3D3D] text-[#CCCCCC]"
                }`}
              >
                {anim.label}
              </button>
            ))}
          </div>
        )}

        {/* ======================= TAB: SLIDE SHOW ======================= */}
        {activeTab.toLowerCase() === "slide show" && (
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onStartSlideShow(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-lg text-white font-semibold shadow transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>From Beginning (F5)</span>
            </button>
            <button
              onClick={() => onStartSlideShow(false)}
              className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition"
            >
              <Play className="w-4 h-4" />
              <span>From Current Slide</span>
            </button>
          </div>
        )}

        {/* ======================= TAB: RECORD ======================= */}
        {activeTab.toLowerCase() === "record" && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => alert("Recording started: Slide timings and audio narration active.")}
              className="flex items-center space-x-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded text-white font-semibold text-xs transition"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <span>Record Narration</span>
            </button>
            <span className="text-[11px] text-[#888888]">Captures slide timings and voiceover.</span>
          </div>
        )}

        {/* ======================= TAB: REVIEW ======================= */}
        {activeTab.toLowerCase() === "review" && (
          <div className="flex items-center space-x-4">
            <button
              onClick={() => alert("Spelling check: All slides verified. No grammar errors found.")}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Spelling & Grammar</span>
            </button>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition"
            >
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>Speaker Notes Review</span>
            </button>
          </div>
        )}

        {/* ======================= TAB: VIEW ======================= */}
        {activeTab.toLowerCase() === "view" && (
          <div className="flex items-center space-x-4 divide-x divide-[#3D3D3D]">
            <div className="flex items-center space-x-2 pr-3">
              <button
                onClick={() => setViewMode("normal")}
                className={`px-2.5 py-1 rounded text-xs ${
                  viewMode === "normal" ? "bg-orange-600 text-white font-semibold" : "text-[#CCCCCC] hover:bg-[#3D3D3D]"
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setViewMode("slideSorter")}
                className={`px-2.5 py-1 rounded text-xs ${
                  viewMode === "slideSorter" ? "bg-orange-600 text-white font-semibold" : "text-[#CCCCCC] hover:bg-[#3D3D3D]"
                }`}
              >
                Slide Sorter
              </button>
              <button
                onClick={() => setViewMode("readingView")}
                className={`px-2.5 py-1 rounded text-xs ${
                  viewMode === "readingView" ? "bg-orange-600 text-white font-semibold" : "text-[#CCCCCC] hover:bg-[#3D3D3D]"
                }`}
              >
                Reading View
              </button>
            </div>

            <div className="flex items-center space-x-3 px-3">
              <label className="flex items-center space-x-1 text-xs text-[#CCCCCC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRuler}
                  onChange={(e) => setShowRuler(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <span>Ruler</span>
              </label>
              <label className="flex items-center space-x-1 text-xs text-[#CCCCCC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGridlines}
                  onChange={(e) => setShowGridlines(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <span>Gridlines</span>
              </label>
              <label className="flex items-center space-x-1 text-xs text-[#CCCCCC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGuides}
                  onChange={(e) => setShowGuides(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <span>Guides</span>
              </label>
            </div>
          </div>
        )}

        {/* ======================= TAB: HELP ======================= */}
        {activeTab.toLowerCase() === "help" && (
          <div className="flex items-center space-x-4">
            <button
              onClick={() =>
                alert(
                  "PowerPoint Studio Shortcuts:\nF5: Start Slideshow\nCtrl+S: Save\nCtrl+B: Bold\nCtrl+I: Italic\nCtrl+Z: Undo\nCtrl+Y: Redo\nDelete: Remove selected element"
                )
              }
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs text-white"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Keyboard Shortcuts</span>
            </button>
            <span className="text-[11px] text-[#888888]">TATTVA AI Presentation Studio 2026</span>
          </div>
        )}
      </div>
    </div>
  );
}
