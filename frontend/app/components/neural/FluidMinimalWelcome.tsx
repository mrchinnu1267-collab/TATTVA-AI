"use client";

import React from "react";
import { Sparkles, Compass, FileText, Code2 } from "lucide-react";
import NeuralOrbMinimal, { NeuralOrbState } from "./NeuralOrbMinimal";

interface FluidMinimalWelcomeProps {
  coreState?: NeuralOrbState;
  isDark?: boolean;
  onSelectPrompt: (promptText: string, toolMode?: "none" | "web" | "research" | "code" | "file") => void;
}

interface SuggestionOption {
  id: string;
  label: string;
  prompt: string;
  toolMode?: "none" | "web" | "research" | "code" | "file";
  icon: React.ComponentType<{ className?: string }>;
}

const SUGGESTIONS: SuggestionOption[] = [
  {
    id: "create",
    label: "Create something",
    prompt: "Help me brainstorm and outline a compelling strategy proposal with clear actionable milestones.",
    toolMode: "none",
    icon: Sparkles,
  },
  {
    id: "research",
    label: "Research a topic",
    prompt: "Conduct a comprehensive deep research synthesis on latest advancements in multimodal AI architectures.",
    toolMode: "research",
    icon: Compass,
  },
  {
    id: "analyze",
    label: "Analyze a file",
    prompt: "I want to analyze and extract core insights, structural trends, and takeaways from my uploaded files.",
    toolMode: "file",
    icon: FileText,
  },
  {
    id: "code",
    label: "Write some code",
    prompt: "Write a clean, production-grade TypeScript service with comprehensive type definitions and unit tests.",
    toolMode: "code",
    icon: Code2,
  },
];

export default function FluidMinimalWelcome({
  coreState = "idle",
  isDark = true,
  onSelectPrompt,
}: FluidMinimalWelcomeProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 max-w-2xl mx-auto my-auto animate-in fade-in duration-500 select-none">
      {/* 1. Signature Neural Orb */}
      <div className="mb-5 flex items-center justify-center">
        <NeuralOrbMinimal state={coreState} isDark={isDark} size={108} />
      </div>

      {/* 2. Minimal Category Label */}
      <div className="mb-2">
        <span
          className={`text-[11px] font-mono tracking-widest uppercase font-medium ${
            isDark ? "text-neutral-400" : "text-neutral-500"
          }`}
        >
          YOUR AI WORKSPACE
        </span>
      </div>

      {/* 3. Welcome Headline */}
      <h1
        className={`text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight transition-colors duration-200 ${
          isDark ? "text-white" : "text-neutral-900"
        }`}
      >
        What can we create today?
      </h1>

      {/* 4. Supporting Description */}
      <p
        className={`mt-2 text-sm sm:text-base font-normal max-w-md mx-auto leading-relaxed transition-colors duration-200 ${
          isDark ? "text-neutral-400" : "text-neutral-600"
        }`}
      >
        Think freely. Explore ideas. Get things done with TATTVA AI.
      </p>

      {/* 5. Four Compact Suggestion Buttons (Clean, whitespace-focused, non-crowded) */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-lg w-full">
        {SUGGESTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPrompt(item.prompt, item.toolMode)}
              className={`group inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium border transition-all duration-200 cursor-pointer active:scale-97 select-none ${
                isDark
                  ? "border-white/[0.08] bg-white/[0.02] text-neutral-300 hover:text-white hover:bg-white/[0.06] hover:border-white/20 hover:shadow-xs"
                  : "border-neutral-200 bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 hover:border-neutral-300 shadow-xs"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 transition-colors duration-200 ${
                  isDark
                    ? "text-neutral-400 group-hover:text-indigo-400"
                    : "text-neutral-500 group-hover:text-indigo-600"
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
