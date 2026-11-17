/**
 * TATTVA AI - Fact Extraction, Cross-Source Corroboration & Conflict Resolution
 * Analyzes multi-source crawled evidence, dates, and conflicting claims.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import {
  WebResearchSource,
  ExtractedFact,
  ConflictingEvidence,
  SourceComparison,
  SourceAuthorityTier,
} from "./types";

/**
 * Extracts discrete factual assertions from text content
 */
export function extractFactualStatements(source: WebResearchSource): ExtractedFact[] {
  if (!source.isAccessible || !source.extractedSnippet) return [];

  const sentences = source.extractedSnippet
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 250);

  const facts: ExtractedFact[] = [];
  const candidateSentences = sentences.slice(0, 10); // Top 10 key informative sentences

  for (let idx = 0; idx < candidateSentences.length; idx++) {
    const s = candidateSentences[idx];
    // Filter out purely navigational or boilerplate sentences
    if (
      s.toLowerCase().includes("cookie") ||
      s.toLowerCase().includes("privacy policy") ||
      s.toLowerCase().includes("subscribe") ||
      s.toLowerCase().includes("all rights reserved")
    ) {
      continue;
    }

    // Determine initial confidence based on source authority tier
    let confidence: "high" | "medium" | "low" = "medium";
    if (source.authorityTier === "official_doc" || source.authorityTier === "academic_gov") {
      confidence = "high";
    } else if (source.authorityTier === "secondary") {
      confidence = "low";
    }

    facts.push({
      id: `fact_${source.id}_${idx + 1}`,
      statement: s,
      sourceId: source.id,
      sourceUrl: source.url,
      sourceDomain: source.domain,
      authorityTier: source.authorityTier,
      publishedDate: source.publishedDate,
      confidence,
      corroboratedBySources: [source.id],
    });
  }

  return facts;
}

/**
 * Corroborates facts across multiple independent sources and elevates confidence
 */
export function corroborateFactsAcrossSources(allFacts: ExtractedFact[]): ExtractedFact[] {
  const corroborated: ExtractedFact[] = [];

  for (const fact of allFacts) {
    const words = new Set(
      fact.statement
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 4)
    );

    const matchingSourceIds = new Set<number>([fact.sourceId]);

    for (const other of allFacts) {
      if (other.sourceId === fact.sourceId) continue;
      const otherWords = other.statement
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 4);

      let overlap = 0;
      for (const ow of otherWords) {
        if (words.has(ow)) overlap++;
      }

      const jaccard = overlap / Math.max(1, words.size + otherWords.length - overlap);
      if (jaccard > 0.35) {
        matchingSourceIds.add(other.sourceId);
      }
    }

    const corroborationList = Array.from(matchingSourceIds);
    let finalConfidence = fact.confidence;
    if (corroborationList.length >= 2) {
      finalConfidence = "high";
    }

    corroborated.push({
      ...fact,
      confidence: finalConfidence,
      corroboratedBySources: corroborationList,
    });
  }

  return corroborated;
}

/**
 * Identifies conflicting evidence or date drift across sources
 */
export function detectConflictsAndDateShifts(
  sources: WebResearchSource[],
  facts: ExtractedFact[]
): {
  conflicts: ConflictingEvidence[];
  comparisons: SourceComparison[];
  uncertainties: string[];
} {
  const conflicts: ConflictingEvidence[] = [];
  const comparisons: SourceComparison[] = [];
  const uncertainties: string[] = [];

  // 1. Check for temporal / date shifts
  const datedSources = sources.filter((s) => s.publishedDate);
  if (datedSources.length >= 2) {
    datedSources.sort(
      (a, b) => new Date(b.publishedDate!).getTime() - new Date(a.publishedDate!).getTime()
    );

    const newest = datedSources[0];
    const older = datedSources[datedSources.length - 1];

    if (newest.publishedDate && older.publishedDate && newest.publishedDate !== older.publishedDate) {
      const yearNewest = new Date(newest.publishedDate).getFullYear();
      const yearOlder = new Date(older.publishedDate).getFullYear();

      if (!isNaN(yearNewest) && !isNaN(yearOlder) && yearNewest > yearOlder) {
        conflicts.push({
          aspect: "Temporal Currency & Version Shift",
          claimA: {
            statement: `Latest report from ${newest.domain} (${newest.publishedDate}) represents updated findings or release data.`,
            sourceId: newest.id,
            sourceUrl: newest.url,
            sourceDomain: newest.domain,
            publishedDate: newest.publishedDate,
            authorityTier: newest.authorityTier,
          },
          claimB: {
            statement: `Prior documentation from ${older.domain} (${older.publishedDate}) reflects historical baseline.`,
            sourceId: older.id,
            sourceUrl: older.url,
            sourceDomain: older.domain,
            publishedDate: older.publishedDate,
            authorityTier: older.authorityTier,
          },
          resolution: `Prioritized the newer finding from ${newest.domain} (${yearNewest}) over older data (${yearOlder}) while preserving historical reference.`,
          isDateShift: true,
        });
      }
    }
  }

  // 2. Build multi-source comparisons by domain and authority tier
  const perspectivesByDomain = sources
    .filter((s) => s.isAccessible && s.extractedSnippet.length > 50)
    .map((s) => ({
      sourceId: s.id,
      sourceDomain: s.domain,
      authorityTier: s.authorityTier,
      publishedDate: s.publishedDate,
      stance: s.extractedSnippet.slice(0, 180) + "...",
    }));

  if (perspectivesByDomain.length > 1) {
    comparisons.push({
      dimension: "Authoritative Perspective & Context",
      perspectives: perspectivesByDomain,
    });
  }

  // 3. Detect uncertainties
  const uncorroboratedSecondary = facts.filter(
    (f) => f.authorityTier === "secondary" && f.corroboratedBySources.length <= 1
  );
  if (uncorroboratedSecondary.length > 0) {
    uncertainties.push(
      `${uncorroboratedSecondary.length} secondary assertion(s) lack official documentation or multi-source corroboration and have been marked with cautious confidence.`
    );
  }

  if (sources.some((s) => !s.isAccessible)) {
    const inaccessible = sources.filter((s) => !s.isAccessible);
    uncertainties.push(
      `${inaccessible.length} potential reference(s) could not be crawled or were blocked: [${inaccessible.map((s) => s.domain).join(", ")}].`
    );
  }

  return { conflicts, comparisons, uncertainties };
}
