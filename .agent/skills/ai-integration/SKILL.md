---
name: ai-integration
description: >-
  Architects, orchestrates, and optimizes AI model inference (Google Gemini API, Hugging Face,
  local image engine, and Claude Connectors) with server-side security, streaming responses,
  and context conservation. Use when adding or modifying AI chat, multimodal vision, prompt routing,
  image generation, or LLM-driven tools.
---

# AI Integration Specialist

The AI Integration Specialist skill standardizes how TATTVA AI interacts with large language models, vision engines, and generative pipelines, ensuring security, fast responses, and minimal token waste.

## Integration Protocols

1. **Client Management & Orchestration**:
   - Primary SDK: Official Google GenAI SDK (`@google/genai`).
   - Use `app/lib/ai-orchestrator/` to route requests dynamically between Gemini, Claude, and local image models based on task requirements.
   - For multimodal vision & OCR: Leverage `app/lib/tattva-vision-llm.ts` to process document scans, equations, and handwriting.
   - For custom model orchestration: Leverage `app/lib/custom-provider-executor.ts`.

2. **Server-Side Security**:
   - **Never** expose `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`, or custom provider keys in client-side bundles or `NEXT_PUBLIC_*` variables.
   - All AI calls must terminate through Next.js server route handlers (`app/api/chat/`, `app/api/image/`, `app/api/models/`).

3. **Streaming & Latency Optimization**:
   - For interactive chat conversations, utilize server-sent streaming (`response.toReadableStream()` or SSE) to achieve sub-second TTFT (Time To First Token).
   - Implement abort controllers (`AbortController`) to terminate serverless upstream calls immediately if the user disconnects or navigates away.

4. **Token Conservation & Context Window Hygiene**:
   - Prune conversation history: send only the system prompt + recent N dialogue turns relevant to the user request.
   - Compress code context: do not inject entire project files; inject only the targeted interface or function signature.
   - Cache static system instructions when using Gemini context caching where applicable.

5. **Resilience & Fallback**:
   - Always wrap upstream AI API calls in `try/catch` with structured error handling.
   - If an upstream model is rate-limited (HTTP 429), smoothly fall back to secondary models or inform the user cleanly without crashing the UI.

