# TATTVA AI — Beta Release Notes (v2.1.0-beta.2)

**Release Date:** 2026-11-15  
**Release Tag:** `v2.1.0-beta.2`  
**Principal Architect & Engineering Lead:** kotapati Gowtham Chowdary  
**Test Coverage:** 100% Passed (445 / 445 automated test assertions across 17 suites)

---

## What's New in v2.1.0-beta.2

### 1. Dedicated Beta Testing Hub (`/beta`)
- Integrated dashboard titled **TATTVA AI BETA TESTING** featuring:
  - Real-time tester activation with cryptographic invitation codes (`TATTVA-BETA-2026`, `TATTVA-VIP-FOUNDER`).
  - Daily request quota enforcement and status tracking.
  - Interactive Bug & Feedback submission form targeting Web, Mobile, Android, and Desktop platforms.
  - Live triage board with transparent 7-status lifecycle tracking.

### 2. Comprehensive Bug & Feedback Management
- 7-stage resolution workflow: `New` -> `Under Review` -> `Confirmed` -> `In Progress` -> `Fixed` -> `Testing` -> `Closed`.
- Automatic prioritization of security and critical issues.
- Strict architectural privacy boundaries preventing raw user conversation data or files from being ingested into model training pipelines.

### 3. Beta Analytics & Privacy-Preserving Telemetry
- Aggregated real-time metrics tracking active testers, feature adoption, API latency, tool failure counts, and bug status distributions with zero personal data leakage.

### 4. Cross-Platform Parity
- **Desktop Electron App (`desktop-app/main.js`):** Synchronized to production cloud endpoint (`https://tattva-ai-phi.vercel.app`) with direct Evaluation Lab menu shortcuts.
- **Android Native App (`android-app/`):** Pointing to official cloud server with microphone permissions cleanly purged.

---

## Upgrade & Participation Instructions

1. Visit `https://tattva-ai-phi.vercel.app/beta`
2. Enter your invitation code and register.
3. Report any anomalies directly through the intake portal.
