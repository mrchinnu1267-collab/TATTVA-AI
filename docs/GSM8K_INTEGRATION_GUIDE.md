# TATTVA AI — GSM8K Integration & Developer Guide

> **Lead Architect & Maintainer:** **kotapati Gowtham Chowdary**  
> **Platform Version:** TATTVA AI v3.0.0  
> **Topic:** Mathematical Reasoning Evaluation & Dataset Integration  

---

## 1. Developer Overview

The GSM8K integration enables TATTVA AI developers to:
- Access verified mathematical benchmark datasets (`gsm8k-train`, `gsm8k-evaluation`).
- Evaluate any configured LLM for multi-step reasoning accuracy via API or UI.
- Convert training datasets into SFT formats for fine-tuning.

---

## 2. API Reference

### Run GSM8K Evaluation
- **Endpoint**: `POST /api/evaluation/gsm8k`
- **Payload**:
  ```json
  {
    "modelId": "gemini-2.5-flash",
    "questionCount": 10,
    "seed": 42,
    "mockInference": false
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "summary": {
      "runId": "gsm8k_run_173...",
      "accuracy": 100.0,
      "totalQuestions": 10,
      "correctAnswers": 10,
      "avgResponseTimeMs": 380
    }
  }
  ```

### Compare Models Head-to-Head
- **Endpoint**: `POST /api/evaluation/gsm8k/compare`
- **Payload**:
  ```json
  {
    "modelIds": ["gemini-2.5-flash", "gemini-2.5-pro"],
    "questionCount": 10
  }
  ```

### Query Fine-Tuning Readiness & SFT Export
- **Endpoint**: `GET /api/evaluation/gsm8k/finetuning`
- **Endpoint**: `POST /api/evaluation/gsm8k/finetuning`
  ```json
  {
    "format": "alpaca",
    "maxSamples": 50
  }
  ```

---

## 3. UI Controls in Evaluation Lab

Navigate to `/evaluation` in your browser and select the **GSM8K Math Reasoning** tab:
1. Select target model and question sample count (5, 10, 25, 50).
2. Click **Run GSM8K Benchmark** to trigger evaluation.
3. Review overall accuracy, sub-domain breakdown, and question-by-question explanations.
4. Toggle **Custom Model SFT** to inspect fine-tuning hyperparameters.
