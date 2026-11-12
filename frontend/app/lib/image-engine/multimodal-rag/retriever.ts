/**
 * TATTVA AI - Multimodal Image RAG Retriever
 * Performs Query Decomposition, Semantic & Lexical Search,
 * Cross-Modal Reranking, and Context Aggregation.
 */

import {
  MultimodalRetrievalQuery,
  MultimodalRetrievalResult,
  RetrievedReferenceMatch,
  VisualDomain,
} from "./types";
import { AspectRatio, ImageStyle } from "../types";
import { visualKnowledgeDB } from "./vector-db";

/**
 * Decomposes and expands user prompt into structured visual queries
 */
export function decomposeAndExpandQuery(
  rawPrompt: string,
  styleHint?: string,
  aspectHint?: string,
  referenceImage?: string
): MultimodalRetrievalQuery {
  const clean = rawPrompt.trim();
  const lower = clean.toLowerCase();

  // 1. Detect Domain
  let domain: VisualDomain | undefined;
  if (/building|villa|skyscraper|museum|house|facade|cathedral|temple|architecture/i.test(lower)) {
    domain = "architecture";
  } else if (/cyberpunk|futuristic|flying\s+car|spaceship|sci-fi|neon\s+city/i.test(lower)) {
    domain = "cyberpunk";
  } else if (/mountain|lake|forest|ocean|river|desert|sunrise|sunset|landscape|nature/i.test(lower)) {
    domain = "nature";
  } else if (/watch|phone|shoe|bottle|perfume|product|gadget|car|commercial/i.test(lower)) {
    domain = "product";
  } else if (/portrait|face|man|woman|elderly|person|warrior|character|model/i.test(lower)) {
    domain = "character";
  } else if (/poster|typography|logo|flyer|banner|graphic\s+design/i.test(lower)) {
    domain = "posters";
  } else if (/living\s+room|interior|bedroom|kitchen|loft|furniture|decor/i.test(lower)) {
    domain = "interior";
  } else if (/anime|manga|ghibli|cel\s+shaded|illustration/i.test(lower)) {
    domain = "fantasy";
  }

  // 2. Query Decomposition
  // Extract Subject
  let subjectQuery = clean;
  // Extract Lighting keywords
  let lightingQuery = "natural cinematic ambient lighting";
  const lightMatch = lower.match(/(?:golden\s+hour|blue\s+hour|neon\s+glow|volumetric|chiaroscuro|diffused|studio\s+light|direct\s+sunlight|twilight|candlelight|dramatic\s+lighting)/i);
  if (lightMatch) {
    lightingQuery = lightMatch[0];
  }

  // Extract Composition keywords
  let compositionQuery = "balanced composition";
  const compMatch = lower.match(/(?:rule\s+of\s+thirds|centered\s+symmetry|leading\s+lines|wide\s+angle|macro|close-up|aerial|panoramic|eye-level|low-angle|high-angle)/i);
  if (compMatch) {
    compositionQuery = compMatch[0];
  }

  // Extract Style keywords
  let styleQuery = styleHint || "photorealistic";
  const styleMatch = lower.match(/(?:photorealistic|cinematic|anime|3d\s+render|minimalist|vintage|oil\s+painting|watercolour|concept\s+art)/i);
  if (styleMatch) {
    styleQuery = styleMatch[0];
  }

  // 3. Query Expansion: Add relevant aesthetic terminology
  const expandedTerms: string[] = [];
  if (domain === "architecture") {
    expandedTerms.push("tilt-shift 24mm", "structural elegance", "material texture");
  } else if (domain === "cyberpunk") {
    expandedTerms.push("volumetric neon mist", "anamorphic reflections", "chromatic depth");
  } else if (domain === "product") {
    expandedTerms.push("studio rim lighting", "micro-contrast", "tactile surface detail");
  } else if (domain === "character") {
    expandedTerms.push("natural catchlights", "skin pore fidelity", "subsurface scattering");
  } else if (domain === "nature") {
    expandedTerms.push("atmospheric haze", "dynamic range", "hyperfocal depth");
  }

  return {
    originalPrompt: clean,
    subQueries: {
      subjectQuery,
      styleQuery,
      compositionQuery,
      lightingQuery,
    },
    expandedTerms,
    filters: {
      domain,
      style: (styleHint as ImageStyle) || undefined,
      aspectRatio: (aspectHint as AspectRatio) || undefined,
    },
    referenceImage,
  };
}

/**
 * Cross-Encoder / Multimodal Reranking
 * Reranks retrieved candidates based on exact alignment with user's core intent
 */
export function rerankCandidates(
  query: MultimodalRetrievalQuery,
  candidates: Array<{ item: any; score: number; semanticScore: number; lexicalScore: number }>
): RetrievedReferenceMatch[] {
  const userPromptLower = query.originalPrompt.toLowerCase();

  return candidates.map((cand) => {
    let rerankScore = cand.score;
    const matchedAttributes: string[] = [];

    // Boost if candidate's lighting aligns with user request
    if (userPromptLower.includes("golden hour") && /golden hour/i.test(cand.item.lighting)) {
      rerankScore += 0.15;
      matchedAttributes.push("Lighting: Golden hour");
    } else if (userPromptLower.includes("neon") && /neon/i.test(cand.item.lighting)) {
      rerankScore += 0.15;
      matchedAttributes.push("Lighting: Neon glow");
    } else if (userPromptLower.includes("candle") && /candle/i.test(cand.item.lighting)) {
      rerankScore += 0.15;
      matchedAttributes.push("Lighting: Candlelight");
    }

    // Boost if candidate's composition matches
    if (userPromptLower.includes("wide") && /wide|panoramic/i.test(cand.item.composition)) {
      rerankScore += 0.12;
      matchedAttributes.push("Composition: Wide cinematic view");
    } else if (userPromptLower.includes("macro") && /macro/i.test(cand.item.cameraAngle)) {
      rerankScore += 0.12;
      matchedAttributes.push("Camera: Macro close-up");
    }

    // Boost if candidate's domain aligns
    if (query.filters?.domain && cand.item.domain === query.filters.domain) {
      rerankScore += 0.1;
      matchedAttributes.push(`Domain: ${cand.item.domain}`);
    }

    // Visual similarity estimate (0.7-0.95 for top matches)
    const visualScore = Math.min(1.0, cand.semanticScore * 0.9 + 0.1);

    return {
      item: cand.item,
      semanticScore: Number(cand.semanticScore.toFixed(3)),
      visualScore: Number(visualScore.toFixed(3)),
      hybridScore: Number(cand.score.toFixed(3)),
      rerankScore: Number(Math.min(1.0, rerankScore).toFixed(3)),
      matchedAttributes: matchedAttributes.length > 0 ? matchedAttributes : ["Semantic context alignment"],
    };
  }).sort((a, b) => b.rerankScore - a.rerankScore);
}

/**
 * Aggregates retrieved visual references into concrete visual conditioning guidance
 * without overriding user's explicit instructions
 */
export function aggregateVisualContext(
  userPrompt: string,
  matches: RetrievedReferenceMatch[]
): string {
  if (matches.length === 0) return "";

  const primary = matches[0];
  const parts: string[] = [];
  const lowerPrompt = userPrompt.toLowerCase();

  // Strict Protection: Check whether user specified colors, lighting, or composition
  const hasUserColor = /\b(red|blue|green|yellow|orange|purple|pink|black|white|brown|gold|silver|cyan|magenta|teal|crimson|emerald|navy|gray|grey|beige|ivory|maroon|saffron|coral|amber)\b/i.test(lowerPrompt);
  const hasUserLighting = /\b(lighting|light|glow|sunlight|illumination|golden hour|blue hour|moonlit|neon|studio|dramatic|candlelight|volumetric)\b/i.test(lowerPrompt);
  const hasUserComposition = /\b(close-up|macro|wide-angle|panoramic|aerial|portrait|landscape|top-down|centered|rule of thirds|50mm|85mm|35mm|framing)\b/i.test(lowerPrompt);

  // 1. Lighting guidance ONLY if user did not specify lighting
  if (!hasUserLighting && primary.item.lighting) {
    parts.push(`Subtle lighting aesthetic: ${primary.item.lighting}.`);
  }

  // 2. Composition & Camera guidance ONLY if user did not specify composition
  if (!hasUserComposition && primary.item.cameraAngle && primary.item.composition) {
    parts.push(`Camera framing: ${primary.item.cameraAngle}, ${primary.item.composition}.`);
  }

  // 3. Dominant Color Harmony ONLY if user did NOT specify colors
  if (!hasUserColor && primary.item.dominantColors && primary.item.dominantColors.length > 0) {
    parts.push(`Color tone aesthetic: [${primary.item.dominantColors.slice(0, 3).join(", ")}].`);
  }

  return parts.join(" ");
}

/**
 * Main Multimodal Retrieval Pipeline
 */
export async function retrieveVisualContext(params: {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  referenceImage?: string;
  maxResults?: number;
}): Promise<MultimodalRetrievalResult> {
  // 1. Query Decomposition & Expansion
  const query = decomposeAndExpandQuery(
    params.prompt,
    params.style,
    params.aspectRatio,
    params.referenceImage
  );

  // 2. Search Visual Knowledge Database
  const searchResults = await visualKnowledgeDB.search({
    queryText: `${query.originalPrompt} ${query.expandedTerms.join(" ")}`,
    style: query.filters?.style,
    aspectRatio: query.filters?.aspectRatio,
    domain: query.filters?.domain,
    limit: params.maxResults || 4,
    minScore: 0.3,
  });

  // 3. Rerank candidates
  const reranked = rerankCandidates(query, searchResults);

  // 4. Select recommended conditioning method
  let recommendedConditioning: any = "text-guided";
  if (params.referenceImage) {
    const p = params.prompt.toLowerCase();
    if (p.includes("change the background") || p.includes("replace background")) {
      recommendedConditioning = "inpainting";
    } else if (p.includes("composition") || p.includes("same layout") || p.includes("pose")) {
      recommendedConditioning = "controlnet-depth";
    } else if (p.includes("style of") || p.includes("in the style")) {
      recommendedConditioning = "style-transfer";
    } else {
      recommendedConditioning = "reference-guided";
    }
  } else if (reranked.length > 0 && reranked[0].rerankScore >= 0.75) {
    recommendedConditioning = reranked[0].item.conditioningTypes[0] || "ip-adapter";
  }

  // 5. Aggregate Visual Context
  const aggregatedVisualContext = aggregateVisualContext(params.prompt, reranked);

  return {
    query,
    matches: reranked,
    aggregatedVisualContext,
    recommendedConditioning,
    primaryReference: reranked[0]?.item,
  };
}

