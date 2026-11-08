/**
 * TATTVA AI - Human-Centred Intelligence Engine
 * Type Definitions & Cognitive Signal Contracts
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type ConversationalGoal =
  | "direct_question"        // Short factual/conceptual question requiring a concise, direct answer
  | "detailed_explanation"   // In-depth explanation, step-by-step breakdown, or tutorial with examples
  | "implementation_request" // Writing code, scripts, configs, or technical artifacts
  | "error_troubleshooting"  // Reporting an error, bug, failure, or unexpected behavior
  | "continuation"           // Continuing an ongoing task, project, or sequence
  | "modification"           // Requesting a modification, refinement, or alternative ("make it shorter", "fix this")
  | "ideation"               // Brainstorming, architectural design, feasibility exploration
  | "clarification_needed";  // Ambiguous query where essential referent cannot be resolved from context

export type ConversationalSignal =
  | "neutral"
  | "frustration"
  | "confusion"
  | "urgency"
  | "curiosity"
  | "dissatisfaction"
  | "satisfaction";

export type ProgressStage =
  | "understanding"  // "Understanding your request..."
  | "researching"    // "Researching relevant information..."
  | "analyzing"      // "Analyzing your documents..."
  | "preparing"      // "Preparing your solution..."
  | "verifying"      // "Verifying the results..."
  | "completed";     // "Completed successfully."

export interface CommunicationPreference {
  length: "concise" | "balanced" | "detailed";
  technicalDepth: "accessible" | "technical" | "expert";
  wantsExamples: boolean;
  wantsSteps: boolean;
  preferredLanguage?: string;
}

export interface ContextualReferenceResolution {
  originalQuery: string;
  resolvedQuery: string;
  isAmbiguousReference: boolean;
  referencedSubject?: string;
  referencedCodeSnippet?: string;
  referencedError?: string;
  clarificationQuestion?: string;
}

export interface HumanContextAnalysis {
  goal: ConversationalGoal;
  signals: ConversationalSignal[];
  primarySignal: ConversationalSignal;
  isRepeatedError: boolean;
  failedSolutionsAttempted: string[];
  referenceResolution: ContextualReferenceResolution;
  communicationPreference: CommunicationPreference;
  activeProjectTopic?: string;
  suggestedProactiveStep?: string;
}

export interface DeveloperDebugInfo {
  stagesExecuted: ProgressStage[];
  executionTimeMs: number;
  toolsUsed: string[];
  intent: string;
  complexityScore: number;
  internalTechnicalLogs?: string[];
  technicalError?: string;
  sanitizedTokensCount?: number;
}

