# TATTVA AI — Production Deployment Guide

**Lead DevOps Engineer & Release Manager:** kotapati Gowtham Chowdary  
**Target Environment:** Vercel (Edge Runtime) + Supabase (PostgreSQL)  
**Production Domain:** `https://tattva-ai-phi.vercel.app`  

---

## 1. Prerequisites
- Node.js v20+ or v22 LTS
- Git
- Access to Supabase Project & Vercel Dashboard

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env.local`:
```bash
# Core Foundation Model Credentials
GEMINI_API_KEY="AIzaSy..."

# Supabase Managed Database & Auth
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# Security Encryption Master Key (AES-256-GCM)
APP_ENCRYPTION_KEY="your-32-byte-hex-secret"

# Canonical Production Domain
NEXT_PUBLIC_SITE_URL="https://tattva-ai-phi.vercel.app"
```

---

## 3. Database Schema Migration

Apply the canonical migration script to your Supabase PostgreSQL instance:
```sql
-- Run in Supabase SQL Editor:
-- File: supabase_evaluation_schema.sql
```
This enables Row-Level Security (RLS) across all tables and establishes `auth.uid()` evaluation policies.

---

## 4. Building and Deploying to Production

1. **Verify TypeScript Compilation:**
   ```bash
   cd frontend
   npx tsc --noEmit
   ```
2. **Execute Full Automated Test Suites:**
   ```bash
   npx tsx tests/phase-30-31-32-production-completion.test.ts
   npx tsx tests/release-candidate-user-journeys.test.ts
   ```
3. **Execute Production Turbopack Build:**
   ```bash
   npm run build
   ```
4. **Deploy to Vercel Production:**
   ```bash
   vercel --prod
   ```
