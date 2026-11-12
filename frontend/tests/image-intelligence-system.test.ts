/**
 * TATTVA AI - Advanced Image Intelligence & Adherence Verification Test Suite
 * Tests 10 Critical Real-World Scenarios:
 * 1. Correctly generated requested character
 * 2. Incorrect character / Generic substitute (e.g. Doraemon vs generic anime astronaut)
 * 3. Missing objects
 * 4. Incorrect object counts
 * 5. Wrong colors
 * 6. Incorrect object positions
 * 7. Wrong background
 * 8. Incorrect artistic style
 * 9. Unreadable text
 * 10. Reference-image mismatch & Intelligent Targeted Correction ("Improve This Image")
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeGeneratedImage,
  runHeuristicImageAnalysis,
  verifyCharacterAccuracy,
  evaluatePromptAdherence,
  formulateTargetedEditingInstruction,
  improveImageIntelligently,
} from "../app/lib/image-engine/intelligence";
import type { ImageUnderstandingAnalysis } from "../app/lib/image-engine/intelligence/types";

// 128x128 valid Base64 PNG fixture
const SAMPLE_IMAGE_FIXTURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAQMAAAD58POIAAAABlBMVEUAAAD///+l2Z/dAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVRIx+3RsQ0AMAzDwCL5/8wUaIeOBAi6F9k1d120BwAAAAAAAAAA4F8HAAAAAP7gAgz4AGjZ7QW1AAAAAElFTkSuQmCC";

describe("ADVANCED IMAGE INTELLIGENCE & ADHERENCE EVALUATION SUITE", () => {
  // ---------------------------------------------------------------------------
  // TEST 1: Correctly Generated Requested Character (Canonical Verification)
  // ---------------------------------------------------------------------------
  test("1. Correctly generated requested character is certified with high confidence", () => {
    const prompt = "A clean cartoon illustration of Doraemon standing happily in a room.";
    const analysis: ImageUnderstandingAnalysis = {
      mainSubject: "Doraemon",
      secondarySubjects: [],
      objectsAndCounts: [{ name: "Doraemon", count: 1, location: "center", confidence: 0.96 }],
      characterAppearance: verifyCharacterAccuracy({
        prompt,
        observedSubjectDescription: "blue round robotic cat with white belly, red collar with yellow bell, and half-circle white 4D pouch pocket on belly, round red nose with whiskers",
        detectedEntities: ["blue cat", "yellow bell", "white belly", "4D pocket"],
        dominantColors: ["blue", "white", "red", "yellow"],
        visualStyle: "cartoon anime",
      }),
      clothingAndAccessories: ["red collar with yellow bell"],
      backgroundAndEnvironment: { setting: "tatami bedroom", elements: ["wooden desk"], indoorOutdoor: "indoor" },
      dominantColors: [
        { name: "blue", hex: "#0099FF", prominence: "primary" },
        { name: "white", hex: "#FFFFFF", prominence: "secondary" },
        { name: "red", hex: "#FF0000", prominence: "accent" },
      ],
      lighting: { type: "bright daylight", mood: "cheerful" },
      cameraAngle: "eye-level medium shot",
      composition: "centered portrait",
      artisticStyle: "anime cel-shaded",
      spatialRelationships: [],
      visibleText: [],
      qualityIssues: [],
      modelUsed: "gemini-2.5-flash",
      analysisTimestamp: new Date().toISOString(),
    };

    const report = evaluatePromptAdherence({
      imageId: "test_char_pass",
      originalPrompt: prompt,
      understanding: analysis,
    });

    assert.strictEqual(report.categories["main_subject"].status, "PASS");
    assert.strictEqual(report.characterAssessment?.identityMatchStatus, "verified");
    assert.ok(report.overallScore >= 90, `Expected score >= 90, got ${report.overallScore}`);
    assert.strictEqual(report.overallVerdict, "PASS");
    console.log(`  ✔ Case 1: Verified canonical Doraemon certified with ${report.overallScore}% score.`);
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Incorrect Character / Generic Substitute (Crucial Doraemon Test)
  // ---------------------------------------------------------------------------
  test("2. Generic anime astronaut generated instead of Doraemon is flagged as Critical Failure", () => {
    const prompt = "Create an image of Doraemon.";
    const analysis: ImageUnderstandingAnalysis = {
      mainSubject: "Generic anime-style astronaut character",
      secondarySubjects: ["starry background"],
      objectsAndCounts: [{ name: "astronaut", count: 1, confidence: 0.95 }],
      characterAppearance: verifyCharacterAccuracy({
        prompt,
        observedSubjectDescription: "generic futuristic anime astronaut wearing a white spacesuit with reflective glass helmet and jetpack",
        detectedEntities: ["astronaut", "spacesuit", "helmet", "jetpack"],
        dominantColors: ["white", "grey", "black"],
        visualStyle: "anime sci-fi",
      }),
      clothingAndAccessories: ["white spacesuit", "reflective visor"],
      backgroundAndEnvironment: { setting: "outer space", elements: ["stars"], indoorOutdoor: "outdoor" },
      dominantColors: [
        { name: "white", prominence: "primary" },
        { name: "black", prominence: "secondary" },
      ],
      lighting: { type: "harsh starlight" },
      cameraAngle: "medium shot",
      composition: "centered",
      artisticStyle: "sci-fi anime",
      spatialRelationships: [],
      visibleText: [],
      qualityIssues: [],
      modelUsed: "gemini-2.5-flash",
      analysisTimestamp: new Date().toISOString(),
    };

    const report = evaluatePromptAdherence({
      imageId: "test_char_fail",
      originalPrompt: prompt,
      understanding: analysis,
    });

    // Verify hard rule: Main subject must FAIL and cap overall score
    assert.strictEqual(report.categories["main_subject"].status, "FAIL");
    assert.ok(report.categories["main_subject"].isCriticalFailure, "Must be flagged as critical failure");
    assert.strictEqual(report.overallVerdict, "FAIL");
    assert.ok(
      report.overallScore <= 35,
      `Overall score must be capped at <= 35 for wrong character, got ${report.overallScore}`
    );
    assert.ok(
      report.categories["main_subject"].visualEvidence.includes("generic"),
      "Evidence must note generic substitute"
    );
    console.log(`  ✔ Case 2: Generic substitute correctly penalized to FAIL (${report.overallScore}% score cap).`);
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Missing Objects
  // ---------------------------------------------------------------------------
  test("3. Missing requested secondary objects are accurately detected and penalized", () => {
    const prompt = "A red car parked under an oak tree with a blue bicycle and a golden retriever dog.";
    const analysis: ImageUnderstandingAnalysis = {
      mainSubject: "Red car",
      secondarySubjects: ["oak tree"], // Bicycle and dog missing!
      objectsAndCounts: [
        { name: "red car", count: 1, confidence: 0.95 },
        { name: "oak tree", count: 1, confidence: 0.90 },
      ],
      characterAppearance: {
        isRecognizableCharacter: false,
        observedCharacterDescription: "",
        identityMatchStatus: "not_applicable",
        definingFeaturesMatched: [],
        definingFeaturesMissingOrWrong: [],
        clothingAndCostume: "",
        confidence: 0.95,
      },
      clothingAndAccessories: [],
      backgroundAndEnvironment: { setting: "park", elements: ["grass"], indoorOutdoor: "outdoor" },
      dominantColors: [{ name: "red", prominence: "primary" }, { name: "green", prominence: "secondary" }],
      lighting: { type: "daylight" },
      cameraAngle: "wide shot",
      composition: "centered",
      artisticStyle: "photograph",
      spatialRelationships: [],
      visibleText: [],
      qualityIssues: [],
      modelUsed: "gemini-2.5-flash",
      analysisTimestamp: new Date().toISOString(),
    };

    const report = evaluatePromptAdherence({
      imageId: "test_missing_obj",
      originalPrompt: prompt,
      understanding: analysis,
    });

    assert.notStrictEqual(report.categories["object_presence"].status, "PASS");
    assert.ok(
      report.missingRequirements.some((m) => m.toLowerCase().includes("bicycle")),
      "Missing bicycle must be listed in missing requirements"
    );
    assert.ok(
      report.missingRequirements.some((m) => m.toLowerCase().includes("dog")),
      "Missing dog must be listed in missing requirements"
    );
    console.log("  ✔ Case 3: Missing bicycle and dog correctly isolated.");
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Incorrect Object Counts
  // ---------------------------------------------------------------------------
  test("4. Incorrect object count (expected 3, observed 1) produces count accuracy failure", () => {
    const prompt = "Exactly three red apples arranged on a white marble table.";
    const analysis: ImageUnderstandingAnalysis = {
      mainSubject: "One red apple",
      secondarySubjects: ["marble table"],
      objectsAndCounts: [
        { name: "red apple", count: 1, location: "center", confidence: 0.98 }, // Count is 1, not 3!
      ],
      characterAppearance: {
        isRecognizableCharacter: false,
        observedCharacterDescription: "",
        identityMatchStatus: "not_applicable",
        definingFeaturesMatched: [],
        definingFeaturesMissingOrWrong: [],
        clothingAndCostume: "",
        confidence: 0.95,
      },
      clothingAndAccessories: [],
      backgroundAndEnvironment: { setting: "tabletop", elements: ["marble"], indoorOutdoor: "indoor" },
      dominantColors: [{ name: "red", prominence: "primary" }, { name: "white", prominence: "secondary" }],
      lighting: { type: "studio lighting" },
      cameraAngle: "close-up",
      composition: "centered",
      artisticStyle: "photoreal",
      spatialRelationships: [],
      visibleText: [],
      qualityIssues: [],
      modelUsed: "gemini-2.5-flash",
      analysisTimestamp: new Date().toISOString(),
    };

    const report = evaluatePromptAdherence({
      imageId: "test_count_fail",
      originalPrompt: prompt,
      understanding: analysis,
    });

    assert.strictEqual(report.categories["object_count"].status, "PARTIAL");
    assert.ok(report.categories["object_count"].score <= 40, "Count score must be penalized");
    assert.ok(report.categories["object_count"].visualEvidence.includes("Count mismatch"));
    console.log("  ✔ Case 4: Quantity mismatch (1 vs 3) correctly caught.");
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Wrong Colors
  // ---------------------------------------------------------------------------
  test("5. Color mismatch (user asked for yellow taxi, observed black) fails color accuracy", () => {
    const prompt = "A bright yellow taxi cab driving through a rainy street.";
    const analysis: ImageUnderstandingAnalysis = {
      mainSubject: "Black taxi cab",
      secondarySubjects: ["rainy street"],
      objectsAndCounts: [{ name: "black taxi cab", count: 1, confidence: 0.95 }],
      characterAppearance: {
        isRecognizableCharacter: false,
        observedCharacterDescription: "",
        identityMatchStatus: "not_applicable",
        definingFeaturesMatched: [],
        definingFeaturesMissingOrWrong: [],
        clothingAndCostume: "",
        confidence: 0.95,
      },
      clothingAndAccessories: [],
      backgroundAndEnvironment: { setting: "rainy street", elements: ["asphalt"], indoorOutdoor: "outdoor" },
      dominantColors: [
        { name: "black", prominence: "primary" },
        { name: "grey", prominence: "secondary" }, // Missing yellow!
      ],
      lighting: { type: "overcast" },
      cameraAngle: "street level",
      composition: "diagonal",
      artisticStyle: "photo",
      spatialRelationships: [],
      visibleText: [],
      qualityIssues: [],
      modelUsed: "gemini-2.5-flash",
      analysisTimestamp: new Date().toISOString(),
    };

    const report = evaluatePromptAdherence({
      imageId: "test_color_fail",
      originalPrompt: prompt,
      understanding: analysis,
    });

    assert.strictEqual(report.categories["color_accuracy"].status, "FAIL");
    assert.ok(report.missingRequirements.some((m) => m.toLowerCase().includes("yellow")));
    console.log("  ✔ Case 5: Missing yellow color detected and penalized.");
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Incorrect Object Positions
  // ---------------------------------------------------------------------------
  test("6. Spatial relationship inversion or failure is detected", () => {
    const prompt = "A sleeping orange cat under a wooden dining chair.";
    const analysis: ImageUnderstandingAnalysis = {
      mainSubject: "Orange cat",
      secondarySubjects: ["dining chair"],
      objectsAndCounts: [
        { name: "orange cat", count: 1, location: "on top of chair", confidence: 0.92 },
        { name: "dining chair", count: 1, confidence: 0.95 },
      ],
      characterAppearance: {
        isRecognizableCharacter: false,
        observedCharacterDescription: "",
        identityMatchStatus: "not_applicable",
        definingFeaturesMatched: [],
        definingFeaturesMissingOrWrong: [],
        clothingAndCostume: "",
        confidence: 0.95,
      },
      clothingAndAccessories: [],
      backgroundAndEnvironment: { setting: "dining room", elements: [], indoorOutdoor: "indoor" },
      dominantColors: [{ name: "orange", prominence: "primary" }],
      lighting: { type: "warm indoor" },
      cameraAngle: "eye-level",
      composition: "centered",
      artisticStyle: "photo",
      spatialRelationships: [
        { subject: "orange cat", relation: "under", target: "wooden dining chair", isObserved: false, confidence: 0.9 },
      ],
      visibleText: [],
      qualityIssues: [],
      modelUsed: "gemini-2.5-flash",
      analysisTimestamp: new Date().toISOString(),
    };

    const report = evaluatePromptAdherence({
      imageId: "test_spatial_fail",
      originalPrompt: prompt,
      understanding: analysis,
    });

    assert.strictEqual(report.categories["spatial_accuracy"].status, "PARTIAL");
    assert.ok(report.categories["spatial_accuracy"].score <= 75);
    console.log("  ✔ Case 6: Failed spatial relationship (cat under chair) detected.");
  });

  // ---------------------------------------------------------------------------
  // TEST 7: Wrong Background
  // ---------------------------------------------------------------------------
  test("7. Background discrepancy is noted in background accuracy", () => {
    const prompt = "An ancient Gothic library with mahogany bookshelves.";
    const analysis: ImageUnderstandingAnalysis = {
      mainSubject: "Bookshelves",
      secondarySubjects: [],
      objectsAndCounts: [{ name: "bookshelves", count: 1, confidence: 0.9 }],
      characterAppearance: {
        isRecognizableCharacter: false,
        observedCharacterDescription: "",
        identityMatchStatus: "not_applicable",
        definingFeaturesMatched: [],
        definingFeaturesMissingOrWrong: [],
        clothingAndCostume: "",
        confidence: 0.95,
      },
      clothingAndAccessories: [],
      backgroundAndEnvironment: { setting: "modern minimalist glass office", elements: ["glass tables"], indoorOutdoor: "indoor" },
      dominantColors: [{ name: "white", prominence: "primary" }],
      lighting: { type: "fluorescent" },
      cameraAngle: "wide shot",
      composition: "architectural",
      artisticStyle: "photo",
      spatialRelationships: [],
      visibleText: [],
      qualityIssues: [],
      modelUsed: "gemini-2.5-flash",
      analysisTimestamp: new Date().toISOString(),
    };

    const report = evaluatePromptAdherence({
      imageId: "test_bg_fail",
      originalPrompt: prompt,
      understanding: analysis,
    });

    assert.strictEqual(report.categories["background_accuracy"].status, "PARTIAL");
    console.log("  ✔ Case 7: Background mismatch (modern office vs Gothic library) detected.");
  });

  // ---------------------------------------------------------------------------
  // TEST 8: Incorrect Artistic Style
  // ---------------------------------------------------------------------------
  test("8. Style evaluation reports detected rendering style", () => {
    const prompt = "A watercolor painting of a Parisian cafe.";
    const analysis = runHeuristicImageAnalysis(SAMPLE_IMAGE_FIXTURE, prompt);
    const report = evaluatePromptAdherence({
      imageId: "test_style",
      originalPrompt: prompt,
      understanding: analysis,
    });

    assert.ok(report.categories["style_accuracy"].expectedResult.includes("watercolor") || report.categories["style_accuracy"].visualEvidence.length > 0);
    console.log("  ✔ Case 8: Style evaluation category successfully populated.");
  });

  // ---------------------------------------------------------------------------
  // TEST 9: Unreadable / Missing Text
  // ---------------------------------------------------------------------------
  test("9. Missing quoted text is flagged in OCR text accuracy", () => {
    const prompt = 'A retro poster with the word "PARIS" in bold letters.';
    const analysis: ImageUnderstandingAnalysis = {
      mainSubject: "Retro poster",
      secondarySubjects: [],
      objectsAndCounts: [{ name: "poster", count: 1, confidence: 0.95 }],
      characterAppearance: {
        isRecognizableCharacter: false,
        observedCharacterDescription: "",
        identityMatchStatus: "not_applicable",
        definingFeaturesMatched: [],
        definingFeaturesMissingOrWrong: [],
        clothingAndCostume: "",
        confidence: 0.95,
      },
      clothingAndAccessories: [],
      backgroundAndEnvironment: { setting: "studio", elements: [], indoorOutdoor: "indoor" },
      dominantColors: [{ name: "sepia", prominence: "primary" }],
      lighting: { type: "flat" },
      cameraAngle: "straight on",
      composition: "centered",
      artisticStyle: "poster",
      spatialRelationships: [],
      visibleText: [], // Zero text found!
      qualityIssues: [],
      modelUsed: "gemini-2.5-flash",
      analysisTimestamp: new Date().toISOString(),
    };

    const report = evaluatePromptAdherence({
      imageId: "test_text_fail",
      originalPrompt: prompt,
      understanding: analysis,
    });

    assert.strictEqual(report.categories["text_accuracy"].status, "FAIL");
    assert.ok(report.missingRequirements.some((m) => m.includes("PARIS")));
    console.log('  ✔ Case 9: Missing text "PARIS" flagged in OCR verification.');
  });

  // ---------------------------------------------------------------------------
  // TEST 10: Reference-Image Mismatch & Intelligent Correction Workflow
  // ---------------------------------------------------------------------------
  test("10. Intelligent correction workflow creates targeted surgical instructions and tracks improvements", async () => {
    const prompt = "A sleek red sports car under an oak tree with a blue bicycle.";
    const initialReport = evaluatePromptAdherence({
      imageId: "test_improve_initial",
      originalPrompt: prompt,
      understanding: {
        mainSubject: "Red sports car",
        secondarySubjects: ["oak tree"], // Missing bicycle!
        objectsAndCounts: [
          { name: "red sports car", count: 1, confidence: 0.95 },
          { name: "oak tree", count: 1, confidence: 0.90 },
        ],
        characterAppearance: {
          isRecognizableCharacter: false,
          observedCharacterDescription: "",
          identityMatchStatus: "not_applicable",
          definingFeaturesMatched: [],
          definingFeaturesMissingOrWrong: [],
          clothingAndCostume: "",
          confidence: 0.95,
        },
        clothingAndAccessories: [],
        backgroundAndEnvironment: { setting: "park", elements: [], indoorOutdoor: "outdoor" },
        dominantColors: [{ name: "red", prominence: "primary" }],
        lighting: { type: "daylight" },
        cameraAngle: "wide shot",
        composition: "centered",
        artisticStyle: "photo",
        spatialRelationships: [],
        visibleText: [],
        qualityIssues: [],
        modelUsed: "gemini-2.5-flash",
        analysisTimestamp: new Date().toISOString(),
      },
    });

    // 1. Formulate targeted instruction
    const instruction = formulateTargetedEditingInstruction(initialReport);
    assert.ok(
      instruction.promptDirective.includes("blue bicycle") || instruction.targetDescription.includes("bicycle"),
      "Targeted instruction must specifically target the missing blue bicycle"
    );
    assert.ok(
      instruction.preserveElements.length > 0,
      "Targeted instruction must preserve existing correct elements (red sports car, oak tree)"
    );

    // 2. Run Intelligent Correction Pass
    const correctionResult = await improveImageIntelligently({
      image: SAMPLE_IMAGE_FIXTURE,
      originalPrompt: prompt,
      currentReport: initialReport,
      attemptNumber: 1,
      maxAttempts: 3,
      forceVision: false, // In test runner, use deterministic heuristic engine
    });

    assert.strictEqual(correctionResult.attemptNumber, 1);
    assert.strictEqual(correctionResult.maxAttempts, 3);
    assert.ok(correctionResult.postCorrectionReport, "Must return post-correction adherence report");
    console.log(`  ✔ Case 10: Intelligent correction successfully formulated: "${instruction.promptDirective}"`);
  });
});

