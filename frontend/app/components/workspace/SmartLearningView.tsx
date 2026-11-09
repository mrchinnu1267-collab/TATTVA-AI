"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  HelpCircle,
  TrendingUp,
  Award,
} from "lucide-react";

export function SmartLearningView() {
  const [activeTab, setActiveTab] = useState<"flashcards" | "quizzes" | "plan">("flashcards");
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Quiz state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);

  const flashcards = [
    {
      q: "What is the primary role of an attention mechanism in modern Transformer architectures?",
      a: "It computes dynamic weightings across all input tokens simultaneously, capturing long-range contextual relationships without recurrent bottleneck latency.",
    },
    {
      q: "Why do production Agentic AI workflows mandate offline-first state containment?",
      a: "To ensure deterministic local execution, prevent state corruption under intermittent network drops, and guarantee zero data loss.",
    },
    {
      q: "What is the difference between a zero-trust credential vault and standard environment storage?",
      a: "A zero-trust vault enforces end-to-end client-side encryption, ephemeral signed URLs, and strict row-level security (RLS) policies.",
    },
  ];

  const quizQuestion = {
    question: "Which invariant guarantees that a generated OpenXML PowerPoint file will open cleanly in external Microsoft Office software?",
    options: [
      "Changing the extension from .txt to .pptx",
      "Compiling valid XML part-streams, presentation.xml, slide rels, and ZIP container structure",
      "Rendering pure HTML canvases without binary OpenXML parts",
      "Using an unverified base64 dataURI string",
    ],
    correctIndex: 1,
    explanation: "Microsoft PowerPoint requires strict compliance with the ISO/IEC 29500 OpenXML standard, including proper content types, slide relationships, and ZIP packaging.",
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F19] text-slate-200 select-none overflow-hidden">
      {/* Header matching screenshot */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Smart Learning Mode</h1>
            <p className="text-xs text-slate-400">Study, Flashcards, Quizzes & Knowledge Retention</p>
          </div>
        </div>

        {/* Stats Badges matching screenshot */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
            <span className="font-bold text-white">12</span> Notes
          </div>
          <div className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
            <span className="font-bold text-indigo-400">48</span> Flashcards
          </div>
          <div className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
            <span className="font-bold text-emerald-400">6</span> Quizzes
          </div>
          <div className="px-3 py-1 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 font-bold">
            85% Progress
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-slate-800 flex space-x-4 text-xs font-semibold shrink-0">
        <button
          onClick={() => setActiveTab("flashcards")}
          className={`py-3 border-b-2 transition ${
            activeTab === "flashcards" ? "border-purple-500 text-purple-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Flashcards
        </button>
        <button
          onClick={() => setActiveTab("quizzes")}
          className={`py-3 border-b-2 transition ${
            activeTab === "quizzes" ? "border-purple-500 text-purple-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Interactive Quizzes
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
        {activeTab === "flashcards" && (
          <div className="w-full max-w-xl space-y-4 text-center">
            <div className="text-xs text-slate-400">
              Card {currentCardIndex + 1} of {flashcards.length} • Click card to flip
            </div>

            {/* Interactive Flip Card */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full h-72 rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 p-8 shadow-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:border-purple-400"
            >
              <span className="text-[10px] uppercase font-mono px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800 text-indigo-300 mb-4">
                {isFlipped ? "ANSWER / KEY TAKEAWAY" : "QUESTION"}
              </span>

              <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
                {isFlipped ? flashcards[currentCardIndex].a : flashcards[currentCardIndex].q}
              </p>

              <span className="text-[11px] text-slate-500 mt-6">
                {isFlipped ? "Tap to see question" : "Tap to reveal answer"}
              </span>
            </div>

            <button
              onClick={handleNextCard}
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition"
            >
              Next Flashcard
            </button>
          </div>
        )}

        {activeTab === "quizzes" && (
          <div className="w-full max-w-xl p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Practice Quiz: Architecture Invariants</span>
              <span className="text-xs text-purple-400 font-mono">Q1 / 1</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {quizQuestion.question}
            </p>

            <div className="space-y-2 pt-2">
              {quizQuestion.options.map((opt, i) => {
                const isSelected = selectedOption === i;
                const isCorrect = i === quizQuestion.correctIndex;
                let optClass = "border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700";

                if (isAnswerSubmitted) {
                  if (isCorrect) optClass = "border-emerald-500 bg-emerald-950/40 text-emerald-200";
                  else if (isSelected) optClass = "border-rose-500 bg-rose-950/40 text-rose-200";
                } else if (isSelected) {
                  optClass = "border-indigo-500 bg-indigo-950/40 text-white";
                }

                return (
                  <button
                    key={i}
                    onClick={() => !isAnswerSubmitted && setSelectedOption(i)}
                    className={`w-full p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${optClass}`}
                  >
                    <span>{opt}</span>
                    {isAnswerSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {isAnswerSubmitted && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {!isAnswerSubmitted ? (
              <button
                onClick={() => selectedOption !== null && setIsAnswerSubmitted(true)}
                disabled={selectedOption === null}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition disabled:opacity-40"
              >
                Submit Answer
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-[11px] text-slate-300 space-y-1">
                <span className="font-semibold text-indigo-400">Explanation:</span>
                <p>{quizQuestion.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
