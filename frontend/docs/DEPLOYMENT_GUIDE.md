# TATTVA AI – DEPLOYMENT & RELEASE MANAGEMENT GUIDE

**Author**: kotapati Gowtham Chowdary  
**Target Environments**: Vercel (Web / Edge), Supabase (PostgreSQL), Cloudflare, Android Native, Desktop Electron  
**Revision**: 2.1.0

---

## 1. Environment Topology

TATTVA AI operates across three isolated deployment tiers:
- **Local Development**: `http://localhost:3000` with local `.tattva-vault/` filesystem fallback.
- **Staging Preview**: `https://staging.tattva.ai` with canary feature flags and experimental Indic SLM routes.
- **Production Stable**: `https://tattva-ai-phi.vercel.app` backed by Supabase PostgreSQL, edge caching, and hardened RLS.

---

## 2. Pre-Deployment Deployment Runbook

```bash
# 1. Typecheck the entire monorepo frontend
cd frontend
npx tsc --noEmit

# 2. Execute automated regression and readiness suites
npx tsx tests/phase-22-production-readiness-audit.test.ts
npx tsx tests/phase-23-controlled-beta-launch.test.ts

# 3. Verify health checks locally
curl http://localhost:3000/api/health
```

---

## 3. Database Migration Deployment Procedure

1. Open Supabase Dashboard for the target environment.
2. Navigate to SQL Editor.
3. Review and apply migration scripts:
   - `supabase_evaluation_schema.sql` (Creates evaluation tables, indexes, and constraints)
   - `supabase_workspace_rls.sql` (Enables Row-Level Security for multi-tenant isolation)
4. Verify table permissions:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```

---

## 4. Rollback Runbook

If a critical fault or high error rate occurs post-release:
1. **Instant Vercel Instant Rollback**:
   Navigate to Vercel Project > Deployments > Select previous verified deployment (`2.0.0-stable`) > Click "Promote to Production".
2. **Feature Kill Switch**:
   Disable specific degraded features dynamically via `FeatureFlagsEngine` without requiring a redeployment.
3. **Database State Rollback**:
   Revert schema migrations using the down-migration scripts recorded in `.tattva-vault/backups/`.
