---
name: security-auditor
description: >-
  Audits and hardens application security across Content Security Policy (CSP), SSRF guardrails,
  cryptographic key vaults, Supabase RLS, file upload validators, and zero-trust credentials.
  Use when reviewing security headers, auditing API endpoints, testing file uploads, verifying token
  encryption, or inspecting third-party connector boundaries.
---

# Security Auditor

The Security Auditor skill enforces Zero-Trust security and compliance across the entire TATTVA AI platform. Security posture must never be downgraded or bypassed to save tokens or simplify code.

## Critical Audit Checkpoints

1. **Secret & Key Protection**:
   - Zero hardcoded keys: Scan for leaked `sk-`, `AIzaSy`, Supabase service role keys, or database connection strings.
   - User-provided BYOK keys must be encrypted at rest using AES-256-GCM (`app/lib/security.ts`) and never logged in plain text.
   - Check `.env.example` to ensure no live credentials are committed.

2. **Content Security Policy (CSP) & Headers**:
   - Implemented in `middleware.ts` with per-request cryptographic nonces and `strict-dynamic`.
   - Never reintroduce `unsafe-inline` or `unsafe-eval` in production `script-src`.
   - Verify HSTS, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
   - Ensure the deprecated `X-XSS-Protection` header is not present.

3. **SSRF Guardrails for External Connectors**:
   - All outgoing requests to user-configured or Claude MCP Connectors must pass through `app/lib/mcp/ssrf-guard.ts`.
   - Must block: loopback (`127.0.0.1`, `localhost`), IPv6 loopback (`::1`), link-local metadata endpoints (`169.254.169.254`, `metadata.google.internal`), and private RFC-1918 subnets (`10.x`, `172.16-31.x`, `192.168.x`).
   - Only allow valid public HTTPS schemes.

4. **File Upload Security**:
   - In `app/api/files/`: Validate MIME types against an explicit whitelist (PDF, PNG, JPEG, WEBP, TXT).
   - Enforce strict file size limits (default 10MB per file).
   - Sanitize file names to prevent path traversal (`../`) attacks.

5. **Database Row-Level Security (RLS)**:
   - Verify every table in `supabase_security_rls_schema.sql` has `ENABLE ROW LEVEL SECURITY`.
   - Verify policies strictly validate `auth.uid() = user_id`.
   - Ensure anonymous (`anon`) role cannot read or mutate private user records.

