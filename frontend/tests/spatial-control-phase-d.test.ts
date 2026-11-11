/**
 * TATTVA AI - Phase D Automated Test Suite: Advanced Spatial Control & Editing
 * Tests object positioning, depth conditioning, inpainting, outpainting,
 * ControlNet compatibility, geometric IoU checks, and fallback mechanisms.
 */

import assert from "node:assert";
import {
  parseSpatialDirectives,
  compileBoundingBoxesFromDirectives,
  buildSceneSpatialLayout,
  enrichPromptWithSpatialLayout,
  detectSceneComposition,
} from "../app/lib/image-engine/spatial-control/layout-parser";
import {
  checkControlNetSupport,
  generateSyntheticDepthMap,
  generateSyntheticCannyMap,
} from "../app/lib/image-engine/spatial-control/controlnet";
import {
  validateInpaintRequest,
  estimateMaskCoverage,
} from "../app/lib/image-engine/spatial-control/inpainting";
import {
  validateOutpaintRequest,
  computeExtendedDimensions,
} from "../app/lib/image-engine/spatial-control/outpainting";
import {
  calculateIoU,
  evaluateSpatialLayout,
  verifyRelativeOrdering,
} from "../app/lib/image-engine/spatial-control/spatial-evaluator";

console.log("▶ Running Phase D: Spatial Control, Object Positioning & Editing Tests...");

// -----------------------------------------------------------------------------
// Test 1: Spatial Directive Parsing
// -----------------------------------------------------------------------------
{
  const directives = parseSpatialDirectives(
    "A golden retriever on the left in the foreground, a cat sitting in the center, and a towering mountain in the background"
  );
  assert.ok(directives.length >= 3, "Expected at least 3 spatial directives");

  const dog = directives.find((d) => d.label.includes("golden retriever"));
  assert.ok(dog, "Dog directive must exist");
  assert.strictEqual(dog.horizontal, "left", "Dog should be on the left");
  assert.strictEqual(dog.layer, "foreground", "Dog should be in the foreground");

  const mountain = directives.find((d) => d.label.includes("mountain"));
  assert.ok(mountain, "Mountain directive must exist");
  assert.strictEqual(mountain.layer, "background", "Mountain should be in the background");
  assert.strictEqual(mountain.relativeSize, "large", "Towering mountain should be detected as large");
  console.log("  ✔ Test 1: Natural language spatial directive parsing passed.");
}

// -----------------------------------------------------------------------------
// Test 2: Bounding Box Coordinate Compilation & Clamping
// -----------------------------------------------------------------------------
{
  const directives = parseSpatialDirectives("A red sports car on the far left, and a police cruiser on the far right");
  const boxes = compileBoundingBoxesFromDirectives(directives);

  assert.strictEqual(boxes.length, 2, "Expected 2 bounding boxes");
  assert.ok(boxes[0].x < 0.2, "Left object should have small X coordinate");
  assert.ok(boxes[1].x > 0.5, "Right object should have large X coordinate");
  assert.ok(boxes[0].width > 0 && boxes[0].width <= 1.0, "Width must be normalized within [0, 1]");
  assert.ok(boxes[0].height > 0 && boxes[0].height <= 1.0, "Height must be normalized within [0, 1]");
  console.log("  ✔ Test 2: Bounding box coordinate compilation & boundary clamping passed.");
}

// -----------------------------------------------------------------------------
// Test 3: Relative Ordering Verification
// -----------------------------------------------------------------------------
{
  const leftBox = { id: "1", label: "A", x: 0.1, y: 0.3, width: 0.3, height: 0.4, layer: "midground" as const };
  const rightBox = { id: "2", label: "B", x: 0.6, y: 0.3, width: 0.3, height: 0.4, layer: "midground" as const };

  const ordering = verifyRelativeOrdering(leftBox, rightBox);
  assert.strictEqual(ordering.orderedCorrectly, true, "Left object must be to the left of Right object");
  assert.ok(ordering.margin > 0.3, "Margin between objects must be positive");

  const invertedOrdering = verifyRelativeOrdering(rightBox, leftBox);
  assert.strictEqual(invertedOrdering.orderedCorrectly, false, "Inverted order must fail verification");
  console.log("  ✔ Test 3: Relative object spatial ordering verification passed.");
}

// -----------------------------------------------------------------------------
// Test 4: Geometric Intersection-over-Union (IoU) Calculation
// -----------------------------------------------------------------------------
{
  const box1 = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };
  const box2 = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };
  assert.strictEqual(calculateIoU(box1, box2), 1.0, "Identical boxes must have IoU = 1.0");

  const disjoint = { x: 0.7, y: 0.7, width: 0.2, height: 0.2 };
  assert.strictEqual(calculateIoU(box1, disjoint), 0.0, "Disjoint boxes must have IoU = 0.0");

  const overlapping = { x: 0.4, y: 0.2, width: 0.4, height: 0.4 };
  const iou = calculateIoU(box1, overlapping);
  assert.ok(iou > 0.3 && iou < 0.4, "Expected partial IoU ~0.33");
  console.log("  ✔ Test 4: Geometric IoU calculation passed.");
}

// -----------------------------------------------------------------------------
// Test 5: Spatial Layout Evaluation & Geometric Alignment
// -----------------------------------------------------------------------------
{
  const layout = buildSceneSpatialLayout("A samurai warrior in the foreground center, and a pagado in the background left");
  const detected = [
    { label: "samurai warrior", box: { x: 0.35, y: 0.4, width: 0.35, height: 0.45 }, depthLayer: "foreground" as const },
    { label: "pagado", box: { x: 0.08, y: 0.15, width: 0.25, height: 0.35 }, depthLayer: "background" as const },
  ];

  const report = evaluateSpatialLayout(layout, detected);
  assert.ok(report.overallScore >= 80, `Expected high overall score, got ${report.overallScore}`);
  assert.ok(report.positioningScore >= 80, "Expected high positioning score");
  assert.strictEqual(report.detectedBoxes.every((b) => b.aligned), true, "All boxes should be aligned");
  console.log("  ✔ Test 5: Spatial layout evaluation with geometric alignment passed.");
}

// -----------------------------------------------------------------------------
// Test 6: Synthetic Depth Map & Canny Edge Generation
// -----------------------------------------------------------------------------
{
  const layout = buildSceneSpatialLayout("A lion on the left and a gazelle on the right");
  const depthUri = generateSyntheticDepthMap(layout);
  assert.ok(depthUri.startsWith("data:image/svg+xml"), "Depth map must be a valid SVG data URI");
  assert.ok(depthUri.includes("%23f0f0f0") || depthUri.includes("fill"), "Depth map must contain layer shading");

  const cannyUri = generateSyntheticCannyMap(layout);
  assert.ok(cannyUri.startsWith("data:image/svg+xml"), "Canny map must be a valid SVG data URI");
  assert.ok(cannyUri.includes("%23ffffff") || cannyUri.includes("stroke"), "Canny map must contain white wireframe edges");
  console.log("  ✔ Test 6: Synthetic depth & Canny conditioning map generation passed.");
}

// -----------------------------------------------------------------------------
// Test 7: Hardware & ControlNet Compatibility Checks
// -----------------------------------------------------------------------------
{
  // Check local RTX 3050 (4 GB VRAM) safety boundary
  const localCheck = checkControlNetSupport("local", "canny");
  assert.strictEqual(localCheck.supported, false, "Local RTX 3050 4GB should be blocked for ControlNet to prevent OOM");
  assert.strictEqual(localCheck.recommendedFallback, "cloud_space", "Must recommend cloud space fallback");

  // Check Hugging Face Spaces support
  const hfCheck = checkControlNetSupport("huggingface", "canny");
  assert.strictEqual(hfCheck.supported, true, "Hugging Face Spaces must support ControlNet");

  // Check OpenAI lack of ControlNet support
  const openAiCheck = checkControlNetSupport("openai", "depth");
  assert.strictEqual(openAiCheck.supported, false, "OpenAI DALL-E 3 cannot accept ControlNet conditioning");
  assert.strictEqual(openAiCheck.recommendedFallback, "prompt_guidance", "Must recommend prompt spatial guidance");
  console.log("  ✔ Test 7: Hardware memory checks & provider ControlNet compatibility passed.");
}

// -----------------------------------------------------------------------------
// Test 8: Inpainting Request Validation
// -----------------------------------------------------------------------------
{
  assert.throws(
    () => validateInpaintRequest({ image: "", mask: "data:image/png;base64,abc", prompt: "cat" }),
    /requires a valid base image/i,
    "Empty base image must throw"
  );
  assert.throws(
    () => validateInpaintRequest({ image: "data:image/png;base64,abc", mask: "", prompt: "cat" }),
    /requires a valid mask/i,
    "Empty mask must throw"
  );
  assert.throws(
    () => validateInpaintRequest({ image: "data:image/png;base64,abc", mask: "data:image/png;base64,mask", prompt: "" }),
    /requires a prompt/i,
    "Empty prompt must throw"
  );

  const coverage = estimateMaskCoverage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
  assert.ok(coverage > 0 && coverage <= 1.0, "Coverage ratio must be normalized");
  console.log("  ✔ Test 8: Mask-based inpainting validation passed.");
}

// -----------------------------------------------------------------------------
// Test 9: Outpainting Request Validation & Dimension Calculations
// -----------------------------------------------------------------------------
{
  assert.throws(
    () => validateOutpaintRequest({ image: "data:image/png;base64,abc", expand: { top: 0, bottom: 0, left: 0, right: 0 }, prompt: "extend" }),
    /expanding at least one boundary/i,
    "Zero expansion must throw"
  );

  const extended = computeExtendedDimensions(1024, 1024, { top: 128, bottom: 256, left: 512, right: 0 });
  assert.strictEqual(extended.width, 1536, "Extended width must include left expansion (1024 + 512 = 1536)");
  assert.strictEqual(extended.height, 1408, "Extended height must include top and bottom expansion (1024 + 128 + 256 = 1408)");
  assert.strictEqual(extended.offsetX, 512, "Offset X must match left expansion margin");
  assert.strictEqual(extended.offsetY, 128, "Offset Y must match top expansion margin");
  console.log("  ✔ Test 9: Outpainting dimension expansion & offset calculation passed.");
}

// -----------------------------------------------------------------------------
// Test 10: Spatial Prompt Layout Injection
// -----------------------------------------------------------------------------
{
  const layout = buildSceneSpatialLayout("A medieval castle on the mountain top", {
    customBoxes: [
      { id: "1", label: "Castle", x: 0.5, y: 0.1, width: 0.4, height: 0.4, layer: "background" },
      { id: "2", label: "Knight", x: 0.2, y: 0.6, width: 0.3, height: 0.4, layer: "foreground" },
    ],
  });

  const enriched = enrichPromptWithSpatialLayout("A cinematic medieval scene", layout);
  assert.ok(enriched.includes("Explicit Spatial Composition"), "Enriched prompt must include spatial guidance");
  assert.ok(enriched.includes("Castle"), "Prompt must preserve Castle directive");
  assert.ok(enriched.includes("Knight"), "Prompt must preserve Knight directive");
  console.log("  ✔ Test 10: Spatial prompt layout injection & directive preservation passed.");
}

console.log("\n🎉 All 10 Phase D Spatial Control & Inpainting Tests Passed Successfully!\n");

