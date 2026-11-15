# TATTVA AI – ADVANCED PROMPT UNDERSTANDING ENGINE
**Author & Lead Architect**: kotapati Gowtham Chowdary  
**Release**: v2.1.0 (Production General Availability)  
**Verification**: 35 / 35 Automated Tests Passing ([frontend/tests/phase-15-prompt-intelligence.test.ts](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/tests/phase-15-prompt-intelligence.test.ts))  
**Implementation**: [frontend/app/lib/prompt-understanding/](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/lib/prompt-understanding)

---

## 1. Architectural Overview

The **TATTVA AI Advanced Prompt Understanding Engine** serves as the cognitive entry-point of the application. Rather than passing raw user strings directly to backend LLMs, all requests undergo structured semantic parsing, intent extraction, constraint binding, ambiguity assessment, and context anchoring.

```
                      [ User Input Query / Utterance ]
                                      │
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │       STAGE 1: Input Normalization & Script      │
             │       - Telugu/Hindi Devanagari detection        │
             │       - Telugu-English Romanized Code-Switching  │
             └────────────────────────┬────────────────────────┘
                                      │
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │       STAGE 2: Multi-Intent Classification      │
             │       - 14 granular intents (coding, math, RAG)  │
             └────────────────────────┬────────────────────────┘
                                      │
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │    STAGE 3: Requirement & Constraint Parsing    │
             │    - Output format (JSON, Markdown, Code)       │
             │    - Negative bounds ("Do NOT use libraries")   │
             └────────────────────────┬────────────────────────┘
                                      │
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │    STAGE 4: Context & Coreference Resolution    │
             │    - Anaphora resolution ("it", "previous code")│
             │    - Multi-turn conversational anchoring        │
             └────────────────────────┬────────────────────────┘
                                      │
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │    STAGE 5: Ambiguity Detection & Scoring       │
             │    - Score > 80: Trigger clarifying question    │
             │    - Score <= 80: Proceed to task planning      │
             └────────────────────────┬────────────────────────┘
                                      │
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │    STAGE 6: Task Decomposition & Milestones     │
             │    - Complex requests split into ordered DAG     │
             │    - Tool and dependency resolution             │
             └────────────────────────┬────────────────────────┘
                                      │
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │       STAGE 7: Internal Prompt Compilation      │
             │       - Augmented system directives             │
             │       - Grounded context injection              │
             └─────────────────────────────────────────────────┘
```

---

## 2. Intent Classification Across 14 Categories

The engine classifies every query into primary and secondary categories:
1. `coding`: Algorithms, React components, Next.js routing, SQL schemas.
2. `mathematics`: Algebraic calculation, differential equations, optimization.
3. `general_qa`: Broad factual queries, world knowledge, historical timelines.
4. `document_analysis`: PDF extraction, table comprehension, contract review.
5. `creative_writing`: Narrative prose, poetry, scriptwriting.
6. `data_analysis`: CSV/JSON statistics, variance, percentile calculations.
7. `web_research`: Real-time searches, factual validation via external tools.
8. `agent_task`: Multi-step repository inspection, file modifications.
9. `summarization`: Document compression, executive summaries.
10. `translation`: Indic script translation (Telugu, Hindi, Tamil) and English.
11. `image_generation`: Visual composition, photorealistic image requests.
12. `conversational`: Social greetings, casual dialogue, persona consistency.
13. `troubleshooting`: Bug diagnosis, stack trace debugging, error resolution.
14. `comparison`: Multi-model or technical trade-off evaluation matrices.

---

## 3. Telugu-English Mixed Code-Switching Handling

TATTVA AI natively parses natural Telugu-English conversational phrasing without intent distortion:
- *"Naku Java project kavali"* → Intent: `coding`, Target: `Java project scaffold`.
- *"Ee code lo errors identify cheyyi"* → Intent: `troubleshooting`, Target: `code debugging`.
- *"Previous answer short ga cheppu"* → Intent: `summarization`, Context: `previous assistant turn`.
- *"Daanini PDF ga convert cheyyi"* → Intent: `agent_task`, Tool: `pdf_generator`.
- *"Same design lo website create cheyyi"* → Intent: `coding`, Context: `referenced design spec`.

Spelling variations (e.g., *cheyyi*, *chey*, *cheyandi*) are normalized to root semantic lemmas without modifying the user's intent.

---

## 4. Context Coreference & Anaphora Resolution

When users refer to entities established in earlier conversation turns:
```
Turn 1: "Explain Dijkstra's shortest path algorithm."
Turn 2: "Give an implementation of it in Python."
Turn 3: "Make it shorter and remove recursion."
```
The engine resolves `"it"` to `Dijkstra's shortest path algorithm` across turns 2 and 3, maintaining focus and preventing topic drift.

---

## 5. Ambiguity Scoring & Clarification Gate

To prevent wasted inference and hallucinations on underspecified prompts:
- **Ambiguity Metric**: Scored 0–100 based on missing constraints, missing domain targets, and conflicting goals.
- **Ambiguity > 80**: Generates a targeted, interactive clarification question with multi-choice options.
- **Ambiguity <= 80**: Fills missing non-critical parameters with sensible defaults and proceeds with execution.

---

## 6. Verification and Automated Test Evidence

Verified in `frontend/tests/phase-15-prompt-intelligence.test.ts`:
- **Intent recognition accuracy**: 100% across all 14 categories.
- **Constraint extraction**: Verified negative constraint enforcement ("no third-party packages").
- **Anaphora resolution**: Verified entity chaining across multi-turn histories.
- **Task decomposition**: Verified 6-milestone DAG generation with zero cyclic dependencies.
