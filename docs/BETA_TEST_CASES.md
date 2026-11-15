# TATTVA AI — Beta Testing Scenarios & Test Cases (Phase 29)

**Lead QA Architect & Maintainer:** kotapati Gowtham Chowdary  
**Release Tag:** `2.1.0-beta.2`  
**Automated Verification:** `tests/phase-29-controlled-beta-launch.test.ts` & `tests/release-candidate-user-journeys.test.ts`

---

## Suite A: Authentication & Access Control

| Case ID | Scenario | Expected Outcome | Actual Result |
| :--- | :--- | :--- | :---: |
| **TC-AUTH-01** | Register with valid email and 8+ char password | Account created with PBKDF2 SHA-512 hash; session established | **PASSED** |
| **TC-AUTH-02** | Attempt registration with 3-char password | Rejected with error "Password must contain at least 6 characters" | **PASSED** |
| **TC-AUTH-03** | Google OAuth login | Redirects through canonical `tattva-ai-phi.vercel.app/auth/callback` | **PASSED** |
| **TC-AUTH-04** | Password recovery token request | Generates 1-hour expiration token; blocks external open redirects | **PASSED** |
| **TC-AUTH-05** | Beta access without invite code | Access blocked with prompt to provide authorized invitation code | **PASSED** |

---

## Suite B: Conversational AI & Prompt Understanding

| Case ID | Scenario | Expected Outcome | Actual Result |
| :--- | :--- | :--- | :---: |
| **TC-CHAT-01** | Multi-turn conversational context | Assistant retains pronouns and entities across 5+ consecutive turns | **PASSED** |
| **TC-CHAT-02** | Hindi / Telugu scientific query | Answers fluently in native script with correct academic terminology | **PASSED** |
| **TC-CHAT-03** | Server-Sent Events (SSE) streaming | Tokens stream incrementally without buffering freezes | **PASSED** |
| **TC-CHAT-04** | Dynamic model switching | Transitions between Gemini Flash and Claude 3.5 without context loss | **PASSED** |

---

## Suite C: Workspaces & Multi-Tenancy

| Case ID | Scenario | Expected Outcome | Actual Result |
| :--- | :--- | :--- | :---: |
| **TC-WS-01** | Personal workspace auto-provisioning | Isolated personal workspace created with user ID ownership | **PASSED** |
| **TC-WS-02** | Organization member role enforcement | Owner/Admin can invite; Guests restricted from workspace admin | **PASSED** |
| **TC-WS-03** | Cross-tenant isolation | Tenant B cannot access or view conversation threads of Tenant A | **PASSED** |

---

## Suite D: Document Intelligence & RAG

| Case ID | Scenario | Expected Outcome | Actual Result |
| :--- | :--- | :--- | :---: |
| **TC-DOC-01** | 5-page PDF document upload | Magic bytes validated; text extracted cleanly in under 250ms | **PASSED** |
| **TC-DOC-02** | Upload file exceeding 25MB | Rejected immediately with memory exhaustion guardrail alert | **PASSED** |
| **TC-DOC-03** | Query-salient context compression | Reduces retrieved chunk tokens by $> 50\%$ while keeping citations | **PASSED** |

---

## Suite E: AI Tools & Media Operations

| Case ID | Scenario | Expected Outcome | Actual Result |
| :--- | :--- | :--- | :---: |
| **TC-TOOL-01** | Image generation via Cloudflare FLUX | Renders photorealistic image with valid prompt; falls back to SDXL if busy | **PASSED** |
| **TC-TOOL-02** | Direct Presentation (.pptx) synthesis | Downloads valid OpenXML presentation with slide deck structure | **PASSED** |
| **TC-TOOL-03** | Agent destructive tool execution | Prompts user with interactive safety confirmation dialog | **PASSED** |
| **TC-TOOL-04** | Audio playback | On-demand Read Aloud plays voice cleanly; confirms mic auto-record is disabled | **PASSED** |

---

## Suite F: Evaluation Lab & Benchmarks

| Case ID | Scenario | Expected Outcome | Actual Result |
| :--- | :--- | :--- | :---: |
| **TC-EVAL-01** | MMMLU Hindi 456-question sample run | Double-blind scoring matches ground-truth key; computes accuracy | **PASSED** |
| **TC-EVAL-02** | Deterministic seed comparison | Identical PRNG seed produces repeatable question sequences | **PASSED** |

---

## Suite G: Cross-Platform Compatibility

| Case ID | Scenario | Expected Outcome | Actual Result |
| :--- | :--- | :--- | :---: |
| **TC-PLAT-01** | Mobile web browser responsive UI | Sidebar drawer collapses; input bar adjusts to virtual keyboard | **PASSED** |
| **TC-PLAT-02** | Android native APK execution | Connects to production cloud server; file upload picker functions | **PASSED** |
| **TC-PLAT-03** | Desktop Electron app execution | Updated cloud URL loads cleanly; Evaluation Lab accessible from menu | **PASSED** |
