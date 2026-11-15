import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { GoogleGenAI } from "@google/genai";

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY?.replace(/^["']|["']$/g, "").trim();
  const ai = new GoogleGenAI({ apiKey });

  try {
    const pager = await ai.models.list();
    console.log("Listing models from ai.models.list():");
    let count = 0;
    for await (const model of pager) {
      console.log(`- ${model.name} (displayName: ${model.displayName})`);
      count++;
      if (count >= 25) break;
    }
  } catch (e: any) {
    console.error("List models error:", e.message);
  }
}

listModels();
