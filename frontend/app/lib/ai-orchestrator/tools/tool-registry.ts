/**
 * TATTVA AI - Tool Execution Registry & Sandbox Dispatcher
 * Centralized tool directory with permission management and execution bounds
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ToolDefinition, ToolExecutionResult, ExecutionContext } from "../types";
import { webSearchTool } from "./web-search";
import { codeRunnerTool } from "./code-runner";
import { documentProcessorTool } from "./document-processor";
import { githubInspectorTool } from "./github-inspector";
import { dataCalculatorTool } from "./data-calculator";

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, ToolDefinition> = new Map();

  private constructor() {
    this.registerTool(webSearchTool);
    this.registerTool(codeRunnerTool);
    this.registerTool(documentProcessorTool);
    this.registerTool(githubInspectorTool);
    this.registerTool(dataCalculatorTool);
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public getToolManifest(): Array<{
    name: string;
    displayName: string;
    description: string;
    parameters: any;
    riskLevel: string;
  }> {
    return this.listTools().map((t) => ({
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      parameters: t.parameters,
      riskLevel: t.riskLevel,
    }));
  }

  /**
   * Executes a registered tool with runtime safeguards and error containment
   */
  public async executeTool(
    name: string,
    params: Record<string, any>,
    context: ExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.getTool(name);
    if (!tool) {
      return {
        toolName: name,
        success: false,
        output: null,
        error: `Tool "${name}" is not registered in TATTVA Tool Registry.`,
        executionTimeMs: 0,
      };
    }

    // Risk confirmation check
    if (tool.riskLevel === "confirm_required") {
      // In automated pipeline, ensure context provides explicit confirmation
      const confirmed = params._confirmed === true;
      if (!confirmed) {
        return {
          toolName: name,
          success: false,
          output: null,
          error: `Tool "${tool.displayName}" requires explicit user confirmation before execution.`,
          executionTimeMs: 0,
        };
      }
    }

    try {
      return await tool.execute(params, context);
    } catch (err) {
      return {
        toolName: name,
        success: false,
        output: null,
        error: err instanceof Error ? err.message : String(err),
        executionTimeMs: 0,
      };
    }
  }
}

export const toolRegistry = ToolRegistry.getInstance();
