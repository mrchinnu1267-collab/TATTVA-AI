"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  HelpCircle,
  Calculator,
  RotateCcw,
  Download,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Clock,
  Layers,
  ChevronRight,
  ChevronDown,
  Brain,
  Award,
} from "lucide-react";
import {
  DifficultyLevel,
  SubjectDomain,
  LearningCurriculum,
  ConceptExplanation,
  Quiz,
  QuizEvaluationResult,
  StepByStepSolution,
  SpacedRepetitionCard,
  LearnerMasteryProfile,
} from "../../lib/learning/types";

export default function LearningDashboard() {
  const [activeTab, setActiveTab] = useState<
    "curriculum" | "explain" | "quiz" | "solve" | "flashcards" | "export"
  >("curriculum");

  // Curriculum State
  const [curricTopic, setCurricTopic] = useState("Distributed Systems & Microservices");
  const [curricDomain, setCurricDomain] = useState<SubjectDomain>("system_architecture");
  const [curricBaseline, setCurricBaseline] = useState<DifficultyLevel>("intermediate");
  const [curricTarget, setCurricTarget] = useState<DifficultyLevel>("expert");
  const [curriculum, setCurriculum] = useState<LearningCurriculum | null>(null);
  const [curricLoading, setCurricLoading] = useState(false);

  // Concept Explain State
  const [explainConcept, setExplainConcept] = useState("Event Loop & Non-Blocking I/O");
  const [explainDomain, setExplainDomain] = useState<SubjectDomain>("computer_science");
  const [explainLevel, setExplainLevel] = useState<DifficultyLevel>("intermediate");
  const [explanation, setExplanation] = useState<ConceptExplanation | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);

  // Quiz State
  const [quizTopic, setQuizTopic] = useState("Dynamic Programming & Memoization");
  const [quizDomain, setQuizDomain] = useState<SubjectDomain>("data_structures_algorithms");
  const [quizLevel, setQuizLevel] = useState<DifficultyLevel>("intermediate");
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [quizEvaluation, setQuizEvaluation] = useState<QuizEvaluationResult | null>(null);
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({});
  const [quizLoading, setQuizLoading] = useState(false);

  // Problem Solver State
  const [solveProblem, setSolveProblem] = useState(
    "Find the longest palindromic substring in a string of length N in O(N) or O(N log N) time."
  );
  const [solveDomain, setSolveDomain] = useState<SubjectDomain>("data_structures_algorithms");
  const [solveDifficulty, setSolveDifficulty] = useState<DifficultyLevel>("advanced");
  const [solution, setSolution] = useState<StepByStepSolution | null>(null);
  const [solveLoading, setSolveLoading] = useState(false);

  // Flashcards State
  const [cards, setCards] = useState<SpacedRepetitionCard[]>([]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteryProfile, setMasteryProfile] = useState<LearnerMasteryProfile | null>(null);
  const [cardLoading, setCardLoading] = useState(false);

  // Anki Export State
  const [exportTsv, setExportTsv] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Generate Curriculum
  const handleGenerateCurriculum = async () => {
    setCurricLoading(true);
    try {
      const res = await fetch("/api/learning/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: curricTopic,
          domain: curricDomain,
          baselineLevel: curricBaseline,
          targetLevel: curricTarget,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurriculum(data.data);
        showNotification("Study plan synthesized successfully!");
      } else {
        showNotification(data.error || "Failed to generate plan");
      }
    } catch {
      showNotification("Error connecting to learning engine");
    } finally {
      setCurricLoading(false);
    }
  };

  // Explain Concept
  const handleExplainConcept = async () => {
    setExplainLoading(true);
    try {
      const res = await fetch("/api/learning/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: explainConcept,
          domain: explainDomain,
          level: explainLevel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExplanation(data.data);
        showNotification("Concept explanation loaded!");
      } else {
        showNotification(data.error || "Failed to explain concept");
      }
    } catch {
      showNotification("Error generating concept explanation");
    } finally {
      setExplainLoading(false);
    }
  };

  // Generate Quiz
  const handleGenerateQuiz = async () => {
    setQuizLoading(true);
    setUserAnswers({});
    setQuizEvaluation(null);
    setRevealedHints({});
    try {
      const res = await fetch("/api/learning/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: quizTopic,
          domain: quizDomain,
          level: quizLevel,
          questionCount: 3,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveQuiz(data.data);
        showNotification("Interactive quiz generated!");
      } else {
        showNotification(data.error || "Failed to generate quiz");
      }
    } catch {
      showNotification("Error communicating with quiz engine");
    } finally {
      setQuizLoading(false);
    }
  };

  // Submit Quiz
  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setQuizLoading(true);
    try {
      const submissions = Object.keys(userAnswers).map((qId) => ({
        questionId: qId,
        selectedAnswer: userAnswers[qId],
      }));
      const res = await fetch("/api/learning/quiz", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz: activeQuiz,
          submissions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuizEvaluation(data.data);
        showNotification(`Evaluation complete! Score: ${data.data.scorePercentage}%`);
      } else {
        showNotification(data.error || "Evaluation failed");
      }
    } catch {
      showNotification("Error evaluating submission");
    } finally {
      setQuizLoading(false);
    }
  };

  // Solve Problem
  const handleSolveProblem = async () => {
    setSolveLoading(true);
    try {
      const res = await fetch("/api/learning/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: solveProblem,
          domain: solveDomain,
          difficulty: solveDifficulty,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSolution(data.data);
        showNotification("Step-by-step solution derived!");
      } else {
        showNotification(data.error || "Failed to derive solution");
      }
    } catch {
      showNotification("Error connecting to derivation engine");
    } finally {
      setSolveLoading(false);
    }
  };

  // Load Flashcards
  const loadFlashcards = async () => {
    setCardLoading(true);
    try {
      const res = await fetch("/api/learning/spaced-repetition");
      const data = await res.json();
      if (data.success) {
        setCards(data.data.cards);
        setMasteryProfile(data.data.mastery);
      }
    } catch {
      // Non-fatal
    } finally {
      setCardLoading(false);
    }
  };

  // Review Flashcard
  const handleReviewCard = async (quality: number) => {
    if (cards.length === 0) return;
    const current = cards[currentCardIdx];
    try {
      const res = await fetch("/api/learning/spaced-repetition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          cardId: current.id,
          quality,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Review recorded! Next interval: ${data.data.intervalDays} day(s)`);
        setIsFlipped(false);
        if (currentCardIdx < cards.length - 1) {
          setCurrentCardIdx((prev) => prev + 1);
        } else {
          setCurrentCardIdx(0);
          loadFlashcards();
        }
      }
    } catch {
      showNotification("Failed to submit review");
    }
  };

  // Export Flashcards to Anki
  const handleExportAnki = async () => {
    setExportLoading(true);
    try {
      const res = await fetch("/api/learning/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: curricTopic,
          cards,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExportTsv(data.data.ankiTsv);
        showNotification("Anki TSV generated!");
      } else {
        showNotification(data.error || "Export failed");
      }
    } catch {
      showNotification("Error exporting flashcards");
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "flashcards") {
      loadFlashcards();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 font-sans">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-300 via-sky-300 to-purple-400 bg-clip-text text-transparent">
                  Personalized AI Learning Platform
                </h1>
                <p className="text-sm text-slate-400">
                  Adaptive curriculum, depth-calibrated explanations, interactive quizzes, and SuperMemo SM-2 spaced repetition.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SM-2 Engine Active
            </span>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="mt-4 p-3 rounded-lg bg-indigo-900/60 border border-indigo-700/60 text-indigo-200 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            {notification}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("curriculum")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "curriculum"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Adaptive Curriculum
          </button>
          <button
            onClick={() => setActiveTab("explain")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "explain"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            Concept Explainer
          </button>
          <button
            onClick={() => setActiveTab("quiz")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "quiz"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Interactive Quiz
          </button>
          <button
            onClick={() => setActiveTab("solve")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "solve"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Calculator className="w-4 h-4" />
            Problem Solver
          </button>
          <button
            onClick={() => setActiveTab("flashcards")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "flashcards"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Spaced Repetition
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "export"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Download className="w-4 h-4" />
            Anki Export
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        {/* TAB 1: ADAPTIVE CURRICULUM */}
        {activeTab === "curriculum" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-400" />
                Curriculum Configurator
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Topic / Subject</label>
                  <input
                    type="text"
                    value={curricTopic}
                    onChange={(e) => setCurricTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Domain</label>
                  <select
                    value={curricDomain}
                    onChange={(e) => setCurricDomain(e.target.value as SubjectDomain)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="system_architecture">System Architecture</option>
                    <option value="computer_science">Computer Science</option>
                    <option value="programming">Programming</option>
                    <option value="mathematics">Mathematics</option>
                    <option value="data_structures_algorithms">Data Structures & Algorithms</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Baseline</label>
                    <select
                      value={curricBaseline}
                      onChange={(e) => setCurricBaseline(e.target.value as DifficultyLevel)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Target Mastery</label>
                    <select
                      value={curricTarget}
                      onChange={(e) => setCurricTarget(e.target.value as DifficultyLevel)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleGenerateCurriculum}
                  disabled={curricLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {curricLoading ? "Synthesizing Plan..." : "Generate Study Plan"}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {curriculum ? (
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-100">{curriculum.topic}</h3>
                      <p className="text-xs text-slate-400">
                        Target: {curriculum.targetLevel} • Domain: {curriculum.domain}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                      <Clock className="w-4 h-4" />
                      {curriculum.totalEstimatedHours} Estimated Hours
                    </div>
                  </div>

                  <div className="space-y-4">
                    {curriculum.modules.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs flex items-center justify-center font-bold">
                              {m.order}
                            </span>
                            <h4 className="font-semibold text-slate-200 text-base">{m.title}</h4>
                          </div>
                          <span className="text-xs text-slate-400">{m.estimatedMinutes} mins</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-3 ml-8">{m.description}</p>
                        <div className="flex flex-wrap gap-2 ml-8">
                          {m.concepts.map((c, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-md text-xs bg-slate-900 border border-slate-800 text-slate-300"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-slate-500 flex flex-col items-center justify-center">
                  <Layers className="w-12 h-12 mb-3 text-slate-600" />
                  <p>Configure parameters on the left and generate your personalized syllabus.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CONCEPT EXPLAINER */}
        {activeTab === "explain" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-indigo-400" />
                Explainer Controls
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Concept</label>
                  <input
                    type="text"
                    value={explainConcept}
                    onChange={(e) => setExplainConcept(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Domain</label>
                  <select
                    value={explainDomain}
                    onChange={(e) => setExplainDomain(e.target.value as SubjectDomain)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="computer_science">Computer Science</option>
                    <option value="programming">Programming</option>
                    <option value="mathematics">Mathematics</option>
                    <option value="system_architecture">System Architecture</option>
                    <option value="data_structures_algorithms">Data Structures & Algorithms</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Explanation Depth</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["beginner", "intermediate", "advanced", "expert"] as DifficultyLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setExplainLevel(lvl)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium capitalize border transition-all ${
                          explainLevel === lvl
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleExplainConcept}
                  disabled={explainLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {explainLoading ? "Generating Breakdown..." : "Explain Concept"}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {explanation ? (
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-medium capitalize">
                        {explanation.level} Depth
                      </span>
                      <span className="text-xs text-slate-400">{explanation.domain}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-100">{explanation.concept}</h3>
                    <p className="text-sm text-slate-300 mt-2 leading-relaxed">{explanation.overview}</p>
                  </div>

                  {/* Analogy Box */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
                    <div className="font-semibold text-amber-300 mb-1 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                      Pedagogical Mental Model & Analogy
                    </div>
                    <p className="leading-relaxed">{explanation.analogy}</p>
                  </div>

                  {/* Code / Math Example */}
                  {explanation.codeOrMathExample && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Formal Specification & Concrete Code
                      </h4>
                      <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-xs overflow-x-auto leading-relaxed">
                        {explanation.codeOrMathExample}
                      </pre>
                    </div>
                  )}

                  {/* Key Principles & Pitfalls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                      <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Core Principles
                      </h4>
                      <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                        {explanation.keyPrinciples.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                      <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        Common Anti-Patterns
                      </h4>
                      <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                        {explanation.commonPitfalls.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-slate-500 flex flex-col items-center justify-center">
                  <Brain className="w-12 h-12 mb-3 text-slate-600" />
                  <p>Choose a concept and depth level to view intuition and formal models.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: INTERACTIVE QUIZ */}
        {activeTab === "quiz" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                Assessment Setup
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Assessment Topic</label>
                  <input
                    type="text"
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Domain</label>
                  <select
                    value={quizDomain}
                    onChange={(e) => setQuizDomain(e.target.value as SubjectDomain)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="data_structures_algorithms">Data Structures & Algorithms</option>
                    <option value="computer_science">Computer Science</option>
                    <option value="programming">Programming</option>
                    <option value="system_architecture">System Architecture</option>
                    <option value="mathematics">Mathematics</option>
                  </select>
                </div>
                <button
                  onClick={handleGenerateQuiz}
                  disabled={quizLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {quizLoading ? "Building Assessment..." : "Generate Interactive Quiz"}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {activeQuiz ? (
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-100">{activeQuiz.topic}</h3>
                      <p className="text-xs text-slate-400">Total Questions: {activeQuiz.questions.length}</p>
                    </div>
                    {quizEvaluation && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-base">
                        Score: {quizEvaluation.scorePercentage}%
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {activeQuiz.questions.map((q, qIdx) => {
                      const evalItem = quizEvaluation?.evaluations.find((e) => e.questionId === q.id);
                      return (
                        <div
                          key={q.id}
                          className={`p-4 rounded-xl bg-slate-950/80 border transition-all ${
                            evalItem
                              ? evalItem.isCorrect
                                ? "border-emerald-500/50"
                                : "border-rose-500/50"
                              : "border-slate-800"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <span className="font-semibold text-slate-200 text-sm">
                              Q{qIdx + 1}. {q.prompt}
                            </span>
                          </div>

                          {/* Options */}
                          {q.options && (
                            <div className="space-y-2 mt-3">
                              {q.options.map((opt, optIdx) => (
                                <label
                                  key={optIdx}
                                  className={`flex items-start gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                                    userAnswers[q.id] === opt
                                      ? "bg-indigo-600/20 border-indigo-500 text-slate-100"
                                      : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`question_${q.id}`}
                                    value={opt}
                                    checked={userAnswers[q.id] === opt}
                                    onChange={() =>
                                      setUserAnswers((prev) => ({ ...prev, [q.id]: opt }))
                                    }
                                    className="mt-0.5 text-indigo-600"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {/* Hints Drawer */}
                          <div className="mt-3">
                            <button
                              onClick={() =>
                                setRevealedHints((prev) => ({
                                  ...prev,
                                  [q.id]: (prev[q.id] || 0) + 1,
                                }))
                              }
                              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                            >
                              <Lightbulb className="w-3.5 h-3.5" />
                              Need a hint? (Revealed: {revealedHints[q.id] || 0}/{q.hints.length})
                            </button>
                            {revealedHints[q.id] && revealedHints[q.id] > 0 && (
                              <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1">
                                {q.hints.slice(0, revealedHints[q.id]).map((h, i) => (
                                  <p key={i}>• {h}</p>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Evaluation Result Feedback */}
                          {evalItem && (
                            <div
                              className={`mt-4 p-3 rounded-lg border text-xs ${
                                evalItem.isCorrect
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                              }`}
                            >
                              <div className="font-semibold mb-1">
                                {evalItem.isCorrect ? "Correct!" : "Incorrect"}
                              </div>
                              <p className="text-slate-300">{evalItem.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleSubmitQuiz}
                    disabled={quizLoading || Object.keys(userAnswers).length === 0}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {quizLoading ? "Grading..." : "Submit Answers for Evaluation"}
                  </button>
                </div>
              ) : (
                <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-slate-500 flex flex-col items-center justify-center">
                  <HelpCircle className="w-12 h-12 mb-3 text-slate-600" />
                  <p>Generate a quiz on the left to test your active problem solving.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: STEP-BY-STEP PROBLEM SOLVER */}
        {activeTab === "solve" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-400" />
                Problem Statement
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Problem</label>
                  <textarea
                    rows={4}
                    value={solveProblem}
                    onChange={(e) => setSolveProblem(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Domain</label>
                  <select
                    value={solveDomain}
                    onChange={(e) => setSolveDomain(e.target.value as SubjectDomain)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="data_structures_algorithms">Data Structures & Algorithms</option>
                    <option value="mathematics">Mathematics</option>
                    <option value="system_architecture">System Architecture</option>
                    <option value="computer_science">Computer Science</option>
                  </select>
                </div>
                <button
                  onClick={handleSolveProblem}
                  disabled={solveLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {solveLoading ? "Deriving Steps..." : "Derive Step-by-Step Solution"}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {solution ? (
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-6">
                  <div>
                    <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">
                      {solution.domain} • {solution.difficulty}
                    </span>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">{solution.problem}</h3>
                  </div>

                  <div className="space-y-4">
                    {solution.steps.map((st) => (
                      <div key={st.stepNumber} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 text-xs flex items-center justify-center font-bold">
                            {st.stepNumber}
                          </span>
                          <h4 className="font-semibold text-slate-200 text-sm">{st.title}</h4>
                        </div>
                        <p className="text-xs text-slate-300 mb-2 leading-relaxed">{st.explanation}</p>
                        {st.derivationOrCode && (
                          <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-sky-300 font-mono text-xs overflow-x-auto">
                            {st.derivationOrCode}
                          </pre>
                        )}
                        {st.hint && (
                          <div className="mt-2 text-xs text-amber-400/90 flex items-center gap-1.5">
                            <Lightbulb className="w-3 h-3" />
                            Hint: {st.hint}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                    <div className="font-bold text-emerald-200 mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Verification Proof & Invariant Check
                    </div>
                    {solution.verificationExplanation}
                  </div>
                </div>
              ) : (
                <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-slate-500 flex flex-col items-center justify-center">
                  <Calculator className="w-12 h-12 mb-3 text-slate-600" />
                  <p>Submit a problem on the left to see structured derivation steps.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SPACED REPETITION FLASHCARDS */}
        {activeTab === "flashcards" && (
          <div className="max-w-2xl mx-auto space-y-6">
            {cards.length > 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl text-center space-y-6">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Card {currentCardIdx + 1} of {cards.length}
                  </span>
                  <span className="text-indigo-400">
                    Ease Factor: {cards[currentCardIdx].easeFactor} • Reps: {cards[currentCardIdx].repetitions}
                  </span>
                </div>

                {/* Flip Card Area */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="min-h-[200px] p-8 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:border-slate-700 transition-all shadow-inner"
                >
                  <span className="text-xs text-slate-500 uppercase tracking-widest mb-3">
                    {isFlipped ? "Answer / Back" : "Prompt / Front (Click to Flip)"}
                  </span>
                  <p className="text-lg font-medium text-slate-100">
                    {isFlipped ? cards[currentCardIdx].back : cards[currentCardIdx].front}
                  </p>
                </div>

                {/* SM-2 Rating Buttons */}
                {isFlipped && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">Rate your recall quality (SuperMemo SM-2):</p>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => handleReviewCard(0)}
                        className="py-2.5 px-3 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs font-semibold hover:bg-rose-600/30 transition-all"
                      >
                        Again (0)
                      </button>
                      <button
                        onClick={() => handleReviewCard(2)}
                        className="py-2.5 px-3 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-600/30 transition-all"
                      >
                        Hard (2)
                      </button>
                      <button
                        onClick={() => handleReviewCard(4)}
                        className="py-2.5 px-3 rounded-xl bg-sky-600/20 border border-sky-500/40 text-sky-300 text-xs font-semibold hover:bg-sky-600/30 transition-all"
                      >
                        Good (4)
                      </button>
                      <button
                        onClick={() => handleReviewCard(5)}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-600/30 transition-all"
                      >
                        Easy (5)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-slate-500 flex flex-col items-center justify-center">
                <RotateCcw className="w-12 h-12 mb-3 text-slate-600" />
                <p>No cards scheduled for review right now. Generate a new card via the Anki Export tab.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ANKI EXPORT */}
        {activeTab === "export" && (
          <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-400" />
              Anki-Compatible Flashcard Exporter
            </h2>
            <p className="text-xs text-slate-400">
              Export your cards into standard tab-separated format (.tsv) for direct offline import into Anki or SuperMemo.
            </p>
            <button
              onClick={handleExportAnki}
              disabled={exportLoading}
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {exportLoading ? "Generating..." : "Generate Anki TSV Bundle"}
            </button>
            {exportTsv && (
              <div className="mt-4">
                <label className="text-xs font-medium text-slate-400 block mb-1">Anki TSV Content</label>
                <textarea
                  readOnly
                  rows={8}
                  value={exportTsv}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 resize-none focus:outline-none"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
