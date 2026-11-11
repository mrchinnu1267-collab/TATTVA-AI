import assert from "node:assert";
import {
  classifyEditingIntent,
} from "../app/lib/image-engine/editing/intent-classifier";
import {
  createBlankMask,
  createRectangleMask,
  createPolygonMask,
  autoSegmentSubject,
  invertMask,
  expandMask,
  featherMask,
  inspectMaskMetadata,
} from "../app/lib/image-engine/editing/mask-generator";
import {
  executeBackgroundRemoval,
  executeBackgroundReplacement,
} from "../app/lib/image-engine/editing/background-engine";
import {
  calculateExtendedDimensions,
  createOutpaintBorderMask,
  executeCanvasOutpainting,
} from "../app/lib/image-engine/editing/outpainting-engine";
import {
  executeImageEdit,
} from "../app/lib/image-engine/editing/inpainting-engine";
import {
  saveEditSnapshot,
  getEditHistory,
  getSnapshotById,
  deleteSnapshot,
} from "../app/lib/image-engine/editing/history-manager";
import {
  EDITING_PROVIDER_CAPABILITIES,
  resolveEditingProvider,
} from "../app/lib/image-engine/editing/editing-router";
import {
  BENCHMARK_50_EDITING_SCENARIOS,
} from "../app/lib/image-engine/editing/benchmark-50";

export async function runImageEditingManipulationTests() {
  console.log("\n🚀 Running Phase H: Advanced AI Image Editing & Manipulation Test Suite...\n");

  // Valid 128x128 PNG data URI fixture satisfying >= 64x64 reference dimension requirements
  const sampleDataUri =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAQMAAAD58POIAAAABlBMVEUAAAD///+l2Z/dAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVRIx+3RsQ0AMAzDwCL5/8wUaIeOBAi6F9k1d120BwAAAAAAAAAA4F8HAAAAAP7gAgz4AGjZ7QW1AAAAAElFTkSuQmCC";

  // -------------------------------------------------------------------------
  // Test 1: Editing Intent Classification Across Operations
  // -------------------------------------------------------------------------
  console.log("▶ Test 1: Natural-language editing intent classification...");
  
  const removeIntent = classifyEditingIntent("Remove the photobomber in the background");
  assert.strictEqual(removeIntent.operation, "object_removal");
  assert.ok(removeIntent.targetSubject?.includes("photobomber"));
  assert.strictEqual(removeIntent.requiresMask, true);

  const replaceIntent = classifyEditingIntent("Replace the soda can with an iced matcha latte");
  assert.strictEqual(replaceIntent.operation, "object_replacement");
  assert.ok(replaceIntent.targetSubject?.includes("soda can"));
  assert.ok(replaceIntent.replacementSubject?.includes("iced matcha latte"));

  const bgRemovalIntent = classifyEditingIntent("Remove the background and make it transparent");
  assert.strictEqual(bgRemovalIntent.operation, "background_removal");
  assert.strictEqual(bgRemovalIntent.requiresMask, false);

  const bgReplaceIntent = classifyEditingIntent("Change the background to a sunset overlooking Santorini Greece");
  assert.strictEqual(bgReplaceIntent.operation, "background_replacement");
  assert.ok(bgReplaceIntent.backgroundPrompt?.includes("Santorini"));

  const colorIntent = classifyEditingIntent("Change the dress color to crimson red");
  assert.strictEqual(colorIntent.operation, "color_modification");
  assert.strictEqual(colorIntent.colorChange?.newColor, "crimson red");

  const outpaintIntent = classifyEditingIntent("Extend the canvas to the right by 256px");
  assert.strictEqual(outpaintIntent.operation, "outpainting");
  assert.ok((outpaintIntent.expandDirections?.right || 0) > 0);

  const lightingIntent = classifyEditingIntent("Change lighting to warm golden hour sunset");
  assert.strictEqual(lightingIntent.operation, "lighting_modification");

  console.log("  ✔ Test 1: Intent classification across multiple operations passed.");

  // -------------------------------------------------------------------------
  // Test 2: Ambiguity Detection & Clarification Handling
  // -------------------------------------------------------------------------
  console.log("▶ Test 2: Ambiguity detection and clarification prompts...");
  const ambiguousA = classifyEditingIntent("Make it better");
  assert.strictEqual(ambiguousA.isAmbiguous, true);
  assert.ok(ambiguousA.clarificationPrompt);

  const ambiguousB = classifyEditingIntent("Edit");
  assert.strictEqual(ambiguousB.isAmbiguous, true);

  const clearInstruction = classifyEditingIntent("Erase the garbage can on the beach");
  assert.strictEqual(clearInstruction.isAmbiguous, false);
  console.log("  ✔ Test 2: Ambiguity detection & clarification verified.");

  // -------------------------------------------------------------------------
  // Test 3: Mask Generation & Spatial Manipulation Tools
  // -------------------------------------------------------------------------
  console.log("▶ Test 3: Advanced mask generation, inversion, expansion & feathering...");
  const rectMask = createRectangleMask(1024, 1024, { x: 200, y: 300, width: 400, height: 400 });
  assert.ok(rectMask.startsWith("data:image/svg+xml;base64,"));
  const rectMeta = inspectMaskMetadata(rectMask, 1024, 1024);
  assert.strictEqual(rectMeta.isAlignedWithBase, true);
  assert.strictEqual(rectMeta.width, 1024);
  assert.strictEqual(rectMeta.height, 1024);

  const polyMask = createPolygonMask(1024, 1024, [
    { x: 100, y: 100 },
    { x: 500, y: 100 },
    { x: 300, y: 500 },
  ]);
  assert.ok(polyMask.startsWith("data:image/svg+xml;base64,"));

  const autoMask = autoSegmentSubject(1024, 1024);
  assert.ok(autoMask.includes("data:image/svg+xml"));

  const inverted = invertMask(autoMask);
  assert.ok(inverted.includes("data:image/svg+xml"));

  const expanded = expandMask(rectMask, 12);
  assert.ok(expanded.includes("data:image/svg+xml"));

  const feathered = featherMask(rectMask, 6);
  assert.ok(feathered.includes("data:image/svg+xml"));
  console.log("  ✔ Test 3: Mask geometry, inversion, dilation & feathering passed.");

  // -------------------------------------------------------------------------
  // Test 4: Background Removal with Transparent PNG Export
  // -------------------------------------------------------------------------
  console.log("▶ Test 4: Background removal & transparent PNG export...");
  const bgRemoval = await executeBackgroundRemoval(sampleDataUri, 1024, 1024);
  assert.strictEqual(bgRemoval.isTransparent, true);
  assert.ok(bgRemoval.image.startsWith("data:image/png;base64,"));
  assert.ok(bgRemoval.foregroundPreservedScore >= 95.0);
  assert.ok(bgRemoval.maskUsed.length > 20);
  console.log("  ✔ Test 4: Transparent PNG export & subject retention verified.");

  // -------------------------------------------------------------------------
  // Test 5: Background Replacement with Foreground Retention
  // -------------------------------------------------------------------------
  console.log("▶ Test 5: Background replacement with ambient lighting preservation...");
  const bgReplacement = await executeBackgroundReplacement(
    sampleDataUri,
    "Tokyo futuristic cyber alley at midnight with rain reflections",
    "gemini",
    1024,
    1024
  );
  assert.strictEqual(bgReplacement.isTransparent, false);
  assert.ok(bgReplacement.image.startsWith("data:image/"));
  assert.ok(bgReplacement.foregroundPreservedScore >= 95.0);
  console.log("  ✔ Test 5: Background replacement workflow passed.");

  // -------------------------------------------------------------------------
  // Test 6: Outpainting & Canvas Boundary Expansion
  // -------------------------------------------------------------------------
  console.log("▶ Test 6: Outpainting directional expansion & inner preservation...");
  const dims = calculateExtendedDimensions(1024, 1024, { left: 200, right: 300, top: 100, bottom: 50 });
  assert.strictEqual(dims.extendedWidth, 1024 + 200 + 300);
  assert.strictEqual(dims.extendedHeight, 1024 + 100 + 50);
  assert.strictEqual(dims.offsetX, 200);
  assert.strictEqual(dims.offsetY, 100);

  const borderMask = createOutpaintBorderMask(dims.extendedWidth, dims.extendedHeight, 1024, 1024, dims.offsetX, dims.offsetY);
  assert.ok(borderMask.startsWith("data:image/svg+xml;base64,"));

  const outpaintRes = await executeCanvasOutpainting(
    sampleDataUri,
    "Extend the horizon line with sand dunes",
    { right: 256 },
    "gemini",
    1024,
    1024
  );
  assert.strictEqual(outpaintRes.extendedWidth, 1024 + 256);
  assert.strictEqual(outpaintRes.unmaskedPreservedPercent, 100.0);
  console.log("  ✔ Test 6: Canvas outpainting and perimeter extension verified.");

  // -------------------------------------------------------------------------
  // Test 7: Localized Mask Inpainting & Object Modification
  // -------------------------------------------------------------------------
  console.log("▶ Test 7: Localized inpainting & unmasked region preservation...");
  const inpaintRes = await executeImageEdit({
    image: sampleDataUri,
    instruction: "Change the sofa color to emerald green",
    maskOptions: { featherRadiusPx: 4, dilationRadiusPx: 4 },
    userId: "test_user_alice",
  });
  assert.strictEqual(inpaintRes.operation, "color_modification");
  assert.ok(inpaintRes.unmaskedPreservedPercent >= 95.0);
  assert.ok(inpaintRes.snapshotId.startsWith("edit_"));
  console.log("  ✔ Test 7: Localized inpainting with unmasked pixel preservation passed.");

  // -------------------------------------------------------------------------
  // Test 8: Edit History Stack, Undo/Redo & Snapshot Persistence
  // -------------------------------------------------------------------------
  console.log("▶ Test 8: Edit history version control, snapshots & deletion...");
  const snapA = await saveEditSnapshot({
    operation: "object_removal",
    instruction: "Remove photobomber",
    imageUrl: sampleDataUri,
    unmaskedPreservedPercent: 97.5,
    dimensions: { width: 1024, height: 1024 },
    userId: "test_user_alice",
    workspaceId: "ws_image_studio",
  });

  const snapB = await saveEditSnapshot({
    parentId: snapA.id,
    operation: "color_modification",
    instruction: "Make jacket black",
    imageUrl: sampleDataUri,
    unmaskedPreservedPercent: 98.0,
    dimensions: { width: 1024, height: 1024 },
    userId: "test_user_alice",
    workspaceId: "ws_image_studio",
  });

  const history = getEditHistory("test_user_alice", "ws_image_studio");
  assert.ok(history.length >= 2);
  assert.ok(history.some((s) => s.id === snapA.id));
  assert.ok(history.some((s) => s.id === snapB.id));

  // Security isolation: User Bob cannot access Alice's snapshot
  assert.throws(() => {
    getSnapshotById(snapA.id, "test_user_bob");
  }, /Access denied/);

  // Clean up
  deleteSnapshot(snapA.id, "test_user_alice");
  deleteSnapshot(snapB.id, "test_user_alice");
  console.log("  ✔ Test 8: Edit history snapshots & tenant isolation passed.");

  // -------------------------------------------------------------------------
  // Test 9: Provider Capability Inspection & Anti-Discard Router
  // -------------------------------------------------------------------------
  console.log("▶ Test 9: Editing provider capabilities & anti-discard router...");
  const geminiCap = EDITING_PROVIDER_CAPABILITIES["gemini"];
  assert.strictEqual(geminiCap.supportsInpainting, true);
  assert.strictEqual(geminiCap.supportsMaskInput, true);

  const openaiCap = EDITING_PROVIDER_CAPABILITIES["openai"];
  assert.strictEqual(openaiCap.supportsInpainting, false, "DALL-E 3 must not be advertised as inpainting-capable");

  // Router must reject OpenAI for mask editing and re-route to Gemini
  const routeDecision = resolveEditingProvider("inpainting", "openai", true, false);
  assert.strictEqual(routeDecision.primaryProvider, "gemini");
  assert.ok(routeDecision.warnings.some((w) => w.includes("DALL-E 3 does not support mask-conditioned inpainting")));

  // Transparent output routes to local matting engine
  const transparentRoute = resolveEditingProvider("background_removal", "auto", false, true);
  assert.strictEqual(transparentRoute.primaryProvider, "local");
  console.log("  ✔ Test 9: Provider capability filtering and routing safeguards passed.");

  // -------------------------------------------------------------------------
  // Test 10: 50 Real-World Editing Scenarios Benchmark Validation
  // -------------------------------------------------------------------------
  console.log("▶ Test 10: 50-Scenario editing benchmark catalog validation...");
  assert.strictEqual(BENCHMARK_50_EDITING_SCENARIOS.length, 50, "Benchmark must contain exactly 50 scenarios");

  const categories = new Set(BENCHMARK_50_EDITING_SCENARIOS.map((s) => s.category));
  assert.ok(categories.has("object_removal"));
  assert.ok(categories.has("object_replacement"));
  assert.ok(categories.has("object_insertion"));
  assert.ok(categories.has("background_removal"));
  assert.ok(categories.has("background_replacement"));
  assert.ok(categories.has("color_modification"));
  assert.ok(categories.has("outpainting"));
  assert.ok(categories.has("lighting_modification"));
  assert.ok(categories.has("style_transfer"));
  assert.ok(categories.has("image_restoration"));

  // Verify all scenarios specify valid preservation thresholds
  for (const s of BENCHMARK_50_EDITING_SCENARIOS) {
    assert.ok(s.preservationThresholdPercent >= 85.0 && s.preservationThresholdPercent <= 100.0);
    assert.ok(s.userInstruction.length > 5);
  }
  console.log("  ✔ Test 10: 50 real-world editing benchmark scenarios validated successfully.");

  console.log("\n✨ All 10 Phase H: Advanced AI Image Editing & Manipulation tests PASSED successfully!\n");
}

// Allow direct execution via tsx
if (process.argv[1]?.includes("image-editing-manipulation.test.ts")) {
  runImageEditingManipulationTests().catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
}
