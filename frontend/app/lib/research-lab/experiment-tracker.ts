/**
 * TATTVA AI - Empirical Research Experiment Tracker (Phase 27)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ResearchExperiment } from "./types";

export class ExperimentTracker {
  private static instance: ExperimentTracker;
  private experiments: Map<string, ResearchExperiment> = new Map();

  public static getInstance(): ExperimentTracker {
    if (!ExperimentTracker.instance) {
      ExperimentTracker.instance = new ExperimentTracker();
    }
    return ExperimentTracker.instance;
  }

  public registerExperiment(experiment: ResearchExperiment): { success: boolean; error?: string } {
    if (!experiment.id || !experiment.title || !experiment.objective) {
      return { success: false, error: "Missing required identification metadata" };
    }

    if (!experiment.reproducibilitySteps || experiment.reproducibilitySteps.length === 0) {
      return { success: false, error: "Research integrity requires documented reproducibility steps" };
    }

    if (experiment.empiricalResults.evalAccuracy < 0 || experiment.empiricalResults.evalAccuracy > 1) {
      return { success: false, error: "Accuracy metric must be normalized between 0.0 and 1.0" };
    }

    this.experiments.set(experiment.id, experiment);
    return { success: true };
  }

  public getExperiment(id: string): ResearchExperiment | undefined {
    return this.experiments.get(id);
  }

  public listExperiments(filterMethodology?: ResearchExperiment["methodology"]): ResearchExperiment[] {
    const all = Array.from(this.experiments.values());
    if (filterMethodology) {
      return all.filter((e) => e.methodology === filterMethodology);
    }
    return all;
  }

  public generateLabSummary(): {
    totalExperiments: number;
    averageAccuracyGain: number;
    methodologies: Record<string, number>;
  } {
    const all = Array.from(this.experiments.values());
    if (all.length === 0) {
      return { totalExperiments: 0, averageAccuracyGain: 0, methodologies: {} };
    }

    const methodologies: Record<string, number> = {};
    let totalGain = 0;

    for (const exp of all) {
      methodologies[exp.methodology] = (methodologies[exp.methodology] || 0) + 1;
      totalGain += exp.empiricalResults.evalAccuracy - exp.empiricalResults.baselineAccuracy;
    }

    return {
      totalExperiments: all.length,
      averageAccuracyGain: Number((totalGain / all.length).toFixed(4)),
      methodologies,
    };
  }

  public clear(): void {
    this.experiments.clear();
  }
}

export const experimentTracker = ExperimentTracker.getInstance();
