/**
 * TATTVA AI - Phase 45 Automated Verification Test Suite
 * Comprehensive verification of Plan Management, Quota Enforcement,
 * Invoicing, Payment Gateways, Commercial Telemetry, and Tool Registry.
 */

import {
  BillingEngine,
  PlanManager,
  QuotaTracker,
  PaymentGateway,
  InvoiceGenerator,
} from "../app/lib/billing/index.ts";
import { centralizedToolRegistry } from "../app/lib/agent-engine/tool-registry.ts";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log("===============================================================================");
  console.log("  TATTVA AI — PHASE 45: SUBSCRIPTION & BUSINESS MANAGEMENT VERIFICATION SUITE");
  console.log("===============================================================================\n");

  // TEST SUITE 1: Plan Manager & Entitlements
  console.log("--- Suite 1: Plan Definition & Feature Entitlement Matrices ---");
  const planManager = PlanManager.getInstance();

  const plans = planManager.listPlans();
  assert(plans.length >= 3, "At least 3 core subscription plans defined");
  assert(plans.some((p) => p.tier === "free"), "Free tier plan present");
  assert(plans.some((p) => p.tier === "pro"), "Pro tier plan present");
  assert(plans.some((p) => p.tier === "enterprise"), "Enterprise tier plan present");

  // Feature gatekeeping
  assert(
    planManager.canAccessFeature("free", "basic_chat") === true,
    "Free tier has access to basic_chat"
  );
  assert(
    planManager.canAccessFeature("free", "autonomous_programming_agent") === false,
    "Free tier blocked from autonomous_programming_agent"
  );
  assert(
    planManager.canAccessFeature("pro", "autonomous_programming_agent") === true,
    "Pro tier has access to autonomous_programming_agent"
  );
  assert(
    planManager.canAccessFeature("enterprise", "custom_slm_finetuning") === true,
    "Enterprise tier has access to custom_slm_finetuning"
  );

  // Model gatekeeping
  assert(
    planManager.canAccessModel("free", "gemini-2.5-flash") === true,
    "Free tier can access gemini-2.5-flash"
  );
  assert(
    planManager.canAccessModel("free", "deepseek/deepseek-chat") === false,
    "Free tier blocked from deepseek/deepseek-chat"
  );
  assert(
    planManager.canAccessModel("pro", "deepseek/deepseek-chat") === true,
    "Pro tier can access deepseek/deepseek-chat"
  );

  // Pricing calculations
  assert(planManager.calculatePrice("pro", "monthly") === 20, "Pro monthly price is $20");
  assert(planManager.calculatePrice("pro", "annual") === 190, "Pro annual price is $190 (~20% discount)");
  assert(planManager.calculatePrice("enterprise", "monthly") === 150, "Enterprise monthly price is $150");

  // TEST SUITE 2: Quota Tracker & Resource Limits
  console.log("\n--- Suite 2: Tenant Quota Enforcement & Rate Ceilings ---");
  const quotaTracker = QuotaTracker.getInstance();
  const testUserId = "test_tenant_quota_user_1";

  const initialCheck = quotaTracker.checkQuota(testUserId, "free", 1000, 0);
  assert(initialCheck.allowed === true, "Initial request within quota limits allowed");
  assert(initialCheck.remainingTokens > 0, "Remaining token balance calculated");

  // Record consumption
  await quotaTracker.recordUsage(testUserId, 50000, 1024 * 1024); // 50K tokens, 1MB storage
  const updatedUsage = quotaTracker.getUserUsage(testUserId, "free");
  assert(updatedUsage.tokensUsed >= 50000, "Token consumption recorded accurately");
  assert(updatedUsage.requestsToday >= 1, "Daily request counter incremented");
  assert(updatedUsage.storageBytesUsed >= 1024 * 1024, "Storage usage recorded accurately");

  // Over-quota token rejection check
  const overTokenCheck = quotaTracker.checkQuota(testUserId, "free", 300000, 0); // Exceeds 250K free limit
  assert(overTokenCheck.allowed === false, "Over-quota token request rejected");
  assert(overTokenCheck.reason?.includes("Monthly token allocation"), "Clear over-quota reason returned");

  // TEST SUITE 3: Invoice Generation
  console.log("\n--- Suite 3: Commercial Invoicing Engine ---");
  const invoiceGen = InvoiceGenerator.getInstance();

  const invoice = await invoiceGen.createInvoice({
    userId: testUserId,
    customerName: "Alice Walker",
    customerEmail: "alice@example.com",
    billingCycle: "monthly",
    lineItems: [
      { description: "TATTVA AI Pro Subscription", quantity: 1, unitPrice: 20 },
      { description: "Additional 1M Token Pack", quantity: 2, unitPrice: 5 },
    ],
    taxRatePercent: 10,
    status: "paid",
  });

  assert(invoice.id.startsWith("inv_"), "Invoice ID generated with prefix");
  assert(invoice.invoiceNumber.startsWith("INV-2026-"), "Invoice number formatted properly");
  assert(invoice.subtotal === 30, "Subtotal accurately calculated ($20 + $10 = $30)");
  assert(invoice.taxAmount === 3, "Tax amount accurately calculated (10% of $30 = $3)");
  assert(invoice.total === 33, "Total accurately calculated ($30 + $3 = $33)");
  assert(invoice.status === "paid", "Invoice status marked as paid");

  const html = invoiceGen.renderInvoiceHtml(invoice);
  assert(html.includes("<!DOCTYPE html>"), "Invoice renders valid HTML");
  assert(html.includes(invoice.invoiceNumber), "Rendered HTML contains invoice number");
  assert(html.includes("$33.00"), "Rendered HTML contains formatted total amount");

  const userInvoices = invoiceGen.listInvoices(testUserId);
  assert(userInvoices.some((i) => i.id === invoice.id), "Invoice listed under tenant user ID");

  // TEST SUITE 4: Payment Gateway & Subscription Lifecycle
  console.log("\n--- Suite 4: Payment Gateway Coordinator & Webhooks ---");
  const gateway = PaymentGateway.getInstance();

  const defaultSub = gateway.getSubscription("new_customer_99");
  assert(defaultSub.tier === "free", "New customer automatically defaults to Free tier");
  assert(defaultSub.status === "active", "Default subscription status is active");

  // Checkout session generation
  const checkout = gateway.createCheckoutSession({
    userId: "new_customer_99",
    tier: "pro",
    billingCycle: "monthly",
  });
  assert(checkout.checkoutUrl.includes("session_id="), "Checkout URL generated with session_id");
  assert(checkout.priceUsd === 20, "Checkout price matches plan definition");

  // Webhook: checkout.session.completed (Upgrade to Pro)
  const webhookUpgrade = await gateway.handleWebhook({
    id: "evt_webhook_test_1",
    provider: "stripe",
    eventType: "checkout.session.completed",
    timestamp: Date.now(),
    data: {
      userId: "new_customer_99",
      tier: "pro",
      billingCycle: "monthly",
      customerEmail: "customer99@enterprise.com",
      customerName: "Customer NinetyNine",
    },
  });
  assert(webhookUpgrade.handled === true, "Webhook handled successfully");

  const upgradedSub = gateway.getSubscription("new_customer_99");
  assert(upgradedSub.tier === "pro", "User subscription upgraded to Pro via webhook");
  assert(upgradedSub.status === "active", "Upgraded subscription status is active");

  // Verify invoice generated automatically on webhook completion
  const customerInvoices = invoiceGen.listInvoices("new_customer_99");
  assert(customerInvoices.length >= 1, "Invoice generated automatically on checkout completion");

  // Webhook: customer.subscription.deleted (Downgrade to Free)
  const webhookCancel = await gateway.handleWebhook({
    id: "evt_webhook_test_2",
    provider: "stripe",
    eventType: "customer.subscription.deleted",
    timestamp: Date.now(),
    data: {
      userId: "new_customer_99",
    },
  });
  assert(webhookCancel.handled === true, "Cancellation webhook handled successfully");

  const canceledSub = gateway.getSubscription("new_customer_99");
  assert(canceledSub.tier === "free", "User downgraded to Free upon subscription cancellation");
  assert(canceledSub.status === "canceled", "Subscription status updated to canceled");

  // TEST SUITE 5: Unified Billing Engine & Commercial Telemetry
  console.log("\n--- Suite 5: Unified Commercial Engine & Business Telemetry ---");
  const engine = BillingEngine.getInstance();

  // Set up subscriber test cohort
  await engine.setSubscriptionTier("tenant_pro_1", "pro", "monthly");
  await engine.setSubscriptionTier("tenant_pro_2", "pro", "monthly");
  await engine.setSubscriptionTier("tenant_ent_1", "enterprise", "monthly");

  const analytics = engine.getAnalytics();
  assert(analytics.activeSubscribers >= 3, "Active paid subscriber count reflects subscriptions");
  assert(analytics.mrrUsd >= 190, "MRR reflects Pro ($20x2) + Enterprise ($150) = $190");
  assert(analytics.arrUsd === analytics.mrrUsd * 12, "ARR accurately calculated as 12x MRR");
  assert(analytics.marginPercent >= 50, "Healthy unit margin percent calculated");

  // TEST SUITE 6: Centralized Tool Registry Integration
  console.log("\n--- Suite 6: Agent Tool Registry Integration ---");
  const registeredTools = centralizedToolRegistry.listTools().map((t) => t.name);

  assert(registeredTools.includes("check_subscription_quota"), "Tool 'check_subscription_quota' registered");
  assert(registeredTools.includes("generate_billing_invoice"), "Tool 'generate_billing_invoice' registered");
  assert(registeredTools.includes("get_commercial_analytics"), "Tool 'get_commercial_analytics' registered");

  // Execute Tool 1: check_subscription_quota
  const quotaToolExec = await centralizedToolRegistry.executeTool(
    "check_subscription_quota",
    { userId: "tenant_pro_1" },
    { userId: "tenant_pro_1", userEmail: "pro1@domain.com", userRole: "authenticated", workspaceId: "ws_default", sessionId: "sess_001" }
  );
  assert(quotaToolExec.success === true, "Tool check_subscription_quota executed successfully");
  assert(quotaToolExec.output.tier === "pro", "Tool check_subscription_quota returned pro tier");
  assert(quotaToolExec.output.allowed === true, "Tool check_subscription_quota verified access allowed");

  // Execute Tool 2: generate_billing_invoice
  const invoiceToolExec = await centralizedToolRegistry.executeTool(
    "generate_billing_invoice",
    { description: "Autonomous Compute Pipeline", amount: 45 },
    { userId: "tenant_pro_1", userEmail: "pro1@domain.com", userRole: "authenticated", workspaceId: "ws_default", sessionId: "sess_001" }
  );
  assert(invoiceToolExec.success === true, "Tool generate_billing_invoice executed successfully");
  assert(invoiceToolExec.output.total === 45, "Tool generate_billing_invoice returned correct total ($45)");

  // Execute Tool 3: get_commercial_analytics
  const analyticsToolExec = await centralizedToolRegistry.executeTool(
    "get_commercial_analytics",
    {},
    { userId: "tenant_pro_1", userEmail: "pro1@domain.com", userRole: "authenticated", workspaceId: "ws_default", sessionId: "sess_001" }
  );
  assert(analyticsToolExec.success === true, "Tool get_commercial_analytics executed successfully");
  assert(analyticsToolExec.output.mrrUsd >= 190, "Tool get_commercial_analytics returned valid MRR");
  assert(analyticsToolExec.output.marginPercent >= 50, "Tool get_commercial_analytics returned gross margin");

  // SUMMARY
  console.log("\n===============================================================================");
  console.log(`  PHASE 45 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unhandled error in test runner:", err);
  process.exit(1);
});
