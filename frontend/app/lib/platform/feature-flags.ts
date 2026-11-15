/**
 * TATTVA AI - Dynamic Feature Flags & Rollout Engine (Phase 23)
 * Controls graduated capability exposure, workspace targeting, and instant kill switches
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface FeatureFlagDefinition {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0 to 100
  allowedTiers?: string[];
  allowedWorkspaces?: string[];
}

export class FeatureFlagsEngine {
  private static instance: FeatureFlagsEngine;
  private flags: Map<string, FeatureFlagDefinition> = new Map();

  private constructor() {
    this.seedDefaultFlags();
  }

  public static getInstance(): FeatureFlagsEngine {
    if (!FeatureFlagsEngine.instance) {
      FeatureFlagsEngine.instance = new FeatureFlagsEngine();
    }
    return FeatureFlagsEngine.instance;
  }

  private seedDefaultFlags() {
    const defaults: FeatureFlagDefinition[] = [
      {
        key: "nextgen_prompt_intelligence",
        name: "10-Stage Prompt Intelligence",
        description: "Enables multi-intent classification, negative constraint extraction, and anaphora resolution",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        key: "advanced_rag_hybrid",
        name: "Advanced RAG & Structure Chunking",
        description: "Enables heading-aware markdown chunking and hybrid vector+BM25 retrieval",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        key: "agentic_tool_execution",
        name: "Autonomous Agent Tool Execution",
        description: "Permits multi-step DAG planning and tool sandboxing",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        key: "multimodal_vision_audio_video",
        name: "Multimodal AI Perceptions",
        description: "Enables OCR, VQA, speech STT/TTS, and video keyframe reasoning",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        key: "indic_slm_experimental",
        name: "Custom Indic SLM Local Serving",
        description: "Directs inference to custom fine-tuned TATTVA SLM models",
        enabled: false, // Canary/experimental
        rolloutPercentage: 25,
        allowedTiers: ["vip_tester", "internal_team"],
      },
      {
        key: "beta_feedback_prompts",
        name: "Interactive Beta Feedback Dialogs",
        description: "Prompts beta testers for qualitative feedback after multi-turn completions",
        enabled: true,
        rolloutPercentage: 100,
      },
    ];

    for (const flag of defaults) {
      this.flags.set(flag.key, flag);
    }
  }

  /**
   * Evaluates whether a feature is active for a given user or workspace
   */
  public isEnabled(
    flagKey: string,
    context?: { userId?: string; workspaceId?: string; tier?: string }
  ): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag || !flag.enabled) return false;

    // Check tier restrictions
    if (flag.allowedTiers && flag.allowedTiers.length > 0) {
      if (!context?.tier || !flag.allowedTiers.includes(context.tier)) {
        return false;
      }
    }

    // Check workspace restrictions
    if (flag.allowedWorkspaces && flag.allowedWorkspaces.length > 0) {
      if (!context?.workspaceId || !flag.allowedWorkspaces.includes(context.workspaceId)) {
        return false;
      }
    }

    // Percentage rollout evaluation based on consistent hash
    if (flag.rolloutPercentage < 100) {
      const id = context?.userId || context?.workspaceId || "anonymous";
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        hash = (hash << 5) - hash + id.charCodeAt(i);
        hash |= 0;
      }
      const score = Math.abs(hash) % 100;
      return score < flag.rolloutPercentage;
    }

    return true;
  }

  public setFlagState(key: string, enabled: boolean) {
    const flag = this.flags.get(key);
    if (flag) flag.enabled = enabled;
  }

  public listFlags(): FeatureFlagDefinition[] {
    return Array.from(this.flags.values());
  }
}

export const featureFlagsEngine = FeatureFlagsEngine.getInstance();
