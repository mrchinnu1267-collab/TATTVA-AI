import { GoogleGenAI } from "@google/genai";

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

/**
 * Generate a 3072-dimensional vector embedding for text using Gemini
 */
export async function generateTextEmbedding(text: string): Promise<number[] | null> {
  const clean = text.trim();
  if (!clean) return null;

  const ai = getGenAI();
  if (!ai) return null;

  try {
    const embedPromise = ai.models.embedContent({
      model: "text-embedding-004",
      contents: clean.slice(0, 2048),
    });

    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("Embedding request timed out")), 3500)
    );

    const resp: any = await Promise.race([embedPromise, timeoutPromise]);

    if (resp?.embeddings?.[0]?.values && resp.embeddings[0].values.length > 0) {
      return resp.embeddings[0].values;
    }
  } catch (err) {
    console.warn("[Embedding Service] Gemini embedding call failed, using fallback:", err);
  }
  return null;
}

/**
 * Cosine similarity between two vectors (-1 to 1, normalized to 0 to 1)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Normalize from [-1, 1] to [0, 1]
  return Math.max(0, Math.min(1, (similarity + 1) / 2));
}

/**
 * Keyword Token Overlap Fallback (Jaccard Similarity + Substring Matching)
 */
export function keywordRelevanceScore(query: string, text: string): number {
  const qTokens = new Set(
    query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  const tTokens = new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  if (qTokens.size === 0 || tTokens.size === 0) return 0;

  let matches = 0;
  for (const token of qTokens) {
    if (tTokens.has(token)) {
      matches++;
    } else {
      for (const tToken of tTokens) {
        if (tToken.includes(token) || token.includes(tToken)) {
          matches += 0.5;
          break;
        }
      }
    }
  }

  return Math.min(1, matches / Math.sqrt(qTokens.size * tTokens.size));
}
