# TATTVA AI — Beta Tester Onboarding & Testing Guide (Phase 29)

**Welcome to the TATTVA AI Beta Program!**  
Conceptualized & Engineered by **kotapati Gowtham Chowdary**

---

## 1. Getting Started

### Step 1: Accessing the Beta Environment
1. Navigate to: `https://tattva-ai-phi.vercel.app/beta`
2. Enter your authorized email address.
3. Enter your assigned Invitation Code:
   - Standard Tester: `TATTVA-BETA-2026`
   - VIP Founder: `TATTVA-VIP-FOUNDER`
4. Click **Activate Beta Access**.

---

## 2. Testing Instructions by Capability

### A. Conversational AI Chat (`/chat`)
- **Prompt Diversity:** Test general inquiries, complex multi-part logic puzzles, and domain-specific topics (chemistry, jurisprudence, history).
- **Multilingual Queries:** Converse naturally in English, Hindi (Devanagari), Telugu (Telugu script), and mixed code-switching.
- **Model Switching:** Use the Model Selector to toggle between **Gemini 2.5 Flash**, **Claude 3.5 Sonnet**, and **Local Indic SLMs**.

### B. Document Intelligence & File Uploads
- **File Ingestion:** Upload PDF, DOCX, XLSX, and CSV documents (under 25MB).
- **Context Questioning:** Ask specific questions referencing table cells, sections, and paragraphs.
- **Citation Verification:** Check that the assistant attributes answers with exact section headers and source names.

### C. Direct Presentation & Document Synthesis
- **Prompts:** Try natural requests like:
  - `"Create a 5-slide presentation on renewable solar energy in India"`
  - `"Draft a project proposal for a smart campus energy management system"`
- **Verification:** Download the generated `.pptx` or `.docx` file and verify formatting in PowerPoint or Word.

### D. MMMLU Evaluation Lab (`/evaluation`)
- Test the empirical evaluation runner using the smaller 456-question sample or full 57-subject Hindi dataset.
- Compare accuracy scores and delta matrices between AI models.

---

## 3. How to Report Issues & Submit Feedback

Use the **Bug Reporting & Feedback Intake** section at `/beta`:
1. Select the relevant **Category** (`bug_report`, `incorrect_ai_response`, `performance_issue`, `ui_ux_suggestion`, `missing_feature`).
2. Choose the appropriate **Severity** (`Critical`, `High`, `Medium`, `Low`).
3. Select your **Platform** (`Desktop Web Browser`, `Mobile Browser`, `Android App`, `Desktop App`).
4. Enter clear reproduction steps and your expected vs actual outcome.
5. Click **Submit Beta Report**.

---

## 4. Privacy & Data Protection Guarantee
- Your private conversations are **never** used to train foundation models.
- Feedback reports capture only the description and metadata you provide.
- You may exercise your GDPR Right-To-Be-Forgotten at any time via `/settings`.
