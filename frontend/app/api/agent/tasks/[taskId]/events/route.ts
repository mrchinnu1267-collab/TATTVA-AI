/**
 * TATTVA AI - Agent Task Real-Time Event Stream (SSE)
 * GET /api/agent/tasks/[taskId]/events -> Server-Sent Events stream for real-time progress updates
 */

import { verifyUserSession } from "../../../../../lib/security";
import { taskExecutionController } from "../../../../../lib/agent-engine/execution-controller";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await verifyUserSession(request);
    const { taskId } = await params;

    const task = taskExecutionController.getTask(taskId, session.userId);
    if (!task) {
      return new Response(JSON.stringify({ error: `Task "${taskId}" not found or unauthorized.` }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // Send initial state immediately
        const initialPayload = `data: ${JSON.stringify({
          type: "initial_state",
          task,
        })}\n\n`;
        controller.enqueue(encoder.encode(initialPayload));

        // Subscribe to live events
        unsubscribe = taskExecutionController.subscribeToEvents(taskId, (event) => {
          try {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));

            // Close stream on terminal states
            if (["COMPLETED", "FAILED", "CANCELLED"].includes(event.state)) {
              setTimeout(() => {
                try {
                  controller.close();
                } catch {}
              }, 100);
            }
          } catch {}
        });
      },
      cancel() {
        if (unsubscribe) {
          unsubscribe();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
