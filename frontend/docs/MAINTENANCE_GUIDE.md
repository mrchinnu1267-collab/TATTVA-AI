# TATTVA AI — System Maintenance & Operations Runbook

**Lead Architect & Maintainer:** kotapati Gowtham Chowdary  
**Release Version:** `2.1.0`  

---

## 1. Routine Maintenance Schedule

| Maintenance Task | Frequency | Automated Tool / Script |
| :--- | :--- | :--- |
| **Test Suite Execution** | Pre-Commit / Pre-Deploy | `npx tsx tests/run-all-suites.ts` |
| **TypeScript Typecheck** | Pre-Commit / Pre-Deploy | `npx tsc --noEmit` |
| **Dependency Security Audit** | Weekly | `npm audit` |
| **Token Budget & Cost Review**| Weekly | `costTelemetryManager` / Webhook Alert |
| **Database Vacuums & Indexes** | Monthly | Supabase Autovacuum & Index Rebuilds |

---

## 2. Deploying Routine Patches

1. Author surgical patch in dedicated branch.
2. Author regression test in `frontend/tests/`.
3. Verify 100% pass rate across all suites without regressions.
4. Execute `npm run build` with Turbopack to verify production compilation.
5. Merge into `main` and deploy to production environment.
