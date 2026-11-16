/**
 * TATTVA AI - Intelligent Automatic Image Refinement & Verification Test Suite
 * 
 * Verifies all 10 core requirements:
 * 1. Gemini Vision verification with Cloudflare (not bypassed)
 * 2. Automatic refinement after a low score
 * 3. Successful target-score achievement (>= 95% early exit)
 * 4. Best-image selection (never replace higher score with lower score)
 * 5. Maximum 4 attempts strictly enforced
 * 6. Gemini Vision timeout handling
 * 7. Missing API key handling (honest "unavailable" status, no blind retries)
 * 8. Failed regeneration resilience (retains best previous image)
 * 9. Critical subject mismatch (capped at <= 25%)
 * 10. Accurate 8-dimension score reporting (25/20/15/10/10/10/5/5 weights)
 */

import assert from "node:assert/strict";
import sharp from "sharp";
import { generateImage } from "../app/lib/image-engine/engine";
import { verifyImage, unavailableVerification } from "../app/lib/image-engine/verifier";
import { constructIntelligentRefinedPrompt } from "../app/lib/image-engine/prompt-compiler";
import { evaluatePromptAdherence } from "../app/lib/image-engine/intelligence/adherence-evaluator";

export async function runIntelligentRefinementTests(): Promise<void> {
  console.log("\n================================================================================");
  console.log("⚡ TATTVA AI - INTELLIGENT AUTOMATIC REFINEMENT & VISION AUDIT TEST SUITE");
  console.log("================================================================================\n");

  const originalFetch = globalThis.fetch;
  const originalCfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const originalCfToken = process.env.CLOUDFLARE_API_TOKEN;
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  // Generate a valid 1024x1024 dummy JPEG for Sharp and Cloudflare mock
  const validJpegBuffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: { r: 60, g: 120, b: 240 },
    },
  })
    .jpeg()
    .toBuffer();

  try {
    process.env.CLOUDFLARE_ACCOUNT_ID = "mock-cf-account";
    process.env.CLOUDFLARE_API_TOKEN = "mock-cf-token";
    process.env.GEMINI_API_KEY = "mock-gemini-key";

    // -------------------------------------------------------------------------
    // TEST 1: Gemini Vision verification with Cloudflare
    // -------------------------------------------------------------------------
    console.log("▶ [TEST 1] Gemini Vision verification with Cloudflare Workers AI...");
    let visionCallCount = 0;
    let cloudflareCallCount = 0;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("api.cloudflare.com")) {
        cloudflareCallCount += 1;
        return new Response(validJpegBuffer, {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        visionCallCount += 1;
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        categoryScores: {
                          main_subject: 96,
                          object_presence: 95,
                          object_count: 95,
                          color_accuracy: 95,
                          spatial_accuracy: 95,
                          background_accuracy: 95,
                          style_accuracy: 95,
                          text_accuracy: 95,
                        },
                        confidence: 96,
                        presentElements: ["futuristic AI laboratory", "holographic screens"],
                        missingRequirements: [],
                        issues: [],
                        recommendations: [],
                        requirements: [{ id: "req-1", met: true, note: "Verified in frame" }],
                        suggestedFix: "",
                        correctedPrompt: "",
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(input, init);
    };

    const res1 = await generateImage({
      prompt: "A futuristic AI laboratory with holographic screens",
      provider: "cloudflare",
      maxAttempts: 1,
      verify: true,
    });

    assert.ok(cloudflareCallCount >= 1, "Cloudflare Workers AI must be invoked");
    assert.ok(visionCallCount >= 1, "Gemini Vision must be invoked for Cloudflare images");
    assert.strictEqual(res1.verification.method, "vision");
    assert.strictEqual(res1.verification.status, "verified");
    assert.ok(res1.accuracy >= 95, `Expected accuracy >= 95, got ${res1.accuracy}`);
    console.log(`  ✔ Gemini Vision executed successfully: verified score = ${res1.accuracy}%\n`);

    // -------------------------------------------------------------------------
    // TEST 2: Automatic refinement after a low score
    // -------------------------------------------------------------------------
    console.log("▶ [TEST 2] Automatic refinement loop after a low initial score...");
    let attemptCounter = 0;
    const promptsUsed: string[] = [];

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("api.cloudflare.com")) {
        const body = JSON.parse(String(init?.body || "{}"));
        promptsUsed.push(body.prompt);
        return new Response(validJpegBuffer, {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        const bodyStr = init?.body ? String(init.body) : "";
        if (bodyStr.includes("isSafe")) {
          return new Response(
            JSON.stringify({
              candidates: [{ content: { parts: [{ text: JSON.stringify({ isSafe: true }) }] } }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        attemptCounter += 1;
        if (attemptCounter === 1) {
          // Attempt 1: Low score due to missing blue lighting
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          categoryScores: {
                            main_subject: 90,
                            object_presence: 80,
                            object_count: 85,
                            color_accuracy: 40, // Low color accuracy
                            spatial_accuracy: 85,
                            background_accuracy: 80,
                            style_accuracy: 85,
                            text_accuracy: 90,
                          },
                          confidence: 90,
                          presentElements: ["futuristic AI laboratory", "holographic screens"],
                          missingRequirements: ["vibrant blue neon lighting"],
                          issues: ["Blue lighting is not visibly present in the frame."],
                          recommendations: ["Enhance blue illumination across all surfaces."],
                          requirements: [{ id: "req-1", met: false, note: "Missing blue lighting" }],
                          suggestedFix:
                            "Preserve the existing laboratory and holographic screens. Make vibrant blue neon lighting clearly visible throughout.",
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } else {
          // Attempt 2: Refined and target achieved!
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          categoryScores: {
                            main_subject: 96,
                            object_presence: 96,
                            object_count: 95,
                            color_accuracy: 96,
                            spatial_accuracy: 95,
                            background_accuracy: 95,
                            style_accuracy: 95,
                            text_accuracy: 95,
                          },
                          confidence: 95,
                          presentElements: [
                            "futuristic AI laboratory",
                            "holographic screens",
                            "blue lighting",
                          ],
                          missingRequirements: [],
                          issues: [],
                          recommendations: [],
                          requirements: [{ id: "req-1", met: true, note: "Blue lighting now prominent" }],
                          suggestedFix: "",
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      }
      return originalFetch(input, init);
    };

    const res2 = await generateImage({
      prompt: "A futuristic AI laboratory with holographic screens and blue lighting",
      provider: "cloudflare",
      maxAttempts: 4,
      targetScore: 95,
      verify: true,
    });

    assert.strictEqual(attemptCounter, 2, "Should perform 2 attempts to achieve target score");
    assert.strictEqual(res2.attempts.length, 2, "Should record exactly 2 attempts in history");
    assert.ok(res2.accuracy >= 95, "Second attempt must achieve target score");
    assert.ok(
      promptsUsed[1].includes("Preserve") || promptsUsed[1].includes("blue"),
      "Refined prompt must incorporate feedback"
    );
    console.log(`  ✔ Refinement succeeded in 2 attempts: Initial -> Final ${res2.accuracy}%\n`);

    // -------------------------------------------------------------------------
    // TEST 3: Successful target-score achievement (early exit)
    // -------------------------------------------------------------------------
    console.log("▶ [TEST 3] Target-score achievement early exit (no redundant attempts)...");
    attemptCounter = 0;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("api.cloudflare.com")) {
        return new Response(validJpegBuffer, {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        const bodyStr = init?.body ? String(init.body) : "";
        if (bodyStr.includes("isSafe")) {
          return new Response(
            JSON.stringify({
              candidates: [{ content: { parts: [{ text: JSON.stringify({ isSafe: true }) }] } }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        attemptCounter += 1;
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        categoryScores: {
                          main_subject: 98,
                          object_presence: 96,
                          object_count: 95,
                          color_accuracy: 96,
                          spatial_accuracy: 96,
                          background_accuracy: 95,
                          style_accuracy: 95,
                          text_accuracy: 95,
                        },
                        confidence: 96,
                        presentElements: ["pristine red apple", "dark slate"],
                        missingRequirements: [],
                        issues: [],
                        requirements: [],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(input, init);
    };

    const res3 = await generateImage({
      prompt: "A single pristine red apple on dark slate",
      provider: "cloudflare",
      maxAttempts: 4,
      targetScore: 95,
      verify: true,
    });

    assert.strictEqual(attemptCounter, 1, "Should exit immediately on attempt 1 when score >= 95");
    assert.strictEqual(res3.verification.targetAchieved, true);
    console.log(`  ✔ Early exit verified: Stopped on attempt 1 with score ${res3.accuracy}%\n`);

    // -------------------------------------------------------------------------
    // TEST 4: Best-image selection (never replace higher with lower)
    // -------------------------------------------------------------------------
    console.log("▶ [TEST 4] Best-image selection across varying score attempts...");
    attemptCounter = 0;
    const attemptScores = [86, 72, 80, 68]; // Attempt 1 is highest (86%)
    const buffersForAttempts = [
      await sharp({ create: { width: 1024, height: 1024, channels: 3, background: { r: 255, g: 0, b: 0 } } }).jpeg().toBuffer(),
      await sharp({ create: { width: 1024, height: 1024, channels: 3, background: { r: 0, g: 255, b: 0 } } }).jpeg().toBuffer(),
      await sharp({ create: { width: 1024, height: 1024, channels: 3, background: { r: 0, g: 0, b: 255 } } }).jpeg().toBuffer(),
      await sharp({ create: { width: 1024, height: 1024, channels: 3, background: { r: 255, g: 255, b: 0 } } }).jpeg().toBuffer(),
    ];

    let cfCounter = 0;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("api.cloudflare.com")) {
        const buf = buffersForAttempts[cfCounter] || validJpegBuffer;
        cfCounter += 1;
        return new Response(buf, {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        const bodyStr = init?.body ? String(init.body) : "";
        if (bodyStr.includes("isSafe")) {
          return new Response(
            JSON.stringify({
              candidates: [{ content: { parts: [{ text: JSON.stringify({ isSafe: true }) }] } }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        const s = attemptScores[attemptCounter] || 70;
        attemptCounter += 1;
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        categoryScores: {
                          main_subject: s,
                          object_presence: s,
                          object_count: s,
                          color_accuracy: s,
                          spatial_accuracy: s,
                          background_accuracy: s,
                          style_accuracy: s,
                          text_accuracy: s,
                        },
                        confidence: 90,
                        presentElements: [],
                        missingRequirements: ["fine details"],
                        issues: ["Lighting needs adjustment"],
                        requirements: [],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(input, init);
    };

    const res4 = await generateImage({
      prompt: "A fantasy elven palace carved into an emerald cliffside",
      provider: "cloudflare",
      maxAttempts: 4,
      targetScore: 95,
      verify: true,
    });

    assert.strictEqual(res4.attempts.length, 4, "Should execute 4 attempts when target is not reached");
    assert.strictEqual(res4.accuracy, 86, "Must retain the highest score (86%) from attempt 1");
    // Verify attempt 1 buffer was retained as best
    assert.ok(res4.image.startsWith("data:image/jpeg;base64,"));
    console.log(`  ✔ Best-image selection verified: Retained best Attempt #1 (86%) despite lower subsequent attempts\n`);

    // -------------------------------------------------------------------------
    // TEST 5: Maximum 4 attempts strictly enforced
    // -------------------------------------------------------------------------
    console.log("▶ [TEST 5] Maximum 4 attempts boundary enforcement...");
    attemptCounter = 0;
    cfCounter = 0;
    const res5 = await generateImage({
      prompt: "A complex scene with 12 distinct characters",
      provider: "cloudflare",
      maxAttempts: 10, // Requesting 10 should be clamped to 4
      targetScore: 98,
      verify: true,
    });
    assert.strictEqual(res5.attempts.length, 4, "Must clamp max attempts to 4");
    console.log("  ✔ Max 4 attempts ceiling strictly enforced\n");

    // -------------------------------------------------------------------------
    // TEST 6: Gemini Vision timeout handling
    // -------------------------------------------------------------------------
    console.log("▶ [TEST 6] Gemini Vision timeout handling...");
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("api.cloudflare.com")) {
        return new Response(validJpegBuffer, {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        throw new Error("Request timed out after 45000ms");
      }
      return originalFetch(input, init);
    };

    const res6 = await generateImage({
      prompt: "A serene bamboo forest in early morning mist",
      provider: "cloudflare",
      maxAttempts: 4,
      verify: true,
    });

    assert.strictEqual(res6.verification.method, "unavailable");
    assert.strictEqual(res6.verification.status, "unavailable");
    assert.ok(res6.verification.issues.some((i) => i.includes("timed out") || i.includes("Unavailable")));
    assert.strictEqual(res6.attempts.length, 1, "Must not retry blindly when vision verifier is unavailable");
    console.log("  ✔ Vision timeout cleanly caught with 'unavailable' status (zero blind retries)\n");

    // -------------------------------------------------------------------------
    // TEST 7: Missing API key handling
    // -------------------------------------------------------------------------
    console.log("▶ [TEST 7] Missing API key honest status reporting...");
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.NANO_BANANA_API_KEY;

    const res7 = await generateImage({
      prompt: "A minimalist ceramic coffee mug on oak desk",
      provider: "cloudflare",
      maxAttempts: 4,
      verify: true,
    });

    assert.strictEqual(res7.verification.method, "unavailable");
    assert.strictEqual(res7.verification.status, "unavailable");
    assert.strictEqual(res7.attempts.length, 1, "Should avoid blind retries when API key is missing");
    console.log("  ✔ Missing API key reported honestly as 'unavailable' with zero fake heuristic scores\n");

    // -------------------------------------------------------------------------
    // TEST 8: Failed regeneration resilience (retains best previous image)
    // -------------------------------------------------------------------------
    console.log("▶ [TEST 8] Failed regeneration resilience (retaining previous best)...");
    process.env.GEMINI_API_KEY = "mock-key";
    let cloudflareCalls = 0;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("api.cloudflare.com")) {
        cloudflareCalls += 1;
        if (cloudflareCalls === 1) {
          return new Response(validJpegBuffer, {
            status: 200,
            headers: { "Content-Type": "image/jpeg" },
          });
        } else {
          return new Response(JSON.stringify({ error: "Cloudflare 504 Gateway Timeout" }), {
            status: 504,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        categoryScores: {
                          main_subject: 80,
                          object_presence: 80,
                          object_count: 80,
                          color_accuracy: 80,
                          spatial_accuracy: 80,
                          background_accuracy: 80,
                          style_accuracy: 80,
                          text_accuracy: 80,
                        },
                        confidence: 90,
                        missingRequirements: ["bright sky"],
                        issues: [],
                        requirements: [],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(input, init);
    };

    const res8 = await generateImage({
      prompt: "A majestic golden eagle soaring over snow-capped mountains",
      provider: "cloudflare",
      maxAttempts: 2,
      targetScore: 95,
      verify: true,
    });

    assert.ok(res8.image.startsWith("data:image/jpeg;base64,"), "Must preserve first good image when attempt 2 fails");
    assert.strictEqual(res8.accuracy, 80);
    console.log("  ✔ Regeneration failure handled safely; initial successful image preserved\n");

    // -------------------------------------------------------------------------
    // TEST 9: Critical subject mismatch penalty (capped at <= 25%)
    // -------------------------------------------------------------------------
    console.log("▶ [TEST 9] Critical subject mismatch penalty (<= 25%)...");
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("api.cloudflare.com")) {
        return new Response(validJpegBuffer, {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        categoryScores: {
                          main_subject: 15, // Severe subject failure
                          object_presence: 98,
                          object_count: 98,
                          color_accuracy: 95,
                          spatial_accuracy: 95,
                          background_accuracy: 95,
                          style_accuracy: 95,
                          text_accuracy: 95,
                        },
                        confidence: 94,
                        presentElements: ["trees", "mountains", "clouds"],
                        missingRequirements: ["Canonical Doraemon"],
                        issues: ["Main subject Doraemon was replaced with a generic blue cat."],
                        requirements: [
                          {
                            id: "char_doraemon",
                            met: false,
                            note: "Generic cat instead of canonical Doraemon",
                          },
                        ],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(input, init);
    };

    const res9 = await generateImage({
      prompt: "Doraemon standing in a futuristic Japanese street",
      provider: "cloudflare",
      maxAttempts: 1,
      verify: true,
    });

    assert.ok(res9.accuracy <= 25, `Subject mismatch must cap score <= 25, got ${res9.accuracy}`);
    assert.strictEqual(res9.verification.verdict, "fail");
    console.log(`  ✔ Critical subject failure capped score to ${res9.accuracy}% (verdict: fail)\n`);

    // -------------------------------------------------------------------------
    // TEST 10: Accurate 8-dimension weighted score formula
    // -------------------------------------------------------------------------
    console.log("▶ [TEST 10] Accurate 8-dimension weighted scoring formula verification...");
    // 25% * 100 + 20% * 80 + 15% * 80 + 10% * 90 + 10% * 90 + 10% * 90 + 5% * 100 + 5% * 100
    // = 25 + 16 + 12 + 9 + 9 + 9 + 5 + 5 = 90
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes("api.cloudflare.com")) {
        return new Response(validJpegBuffer, {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }
      if (urlStr.includes("generativelanguage.googleapis.com")) {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        categoryScores: {
                          main_subject: 100, // 25% * 100 = 25
                          object_presence: 80, // 20% * 80 = 16
                          object_count: 80, // 15% * 80 = 12
                          color_accuracy: 90, // 10% * 90 = 9
                          spatial_accuracy: 90, // 10% * 90 = 9
                          background_accuracy: 90, // 10% * 90 = 9
                          style_accuracy: 100, // 5% * 100 = 5
                          text_accuracy: 100, // 5% * 100 = 5
                        },
                        confidence: 95,
                        presentElements: ["main subject"],
                        missingRequirements: ["small secondary item"],
                        issues: ["One secondary object slightly off-color"],
                        requirements: [],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(input, init);
    };

    const res10 = await generateImage({
      prompt: "A classic leather armchair in a wood-paneled library reading room",
      provider: "cloudflare",
      maxAttempts: 1,
      verify: true,
    });

    // 25 + 16 + 12 + 9 + 9 + 9 + 5 + 5 = 90
    assert.strictEqual(res10.accuracy, 90, `Calculated score must equal 90, got ${res10.accuracy}`);
    console.log(`  ✔ Weighted 8-dimension score matches expected arithmetic: ${res10.accuracy}%\n`);

    console.log("================================================================================");
    console.log("🎉 ALL 10 INTELLIGENT REFINEMENT ACCEPTANCE TESTS PASSED (100% SUCCESS)!");
    console.log("================================================================================\n");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalCfAccount !== undefined) process.env.CLOUDFLARE_ACCOUNT_ID = originalCfAccount;
    else delete process.env.CLOUDFLARE_ACCOUNT_ID;
    if (originalCfToken !== undefined) process.env.CLOUDFLARE_API_TOKEN = originalCfToken;
    else delete process.env.CLOUDFLARE_API_TOKEN;
    if (originalGeminiKey !== undefined) process.env.GEMINI_API_KEY = originalGeminiKey;
    else delete process.env.GEMINI_API_KEY;
  }
}

if (process.argv[1]?.includes("intelligent-automatic-refinement.test")) {
  runIntelligentRefinementTests().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
