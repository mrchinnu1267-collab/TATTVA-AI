/**
 * TATTVA AI - Centralized Dataset Registry & Universal Loader
 * Manages benchmark datasets, schema normalization, format adaptation (CSV, JSON, JSONL)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import {
  DatasetMetadata,
  DatasetRegistryManifest,
  UniversalQuestionRecord,
} from "./types";
import { mmmluValidator } from "../mmmlu/validator";

export class DatasetRegistry {
  private static instance: DatasetRegistry;
  private manifestPath: string | null = null;
  private cachedManifest: DatasetRegistryManifest | null = null;
  private cachedRecords: Map<string, UniversalQuestionRecord[]> = new Map();

  public static getInstance(): DatasetRegistry {
    if (!DatasetRegistry.instance) {
      DatasetRegistry.instance = new DatasetRegistry();
    }
    return DatasetRegistry.instance;
  }

  /**
   * Resolves canonical root for datasets directory
   */
  public resolveCanonicalDatasetsRoot(): string {
    const candidates = [
      path.resolve(process.cwd(), "datasets"),
      path.resolve(process.cwd(), "..", "datasets"),
      path.resolve(__dirname, "../../../../../datasets"),
      path.resolve(__dirname, "../../../../datasets"),
    ];

    for (const c of candidates) {
      try {
        if (fs.existsSync(/*turbopackIgnore: true*/ c) && fs.statSync(/*turbopackIgnore: true*/ c).isDirectory()) {
          return c;
        }
      } catch {
        // Continue search
      }
    }

    return path.resolve(process.cwd(), "datasets");
  }

  /**
   * Resolves datasets-manifest.json path
   */
  public resolveManifestPath(): string {
    if (this.manifestPath && fs.existsSync(this.manifestPath)) {
      return this.manifestPath;
    }

    const root = this.resolveCanonicalDatasetsRoot();
    const candidate = path.join(root, "datasets-manifest.json");

    if (fs.existsSync(candidate)) {
      this.manifestPath = candidate;
      return candidate;
    }

    // Fallback to local
    return candidate;
  }

  /**
   * Loads the dataset manifest with caching
   */
  public getManifest(forceReload = false): DatasetRegistryManifest {
    if (!forceReload && this.cachedManifest) {
      return this.cachedManifest;
    }

    const p = this.resolveManifestPath();
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf8");
        this.cachedManifest = JSON.parse(raw);
        return this.cachedManifest!;
      } catch (err) {
        console.warn("[DatasetRegistry] Failed to parse manifest, initializing default:", err);
      }
    }

    // Default manifest structure if none exists
    const defaultManifest: DatasetRegistryManifest = {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      canonicalRoot: "datasets/",
      datasets: [],
    };
    this.cachedManifest = defaultManifest;
    return defaultManifest;
  }

  /**
   * Lists all datasets from the registry
   */
  public listDatasets(): DatasetMetadata[] {
    const manifest = this.getManifest();
    const root = this.resolveCanonicalDatasetsRoot();

    return manifest.datasets.map((d) => {
      const fullPath = path.join(root, d.relativePath);
      let size = d.fileSizeBytes;
      if (fs.existsSync(fullPath)) {
        try {
          size = fs.statSync(fullPath).size;
        } catch {
          // ignore
        }
      }
      return {
        ...d,
        fileSizeBytes: size,
        fileSizeFormatted: this.formatBytes(size),
      };
    });
  }

  /**
   * Gets single dataset metadata by ID
   */
  public getDatasetById(id: string): DatasetMetadata | null {
    const datasets = this.listDatasets();
    return datasets.find((d) => d.id === id) || null;
  }

  /**
   * Universal record loader supporting CSV, JSON, and JSONL
   * Automatically strips UTF-8 BOM, normalizes Unicode NFC, and adapts schemas
   */
  public loadRecords(
    datasetId: string,
    forceReload = false
  ): UniversalQuestionRecord[] {
    if (!forceReload && this.cachedRecords.has(datasetId)) {
      return this.cachedRecords.get(datasetId)!;
    }

    const meta = this.getDatasetById(datasetId);
    if (!meta) {
      throw new Error(`Dataset with ID '${datasetId}' not found in registry.`);
    }

    const root = this.resolveCanonicalDatasetsRoot();
    const filePath = path.normalize(path.join(root, meta.relativePath));

    // Security guard: Enforce sandbox boundary to prevent directory traversal
    if (!filePath.startsWith(root)) {
      throw new Error(`Security Exception: Dataset path traverses outside datasets directory`);
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Dataset file '${meta.relativePath}' not found on disk at: ${filePath}`);
    }

    let rawBuffer = fs.readFileSync(filePath);

    // Strip UTF-8 BOM (0xEF, 0xBB, 0xBF) if present
    if (rawBuffer.length >= 3 && rawBuffer[0] === 0xef && rawBuffer[1] === 0xbb && rawBuffer[2] === 0xbf) {
      rawBuffer = rawBuffer.subarray(3);
    }

    const textContent = rawBuffer.toString("utf8").normalize("NFC");
    const records: UniversalQuestionRecord[] = [];

    // Adapter dispatch based on format
    if (meta.format === "jsonl") {
      const lines = textContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (let i = 0; i < lines.length; i++) {
        try {
          const parsed = JSON.parse(lines[i]);
          records.push({
            id: parsed.id || `${datasetId}_${i + 1}`,
            question: parsed.question || parsed.prompt || "",
            options: parsed.options || undefined,
            expectedAnswer: parsed.expectedAnswer || parsed.answer || undefined,
            subject: parsed.subject || "general",
            language: parsed.language || meta.language,
            context: parsed.context,
            criteria: parsed.criteria,
            conversationHistory: parsed.conversationHistory,
            expectedBehavior: parsed.expectedBehavior,
            metadata: { ...parsed, ...(parsed.metadata || {}) },
          });
        } catch {
          // Skip malformed lines
        }
      }
    } else if (meta.format === "json") {
      const parsed = JSON.parse(textContent);
      const items = Array.isArray(parsed) ? parsed : parsed.records || parsed.questions || [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        records.push({
          id: item.id || `${datasetId}_${i + 1}`,
          question: item.question || item.prompt || "",
          options: item.options || undefined,
          expectedAnswer: item.expectedAnswer || item.answer || undefined,
          subject: item.subject || "general",
          language: item.language || meta.language,
          context: item.context,
          criteria: item.criteria,
          conversationHistory: item.conversationHistory,
          expectedBehavior: item.expectedBehavior,
        });
      }
    } else if (meta.format === "csv") {
      // Use RFC-4180 state-machine parser
      const parsedRows = mmmluValidator.parseRFC4180CSV(textContent);
      if (parsedRows.length >= 2) {
        const header = parsedRows[0].map((h) => h.trim().toLowerCase());
        const colQ = header.findIndex((h) => h === "question");
        const colA = header.findIndex((h) => h === "a");
        const colB = header.findIndex((h) => h === "b");
        const colC = header.findIndex((h) => h === "c");
        const colD = header.findIndex((h) => h === "d");
        const colAns = header.findIndex((h) => h === "answer");
        const colSub = header.findIndex((h) => h === "subject");

        for (let r = 1; r < parsedRows.length; r++) {
          const row = parsedRows[r];
          if (!row || row.length < 7 || row.join("").trim() === "") continue;

          records.push({
            id: r,
            question: (row[colQ] || "").trim(),
            options: {
              A: (row[colA] || "").trim(),
              B: (row[colB] || "").trim(),
              C: (row[colC] || "").trim(),
              D: (row[colD] || "").trim(),
            },
            expectedAnswer: (row[colAns] || "").trim().toUpperCase(),
            subject: (row[colSub] || "general").trim(),
            language: meta.language,
          });
        }
      }
    }

    this.cachedRecords.set(datasetId, records);
    return records;
  }

  /**
   * Activates or deactivates a dataset in the manifest
   */
  public setDatasetActive(id: string, isActive: boolean): boolean {
    const manifest = this.getManifest();
    const dataset = manifest.datasets.find((d) => d.id === id);
    if (!dataset) return false;

    dataset.isActive = isActive;
    manifest.lastUpdated = new Date().toISOString();
    this.saveManifest(manifest);
    return true;
  }

  /**
   * Registers a newly uploaded dataset safely
   */
  public registerDataset(metadata: DatasetMetadata): void {
    const manifest = this.getManifest();
    const existingIndex = manifest.datasets.findIndex((d) => d.id === metadata.id);

    if (existingIndex >= 0) {
      manifest.datasets[existingIndex] = metadata;
    } else {
      manifest.datasets.push(metadata);
    }

    manifest.lastUpdated = new Date().toISOString();
    this.saveManifest(manifest);
  }

  private saveManifest(manifest: DatasetRegistryManifest): void {
    const p = this.resolveManifestPath();
    const content = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(p, content, "utf8");

    // Mirror to frontend copy if present
    try {
      const root = this.resolveCanonicalDatasetsRoot();
      const mirror = path.resolve(process.cwd(), "datasets", "datasets-manifest.json");
      if (mirror !== path.resolve(p) && fs.existsSync(path.dirname(mirror))) {
        fs.writeFileSync(mirror, content, "utf8");
      }
    } catch {
      // Ignore mirror write failures
    }

    this.cachedManifest = manifest;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

export const datasetRegistry = DatasetRegistry.getInstance();
