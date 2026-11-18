# TATTVA AI — MASTER SYSTEM AUDIT REPORT
## Camera & Image Understanding + Location Services + Plugin System
**Audit Date:** November 18, 2026  
**Audited Subsystems:** Camera Capture, Vision/Image Understanding, Geolocation Services, Plugin System  
**Status:** COMPLETED — Root Causes Identified & Fix Strategy Established

---

## 1. WORKSPACE & REPOSITORY INTEGRITY

- **Git Branch:** `main` (clean working tree, commits `77374fc` and `bfb5870` synchronized with `origin/main`).
- **Worktree Preservation:** `C:/Users/mrchi/TATTVA_AI/TATTVA_AI` registered and preserved.
- **Data Protection:** No user sessions, SQLite/Supabase credentials, or local vault data altered.

---

## 2. SUBSYSTEM 1: CAMERA ACCESS AUDIT

### Observed Problem
Clicking the Camera icon in the chat interface redirects the user to the operating system's standard file explorer picker ("Open File...") instead of activating the physical device webcam/camera.

### Root Cause Analysis
In `frontend/app/chat/page.tsx`:
- Line 5509:
  ```tsx
  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
  ```
- Lines 5571 & 5719:
  ```tsx
  cameraInputRef.current?.click();
  ```
On desktop operating systems (Windows, macOS, Linux) and many modern mobile browser WebViews, `<input type="file" capture="...">` is treated as a generic file selector. The browser does NOT invoke `navigator.mediaDevices.getUserMedia()`.
There was zero camera modal UI, zero live `<video>` preview stream, zero capture canvas, and zero stream cleanup on unmount.

### Remediation Plan
1. Create a modern, responsive `CameraCaptureModal` component in `frontend/app/components/camera/CameraCaptureModal.tsx`.
2. Use `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })` with fallback to `{ video: true }`.
3. Provide real-time live preview stream inside `<video autoPlay playsInline />`.
4. Implement Capture, Retake, Cancel, Switch Camera (front/back), and Send Photo controls.
5. Provide automatic fallback to `<input type="file" accept="image/*" capture="environment">` if `getUserMedia` is unsupported or blocked.
6. Ensure all media stream tracks are immediately stopped (`track.stop()`) on modal dismissal or unmount to avoid locking camera hardware.
7. Seamlessly feed captured JPEG data URLs directly into the chat attachments pipeline.

---

## 3. SUBSYSTEM 2: ADVANCED IMAGE UNDERSTANDING AUDIT

### Observed Problem
When users upload or capture an image and ask questions like *"What is this?"*, *"Solve this math problem"*, or *"Summarize this document"*, the image context was not reliably grounded, sometimes yielding generic text or ungrounded responses.

### Root Cause Analysis
1. In `frontend/app/lib/ai-orchestrator/index.ts` (lines 111-117), `userAttachedImage` was extracted but never added to prompt analysis or specialized visual reasoning guidance.
2. In `frontend/app/lib/ai-orchestrator/intent-classifier.ts` (lines 130-138), prompts with attached images and words like "edit/change" were routed to `image_editing` (which was previously tied to the retired image generation engine).
3. The dedicated `ImageUnderstandingEngine` (`frontend/app/lib/multimodal-engine/image-understanding.ts`) was isolated and not wired as a primary analysis path for user image queries.
4. In `frontend/app/lib/ai-orchestrator/model-router.ts`, image inline data (`{ inlineData: { mimeType, data: b64 } }`) was passed to Gemini, but lacked explicit instruction directives instructing the vision model to exhaustively analyze objects, text, math equations, charts, diagrams, and handwriting.

### Remediation Plan
1. Update `intent-classifier.ts` to classify all image analysis queries as `document_analysis` or `multimodal_vision` rather than retired image editing.
2. Inject comprehensive visual grounding instructions into `fullSystemInstruction`:
   - Identify visible objects, equipment, plants, animals, and products.
   - Transcribe printed and handwritten text with OCR fidelity.
   - Solve mathematical and educational questions step by step.
   - Explain diagrams, architecture maps, charts, and tables.
   - Acknowledge blurry or unreadable regions honestly without hallucination.
3. Verify `inlineData` formatting across `model-router.ts` and ensure base64 MIME types are strictly validated.

---

## 4. SUBSYSTEM 3: LOCATION SERVICES AUDIT

### Observed Problem
When the user types *"Locate my location"*, *"Where am I?"*, or *"What is my location?"*, TATTVA AI responds:
> *"I am not able to locate your device."*

### Root Cause Analysis
1. In `frontend/app/chat/page.tsx`:
   - `userLocationRef.current` was initialized to `null`.
   - The browser geolocation function `requestLocation()` was only triggered on `Ctrl+K` or inside Satellite Maps.
   - There was NO "Location" or "Share Location" button in the chat attachment menu.
2. In `frontend/app/api/chat/route.ts`:
   - Lines 112-158 only checked `body.location` if `isWeatherQuery(latestUserMsg.content)` was true.
   - There was ZERO handling for location questions ("where am I", "locate my location", "my current city", "coordinates").
   - When the user asked for their location, the server received `location: null` and the LLM had no location context, leading to the fallback *"I am not able to locate your device."*

### Remediation Plan
1. Add a **"Location"** quick-action button in the chat attachment menu (`app/chat/page.tsx`).
2. Add proactive natural-language detection in `app/chat/page.tsx`: when the user asks "where am I" or "locate my location", automatically prompt for location permission or request geolocation.
3. Retrieve coordinates via `navigator.geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })`.
4. Reverse-geocode coordinates via `/api/geocode?lat=...&lon=...` to extract City, District, State, Country, and Formatted Address.
5. In `frontend/app/api/chat/route.ts`, implement dedicated location grounding:
   - When location intent is detected and coordinates exist: inject verified location context with Google Maps / Satellite Map link.
   - When location intent is detected and coordinates are absent: provide friendly instructions explaining how to grant browser location permission or offer manual city search.

---

## 5. SUBSYSTEM 4: PLUGIN SYSTEM AUDIT

### Observed Problem
The plugin system did not execute tools or return live results in the conversation.

### Root Cause Analysis
1. `PluginSystem` (`frontend/app/lib/ecosystem/plugin-system.ts`) was completely decoupled from `aiOrchestrator` and `toolRegistry` (`frontend/app/lib/ai-orchestrator/tools/tool-registry.ts`).
2. In `frontend/app/api/chat/route.ts`, tool calls were only routed to `claudeConnectors` (which required Anthropic API keys), while the official plugins (GitHub Code Bridge, Slack Announcer, Google Drive, Notion, Discord) were completely unreachable.
3. In `frontend/app/chat/page.tsx`, clicking "Plugins" opened `BrowseConnectors` (MCP connectors), bypassing the actual plugin management API (`/api/plugins`).

### Remediation Plan
1. Bridge `PluginSystem` with `toolRegistry`:
   - Register official plugin tools (`github_get_repo`, `github_list_issues`, `slack_post_message`, `gdrive_list_files`, `notion_query_db`, `discord_send_alert`) in `toolRegistry`.
2. Connect `PluginSystem.executePluginTool()` inside `aiOrchestrator` execution controller.
3. Enhance `app/components/plugins/PluginManagerModal.tsx` or update plugin UI to list and toggle official plugins from `/api/plugins`.
4. Ground plugin execution results into the conversation with clear execution badges and audit trails.

---

## 6. AUDIT SUMMARY & NEXT STEPS
Phase 1 audit is complete. Execution will proceed through:
- **Phase 2:** Build and test `CameraCaptureModal.tsx` and wire into `app/chat/page.tsx`.
- **Phase 3:** Harden multimodal vision grounding in `aiOrchestrator` and `modelRouter`.
- **Phase 4:** Build location service, attachment menu button, and `/api/chat` location grounding.
- **Phase 5:** Wire `PluginSystem` tools into `toolRegistry` and `aiOrchestrator`.
- **Phase 6:** UI/UX polishing across all four features.
- **Phase 7:** End-to-end automated testing.
- **Phase 8 & 9:** Production build, verification, and final report.
