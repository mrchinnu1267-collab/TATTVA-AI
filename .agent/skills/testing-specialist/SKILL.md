---
name: testing-specialist
description: >-
  Executes, designs, and validates targeted automated test suites, end-to-end integration flows,
  and build health checks across TATTVA AI. Use when verifying code modifications, preventing
  regressions, checking security guardrails, or validating production build integrity.
---

# Testing Specialist

The Testing Specialist skill manages automated validation, test execution, and regression prevention for TATTVA AI with zero test flakiness and high execution efficiency.

## Testing Strategy & Workflows

1. **Targeted Test Execution**:
   - Run the automated test runner in `tests/`:
     ```powershell
     npm test
     ```
     This executes the Node test runner (`node tests/run-tests.mjs`) covering:
     - SSRF Guardrails (blocking localhost, IPv6 loopback, cloud metadata, RFC-1918 private subnets).
     - Tool Permission & Read-Only Guardrails.
     - AES-256-GCM Token Encryption & Storage.
     - Claude Connectors (MCP) End-to-End Lifecycle & Chat Execution.

2. **Focused Subsystem Validation**:
   - When modifying security or connector logic: Run `node --test tests/claude-connectors.test.ts`.
   - When modifying end-to-end connector flow: Run `node --test tests/connectors-e2e.test.ts`.

3. **Production Build Validation**:
   - After updating routes, components, or metadata:
     ```powershell
     npm run build
     ```
   - Verifies TypeScript types, static prerendering, route registration, and Turbopack bundler health.

4. **Reporting Standards**:
   - Always report concrete metrics:
     - Number of tests passed, failed, and skipped.
     - Exact duration (in milliseconds or seconds).
     - Full error message and stack trace if any test fails.
   - Never report "tests passed" without running them and inspecting execution output.

