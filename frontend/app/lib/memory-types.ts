/**
 * Self-Personalizing AI Assistant - Memory, Personalization & Feedback Types
 * Architectural Design for TATTVA AI
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type MemoryCategory =
  | "preference"      // User preferences: e.g. "Prefers concise code without preamble"
  | "project"         // Ongoing projects: e.g. "Developing a Next.js e-commerce application"
  | "technical_level" // Technical knowledge: e.g. "Senior Python & TypeScript software engineer"
  | "language"        // Language preference: e.g. "Prefers native Telugu for casual discussion, English for code"
  | "formatting"      // Formatting preference: e.g. "Prefers Markdown tables for comparisons"
  | "instruction"     // Explicit directives: e.g. "Always use Tailwind CSS v4 syntax"
  | "architecture"    // Project architecture details
  | "solved_issue"    // Previously solved technical issues
  | "task";           // Active ongoing tasks

export type MemoryItem = {
  id: string;
  userId?: string;
  userEmail: string;
  workspaceId?: string;
  content: string;
  category: MemoryCategory;
  importance: number; // 1 to 10
  embedding?: number[]; // 3072-dimensional vector embedding from gemini-embedding-001
  similarity?: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  source: "explicit" | "extracted";
  isConfirmed?: boolean; // Confirmed fact vs inferred assumption
  confidence?: number;   // 0.0 to 1.0 confidence score
};

export type TechnicalDepth = "beginner" | "intermediate" | "advanced" | "expert";
export type ResponseLength = "concise" | "balanced" | "detailed" | "deep_dive";
export type TonePreference = "conversational" | "direct" | "technical" | "empathic";
export type CodeStylePreference = "clean_typed" | "detailed_comments" | "minimalist";

export type PersonalizationSettings = {
  enabled: boolean;
  technicalDepth: TechnicalDepth;
  responseLength: ResponseLength;
  tone: TonePreference;
  preferredLanguage: string; // "auto", "en", "te", "hi", "ta", etc.
  codeStyle: CodeStylePreference;
  situationalEmojis: boolean;
  customInstructions?: string;
  updatedAt?: number;
};

export type FeedbackCategory =
  | "helpful"
  | "not_helpful"
  | "too_detailed"
  | "too_short"
  | "incorrect_answer"
  | "wrong_language"
  | "other";

export type MessageFeedback = {
  id: string;
  messageId: string;
  sessionId?: string;
  userEmail?: string;
  rating: "positive" | "negative";
  category: FeedbackCategory;
  comment?: string;
  createdAt: number;
};

export const DEFAULT_PERSONALIZATION_SETTINGS: PersonalizationSettings = {
  enabled: true,
  technicalDepth: "advanced",
  responseLength: "balanced",
  tone: "conversational",
  preferredLanguage: "auto",
  codeStyle: "clean_typed",
  situationalEmojis: true,
  customInstructions: "",
};
