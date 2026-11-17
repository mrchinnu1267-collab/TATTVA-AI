/**
 * TATTVA AI - Phase 26 Personalized AI Learning Platform Automated Test Suite
 * Tests curriculum generation, concept explainer, quizzes, step derivation, SM-2 spaced repetition, and tool registration
 */

import {
  LearningPlatformEngine,
  CurriculumGenerator,
  ExplanationEngine,
  QuizEngine,
  SolutionDerivationEngine,
  SpacedRepetitionEngine,
  MasteryTracker,
  FlashcardExporter,
} from "../app/lib/learning/index.ts";
import { CentralizedToolRegistry } from "../app/lib/agent-engine/tool-registry.ts";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("🧪 RUNNING PHASE 26 PERSONALIZED AI LEARNING PLATFORM TEST SUITE");
  console.log("==================================================================");

  // 1. Adaptive Curriculum Generation Tests
  console.log("\n[1] CurriculumGenerator & Adaptability");
  const curriculum = LearningPlatformEngine.createCurriculum(
    "user_test_1",
    "ws_learn",
    "Distributed Consensus & Raft Protocol",
    "system_architecture",
    "beginner",
    "expert"
  );

  assert(!!curriculum && !!curriculum.id, "Curriculum generated with valid ID");
  assert(curriculum.topic.includes("Distributed Consensus"), "Curriculum topic matches input");
  assert(curriculum.modules.length >= 4, `Curriculum contains comprehensive modules (${curriculum.modules.length} modules)`);
  assert(curriculum.totalEstimatedHours > 0, `Estimated hours calculated (${curriculum.totalEstimatedHours} hours)`);
  assert(curriculum.modules[0].prerequisites.length === 0, "Module 1 has no prerequisites (foundational)");
  assert(curriculum.modules[1].prerequisites.includes("mod_1"), "Module 2 correctly chains prerequisite on Module 1");

  // 2. Concept Explanation & Analogy Tests
  console.log("\n[2] Concept Explanation, Analogies & Depth Calibration");
  const expBeg = LearningPlatformEngine.explainConcept("Event Loop", "computer_science", "beginner");
  assert(expBeg.level === "beginner", "Beginner explanation generated");
  assert(expBeg.analogy.includes("restaurant kitchen"), "Event loop analogy generated restaurant mental model");
  assert(expBeg.keyPrinciples.length >= 3, "Core principles enumerated");
  assert(expBeg.commonPitfalls.length >= 3, "Common anti-patterns enumerated");

  const expExp = LearningPlatformEngine.explainConcept("Eigenvalues", "mathematics", "expert");
  assert(expExp.level === "expert", "Expert explanation generated");
  assert(expExp.analogy.includes("rubber sheet"), "Linear algebra analogy generated elastic sheet model");
  assert(!!expExp.codeOrMathExample && expExp.codeOrMathExample.includes("det(A - λ * I) = 0"), "Mathematical characteristic polynomial included");

  // 3. Interactive Quiz & Automated Evaluation Tests
  console.log("\n[3] Interactive Quiz Engine & Instant Grading");
  const quiz = LearningPlatformEngine.createQuiz("Dynamic Programming", "data_structures_algorithms", "intermediate", 3);
  assert(quiz.questions.length === 3, "Generated 3 interactive questions");
  assert(quiz.questions[0].options.length === 4, "Question 1 includes 4 multiple-choice options");
  assert(quiz.questions[0].hints.length >= 2, "Question 1 includes progressive hints");

  // Simulate student submissions
  const submissions = [
    {
      questionId: quiz.questions[0].id,
      selectedAnswer: quiz.questions[0].correctAnswer,
    },
    {
      questionId: quiz.questions[1].id,
      selectedAnswer: quiz.questions[1].correctAnswer,
    },
    {
      questionId: quiz.questions[2].id,
      selectedAnswer: "Incorrect completely wrong answer",
    },
  ];

  const evalResult = LearningPlatformEngine.evaluateQuiz("user_test_1", "ws_learn", quiz, submissions);
  assert(evalResult.totalQuestions === 3, "Evaluated all 3 questions");
  assert(evalResult.correctCount === 2, "Correct count calculated accurately (2/3)");
  assert(evalResult.scorePercentage === 67, `Score percentage calculated (${evalResult.scorePercentage}%)`);
  assert(evalResult.evaluations[0].isCorrect === true, "Question 1 marked correct");
  assert(evalResult.evaluations[2].isCorrect === false, "Question 3 marked incorrect");
  assert(evalResult.recommendations.length > 0, "Actionable pedagogical recommendation provided");

  // 4. Step-by-Step Solution Derivation Tests
  console.log("\n[4] Step-by-Step Problem Derivation Engine");
  const problem = "Given a directed graph, detect whether it contains a cycle in O(V + E) time.";
  const solution = LearningPlatformEngine.deriveSolution(problem, "data_structures_algorithms", "advanced");

  assert(!!solution.id, "Solution generated with ID");
  assert(solution.totalSteps >= 4, `Derived ${solution.totalSteps} structured steps`);
  assert(solution.steps[0].title.includes("Problem Formalization"), "Step 1 formalizes constraints");
  assert(solution.steps[1].title.includes("Strategy Formulation"), "Step 2 formulates algorithmic strategy");
  assert(solution.steps[3].title.includes("Verification"), "Step 4 performs verification & complexity analysis");
  assert(!!solution.finalAnswer, "Final verified answer articulated");

  // 5. Spaced Repetition (SuperMemo SM-2) Algorithm Tests
  console.log("\n[5] SuperMemo SM-2 Spaced Repetition Engine");
  const card = LearningPlatformEngine.createCard(
    "user_test_sm2",
    "ws_sm2",
    "B-Tree Invariants",
    "What is the maximum branching factor in a B-Tree of order M?",
    "Every internal node has at most M children and at least ceil(M/2) children.",
    ["data_structures", "databases"]
  );

  assert(card.repetitions === 0, "Initial card has 0 repetitions");
  assert(card.intervalDays === 1, "Initial interval is 1 day");
  assert(card.easeFactor === 2.5, "Initial ease factor is 2.5");

  // Review 1: Grade 5 (Perfect recall)
  const rev1 = LearningPlatformEngine.reviewCard("user_test_sm2", "ws_sm2", card.id, 5);
  assert(rev1.repetitions === 1, "Repetitions incremented to 1 after successful review");
  assert(rev1.intervalDays === 1, "Interval is 1 day after first successful review (I(1) = 1)");
  assert(rev1.easeFactor >= 2.5, `Ease factor increased or maintained (${rev1.easeFactor})`);

  // Review 2: Grade 4 (Good recall)
  const rev2 = LearningPlatformEngine.reviewCard("user_test_sm2", "ws_sm2", card.id, 4);
  assert(rev2.repetitions === 2, "Repetitions incremented to 2");
  assert(rev2.intervalDays === 6, "Interval becomes 6 days after second successful review (I(2) = 6)");

  // Review 3: Grade 5 (Perfect recall)
  const rev3 = LearningPlatformEngine.reviewCard("user_test_sm2", "ws_sm2", card.id, 5);
  assert(rev3.repetitions === 3, "Repetitions incremented to 3");
  assert(rev3.intervalDays >= 15, `Interval multiplied by EF (${rev3.intervalDays} days)`);

  // Review 4: Grade 0 (Complete blackout / failure)
  const rev4 = LearningPlatformEngine.reviewCard("user_test_sm2", "ws_sm2", card.id, 0);
  assert(rev4.repetitions === 0, "Repetitions reset to 0 after failure (q < 3)");
  assert(rev4.intervalDays === 1, "Interval resets to 1 day after failure");
  assert(rev4.easeFactor >= 1.3, `Ease factor remains bounded above minimum 1.3 floor (${rev4.easeFactor})`);

  // 6. Mastery & Retention Tracking Tests
  console.log("\n[6] Learner Mastery & Forgetting Curve Decay");
  const mastery = LearningPlatformEngine.getMasteryProfile("user_test_1", "ws_learn", "data_structures_algorithms");
  assert(mastery.userId === "user_test_1", "Mastery profile retrieved for user");
  assert(typeof mastery.overallMasteryPercentage === "number", `Overall mastery computed (${mastery.overallMasteryPercentage}%)`);

  // 7. Flashcard Exporter (Anki-Compatible TSV & JSON)
  console.log("\n[7] Anki-Compatible Flashcard Exporter");
  const bundle = LearningPlatformEngine.exportFlashcards("Databases", [card]);
  assert(bundle.totalCards === 1, "Export bundle holds 1 card");
  assert(bundle.ankiTsv.includes("#separator:tab"), "Anki TSV header includes tab separator directive");
  assert(bundle.ankiTsv.includes("B-Tree"), "Anki TSV body includes card front/back");

  // 8. Tool Registry Integration Tests
  console.log("\n[8] Centralized Tool Registry Integration");
  const registry = CentralizedToolRegistry.getInstance();
  const context = { userId: "user_test_agent", sessionId: "sess_learn", isApprovalGranted: true, activePolicies: [] };

  // 8.1 create_study_plan tool
  const planExec = await registry.executeTool(
    "create_study_plan",
    { topic: "Microkernel Operating Systems", domain: "computer_science", baselineLevel: "beginner", targetLevel: "advanced" },
    context
  );
  assert(planExec.success === true, "Tool create_study_plan executed successfully");
  assert(planExec.output.moduleCount >= 3, `create_study_plan returned ${planExec.output.moduleCount} modules`);

  // 8.2 generate_quiz tool
  const quizExec = await registry.executeTool(
    "generate_quiz",
    { topic: "Concurrency & Lock Free Data Structures", domain: "computer_science", questionCount: 2 },
    context
  );
  assert(quizExec.success === true, "Tool generate_quiz executed successfully");
  assert(quizExec.output.questionCount === 2, "generate_quiz returned 2 questions");

  // 8.3 derive_step_by_step_solution tool
  const solveExec = await registry.executeTool(
    "derive_step_by_step_solution",
    { problem: "Derive Euler's formula e^(ix) = cos(x) + i*sin(x) using Taylor series expansion.", domain: "mathematics" },
    context
  );
  assert(solveExec.success === true, "Tool derive_step_by_step_solution executed successfully");
  assert(solveExec.output.totalSteps >= 3, `derive_step_by_step_solution returned ${solveExec.output.totalSteps} steps`);

  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
