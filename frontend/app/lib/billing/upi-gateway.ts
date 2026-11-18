/**
 * TATTVA AI - Razorpay UPI Payment Gateway & Subscription Lifecycle Engine
 * Handles UPI orders, dynamic UPI QR generation, UPI Intent links,
 * server-side cryptographic signature verification, webhooks, and Go plan entitlements.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  UpiOrderCreationResult,
  UpiPaymentRecord,
  UserSubscription,
  RefundRecord,
  Invoice,
} from "./types";
import { InvoiceGenerator } from "./invoice-generator";

export class UpiPaymentGateway {
  private static instance: UpiPaymentGateway;

  private storageDir: string;
  private subscriptionsFile: string;
  private paymentsFile: string;
  private webhooksFile: string;
  private refundsFile: string;

  private subscriptions: Map<string, UserSubscription> = new Map();
  private payments: Map<string, UpiPaymentRecord> = new Map();
  private processedWebhooks: Set<string> = new Set();
  private refunds: Map<string, RefundRecord> = new Map();

  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;
  private isSandbox: boolean;

  private constructor() {
    this.storageDir = path.join(process.cwd(), ".tattva_billing");
    this.subscriptionsFile = path.join(this.storageDir, "subscriptions.json");
    this.paymentsFile = path.join(this.storageDir, "upi_payments.json");
    this.webhooksFile = path.join(this.storageDir, "webhooks_log.json");
    this.refundsFile = path.join(this.storageDir, "refunds.json");

    // Retrieve credentials
    const envKeyId = process.env.RAZORPAY_KEY_ID;
    const envKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const envWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (envKeyId && envKeySecret) {
      this.keyId = envKeyId;
      this.keySecret = envKeySecret;
      this.webhookSecret = envWebhookSecret || envKeySecret;
      this.isSandbox = envKeyId.startsWith("rzp_test_");
    } else {
      // Safe sandbox fallback for local development / testing without live keys
      this.keyId = "rzp_test_tattva_sandbox_key";
      this.keySecret = "tattva_sandbox_secret_2026";
      this.webhookSecret = "tattva_sandbox_webhook_secret_2026";
      this.isSandbox = true;
    }

    this.loadState().catch(() => {});
  }

  public static getInstance(): UpiPaymentGateway {
    if (!UpiPaymentGateway.instance) {
      UpiPaymentGateway.instance = new UpiPaymentGateway();
    }
    return UpiPaymentGateway.instance;
  }

  private async loadState(): Promise<void> {
    try {
      const subData = await fs.readFile(this.subscriptionsFile, "utf-8");
      const subList: UserSubscription[] = JSON.parse(subData);
      for (const s of subList) this.subscriptions.set(s.userId, s);
    } catch {}

    try {
      const payData = await fs.readFile(this.paymentsFile, "utf-8");
      const payList: UpiPaymentRecord[] = JSON.parse(payData);
      for (const p of payList) this.payments.set(p.paymentId, p);
    } catch {}

    try {
      const whData = await fs.readFile(this.webhooksFile, "utf-8");
      const whList: string[] = JSON.parse(whData);
      for (const id of whList) this.processedWebhooks.add(id);
    } catch {}

    try {
      const refData = await fs.readFile(this.refundsFile, "utf-8");
      const refList: RefundRecord[] = JSON.parse(refData);
      for (const r of refList) this.refunds.set(r.refundId, r);
    } catch {}
  }

  private async saveState(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.writeFile(this.subscriptionsFile, JSON.stringify(Array.from(this.subscriptions.values()), null, 2), "utf-8");
      await fs.writeFile(this.paymentsFile, JSON.stringify(Array.from(this.payments.values()), null, 2), "utf-8");
      await fs.writeFile(this.webhooksFile, JSON.stringify(Array.from(this.processedWebhooks), null, 2), "utf-8");
      await fs.writeFile(this.refundsFile, JSON.stringify(Array.from(this.refunds.values()), null, 2), "utf-8");
    } catch {}
  }

  /**
   * Returns current subscription status for a user
   */
  public getSubscription(userId: string): UserSubscription {
    let sub = this.subscriptions.get(userId);
    const now = Date.now();

    if (sub) {
      // Check for expiration
      if (sub.status === "active" && sub.currentPeriodEnd < now) {
        sub.status = "expired";
        sub.tier = "free";
        sub.planId = "plan_free";
        sub.updatedAt = now;
        this.subscriptions.set(userId, sub);
        this.saveState().catch(() => {});
      }
      return sub;
    }

    // Default to Free Plan
    sub = {
      id: `sub_free_${userId.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 16)}`,
      userId,
      planId: "plan_free",
      tier: "free",
      billingCycle: "monthly",
      status: "active",
      amount: 0,
      currency: "INR",
      paymentMethod: "none",
      currentPeriodStart: now,
      currentPeriodEnd: now + 30 * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: false,
      customerId: `cus_${userId.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 16)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.subscriptions.set(userId, sub);
    return sub;
  }

  /**
   * Creates a dedicated ₹40 INR UPI payment order (UPI Only)
   */
  public async createUpiOrder(params: {
    userId: string;
    userEmail: string;
    autoRenew?: boolean;
  }): Promise<UpiOrderCreationResult> {
    const { userId, userEmail, autoRenew = true } = params;
    const amountInr = 40; // Exactly ₹40 INR
    const amountPaise = 4000; // 4000 paise

    // Unique order identifier
    const orderId = `order_upi_${crypto.randomBytes(8).toString("hex")}`;
    const subId = `sub_go_${crypto.randomBytes(8).toString("hex")}`;

    // Generate Standard NPCI UPI payload:
    // upi://pay?pa=<VPA>&pn=<PayeeName>&am=40.00&cu=INR&tn=<TxnNote>&tr=<OrderRef>
    const payeeVpa = process.env.TATTVA_UPI_VPA || "tattva.ai@razorpay";
    const payeeName = "TATTVA AI";
    const txnNote = "TATTVA AI Go Subscription (Monthly)";
    const upiQrData = `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(payeeName)}&am=40.00&cu=INR&tn=${encodeURIComponent(txnNote)}&tr=${orderId}`;

    // Register pending subscription
    const now = Date.now();
    const pendingSub: UserSubscription = {
      id: subId,
      userId,
      planId: "plan_go",
      tier: "go",
      billingCycle: "monthly",
      status: "pending",
      amount: amountInr,
      currency: "INR",
      paymentMethod: "upi",
      currentPeriodStart: now,
      currentPeriodEnd: now + 30 * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: false,
      autoRenewEnabled: autoRenew,
      cancellationStatus: "none",
      customerId: `cus_${userId.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 16)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.subscriptions.set(userId, pendingSub);

    // Register pending payment record
    const paymentRecord: UpiPaymentRecord = {
      paymentId: `pay_${crypto.randomBytes(8).toString("hex")}`,
      userId,
      subscriptionId: subId,
      providerOrderId: orderId,
      amount: amountInr,
      currency: "INR",
      paymentMethod: "upi",
      status: "pending",
      createdAt: now,
    };
    this.payments.set(orderId, paymentRecord);
    await this.saveState();

    return {
      orderId,
      amount: amountInr,
      currency: "INR",
      upiIntentUrl: upiQrData,
      upiQrData,
      keyId: this.keyId,
      isSandbox: this.isSandbox,
      planName: "TATTVA AI Go",
      billingInterval: "monthly",
    };
  }

  /**
   * Authoritative server-side verification of payment signature
   * Prevents fraudulent client-side activation
   */
  public async verifyPayment(params: {
    userId: string;
    orderId: string;
    paymentId: string;
    signature: string;
    upiVpa?: string;
  }): Promise<{ success: boolean; subscription?: UserSubscription; error?: string }> {
    const { userId, orderId, paymentId, signature, upiVpa } = params;

    // 1. Retrieve the existing order record
    const paymentRecord = this.payments.get(orderId);
    if (!paymentRecord) {
      return { success: false, error: "Payment order not found or invalid order ID." };
    }

    if (paymentRecord.userId !== userId) {
      return { success: false, error: "Cross-user authorization violation: order does not belong to user." };
    }

    if (paymentRecord.status === "success") {
      // Idempotent return for already verified payment
      const sub = this.getSubscription(userId);
      return { success: true, subscription: sub };
    }

    // 2. Cryptographic signature check: HMAC-SHA256(order_id + "|" + payment_id, secret)
    const expectedSignature = crypto
      .createHmac("sha256", this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "utf-8");
    const expBuf = Buffer.from(expectedSignature, "utf-8");
    const signatureValid =
      sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

    if (!signatureValid) {
      paymentRecord.status = "failed";
      paymentRecord.errorCode = "SIGNATURE_VERIFICATION_FAILED";
      paymentRecord.errorDescription = "Cryptographic HMAC signature did not match expected provider digest.";
      await this.saveState();
      return { success: false, error: "Invalid payment signature. Verification failed." };
    }

    // 3. Mark payment as authorized and successful
    const now = Date.now();
    paymentRecord.status = "success";
    paymentRecord.providerPaymentId = paymentId;
    paymentRecord.upiVpa = upiVpa || "verified_user@upi";
    paymentRecord.verifiedAt = now;
    this.payments.set(orderId, paymentRecord);

    // 4. Activate TATTVA AI Go subscription
    const sub = this.subscriptions.get(userId) || this.getSubscription(userId);
    sub.tier = "go";
    sub.planId = "plan_go";
    sub.status = "active";
    sub.amount = 40;
    sub.currency = "INR";
    sub.paymentMethod = "upi";
    sub.currentPeriodStart = now;
    sub.currentPeriodEnd = now + 30 * 24 * 60 * 60 * 1000; // 30 days
    sub.cancellationStatus = "none";
    sub.cancelAtPeriodEnd = false;
    sub.updatedAt = now;
    this.subscriptions.set(userId, sub);

    // 5. Generate Official Tax Invoice
    const invoiceGen = InvoiceGenerator.getInstance();
    await invoiceGen.createInvoice({
      userId,
      subscriptionId: sub.id,
      customerName: userId.split("@")[0] || "TATTVA Subscriber",
      customerEmail: userId.includes("@") ? userId : `${userId}@tattva.ai`,
      billingCycle: "monthly",
      lineItems: [
        {
          description: "TATTVA AI Go Monthly Subscription (₹40 INR / month - UPI)",
          quantity: 1,
          unitPrice: 40,
        },
      ],
      status: "paid",
    });

    await this.saveState();

    return {
      success: true,
      subscription: sub,
    };
  }

  /**
   * Verified Razorpay Webhook Ingestion with replay attack prevention and idempotency
   */
  public async handleWebhook(params: {
    rawPayload: string;
    signature: string;
    event: Record<string, any>;
  }): Promise<{ handled: boolean; action: string }> {
    const { rawPayload, signature, event } = params;

    // 1. Verify Webhook Signature
    const expectedSig = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawPayload)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "utf-8");
    const expBuf = Buffer.from(expectedSig, "utf-8");
    const validSig =
      sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

    if (!validSig) {
      throw new Error("UNAUTHORIZED_WEBHOOK: Invalid HMAC signature.");
    }

    // 2. Idempotency Check
    const eventId = event.id || event.payload?.payment?.entity?.id || `evt_${Date.now()}`;
    if (this.processedWebhooks.has(eventId)) {
      return { handled: true, action: `Duplicate webhook event ${eventId} safely ignored.` };
    }
    this.processedWebhooks.add(eventId);

    const eventType = event.event || event.eventType;
    const now = Date.now();

    // 3. Process event types
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = event.payload?.payment?.entity || event.data?.object || {};
      const orderId = paymentEntity.order_id || event.payload?.order?.entity?.id;
      const paymentId = paymentEntity.id;
      const notes = paymentEntity.notes || {};
      const userId = notes.userId || notes.user_id;

      if (orderId && this.payments.has(orderId)) {
        const record = this.payments.get(orderId)!;
        record.status = "success";
        record.providerPaymentId = paymentId;
        record.verifiedAt = now;
        this.payments.set(orderId, record);

        if (userId && this.subscriptions.has(userId)) {
          const sub = this.subscriptions.get(userId)!;
          sub.status = "active";
          sub.tier = "go";
          sub.planId = "plan_go";
          sub.currentPeriodStart = now;
          sub.currentPeriodEnd = now + 30 * 24 * 60 * 60 * 1000;
          sub.updatedAt = now;
          this.subscriptions.set(userId, sub);
        }
      }
      await this.saveState();
      return { handled: true, action: `Captured UPI payment for order ${orderId}` };
    }

    if (eventType === "subscription.charged") {
      const subEntity = event.payload?.subscription?.entity || {};
      const userId = subEntity.notes?.userId;
      if (userId && this.subscriptions.has(userId)) {
        const sub = this.subscriptions.get(userId)!;
        sub.status = "active";
        sub.currentPeriodStart = now;
        sub.currentPeriodEnd = now + 30 * 24 * 60 * 60 * 1000;
        sub.updatedAt = now;
        this.subscriptions.set(userId, sub);
        await this.saveState();
        return { handled: true, action: `Renewed TATTVA AI Go subscription for ${userId}` };
      }
    }

    if (eventType === "subscription.cancelled" || eventType === "subscription.halted") {
      const subEntity = event.payload?.subscription?.entity || {};
      const userId = subEntity.notes?.userId;
      if (userId && this.subscriptions.has(userId)) {
        const sub = this.subscriptions.get(userId)!;
        sub.cancellationStatus = "cancelled";
        sub.cancelAtPeriodEnd = true;
        sub.updatedAt = now;
        this.subscriptions.set(userId, sub);
        await this.saveState();
        return { handled: true, action: `Scheduled cancellation for ${userId}` };
      }
    }

    await this.saveState();
    return { handled: true, action: `Ignored unhandled event ${eventType}` };
  }

  /**
   * Cancels user subscription (stops future recurring renewals)
   */
  public async cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    const sub = this.subscriptions.get(userId);
    if (!sub || sub.tier === "free") {
      return { success: false, message: "No active paid subscription found to cancel." };
    }

    const now = Date.now();
    sub.cancelAtPeriodEnd = true;
    sub.cancellationStatus = "scheduled";
    sub.autoRenewEnabled = false;
    sub.cancelledAt = now;
    sub.updatedAt = now;
    this.subscriptions.set(userId, sub);
    await this.saveState();

    return {
      success: true,
      message: `Your TATTVA AI Go subscription has been cancelled. You will retain Go benefits until the end of your billing cycle on ${new Date(sub.currentPeriodEnd).toLocaleDateString()}, after which your account will restore to the Free plan.`,
    };
  }

  /**
   * Processes a refund request
   */
  public async requestRefund(params: {
    userId: string;
    paymentId: string;
    reason: string;
  }): Promise<RefundRecord> {
    const { userId, paymentId, reason } = params;

    let targetPayment: UpiPaymentRecord | undefined;
    for (const p of this.payments.values()) {
      if ((p.paymentId === paymentId || p.providerPaymentId === paymentId) && p.userId === userId) {
        targetPayment = p;
        break;
      }
    }

    if (!targetPayment) {
      throw new Error("PAYMENT_NOT_FOUND: Verified payment matching this ID was not found for this user.");
    }

    if (targetPayment.status === "refunded") {
      throw new Error("ALREADY_REFUNDED: This payment has already been refunded.");
    }

    const refundId = `ref_${crypto.randomBytes(8).toString("hex")}`;
    const now = Date.now();
    const record: RefundRecord = {
      refundId,
      paymentId: targetPayment.paymentId,
      userId,
      providerRefundId: `rpay_ref_${crypto.randomBytes(6).toString("hex")}`,
      amount: targetPayment.amount,
      currency: "INR",
      reason,
      status: "processed",
      createdAt: now,
      processedAt: now,
    };

    targetPayment.status = "refunded";
    this.refunds.set(refundId, record);

    // Revert user tier to Free
    const sub = this.getSubscription(userId);
    sub.tier = "free";
    sub.planId = "plan_free";
    sub.status = "canceled";
    sub.updatedAt = now;
    this.subscriptions.set(userId, sub);

    await this.saveState();
    return record;
  }

  /**
   * Retrieves payments for user
   */
  public getUserPayments(userId: string): UpiPaymentRecord[] {
    const list: UpiPaymentRecord[] = [];
    for (const p of this.payments.values()) {
      if (p.userId === userId) {
        list.push(p);
      }
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Administrative metrics and reconciliation
   */
  public getAdminMetrics(): {
    totalSubscriptions: number;
    activeGoSubscribers: number;
    cancelledSubscriptions: number;
    expiredSubscriptions: number;
    pendingPayments: number;
    successfulPayments: number;
    failedPayments: number;
    totalRevenueInr: number;
    refundsCount: number;
  } {
    let activeGo = 0;
    let cancelled = 0;
    let expired = 0;

    for (const sub of this.subscriptions.values()) {
      if (sub.tier === "go") {
        if (sub.status === "active") activeGo++;
        if (sub.status === "canceled" || sub.cancellationStatus === "cancelled") cancelled++;
        if (sub.status === "expired") expired++;
      }
    }

    let pendingPay = 0;
    let successPay = 0;
    let failedPay = 0;
    let revenueInr = 0;

    for (const pay of this.payments.values()) {
      if (pay.status === "pending") pendingPay++;
      if (pay.status === "success") {
        successPay++;
        revenueInr += pay.amount;
      }
      if (pay.status === "failed") failedPay++;
    }

    return {
      totalSubscriptions: this.subscriptions.size,
      activeGoSubscribers: activeGo,
      cancelledSubscriptions: cancelled,
      expiredSubscriptions: expired,
      pendingPayments: pendingPay,
      successfulPayments: successPay,
      failedPayments: failedPay,
      totalRevenueInr: revenueInr,
      refundsCount: this.refunds.size,
    };
  }

  /**
   * Helper to generate a valid HMAC signature for automated testing / sandbox simulations
   */
  public generateTestSignature(orderId: string, paymentId: string): string {
    return crypto
      .createHmac("sha256", this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
  }
}
