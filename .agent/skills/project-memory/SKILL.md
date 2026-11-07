---
name: project-memory
description: >-
  Maintains and updates PROJECT_STATE.md with current architectural state, tech stack,
  completed milestones, active development status, and upcoming tasks without leaking secrets.
  Use when initializing a session, recording technical decisions, tracking feature completions,
  or preparing a handoff between development turns.
---

# Project Memory Manager

The Project Memory Manager skill ensures continuous, high-fidelity context preservation across TATTVA AI development turns by maintaining a living `PROJECT_STATE.md`.

## Memory Management Rules

1. **Location & Structure**:
   - Primary state document: `PROJECT_STATE.md` at workspace root.
   - Maintain the standard sections:
     - **Architecture & Ecosystem**: Monorepo layout and platform mapping.
     - **Active Tech Stack**: Confirmed frameworks, runtimes, and packages.
     - **Completed Milestones**: Verified production features and audit completions.
     - **Current Status**: Live deployment URL, test status, and active branch.
     - **Known Issues & Backlog**: Resolved vs. pending technical items.
     - **Next Tasks**: Prioritized actionable next steps.

2. **Zero Secret Exposure Policy**:
   - **NEVER** write API keys, Supabase service roles, database passwords, JWT tokens, user emails, or `.env` contents to `PROJECT_STATE.md`.
   - Document only environment variable names (e.g., `NEXT_PUBLIC_SUPABASE_URL`, `GEMINI_API_KEY`) and their purpose.

3. **Incremental Synchronization**:
   - Update `PROJECT_STATE.md` after:
     - Introducing new API routes or data models.
     - Successfully completing an audit, refactor, or security hardening.
     - Adding or updating external integrations.
   - Keep entries concise and factual; prune outdated tasks rather than letting the file bloat.

## Quick Update Workflow
When a task finishes, run:
```markdown
### [YYYY-MM-DD] Feature Name
- What changed: Summary of modified files and endpoints.
- Tests passed: Unit/integration test results.
- Next action: Immediate next priority.
```

