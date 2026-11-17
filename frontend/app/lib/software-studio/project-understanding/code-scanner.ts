/**
 * TATTVA AI - Code Scanner & Project Graph Indexer
 * Scans directories recursively with strict exclusion boundaries.
 * Indexes functions, classes, imports, routes, schemas, and dependencies with incremental caching.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { extractSymbols, extractApiRoute, extractDatabaseSchemas } from "./symbol-extractor";
import type { SupportedLanguage, FileIndexEntry, ProjectGraph } from "./types";

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "dist",
  "build",
  "coverage",
  ".tattva_vault",
  ".tattva_studio",
  ".gemini",
  "tmp",
  ".turbo",
]);

const EXCLUDED_FILES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "TATTVA_AI.apk",
  "TATTVA_AI_v1.1.apk",
  "TATTVA_AI_v1.2.apk",
  "TATTVA_AI_v1.3.apk",
]);

const LANGUAGE_EXTENSIONS: Record<string, SupportedLanguage> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".py": "python",
  ".dart": "dart",
  ".kt": "kotlin",
  ".sql": "sql",
  ".html": "html",
  ".css": "css",
  ".json": "json",
  ".md": "markdown",
};

export const STUDIO_CACHE_DIR = path.resolve(process.cwd(), ".tattva_studio");
export const GRAPH_CACHE_FILE = path.join(STUDIO_CACHE_DIR, "project-graph.json");

export function detectLanguage(fileName: string): SupportedLanguage {
  const ext = path.extname(fileName).toLowerCase();
  return LANGUAGE_EXTENSIONS[ext] || "unknown";
}

function computeHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/**
 * Scans and indexes an entire project directory with incremental caching.
 */
export async function indexProject(rootPath = process.cwd()): Promise<ProjectGraph> {
  const startedAt = new Date().toISOString();
  const files: Record<string, FileIndexEntry> = {};
  const languages: Record<SupportedLanguage, number> = {
    typescript: 0,
    javascript: 0,
    python: 0,
    dart: 0,
    kotlin: 0,
    sql: 0,
    html: 0,
    css: 0,
    json: 0,
    markdown: 0,
    unknown: 0,
  };

  const apiRoutes: ProjectGraph["apiRoutes"] = [];
  const databaseSchemas: ProjectGraph["databaseSchemas"] = [];
  let totalLines = 0;

  // Load existing cache if available
  let cachedGraph: ProjectGraph | null = null;
  try {
    if (fs.existsSync(GRAPH_CACHE_FILE)) {
      cachedGraph = JSON.parse(fs.readFileSync(GRAPH_CACHE_FILE, "utf-8")) as ProjectGraph;
    }
  } catch {
    // Non-fatal cache read miss
  }

  // Read package.json if present
  let dependencies: Record<string, string> = {};
  let devDependencies: Record<string, string> = {};
  let framework: ProjectGraph["framework"] = "unknown";

  const pkgPath = path.join(rootPath, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      dependencies = pkg.dependencies || {};
      devDependencies = pkg.devDependencies || {};
      if (dependencies.next) framework = "nextjs";
      else if (dependencies.react) framework = "react";
      else framework = "node";
    } catch {
      // Ignore parse failure
    }
  }

  function walk(currentDir: string) {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const name = entry.name;
      const fullPath = path.join(currentDir, name);
      const relPath = path.relative(rootPath, fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(name) && !name.startsWith(".")) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        if (EXCLUDED_FILES.has(name) || name.endsWith(".log") || name.endsWith(".png") || name.endsWith(".jpg")) {
          continue;
        }

        const lang = detectLanguage(name);
        if (lang === "unknown") continue;

        languages[lang] = (languages[lang] || 0) + 1;

        let stat: fs.Stats;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }

        // Check if file is unchanged in cache
        const cachedEntry = cachedGraph?.files?.[relPath];
        if (cachedEntry && cachedEntry.lastModifiedMs === stat.mtimeMs && cachedEntry.sizeBytes === stat.size) {
          files[relPath] = cachedEntry;
          totalLines += cachedEntry.lineCount;

          if (lang === "typescript" || lang === "javascript") {
            const api = extractApiRoute(fullPath, "");
            if (api) apiRoutes.push(api);
          }
          continue;
        }

        // Read and parse new or modified file
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lineCount = content.split("\n").length;
          totalLines += lineCount;
          const hash = computeHash(content);

          const { symbols, imports, exports } = extractSymbols(content, lang, fullPath);

          const entryObj: FileIndexEntry = {
            filePath: fullPath,
            relativePath: relPath,
            language: lang,
            sizeBytes: stat.size,
            lastModifiedMs: stat.mtimeMs,
            hash,
            imports,
            exports,
            symbols,
            lineCount,
          };

          files[relPath] = entryObj;

          // Check API routes
          if (lang === "typescript" || lang === "javascript") {
            const api = extractApiRoute(fullPath, content);
            if (api) apiRoutes.push(api);
          }

          // Check database schemas
          if (lang === "sql") {
            const schemas = extractDatabaseSchemas(fullPath, content);
            databaseSchemas.push(...schemas);
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  walk(rootPath);

  const graph: ProjectGraph = {
    rootPath,
    scannedAt: startedAt,
    totalFiles: Object.keys(files).length,
    totalLines,
    languages,
    dependencies,
    devDependencies,
    framework,
    apiRoutes,
    databaseSchemas,
    files,
  };

  // Persist cache
  try {
    if (!fs.existsSync(STUDIO_CACHE_DIR)) {
      fs.mkdirSync(STUDIO_CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(GRAPH_CACHE_FILE, JSON.stringify(graph, null, 2), "utf-8");
  } catch (err) {
    console.warn("[CodeScanner] Failed to write project graph cache:", err);
  }

  return graph;
}

/**
 * Retrieves the most relevant source files for a given natural language prompt or query.
 * Eliminates context window bloat by picking only top related modules.
 */
export function retrieveRelevantContext(
  graph: ProjectGraph,
  query: string,
  maxFiles = 5
): Array<{ relativePath: string; content: string; language: SupportedLanguage; reason: string }> {
  const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const scoredFiles: Array<{ relPath: string; score: number; reason: string }> = [];

  for (const [relPath, entry] of Object.entries(graph.files)) {
    let score = 0;
    const pathLower = relPath.toLowerCase();

    for (const token of queryTokens) {
      if (pathLower.includes(token)) score += 5;
    }

    for (const sym of entry.symbols) {
      const symLower = sym.name.toLowerCase();
      for (const token of queryTokens) {
        if (symLower.includes(token)) score += 8;
      }
    }

    if (score > 0) {
      scoredFiles.push({
        relPath,
        score,
        reason: `Matched ${score} relevance points across symbols and file path.`,
      });
    }
  }

  scoredFiles.sort((a, b) => b.score - a.score);
  const top = scoredFiles.slice(0, maxFiles);

  const results: Array<{ relativePath: string; content: string; language: SupportedLanguage; reason: string }> = [];
  for (const item of top) {
    const entry = graph.files[item.relPath];
    if (entry) {
      try {
        const content = fs.readFileSync(entry.filePath, "utf-8");
        results.push({
          relativePath: item.relPath,
          content,
          language: entry.language,
          reason: item.reason,
        });
      } catch {
        // Skip unreadable
      }
    }
  }

  return results;
}
