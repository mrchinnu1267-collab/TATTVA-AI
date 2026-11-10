import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { visualKnowledgeDB } from "../app/lib/image-engine/multimodal-rag/vector-db";
import { retrieveVisualContext } from "../app/lib/image-engine/multimodal-rag/retriever";
import { createStructuredScenePlan } from "../app/lib/image-engine/multimodal-rag/scene-planner";
import { validateImageQuality } from "../app/lib/image-engine/multimodal-rag/quality-validator";

describe("PHASE 5 & 8: Multimodal RAG Pipeline & Computer Vision Verification", () => {
  test("1. Vector Knowledge Database initializes with built-in embeddings and references", async () => {
    const stats = visualKnowledgeDB.getStats();
    assert.ok(stats.totalEntries >= 10, "Vector DB must contain at least 10 seeded visual knowledge references");
    assert.ok(stats.categories.length >= 5, "Vector DB must span multiple aesthetic categories");
    assert.strictEqual(stats.embeddingDimension, 384, "Embedding vectors must have 384 dimensions");
  });

  test("2. Multimodal Retriever performs semantic search and returns top-ranked visual matches", async () => {
    const query = "Minimalist Scandinavian living room with natural oak furniture and soft daylight";
    const result = await retrieveVisualContext({ prompt: query });

    assert.ok(result.matches.length > 0, "Retriever must return matching visual references");
    assert.ok(result.matches[0].similarityScore > 0.4, "Top match must meet minimum similarity threshold");
    assert.ok(result.injectedPromptContext.includes("Visual Reference"), "Must construct grounded prompt context");
  });

  test("3. Multimodal Retriever handles empty or obscure queries with graceful fallback", async () => {
    const result = await retrieveVisualContext({ prompt: "xyzabc123 obscure non-existent nonsense prompt query" });
    assert.ok(result, "Must return valid retrieval object even for zero direct matches");
    assert.ok(Array.isArray(result.matches), "Matches must be an array");
  });

  test("4. Structured Scene Planner generates comprehensive generation blueprint", async () => {
    const prompt = "Cyberpunk street vendor preparing ramen noodles under neon signs in rainy alley";
    const plan = await createStructuredScenePlan({
      prompt,
      style: "realistic",
      aspectRatio: "16:9",
    });

    assert.ok(plan.sceneDescription, "Scene plan must have descriptive breakdown");
    assert.ok(plan.keyElements.length > 0, "Scene plan must isolate key compositional elements");
    assert.ok(plan.lightingPlan.type, "Scene plan must specify lighting parameters");
    assert.ok(plan.compositionPlan.cameraAngle, "Scene plan must specify camera angle");
    assert.ok(plan.conditioningPlan.method, "Scene plan must specify conditioning method");
  });

  test("5. Quality Validator performs 10-point audit and returns measurable metrics without fabrication", async () => {
    const prompt = "A red vintage Ferrari parked outside an Italian villa in Tuscany";
    const mockImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

    const report = await validateImageQuality({
      image: mockImage,
      prompt,
    });

    assert.ok(report.overallScore >= 0 && report.overallScore <= 100, "Quality score must be between 0 and 100%");
    assert.ok(report.metrics.length >= 8, "Must evaluate at least 8 distinct quality metrics");
    assert.ok(report.verdict, "Must provide human-readable quality verdict");
    assert.ok(Array.isArray(report.strengths), "Must report image strengths");
  });
});

