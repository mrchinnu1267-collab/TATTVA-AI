import { NextResponse } from "next/server";
import { verifyUserSession, checkRateLimit, sanitizeAndGuardPrompt, guardAIOutput, logSecurityEvent } from "@/app/lib/security";
import { GeminiConnectorService } from "@/app/lib/gemini-connector/gemini-connector-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/connectors/gemini/generate
 * Executes text, coding, reasoning, or structured data tasks via connected Gemini provider.
 */
export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rate = checkRateLimit(`gemini_gen_${session.userId}_${clientIp}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Gemini request rate limit exceeded. Please wait ${rate.resetSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { prompt, model, temperature, maxTokens, systemInstruction } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    // Security guardrail: Sanitize prompt
    const guard = sanitizeAndGuardPrompt(prompt);
    if (!guard.isSafe) {
      logSecurityEvent("PROMPT_INJECTION_BLOCKED", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/connectors/gemini/generate",
        details: { flags: guard.detectedPatterns },
      });
      return NextResponse.json(
        { error: "Prompt was rejected by safety guardrails." },
        { status: 400 }
      );
    }

    const service = GeminiConnectorService.getInstance();
    if (body.providerMode) {
      service.setProviderMode(body.providerMode);
    } else if (process.env.GEMINI_API_KEY) {
      service.setProviderMode("developer_api");
    }

    const detectedTask = service.detectTask(prompt);

    const result = await service.executeTask(guard.sanitizedPrompt, {
      model,
      temperature,
      maxTokens,
      systemInstruction,
    });

    // Guard assistant output against credential leakage
    const guardedText = guardAIOutput(result.text);

    return NextResponse.json({
      success: true,
      detectedTask,
      result: {
        ...result,
        text: guardedText,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
