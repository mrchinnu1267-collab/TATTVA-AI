"use client";

import React, { useState } from "react";
import NeuralCore3D, { NeuralCoreState } from "./NeuralCore3D";
import {
  Sparkles,
  Image as ImageIcon,
  Presentation,
  FileText,
  FileSpreadsheet,
  Compass,
  FileSearch,
  Lightbulb,
  ArrowRightLeft,
  Code2,
  Bug,
  Database,
  CalendarCheck,
  ChevronRight,
  Flame,
  Layers,
} from "lucide-react";

interface SuggestionItem {
  id: string;
  category: "create" | "explore" | "develop";
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  toolMode?: "web" | "research" | "file" | "code" | "image" | "none";
  accentColor: string;
  badge?: string;
}

interface NeuralWelcomeScreenProps {
  onSelectPrompt: (prompt: string, toolMode?: "web" | "research" | "file" | "code" | "image" | "none") => void;
  coreState?: NeuralCoreState;
  isDark?: boolean;
}

export default function NeuralWelcomeScreen({
  onSelectPrompt,
  coreState = "idle",
  isDark = true,
}: NeuralWelcomeScreenProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | "create" | "explore" | "develop">("all");

  const suggestions: SuggestionItem[] = [
    // Create
    {
      id: "img-gen",
      category: "create",
      title: "Generate an image",
      description: "Create photorealistic visuals & concept art",
      icon: <ImageIcon className="w-5 h-5 text-violet-400" />,
      prompt: "Create a high-resolution photorealistic image of a futuristic floating smart city at sunset",
      toolMode: "image",
      accentColor: "from-violet-500/20 to-purple-500/10",
      badge: "Vision",
    },
    {
      id: "pres-gen",
      category: "create",
      title: "Create a presentation",
      description: "Generate structured slide deck outlines",
      icon: <Presentation className="w-5 h-5 text-indigo-400" />,
      prompt: "Create a comprehensive 5-slide executive presentation outline on AI Transformation in Healthcare",
      toolMode: "none",
      accentColor: "from-indigo-500/20 to-blue-500/10",
      badge: "Slides",
    },
    {
      id: "doc-write",
      category: "create",
      title: "Write a document",
      description: "Draft professional reports, briefs & proposals",
      icon: <FileText className="w-5 h-5 text-cyan-400" />,
      prompt: "Draft a professional product requirements document (PRD) for an AI-powered analytics dashboard",
      toolMode: "none",
      accentColor: "from-cyan-500/20 to-teal-500/10",
    },
    {
      id: "sheet-build",
      category: "create",
      title: "Build a spreadsheet",
      description: "Financial formulas, data tables & models",
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-400" />,
      prompt: "Create a structured financial model and SaaS metrics spreadsheet template with ARR, churn, and LTV formulas",
      toolMode: "none",
      accentColor: "from-emerald-500/20 to-green-500/10",
    },

    // Explore
    {
      id: "res-topic",
      category: "explore",
      title: "Research a topic",
      description: "Deep multi-source web synthesis & citations",
      icon: <Compass className="w-5 h-5 text-blue-400" />,
      prompt: "Conduct a deep research report on the latest breakthrough advancements in solid-state battery technology in 2026",
      toolMode: "research",
      accentColor: "from-blue-500/20 to-indigo-500/10",
      badge: "Deep Web",
    },
    {
      id: "doc-analyze",
      category: "explore",
      title: "Analyze a document",
      description: "Extract insights, key data & summaries",
      icon: <FileSearch className="w-5 h-5 text-purple-400" />,
      prompt: "Analyze the uploaded document, extract key performance metrics, and highlight potential risk factors:",
      toolMode: "file",
      accentColor: "from-purple-500/20 to-fuchsia-500/10",
    },
    {
      id: "exp-concept",
      category: "explore",
      title: "Explain a concept",
      description: "Break down complex science & systems",
      icon: <Lightbulb className="w-5 h-5 text-amber-400" />,
      prompt: "Explain quantum error correction and topological qubits in intuitive terms with real-world analogies",
      toolMode: "none",
      accentColor: "from-amber-500/20 to-orange-500/10",
    },
    {
      id: "cmp-info",
      category: "explore",
      title: "Compare information",
      description: "Side-by-side architectural evaluations",
      icon: <ArrowRightLeft className="w-5 h-5 text-pink-400" />,
      prompt: "Compare Next.js App Router vs Remix across performance, server actions, caching, and developer experience",
      toolMode: "none",
      accentColor: "from-pink-500/20 to-rose-500/10",
    },

    // Develop
    {
      id: "gen-code",
      category: "develop",
      title: "Generate code",
      description: "Write idiomatic TypeScript, Python & SQL",
      icon: <Code2 className="w-5 h-5 text-cyan-400" />,
      prompt: "Write a high-performance TypeScript microservice using fastify and redis for rate-limiting distributed API requests",
      toolMode: "code",
      accentColor: "from-cyan-500/20 to-blue-500/10",
      badge: "Engineering",
    },
    {
      id: "debug-app",
      category: "develop",
      title: "Debug an application",
      description: "Diagnose stack traces & memory leaks",
      icon: <Bug className="w-5 h-5 text-rose-400" />,
      prompt: "Here is my code and error stack trace. Help me systematically diagnose the root cause and provide a minimal patch:",
      toolMode: "code",
      accentColor: "from-rose-500/20 to-red-500/10",
    },
    {
      id: "design-db",
      category: "develop",
      title: "Design a database",
      description: "PostgreSQL schemas, indexes & relations",
      icon: <Database className="w-5 h-5 text-indigo-400" />,
      prompt: "Design a production-ready PostgreSQL relational database schema with Row Level Security (RLS) for a multi-tenant B2B SaaS platform",
      toolMode: "code",
      accentColor: "from-indigo-500/20 to-violet-500/10",
    },
    {
      id: "plan-proj",
      category: "develop",
      title: "Create a project plan",
      description: "Milestones, architectural sprints & tasks",
      icon: <CalendarCheck className="w-5 h-5 text-teal-400" />,
      prompt: "Create an end-to-end 6-week engineering roadmap and milestone delivery plan for building an AI agent orchestration system",
      toolMode: "none",
      accentColor: "from-teal-500/20 to-emerald-500/10",
    },
  ];

  const filtered = activeCategory === "all" ? suggestions : suggestions.filter((s) => s.category === activeCategory);

  return (
    <div className="flex-1 flex flex-col items-center justify-between py-2 sm:py-6 w-full max-w-4xl mx-auto px-3 sm:px-6 select-none animate-in fade-in duration-500">
      {/* 1. HERO COMPOSITION WITH 3D NEURAL CORE */}
      <div className="flex flex-col items-center text-center my-auto pt-2 pb-6">
        {/* Animated 3D Neural Core Orb */}
        <div className="relative mb-2 sm:mb-4 group cursor-pointer transition-transform duration-300 hover:scale-105">
          <NeuralCore3D
            state={coreState}
            size={typeof window !== "undefined" && window.innerWidth < 640 ? 190 : 230}
            className="drop-shadow-[0_0_35px_rgba(139,92,246,0.35)]"
          />

          {/* Core State Pill Indicator */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border border-violet-500/30 bg-black/60 backdrop-blur-md text-violet-200 shadow-lg shadow-violet-500/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tracking-wide uppercase font-semibold text-[10px]">Neural Active</span>
          </div>
        </div>

        {/* Small Heading Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300 text-xs font-semibold tracking-wider uppercase mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "8s" }} />
          <span>Your Intelligent Workspace</span>
        </div>

        {/* Main Heading with Gradient Typography */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white max-w-2xl leading-tight">
          What would you like to{" "}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            create today?
          </span>
        </h1>

        {/* Supporting Text */}
        <p className="mt-2.5 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-lg leading-relaxed">
          Think, explore, create and accomplish more with TATTVA AI.
        </p>
      </div>

      {/* 2. CATEGORY FILTER TABS */}
      <div className="w-full flex items-center justify-between gap-2 border-b border-black/[0.06] dark:border-white/[0.08] pb-3 mb-4 text-xs">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "all", label: "All Capabilities", icon: <Layers className="w-3.5 h-3.5" /> },
              { id: "create", label: "Create", icon: <Sparkles className="w-3.5 h-3.5" /> },
              { id: "explore", label: "Explore", icon: <Compass className="w-3.5 h-3.5" /> },
              { id: "develop", label: "Develop", icon: <Code2 className="w-3.5 h-3.5" /> },
            ] as const
          ).map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/25"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <span className="hidden sm:inline-flex text-[11px] text-neutral-400 dark:text-neutral-500 font-medium items-center gap-1">
          <Flame className="w-3 h-3 text-amber-400" />
          Click any card to start
        </span>
      </div>

      {/* 3. INTELLIGENT SUGGESTION CARDS GRID */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pb-3">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectPrompt(item.prompt, item.toolMode)}
            className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer backdrop-blur-xl hover:-translate-y-0.5 hover:shadow-lg ${
              isDark
                ? "border-white/[0.08] bg-[#16171b]/80 hover:border-violet-500/40 hover:bg-[#1a1b22] hover:shadow-violet-500/10"
                : "border-black/[0.08] bg-white/80 hover:border-violet-500/40 hover:bg-white hover:shadow-neutral-200/80"
            }`}
          >
            {/* Top Row: Icon + Badge */}
            <div className="flex items-center justify-between w-full mb-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.accentColor} border border-white/10 dark:border-white/5 transition-transform duration-200 group-hover:scale-110`}
              >
                {item.icon}
              </div>

              {item.badge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 dark:text-violet-300 border border-violet-500/20">
                  {item.badge}
                </span>
              )}
            </div>

            {/* Bottom Row: Title + Description */}
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-violet-400 transition-colors flex items-center justify-between">
                {item.title}
                <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-violet-400 shrink-0" />
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                {item.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
