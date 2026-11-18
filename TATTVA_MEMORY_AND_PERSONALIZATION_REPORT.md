# TATTVA AI — Memory & Personalization Architecture Report
**Document ID**: `TATTVA_MEMORY_AND_PERSONALIZATION_REPORT.md`  
**Version**: 2.5.0-memory-isolation  
**Lead Architect**: kotapati Gowtham Chowdary  
**Target Services**: `app/lib/memory-service.ts`, `app/api/memory/route.ts`, `app/lib/memory-types.ts`  
**Date**: November 2026  
**Status**: Certified with Zero-Trust Compliance  

---

## 1. Executive Summary

TATTVA AI implements a permission-aware, user-isolated, and correctable conversational memory system. It balances immediate conversational responsiveness with persistent, user-approved personalization while strictly upholding privacy standards (GDPR, SOC2).

---

## 2. Cryptographic Tenant Boundary Isolation

Conversational memories and personal preferences are isolated via deterministic SHA-256 tenant hashing:

$$\text{tenant\_hash} = \text{SHA-256}(\text{normalize}(\text{user\_email}))$$

1. **Storage Partitioning**: Every tenant's records reside in a dedicated cryptographic directory `BASE_DATA_DIR/<tenant_hash>/`.
2. **Session Verification**: Requests to `/api/memory` are authorized strictly via verified AES-256-GCM session tokens; client-supplied user parameters cannot override identity.
3. **Cross-Tenant Attack Proof**: Even if User B queries User A's email, the server-side session resolver binds exclusively to User B's verified email hash.

---

## 3. Supported Personalization Dimensions

Users can inspect, configure, and reset the following preference vectors:

| Dimension | Options | Description |
|---|---|---|
| **Response Length** | `concise`, `balanced`, `detailed` | Dictates token density and brevity. |
| **Technical Depth** | `accessible`, `technical`, `expert` | Balances layman analogies vs kernel-level implementation detail. |
| **Preferred Language** | `en`, `te`, `te-en`, `hi`, `hi-en` | Default output language and register. |
| **Formality** | `casual`, `balanced`, `professional` | Conversational register and greeting style. |
| **Code Examples** | `boolean` | Automatically includes runnable code snippets. |
| **Step-by-Step** | `boolean` | Structures complex answers as numbered walkthroughs. |

---

## 4. User Control & Data Sovereignty APIs (`/api/memory`)

- **View Memories**: `GET /api/memory` returns active categorized memories and current personalization settings.
- **Export Data**: `GET /api/memory?export=json` or `export=markdown` downloads an archive of all user data.
- **Update Preference**: `PUT /api/memory` modifies individual preferences or memory records.
- **Delete Memory**: `DELETE /api/memory?id=<memory_id>` permanently purges a specific memory item.
- **Purge All**: `DELETE /api/memory?clearAll=true` deletes all persistent memory artifacts for the caller's tenant.

---

## 5. Security Redaction Guardrail

Before any memory or personalization token is saved or queried, `redactSensitiveInfo()` scrubs API keys, JWTs, passwords, and connection strings, ensuring that sensitive credentials are never stored in memory vaults.
