/**
 * TATTVA AI - Persistent Local Project Memory System
 * Preserves architectural decisions, technology stacks, conventions,
 * past debugging resolutions, and test baselines across sessions.
 * Strictly distinguishes stored project memory from actual model weights training.
 */

import fs from "fs";
import path from "path";

const STUDIO_MEMORY_DIR = path.resolve(process.cwd(), ".tattva_studio");
const MEMORY_FILE_PATH = path.join(STUDIO_MEMORY_DIR, "project-memory.json");

export interface ProjectDecision {
  id: string;
  topic: string;
  decision: string;
  rationale: string;
  recordedAt: string;
}

export interface BugFixRecord {
  id: string;
  errorSignature: string;
  faultyFile: string;
  rootCause: string;
  resolution: string;
  verifiedAt: string;
}

export interface ProjectMemoryStore {
  projectId: string;
  projectName: string;
  techStack: string[];
  codingStandards: string[];
  architecturalDecisions: ProjectDecision[];
  resolvedBugHistory: BugFixRecord[];
  verifiedTestBaselines: Record<string, { passed: boolean; durationMs: number; recordedAt: string }>;
  userPreferences: Record<string, string>;
  lastUpdated: string;
}

export function ensureMemoryDir(): void {
  try {
    if (!fs.existsSync(STUDIO_MEMORY_DIR)) {
      fs.mkdirSync(STUDIO_MEMORY_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[ProjectMemory] Failed to create studio memory dir:", err);
  }
}

/**
 * Loads project memory for a specific project ID, with local disk persistence.
 */
export function getProjectMemory(projectId = "default"): ProjectMemoryStore {
  ensureMemoryDir();
  const filePath = path.join(STUDIO_MEMORY_DIR, `memory-${projectId}.json`);

  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as ProjectMemoryStore;
    } catch {
      // Fallback
    }
  }

  // Default initial memory
  return {
    projectId,
    projectName: "TATTVA AI Monorepo",
    techStack: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS v4", "Supabase PostgreSQL"],
    codingStandards: [
      "Strict TypeScript without any bypass",
      "Tailwind CSS v4 utility classes",
      "Turbopack compatibility",
      "Zero secret leakage",
      "Sandbox path boundary verification",
    ],
    architecturalDecisions: [
      {
        id: "dec_1",
        topic: "Local-First Inference",
        decision: "Operate offline open-weight GGUF models on RTX 3050 4GB GPU + CPU fallback.",
        rationale: "Eliminates third-party API rate limit bottlenecks and external cloud dependencies.",
        recordedAt: new Date().toISOString(),
      },
    ],
    resolvedBugHistory: [],
    verifiedTestBaselines: {},
    userPreferences: {
      theme: "dark",
      preferredModel: "qwen2.5-coder-3b-q4",
      sandboxMode: "strict",
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Saves project memory to local disk.
 */
export function saveProjectMemory(memory: ProjectMemoryStore): void {
  ensureMemoryDir();
  const filePath = path.join(STUDIO_MEMORY_DIR, `memory-${memory.projectId}.json`);
  memory.lastUpdated = new Date().toISOString();
  try {
    fs.writeFileSync(filePath, JSON.stringify(memory, null, 2), "utf-8");
  } catch (err: any) {
    console.warn(`[ProjectMemory] Failed to save memory for ${memory.projectId}:`, err?.message);
  }
}

/**
 * Records an architectural decision into persistent memory.
 */
export function recordDecision(
  projectId: string,
  topic: string,
  decision: string,
  rationale: string
): ProjectDecision {
  const memory = getProjectMemory(projectId);
  const entry: ProjectDecision = {
    id: `dec_${Date.now()}`,
    topic,
    decision,
    rationale,
    recordedAt: new Date().toISOString(),
  };
  memory.architecturalDecisions.push(entry);
  saveProjectMemory(memory);
  return entry;
}

/**
 * Records a verified bug resolution into persistent memory.
 */
export function recordBugResolution(
  projectId: string,
  record: Omit<BugFixRecord, "id" | "verifiedAt">
): BugFixRecord {
  const memory = getProjectMemory(projectId);
  const entry: BugFixRecord = {
    ...record,
    id: `bug_${Date.now()}`,
    verifiedAt: new Date().toISOString(),
  };
  memory.resolvedBugHistory.push(entry);
  saveProjectMemory(memory);
  return entry;
}
