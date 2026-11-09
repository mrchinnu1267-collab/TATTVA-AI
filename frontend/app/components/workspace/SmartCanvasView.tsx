"use client";

import React, { useState, useRef } from "react";
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Table,
  Presentation,
  BookOpen,
  Share2,
  Sparkles,
  Move,
  Trash2,
  CheckCircle2,
  Layout,
  StickyNote,
} from "lucide-react";

interface CanvasNode {
  id: string;
  type: "doc" | "sheet" | "slide" | "note" | "center" | "task";
  title: string;
  subtitle?: string;
  bullets?: string[];
  x: number; // percentage or px
  y: number;
  w: number;
  h: number;
  color?: string;
  badge?: string;
}

export function SmartCanvasView() {
  const [zoom, setZoom] = useState(100);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const initialNodes: CanvasNode[] = [
    {
      id: "node_center",
      type: "center",
      title: "Agentic AI Project",
      subtitle: "Unified Workspace Canvas",
      x: 38,
      y: 35,
      w: 24,
      h: 22,
      color: "from-purple-600 to-indigo-600",
    },
    {
      id: "node_doc",
      type: "doc",
      title: "Project Report.docx",
      subtitle: "System Specification (12 Pages)",
      x: 10,
      y: 20,
      w: 20,
      h: 16,
      badge: "DOCX",
      color: "bg-blue-900/60 border-blue-500/60",
    },
    {
      id: "node_sheet",
      type: "sheet",
      title: "Budget & Telemetry.xlsx",
      subtitle: "Financial & P99 Metrics",
      x: 10,
      y: 44,
      w: 20,
      h: 16,
      badge: "XLSX",
      color: "bg-emerald-900/60 border-emerald-500/60",
    },
    {
      id: "node_slide",
      type: "slide",
      title: "Presentation.pptx",
      subtitle: "6-Slide Executive Deck",
      x: 70,
      y: 20,
      w: 20,
      h: 16,
      badge: "PPTX",
      color: "bg-orange-900/60 border-orange-500/60",
    },
    {
      id: "node_task",
      type: "task",
      title: "Task Plan & Milestones",
      subtitle: "Sprint 4 Delivery (8 Tasks)",
      x: 70,
      y: 44,
      w: 20,
      h: 16,
      badge: "TASKS",
      color: "bg-cyan-900/60 border-cyan-500/60",
    },
    {
      id: "node_note",
      type: "note",
      title: "Key Ideas & Invariants",
      bullets: [
        "• AI Architecture & Offline-First Sync",
        "• Input validation & zero-trust boundaries",
        "• Automated OpenXML verification",
      ],
      x: 38,
      y: 65,
      w: 24,
      h: 22,
      badge: "STICKY NOTE",
      color: "bg-amber-950/70 border-amber-500/60",
    },
  ];

  const [nodes, setNodes] = useState<CanvasNode[]>(initialNodes);

  const handleAddStickyNote = () => {
    const newNode: CanvasNode = {
      id: `node_${Date.now()}`,
      type: "note",
      title: "New Note",
      bullets: ["• Click to edit thought", "• Linked to project workflow"],
      x: 40 + Math.random() * 10,
      y: 20 + Math.random() * 10,
      w: 18,
      h: 16,
      badge: "IDEA",
      color: "bg-purple-950/70 border-purple-500/60",
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const handleAIMindmap = () => {
    alert("AI Mindmap Synthesizer: Generated 4 new relational project concept nodes.");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090C15] text-slate-200 select-none overflow-hidden relative">
      {/* Canvas Top Bar matching Screenshot */}
      <div className="h-12 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="font-bold text-white text-xs flex items-center space-x-2">
            <Layout className="w-4 h-4 text-purple-400" />
            <span>Smart Canvas</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-xs text-slate-400">Project Planning & Visual Architecture</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <div className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-800 text-xs text-slate-300">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="p-1 hover:text-white"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-mono">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(150, z + 10))}
              className="p-1 hover:text-white"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleAddStickyNote}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold transition"
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Note</span>
          </button>

          <button
            onClick={handleAIMindmap}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs text-white font-semibold shadow-md transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Mindmap</span>
          </button>
        </div>
      </div>

      {/* Freeform Canvas Area with SVG connecting lines */}
      <div
        className="flex-1 relative overflow-auto p-8"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "center center",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* SVG Bezier Lines connecting to center */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <line x1="20%" y1="28%" x2="48%" y2="44%" stroke="#6366F1" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="20%" y1="52%" x2="48%" y2="46%" stroke="#10B981" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="80%" y1="28%" x2="52%" y2="44%" stroke="#EA580C" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="80%" y1="52%" x2="52%" y2="46%" stroke="#06B6D4" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="50%" y1="65%" x2="50%" y2="57%" stroke="#EAB308" strokeWidth="2" strokeDasharray="4 4" />
        </svg>

        {/* Canvas Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          if (node.type === "center") {
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                style={{ left: `${node.x}%`, top: `${node.y}%`, width: `${node.w}%` }}
                className={`absolute p-5 rounded-3xl bg-gradient-to-tr ${node.color} text-white shadow-2xl border border-purple-400/50 cursor-pointer text-center z-10 transition-transform hover:scale-105`}
              >
                <div className="w-10 h-10 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-base font-extrabold tracking-tight">{node.title}</h2>
                <p className="text-xs text-purple-200 mt-0.5">{node.subtitle}</p>
              </div>
            );
          }

          return (
            <div
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              style={{ left: `${node.x}%`, top: `${node.y}%`, width: `${node.w}%` }}
              className={`absolute p-4 rounded-2xl border backdrop-blur-md shadow-xl cursor-pointer z-10 transition-all ${
                node.color
              } ${isSelected ? "ring-2 ring-indigo-400 scale-102" : "hover:border-slate-500"}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-slate-300 uppercase">
                  {node.badge}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNodes((prev) => prev.filter((n) => n.id !== node.id));
                  }}
                  className="text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <h3 className="font-bold text-xs text-white leading-tight">{node.title}</h3>
              {node.subtitle && <p className="text-[11px] text-slate-300 mt-1">{node.subtitle}</p>}

              {node.bullets && (
                <div className="mt-2 space-y-1 text-[11px] text-slate-200">
                  {node.bullets.map((b, i) => (
                    <div key={i}>{b}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

