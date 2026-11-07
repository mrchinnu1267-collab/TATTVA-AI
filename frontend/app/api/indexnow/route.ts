import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const host = "tattva-ai-phi.vercel.app";
  const key = "c748fa3910eb47d7b1a2e2d09015bc26";
  const keyLocation = `https://${host}/${key}.txt`;
  const urlList = [
    `https://${host}/`,
    `https://${host}/chat`,
    `https://${host}/images`,
    `https://${host}/image-studio`,
    `https://${host}/maps`,
    `https://${host}/media`,
    `https://${host}/voice`,
    `https://${host}/download`,
  ];

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host,
        key,
        keyLocation,
        urlList,
      }),
    });

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      message: res.ok
        ? "IndexNow URLs submitted successfully to Bing/IndexNow network"
        : `IndexNow submission returned status ${res.status}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to submit to IndexNow" },
      { status: 500 }
    );
  }
}

