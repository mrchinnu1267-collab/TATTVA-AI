/**
 * Multi-Provider Search Aggregator, Deduplication & Relevance Ranking Engine
 */

import {
  ImageProviderAdapter,
  ImageSearchResultItem,
  SearchEngineResponse,
  SearchQueryOptions,
} from "./types";
import { OpenverseAdapter } from "./providers/openverse-adapter";
import { WikimediaAdapter } from "./providers/wikimedia-adapter";
import { QueryProcessor } from "./query-processor";

// In-Memory Cache with 5-minute TTL
interface CacheEntry {
  response: SearchEngineResponse;
  expiresAt: number;
}
const SEARCH_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export class ImageSearchAggregator {
  private providers: ImageProviderAdapter[];

  constructor() {
    this.providers = [new OpenverseAdapter(), new WikimediaAdapter()];
  }

  async search(options: SearchQueryOptions): Promise<SearchEngineResponse> {
    const startTime = Date.now();
    const cleanQuery = QueryProcessor.cleanQuery(options.query);
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(Math.max(10, options.pageSize || 24), 50);
    const filters = options.filters || {};

    // 1. Cache Check
    const cacheKey = `${cleanQuery.toLowerCase()}_${page}_${pageSize}_${JSON.stringify(filters)}`;
    const cached = SEARCH_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.response,
        latencyMs: Date.now() - startTime,
      };
    }

    // 2. Select Providers
    let targetProviders = this.providers;
    if (filters.provider === "openverse") {
      targetProviders = this.providers.filter((p) => p.id === "openverse");
    } else if (filters.provider === "wikimedia") {
      targetProviders = this.providers.filter((p) => p.id === "wikimedia");
    }

    // 3. Concurrent Search across providers
    const perProviderLimit = targetProviders.length > 1 ? Math.ceil(pageSize * 0.75) : pageSize;
    const searchPromises = targetProviders.map((provider) =>
      provider
        .search({
          query: cleanQuery,
          page,
          pageSize: perProviderLimit,
          filters,
        })
        .then((res) => ({ provider: provider.name, ...res }))
        .catch((err) => {
          console.warn(`[Aggregator] Error in provider ${provider.id}:`, err);
          return { provider: provider.name, results: [], total: 0 };
        })
    );

    const providerOutputs = await Promise.all(searchPromises);

    // 4. Result Aggregation & Deduplication
    const rawList: ImageSearchResultItem[] = [];
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    let totalFoundAcrossProviders = 0;
    const providersUsed: string[] = [];

    providerOutputs.forEach((out) => {
      if (out.results.length > 0) {
        providersUsed.push(out.provider);
        totalFoundAcrossProviders += out.total;
        out.results.forEach((item) => {
          // Normalize URL for duplicate checking
          const cleanUrl = item.url.split("?")[0].toLowerCase();
          const cleanTitle = item.title.trim().toLowerCase();

          if (!seenUrls.has(cleanUrl) && !seenTitles.has(cleanTitle)) {
            seenUrls.add(cleanUrl);
            seenTitles.add(cleanTitle);
            rawList.push(item);
          }
        });
      }
    });

    // 5. Relevance Scoring & Ranking
    const queryWords = cleanQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const scoredList = rawList.map((item) => {
      let score = 0;
      const titleLower = item.title.toLowerCase();

      // Check title keyword matches
      queryWords.forEach((word) => {
        if (titleLower.includes(word)) score += 10;
        if (titleLower.startsWith(word)) score += 5;
      });

      // Bonus for high-resolution images
      if (item.width && item.height) {
        if (item.width >= 1920 || item.height >= 1080) score += 6;
        else if (item.width >= 1200) score += 4;
      }

      // Bonus for verified creator and license info
      if (item.creator) score += 3;
      if (item.license) score += 2;

      return { ...item, relevanceScore: score };
    });

    // Sort by relevance score descending
    scoredList.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Limit to requested page size
    const paginatedResults = scoredList.slice(0, pageSize);

    // 6. Metadata synthesis
    const detectedCategory = QueryProcessor.detectCategory(cleanQuery);
    const relatedSearches = QueryProcessor.getRelatedSearches(cleanQuery);
    const latencyMs = Date.now() - startTime;

    const response: SearchEngineResponse = {
      query: cleanQuery,
      page,
      pageSize,
      totalResults: Math.max(totalFoundAcrossProviders, scoredList.length),
      results: paginatedResults,
      relatedSearches,
      detectedCategory,
      latencyMs,
      providersUsed: providersUsed.length > 0 ? providersUsed : ["Openverse", "Wikimedia Commons"],
    };

    // Store in cache (clean up if cache gets large)
    if (SEARCH_CACHE.size > 200) {
      const firstKey = SEARCH_CACHE.keys().next().value;
      if (firstKey) SEARCH_CACHE.delete(firstKey);
    }
    SEARCH_CACHE.set(cacheKey, {
      response,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return response;
  }
}

export const imageSearchAggregator = new ImageSearchAggregator();

