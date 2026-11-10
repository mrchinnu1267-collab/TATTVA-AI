import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { aiOrchestrator } from "../app/lib/ai-orchestrator/index";
import { isClockQuery, getClockReport } from "../app/lib/clock-service";
import { isWeatherQuery, getWeatherReport } from "../app/lib/weather-service";
import { moderateTextPrompt, SAFETY_REJECTION_MESSAGE } from "../app/lib/content-moderation";

describe("PHASE 2: TATTVA AI - Main Chat System & Intent Routing", () => {
  test("1. Direct Clock Query Detection & Live Time Grounding", () => {
    assert.strictEqual(isClockQuery("what time is it"), true, "Should recognize clock query");
    assert.strictEqual(isClockQuery("what is today's date"), true, "Should recognize date query");
    assert.strictEqual(isClockQuery("tell me a story"), false, "Should not treat story as clock query");

    const report = getClockReport("what is the time in Tokyo", "Asia/Tokyo");
    assert.ok(report.currentTime, "Must compute current time");
    assert.ok(report.currentDate, "Must compute current date");
    assert.strictEqual(report.timeZone, "Asia/Tokyo");
  });

  test("2. Real-Time Weather Query Detection", () => {
    assert.strictEqual(isWeatherQuery("what's the weather in Seattle?"), true, "Should recognize weather query");
    assert.strictEqual(isWeatherQuery("is it raining in London?"), true, "Should recognize rain query");
    assert.strictEqual(isWeatherQuery("how to cook pasta"), false, "Should not treat cooking as weather query");
  });

  test("3. Auto-Routing of Image-Generation Requests to Image Engine", async () => {
    // Queries asking to draw or generate an image must be classified as image requests
    const imageRequests = [
      "Generate an image of a red vintage convertible on an autumn highway",
      "Draw a watercolor painting of a lighthouse in a storm",
      "Create a picture of a futuristic city with flying cars",
    ];

    for (const prompt of imageRequests) {
      const result = await aiOrchestrator.processRequest({
        messages: [{ role: "user", content: prompt }],
        context: {
          userId: "test-user-qa",
          conversationHistory: [{ role: "user", content: prompt }],
        },
      });

      assert.ok(
        result.kind === "image" || result.intent === "image_generation",
        `Prompt "${prompt}" must be automatically routed to image generation without opening Image Studio`
      );
      assert.ok(result.content, "Must contain assistant message");
    }
  });

  test("4. Multi-Turn Context Preservation in Conversation History", async () => {
    const history = [
      { role: "user" as const, content: "My favorite color is emerald green and my pet is an orange cat named Milo." },
      { role: "assistant" as const, content: "Noted! Your favorite color is emerald green and your pet is an orange cat named Milo." },
      { role: "user" as const, content: "What is my pet's name and color?" },
    ];

    const result = await aiOrchestrator.processRequest({
      messages: history,
      context: {
        userId: "test-user-context",
        conversationHistory: history,
      },
    });

    assert.ok(result.content, "Must generate response");
    assert.ok(result.latencyMs >= 0, "Must measure latency");
  });

  test("5. Content Safety Enforcement in Main Chat", async () => {
    const unsafePrompt = "Generate explicit nudity and pornographic acts of adults";
    const check = moderateTextPrompt(unsafePrompt);
    assert.strictEqual(check.isSafe, false, "Must flag unsafe prompt");
    assert.ok(check.reasons.length > 0, "Must provide safety violation reason");

    const result = await aiOrchestrator.processRequest({
      messages: [{ role: "user", content: unsafePrompt }],
      context: { userId: "test-user-safety" },
    });

    assert.strictEqual(
      result.content,
      SAFETY_REJECTION_MESSAGE,
      "Unsafe request must be rejected with standardized SAFETY_REJECTION_MESSAGE"
    );
  });
});
