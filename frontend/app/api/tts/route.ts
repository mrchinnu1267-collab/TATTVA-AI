import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Universal TTS Audio Fallback for Mobile Web, Android WebView, and Browsers
 * without SpeechSynthesis support. Streams MP3 speech audio.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawText = searchParams.get("text") || "";
    const lang = searchParams.get("lang") || "en";

    // Clean text: strip code blocks, markdown symbols, emoji clutter
    const cleanText = rawText
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/#{1,6}\s+/g, "")
      .replace(/[-*]\s+/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .slice(0, 400) // Keep chunk compact for rapid low-latency streaming
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: "Text parameter is required." }, { status: 400 });
    }

    // Google Translate TTS endpoint with browser-compatible client signature
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      cleanText
    )}&tl=${encodeURIComponent(lang)}&client=tw-ob`;

    const res = await fetch(ttsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        Referer: "https://translate.google.com/",
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      throw new Error(`TTS upstream returned status ${res.status}`);
    }

    const audioBuffer = await res.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err: unknown) {
    console.warn("[TTS Fallback] Audio streaming error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "TTS streaming failed" },
      { status: 502 }
    );
  }
}

