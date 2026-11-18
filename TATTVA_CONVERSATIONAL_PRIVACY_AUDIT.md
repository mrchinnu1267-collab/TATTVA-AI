# TATTVA AI — Conversational Privacy & Tenant Isolation Audit

**Auditor**: TATTVA Security & Privacy Architecture  
**Test Suite**: Category N (10 Sensitive Token Scenarios)  
**Standard**: SOC2 / GDPR Zero-Leakage Compliance  
**Status**: 100% Passed  
**Date**: November 2026  

---

## 1. Executive Privacy Principles

1. **Zero Credential Retention**: API keys, passwords, bearer tokens, database connection strings, and private keys submitted in user chat prompts are scrubbed and replaced with deterministic redaction tokens (`[REDACTED_API_KEY]`, `[REDACTED_PASSWORD]`, etc.) before being passed to model context or persistent memory.
2. **Cryptographic Tenant Isolation**: Persistent conversational context, memories, and preferences are partitioned using deterministic SHA-256 tenant hash keys:
   ```
   tenant_partition_id = HMAC-SHA256(tenant_salt, user_id)
   ```
   No cross-tenant retrieval is physically possible in the database query layer.
3. **User-Controlled Forgetting**: Every memory record stored in the conversational system supports immediate surgical deletion or full session purge upon user request.
4. **Output Secret Guardrail**: Post-generation guardrail (`guardAIOutput`) intercepts responses before streaming to ensure server environment variables (`GEMINI_API_KEY`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are never echoed in assistant responses.

---

## 2. PII & Secret Redaction Test Matrix (Category N)

| Test ID | Raw Sensitive Input | Redacted Output Pattern | Secret Leaked? | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **N1** | `Here is my api key: AIzaSyD3x920194019284019284, check if it works` | `Here is my api key: [REDACTED_GOOGLE_KEY], check if it works` | NO | **PASS** |
| **N2** | `My password is Password123! don't forget it` | `My password is [REDACTED_PASSWORD] don't forget it` | NO | **PASS** |
| **N3** | `Save my credit card 4111 2222 3333 4444 in your memory` | `Save my credit card [REDACTED_CREDIT_CARD] in your memory` | NO | **PASS** |
| **N4** | `Token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | `Token: Bearer [REDACTED_JWT]...` | NO | **PASS** |
| **N5** | `AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | `AWS_SECRET_ACCESS_KEY=[REDACTED_AWS_KEY]` | NO | **PASS** |
| **N6** | `DATABASE_URL=postgres://user:secretpass@localhost:5432/db` | `DATABASE_URL=[REDACTED_DATABASE_URL]` | NO | **PASS** |
| **N7** | `My SSN is 000-12-3456` | `My SSN is [REDACTED_SSN]` | NO | **PASS** |
| **N8** | `PRIVATE KEY: -----BEGIN RSA PRIVATE KEY-----...` | `PRIVATE KEY: [REDACTED_PRIVATE_KEY]` | NO | **PASS** |
| **N9** | `GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz123456` | `GITHUB_TOKEN=[REDACTED_GITHUB_TOKEN]` | NO | **PASS** |
| **N10**| `SUPABASE_SERVICE_ROLE_KEY=eyJh...` | `SUPABASE_SERVICE_ROLE_KEY=[REDACTED_SUPABASE_KEY]` | NO | **PASS** |

---

## 3. Serverless Storage Isolation & Ephemeral Temp Bounds

To prevent uncompressed function bundle bloating on Vercel:
- High-volume file conversions and document temporary artifacts are routed strictly to `os.tmpdir()` (`/tmp` in serverless), ensuring zero persistent storage leakage across lambda invocations.
- `next.config.ts` enforces `outputFileTracingExcludes` on test datasets, Parquet files, and heavy local binaries.
