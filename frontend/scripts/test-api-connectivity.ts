import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { GoogleGenAI } from "@google/genai";

async function testGeminiModels() {
  const geminiKey = process.env.GEMINI_API_KEY?.replace(/^["']|["']$/g, "").trim();
  if (!geminiKey) {
    console.error("No GEMINI_API_KEY");
    return;
  }
  const ai = new GoogleGenAI({ apiKey: geminiKey });

  // Let's test the recommended models: gemini-3.8-flash, gemini-3.1-pro-preview, etc.
  const modelsToTest = [
    "gemini-3.8-flash",
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
  ];

  for (const m of modelsToTest) {
    try {
      const t0 = Date.now();
      const res = await ai.models.generateContent({
        model: m,
        contents: "Respond with exactly: HELLO_TATTVA",
      });
      console.log(`[SUCCESS] Model '${m}': ${res.text?.trim()} (Latency: ${Date.now() - t0}ms)`);
    } catch (e: any) {
      console.log(`[FAIL] Model '${m}': ${e.message}`);
    }
  }

  // Let's also check OpenRouter with a free or active model, e.g. openrouter/auto or google/gemini-2.0-flash-exp:free or meta-llama/llama-3.2-3b-instruct:free
  const openRouterKey = process.env.OPENROUTER_API_KEY?.replace(/^["']|["']$/g, "").trim();
  if (openRouterKey) {
    const orModels = [
      "google/gemini-2.0-flash-exp:free",
      "meta-llama/llama-3.2-3b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
      "openrouter/auto"
    ];
    for (const om of orModels) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: om,
            messages: [{ role: "user", content: "Reply with OK" }],
            max_tokens: 10,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          console.log(`[OpenRouter SUCCESS] Model '${om}': ${data.choices?.[0]?.message?.content?.trim()}`);
          break;
        } else {
          console.log(`[OpenRouter FAIL] Model '${om}': ${JSON.stringify(data.error?.message || data)}`);
        }
      } catch (e: any) {
        console.log(`[OpenRouter EXCEPTION] Model '${om}': ${e.message}`);
      }
    }
  }
}

testGeminiModels();
