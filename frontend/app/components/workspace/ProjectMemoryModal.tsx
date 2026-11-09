"use client";

import React, { useState } from "react";
import {
  X,
  Brain,
  Save,
  Trash2,
  CheckCircle2,
  Sparkles,
  Download,
  AlertCircle,
} from "lucide-react";

interface ProjectMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectMemoryModal({ isOpen, onClose }: ProjectMemoryModalProps) {
  const [objectives, setObjectives] = useState(
    "Build a production-grade Agentic AI productivity suite with offline-first synchronization, genuine OpenXML generation, and 12-tab desktop ribbon."
  );
  const [decisions, setDecisions] = useState(
    "- Architecture: Decoupled client-side execution with serverless Gemini 3.5/3.6 tool calling.\n- Storage: Supabase PostgreSQL with local encrypted vault fallback.\n- Security: Zero-Trust input sanitization and PII redaction."
  );
  const [techStack, setTechStack] = useState(
    "Next.js 15, Tailwind CSS v4, Lucide Icons, Python-pptx, Google Gemini API, Supabase Realtime."
  );
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveMemory = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-xl bg-[#0F172A] border border-indigo-500/30 rounded-3xl shadow-2xl p-6 md:p-8 space-y-5 text-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Project Memory & Context</h2>
              <p className="text-xs text-slate-400">Authorized persistent project objectives and technical decisions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Project Objectives</label>
            <textarea
              rows={2}
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Key Architectural Decisions</label>
            <textarea
              rows={3}
              value={decisions}
              onChange={(e) => setDecisions(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Selected Technologies</label>
            <input
              type="text"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => {
              setObjectives("");
              setDecisions("");
              setTechStack("");
            }}
            className="flex items-center space-x-1 text-slate-400 hover:text-rose-400 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Memory</span>
          </button>

          <button
            onClick={handleSaveMemory}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-md"
          >
            {isSaved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaved ? "Saved to Memory!" : "Save Changes"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
