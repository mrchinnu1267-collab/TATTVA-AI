/**
 * TATTVA AI - Billing & Commercial Platform Engine (Phase 45)
 * Unified Facade for Subscriptions, Quota Enforcement, Invoicing, and Commercial Analytics.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { PlanManager } from "./plan-manager";
import { QuotaTracker } from "./quota-tracker";
import { PaymentGateway } from "./payment-gateway";
import { InvoiceGenerator } from "./invoice-generator";
import {
  SubscriptionTier,
  BillingCycle,
  UserSubscription,
  QuotaCheckResult,
  Invoice,
  UsageAnalytics,
  PlanDefinition,
} from "./types";

export class BillingEngine {
  private static instance: BillingEngine;

  private planManager: PlanManager;
  private quotaTracker: QuotaTracker;
  private paymentGateway: PaymentGateway;
  private invoiceGenerator: InvoiceGenerator;

  private constructor() {
    this.planManager = PlanManager.getInstance();
    this.quotaTracker = QuotaTracker.getInstance();
    this.paymentGateway = PaymentGateway.getInstance();
    this.invoiceGenerator = InvoiceGenerator.getInstance();
  }

  public static getInstance(): BillingEngine {
    if (!BillingEngine.instance) {
      BillingEngine.instance = new BillingEngine();
    }
    return BillingEngine.instance;
  }

  /**
   * Plans & Entitlements
   */
  public getPlans(): PlanDefinition[] {
    return this.planManager.listPlans();
  }

  public getPlan(tier: SubscriptionTier): PlanDefinition {
    return this.planManager.getPlan(tier);
  }

  public canAccessModel(tier: SubscriptionTier, modelId: string): boolean {
    return this.planManager.canAccessModel(tier, modelId);
  }

  public canAccessFeature(tier: SubscriptionTier, featureKey: string): boolean {
    return this.planManager.canAccessFeature(tier, featureKey);
  }

  /**
   * User Subscriptions
   */
  public getUserSubscription(userId: string): UserSubscription {
    return this.paymentGateway.getSubscription(userId);
  }

  public async setSubscriptionTier(
    userId: string,
    tier: SubscriptionTier,
    billingCycle: BillingCycle = "monthly"
  ): Promise<UserSubscription> {
    return this.paymentGateway.setSubscriptionTier(userId, tier, billingCycle);
  }

  public createCheckout(params: {
    userId: string;
    tier: SubscriptionTier;
    billingCycle?: BillingCycle;
  }) {
    return this.paymentGateway.createCheckoutSession(params);
  }

  public getBillingPortal(userId: string) {
    return this.paymentGateway.createBillingPortalSession(userId);
  }

  /**
   * Quotas & Consumption
   */
  public checkQuota(
    userId: string,
    tier: SubscriptionTier = "free",
    tokens: number = 0,
    storageBytes: number = 0
  ): QuotaCheckResult {
    return this.quotaTracker.checkQuota(userId, tier, tokens, storageBytes);
  }

  public async recordUsage(
    userId: string,
    tokens: number = 0,
    storageDeltaBytes: number = 0
  ) {
    return this.quotaTracker.recordUsage(userId, tokens, storageDeltaBytes);
  }

  public getUserUsage(userId: string, tier: SubscriptionTier = "free"): QuotaCheckResult {
    return this.quotaTracker.getUserUsage(userId, tier);
  }

  /**
   * Invoices
   */
  public getInvoices(userId?: string): Invoice[] {
    return this.invoiceGenerator.listInvoices(userId);
  }

  public getInvoice(id: string): Invoice | null {
    return this.invoiceGenerator.getInvoice(id);
  }

  public renderInvoiceHtml(invoice: Invoice): string {
    return this.invoiceGenerator.renderInvoiceHtml(invoice);
  }

  public async createInvoice(params: {
    userId: string;
    customerName: string;
    customerEmail: string;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
    currency?: string;
    status?: "paid" | "open" | "void";
  }): Promise<Invoice> {
    return this.invoiceGenerator.createInvoice(params);
  }

  /**
   * Commercial Analytics & Revenue Health
   */
  public getAnalytics(): UsageAnalytics {
    const { activeSubscribers, tierBreakdown } = this.paymentGateway.getSubscriberMetrics();
    const { totalTokens, totalStorage } = this.quotaTracker.getAggregateMetrics();

    // Calculate MRR: Pro ($20/mo), Enterprise ($150/mo)
    const proMrr = (tierBreakdown.pro || 0) * 20;
    const entMrr = (tierBreakdown.enterprise || 0) * 150;
    const mrr = proMrr + entMrr;
    const arr = mrr * 12;

    // Approximate compute cost: $0.15 per 1M tokens average + $0.02 per GB storage
    const tokenCost = (totalTokens / 1000000) * 0.15;
    const storageGb = totalStorage / (1024 * 1024 * 1024);
    const storageCost = storageGb * 0.02;
    const totalCost = tokenCost + storageCost;

    const margin = mrr > 0 ? Math.round(((mrr - totalCost) / mrr) * 100) : 85;

    return {
      totalRevenueUsd: mrr,
      mrrUsd: mrr,
      arrUsd: arr,
      activeSubscribers,
      subscribersByTier: tierBreakdown,
      totalTokensConsumed: totalTokens,
      totalStorageBytes: totalStorage,
      costEstimateUsd: Math.round(totalCost * 100) / 100,
      marginPercent: Math.max(50, Math.min(95, margin)),
      lastCalculated: Date.now(),
    };
  }
}

// Explicit named exports for TypeScript execution and clarity
export { PlanManager } from "./plan-manager";
export { QuotaTracker } from "./quota-tracker";
export { PaymentGateway } from "./payment-gateway";
export { InvoiceGenerator } from "./invoice-generator";
export * from "./types";
