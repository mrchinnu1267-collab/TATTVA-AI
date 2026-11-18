# TATTVA AI — GO SUBSCRIPTION & UPI PAYMENT SYSTEM AUDIT

**Date:** November 18, 2026  
**Auditor:** Principal AI & FinTech Security Architect  
**Objective:** Comprehensive audit of existing billing, authentication, subscription models, payment gateways, and usage controls prior to implementing TATTVA AI Go (₹40/month, UPI only).

---

## 1. EXISTING SYSTEM INSPECTION

### 1.1 Authentication & User Session Management
* **Location:** `frontend/app/lib/security.ts` (`verifyUserSession`)
* **Mechanism:** 
  1. Cryptographically signed `tattva_session` cookie (HMAC-SHA256).
  2. Cryptographically signed `x-tattva-session` header.
  3. Supabase Auth JWT token extraction (`sb-access-token` / Bearer authorization header).
* **Finding:** Authenticated session returns `{ authenticated: boolean, userId: string, email: string, role: string }`. Unauthenticated requests default to guest identifiers. All payment and subscription actions must strictly require `authenticated: true` with valid `userId`.

### 1.2 User Database & Storage Structure
* **Locations:**
  * Supabase PostgreSQL migrations in `frontend/supabase/migrations/`.
  * Local/serverless billing state persistence in `frontend/app/lib/billing/`.
* **Finding:** Currently, `PaymentGateway` and `QuotaTracker` serialize to `.tattva_billing/subscriptions.json` and `.tattva_billing/usage.json`. No dedicated tables exist yet for UPI subscriptions, transactions, or webhook idempotency logs.
* **Required Action:** Author clean, non-destructive PostgreSQL migration `004_tattva_go_subscriptions.sql` supporting `subscriptions`, `payments`, and `webhook_events`, paired with a serverless persistence engine with automatic file and database synchronization.

### 1.3 Existing Subscription & Plan Definitions
* **Location:** `frontend/app/lib/billing/plan-manager.ts` and `types.ts`
* **Current Plans:**
  * `plan_free` (Community Explorer) - $0/mo USD
  * `plan_pro` (Professional Creator) - $20/mo USD
  * `plan_enterprise` (Enterprise Sovereign) - $150/mo USD
* **Gaps Identified:**
  1. No `plan_go` exists.
  2. Existing plans are denominated in USD, whereas TATTVA AI Go strictly requires INR (₹40/month).
  3. Entitlement matrices do not distinguish tool quotas or message rates for the Go plan.
  4. Pro and Enterprise include extra storage and models; Go must **explicitly keep storage (100MB), memory, voice, and image generation identical to Free**.
* **Required Action:** Add `plan_go` at ₹40/month with UPI-only enforcement, enhanced tool and message allowances, and strictly invariant Free-level storage, memory, image, and voice allowances.

### 1.4 Existing Payment Integrations & Gateway
* **Location:** `frontend/app/lib/billing/payment-gateway.ts`
* **Current Status:**
  * Abstract methods for Stripe, LemonSqueezy, and Razorpay.
  * No live or sandbox UPI payment order creation API.
  * Direct client bypass loophole (`directUpgrade: true` in `app/api/billing/subscription/route.ts`) allowed upgrading tier without paying.
  * Webhook route `/api/billing/webhooks` lacked cryptographic HMAC signature verification and idempotency replay protection.
* **Required Action:**
  1. Remove client-side `directUpgrade` vulnerability.
  2. Implement an end-to-end Razorpay UPI Payment Gateway integration supporting Dynamic UPI QR, UPI Intent, and UPI AutoPay recurring mandates.
  3. Author authoritative server-side payment verification (`verifyPaymentSignature`) using HMAC-SHA256 (`crypto.createHmac("sha256", secret)`).
  4. Implement webhook signature verification via `X-Razorpay-Signature`.

### 1.5 Usage Limits & Entitlement Engine
* **Location:** `frontend/app/lib/billing/quota-tracker.ts` and `frontend/app/lib/billing/index.ts`
* **Current Status:**
  * Tracks monthly tokens and daily requests per user.
  * Quota checks exist in `BillingEngine`, but are not tightly integrated into `app/api/chat/route.ts` during live chat streaming.
* **Required Action:**
  * Free tier: 50 requests/day, 250,000 tokens/month, 25 tool calls/day.
  * Go tier: 250 requests/day, 1,500,000 tokens/month, 150 tool calls/day.
  * Invariant: Image generation, memory slots, storage (100MB), and voice remain identical across Free and Go.

### 1.6 Billing UI & Checkout Experience
* **Location:** `frontend/app/billing/page.tsx`, `frontend/app/components/billing/billing-dashboard.tsx`
* **Current Status:**
  * Three-column USD tier cards (Free, Pro $20, Enterprise $150).
  * Direct "Activate Tier" button invoking insecure bypass.
  * No UPI QR display, UPI VPA input, or INR breakdown.
* **Required Action:**
  * Rebuild the billing interface with side-by-side Free vs Go cards.
  * Display TATTVA AI Go at ₹40/month, highlighting "UPI payments only" and "Expanded AI messages with tools".
  * Create a dedicated UPI Checkout Modal with dynamic QR code, UPI intent deep links (Google Pay, PhonePe, Paytm, BHIM), payment status polling, verification feedback, and invoice generation.

---

## 2. PAYMENT PROVIDER EVALUATION & SELECTION

| Provider | UPI Checkout Methods | UPI AutoPay (Recurring) | Sandbox / Test Mode | Documentation & Integration |
| :--- | :--- | :--- | :--- | :--- |
| **Razorpay** | UPI Intent, Dynamic QR, Collect Request | Official UPI AutoPay API (`/v1/subscriptions`) | Native test keys (`rzp_test_...`) with full simulation | [Razorpay UPI AutoPay](https://razorpay.com/upi-autopay/) |
| **Cashfree** | UPI Intent, Dynamic QR | Cashfree Subscriptions API | Sandbox sandbox.cashfree.com | [Cashfree UPI](https://www.cashfree.com/upi-payment-gateway/) |

### Decision: **Razorpay**
* **Rationale:** Razorpay is the primary UPI payment aggregator in India with comprehensive UPI Intent, dynamic QR generation, and UPI AutoPay recurring mandates.
* **AutoPay vs Manual Renewal Policy:** When the merchant account has approved UPI AutoPay recurring mandate permissions, recurring subscriptions are registered. For standard UPI merchant collections or during sandbox evaluation, a transparent monthly manual renewal flow is supported, guaranteeing continuous service without unauthorized recurring debits.
* **Sandbox / Live Safety:** If live credentials are not yet provisioned in environment variables, the system executes in secure Sandbox mode with verified HMAC signatures, clearly reporting sandbox status without fabricating live transactions.

---

## 3. ARCHITECTURAL ROADMAP

1. **Database Schema:** `supabase/migrations/004_tattva_go_subscriptions.sql` (Subscriptions, Payments, Webhook Events).
2. **Billing Core Extensions:**
   * Extend `SubscriptionTier` to include `"go"`.
   * Update `PlanManager` with `plan_go` (₹40 INR/month).
   * Implement `UpiPaymentGateway` in `frontend/app/lib/billing/upi-gateway.ts` (Razorpay order creation, QR code generation, signature verification, webhook processing, refund handling).
3. **Backend API Endpoints:**
   * `POST /api/billing/upi/order`: Creates ₹40 UPI payment order or subscription mandate.
   * `POST /api/billing/upi/verify`: Server-side cryptographic signature verification and Go plan activation.
   * `GET /api/billing/upi/status`: Retrieves payment and subscription status.
   * `POST /api/billing/subscription/cancel`: Cancels auto-renewal or active subscription.
   * `POST /api/billing/webhooks`: Verified HMAC webhook ingestion for Razorpay events (`order.paid`, `payment.captured`, `subscription.activated`, `subscription.cancelled`).
   * `POST /api/billing/refunds`: Documented refund requests and status verification.
   * `GET /api/billing/admin`: Authenticated administrative metrics (subscribers, revenue, reconciliation).
4. **Chat & Tool Entitlement Enforcement:**
   * Validate user plan and active status in `app/api/chat/route.ts` and tool executor.
   * Ensure Go users receive higher message and tool quotas, with strictly invariant Free-level storage, memory, and voice.
5. **Billing UI & Checkout Component:**
   * Redesign `billing-dashboard.tsx` showcasing Free vs Go.
   * Integrate UPI Checkout Modal with dynamic QR, intent links, and live verification polling.
   * Add Admin Billing Dashboard tab with strict authorization.
6. **Automated Testing Suite:**
   * Create `tests/upi-payment-go-plan.test.ts` covering 18+ security scenarios: valid payment, forged signatures, wrong amount, wrong currency, duplicate webhooks, replay attacks, unauthorized cancellation, and Free quota restoration.
