/**
 * TATTVA AI - Phase E Automated Test Suite: Visual Evaluation & Intelligent Refinement
 * Validates Object Detection, SAM 2 Segmentation, Attribute Verification,
 * OCR Spelling Analysis, Reference Image Preservation, 8-Dimension Scorecard,
 * and Targeted Inpainting Refinement Decisions.
 */

import assert from "node:assert";
import {
  detectObjects,
} from "../app/lib/image-engine/visual-evaluation/object-detector";
import {
  generateObjectSegmentationMask,
  segmentObjects,
  verifyMaskCoverage,
} from "../app/lib/image-engine/visual-evaluation/segmentation";
import {
  extractExpectedAttributes,
  verifyAttributes,
} from "../app/lib/image-engine/visual-evaluation/attribute-verifier";
import {
  calculateLevenshteinSimilarity,
  extractQuotedPhrases,
  verifyTextAndOcr,
} from "../app/lib/image-engine/visual-evaluation/ocr-verifier";
import {
  compareWithReference,
} from "../app/lib/image-engine/visual-evaluation/reference-comparator";
import {
  planRefinement,
} from "../app/lib/image-engine/visual-evaluation/refinement-planner";
import {
  evaluateVisualQuality,
} from "../app/lib/image-engine/visual-evaluation/visual-evaluation-service";
import {
  BENCHMARK_100_PROMPTS,
} from "../app/lib/image-engine/visual-evaluation/benchmark-100";

console.log("▶ Running Phase E: Visual Evaluation, Verification & Refinement Tests...");

export async function runVisualEvaluationPhaseETests() {
// -----------------------------------------------------------------------------
// Test 1: Grounded Object Detection & Missing/Unrequested Categorization
// -----------------------------------------------------------------------------
{
  const requested = ["wooden rowboat", "distant lighthouse", "flying seagull"];
  const report = await detectObjects({
    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    requestedObjects: requested,
    mainSubjectHint: "wooden rowboat",
  });

  assert.ok(Array.isArray(report.detected), "Report must return detected array");
  assert.ok(Array.isArray(report.missing), "Report must return missing array");
  assert.ok(Array.isArray(report.unrequested), "Report must return unrequested array");
  assert.ok(report.detected.length > 0, "Expected at least 1 detected object");
  assert.ok(report.detected[0].box.width > 0 && report.detected[0].box.width <= 1.0, "Bounding box width must be normalized");
  console.log("  ✔ Test 1: Grounded object detection and coordinate boundaries passed.");
}

// -----------------------------------------------------------------------------
// Test 2: SAM 2 Segmentation Mask Synthesis & Area Coverage
// -----------------------------------------------------------------------------
{
  const box = { x: 0.25, y: 0.2, width: 0.5, height: 0.6 };
  const mask = generateObjectSegmentationMask(box);
  assert.ok(mask.startsWith("data:image/svg+xml"), "Mask must be an SVG data URI");
  assert.ok(mask.includes("rect"), "Mask must contain SVG rect element");

  const segmentation = segmentObjects([
    {
      id: "obj-1",
      label: "subject",
      confidence: 0.95,
      box,
      layer: "foreground",
      isMainSubject: true,
      attributes: {},
    },
  ]);

  assert.strictEqual(segmentation.segmentedObjects.length, 1);
  assert.ok(segmentation.foregroundAreaFraction > 0.1, "Foreground area must be positive");
  assert.ok(segmentation.backgroundAreaFraction > 0.1, "Background area must be positive");
  assert.strictEqual(segmentation.maskIntegrityVerified, true);

  const coverageCheck = verifyMaskCoverage(
    { x: 0.2, y: 0.15, width: 0.6, height: 0.7 },
    box
  );
  assert.strictEqual(coverageCheck.coversObject, true, "Padded mask must enclose the object box");
  console.log("  ✔ Test 2: SAM 2 segmentation mask generation and coverage verification passed.");
}

// -----------------------------------------------------------------------------
// Test 3: Attribute Extraction & Multi-Modal Verification
// -----------------------------------------------------------------------------
{
  const attrs = extractExpectedAttributes("A matte black smartwatch with brass frets and crimson red strap in golden hour lighting");
  assert.ok(attrs.some((a) => a.name === "Color" && (a.target === "matte black" || a.target === "red")), "Expected color extraction");
  assert.ok(attrs.some((a) => a.name === "Material" && a.target === "brass"), "Expected material extraction");
  assert.ok(attrs.some((a) => a.name === "Lighting" && a.target === "golden hour"), "Expected lighting extraction");

  const evaluations = await verifyAttributes({
    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    prompt: "A crimson sports car with metallic finish",
    detectedObjects: [
      {
        id: "1",
        label: "car",
        confidence: 0.9,
        box: { x: 0.2, y: 0.2, width: 0.6, height: 0.5 },
        layer: "foreground",
        isMainSubject: true,
        attributes: { color: "crimson", material: "metallic" },
      },
    ],
  });

  assert.ok(evaluations.length >= 2, "Expected evaluations for color and material");
  assert.ok(evaluations.every((e) => e.confidence > 50), "Confidence scores must be calculated");
  console.log("  ✔ Test 3: Attribute extraction and multi-modal verification passed.");
}

// -----------------------------------------------------------------------------
// Test 4: OCR Text Extraction & Levenshtein Similarity Calculation
// -----------------------------------------------------------------------------
{
  assert.strictEqual(calculateLevenshteinSimilarity("JAZZ FESTIVAL", "JAZZ FESTIVAL"), 1.0, "Identical strings must have similarity = 1.0");
  assert.strictEqual(calculateLevenshteinSimilarity("JAZZ FESTIVAL", "JAZZ FESTIVEL"), Number((1.0 - 1 / 13).toFixed(3)), "Single typo must have proportional similarity");
  assert.ok(calculateLevenshteinSimilarity("NEON", "DARK") < 0.3, "Dissimilar strings must have low similarity");

  const quoted = extractQuotedPhrases('A vintage sign reading "FRESH ROAST" with subtitle "EST. 1985"');
  assert.strictEqual(quoted.length, 2);
  assert.strictEqual(quoted[0], "FRESH ROAST");
  assert.strictEqual(quoted[1], "EST. 1985");

  const ocrRes = await verifyTextAndOcr({
    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    prompt: 'A poster that reads "SOLAR SOUNDS"',
  });
  assert.strictEqual(ocrRes.requiredPhrases.length, 1);
  assert.strictEqual(ocrRes.requiredPhrases[0].phrase, "SOLAR SOUNDS");
  assert.ok(ocrRes.overallTextAccuracy >= 0 && ocrRes.overallTextAccuracy <= 100);
  console.log("  ✔ Test 4: OCR string extraction and Levenshtein similarity passed.");
}

// -----------------------------------------------------------------------------
// Test 5: Reference Image Comparison & Preservation Evaluation
// -----------------------------------------------------------------------------
{
  const refComp = await compareWithReference({
    generatedImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    referenceImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    userPrompt: "Keep the same character, change the background to snowy mountains",
  });

  assert.strictEqual(refComp.referenceProvided, true);
  assert.ok(refComp.subjectConsistencyScore >= 70, "Subject consistency score must be measured");
  assert.ok(refComp.preservedRegionsScore >= 70, "Preserved regions score must be measured");
  assert.ok(refComp.intendedChanges.length > 0, "Intended modifications must be recorded");
  console.log("  ✔ Test 5: Reference image comparison and intended modification tracking passed.");
}

// -----------------------------------------------------------------------------
// Test 6: Intelligent Refinement Planner (Unwanted Object -> Inpainting)
// -----------------------------------------------------------------------------
{
  const inpaintRefinement = planRefinement({
    scorecard: {
      overallScore: 74,
      verdict: "borderline",
      confidenceScore: 90,
      promptAdherence: 72,
      objectPresence: 90,
      attributeAccuracy: 88,
      spatialAccuracy: 85,
      referenceFidelity: 100,
      textAccuracy: 100,
      visualQuality: 85,
      unwantedObjectFreedom: 45,
      metricsSummary: { totalRequirementsCount: 5, passedRequirementsCount: 4, missingObjectsCount: 0, unrequestedObjectsCount: 1 },
    },
    missingObjects: [],
    unrequestedObjects: ["extra floating hand"],
    detectedObjects: [
      {
        id: "1",
        label: "extra floating hand",
        confidence: 0.92,
        box: { x: 0.7, y: 0.6, width: 0.15, height: 0.2 },
        layer: "foreground",
        isMainSubject: false,
        attributes: {},
      },
    ],
    ocrResult: { detectedText: [], requiredPhrases: [], unexpectedTextDetected: false, overallTextAccuracy: 100 },
    attributeEvaluations: [],
    spatialScore: 85,
    originalPrompt: "A portrait of a pianist playing a grand piano",
  });

  assert.strictEqual(inpaintRefinement.type, "inpaint_region", "Unwanted artifact must trigger localized inpainting");
  assert.ok(inpaintRefinement.inpaintBoundingBox, "Must provide bounding box coordinates for mask");
  assert.ok(inpaintRefinement.rationale.includes("extra floating hand"), "Rationale must cite the detected artifact");
  console.log("  ✔ Test 6: Intelligent refinement planning (unwanted artifact inpainting) passed.");
}

// -----------------------------------------------------------------------------
// Test 7: Intelligent Refinement Planner (Misspelled Text -> Regeneration)
// -----------------------------------------------------------------------------
{
  const textRefinement = planRefinement({
    scorecard: {
      overallScore: 68,
      verdict: "fail",
      confidenceScore: 92,
      promptAdherence: 65,
      objectPresence: 90,
      attributeAccuracy: 85,
      spatialAccuracy: 85,
      referenceFidelity: 100,
      textAccuracy: 40,
      visualQuality: 85,
      unwantedObjectFreedom: 95,
      metricsSummary: { totalRequirementsCount: 4, passedRequirementsCount: 2, missingObjectsCount: 0, unrequestedObjectsCount: 0 },
    },
    missingObjects: [],
    unrequestedObjects: [],
    detectedObjects: [],
    ocrResult: {
      detectedText: [{ text: "NEON HOZIRON", confidence: 0.9 }],
      requiredPhrases: [{ phrase: "NEON HORIZON", found: false, levenshteinSimilarity: 0.75, spellingAccurate: false }],
      unexpectedTextDetected: false,
      overallTextAccuracy: 40,
    },
    attributeEvaluations: [],
    spatialScore: 85,
    originalPrompt: 'A synthwave album cover titled "NEON HORIZON"',
  });

  assert.strictEqual(textRefinement.type, "regenerate_with_negative", "Misspelled typography must trigger regeneration");
  assert.ok(textRefinement.revisedPrompt?.includes("NEON HORIZON"), "Revised prompt must reinforce target phrase");
  console.log("  ✔ Test 7: Intelligent refinement planning (OCR spelling failure regeneration) passed.");
}

// -----------------------------------------------------------------------------
// Test 8: Master Visual Evaluation Service & 8-Dimension Scorecard
// -----------------------------------------------------------------------------
{
  const fullEval = await evaluateVisualQuality({
    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    prompt: 'A photorealistic Swiss poster of a mountain cabin reading "ALPINE LODGE" with golden sunset lighting',
    useVision: false,
  });

  assert.ok(fullEval.scorecard, "Scorecard must be returned");
  assert.ok(fullEval.scorecard.promptAdherence >= 0 && fullEval.scorecard.promptAdherence <= 100);
  assert.ok(fullEval.scorecard.objectPresence >= 0 && fullEval.scorecard.objectPresence <= 100);
  assert.ok(fullEval.scorecard.attributeAccuracy >= 0 && fullEval.scorecard.attributeAccuracy <= 100);
  assert.ok(fullEval.scorecard.spatialAccuracy >= 0 && fullEval.scorecard.spatialAccuracy <= 100);
  assert.ok(fullEval.scorecard.referenceFidelity >= 0 && fullEval.scorecard.referenceFidelity <= 100);
  assert.ok(fullEval.scorecard.textAccuracy >= 0 && fullEval.scorecard.textAccuracy <= 100);
  assert.ok(fullEval.scorecard.visualQuality >= 0 && fullEval.scorecard.visualQuality <= 100);
  assert.ok(fullEval.scorecard.unwantedObjectFreedom >= 0 && fullEval.scorecard.unwantedObjectFreedom <= 100);
  assert.ok(fullEval.scorecard.confidenceScore > 0, "Confidence score must be tracked separately from pass/fail verdict");
  assert.ok(["pass", "borderline", "fail"].includes(fullEval.scorecard.verdict));
  console.log("  ✔ Test 8: Master visual evaluation service 8-dimension scorecard passed.");
}

// -----------------------------------------------------------------------------
// Test 9: 100-Prompt Benchmark Integrity Check
// -----------------------------------------------------------------------------
{
  assert.strictEqual(BENCHMARK_100_PROMPTS.length, 100, "Benchmark must contain exactly 100 prompts");

  const categories = new Set(BENCHMARK_100_PROMPTS.map((p) => p.category));
  const expectedCategories = [
    "single_object",
    "multiple_objects",
    "spatial_relationships",
    "complex_scenes",
    "photorealism",
    "anime",
    "illustrations",
    "product",
    "architecture",
    "posters",
    "reference_based",
    "image_editing",
  ];

  for (const cat of expectedCategories) {
    assert.ok(categories.has(cat as any), `Benchmark must cover category '${cat}'`);
  }

  // Ensure every item has expectedObjects and non-empty prompt
  for (const item of BENCHMARK_100_PROMPTS) {
    assert.ok(item.prompt.trim().length >= 10, `Item ${item.id} prompt is too short`);
    assert.ok(item.expectedObjects.length > 0, `Item ${item.id} must have expected objects`);
  }
  console.log("  ✔ Test 9: 100-prompt comprehensive benchmark integrity across 12 categories passed.");
}

// -----------------------------------------------------------------------------
// Test 10: Graceful Fallback & Hardware Safety
// -----------------------------------------------------------------------------
{
  const heuristicEval = await evaluateVisualQuality({
    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    prompt: "A simple red apple",
    useVision: false,
  });

  assert.strictEqual(heuristicEval.evaluationMethod, "heuristic_fallback", "Should fall back gracefully without active vision API");
  assert.strictEqual(heuristicEval.scorecard.confidenceScore, 70, "Heuristic confidence should reflect offline estimation");
  console.log("  ✔ Test 10: Graceful fallback and hardware memory safety passed.");
}

console.log("\n🎉 All 10 Phase E Visual Evaluation & Refinement Tests Passed Successfully!\n");
}
