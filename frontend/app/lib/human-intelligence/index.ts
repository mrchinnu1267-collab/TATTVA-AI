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
import { emotionalContextAnalyzer, EmotionalContextResult } from "./emotional-context-analyzer";
import { multilingualConversationalEngine, MultilingualAnalysis } from "./multilingual-conversational-engine";
import { conversationalContextTracker, TrackedConversationState } from "./conversational-context-tracker";
import { adaptivePersonalityEngine, PersonaConfiguration } from "./adaptive-personality-engine";
import { conversationalSafetyGuard, SafetyEvaluationResult } from "./conversational-safety-guard";

export * from "./types";
export {
  ContextResolver,
  AdaptiveCommunicationEngine,
  BackgroundExecutor,
  ProactiveAssistant,
  ResponseQualityGuard,
  AdaptiveMemoryManager,
  HUMAN_PROGRESS_MESSAGES,
  emotionalContextAnalyzer,
  multilingualConversationalEngine,
  conversationalContextTracker,
  adaptivePersonalityEngine,
  conversationalSafetyGuard,
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
    
    // Advanced Emotional Context Recognition
    const emotionalContext = emotionalContextAnalyzer.analyzeEmotion(userPrompt, history);
    
    // Multilingual & Transliteration Intelligence
    const multilingual = multilingualConversationalEngine.analyzeLanguage(userPrompt, history);
    
    // Conversational Context & Topic Tracker
    const trackedState = conversationalContextTracker.trackState(userPrompt, history);
    
    // Adaptive Personality & Tone Calibration
    const isCode = /\b(code|function|class|typescript|python|bug|api)\b/i.test(userPrompt);
    const persona = adaptivePersonalityEngine.calibratePersona(
      emotionalContext.primarySignal,
      goal,
      undefined,
      isCode
    );

    // Conversational Emotional Safety
    const safetyEvaluation = conversationalSafetyGuard.evaluateEmotionalSafety(userPrompt);

    const signals = AdaptiveCommunicationEngine.detectSignals(userPrompt);
    const primarySignal = (emotionalContext.primarySignal as ConversationalSignal) || signals[0] || "neutral";
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
      activeProjectTopic: projectContext.activeTask || trackedState.currentTopic,
      technologies: projectContext.technologies,
      emotionalContext,
      multilingual,
      trackedState,
      persona,
      safetyEvaluation,
    };
  }

  /**
   * Build human-centric cognitive guidance prompt to inject into model system instructions
   */
  public buildSystemGuidance(analysis: HumanContextAnalysis): string {
    const parts: string[] = [];

    // 1. Adaptive Personality Directives
    if (analysis.persona?.systemPersonaInstructions) {
      parts.push(analysis.persona.systemPersonaInstructions);
    }

    // 2. Emotional Context Directives
    if (analysis.emotionalContext) {
      parts.push(`EMOTIONAL CONTEXT & EMPATHY DIRECTIVE:\n- Detected User Affect: ${analysis.emotionalContext.primarySignal.toUpperCase()} (Calibrated Confidence: ${Math.round(analysis.emotionalContext.confidence * 100)}%)\n- Empathy Directive: ${analysis.emotionalContext.recommendedTone.empathyDirective}\n- Required Tone Warmth: ${analysis.emotionalContext.recommendedTone.warmth.toUpperCase()} | Pacing: ${analysis.emotionalContext.recommendedTone.pacing.toUpperCase()}\n- SAFE BOUNDARY RULE: Treat emotion as an uncertain contextual signal. Never diagnose mental health conditions, and never claim to know exactly how the user feels.`);
    }

    // 3. Multilingual Directives
    if (analysis.multilingual?.responseLanguageDirective) {
      parts.push(analysis.multilingual.responseLanguageDirective);
    }

    // 4. Conversational Continuity Guidance
    if (analysis.trackedState) {
      parts.push(conversationalContextTracker.buildContinuityGuidance(analysis.trackedState));
    }

    // 5. Existing Human Guidance & Project Context
    const standardGuidance = AdaptiveCommunicationEngine.buildHumanGuidancePrompt(analysis);
    if (standardGuidance) parts.push(standardGuidance);

    const projectSnippet = AdaptiveMemoryManager.formatProjectContextForPrompt({
      activeTask: analysis.activeProjectTopic,
      technologies: analysis.technologies,
    });
    if (projectSnippet) parts.push(projectSnippet);

    return parts.filter(Boolean).join("\n\n").trim();
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

