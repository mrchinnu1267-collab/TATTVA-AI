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
    prompt: "I want to analyze and extract core insights, structural trends, and key takeaways from my uploaded files.",
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
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6 sm:py-8 max-w-2xl mx-auto my-auto select-none animate-fluid-page-in">
      {/* 1. Refined, Elegant Neural Orb */}
      <div className="mb-4 sm:mb-5 flex items-center justify-center">
        <NeuralOrbMinimal state={coreState} isDark={isDark} size={92} />
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

      {/* 3. Welcome Heading (30–36px on desktop, modern typography) */}
      <h1
        className={`text-2xl sm:text-3xl md:text-[34px] font-semibold tracking-tight leading-tight transition-colors duration-200 ${
          isDark ? "text-white" : "text-neutral-900"
        }`}
      >
        What would you like to work on?
      </h1>

      {/* 4. Supporting Text (14–16px, readable line-height, generous whitespace) */}
      <p
        className={`mt-2.5 text-sm sm:text-base font-normal max-w-md mx-auto leading-relaxed transition-colors duration-200 ${
          isDark ? "text-neutral-400" : "text-neutral-600"
        }`}
      >
        Explore ideas, create something new and get things done with TATTVA AI.
      </p>

      {/* 5. Four Compact Suggestion Buttons (Subtle Fluid Glass, Level 3 Micro-Interactions) */}
      <div className="mt-6 sm:mt-7 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-lg w-full">
        {SUGGESTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPrompt(item.prompt, item.toolMode)}
              className={`group inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium border transition-all duration-150 cursor-pointer fluid-press select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                isDark
                  ? "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-neutral-300 hover:text-white hover:border-white/20"
                  : "border-neutral-200/80 bg-neutral-100/70 hover:bg-neutral-200/70 text-neutral-700 hover:text-neutral-900 hover:border-neutral-300 shadow-xs"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 transition-colors duration-150 ${
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
