/**
 * TATTVA AI - Phase 26 Preview & Production Verification Script
 * Validates the complete Learning Platform lifecycle on live Vercel deployments
 */

import { execSync } from "child_process";
import fs from "fs";

const targetUrl = process.argv[2] || "https://tattva-ai-phi.vercel.app";
console.log("Target Base URL:", targetUrl);

async function main() {
  const token = Buffer.from(
    JSON.stringify({
      userId: "guest_user",
      email: "guest@tattva.ai",
      tier: "free",
      expiresAt: Date.now() + 3600000,
    })
  ).toString("base64");

  console.log("\n1. Testing /api/health on deployment...");
  const healthCmd = `npx vercel curl "${targetUrl}/api/health"`;
  const healthOutput = execSync(healthCmd, { encoding: "utf-8" });
  console.log("Health Output Sample:\n", healthOutput.slice(-300));
  if (!healthOutput.includes('"environment":')) {
    throw new Error("Health check failed: " + healthOutput);
  }

  console.log("\n2. Testing /api/learning/curriculum POST...");
  const curricPayload = {
    topic: "Distributed Systems Architecture",
    domain: "system_architecture",
    baselineLevel: "beginner",
    targetLevel: "expert",
  };
  fs.writeFileSync("scratch/test-learn-curric.json", JSON.stringify(curricPayload));
  const curricCmd = `npx vercel curl ${targetUrl}/api/learning/curriculum -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-learn-curric.json"`;
  const curricOutput = execSync(curricCmd, { encoding: "utf-8" });
  console.log("Curriculum Output Sample:\n", curricOutput.slice(-350));
  if (!curricOutput.includes('"success":true') || !curricOutput.includes('"modules":')) {
    throw new Error("Curriculum generation failed: " + curricOutput);
  }

  console.log("\n3. Testing /api/learning/explain POST...");
  const explainPayload = {
    concept: "Event Loop & Non-Blocking I/O",
    domain: "computer_science",
    level: "intermediate",
  };
  fs.writeFileSync("scratch/test-learn-explain.json", JSON.stringify(explainPayload));
  const explainCmd = `npx vercel curl ${targetUrl}/api/learning/explain -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-learn-explain.json"`;
  const explainOutput = execSync(explainCmd, { encoding: "utf-8" });
  console.log("Explanation Output Sample:\n", explainOutput.slice(-350));
  if (!explainOutput.includes('"success":true') || !explainOutput.includes('"analogy":')) {
    throw new Error("Concept explanation failed: " + explainOutput);
  }

  console.log("\n4. Testing /api/learning/quiz POST & PUT...");
  const quizPayload = {
    topic: "Dynamic Programming",
    domain: "data_structures_algorithms",
    level: "intermediate",
    questionCount: 2,
  };
  fs.writeFileSync("scratch/test-learn-quiz.json", JSON.stringify(quizPayload));
  const quizCmd = `npx vercel curl ${targetUrl}/api/learning/quiz -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-learn-quiz.json"`;
  const quizOutput = execSync(quizCmd, { encoding: "utf-8" });
  console.log("Quiz Output Sample:\n", quizOutput.slice(-350));
  if (!quizOutput.includes('"success":true') || !quizOutput.includes('"questions":')) {
    throw new Error("Quiz generation failed: " + quizOutput);
  }

  // Parse quiz to test grading submission
  const jsonMatch = quizOutput.match(/\{"success":true,"data":\{.*\}\}/s);
  if (!jsonMatch) throw new Error("Could not parse quiz JSON from response");
  const parsedQuiz = JSON.parse(jsonMatch[0]).data;

  const evalPayload = {
    quiz: parsedQuiz,
    submissions: [
      {
        questionId: parsedQuiz.questions[0].id,
        selectedAnswer: parsedQuiz.questions[0].correctAnswer,
      },
    ],
  };
  fs.writeFileSync("scratch/test-learn-eval.json", JSON.stringify(evalPayload));
  const evalCmd = `npx vercel curl ${targetUrl}/api/learning/quiz -X PUT -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-learn-eval.json"`;
  const evalOutput = execSync(evalCmd, { encoding: "utf-8" });
  console.log("Quiz Eval Output Sample:\n", evalOutput.slice(-350));
  if (!evalOutput.includes('"success":true') || !evalOutput.includes('"scorePercentage":')) {
    throw new Error("Quiz evaluation failed: " + evalOutput);
  }

  console.log("\n5. Testing /api/learning/solve POST...");
  const solvePayload = {
    problem: "Detect cycles in a directed graph using DFS and recursion stacks.",
    domain: "data_structures_algorithms",
    difficulty: "advanced",
  };
  fs.writeFileSync("scratch/test-learn-solve.json", JSON.stringify(solvePayload));
  const solveCmd = `npx vercel curl ${targetUrl}/api/learning/solve -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-learn-solve.json"`;
  const solveOutput = execSync(solveCmd, { encoding: "utf-8" });
  console.log("Solve Output Sample:\n", solveOutput.slice(-350));
  if (!solveOutput.includes('"success":true') || !solveOutput.includes('"steps":')) {
    throw new Error("Problem solution derivation failed: " + solveOutput);
  }

  console.log("\n6. Testing /api/learning/spaced-repetition (SM-2 review)...");
  const cardPayload = {
    concept: "Cap Theorem",
    front: "What does the CAP theorem state?",
    back: "A distributed system can guarantee at most two of Consistency, Availability, and Partition Tolerance.",
    tags: ["distributed_systems"],
  };
  fs.writeFileSync("scratch/test-learn-card.json", JSON.stringify(cardPayload));
  const cardCmd = `npx vercel curl ${targetUrl}/api/learning/spaced-repetition -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-learn-card.json"`;
  const cardOutput = execSync(cardCmd, { encoding: "utf-8" });
  console.log("Card Creation Sample:\n", cardOutput.slice(-350));
  if (!cardOutput.includes('"success":true') || !cardOutput.includes('"easeFactor":')) {
    throw new Error("Card creation failed: " + cardOutput);
  }

  console.log("\n7. Testing /api/learning/export POST (Anki TSV)...");
  const exportPayload = {
    topic: "Distributed Systems",
  };
  fs.writeFileSync("scratch/test-learn-export.json", JSON.stringify(exportPayload));
  const exportCmd = `npx vercel curl ${targetUrl}/api/learning/export -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-learn-export.json"`;
  const exportOutput = execSync(exportCmd, { encoding: "utf-8" });
  console.log("Anki Export Sample:\n", exportOutput.slice(-350));
  if (!exportOutput.includes('"success":true') || !exportOutput.includes('"ankiTsv":')) {
    throw new Error("Anki export failed: " + exportOutput);
  }

  console.log("\n8. Testing /learning UI Route...");
  const uiCmd = `npx vercel curl "${targetUrl}/learning" -H "x-tattva-session: ${token}"`;
  const uiOutput = execSync(uiCmd, { encoding: "utf-8" });
  console.log("UI Route Output Length:", uiOutput.length, "bytes");
  if (!uiOutput.includes("Personalized AI Learning Platform") && !uiOutput.includes("<html")) {
    throw new Error("Learning UI route failed: " + uiOutput.slice(0, 300));
  }

  console.log("\n==========================================================");
  console.log("✅ ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! ✅");
  console.log("==========================================================");
}

main().catch((err) => {
  console.error("\n❌ Verification Failed:", err.message);
  process.exit(1);
});
