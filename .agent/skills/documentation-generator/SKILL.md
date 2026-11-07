---
name: documentation-generator
description: >-
  Generates concise, accurate developer documentation, API endpoint references, architecture
  runbooks, and README sections while strictly preventing secret leakage and documentation bloat.
  Use when documenting new APIs, updating READMEs, writing operational runbooks, or drafting setup guides.
---

# Documentation Generator

The Documentation Generator skill governs the creation of clear, maintainable, and token-efficient technical documentation across the TATTVA AI repository.

## Documentation Standards

1. **Precision & Conciseness**:
   - Write clear, actionable prose. Avoid verbose introductions, filler phrases, and repetitive boilerplate.
   - Use Markdown tables, code fences, and Mermaid diagrams where structural relationships need illustration.
   - Document the *why* and the *how-to-use* rather than describing line-by-line what the code already demonstrates.

2. **API Endpoint Documentation Template**:
   For any new or modified endpoint in `app/api/`:
   ```markdown
   ### [METHOD] /api/path
   - **Purpose**: One-sentence summary.
   - **Auth**: Required / Public / Bearer Token.
   - **Request Payload**: JSON schema or example.
   - **Response**: Typical 200 payload & error status codes (400, 401, 500).
   ```

3. **Zero Secret Exposure**:
   - **NEVER** include real API keys, Supabase tokens, passwords, or production server URLs in documentation or examples.
   - Use standard placeholders: `your_gemini_api_key`, `your_supabase_anon_key`.

4. **Synchronize with Code**:
   - When updating API signatures or route paths, update the corresponding section in `frontend/README.md` or `PROJECT_STATE.md`.
   - Remove obsolete flags, deprecated options, and dead documentation blocks immediately upon code removal.

