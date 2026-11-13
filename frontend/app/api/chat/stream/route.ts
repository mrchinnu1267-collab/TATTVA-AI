import { NextRequest } from "next/server";
import { modelRouter } from "../../../lib/ai-orchestrator/model-router";
import { classifyIntent } from "../../../lib/ai-orchestrator/intent-classifier";
import { verifyUserSession, checkRateLimit } from "../../../lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * TATTVA AI - Stage 2: Unified Multi-Provider Streaming Endpoint
 * Emits Server-Sent Events (SSE) for low Time-To-First-Token (TTFT)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid request. Messages array required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const session = await verifyUserSession(req);
    const rateCheck = checkRateLimit(`stream_${session.userId}_${clientIp}`, 60, 60000);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const latestUserMsg = [...body.messages].reverse().find((m: any) => m.role === "user")?.content || "";
    const classification = await classifyIntent(latestUserMsg);

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Async worker execution
    (async () => {
      try {
        // Send initial metadata event
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "meta",
              intent: classification.primaryIntent,
              complexity: classification.complexityScore,
            })}\n\n`
          )
        );

        // Execute generation via Centralized Model Router
        const result = await modelRouter.executeWithFallback(
          classification.primaryIntent,
          classification.complexityScore,
          {
            messages: body.messages,
            preferredProvider: body.preferredProvider,
            preferredModel: body.preferredModel || body.model,
            systemInstruction: body.systemInstruction,
            temperature: body.temperature ?? 0.7,
            maxTokens: body.maxTokens,
          }
        );

        // Stream generated response in chunks for smooth UX
        const chunkSize = 24;
        const text = result.text;
        for (let i = 0; i < text.length; i += chunkSize) {
          const slice = text.slice(i, i + chunkSize);
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "delta",
                text: slice,
              })}\n\n`
            )
          );
          // Tiny micro-delay to allow UI render cycle
          if (i + chunkSize < text.length) {
            await new Promise((r) => setTimeout(r, 12));
          }
        }

        // Send completion event with usage & cost telemetry
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              modelUsed: result.modelUsed,
              provider: result.provider,
              latencyMs: result.latencyMs,
              fallbackOccurred: result.fallbackOccurred,
              usage: result.usage,
            })}\n\n`
          )
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: errMsg,
            })}\n\n`
          )
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
