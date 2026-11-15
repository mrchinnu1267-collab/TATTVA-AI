/**
 * TATTVA AI - GSM8K Mathematical Topic Classifier & Failure Analyzer
 * Categorizes grade-school mathematical problems into granular sub-domains:
 * Arithmetic, Algebra, Fractions, Percentages, Ratios, Multi-Step Reasoning, etc.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { MathTopic, Gsm8kTopicMetrics, Gsm8kQuestionResult } from "./types";

export class MathTopicClassifier {
  private static instance: MathTopicClassifier;

  public static getInstance(): MathTopicClassifier {
    if (!MathTopicClassifier.instance) {
      MathTopicClassifier.instance = new MathTopicClassifier();
    }
    return MathTopicClassifier.instance;
  }

  /**
   * Classifies a question into its dominant mathematical sub-domain
   */
  public classifyQuestion(question: string, solution?: string): MathTopic {
    const text = `${question} ${solution || ""}`.toLowerCase();

    // 1. Fractions
    if (
      /\b(?:fraction|half|third|quarter|fifth|two-thirds|three-quarters|\d+\/\d+)\b/.test(text)
    ) {
      return "fractions";
    }

    // 2. Percentages
    if (/\b(?:percent|percentage|%|discount|markup|interest|tax)\b/.test(text)) {
      return "percentages";
    }

    // 3. Ratios & Proportions
    if (/\b(?:ratio|proportion|per\s+hour|per\s+day|per\s+person|rate|speed|mph|for\s+every)\b/.test(text)) {
      return "ratios";
    }

    // 4. Algebra & Variables
    if (
      /\b(?:equation|variable|unknown|times\s+as\s+many|twice\s+as\s+many|x\b|y\b|let\s+[a-z]\s+be)\b/.test(
        text
      )
    ) {
      return "algebra";
    }

    // 5. Geometry & Spatial/Measurement
    if (
      /\b(?:area|perimeter|rectangle|square|circle|triangle|volume|radius|length|width|height|dimensions)\b/.test(
        text
      )
    ) {
      return "geometry";
    }

    // 6. Multi-Step Reasoning (High step count or compound sequencing)
    if (
      /\b(?:altogether|remainder|remaining|afterwards|then\s+he|then\s+she|finally|in\s+total)\b/.test(
        text
      )
    ) {
      return "multi_step";
    }

    // 7. Core Arithmetic (Default)
    return "arithmetic";
  }

  /**
   * Aggregates question results into a topic performance matrix
   */
  public computeTopicMetrics(results: Gsm8kQuestionResult[]): Gsm8kTopicMetrics[] {
    const topicMap = new Map<
      MathTopic,
      { total: number; correct: number; incorrect: number; latencyTotal: number }
    >();

    const allTopics: MathTopic[] = [
      "arithmetic",
      "algebra",
      "fractions",
      "percentages",
      "ratios",
      "multi_step",
      "geometry",
      "general",
    ];

    for (const t of allTopics) {
      topicMap.set(t, { total: 0, correct: 0, incorrect: 0, latencyTotal: 0 });
    }

    for (const r of results) {
      const entry = topicMap.get(r.topic) || { total: 0, correct: 0, incorrect: 0, latencyTotal: 0 };
      entry.total++;
      if (r.isCorrect) entry.correct++;
      else entry.incorrect++;
      entry.latencyTotal += r.latencyMs;
      topicMap.set(r.topic, entry);
    }

    const metrics: Gsm8kTopicMetrics[] = [];
    for (const [topic, data] of topicMap.entries()) {
      if (data.total > 0) {
        const accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
        metrics.push({
          topic,
          total: data.total,
          correct: data.correct,
          incorrect: data.incorrect,
          accuracy: parseFloat(accuracy.toFixed(1)),
          avgLatencyMs: Math.round(data.latencyTotal / data.total),
        });
      }
    }

    return metrics.sort((a, b) => b.total - a.total);
  }

  /**
   * Generates actionable recommendations based on weak mathematical areas
   */
  public generateRecommendations(metrics: Gsm8kTopicMetrics[]): string[] {
    const recommendations: string[] = [];
    const weakTopics = metrics.filter((m) => m.accuracy < 60 && m.total >= 2);

    for (const wt of weakTopics) {
      if (wt.topic === "fractions") {
        recommendations.push(
          `Weakness in Fractions (${wt.accuracy}% accuracy): Fine-tune with explicit numerator/denominator reduction and cross-multiplication proofs.`
        );
      } else if (wt.topic === "percentages") {
        recommendations.push(
          `Weakness in Percentages (${wt.accuracy}% accuracy): Encourage step-by-step decimal conversion (e.g. 20% = 0.20) before applying discounts or markups.`
        );
      } else if (wt.topic === "multi_step") {
        recommendations.push(
          `Weakness in Multi-Step Word Problems (${wt.accuracy}% accuracy): Implement Chain-of-Thought scratchpads tracking intermediate variables across sequential sentences.`
        );
      } else if (wt.topic === "algebra") {
        recommendations.push(
          `Weakness in Algebraic Translation (${wt.accuracy}% accuracy): Guide the model to explicitly formulate 'Let x = ...' before solving linear relationships.`
        );
      } else if (wt.topic === "ratios") {
        recommendations.push(
          `Weakness in Ratios & Rates (${wt.accuracy}% accuracy): Enforce unit-rate normalization (e.g. per item, per hour) prior to compounding quantities.`
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Strong overall mathematical reasoning across evaluated categories. Continue monitoring edge cases with large numbers."
      );
    }

    return recommendations;
  }
}

export const mathTopicClassifier = MathTopicClassifier.getInstance();
