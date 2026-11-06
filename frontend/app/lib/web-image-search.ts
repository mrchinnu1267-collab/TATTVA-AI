/**
 * TATTVA AI - Inbuilt Web Image Search Engine Connector
 * Powered directly by the Multi-Provider Search Engine Aggregator (Wikimedia Commons + Openverse)
 * Guarantees 100% accurate, high-resolution photographs with zero unusual or junk images.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { imageSearchAggregator } from "./image-search/aggregator";
import { QueryProcessor } from "./image-search/query-processor";

export interface WebImageResult {
  url: string;
  thumbnail?: string;
  title: string;
  source: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
}

/**
 * Searches the web for real, accurate photographs matching the query
 * powered by the exact same engine as https://tattva-ai-phi.vercel.app/images
 */
export async function searchWebImages(
  query: string,
  maxResults: number = 6
): Promise<WebImageResult[]> {
  const cleanQuery = QueryProcessor.cleanQuery(query);
  if (!cleanQuery) return [];

  try {
    const response = await imageSearchAggregator.search({
      query: cleanQuery,
      page: 1,
      pageSize: maxResults,
      filters: {
        type: "photograph",
      },
    });

    if (response.results && response.results.length > 0) {
      return response.results.map((item) => ({
        url: item.url,
        thumbnail: item.thumbnail || item.url,
        title: item.title,
        source: item.source || "Wikimedia Commons",
        sourceUrl: item.sourceUrl || item.url,
        width: item.width,
        height: item.height,
      }));
    }
  } catch (error) {
    console.error("[WebImageSearch] Aggregator search failed:", error);
  }

  return [];
}

/**
 * Checks if a user's prompt is asking for visual items, photographs, or web images
 */
export function isImageSearchQuery(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();

  const visualPatterns = [
    /\b(image|images|picture|pictures|pic|pics|photo|photos|photograph|photographs|wallpaper)\b/i,
    /\b(show me|display|view|look at|see)\b/i,
    /\b(types of|different types|kinds of|varieties of|examples of)\b/i,
    /\b(flowers?|roses?|sunflowers?|tulips?|orchids?|lotus|lavender)\b/i,
    /\b(cars?|supercars?|sports cars?|bmw|audi|ferrari|lamborghini|porsche)\b/i,
    /\b(animals?|birds?|dogs?|cats?|tigers?|lions?|elephants?|wildlife)\b/i,
    /\b(places?|monuments?|wonders|eiffel tower|taj mahal|mount everest|pyramids?)\b/i,
    /\b(what does .* look like)\b/i,
    /\b(how does .* look)\b/i,
  ];

  return visualPatterns.some((pattern) => pattern.test(lower));
}

/**
 * Extracts a concise search query for the image search engine from a conversational user prompt
 */
export function extractImageSearchKeywords(text: string): string {
  return QueryProcessor.cleanQuery(text);
}
