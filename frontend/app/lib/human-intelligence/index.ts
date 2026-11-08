/**
 * TATTVA AI - Human-Centred Intelligence Engine (Coordinator)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import {
  ConversationalGoal,
  ConversationalSignal,
  ProgressStage,
  HumanContextAnalysis,
  DeveloperDebugInfo,
} from "./types";
import { ContextResolver, ChatHistoryMessage } from "./context-resolver";
import { AdaptiveCommunicationEngine } from "./adaptive-communication";
import { BackgroundExecutor, HUMAN_PROGRESS_MESSAGES } from "./background-executor";
import { ProactiveAssistant, ProactiveSuggestion } from "./proactive-assistant";
import { ResponseQualityGuard, QualityValidationResult } from "./response-quality-guard";
import { AdaptiveMemoryManager, ProjectContextRecord } from "./adaptive-memory";

export * from "./types";
export {
  ContextResolver,
  AdaptiveCommunicationEngine,
  BackgroundExecutor,
  ProactiveAssistant,
  ResponseQualityGuard,
  AdaptiveMemoryManager,
  HUMAN_PROGRESS_MESSAGES,
};

export class HumanIntelligenceEngine {
  private static instance: HumanIntelligenceEngine;

  public static getInstance(): HumanIntelligenceEngine {
    if (!HumanIntelligenceEngine.instance) {
      HumanIntelligenceEngine.instance = new HumanIntelligenceEngine();
    }
    return HumanIntelligenceEngine.instance;
  }

  /**
   * Pre-execution phase: Analyze user intent, context, signals, and communication preferences
   */
  public analyzeConversation(
    userPrompt: string,
    history: ChatHistoryMessage[] = []
  ): HumanContextAnalysis {
    const goal = ContextResolver.identifyGoal(userPrompt, history);
    const referenceResolution = ContextResolver.resolveReferences(userPrompt, history);
    const { isRepeated, failedSolutions } = ContextResolver.detectRepeatedError(userPrompt, history);
    const signals = AdaptiveCommunicationEngine.detectSignals(userPrompt);
    const primarySignal = signals[0] || "neutral";
    const communicationPreference = AdaptiveCommunicationEngine.inferCommunicationPreference(
      userPrompt,
      history.length
    );

    const projectContext = AdaptiveMemoryManager.extractProjectContext(userPrompt, history);

    return {
      goal,
      signals,
      primarySignal,
      isRepeatedError: isRepeated,
      failedSolutionsAttempted: failedSolutions,
      referenceResolution,
      communicationPreference,
      activeProjectTopic: projectContext.activeTask,
    };
  }

  /**
   * Build human-centric cognitive guidance prompt to inject into model system instructions
   */
  public buildSystemGuidance(analysis: HumanContextAnalysis): string {
    const guidance = AdaptiveCommunicationEngine.buildHumanGuidancePrompt(analysis);
    const projectSnippet = AdaptiveMemoryManager.formatProjectContextForPrompt({
      activeTask: analysis.activeProjectTopic,
    });

    return `${guidance}\n${projectSnippet}`.trim();
  }

  /**
   * Post-execution phase: Validate, sanitize, quality-check, and proactively enrich the response
   */
  public finalizeResponse(
    rawResponse: string,
    userPrompt: string,
    analysis: HumanContextAnalysis
  ): {
    finalContent: string;
    proactiveStep?: ProactiveSuggestion;
    validation: QualityValidationResult;
  } {
    const validation = ResponseQualityGuard.validateAndEnhance(
      rawResponse,
      userPrompt,
      analysis.goal,
      analysis.communicationPreference
    );

    const proactiveStep = ProactiveAssistant.generateNextStep(
      userPrompt,
      validation.sanitizedContent,
      analysis.goal
    );

    return {
      finalContent: validation.sanitizedContent,
      proactiveStep,
      validation,
    };
  }

  /**
   * Safe error formatting that never leaks stack traces or internal HTTP codes
   */
  public formatSafeError(
    rawError: string,
    debugInfo?: Partial<DeveloperDebugInfo>
  ): { userMessage: string; debugInfo: DeveloperDebugInfo } {
    return BackgroundExecutor.formatSafeUserError(rawError, debugInfo);
  }
}

export const humanIntelligence = HumanIntelligenceEngine.getInstance();
