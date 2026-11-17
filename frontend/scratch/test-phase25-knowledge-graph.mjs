// Comprehensive Unit & Integration Test Suite for Phase 25: Advanced Knowledge Graph Engine
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { KnowledgeGraphEngine, KnowledgeGraphStore, EntityExtractor, ContradictionDetector, GraphQAEngine } = jiti("../app/lib/knowledge-graph/index.ts");
const { CentralizedToolRegistry } = jiti("../app/lib/agent-engine/tool-registry.ts");

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

async function runTests() {
  console.log("=== PHASE 25: ADVANCED KNOWLEDGE GRAPH ENGINE TEST SUITE ===");

  // Reset store
  KnowledgeGraphStore.resetAll();

  // Test Group 1: Entity & Relationship Extraction
  console.log("\n1. Testing Entity & Relation Extraction...");
  const sampleDoc = `
    Next.js is an open-source framework that extends React for full-stack web applications.
    Next.js depends on TypeScript for strict type checking and uses Tailwind for modern styling.
    PostgreSQL is an enterprise relational database that implements the SQL standard.
    Supabase leverages PostgreSQL and provides Row-Level Security for multi-tenant applications.
    FastAPI relies on Pydantic for schema validation and is an alternative to Django.
  `;

  const extracted = EntityExtractor.extractFromText(sampleDoc);
  assert(extracted.entities.length >= 6, `Extracted ${extracted.entities.length} entities (expected >= 6)`);
  
  const nextNode = extracted.entities.find(e => e.name === "Next.js");
  assert(!!nextNode && nextNode.type === "framework", "Extracted Next.js with type 'framework'");
  assert(nextNode.properties?.openSource === true, "Extracted openSource property for Next.js");

  const pgNode = extracted.entities.find(e => e.name === "PostgreSQL");
  assert(!!pgNode && pgNode.type === "database", "Extracted PostgreSQL with type 'database'");

  const extendsRel = extracted.relations.find(r => r.sourceName === "Next.js" && r.targetName === "React" && r.relation === "extends");
  assert(!!extendsRel, "Extracted relation: Next.js --[extends]--> React");

  const dependsRel = extracted.relations.find(r => r.sourceName === "Next.js" && r.targetName === "TypeScript" && r.relation === "depends_on");
  assert(!!dependsRel, "Extracted relation: Next.js --[depends_on]--> TypeScript");

  const alternativeRel = extracted.relations.find(r => r.sourceName === "FastAPI" && r.targetName === "Django" && r.relation === "alternative_to");
  assert(!!alternativeRel, "Extracted relation: FastAPI --[alternative_to]--> Django");

  // Test Group 2: Tenant Isolation
  console.log("\n2. Testing Multi-Tenant Knowledge Graph Isolation...");
  const tenantA = "tenant_alice_123";
  const tenantB = "tenant_bob_456";

  await KnowledgeGraphEngine.ingestContent(tenantA, "default", "Kubernetes uses Docker containers for orchestration.", "doc_alice_01");
  await KnowledgeGraphEngine.ingestContent(tenantB, "default", "FastAPI uses Redis for caching tokens.", "doc_bob_01");

  const storeA = KnowledgeGraphStore.getInstance(tenantA, "default");
  const storeB = KnowledgeGraphStore.getInstance(tenantB, "default");

  const k8sInA = storeA.getNode("Kubernetes");
  const k8sInB = storeB.getNode("Kubernetes");
  assert(!!k8sInA, "Tenant A owns 'Kubernetes' node");
  assert(!k8sInB, "Tenant B CANNOT access Tenant A's 'Kubernetes' node (Isolation Enforced)");

  const redisInB = storeB.getNode("Redis");
  const redisInA = storeA.getNode("Redis");
  assert(!!redisInB, "Tenant B owns 'Redis' node");
  assert(!redisInA, "Tenant A CANNOT access Tenant B's 'Redis' node (Isolation Enforced)");

  // Test Group 3: Graph Traversal & Shortest Path
  console.log("\n3. Testing Graph Traversal & Shortest Path...");
  const devDoc = `
    FrontendApp depends on Next.js.
    Next.js extends React.
    React uses JavaScript.
    Next.js uses Vercel for deployment.
  `;
  await KnowledgeGraphEngine.ingestContent("dev_user", "default", devDoc, "doc_dev_01");
  const devStore = KnowledgeGraphStore.getInstance("dev_user", "default");

  // Path from FrontendApp to JavaScript: FrontendApp -> Next.js -> React -> JavaScript (3 hops)
  const path = devStore.findShortestPath("FrontendApp", "JavaScript", 4);
  assert(!!path, "Found traversal path between FrontendApp and JavaScript");
  assert(path.hopCount === 3, `Path hop count is 3 (actual: ${path.hopCount})`);
  assert(path.nodes[0].name === "FrontendApp", "Path starts at FrontendApp");
  assert(path.nodes[3].name === "JavaScript", "Path terminates at JavaScript");
  assert(path.explanation.includes("FrontendApp"), "Traversal explanation contains path steps");

  // Subgraph extraction
  const subgraph = devStore.extractSubgraph("Next.js", 2);
  assert(subgraph.nodes.length >= 4, `Subgraph around Next.js contains >= 4 nodes (actual: ${subgraph.nodes.length})`);
  assert(subgraph.edges.length >= 3, `Subgraph around Next.js contains >= 3 edges (actual: ${subgraph.edges.length})`);

  // Test Group 4: Contradiction & Outdated Information Detection
  console.log("\n4. Testing Contradiction & Outdated Claims Detection...");
  const conflictDoc = `
    LibraryAlpha is an alternative to FrameworkBeta in production.
    LibraryAlpha is a component part of FrameworkBeta subsystem.
    ProtocolX is recommended and default choice for secure microservices.
    ProtocolX is deprecated and superseded by ProtocolY.
  `;
  await KnowledgeGraphEngine.ingestContent("qa_tenant", "default", conflictDoc, "doc_conflict_01");
  const contradictions = KnowledgeGraphEngine.getContradictions("qa_tenant", "default");

  assert(contradictions.length >= 2, `Detected ${contradictions.length} contradictions (expected >= 2)`);
  const deprecationConflict = contradictions.find(c => c.severity === "high" && c.claimA.includes("recommended"));
  assert(!!deprecationConflict, "Identified high-severity deprecation vs recommended conflict");
  assert(deprecationConflict.resolutionSuggestion.includes("Outdated information detected"), "Generated actionable resolution suggestion for outdated claim");

  // Test Group 5: Graph QA Engine
  console.log("\n5. Testing Semantic Graph Question Answering...");
  const qaResult = await KnowledgeGraphEngine.queryGraphQA(
    "dev_user",
    "default",
    "How does FrontendApp relate to React and what framework does it use?"
  );

  assert(qaResult.confidence > 0.8, `Graph QA confidence is high (${qaResult.confidence})`);
  assert(qaResult.targetEntities.some(e => e.name === "FrontendApp"), "Identified target entity 'FrontendApp'");
  assert(qaResult.targetEntities.some(e => e.name === "React"), "Identified target entity 'React'");
  assert(qaResult.answer.includes("Structural Connection") || qaResult.answer.includes("Discovered Relationships"), "Synthesized structured relationship explanation");
  assert(qaResult.citations.length > 0, `Generated ${qaResult.citations.length} exact evidence citations`);

  // Test Group 6: Centralized Tool Registry Integration
  console.log("\n6. Testing Tool Registry Integration...");
  const registry = CentralizedToolRegistry.getInstance();
  const queryTool = registry.getTool("query_knowledge_graph");
  const traverseTool = registry.getTool("traverse_knowledge_graph");

  assert(!!queryTool, "Tool 'query_knowledge_graph' is registered in CentralizedToolRegistry");
  assert(!!traverseTool, "Tool 'traverse_knowledge_graph' is registered in CentralizedToolRegistry");

  const queryExec = await registry.executeTool(
    "query_knowledge_graph",
    { question: "What does Next.js extend?" },
    { userId: "dev_user", userEmail: "dev@tattva.ai", permissions: ["safe"], isAuthenticated: true }
  );
  assert(queryExec.success === true, "Tool 'query_knowledge_graph' executed successfully");
  assert(queryExec.output.answer.includes("React"), "Tool QA output answers that Next.js extends React");

  const traverseExec = await registry.executeTool(
    "traverse_knowledge_graph",
    { source: "Next.js", target: "React" },
    { userId: "dev_user", userEmail: "dev@tattva.ai", permissions: ["safe"], isAuthenticated: true }
  );
  assert(traverseExec.success === true, "Tool 'traverse_knowledge_graph' executed successfully");
  assert(traverseExec.output.found === true, "Tool traversal found path Next.js -> React");
  assert(traverseExec.output.hopCount === 1, "Direct 1-hop relationship found");

  // Final Summary
  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${total}`);
  console.log(`PASSED:      ${passed}`);
  console.log(`FAILED:      ${total - passed}`);
  console.log(`SUCCESS RATE: ${((passed / total) * 100).toFixed(1)}%`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
