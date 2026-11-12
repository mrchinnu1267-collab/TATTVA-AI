import { NextRequest, NextResponse } from "next/server";
import { NextGenArchitectureService } from "@/app/lib/image-engine/services/nextgen-architecture.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const service = NextGenArchitectureService.getInstance();
    const allPrompts = service.get300BenchmarkPrompts();

    const filtered = category
      ? allPrompts.filter(p => p.category === category)
      : allPrompts;

    return NextResponse.json({
      success: true,
      totalCount: filtered.length,
      categoryFilter: category || "all",
      prompts: filtered,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to retrieve 300 benchmark prompts" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const service = NextGenArchitectureService.getInstance();
    const summary = service.run300Benchmark();

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to execute 300-prompt comparative benchmark" },
      { status: 500 }
    );
  }
}

