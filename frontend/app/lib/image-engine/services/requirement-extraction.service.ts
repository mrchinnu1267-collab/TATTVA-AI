/**
 * TATTVA AI - Unified Requirement Extraction Service (Phase L)
 * Extracts structured checklists and quantifiable visual assertions across 8 core dimensions:
 * Object presence, exact quantities, attributes, colors, spatial positions, text, reference preservation, and restrictions.
 */

import { buildRequirementChecklist } from "../accuracy/requirement-validator";
import { extractRequirements as extractDirectRequirements } from "../prompt-compiler";
import { StructuredGenerationSpec, RequirementValidationItem, AccuracyRequirementCategory } from "../accuracy/types";

export interface RequirementSummary {
  totalCount: number;
  criticalCount: number;
  categories: Record<AccuracyRequirementCategory, number>;
  items: RequirementValidationItem[];
}

export class RequirementExtractionService {
  /**
   * Compiles an actionable, verifiable requirement checklist from a structured specification.
   */
  public static extractFromSpec(spec: StructuredGenerationSpec): RequirementSummary {
    const items = buildRequirementChecklist(spec);
    const categories: Record<AccuracyRequirementCategory, number> = {
      object_presence: 0,
      exact_quantity: 0,
      attribute: 0,
      color: 0,
      shape: 0,
      material: 0,
      clothing: 0,
      spatial_relationship: 0,
      text: 0,
      background: 0,
      lighting: 0,
      style: 0,
      restriction: 0,
      reference: 0,
    };

    let criticalCount = 0;
    for (const item of items) {
      if (categories[item.category] !== undefined) {
        categories[item.category]++;
      }
      if (item.critical) {
        criticalCount++;
      }
    }

    return {
      totalCount: items.length,
      criticalCount,
      categories,
      items,
    };
  }

  /**
   * Extracts top-level requirements directly from raw prompt text.
   */
  public static extractDirect(prompt: string) {
    return extractDirectRequirements(prompt);
  }
}

