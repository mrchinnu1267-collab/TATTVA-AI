# TATTVA AI — Incident Response & Triage Guide

**Author & Incident Commander:** kotapati Gowtham Chowdary  
**Version:** 2.1.0  

---

## 1. Incident Severity Matrix

| Severity Level | Definition | Response SLA | Action Protocol |
| :--- | :--- | :---: | :--- |
| **P1 — Critical** | Service outage, security vulnerability, data loss, or RLS bypass | $< 15\text{ minutes}$ | Activate automated rollback via `deployment-guard.ts`; trip circuit breakers to offline vault; notify lead architect. |
| **P2 — High** | Elevated latency ($> 2000\text{ms}$), degraded model provider, or tool failure | $< 1\text{ hour}$ | Re-route traffic via `ModelRouter` to secondary fallback providers; throttle background indexing. |
| **P3 — Moderate** | Partial UI glitch, isolated formatting error, or minor telemetry gap | $< 24\text{ hours}$ | Log ticket in `IssueTracker`; author fix and verify with regression tests. |

---

## 2. Emergency Rollback Execution Procedure

If a critical P1 defect is detected in production:
1. **Trigger Automated Rollback:**
   ```bash
   # From frontend/ workspace:
   npx tsx scripts/rollback.ts --to-version=v2.0.0 --reason="P1 Incident"
   ```
2. **Activate Circuit Breaker:**
   Trip the relevant AI provider state in `app/lib/platform/circuit-breaker.ts` from `CLOSED` to `OPEN` to force graceful fallback to local models.
3. **Notify Stakeholders:**
   Dispatch emergency webhook payload to designated Slack/Discord incident channels.
