# TATTVA AI — Master API Reference & Developer Documentation

> **Base URL:** `https://tattva-ai-phi.vercel.app`  
> **API Version:** `v1`  
> **Authentication:** HMAC-SHA256 Signed Session Token (`x-tattva-session`) or Developer API Key (`Authorization: Bearer tat_...`)  
> **Format:** JSON / Server-Sent Events (SSE)  
> **Last Updated:** 2026-11-18  

---

## 1. Authentication & Security Headers

All authenticated endpoints require either an encrypted session header or a developer API key:

### Header Format:
```http
x-tattva-session: <base64(payload)>.<hmac_sha256_signature>
Content-Type: application/json
```

### Rate Limiting:
All endpoints enforce sliding-window rate limits (default: 60 requests/minute per client identity). When limits are exceeded, the API returns:
```json
{
  "error": "Rate limit exceeded. Please wait before retrying.",
  "retryAfter": 60
}
```

---

## 2. Core Conversational Endpoints

### `POST /api/chat`
Dispatches a conversational query to the AI Orchestrator with streaming response.
- **Request Body:**
  ```json
  {
    "message": "Explain quantum computing principles with analogies.",
    "conversationId": "conv_12345",
    "model": "gemini-2.5-flash",
    "stream": true
  }
  ```
- **Response:** Streaming Server-Sent Events (`text/event-stream`).

---

### `GET /api/chats`
Loads all persistent conversation sessions for the authenticated user.
- **Query Parameters:**
  - `limit` *(optional)*: Maximum sessions to return (default: 50).
  - `search` *(optional)*: Case-insensitive title and message keyword search.
  - `export` *(optional)*: Session ID to export.
  - `format` *(optional)*: `json` or `markdown` (used in conjunction with `export`).
- **Response (HTTP 200):**
  ```json
  {
    "sessions": [
      {
        "id": "sess_001",
        "title": "Quantum Computing Analysis",
        "updatedAt": "2026-11-18T03:30:00Z",
        "pinned": true,
        "tags": ["physics", "ai"],
        "messages": [ ... ]
      }
    ]
  }
  ```

---

### `POST /api/chats`
Synchronizes and saves user chat sessions to durable cloud storage.
- **Request Body:**
  ```json
  {
    "sessions": [ ... ],
    "userId": "usr_alpha_deploy"
  }
  ```
- **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "count": 1
  }
  ```

---

### `PATCH /api/chats`
Performs atomic metadata updates (rename, pin, tags) on a specific chat session.
- **Request Body:**
  ```json
  {
    "sessionId": "sess_001",
    "title": "Advanced Quantum Computing & Cryptography",
    "pinned": true,
    "tags": ["physics", "security"]
  }
  ```

---

### `DELETE /api/chats`
Deletes a specific conversation session or purges all user sessions.
- **Query Parameters:**
  - `sessionId` *(optional)*: ID of the session to delete. If omitted, all sessions belonging to the user are purged.

---

## 3. Autonomous Agent Engine

### `POST /api/agent/tasks`
Creates and initializes an autonomous multi-step execution plan.
- **Request Body:**
  ```json
  {
    "prompt": "Analyze datasets/sales.csv, perform EDA, and generate an executive PDF report.",
    "tools": ["read_file", "data_science_eda", "generate_pdf"]
  }
  ```

### `POST /api/agent/tasks/[taskId]/approve`
Provides human authorization for sensitive or consequential agent actions.

---

## 4. Knowledge Graph & Reasoning

### `POST /api/knowledge-graph/qa`
Queries the entity-relationship knowledge graph with multi-hop reasoning.
- **Request Body:**
  ```json
  {
    "query": "What are the dependencies between the Model Router and RAG Engine?"
  }
  ```

---

## 5. Platform Health & SRE

### `GET /api/health`
System operational probe inspecting database, memory, and model provider health.
- **Response (HTTP 200):**
  ```json
  {
    "status": "healthy",
    "version": "1.0.0",
    "database": "connected",
    "providers": {
      "gemini": "operational",
      "openrouter": "operational"
    },
    "timestamp": "2026-11-18T03:52:00Z"
  }
  ```
