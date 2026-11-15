/**
 * TATTVA AI - Phase 38: Advanced User Experience & Multilingual Interaction Test Suite
 * Validates:
 * 1. Multilingual response parity (Telugu, Hindi, English)
 * 2. Accessibility WCAG 2.1 AA audit & compliance (ARIA labels, visible focus, contrast, touch targets)
 * 3. Cross-platform adaptation (Android PWA, Desktop Browser, Mobile, Electron)
 * 4. Code block syntax formatting & emoji exclusion rule in code blocks
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: "../.env.local" });

import assert from "node:assert";
import { interactionManager } from "../app/lib/ux/interaction-manager";

export async function runPhase38UserExperienceTests() {
  console.log("\n====================================================================");
  console.log("   TATTVA AI - PHASE 38: USER EXPERIENCE & MULTILINGUAL TESTS       ");
  console.log("====================================================================\n");

  // ---------------------------------------------------------------------------
  // Test 1: Multilingual Language Parity (Telugu, Hindi, English)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 1: Multilingual response consistency & parity...");
  const teluguCheck = interactionManager.verifyLanguageParity(
    "Naku Java project gurinchi cheppu.",
    "Java project gurinchi poorthi vivaralu ikkada unnayandi. First, collections framework ni use chesi..."
  );
  assert.strictEqual(teluguCheck.isConsistent, true, "Telugu prompt must yield Telugu/Tenglish response");

  const hindiCheck = interactionManager.verifyLanguageParity(
    "Mujhe React project ke baare mein batao.",
    "React project ke liye hum components aur hooks ka upayog karenge..."
  );
  assert.strictEqual(hindiCheck.isConsistent, true, "Hindi prompt must yield Hindi/Hinglish response");

  const englishCheck = interactionManager.verifyLanguageParity(
    "Explain binary search trees.",
    "A binary search tree is a node-based binary tree data structure..."
  );
  assert.strictEqual(englishCheck.isConsistent, true, "English prompt must yield English response");
  console.log("  ✔ Test 1: Language parity verified across Telugu, Hindi, and English.");

  // ---------------------------------------------------------------------------
  // Test 2: Accessibility WCAG 2.1 AA Compliance Audit
  // ---------------------------------------------------------------------------
  console.log("▶ Test 2: Accessibility WCAG 2.1 AA compliance audit...");
  const compliantElements = [
    {
      tag: "button",
      text: "Send Message",
      ariaLabel: "Submit prompt to AI",
      hasVisibleFocus: true,
      contrastRatio: 6.2,
      touchTargetSize: { width: 48, height: 48 },
    },
    {
      tag: "input",
      ariaLabel: "Ask anything in any language",
      hasVisibleFocus: true,
      contrastRatio: 7.1,
      touchTargetSize: { width: 320, height: 52 },
    },
    {
      tag: "button",
      ariaLabel: "Attach File or Image",
      hasVisibleFocus: true,
      contrastRatio: 5.5,
      touchTargetSize: { width: 48, height: 48 },
    },
  ];

  const auditResult = interactionManager.auditAccessibility(compliantElements);
  assert.strictEqual(auditResult.isCompliant, true, "UI elements must pass WCAG AA standards");
  assert.strictEqual(auditResult.wcagLevel, "AAA", "High-contrast 48px touch targets qualify for AAA");
  assert.strictEqual(auditResult.score, 100);
  console.log("  ✔ Test 2: Accessibility audit passed with 100% WCAG compliance.");

  // ---------------------------------------------------------------------------
  // Test 3: Accessibility Failure Detection (Unlabeled & Low-Contrast)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 3: Accessibility failure detection (missing labels / low contrast)...");
  const nonCompliantElements = [
    {
      tag: "button",
      text: "",
      ariaLabel: "",
      hasVisibleFocus: false,
      contrastRatio: 2.1, // Fails 4.5:1
      touchTargetSize: { width: 24, height: 24 }, // Fails 44x44
    },
  ];

  const badAudit = interactionManager.auditAccessibility(nonCompliantElements);
  assert.strictEqual(badAudit.isCompliant, false, "Must fail non-compliant element");
  assert.ok(
    badAudit.checks.some((c) => c.rule === "accessible_name" && !c.passed),
    "Must detect missing accessible name"
  );
  assert.ok(
    badAudit.checks.some((c) => c.rule === "color_contrast" && !c.passed),
    "Must detect contrast failure"
  );
  console.log("  ✔ Test 3: Unlabeled buttons and low contrast correctly detected and reported.");

  // ---------------------------------------------------------------------------
  // Test 4: Cross-Platform Capability Adaptation
  // ---------------------------------------------------------------------------
  console.log("▶ Test 4: Cross-platform adaptation (Android, Mobile, Desktop)...");
  const androidCaps = interactionManager.resolvePlatformCapabilities(
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36"
  );
  assert.strictEqual(androidCaps.platform, "android_app");
  assert.strictEqual(androidCaps.minTouchTargetPx, 48, "Android requires minimum 48px touch targets");
  assert.strictEqual(androidCaps.hapticFeedbackSupported, true);

  const desktopCaps = interactionManager.resolvePlatformCapabilities(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
  );
  assert.strictEqual(desktopCaps.platform, "desktop_web");
  assert.strictEqual(desktopCaps.keyboardShortcutsEnabled, true);
  console.log("  ✔ Test 4: Dynamic platform capabilities resolved for Android and Desktop.");

  // ---------------------------------------------------------------------------
  // Test 5: Code Block Formatting & Zero Emojis in Code Rule
  // ---------------------------------------------------------------------------
  console.log("▶ Test 5: Code block formatting & emoji sanitization inside code...");
  const codeWithEmojis = `const greeting = "Hello World! 🚀 ✨"; // 🧠 AI function\nreturn greeting;`;
  const formattedCode = interactionManager.formatCodeBlock(codeWithEmojis, "typescript");

  assert.ok(formattedCode.startsWith("```typescript"), "Must wrap in language fence");
  assert.ok(formattedCode.endsWith("```"), "Must close code fence");
  assert.strictEqual(
    formattedCode.includes("🚀") || formattedCode.includes("✨") || formattedCode.includes("🧠"),
    false,
    "Strict rule: emojis must never appear in code block scripts"
  );
  console.log("  ✔ Test 5: Code syntax formatted and strictly scrubbed of emojis.");

  console.log("\n====================================================================");
  console.log("   ALL 5 PHASE 38 USER EXPERIENCE TESTS PASSED!                     ");
  console.log("====================================================================\n");
}

if (process.argv[1]?.endsWith("phase-38-user-experience.test.ts")) {
  runPhase38UserExperienceTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
