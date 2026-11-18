/**
 * TATTVA AI - Billing & Commercial Platform Engine
 * Unified Facade for Subscriptions, UPI Payments, Quota Enforcement, Invoicing, and Commercial Analytics.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { PlanManager } from "./plan-manager";
import { QuotaTracker } from "./quota-tracker";
import { PaymentGateway } from "./payment-gateway";
import { InvoiceGenerator } from "./invoice-generator";
import { UpiPaymentGateway } from "./upi-gateway";
import {
  SubscriptionTier,
  BillingCycle,
  UserSubscription,
  QuotaCheckResult,
  Invoice,
  UsageAnalytics,
  PlanDefinition,
  UpiOrderCreationResult,
  UpiPaymentRecord,
  RefundRecord,
} from "./types";

export class BillingEngine {
  private static instance: BillingEngine;

  private planManager: PlanManager;
  private quotaTracker: QuotaTracker;
  private paymentGateway: PaymentGateway;
  private invoiceGenerator: InvoiceGenerator;
  private upiGateway: UpiPaymentGateway;

  private constructor() {
    this.planManager = PlanManager.getInstance();
    this.quotaTracker = QuotaTracker.getInstance();
    this.paymentGateway = PaymentGateway.getInstance();
    this.invoiceGenerator = InvoiceGenerator.getInstance();
    this.upiGateway = UpiPaymentGateway.getInstance();
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
   * Directly routes through the authoritative UPI Payment Gateway
   */
  public getUserSubscription(userId: string): UserSubscription {
    return this.upiGateway.getSubscription(userId);
  }

  public async createUpiOrder(params: {
    userId: string;
    userEmail: string;
    autoRenew?: boolean;
  }): Promise<UpiOrderCreationResult> {
    return this.upiGateway.createUpiOrder(params);
  }

  public async verifyUpiPayment(params: {
    userId: string;
    orderId: string;
    paymentId: string;
    signature: string;
    upiVpa?: string;
  }): Promise<{ success: boolean; subscription?: UserSubscription; error?: string }> {
    return this.upiGateway.verifyPayment(params);
  }

  public async cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    return this.upiGateway.cancelSubscription(userId);
  }

  public async requestRefund(params: {
    userId: string;
    paymentId: string;
    reason: string;
  }): Promise<RefundRecord> {
    return this.upiGateway.requestRefund(params);
  }

  public getUserPayments(userId: string): UpiPaymentRecord[] {
    return this.upiGateway.getUserPayments(userId);
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

  public checkToolQuota(userId: string, tier: SubscriptionTier = "free"): { allowed: boolean; reason?: string } {
    return this.quotaTracker.checkToolQuota(userId, tier);
  }

  public async recordUsage(
    userId: string,
    tokens: number = 0,
    storageDeltaBytes: number = 0,
    toolsUsed: number = 0
  ) {
    return this.quotaTracker.recordUsage(userId, tokens, storageDeltaBytes, toolsUsed);
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
    const adminMetrics = this.upiGateway.getAdminMetrics();
    const { totalTokens, totalStorage } = this.quotaTracker.getAggregateMetrics();

    // ₹40/mo per active Go subscriber
    const mrrInr = adminMetrics.activeGoSubscribers * 40;
    const totalRevInr = adminMetrics.totalRevenueInr;

    // Converted to USD estimate (1 USD ~ 85 INR)
    const mrrUsd = Math.round((mrrInr / 85) * 100) / 100;
    const arrUsd = mrrUsd * 12;

    const tokenCost = (totalTokens / 1000000) * 0.15;
    const storageGb = totalStorage / (1024 * 1024 * 1024);
    const storageCost = storageGb * 0.02;
    const totalCost = tokenCost + storageCost;

    const margin = mrrUsd > 0 ? Math.round(((mrrUsd - totalCost) / mrrUsd) * 100) : 85;

    const tierBreakdown: Record<SubscriptionTier, number> = {
      free: adminMetrics.totalSubscriptions - adminMetrics.activeGoSubscribers,
      go: adminMetrics.activeGoSubscribers,
      pro: 0,
      enterprise: 0,
    };

    return {
      totalRevenueUsd: Math.round((totalRevInr / 85) * 100) / 100,
      totalRevenueInr: totalRevInr,
      mrrInr,
      mrrUsd,
      arrUsd,
      activeSubscribers: adminMetrics.activeGoSubscribers,
      subscribersByTier: tierBreakdown,
      totalTokensConsumed: totalTokens,
      totalStorageBytes: totalStorage,
      costEstimateUsd: Math.round(totalCost * 100) / 100,
      marginPercent: Math.max(50, Math.min(95, margin)),
      lastCalculated: Date.now(),
    };
  }

  public getAdminMetrics() {
    return this.upiGateway.getAdminMetrics();
  }
}

// Explicit named exports for TypeScript execution and clarity
export { PlanManager } from "./plan-manager";
export { QuotaTracker } from "./quota-tracker";
export { PaymentGateway } from "./payment-gateway";
export { UpiPaymentGateway } from "./upi-gateway";
export { InvoiceGenerator } from "./invoice-generator";
export * from "./types";
