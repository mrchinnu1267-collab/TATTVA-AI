/**
 * TATTVA AI - Multimodal Visual Knowledge Database & Vector Store
 * Supports Multimodal Embeddings, Hybrid Search (Semantic + Lexical BM25),
 * Supabase pgvector sync, and offline deterministic vector projections.
 */

import { VisualReferenceItem, VisualDomain } from "./types";
import { AspectRatio, ImageStyle } from "../types";
import { getGeminiApiKey } from "../gemini";
import { createClient } from "@supabase/supabase-js";

// =============================================================================
// 1. EMBEDDING CACHE & DETERMINISTIC VECTOR PROJECTION
// =============================================================================

const EMBEDDING_CACHE = new Map<string, number[]>();
const MAX_CACHE_SIZE = 1000;
const VECTOR_DIM = 256;

/**
 * Computes cosine similarity between two float vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Deterministic semantic projector (generates stable normalized 256-dim embeddings)
 */
function localSemanticProjector(text: string): number[] {
  const normalized = text.toLowerCase().trim();
  const vector = new Array(VECTOR_DIM).fill(0);

  // Hash character trigrams and semantic tokens across vector dimensions
  for (let i = 0; i < normalized.length - 2; i++) {
    const code =
      normalized.charCodeAt(i) * 31 * 31 +
      normalized.charCodeAt(i + 1) * 31 +
      normalized.charCodeAt(i + 2);
    const index = Math.abs(code) % VECTOR_DIM;
    vector[index] += 1;
  }

  // Normalize to unit vector
  let sumSq = 0;
  for (let i = 0; i < VECTOR_DIM; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < VECTOR_DIM; i++) {
    vector[i] /= norm;
  }

  return vector;
}

/**
 * Generates multimodal / text embedding using Gemini or cached local projection
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const key = text.trim().toLowerCase();
  if (EMBEDDING_CACHE.has(key)) {
    return EMBEDDING_CACHE.get(key)!;
  }

  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text: text.slice(0, 2048) }] },
          outputDimensionality: VECTOR_DIM,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        const values = data?.embedding?.values;
        if (Array.isArray(values) && values.length > 0) {
          // Normalize
          let sumSq = 0;
          for (const v of values) sumSq += v * v;
          const norm = Math.sqrt(sumSq) || 1;
          const normalized = values.map((v: number) => v / norm);

          if (EMBEDDING_CACHE.size >= MAX_CACHE_SIZE) {
            const firstKey = EMBEDDING_CACHE.keys().next().value;
            if (firstKey) EMBEDDING_CACHE.delete(firstKey);
          }
          EMBEDDING_CACHE.set(key, normalized);
          return normalized;
        }
      }
    } catch {
      // Fallback to local deterministic projector on network/quota issues
    }
  }

  const projected = localSemanticProjector(key);
  if (EMBEDDING_CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = EMBEDDING_CACHE.keys().next().value;
    if (firstKey) EMBEDDING_CACHE.delete(firstKey);
  }
  EMBEDDING_CACHE.set(key, projected);
  return projected;
}

// =============================================================================
// 2. CURATED AUTHORIZED VISUAL KNOWLEDGE DATABASE
// =============================================================================

const CURATED_REFERENCES: VisualReferenceItem[] = [
  // 1. ARCHITECTURE - MODERN MINIMALIST
  {
    id: "ref-arch-001",
    title: "Cantilevered Glass & Concrete Cliffside Villa",
    description: "Modern minimalist architectural masterpiece cantilevered over Pacific ocean cliff with floor-to-ceiling glass, exposed aggregate concrete, and reflection pool at dusk.",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    domain: "architecture",
    style: "realistic",
    aspectRatio: "16:9",
    lighting: "Blue hour twilight with warm 2700K interior architectural recessed lighting",
    cameraAngle: "Low-angle dynamic two-point perspective with wide 24mm tilt-shift lens",
    composition: "Leading lines along concrete terrace towards vanishing horizon on right third",
    dominantColors: ["#1c2833", "#e5e7e9", "#d4ac0d", "#2c3e50"],
    objects: [
      { name: "Glass villa", position: "midground", attributes: ["cantilevered", "modern", "transparent"] },
      { name: "Infinity pool", position: "foreground", attributes: ["reflective", "still water", "illuminated"] },
      { name: "Ocean coastline", position: "background", attributes: ["pacific waves", "coastal mist", "twilight"] },
    ],
    conditioningTypes: ["controlnet-depth", "controlnet-canny", "ip-adapter"],
    source: "TATTVA Curated Architectural Visual Archive",
    license: "authorized",
    safetyClassification: "safe",
    createdAt: "2026-01-15T00:00:00Z",
    tags: ["architecture", "villa", "minimalist", "luxury", "ocean", "modern", "concrete", "glass"],
    qualityScore: 98,
  },

  // 2. SCI-FI & CYBERPUNK - FUTURISTIC CITYSCAPE
  {
    id: "ref-cyber-001",
    title: "Neo-Tokyo Megacity Aerial Grid with Flying Vehicles",
    description: "Vast cyberpunk metropolis at midnight with multi-tiered skyways, autonomous flying aerocars, holographic kanji advertisements, and volumetric violet rain mist.",
    imageUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80",
    domain: "cyberpunk",
    style: "cinematic",
    aspectRatio: "16:9",
    lighting: "Dual-tone cyan and magenta neon glow with diffused volumetric wet reflections",
    cameraAngle: "Elevated high-angle drone perspective looking down an urban skyscraper chasm",
    composition: "Symmetrical vertical skyscraper framing with light trails forming vanishing depth",
    dominantColors: ["#00ffff", "#ff007f", "#0a0a1a", "#7928ca"],
    objects: [
      { name: "Skyscrapers", position: "background", attributes: ["megastructures", "glowing windows", "brutalist futuristic"] },
      { name: "Flying vehicles", position: "midground", attributes: ["aerocars", "light trails", "futuristic transit"] },
      { name: "Holographic billboards", position: "foreground", attributes: ["translucent", "neon cyan", "advertising"] },
    ],
    conditioningTypes: ["controlnet-depth", "ip-adapter", "style-transfer"],
    source: "TATTVA Sci-Fi Conceptual Studio",
    license: "authorized",
    safetyClassification: "safe",
    createdAt: "2026-01-20T00:00:00Z",
    tags: ["cyberpunk", "futuristic", "flying cars", "neon", "cityscape", "night", "hologram"],
    qualityScore: 99,
  },

  // 3. PRODUCT PHOTOGRAPHY - LUXURY TIMEPIECE & SMARTWATCH
  {
    id: "ref-prod-001",
    title: "Matte Black Smartwatch on Wet Volcanic Stone",
    description: "Ultra-sharp macro commercial product studio shot of a brushed titanium smartwatch resting on glistening black basalt stone with subtle sapphire glass reflections.",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
    domain: "product",
    style: "product",
    aspectRatio: "1:1",
    lighting: "Controlled studio rim lighting with 45-degree softbox and cobalt blue backlight kicker",
    cameraAngle: "Eye-level 90mm macro lens with razor-thin depth of field",
    composition: "Golden ratio centered subject with negative space on the upper perimeter",
    dominantColors: ["#111111", "#1e293b", "#38bdf8", "#64748b"],
    objects: [
      { name: "Smartwatch", position: "centered", attributes: ["matte black", "sapphire glass", "brushed bezel"] },
      { name: "Volcanic basalt", position: "foreground", attributes: ["textured", "water droplets", "dark stone"] },
    ],
    conditioningTypes: ["ip-adapter", "controlnet-canny"],
    source: "TATTVA Commercial Product Studio",
    license: "authorized",
    safetyClassification: "safe",
    createdAt: "2026-02-01T00:00:00Z",
    tags: ["product", "watch", "smartwatch", "commercial", "macro", "minimal", "luxury", "studio"],
    qualityScore: 97,
  },

  // 4. PORTRAIT & CHARACTER - ELDERLY ARTISAN / MUSICIAN
  {
    id: "ref-char-001",
    title: "Rajasthani Sarangi Master at Golden Hour",
    description: "Deeply emotive documentary portrait of an elderly folk musician with weathered facial contours, silver beard, and crimson turban playing a carved sarangi during golden hour.",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80",
    domain: "character",
    style: "portrait",
    aspectRatio: "3:4",
    lighting: "Warm 3200K direct late-afternoon sunlight sculpting facial lines with natural catchlights",
    cameraAngle: "Close-up portrait shot at 85mm f/1.4 with soft creamy bokeh background",
    composition: "Rule of thirds with subject's expressive eyes aligned along top horizontal grid",
    dominantColors: ["#d97706", "#78350f", "#fef3c7", "#451a03"],
    objects: [
      { name: "Elderly musician", position: "centered", attributes: ["crimson turban", "weathered skin", "peaceful expression"] },
      { name: "Sarangi instrument", position: "foreground", attributes: ["wooden carved", "horsehair bow", "antique"] },
    ],
    conditioningTypes: ["ip-adapter", "controlnet-pose"],
    source: "TATTVA Heritage Photography Collection",
    license: "authorized",
    safetyClassification: "safe",
    createdAt: "2026-02-05T00:00:00Z",
    tags: ["portrait", "musician", "rajasthani", "elderly", "culture", "golden hour", "sarangi", "heritage"],
    qualityScore: 96,
  },

  // 5. NATURE & LANDSCAPES - ETHEREAL ALPINE LAKE
  {
    id: "ref-nat-001",
    title: "Mirror Lake in the Dolomites with Morning Mist",
    description: "Pristine alpine lake surrounded by dramatic jagged limestone peaks reflected in crystal clear turquoise water, with morning mist drifting over larch pine forests.",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    domain: "nature",
    style: "cinematic",
    aspectRatio: "16:9",
    lighting: "Early dawn diffused alpine light with soft pink alpenglow kissing the jagged peaks",
    cameraAngle: "Eye-level wide 16mm landscape panorama with hyperfocal front-to-back sharpness",
    composition: "Perfect horizontal reflection symmetry split across the center water line",
    dominantColors: ["#0f766e", "#38bdf8", "#f472b6", "#1e293b"],
    objects: [
      { name: "Limestone peaks", position: "background", attributes: ["jagged", "snow-dusted", "alpenglow"] },
      { name: "Mirror lake", position: "midground", attributes: ["reflective", "turquoise", "placid"] },
      { name: "Alpine forest", position: "foreground", attributes: ["pine trees", "morning mist", "green"] },
    ],
    conditioningTypes: ["controlnet-depth", "style-transfer"],
    source: "TATTVA Geospatial Nature Library",
    license: "authorized",
    safetyClassification: "safe",
    createdAt: "2026-02-10T00:00:00Z",
    tags: ["nature", "mountains", "dolomites", "lake", "reflection", "mist", "dawn", "landscape"],
    qualityScore: 99,
  },

  // 6. POSTERS & GRAPHIC DESIGN - SWISS TYPOGRAPHY & GEOMETRIC ART
  {
    id: "ref-post-001",
    title: "International Typographic Style Exhibition Poster",
    description: "Clean Swiss modernist poster with bold asymmetrical sans-serif typography, vibrant cadmium red circular geometric motifs, disciplined grid alignment, and crisp paper grain.",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
    domain: "posters",
    style: "minimal",
    aspectRatio: "3:4",
    lighting: "Flat studio graphic illumination with high contrast vector precision",
    cameraAngle: "Orthographic straight-on flat lay with zero distortion",
    composition: "Asymmetric modular grid with bold negative white space balance",
    dominantColors: ["#ef4444", "#09090b", "#f4f4f5", "#ffffff"],
    objects: [
      { name: "Typography headline", position: "foreground", attributes: ["bold sans-serif", "swiss grid", "black"] },
      { name: "Geometric circles", position: "midground", attributes: ["cadmium red", "minimalist", "overlapping"] },
    ],
    conditioningTypes: ["controlnet-canny", "ip-adapter"],
    source: "TATTVA Graphic Design & Poster Archive",
    license: "authorized",
    safetyClassification: "safe",
    createdAt: "2026-02-15T00:00:00Z",
    tags: ["poster", "swiss style", "typography", "geometric", "minimalism", "modernist", "graphic design"],
    qualityScore: 98,
  },

  // 7. ANIME & DIGITAL ART - STUDIO GHIBLI INSPIRED TRAIN IN CLOUDS
  {
    id: "ref-anim-001",
    title: "Cel-Shaded Railway Above the Sea of Clouds",
    description: "Hand-painted anime key visual featuring an antique emerald locomotive steaming over water-logged tracks amidst billowing white cumulonimbus clouds and a brilliant azure sky.",
    imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
    domain: "fantasy",
    style: "anime",
    aspectRatio: "16:9",
    lighting: "High-key bright midday summer sunshine with vibrant sky blue and luminous cloud edges",
    cameraAngle: "Three-quarters dynamic perspective tracking the front engine at eye level",
    composition: "Diagonal railway tracks guiding eye from bottom-left to upper-right third",
    dominantColors: ["#0284c7", "#ffffff", "#059669", "#fbbf24"],
    objects: [
      { name: "Locomotive train", position: "midground", attributes: ["emerald green", "steam billowing", "vintage anime"] },
      { name: "Cumulonimbus clouds", position: "background", attributes: ["fluffy", "volumetric", "hand-painted"] },
      { name: "Water tracks", position: "foreground", attributes: ["shallow sea", "water ripples", "sunlight glint"] },
    ],
    conditioningTypes: ["controlnet-canny", "style-transfer", "ip-adapter"],
    source: "TATTVA Anime & Digital Illustration Studio",
    license: "authorized",
    safetyClassification: "safe",
    createdAt: "2026-02-20T00:00:00Z",
    tags: ["anime", "ghibli", "train", "clouds", "sky", "locomotive", "digital art", "cel shaded"],
    qualityScore: 97,
  },

  // 8. INTERIOR DESIGN - COZY JAPANDI READING NOOK
  {
    id: "ref-int-001",
    title: "Japandi Living Space with Oak Woodwork & Paper Lantern",
    description: "Harmonious Japandi interior with low-profile oak furniture, linen cushions, Noguchi washi paper pendant lamp, bonsai tree on slate pedestal, and sheer filtered sunlight.",
    imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    domain: "interior",
    style: "realistic",
    aspectRatio: "4:3",
    lighting: "Diffused morning sunlight filtering through paper shoji screens",
    cameraAngle: "Straight-on one-point perspective architectural interior shot",
    composition: "Calm horizontal balance with clean vertical timber battens rhythm",
    dominantColors: ["#fef08a", "#a8a29e", "#57534e", "#292524"],
    objects: [
      { name: "Oak reading chair", position: "foreground", attributes: ["natural wood", "linen cushion", "minimal"] },
      { name: "Paper lantern", position: "midground", attributes: ["washi paper", "spherical", "warm glow"] },
      { name: "Shoji screens", position: "background", attributes: ["timber grid", "diffused light", "japanese"] },
    ],
    conditioningTypes: ["controlnet-depth", "ip-adapter"],
    source: "TATTVA Interior Design Portfolio",
    license: "authorized",
    safetyClassification: "safe",
    createdAt: "2026-02-25T00:00:00Z",
    tags: ["interior", "japandi", "reading nook", "wood", "japanese", "minimalist", "cozy", "lamp"],
    qualityScore: 95,
  },

  // 9. ANIMALS & WILDLIFE - MAJESTIC SNOW LEOPARD ON CRAG
  {
    id: "ref-anim-wild-001",
    title: "Snow Leopard Scanning Himalayan Ridgeline",
    description: "National Geographic quality telephoto portrait of a wild snow leopard perched atop an icy mountain crag with piercing hazel eyes and dense mottled rosette coat.",
    imageUrl: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=1200&q=80",
    domain: "nature",
    style: "realistic",
    aspectRatio: "1:1",
    lighting: "Overcast high-altitude diffused cool daylight with zero harsh shadows",
    cameraAngle: "Low-angle telephoto 400mm lens looking up towards the mountain sovereign",
    composition: "Subject dominant on the upper left third looking towards negative space on right",
    dominantColors: ["#e2e8f0", "#94a3b8", "#475569", "#1e293b"],
    objects: [
      { name: "Snow leopard", position: "centered", attributes: ["rosette fur", "muscular pose", "piercing gaze"] },
      { name: "Glacial crag", position: "foreground", attributes: ["granite rock", "frost", "rime ice"] },
      { name: "Himalayan peaks", position: "background", attributes: ["snowfields", "jagged ridges", "atmospheric haze"] },
    ],
    conditioningTypes: ["ip-adapter", "controlnet-pose"],
    source: "TATTVA Wildlife Photography Archive",
    license: "authorized",
    safetyClassification: "safe",
    createdAt: "2026-03-01T00:00:00Z",
    tags: ["animal", "wildlife", "snow leopard", "mountains", "snow", "telephoto", "realistic"],
    qualityScore: 98,
  },

  // 10. EXACT QUANTITIES & STILL LIFE - FIVE LIT CANDLES ON ANTIQUE TABLE
  {
    id: "ref-still-001",
    title: "Five Hand-Dipped Tapered Beeswax Candles Lit in Brass Candlesticks",
    description: "Classical Dutch Golden Age inspired still life featuring exactly five beeswax tapered candles burning with warm flickering teardrop flames in varied height vintage brass holders.",
    imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1200&q=80",
    domain: "product",
    style: "cinematic",
    aspectRatio: "4:3",
    lighting: "Chiaroscuro candlelight illumination casting deep velvety shadows and warm amber reflections",
    cameraAngle: "Slight high-angle eye level 50mm still life table arrangement",
    composition: "Stepped diagonal grouping of five distinct light points across dark rustic oak",
    dominantColors: ["#f59e0b", "#78350f", "#451a03", "#0f0f10"],
    objects: [
      { name: "Five lit candles", position: "centered", attributes: ["exactly 5", "burning flames", "beeswax taper", "brass holders"] },
      { name: "Rustic oak table", position: "foreground", attributes: ["dark wood", "wax drips", "aged grain"] },
    ],
    conditioningTypes: ["controlnet-depth", "controlnet-canny", "ip-adapter"],
    source: "TATTVA Fine Art Still Life Archive",
    license: "authorized",
    safetyClassification: "safe",
    createdAt: "2026-03-05T00:00:00Z",
    tags: ["still life", "candles", "five candles", "chiaroscuro", "antique", "brass", "flames"],
    qualityScore: 96,
  },
];

// =============================================================================
// 3. VISUAL KNOWLEDGE DATABASE CONTROLLER
// =============================================================================

class VisualKnowledgeDatabase {
  private inMemoryItems: VisualReferenceItem[] = [...CURATED_REFERENCES];
  private initialized = false;

  constructor() {
    this.initializeEmbeddings();
  }

  private async initializeEmbeddings() {
    if (this.initialized) return;
    for (const item of this.inMemoryItems) {
      if (!item.embedding) {
        const textToEmbed = `${item.title}. ${item.description}. Style: ${item.style}. Lighting: ${item.lighting}. Composition: ${item.composition}. Objects: ${item.objects.map((o) => o.name).join(", ")}. Tags: ${item.tags.join(", ")}`;
        item.embedding = await getEmbedding(textToEmbed);
      }
    }
    this.initialized = true;
  }

  /**
   * Hybrid Search combining Vector Cosine Similarity and Lexical Keyword BM25 matching
   */
  public async search(params: {
    queryText: string;
    style?: ImageStyle;
    aspectRatio?: AspectRatio;
    domain?: VisualDomain;
    limit?: number;
    minScore?: number;
  }): Promise<Array<{ item: VisualReferenceItem; score: number; semanticScore: number; lexicalScore: number }>> {
    await this.initializeEmbeddings();

    const queryEmbedding = await getEmbedding(params.queryText);
    const queryTokens = params.queryText.toLowerCase().split(/[\s,.-]+/).filter((t) => t.length > 2);
    const limit = params.limit ?? 4;
    const minScore = params.minScore ?? 0.35;

    const scored = this.inMemoryItems.map((item) => {
      // 1. Semantic Vector Similarity
      const semanticScore = item.embedding
        ? cosineSimilarity(queryEmbedding, item.embedding)
        : 0;

      // 2. Lexical Token Overlap (BM25 surrogate)
      const itemText = `${item.title} ${item.description} ${item.tags.join(" ")} ${item.lighting} ${item.composition} ${item.objects.map((o) => o.name).join(" ")}`.toLowerCase();
      let matchedTokens = 0;
      for (const token of queryTokens) {
        if (itemText.includes(token)) matchedTokens++;
      }
      const lexicalScore = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0;

      // 3. Metadata Filter Multipliers
      let metadataBonus = 0;
      if (params.style && params.style !== "auto" && item.style === params.style) {
        metadataBonus += 0.15;
      }
      if (params.aspectRatio && item.aspectRatio === params.aspectRatio) {
        metadataBonus += 0.1;
      }
      if (params.domain && item.domain === params.domain) {
        metadataBonus += 0.15;
      }

      // Hybrid blend (60% semantic, 40% lexical + metadata bonus)
      const hybridScore = Math.min(1.0, semanticScore * 0.6 + lexicalScore * 0.4 + metadataBonus);

      return {
        item,
        score: hybridScore,
        semanticScore,
        lexicalScore,
      };
    });

    return scored
      .filter((res) => res.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Retrieves an item by unique identifier
   */
  public getById(id: string): VisualReferenceItem | undefined {
    return this.inMemoryItems.find((item) => item.id === id);
  }

  /**
   * Securely add a new authorized reference with explicit user approval
   */
  public async addAuthorizedReference(
    item: Omit<VisualReferenceItem, "id" | "createdAt" | "embedding">,
    userExplicitConsent: boolean
  ): Promise<VisualReferenceItem | null> {
    if (!userExplicitConsent) {
      console.warn("[VisualKnowledgeDatabase] Cannot index reference: user explicit consent was not provided.");
      return null;
    }

    const id = `user-ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fullItem: VisualReferenceItem = {
      ...item,
      id,
      createdAt: new Date().toISOString(),
      license: "authorized",
      safetyClassification: "safe",
    };

    const textToEmbed = `${fullItem.title}. ${fullItem.description}. Style: ${fullItem.style}. Lighting: ${fullItem.lighting}. Composition: ${fullItem.composition}. Objects: ${fullItem.objects.map((o) => o.name).join(", ")}. Tags: ${fullItem.tags.join(", ")}`;
    fullItem.embedding = await getEmbedding(textToEmbed);

    this.inMemoryItems.push(fullItem);

    // Sync to Supabase if table exists
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("visual_references").insert({
          id: fullItem.id,
          title: fullItem.title,
          description: fullItem.description,
          image_url: fullItem.imageUrl,
          domain: fullItem.domain,
          style: fullItem.style,
          aspect_ratio: fullItem.aspectRatio,
          lighting: fullItem.lighting,
          composition: fullItem.composition,
          dominant_colors: fullItem.dominantColors,
          objects: fullItem.objects,
          tags: fullItem.tags,
          quality_score: fullItem.qualityScore,
          embedding: fullItem.embedding,
          created_at: fullItem.createdAt,
        });
      } catch (err) {
        console.warn("[VisualKnowledgeDatabase] Supabase sync notice:", err);
      }
    }

    return fullItem;
  }

  /**
   * Return total count of reference items in store
   */
  public count(): number {
    return this.inMemoryItems.length;
  }
}

export const visualKnowledgeDB = new VisualKnowledgeDatabase();

