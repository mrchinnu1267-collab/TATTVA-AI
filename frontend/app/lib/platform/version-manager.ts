/**
 * TATTVA AI - Version Management & Release Manifest Engine (Phase 23)
 * Tracks semantic versioning, release channels, and schema migration prerequisites
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface ReleaseManifest {
  version: string;
  releaseChannel: "alpha" | "beta" | "stable";
  buildHash: string;
  buildTimestamp: number;
  minDatabaseSchemaVersion: string;
  requiredMigrations: string[];
  featuresIntroduced: string[];
  breakingChanges: string[];
}

export class VersionManager {
  private static instance: VersionManager;

  private currentManifest: ReleaseManifest = {
    version: "2.1.0-beta.1",
    releaseChannel: "beta",
    buildHash: "b8f2d91",
    buildTimestamp: Date.now(),
    minDatabaseSchemaVersion: "2026.11.15",
    requiredMigrations: [
      "supabase_evaluation_schema.sql",
      "supabase_workspace_rls.sql",
    ],
    featuresIntroduced: [
      "Next-Gen Cognitive Prompt Engine (14 Intents)",
      "Hybrid RAG with Heading-Aware Chunking & Citations",
      "Autonomous Agent DAG Planner with 8s Timeout Bounds",
      "Multimodal Vision, Audio & Video Dispatcher",
      "Indic SLM Fine-Tuning Specifications",
      "Continuous Learning Human Review Gate",
      "Production-Grade Circuit Breaker & RLS",
    ],
    breakingChanges: [],
  };

  public static getInstance(): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager();
    }
    return VersionManager.instance;
  }

  public getManifest(): ReleaseManifest {
    return { ...this.currentManifest };
  }

  public checkMigrationPrerequisites(appliedMigrations: string[]): {
    ready: boolean;
    missingMigrations: string[];
  } {
    const missing = this.currentManifest.requiredMigrations.filter(
      (m) => !appliedMigrations.includes(m)
    );
    return {
      ready: missing.length === 0,
      missingMigrations: missing,
    };
  }
}

export const versionManager = VersionManager.getInstance();
