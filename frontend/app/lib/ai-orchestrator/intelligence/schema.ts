/**
 * TATTVA AI - Prompt Understanding & Intelligence Engine Schema
 * Structured semantic representations for intent, entities, context, and validation
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { TaskIntent, ModelProvider } from "../types";

export type OutputFormatType =
  | "code"
  | "document"
  | "json"
  | "structured_text"
  | "concise_answer"
  | "detailed_guide"
  | "image"
  | "table"
  | "step_by_step";

export type OutputLengthType = "concise" | "moderate" | "comprehensive";

export type ComplexityLevel = "low" | "medium" | "high" | "extreme";

export interface ContextReferenceInfo {
  hasAnaphora: boolean;
  refersToAttachment?: boolean;
  referencedTopic?: string;
  referencedEntity?: string;
  referencedFile?: string;
  referencedCodeSnippet?: string;
  resolvedMeaning?: string;
}

export interface ExpectedOutputSpec {
  format: OutputFormatType;
  length: OutputLengthType;
  language: string; // "en" | "te" | "hi" etc.
  isFinishedArtifact: boolean;
  requiresZeroPlaceholders: boolean;
}

export interface SubtaskPlanItem {
  stepNumber: number;
  title: string;
  description: string;
  dependencies: number[];
  recommendedCapability: string;
}

export interface TaskDecompositionResult {
  isMultiStep: boolean;
  subtasks: SubtaskPlanItem[];
}

export interface AnalyzedPrompt {
  rawPrompt: string;
  resolvedPrompt: string;
  primaryIntent: TaskIntent;
  secondaryIntents: TaskIntent[];
  userObjective: string;
  entities: string[];
  requiredActions: string[];
  explicitInstructions: string[];
  implicitRequirements: string[];
  constraints: string[];
  contextReferences: ContextReferenceInfo;
  expectedOutput: ExpectedOutputSpec;
  requiredTools: string[];
  appropriateModel: string;
  preferredProvider?: ModelProvider;
  complexity: ComplexityLevel;
  complexityScore: number; // 1 - 10
  isAmbiguous: boolean;
  ambiguityScore?: number; // 0 - 100
  missingDetails?: string[];
  ambiguityReason?: string;
  clarificationQuestion?: string;
  taskDecomposition?: TaskDecompositionResult;
  detectedDialect?: "english" | "telugu" | "telugu_english_mixed" | "hindi" | "multilingual";
}

export interface ValidationResult {
  isValid: boolean;
  answersActualQuestion: boolean;
  satisfiesRequirements: boolean;
  preservesConstraints: boolean;
  usesCorrectContext: boolean;
  matchesRequestedFormat: boolean;
  hasUnsupportedAssumptions: boolean;
  score: number; // 0 - 100
  missingRequirements: string[];
  correctionGuidance?: string;
}
