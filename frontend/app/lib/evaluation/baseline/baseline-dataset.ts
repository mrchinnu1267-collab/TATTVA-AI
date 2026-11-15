/**
 * TATTVA AI - 12-Category Comprehensive Baseline Question Corpus
 * Phase 14 Architecture: Empirical ground truth benchmark dataset
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { BaselineQuestion } from "./types";

export const BASELINE_EVALUATION_QUESTIONS: BaselineQuestion[] = [
  // 1. General Knowledge
  {
    id: "gk_01",
    category: "general_knowledge",
    prompt: "What is the capital of Andhra Pradesh and on which river is it situated?",
    expectedAnswer: "Amaravati, situated on the banks of the Krishna River.",
    evaluationRubric: {
      requiredKeywords: ["amaravati", "krishna"],
      minResponseLength: 15,
      hallucinationRiskCheck: (res) => res.toLowerCase().includes("hyderabad") && !res.toLowerCase().includes("former"),
    },
    weight: 1.0,
  },

  // 2. Logical Reasoning
  {
    id: "lr_01",
    category: "logical_reasoning",
    prompt: "All roses are flowers. Some flowers fade quickly. Does it necessarily follow that some roses fade quickly? Answer with YES or NO followed by your reason.",
    expectedAnswer: "NO. The premise only states that some flowers fade quickly, which may not include any roses.",
    evaluationRubric: {
      requiredKeywords: ["no"],
      negativeKeywords: ["yes, it necessarily follows"],
      regexMatch: "\\bno\\b",
    },
    weight: 1.0,
  },

  // 3. Mathematical Reasoning
  {
    id: "mr_01",
    category: "mathematical_reasoning",
    prompt: "A train running at 72 km/h crosses a 260 m long bridge in 23 seconds. What is the length of the train in meters?",
    expectedAnswer: "Speed = 72 * 5/18 = 20 m/s. Total distance = 20 * 23 = 460 m. Length of train = 460 - 260 = 200 m.",
    evaluationRubric: {
      requiredKeywords: ["200"],
      regexMatch: "\\b200\\b",
    },
    weight: 1.0,
  },

  // 4. Instruction Following
  {
    id: "if_01",
    category: "instruction_following",
    prompt: "Provide a JSON object containing keys 'title', 'version', and 'tags'. 'tags' must be an array of exactly 3 lowercase strings related to cloud computing. Do not include any explanation or markdown backticks.",
    expectedAnswer: "A valid raw JSON object with title, version, and exactly 3 tags.",
    evaluationRubric: {
      regexMatch: '^\\s*\\{[\\s\\S]*"title"[\\s\\S]*"version"[\\s\\S]*"tags"\\s*:\\s*\\[[\\s\\S]*\\][\\s\\S]*\\}\\s*$',
      negativeKeywords: ["```", "Here is", "explanation"],
    },
    weight: 1.0,
  },

  // 5. Prompt Understanding
  {
    id: "pu_01",
    category: "prompt_understanding",
    prompt: "I want to deploy a Python FastAPI app on Docker. Tell me the Dockerfile contents only, without explaining Docker concepts.",
    expectedAnswer: "Direct Dockerfile syntax without introductory essays or explanations.",
    evaluationRubric: {
      requiredKeywords: ["from python", "workdir", "copy", "cmd"],
      negativeKeywords: ["Docker is a containerization platform", "In this tutorial"],
    },
    weight: 1.0,
  },

  // 6. Conversational Capability
  {
    id: "cc_01",
    category: "conversational_capability",
    prompt: "I had a really frustrating bug today and spent 4 hours on a typo. What should I do to feel better?",
    conversationHistory: [
      { role: "user", content: "Hey, I've been coding since 8am." },
      { role: "assistant", content: "Make sure to take breaks and stay hydrated!" },
    ],
    expectedAnswer: "Empathetic, constructive conversational response acknowledging developer fatigue and offering perspective.",
    evaluationRubric: {
      requiredKeywords: ["break", "typo", "happen"],
      minResponseLength: 40,
    },
    weight: 1.0,
  },

  // 7. Coding
  {
    id: "code_01",
    category: "coding",
    prompt: "Write a TypeScript function `isValidPalindrome(s: string): boolean` that ignores non-alphanumeric characters and is case-insensitive.",
    expectedAnswer: "Clean TypeScript function utilizing two-pointer or regex approach.",
    evaluationRubric: {
      requiredKeywords: ["function", "isvalidpalindrome", "boolean", "return"],
      regexMatch: "replace|tolowercase|charcodeat",
    },
    weight: 1.0,
  },

  // 8. Context Retention
  {
    id: "cr_01",
    category: "context_retention",
    prompt: "What was the name of my pet that I mentioned earlier, and what species is it?",
    conversationHistory: [
      { role: "user", content: "I adopted an African Grey Parrot named Aristotle yesterday." },
      { role: "assistant", content: "Congratulations! Aristotle is a majestic name for an African Grey Parrot." },
      { role: "user", content: "What was the name of my pet that I mentioned earlier, and what species is it?" },
    ],
    expectedAnswer: "Aristotle, African Grey Parrot.",
    evaluationRubric: {
      requiredKeywords: ["aristotle", "parrot"],
    },
    weight: 1.0,
  },

  // 9. Multilingual Understanding (Telugu & Hindi)
  {
    id: "ml_01",
    category: "multilingual_understanding",
    prompt: "ఈ క్రింది వాక్యాన్ని ఇంగ్లీష్ లోకి అనువదించండి: 'సౌర విద్యుత్ పర్యావరణ పరిరక్షణకు ఎంతో మేలు చేస్తుంది.'",
    expectedAnswer: "Solar power/electricity is very beneficial for environmental protection.",
    evaluationRubric: {
      requiredKeywords: ["solar", "environment"],
    },
    weight: 1.0,
  },

  // 10. Tool Usage
  {
    id: "tu_01",
    category: "tool_usage",
    prompt: "Calculate the exact value of 8492 multiplied by 3291 using a calculator tool.",
    expectedAnswer: "27,947,172",
    evaluationRubric: {
      requiredKeywords: ["27947172"],
      regexMatch: "27,?947,?172",
    },
    weight: 1.0,
  },

  // 11. Document Understanding
  {
    id: "du_01",
    category: "document_understanding",
    context: "ANNUAL REPORT EXCERPT (Page 14): In Q3 2026, renewable energy subscriptions increased by 38.4% year-over-year, generating $14.2M in recurring revenue with a churn rate of 1.2%.",
    prompt: "According to the report excerpt, what was the renewable energy churn rate in Q3 2026 and how much recurring revenue was generated?",
    expectedAnswer: "Churn rate was 1.2% and recurring revenue was $14.2M.",
    evaluationRubric: {
      requiredKeywords: ["1.2%", "14.2"],
      requiresCitation: true,
    },
    weight: 1.0,
  },

  // 12. Retrieval Accuracy
  {
    id: "ra_01",
    category: "retrieval_accuracy",
    context: "KNOWLEDGE BASE CHUNK #409: TATTVA AI uses Mulberry32 PRNG for deterministic benchmark sampling. Seeds ensure that question ordering is 100% reproducible across test runs.",
    prompt: "Which PRNG algorithm does TATTVA AI use for deterministic sampling, and what is its stated benefit?",
    expectedAnswer: "Mulberry32 PRNG, ensuring 100% reproducible question ordering across runs.",
    evaluationRubric: {
      requiredKeywords: ["mulberry32", "reproducible"],
      hallucinationRiskCheck: (res) => res.toLowerCase().includes("mersenne") || res.toLowerCase().includes("pcg"),
    },
    weight: 1.0,
  },
];
