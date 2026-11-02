/**
 * TATTVA AI - Intelligent AI Orchestration Architecture
 * Core Type Definitions & Interfaces
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type TaskIntent =
  | "general_chat"
  | "reasoning"
  | "coding"
  | "mathematics"
  | "web_research"
  | "document_analysis"
  | "image_generation"
  | "image_editing"
  | "data_analysis"
  | "translation"
  | "summarization"
  | "voice_chat"
  | "agent_task"
  | "file_generation";

export type ModelProvider = "gemini" | "openrouter" | "nvidia" | "huggingface" | "local";

export interface AIModelSpec {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow: number;
  maxOutputTokens: number;
  latencyTier: "ultra_low" | "low" | "medium" | "high";
  strengths: TaskIntent[];
  isAvailable: boolean;
}

export interface IntentClassificationResult {
  primaryIntent: TaskIntent;
  confidence: number;
  secondaryIntents: TaskIntent[];
  complexityScore: number; // 1 (simplest greeting) to 10 (multi-step complex architecture)
  requiresTools: boolean;
  suggestedTools: string[];
  detectedLanguage: string;
  isMultilingual: boolean;
  diffusionPrompt?: string;
  editStrength?: number;
  extractedParameters?: Record<string, any>;
}

export interface ToolParameterSchema {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
  default?: any;
}

export interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  category: "search" | "code" | "file" | "data" | "image" | "integration" | "memory";
  riskLevel: "safe" | "confirm_required";
  parameters: Record<string, ToolParameterSchema>;
  execute: (params: Record<string, any>, context: ExecutionContext) => Promise<ToolExecutionResult>;
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  output: any;
  error?: string;
  executionTimeMs: number;
  citations?: Array<{ title: string; url: string; snippet?: string }>;
  artifacts?: Array<{ type: string; title: string; data: any; downloadUrl?: string }>;
}

export interface ExecutionContext {
  userId: string;
  userEmail: string;
  sessionId?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  uploadedFiles?: Array<{ name: string; type: string; data?: string; path?: string }>;
}

export interface ReasoningStep {
  stepNumber: number;
  title: string;
  thought: string;
  actionTaken?: string;
  evidenceFound?: string;
  status: "pending" | "running" | "completed" | "failed";
}

export interface ReasoningPlan {
  problemSummary: string;
  decomposition: string[];
  steps: ReasoningStep[];
  verificationHypothesis: string;
  finalAnswer: string;
  confidenceScore: number;
}

export interface AgentStepEvent {
  stepIndex: number;
  totalSteps: number;
  title: string;
  description: string;
  status: "planning" | "executing" | "validating" | "completed" | "error";
  toolUsed?: string;
  outputSnippet?: string;
  timestamp: number;
}

export interface AgentExecutionState {
  taskId: string;
  userPrompt: string;
  status: "queued" | "in_progress" | "requires_confirmation" | "completed" | "failed";
  plan: string[];
  currentStepIndex: number;
  stepEvents: AgentStepEvent[];
  collectedData: Record<string, any>;
  finalReport?: string;
  error?: string;
}

export type ExperienceStatus = "unverified" | "failed" | "verified" | "human_approved";

export interface ExperienceRecord {
  id: string;
  taskType: TaskIntent;
  problemStatement: string;
  attemptedSolution: string;
  verificationOutcome: {
    passed: boolean;
    testResults?: string;
    metrics?: Record<string, number>;
  };
  humanRating?: "positive" | "negative";
  status: ExperienceStatus;
  keyLearnings: string[];
  createdAt: number;
}

export interface RAGChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  chunkIndex: number;
  embedding?: number[];
  similarityScore?: number;
  metadata?: Record<string, any>;
}

export interface RAGSearchResult {
  query: string;
  matchedChunks: RAGChunk[];
  combinedContext: string;
  sources: Array<{ documentName: string; chunkIndex: number; score: number }>;
}

export interface OrchestratorResponse {
  role: "assistant";
  content: string;
  kind: "text" | "image";
  intent: TaskIntent;
  modelUsed: string;
  provider: ModelProvider;
  latencyMs: number;
  citations?: Array<{ title: string; url: string; snippet?: string }>;
  toolsExecuted?: string[];
  reasoningPlan?: ReasoningPlan;
  agentState?: AgentExecutionState;
  recalledMemories?: Array<{ id: string; content: string; category: string }>;
  image?: string;
  imageMetadata?: Record<string, any>;
  fallbackOccurred?: boolean;
  warnings?: string[];
}
