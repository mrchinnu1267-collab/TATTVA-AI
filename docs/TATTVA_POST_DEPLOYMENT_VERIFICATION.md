# TATTVA AI — POST-DEPLOYMENT VERIFICATION RUNBOOK (PHASE 78)

**Target Production URL:** `https://tattva-ai-phi.vercel.app`  

---

## 1. Automated Health & Synthetic Smoke Checks

Once deployed to production, run the synthetic test suite against the live URL:

```powershell
# 1. Root & Health Endpoint Probe
curl.exe -I https://tattva-ai-phi.vercel.app
curl.exe -s https://tattva-ai-phi.vercel.app/api/health

# 2. AI Gateway Endpoint Probe
curl.exe -s https://tattva-ai-phi.vercel.app/api/gateway
```

Expected Responses:
- Root URL: `HTTP/2 200 OK`
- `/api/health`: `{"status":"ok", ...}`
- `/api/gateway`: `{"status":"HEALTHY","providers":[...]}`

---

## 2. Live Synthetic Verification Scenarios

1. **Authentication Flow**:
   - Navigate to `/login`.
   - Submit authenticated test session.
   - Verify JWT issuance and session cookie attachment.
2. **AI Task Execution**:
   - Send prompt to `/api/gateway`.
   - Verify live `gemini-3.5-flash-lite` inference.
3. **Storage Security Check**:
   - Verify public downloads are rejected for private images.
   - Verify RLS header adherence.
4. **Error Recovery**:
   - Submit malformed payload.
   - Confirm graceful 400 response with structured JSON error.

---

## 3. Rollback Procedure
If live metrics indicate regression:
1. Revert to previous Vercel deployment snapshot `3ce68a8`.
2. Inspect runtime function logs in Vercel Dashboard.
3. Notify security team if unauthorized access attempt is detected.
