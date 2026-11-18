/**
 * TATTVA AI - Phase 45 Preview & Production Verification Script
 * Validates the complete Subscription, Quota, Invoicing & Business Management lifecycle
 */

import { execSync } from "child_process";
import fs from "fs";

const targetUrl = process.argv[2] || "https://tattva-ai-phi.vercel.app";
console.log("===============================================================================");
console.log("  TATTVA AI — PHASE 45 VERIFICATION HARNESS");
console.log("  Target Base URL:", targetUrl);
console.log("===============================================================================\n");

async function main() {
  const token = Buffer.from(
    JSON.stringify({
      userId: "commercial_subscriber_1",
      email: "subscriber@tattva.ai",
      tier: "pro",
      expiresAt: Date.now() + 3600000,
    })
  ).toString("base64");

  let checksPassed = 0;

  // 1. Health check
  console.log("1. Testing /api/health...");
  const healthCmd = `npx vercel curl "${targetUrl}/api/health"`;
  const healthOutput = execSync(healthCmd, { encoding: "utf-8" });
  console.log("Health Output Sample:\n", healthOutput.slice(-250));
  if (!healthOutput.includes('"status":') && !healthOutput.includes('"environment":')) {
    throw new Error("Health check failed: " + healthOutput);
  }
  checksPassed++;
  console.log("✓ Health check PASSED\n");

  // 2. Billing Plans GET
  console.log("2. Testing /api/billing/plans (GET)...");
  const plansCmd = `npx vercel curl "${targetUrl}/api/billing/plans" -H "x-tattva-session: ${token}"`;
  const plansOutput = execSync(plansCmd, { encoding: "utf-8" });
  console.log("Plans Output Sample:\n", plansOutput.slice(-350));
  if (!plansOutput.includes('"success":true') || !plansOutput.includes('plan_pro') || !plansOutput.includes('plan_enterprise')) {
    throw new Error("Plans GET failed: " + plansOutput);
  }
  checksPassed++;
  console.log("✓ Subscription Plans PASSED\n");

  // 3. User Subscription GET & POST
  console.log("3. Testing /api/billing/subscription (GET & POST)...");
  const subGetCmd = `npx vercel curl "${targetUrl}/api/billing/subscription" -H "x-tattva-session: ${token}"`;
  const subGetOutput = execSync(subGetCmd, { encoding: "utf-8" });
  console.log("Sub GET Output Sample:\n", subGetOutput.slice(-350));
  if (!subGetOutput.includes('"success":true') || !subGetOutput.includes('"subscription":')) {
    throw new Error("Subscription GET failed: " + subGetOutput);
  }

  // POST checkout session
  const checkoutPayload = { tier: "pro", billingCycle: "annual" };
  fs.writeFileSync("scratch/test-bill-checkout.json", JSON.stringify(checkoutPayload));
  const subPostCmd = `npx vercel curl "${targetUrl}/api/billing/subscription" -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-bill-checkout.json"`;
  const subPostOutput = execSync(subPostCmd, { encoding: "utf-8" });
  console.log("Sub POST Output Sample:\n", subPostOutput.slice(-350));
  if (!subPostOutput.includes('"success":true') || !subPostOutput.includes('"checkoutUrl":')) {
    throw new Error("Subscription checkout POST failed: " + subPostOutput);
  }
  checksPassed++;
  console.log("✓ User Subscription & Checkout Session PASSED\n");

  // 4. Usage Quota GET & POST
  console.log("4. Testing /api/billing/usage (GET & POST)...");
  const usagePostPayload = { tokens: 15000, storageDeltaBytes: 1048576 };
  fs.writeFileSync("scratch/test-bill-usage.json", JSON.stringify(usagePostPayload));
  const usagePostCmd = `npx vercel curl "${targetUrl}/api/billing/usage" -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-bill-usage.json"`;
  const usagePostOutput = execSync(usagePostCmd, { encoding: "utf-8" });
  console.log("Usage POST Output Sample:\n", usagePostOutput.slice(-350));
  if (!usagePostOutput.includes('"success":true') || !usagePostOutput.includes('"tokensUsed":')) {
    throw new Error("Usage POST failed: " + usagePostOutput);
  }

  const usageGetCmd = `npx vercel curl "${targetUrl}/api/billing/usage" -H "x-tattva-session: ${token}"`;
  const usageGetOutput = execSync(usageGetCmd, { encoding: "utf-8" });
  console.log("Usage GET Output Sample:\n", usageGetOutput.slice(-350));
  if (!usageGetOutput.includes('"success":true') || !usageGetOutput.includes('"analytics":')) {
    throw new Error("Usage GET failed: " + usageGetOutput);
  }
  checksPassed++;
  console.log("✓ Usage Quotas & Consumption Telemetry PASSED\n");

  // 5. Invoices POST & GET
  console.log("5. Testing /api/billing/invoices (POST & GET)...");
  const invPayload = {
    customerName: "Acme Corp",
    customerEmail: "finance@acme.org",
    lineItems: [
      { description: "TATTVA AI Pro Annual License", quantity: 1, unitPrice: 190 },
    ],
  };
  fs.writeFileSync("scratch/test-bill-inv.json", JSON.stringify(invPayload));
  const invPostCmd = `npx vercel curl "${targetUrl}/api/billing/invoices" -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-bill-inv.json"`;
  const invPostOutput = execSync(invPostCmd, { encoding: "utf-8" });
  console.log("Invoice POST Output Sample:\n", invPostOutput.slice(-350));
  if (!invPostOutput.includes('"success":true') || !invPostOutput.includes('"invoiceNumber":')) {
    throw new Error("Invoice POST failed: " + invPostOutput);
  }

  const parsedInv = JSON.parse(invPostOutput.slice(invPostOutput.indexOf("{")));
  const invId = parsedInv.invoice.id;

  // GET HTML format
  const invHtmlCmd = `npx vercel curl "${targetUrl}/api/billing/invoices?id=${invId}&format=html" -H "x-tattva-session: ${token}"`;
  const invHtmlOutput = execSync(invHtmlCmd, { encoding: "utf-8" });
  if (!invHtmlOutput.includes("<!DOCTYPE html>") || !invHtmlOutput.includes(parsedInv.invoice.invoiceNumber)) {
    throw new Error("Invoice HTML format check failed: " + invHtmlOutput.slice(0, 300));
  }
  checksPassed++;
  console.log("✓ Invoice Generation & Printable HTML PASSED\n");

  // 6. Payment Webhook Ingestion POST
  console.log("6. Testing /api/billing/webhooks (POST)...");
  const webhookPayload = {
    type: "checkout.session.completed",
    provider: "stripe",
    data: {
      userId: "commercial_subscriber_1",
      tier: "pro",
      billingCycle: "monthly",
      customerEmail: "subscriber@tattva.ai",
      customerName: "Commercial Subscriber",
    },
  };
  fs.writeFileSync("scratch/test-bill-wh.json", JSON.stringify(webhookPayload));
  const whCmd = `npx vercel curl "${targetUrl}/api/billing/webhooks" -X POST -H "Content-Type: application/json" --data-binary "@scratch/test-bill-wh.json"`;
  const whOutput = execSync(whCmd, { encoding: "utf-8" });
  console.log("Webhook Output Sample:\n", whOutput.slice(-350));
  if (!whOutput.includes('"success":true') || !whOutput.includes('"handled":true')) {
    throw new Error("Webhook processing failed: " + whOutput);
  }
  checksPassed++;
  console.log("✓ Payment Webhook Ingestion PASSED\n");

  // 7. Commercial Analytics API Verification
  console.log("7. Testing Commercial Business Analytics...");
  const analyticsCmd = `npx vercel curl "${targetUrl}/api/billing/usage" -H "x-tattva-session: ${token}"`;
  const analyticsOutput = execSync(analyticsCmd, { encoding: "utf-8" });
  if (!analyticsOutput.includes('"mrrUsd":') || !analyticsOutput.includes('"marginPercent":')) {
    throw new Error("Analytics verification failed: " + analyticsOutput);
  }
  checksPassed++;
  console.log("✓ Commercial Business Analytics PASSED\n");

  // 8. Billing UI Page Route HTML
  console.log("8. Testing /billing UI Route (GET)...");
  const uiCmd = `npx vercel curl "${targetUrl}/billing" -H "x-tattva-session: ${token}"`;
  const uiOutput = execSync(uiCmd, { encoding: "utf-8" });
  if (!uiOutput.includes("Subscription & Business Management") && !uiOutput.includes("BillingDashboard") && !uiOutput.includes("<!DOCTYPE html>")) {
    throw new Error("Billing UI Page failed to load: " + uiOutput.slice(0, 300));
  }
  checksPassed++;
  console.log("✓ Billing Control Center UI Page PASSED\n");

  console.log("===============================================================================");
  console.log(`  PHASE 45 VERIFICATION COMPLETE: ALL ${checksPassed}/8 CHECKS PASSED!`);
  console.log("===============================================================================");
}

main().catch((err) => {
  console.error("\n❌ Verification Failed:", err);
  process.exit(1);
});
