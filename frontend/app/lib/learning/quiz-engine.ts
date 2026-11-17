/**
 * TATTVA AI - Interactive Quiz & Evaluation Engine
 * Synthesizes multi-format assessment problems, evaluates submissions, and computes mastery deltas
 */

import {
  DifficultyLevel,
  SubjectDomain,
  Quiz,
  QuizQuestion,
  QuizAnswerSubmission,
  QuizEvaluationResult,
  QuestionEvaluation,
} from "./types";

export class QuizEngine {
  /**
   * Generates a multi-question interactive quiz
   */
  public static generateQuiz(
    topic: string,
    domain: SubjectDomain,
    level: DifficultyLevel = "intermediate",
    questionCount: number = 3
  ): Quiz {
    const cleanTopic = topic.trim();
    const questions: QuizQuestion[] = [];

    // Question 1: Conceptual / Theoretical Core
    questions.push({
      id: `q_1_${Date.now()}`,
      concept: `${cleanTopic} Core Principles`,
      domain,
      level,
      type: "multiple_choice",
      prompt: `In the context of ${cleanTopic}, which of the following statements best describes its primary invariant or mechanism?`,
      options: [
        `It encapsulates state and provides deterministic transformation while avoiding undefined mutations.`,
        `It completely replaces physical RAM with CPU register files for all variable allocations.`,
        `It executes strictly in O(1) time and space regardless of underlying data volume.`,
        `It requires disabling type safety to achieve maximum theoretical network throughput.`,
      ],
      correctAnswer: `It encapsulates state and provides deterministic transformation while avoiding undefined mutations.`,
      hints: [
        `Consider how computer software isolates side-effects and maintains consistency.`,
        `Focus on determinism and boundary management rather than hardware miracles.`,
      ],
      explanation: `${cleanTopic} establishes clear boundaries and deterministic state transformations, ensuring code predictability and invariant safety.`,
    });

    // Question 2: Asymptotic / Operational Complexity
    if (questionCount >= 2) {
      questions.push({
        id: `q_2_${Date.now()}`,
        concept: `${cleanTopic} Complexity & Performance`,
        domain,
        level,
        type: "multiple_choice",
        prompt: `When scaling operations involving ${cleanTopic}, what is the standard worst-case time or resource implication?`,
        options: [
          `Performance degrades gracefully when algorithms avoid quadratic nested sweeps over unindexed collections.`,
          `Hardware clock speeds decrease exponentially with each concurrent caller.`,
          `All network packets are duplicated three times by the operating system kernel.`,
          `Memory overhead doubles every millisecond due to garbage collection starvation.`,
        ],
        correctAnswer: `Performance degrades gracefully when algorithms avoid quadratic nested sweeps over unindexed collections.`,
        hints: [
          `Think about algorithmic time complexity (e.g., O(n) vs O(n^2)).`,
          `Good engineering prevents quadratic execution loops.`,
        ],
        explanation: `Proper implementation of ${cleanTopic} avoids unnecessary quadratic iterations or unbounded memory growth.`,
      });
    }

    // Question 3: Practical Application / Edge Case Handling
    if (questionCount >= 3) {
      questions.push({
        id: `q_3_${Date.now()}`,
        concept: `${cleanTopic} Fault Tolerance & Edge Cases`,
        domain,
        level,
        type: "multiple_choice",
        prompt: `Which defensive programming technique is most essential when deploying ${cleanTopic} in production?`,
        options: [
          `Validating input schemas at external boundaries and gracefully handling error conditions with fallback semantics.`,
          `Suppressing all logged errors to maintain clean console output for end-users.`,
          `Hardcoding static API keys and secrets directly inside client-side bundles for speed.`,
          `Restarting the underlying virtual machine after every incoming HTTP transaction.`,
        ],
        correctAnswer: `Validating input schemas at external boundaries and gracefully handling error conditions with fallback semantics.`,
        hints: [
          `Boundary validation protects systems against unexpected malformed data.`,
          `Never suppress errors or hardcode secrets.`,
        ],
        explanation: `Input schema validation and graceful fallback handling are critical pillars of production reliability.`,
      });
    }

    return {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      topic: cleanTopic,
      domain,
      level,
      questions,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Evaluates student answers against the quiz
   */
  public static evaluateQuiz(
    quiz: Quiz,
    submissions: QuizAnswerSubmission[]
  ): QuizEvaluationResult {
    let correctCount = 0;
    const evaluations: QuestionEvaluation[] = [];
    const masteryDelta: Record<string, number> = {};

    for (const q of quiz.questions) {
      const sub = submissions.find((s) => s.questionId === q.id);
      const studentAns = sub ? (sub.selectedAnswer || sub.responseText || "").trim() : "";

      const isCorrect = this.isAnswerCorrect(studentAns, q.correctAnswer);
      const score = isCorrect ? 1.0 : 0.0;

      if (isCorrect) correctCount++;

      evaluations.push({
        questionId: q.id,
        concept: q.concept,
        isCorrect,
        score,
        studentAnswer: studentAns,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      });

      // Adjust mastery per concept
      masteryDelta[q.concept] = isCorrect ? 15 : -10;
    }

    const totalQuestions = quiz.questions.length;
    const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const recommendations: string[] = [];
    if (scorePercentage === 100) {
      recommendations.push(`Outstanding mastery! You achieved a perfect score on ${quiz.topic}. Proceed to higher difficulty exercises.`);
    } else if (scorePercentage >= 66) {
      recommendations.push(`Solid understanding demonstrated. Review the feedback explanations on missed questions to reinforce key concepts.`);
    } else {
      recommendations.push(`Core concepts need revision. Utilize the Concept Explainer and step-by-step problem solver to strengthen your baseline.`);
    }

    return {
      quizId: quiz.id,
      topic: quiz.topic,
      totalQuestions,
      correctCount,
      scorePercentage,
      evaluations,
      masteryDelta,
      recommendations,
      evaluatedAt: new Date().toISOString(),
    };
  }

  private static isAnswerCorrect(studentAnswer: string, correctAnswer: string): boolean {
    if (!studentAnswer) return false;
    const s = studentAnswer.toLowerCase().trim();
    const c = correctAnswer.toLowerCase().trim();
    if (s === c) return true;
    // Check if student selected letter or exact substring
    return s.includes(c) || c.includes(s);
  }
}
