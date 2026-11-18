# TATTVA AI — Complete Image Generation Feature & Engine Removal Inventory

> **Lead Architect & Maintainer:** kotapati Gowtham Chowdary  
> **Platform Provider:** TATTVA AI  
> **Target Release:** Clean conversational, reasoning, multi-language, document intelligence, and developer platform without image generation  
> **Inventory Date:** 2026-11-18  

---

## 1. Executive Summary

This inventory maps all components, engines, API endpoints, database objects, test suites, UI views, navigation links, and package dependencies dedicated exclusively to **Image Generation and Editing** in TATTVA AI.

Following the Master Order, all dedicated image-generation subsystems will be completely and permanently removed. Crucially, **unrelated multimodal image-handling capabilities required by other features (e.g. user image uploads, vision analysis, handwriting OCR, and document image extraction) will remain 100% protected and preserved.**

---

## 2. Inventory by Category

### A. Frontend Pages & Layouts (To Be Removed)
| Component / Path | Purpose | Dependencies |
| :--- | :--- | :--- |
| `app/image-studio/page.tsx` | Main Image Studio interface with prompt input, aspect ratio, styles, galleries | `@/app/components/image-studio/*` |
| `app/image-studio/layout.tsx` | Metadata, layout wrapper, and OpenGraph configuration for Image Studio | Next.js Metadata |

### B. Frontend Components (`app/components/image-studio/`) (All 22 To Be Removed)
1. `AccuracyAuditSuite.tsx` — Real-time accuracy metrics and prompt compliance scoring.
2. `AccuracyReportCard.tsx` — Visual scorecard for prompt adherence and visual fidelity.
3. `AccuracyResearchDashboard.tsx` — Benchmark graphs and research telemetry.
4. `ContinuousLearningDashboard.tsx` — Model feedback learning visualization.
5. `CustomizationSuite.tsx` — LoRA and custom model style selector.
6. `DualSubscribedAgentSuite.tsx` — External image generation agent coordinator.
7. `EditingSuite.tsx` — Image inpainting, mask generation, and background replacement.
8. `EngineMaintenanceDashboard.tsx` — Model health, latency, and cache maintenance.
9. `EnhancementSuite.tsx` — Super-resolution and image upscaling controls.
10. `FinalAccuracyOptimizationDashboard.tsx` — Target accuracy optimization metrics.
11. `FinalCertificationDashboard.tsx` — Production gate certification report viewer.
12. `ImageIntelligenceReport.tsx` — Visual evaluation and attribute verification viewer.
13. `ModelIntelligenceDashboard.tsx` — Provider routing, latency, and cost comparator.
14. `NextGenArchitectureDashboard.tsx` — Multi-stage conditioning and scene graphs.
15. `ProductionMonitoringDashboard.tsx` — Active production image job alerts and metrics.
16. `ProductionReliabilityDashboard.tsx` — Retry, fallback, and circuit breaker health.
17. `RealWorldValidationDashboard.tsx` — Real-world prompt benchmark validation.
18. `RegressionDashboard.tsx` — Baseline regression comparator.
19. `SpatialEditingSuite.tsx` — Bounding box, layout control, and spatial placement.
20. `SubjectLibrary.tsx` — Persistent subject and character reference store.
21. `ValidationDashboard.tsx` — Test execution and failure analysis viewer.
22. `WorkspaceHistorySuite.tsx` — Image generation history, lineage trees, and downloads.

### C. Chat UI Generation Handlers (`app/chat/page.tsx`) (To Be Cleaned)
* `startPollingImageJob()` — Background client polling loop for async image generation jobs.
* `msg.imageJob` — Generation progress bars, percentage loaders, stage steppers (`queued`, `generating`, `verifying`, `refining`, `uploading`).
* Generation error formatters (`quota exceeded`, `free tier limits`).
* *Note:* Historical image display (`msg.image` in read-only mode) and user file attachments remain supported for conversation history.

### D. Dedicated API Routes (`app/api/image/*`) (All 30 Endpoints To Be Retired)
1. `/api/image` (Core text-to-image generation endpoint)
2. `/api/image/accurate` (Multi-stage prompt compiler and verifier)
3. `/api/image/benchmark` (200-prompt benchmark runner)
4. `/api/image/certification` (Phase V certification auditor)
5. `/api/image/download` (MIME-verified image downloader)
6. `/api/image/edit` (Inpainting, editing, background replacement)
7. `/api/image/edit/intent` (Editing intent classifier)
8. `/api/image/edit/segment` (Mask segmentation API)
9. `/api/image/intelligence` (Visual evaluation and attribute verifier)
10. `/api/image/jobs` (Async PostgreSQL image job state and polling API)
11. `/api/image/learning` (Adaptive prompt optimizer)
12. `/api/image/maintenance` (Engine maintenance runner)
13. `/api/image/maintenance/feedback` (User feedback collector for generated images)
14. `/api/image/maintenance/report` (Maintenance telemetry report)
15. `/api/image/monitoring` (Production monitoring metrics)
16. `/api/image/monitoring/alerts` (Failure rate alerts)
17. `/api/image/monitoring/improvement` (Automated engine tuning)
18. `/api/image/nextgen` (Next-gen architecture coordinator)
19. `/api/image/nextgen/benchmark` (Controlled benchmark runner)
20. `/api/image/optimization` (Final accuracy optimizer)
21. `/api/image/optimization/benchmark` (100-prompt optimization benchmark)
22. `/api/image/regression` (Regression baseline auditor)
23. `/api/image/research` (Scene graph and spatial research)
24. `/api/image/research/benchmark` (Research benchmark runner)
25. `/api/image/storage` (Supabase storage upload and signed URL generator)
26. `/api/image/subscribed-agents` (External companion agent adapter)
27. `/api/image/upscale` (Super-resolution upscaler)
28. `/api/image/validation` (Validation runner)
29. `/api/image/validation/real-world` (Real-world scenario test harness)
30. `/api/image/validation/real-world/dataset` (Evaluation dataset retriever)

### E. Dedicated Backend Engines (`app/lib/image-engine/`) (To Be Removed)
* `accuracy/` — Prompt understanding, requirement validator, auto-corrector.
* `accuracy-research/` — Controlled benchmarks, scene graphs, spatial research.
* `agents/` — Multi-agent generator and verifier system.
* `cloudflare/` — Cloudflare Workers AI FLUX.1 Schnell adapter.
* `consistency/` — Subject store, character consistency, prompt compiler.
* `continuous-learning/` — Controlled feedback loops, prompt optimizers.
* `customization/` — LoRA registry, style adapter.
* `editing/` — Mask generator, inpainting engine.
* `engine-maintenance/` — Cache eviction, health checks.
* `final-accuracy-optimization/` — Fine-tuning and prompt weight tuning.
* `final-certification/` — Feature test matrix, system auditor.
* `gemini/` — Gemini native image generation adapter (`gemini-3.1-flash-image`).
* `infrastructure/` — Hardware guardrails, circuit breakers.
* `local/` — Local fallback image generator.
* `model-benchmarking/` — Multi-model latency, cost, and adherence comparator.
* `multi-model-router/` — Image model fallback router.
* `nextgen-architecture/` — Reference conditioning and spatial layouts.
* `production-monitoring/` — Real-time telemetry, alert dispatchers.
* `prompt-accuracy/` — LLM-as-a-judge visual verification.
* `real-world-validation/` — Edge-case benchmark suite.
* `regression-testing/` — Regression detectors and baseline catalogs.
* `reliability/` — `db-job-store.ts`, `job-queue.ts`.
* `services/` — High-level image orchestration services.
* `spatial-control/` — Bounding boxes, layout conditioning.
* `subscribed-agents/` — Third-party subscribed agent adapters.
* `typography-engine/` — SVG overlay and typography generator.
* `upscaler/` — Image upscaler and super-resolution engine.
* `validation/` — Baseline comparator, failure analyzer.
* `visual-evaluation/` — OCR verification, segmentation, attribute checking.
* `providers.ts` — Hugging Face, Pollinations, and Gradio client bridge.

### F. AI Orchestration & Tool Registry Routing (To Be Refactored)
* `app/lib/ai-orchestrator/intent-classifier.ts`: Remove `image_generation` and `image_editing` classification intents.
* `app/lib/ai-orchestrator/model-registry.ts`: Remove image-only models (`black-forest-labs/flux-1-schnell`, `pollinations-flux`). Preserve multimodal vision inputs (`inputModalities: ["image"]`).
* `app/lib/ai-orchestrator/intelligence/prompt-analyzer.ts`: Remove image generation routing check.
* `app/lib/ai-orchestrator/index.ts`: Remove Early Routing for Image Generation and `generateImage`/`generateImageWithMultimodalRAG` pipelines. When a user requests image generation, clearly explain that image generation is retired and offer text/code/document assistance instead.

### G. UI Links & Site Metadata (To Be Updated)
* `app/dashboard/page.tsx`: Remove Image Studio card and quick-launch links.
* `app/download/page.tsx`: Remove Image Studio footer link.
* `app/maps/page.tsx`: Remove Image Studio link.
* `app/components/AuthPage.tsx`: Remove "image studio" from landing marketing text.
* `app/robots.ts`: Remove `/image-studio` from crawl directives.
* `app/sitemap.xml/route.ts`: Remove `/image-studio` from sitemap.
* `app/api/indexnow/route.ts`: Remove `/image-studio` from search engine ping URL list.

### H. Package Dependencies (To Be Removed from `package.json`)
* `@gradio/client` — Used exclusively by `app/lib/image-engine/providers.ts`.
* `@huggingface/inference` — Used exclusively by `app/lib/image-engine/providers.ts`.
* `@heyputer/puter.js` — Unused remnant.

### I. Database Tables & Migrations (Audit & Document)
* Table: `image_history`
* Table: `image_generation_jobs`
* Storage Bucket: `tattva-images`
* Functions: `claim_image_job`, `prune_stale_image_jobs`
* *Action:* Provide rollback and drop migration scripts in `supabase/migrations/` for administrative execution. Do not execute destructive drop against production without authorization.

### J. Test Suites (To Be Retired & Refactored)
* Remove all 32 image-specific test suites from `tests/run-tests.mjs`.
* Add a dedicated verification test `tests/image-generation-removal-verification.test.ts` to assert that image generation routes return 404, no image tools are registered, and conversational explanation is returned when image generation is requested.

---

## 3. Preservation Verification

The following capabilities are **explicitly protected and will remain 100% operational**:
1. **Multimodal Vision:** User image attachments in chat for analysis, translation, and reasoning (powered by Gemini Multimodal API).
2. **Document Analysis:** PDF, DOCX, XLSX, and scanned document image extraction.
3. **Conversational Intelligence:** 16-language routing, reasoning, coding, web research, and tool calling.
4. **Platform Completeness:** All 15 architecture dimensions verified in Phase 50.
