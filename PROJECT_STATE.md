# PROJECT_STATE.md — TATTVA AI Living Project State

> **Last Updated:** 2026-11-07  
> **Repository:** `TATTVA_AI` (Monorepo)  
> **Active Environment:** Next.js 16 (App Router, Turbopack, React 19)  
> **Production URL:** https://tattva-ai-phi.vercel.app/  
> **Maintainer:** kotapati Gowtham Chowdary

---

## 1. Project Architecture & Ecosystem

```
TATTVA_AI/
├── .agent/skills/            # Smart Agent Skills System (12 modular skills)
├── frontend/                 # Core Web Application (Next.js 16, React 19, Tailwind v4)
│   ├── app/                  # App Router: Pages, API Handlers, Layouts, Components
│   └── tests/                # Automated Test Suite (SSRF, Connectors, Security)
├── android-app/              # Native Android Application (Kotlin, Gradle 8.x)
├── ios-app/                  # iOS App Wrapper (Capacitor)
├── desktop-app/              # Desktop Application (Electron)
└── image-engine/             # Local AI Image Generation Pipeline (Python FastAPI, Diffusers)
```

---

## 2. Active Tech Stack

| Domain | Technology / Library | Version / Role |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router, Turbopack) | `16.4.3` |
| **UI Library** | React & React DOM | `19.3.1` |
| **Styling** | Tailwind CSS (PostCSS) | `^4.3.3` |
| **Motion & UI** | Framer Motion & Lucide React | `14.9.0` / `1.66.0` |
| **Database & Auth** | Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`) | PostgreSQL with RLS |
| **AI SDK** | Google GenAI SDK (`@google/genai`) | Gemini Multimodal & Text |
| **Connectors (MCP)** | Model Context Protocol (`mcp`, Claude Connectors) | `2.3.0` |
| **Observability** | Sentry (`@sentry/nextjs`) | `11.11.0` |
| **Analytics** | Google Analytics 4 (`gtag.js` with PII Sanitizer) | Measurement: `G-MLR64SJF5Q` |
| **Maps** | Leaflet & OpenStreetMap (`leaflet`, `@types/leaflet`) | `1.9.4` |
| **Knowledge Graph** | Graphify (`graphifyy[mcp,sql]`) | `0.9.103` |

---

## 3. Completed Milestones & Verified Features

- [x] **Technical SEO & Structured Data Complete**:
  - Unique titles and meta descriptions across all 8 canonical routes.
  - Valid Schema.org JSON-LD (`WebSite`, `Organization`, `SoftwareApplication`, `BreadcrumbList`).
  - Production `robots.txt` and `sitemap.xml` with zero broken links.
  - Server-rendered crawlable semantic content across interactive studio pages.
- [x] **Security & Zero-Trust Architecture**:
  - Nonce-based Content Security Policy (CSP) with `strict-dynamic` (no `unsafe-inline`/`unsafe-eval` in production).
  - Deprecated `X-XSS-Protection` removed; HSTS and security headers verified.
  - SSRF Guardrails for Claude MCP Connectors blocking private IPs, loopbacks, and cloud metadata.
  - AES-256-GCM token and BYOK key encryption at rest.
- [x] **Web Performance (TTFB)**:
  - Reduced warm TTFB from 1,104ms down to ~291ms via edge optimizations.
- [x] **Observability & Analytics**:
  - Google Analytics 4 integration tracking 9 custom user events with strict client-side PII sanitization.
  - Sentry v11 error and performance monitoring configured across client, server, and edge.
- [x] **Graphify Codebase Knowledge Graph**:
  - Extracted AST and call flows across 163 files.
  - Configured local stdio MCP server in `~/.gemini/config/mcp_config.json`, `.cursor/mcp.json`, and `.vscode/mcp.json`.
- [x] **Smart Agent Skills System**:
  - 12 modular skills installed in `.agent/skills/` with automated discovery and token optimization rules.

---

## 4. Current Status

- **Build Integrity:** `npm run build` succeeds cleanly with Turbopack (47 routes compiled).
- **Test Integrity:** `npm test` passes 16/16 tests (SSRF, permissions, AES-256-GCM, connector chat lifecycle).
- **Branch:** `main` (clean working directory).

---

## 5. Important Configuration Details

- **No Secrets in Memory**: Real API keys, tokens, and credentials reside exclusively in `.env.local` (server-side only) and are never exposed in logs or documentation.
- **Async Route Params**: Next.js 16 dynamic route params are Promises (`const { id } = await params;`).
- **Sentry v11 Import**: `withSentryConfig` imported from `@sentry/nextjs/config`.
- **MCP Server Command**: `python -m graphify.serve C:\Users\mrchi\TATTVA_AI\TATTVA_AI\frontend\graphify-out\graph.json --transport stdio`.

---

## 6. Prioritized Next Tasks

1. **AI Chat & Streaming Polish**: Verify multi-turn streaming UX with Gemini Live and Claude MCP tool invocations.
2. **Offline Local Image Generator**: Connect frontend `local-image-generator` route with the Python FastAPI `image-engine` on port 8000.
3. **Android App Release Preparation**: Test and package Android native release APK from `android-app/`.
4. **PWA & Offline Synchronization**: Enhance Service Worker caching for offline map tiles and chat history.
