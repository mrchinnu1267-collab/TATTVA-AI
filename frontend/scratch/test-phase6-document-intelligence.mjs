/**
 * TATTVA AI - Phase 6 Advanced Document Intelligence Test Suite
 * Tests universal document extraction, classification, grounded QA, multi-doc comparison,
 * and tenant isolation in the document vault.
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { classifyDocument } = jiti("../app/lib/document-engine/document-classifier.ts");
const { chunkDocumentIntoPassages, answerQuestionFromDocuments } = jiti("../app/lib/document-engine/document-qa-engine.ts");
const { compareMultipleDocuments } = jiti("../app/lib/document-engine/document-comparator.ts");
const { DocumentVault } = jiti("../app/lib/document-engine/document-vault.ts");
const { extractTabularData, analyzeSourceCodeFile } = jiti("../app/lib/document-engine/multi-doc-analyzer.ts");

let passed = 0;
let failed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${testName} ${details ? `(${details})` : ""}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${testName} ${details ? `[FAILED: ${details}]` : ""}`);
  }
}

async function runTests() {
  console.log("====================================================================");
  console.log("TATTVA AI — PHASE 6 ADVANCED DOCUMENT INTELLIGENCE TEST SUITE");
  console.log("====================================================================\n");

  // TEST SUITE 1: Document Genre Classification
  console.log("Test Suite 1: Document Genre Classification & Structural Outlines");
  const techSpec = `
  # Architecture Specification for Distributed Cache
  ## System Design & Protocols
  The distributed cache employs consistent hashing and Raft consensus across 5 cluster nodes.
  ### API Endpoints
  - GET /api/cache/key
  - POST /api/cache/key
  `;
  const classTech = classifyDocument(techSpec, "spec.md");
  assert(classTech.category === "technical_specification", "Technical spec classified correctly", classTech.category);
  assert(classTech.sectionCount >= 3, "Extracted heading sections", `${classTech.sectionCount} sections`);

  const researchPaper = `
  Abstract
  We present a novel self-attention transformer for multimodal representation.
  Introduction
  Recent advances in neural networks demonstrate significant performance gains.
  Methodology
  The loss function is computed using cross-entropy with label smoothing.
  References
  [1] Vaswani et al. Attention Is All You Need.
  `;
  const classPaper = classifyDocument(researchPaper, "paper.txt");
  assert(classPaper.category === "research_paper", "Academic research paper classified correctly", classPaper.category);

  const codeDoc = `
  export class CacheManager {
    private storage = new Map<string, any>();
    public get(key: string) { return this.storage.get(key); }
  }
  `;
  const classCode = classifyDocument(codeDoc, "cache.ts");
  assert(classCode.category === "source_code", "Source code file classified correctly", classCode.category);

  const slideDoc = `
  [Slide 1]: Welcome to TATTVA AI Platform Architecture
  [Slide 2]: Multi-Agent Orchestration & Security Vault
  [Slide 3]: Production Benchmarks & Conclusion
  `;
  const classDeck = classifyDocument(slideDoc, "deck.pptx");
  assert(classDeck.category === "presentation_deck", "Slide deck classified correctly", classDeck.category);
  assert(classDeck.sectionCount === 3, "Extracted 3 slides into sections", `${classDeck.sectionCount} slides`);

  // TEST SUITE 2: Tabular Extraction & Source Code AST
  console.log("\nTest Suite 2: Tabular Extraction & Source Code AST Inspection");
  const csvContent = `id,name,role,department\n1,Alice,Engineer,Core Platform\n2,Bob,Architect,AI Systems\n3,Charlie,Security Lead,Cybersecurity`;
  const tables = extractTabularData(csvContent, "employees.csv");
  assert(tables.length === 1, "Extracted table from CSV");
  assert(tables[0].rowCount === 3, "Extracted 3 employee rows", `Row count: ${tables[0].rowCount}`);
  assert(tables[0].headers.includes("role"), "Headers contain 'role'");

  const astAnalysis = analyzeSourceCodeFile(codeDoc, "cache.ts");
  assert(astAnalysis.language === "typescript", "Language identified as typescript", astAnalysis.language);
  assert(astAnalysis.classes.includes("CacheManager"), "Identified class CacheManager");
  assert(astAnalysis.functions.includes("get"), "Identified method get()");

  // TEST SUITE 3: Grounded Document Question-Answering
  console.log("\nTest Suite 3: Grounded Document Question-Answering with Citations");
  const docCollection = [
    {
      name: "cluster_runbook.md",
      content: `
      # Database Cluster Configuration
      The primary PostgreSQL database runs on port 5432 with replication factor 3.
      Connection pooling is managed by PgBouncer with a maximum pool size of 200 clients.
      
      # Backup Strategy
      Daily snapshots are written to immutable S3 buckets at 02:00 UTC and retained for 30 days.
      `,
    },
  ];

  const qaAnswered = answerQuestionFromDocuments("What is the maximum pool size for connection pooling?", docCollection);
  assert(qaAnswered.isAnswerFound === true, "Answer located in document text");
  assert(qaAnswered.answer.includes("200 clients"), "Answer includes verified metric '200 clients'");
  assert(qaAnswered.citations.length > 0, "Citations array populated with passage index", `Citations: ${qaAnswered.citations.length}`);

  const qaNotAnswered = answerQuestionFromDocuments("What is the administrator's personal phone number?", docCollection);
  assert(qaNotAnswered.isAnswerFound === false, "Unmentioned query returns isAnswerFound = false");
  assert(qaNotAnswered.answer.includes("do not contain information directly addressing"), "Honest refusal without hallucination");

  // TEST SUITE 4: Multi-Document Comparative Analysis
  console.log("\nTest Suite 4: Multi-Document Comparative Analysis");
  const docA = {
    name: "Strategy_2025.txt",
    content: "The company will prioritize cloud migration, enterprise security, and machine learning infrastructure to scale operations.",
  };
  const docB = {
    name: "Strategy_2026.txt",
    content: "The company will prioritize autonomous AI agents, enterprise security, and global serverless deployment to scale operations.",
  };

  const comparison = compareMultipleDocuments([docA, docB]);
  assert(comparison.documents.length === 2, "Comparison evaluated 2 documents");
  assert(comparison.sharedThemes.includes("enterprise") || comparison.sharedThemes.includes("security"), "Identified mutual conceptual theme");
  assert(comparison.divergentPoints.length > 0, "Identified divergent focal points across years");
  assert(comparison.comparisonMatrix.length >= 3, "Generated comparison matrix with dimensions");

  // TEST SUITE 5: Tenant-Isolated Document Vault
  console.log("\nTest Suite 5: Tenant-Isolated Document Vault & Security");
  const userA = "tenant_user_alpha";
  const userB = "tenant_user_beta";

  const buffer = Buffer.from(techSpec, "utf-8");
  const storedDoc = await DocumentVault.ingestDocument(
    userA,
    "workspace_alpha",
    "architecture_spec.md",
    buffer,
    "text/markdown"
  );

  assert(Boolean(storedDoc.id), "Document ingested and assigned unique ID", storedDoc.id);
  assert(storedDoc.userId === userA, "Document associated with User A");

  // User A retrieves own document
  const retrievedByA = DocumentVault.getDocument(userA, storedDoc.id);
  assert(retrievedByA !== null && retrievedByA.id === storedDoc.id, "User A successfully retrieves own document");

  // User B attempts to access User A's document
  const retrievedByB = DocumentVault.getDocument(userB, storedDoc.id);
  assert(retrievedByB === null, "Multi-Tenant Isolation: User B cannot retrieve User A's document");

  // User B lists documents
  const listB = DocumentVault.listUserDocuments(userB);
  assert(listB.length === 0, "Multi-Tenant Isolation: User B's vault list is completely empty");

  // Enforce 25MB file limit
  let sizeLimitThrown = false;
  try {
    const hugeBuffer = Buffer.alloc(26 * 1024 * 1024);
    await DocumentVault.ingestDocument(userA, "workspace_alpha", "huge.bin", hugeBuffer);
  } catch (err) {
    sizeLimitThrown = true;
  }
  assert(sizeLimitThrown === true, "Enforces 25MB maximum safe file size limit");

  console.log("\n====================================================================");
  console.log(`PHASE 6 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("====================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution aborted:", err);
  process.exit(1);
});
