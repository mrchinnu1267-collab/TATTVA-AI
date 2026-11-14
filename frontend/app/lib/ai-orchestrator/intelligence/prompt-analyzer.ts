/**
 * TATTVA AI - Centralized Prompt Understanding Engine
 * Master orchestrator analyzing intent, entities, context, constraints, and ambiguity
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { TaskIntent, ModelProvider } from "../types";
import { AnalyzedPrompt, ComplexityLevel } from "./schema";
import { contextManager, ConversationTurn } from "./context-manager";
import { entityExtractor } from "./entity-extractor";
import { requirementExtractor } from "./requirement-extractor";
import { ambiguityDetector } from "./ambiguity-detector";
import { taskDecomposer } from "./task-decomposer";

export class PromptAnalyzer {
  private static instance: PromptAnalyzer;

  public static getInstance(): PromptAnalyzer {
    if (!PromptAnalyzer.instance) {
      PromptAnalyzer.instance = new PromptAnalyzer();
    }
    return PromptAnalyzer.instance;
  }

  /**
   * Performs end-to-end semantic analysis on the user prompt before execution
   */
  public analyzePrompt(
    rawPrompt: string,
    history: ConversationTurn[] = [],
    hasAttachments: boolean = false
  ): AnalyzedPrompt {
    const cleanRaw = rawPrompt.trim();

    // 1. Context Resolution & Anaphora
    const contextResult = contextManager.resolveContext(cleanRaw, history, hasAttachments);
    const resolvedPrompt = contextResult.resolvedPrompt;

    // 2. Language & Dialect Detection
    const detectedDialect = this.detectLanguageDialect(cleanRaw);

    // 3. Entity & Concept Extraction
    const entityResult = entityExtractor.extractEntities(resolvedPrompt);
    const entities = entityResult.entities;

    // 4. Requirement & Constraint Extraction
    const reqResult = requirementExtractor.extract(resolvedPrompt, contextResult.persistedConstraints, cleanRaw);

    // 5. Intent Classification (Primary & Secondary)
    const { primaryIntent, secondaryIntents } = this.classifyIntents(
      resolvedPrompt,
      cleanRaw,
      hasAttachments || Boolean(contextResult.referencedAttachment),
      detectedDialect
    );

    // 6. Complexity Scoring (1 - 10)
    const complexityScore = this.calculateComplexity(resolvedPrompt, entities, primaryIntent, reqResult.explicitInstructions);
    const complexity: ComplexityLevel =
      complexityScore <= 3 ? "low" : complexityScore <= 6 ? "medium" : complexityScore <= 8 ? "high" : "extreme";

    // 7. Ambiguity Detection
    const ambiguity = ambiguityDetector.detectAmbiguity(
      cleanRaw,
      resolvedPrompt,
      contextResult.referenceInfo,
      hasAttachments || Boolean(contextResult.referencedAttachment)
    );

    // 8. Task Decomposition
    const taskDecomposition = taskDecomposer.decompose(resolvedPrompt, entities, complexityScore);

    // 9. Required Tools Determination
    const requiredTools = this.determineRequiredTools(primaryIntent, secondaryIntents, resolvedPrompt);

    // 10. Appropriate Model Selection
    const { appropriateModel, preferredProvider } = this.selectAppropriateModel(primaryIntent, complexityScore);

    // 11. User Objective Formulation
    const userObjective = this.formulateUserObjective(resolvedPrompt, primaryIntent, entities);

    return {
      rawPrompt: cleanRaw,
      resolvedPrompt,
      primaryIntent,
      secondaryIntents,
      userObjective,
      entities,
      requiredActions: reqResult.requiredActions,
      explicitInstructions: reqResult.explicitInstructions,
      implicitRequirements: reqResult.implicitRequirements,
      constraints: reqResult.constraints,
      contextReferences: contextResult.referenceInfo,
      expectedOutput: reqResult.expectedOutput,
      requiredTools,
      appropriateModel,
      preferredProvider,
      complexity,
      complexityScore,
      isAmbiguous: ambiguity.isAmbiguous,
      clarificationQuestion: ambiguity.clarificationQuestion,
      taskDecomposition,
      detectedDialect,
    };
  }

  private detectLanguageDialect(prompt: string): AnalyzedPrompt["detectedDialect"] {
    const lower = prompt.toLowerCase();
    const hasTeluguScript = /[\u0C00-\u0C7F]/.test(prompt);
    const hasTeluguKeywords = /\b(cheppu|cheyyi|rayi|deeni|dini|idi|ela|emiti|enti|meeru|nenu|unnaya|vachindi)\b/i.test(lower);

    if (hasTeluguScript && hasTeluguKeywords) return "telugu";
    if (hasTeluguKeywords || (hasTeluguScript && /[a-zA-Z]/.test(prompt))) return "telugu_english_mixed";
    if (/[\u0900-\u097F]/.test(prompt) || /\b(batao|karo|kaise|kya|hai|karein)\b/i.test(lower)) return "hindi";
    return "english";
  }

  private classifyIntents(
    resolvedPrompt: string,
    rawPrompt: string,
    hasAttachments: boolean,
    dialect?: string
  ): { primaryIntent: TaskIntent; secondaryIntents: TaskIntent[] } {
    const lower = resolvedPrompt.toLowerCase();
    const rawLower = rawPrompt.toLowerCase();
    const secondary: TaskIntent[] = [];

    // Document Generation Check
    if (
      /\b(docx|pptx|xlsx|pdf|excel sheet|powerpoint|word doc|downloadable file|export as|save as a file)\b/i.test(lower) ||
      /\b(create|generate|export)\s+.*\b(file|sheet|presentation|document)\b/i.test(lower)
    ) {
      if (lower.includes("code") || lower.includes("program")) secondary.push("coding");
      return { primaryIntent: "document_generation", secondaryIntents: secondary };
    }

    // Document / Handwriting / File Analysis Check
    if (hasAttachments && (
      /\b(analyze|summarize|what does it say|read|extract|transcribe|solve|findings|overview|key points|content)\b/i.test(lower) ||
      /\b(this|the)\s+(uploaded\s+)?(file|document|pdf|attachment|paper|image)\b/i.test(lower) ||
      lower.includes("this file") ||
      lower.includes("this document") ||
      lower.includes("uploaded document")
    )) {
      return { primaryIntent: "document_analysis", secondaryIntents: ["reasoning"] };
    }

    // Coding & Application Development Check
    if (
      /\b(code|function|component|script|api|bug|error|refactor|database|schema|react|typescript|python|html|css|next\.js|frontend|backend)\b/i.test(lower) ||
      rawLower.includes("code rayi") ||
      rawLower.includes("debug cheyyi") ||
      lower.includes("build") ||
      lower.includes("develop")
    ) {
      if (lower.includes("test") || lower.includes("verify")) secondary.push("reasoning");
      return { primaryIntent: "coding", secondaryIntents: secondary };
    }

    // Mathematical Reasoning Check
    if (
      /\b(calculate|solve equation|integral|derivative|algebra|matrix|formula|standard deviation|eigenvalue|arithmetic)\b/i.test(lower) ||
      /[0-9]+\s*[\+\-\*\/\^]\s*[0-9]+/.test(lower)
    ) {
      return { primaryIntent: "mathematics", secondaryIntents: ["reasoning"] };
    }

    // Web Research Check
    if (
      /\b(search the web|latest news|current price|today|2025|2026|recent developments|browse internet)\b/i.test(lower)
    ) {
      return { primaryIntent: "web_research", secondaryIntents: ["summarization"] };
    }

    // Deep Autonomous Agent Task
    if (
      /\b(audit|scan codebase|inspect repository|github repo|multi-step research)\b/i.test(lower)
    ) {
      return { primaryIntent: "agent_task", secondaryIntents: ["coding", "web_research"] };
    }

    // Data Analysis
    if (/\b(statistics|csv data|dataset|correlation|standard deviation|mean|median)\b/i.test(lower)) {
      return { primaryIntent: "data_analysis", secondaryIntents: ["mathematics"] };
    }

    // Translation
    if (/\b(translate|convert to (telugu|hindi|spanish|french|german))\b/i.test(lower)) {
      return { primaryIntent: "translation", secondaryIntents: ["general_chat"] };
    }

    // Default to general chat / reasoning
    return { primaryIntent: "general_chat", secondaryIntents: [] };
  }

  private calculateComplexity(
    prompt: string,
    entities: string[],
    intent: TaskIntent,
    instructions: string[]
  ): number {
    let score = 2; // baseline

    if (intent === "coding" || intent === "agent_task" || intent === "document_generation") score += 3;
    if (intent === "mathematics" || intent === "reasoning") score += 2;

    if (entities.length >= 3) score += 2;
    if (instructions.length >= 2) score += 1;
    if (prompt.length > 200) score += 1;
    if (prompt.length > 500) score += 1;

    return Math.min(10, Math.max(1, score));
  }

  private determineRequiredTools(primary: TaskIntent, secondary: TaskIntent[], prompt: string): string[] {
    const tools: string[] = [];
    if (primary === "web_research" || secondary.includes("web_research") || prompt.includes("latest") || prompt.includes("2026")) {
      tools.push("web_search");
    }
    if (primary === "coding" || primary === "mathematics") {
      tools.push("code_runner", "data_calculator");
    }
    if (primary === "document_analysis" || prompt.includes("file") || prompt.includes("pdf")) {
      tools.push("document_processor");
    }
    if (primary === "agent_task" || prompt.includes("github") || prompt.includes("repo")) {
      tools.push("github_inspector");
    }
    return tools;
  }

  private selectAppropriateModel(intent: TaskIntent, complexityScore: number): {
    appropriateModel: string;
    preferredProvider?: ModelProvider;
  } {
    if (complexityScore >= 7 || intent === "coding" || intent === "mathematics" || intent === "agent_task") {
      return { appropriateModel: "gemini-3.6-flash", preferredProvider: "gemini" };
    }
    return { appropriateModel: "gemini-3.5-flash-lite", preferredProvider: "gemini" };
  }

  private formulateUserObjective(resolvedPrompt: string, intent: TaskIntent, entities: string[]): string {
    const entitySnippet = entities.slice(0, 3).join(", ");
    if (intent === "coding") {
      return `Implement complete production-ready code for: ${resolvedPrompt.slice(0, 80).trim()}${entitySnippet ? ` involving ${entitySnippet}` : ""}`;
    }
    if (intent === "document_generation") {
      return `Compile and deliver verified downloadable document on: ${resolvedPrompt.slice(0, 80).trim()}`;
    }
    if (intent === "mathematics") {
      return `Provide step-by-step mathematical proof and exact calculation for: ${resolvedPrompt.slice(0, 80).trim()}`;
    }
    return resolvedPrompt.slice(0, 100).trim();
  }
}

export const promptAnalyzer = PromptAnalyzer.getInstance();
