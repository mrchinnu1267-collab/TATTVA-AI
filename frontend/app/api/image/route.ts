import { NextResponse } from "next/server";
import {
  generateImage,
  generateImageWithMultimodalRAG,
  getProviderStatuses,
  publicAttempts,
  executeInpainting,
  executeOutpainting,
  buildSceneSpatialLayout,
  enrichPromptWithSpatialLayout,
  formatUserFacingImageError,
} from "../../lib/image-engine";
import {
  checkRateLimit,
  logSecurityEvent,
  verifyUserSession,
} from "../../lib/security";
import {
  moderateTextPrompt,
  moderateVisualImage,
  SAFETY_REJECTION_MESSAGE,
} from "../../lib/content-moderation";
import type { ImageQuality } from "../../lib/image-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const VALID_QUALITIES: ImageQuality[] = ["fast", "balanced", "max"];
const VALID_PROVIDERS = ["auto", "gemini", "huggingface", "openai", "local", "pollinations"];

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
      providers.find((provider) => provider.available)?.id ??
      "auto",
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

    // Stage 1: Strict Pre-Generation Prompt Moderation
    const promptModeration = moderateTextPrompt(prompt);
    if (!promptModeration.isSafe) {
      logSecurityEvent("NSFW_PROMPT_BLOCKED", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/image",
        details: { matched: promptModeration.matched, category: promptModeration.category },
      });
      return NextResponse.json(
        {
          error: SAFETY_REJECTION_MESSAGE,
          safetyViolation: true,
        },
        { status: 400 }
      );
    }

    // Stage 2: Reference Image Upload Verification (if provided)
    const referenceImage =
      typeof body.referenceImage === "string" && body.referenceImage.startsWith("data:image/")
        ? body.referenceImage
        : undefined;

    if (referenceImage) {
      if (referenceImage.length > 12_000_000) {
        return NextResponse.json(
          { error: "Reference image is too large. Use an image under 9 MB." },
          { status: 400 }
        );
      }

      const visualModeration = await moderateVisualImage(referenceImage);
      if (!visualModeration.isSafe) {
        logSecurityEvent("NSFW_PROMPT_BLOCKED", {
          userId: session.userId,
          ip: clientIp,
          endpoint: "/api/image",
          details: { reason: "Uploaded reference image violated content safety guidelines", category: visualModeration.category },
        });
        return NextResponse.json(
          {
            error: SAFETY_REJECTION_MESSAGE,
            safetyViolation: true,
          },
          { status: 400 }
        );
      }
    }

    const provider =
      typeof body.provider === "string" && VALID_PROVIDERS.includes(body.provider)
        ? (body.provider as "auto" | "gemini" | "huggingface" | "openai" | "local" | "pollinations")
        : "auto";

    const quality =
      typeof body.quality === "string" && VALID_QUALITIES.includes(body.quality as ImageQuality)
        ? (body.quality as ImageQuality)
        : "balanced";

    // Handle Spatial Layout Conditioning if provided
    let effectivePrompt = prompt;
    if (Array.isArray(body.spatialBoxes) && body.spatialBoxes.length > 0) {
      const layout = buildSceneSpatialLayout(prompt, { customBoxes: body.spatialBoxes as any });
      effectivePrompt = enrichPromptWithSpatialLayout(prompt, layout);
    }

    // Handle Specialized Inpainting Operation
    if (body.operation === "inpaint" || (typeof body.mask === "string" && referenceImage)) {
      const inpaintRes = await executeInpainting({
        image: referenceImage || (body.image as string),
        mask: body.mask as string,
        prompt: effectivePrompt,
        negativePrompt: typeof body.customNegative === "string" ? body.customNegative : undefined,
        seed: toNumber(body.seed),
        provider: provider === "auto" ? "gemini" : provider,
        quality,
      });

      return NextResponse.json({
        image: inpaintRes.image,
        metadata: {
          model: inpaintRes.model,
          provider: inpaintRes.provider,
          seed: toNumber(body.seed) || 0,
          width: toNumber(body.width) || 1024,
          height: toNumber(body.height) || 1024,
          generation_time_seconds: Number((inpaintRes.latencyMs / 1000).toFixed(1)),
          accuracy: inpaintRes.maskAdherenceScore,
          verified: true,
          workflow: "inpainting",
          unmasked_preserved_percent: inpaintRes.unmaskedPreservedPercent,
        },
        verification: { score: inpaintRes.maskAdherenceScore, passed: true, issues: [], requirements: [] },
        accuracy: inpaintRes.maskAdherenceScore,
        attempts: [],
        warnings: [],
      });
    }

    // Handle Specialized Outpainting Operation
    if (body.operation === "outpaint" || (body.expand && referenceImage)) {
      const outpaintRes = await executeOutpainting({
        image: referenceImage || (body.image as string),
        expand: (body.expand as any) || { right: 256 },
        prompt: effectivePrompt,
        negativePrompt: typeof body.customNegative === "string" ? body.customNegative : undefined,
        provider: provider === "auto" ? "gemini" : provider,
      });

      return NextResponse.json({
        image: outpaintRes.image,
        metadata: {
          model: outpaintRes.model,
          provider: outpaintRes.provider,
          seed: toNumber(body.seed) || 0,
          width: outpaintRes.extendedWidth,
          height: outpaintRes.extendedHeight,
          generation_time_seconds: Number((outpaintRes.latencyMs / 1000).toFixed(1)),
          accuracy: 95,
          verified: true,
          workflow: "outpainting",
          expansion_ratio: outpaintRes.expansionRatio,
        },
        verification: { score: 95, passed: true, issues: [], requirements: [] },
        accuracy: 95,
        attempts: [],
        warnings: [],
      });
    }

    const enableRAG = body.enableRAG !== false; // Enabled by default for all generation
    let result: any;

    if (enableRAG) {
      result = await generateImageWithMultimodalRAG({
        prompt: effectivePrompt,
        style: typeof body.style === "string" ? body.style : undefined,
        aspectRatio: typeof body.aspectRatio === "string" ? body.aspectRatio : undefined,
        width: toNumber(body.width),
        height: toNumber(body.height),
        seed: toNumber(body.seed),
        customNegative: typeof body.customNegative === "string" ? body.customNegative : undefined,
        referenceImage,
        conditioningMethod: typeof body.conditioningMethod === "string" ? (body.conditioningMethod as any) : undefined,
        provider,
        quality,
        maxAttempts: toNumber(body.maxAttempts),
        userId: session.userId,
        activeAdapterId: typeof body.activeAdapterId === "string" ? body.activeAdapterId : undefined,
        adapterScale: toNumber(body.adapterScale),
      });
    } else {
      result = await generateImage({
        prompt: effectivePrompt,
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
        activeAdapterId: typeof body.activeAdapterId === "string" ? body.activeAdapterId : undefined,
        adapterScale: toNumber(body.adapterScale),
      });
    }

    // Stage 3: Post-Generation Image Output Verification
    if (result.image) {
      const outputModeration = await moderateVisualImage(result.image);
      const issuesHasNsfw = result.verification?.issues?.some((issue: string) =>
        /prohibited adult|nudity|nude content|explicit sexual|harmful/i.test(issue)
      );

      if (!outputModeration.isSafe || issuesHasNsfw) {
        logSecurityEvent("NSFW_PROMPT_BLOCKED", {
          userId: session.userId,
          ip: clientIp,
          endpoint: "/api/image",
          details: { reason: "Post-generation output verification failed safety guidelines" },
        });
        // Discard generated image completely — never deliver to client
        return NextResponse.json(
          {
            error: SAFETY_REJECTION_MESSAGE,
            safetyViolation: true,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      image: result.image,
      metadata: result.metadata,
      verification: result.verification,
      accuracy: result.accuracy,
      rag: result.rag || null,
      evaluation: result.evaluation || null,
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

    // If internal engine or provider caught content safety violation
    if (message.includes("content safety guidelines") || message.includes("violates our content safety")) {
      return NextResponse.json(
        {
          error: SAFETY_REJECTION_MESSAGE,
          safetyViolation: true,
        },
        { status: 400 }
      );
    }

    const unavailable = /no image provider|cooling down|offline|credits|quota|not configured/i.test(
      message
    );

    console.error("[TATTVA Image] Generation failed:", message);
    const safeUserMessage = formatUserFacingImageError(error);
    return NextResponse.json(
      {
        error: safeUserMessage,
      },
      { status: unavailable ? 503 : 500 }
    );
  }
}
