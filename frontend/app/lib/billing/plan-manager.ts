/**
 * TATTVA AI - Plan Definition & Feature Gatekeeper (Phase 45)
 * Defines tiers, feature access matrices, model entitlements, and pricing rules.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { PlanDefinition, SubscriptionTier, BillingCycle } from "./types";

export class PlanManager {
  private static instance: PlanManager;

  private plans: Map<string, PlanDefinition> = new Map();

  private constructor() {
    this.initializeDefaultPlans();
  }

  public static getInstance(): PlanManager {
    if (!PlanManager.instance) {
      PlanManager.instance = new PlanManager();
    }
    return PlanManager.instance;
  }

  private initializeDefaultPlans(): void {
    const defaultPlans: PlanDefinition[] = [
      {
        id: "plan_free",
        name: "Community Explorer",
        tier: "free",
        priceMonthly: 0,
        priceAnnual: 0,
        currency: "USD",
        tokenLimitMonthly: 250000,
        requestLimitDaily: 100,
        storageLimitBytes: 100 * 1024 * 1024, // 100MB
        allowedModels: [
          "gemini-2.5-flash",
          "gemini-3.5-flash-lite",
        ],
        features: [
          "basic_chat",
          "standard_rag",
          "learning_platform_basic",
          "community_support",
        ],
        active: true,
      },
      {
        id: "plan_pro",
        name: "Professional Creator",
        tier: "pro",
        priceMonthly: 20,
        priceAnnual: 190, // ~20% discount
        currency: "USD",
        tokenLimitMonthly: 5000000,
        requestLimitDaily: 2500,
        storageLimitBytes: 10 * 1024 * 1024 * 1024, // 10GB
        allowedModels: [
          "gemini-2.5-flash",
          "gemini-2.5-pro",
          "gemini-3.5-flash-lite",
          "deepseek/deepseek-chat",
          "meta-llama/llama-3.3-70b-instruct",
        ],
        features: [
          "basic_chat",
          "standard_rag",
          "advanced_document_intelligence",
          "autonomous_programming_agent",
          "knowledge_graph_studio",
          "data_science_studio",
          "learning_platform_pro",
          "priority_queue",
        ],
        active: true,
      },
      {
        id: "plan_enterprise",
        name: "Enterprise Sovereign",
        tier: "enterprise",
        priceMonthly: 150,
        priceAnnual: 1440,
        currency: "USD",
        tokenLimitMonthly: 50000000,
        requestLimitDaily: 50000,
        storageLimitBytes: 100 * 1024 * 1024 * 1024, // 100GB
        allowedModels: [
          "gemini-2.5-flash",
          "gemini-2.5-pro",
          "gemini-3.5-flash-lite",
          "deepseek/deepseek-chat",
          "meta-llama/llama-3.3-70b-instruct",
          "tattva-qwen-1.5b-math",
          "custom_slm_dedicated",
        ],
        features: [
          "all_pro_features",
          "unlimited_knowledge_graphs",
          "custom_slm_finetuning",
          "dedicated_support_sla",
          "custom_domain_cname",
          "audit_compliance_export",
          "multi_seat_workspaces",
          "enterprise_sso",
        ],
        active: true,
      },
    ];

    for (const plan of defaultPlans) {
      this.plans.set(plan.id, plan);
      this.plans.set(plan.tier, plan);
    }
  }

  public listPlans(): PlanDefinition[] {
    const seen = new Set<string>();
    const list: PlanDefinition[] = [];
    for (const plan of this.plans.values()) {
      if (!seen.has(plan.id)) {
        seen.add(plan.id);
        list.push(plan);
      }
    }
    return list;
  }

  public getPlan(idOrTier: string): PlanDefinition {
    return (
      this.plans.get(idOrTier) ||
      this.plans.get("free") ||
      Array.from(this.plans.values())[0]
    );
  }

  public canAccessModel(tier: SubscriptionTier, modelId: string): boolean {
    const plan = this.getPlan(tier);
    if (tier === "enterprise") return true;
    return plan.allowedModels.some(
      (m) => m === modelId || modelId.toLowerCase().includes(m.toLowerCase())
    );
  }

  public canAccessFeature(tier: SubscriptionTier, featureKey: string): boolean {
    const plan = this.getPlan(tier);
    if (tier === "enterprise") return true;
    return plan.features.includes(featureKey);
  }

  public calculatePrice(tier: SubscriptionTier, cycle: BillingCycle): number {
    const plan = this.getPlan(tier);
    return cycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
  }
}
