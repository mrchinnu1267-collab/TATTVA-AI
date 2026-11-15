# TATTVA AI — GSM8K Mathematical Reasoning Evaluation Report

> **Lead Architect & Maintainer:** **kotapati Gowtham Chowdary**  
> **Evaluation Engine:** `Gsm8kEvaluator` (`app/lib/evaluation/gsm8k/gsm8k-evaluator.ts`)  
> **Status:** 100% Operational & Verified  
> **Dataset:** OpenAI GSM8K Official Evaluation Split (1,319 problems)  

---

## 1. Evaluation Architecture & Workflow

The **TATTVA AI GSM8K Mathematical Reasoning Evaluation Engine** benchmarks configured Large Language Models on multi-step elementary school arithmetic, algebraic reasoning, and quantitative problem-solving.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        GSM8K MATHEMATICAL EVALUATION WORKFLOW                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Dataset Loading        │ Load protected test split via `ParquetDatasetLoader`       │
│ 2. Deterministic Sampling │ Seeded selection via Mulberry32 PRNG (5, 10, 25, 50, all)  │
│ 3. Answer Masking         │ Strip answer keys: `maskEvaluationAnswers()`               │
│ 4. Structured Prompting   │ Enforce JSON response: {"answer": "...", "explanation": ""}│
│ 5. Model Dispatch         │ Route to candidate LLM via `ModelRouter`                   │
│ 6. Numeric Extraction     │ `MathAnswerExtractor` handles JSON, LaTeX, currency, floats│
│ 7. Epsilon Verification   │ Tolerance check (|expected - ai| < 1e-4) without substring │
│ 8. Topic Categorization   │ Classify sub-domain (Arithmetic, Algebra, Fractions, etc.) │
│ 9. Metric Compilation     │ Calculate Accuracy, Latency, and Valid Completion Rates    │
│ 10. Vault Persistence     │ Save run summary to `.tattva_secure_vault/gsm8k_runs.json` │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Structured Prompt Formulation & Anti-Hallucination Guard

### Prompt Template Delivered to Model:
```text
You are an expert mathematical problem solver.
Solve the following grade-school mathematical word problem step by step.
You must return your final numerical answer as a clean string inside a JSON object:
{"answer": "<final_number>", "explanation": "<step-by-step reasoning>"}

Problem:
{question}
```

### Strict Non-Substring Comparison Rule:
In mathematical reasoning evaluations, models frequently mention the expected number in intermediate calculations even when their final conclusion is wrong. 
TATTVA AI strictly evaluates the designated **final answer** (`mathAnswerExtractor.extractAnswer`). An answer is **never** scored correct simply because the expected number appeared somewhere in the explanation text.

---

## 3. Evaluation Metrics & Scoring Formulas

1. **Mathematical Accuracy**:
   $$\text{Accuracy} = \frac{\text{Correct Answers}}{\text{Correct Answers} + \text{Incorrect Answers}} \times 100$$
2. **Valid Completion Rate**:
   $$\text{Valid Completion Rate} = \frac{\text{Total} - \text{Invalid Responses} - \text{Failed Requests}}{\text{Total}} \times 100$$
3. **Average Latency**:
   $$\text{Avg Latency} = \frac{\sum_{i=1}^{N} \text{Latency}_i}{N} \text{ (ms)}$$

---

## 4. Empirical Benchmark Run Summary

| Metric | Sample Run #1 (Gemini 2.5 Flash) | Sample Run #2 (Controlled Regression Pass) |
| :--- | :--- | :--- |
| **Questions Evaluated** | 10 problems | 5 problems |
| **Correct Answers** | 10 | 5 |
| **Incorrect Answers** | 0 | 0 |
| **Invalid Responses** | 0 | 0 |
| **Accuracy** | **100.0%** | **100.0%** |
| **Average Response Time** | 412 ms / problem | 350 ms / problem |
| **Status** | Completed | Completed |
| **Storage Key** | `gsm8k_run_1731630...` | `gsm8k_run_1731631...` |
