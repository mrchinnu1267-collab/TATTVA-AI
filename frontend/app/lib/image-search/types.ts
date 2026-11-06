/**
 * TATTVA AI - Web Image Search Engine Core Types
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type ImageCategory =
  | "all"
  | "photograph"
  | "illustration"
  | "wallpaper"
  | "3d"
  | "nature"
  | "animals"
  | "automotive"
  | "architecture"
  | "technology"
  | "people"
  | "art";

export type ImageOrientation = "all" | "landscape" | "portrait" | "square";
export type ImageSize = "all" | "small" | "medium" | "large";
export type ImageProviderId = "all" | "openverse" | "wikimedia";

export interface ImageSearchResultItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  source: string;
  sourceUrl: string;
  creator?: string;
  creatorUrl?: string;
  license?: string;
  licenseUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  provider: "openverse" | "wikimedia" | "web";
  category?: ImageCategory;
  tags?: string[];
  relevanceScore?: number;
}

export interface SearchFilters {
  type?: ImageCategory;
  orientation?: ImageOrientation;
  size?: ImageSize;
  provider?: ImageProviderId;
  license?: string;
}

export interface SearchQueryOptions {
  query: string;
  page?: number;
  pageSize?: number;
  filters?: SearchFilters;
}

export interface SearchEngineResponse {
  query: string;
  page: number;
  pageSize: number;
  totalResults: number;
  results: ImageSearchResultItem[];
  relatedSearches: string[];
  detectedCategory?: ImageCategory;
  latencyMs: number;
  providersUsed: string[];
}

export interface SearchSuggestionItem {
  text: string;
  category?: string;
  type?: "history" | "popular" | "trending";
}

export interface ImageProviderAdapter {
  id: "openverse" | "wikimedia";
  name: string;
  search(options: SearchQueryOptions): Promise<{
    results: ImageSearchResultItem[];
    total: number;
  }>;
}

