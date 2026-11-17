/**
 * TATTVA AI - Workflow Automation & Multi-Tool Orchestration Engine
 * Coordinates multi-step automation chains, dependency resolution, retries, and error recovery.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { WorkflowDefinition, WorkflowStep, WorkflowExecutionRun } from "./types";
import { CentralizedToolRegistry } from "../agent-engine/tool-registry";
import { IntegrationsVault } from "./integrations-vault";

// In-memory workflow definitions and execution runs
const workflowStore = new Map<string, WorkflowDefinition>();
const executionRuns = new Map<string, WorkflowExecutionRun>();
const activeCancellations = new Set<string>();

export class WorkflowEngine {
  /**
   * Creates or updates a workflow definition
   */
  public static saveWorkflow(def: WorkflowDefinition): WorkflowDefinition {
    if (!def.id) {
      def.id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    }
    def.updatedAt = new Date().toISOString();
    if (!def.createdAt) def.createdAt = def.updatedAt;

    workflowStore.set(def.id, def);
    return def;
  }

  /**
   * Retrieves a workflow definition
   */
  public static getWorkflow(userId: string, workflowId: string): WorkflowDefinition | null {
    const wf = workflowStore.get(workflowId);
    if (!wf || wf.userId !== userId) return null;
    return wf;
  }

  /**
   * Lists all workflows for a tenant
   */
  public static listWorkflows(userId: string): WorkflowDefinition[] {
    return Array.from(workflowStore.values()).filter((w) => w.userId === userId);
  }

  /**
   * Triggers and executes a workflow run sequentially or according to step dependencies
   */
  public static async executeWorkflow(
    userId: string,
    workflowId: string,
    initialInputs: Record<string, any> = {}
  ): Promise<WorkflowExecutionRun> {
    const wf = this.getWorkflow(userId, workflowId);
    if (!wf) {
      throw new Error(`Workflow "${workflowId}" not found or unauthorized for this user.`);
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const run: WorkflowExecutionRun = {
      runId,
      workflowId,
      userId,
      status: "RUNNING",
      startedAt: new Date().toISOString(),
      stepResults: {},
      totalDurationMs: 0,
    };
    executionRuns.set(runId, run);

    const startTime = Date.now();
    const toolRegistry = CentralizedToolRegistry.getInstance();
    const stepOutputs: Record<string, any> = { ...initialInputs };

    for (const step of wf.steps) {
      // Check cancellation
      if (activeCancellations.has(runId)) {
        run.status = "CANCELLED";
        run.error = "Workflow execution cancelled by user.";
        break;
      }

      // Check dependency predecessors
      if (step.dependsOn && step.dependsOn.length > 0) {
        const hasFailedDependency = step.dependsOn.some(
          (depId) => run.stepResults[depId]?.status === "FAILED"
        );
        if (hasFailedDependency) {
          run.stepResults[step.id] = {
            status: "SKIPPED",
            error: "Predecessor step failed.",
            durationMs: 0,
          };
          continue;
        }
      }

      // Interpolate parameters from prior step outputs (e.g. {{step1.output.id}})
      const resolvedParams = this.resolveParameters(step.parameters, stepOutputs);

      // Execute step tool
      const stepStart = Date.now();
      let stepSuccess = false;
      let stepOutput: any = null;
      let stepError: string | undefined;

      let retriesLeft = step.retryCount || 0;
      while (retriesLeft >= 0) {
        try {
          const toolExec = await toolRegistry.executeTool(
            step.toolName,
            resolvedParams,
            {
              taskId: runId,
              userId,
              workspaceId: wf.workspaceId,
              isAuthenticated: true,
              isApprovalGranted: true,
            }
          );

          stepSuccess = toolExec.success;
          stepOutput = toolExec.output;
          stepError = toolExec.error;

          if (stepSuccess) break;
        } catch (err: any) {
          stepError = err?.message || String(err);
        }
        retriesLeft--;
      }

      const stepDuration = Date.now() - stepStart;
      run.stepResults[step.id] = {
        status: stepSuccess ? "SUCCESS" : "FAILED",
        output: stepOutput,
        error: stepError,
        durationMs: stepDuration,
      };

      if (stepSuccess) {
        stepOutputs[step.id] = stepOutput;
      } else {
        if (!step.continueOnError) {
          run.status = "FAILED";
          run.error = `Step "${step.name}" (${step.id}) failed: ${stepError}`;
          break;
        }
      }
    }

    if (run.status === "RUNNING") {
      run.status = "COMPLETED";
    }

    run.completedAt = new Date().toISOString();
    run.totalDurationMs = Date.now() - startTime;
    return run;
  }

  /**
   * Cancels an active workflow execution run
   */
  public static cancelRun(runId: string): boolean {
    const run = executionRuns.get(runId);
    if (!run || run.status !== "RUNNING") return false;
    activeCancellations.add(runId);
    run.status = "CANCELLED";
    return true;
  }

  /**
   * Retrieves status of an execution run
   */
  public static getRun(runId: string): WorkflowExecutionRun | null {
    return executionRuns.get(runId) || null;
  }

  /**
   * Helper to replace {{stepId.field}} in parameters
   */
  private static resolveParameters(
    params: Record<string, any>,
    context: Record<string, any>
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") {
        resolved[key] = value.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_, pathExpr) => {
          const parts = pathExpr.split(".");
          let current: any = context;
          for (const p of parts) {
            if (current && typeof current === "object" && p in current) {
              current = current[p];
            } else {
              return "";
            }
          }
          return typeof current === "string" ? current : JSON.stringify(current);
        });
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }
}
