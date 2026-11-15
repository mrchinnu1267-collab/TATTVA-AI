/**
 * TATTVA AI - Phase 35: Real-World Task Intelligence Test Suite
 * Validates practical, multi-part, multilingual, and context-dependent natural language understanding:
 * 1. Multi-part college project request decomposition (Java, Collections, DB, Docs, PPT)
 * 2. Multi-part research request decomposition (AI comparison, Report, Presentation)
 * 3. Telugu-English mixed intent parsing ("Naku Java project kavali")
 * 4. Telugu-English anaphora & conversational follow-ups ("Previous answer short ga cheppu", "Daanini PDF ga convert cheyyi")
 * 5. Design replication & debugging follow-ups ("Same design lo website create cheyyi", "Ee code lo errors fix cheyyi")
 * 6. Typo normalization and fault-tolerant request understanding
 * 7. Context intelligence & selective conversation turn retrieval (relevant context vs full history dump)
 * 8. Structured ComplexTaskPlan & deliverable extraction
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: "../.env.local" });

import assert from "node:assert";
import { promptAnalyzer } from "../app/lib/ai-orchestrator/intelligence/prompt-analyzer";
import { contextManager, ConversationTurn } from "../app/lib/ai-orchestrator/intelligence/context-manager";
import { taskDecomposer } from "../app/lib/ai-orchestrator/intelligence/task-decomposer";

export async function runPhase35RealWorldIntelligenceTests() {
  console.log("\n====================================================================");
  console.log("   TATTVA AI - PHASE 35: REAL-WORLD TASK INTELLIGENCE TESTS         ");
  console.log("====================================================================\n");

  // ---------------------------------------------------------------------------
  // Test 1: Real-World College Project Request Understanding
  // ---------------------------------------------------------------------------
  console.log("▶ Test 1: Real-world college project multi-requirement extraction...");
  const collegePrompt = "Create a complete Java college project using collections. Connect a database, prepare documentation and create a presentation.";
  const collegeAnalysis = promptAnalyzer.analyzePrompt(collegePrompt);

  assert.ok(collegeAnalysis.complexTaskPlan, "Must generate structured ComplexTaskPlan");
  const plan = collegeAnalysis.complexTaskPlan!;
  assert.strictEqual(plan.domain, "software_engineering", "Domain must be software_engineering");
  assert.strictEqual(plan.programmingLanguage, "Java", "Must detect Java as programming language");
  assert.ok(
    plan.technicalConcepts.some((c) => c.includes("Collections")),
    "Must identify Java Collections Framework requirement"
  );
  assert.ok(plan.databaseRequirement, "Must identify database connection requirement");
  assert.ok(plan.documentationRequirement, "Must identify documentation requirement");
  assert.ok(plan.presentationRequirement, "Must identify presentation requirement");
  assert.ok(plan.developmentDependencies.length >= 2, "Must identify development dependencies (JDK, Maven/Gradle, JDBC)");
  
  // Verify deliverables
  const deliverableTypes = plan.deliverables.map((d) => d.type);
  assert.ok(deliverableTypes.includes("code"), "Deliverables must include Source Code");
  assert.ok(deliverableTypes.includes("schema"), "Deliverables must include Database Schema");
  assert.ok(deliverableTypes.includes("documentation"), "Deliverables must include Documentation");
  assert.ok(deliverableTypes.includes("presentation"), "Deliverables must include Presentation");
  console.log(`  ✔ Test 1: College project parsed with ${plan.deliverables.length} deliverables and ${plan.executionSteps.length} execution steps.`);

  // ---------------------------------------------------------------------------
  // Test 2: Real-World Research & Multi-Deliverable Request Understanding
  // ---------------------------------------------------------------------------
  console.log("▶ Test 2: Academic research & multi-deliverable request understanding...");
  const researchPrompt = "Research AI technology, compare the major approaches, create a report and prepare a presentation.";
  const researchAnalysis = promptAnalyzer.analyzePrompt(researchPrompt);

  assert.ok(researchAnalysis.complexTaskPlan, "Must generate ComplexTaskPlan for research");
  const researchPlan = researchAnalysis.complexTaskPlan!;
  assert.strictEqual(researchPlan.domain, "academic_research");
  assert.ok(researchPlan.deliverables.some((d) => d.type === "report" || d.type === "documentation"));
  assert.ok(researchPlan.deliverables.some((d) => d.type === "presentation"));
  assert.ok(researchPlan.executionSteps.length >= 4, "Must map multi-step execution from research to presentation");
  console.log("  ✔ Test 2: Research & comparison request parsed with report and presentation deliverables.");

  // ---------------------------------------------------------------------------
  // Test 3: Telugu-English Mixed Intent Recognition ("Naku Java project kavali")
  // ---------------------------------------------------------------------------
  console.log("▶ Test 3: Telugu-English mixed intent recognition ('Naku Java project kavali')...");
  const teluguPrompt = "Naku Java project kavali.";
  const teluguAnalysis = promptAnalyzer.analyzePrompt(teluguPrompt);

  assert.strictEqual(teluguAnalysis.detectedDialect, "telugu_english_mixed", "Must detect telugu_english_mixed dialect");
  assert.strictEqual(teluguAnalysis.primaryIntent, "coding", "Must classify as coding task");
  console.log("  ✔ Test 3: 'Naku Java project kavali' correctly classified as coding task in telugu_english_mixed dialect.");

  // ---------------------------------------------------------------------------
  // Test 4: Conversational Follow-Up: "Previous answer short ga cheppu"
  // ---------------------------------------------------------------------------
  console.log("▶ Test 4: Follow-up resolution ('Previous answer short ga cheppu')...");
  const history: ConversationTurn[] = [
    { role: "user", content: "Explain Distributed Consensus in blockchain networks." },
    { role: "assistant", content: "Distributed consensus ensures nodes agree on state via PoW, PoS, or Raft." },
  ];
  const shortFollowUp = contextManager.resolveContext("Previous answer short ga cheppu.", history);

  assert.ok(shortFollowUp.referenceInfo.hasAnaphora, "Must detect anaphora for previous answer");
  assert.ok(
    shortFollowUp.resolvedPrompt.toLowerCase().includes("summarize") || shortFollowUp.resolvedPrompt.toLowerCase().includes("concise"),
    "Resolved prompt must request concise summary of previous topic"
  );
  assert.ok(shortFollowUp.resolvedPrompt.includes("Distributed Consensus"), "Must preserve target topic");
  console.log("  ✔ Test 4: 'Previous answer short ga cheppu' resolved to concise summary preserving topic.");

  // ---------------------------------------------------------------------------
  // Test 5: File Conversion Follow-Up: "Daanini PDF ga convert cheyyi"
  // ---------------------------------------------------------------------------
  console.log("▶ Test 5: Follow-up resolution ('Daanini PDF ga convert cheyyi')...");
  const pdfFollowUp = contextManager.resolveContext("Daanini PDF ga convert cheyyi.", history);

  assert.ok(pdfFollowUp.referenceInfo.hasAnaphora, "Must detect anaphora for 'Daanini'");
  assert.ok(pdfFollowUp.resolvedPrompt.includes("PDF"), "Must resolve to PDF format");
  assert.ok(pdfFollowUp.resolvedPrompt.includes("Distributed Consensus"), "Must retain previous topic");
  console.log("  ✔ Test 5: 'Daanini PDF ga convert cheyyi' resolved to PDF conversion retaining topic.");

  // ---------------------------------------------------------------------------
  // Test 6: Design Replicate Follow-Up: "Same design lo website create cheyyi"
  // ---------------------------------------------------------------------------
  console.log("▶ Test 6: Follow-up resolution ('Same design lo website create cheyyi')...");
  const designHistory: ConversationTurn[] = [
    { role: "user", content: "Create a modern landing page for an AI robotics lab." },
    { role: "assistant", content: "Here is the sleek dark mode glassmorphism dashboard." },
  ];
  const designFollowUp = contextManager.resolveContext("Same design lo website create cheyyi.", designHistory);

  assert.ok(designFollowUp.referenceInfo.hasAnaphora, "Must detect anaphora for 'Same design'");
  assert.ok(designFollowUp.resolvedPrompt.toLowerCase().includes("design styling"), "Must resolve to replicating design styling");
  console.log("  ✔ Test 6: Design replication follow-up correctly preserves stylistic context.");

  // ---------------------------------------------------------------------------
  // Test 7: Debug Code Follow-Up: "Ee code lo errors fix cheyyi"
  // ---------------------------------------------------------------------------
  console.log("▶ Test 7: Follow-up resolution ('Ee code lo errors fix cheyyi')...");
  const codeHistory: ConversationTurn[] = [
    { role: "user", content: "Write a binary search algorithm in Python." },
    { role: "assistant", content: "def binary_search(arr, x): ..." },
  ];
  const debugFollowUp = contextManager.resolveContext("Ee code lo errors fix cheyyi.", codeHistory);

  assert.ok(debugFollowUp.referenceInfo.hasAnaphora, "Must detect anaphora for 'Ee code'");
  assert.ok(debugFollowUp.resolvedPrompt.toLowerCase().includes("debug and fix"), "Must resolve to debugging and error fixing");
  console.log("  ✔ Test 7: 'Ee code lo errors fix cheyyi' resolved to code debugging with antecedent preservation.");

  // ---------------------------------------------------------------------------
  // Test 8: Common Spelling Mistakes & Typo Normalization
  // ---------------------------------------------------------------------------
  console.log("▶ Test 8: Typo normalization & fault-tolerant parsing...");
  const rawTypo = "reaserch wether the databse projct needs a documnt and presntation";
  const cleaned = promptAnalyzer.normalizeTypos(rawTypo);

  assert.ok(cleaned.includes("research"), "reaserch -> research");
  assert.ok(cleaned.includes("weather"), "wether -> weather");
  assert.ok(cleaned.includes("database"), "databse -> database");
  assert.ok(cleaned.includes("project"), "projct -> project");
  assert.ok(cleaned.includes("document"), "documnt -> document");
  assert.ok(cleaned.includes("presentation"), "presntation -> presentation");
  console.log("  ✔ Test 8: Typo normalization successfully repaired 6 common spelling slips.");

  // ---------------------------------------------------------------------------
  // Test 9: Context Intelligence: Selective Relevant Turns vs Full Dump
  // ---------------------------------------------------------------------------
  console.log("▶ Test 9: Context intelligence (selective relevant turns vs full dump)...");
  const longHistory: ConversationTurn[] = [
    { role: "user", content: "What is the capital of France?" },
    { role: "assistant", content: "The capital of France is Paris." },
    { role: "user", content: "How do I make chocolate chip cookies?" },
    { role: "assistant", content: "Mix flour, butter, brown sugar, eggs, and chocolate chips." },
    { role: "user", content: "Tell me about quantum computing." },
    { role: "assistant", content: "Quantum computers use qubits in superposition." },
    { role: "user", content: "What were the ingredients for those cookies again?" },
    { role: "assistant", content: "Flour, butter, sugar, eggs, and chocolate chips." },
  ];

  const selectedTurns = contextManager.selectRelevantContextTurns(
    longHistory,
    "Can I substitute dark chocolate in that cookie recipe?",
    4
  );

  assert.ok(selectedTurns.length <= 4, "Must bound context length to maxTurns (4)");
  assert.ok(
    selectedTurns.some((t) => t.content.toLowerCase().includes("cookie") || t.content.toLowerCase().includes("chocolate")),
    "Selected turns must prioritize semantic relevance (cookie recipe)"
  );
  // Paris and quantum computing should not displace relevant cookie context
  console.log(`  ✔ Test 9: Selective context retrieval selected ${selectedTurns.length} relevant turns out of ${longHistory.length} turns.`);

  // ---------------------------------------------------------------------------
  // Test 10: Complex Task Interpretation & DAG Dependency Mapping
  // ---------------------------------------------------------------------------
  console.log("▶ Test 10: Complex task DAG dependency mapping...");
  const complexPlan = taskDecomposer.decomposeComplexPlan(
    "Create a Lost and Found Java project for my college. Connect a database, prepare documentation and create a presentation.",
    ["Java", "database", "college", "documentation", "presentation"],
    8
  );

  assert.strictEqual(complexPlan.isComplex, true);
  assert.ok(complexPlan.executionSteps.length >= 5, "Must decompose into at least 5 structured steps");
  // Check dependencies: Step 2 (Database) depends on Step 1 (Architecture)
  const dbStep = complexPlan.executionSteps.find((s) => s.title.includes("Database"));
  assert.ok(dbStep && dbStep.dependencies.includes(1), "Database step must depend on Architecture (Step 1)");
  console.log("  ✔ Test 10: Complex task plan verified with valid DAG dependencies.");

  console.log("\n====================================================================");
  console.log("   ALL 10 PHASE 35 REAL-WORLD INTELLIGENCE TESTS PASSED!            ");
  console.log("====================================================================\n");
}

if (process.argv[1]?.endsWith("phase-35-real-world-intelligence.test.ts")) {
  runPhase35RealWorldIntelligenceTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
