---
name: codebase-explorer
description: >-
  Explores project architecture, maps file relationships, locates existing functions and modules,
  and performs targeted lookups without scanning entire repositories. Use when discovering
  architecture, tracing symbol dependencies, or checking if functionality already exists before writing code.
---

# Codebase Explorer

The Codebase Explorer skill guides efficient discovery of architecture, symbols, and data flows across the TATTVA AI workspace while minimizing token consumption and preventing redundant scans.

## Core Directives

1. **Check Existing Capabilities First**:
   - Query existing utilities in `app/lib/` before implementing new helpers:
     - `app/lib/ai-orchestrator/`: Multimodal intent routing and model fallback.
     - `app/lib/security.ts`: AES-256-GCM encryption, secure vault, key sanitization.
     - `app/lib/supabase.ts`: Supabase client and SSR cookies.
     - `app/lib/mcp/`: Claude Connectors and SSRF-guarded tool calls.
     - `app/lib/gtag.ts`: Google Analytics 4 event tracking with PII sanitizer.
     - `app/lib/image-search/`: Web image search adapters (Wikimedia, Pexels, Unsplash).
     - `app/lib/download-helper.ts`: APK and asset download verification.

2. **Leverage the Graphify Knowledge Graph**:
   - For symbol definitions, dependencies, and call hierarchies, inspect `graphify-out/graph.json` or run:
     ```powershell
     py -m graphify query "<symbol or workflow name>"
     ```
   - Run `py -m graphify explain "<NodeName>"` to inspect inbound and outbound edges.
   - Run `py -m graphify path "<Source>" "<Target>"` to trace call flows between components.

3. **Targeted File Inspection**:
   - Never run unbounded recursive searches over `node_modules/`, `.next/`, `build/`, or `.gradle/`.
   - Use scoped file reads (`StartLine` and `EndLine`) instead of reading whole files exceeding 200 lines.
   - Use specific grep or pattern matching across targeted subdirectories (`app/api`, `app/components`, `app/lib`).

4. **Multi-Platform Context Awareness**:
   - **Web / Frontend**: `frontend/` (Next.js 16 App Router, React 19, TypeScript).
   - **Android**: `android-app/` (Native Kotlin, Gradle Kotlin DSL).
   - **iOS**: `ios-app/` (Capacitor wrapper).
   - **Desktop**: `desktop-app/` (Electron main/preload).
   - **Local AI Pipeline**: `image-engine/` (Python FastAPI, Diffusers).

## Verification Procedure
- Verify symbol references with `git grep -n "<symbol>"` within the specific subproject.
- Confirm imports align with existing path aliases (`@/app/...` or relative imports).

