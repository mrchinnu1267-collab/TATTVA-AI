/**
 * TATTVA AI - Subscription, Quota & Business Management Types
 * Defines schemas for plans, user subscriptions, quota limits, UPI payments, webhooks, and invoices.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type SubscriptionTier = "free" | "go" | "pro" | "enterprise";

export type BillingCycle = "monthly" | "annual";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "pending"
  | "expired"
  | "renewal_pending";

export interface PlanDefinition {
  id: string;
  name: string;
  tier: SubscriptionTier;
  priceMonthly: number; // in INR for Go, USD for Pro/Enterprise
  priceAnnual: number;
  currency: string;     // "INR" for Go, "USD" for legacy Pro/Enterprise
  tokenLimitMonthly: number;
  requestLimitDaily: number;
  toolLimitDaily?: number;
  storageLimitBytes: number;
  memoryLimitSlots?: number;
  voiceMinutesMonthly?: number;
  allowedModels: string[];
  features: string[];
  allowedPaymentMethods?: string[];
  active: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  autoRenewEnabled?: boolean;
  cancellationStatus?: "none" | "scheduled" | "cancelled";
  cancelledAt?: number;
  provider?: PaymentProvider;
  providerSubscriptionId?: string;
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
  toolsUsedToday?: number;
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
  toolsUsedToday?: number;
  toolLimit?: number;
  remainingTools?: number;
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

export type PaymentProvider = "razorpay" | "cashfree" | "stripe" | "lemonsqueezy";

export interface PaymentWebhookEvent {
  id: string;
  provider: PaymentProvider;
  eventType: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface UsageAnalytics {
  totalRevenueUsd: number;
  totalRevenueInr: number;
  mrrInr: number;
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

export interface UpiPaymentRecord {
  paymentId: string;
  userId: string;
  subscriptionId: string;
  providerPaymentId?: string;
  providerOrderId: string;
  amount: number;
  currency: "INR";
  paymentMethod: "upi";
  status: "success" | "failed" | "pending" | "refunded";
  upiVpa?: string;
  upiTransactionId?: string;
  errorCode?: string;
  errorDescription?: string;
  verifiedAt?: number;
  createdAt: number;
}

export interface UpiOrderCreationResult {
  orderId: string;
  amount: number;
  currency: "INR";
  upiIntentUrl?: string;
  upiQrData?: string;
  keyId: string;
  isSandbox: boolean;
  planName: string;
  billingInterval: "monthly";
}

export interface RefundRecord {
  refundId: string;
  paymentId: string;
  userId: string;
  providerRefundId?: string;
  amount: number;
  currency: "INR";
  reason: string;
  status: "pending" | "processed" | "failed";
  createdAt: number;
  processedAt?: number;
}
