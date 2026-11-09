"use client";

import React, { useState } from "react";
import {
  Search,
  BookOpen,
  FileText,
  Presentation,
  CheckCircle2,
  Bookmark,
  Share2,
  Sparkles,
  Download,
  Loader2,
  Globe,
  Award,
} from "lucide-react";

export function ResearchLabView() {
  const [topic, setTopic] = useState("Agentic AI in real-world applications");
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "sources" | "citations">("summary");

  const sources = [
    { title: "Autonomous Agents in Multi-Turn Interactive Software Workflows", type: "Research Paper", authority: "IEEE Computer Society", year: 2024 },
    { title: "Attention Is All You Need: Foundational Sequence Modeling", type: "Foundational Paper", authority: "NeurIPS (Vaswani et al.)", year: 2017 },
    { title: "Enterprise Zero-Trust Boundary & Content Verification Standards", type: "Technical Standard", authority: "ISO/IEC 27001 Guidelines", year: 2023 },
    { title: "Hierarchical Planning and Deterministic State Persistences in Agent Systems", type: "ACM Publication", authority: "ACM Transactions on Computer Systems", year: 2024 },
  ];

  const handleRunResearch = () => {
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 800);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F19] text-slate-200 select-none overflow-hidden">
      {/* Search Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md shrink-0 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-white">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span>AI Research Lab</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 font-normal">Deep Autonomous Topic Investigation & Verified Citations</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRunResearch()}
              placeholder="Enter research topic, technology, or academic domain..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleRunResearch}
            disabled={isSearching}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Research</span>
          </button>
        </div>
      </div>

      {/* Main Research Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Source Categories Badges matching screenshot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Web Sources</span>
            <span className="font-bold text-white text-xs bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">12 Verified</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Research Papers</span>
            <span className="font-bold text-white text-xs bg-purple-950 px-2 py-0.5 rounded border border-purple-800">8 Peer-Reviewed</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Technical Standards</span>
            <span className="font-bold text-white text-xs bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">15 Industry</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Verified Reports</span>
            <span className="font-bold text-white text-xs bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">4 Audits</span>
          </div>
        </div>

        {/* AI Research Synthesis Box */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-sm">Verified Research Synthesis</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Ground-Truth Grounded
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => alert("Report generated and saved in Word!")}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium transition"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Create Report</span>
              </button>

              <button
                onClick={() => alert("Slides generated and opened in PowerPoint!")}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium transition"
              >
                <Presentation className="w-3.5 h-3.5 text-orange-400" />
                <span>To Presentation</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              <strong className="text-white">Core Architectural Formulation:</strong> Agentic AI systems represent autonomous, goal-driven software configurations that plan, reason, invoke structured tools, and synthesize reports across multi-turn human interaction pipelines. Unlike static prompt-completion models, agent frameworks decompose composite macro-goals into discrete deterministic sub-tasks.
            </p>
            <p>
              <strong className="text-white">State Containment & Telemetry Invariants:</strong> Production implementations mandate offline-first state persistence and cryptographic hash verification to guarantee zero data loss during intermittent network degradation.
            </p>
          </div>

          {/* Sources List */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="font-semibold text-white text-xs">Authoritative Source Citations:</span>
            <div className="space-y-2">
              {sources.map((src, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-white">{src.title}</div>
                    <div className="text-[11px] text-slate-400">
                      {src.authority} • {src.year}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                    {src.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

