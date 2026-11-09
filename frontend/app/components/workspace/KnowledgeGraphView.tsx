"use client";

import React, { useState } from "react";
import {
  Share2,
  FileText,
  Table,
  Presentation,
  BookOpen,
  Users,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Layers,
} from "lucide-react";

interface GraphNode {
  id: string;
  name: string;
  category: "center" | "research" | "presentation" | "data" | "notes" | "tasks" | "team";
  filesCount: number;
  cx: number;
  cy: number;
  color: string;
  accent: string;
}

export function KnowledgeGraphView() {
  const [selectedNode, setSelectedNode] = useState<string>("center");

  const nodes: GraphNode[] = [
    { id: "center", name: "Agentic AI Project", category: "center", filesCount: 32, cx: 400, cy: 250, color: "#7C3AED", accent: "#A78BFA" },
    { id: "res", name: "Research", category: "research", filesCount: 5, cx: 220, cy: 120, color: "#2563EB", accent: "#60A5FA" },
    { id: "pres", name: "Presentation", category: "presentation", filesCount: 3, cx: 580, cy: 120, color: "#EA580C", accent: "#F97316" },
    { id: "data", name: "Data & Telemetry", category: "data", filesCount: 8, cx: 160, cy: 290, color: "#10B981", accent: "#34D399" },
    { id: "notes", name: "Notes & Memos", category: "notes", filesCount: 7, cx: 240, cy: 400, color: "#9333EA", accent: "#C084FC" },
    { id: "tasks", name: "Project Tasks", category: "tasks", filesCount: 12, cx: 560, cy: 400, color: "#06B6D4", accent: "#22D3EE" },
    { id: "team", name: "Collaborators", category: "team", filesCount: 4, cx: 640, cy: 290, color: "#EAB308", accent: "#FDE047" },
  ];

  const currentNode = nodes.find((n) => n.id === selectedNode) || nodes[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080B14] text-slate-200 select-none overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 text-xs font-bold text-white">
          <Share2 className="w-4 h-4 text-purple-400" />
          <span>Knowledge Graph</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 font-normal">Connected Information & Relational Intelligence</span>
        </div>

        <button
          onClick={() => {}}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold shadow-sm transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Discover Connections</span>
        </button>
      </div>

      {/* Main Interactive Visual Graph Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* SVG Graph Canvas */}
        <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden">
          <svg className="w-full max-w-[800px] h-[500px] select-none">
            {/* Connecting Lines */}
            {nodes
              .filter((n) => n.id !== "center")
              .map((n) => (
                <line
                  key={`line_${n.id}`}
                  x1={400}
                  y1={250}
                  x2={n.cx}
                  y2={n.cy}
                  stroke={n.color}
                  strokeWidth="2"
                  strokeOpacity="0.4"
                  strokeDasharray="4 4"
                />
              ))}

            {/* Central Node */}
            <circle
              cx={400}
              cy={250}
              r={60}
              fill="url(#centerGrad)"
              className="cursor-pointer filter drop-shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-transform hover:scale-105"
              onClick={() => setSelectedNode("center")}
            />
            <text x={400} y={246} textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold" pointerEvents="none">
              Agentic AI
            </text>
            <text x={400} y={264} textAnchor="middle" fill="#C4B5FD" fontSize="10" pointerEvents="none">
              Project Hub
            </text>

            {/* Satellite Nodes */}
            {nodes
              .filter((n) => n.id !== "center")
              .map((n) => {
                const isSelected = selectedNode === n.id;
                return (
                  <g
                    key={n.id}
                    onClick={() => setSelectedNode(n.id)}
                    className="cursor-pointer transition-transform hover:scale-110"
                  >
                    <circle
                      cx={n.cx}
                      cy={n.cy}
                      r={42}
                      fill="#0F172A"
                      stroke={n.color}
                      strokeWidth={isSelected ? 3 : 2}
                      className="filter drop-shadow-md"
                    />
                    <text x={n.cx} y={n.cy - 4} textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="semibold" pointerEvents="none">
                      {n.name}
                    </text>
                    <text x={n.cx} y={n.cy + 12} textAnchor="middle" fill={n.accent} fontSize="9" fontStyle="italic" pointerEvents="none">
                      ({n.filesCount} items)
                    </text>
                  </g>
                );
              })}

            <defs>
              <linearGradient id="centerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#4F46E5" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Selected Node Intelligence Details Panel */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/60 p-6 space-y-4 shrink-0 overflow-y-auto">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              Selected Entity
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">{currentNode.name}</h3>
            <p className="text-xs text-slate-400">
              {currentNode.filesCount} linked documents, sheets, notes, or tasks in workspace.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold text-white">Connected Artifacts:</span>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
                <span>Agentic_AI_Specification.docx</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-white" />
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
                <span>Performance_Benchmarks.xlsx</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-white" />
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
                <span>Executive_Review_Deck.pptx</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
