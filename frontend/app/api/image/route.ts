import { NextResponse } from "next/server";
import {
  generateImage,
  getProviderStatuses,
  publicAttempts,
} from "../../lib/image-engine";
import {
  checkRateLimit,
  isNsfwContent,
  logSecurityEvent,
  verifyUserSession,
} from "../../lib/security";
import type { ImageQuality } from "../../lib/image-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const VALID_QUALITIES: ImageQuality[] = ["fast", "balanced", "max"];
const VALID_PROVIDERS = ["auto", "gemini", "huggingface", "local", "pollinations"];

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET() {
  const providers = await getProviderStatuses();
  return NextResponse.json({
    status: "ok",
    providers,
    defaultProvider:
      providers.find((provider) => provider.available && provider.id === "gemini")?.id ??
      providers.find((provider) => provider.available && provider.id !== "pollinations")?.id ??
      providers.find((provider) => provider.available)?.id ??
      "pollinations",
  });
}

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`image_${session.userId}_${clientIp}`, 12, 60_000);
    if (!rateCheck.allowed) {
      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/image",
      });
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${rateCheck.resetSeconds}s.` },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.prompt !== "string" || !body.prompt.trim()) {
      return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
    }

    const prompt = body.prompt.trim();
    if (prompt.length > 6000) {
      return NextResponse.json(
        { error: "Prompt is too long. Keep it under 6000 characters." },
        { status: 400 }
      );
    }

    // 18+ / Adult / Nudity Safety Restriction
    const nsfwCheck = isNsfwContent(prompt);
    if (nsfwCheck.isBlocked) {
      logSecurityEvent("NSFW_PROMPT_BLOCKED", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/image",
        details: { matched: nsfwCheck.matchedPattern },
      });
      return NextResponse.json(
        {
          error:
            "This request violates TATTVA AI Safety Policy. Generation of 18+, adult, nude, or sexually explicit content is strictly restricted.",
          hint: "Please rephrase your request without adult, nudity, or sexually explicit terms.",
        },
        { status: 400 }
      );
    }

    const referenceImage =
      typeof body.referenceImage === "string" && body.referenceImage.startsWith("data:image/")
        ? body.referenceImage
        : undefined;

    if (referenceImage && referenceImage.length > 12_000_000) {
      return NextResponse.json(
        { error: "Reference image is too large. Use an image under 9 MB." },
        { status: 400 }
      );
    }

    const provider =
      typeof body.provider === "string" && VALID_PROVIDERS.includes(body.provider)
        ? (body.provider as "auto" | "gemini" | "huggingface" | "local" | "pollinations")
        : "auto";

    const quality =
      typeof body.quality === "string" && VALID_QUALITIES.includes(body.quality as ImageQuality)
        ? (body.quality as ImageQuality)
        : "balanced";

    const result = await generateImage({
      prompt,
      style: typeof body.style === "string" ? body.style : undefined,
      aspectRatio: typeof body.aspectRatio === "string" ? body.aspectRatio : undefined,
      width: toNumber(body.width),
      height: toNumber(body.height),
      seed: toNumber(body.seed),
      customNegative: typeof body.customNegative === "string" ? body.customNegative : undefined,
      referenceImage,
      provider,
      quality,
      maxAttempts: toNumber(body.maxAttempts),
      verify: body.verify === undefined ? true : Boolean(body.verify),
      targetScore: toNumber(body.targetScore),
      userId: session.userId,
    });

    return NextResponse.json({
      image: result.image,
      metadata: result.metadata,
      verification: result.verification,
      accuracy: result.accuracy,
      compiler: {
        version: result.compiled.compilerVersion,
        positive: result.compiled.positive,
        negative: result.compiled.negative,
        requirements: result.compiled.requirements,
        style: result.compiled.style,
        aspect_ratio: result.compiled.aspectRatio,
        seed: result.compiled.seed,
        width: result.compiled.width,
        height: result.compiled.height,
      },
      attempts: publicAttempts(result.attempts),
      warnings: result.warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const unavailable = /no image provider|cooling down|offline|credits|quota|not configured/i.test(
      message
    );

    console.error("[TATTVA Image] Generation failed:", message);
    return NextResponse.json(
      {
        error: message,
        hint: unavailable
          ? "Add Gemini image billing, Hugging Face inference credits, or start the local engine. The free fallback may also need a 45s cooldown."
          : undefined,
      },
      { status: unavailable ? 503 : 500 }
    );
  }
}
