/**
 * TATTVA AI - Advanced Web Research Engine Types
 * Phase 5 Specification: Authoritative web search, multi-source fact comparison,
 * conflict resolution, date identification, and zero-fabrication citations.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type SourceAuthorityTier = "official_doc" | "academic_gov" | "established_pub" | "secondary";

export interface WebResearchSource {
  id: number;
  url: string;
  title: string;
  domain: string;
  authorityTier: SourceAuthorityTier;
  publishedDate?: string;
  extractedSnippet: string;
  fullLength: number;
  isAccessible: boolean;
  fetchedAt: string;
  error?: string;
}

export interface ExtractedFact {
  id: string;
  statement: string;
  sourceId: number;
  sourceUrl: string;
  sourceDomain: string;
  authorityTier: SourceAuthorityTier;
  publishedDate?: string;
  confidence: "high" | "medium" | "low";
  corroboratedBySources: number[];
}

export interface ConflictingEvidence {
  aspect: string;
  claimA: {
    statement: string;
    sourceId: number;
    sourceUrl: string;
    sourceDomain: string;
    publishedDate?: string;
    authorityTier: SourceAuthorityTier;
  };
  claimB: {
    statement: string;
    sourceId: number;
    sourceUrl: string;
    sourceDomain: string;
    publishedDate?: string;
    authorityTier: SourceAuthorityTier;
  };
  resolution: string;
  isDateShift: boolean; // true if one claim is newer and supersedes the other
}

export interface SourceComparison {
  dimension: string;
  perspectives: Array<{
    sourceId: number;
    sourceDomain: string;
    authorityTier: SourceAuthorityTier;
    publishedDate?: string;
    stance: string;
  }>;
}

export interface ResearchDossier {
  query: string;
  timestamp: string;
  executiveSummary: string;
  keyFindings: string[];
  extractedFacts: ExtractedFact[];
  comparisons: SourceComparison[];
  conflictingEvidence: ConflictingEvidence[];
  uncertainties: string[];
  sources: WebResearchSource[];
  citations: Array<{
    id: number;
    title: string;
    url: string;
    domain: string;
    authorityTier: SourceAuthorityTier;
    publishedDate?: string;
  }>;
  markdownReport: string;
  executionDurationMs: number;
}
