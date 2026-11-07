---
name: dependency-manager
description: >-
  Audits, updates, and manages npm and Python dependencies across the TATTVA AI monorepo,
  preventing duplicate packages, version mismatches, bundle bloat, and Turbopack incompatibility.
  Use when adding new libraries, evaluating bundle weight, updating packages, or pruning unused modules.
---

# Dependency Manager

The Dependency Manager skill ensures tight dependency hygiene across Node.js/Next.js and Python subprojects, preventing unnecessary package installations, runtime conflicts, and bundle bloat.

## Dependency Management Rules

1. **Check Existing Packages Before Adding New Ones**:
   - Inspect `package.json` and `node_modules/` before running `npm install`.
   - Reusable libraries already present in the workspace:
     - `@google/genai`: Official Google Gemini SDK (do not add `@google/generative-ai` legacy).
     - `@supabase/ssr` & `@supabase/supabase-js`: Supabase authentication and client.
     - `@sentry/nextjs`: Error and performance telemetry.
     - `framer-motion`: Motion and animations.
     - `lucide-react`: UI icon set.
     - `leaflet` & `@types/leaflet`: Interactive maps.
     - `tailwindcss` v4: Styling engine.
     - `graphifyy`: AST knowledge graph and MCP engine.

2. **Evaluate Necessity & Bundle Impact**:
   - Prefer native Node.js / Web APIs over external dependencies:
     - Use native `crypto.getRandomValues()` / `crypto.subtle` instead of third-party crypto packages where applicable.
     - Use native `fetch()` instead of `axios` or `request`.
     - Use standard TypeScript interfaces instead of heavy schema libraries unless explicitly requested.

3. **React 19 & Next.js 16 Compatibility**:
   - Always verify peer dependency compatibility with React 19.3.1 before installing UI libraries.
   - For Sentry: Ensure imports use `@sentry/nextjs/config` for `withSentryConfig` to maintain compatibility with v11.

4. **Python Dependencies (`image-engine/` & MCP)**:
   - For Python modules: Check `image-engine/requirements.txt` or global Python environment before installing.
   - Use `py -m pip list` to check installed packages.

