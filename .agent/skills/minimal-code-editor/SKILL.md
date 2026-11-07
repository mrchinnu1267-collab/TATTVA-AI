---
name: minimal-code-editor
description: >-
  Performs precise, surgical modifications to existing codebases, preserving architectural
  patterns, existing logic, comments, and typing. Use when editing existing components,
  adding incremental features, refactoring functions, or adjusting configurations.
---

# Minimal Code Editor

The Minimal Code Editor skill enforces high-precision, low-churn code edits across TATTVA AI files to minimize regressions, preserve context, and respect token budgets.

## Editing Protocols

1. **Targeted Block Edits**:
   - Use `edit_file` with explicit, unambiguous target character sequences.
   - Never replace entire files when modifying a few lines or a single helper function.
   - Preserve existing file comments, JSDoc annotations, license headers, and formatting.

2. **Zero Inventions & Zero Deletions**:
   - Do not delete existing features, tests, or security checks to make code simpler.
   - Reuse existing utilities:
     - Use `encryptAES256GCM` / `decryptAES256GCM` from `app/lib/security.ts` instead of importing another crypto library.
     - Use `trackEvent` from `app/lib/gtag.ts` instead of adding ad-hoc analytics calls.
     - Use `createClient` from `app/lib/supabase.ts` for database interactions.

3. **Compatibility Safeguards**:
   - Next.js 16: Check `node_modules/next/dist/docs/` for breaking changes; ensure async parameters in route handlers and page components are handled correctly.
   - React 19: Keep `"use client"` directives only at leaves that require client interactivity (hooks, state, browser events).
   - Tailwind CSS v4: Use modern CSS variables and utility classes without importing obsolete Tailwind v3 configuration files.

4. **Change Validation**:
   - Check `git diff` after edits to ensure changes match intent with zero collateral churn.
   - Ensure clean compilation with `npm run build` or `npm test`.

