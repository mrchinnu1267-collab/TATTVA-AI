# Cloudflare Workers AI - FLUX.1 Schnell Provider Audit & Verification Report

**Date**: November 13, 2026  
**Target Model**: `@cf/black-forest-labs/flux-1-schnell`  
**Platform**: Cloudflare Workers AI (Serverless Edge Inference)  
**Evaluator**: TATTVA AI Multi-Model Generation Ecosystem  

---

## 1. Executive Summary

An exhaustive technical audit and integration test was conducted for **Cloudflare Workers AI** as a candidate image-generation provider for TATTVA AI.

The serverless adapter [app/lib/image-engine/cloudflare/cloudflare-adapter.ts](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/lib/image-engine/cloudflare/cloudflare-adapter.ts) has been engineered and unit tested. It enforces server-side security, zero-cost guardrails, exact neuron consumption tracking, and fallback safety.

---

## 2. Model & API Specification

| Specification Dimension | Cloudflare Workers AI Implementation Detail |
| :--- | :--- |
| **Exact Model Identifier** | `@cf/black-forest-labs/flux-1-schnell` |
| **Model Family & Size** | 12-Billion Parameter Rectified Flow Transformer (Black Forest Labs) |
| **Target Task** | Text-to-Image |
| **Inference Endpoint** | `POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell` |
| **Authentication Scheme** | HTTP Header: `Authorization: Bearer {CLOUDFLARE_API_TOKEN}` |
| **Required Permissions** | Account API Token with **`Workers AI: Read`** scope |
| **Request Payload** | `JSON: { "prompt": string, "steps": number (1-8) }` |
| **Response Format** | `JSON: { "result": { "image": "<base64_jpeg>" }, "success": true, "errors": [], "messages": [] }` |
| **Edge Network Acceleration**| Cloudflare global GPU network (sub-3 second average edge generation) |

---

## 3. Account Requirements, Free Allocation & Pricing Audit

### Free Tier Neuron Allocation
* **Daily Free Limit**: **10,000 Neurons per day** included for every Cloudflare account (both Workers Free and Paid).
* **Reset Cycle**: Resets daily at **00:00 UTC**.
* **Workers Free**: The free plan has 10,000 Neurons/day; usage beyond that fails.
* **Workers Paid**: The first 10,000 Neurons/day are free, and usage above that is billed at $0.011 per 1,000 Neurons.

### Exact Pricing & Neuron Model for FLUX.1 Schnell
Cloudflare bills image generation by **tiles** and **steps**, not flat per-request:
* **Per 512x512 Tile**: 4.80 Neurons ($0.0000528)
* **Per Step (per tile)**: 9.60 Neurons ($0.0001056)

### Debunking the "230 Images Per Day" Myth
A prevalent claim in informal community blogs states that Cloudflare Workers AI provides "230 free FLUX images per day". Our audit confirms this is **misleading**:

$$\text{Tiles for } 1024 \times 1024 = \lceil 1024 / 512 \rceil \times \lceil 1024 / 512 \rceil = 4 \text{ tiles}$$

$$\text{Tile Cost} = 4 \times 4.80 = 19.2 \text{ Neurons}$$

$$\text{Step Cost (4 steps)} = 4 \times (4 \times 9.60) = 153.6 \text{ Neurons}$$

$$\text{Total Cost for } 1024 \times 1024 \text{ (4 steps)} = 19.2 + 153.6 = \mathbf{172.8 \text{ Neurons}}$$

* **Actual 1024x1024 Daily Free Quota**: $10,000 / 172.8 \approx \mathbf{57 \text{ images per day}}$.
* **Actual 1024x1024 (6 steps) Daily Free Quota**: $10,000 / 249.6 \approx \mathbf{40 \text{ images per day}}$.
* The "230 images" figure is only achievable if generating tiny **512x512 single-tile images** ($10,000 / 43.2 \approx 231$).

---

## 4. Architecture & Security Implementation

### Server-Side Isolation
The adapter is implemented exclusively on the server side in [cloudflare-adapter.ts](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/lib/image-engine/cloudflare/cloudflare-adapter.ts):
* Credentials are read strictly from `process.env.CLOUDFLARE_ACCOUNT_ID` and `process.env.CLOUDFLARE_API_TOKEN`.
* Zero client exposure: Next.js bundles will never contain the API token or Account ID.

### Live Endpoint Error Schema Verification
Live diagnostic tests against Cloudflare's edge returned verified API error schemas:
```json
// Verified response when Account ID is missing or malformed:
{"result":null,"success":false,"errors":[{"code":7003,"message":"Could not route to /client/v4/accounts/... perhaps your object identifier is invalid?"}],"messages":[]}

// Verified response when API Token is invalid:
{"result":null,"success":false,"errors":[{"code":10000,"message":"Authentication error"}],"messages":[]}
```

---

## 5. Automated Test Suite Results

The automated test suite `tests/phase-cloudflare-audit.test.ts` was executed with `npx tsx`:

```
▶ Cloudflare Workers AI - FLUX.1 Schnell Provider Audit
  ✔ should have correct official model identifier (2.4ms)
  ✔ should calculate exact neuron usage according to Cloudflare pricing specification (0.8ms)
  ✔ should debunk the '230 images per day' myth for standard 1024x1024 generations (0.6ms)
  ✔ should safely detect missing credentials without runtime crash (0.9ms)
✔ Cloudflare Workers AI - FLUX.1 Schnell Provider Audit (9.2ms)
ℹ tests 4 | pass 4 | fail 0
```

---

## 6. Current Operational Status & Acceptance Criteria

In strict adherence to the project instructions:
* **"Do not claim success without a real generated image."**
* **"Integrate it into the existing model router only if the test succeeds."**

### Current State:
* `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are configured in the ignored local `.env.local`; their values are not included here.
* A real JPEG test image is available at `public/generated-tests/image-studio-cloudflare-preview.jpg`.
* The Image Studio integration is explicit-only and does not fall back to other providers.
* Cloudflare Workers AI usage was inspected in the signed-in dashboard on 2026-11-13 at 02:01 UTC. The dashboard showed **0/10,000 Neurons used today** and, for the selected **Last 24 hours** period, **499.2 Neurons** and **48 processed tiles** for `@cf/black-forest-labs/flux-1-schnell`. The daily usage shown is within the published free allocation. This view does not display invoice-level monetary charges, and prior Gemini/Supabase usage was not checked.
