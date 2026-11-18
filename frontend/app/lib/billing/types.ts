/**
 * TATTVA AI - Subscription, Quota & Business Management Types (Phase 45)
 * Defines schemas for plans, user subscriptions, quota limits, payment webhooks, and invoices.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type SubscriptionTier = "free" | "pro" | "enterprise";

export type BillingCycle = "monthly" | "annual";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid";

export interface PlanDefinition {
  id: string;
  name: string;
  tier: SubscriptionTier;
  priceMonthly: number; // in USD
  priceAnnual: number;  // in USD
  currency: string;
  tokenLimitMonthly: number;
  requestLimitDaily: number;
  storageLimitBytes: number;
  allowedModels: string[];
  features: string[];
  active: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  paymentMethodLast4?: string;
  customerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface QuotaUsage {
  userId: string;
  monthKey: string; // YYYY-MM
  tokensUsed: number;
  requestsToday: number;
  lastRequestDate: string; // YYYY-MM-DD
  storageBytesUsed: number;
  lastUpdated: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  tier: SubscriptionTier;
  tokensUsed: number;
  tokenLimit: number;
  remainingTokens: number;
  requestsToday: number;
  requestLimit: number;
  remainingRequests: number;
  storageBytesUsed: number;
  storageLimitBytes: number;
  remainingStorageBytes: number;
  reason?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  subscriptionId?: string;
  customerName: string;
  customerEmail: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: "paid" | "open" | "void";
  billingCycle: BillingCycle;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  createdAt: number;
  paidAt?: number;
  pdfDownloadUrl?: string;
}

export type PaymentProvider = "stripe" | "lemonsqueezy" | "razorpay";

export interface PaymentWebhookEvent {
  id: string;
  provider: PaymentProvider;
  eventType: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface UsageAnalytics {
  totalRevenueUsd: number;
  mrrUsd: number;
  arrUsd: number;
  activeSubscribers: number;
  subscribersByTier: Record<SubscriptionTier, number>;
  totalTokensConsumed: number;
  totalStorageBytes: number;
  costEstimateUsd: number;
  marginPercent: number;
  lastCalculated: number;
}
