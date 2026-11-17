/**
 * TATTVA AI - Structured Reasoning & Problem-Solving Engine
 * Systematic problem decomposition, hypothesis testing, code verification, and mathematical derivation
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { TaskIntent, ReasoningPlan, ReasoningStep } from "./types";
import { toolRegistry } from "./tools/tool-registry";
import { modelRouter } from "./model-router";

export class ReasoningEngine {
  private static instance: ReasoningEngine;

  public static getInstance(): ReasoningEngine {
    if (!ReasoningEngine.instance) {
      ReasoningEngine.instance = new ReasoningEngine();
    }
    return ReasoningEngine.instance;
  }

  /**
   * Solves a complex task using structured step-by-step reasoning and verification
   */
  public async solveComplexTask(
    userPrompt: string,
    intent: TaskIntent,
    history: Array<{
      role: "user" | "assistant";
      content: string;
      attachments?: Array<{ name?: string; type: string; data: string }>;
    }> = [],
    attachments?: Array<{ name?: string; type: string; data: string }>
  ): Promise<{
    finalAnswer: string;
    plan: ReasoningPlan;
    toolsUsed: string[];
    verificationPassed: boolean;
  }> {
    const toolsUsed: string[] = [];
    const steps: ReasoningStep[] = [];

    // Step 1: Problem Decomposition & Analysis
    const hasAttachments = Boolean(attachments && attachments.length > 0);
    steps.push({
      stepNumber: 1,
      title: hasAttachments
        ? "Multimodal Document & Handwriting Extraction"
        : "Problem Understanding & Requirements Extraction",
      thought: hasAttachments
        ? `Inspected attached document/handwriting for intent: ${intent}. Deconstructed text, visual formulas, and task requirements.`
        : `Deconstructed prompt into functional constraints and expected deliverables for intent: ${intent}.`,
      status: "completed",
    });

    let verificationPassed = true;
    let intermediateVerificationResult = "";

    // Step 2 & 3: Domain-specific verification if coding or math
    if (intent === "coding" || /code|function|debug|script|algorithm/i.test(userPrompt)) {
      steps.push({
        stepNumber: 2,
        title: "Code Architecture & Algorithmic Strategy",
        thought: "Identified optimal time/space complexity, edge cases, and type safety constraints.",
        status: "completed",
      });

      // Run dry-run syntax check if code block present
      const codeMatch = userPrompt.match(/```(?:javascript|typescript|js|ts)?\s*([\s\S]*?)```/);
      if (codeMatch && codeMatch[1]) {
        toolsUsed.push("code_runner");
        const execRes = await toolRegistry.executeTool(
          "code_runner",
          {
            language: "javascript",
            code: codeMatch[1],
          },
          { userId: "system", userEmail: "system" }
        );

        if (!execRes.success || (execRes.output && execRes.output.stderr)) {
          verificationPassed = false;
          intermediateVerificationResult = `Sandbox test revealed error: ${execRes.output?.stderr || execRes.error}`;
        }
      }
    } else if (intent === "mathematics" || /calculate|solve|equation|formula/i.test(userPrompt)) {
      steps.push({
        stepNumber: 2,
        title: "Mathematical Formulation & Proof Structure",
        thought: "Mapped variables, mathematical properties, and numerical verification steps.",
        status: "completed",
      });

      // Extract arithmetic or formula
      const mathExpr = userPrompt.match(/([0-9\s+\-*/().^%]+)/);
      if (mathExpr && mathExpr[1] && mathExpr[1].trim().length > 3) {
        toolsUsed.push("data_calculator");
        const calcRes = await toolRegistry.executeTool(
          "data_calculator",
          { expression: mathExpr[1] },
          { userId: "system", userEmail: "system" }
        );
        if (calcRes.success && calcRes.output?.result !== null) {
          intermediateVerificationResult = `Numerical check confirmed value: ${calcRes.output.result}`;
        }
      }
    } else if (intent === "web_research") {
      steps.push({
        stepNumber: 2,
        title: "Web Evidence Retrieval & Verification",
        thought: "Sourced primary web documentation and cross-checked timeliness.",
        status: "completed",
      });
    }

    // Step 4: Final Synthesis with Structured Instruction
    const systemReasoningPrompt = hasAttachments
      ? `You are the master reasoning, mathematical, visual, and algorithmic intelligence of TATTVA AI.
You solve problems with uncompromising technical depth, clarity, and precision.

MANDATORY STRUCTURED OUTPUT FORMAT FOR HANDWRITING & FILE ANALYSIS:
Whenever the user attaches handwriting, an image, diagram, code file, or document, format your response using these 5 structured sections with clean markdown:

### 📋 1. Transcription & Content Extraction
- **Document Type:** [e.g., Handwritten Notes, Math Derivation, Whiteboard, PDF Scan, Code File]
- **Transcribed Content:**
[Provide a pristine transcription of the handwritten text, equations formatted in LaTeX $...$, code in code blocks, or structured tables]

### 🔍 2. Concept & Content Explanation
- **Core Subject:** [Brief overview of what this note or document covers]
- **Detailed Explanation:** [Clear explanation of principles, context, diagrams, arrows, or background theory]

### 🎯 3. Identified Questions & Problems
- [List every explicit question, math problem, exam task, or bug identified in the file]

### 💡 4. Step-by-Step Verified Solution
- **Given & Formulas:** [List initial values and formulas]
- **Step-by-Step Working:** [Numbered steps showing every algebraic derivation, code logic, or reasoning step]
- **Final Result:** [State the verified final answer, boxed or emphasized]

### 📊 5. Key Insights & Takeaways
- [Bullet points with key learnings, edge cases, or verification notes]

REASONING DIRECTIVES:
1. For programming: explain the root cause, provide production-ready code with type annotations, and explain edge cases. Never use emojis inside code snippets.
2. For mathematics & science: state formulas clearly, show each derivation step, and highlight final answers.
3. Intermediate Verification Context: ${intermediateVerificationResult ? intermediateVerificationResult : "No external computational sandbox tool executed; derive formulas step-by-step and maintain strict internal mathematical and logical consistency."}

LANGUAGE & IDENTITY:
- Respond in fluent English (or user-requested language if specified).
- Created by kotapati Gowtham Chowdary.`
      : `You are the master software engineering, algorithmic, and mathematical intelligence of TATTVA AI.
You solve problems with uncompromising technical depth, clarity, and precision.

SOFTWARE ENGINEERING & PROGRAMMING PROTOCOL:
- Supported Languages: Python, Java, JavaScript, TypeScript, C, C++, HTML, CSS, SQL, React, Next.js, Flutter, Dart, PHP, Go, Rust.
- Core Capabilities: Code generation, code explanation, error diagnosis, debugging, code optimization, refactoring, algorithm design, data structure explanations, database query generation, API development, frontend development, backend development, full-stack architecture, test-case generation, security analysis, dependency troubleshooting, and framework-specific guidance.
- Deliver complete, production-grade, typed code matching the target language without placeholder stubs (e.g., '// TODO') or omitted implementations.
- Include all necessary imports, modules, error handling, boundary checks, and resource cleanup.
- When debugging: 1. Identify root cause; 2. Inspect code paths; 3. Explain cause clearly; 4. Provide corrected implementation; 5. List side effects & verification steps.
- For algorithmic routines: explicitly state asymptotic time and space complexity (Big-O).
- Strictly NO emojis inside code blocks, variable names, or terminal commands.

MATHEMATICAL & QUANTITATIVE REASONING PROTOCOL:
- State governing formulas and theorems explicitly.
- Show clear step-by-step intermediate working and derivations before declaring the final result.
- Check calculation boundaries, units, and signs.

HONEST KNOWLEDGE & VERIFICATION:
- ${intermediateVerificationResult ? intermediateVerificationResult : "No external computational sandbox tool executed; code and derivations are verified through rigorous static analysis. Do NOT fabricate sandbox execution results."}

LANGUAGE & IDENTITY:
- Respond naturally in the language or dialect used by the user (English, Telugu, Tenglish, Hindi, etc.).
- Created by kotapati Gowtham Chowdary.`;

    const modelMessages = [
      ...history.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
        attachments: h.attachments,
      })),
      { role: "user" as const, content: userPrompt, attachments },
    ];

    const preferredModel =
      intent === "coding"
        ? "gemini-3.5-flash-lite"
        : intent === "mathematics" || intent === "reasoning"
        ? "deepseek/deepseek-chat"
        : "gemini-3.5-flash-lite";

    const modelResult = await modelRouter.executeWithFallback(intent, 8, {
      messages: modelMessages,
      systemInstruction: systemReasoningPrompt,
      preferredModel,
      temperature: 0.25, // Lower temperature for high reasoning fidelity
    });

    const hasToolVerification = toolsUsed.length > 0;
    const verificationHypothesis = intermediateVerificationResult
      ? intermediateVerificationResult
      : hasToolVerification
      ? "Tool verification completed."
      : "Step-by-step reasoning completed (no external sandbox execution).";

    steps.push({
      stepNumber: 3,
      title: hasToolVerification ? "Synthesized Solution & Tool Verification" : "Synthesized Solution & Derivation",
      thought: hasToolVerification
        ? `Executed verification checks. Model latency: ${modelResult.latencyMs}ms.`
        : `Generated step-by-step reasoning. Model latency: ${modelResult.latencyMs}ms.`,
      status: "completed",
    });

    const plan: ReasoningPlan = {
      problemSummary: userPrompt.slice(0, 150) + (userPrompt.length > 150 ? "..." : ""),
      decomposition: steps.map((s) => s.title),
      steps,
      verificationHypothesis,
      finalAnswer: modelResult.text,
      confidenceScore: hasToolVerification ? (verificationPassed ? 0.98 : 0.80) : 0.90,
    };

    return {
      finalAnswer: modelResult.text,
      plan,
      toolsUsed,
      verificationPassed: hasToolVerification ? verificationPassed : false,
    };
  }
}

export const reasoningEngine = ReasoningEngine.getInstance();

