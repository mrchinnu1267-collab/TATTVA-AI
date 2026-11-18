/**
 * TATTVA AI - Plan Definition & Feature Gatekeeper
 * Defines tiers, feature access matrices, model entitlements, and pricing rules.
 * Enforces TATTVA AI Go (₹40/month, UPI only).
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
      // 1. FREE PLAN (₹0/month)
      {
        id: "plan_free",
        name: "Community Explorer",
        tier: "free",
        priceMonthly: 0,
        priceAnnual: 0,
        currency: "INR",
        tokenLimitMonthly: 250000,
        requestLimitDaily: 50,
        toolLimitDaily: 25,
        storageLimitBytes: 100 * 1024 * 1024, // 100MB
        memoryLimitSlots: 10,
        voiceMinutesMonthly: 30,
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
        allowedPaymentMethods: ["upi"],
        active: true,
      },

      // 2. TATTVA AI GO PLAN (₹40/month - UPI Only)
      // Benefits: More AI messages with tools, higher tool-usage limits, access to eligible tools.
      // INVARIANT: Image generation, Memory, Storage (100MB), and Voice remain strictly identical to Free.
      {
        id: "plan_go",
        name: "TATTVA AI Go",
        tier: "go",
        priceMonthly: 40,
        priceAnnual: 480,
        currency: "INR",
        tokenLimitMonthly: 1500000, // 1.5M tokens/mo
        requestLimitDaily: 250,     // 5x more daily requests
        toolLimitDaily: 150,        // 6x more tool calls/day
        storageLimitBytes: 100 * 1024 * 1024, // Strictly 100MB (same as Free)
        memoryLimitSlots: 10,       // Strictly 10 slots (same as Free)
        voiceMinutesMonthly: 30,    // Strictly 30 mins (same as Free)
        allowedModels: [
          "gemini-2.5-flash",
          "gemini-2.5-pro",
          "gemini-3.5-flash-lite",
        ],
        features: [
          "basic_chat",
          "standard_rag",
          "expanded_ai_chat_access",
          "higher_tool_usage_limits",
          "access_to_eligible_ai_tools",
          "priority_conversational_intelligence",
          "upi_monthly_billing",
        ],
        allowedPaymentMethods: ["upi"],
        active: true,
      },

      // 3. LEGACY PRO & ENTERPRISE (Preserved for backward compatibility)
      {
        id: "plan_pro",
        name: "Professional Creator",
        tier: "pro",
        priceMonthly: 20,
        priceAnnual: 190,
        currency: "USD",
        tokenLimitMonthly: 5000000,
        requestLimitDaily: 2500,
        toolLimitDaily: 1000,
        storageLimitBytes: 10 * 1024 * 1024 * 1024,
        memoryLimitSlots: 100,
        voiceMinutesMonthly: 300,
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
        toolLimitDaily: 25000,
        storageLimitBytes: 100 * 1024 * 1024 * 1024,
        memoryLimitSlots: 1000,
        voiceMinutesMonthly: 3000,
        allowedModels: [
          "gemini-2.5-flash",
          "gemini-2.5-pro",
          "gemini-3.5-flash-lite",
          "deepseek/deepseek-chat",
          "meta-llama/llama-3.3-70b-instruct",
          "tattva-qwen-1.5b-math",
        ],
        features: [
          "all_pro_features",
          "unlimited_knowledge_graphs",
          "custom_slm_finetuning",
          "dedicated_support_sla",
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

  public calculatePrice(tier: SubscriptionTier, cycle: BillingCycle = "monthly"): number {
    const plan = this.getPlan(tier);
    return cycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
  }
}
