# TATTVA AI — Comprehensive Testing & Evaluation Strategy

> **Strategy Version:** `2.0.0-eval`  
> **Target:** Unit, Integration, Benchmarking & Continuous Production Testing  
> **Lead Architect & Maintainer:** kotapati Gowtham Chowdary  
> **Testing Philosophy:** Automated, Empirical, and Verifiable Verification  

---

## 1. Multi-Tier Testing Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 4: FRONTIER BENCHMARKS & RED-TEAMING (SWE-bench, GSM8K, HumanEval)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIER 3: SYSTEM INTEGRATION & MULTI-PROVIDER FAILOVER TESTS                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIER 2: SECURITY, AUTHENTICATION & RLS REGRESSION AUDITS                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIER 1: UNIT TESTS (Tokenizers, Router Selection, Document Generators)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Unit & Component Testing (Tier 1)

### TypeScript / Next.js Unit Testing:
* **Tooling:** Jest / Vitest with TypeScript type-checking (`npx tsc --noEmit`).
* **Test Scope:**
  1. **Model Router:** Candidate ordering based on task intent and complexity score. Verifies that high-complexity requests route to high-capacity models and failover chains trigger appropriately.
  2. **Document Engine:** OpenXML schema verification for DOCX, XLSX formulas (`SUM`, `AVERAGE`, `COUNTIF`), and PDF stream encoding.
  3. **Auth Redirects:** Normalization of URLs across desktop, Android WebView, and iOS Capacitor.

### Python Model & Data Pipeline Testing:
* **Tooling:** PyTest with CUDA runtime detection.
* **Test Scope:**
  1. **Tokenizer Integrity:** Reversibility test ($x = \text{decode}(\text{encode}(x))$) across code, LaTeX, and Unicode text.
  2. **MinHash Deduplication:** False-positive and false-negative validation against synthetic duplicate document corpora.
  3. **$\mu$P Scaling Check:** Gradient norm stability across $10\text{M} \to 40\text{M} \to 125\text{M}$ parameter proxy configurations.

---

## 3. Security, Authentication & RLS Audits (Tier 2)

Automated security verification runs prior to every production release:
1. **Google OAuth & Redirect Allowlist:** Verifies that mobile user agents redirect to production `https://tattva-ai-phi.vercel.app` rather than `localhost`.
2. **Password Recovery:** Verifies that `/auth/reset-password` token generation and verification preserve cryptographic state.
3. **Tenant Boundary Tests:** Attempts to query another user's vector embeddings using a simulated authenticated Supabase client; asserts HTTP 403 / empty result set.
4. **Secret Leakage Prevention:** Scans all Next.js build bundles to ensure zero private API keys or service role tokens are bundled into client-side chunks.

---

## 4. Multi-Provider Integration & Failover Tests (Tier 3)

```typescript
describe("ModelRouter High-Availability & Failover", () => {
  it("should seamlessly fall back to secondary provider upon 429 Rate Limit", async () => {
    // 1. Simulate 429 on Primary Gemini endpoint
    // 2. Dispatch executeWithFallback()
    // 3. Assert response is delivered from OpenRouter / Llama 3.3 without user-facing error
    // 4. Assert fallbackOccurred === true and telemetry logged
  });

  it("should strictly isolate provider credentials", async () => {
    // Assert missing OPENAI_API_KEY does not disable Gemini or Claude
  });
});
```

---

## 5. Frontier Benchmarking & Model Evaluation (Tier 4)

Proprietary and distilled TATTVA models are evaluated against standardized frontier benchmarks:

| Benchmark | Target Capability | Metric | Target Score (SLM / Frontier) |
| :--- | :--- | :--- | :--- |
| **SWE-bench Verified** | Multi-file software engineering & bug fixing | % resolved GitHub issues | $>30\%$ (SLM) / $>55\%$ (Frontier) |
| **GSM8K** | Multi-step grade school mathematical reasoning | Accuracy (%) | $>85\%$ (Math SLM) |
| **HumanEval** | Python function synthesis from docstrings | pass@1 (%) | $>80\%$ (Code SLM) |
| **MMLU** | Broad multi-subject factual knowledge | 5-shot Accuracy (%) | $>70\%$ (General SLM) |
| **FrontierMath** | Advanced mathematical research problems | Verified accuracy | Subject to tier & licensing |

### Verifiable Outcome Verification:
* In accordance with Phase 6 (RLVR), code solutions and mathematical answers are graded by **automated execution verifiers** (running unit tests in isolated Docker containers) rather than subjective LLM-as-a-judge scorers.

---

## 6. Continuous Production Monitoring & Auto-Rollback

1. **Telemetry Signals:**
   - **Time to First Token (TTFT):** Target $<500\text{ms}$.
   - **End-to-End Latency:** Target $<3,500\text{ms}$ for standard responses.
   - **Provider Error Rate:** Alert when $5\text{xx}$ errors exceed $1.0\%$.
2. **Automated Rollback Policy:**
   - If an updated model checkpoint or router configuration experiences an error rate $>2.0\%$ over a 5-minute rolling window, traffic is automatically rerouted to the previous stable baseline checkpoint.
