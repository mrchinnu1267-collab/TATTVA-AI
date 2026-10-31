import { GoogleGenAI } from "@google/genai";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  MemoryCategory,
  MemoryItem,
  PersonalizationSettings,
  MessageFeedback,
  DEFAULT_PERSONALIZATION_SETTINGS,
} from "./memory-types";
import { generateTextEmbedding, cosineSimilarity, keywordRelevanceScore } from "./embeddings";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".tattva_memory_data");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // ignore
  }
}

function readDataFile<T>(filename: string, defaultValue: T): T {
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return defaultValue;
}

function writeDataFile(filename: string, data: any) {
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

// In-Memory store backed by persistent disk cache & offline fallback
const memoryStore = new Map<string, MemoryItem[]>();
const settingsStore = new Map<string, PersonalizationSettings>();
const feedbackStore = new Map<string, MessageFeedback[]>();

// Initialize from persisted storage
const initialMemories = readDataFile<Record<string, MemoryItem[]>>("memories.json", {});
for (const [k, v] of Object.entries(initialMemories)) memoryStore.set(k, v);

const initialSettings = readDataFile<Record<string, PersonalizationSettings>>("settings.json", {});
for (const [k, v] of Object.entries(initialSettings)) settingsStore.set(k, v);

const initialFeedback = readDataFile<Record<string, MessageFeedback[]>>("feedback.json", {});
for (const [k, v] of Object.entries(initialFeedback)) feedbackStore.set(k, v);

function persistMemories() {
  writeDataFile("memories.json", Object.fromEntries(memoryStore));
}

function persistSettings() {
  writeDataFile("settings.json", Object.fromEntries(settingsStore));
}

function persistFeedback() {
  writeDataFile("feedback.json", Object.fromEntries(feedbackStore));
}

/**
 * Get Supabase Client if env vars exist
 */
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key);
}

/**
 * Standardize user key
 */
function normalizeUser(email?: string | null): string {
  if (!email || !email.trim()) return "guest_user";
  return email.toLowerCase().trim();
}

// =============================================================================
// 1. MEMORY STORAGE & CRUD OPERATIONS
// =============================================================================

export async function getUserMemories(userEmail?: string | null): Promise<MemoryItem[]> {
  const user = normalizeUser(userEmail);
  const cached = memoryStore.get(user);
  if (cached && cached.length > 0) {
    return cached;
  }

  // Attempt to fetch from Supabase if table exists
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("user_memories")
        .select("*")
        .eq("user_email", user)
        .order("importance", { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped: MemoryItem[] = data.map((row: any) => ({
          id: row.id,
          userEmail: row.user_email,
          content: row.content,
          category: row.category as MemoryCategory,
          importance: row.importance || 5,
          active: row.active ?? true,
          createdAt: new Date(row.created_at).getTime(),
          updatedAt: new Date(row.updated_at || row.created_at).getTime(),
          source: row.source || "extracted",
        }));
        memoryStore.set(user, mapped);
        return mapped;
      }
    } catch {
      // Supabase table not created yet; use local memoryStore
    }
  }

  return memoryStore.get(user) || [];
}

export async function saveMemory(
  userEmail: string | undefined | null,
  content: string,
  category: MemoryCategory = "preference",
  importance: number = 7,
  source: "explicit" | "extracted" = "explicit"
): Promise<MemoryItem> {
  const user = normalizeUser(userEmail);
  const cleanContent = content.trim();

  const existing = await getUserMemories(user);

  // Generate vector embedding
  const embedding = await generateTextEmbedding(cleanContent);

  // Duplicate memory detection & merge
  let matchedExisting: MemoryItem | null = null;
  for (const item of existing) {
    // Exact or near-exact match
    if (item.content.toLowerCase() === cleanContent.toLowerCase()) {
      matchedExisting = item;
      break;
    }
    // High semantic similarity match (> 0.86)
    if (embedding && item.embedding && item.category === category) {
      const sim = cosineSimilarity(embedding, item.embedding);
      if (sim > 0.86) {
        matchedExisting = item;
        break;
      }
    }
  }

  if (matchedExisting) {
    // Update existing memory
    matchedExisting.content = cleanContent;
    matchedExisting.importance = Math.max(matchedExisting.importance, importance);
    matchedExisting.updatedAt = Date.now();
    matchedExisting.active = true;
    if (embedding) matchedExisting.embedding = embedding;

    // Try Supabase update
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from("user_memories")
          .update({
            content: cleanContent,
            importance: matchedExisting.importance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", matchedExisting.id);
      } catch {
        // ignore
      }
    }

    memoryStore.set(user, existing);
    persistMemories();
    return matchedExisting;
  }

  // Create new memory item
  const newMemory: MemoryItem = {
    id: crypto.randomUUID(),
    userEmail: user,
    content: cleanContent,
    category,
    importance: Math.max(1, Math.min(10, importance)),
    embedding: embedding || undefined,
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source,
  };

  existing.unshift(newMemory);
  memoryStore.set(user, existing);
  persistMemories();

  // Try Supabase insert
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("user_memories").insert([
        {
          id: newMemory.id,
          user_email: user,
          content: newMemory.content,
          category: newMemory.category,
          importance: newMemory.importance,
          active: newMemory.active,
          source: newMemory.source,
          created_at: new Date(newMemory.createdAt).toISOString(),
          updated_at: new Date(newMemory.updatedAt).toISOString(),
        },
      ]);
    } catch {
      // ignore
    }
  }

  return newMemory;
}

export async function updateMemory(
  userEmail: string | undefined | null,
  memoryId: string,
  updates: Partial<Pick<MemoryItem, "content" | "category" | "importance" | "active">>
): Promise<MemoryItem | null> {
  const user = normalizeUser(userEmail);
  const list = await getUserMemories(user);
  const item = list.find((m) => m.id === memoryId);
  if (!item) return null;

  if (updates.content !== undefined) {
    item.content = updates.content.trim();
    item.embedding = (await generateTextEmbedding(item.content)) || item.embedding;
  }
  if (updates.category !== undefined) item.category = updates.category;
  if (updates.importance !== undefined) item.importance = Math.max(1, Math.min(10, updates.importance));
  if (updates.active !== undefined) item.active = updates.active;
  item.updatedAt = Date.now();

  memoryStore.set(user, list);
  persistMemories();

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from("user_memories")
        .update({
          content: item.content,
          category: item.category,
          importance: item.importance,
          active: item.active,
          updated_at: new Date(item.updatedAt).toISOString(),
        })
        .eq("id", memoryId);
    } catch {
      // ignore
    }
  }

  return item;
}

export async function deleteMemory(userEmail: string | undefined | null, memoryId: string): Promise<boolean> {
  const user = normalizeUser(userEmail);
  const list = await getUserMemories(user);
  const filtered = list.filter((m) => m.id !== memoryId);
  memoryStore.set(user, filtered);
  persistMemories();

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("user_memories").delete().eq("id", memoryId);
    } catch {
      // ignore
    }
  }

  return true;
}

export async function clearAllMemories(userEmail: string | undefined | null): Promise<boolean> {
  const user = normalizeUser(userEmail);
  memoryStore.set(user, []);
  persistMemories();

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("user_memories").delete().eq("user_email", user);
    } catch {
      // ignore
    }
  }

  return true;
}

// =============================================================================
// 2. ADVANCED SEMANTIC RETRIEVAL & RANKING
// =============================================================================

export async function retrieveRelevantMemories(
  userEmail: string | undefined | null,
  query: string,
  topK: number = 5
): Promise<MemoryItem[]> {
  const user = normalizeUser(userEmail);
  const allMemories = await getUserMemories(user);
  const activeMemories = allMemories.filter((m) => m.active);

  if (activeMemories.length === 0) return [];

  // Generate embedding for current user query
  const queryEmbedding = await generateTextEmbedding(query);

  const scored: Array<{ memory: MemoryItem; score: number }> = [];

  for (const mem of activeMemories) {
    let semanticScore = 0;
    if (queryEmbedding && mem.embedding) {
      semanticScore = cosineSimilarity(queryEmbedding, mem.embedding);
    } else {
      semanticScore = keywordRelevanceScore(query, mem.content);
    }

    const keywordScore = keywordRelevanceScore(query, mem.content);
    const combinedSim = Math.max(semanticScore, keywordScore);

    // Importance bonus (normalized 0 to 1)
    const importanceScore = mem.importance / 10;

    // Recency bonus (memories updated in the last 7 days get a slight boost)
    const ageDays = (Date.now() - mem.updatedAt) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - ageDays / 30);

    // Total weighted score
    const totalScore = combinedSim * 0.6 + importanceScore * 0.3 + recencyScore * 0.1;

    // Direct instructions and high importance preferences are included if query is general
    if (mem.category === "instruction" || mem.importance >= 9) {
      scored.push({ memory: { ...mem, similarity: combinedSim }, score: Math.max(totalScore, 0.45) });
    } else if (totalScore >= 0.35 || combinedSim >= 0.4) {
      scored.push({ memory: { ...mem, similarity: combinedSim }, score: totalScore });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map((s) => s.memory);
}

// =============================================================================
// 3. STRUCTURED MEMORY EXTRACTION
// =============================================================================

const EXTRACTION_INSTRUCTION = `You are the memory extraction engine of TATTVA AI.
Your objective: Extract durable user preferences, ongoing projects, technical proficiencies, communication styles, and explicit instructions from the user's message.

PRIVACY & SAFETY (STRICT):
- NEVER extract sensitive personal attributes: medical history, religious beliefs, political views, sexual orientation, financial account numbers, or government IDs.
- Only extract professional, technical, creative, and workflow-oriented preferences.

CATEGORIES:
- "preference": Preferred response style, coding habits, favorite tools/frameworks.
- "project": Name and domain of their active software, creative, or academic project.
- "technical_level": Seniority, beginner status, or primary programming languages.
- "language": Explicit language preferences (e.g., Telugu, English, Hindi).
- "formatting": Tables, bullet points, concise snippets.
- "instruction": Explicit commands (e.g., "Always use TypeScript", "Never use semicolons").

Output ONLY a JSON array of objects or an empty array [] if no durable facts were stated:
[
  {
    "content": "Prefers Next.js App Router for all React projects",
    "category": "preference" | "project" | "technical_level" | "language" | "formatting" | "instruction",
    "importance": 1-10
  }
]`;

export async function extractAndStoreMemories(
  userEmail: string | undefined | null,
  userMessage: string
): Promise<MemoryItem[]> {
  const user = normalizeUser(userEmail);
  const clean = userMessage.trim();
  if (clean.length < 15) return [];

  // Fast pre-check: only extract if user message contains preference signals
  const preferenceSignals =
    /i prefer|i like|i always|i never|my project|i am building|i work with|remember that|my stack|call me|my name|technologies i use|i am a |my company|my app|use telugu|use hindi|no emojis|keep it concise|in detail/i;
  if (!preferenceSignals.test(clean)) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [{ text: `USER MESSAGE:\n"${clean}"` }],
      config: {
        systemInstruction: EXTRACTION_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(result.text || "[]");
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    const saved: MemoryItem[] = [];
    for (const item of parsed) {
      if (item.content && item.category) {
        const memory = await saveMemory(
          user,
          item.content,
          item.category as MemoryCategory,
          typeof item.importance === "number" ? item.importance : 7,
          "extracted"
        );
        saved.push(memory);
      }
    }
    return saved;
  } catch (err) {
    console.warn("[Memory Extraction] Failed to extract memories:", err);
    return [];
  }
}

// =============================================================================
// 4. PERSONALIZATION SETTINGS ENGINE
// =============================================================================

export async function getUserPersonalizationSettings(
  userEmail?: string | null
): Promise<PersonalizationSettings> {
  const user = normalizeUser(userEmail);
  const cached = settingsStore.get(user);
  if (cached) return cached;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_email", user)
        .maybeSingle();

      if (!error && data) {
        const loaded: PersonalizationSettings = {
          enabled: data.enabled ?? true,
          technicalDepth: data.technical_depth || "advanced",
          responseLength: data.response_length || "balanced",
          tone: data.tone || "conversational",
          preferredLanguage: data.preferred_language || "auto",
          codeStyle: data.code_style || "clean_typed",
          situationalEmojis: data.situational_emojis ?? true,
          customInstructions: data.custom_instructions || "",
          updatedAt: new Date(data.updated_at || data.created_at).getTime(),
        };
        settingsStore.set(user, loaded);
        return loaded;
      }
    } catch {
      // ignore
    }
  }

  const initial = { ...DEFAULT_PERSONALIZATION_SETTINGS };
  settingsStore.set(user, initial);
  return initial;
}

export async function updatePersonalizationSettings(
  userEmail: string | undefined | null,
  updates: Partial<PersonalizationSettings>
): Promise<PersonalizationSettings> {
  const user = normalizeUser(userEmail);
  const current = await getUserPersonalizationSettings(user);
  const merged: PersonalizationSettings = {
    ...current,
    ...updates,
    updatedAt: Date.now(),
  };

  settingsStore.set(user, merged);
  persistSettings();

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("user_preferences").upsert({
        user_email: user,
        enabled: merged.enabled,
        technical_depth: merged.technicalDepth,
        response_length: merged.responseLength,
        tone: merged.tone,
        preferred_language: merged.preferredLanguage,
        code_style: merged.codeStyle,
        situational_emojis: merged.situationalEmojis,
        custom_instructions: merged.customInstructions,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  }

  return merged;
}

// =============================================================================
// 5. SYSTEM PROMPT PERSONALIZATION INJECTION
// =============================================================================

export function buildPersonalizationSystemPrompt(
  settings: PersonalizationSettings,
  memories: MemoryItem[]
): string {
  if (!settings.enabled) {
    return "";
  }

  const memoryLines = memories
    .filter((m) => m.active)
    .map((m) => `- [${m.category.toUpperCase()}] ${m.content} (importance: ${m.importance}/10)`)
    .join("\n");

  const depthDirective = {
    beginner: "Explain concepts simply, avoiding excessive jargon. Use intuitive real-world metaphors.",
    intermediate: "Provide clear, practical explanations with solid technical accuracy.",
    advanced: "Provide deep technical explanations, best practices, edge cases, and architectural reasoning.",
    expert: "Provide elite, high-performance architectural depth, zero fluff, production rigor, and asymptotic complexity.",
  }[settings.technicalDepth];

  const lengthDirective = {
    concise: "Keep responses brief, punchy, and direct to the point. Avoid filler sentences.",
    balanced: "Deliver a well-rounded response with sufficient detail and clear formatting.",
    detailed: "Provide comprehensive, thorough explanations covering all facets.",
    deep_dive: "Deliver exhaustive, master-class deep-dive analysis with step-by-step guides and full code.",
  }[settings.responseLength];

  const toneDirective = {
    conversational: "Be friendly, engaging, natural, and warm.",
    direct: "Be direct, professional, concise, and structured.",
    technical: "Be rigorous, precise, academic, and code-focused.",
    empathic: "Be encouraging, supportive, patient, and understanding.",
  }[settings.tone];

  const codeStyleDirective = {
    clean_typed: "Write clean, modern code with strict types and minimal comments.",
    detailed_comments: "Include thorough inline explanations and docstrings for every function.",
    minimalist: "Write ultra-concise, elegant, idiomatic code without unnecessary boilerplate.",
  }[settings.codeStyle];

  return `
===============================================================================
SELF-PERSONALIZATION & LONG-TERM MEMORY ENGINE (TATTVA AI PERSONALIZATION)
===============================================================================
The following profile and long-term memories have been recalled for this specific user.
Adapt your reasoning, explanation depth, and language accordingly:

USER PERSONALIZATION PREFERENCES:
- Technical Knowledge Level: ${settings.technicalDepth.toUpperCase()} (${depthDirective})
- Explanation Length: ${settings.responseLength.toUpperCase()} (${lengthDirective})
- Conversational Tone: ${settings.tone.toUpperCase()} (${toneDirective})
- Code Style: ${settings.codeStyle.toUpperCase()} (${codeStyleDirective})
${settings.preferredLanguage !== "auto" ? `- Preferred Language: Override to ${settings.preferredLanguage.toUpperCase()}` : ""}
${settings.customInstructions ? `- User Custom Directives: "${settings.customInstructions}"` : ""}

RECALLED LONG-TERM MEMORIES & CONTEXT:
${memoryLines || "- (No specific memories matched this exact turn)"}

RULES FOR PERSONALIZED GENERATION:
1. Seamlessly apply these recalled facts without awkwardly announcing "According to my memories..."
2. Respect the user's ongoing projects, technical expertise, and preferred formatting.
3. If the user corrects or refines an existing fact in this conversation, adhere to the latest statement.
===============================================================================
`;
}

// =============================================================================
// 6. FEEDBACK LEARNING ENGINE
// =============================================================================

export async function recordMessageFeedback(feedback: MessageFeedback): Promise<boolean> {
  const user = normalizeUser(feedback.userEmail);
  const list = feedbackStore.get(user) || [];
  list.unshift(feedback);
  feedbackStore.set(user, list);
  persistFeedback();

  // Auto-adapt preferences based on recurring feedback
  const recentFeedback = list.slice(0, 10);
  const detailedCount = recentFeedback.filter((f) => f.category === "too_detailed").length;
  const shortCount = recentFeedback.filter((f) => f.category === "too_short").length;

  if (detailedCount >= 2) {
    await updatePersonalizationSettings(user, { responseLength: "concise" });
  } else if (shortCount >= 2) {
    await updatePersonalizationSettings(user, { responseLength: "detailed" });
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("user_feedback").insert([
        {
          id: feedback.id,
          message_id: feedback.messageId,
          session_id: feedback.sessionId,
          user_email: user,
          rating: feedback.rating,
          category: feedback.category,
          comment: feedback.comment,
          created_at: new Date(feedback.createdAt).toISOString(),
        },
      ]);
    } catch {
      // ignore
    }
  }

  return true;
}

export async function getUserFeedbackSummary(userEmail?: string | null) {
  const user = normalizeUser(userEmail);
  const list = feedbackStore.get(user) || [];
  const total = list.length;
  const positive = list.filter((f) => f.rating === "positive").length;
  const negative = list.filter((f) => f.rating === "negative").length;

  const categoriesCount: Record<string, number> = {};
  for (const item of list) {
    categoriesCount[item.category] = (categoriesCount[item.category] || 0) + 1;
  }

  return {
    total,
    positive,
    negative,
    positivePercentage: total > 0 ? Math.round((positive / total) * 100) : 100,
    categoriesCount,
  };
}
