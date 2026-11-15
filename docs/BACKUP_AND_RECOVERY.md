# TATTVA AI — Backup & Disaster Recovery Guide

**Lead Architect:** kotapati Gowtham Chowdary  
**Target RPO (Recovery Point Objective):** $\le 1\text{ hour}$  
**Target RTO (Recovery Time Objective):** $\le 15\text{ minutes}$  

---

## 1. Database Backup Architecture

TATTVA AI utilizes a dual-tier resilience strategy:

1. **Supabase Managed Point-in-Time Recovery (PITR):**
   - Continuous Write-Ahead Logging (WAL) with daily physical base backups.
   - Restorable to any second within the past 7 days via Supabase Dashboard.
2. **Encrypted Local Vault (`.tattva-vault/`):**
   - High-priority evaluation runs, baseline benchmarks, and user configurations are encrypted using AES-256-GCM and mirrored to `.tattva-vault/`.
   - Immune to transient cloud database network disconnections.

---

## 2. Disaster Recovery Playbook

### Step 1: Database Restoration
- In case of catastrophic data corruption, initiate Supabase PITR to the last known healthy timestamp ($T - 5\text{min}$).
- Re-apply `supabase_evaluation_schema.sql` to verify table constraints and RLS policies.

### Step 2: Storage Asset Synchronization
- Verify Supabase Storage bucket `tattva-secure-vault` permissions.
- In offline mode, activate local file reader fallback in `reader.ts`.
