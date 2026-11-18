/**
 * TATTVA AI - Unified Model Registry API Route Handler
 * GET /api/models/registry -> List registered models, dynamic capability scoring, fallback chains
 * Enforces zero-trust session validation and sliding-window rate limiting.
 */

import { NextResponse } from "next/server";
import { modelRegistry, ModalityInput, ModalityOutput } from "../../../lib/ai-orchestrator/model-registry";
import { TaskIntent, ModelProvider } from "../../../lib/ai-orchestrator/types";
import { verifyUserSession, checkRateLimit, logSecurityEvent } from "../../../lib/security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`model_reg_${session.userId}_${clientIp}`, 120, 60000);
    if (!rateCheck.allowed) {
      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/models/registry",
      });
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const select = searchParams.get("select");
    const chain = searchParams.get("chain");
    const intent = (searchParams.get("intent") as TaskIntent) || undefined;
    const provider = (searchParams.get("provider") as ModelProvider) || undefined;
    const inputModality = (searchParams.get("inputModality") as ModalityInput) || undefined;
    const outputModality = (searchParams.get("outputModality") as ModalityOutput) || undefined;
    const healthyOnly = searchParams.get("healthyOnly") === "true";
    const supportsTools = searchParams.has("supportsTools") ? searchParams.get("supportsTools") === "true" : undefined;
    const supportsReasoning = searchParams.has("supportsReasoning") ? searchParams.get("supportsReasoning") === "true" : undefined;
    const estimatedTokens = searchParams.has("estimatedTokens") ? parseInt(searchParams.get("estimatedTokens")!, 10) : undefined;
    const latencySensitivity = searchParams.get("latencySensitivity") as ("low" | "medium" | "high") || undefined;
    const costSensitivity = searchParams.get("costSensitivity") as ("low" | "medium" | "high") || undefined;
    const preferredModel = searchParams.get("preferredModel") || undefined;

    // 1. Candidate scoring query: /api/models/registry?select=best&intent=coding
    if (select === "best" && intent) {
      const best = modelRegistry.selectBestModel({
        taskIntent: intent,
        requiredInputModalities: inputModality ? [inputModality] : undefined,
        requiredOutputModalities: outputModality ? [outputModality] : undefined,
        estimatedTokens,
        latencySensitivity,
        costSensitivity,
        preferredProvider: provider,
        preferredModel,
        supportsTools,
        supportsReasoning,
      });

      const scored = modelRegistry.scoreModels({
        taskIntent: intent,
        requiredInputModalities: inputModality ? [inputModality] : undefined,
        requiredOutputModalities: outputModality ? [outputModality] : undefined,
        estimatedTokens,
        latencySensitivity,
        costSensitivity,
        preferredProvider: provider,
        preferredModel,
        supportsTools,
        supportsReasoning,
      });

      return NextResponse.json({
        success: true,
        selectedModel: best,
        scoring: scored.slice(0, 5),
        query: { intent, provider, inputModality, outputModality },
      });
    }

    // 2. Fallback chain query: /api/models/registry?chain=true&intent=reasoning
    if (chain === "true" && intent) {
      const fallbackChain = modelRegistry.resolveFallbackChain({
        taskIntent: intent,
        requiredInputModalities: inputModality ? [inputModality] : undefined,
        requiredOutputModalities: outputModality ? [outputModality] : undefined,
        estimatedTokens,
        latencySensitivity,
        costSensitivity,
        preferredProvider: provider,
        preferredModel,
        supportsTools,
        supportsReasoning,
      });

      return NextResponse.json({
        success: true,
        chain: fallbackChain,
        depth: fallbackChain.length,
      });
    }

    // 3. Default: List catalog with optional filters and telemetry summary
    const models = modelRegistry.listModels({
      provider,
      inputModality,
      outputModality,
      healthyOnly,
      supportsTools,
      supportsReasoning,
    });

    const snapshot = modelRegistry.getSnapshot();

    return NextResponse.json({
      success: true,
      totalModels: models.length,
      healthyModels: snapshot.healthyModels,
      providers: snapshot.providers,
      modelsByProvider: snapshot.modelsByProvider,
      models,
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Internal server error";
    const status = errMessage.includes("Authentication required") ? 401 : 500;
    return NextResponse.json({ error: errMessage }, { status });
  }
}
