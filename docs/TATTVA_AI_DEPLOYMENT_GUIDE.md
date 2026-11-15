# TATTVA AI – PRODUCTION DEPLOYMENT & INFRASTRUCTURE GUIDE
## Production Configuration, Vercel Setup, Supabase Initialization & Android Build Runbook

**Document Version:** 3.0.0  
**Lead DevOps Architect:** kotapati Gowtham Chowdary  
**Target Repository:** `C:\Users\mrchi\TATTVA_AI\TATTVA_AI`  

---

## 1. PREREQUISITES & ENVIRONMENT CONFIGURATION

### 1.1. Required Runtime Environments
- **Node.js**: v20.10.0+ LTS
- **npm / pnpm**: npm v10+ or pnpm v9+
- **Database**: Supabase PostgreSQL with `pgvector` extension enabled
- **Hosting**: Vercel Serverless (Next.js 15 App Router) or Node.js Docker Container

### 1.2. Production Environment Variables (`.env.local`)
```ini
# Core AI Provider Credentials
GEMINI_API_KEY=AIzaSy...
OPENROUTER_API_KEY=sk-or-v1-...
ANTHROPIC_API_KEY=sk-ant-api03-...

# Supabase Production Database & Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Application URLs
NEXT_PUBLIC_APP_URL=https://tattva-ai.vercel.app
NEXT_PUBLIC_ENVIRONMENT=production
```

---

## 2. STEP-BY-STEP DEPLOYMENT RUNBOOK

### 2.1. Local Build & Test Verification
Before triggering deployment, run local verification:
```bash
cd frontend
npm install
npx tsc --noEmit
npm test
npm run build
```

### 2.2. Vercel Deployment
Deploy to Vercel via CLI or GitHub Continuous Integration:
```bash
vercel --prod
```

### 2.3. Supabase Schema Migration
Apply database migrations in the Supabase SQL editor:
```sql
-- Enable Vector Search Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure Row Level Security is active
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_turns ENABLE ROW LEVEL SECURITY;
```

### 2.4. Android PWA / TWA Build
For Android deployment using Bubblewrap or Capacitor:
```bash
npx @bubblewrap/cli build
```
Verify the Android asset links configuration:
`https://tattva-ai.vercel.app/.well-known/assetlinks.json`

---

*Certified and Approved by kotapati Gowtham Chowdary, Lead Architect & DevOps Engineer, TATTVA AI.*
