# TATTVA AI — Security & Zero-Trust Architecture

> **Security Standard:** `Zero-Trust Defense-in-Depth`  
> **Classification:** High Assurance / Enterprise Ready  
> **Lead Architect & Maintainer:** kotapati Gowtham Chowdary  
> **Compliance Target:** SOC 2 Type II / GDPR / OWASP Top 10 LLM  

---

## 1. Zero-Trust Security Architecture

TATTVA AI enforces a strict zero-trust operational model: **never trust, always verify**. Every request originating from web, mobile (Android WebView), desktop, or API is authenticated, authorized, and validated before entering downstream orchestration.

```
                           ┌──────────────────────────────────────────────┐
                           │          External Ingress / Client           │
                           └──────────────────────┬───────────────────────┘
                                                  │
                                                  ▼
                           ┌──────────────────────────────────────────────┐
                           │        Edge Layer & Security Headers         │
                           │  - CSP, Strict-Transport-Security, XSS-Guard │
                           │  - Rate Limiter (IP & User-Token Buckets)    │
                           └──────────────────────┬───────────────────────┘
                                                  │
                                                  ▼
                           ┌──────────────────────────────────────────────┐
                           │    Authentication & Session Validation       │
                           │  - Supabase JWT Verification (RS256)         │
                           │  - Device Origin & Mobile Token Validation   │
                           └──────────────────────┬───────────────────────┘
                                                  │
                                                  ▼
                           ┌──────────────────────────────────────────────┐
                           │       Input Sanitization & Injection Defense │
                           │  - Multimodal MIME Verification              │
                           │  - Prompt Injection & Jailbreak Heuristics   │
                           │  - SSRF Guardrails for Outbound Web Fetch    │
                           └──────────────────────┬───────────────────────┘
                                                  │
                                                  ▼
                           ┌──────────────────────────────────────────────┐
                           │        Isolated Execution Sandbox            │
                           │  - Hardened Docker Container (No Network)    │
                           │  - Strict 5-Second Timeout / 512MB RAM Limit │
                           └──────────────────────────────────────────────┘
```

---

## 2. API Key Vault & Secret Management

1. **Server-Side Isolation:**
   - All provider API keys (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are stored in secure environment vaults (`.env.local` or Vercel Encrypted Secrets).
   - **Zero Client Exposure:** No sensitive credential may ever be prefixed with `NEXT_PUBLIC_`. Automated CI scripts scan diffs for regex patterns matching API key signatures.
2. **Key Rotation & Telemetry:**
   - Provider adapters detect HTTP 401/403 status codes and immediately flag credentials for rotation without terminating user sessions.
   - Credentials are never logged in exception payloads, Sentry traces, or console output.

---

## 3. Database Isolation & Row-Level Security (RLS)

All persistent data (chat histories, uploaded attachments, generated documents, and vector embeddings) resides in Supabase PostgreSQL protected by Row-Level Security:

```sql
-- Security Policy: Chat Session Isolation
CREATE POLICY "Users can only read their own chats"
ON public.chats
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own chats"
ON public.chats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Security Policy: Knowledge Base Vector Embeddings
CREATE POLICY "Strict Tenant Vector Isolation"
ON public.document_embeddings
FOR ALL
USING (auth.uid() = owner_id);
```

### Multitenant Isolation Guarantees:
* User A cannot query, retrieve, or infer the vector embeddings or private documents of User B.
* Service role keys are restricted strictly to secure backend migration tasks and never exposed to client-side API calls.

---

## 4. Sandboxed Code Execution Guardrails

When TATTVA AI executes Python code, data science transformations, or unit tests for tool verification (RLVR/Agent tasks):

> [!CAUTION]
> **Production Server Protection:** Model-generated code is **never** executed directly on the host operating system or production web server.

### Sandbox Security Policy:
1. **Container Isolation:** Executed within isolated Docker containers or ephemeral gVisor sandboxes.
2. **Network Egress Block:** Container networking is disabled (`--network none`) to prevent outbound data exfiltration, port scanning, or malicious command-and-control communication.
3. **Resource Quotas:**
   - CPU quota: Maximum 1 core (`--cpus=1.0`).
   - Memory ceiling: 512 MiB maximum (`--memory=512m`).
   - Execution timeout: Hard kill at 5,000 milliseconds.
   - Filesystem: Read-only root filesystem with ephemeral `/tmp` mounted in memory (`tmpfs`).

---

## 5. Input Sanitization & File Upload Security

1. **MIME Type & Magic Byte Validation:** File uploads (PDF, DOCX, XLSX, PNG, JPEG) are validated against binary magic bytes, rejecting masqueraded executables (`.exe`, `.bat`, `.ps1`, `.sh`).
2. **Document Parsing Guardrails:** XML entity expansion attacks (Billion Laughs / XXE) are neutralized by disabling external DTD resolution in all Office OpenXML parsers.
3. **SSRF Guardrails:** When the agent retrieves external URLs or performs web search grounding, outbound requests block RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) and cloud metadata endpoints (`169.254.169.254`).
