import { GoogleGenAI } from "@google/genai";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  MemoryCategory,
  MemoryItem,
  PersonalizationSettings,
  MessageFeedback,
  DEFAULT_PERSONALIZATION_SETTINGS,
  isMemoryExpired,
  getDefaultTTLForCategory,
} from "./memory-types";
import { generateTextEmbedding, cosineSimilarity, keywordRelevanceScore } from "./embeddings";
import { validateMemoryCandidate } from "./security";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const BASE_DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", ".tattva_memory_data")
    : path.join(process.cwd(), ".data", "memories");

/**
 * Standardize user key for consistent hashing and lookup
 */
function normalizeUser(email?: string | null): string {
  if (!email || !email.trim()) return "guest_user";
  return email.toLowerCase().trim();
}

/**
 * Get tenant-isolated storage directory based on SHA-256 hash of user key.
 * Enforces cryptographic tenant boundary isolation.
 */
function getTenantDir(userKey: string): string {
  const normalized = normalizeUser(userKey);
  const tenantHash = crypto.createHash("sha256").update(normalized).digest("hex");
  const tenantDir = path.join(BASE_DATA_DIR, tenantHash);
  try {
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
  } catch {
    // ignore
  }
  return tenantDir;
}

/**
 * Safely reads a tenant data file with fallback
 */
function readTenantFile<T>(userKey: string, filename: string, defaultValue: T): T {
  try {
    const tenantDir = getTenantDir(userKey);
    const filePath = path.join(tenantDir, filename);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return defaultValue;
}

/**
 * Atomically writes data to a tenant-isolated file
 */
function writeTenantFile(userKey: string, filename: string, data: any) {
  try {
    const tenantDir = getTenantDir(userKey);
    const targetPath = path.join(tenantDir, filename);
    const tempPath = path.join(
      tenantDir,
      `${filename}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`
    );
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, targetPath);
  } catch {
    // ignore
  }
}

// In-Memory cache keyed by user for sub-millisecond retrieval
const memoryCache = new Map<string, MemoryItem[]>();
const settingsCache = new Map<string, PersonalizationSettings>();
const feedbackCache = new Map<string, MessageFeedback[]>();

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
 * Prune expired memories from a list and return the active, non-expired ones.
 */
function filterAndPruneExpired(memories: MemoryItem[]): { active: MemoryItem[]; pruned: boolean } {
  let pruned = false;
  const active: MemoryItem[] = [];

  for (const m of memories) {
    if (isMemoryExpired(m)) {
      pruned = true;
    } else {
      active.push(m);
    }
  }

  return { active, pruned };
}

// =============================================================================
// 1. MEMORY STORAGE & CRUD OPERATIONS
// =============================================================================

export async function getUserMemories(
  userEmail?: string | null,
  workspaceId?: string
): Promise<MemoryItem[]> {
  const user = normalizeUser(userEmail);

  // 1. Check memory cache
  let cached = memoryCache.get(user);

  // 2. If not in memory cache, load from tenant disk vault
  if (!cached) {
    const diskMemories = readTenantFile<MemoryItem[]>(user, "memories.json", []);
    const { active, pruned } = filterAndPruneExpired(diskMemories);
    if (pruned) {
      writeTenantFile(user, "memories.json", active);
    }
    cached = active;
    memoryCache.set(user, cached);
  } else {
    // Periodically verify expiration in cache
    const { active, pruned } = filterAndPruneExpired(cached);
    if (pruned) {
      cached = active;
      memoryCache.set(user, cached);
      writeTenantFile(user, "memories.json", cached);
    }
  }

  if (cached.length > 0) {
    if (workspaceId) {
      return cached.filter((m) => !m.workspaceId || m.workspaceId === workspaceId);
    }
    return cached;
  }

  // 3. Attempt to fetch from Supabase if table exists
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase
        .from("user_memories")
        .select("*")
        .eq("user_email", user);

      if (workspaceId) {
        query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);
      }

      const { data, error } = await query.order("importance", { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped: MemoryItem[] = data.map((row: any) => ({
          id: row.id,
          userEmail: row.user_email,
          workspaceId: row.workspace_id,
          content: row.content,
          category: row.category as MemoryCategory,
          importance: row.importance || 5,
          active: row.active ?? true,
          createdAt: new Date(row.created_at).getTime(),
          updatedAt: new Date(row.updated_at || row.created_at).getTime(),
          expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
          source: row.source || "extracted",
          isConfirmed: row.source === "explicit" || row.is_confirmed === true,
          confidence: row.confidence || 1.0,
        }));

        const { active, pruned } = filterAndPruneExpired(mapped);
        memoryCache.set(user, active);
        writeTenantFile(user, "memories.json", active);
        return active;
      }
    } catch {
      // Supabase table not created yet; use local tenant vault
    }
  }

  const all = memoryCache.get(user) || [];
  if (workspaceId) {
    return all.filter((m) => !m.workspaceId || m.workspaceId === workspaceId);
  }
  return all;
}

/**
 * Detects contradictory or outdated memories that conflict with a new memory item
 */
export function detectMemoryConflicts(
  newContent: string,
  category: MemoryCategory,
  existingMemories: MemoryItem[]
): MemoryItem[] {
  const conflicts: MemoryItem[] = [];
  const normalizedNew = newContent.toLowerCase();

  const opposingKeywordGroups = [
    { a: ["python", "django", "flask"], b: ["go", "golang", "fiber", "gin", "rust", "node"] },
    { a: ["mysql", "mariadb"], b: ["postgres", "postgresql", "mongodb", "supabase"] },
    { a: ["concise", "brief", "short"], b: ["detailed", "verbose", "comprehensive", "in-depth"] },
    { a: ["tabs"], b: ["spaces"] },
    { a: ["dark mode", "dark theme"], b: ["light mode", "light theme"] },
    { a: ["react", "next.js", "nextjs"], b: ["vue", "angular", "svelte"] },
  ];

  for (const existing of existingMemories) {
    if (!existing.active || existing.category !== category) continue;
    const normalizedOld = existing.content.toLowerCase();

    // Direct supersession phrases
    if (
      normalizedNew.includes("instead of") ||
      normalizedNew.includes("no longer") ||
      normalizedNew.includes("switched to") ||
      normalizedNew.includes("migrated to") ||
      normalizedNew.includes("prefer")
    ) {
      const oldWords = normalizedOld.split(/\W+/).filter((w) => w.length > 3);
      if (oldWords.some((w) => normalizedNew.includes(w))) {
        conflicts.push(existing);
        continue;
      }
    }

    // Mutually exclusive tech stack / preference domains
    for (const group of opposingKeywordGroups) {
      const oldHasA = group.a.some((k) => normalizedOld.includes(k));
      const oldHasB = group.b.some((k) => normalizedOld.includes(k));
      const newHasA = group.a.some((k) => normalizedNew.includes(k));
      const newHasB = group.b.some((k) => normalizedNew.includes(k));

      if ((oldHasA && newHasB) || (oldHasB && newHasA)) {
        conflicts.push(existing);
        break;
      }
    }
  }

  return conflicts;
}

export async function saveMemory(
  userEmail: string | undefined | null,
  content: string,
  category: MemoryCategory = "preference",
  importance: number = 7,
  source: "explicit" | "extracted" = "explicit",
  workspaceId?: string,
  isConfirmed: boolean = true,
  confidence: number = 1.0,
  customExpiresAt?: number
): Promise<MemoryItem> {
  const user = normalizeUser(userEmail);
  const cleanContent = content.trim();

  // Validate candidate memory against memory poisoning / prompt injection
  const validation = validateMemoryCandidate(cleanContent);
  if (!validation.isValid) {
    throw new Error(`Memory validation failed: ${validation.reason}`);
  }

  const existing = await getUserMemories(user, workspaceId);

  // Generate vector embedding
  const embedding = await generateTextEmbedding(cleanContent);

  // Determine expiration timestamp (TTL)
  let expiresAt = customExpiresAt;
  if (!expiresAt) {
    const ttl = getDefaultTTLForCategory(category);
    if (ttl) {
      expiresAt = Date.now() + ttl;
    }
  }

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
    matchedExisting.isConfirmed = isConfirmed || matchedExisting.isConfirmed;
    matchedExisting.confidence = Math.max(matchedExisting.confidence || 1.0, confidence);
    if (expiresAt) matchedExisting.expiresAt = expiresAt;
    if (workspaceId) matchedExisting.workspaceId = workspaceId;
    if (embedding) matchedExisting.embedding = embedding;

    // Supabase update
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from("user_memories")
          .update({
            content: cleanContent,
            importance: matchedExisting.importance,
            workspace_id: matchedExisting.workspaceId || null,
            expires_at: matchedExisting.expiresAt ? new Date(matchedExisting.expiresAt).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", matchedExisting.id);
      } catch {
        // ignore
      }
    }

    memoryCache.set(user, existing);
    writeTenantFile(user, "memories.json", existing);
    return matchedExisting;
  }

  // Detect and supersede contradictory/conflicting memories
  const conflicts = detectMemoryConflicts(cleanContent, category, existing);
  for (const conflict of conflicts) {
    conflict.active = false;
    conflict.updatedAt = Date.now();
  }

  // Create new memory item
  const newMemory: MemoryItem = {
    id: crypto.randomUUID(),
    userEmail: user,
    workspaceId,
    content: cleanContent,
    category,
    importance: Math.max(1, Math.min(10, importance)),
    embedding: embedding || undefined,
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    expiresAt,
    source,
    isConfirmed,
    confidence,
  };

  existing.unshift(newMemory);
  memoryCache.set(user, existing);
  writeTenantFile(user, "memories.json", existing);

  // Supabase insert
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("user_memories").insert([
        {
          id: newMemory.id,
          user_email: user,
          workspace_id: workspaceId || null,
          content: newMemory.content,
          category: newMemory.category,
          importance: newMemory.importance,
          active: newMemory.active,
          source: newMemory.source,
          expires_at: newMemory.expiresAt ? new Date(newMemory.expiresAt).toISOString() : null,
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

export async function correctMemory(
  userEmail: string | undefined | null,
  memoryId: string,
  correctedContent: string,
  workspaceId?: string
): Promise<MemoryItem | null> {
  const user = normalizeUser(userEmail);
  const list = await getUserMemories(user, workspaceId);
  const item = list.find((m) => m.id === memoryId);
  if (!item) return null;

  item.content = correctedContent.trim();
  item.source = "explicit";
  item.isConfirmed = true;
  item.confidence = 1.0;
  item.updatedAt = Date.now();
  item.embedding = (await generateTextEmbedding(item.content)) || item.embedding;

  memoryCache.set(user, list);
  writeTenantFile(user, "memories.json", list);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from("user_memories")
        .update({
          content: item.content,
          source: "explicit",
          updated_at: new Date(item.updatedAt).toISOString(),
        })
        .eq("id", memoryId);
    } catch {
      // ignore
    }
  }

  return item;
}

export async function updateMemory(
  userEmail: string | undefined | null,
  memoryId: string,
  updates: Partial<Pick<MemoryItem, "content" | "category" | "importance" | "active" | "expiresAt">>
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
  if (updates.expiresAt !== undefined) item.expiresAt = updates.expiresAt;
  item.updatedAt = Date.now();

  memoryCache.set(user, list);
  writeTenantFile(user, "memories.json", list);

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
          expires_at: item.expiresAt ? new Date(item.expiresAt).toISOString() : null,
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
  memoryCache.set(user, filtered);
  writeTenantFile(user, "memories.json", filtered);

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

export async function clearCategoryMemories(
  userEmail: string | undefined | null,
  category: MemoryCategory
): Promise<boolean> {
  const user = normalizeUser(userEmail);
  const list = await getUserMemories(user);
  const filtered = list.filter((m) => m.category !== category);
  memoryCache.set(user, filtered);
  writeTenantFile(user, "memories.json", filtered);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from("user_memories")
        .delete()
        .eq("user_email", user)
        .eq("category", category);
    } catch {
      // ignore
    }
  }

  return true;
}

export async function clearAllMemories(userEmail: string | undefined | null): Promise<boolean> {
  const user = normalizeUser(userEmail);
  memoryCache.set(user, []);
  writeTenantFile(user, "memories.json", []);

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

/**
 * Exports user memories in structured JSON or clean Markdown format
 */
export async function exportUserMemories(
  userEmail: string | undefined | null,
  format: "json" | "markdown" = "json"
): Promise<string> {
  const user = normalizeUser(userEmail);
  const memories = await getUserMemories(user);
  const settings = await getUserPersonalizationSettings(user);

  if (format === "json") {
    return JSON.stringify(
      {
        userEmail: user,
        exportedAt: new Date().toISOString(),
        totalMemories: memories.length,
        personalizationSettings: settings,
        memories,
      },
      null,
      2
    );
  }

  // Markdown format
  const lines: string[] = [
    `# TATTVA AI — Cognitive Memory Profile Export`,
    `> **User:** \`${user}\`  `,
    `> **Exported:** ${new Date().toISOString()}  `,
    `> **Active Memories:** ${memories.length}  `,
    ``,
    `## Personalization Settings`,
    `- **Technical Depth:** ${settings.technicalDepth}`,
    `- **Response Length:** ${settings.responseLength}`,
    `- **Tone:** ${settings.tone}`,
    `- **Preferred Language:** ${settings.preferredLanguage}`,
    `- **Code Style:** ${settings.codeStyle}`,
    settings.customInstructions ? `- **Custom Instructions:** "${settings.customInstructions}"` : "",
    ``,
    `## Memory Items by Category`,
  ];

  const grouped: Record<string, MemoryItem[]> = {};
  for (const m of memories) {
    const cat = m.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m);
  }

  for (const [cat, items] of Object.entries(grouped)) {
    lines.push(`### Category: \`${cat.toUpperCase()}\` (${items.length})`);
    for (const item of items) {
      const confirmedTag = item.isConfirmed ? "[CONFIRMED]" : "[INFERRED]";
      const expiryTag = item.expiresAt ? ` (Expires: ${new Date(item.expiresAt).toLocaleDateString()})` : "";
      lines.push(`- **${item.importance}/10** ${confirmedTag} ${item.content}${expiryTag}`);
    }
    lines.push("");
  }

  return lines.filter(Boolean).join("\n");
}

// =============================================================================
// 2. ADVANCED SEMANTIC RETRIEVAL & RANKING
// =============================================================================

export async function retrieveRelevantMemories(
  userEmail: string | undefined | null,
  query: string,
  topK: number = 5,
  workspaceId?: string
): Promise<MemoryItem[]> {
  const user = normalizeUser(userEmail);
  const allMemories = await getUserMemories(user, workspaceId);
  const activeMemories = allMemories.filter(
    (m) => m.active && !isMemoryExpired(m) && (!workspaceId || !m.workspaceId || m.workspaceId === workspaceId)
  );

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

const EXTRACTION_INSTRUCTION = `You are the cognitive memory extraction engine of TATTVA AI.
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
- "short_term": Ephemeral context for current focus.
- "long_term": Permanent user facts and domain context.

Output ONLY a JSON array of objects or an empty array [] if no durable facts were stated:
[
  {
    "content": "Prefers Next.js App Router for all React projects",
    "category": "preference" | "project" | "technical_level" | "language" | "formatting" | "instruction" | "short_term" | "long_term",
    "importance": 1-10
  }
]`;

export async function extractAndStoreMemories(
  userEmail: string | undefined | null,
  userMessage: string,
  workspaceId?: string
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
      model: "gemini-2.5-flash",
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
          "extracted",
          workspaceId
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

  // 1. Check cache
  const cached = settingsCache.get(user);
  if (cached) return cached;

  // 2. Check tenant disk vault
  const diskSettings = readTenantFile<PersonalizationSettings | null>(user, "settings.json", null);
  if (diskSettings) {
    settingsCache.set(user, diskSettings);
    return diskSettings;
  }

  // 3. Check Supabase
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
        settingsCache.set(user, loaded);
        writeTenantFile(user, "settings.json", loaded);
        return loaded;
      }
    } catch {
      // ignore
    }
  }

  const initial = { ...DEFAULT_PERSONALIZATION_SETTINGS };
  settingsCache.set(user, initial);
  writeTenantFile(user, "settings.json", initial);
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

  settingsCache.set(user, merged);
  writeTenantFile(user, "settings.json", merged);

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
    .filter((m) => m.active && !isMemoryExpired(m))
    .map((m) => {
      const statusBadge = m.isConfirmed ? "[CONFIRMED]" : "[INFERRED - VERIFY]";
      return `- ${statusBadge} [${m.category.toUpperCase()}] ${m.content} (importance: ${m.importance}/10)`;
    })
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
  const list = feedbackCache.get(user) || readTenantFile<MessageFeedback[]>(user, "feedback.json", []);
  list.unshift(feedback);
  feedbackCache.set(user, list);
  writeTenantFile(user, "feedback.json", list);

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
  const list = feedbackCache.get(user) || readTenantFile<MessageFeedback[]>(user, "feedback.json", []);
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
