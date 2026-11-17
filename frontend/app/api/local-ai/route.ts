/**
 * TATTVA AI - Local AI Engine API Route Handler
 * Provides REST & SSE streaming endpoints for local offline inference,
 * hardware telemetry, and model performance metrics.
 */

import { NextRequest, NextResponse } from "next/server";
import { LocalAIEngine } from "@/app/lib/local-ai-engine/local-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await LocalAIEngine.getStatus();
    const models = LocalAIEngine.getModels();
    const hardware = LocalAIEngine.getHardwareSpecs();

    return NextResponse.json({
      success: true,
      status,
      hardware,
      models,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, prompt, systemInstruction, modelId, temperature, maxTokens, stream } = body;

    if (action === "load_model") {
      if (!modelId) {
        return NextResponse.json({ success: false, error: "modelId is required" }, { status: 400 });
      }
      const loadRes = await LocalAIEngine.loadModel(modelId);
      return NextResponse.json(loadRes);
    }

    if (action === "unload_model") {
      const unloadRes = await LocalAIEngine.unloadModel();
      return NextResponse.json(unloadRes);
    }

    if (action === "benchmark") {
      const targetModel = modelId || "qwen2.5-coder-3b-q4";
      const benchRes = await LocalAIEngine.benchmarkModel(targetModel);
      return NextResponse.json({ success: true, benchmark: benchRes });
    }

    // Default: Execute inference
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ success: false, error: "prompt is required" }, { status: 400 });
    }

    if (stream) {
      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            await LocalAIEngine.generate({
              prompt,
              systemInstruction,
              temperature,
              maxTokens,
              stream: true,
              onToken: (token) => {
                const sseData = `data: ${JSON.stringify({ token })}\n\n`;
                controller.enqueue(encoder.encode(sseData));
              },
            });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err: any) {
            controller.error(err);
          }
        },
      });

      return new Response(customReadable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const result = await LocalAIEngine.generate({
      prompt,
      systemInstruction,
      temperature,
      maxTokens,
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
