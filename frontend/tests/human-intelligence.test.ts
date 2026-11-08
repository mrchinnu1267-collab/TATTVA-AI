import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  humanIntelligence,
  ContextResolver,
  AdaptiveCommunicationEngine,
  BackgroundExecutor,
  ProactiveAssistant,
  ResponseQualityGuard,
} from "../app/lib/human-intelligence";

describe("TATTVA AI – Human-Centred Intelligence Engine Test Suite", () => {
  // TEST 1: Short question -> Concise direct answer
  it("TEST 1: Short question triggers concise, direct answer preference", () => {
    const prompt = "What is DNS?";
    const analysis = humanIntelligence.analyzeConversation(prompt, []);

    assert.equal(analysis.goal, "direct_question");
    assert.equal(analysis.communicationPreference.length, "concise");

    // Pre-flight quality test: ensure verbose fluff is not added
    const rawReply =
      "Certainly! I would be happy to help with that. DNS stands for Domain Name System. It translates human-friendly domain names like google.com into IP addresses like 142.250.190.46 so computers can locate each other on the network.\n\nHere are some details.\n\nMore details.\n\nEven more details.\n\nExtra fluff.";
    const finalized = humanIntelligence.finalizeResponse(rawReply, prompt, analysis);

    // Verifies robotic boilerplate was stripped
    assert.equal(finalized.finalContent.includes("Certainly!"), false);
    assert.equal(finalized.finalContent.includes("I would be happy to help"), false);
    // Verifies concise, direct answer
    assert.equal(finalized.finalContent.includes("Domain Name System"), true);
  });

  // TEST 2: User requests a detailed explanation -> Detailed with examples
  it("TEST 2: User requests a detailed explanation -> Triggers comprehensive depth and example guidance", () => {
    const prompt = "Explain database indexing in detail with step-by-step examples";
    const analysis = humanIntelligence.analyzeConversation(prompt, []);

    assert.equal(analysis.goal, "detailed_explanation");
    assert.equal(analysis.communicationPreference.length, "detailed");
    assert.equal(analysis.communicationPreference.wantsExamples, true);
    assert.equal(analysis.communicationPreference.wantsSteps, true);

    const guidancePrompt = humanIntelligence.buildSystemGuidance(analysis);
    assert.equal(guidancePrompt.includes("COMPREHENSIVE"), true);
    assert.equal(guidancePrompt.includes("functional code examples"), true);
  });

  // TEST 3: User reports a previously encountered error -> Context-aware troubleshooting without repeating failed solutions
  it("TEST 3: User reports a previously encountered error -> Context-aware troubleshooting without repeating failed solutions", () => {
    const history = [
      {
        role: "user" as const,
        content: "I am getting TypeError: cannot read properties of undefined (reading 'map') in Next.js",
      },
      {
        role: "assistant" as const,
        content: "Check if your props array is initialized with a default empty array: props.items || [].",
      },
    ];

    const prompt = "Still not working, same problem repeated!";
    const analysis = humanIntelligence.analyzeConversation(prompt, history);

    assert.equal(analysis.isRepeatedError, true);
    assert.equal(analysis.signals.includes("frustration"), true);
    assert.equal(analysis.failedSolutionsAttempted.length > 0, true);

    // Guidance must explicitly warn the AI not to repeat the failed solution
    const guidancePrompt = humanIntelligence.buildSystemGuidance(analysis);
    assert.equal(guidancePrompt.includes("CRITICAL - REPEATED ISSUE & FRUSTRATION AWARENESS"), true);
    assert.equal(guidancePrompt.includes("DO NOT repeat previous failed recommendations"), true);
    assert.equal(guidancePrompt.includes("props.items || []"), true);
  });

  // TEST 4: User continues an existing project -> Continue from known project context
  it("TEST 4: User continues an existing project -> Continue from known project context", () => {
    const history = [
      {
        role: "user" as const,
        content: "I am working on building a real-time chat application with Next.js and Supabase.",
      },
      {
        role: "assistant" as const,
        content: "Great! Let's scaffold the Supabase client and auth callbacks.",
      },
    ];

    const prompt = "Continue with the database schema setup";
    const analysis = humanIntelligence.analyzeConversation(prompt, history);

    assert.equal(analysis.goal, "continuation");
    // Reference resolution should maintain active project context
    assert.equal(
      analysis.referenceResolution.resolvedQuery.includes("real-time chat application"),
      true
    );

    const guidancePrompt = humanIntelligence.buildSystemGuidance(analysis);
    assert.equal(guidancePrompt.includes("Next.js"), true);
    assert.equal(guidancePrompt.includes("Supabase"), true);
  });

  // TEST 5: User expresses frustration -> Acknowledge issue and provide practical solution
  it("TEST 5: User expresses frustration -> Acknowledges empathetically without boilerplate", () => {
    const prompt = "Ugh, this is so frustrating! Nothing is working and it broke again.";
    const analysis = humanIntelligence.analyzeConversation(prompt, []);

    assert.equal(analysis.signals.includes("frustration"), true);
    const guidancePrompt = humanIntelligence.buildSystemGuidance(analysis);
    assert.equal(guidancePrompt.includes("empathy"), true);
    assert.equal(guidancePrompt.includes("Isolate the single root cause"), true);

    // Proactive assistance anticipates verification
    const proactive = ProactiveAssistant.generateNextStep(prompt, "Here is the fix", "error_troubleshooting");
    assert.ok(proactive);
    assert.equal(proactive?.category, "verification");
  });

  // TEST 6: Internal tool execution -> Background processing without exposing raw execution details
  it("TEST 6: Internal tool execution -> Background processing hides stack traces and JSON dumps", () => {
    const dirtyOutput = `Here is the solution to your issue.
Traceback (most recent call last):
  File "engine.py", line 42, in <module>
    raise ConnectionRefusedError("Database 5432 closed")
ConnectionRefusedError: Database 5432 closed
[Real-Time Live Clock for Asia/Kolkata]: Current time is 1:45 PM on Monday.
The correct configuration requires setting DB_HOST to localhost.`;

    const sanitized = BackgroundExecutor.sanitizeChatResponse(dirtyOutput);

    // Must NOT contain traceback or internal clock directive
    assert.equal(sanitized.cleanContent.includes("Traceback (most recent call last)"), false);
    assert.equal(sanitized.cleanContent.includes("[Real-Time Live Clock"), false);
    // Preserves the clean human explanation
    assert.equal(sanitized.cleanContent.includes("The correct configuration requires setting DB_HOST"), true);

    // Safe error formatter converts raw exception to supportive message
    const formattedError = BackgroundExecutor.formatSafeUserError("Connection timeout 503 ECONNRESET");
    assert.equal(formattedError.userMessage.includes("timed out"), true);
    assert.equal(formattedError.userMessage.includes("ECONNRESET"), false);
    assert.equal(formattedError.debugInfo.technicalError, "Connection timeout 503 ECONNRESET");
  });

  // TEST 7: Ambiguous instruction -> Resolves via context or asks one necessary clarification
  it("TEST 7A: Ambiguous instruction with context -> Successfully resolves pronoun reference", () => {
    const history = [
      {
        role: "user" as const,
        content: "Here is my Next.js API route that fails with 500 error:\n```typescript\nexport async function POST() {}\n```",
      },
      {
        role: "assistant" as const,
        content: "The handler is missing a NextResponse return statement.",
      },
    ];

    const prompt = "Fix this";
    const analysis = humanIntelligence.analyzeConversation(prompt, history);

    assert.equal(analysis.referenceResolution.isAmbiguousReference, true);
    // Resolved query links back to the error/code in context
    assert.ok(
      analysis.referenceResolution.resolvedQuery.includes("Next.js") ||
      analysis.referenceResolution.referencedSubject?.includes("Next.js")
    );
  });

  it("TEST 7B: Ambiguous instruction without context -> Prompts one crisp clarification instead of guessing", () => {
    const prompt = "Fix it";
    const analysis = humanIntelligence.analyzeConversation(prompt, []);

    assert.equal(analysis.goal, "clarification_needed");
  });
});
