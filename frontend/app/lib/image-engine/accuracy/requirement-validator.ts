/**
 * TATTVA AI - Requirement Validation Engine
 * Converts structured specifications into an immutable, checkable checklist
 * guaranteeing that every explicit user directive is tracked throughout generation.
 */

import { StructuredGenerationSpec, RequirementValidationItem } from "./types";

/**
 * Compiles a structured generation specification into checkable requirements.
 */
export function buildRequirementChecklist(
  spec: StructuredGenerationSpec
): RequirementValidationItem[] {
  const checklist: RequirementValidationItem[] = [];
  let index = 1;

  // 1. Exact Object Quantities & Presence
  for (const qty of spec.exactQuantities) {
    checklist.push({
      id: `req-qty-${index++}`,
      category: "exact_quantity",
      statement: `Exactly ${qty.count} ${qty.object}${qty.count > 1 ? "s" : ""}`,
      critical: true,
      status: "uncertain",
      confidence: 0.0,
      detectedEvidence: "Awaiting evaluation",
    });
  }

  // 2. Specific Colors
  for (const col of spec.colors) {
    checklist.push({
      id: `req-col-${index++}`,
      category: "color",
      statement: col.object ? `${col.color} ${col.object}` : `Color ${col.color}`,
      critical: true,
      status: "uncertain",
      confidence: 0.0,
      detectedEvidence: "Awaiting evaluation",
    });
  }

  // 3. Spatial Relationships
  for (const sp of spec.spatialRelationships) {
    let statement = sp.raw;
    if (sp.relation === "left_of" && sp.target) {
      statement = `${sp.subject} positioned to the left of ${sp.target}`;
    } else if (sp.relation === "right_of" && sp.target) {
      statement = `${sp.subject} positioned to the right of ${sp.target}`;
    } else if (sp.relation === "behind" && sp.target) {
      statement = `${sp.subject} positioned behind ${sp.target}`;
    } else if (sp.relation === "in_front_of" && sp.target) {
      statement = `${sp.subject} positioned in front of ${sp.target}`;
    } else if (sp.relation === "center") {
      statement = "Main subject centered in composition";
    }

    checklist.push({
      id: `req-spat-${index++}`,
      category: "spatial_relationship",
      statement,
      critical: true,
      status: "uncertain",
      confidence: 0.0,
      detectedEvidence: "Awaiting evaluation",
    });
  }

  // 4. Exact Text Requirements
  for (const txt of spec.textRequirements) {
    checklist.push({
      id: `req-txt-${index++}`,
      category: "text",
      statement: `Render legible text reading "${txt.exactText}"`,
      critical: true,
      status: "uncertain",
      confidence: 0.0,
      detectedEvidence: "Awaiting evaluation",
    });
  }

  // 5. Materials
  for (const mat of spec.materials) {
    checklist.push({
      id: `req-mat-${index++}`,
      category: "material",
      statement: `${mat.material} ${mat.object || "material"}`,
      critical: false,
      status: "uncertain",
      confidence: 0.0,
      detectedEvidence: "Awaiting evaluation",
    });
  }

  // 6. Background & Environment
  if (spec.background) {
    checklist.push({
      id: `req-bg-${index++}`,
      category: "background",
      statement: `Background contains ${spec.background}`,
      critical: false,
      status: "uncertain",
      confidence: 0.0,
      detectedEvidence: "Awaiting evaluation",
    });
  }
  if (spec.environment) {
    checklist.push({
      id: `req-env-${index++}`,
      category: "background",
      statement: `Environment: ${spec.environment}`,
      critical: false,
      status: "uncertain",
      confidence: 0.0,
      detectedEvidence: "Awaiting evaluation",
    });
  }

  // 7. Lighting & Camera
  if (spec.lighting) {
    checklist.push({
      id: `req-light-${index++}`,
      category: "lighting",
      statement: `Lighting: ${spec.lighting}`,
      critical: false,
      status: "uncertain",
      confidence: 0.0,
      detectedEvidence: "Awaiting evaluation",
    });
  }
  if (spec.cameraAngle) {
    checklist.push({
      id: `req-cam-${index++}`,
      category: "attribute",
      statement: `Camera perspective: ${spec.cameraAngle}`,
      critical: false,
      status: "uncertain",
      confidence: 0.0,
      detectedEvidence: "Awaiting evaluation",
    });
  }

  // 8. Explicit Restrictions
  for (const restr of spec.explicitRestrictions) {
    checklist.push({
      id: `req-restr-${index++}`,
      category: "restriction",
      statement: `Negative constraint: ${restr}`,
      critical: true,
      status: "uncertain",
      confidence: 0.0,
      detectedEvidence: "Awaiting evaluation",
    });
  }

  // 9. Reference Image Preservation
  if (spec.referenceRequirements.length > 0) {
    checklist.push({
      id: `req-ref-${index++}`,
      category: "reference",
      statement: "Preserve core subject identity from uploaded reference image",
      critical: true,
      status: "uncertain",
      confidence: 0.0,
      detectedEvidence: "Awaiting evaluation",
    });
  }

  // If prompt was very simple with no explicit parsed items, add main subject
  if (checklist.length === 0) {
    checklist.push({
      id: `req-subj-1`,
      category: "object_presence",
      statement: spec.mainSubject || spec.originalPrompt,
      critical: true,
      status: "uncertain",
      confidence: 0.0,
      detectedEvidence: "Awaiting evaluation",
    });
  }

  return checklist;
}
