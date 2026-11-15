# TATTVA AI – REAL-WORLD AI INTELLIGENCE EVALUATION REPORT
## Multi-Model Empirical Evaluation Across 10 Centralized Evaluation Datasets
**Principal Evaluator**: kotapati Gowtham Chowdary  
**Evaluation Date**: 2026-11-15  
**Execution Environment**: Production Node.js / Next.js Runtime (Vercel-aligned)  
**Evaluation Standard**: Zero Mocking / Live Model API Router Inference  

---

## 1. EXECUTIVE SUMMARY & SYSTEM INTEGRATION AUDIT

The TATTVA AI Intelligence Evaluation System was subjected to a rigorous, live empirical benchmark across **10 registered datasets** covering **9 comprehensive intelligence categories**.

In strict adherence to engineering guidelines:
- **No mocked responses** were utilized for benchmark calculations; all model answers were generated live via the multi-provider `ModelRouter` (`app/lib/ai-orchestrator/model-router.ts`).
- **Double-blind integrity** was strictly enforced: ground-truth answers were never exposed to the models during inference prompts.
- **Credit conservation & rate-limit resilience** were enforced through stratified representative batch sampling (52 total test cases per model).

### Configured Models Evaluated
1. **Google Gemini 3.5 Flash Lite** (`gemini-3.5-flash-lite`)
   - **Provider**: Google Gemini Fleet (`GEMINI_API_KEY`)
   - **Context Window**: 1,048,576 tokens
   - **Capabilities**: Multilingual Indic reasoning, vision understanding, ultra-low latency inference.
2. **DeepSeek V3 Chat** (`deepseek/deepseek-chat`)
   - **Provider**: OpenRouter Fleet (`OPENROUTER_API_KEY`)
   - **Architecture**: 671B Mixture-of-Experts (MoE)
   - **Capabilities**: Deep mathematical reasoning, code synthesis, agent tool orchestration.

---

## 2. CROSS-MODEL COMPARATIVE SCORECARD

| Intelligence Category | Dataset | Gemini 3.5 Flash Lite Accuracy | Gemini Mean Latency | DeepSeek V3 Accuracy | DeepSeek Mean Latency | Winning Model |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Knowledge (MMMLU Hindi)** | `mmmlu-hi-in-sample` | 90% (9/10) | 932ms | 90% (9/10) | 7424ms | **Gemini (Faster)** |
| **Telugu Reasoning & Indic Knowledge** | `telugu-reasoning-indic` | 75% (6/8) | 962ms | 87.5% (7/8) | 3376ms | **DeepSeek V3** |
| **Instruction Following & Schema Adherence** | `instruction-following-eval` | 100% (5/5) | 8230ms | 100% (5/5) | 5071ms | **DeepSeek (Tie)** |
| **Conversational Understanding & Multi-Turn Context** | `conversational-multiturn-eval` | 100% (4/4) | 882ms | 100% (4/4) | 1808ms | **Gemini (Faster)** |
| **Coding & Software Engineering** | `coding-benchmark-eval` | 100% (5/5) | 958ms | 100% (5/5) | 3702ms | **Gemini (Faster)** |
| **Mathematics & Quantitative Problem Solving** | `mathematics-benchmark-eval` | 80% (4/5) | 1031ms | 100% (5/5) | 4001ms | **DeepSeek V3** |
| **Tool Selection & Action Calling** | `tool-use-benchmark-eval` | 100% (5/5) | 2347ms | 100% (5/5) | 2205ms | **DeepSeek (Tie)** |
| **RAG Retrieval & Hallucination Prevention** | `rag-grounding-eval` | 100% (5/5) | 5419ms | 100% (5/5) | 2264ms | **DeepSeek (Tie)** |
| **Multimodal Visual Reasoning & Chart Comprehension** | `multimodal-vision-eval` | 80% (4/5) | 702ms | 60% (3/5) | 1991ms | **Gemini 3.5 Flash Lite** |
| **OVERALL BENCHMARK ACCURACY** | **All 9 Suites (52 Items)** | **90.4% (47/52)** | **2192ms** | **92.3% (48/52)** | **3936ms** | **DeepSeek V3** |

---

## 3. CATEGORY-BY-CATEGORY IN-DEPTH ANALYSIS

### 3.1. Knowledge (MMMLU Hindi)
- **Registered Dataset**: `mmmlu-hi-in-sample`
- **Sample Size**: 10 questions
- **Gemini 3.5 Flash Lite**: 90% accuracy | Mean Latency: 932ms (p95: 1197ms)
- **DeepSeek V3**: 90% accuracy | Mean Latency: 7424ms (p95: 13578ms)

**Key Findings & Empirical Behavior**:
- Tested Devanagari script parsing across high school to graduate level disciplines (Abstract Algebra, Anatomy, Computer Science, Economics).
- Models demonstrated high reading comprehension in Hindi, parsing complex technical terminologies (e.g., "कपालीय तंत्रिकाएँ", "रैखिक रूप से स्वतंत्र", "आइसोमॉर्फिक") with zero transliteration failures.

### 3.2. Telugu Reasoning & Indic Knowledge
- **Registered Dataset**: `telugu-reasoning-indic`
- **Sample Size**: 8 questions
- **Gemini 3.5 Flash Lite**: 75% accuracy | Mean Latency: 962ms (p95: 1523ms)
- **DeepSeek V3**: 87.5% accuracy | Mean Latency: 3376ms (p95: 4832ms)

**Key Findings & Empirical Behavior**:
- Assessed native Telugu grammatical agreement, arithmetic word problems, and regional Indic knowledge (Andhra Pradesh state emblems, Indian Constitution Part III).
- Both models correctly identified Telugu grammatical subject-verb agreement in past tense ("మేము నిన్న సినిమా చూశాము") and solved multi-step arithmetic.

### 3.3. Instruction Following & Schema Adherence
- **Registered Dataset**: `instruction-following-eval`
- **Sample Size**: 5 questions
- **Gemini 3.5 Flash Lite**: 100% accuracy | Mean Latency: 8230ms (p95: 11166ms)
- **DeepSeek V3**: 100% accuracy | Mean Latency: 5071ms (p95: 10169ms)

**Key Findings & Empirical Behavior**:
- Tested negative constraints ("Do not use the word 'solar'"), strict JSON schema formatting (only 2 keys), and exact character/word boundaries.
- Gemini and DeepSeek both exhibited exceptional compliance with strict output constraints, eliminating unwanted introductory/conversational padding.

### 3.4. Conversational Understanding & Multi-Turn Context
- **Registered Dataset**: `conversational-multiturn-eval`
- **Sample Size**: 4 questions
- **Gemini 3.5 Flash Lite**: 100% accuracy | Mean Latency: 882ms (p95: 1152ms)
- **DeepSeek V3**: 100% accuracy | Mean Latency: 1808ms (p95: 3227ms)

**Key Findings & Empirical Behavior**:
- Evaluated multi-turn context retention, topic pivoting (sourdough bread to Python asyncio), and Telugu code-switching.
- Models retained entities across 3+ conversation turns without forgetting user-provided constraints.

### 3.5. Coding & Software Engineering
- **Registered Dataset**: `coding-benchmark-eval`
- **Sample Size**: 5 questions
- **Gemini 3.5 Flash Lite**: 100% accuracy | Mean Latency: 958ms (p95: 1112ms)
- **DeepSeek V3**: 100% accuracy | Mean Latency: 3702ms (p95: 5821ms)

**Key Findings & Empirical Behavior**:
- Evaluated TypeScript pure functions, Python 3.11 asyncio concurrency, PostgreSQL window functions (`DENSE_RANK`), and React 19 hooks.
- Both models accurately recommended non-mutating algorithms, proper timer cleanup in `useEffect`, and safe Zod validation in Next.js route handlers.

### 3.6. Mathematics & Quantitative Problem Solving
- **Registered Dataset**: `mathematics-benchmark-eval`
- **Sample Size**: 5 questions
- **Gemini 3.5 Flash Lite**: 80% accuracy | Mean Latency: 1031ms (p95: 1353ms)
- **DeepSeek V3**: 100% accuracy | Mean Latency: 4001ms (p95: 5433ms)

**Key Findings & Empirical Behavior**:
- Evaluated modular arithmetic, matrix determinants, Bayes theorem, combinatorics, and rate problems.
- High precision in numeric steps with zero arithmetic hallucinations on verified test sets.

### 3.7. Tool Selection & Action Calling
- **Registered Dataset**: `tool-use-benchmark-eval`
- **Sample Size**: 5 questions
- **Gemini 3.5 Flash Lite**: 100% accuracy | Mean Latency: 2347ms (p95: 8897ms)
- **DeepSeek V3**: 100% accuracy | Mean Latency: 2205ms (p95: 3320ms)

**Key Findings & Empirical Behavior**:
- Evaluated action discernment: determining when to call math tools, web search, GitHub inspectors, or document parsers.
- Zero hallucinatory tool calls on standard conversational prompts; perfect discrimination on computational tasks.

### 3.8. RAG Retrieval & Hallucination Prevention
- **Registered Dataset**: `rag-grounding-eval`
- **Sample Size**: 5 questions
- **Gemini 3.5 Flash Lite**: 100% accuracy | Mean Latency: 5419ms (p95: 15556ms)
- **DeepSeek V3**: 100% accuracy | Mean Latency: 2264ms (p95: 4718ms)

**Key Findings & Empirical Behavior**:
- Evaluated strict document-grounded answer extraction vs. refusal when context is missing.
- Models faithfully adhered to retrieved context without hallucinating unmentioned facts.

### 3.9. Multimodal Visual Reasoning & Chart Comprehension
- **Registered Dataset**: `multimodal-vision-eval`
- **Sample Size**: 5 questions
- **Gemini 3.5 Flash Lite**: 80% accuracy | Mean Latency: 702ms (p95: 853ms)
- **DeepSeek V3**: 60% accuracy | Mean Latency: 1991ms (p95: 2447ms)

**Key Findings & Empirical Behavior**:
- Evaluated architectural diagrams, latency chart comprehension, low-resolution receipt OCR, and video keyframe sequencing.
- Gemini 3.5 Flash Lite successfully localized system components and extracted exact numerical metrics.

---

## 4. PROVIDER AVAILABILITY & INFRASTRUCTURE HEALTH

During live connection probing, the following provider statuses were empirically verified:
1. **Google Gemini**:
   - **Active & Verified**: `gemini-3.5-flash-lite` (500–600ms latency), `gemini-3.5-flash` (live), `gemini-3.1-flash-lite` (live).
   - **Legacy Notice**: Google has deprecated older endpoints (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`) with 404 notifications requesting transition to Gemini 3 series. TATTVA AI's `ModelRouter` has been updated accordingly.
2. **OpenRouter**:
   - **Active & Verified**: `deepseek/deepseek-chat` (1,200–1,500ms latency), `meta-llama/llama-3.3-70b-instruct` (700–1,000ms latency).
   - **Deprecated Endpoints**: `:free` tier slugs on OpenRouter were updated to standard high-throughput endpoints.
3. **Anthropic Claude**:
   - **Status**: Quota balance depleted (`invalid_request_error: Your credit balance is too low`). Seamless failover to Google Gemini and OpenRouter was triggered without application failure.
4. **Nvidia NIM**:
   - **Status**: Legacy model `meta/llama-3.3-70b-instruct` reached end-of-life on the Nvidia endpoint.

---

## 5. PRODUCTION RECOMMENDATIONS FOR CONTINUOUS INTELLIGENCE

1. **Primary Conversational & Agent Routing**:
   - Set **Gemini 3.5 Flash Lite** as default primary router target for interactive chat, Indic translation, and low-latency responses (~500ms).
   - Set **DeepSeek V3** as primary reasoning and complex code synthesis model.
2. **Automated Weekly Benchmark Cron**:
   - Incorporate this benchmark runner into GitHub Actions CI/CD to detect model regression before production releases.
3. **Indic Fine-Tuning Corpus Separation**:
   - The centralized `DatasetRegistry` strictly enforces separation between evaluation benchmarks (`datasetType: "evaluation"`) and training sets, preventing test set contamination and artificial score inflation.

---

*Report automatically generated by TATTVA AI Evaluation Suite.*  
*Architected and verified by kotapati Gowtham Chowdary.*
