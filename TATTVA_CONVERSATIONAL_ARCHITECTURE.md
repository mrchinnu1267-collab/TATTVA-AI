# TATTVA AI — Master Conversational Intelligence Architecture

**Version**: 2.4.0-conversational-master  
**Author**: kotapati Gowtham Chowdary  
**Status**: Production Ready  
**Date**: November 2026  

---

## 1. Executive Architecture Summary

TATTVA AI's Master Conversational Intelligence subsystem establishes an independent, high-cognition natural conversational engine. It bridges raw LLM inference with empathetic emotional calibration, Romanized Indic multilingual understanding (Telugu, Tenglish, Hindi, Hinglish), cross-turn conversational state tracking, and strict non-clinical safety boundaries.

```
                                  ┌────────────────────────────────┐
                                  │       User Input Stream        │
                                  └───────────────┬────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │           Conversational Safety Guard            │
                         │ (Self-Harm Crisis, Non-Clinical, Attachment Bnd) │
                         └───────────────┬──────────────────┬───────────────┘
                                         │ Safe             │ Intercept
                                         ▼                  ▼
                ┌───────────────────────────────────┐    ┌──────────────────┐
                │   Human Intelligence Pipeline     │    │ Crisis / Support │
                │ ───────────────────────────────── │    │ Safe Response    │
                │ 1. Multilingual & Slang Engine    │    └──────────────────┘
                │ 2. Emotional Context Analyzer     │
                │ 3. Context & Reference Continuity │
                │ 4. Adaptive Personality Engine    │
                └─────────────────┬─────────────────┘
                                  │ Enriched Guidance & Anaphora Resolution
                                  ▼
                ┌───────────────────────────────────┐
                │          AI Orchestrator          │
                │  - Zero Early Clarification Trap  │
                │  - Grounded Context & Memory      │
                │  - Dynamic Temperature & Tokens   │
                └─────────────────┬─────────────────┘
                                  │
                                  ▼
                ┌───────────────────────────────────┐
                │     Streaming Response Engine     │
                │  - Low TTFT (< 250ms)             │
                │  - SSE Emotional Metadata Event   │
                │  - Zero PII Credential Leakage    │
                └───────────────────────────────────┘
```

---

## 2. Core Engine Components

### 2.1 Multilingual Conversational Engine (`multilingual-conversational-engine.ts`)
- **Script & Romanized Dialect Detection**: Detects Telugu script (`\u0C00-\u0C7F`), Devanagari Hindi (`\u0900-\u097F`), Romanized Tenglish (`naku`, `cheppu`, `ela`, `bagundi`, `undha`, `kavali`, `chudandi`), and Hinglish (`kya`, `kaise`, `batao`, `accha`, `nahi`, `karo`).
- **Code-Mixing Identification**: Flags hybrid prompts (e.g. `"FastAPI lo CORS ela configure cheyali?"` or `"Next.js mein server action kaise likhein?"`).
- **Slang & Abbreviation Normalization**: Standardizes `pls`, `thx`, `idk`, `rn`, `tbh`, `imo`, `plz`, `bcoz`, `cuz`, `fyi`, `wbu` into clear semantic tokens while retaining conversational tone.

### 2.2 Emotional Context Analyzer (`emotional-context-analyzer.ts`)
- **11 Affective States**: `happiness`, `excitement`, `curiosity`, `confusion`, `frustration`, `disappointment`, `stress`, `sadness`, `uncertainty`, `urgency`, `satisfaction`.
- **Probabilistic Calibration**: Generates a continuous `confidence` score (0.0 to 1.0) and assigns an `uncertaintyLevel: "low" | "moderate" | "high"`.
- **Valence & Arousal Mapping**: Quantifies affective dimension (-1.0 to +1.0) to dynamically adjust LLM decoding temperature (e.g., lower temperature 0.3 for stress/frustration for stability; higher 0.7 for excitement/curiosity).
- **Non-Clinical Boundary**: Explicitly treats emotional detection as conversational context guidance, never diagnosing or labeling users clinically.

### 2.3 Context Continuity & Anaphora Tracker (`conversational-context-tracker.ts`)
- **Active State Tracking**: Tracks `currentTopic`, `previousTopics` (up to 5), `activeGoal`, `completedSteps`, and `pendingQuestions`.
- **Anaphora Resolution**: Translates terse follow-up turns (`"Why?"`, `"Tell me more"`, `"How so?"`, `"Explain differently"`, `"What next?"`, `"Redo"`) into fully contextualized intent queries grounded in the immediate conversation history.
- **Clarification Calibration**: Eliminates early clarification traps by ensuring ambiguous or terse queries with prior context continue seamlessly without interrogating the user.

### 2.4 Adaptive Personality Engine (`adaptive-personality-engine.ts`)
- **5 Interaction Archetypes**:
  - `collaborative_peer`: Default balanced stance for shared technical development.
  - `patient_tutor`: Scaffolded explanations and conceptual analogies for educational queries.
  - `technical_specialist`: Zero-fluff, production-grade code, algorithmic trade-offs.
  - `empathetic_guide`: De-escalating reassurance and steady steps during frustration.
  - `crisp_operator`: Instant line-1 actionable fixes for operational urgencies.
- **Anti-Filler Guard**: Strictly prohibits canned robotic clichés (`"Certainly!"`, `"I'd be happy to help"`, `"As an AI..."`).

### 2.5 Conversational Safety Guard (`conversational-safety-guard.ts`)
- **Crisis Intervention**: Detects self-harm and acute distress across English, Telugu, and Hindi; returns verified 24/7 helplines:
  - India: Tele-MANAS (`14416` / `1800-891-4416`), KIRAN (`1800-599-0019`).
  - USA / International: `988`.
  - Global: `findahelpline.com`.
- **Clinical Boundaries**: Enforces medical disclaimer and directs users to licensed professionals when asked to diagnose mental health disorders or prescribe medications.
- **Attachment Guard**: Firmly, warmly declines romantic or human-dependency overtures (`"will you be my girlfriend"`, `"do you love me"`), reaffirming its identity as an AI technical collaborator.

---

## 3. Streaming Metadata Architecture

During streaming responses (`/api/chat/stream`), the first Server-Sent Event emitted is a structured `meta` packet:

```json
event: meta
data: {
  "model": "qwen2.5-coder-3b-q4",
  "sessionId": "sess_abc123",
  "detectedLanguage": "Tenglish",
  "emotionalContext": {
    "primary": "frustration",
    "confidence": 0.85,
    "valence": -0.6,
    "arousal": 0.7
  },
  "persona": {
    "archetype": "empathetic_guide",
    "warmth": "high",
    "formality": "casual"
  }
}
```

The web client uses this metadata to tune UI ambiance (micro-animations, badge indicators) without polluting the conversational markdown output.
