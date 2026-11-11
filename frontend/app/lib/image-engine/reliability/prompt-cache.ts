/**
 * TATTVA AI - Intelligent Request Deduplication & Prompt Cache (Phase K)
 * Caches structured prompt understanding specifications and requirement checklists
 * to eliminate redundant semantic decomposition and accelerate pipeline execution.
 */

import { StructuredGenerationSpec, RequirementValidationItem } from "../accuracy/types";

export interface CachedPromptAnalysis {
  promptHash: string;
  normalizedPrompt: string;
  structuredSpec: StructuredGenerationSpec;
  checklist: RequirementValidationItem[];
  cachedAt: number;
  hits: number;
}

const MAX_CACHE_ENTRIES = 100;
const CACHE_TTL_MS = 3_600_000; // 1 hour

const memoryCache = new Map<string, CachedPromptAnalysis>();

/**
 * Deterministically hashes a prompt string for idempotency and cache lookups.
 */
export function hashPrompt(prompt: string, referenceImage?: string): string {
  const normalized = prompt.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }

  const prefix = referenceImage ? `ref-${referenceImage.length}-` : "txt-";
  return `${prefix}${Math.abs(hash).toString(36)}`;
}

/**
 * Looks up cached analysis for a prompt.
 */
export function getCachedPromptAnalysis(
  prompt: string,
  referenceImage?: string
): CachedPromptAnalysis | null {
  const hash = hashPrompt(prompt, referenceImage);
  const entry = memoryCache.get(hash);

  if (!entry) {
    return null;
  }

  // Check TTL expiration
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    memoryCache.delete(hash);
    return null;
  }

  entry.hits++;
  return entry;
}

/**
 * Stores parsed prompt specification and requirement checklist into the cache.
 */
export function storeCachedPromptAnalysis(
  prompt: string,
  spec: StructuredGenerationSpec,
  checklist: RequirementValidationItem[],
  referenceImage?: string
): void {
  const hash = hashPrompt(prompt, referenceImage);

  // LRU Eviction if capacity exceeded
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) {
      memoryCache.delete(oldestKey);
    }
  }

  memoryCache.set(hash, {
    promptHash: hash,
    normalizedPrompt: prompt.trim().toLowerCase(),
    structuredSpec: spec,
    checklist,
    cachedAt: Date.now(),
    hits: 0,
  });
}

/**
 * Clears the prompt cache (useful for testing and memory cleanup).
 */
export function clearPromptCache(): void {
  memoryCache.clear();
}

/**
 * Returns cache hit / size diagnostics.
 */
export function getPromptCacheStats(): { size: number; totalHits: number } {
  let totalHits = 0;
  for (const entry of memoryCache.values()) {
    totalHits += entry.hits;
  }
  return {
    size: memoryCache.size,
    totalHits,
  };
}

