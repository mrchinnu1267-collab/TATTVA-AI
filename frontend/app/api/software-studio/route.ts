/**
 * TATTVA AI - Software Studio API Route Handler
 * Dispatches autonomous software creation, codebase indexing,
 * sandbox terminal commands, and multi-agent coordination.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildApplicationFromRequirement } from "@/app/lib/software-studio/dev-engine/dev-engine";
import { indexProject, retrieveRelevantContext } from "@/app/lib/software-studio/project-understanding/code-scanner";
import { executeSandboxCommand } from "@/app/lib/software-studio/sandbox/command-validator";
import { diagnoseAndRepair } from "@/app/lib/software-studio/dev-engine/debugging-engine";
import { getProjectMemory, recordDecision } from "@/app/lib/software-studio/memory/project-memory";
import { LocalAIEngine } from "@/app/lib/local-ai-engine/local-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const query = searchParams.get("query");

    if (view === "graph") {
      const graph = await indexProject(process.cwd());
      if (query) {
        const relevant = retrieveRelevantContext(graph, query, 5);
        return NextResponse.json({ success: true, graphSummary: { totalFiles: graph.totalFiles, languages: graph.languages }, relevant });
      }
      return NextResponse.json({ success: true, graph });
    }

    if (view === "memory") {
      const memory = getProjectMemory("default");
      return NextResponse.json({ success: true, memory });
    }

    const hardware = LocalAIEngine.getHardwareSpecs();
    const status = await LocalAIEngine.getStatus();
    const memory = getProjectMemory("default");

    return NextResponse.json({
      success: true,
      studioOperational: true,
      hardware,
      engineStatus: status,
      memorySummary: {
        decisions: memory.architecturalDecisions.length,
        resolvedBugs: memory.resolvedBugHistory.length,
        techStack: memory.techStack,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectName, requirement, commandLine, errorMessage, projectRoot } = body;

    // 1. Autonomous Project Creation
    if (action === "create_project" || action === "build_app") {
      if (!projectName || !requirement) {
        return NextResponse.json(
          { success: false, error: "projectName and requirement are required." },
          { status: 400 }
        );
      }
      const buildResult = await buildApplicationFromRequirement(projectName, requirement);
      return NextResponse.json({ success: true, project: buildResult });
    }

    // 2. Controlled Sandbox Terminal Execution
    if (action === "execute_command") {
      if (!commandLine) {
        return NextResponse.json({ success: false, error: "commandLine is required." }, { status: 400 });
      }
      const execResult = await executeSandboxCommand(commandLine);
      return NextResponse.json({ success: true, result: execResult });
    }

    // 3. Autonomous Debugging & Repair
    if (action === "diagnose_error") {
      if (!errorMessage) {
        return NextResponse.json({ success: false, error: "errorMessage is required." }, { status: 400 });
      }
      const repairResult = await diagnoseAndRepair(errorMessage, projectRoot || process.cwd());
      return NextResponse.json({ success: true, diagnostic: repairResult });
    }

    // 4. Record Decision in Memory
    if (action === "record_decision") {
      const { topic, decision, rationale } = body;
      const recorded = recordDecision("default", topic || "Architecture", decision || "", rationale || "");
      return NextResponse.json({ success: true, decision: recorded });
    }

    return NextResponse.json({ success: false, error: `Unknown action: "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
