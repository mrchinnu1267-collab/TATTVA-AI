# TATTVA AI - Claude Connectors (MCP) Integration

> **Created and Developed by kotapati Gowtham Chowdary.**

This application integrates **Claude Connectors** via Anthropic's Messages API and the **Model Context Protocol (MCP)**. This enables Claude models to dynamically connect to remote servers (SSE or HTTP), discover tools, query databases, read workspace repositories, and execute actions with enterprise-grade security guardrails.

---

## ⚡ Quick Start & Setup

### 1. Configure Environment Variables
Copy `.env.example` to `.env.local` and configure your credentials:

```bash
cp .env.example .env.local
```

Key environment variables:
```ini
# Anthropic API Key (Required for Claude Messages API & MCP Connectors)
ANTHROPIC_API_KEY="sk-ant-api03-..."

# Beta Header for MCP Client (Default: mcp-client-2025-11-20)
ANTHROPIC_MCP_BETA_HEADER="mcp-client-2025-11-20"

# Application Encryption Key for Encrypting MCP Tokens at Rest (AES-256-GCM)
# Generate a secure 32-byte key: openssl rand -hex 32
APP_ENCRYPTION_KEY="your-secure-32-byte-hex-encryption-key"
```

### 2. Install & Run
```bash
# Install dependencies
npm install

# Run the test suite (16 tests: SSRF guard, tool allow/deny, encryption, E2E)
npm test

# Build for production
npm run build

# Start local server
npm run dev
```

---

## 🛡️ Security Architecture & Privacy

1. **SSRF Guard (`app/lib/mcp/ssrf-guard.ts`)**:
   - Strictly enforces public `https://` URLs.
   - Blocks private RFC-1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
   - Blocks local loopbacks (`127.0.0.1`, `localhost`, `[::1]`).
   - Blocks cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`).

2. **AES-256-GCM Token Encryption at Rest (`app/lib/mcp/storage.ts`)**:
   - Sensitive authorization tokens are encrypted with authenticated AES-256-GCM before storage.
   - Credentials are never logged, never exposed to the client, and stripped (`PublicMcpConnector`) before sending to the frontend.

3. **Mandatory User Consent**:
   - Before adding any connector, users must explicitly acknowledge:
     > *"Claude can access and modify data in this service based on your permissions."*

4. **Read-Only Mode & Tool Allow/Deny Lists**:
   - **Read-Only Guard**: Automatically blocks destructive operations matching mutative keywords (`delete`, `drop`, `write`, `create`, `insert`, `update`, `purge`, `kill`).
   - **Tool Allow List**: Restricts execution to explicitly permitted tool names.
   - **Tool Deny List**: Explicitly prohibits designated high-risk tools.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/connectors` | Lists the authenticated user's configured connectors (sanitized, tokens stripped). |
| `POST` | `/api/connectors` | Adds a new connector with SSRF validation, consent gate, and AES-256-GCM encryption. |
| `PATCH` | `/api/connectors/:id` | Updates connector preferences (enable/disable, read-only mode, allowed/denied tools). |
| `DELETE` | `/api/connectors/:id` | Purges connector and securely wipes stored credentials. |
| `POST` | `/api/connectors/chat` | Executes chat with user's enabled Claude Connectors via Anthropic Messages API. |
| `GET/POST`| `/api/connectors/oauth/callback`| Handles OAuth2 authorization code exchange and token refresh. |

---

## 🖥️ Frontend Features

1. **Settings > Connectors Tab**:
   - Visual connector cards with live status badges (`Connected`, `Needs Auth`, `Error`, `Disabled`).
   - Add Connector modal with name, public HTTPS URL validation, auth method (Bearer / OAuth / None), Read-Only toggle, and mandatory consent gate.
   - Per-connector toggle switch, tool allow/deny permissions drawer, connectivity testing button, and deletion with confirmation dialog.

2. **Chat Input Integration**:
   - **Connector Picker**: Accessible from the `+` attachment menu or via active connector badges.
   - Quickly enable or disable connectors per conversation.
   - **Visible Tool-Call Badges**: Assistant messages clearly display `"Using <connector> (<tool_name>)..."` with execution latency and input parameters.

---

## 🧪 Testing

Execute the test suite verifying all 16 assertions across SSRF protection, permissions, cryptography, and end-to-end chat simulation:
```bash
npm test
```

