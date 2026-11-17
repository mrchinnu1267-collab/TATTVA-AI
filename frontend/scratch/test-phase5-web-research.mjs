/**
 * TATTVA AI - Phase 5 Advanced Web Research Engine Test Suite
 * Evaluates authoritative domain tiering, SSRF defenses, multi-source fact extraction,
 * cross-source corroboration, conflict resolution, date identification, and zero fabrication.
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const {
  categorizeAuthorityTier,
  isSafePublicUrl,
  crawlWebpage,
} = jiti("../app/lib/research-engine/source-crawler.ts");

const {
  extractFactualStatements,
  corroborateFactsAcrossSources,
  detectConflictsAndDateShifts,
} = jiti("../app/lib/research-engine/fact-extractor.ts");

const {
  conductAuthoritativeResearch,
} = jiti("../app/lib/research-engine/research-synthesizer.ts");

const {
  centralizedToolRegistry,
} = jiti("../app/lib/agent-engine/tool-registry.ts");

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
  console.log("TATTVA AI — PHASE 5 ADVANCED WEB RESEARCH ENGINE TEST SUITE");
  console.log("====================================================================\n");

  // TEST 1: Authoritative Domain Tiering
  console.log("Test Suite 1: Authoritative Domain Tiering");
  const official1 = categorizeAuthorityTier("docs.python.org", "https://docs.python.org/3/");
  assert(official1 === "official_doc", "Python docs categorized as official_doc", official1);

  const official2 = categorizeAuthorityTier("nextjs.org", "https://nextjs.org/docs/app");
  assert(official2 === "official_doc", "Next.js docs categorized as official_doc", official2);

  const academic = categorizeAuthorityTier("arxiv.org", "https://arxiv.org/abs/1706.03762");
  assert(academic === "academic_gov", "arXiv categorized as academic_gov", academic);

  const gov = categorizeAuthorityTier("nih.gov", "https://www.nih.gov/health-information");
  assert(gov === "academic_gov", "NIH categorized as academic_gov", gov);

  const pub = categorizeAuthorityTier("reuters.com", "https://www.reuters.com/technology/");
  assert(pub === "established_pub", "Reuters categorized as established_pub", pub);

  const secondary = categorizeAuthorityTier("random-blog.io", "https://random-blog.io/post/1");
  assert(secondary === "secondary", "Personal blog categorized as secondary", secondary);

  // TEST 2: SSRF Guardrails
  console.log("\nTest Suite 2: SSRF & Network Security Guardrails");
  assert(!isSafePublicUrl("http://localhost:3000/api"), "Blocks localhost");
  assert(!isSafePublicUrl("http://127.0.0.1:8080/admin"), "Blocks 127.0.0.1");
  assert(!isSafePublicUrl("http://169.254.169.254/latest/meta-data"), "Blocks Cloud Metadata endpoint");
  assert(!isSafePublicUrl("http://10.0.0.1/internal"), "Blocks 10.0.0.0/8 private network");
  assert(!isSafePublicUrl("http://192.168.1.1/router"), "Blocks 192.168.0.0/16 private network");
  assert(!isSafePublicUrl("http://172.16.0.10/corp"), "Blocks 172.16.0.0/12 private network");
  assert(isSafePublicUrl("https://docs.python.org/3/library/asyncio.html"), "Allows public authoritative HTTPS URL");

  // TEST 3: Blocked Crawler Access
  console.log("\nTest Suite 3: Blocked Crawler Access");
  const blockedCrawl = await crawlWebpage("http://127.0.0.1:5000/secret", 1);
  assert(!blockedCrawl.isAccessible, "Internal URL is marked inaccessible");
  assert(blockedCrawl.error && blockedCrawl.error.includes("blocked"), "Blocked crawl provides explicit security error", blockedCrawl.error);

  // TEST 4: Fact Extraction & Confidence Scoring
  console.log("\nTest Suite 4: Fact Extraction & Confidence Scoring");
  const mockOfficialSource = {
    id: 1,
    url: "https://docs.python.org/3/library/asyncio.html",
    title: "asyncio — Asynchronous I/O — Python 3.12 documentation",
    domain: "docs.python.org",
    authorityTier: "official_doc",
    publishedDate: "2024-02-15",
    extractedSnippet: "asyncio is a library to write concurrent code using the async/await syntax. asyncio is used as a foundation for multiple Python asynchronous frameworks that provide high-performance network and web-servers, database connection libraries, distributed task queues, etc.",
    fullLength: 200,
    isAccessible: true,
    fetchedAt: new Date().toISOString(),
  };

  const facts = extractFactualStatements(mockOfficialSource);
  assert(facts.length > 0, "Extracted factual statements from official source", `${facts.length} facts`);
  assert(facts[0].confidence === "high", "Official source facts receive high initial confidence", facts[0].confidence);

  // TEST 5: Cross-Source Corroboration
  console.log("\nTest Suite 5: Cross-Source Corroboration");
  const mockSecondarySource = {
    id: 2,
    url: "https://realpython.com/async-io-python/",
    title: "Async IO in Python: A Complete Walkthrough",
    domain: "realpython.com",
    authorityTier: "secondary",
    publishedDate: "2023-08-10",
    extractedSnippet: "asyncio is a library to write concurrent code using the async/await syntax in Python. It provides high-performance network and web-servers support.",
    fullLength: 150,
    isAccessible: true,
    fetchedAt: new Date().toISOString(),
  };

  const secondaryFacts = extractFactualStatements(mockSecondarySource);
  const allFacts = [...facts, ...secondaryFacts];
  const corroborated = corroborateFactsAcrossSources(allFacts);
  const multiSourceFact = corroborated.find((f) => f.corroboratedBySources.length > 1);
  assert(Boolean(multiSourceFact), "Corroborated fact identified across two independent sources", multiSourceFact?.statement?.slice(0, 50));
  assert(multiSourceFact?.confidence === "high", "Corroborated fact elevated to high confidence");

  // TEST 6: Contradiction & Temporal Drift Detection
  console.log("\nTest Suite 6: Contradiction & Temporal Drift Detection");
  const sourcesForDrift = [
    {
      ...mockOfficialSource,
      publishedDate: "2024-01-10",
    },
    {
      ...mockSecondarySource,
      publishedDate: "2020-05-01",
    },
  ];

  const { conflicts, comparisons, uncertainties } = detectConflictsAndDateShifts(sourcesForDrift, corroborated);
  assert(conflicts.length > 0, "Temporal shift detected between 2024 and 2020 sources", `Detected ${conflicts.length} shift(s)`);
  assert(conflicts[0].isDateShift === true, "Marked as temporal date shift");
  assert(conflicts[0].resolution.includes("Prioritized the newer finding"), "Resolution prioritizes newer finding", conflicts[0].resolution);
  assert(comparisons.length > 0, "Multi-source perspectives generated", `Perspectives: ${comparisons[0].perspectives.length}`);

  // TEST 7: End-to-End Authoritative Research Dossier
  console.log("\nTest Suite 7: End-to-End Authoritative Research Dossier Synthesis");
  const dossier = await conductAuthoritativeResearch("Python asyncio event loop architecture", {
    maxSources: 3,
    crawlTimeoutMs: 5000,
  });

  assert(typeof dossier.query === "string" && dossier.query.length > 0, "Dossier query preserved");
  assert(typeof dossier.executiveSummary === "string" && dossier.executiveSummary.length > 50, "Executive summary generated");
  assert(Array.isArray(dossier.keyFindings) && dossier.keyFindings.length > 0, "Key factual findings populated");
  assert(Array.isArray(dossier.citations), "Citations list generated");
  assert(typeof dossier.markdownReport === "string" && dossier.markdownReport.includes("### Executive Summary"), "Markdown report formatted properly");
  assert(dossier.executionDurationMs > 0, "Execution duration tracked", `${dossier.executionDurationMs}ms`);

  // TEST 8: Centralized Tool Registry Integration
  console.log("\nTest Suite 8: Centralized Tool Registry Integration");
  const tool = centralizedToolRegistry.getTool("web_research");
  assert(Boolean(tool), "web_research registered in CentralizedToolRegistry");
  assert(tool.permission === "safe", "web_research has safe permission level");

  const toolExecResult = await centralizedToolRegistry.executeTool(
    "web_research",
    { query: "Next.js App Router performance", depth: "shallow" },
    {
      taskId: "test_research_task_01",
      userId: "test_researcher",
      workspaceId: "test_ws",
      isApprovalGranted: true,
      executionBudgetMs: 30000,
    }
  );

  assert(toolExecResult.success === true, "Tool executed successfully via CentralizedToolRegistry");
  assert(Array.isArray(toolExecResult.citations), "Tool returned structured citations");

  console.log("\n====================================================================");
  console.log(`PHASE 5 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("====================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution aborted:", err);
  process.exit(1);
});
