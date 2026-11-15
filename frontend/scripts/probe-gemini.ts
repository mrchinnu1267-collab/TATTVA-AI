import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { GoogleGenAI } from "@google/genai";

async function probeGemini() {
  const apiKey = process.env.GEMINI_API_KEY?.replace(/^["']|["']$/g, "").trim();
  const ai = new GoogleGenAI({ apiKey });

  const testList = [
    "gemini-3.8-flash",
    "gemini-3.8-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-8b",
  ];

  for (const m of testList) {
    try {
      const t0 = Date.now();
      const res = await ai.models.generateContent({
        model: m,
        contents: "Respond with the single word: READY",
      });
      console.log(`[Gemini SUCCESS] Model: '${m}', Latency: ${Date.now() - t0}ms, Response: "${res.text?.trim()}"`);
    } catch (e: any) {
      console.log(`[Gemini ERROR] Model: '${m}', Code: ${e.status || e.code}, Message: ${e.message?.slice(0, 150)}`);
    }
  }
}

probeGemini();
