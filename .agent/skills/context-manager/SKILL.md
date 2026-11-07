---
name: context-manager
description: >-
  Synthesizes conversation history, manages session context, preserves critical architectural decisions,
  and produces compact handoff summaries to prevent redundant re-analysis across turns.
  Use when continuing work from a previous session, summarizing multi-turn workflows,
  or compacting active context before complex tasks.
---

# Context Manager

The Context Manager skill prevents token bloat and repetitive discovery by curating compact session context, caching verified architectural conclusions, and providing seamless turn handoffs.

## Context Preservation Protocols

1. **Leverage Existing Project State**:
   - Before executing discovery steps, read `PROJECT_STATE.md`.
   - Never re-analyze project framework versions, established database schemas, or already verified security configurations if they have not changed.

2. **Session Continuation & Compaction**:
   - When resuming work or starting a new phase, prepare a concise 4-part state:
     - **Goal**: What is being built or fixed right now.
     - **Current State**: Active branch, verified passing tests, and modified files.
     - **Blockers / In-Flight**: Immediate technical challenge being resolved.
     - **Next Action**: Single concrete step to execute next.
   - Recommend the `/compact` slash command to the user when the context window reaches high token capacity.

3. **Avoid Redundant Tool Calls**:
   - Cache results from previous reads within the conversation. Do not re-read files unless an edit has modified them.
   - Scope searches to specific directory trees rather than global repo roots.

4. **Structured Handoff Report**:
   - At the conclusion of a major milestone, append a concise log entry to `PROJECT_STATE.md` with:
     - Completed deliverable.
     - Verified test results.
     - Pending next actions for subsequent turns.

