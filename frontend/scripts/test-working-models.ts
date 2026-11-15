import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { GoogleGenAI } from "@google/genai";

async function testWorkingModels() {
  const apiKey = process.env.GEMINI_API_KEY?.replace(/^["']|["']$/g, "").trim();
  const ai = new GoogleGenAI({ apiKey });

  const models = [
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-pro-latest",
  ];

  for (const m of models) {
    try {
      const t0 = Date.now();
      const res = await ai.models.generateContent({
        model: m,
        contents: "Respond with the single word: READY",
      });
      console.log(`[WORKING] Model: '${m}', Latency: ${Date.now() - t0}ms, Response: "${res.text?.trim()}"`);
    } catch (e: any) {
      console.log(`[FAILED] Model: '${m}', Error: ${e.message?.slice(0, 100)}`);
    }
  }
}

testWorkingModels();
