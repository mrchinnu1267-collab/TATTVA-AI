/**
 * TATTVA AI - PHASE 16: ADVANCED RAG & KNOWLEDGE ENGINE TEST SUITE
 * Validates multi-format ingestion, semantic & markdown chunking,
 * hybrid vector+BM25+rerank retrieval, workspace RBAC, and grounded citations.
 *
 * Authored by: kotapati Gowtham Chowdary
 */

import { ragEngine } from "../app/lib/ai-orchestrator/rag-engine";

let testsRun = 0;
let testsPassed = 0;

function assert(condition: boolean, message: string) {
  testsRun++;
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  testsPassed++;
  console.log(`  ✅ [PASS] ${message}`);
}

async function runPhase16Tests() {
  console.log("\n========================================================");
  console.log("📚 TATTVA PHASE 16: ADVANCED RAG & KNOWLEDGE ENGINE TEST SUITE");
  console.log("========================================================\n");

  // ----------------------------------------------------
  // TEST SECTION 1: STRUCTURE-AWARE & MARKDOWN CHUNKING
  // ----------------------------------------------------
  console.log("--- 1. Structure & Heading-Aware Semantic Chunking ---");

  const sampleMarkdown = `
# System Architecture Overview
TATTVA AI utilizes a unified multi-agent mesh architecture for coordinating tool invocations and cognitive reasoning.

## Ingestion Pipelines
Data ingestion supports unstructured text, PDF documents, Microsoft Office spreadsheets, and raw telemetry streams.

### Vector Indexing
Embeddings are computed with high-dimensional dense representations, paired with sparse BM25 indices.

## Security Governance
Role-based access control enforces tenant workspace boundaries and personal privacy partitions.
`;

  const structuredChunks = ragEngine.chunkTextWithStructure(sampleMarkdown, 300, 50);

  assert(structuredChunks.length >= 3, `Extracted ${structuredChunks.length} structure-aware chunks`);
  assert(
    structuredChunks.some((c) => c.sectionTitle === "System Architecture Overview"),
    "Preserved top-level section title 'System Architecture Overview'"
  );
  assert(
    structuredChunks.some((c) => c.sectionTitle === "Ingestion Pipelines"),
    "Preserved section title 'Ingestion Pipelines'"
  );
  assert(
    structuredChunks.every((c) => typeof c.pageEstimate === "number" && c.pageEstimate >= 1),
    "Assigned accurate page estimates to each chunk"
  );

  // ----------------------------------------------------
  // TEST SECTION 2: MULTI-FORMAT DOCUMENT INGESTION
  // ----------------------------------------------------
  console.log("\n--- 2. Multi-Format Ingestion (Markdown, JSON, Text) ---");

  const docAId = "test_doc_arch_2026";
  const docACount = await ragEngine.ingestDocument(
    docAId,
    "Tattva_Architecture_Manual.md",
    sampleMarkdown,
    { workspaceId: "ws_eng_team", accessLevel: "editor", format: "markdown" }
  );
  assert(docACount > 0, `Successfully ingested Markdown manual (${docACount} chunks)`);

  const jsonContent = JSON.stringify({
    service: "Tattva Gateway",
    port: 8080,
    features: ["hybrid_rag", "agentic_execution", "indic_translation"],
    rateLimitPerMin: 1200,
  }, null, 2);

  const docBId = "test_doc_config_json";
  const docBCount = await ragEngine.ingestDocument(
    docBId,
    "gateway_config.json",
    jsonContent,
    { workspaceId: "ws_eng_team", accessLevel: "owner", format: "json" }
  );
  assert(docBCount > 0, `Successfully ingested JSON config (${docBCount} chunks)`);

  // ----------------------------------------------------
  // TEST SECTION 3: WORKSPACE ISOLATION & RBAC ENFORCEMENT
  // ----------------------------------------------------
  console.log("\n--- 3. Workspace Isolation & Role-Based Access Control ---");

  // Private Finance Doc in separate workspace
  const financeDocId = "test_doc_finance_priv";
  await ragEngine.ingestDocument(
    financeDocId,
    "Q4_Confidential_Financials.txt",
    "Company Q4 revenue reached $4.2M with 78% gross margin. Operating expenses were strictly kept under budget.",
    { workspaceId: "ws_finance_c_suite", accessLevel: "owner", format: "text" }
  );

  // Search from Engineering Workspace: Should NOT see Finance Doc
  const engSearch = await ragEngine.hybridSearch(
    "revenue and margin",
    5,
    undefined,
    undefined,
    "ws_eng_team",
    "editor"
  );
  assert(
    !engSearch.matchedChunks.some((c) => c.documentId === financeDocId),
    "Engineering workspace prevented from reading confidential Finance document"
  );

  // Search from Finance Workspace: Should see Finance Doc
  const financeSearch = await ragEngine.hybridSearch(
    "revenue and gross margin",
    5,
    undefined,
    undefined,
    "ws_finance_c_suite",
    "owner"
  );
  assert(
    financeSearch.matchedChunks.some((c) => c.documentId === financeDocId),
    "Finance workspace owner authorized to retrieve confidential financials"
  );

  // ----------------------------------------------------
  // TEST SECTION 4: HYBRID RETRIEVAL & RERANKING
  // ----------------------------------------------------
  console.log("\n--- 4. Hybrid Vector + BM25 + Cross-Encoder Reranking ---");

  const hybridResult = await ragEngine.hybridSearch(
    "vector indexing embeddings BM25",
    3,
    undefined,
    undefined,
    "ws_eng_team",
    "editor"
  );

  assert(hybridResult.matchedChunks.length > 0, "Retrieved top candidates via hybrid search");
  assert(hybridResult.retrievalMethod === "hybrid_reranked", "Retrieval marked as hybrid_reranked");
  assert(typeof hybridResult.confidenceScore === "number", `Calculated confidence score: ${hybridResult.confidenceScore}%`);
  assert(hybridResult.confidenceScore > 0, "Confidence score is positive and grounded");

  // ----------------------------------------------------
  // TEST SECTION 5: GROUNDED CITATIONS & EVIDENCE EXTRACTION
  // ----------------------------------------------------
  console.log("\n--- 5. Grounded Citations & Anti-Hallucination Evidence ---");

  assert((hybridResult.citations?.length || 0) > 0, "Generated grounded citations for retrieved context");
  const topCitation = hybridResult.citations![0];
  assert(topCitation.documentName === "Tattva_Architecture_Manual.md", "Citation accurately references document name");
  assert(Boolean(topCitation.snippet), "Citation contains verbatim snippet for verification");
  assert(topCitation.confidenceScore > 0, "Citation carries anti-hallucination confidence metric");

  // ----------------------------------------------------
  // TEST SECTION 6: KNOWLEDGE MANAGEMENT & DOCUMENT DELETION
  // ----------------------------------------------------
  console.log("\n--- 6. Knowledge Index Management & Document Deletion ---");

  const initialDocs = ragEngine.listDocuments("ws_eng_team");
  assert(initialDocs.some((d) => d.documentId === docBId), "Document listed in workspace inventory");

  const deleteSuccess = ragEngine.deleteDocument(docBId, "ws_eng_team");
  assert(deleteSuccess === true, "Document and associated chunks deleted successfully");

  const postDeleteDocs = ragEngine.listDocuments("ws_eng_team");
  assert(!postDeleteDocs.some((d) => d.documentId === docBId), "Deleted document no longer present in workspace");

  // Clean up test documents
  ragEngine.deleteDocument(docAId);
  ragEngine.deleteDocument(financeDocId);

  console.log("\n========================================================");
  console.log(`🏁 PHASE 16 TEST RESULTS: ${testsPassed}/${testsRun} PASSED (${Math.round((testsPassed / testsRun) * 100)}%)`);
  console.log("========================================================\n");
}

runPhase16Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
