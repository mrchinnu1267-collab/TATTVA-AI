# TATTVA AI — Beta Bug & Feedback Triage Process (Phase 29)

**Lead Release Engineer & Maintainer:** kotapati Gowtham Chowdary  
**Status:** Operational  

---

## 1. Feedback Ingestion Pipeline

All tester reports submitted via `/beta` or `/api/beta` follow an automated, privacy-conscious triage workflow:

```text
[ Tester Submission ]
        │
        ├── PII Scrubber Sanitizes Emails/Phones
        ├── Strips Private Conversation Transcripts
        └── Assigns Unique BETA-XXXX Identifier
        │
        ▼
   [ Status: "New" ]
        │
        ▼
[ Engineering Review ] ── (Duplicate / Non-Bug) ──► [ Status: "Closed" ]
        │
        ▼ (Valid Issue)
[ Status: "Under Review" ] ──► [ Status: "Confirmed" ]
        │
        ▼
[ Status: "In Progress" ] (Fix Developed & Tested)
        │
        ▼
[ Status: "Fixed" ] ──► [ Status: "Testing" (Automated Suite Verified) ]
        │
        ▼
[ Status: "Closed" (Production Deployed) ]
```

---

## 2. Bug Severity Definitions

| Severity | Criteria | SLA Target |
| :--- | :--- | :---: |
| **Critical** | Security breach, data loss risk, complete crash of core chat or document engine | $< 12\text{ hours}$ |
| **High** | Feature broken without workaround (e.g. PPTX download fails, RAG retrieval timeout) | $< 48\text{ hours}$ |
| **Medium** | Partial failure with workaround, model latency degradation, minor formatting error | $< 5\text{ days}$ |
| **Low** | Cosmetic alignment shift, copy improvement, non-blocking feature suggestion | Scheduled sprint |

---

## 3. Seven-Stage Bug Status Definitions

1. **New**: Report received and validated by ingest schema.
2. **Under Review**: Assigned to an engineer for reproduction.
3. **Confirmed**: Successfully reproduced with verified root cause.
4. **In Progress**: Active code patch being authored.
5. **Fixed**: Code patch committed to development branch.
6. **Testing**: Automated test suite passing; verified in staging environment.
7. **Closed**: Deployed to production release candidate.

---

## 4. Privacy & Data Handling Rules
- Feedback reports must **never** contain raw conversation logs or unredacted user documents.
- Testers may request total deletion of all their submitted feedback records under GDPR Right-To-Be-Forgotten by contacting administration or calling `DELETE /api/feedback?purge=true`.
