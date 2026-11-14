/**
 * TATTVA AI - Prompt Understanding & Intelligence Engine Test Suite
 * Validates semantic analysis, context resolution, entity extraction,
 * constraint handling, ambiguity detection, task decomposition, and response validation.
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import {
  promptAnalyzer,
  contextManager,
  entityExtractor,
  requirementExtractor,
  ambiguityDetector,
  taskDecomposer,
  promptEnhancer,
  responseValidator,
} from "../app/lib/ai-orchestrator/intelligence";

export async function runPromptIntelligenceTests() {
  console.log("\n========================================================");
  console.log("🧠 TATTVA PROMPT UNDERSTANDING & INTELLIGENCE BENCHMARK");
  console.log("========================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: Simple Informational Question
  // ----------------------------------------------------
  console.log("--- 1. Simple Informational Query Analysis ---");
  const simpleAnalysis = promptAnalyzer.analyzePrompt("What is DNS and how does it work?");
  assert(!simpleAnalysis.isAmbiguous, "Simple query is not flagged as ambiguous");
  assert(simpleAnalysis.complexityScore <= 4, "Simple informational query has low complexity (score <= 4)");
  assert(simpleAnalysis.userObjective.length > 0, "User objective correctly extracted");
  assert(simpleAnalysis.detectedDialect === "english", "Dialect accurately identified as English");

  // ----------------------------------------------------
  // TEST 2: Complex Full-Stack App Prompt Decomposition
  // ----------------------------------------------------
  console.log("\n--- 2. Complex App Prompt & Task Decomposition ---");
  const complexPrompt =
    "Develop a full-stack college management web app with user authentication, student attendance tracking, marks record, and analytics dashboard using Next.js, Supabase, and Tailwind CSS. Provide 100% complete runnable code without any placeholders or TODOs.";
  const complexAnalysis = promptAnalyzer.analyzePrompt(complexPrompt);

  assert(
    complexAnalysis.primaryIntent === "coding" || complexAnalysis.primaryIntent === "reasoning",
    "Primary intent classified as coding or reasoning"
  );
  assert(complexAnalysis.complexityScore >= 7, "Complexity score is high (>= 7) for multi-system app");
  assert(
    complexAnalysis.entities.some((e) => e.toLowerCase().includes("next.js") || e.toLowerCase().includes("supabase")),
    "Extracted key technologies: Next.js and Supabase"
  );
  assert(
    complexAnalysis.constraints.some((c) => c.toLowerCase().includes("placeholder") || c.toLowerCase().includes("todo")),
    "Captured mandatory zero-placeholder constraint"
  );
  assert(
    complexAnalysis.expectedOutput.requiresZeroPlaceholders === true,
    "Output spec requires zero placeholders"
  );
  assert(
    Boolean(complexAnalysis.taskDecomposition?.isMultiStep && complexAnalysis.taskDecomposition.subtasks.length >= 3),
    "Decomposed into structured multi-step execution roadmap"
  );
  assert(
    complexAnalysis.appropriateModel.includes("claude") || complexAnalysis.appropriateModel.includes("gemini"),
    "Routed to high-tier foundation model (Claude 3.5 Sonnet / Gemini 3.6 Pro)"
  );

  // ----------------------------------------------------
  // TEST 3: Follow-Up Pronoun & Anaphora Resolution
  // ----------------------------------------------------
  console.log("\n--- 3. Conversational Context & Anaphora Resolution ---");
  const historyTurn1 = [
    {
      role: "user" as const,
      content: "Explain Database Normalization and give examples of 1NF, 2NF, and 3NF.",
    },
    {
      role: "assistant" as const,
      content:
        "Database normalization is the process of structuring a relational database to reduce data redundancy and improve data integrity. 1NF eliminates repeating groups, 2NF removes partial dependencies, and 3NF removes transitive dependencies.",
    },
  ];

  const followUpAnalysis = promptAnalyzer.analyzePrompt("Make it simpler", historyTurn1);
  assert(
    followUpAnalysis.contextReferences.hasAnaphora === true,
    "Detected anaphora pronoun 'it' in follow-up turn"
  );
  assert(
    followUpAnalysis.resolvedPrompt.toLowerCase().includes("simpler") &&
      (followUpAnalysis.resolvedPrompt.toLowerCase().includes("normalization") ||
        followUpAnalysis.resolvedPrompt.toLowerCase().includes("1nf")),
    "Resolved prompt expanded 'it' into subject from conversation history",
    `Resolved: "${followUpAnalysis.resolvedPrompt}"`
  );

  // ----------------------------------------------------
  // TEST 4: Tech Stack Connection Follow-Up
  // ----------------------------------------------------
  console.log("\n--- 4. Multi-Turn Incremental Feature Engineering ---");
  const historyTurn2 = [
    {
      role: "user" as const,
      content: "Create a modern login form component using React and TypeScript.",
    },
    {
      role: "assistant" as const,
      content: "export function LoginForm() { /* component code */ }",
    },
  ];

  const connectSupabaseAnalysis = promptAnalyzer.analyzePrompt("Now connect it to Supabase", historyTurn2);
  assert(
    connectSupabaseAnalysis.entities.some((e) => e.toLowerCase() === "supabase"),
    "Recognized Supabase as new entity in incremental turn"
  );
  assert(
    connectSupabaseAnalysis.resolvedPrompt.toLowerCase().includes("login") ||
      connectSupabaseAnalysis.contextReferences.referencedTurnIndex !== undefined,
    "Resolved 'it' to the prior login form component"
  );

  // ----------------------------------------------------
  // TEST 5: Ambiguity Detection & Clarification Formulation
  // ----------------------------------------------------
  console.log("\n--- 5. Ambiguity Detection & Single-Shot Clarification ---");
  const ambiguousPrompt = "fix";
  const ambiguousAnalysis = promptAnalyzer.analyzePrompt(ambiguousPrompt, []); // No history, no attachments
  assert(ambiguousAnalysis.isAmbiguous === true, "Single word 'fix' detected as ambiguous without context");
  assert(
    Boolean(ambiguousAnalysis.clarificationQuestion && ambiguousAnalysis.clarificationQuestion.length > 10),
    "Generated targeted, actionable clarification question instead of guessing blindly",
    `Clarification: "${ambiguousAnalysis.clarificationQuestion}"`
  );

  // However, with prior context, "fix it" is NOT ambiguous
  const fixedWithContext = promptAnalyzer.analyzePrompt("fix it", historyTurn2);
  assert(
    fixedWithContext.isAmbiguous === false,
    "Same prompt with conversation context is NOT flagged as ambiguous"
  );

  // ----------------------------------------------------
  // TEST 6: Telugu-English (Tenglish / Regional) Understanding
  // ----------------------------------------------------
  console.log("\n--- 6. Telugu-English (Tenglish) Mixed Dialect Understanding ---");
  const tenglishPrompt = "Deeni code rayi bro, simpler ga cheppu";
  const tenglishAnalysis = promptAnalyzer.analyzePrompt(tenglishPrompt, historyTurn1);
  assert(
    tenglishAnalysis.detectedDialect === "telugu_english_mixed" || tenglishAnalysis.detectedDialect === "telugu",
    "Correctly recognized Telugu-English mixed phrasing (Deeni, rayi, cheppu)",
    `Detected: ${tenglishAnalysis.detectedDialect}`
  );
  assert(
    tenglishAnalysis.expectedOutput.language.includes("Telugu") ||
      tenglishAnalysis.expectedOutput.language.includes("English"),
    "Identified target language mix"
  );

  // ----------------------------------------------------
  // TEST 7: Document Reference Understanding
  // ----------------------------------------------------
  console.log("\n--- 7. Document & Uploaded File Reference Handling ---");
  const docRefAnalysis = promptAnalyzer.analyzePrompt(
    "What are the main findings in this uploaded document?",
    [],
    true // hasAttachments: true
  );
  assert(
    docRefAnalysis.contextReferences.refersToAttachment === true,
    "Recognized query refers directly to attached file"
  );
  assert(
    docRefAnalysis.primaryIntent === "document_analysis",
    "Categorized intent as document_analysis"
  );

  // ----------------------------------------------------
  // TEST 8: Prompt Enhancement & Execution Guidance
  // ----------------------------------------------------
  console.log("\n--- 8. Contextual Prompt Enhancement Engine ---");
  const guidance = promptEnhancer.buildExecutionGuidance(complexAnalysis);
  assert(guidance.includes("USER PRIMARY OBJECTIVE:"), "Guidance includes user primary objective");
  assert(guidance.includes("MANDATORY USER CONSTRAINTS:"), "Guidance includes explicit user constraints");
  assert(guidance.includes("EXPECTED OUTPUT SPECIFICATION:"), "Guidance includes format & placeholder rules");
  assert(guidance.includes("STRUCTURED EXECUTION ROADMAP:"), "Guidance includes subtask roadmap");

  // ----------------------------------------------------
  // TEST 9: Response Validation & Placeholder Detection
  // ----------------------------------------------------
  console.log("\n--- 9. Response Validator & Placeholder Prevention ---");
  const badResponse = `
Here is your application:
\`\`\`typescript
export function CollegeApp() {
  // TODO: Add Supabase client logic here
  return <div>College Management</div>;
}
\`\`\`
`;
  const badValidation = responseValidator.validate(badResponse, complexAnalysis);
  assert(
    badValidation.missingRequirements.some((m) => m.toLowerCase().includes("todo") || m.toLowerCase().includes("placeholder")),
    "Validator caught illegal TODO placeholder in code response"
  );
  assert(badValidation.isValid === false, "Bad response with TODO is marked invalid (score < 80)");

  const goodResponse = `
Here is the complete production-ready College Management App using Next.js, Supabase, and Tailwind CSS:

\`\`\`typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface StudentRecord {
  id: string;
  name: string;
  attendanceRate: number;
  marksAverage: number;
}

export function CollegeDashboard({ students }: { students: StudentRecord[] }) {
  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold">College Management & Analytics</h1>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {students.map((s) => (
          <div key={s.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
            <p className="font-semibold">{s.name}</p>
            <p className="text-sm text-cyan-400">Attendance: {s.attendanceRate}%</p>
            <p className="text-sm text-emerald-400">Average Marks: {s.marksAverage}/100</p>
          </div>
        ))}
      </div>
    </div>
  );
}
\`\`\`
`;
  const goodValidation = responseValidator.validate(goodResponse, complexAnalysis);
  assert(
    goodValidation.missingRequirements.length === 0,
    "Compliant response without TODOs passes all requirement checks"
  );
  assert(goodValidation.isValid === true, "Compliant response is marked valid (score >= 80)");

  // ----------------------------------------------------
  // TEST 10: Format Constraint Validation (Markdown Table)
  // ----------------------------------------------------
  console.log("\n--- 10. Table Format Constraint Validation ---");
  const tablePromptAnalysis = promptAnalyzer.analyzePrompt(
    "Compare React, Vue, and Angular in a structured comparison table."
  );
  assert(tablePromptAnalysis.expectedOutput.format === "table", "Detected table format expectation");

  const invalidTableResponse = "React is a library. Vue is progressive. Angular is a complete framework.";
  const invalidTableVal = responseValidator.validate(invalidTableResponse, tablePromptAnalysis);
  assert(
    invalidTableVal.matchesRequestedFormat === false,
    "Validator detected failure to format response as a table"
  );

  const validTableResponse = `
| Feature | React | Vue | Angular |
| :--- | :--- | :--- | :--- |
| Paradigm | Component Library | Progressive Framework | Full-Fledged Framework |
| State Management | Context / Redux / Zustand | Pinia / Vuex | NgRx / Signals / Services |
| Learning Curve | Moderate | Gentle | Steep |
`;
  const validTableVal = responseValidator.validate(validTableResponse, tablePromptAnalysis);
  assert(
    validTableVal.matchesRequestedFormat === true,
    "Validator confirmed valid Markdown table formatting"
  );

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log("\n========================================================");
  console.log(`🎯 BENCHMARK RESULTS: ${passed}/${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
  console.log("========================================================\n");

  if (passed !== total) {
    throw new Error(`Prompt Intelligence test suite failed: ${total - passed} failures`);
  }
}

// Run immediately if invoked directly
if (process.argv[1]?.includes("prompt-intelligence.test")) {
  runPromptIntelligenceTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
