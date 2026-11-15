/**
 * TATTVA AI - Knowledge Distillation Engine (Phase 27)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { DistillationSpec } from "./types";

export class DistillationEngine {
  private static instance: DistillationEngine;

  public static getInstance(): DistillationEngine {
    if (!DistillationEngine.instance) {
      DistillationEngine.instance = new DistillationEngine();
    }
    return DistillationEngine.instance;
  }

  /**
   * Validates distillation specification constraints
   */
  public validateSpec(spec: DistillationSpec): { valid: boolean; error?: string } {
    if (spec.temperature <= 1.0) {
      return { valid: false, error: "Distillation temperature should be > 1.0 for probability softening (recommended 2.0 - 4.0)" };
    }
    if (spec.alpha < 0 || spec.alpha > 1) {
      return { valid: false, error: "Loss balance parameter alpha must be between 0.0 and 1.0" };
    }
    if (!spec.teacherModel || !spec.studentModel) {
      return { valid: false, error: "Both teacher and student model identifiers are required" };
    }
    return { valid: true };
  }

  /**
   * Computes theoretical loss weighting based on alpha and temperature
   * L_total = alpha * L_hard + (1 - alpha) * (T^2) * KL(P_student_soft || P_teacher_soft)
   */
  public computeLossWeights(temperature: number, alpha: number): {
    hardLabelWeight: number;
    softDistillationWeight: number;
    effectiveKlScale: number;
  } {
    const effectiveKlScale = (1 - alpha) * Math.pow(temperature, 2);
    return {
      hardLabelWeight: alpha,
      softDistillationWeight: 1 - alpha,
      effectiveKlScale: Number(effectiveKlScale.toFixed(3)),
    };
  }

  /**
   * Distills chain-of-thought reasoning traces from teacher response
   */
  public extractReasoningTrace(rawTeacherOutput: string): {
    thoughtTrace: string;
    finalAnswer: string;
    hasExplicitReasoning: boolean;
  } {
    const thinkMatch = rawTeacherOutput.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
      return {
        thoughtTrace: thinkMatch[1].trim(),
        finalAnswer: rawTeacherOutput.replace(/<think>[\s\S]*?<\/think>/i, "").trim(),
        hasExplicitReasoning: true,
      };
    }

    // Heuristic step-by-step extraction
    const lines = rawTeacherOutput.split("\n");
    const traceLines: string[] = [];
    const answerLines: string[] = [];
    let isConclusion = false;

    for (const line of lines) {
      if (line.toLowerCase().includes("therefore,") || line.toLowerCase().includes("in conclusion,")) {
        isConclusion = true;
      }
      if (isConclusion) {
        answerLines.push(line);
      } else {
        traceLines.push(line);
      }
    }

    return {
      thoughtTrace: traceLines.join("\n").trim(),
      finalAnswer: answerLines.length > 0 ? answerLines.join("\n").trim() : rawTeacherOutput.trim(),
      hasExplicitReasoning: traceLines.length > 0 && answerLines.length > 0,
    };
  }

  /**
   * Generates production PyTorch Knowledge Distillation trainer script
   */
  public generateDistillationScript(spec: DistillationSpec): string {
    return `# ====================================================================
# TATTVA AI - Automated Knowledge Distillation Pipeline
# Teacher: ${spec.teacherModel} -> Student: ${spec.studentModel}
# Conceptualized & Engineered by kotapati Gowtham Chowdary
# ====================================================================

import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import AutoModelForCausalLM, AutoTokenizer

TEACHER_ID = "${spec.teacherModel}"
STUDENT_ID = "${spec.studentModel}"
TEMPERATURE = ${spec.temperature}
ALPHA = ${spec.alpha}

class DistillationTrainer:
    def __init__(self, teacher, student, temp=TEMPERATURE, alpha=ALPHA):
        self.teacher = teacher.eval()
        self.student = student
        self.temp = temp
        self.alpha = alpha
        self.ce_loss = nn.CrossEntropyLoss()
        self.kl_div = nn.KLDivLoss(reduction="batchmean")

    def compute_loss(self, input_ids, labels):
        with torch.no_grad():
            teacher_logits = self.teacher(input_ids).logits
        student_logits = self.student(input_ids).logits

        # Standard hard label loss
        loss_ce = self.ce_loss(student_logits.view(-1, student_logits.size(-1)), labels.view(-1))

        # Softened distillation loss
        p_teacher = F.softmax(teacher_logits / self.temp, dim=-1)
        log_p_student = F.log_softmax(student_logits / self.temp, dim=-1)
        loss_kd = self.kl_div(log_p_student, p_teacher) * (self.temp ** 2)

        return (self.alpha * loss_ce) + ((1 - self.alpha) * loss_kd)
`;
  }
}

export const distillationEngine = DistillationEngine.getInstance();
