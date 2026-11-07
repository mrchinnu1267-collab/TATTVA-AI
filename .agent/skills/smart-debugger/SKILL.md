---
name: smart-debugger
description: >-
  Systematically diagnoses runtime errors, build failures, API timeouts, and unexpected behaviors
  by isolating root causes from logs, applying minimal surgical patches, and verifying fixes.
  Use when encountering build errors, Next.js exceptions, API 500s, Supabase connection failures, or test regressions.
---

# Smart Debugger

The Smart Debugger skill enforces evidence-based root-cause analysis and surgical corrections for the TATTVA AI stack, preventing shotgun debugging and unnecessary rewrites.

## Diagnosis Workflow

1. **Capture the Exact Error Signature**:
   - Extract the precise error message, stack trace, and HTTP status code.
   - For server-side Next.js / Edge issues: Inspect Sentry logs, Turbopack compile output, or terminal output.
   - For client-side UI bugs: Inspect browser console, hydration warnings, or error boundary fallbacks in `app/global-error.tsx`.

2. **Isolate Root Cause Before Editing**:
   - Trace the exact line of failure using file-scoped reads.
   - Check recent modifications via `git diff` or `git status`.
   - Distinguish environment issues (missing `.env.local` keys) from logic errors or typing discrepancies.

3. **Formulate Minimal Surgical Solution**:
   - Edit only the broken expression or function; never rewrite surrounding working code.
   - Adhere to Next.js 16 breaking changes (e.g., dynamic params awaiting, Turbopack conventions, proxy/middleware semantics).
   - Check React 19 rules (no deprecated lifecycles, proper ref handling, clean Server Component / Client Component boundaries).

4. **Verify the Fix**:
   - Run the automated test suite:
     ```powershell
     npm test
     ```
   - For build or type errors, run:
     ```powershell
     npm run build
     ```
   - Verify that the fix resolved the error without introducing regressions in dependent modules.

## Golden Rules
- Never suppress errors with catch-all empty blocks or `any` casts without explicit documentation.
- Never modify database schemas or external API contracts to mask local validation bugs.

