/**
 * TATTVA AI - MMMLU Evaluation Execution API (Streaming SSE & Batch)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import {
  mmmluEvaluator,
  evaluationStorage,
  EvaluationConfig,
  EvaluationLiveProgress,
} from "../../../lib/evaluation/mmmlu";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider = "gemini",
      model = "gemini-3.6-flash",
      sampleSize = 25,
      subject = "all",
      concurrency = 2,
      seed,
      timeoutMs = 30000,
      stream = false,
    } = body;

    const config: EvaluationConfig = {
      provider,
      model,
      sampleSize,
      subject: subject === "all" ? undefined : subject,
      concurrency: Math.min(Math.max(Number(concurrency) || 2, 1), 5),
      seed: seed ? Number(seed) : undefined,
      timeoutMs: Number(timeoutMs) || 30000,
    };

    const runId = `eval_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 1. Streaming Server-Sent Events (SSE) mode
    if (stream) {
      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, data: any) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          try {
            sendEvent("start", { runId, model: config.model, provider: config.provider });

            const summary = await mmmluEvaluator.runEvaluation(config, {
              runId,
              onProgress: (progress: EvaluationLiveProgress) => {
                sendEvent("progress", progress);
              },
            });

            // Persist run
            await evaluationStorage.saveRun(summary);

            sendEvent("complete", summary);
            controller.close();
          } catch (runErr: any) {
            sendEvent("error", { error: runErr.message || String(runErr) });
            controller.close();
          }
        },
      });

      return new Response(customReadable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // 2. Batch Mode (non-streaming)
    const summary = await mmmluEvaluator.runEvaluation(config, { runId });
    await evaluationStorage.saveRun(summary);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: any) {
    console.error("[MMMLU Evaluation Run Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
