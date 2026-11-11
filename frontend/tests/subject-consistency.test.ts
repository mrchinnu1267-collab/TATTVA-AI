import assert from "node:assert";
import {
  createSubjectProfile,
  getSubjectProfileById,
  listSubjectProfiles,
  updateSubjectProfile,
  deleteSubjectProfile,
  addSubjectReference,
  removeSubjectReference,
} from "../app/lib/image-engine/consistency/subject-store";
import {
  compileSubjectConsistentPrompt,
  extractSubjectTokens,
} from "../app/lib/image-engine/consistency/prompt-compiler";
import {
  evaluateSubjectConsistency,
  formulateTargetedCorrection,
} from "../app/lib/image-engine/consistency/evaluator";
import {
  generateWithSubject,
  generateStorySequence,
} from "../app/lib/image-engine/consistency/consistency-engine";
import {
  BENCHMARK_50_CONSISTENCY_SCENARIOS,
} from "../app/lib/image-engine/consistency/benchmark-50";

export async function runSubjectConsistencyTests() {
  console.log("\n🚀 Running Phase I: Advanced Character and Subject Consistency Test Suite...\n");

  const sampleImageUri =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAQMAAAD58POIAAAABlBMVEUAAAD///+l2Z/dAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVRIx+3RsQ0AMAzDwCL5/8wUaIeOBAi6F9k1d120BwAAAAAAAAAA4F8HAAAAAP7gAgz4AGjZ7QW1AAAAAElFTkSuQmCC";

  // -------------------------------------------------------------------------
  // Test 1: Subject Profile Creation and Identity Structure
  // -------------------------------------------------------------------------
  console.log("▶ Test 1: Subject profile creation and identity structure...");
  const profile = createSubjectProfile({
    workspaceId: "ws_alpha",
    userId: "usr_101",
    name: "Captain Lyra Vance",
    category: "fictional_character",
    description: "Ace starship pilot with auburn hair and cybernetic left eye.",
    physical: {
      speciesOrType: "human",
      hairColor: "auburn",
      hairStyle: "braided",
      primaryClothing: "navy flight jumpsuit with gold epaulets",
      colorScheme: ["#001F3F", "#FFD700", "#FFFFFF"],
      signatureAccessories: ["brass aviator goggles", "silver chronometer"],
      distinguishingMarkings: ["cybernetic left eye", "small scar over brow"],
    },
    facial: {
      eyeColor: "amber",
      distinctiveFeatures: ["cybernetic left eye optic"],
    },
    style: {
      artisticStyle: "Cinematic sci-fi realism",
    },
    importantDetails: ["Maintain auburn braided hair and cybernetic eye in every image"],
    prohibitedChanges: ["never change eye color to blue", "never remove cybernetic eye"],
    referenceImages: [],
  });

  assert.ok(profile.id.startsWith("subj_"), "Profile ID should have subj_ prefix");
  assert.strictEqual(profile.name, "Captain Lyra Vance");
  assert.strictEqual(profile.version, 1);
  console.log("  ✔ Test 1: Subject profile creation verified.");

  // -------------------------------------------------------------------------
  // Test 2: Consent Guardrail Enforcement for Real Persons
  // -------------------------------------------------------------------------
  console.log("▶ Test 2: Real-person authorization and consent enforcement...");
  let consentBlocked = false;
  try {
    createSubjectProfile({
      workspaceId: "ws_alpha",
      userId: "usr_101",
      name: "Celebrity Without Consent",
      category: "real_person",
      description: "Unauthorized real person likeness attempt",
      physical: {
        speciesOrType: "human",
        colorScheme: [],
        signatureAccessories: [],
        distinguishingMarkings: [],
      },
      style: { artisticStyle: "photorealistic" },
      importantDetails: [],
      prohibitedChanges: [],
      referenceImages: [],
      userConsentProvided: false, // NOT provided
    });
  } catch (err: any) {
    if (err.message.includes("Authorization Required")) {
      consentBlocked = true;
    }
  }
  assert.strictEqual(consentBlocked, true, "Must block real-person subjects without explicit consent");

  // Verify allowed when userConsentProvided is true
  const authorizedPerson = createSubjectProfile({
    workspaceId: "ws_alpha",
    userId: "usr_101",
    name: "Authorized Real Person",
    category: "real_person",
    description: "Client with verified authorization",
    physical: {
      speciesOrType: "human",
      colorScheme: [],
      signatureAccessories: [],
      distinguishingMarkings: [],
    },
    style: { artisticStyle: "portrait photography" },
    importantDetails: [],
    prohibitedChanges: [],
    referenceImages: [],
    userConsentProvided: true,
  });
  assert.ok(authorizedPerson.id, "Should allow real person when consent is explicitly affirmed");
  console.log("  ✔ Test 2: Real-person consent guardrails verified.");

  // -------------------------------------------------------------------------
  // Test 3: Multi-Angle Reference Images Management
  // -------------------------------------------------------------------------
  console.log("▶ Test 3: Multi-angle reference images and primary view assignment...");
  const refFront = addSubjectReference(
    profile.id,
    {
      imageUrl: sampleImageUri,
      viewType: "front",
      description: "Frontal passport view",
      isPrimary: true,
    },
    "ws_alpha"
  );

  const refSide = addSubjectReference(
    profile.id,
    {
      imageUrl: sampleImageUri,
      viewType: "side",
      description: "Lateral profile showing ear and jawline",
    },
    "ws_alpha"
  );

  const updatedProfile = getSubjectProfileById(profile.id, "ws_alpha");
  assert.strictEqual(updatedProfile?.referenceImages.length, 2, "Profile should have 2 reference views");
  assert.strictEqual(updatedProfile?.primaryReferenceId, refFront.id, "Front view should be primary");

  // Remove a reference
  const removed = removeSubjectReference(profile.id, refSide.id, "ws_alpha");
  assert.strictEqual(removed, true, "Reference deletion should succeed");
  const postRemoveProfile = getSubjectProfileById(profile.id, "ws_alpha");
  assert.strictEqual(postRemoveProfile?.referenceImages.length, 1, "Should have 1 reference left");
  console.log("  ✔ Test 3: Multi-angle reference management passed.");

  // -------------------------------------------------------------------------
  // Test 4: Subject Identity Tokens & Prompt Compilation
  // -------------------------------------------------------------------------
  console.log("▶ Test 4: Identity tokens extraction and provider prompt compilation...");
  const tokens = extractSubjectTokens(profile);
  assert.ok(tokens.includes("Captain Lyra Vance"), "Should extract name token");
  assert.ok(tokens.some((t) => t.includes("auburn")), "Should extract hair token");
  assert.ok(tokens.some((t) => t.includes("goggles")), "Should extract signature accessory token");

  const compiled = compileSubjectConsistentPrompt(
    profile,
    "Standing on a snowy ridge at sunset",
    { pose: "arms on hips", lighting: "golden sunset rays" }
  );

  assert.ok(compiled.providerPrompts.gemini.includes("Captain Lyra Vance"), "Gemini prompt must include character name");
  assert.ok(compiled.providerPrompts.gemini.includes("auburn"), "Gemini prompt must lock hair color");
  assert.ok(compiled.providerPrompts.gemini.includes("Strict Preservation Rules"), "Gemini prompt must enforce preservation");
  assert.ok(compiled.providerPrompts.huggingface.includes("auburn"), "SDXL prompt must include hair descriptor");
  assert.ok(compiled.negativePrompt.includes("different character"), "Negative prompt must prevent character drift");
  console.log("  ✔ Test 4: Subject tokens and provider prompt compilation passed.");

  // -------------------------------------------------------------------------
  // Test 5: Variations (Pose, Expression, Angle, Clothing Override)
  // -------------------------------------------------------------------------
  console.log("▶ Test 5: Requested variations while preserving identity...");
  const variationCompiled = compileSubjectConsistentPrompt(
    profile,
    "Attending an ambassador's reception",
    {
      pose: "raising champagne flute",
      expression: "subtle confident smile",
      cameraAngle: "low angle looking up",
      clothing: "emerald green silk evening gown",
    }
  );

  assert.ok(variationCompiled.appliedVariations.some((v) => v.includes("clothing")), "Should log clothing override variation");
  assert.ok(variationCompiled.appliedVariations.some((v) => v.includes("pose")), "Should log pose variation");
  assert.ok(variationCompiled.providerPrompts.gemini.includes("emerald green silk evening gown"), "Should apply clothing override");
  // Identity features must STILL be present
  assert.ok(variationCompiled.providerPrompts.gemini.includes("cybernetic left eye"), "Core identity must persist despite clothing override");
  console.log("  ✔ Test 5: Selective variation and core identity preservation verified.");

  // -------------------------------------------------------------------------
  // Test 6: Multi-Metric Consistency Evaluation
  // -------------------------------------------------------------------------
  console.log("▶ Test 6: Multi-metric consistency evaluation across 7 dimensions...");
  const evalScore = await evaluateSubjectConsistency({
    image: sampleImageUri,
    profile,
    userPrompt: "Captain Lyra Vance standing in command center",
  });

  assert.ok(evalScore.overallScore >= 0.70, "Consistent image should score >= 0.70");
  assert.ok(evalScore.visualSimilarity > 0, "Visual similarity must be calculated");
  assert.ok(evalScore.shapeConsistency > 0, "Shape consistency must be calculated");
  assert.ok(evalScore.colorConsistency > 0, "Color consistency must be calculated");
  assert.ok(evalScore.distinguishingFeaturePreservation > 0, "Distinguishing features must be evaluated");
  assert.strictEqual(evalScore.isConsistent, true, "Should be flagged consistent");
  assert.ok(evalScore.confidence >= 0.80, "Confidence score must be >= 0.80");
  console.log("  ✔ Test 6: Multi-metric consistency evaluation passed.");

  // -------------------------------------------------------------------------
  // Test 7: Targeted Correction Planning on Consistency Drift
  // -------------------------------------------------------------------------
  console.log("▶ Test 7: Targeted correction formulation on identity drift...");
  const driftedScore = {
    ...evalScore,
    overallScore: 0.62,
    isConsistent: false,
    distinguishingFeaturePreservation: 0.55,
    accessoryConsistency: 0.60,
  };

  const correction = formulateTargetedCorrection(
    driftedScore,
    profile,
    "Captain Lyra Vance standing in command center"
  );

  assert.strictEqual(correction.needsCorrection, true, "Must flag correction requirement");
  assert.ok(correction.driftedAttributes.length > 0, "Should identify drifted attributes");
  assert.ok(correction.correctionPrompt.includes("Captain Lyra Vance"), "Correction prompt must reference subject");
  assert.ok(correction.correctionPrompt.includes("brass aviator goggles"), "Correction prompt must reinforce missing accessories");
  console.log("  ✔ Test 7: Targeted correction planning verified.");

  // -------------------------------------------------------------------------
  // Test 8: End-to-End Subject-Conditioned Generation
  // -------------------------------------------------------------------------
  console.log("▶ Test 8: End-to-end generation with subject identity locking...");
  const genResult = await generateWithSubject(
    {
      subjectId: profile.id,
      prompt: "Captain Lyra Vance commanding bridge in red alert status",
      variation: {
        expression: "tense commanding frown",
        lighting: "flashing red alert lighting",
      },
      autoCorrectOnFailure: true,
    },
    "ws_alpha"
  );

  assert.ok(genResult.image, "Should return generated image URI");
  assert.strictEqual(genResult.subjectName, "Captain Lyra Vance");
  assert.ok(genResult.consistency.overallScore > 0, "Should evaluate consistency");
  console.log("  ✔ Test 8: End-to-end subject generation passed.");

  // -------------------------------------------------------------------------
  // Test 9: Multi-Scene Sequential Story Generation
  // -------------------------------------------------------------------------
  console.log("▶ Test 9: Multi-scene sequential story generation...");
  const story = await generateStorySequence({
    subjectId: profile.id,
    storyTitle: "The Nebula Incident",
    scenes: [
      { title: "Scene 1: Departure", prompt: "Boarding the starship in dock" },
      { title: "Scene 2: Nebula Entry", prompt: "Navigating swirling cosmic dust" },
      { title: "Scene 3: Discovery", prompt: "Discovering an ancient alien beacon" },
    ],
    workspaceId: "ws_alpha",
  });

  assert.strictEqual(story.scenes.length, 3, "Story must have 3 scenes");
  assert.strictEqual(story.scenes[0].sceneNumber, 1);
  assert.strictEqual(story.scenes[1].sceneNumber, 2);
  assert.strictEqual(story.scenes[2].sceneNumber, 3);
  assert.ok(story.overallConsistencyScore! >= 0.70, "Overall story consistency should be >= 0.70");
  console.log("  ✔ Test 9: Multi-scene sequential story generation verified.");

  // -------------------------------------------------------------------------
  // Test 10: Multi-Tenant Workspace Isolation & 50-Scenario Catalog Validation
  // -------------------------------------------------------------------------
  console.log("▶ Test 10: Tenant isolation & 50-scenario benchmark catalog...");
  // Tenant Isolation: Attempting to access ws_alpha profile from ws_beta must throw
  let accessDenied = false;
  try {
    getSubjectProfileById(profile.id, "ws_beta");
  } catch (err: any) {
    if (err.message.includes("Access Denied")) {
      accessDenied = true;
    }
  }
  assert.strictEqual(accessDenied, true, "Cross-workspace profile access must be denied");

  // Benchmark catalog validation
  assert.strictEqual(BENCHMARK_50_CONSISTENCY_SCENARIOS.length, 50, "Benchmark must contain 50 scenarios");
  const dimensions = new Set(BENCHMARK_50_CONSISTENCY_SCENARIOS.map((s) => s.testDimension));
  assert.ok(dimensions.has("background_variation"), "Benchmark must cover background variations");
  assert.ok(dimensions.has("pose_variation"), "Benchmark must cover pose variations");
  assert.ok(dimensions.has("camera_angle"), "Benchmark must cover camera angles");
  assert.ok(dimensions.has("clothing_override"), "Benchmark must cover clothing overrides");
  assert.ok(dimensions.has("lighting_variation"), "Benchmark must cover lighting variations");
  assert.ok(dimensions.has("multi_scene_story"), "Benchmark must cover multi-scene stories");
  assert.ok(dimensions.has("product_consistency"), "Benchmark must cover product consistency");
  assert.ok(dimensions.has("permission_consent_guard"), "Benchmark must cover consent guards");

  console.log("  ✔ Test 10: Tenant isolation & 50-scenario benchmark catalog validated.");

  console.log("\n✨ All 10 Phase I: Character and Subject Consistency tests PASSED successfully!\n");
}

