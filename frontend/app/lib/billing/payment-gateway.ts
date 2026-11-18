/**
 * TATTVA AI - Payment Gateway & Subscription Lifecycle Manager (Phase 45)
 * Handles Stripe / LemonSqueezy / Razorpay checkout sessions, webhooks, and subscription states.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import {
  UserSubscription,
  SubscriptionTier,
  BillingCycle,
  PaymentProvider,
  PaymentWebhookEvent,
} from "./types";
import { PlanManager } from "./plan-manager";
import { InvoiceGenerator } from "./invoice-generator";
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export class PaymentGateway {
  private static instance: PaymentGateway;
  private subscriptions: Map<string, UserSubscription> = new Map();
  private planManager: PlanManager;
  private invoiceGenerator: InvoiceGenerator;
  private storageDir: string;
  private storageFile: string;

  private constructor() {
    this.planManager = PlanManager.getInstance();
    this.invoiceGenerator = InvoiceGenerator.getInstance();
    this.storageDir = path.join(process.cwd(), ".tattva_billing");
    this.storageFile = path.join(this.storageDir, "subscriptions.json");
    this.loadState().catch(() => {});
  }

  public static getInstance(): PaymentGateway {
    if (!PaymentGateway.instance) {
      PaymentGateway.instance = new PaymentGateway();
    }
    return PaymentGateway.instance;
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, "utf-8");
      const list: UserSubscription[] = JSON.parse(data);
      for (const item of list) {
        this.subscriptions.set(item.userId, item);
      }
    } catch {
      // Memory state fallback
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      const list = Array.from(this.subscriptions.values());
      await fs.writeFile(this.storageFile, JSON.stringify(list, null, 2), "utf-8");
    } catch {
      // Memory state fallback
    }
  }

  /**
   * Retrieves active subscription for user, defaulting to Free tier if none exists
   */
  public getSubscription(userId: string): UserSubscription {
    let sub = this.subscriptions.get(userId);
    if (!sub) {
      sub = {
        id: `sub_free_${userId.slice(0, 8)}`,
        userId,
        planId: "plan_free",
        tier: "free",
        billingCycle: "monthly",
        status: "active",
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
        cancelAtPeriodEnd: false,
        customerId: `cus_free_${userId.slice(0, 8)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.subscriptions.set(userId, sub);
    }
    return sub;
  }

  /**
   * Generates a checkout session URL for upgrading plans
   */
  public createCheckoutSession(params: {
    userId: string;
    tier: SubscriptionTier;
    billingCycle?: BillingCycle;
    provider?: PaymentProvider;
    successUrl?: string;
    cancelUrl?: string;
  }): { checkoutUrl: string; sessionId: string; priceUsd: number } {
    const cycle = params.billingCycle || "monthly";
    const provider = params.provider || "stripe";
    const price = this.planManager.calculatePrice(params.tier, cycle);
    const sessionId = `cs_${provider}_${crypto.randomBytes(8).toString("hex")}`;

    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://tattva-ai-phi.vercel.app";

    const successUrl = params.successUrl || `${host}/billing?session_id=${sessionId}&status=success`;
    const checkoutUrl = `${host}/api/billing/checkout?session_id=${sessionId}&tier=${params.tier}&cycle=${cycle}`;

    return {
      checkoutUrl,
      sessionId,
      priceUsd: price,
    };
  }

  /**
   * Generates a customer billing portal URL for managing existing subscriptions
   */
  public createBillingPortalSession(userId: string): { portalUrl: string } {
    const sub = this.getSubscription(userId);
    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://tattva-ai-phi.vercel.app";

    return {
      portalUrl: `${host}/billing?customer=${sub.customerId}`,
    };
  }

  /**
   * Processes incoming payment provider webhook events (Stripe, LemonSqueezy, Razorpay)
   */
  public async handleWebhook(event: PaymentWebhookEvent): Promise<{ handled: boolean; action: string }> {
    const { eventType, data } = event;

    if (eventType === "checkout.session.completed") {
      const userId = data.userId || data.client_reference_id || "guest_user";
      const tier: SubscriptionTier = data.tier || "pro";
      const billingCycle: BillingCycle = data.billingCycle || "monthly";
      const customerId = data.customerId || `cus_${crypto.randomBytes(6).toString("hex")}`;
      const customerEmail = data.customerEmail || "subscriber@tattva.ai";
      const customerName = data.customerName || "TATTVA Customer";

      const sub: UserSubscription = {
        id: `sub_${crypto.randomBytes(6).toString("hex")}`,
        userId,
        planId: `plan_${tier}`,
        tier,
        billingCycle,
        status: "active",
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now() + (billingCycle === "annual" ? 365 : 30) * 24 * 60 * 60 * 1000,
        cancelAtPeriodEnd: false,
        paymentMethodLast4: "4242",
        customerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.subscriptions.set(userId, sub);
      await this.saveState();

      // Automatically generate invoice for the subscription payment
      const price = this.planManager.calculatePrice(tier, billingCycle);
      await this.invoiceGenerator.createInvoice({
        userId,
        subscriptionId: sub.id,
        customerName,
        customerEmail,
        billingCycle,
        lineItems: [
          {
            description: `TATTVA AI ${tier.toUpperCase()} Subscription (${billingCycle})`,
            quantity: 1,
            unitPrice: price,
          },
        ],
        status: "paid",
      });

      return { handled: true, action: `Upgraded user ${userId} to ${tier}` };
    }

    if (eventType === "customer.subscription.deleted") {
      const userId = data.userId;
      if (userId && this.subscriptions.has(userId)) {
        const sub = this.subscriptions.get(userId)!;
        sub.tier = "free";
        sub.planId = "plan_free";
        sub.status = "canceled";
        sub.updatedAt = Date.now();
        this.subscriptions.set(userId, sub);
        await this.saveState();
        return { handled: true, action: `Downgraded user ${userId} to free plan` };
      }
    }

    if (eventType === "invoice.payment_failed") {
      const userId = data.userId;
      if (userId && this.subscriptions.has(userId)) {
        const sub = this.subscriptions.get(userId)!;
        sub.status = "past_due";
        sub.updatedAt = Date.now();
        this.subscriptions.set(userId, sub);
        await this.saveState();
        return { handled: true, action: `Marked user ${userId} as past_due` };
      }
    }

    return { handled: true, action: `Ignored unhandled event: ${eventType}` };
  }

  /**
   * Directly sets subscription tier for administrative or testing purposes
   */
  public async setSubscriptionTier(
    userId: string,
    tier: SubscriptionTier,
    billingCycle: BillingCycle = "monthly"
  ): Promise<UserSubscription> {
    const sub = this.getSubscription(userId);
    sub.tier = tier;
    sub.planId = `plan_${tier}`;
    sub.billingCycle = billingCycle;
    sub.status = "active";
    sub.updatedAt = Date.now();

    this.subscriptions.set(userId, sub);
    await this.saveState();
    return sub;
  }

  /**
   * Computes subscriber count metrics
   */
  public getSubscriberMetrics(): { activeSubscribers: number; tierBreakdown: Record<SubscriptionTier, number> } {
    const breakdown: Record<SubscriptionTier, number> = {
      free: 0,
      go: 0,
      pro: 0,
      enterprise: 0,
    };

    let active = 0;
    for (const sub of this.subscriptions.values()) {
      breakdown[sub.tier] = (breakdown[sub.tier] || 0) + 1;
      if (sub.tier !== "free" && sub.status === "active") {
        active++;
      }
    }

    return {
      activeSubscribers: active,
      tierBreakdown: breakdown,
    };
  }
}
