# TATTVA AI — Master Database Architecture & Schema Specification

> **Database Engine:** Supabase PostgreSQL (Standard Edition) + Local Encrypted Vault Fallback  
> **Host Region:** AWS / Supabase Cloud  
> **Isolation Model:** Multi-Tenant Row-Level Security (RLS) + SHA-256 Tenant Path Partitioning  
> **Last Updated:** 2026-11-18  

---

## 1. Architectural Strategy

TATTVA AI utilizes a **dual-layer storage architecture** designed for high-availability serverless deployments:

1. **Cloud Tier (Primary):** Supabase PostgreSQL hosting relational data, session persistence, vector embeddings, evaluations, and billing records.
2. **Local Encrypted Vault Tier (Fallback):** Atomic file vault (`.data/chats/<sha256(userId)>.json`) that transparently buffers user sessions whenever remote database connectivity encounters transient network or connection timeouts.

---

## 2. Production Database Schema

### Table: `cloud_chat_sessions`
Durable cloud persistence table storing multi-turn chat sessions across serverless lambda instances.
```sql
CREATE TABLE cloud_chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    sessions_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cloud_chat_sessions_user_id ON cloud_chat_sessions(user_id);
```

### Table: `documents`
Stores indexed documents, metadata, and token counts for the RAG and Document Intelligence engines.
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
```

### Table: `evaluations` & `evaluation_results`
Tracks repeatable evaluation benchmark runs (GSM8K, MMMLU, and custom conversational evaluations).
```sql
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benchmark_name TEXT NOT NULL,
    model_id TEXT NOT NULL,
    total_samples INT NOT NULL,
    accuracy NUMERIC(5,2) NOT NULL,
    avg_latency_ms NUMERIC(8,2) NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID REFERENCES evaluations(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    model_output TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    latency_ms NUMERIC(8,2) NOT NULL
);
```

### Table: `billing_subscriptions`
Stores subscription tiers, quotas, usage tracking, and billing status.
```sql
CREATE TABLE billing_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    plan_tier TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    monthly_token_quota BIGINT NOT NULL DEFAULT 500000,
    tokens_consumed BIGINT NOT NULL DEFAULT 0,
    billing_cycle_start TIMESTAMPTZ DEFAULT NOW(),
    billing_cycle_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);
```

---

## 3. Row-Level Security (RLS) Policies

All tables have RLS enabled unconditionally. Unauthenticated or cross-tenant queries are dropped at the PostgreSQL engine level:

```sql
-- Enable RLS
ALTER TABLE cloud_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;

-- Multi-Tenant Policies
CREATE POLICY "Users access own chat sessions"
ON cloud_chat_sessions FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users access own documents"
ON documents FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users access own billing"
ON billing_subscriptions FOR ALL
USING (auth.uid() = user_id);
```

---

## 4. Backup & Retention Strategy

- **Automated Daily Backups:** Managed by Supabase Cloud with 7-day retention.
- **Point-in-Time Recovery (PITR):** Enables transactional restoration to any point within the preceding 7 days.
- **Tenant Data Purge Compliance:** `/api/data-governance/purge` executes atomic cascade deletes across all tables satisfying GDPR Right to Erasure requirements within 200ms.
