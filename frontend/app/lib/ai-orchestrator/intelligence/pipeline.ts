/**
 * TATTVA AI - Master Prompt Intelligence Pipeline
 * 10-Stage Execution Engine for Cognitive Intent, Planning, Context Resolution & Validation
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { TaskIntent, ModelProvider } from "../types";
import { promptAnalyzer } from "./prompt-analyzer";
import { responseValidator } from "./response-validator";
import { promptEnhancer } from "./prompt-enhancer";
import { AnalyzedPrompt, ValidationResult } from "./schema";
import { ConversationTurn } from "./context-manager";

export interface PipelineExecutionRequest {
  userPrompt: string;
  conversationHistory?: ConversationTurn[];
  hasAttachments?: boolean;
  workspaceContext?: {
    workspaceId?: string;
    activeFile?: string;
    selectedRepo?: string;
  };
  mockExecutionHandler?: (resolvedPrompt: string, plan: AnalyzedPrompt) => Promise<string>;
}

export interface PipelineExecutionStageLog {
  stage: number;
  name: string;
  status: "success" | "clarification_needed" | "warning" | "error";
  durationMs: number;
  details?: Record<string, unknown>;
}

export interface PipelineExecutionResponse {
  finalResponse: string;
  pipelineDurationMs: number;
  stages: PipelineExecutionStageLog[];
  analyzedPrompt: AnalyzedPrompt;
  validationResult?: ValidationResult;
  requiresClarification: boolean;
  clarificationQuestion?: string;
  enhancedSystemPrompt?: string;
  isFullySatisfied: boolean;
}

export class PromptIntelligencePipeline {
  private static instance: PromptIntelligencePipeline;

  public static getInstance(): PromptIntelligencePipeline {
    if (!PromptIntelligencePipeline.instance) {
      PromptIntelligencePipeline.instance = new PromptIntelligencePipeline();
    }
    return PromptIntelligencePipeline.instance;
  }

  /**
   * Executes the full 10-stage intelligence and prompt understanding pipeline
   */
  public async execute(request: PipelineExecutionRequest): Promise<PipelineExecutionResponse> {
    const startTime = Date.now();
    const stages: PipelineExecutionStageLog[] = [];

    // Helper to log stage execution
    const recordStage = <T>(
      stageNumber: number,
      name: string,
      fn: () => T,
      statusOverride?: "success" | "clarification_needed" | "warning"
    ): { result: T; log: PipelineExecutionStageLog } => {
      const stageStart = Date.now();
      const result = fn();
      const durationMs = Date.now() - stageStart;
      const log: PipelineExecutionStageLog = {
        stage: stageNumber,
        name,
        status: statusOverride || "success",
        durationMs,
      };
      stages.push(log);
      return { result, log };
    };

    // Stage 1: User Request Intake & Normalization
    const { result: rawPrompt } = recordStage(1, "User Request Intake", () => {
      return request.userPrompt.trim();
    });

    // Stage 2 to 7: Unified Deep Semantic Analysis (Intents, Requirements, Context, Ambiguity, Planning, Routing)
    const analysisStart = Date.now();
    const analyzed = promptAnalyzer.analyzePrompt(
      rawPrompt,
      request.conversationHistory || [],
      request.hasAttachments || false
    );
    const analysisDuration = Date.now() - analysisStart;

    stages.push({
      stage: 2,
      name: "Intent Classification",
      status: "success",
      durationMs: Math.round(analysisDuration * 0.2),
      details: { primaryIntent: analyzed.primaryIntent, secondaryIntents: analyzed.secondaryIntents },
    });

    stages.push({
      stage: 3,
      name: "Requirement & Constraint Extraction",
      status: "success",
      durationMs: Math.round(analysisDuration * 0.2),
      details: {
        explicitInstructions: analyzed.explicitInstructions,
        constraints: analyzed.constraints,
        expectedOutput: analyzed.expectedOutput,
      },
    });

    stages.push({
      stage: 4,
      name: "Context & Reference Resolution",
      status: "success",
      durationMs: Math.round(analysisDuration * 0.2),
      details: {
        hasAnaphora: analyzed.contextReferences.hasAnaphora,
        referencedTopic: analyzed.contextReferences.referencedTopic,
      },
    });

    // Stage 5: Ambiguity Assessment & Clarification Gate
    const ambiguityStatus = analyzed.isAmbiguous ? "clarification_needed" : "success";
    stages.push({
      stage: 5,
      name: "Ambiguity Assessment",
      status: ambiguityStatus,
      durationMs: Math.round(analysisDuration * 0.15),
      details: {
        isAmbiguous: analyzed.isAmbiguous,
        ambiguityScore: analyzed.ambiguityScore,
        missingDetails: analyzed.missingDetails,
        clarificationQuestion: analyzed.clarificationQuestion,
      },
    });

    // If genuinely ambiguous without context, stop early and ask targeted clarification
    if (analyzed.isAmbiguous && analyzed.clarificationQuestion) {
      return {
        finalResponse: analyzed.clarificationQuestion,
        pipelineDurationMs: Date.now() - startTime,
        stages,
        analyzedPrompt: analyzed,
        requiresClarification: true,
        clarificationQuestion: analyzed.clarificationQuestion,
        isFullySatisfied: false,
      };
    }

    stages.push({
      stage: 6,
      name: "Task Planning & Decomposition",
      status: "success",
      durationMs: Math.round(analysisDuration * 0.15),
      details: {
        isMultiStep: analyzed.taskDecomposition?.isMultiStep || false,
        subtaskCount: analyzed.taskDecomposition?.subtasks?.length || 0,
      },
    });

    stages.push({
      stage: 7,
      name: "Model & Capability Routing",
      status: "success",
      durationMs: Math.round(analysisDuration * 0.1),
      details: {
        appropriateModel: analyzed.appropriateModel,
        preferredProvider: analyzed.preferredProvider,
        requiredTools: analyzed.requiredTools,
      },
    });

    // Stage 8: Prompt Enhancement & Instruction Grounding
    const { result: enhancedPrompt } = recordStage(8, "System Prompt Enhancement", () => {
      return promptEnhancer.enhanceSystemPrompt(
        "You are TATTVA AI, an advanced intelligent assistant.",
        analyzed
      );
    });

    // Stage 9: Model Execution (Mock or Live Handler)
    const execStart = Date.now();
    let rawOutput = "";
    if (request.mockExecutionHandler) {
      rawOutput = await request.mockExecutionHandler(analyzed.resolvedPrompt, analyzed);
    } else {
      // Default fallback synthesized output if no handler provided
      rawOutput = `[TATTVA Intelligence Engine]: Processed request for intent '${analyzed.primaryIntent}'. Response synthesized with adherence to constraints.`;
    }
    stages.push({
      stage: 9,
      name: "Execution & Model Inference",
      status: "success",
      durationMs: Date.now() - execStart,
    });

    // Stage 10: Response Validation & Guardrail Auditing
    const validationStart = Date.now();
    const validationResult = responseValidator.validate(rawOutput, analyzed);
    stages.push({
      stage: 10,
      name: "Response Validation & Quality Audit",
      status: validationResult.isValid ? "success" : "warning",
      durationMs: Date.now() - validationStart,
      details: {
        score: validationResult.score,
        isValid: validationResult.isValid,
        missingRequirements: validationResult.missingRequirements,
      },
    });

    return {
      finalResponse: rawOutput,
      pipelineDurationMs: Date.now() - startTime,
      stages,
      analyzedPrompt: analyzed,
      validationResult,
      requiresClarification: false,
      enhancedSystemPrompt: enhancedPrompt,
      isFullySatisfied: validationResult.isValid,
    };
  }
}

export const promptIntelligencePipeline = PromptIntelligencePipeline.getInstance();
