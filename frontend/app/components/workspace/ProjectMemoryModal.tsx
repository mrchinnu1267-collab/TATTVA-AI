"use client";

import React, { useState } from "react";
import {
  X,
  Brain,
  Save,
  Trash2,
  CheckCircle2,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-xl bg-white border border-[#E5E5E5] rounded-3xl shadow-2xl p-6 md:p-8 space-y-5 text-[#111111]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-[#E5E5E5] flex items-center justify-center text-black shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111] tracking-tight">Project Memory & Context</h2>
              <p className="text-xs text-neutral-500">Authorized persistent project objectives and technical decisions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[#111111] font-semibold mb-1">Project Objectives</label>
            <textarea
              rows={2}
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              className="w-full bg-white border border-[#E5E5E5] rounded-xl p-3 text-xs text-[#111111] focus:outline-none focus:border-black shadow-xs"
            />
          </div>

          <div>
            <label className="block text-[#111111] font-semibold mb-1">Key Architectural Decisions</label>
            <textarea
              rows={3}
              value={decisions}
              onChange={(e) => setDecisions(e.target.value)}
              className="w-full bg-white border border-[#E5E5E5] rounded-xl p-3 text-xs text-[#111111] focus:outline-none focus:border-black font-mono text-[11px] shadow-xs"
            />
          </div>

          <div>
            <label className="block text-[#111111] font-semibold mb-1">Selected Technologies</label>
            <input
              type="text"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              className="w-full bg-white border border-[#E5E5E5] rounded-xl p-3 text-xs text-[#111111] focus:outline-none focus:border-black shadow-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5] text-xs">
          <button
            onClick={() => {
              setObjectives("");
              setDecisions("");
              setTechStack("");
            }}
            className="flex items-center space-x-1 text-neutral-400 hover:text-rose-600 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Memory</span>
          </button>

          <button
            onClick={handleSaveMemory}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold transition shadow-xs"
          >
            {isSaved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaved ? "Saved to Memory!" : "Save Changes"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectMemoryModal;
