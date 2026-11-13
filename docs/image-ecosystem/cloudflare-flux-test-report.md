# Cloudflare Workers AI FLUX.1 Schnell Live Generation Test & Integration Report

**Date**: November 13, 2026  
**Model**: `@cf/black-forest-labs/flux-1-schnell` (12B Parameter Flow Transformer)  
**Provider**: Cloudflare Workers AI (Serverless Edge Inference)  
**Platform**: TATTVA AI Image Studio  

---

## 1. Executive Summary

Cloudflare Workers AI has been **successfully audited, integrated, and verified with live image generation** in TATTVA AI.

A real test image was generated directly from Cloudflare's serverless edge, validated for JPEG integrity, and persisted to disk and storage. The provider is fully wired into TATTVA AI's Multi-Model Router, Image Studio dropdowns, and universal fallback chains without modifying or degrading existing working providers.

---

## 2. Live Image Generation Test Results

| Test Parameter | Measured Specification | Verification Status |
| :--- | :--- | :--- |
| **User Prompt** | `"A photorealistic studio photograph of a vintage red sports car on a wet asphalt road at dusk with reflection"` | **Preserved Exact Prompt** |
| **Model Identifier** | `@cf/black-forest-labs/flux-1-schnell` | Official Cloudflare ID |
| **Output Resolution** | 1024 × 1024 | Exact Match |
| **Inference Steps** | 4 steps (FLUX Schnell optimal setting) | Verified |
| **Generation Latency** | **5,611 ms (5.61 seconds)** | **Excellent Edge Speed** |
| **Decoded File Size** | **613.85 KB (628,580 bytes)** | Real High-Resolution Image |
| **Format Validation** | `JPEG` (SOI Magic Bytes `0xFFD8` verified) | Valid Image File |
| **Disk Location** | [public/generated-tests/cloudflare-flux-test.jpg](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/public/generated-tests/cloudflare-flux-test.jpg) | Saved & Verified |
| **Neuron Consumption**| **172.8 Neurons** | Under 10,000/day free limit |
| **Incurred API Cost** | **$0.00** | Zero Cost (Free Tier Allocation) |

---

## 3. Architecture & Security Implementation

### Server-Side Credentials
Credentials are read exclusively in server contexts via `process.env`:
* `CLOUDFLARE_ACCOUNT_ID`: 32-hex string
* `CLOUDFLARE_API_TOKEN`: Bearer token with `Workers AI: Read` permission
* Both variables are strictly excluded from client-side bundles (no `NEXT_PUBLIC_` prefix).

### Official Cloudflare Workers AI REST API
Requests are dispatched to:
`POST https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`

Payload:
```json
{
  "prompt": "...",
  "steps": 4
}
```
*Note: In accordance with Cloudflare's exact JSON schema for FLUX.1 Schnell, properties like `/seed` or `/negative_prompt` are excluded from the root payload to prevent `[Code 5006] AiError: Additional or unevaluated properties not allowed`.*

---

## 4. Supabase Storage Persistence

Generated images are automatically persisted to Supabase Storage via `persistImageToSupabaseStorage`:
* Bucket: `images`
* Object Path: `flux-generations/cloudflare_{timestamp}_{hash}.jpg`
* Public URL generation: Returned for immediate rendering in Image Studio.
* Resilient Fallback: If Supabase Storage is temporarily unreachable, the engine safely returns the verified base64 data URI and saves a local copy without throwing an error.

---

## 5. Free Allocation & Paid Usage Guardrails

* **Daily Free Allocation**: **10,000 Neurons per day** (resets at 00:00 UTC).
* **Exact Cost Calculation**:
  $$\text{Tiles (1024x1024)} = 4 \times 4.80 = 19.2 \text{ Neurons}$$
  $$\text{Steps (4 steps)} = 4 \times (4 \times 9.60) = 153.6 \text{ Neurons}$$
  $$\text{Total Cost per Image} = 19.2 + 153.6 = \mathbf{172.8 \text{ Neurons}}$$
* **Real Daily Capacity**: **~57 images/day** at 1024x1024 (or ~40 images at 6 steps).
* **Rate Limit & Over-Quota Handling**: If the 10,000 neuron daily quota is exhausted, Cloudflare returns HTTP 429. The adapter catches this and cleanly transitions to **Pollinations FLUX Realism** and **AI Horde** without crashing or incurring charges.

---

## 6. Image Studio & Multi-Model Router Integration

Cloudflare Workers AI is now fully integrated into:
1. [app/lib/image-engine/types.ts](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/lib/image-engine/types.ts): Added `"cloudflare"` to `ImageProviderId`.
2. [app/lib/image-engine/provider-capabilities.ts](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/lib/image-engine/provider-capabilities.ts): Added Cloudflare capability profile.
3. [app/lib/image-engine/multi-model-router/model-registry.ts](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/lib/image-engine/multi-model-router/model-registry.ts): Added `flux-schnell-cloudflare`.
4. [app/lib/image-engine/providers.ts](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/lib/image-engine/providers.ts): Added `generateWithCloudflare(req)` and priority placement in `resolveProviderOrder()`.
5. [app/api/image/route.ts](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/api/image/route.ts): Added `"cloudflare"` to `VALID_PROVIDERS`.
6. [app/image-studio/page.tsx](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/image-studio/page.tsx): Added `"Cloudflare Workers AI (FLUX.1 Schnell)"` to user dropdown selector.

---

## 7. Regression Test Verification

* `tests/test-cloudflare-live-generation.ts`: **PASSED** (Real image generated in 5.61s).
* `tests/phase-x-comprehensive-verification.ts`: **30/30 PASSED (100%)**.
* `npx tsc --noEmit`: **0 ERRORS**.
