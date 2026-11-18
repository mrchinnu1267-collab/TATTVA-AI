import { describe, it, expect, beforeEach } from "vitest";
import { UpiPaymentGateway } from "../app/lib/billing/upi-gateway";
import { PlanManager } from "../app/lib/billing/plan-manager";
import { QuotaTracker } from "../app/lib/billing/quota-tracker";
import { BillingEngine } from "../app/lib/billing";
import crypto from "node:crypto";

describe("TATTVA AI — Go Subscription & UPI Payment System Security Test Suite", () => {
  const testUserId = "user_test_fintech_secure_001";
  const testUserEmail = "test_user_fintech@tattva.ai";
  let gateway: UpiPaymentGateway;
  let planManager: PlanManager;
  let quotaTracker: QuotaTracker;
  let billingEngine: BillingEngine;

  beforeEach(() => {
    gateway = UpiPaymentGateway.getInstance();
    planManager = PlanManager.getInstance();
    quotaTracker = QuotaTracker.getInstance();
    billingEngine = BillingEngine.getInstance();
  });

  describe("Phase 2: Plan Configuration & Entitlements", () => {
    it("should have TATTVA AI Go priced at exactly ₹40 INR per month", () => {
      const plan = planManager.getPlan("go");
      expect(plan).toBeDefined();
      expect(plan.priceMonthly).toBe(40);
      expect(plan.currency).toBe("INR");
      expect(plan.tier).toBe("go");
    });

    it("should enforce UPI as the only accepted payment method for Go", () => {
      const plan = planManager.getPlan("go");
      expect(plan.allowedPaymentMethods).toBeDefined();
      expect(plan.allowedPaymentMethods).toEqual(["upi"]);
      expect(plan.allowedPaymentMethods).not.toContain("card");
      expect(plan.allowedPaymentMethods).not.toContain("netbanking");
    });

    it("should strictly keep storage, memory, and voice identical between Free and Go", () => {
      const freePlan = planManager.getPlan("free");
      const goPlan = planManager.getPlan("go");

      // Storage invariant: exactly 100MB
      expect(goPlan.storageLimitBytes).toBe(freePlan.storageLimitBytes);
      expect(goPlan.storageLimitBytes).toBe(100 * 1024 * 1024);

      // Memory invariant: exactly 10 slots
      expect(goPlan.memoryLimitSlots).toBe(freePlan.memoryLimitSlots);
      expect(goPlan.memoryLimitSlots).toBe(10);

      // Voice invariant: exactly 30 minutes
      expect(goPlan.voiceMinutesMonthly).toBe(freePlan.voiceMinutesMonthly);
      expect(goPlan.voiceMinutesMonthly).toBe(30);
    });

    it("should provide higher AI message and tool limits for Go subscribers", () => {
      const freePlan = planManager.getPlan("free");
      const goPlan = planManager.getPlan("go");

      expect(goPlan.requestLimitDaily).toBeGreaterThan(freePlan.requestLimitDaily);
      expect(goPlan.requestLimitDaily).toBe(250);
      expect(freePlan.requestLimitDaily).toBe(50);

      expect(goPlan.tokenLimitMonthly).toBeGreaterThan(freePlan.tokenLimitMonthly);
      expect(goPlan.tokenLimitMonthly).toBe(1500000);

      expect(goPlan.toolLimitDaily).toBeGreaterThan(freePlan.toolLimitDaily || 0);
      expect(goPlan.toolLimitDaily).toBe(150);
      expect(freePlan.toolLimitDaily).toBe(25);
    });
  });

  describe("Phase 3 & 4: UPI Order Creation & Subscription Lifecycle", () => {
    it("should create a valid ₹40 UPI order with standard NPCI UPI payload", async () => {
      const order = await gateway.createUpiOrder({
        userId: testUserId,
        userEmail: testUserEmail,
        autoRenew: true,
      });

      expect(order.orderId).toMatch(/^order_upi_/);
      expect(order.amount).toBe(40);
      expect(order.currency).toBe("INR");
      expect(order.upiQrData).toContain("upi://pay?");
      expect(order.upiQrData).toContain("am=40.00");
      expect(order.upiQrData).toContain("cu=INR");
      expect(order.upiQrData).toContain(order.orderId);
    });

    it("should initially record subscription as pending until verified", async () => {
      const pendingUserId = `user_pending_${Date.now()}`;
      await gateway.createUpiOrder({
        userId: pendingUserId,
        userEmail: "pending@tattva.ai",
        autoRenew: true,
      });

      const sub = gateway.getSubscription(pendingUserId);
      expect(sub).toBeDefined();
      expect(sub.status).toBe("pending");
      expect(sub.tier).toBe("go");
    });
  });

  describe("Phase 5 & 12: Cryptographic Security & Authoritative Verification", () => {
    it("should reject forged or mismatched payment signatures", async () => {
      const order = await gateway.createUpiOrder({
        userId: testUserId,
        userEmail: testUserEmail,
      });

      const fakePaymentId = "pay_fake_attacker_001";
      const fakeSignature = "0000000000000000000000000000000000000000000000000000000000000000";

      const result = await gateway.verifyPayment({
        userId: testUserId,
        orderId: order.orderId,
        paymentId: fakePaymentId,
        signature: fakeSignature,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid payment signature");

      // Subscription must remain pending or free, NOT active
      const sub = gateway.getSubscription(testUserId);
      expect(sub.status).not.toBe("active");
    });

    it("should prevent cross-user order verification attacks", async () => {
      const order = await gateway.createUpiOrder({
        userId: testUserId,
        userEmail: testUserEmail,
      });

      const attackerId = "attacker_evil_user_666";
      const paymentId = "pay_valid_12345";
      const validSig = gateway.generateTestSignature(order.orderId, paymentId);

      const result = await gateway.verifyPayment({
        userId: attackerId,
        orderId: order.orderId,
        paymentId,
        signature: validSig,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cross-user authorization violation");
    });

    it("should successfully verify payment with a valid HMAC-SHA256 signature and activate Go plan", async () => {
      const order = await gateway.createUpiOrder({
        userId: testUserId,
        userEmail: testUserEmail,
      });

      const paymentId = `pay_valid_${Date.now()}`;
      const validSignature = gateway.generateTestSignature(order.orderId, paymentId);

      const result = await gateway.verifyPayment({
        userId: testUserId,
        orderId: order.orderId,
        paymentId,
        signature: validSignature,
        upiVpa: "subscriber@okhdfcbank",
      });

      expect(result.success).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription?.tier).toBe("go");
      expect(result.subscription?.status).toBe("active");
      expect(result.subscription?.amount).toBe(40);
      expect(result.subscription?.currency).toBe("INR");

      // Verify active subscription state in gateway
      const sub = gateway.getSubscription(testUserId);
      expect(sub.tier).toBe("go");
      expect(sub.status).toBe("active");
    });

    it("should be idempotent when verifying the same payment order multiple times", async () => {
      const order = await gateway.createUpiOrder({
        userId: testUserId,
        userEmail: testUserEmail,
      });

      const paymentId = `pay_valid_${Date.now()}`;
      const validSignature = gateway.generateTestSignature(order.orderId, paymentId);

      const firstCall = await gateway.verifyPayment({
        userId: testUserId,
        orderId: order.orderId,
        paymentId,
        signature: validSignature,
      });
      expect(firstCall.success).toBe(true);

      const secondCall = await gateway.verifyPayment({
        userId: testUserId,
        orderId: order.orderId,
        paymentId,
        signature: validSignature,
      });
      expect(secondCall.success).toBe(true);
    });
  });

  describe("Phase 5 & 12: Webhook Security & Idempotency", () => {
    it("should reject webhooks with missing or invalid cryptographic signatures", async () => {
      const rawPayload = JSON.stringify({ event: "payment.captured", id: "evt_123" });
      const badSignature = "bad_signature_hex";

      await expect(
        gateway.handleWebhook({
          rawPayload,
          signature: badSignature,
          event: JSON.parse(rawPayload),
        })
      ).rejects.toThrow("UNAUTHORIZED_WEBHOOK");
    });

    it("should process valid webhooks and protect against duplicate / replayed events", async () => {
      const secret = "tattva_sandbox_webhook_secret_2026";
      const eventPayload = {
        id: `evt_replay_test_${Date.now()}`,
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_webhook_test_001",
              order_id: "order_upi_webhook_001",
              amount: 4000,
              currency: "INR",
              notes: { userId: testUserId },
            },
          },
        },
      };

      const raw = JSON.stringify(eventPayload);
      const signature = crypto.createHmac("sha256", secret).update(raw).digest("hex");

      // First webhook delivery
      const res1 = await gateway.handleWebhook({
        rawPayload: raw,
        signature,
        event: eventPayload,
      });
      expect(res1.handled).toBe(true);

      // Replay / duplicate webhook delivery
      const res2 = await gateway.handleWebhook({
        rawPayload: raw,
        signature,
        event: eventPayload,
      });
      expect(res2.handled).toBe(true);
      expect(res2.action).toContain("safely ignored");
    });
  });

  describe("Phase 7: Entitlement Enforcement & Quota Verification", () => {
    it("should allow Go subscribers 250 requests/day while Free users are capped at 50", () => {
      // Free User quota check
      const freeQuota = quotaTracker.checkQuota("user_free_tenant", "free");
      expect(freeQuota.requestLimit).toBe(50);
      expect(freeQuota.allowed).toBe(true);

      // Go User quota check
      const goQuota = quotaTracker.checkQuota("user_go_tenant", "go");
      expect(goQuota.requestLimit).toBe(250);
      expect(goQuota.tokenLimit).toBe(1500000);
      expect(goQuota.allowed).toBe(true);
    });

    it("should block requests when quota is exceeded", async () => {
      const spammerId = "spammer_user_403";
      // Manually record 50 requests
      for (let i = 0; i < 50; i++) {
        await quotaTracker.recordUsage(spammerId, 10, 0, 0);
      }

      const check = quotaTracker.checkQuota(spammerId, "free");
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("Daily message request limit reached");
    });

    it("should enforce tool limits (25 on Free vs 150 on Go)", async () => {
      const toolUserFree = "tool_user_free";
      for (let i = 0; i < 25; i++) {
        await quotaTracker.recordUsage(toolUserFree, 0, 0, 1);
      }
      const freeToolCheck = quotaTracker.checkToolQuota(toolUserFree, "free");
      expect(freeToolCheck.allowed).toBe(false);
      expect(freeToolCheck.reason).toContain("Daily tool execution limit reached");

      // Go user can execute up to 150
      const goToolCheck = quotaTracker.checkToolQuota(toolUserFree, "go");
      expect(goToolCheck.allowed).toBe(true);
    });
  });

  describe("Phase 4 & 10: Cancellation, Expiry & Refunds", () => {
    it("should allow users to cancel subscription, scheduling cancellation at period end", async () => {
      const cancelRes = await gateway.cancelSubscription(testUserId);
      expect(cancelRes.success).toBe(true);
      expect(cancelRes.message).toContain("cancelled");

      const sub = gateway.getSubscription(testUserId);
      expect(sub.cancelAtPeriodEnd).toBe(true);
      expect(sub.cancellationStatus).toBe("scheduled");
      // Retains Go access until period end
      expect(sub.tier).toBe("go");
    });

    it("should process refund requests and immediately revert user tier to Free", async () => {
      // Create a paid order and verify it
      const refundUserId = "user_refund_test_009";
      const order = await gateway.createUpiOrder({
        userId: refundUserId,
        userEmail: "refund@tattva.ai",
      });
      const paymentId = `pay_to_refund_${Date.now()}`;
      const sig = gateway.generateTestSignature(order.orderId, paymentId);
      await gateway.verifyPayment({
        userId: refundUserId,
        orderId: order.orderId,
        paymentId,
        signature: sig,
      });

      // Verify active Go
      expect(gateway.getSubscription(refundUserId).tier).toBe("go");

      // Request refund
      const refund = await gateway.requestRefund({
        userId: refundUserId,
        paymentId,
        reason: "Duplicate charge",
      });

      expect(refund.refundId).toMatch(/^ref_/);
      expect(refund.status).toBe("processed");
      expect(refund.amount).toBe(40);

      // Verify reversion to Free plan
      const subAfter = gateway.getSubscription(refundUserId);
      expect(subAfter.tier).toBe("free");
      expect(subAfter.status).toBe("canceled");
    });
  });

  describe("Phase 11: Admin Metrics & Accounting", () => {
    it("should track active Go subscribers and INR revenue accurately", () => {
      const metrics = gateway.getAdminMetrics();
      expect(metrics.totalSubscriptions).toBeGreaterThanOrEqual(1);
      expect(typeof metrics.totalRevenueInr).toBe("number");
      expect(typeof metrics.activeGoSubscribers).toBe("number");
      expect(typeof metrics.refundsCount).toBe("number");
    });
  });
});
