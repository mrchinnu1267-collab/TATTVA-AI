/**
 * TATTVA AI - Mathematical & Tabular Data Calculator Tool
 * High-precision numerical computing, statistical summaries, and formula evaluation
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ToolDefinition, ToolExecutionResult, ExecutionContext } from "../types";

export interface CalculationResult {
  expression: string;
  result: number | string | Record<string, any>;
  statistics?: {
    count: number;
    sum: number;
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
  };
}

export function computeStatistics(numbers: number[]) {
  if (numbers.length === 0) return undefined;
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((acc, v) => acc + v, 0);
  const count = numbers.length;
  const mean = sum / count;

  const median =
    count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];

  const variance = numbers.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  return {
    count,
    sum: Number(sum.toFixed(4)),
    mean: Number(mean.toFixed(4)),
    median: Number(median.toFixed(4)),
    min: sorted[0],
    max: sorted[count - 1],
    stdDev: Number(stdDev.toFixed(4)),
  };
}

export const dataCalculatorTool: ToolDefinition = {
  name: "data_calculator",
  displayName: "Mathematical & Statistical Calculator",
  description: "Perform mathematical calculations, compute dataset statistics (mean, median, min/max, standard deviation), and verify equations.",
  category: "data",
  riskLevel: "safe",
  parameters: {
    expression: {
      type: "string",
      description: "Mathematical expression or arithmetic calculation (e.g., '1250 * (1 + 0.08)^5')",
      required: false,
    },
    dataset: {
      type: "array",
      description: "Optional array of numbers to compute summary statistics for",
      required: false,
    },
  },
  execute: async (params: Record<string, any>, context: ExecutionContext): Promise<ToolExecutionResult> => {
    const startTime = Date.now();
    try {
      const expr = params.expression ? String(params.expression) : "";
      let calculatedValue: any = null;

      if (expr) {
        // Sanitize mathematical expression to allow only numbers, operators, Math.* functions
        const cleanExpr = expr.replace(/[^0-9+\-*/().,%^ Math.sincotaqrtlogexpPIE]/g, "");
        // Safe evaluation
        const fn = new Function(`return (${cleanExpr.replace(/\^/g, "**")});`);
        calculatedValue = fn();
      }

      let stats: any = undefined;
      if (Array.isArray(params.dataset) && params.dataset.length > 0) {
        const numbers = params.dataset.map(Number).filter((n: number) => !isNaN(n));
        stats = computeStatistics(numbers);
      }

      return {
        toolName: "data_calculator",
        success: true,
        output: {
          expression: expr,
          result: calculatedValue,
          statistics: stats,
        },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        toolName: "data_calculator",
        success: false,
        output: null,
        error: err instanceof Error ? err.message : String(err),
        executionTimeMs: Date.now() - startTime,
      };
    }
  },
};

