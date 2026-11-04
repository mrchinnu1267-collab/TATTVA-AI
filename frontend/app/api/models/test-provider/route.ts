import { NextResponse } from "next/server";
import { executeCustomProvider, scrubCredentials, CustomProviderId } from "../../../lib/custom-provider-executor";
import { checkRateLimit, verifyUserSession } from "../../../lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const session = await verifyUserSession(request);

    // Rate limiting for test connection: 20 per minute
    const rateCheck = checkRateLimit(`test_provider_${session.userId}_${clientIp}`, 20, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: `Too many test requests. Please wait ${rateCheck.resetSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.provider) {
      return NextResponse.json(
        { success: false, error: "Invalid payload. 'provider' is required." },
        { status: 400 }
      );
    }

    const provider = body.provider as CustomProviderId;
    const apiKey = body.apiKey ? String(body.apiKey).trim() : "";
    const model = body.model ? String(body.model).trim() : "";
    const baseUrl = body.baseUrl ? String(body.baseUrl).trim() : undefined;

    // Ephemeral 1-token test prompt
    const startTime = Date.now();
    const result = await executeCustomProvider({
      provider,
      apiKey,
      model,
      baseUrl,
      messages: [
        {
          role: "user",
          content: "Hello! Respond with the single word 'OK' to confirm connectivity.",
        },
      ],
      temperature: 0.1,
      maxTokens: 10,
    });

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: "Connection verified successfully!",
      latencyMs,
      sampleResponse: result.content.slice(0, 50).trim(),
      model: result.modelUsed,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    const safeError = scrubCredentials(raw);
    return NextResponse.json(
      {
        success: false,
        error: safeError,
      },
      { status: 400 }
    );
  }
}
