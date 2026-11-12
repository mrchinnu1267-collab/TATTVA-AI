"use client";

import React, { useState } from "react";
import {
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Layers,
  Palette,
  Camera,
  Eye,
  Type,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sliders,
  Maximize2,
} from "lucide-react";
import type {
  ComprehensiveAdherenceReport,
  CategoryEvaluation,
  IntelligentCorrectionResult,
} from "../../lib/image-engine/intelligence/types";

interface ImageIntelligenceReportProps {
  report?: ComprehensiveAdherenceReport | null;
  image: string;
  prompt: string;
  onImageImproved?: (result: IntelligentCorrectionResult) => void;
  className?: string;
}

export function ImageIntelligenceReport({
  report: initialReport,
  image: initialImage,
  prompt,
  onImageImproved,
  className = "",
}: ImageIntelligenceReportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "comparison" | "correction">("overview");
  const [expandedSection, setExpandedSection] = useState<string | null>("adherence");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("main_subject");

  // Live state for correction iterations
  const [report, setReport] = useState<ComprehensiveAdherenceReport | null | undefined>(initialReport);
  const [currentImage, setCurrentImage] = useState<string>(initialImage);
  const [isImproving, setIsImproving] = useState(false);
  const [improvementStep, setImprovementStep] = useState<string>("");
  const [correctionHistory, setCorrectionHistory] = useState<IntelligentCorrectionResult[]>([]);
  const [activeImageView, setActiveImageView] = useState<"current" | "original">("current");

  // Keep local state in sync if prop changes
  React.useEffect(() => {
    if (initialReport) setReport(initialReport);
  }, [initialReport]);

  React.useEffect(() => {
    setCurrentImage(initialImage);
  }, [initialImage]);

  if (!report) {
    return null;
  }

  const { understanding, categories, overallScore, overallVerdict, characterAssessment } = report;
  const isFail = overallVerdict === "FAIL";
  const isPartial = overallVerdict === "NEEDS_IMPROVEMENT";

  const handleImproveImage = async () => {
    if (isImproving || !report) return;

    try {
      setIsImproving(true);
      setImprovementStep("1. Formulating targeted surgical editing instruction...");

      const nextAttempt = correctionHistory.length + 1;
      const res = await fetch("/api/image/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "improve",
          image: currentImage,
          prompt,
          currentReport: report,
          attemptNumber: nextAttempt,
          forceVision: true,
        }),
      });

      setImprovementStep("2. Generating revised image & re-evaluating prompt adherence...");

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to improve image (${res.status})`);
      }

      const data = await res.json();
      const result: IntelligentCorrectionResult = data.result;

      setCorrectionHistory((prev) => [...prev, result]);
      setCurrentImage(result.revisedImage);
      setReport(result.postCorrectionReport);
      setActiveImageView("current");
      setActiveTab("correction");

      if (onImageImproved) {
        onImageImproved(result);
      }
    } catch (err: any) {
      alert(`Could not complete automated correction: ${err.message}`);
    } finally {
      setIsImproving(false);
      setImprovementStep("");
    }
  };

  const toggleSection = (sec: string) => {
    setExpandedSection(expandedSection === sec ? null : sec);
  };

  return (
    <div
      className={`mt-3 rounded-2xl border border-[var(--border)] bg-[var(--soft)]/80 text-[var(--foreground)] backdrop-blur-md transition-all ${className}`}
    >
      {/* Header Pill / Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex cursor-pointer items-center justify-between p-3.5 sm:px-4"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-xl ${
              isFail
                ? "bg-red-500/15 text-red-500"
                : isPartial
                ? "bg-amber-500/15 text-amber-500"
                : "bg-emerald-500/15 text-emerald-500"
            }`}
          >
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-tight">Image Intelligence & Adherence</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isFail
                    ? "bg-red-500/15 text-red-600 dark:text-red-400"
                    : isPartial
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {overallScore}/100 · {overallVerdict}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Multimodal Vision Analysis & Forensic Verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {overallScore < 85 && !isOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
                handleImproveImage();
              }}
              disabled={isImproving}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 py-1 text-[11px] font-semibold text-amber-600 transition hover:bg-amber-500/25 dark:text-amber-400"
            >
              <Sparkles className="h-3 w-3" />
              <span>Improve</span>
            </button>
          )}

          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-[var(--foreground)]"
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Accordion Body */}
      {isOpen && (
        <div className="border-t border-[var(--border)] p-4 sm:p-5">
          {/* Sub-Header Navigation & Action Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`rounded-lg px-3 py-1 font-medium transition ${
                  activeTab === "overview"
                    ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                    : "text-neutral-500 hover:text-[var(--foreground)]"
                }`}
              >
                Overview & Dimensions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("comparison")}
                className={`rounded-lg px-3 py-1 font-medium transition ${
                  activeTab === "comparison"
                    ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                    : "text-neutral-500 hover:text-[var(--foreground)]"
                }`}
              >
                Prompt Adherence (10 Categories)
              </button>
              {correctionHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("correction")}
                  className={`rounded-lg px-3 py-1 font-medium transition ${
                    activeTab === "correction"
                      ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                      : "text-neutral-500 hover:text-[var(--foreground)]"
                  }`}
                >
                  Correction Delta ({correctionHistory.length})
                </button>
              )}
            </div>

            {/* "Improve This Image" Action Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleImproveImage}
                disabled={isImproving || correctionHistory.length >= 3}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
              >
                {isImproving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Improving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Improve This Image</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Improvement In-Progress Banner */}
          {isImproving && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-2 font-semibold">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
                <span>Targeted Visual Correction in Progress</span>
              </div>
              <p className="mt-1 text-[11px] opacity-90">{improvementStep}</p>
            </div>
          )}

          {/* TAB 1: OVERVIEW & 10 SECTIONS */}
          {activeTab === "overview" && (
            <div className="space-y-4 text-xs">
              {/* SECTION A: Image Overview */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5">
                <div className="flex items-center gap-2 text-neutral-400">
                  <Info className="h-3.5 w-3.5" />
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Section A · Image Overview
                  </span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-neutral-500">Main Subject:</span>{" "}
                    <span className="font-semibold">{understanding.mainSubject}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Environment:</span>{" "}
                    <span>{understanding.backgroundAndEnvironment.setting}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Vision Model:</span>{" "}
                    <span className="font-mono text-[10px] text-neutral-600 dark:text-neutral-400">
                      {understanding.modelUsed}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Audited At:</span>{" "}
                    <span className="text-[10px] text-neutral-600 dark:text-neutral-400">
                      {new Date(understanding.analysisTimestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION B: Objects Detected */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5">
                <div className="flex items-center gap-2 text-neutral-400">
                  <Layers className="h-3.5 w-3.5" />
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Section B · Objects & Counts Detected
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {understanding.objectsAndCounts.map((obj, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--soft)] px-2.5 py-1 text-[11px]"
                    >
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {obj.count}×
                      </span>
                      <span>{obj.name}</span>
                      {obj.location && (
                        <span className="text-[9px] text-neutral-400">({obj.location})</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* SECTION C: Character Analysis */}
              {characterAssessment?.isRecognizableCharacter && (
                <div
                  className={`rounded-xl border p-3.5 ${
                    characterAssessment.identityMatchStatus === "verified"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-red-500/30 bg-red-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold uppercase tracking-wider text-[10px] text-neutral-400">
                      Section C · Character Accuracy Assessment
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                        characterAssessment.identityMatchStatus === "verified"
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-500/20 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {characterAssessment.identityMatchStatus.replace("_", " ")}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs">
                    <span className="font-semibold">Requested:</span>{" "}
                    {characterAssessment.requestedCharacterName}
                  </p>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                    <span className="font-semibold">Observed:</span>{" "}
                    {characterAssessment.observedCharacterDescription}
                  </p>

                  {characterAssessment.mismatchReason && (
                    <div className="mt-2 rounded-lg bg-red-500/10 p-2 text-[11px] text-red-600 dark:text-red-300">
                      {characterAssessment.mismatchReason}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION D & E: Colors & Composition Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                {/* SECTION D: Color Analysis */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Palette className="h-3.5 w-3.5" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Section D · Color Analysis
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {understanding.dominantColors.map((col, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--soft)] px-2 py-0.5 text-[11px]"
                      >
                        <span
                          className="h-2 w-2 rounded-full border border-black/20"
                          style={{ backgroundColor: col.hex || col.name }}
                        />
                        <span>{col.name}</span>
                        <span className="text-[9px] text-neutral-400">({col.prominence})</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* SECTION E: Composition & Camera */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Camera className="h-3.5 w-3.5" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Section E · Composition & Framing
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-[11px]">
                    <div>
                      <span className="text-neutral-500">Angle:</span> {understanding.cameraAngle}
                    </div>
                    <div>
                      <span className="text-neutral-500">Layout:</span> {understanding.composition}
                    </div>
                    <div>
                      <span className="text-neutral-500">Lighting:</span> {understanding.lighting.type}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION H, I, J: Missing, Quality, Recommendations */}
              <div className="grid gap-3 sm:grid-cols-3">
                {/* SECTION H: Missing Requirements */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-neutral-400">
                    Section H · Missing Items
                  </span>
                  {report.missingRequirements.length === 0 ? (
                    <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                      ✓ No missing requirements detected.
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-1 text-[11px] text-red-600 dark:text-red-400">
                      {report.missingRequirements.map((m, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* SECTION I: Quality Issues */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-neutral-400">
                    Section I · Image Quality
                  </span>
                  {understanding.qualityIssues.length === 0 ? (
                    <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                      ✓ Zero anatomical or visual artifacts.
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-1 text-[11px] text-amber-600 dark:text-amber-400">
                      {understanding.qualityIssues.map((q, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* SECTION J: Improvement Recommendations */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-neutral-400">
                    Section J · Recommendations
                  </span>
                  {report.improvementRecommendations.length === 0 ? (
                    <p className="mt-1.5 text-[11px] text-neutral-500">
                      Image meets target accuracy standards.
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-1 text-[11px] text-neutral-600 dark:text-neutral-300">
                      {report.improvementRecommendations.slice(0, 2).map((r, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span>→</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROMPT ADHERENCE (10 EVALUATION CATEGORIES & VISUAL COMPARISON) */}
          {activeTab === "comparison" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Original User Prompt Ground Truth:
                </span>
                <p className="mt-1 font-medium italic text-[var(--foreground)]">
                  &ldquo;{prompt}&rdquo;
                </p>
              </div>

              {/* 10 Category Accordion List */}
              <div className="space-y-2">
                {Object.values(categories).map((cat: CategoryEvaluation) => {
                  const isCatFail = cat.status === "FAIL";
                  const isCatPartial = cat.status === "PARTIAL";
                  const isExpanded = expandedCategory === cat.categoryId;

                  return (
                    <div
                      key={cat.categoryId}
                      className={`rounded-xl border transition ${
                        isCatFail
                          ? "border-red-500/30 bg-red-500/5"
                          : isCatPartial
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-[var(--border)] bg-[var(--background)]"
                      }`}
                    >
                      <div
                        onClick={() =>
                          setExpandedCategory(isExpanded ? null : cat.categoryId)
                        }
                        className="flex cursor-pointer items-center justify-between p-3"
                      >
                        <div className="flex items-center gap-2">
                          {isCatFail ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : isCatPartial ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                          <span className="text-xs font-semibold">{cat.categoryLabel}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              isCatFail
                                ? "bg-red-500/20 text-red-600 dark:text-red-400"
                                : isCatPartial
                                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {cat.status} ({cat.score}%)
                          </span>
                          <span className="text-neutral-400">
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Category Evidence */}
                      {isExpanded && (
                        <div className="border-t border-[var(--border)]/50 p-3 pt-2 text-xs">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-neutral-400">
                                Expected:
                              </span>
                              <p className="mt-0.5 text-neutral-700 dark:text-neutral-300">
                                {cat.expectedResult}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-neutral-400">
                                Observed:
                              </span>
                              <p className="mt-0.5 text-neutral-700 dark:text-neutral-300">
                                {cat.observedResult}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2.5 rounded-lg bg-[var(--soft)] p-2">
                            <span className="text-[10px] font-bold uppercase text-neutral-400">
                              Visual Evidence & Confidence ({cat.confidence}%):
                            </span>
                            <p className="mt-0.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                              {cat.visualEvidence}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CORRECTION DELTA & BEFORE/AFTER */}
          {activeTab === "correction" && correctionHistory.length > 0 && (
            <div className="space-y-3">
              {correctionHistory.map((res, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      Correction Pass #{res.attemptNumber} of {res.maxAttempts}
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Score Delta: +{res.improvementDelta} pts
                    </span>
                  </div>

                  <div className="mt-2 rounded-lg bg-[var(--background)] p-2.5">
                    <span className="text-[10px] font-bold uppercase text-neutral-400">
                      Targeted Editing Directive:
                    </span>
                    <p className="mt-0.5 font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
                      {res.editingInstruction.promptDirective}
                    </p>
                  </div>

                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    <div>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        ✓ Newly Satisfied ({res.satisfiedRequirements.length}):
                      </span>
                      <ul className="mt-1 list-disc pl-4 text-[11px] text-neutral-600 dark:text-neutral-300">
                        {res.satisfiedRequirements.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        ⚠ Remaining Unsatisfied ({res.remainingUnsatisfiedRequirements.length}):
                      </span>
                      <ul className="mt-1 list-disc pl-4 text-[11px] text-neutral-600 dark:text-neutral-300">
                        {res.remainingUnsatisfiedRequirements.length === 0 ? (
                          <li className="list-none italic text-emerald-500">None! All satisfied.</li>
                        ) : (
                          res.remainingUnsatisfiedRequirements.map((u, i) => <li key={i}>{u}</li>)
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

