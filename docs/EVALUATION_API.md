# TATTVA AI — Evaluation & Benchmark API Reference
**Conceptualized & Engineered by kotapati Gowtham Chowdary**

---

## 1. Overview

The **TATTVA AI Evaluation API** provides a complete REST and Server-Sent Events (SSE) interface for managing datasets, launching benchmark evaluations, streaming real-time progress, conducting model comparisons, and managing human-approved failure improvements.

All endpoints are hosted under `/api/evaluation/` in the Next.js application.

---

## 2. Dataset Management Endpoints

### `GET /api/evaluation/datasets`
Retrieves the list of all registered benchmark datasets from the manifest.

- **Response `200 OK`**:
```json
{
  "success": true,
  "canonicalRoot": "datasets/",
  "totalDatasets": 5,
  "datasets": [
    {
      "id": "mmmlu-hi-in-sample",
      "name": "OpenAI MMMLU Hindi (Sample Benchmark)",
      "language": "hi-IN",
      "format": "csv",
      "recordCount": 456,
      "fileSizeFormatted": "405.28 KB",
      "isActive": true
    }
  ]
}
```

---

### `GET /api/evaluation/datasets/[id]`
Inspects a single dataset schema and sample questions with ground-truth answers strictly masked.

- **Query Parameters**:
  - `sample=true`: Return up to 3 sample questions for schema inspection.
- **Response `200 OK`**:
```json
{
  "success": true,
  "dataset": {
    "id": "telugu-reasoning-indic",
    "name": "Telugu Reasoning & Indic Knowledge Benchmark",
    "language": "te-IN",
    "format": "jsonl",
    "isActive": true
  },
  "sampleQuestions": [
    {
      "id": "te_001",
      "question": "ఒక తరగతిలో 40 మంది విద్యార్థులు ఉన్నారు...",
      "options": { "A": "16", "B": "24", "C": "20", "D": "18" }
    }
  ]
}
```

---

### `PATCH /api/evaluation/datasets/[id]`
Toggles the active benchmark status of a dataset.

- **Request Body**:
```json
{
  "isActive": false
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "id": "instruction-following-eval",
  "isActive": false
}
```

---

## 3. Evaluation Execution & Streaming Endpoints

### `POST /api/evaluation/run`
Executes an empirical evaluation run. Supports both SSE real-time streaming and synchronous JSON batch completion.

- **Headers**:
  - `Content-Type: application/json`
  - `Accept: text/event-stream` (when `stream: true`)
- **Request Body**:
```json
{
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "dataset": "sample",
  "sampleSize": 25,
  "subject": "all",
  "concurrency": 2,
  "seed": 42,
  "stream": true
}
```

#### SSE Streaming Protocol (`stream: true`)
Emits a series of structured event frames:
```text
event: progress
data: {"current":1,"total":25,"percentage":4,"correct":1,"incorrect":0,"accuracy":100,"latestResult":{...}}

event: progress
data: {"current":2,"total":25,"percentage":8,"correct":2,"incorrect":0,"accuracy":100,"latestResult":{...}}

event: complete
data: {"id":"eval_1794697836865_7vyb8","accuracy":88,"totalQuestions":25,"correctAnswers":22,...}
```

---

### `POST /api/evaluation/stop` / `POST /api/evaluation/cancel`
Signals an active evaluation run to cancel gracefully.

- **Request Body**:
```json
{
  "runId": "eval_1794697836865_7vyb8"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Evaluation run cancelled."
}
```

---

## 4. Model Comparison Endpoints

### `POST /api/evaluation/compare`
Launches a side-by-side benchmark arena comparison across two or more models using identical seed parity.

- **Request Body**:
```json
{
  "comparisonName": "Gemini 2.5 Flash vs Gemini 3.6 Flash Indic Arena",
  "sampleSize": 25,
  "seed": 42,
  "concurrency": 2,
  "targets": [
    { "provider": "gemini", "model": "gemini-2.5-flash" },
    { "provider": "gemini", "model": "gemini-3.6-flash" }
  ]
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "report": {
    "id": "cmp_1794698878360_egwa",
    "title": "Gemini 2.5 Flash vs Gemini 3.6 Flash Indic Arena",
    "sampleSize": 25,
    "seed": 42,
    "fairBenchmarkConditionMet": true,
    "winnerModel": {
      "model": "gemini-2.5-flash",
      "provider": "gemini",
      "accuracy": 84,
      "avgLatencyMs": 950,
      "reason": "Highest accuracy (84%) with 950ms average response latency."
    },
    "models": [...],
    "questionDeltas": [...]
  }
}
```

---

## 5. Performance Improvement Endpoints

### `POST /api/evaluation/analysis`
Ingests an evaluation run ID, clusters failure patterns, and generates actionable recommendations.

- **Request Body**:
```json
{
  "runId": "eval_1794697836865_7vyb8"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "report": {
    "id": "analysis_eval_1794697836865_7vyb8",
    "totalErrors": 4,
    "clusters": [
      {
        "category": "subject_knowledge_gap",
        "affectedSubjects": ["sociology"],
        "count": 3
      }
    ],
    "recommendations": [...]
  }
}
```

---

### `PATCH /api/evaluation/analysis`
Updates human approval governance state for a recommendation.

- **Request Body**:
```json
{
  "analysisId": "analysis_eval_1794697836865_7vyb8",
  "recommendationId": "rec_1794698941_subj",
  "status": "approved",
  "reviewerName": "kotapati Gowtham Chowdary"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "status": "approved",
  "reviewerName": "kotapati Gowtham Chowdary"
}
```

---

## 6. Report Export Endpoint

### `GET /api/evaluation/export`
Generates and downloads formal evaluation reports in multiple formats.

- **Query Parameters**:
  - `runId`: ID of the evaluation run (e.g. `eval_1794697836865_7vyb8`).
  - `format`: `csv` | `json` | `pdf`.
- **Response Headers**:
  - `Content-Disposition: attachment; filename="tattva_evaluation_<id>.<ext>"`
  - `Content-Type`: `text/csv`, `application/json`, or `application/pdf`.

---
*Created by kotapati Gowtham Chowdary for TATTVA AI Foundation Ecosystem.*
