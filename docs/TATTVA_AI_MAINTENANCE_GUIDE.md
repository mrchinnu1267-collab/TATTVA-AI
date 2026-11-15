# TATTVA AI – SYSTEM MAINTENANCE & OPERATIONS GUIDE
## Ongoing Health Auditing, Provider Management, Backup Restoration & Rollback Runbook

**Document Version:** 3.0.0  
**Lead Platform Reliability Engineer:** kotapati Gowtham Chowdary  
**Target Repository:** `C:\Users\mrchi\TATTVA_AI\TATTVA_AI`  

---

## 1. ROUTINE MAINTENANCE TASKS

### 1.1. Weekly Test Suite Health Check
Run the automated master test runner across all 24 suites:
```bash
cd frontend
npm test
```
Verify:
- 0 failed test suites
- 0 TypeScript compiler errors (`npx tsc --noEmit`)

### 1.2. AI Provider Quota & Credit Monitoring
Check API key balances weekly:
- **Google AI Studio**: Monitor rate limits on Gemini 3.5 Flash Lite.
- **OpenRouter**: Ensure balance is maintained for DeepSeek V3 reasoning.
- **Anthropic**: Verify credit balance to prevent circuit breaker trips.

---

## 2. INCIDENT RESPONSE PLAYBOOKS

### 2.1. P1: Primary AI Provider Outage
- **Symptom**: Model router records consecutive 500/503 errors or credit exhaustion.
- **Remediation**:
  1. The automated circuit breaker trips and initiates a 60-second bypass cooldown.
  2. The router automatically falls back to secondary configured models (Gemini $\to$ DeepSeek $\to$ Claude).
  3. Escalation notification sent to Lead AI Architect (kotapati Gowtham Chowdary).

### 2.2. P2: Corrupted Migration or Storage Glitch
- **Remediation**:
  1. Revert to previous schema via downward migration `down.sql`.
  2. Restore point-in-time snapshot from Supabase backup console.
  3. Clear tenant cache in `enterpriseOperationsHub`.

---

*Certified and Approved by kotapati Gowtham Chowdary, Lead Architect & Platform Specialist, TATTVA AI.*
