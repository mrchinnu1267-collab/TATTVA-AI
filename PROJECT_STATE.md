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

- [x] **Complete Removal of Web Image Search, Live Voice Assistance & Microphone Systems**:
  - Permanently deleted the Web Image Search Engine: removed `app/images/`, `app/api/images/`, `app/components/InbuiltImageSearchModal.tsx`, `app/components/VisualImageGallery.tsx`, `app/lib/image-search/`, `app/lib/web-image-search.ts`, and all image search routes/hooks/modals.
  - Permanently deleted the Live Voice Assistance & Microphone systems: deleted `app/voice/`, `app/api/voice-chat/`, `app/api/tts/`, `app/lib/sara-voice.ts`, `tests/sara-voice.test.ts`, and all speech recognition/synthesis listeners.
  - Rebuilt Chat Interface: the input contains only text input, attachment button (`+` for photo/document uploads), camera button (`📷` for device photo capture), and a clean neutral Send/Stop button (`ArrowUp` / `Square`).
- [x] **Multilingual Direct File & Presentation Synthesis with Notification Controls**:
  - Implemented `detectDocumentGenerationIntent` in `app/lib/document-engine/intent.ts`: understands natural language requests in English, Telugu, Hindi, and transliterations (e.g. "create a ppt on solar energy", "solar energy gurinchi ppt chey", "photosynthesis par ppt banao") and extracts clean topic subjects.
  - Implemented `synthesizeDocument` in `app/lib/document-engine/synthesizer.ts`: delivers concise, punchy slide structures and documents directly without raw Python code or unnecessary boilerplate.
  - Connected direct document generation pipeline in `app/api/chat/route.ts` and `app/lib/ai-orchestrator/index.ts`.
  - Upgraded Chat UI with prominent downloadable Presentation/Document cards with one-click download buttons.
  - Added dedicated **Notifications & Alerts** tab to Application Settings: controls browser push notifications (`Notification.requestPermission()`), harmonic audio completion chimes via Web Audio API, document ready alerts, and interactive test notification dispatch.
  - All 44 automated tests passing (`tests/run-tests.mjs`). Deployed to Vercel production.
  - Engineered zero-dependency pure TypeScript OpenXML and PDF binary engines (`app/lib/document-engine/`):
    - `docx.ts`: OpenXML WordprocessingML document builder generating valid ZIP archives with core props, styles, and document relationships.
    - `xlsx.ts`: OpenXML SpreadsheetML workbook builder generating valid `.xlsx` spreadsheets with multiple sheets and inline strings.
    - `pptx.ts`: OpenXML PresentationML builder generating valid presentation slides with cover and content slide trees.
    - `pdf.ts`: Byte-accurate PDF 1.4 binary builder with mathematically exact xref table offsets, eliminating cross-reference corruption.
    - `csv.ts`: RFC 4180-compliant CSV generator with UTF-8 BOM (`\uFEFF`).
    - `reader.ts`: Universal document extractor inspecting magic bytes (`PK\x03\x04`, `%PDF-`, `\x89PNG`, `\xFF\xD8\xFF`, `RIFF...WEBP`) and unzipping XML to extract clean text from DOCX, XLSX, and PPTX for Gemini and OpenRouter models.
  - Resolved MIME type resolution for mobile/Android uploads in `app/lib/security.ts` (`validateAndInspectFile`).
  - Automated 32 tests (`tests/run-tests.mjs`) passing with 100% success rate. Built and deployed cleanly via Turbopack.
  - Purged microphone permissions from Android (`AndroidManifest.xml` and `MainActivity.kt`), iOS (`Info.plist`), and Desktop (`desktop-app/main.js`).
  - Preserved protected systems: text-based AI chat, Gemini multimodal integration, normal image uploads, OCR, document generation, satellite maps, Supabase authentication, and Claude MCP connectors.
  - Verified with 16/16 unit tests passing (`npm test`), full Turbopack production compilation with 0 errors (`npm run build`), and clean native Android APK build (`tattva-ai.apk`).
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
- [x] **Complete Removal of Live Voice and Voice Input Across Entire Application**:
  - **Live Voice (`/voice`) Removal:** Replaced `/voice` page with an instant client-side redirect to `/chat`. Removed all navigation links pointing to `/voice` from `app/chat/page.tsx` (attachment menu item and input bar action), `app/download/page.tsx`, `app/maps/page.tsx`, `app/media/page.tsx`, and `app/sitemap.xml/route.ts`.
  - **Voice Input (Microphone & STT) Removal:** Completely purged speech-to-text input, microphone buttons (`Mic`, `MicOff`), language switcher pills, voice recognition handlers (`startVoiceRecognition`, `stopVoiceRecognition`), and `isListening` states across `app/chat/page.tsx` and `app/images/page.tsx`.
  - **Sara Auto-Narration & Voice Status Cleaned:** Removed Sara voice status banners, auto-narration settings, and background listening loops from `app/chat/page.tsx`. Clean, manual "Read Aloud" on individual messages remains strictly for on-demand text playback.
  - **Android Native Clean:** Purged `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, microphone hardware feature, and `RecognitionService` queries from `android-app/app/src/main/AndroidManifest.xml`. Removed speech recognition logic from `MainActivity.kt`. Rebuilt fresh APK (`12.2 MB`) in `public/tattva-ai.apk`.

---

## 4. Current Status

- **Build Integrity:** `npm run build` succeeds cleanly with Turbopack (47 routes compiled with 0 errors); Gradle `assembleDebug` builds cleanly (`BUILD SUCCESSFUL in 47s`).
- **Test Integrity:** `npm test` passes 16/16 core tests (SSRF, permissions, AES-256-GCM token encryption, Claude connector chat lifecycle).
- **Branch:** `main`.

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
