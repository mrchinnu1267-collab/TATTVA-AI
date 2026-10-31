# TATTVA AI - Emergency Security Response & Incident Handling Playbook
**Zero Trust Architecture & Incident Management Protocol**  
*Conceptualized & Engineered by kotapati Gowtham Chowdary*

---

## 1. Overview & Response Philosophy

This playbook governs emergency security responses for **TATTVA AI**. The core operating model adheres to **Zero Trust**:
- **Never Trust, Always Verify**: Treat all networks, client requests, and third-party webhooks as untrusted.
- **Least Privilege Access**: Minimum permissions required for operation.
- **Assume Breach**: Maintain automated controls, rapid revocation mechanisms, and auditable logging to immediately isolate compromised vectors.

---

## 2. Incident Classification & Severity Levels

| Severity | Definition | Examples | Response SLA |
| :--- | :--- | :--- | :--- |
| **P0 - Critical** | Active data exfiltration, root/admin credential compromise, persistent RLS bypass. | Compromised Supabase service role key, unrestricted cross-user file download exploit. | **Immediate (< 15 mins)** |
| **P1 - High** | Single-user credential breach, compromised AI provider API key, malicious file upload bypass. | Leaked `GEMINI_API_KEY`, prompt injection leading to internal prompt disclosure. | **< 1 hour** |
| **P2 - Medium** | Elevated failed login spikes, suspicious rate-limit anomalies, blocked executable uploads. | Brute force login attempt across multiple accounts, 429 flood on chat API. | **< 4 hours** |
| **P3 - Low** | Informational security events, benign scanning, non-sensitive config drifts. | Dependency security advisories without known exploit path. | **< 24 hours** |

---

## 3. Incident Response Procedures

### 3.1. Compromised API Keys (Gemini, OpenRouter, Supabase, HuggingFace)

#### Trigger:
- Automated scanner detects key in git commit, client bundle, or third-party leak feed.
- Suspicious quota surge on provider console.
- Log record showing unauthorized generation requests.

#### Action Protocol:
1. **Immediate Revocation**:
   - Access the provider dashboard immediately (Google AI Studio, Supabase Dashboard, OpenRouter, HuggingFace).
   - Generate a replacement key and revoke the compromised key without delay.
2. **Environment Variable Update**:
   - Update `.env.local` or production Secrets Manager (`APP_ENCRYPTION_KEY`, `GEMINI_API_KEY`, etc.):
     ```bash
     # Rotate secret in production environment
     vercel env add GEMINI_API_KEY production
     # or update cloud secret store
     ```
3. **Application Redeployment**:
   - Restart all server runtime instances to flush cached memory keys:
     ```bash
     # Trigger zero-downtime rolling restart
     npm run build && pm2 reload tattva-ai
     ```
4. **Impact Analysis**:
   - Query the `security_audit_logs` table for requests during the compromise window:
     ```sql
     SELECT * FROM public.security_audit_logs
     WHERE event_type IN ('AUTH_SUCCESS', 'PROMPT_INJECTION_BLOCKED')
       AND created_at >= NOW() - INTERVAL '24 hours'
     ORDER BY created_at DESC;
     ```

---

### 3.2. Unauthorized Account Access & Session Hijacking

#### Trigger:
- User reports unfamiliar chat history or file uploads.
- Multiple logins from disparate geographic IPs within minutes.
- Suspicious JWT replay tokens.

#### Action Protocol:
1. **Instant Session Revocation**:
   - Terminate all active sessions for the compromised user via Supabase Admin SDK:
     ```typescript
     // Revoke all refresh tokens for specific user
     await supabase.auth.admin.signOut(targetUserId, 'global');
     ```
2. **Forced Password Reset**:
   - Send password reset email with invalidation of prior authentication tokens:
     ```typescript
     await supabase.auth.resetPasswordForEmail(targetUserEmail, {
       redirectTo: 'https://tattva.ai/reset-password',
     });
     ```
3. **Audit User Activity**:
   - Verify if any files, memories, or messages were accessed or exported:
     ```sql
     SELECT id, filename, created_at FROM public.user_files
     WHERE user_id = 'compromised-user-uuid' AND created_at >= NOW() - INTERVAL '48 hours';
     ```

---

### 3.3. Suspicious Downloads & Data Exfiltration Attempts

#### Trigger:
- Spike in `/api/files` requests from a single IP or user.
- Repeated 404 or 403 errors when requesting arbitrary `fileId` parameters (IDOR probing).
- `UNAUTHORIZED_DATA_ACCESS` alerts triggered in `security_audit_logs`.

#### Action Protocol:
1. **Dynamic IP & Session Quarantining**:
   - Block malicious IP address at edge middleware or firewall (Cloudflare/Vercel/NGINX):
     ```bash
     # Add IP to edge blocklist
     iptables -A INPUT -s <OFFENDING_IP> -j DROP
     ```
2. **Invalidate Short-Lived Signed URLs**:
   - TATTVA AI signed storage URLs expire automatically in 300 seconds (5 minutes).
   - In catastrophic scenarios, cycle the Supabase Storage signing secret to immediately invalidate all circulating signed URLs.
3. **Inspect Storage Objects**:
   - Validate that files remain isolated inside `{userId}/` buckets according to RLS policies.

---

### 3.4. Data Leakage Incidents

#### Trigger:
- User input containing PII or proprietary code appears in unintended context.
- Cross-user memory recall detected in conversation metadata.

#### Action Protocol:
1. **Inspect AI Guardrails**:
   - Confirm `redactSensitiveInfo()` and `guardAIOutput()` in `frontend/app/lib/security.ts` are active.
2. **Quarantine Memory Embeddings**:
   - Disable active flag on contaminated memory vectors:
     ```sql
     UPDATE public.user_memories
     SET active = FALSE
     WHERE user_email = 'affected-user@example.com' AND created_at >= NOW() - INTERVAL '12 hours';
     ```
3. **Customer Notification & Forensic Logging**:
   - Document incident timeline, affected records, remediation actions, and provide customer transparency within regulatory guidelines.

---

### 3.5. Session Revocation & Credential Rotation Drill

#### Routine Security Drill (Executed Monthly):
1. **Rotate Application Master Encryption Key**:
   - Generate fresh 256-bit key:
     ```bash
     openssl rand -hex 32
     ```
   - Store in `APP_ENCRYPTION_KEY` secrets manager.
2. **Rotate Supabase JWT Secret & Service Role Key**:
   - Update in Supabase Dashboard -> Settings -> API -> JWT Secret.
   - All legacy active tokens are instantaneously invalidated.
3. **Verify Zero Frontend Bundle Key Leaks**:
   - Run automated bundle scanner:
     ```bash
     node tests/security-audit.test.mjs
     ```

---

## 4. Security Incident Investigation Checklist

- [ ] Identify source IP address, user agent, and timestamp of anomaly.
- [ ] Inspect `frontend/app/lib/security.ts` audit memory buffer and database `public.security_audit_logs`.
- [ ] Determine scope of data exposed (files, memories, chat prompts, user profiles).
- [ ] Isolate compromised tenant or user account immediately.
- [ ] Revoke relevant access tokens, sessions, and signed URLs.
- [ ] Patch root vulnerability (e.g. prompt delimiter bypass, missing RLS filter).
- [ ] Run regression suite (`npm run test:security` / `node tests/security-audit.test.mjs`).
- [ ] Document post-mortem and update security rules.

---
*Maintained by TATTVA AI Security Engineering Team | Created by kotapati Gowtham Chowdary*
