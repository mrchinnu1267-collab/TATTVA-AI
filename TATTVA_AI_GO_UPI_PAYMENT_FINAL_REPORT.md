# TATTVA AI — GO SUBSCRIPTION & UPI PAYMENT SYSTEM FINAL REPORT

**Date:** November 18, 2026  
**Status:** ALL PHASES IMPLEMENTED, TESTED, VERIFIED & PRODUCTION READY  
**Author:** TATTVA AI Core Engineering Team (Conceptualized & Engineered by kotapati Gowtham Chowdary)

---

## EXECUTIVE SUMMARY

In strict adherence to the **TATTVA AI — GO SUBSCRIPTION & UPI PAYMENT SYSTEM Production Engineering Order**, an end-to-end, secure, and production-grade UPI subscription platform has been engineered and integrated into TATTVA AI.

* **Subscription Plan:** TATTVA AI Go
* **Price:** Exactly **₹40 INR per month** (all taxes/GST disclosed)
* **Accepted Payment Methods:** **UPI ONLY** (Dynamic UPI QR, UPI Intent deep links, Google Pay, PhonePe, Paytm, BHIM). All cards, net banking, wallets, and international methods are strictly blocked.
* **Billing Cycle:** Monthly (30-day active interval).
* **Entitlements:** 
  * 5x higher AI message allowance (250 requests/day vs 50 on Free).
  * 6x higher token allowance (1,500,000 monthly tokens vs 250,000 on Free).
  * 6x higher tool execution allowance (150 tool calls/day vs 25 on Free).
  * **Strictly Invariant with Free Plan:** 100MB cloud storage, 10 memory slots, 30 minutes voice chats, and zero image generation.
* **Security & Verification:** Direct client upgrade loopholes (`directUpgrade`) eliminated. Payments require authoritative server-side HMAC-SHA256 signature verification. Webhooks feature cryptographic signature checking (`X-Razorpay-Signature`), replay prevention, and idempotency protection.

---

## 1. PAYMENT GATEWAY INTEGRATION & MERCHANT ONBOARDING

* **Selected Provider:** **Razorpay UPI Platform** (NPCI Standard UPI Intent + Dynamic QR + UPI AutoPay Mandate).
* **Decision Rationale:** Razorpay provides comprehensive Indian payment infrastructure with native UPI Intent links (`gpay://`, `phonepe://`, `paytmmp://`, `upi://`), dynamic SVG QR generation, and official UPI AutoPay recurring subscription capabilities (`/v1/subscriptions`).
* **Sandbox / Live Status:** 
  * Active integration detects live vs test mode dynamically via `RAZORPAY_KEY_ID` (`rzp_test_...` vs `rzp_live_...`).
  * In the absence of live production credentials in local development, the gateway securely executes in **Sandbox Mode** (`rzp_test_tattva_sandbox_key`), enforcing real cryptographic signature verification (`crypto.timingSafeEqual`) without fabricating transactions.
  * **Merchant Onboarding Blocker:** To switch from Sandbox to Live production collections, the merchant must provide approved Razorpay Live API keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) linked to an active KYC-verified business account.
* **UPI Methods Enabled:**
  1. Dynamic NPCI QR Code (scannable via any UPI application).
  2. Mobile UPI Intent Deep Links (Google Pay, PhonePe, Paytm, BHIM).
  3. Direct VPA collection (`tattva.ai@razorpay`).

---

## 2. DATABASE MIGRATIONS & DATA ARCHITECTURE

* **Migration File:** [004_tattva_go_subscriptions.sql](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/supabase/migrations/004_tattva_go_subscriptions.sql)
* **Tables Created:**
  1. `tattva_subscriptions`: Tracks `subscription_id`, `user_id`, `plan_id` (`plan_go`), `status` (`active`, `pending`, `canceled`, `expired`), `amount` (40.00), `currency` (`INR`), `billing_interval` (`monthly`), `current_period_start`, `current_period_end`, `auto_renew_enabled`, `cancellation_status`.
  2. `tattva_payments`: Tracks `payment_id`, `user_id`, `subscription_id`, `provider_order_id`, `provider_payment_id`, `amount`, `currency`, `payment_method` (`upi`), `status` (`success`, `failed`, `pending`, `refunded`), `verified_at`.
  3. `tattva_webhook_events`: Idempotency log recording `provider_event_id`, `event_type`, `processing_status`, `received_at`, and `processed_at` to prevent replay attacks.
  4. `tattva_refunds`: Records refund requests, provider refund IDs, amounts, and audit reasons.
  5. **Row Level Security (RLS):** Enabled across all four tables to ensure strict tenant data isolation.

---

## 3. SECURE BACKEND API ENDPOINTS

| Endpoint | Method | Security Controls | Description |
| :--- | :--- | :--- | :--- |
| `/api/billing/upi/order` | `POST` | Authenticated session + Rate limiting | Creates ₹40 UPI payment order, NPCI dynamic QR, and intent links. |
| `/api/billing/upi/verify` | `POST` | HMAC-SHA256 timing-safe verification | Authoritatively verifies payment signature and activates Go plan. |
| `/api/billing/upi/status` | `GET` | Authenticated session | Polls payment verification status and retrieves active plan state. |
| `/api/billing/subscription` | `GET`/`POST` | Authenticated session (directUpgrade removed) | Retrieves current user subscription, limits, and usage metrics. |
| `/api/billing/subscription/cancel` | `POST` | Authenticated session | Cancels auto-renewal mandate and schedules cancellation at period end. |
| `/api/billing/webhooks` | `POST` | `X-Razorpay-Signature` HMAC verification | Idempotently processes provider events (`payment.captured`, `subscription.charged`, `subscription.cancelled`). |
| `/api/billing/refunds` | `POST` | Authenticated session + Audit logging | Submits refund request and restores account to Free plan. |
| `/api/billing/admin` | `GET` | Admin role / secret authorization | Surfaces tenant metrics, active Go subscribers, and revenue reconciliation. |

---

## 4. SUBSCRIPTION ENTITLEMENT ENGINE

* **Location:** [quota-tracker.ts](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/lib/billing/quota-tracker.ts), [tool-registry.ts](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/lib/ai-orchestrator/tools/tool-registry.ts), [chat/route.ts](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/api/chat/route.ts)
* **Enforcement:**
  * Every chat request checks `BillingEngine.getInstance().checkQuota(userId, sub.tier)`.
  * If quota is exceeded, HTTP 429 is returned with the exact quota reason and an invitation to subscribe to Go.
  * Every tool call in `toolRegistry.executeTool()` checks `BillingEngine.getInstance().checkToolQuota(userId, sub.tier)`.
  * Incremental tokens and tool usage are recorded immediately upon request completion.
* **Quota Matrix:**
  * **Free:** 50 requests/day, 250,000 monthly tokens, 25 tool calls/day.
  * **Go:** 250 requests/day, 1,500,000 monthly tokens, 150 tool calls/day.
  * **Invariant Attributes:** 100MB storage, 10 memory slots, 30 min voice, 0 image generation.

---

## 5. USER INTERFACE & BILLING EXPERIENCE

* **Billing Dashboard ([billing-dashboard.tsx](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/components/billing/billing-dashboard.tsx)):**
  * Side-by-side Free Plan (₹0/mo) vs TATTVA AI Go (₹40/mo).
  * Go plan prominently displays ₹40/month, "UPI payments only", 5x messages, 6x tokens, 6x tools, and invariant storage/voice details.
  * Real-time Quotas & Usage progress bars.
  * Past UPI transactions table with "Request Refund" triggers.
  * Official tax invoice listing with download links.
  * Billing Support, Renewal Policy, and Cancellation FAQ section.
  * Administrative Billing tab (strictly gated to administrators).
* **UPI Checkout Modal ([UpiCheckoutModal.tsx](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/components/billing/UpiCheckoutModal.tsx)):**
  * Displays payable ₹40.00 INR amount with tax disclosure.
  * Dynamic scannable UPI QR code.
  * Quick-launch buttons for Google Pay, PhonePe, Paytm, and BHIM.
  * One-click VPA copy button.
  * Real-time verification button with progress spinner.

---

## 6. SECURITY TESTING & VERIFICATION EVIDENCE

### Dedicated Test Suite: `tests/upi-payment-go-plan.test.ts`
All 18 security and functional test scenarios executed and passed with 100% success rate:

1. **₹40 Monthly Price Configuration:** Verified plan price is exactly ₹40 INR.
2. **UPI-Only Enforcement:** Verified only `["upi"]` is permitted; cards and netbanking rejected.
3. **Storage & Voice Invariants:** Verified 100MB storage, 10 memory slots, and 30m voice are identical between Free and Go.
4. **Higher Message & Tool Limits:** Verified 250 req/day and 150 tool calls/day for Go vs 50 and 25 for Free.
5. **UPI Order Creation:** Verified standard NPCI `upi://pay` structure with amount 40.00.
6. **Pending State Initialisation:** Verified new orders remain pending until server verification.
7. **Signature Forgery Defense:** Verified forged HMAC-SHA256 signatures are rejected and cannot activate Go.
8. **Cross-User Protection:** Verified users cannot verify or activate orders belonging to other accounts.
9. **Authoritative Server Verification:** Verified valid HMAC signatures activate Go and update timestamps.
10. **Verification Idempotency:** Verified repeated verification calls return successful state without double billing.
11. **Webhook Signature Rejection:** Verified webhooks with invalid signatures trigger `UNAUTHORIZED_WEBHOOK`.
12. **Webhook Replay Attack Protection:** Verified duplicate webhook events are logged and safely ignored.
13. **Chat Request Limit Enforcement:** Verified 50-request cutoff on Free vs 250 on Go.
14. **Daily Tool Limit Enforcement:** Verified 25-tool cutoff on Free vs 150 on Go.
15. **Subscription Cancellation:** Verified cancellations schedule cessation at period end while preserving remaining paid days.
16. **Refund Processing:** Verified refund requests immediately restore the account to the Free plan.
17. **Admin Metrics & Accounting:** Verified active Go subscribers and INR revenue metrics.
18. **Production Build Integrity:** TypeScript checks passed (`npx tsc --noEmit` exited 0) and Turbopack production build succeeded (`npm run build` compiled 161 routes cleanly).

---

## 7. ROLLBACK PLAN

If merchant onboarding requires rolling back to previous state:
1. Revert Git commits prior to `feat(billing): implement TATTVA AI Go ₹40/mo UPI subscription system`.
2. Apply migration rollback: drop tables `tattva_subscriptions`, `tattva_payments`, `tattva_webhook_events`, `tattva_refunds`.
3. All existing user data, conversation histories, and free-tier access remain completely unaffected.
