import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  const apkUrl = "https://raw.githubusercontent.com/mrchinnu1267-collab/TATTVA-AI/main/frontend/public/tattva-ai.apk";
  const zipUrl = "https://raw.githubusercontent.com/mrchinnu1267-collab/TATTVA-AI/main/frontend/public/tattva-ai.zip";

  const targetUrl = format === "zip" ? zipUrl : apkUrl;

  return NextResponse.redirect(targetUrl, 302);
}

