/**
 * TATTVA AI - Personalized AI Learning Platform Facade
 * Unified interface orchestrating curriculum, explanations, quizzes, derivations, and spaced repetition
 */

export * from "./types";
export { CurriculumGenerator } from "./curriculum-generator";
export { ExplanationEngine } from "./explanation-engine";
export { QuizEngine } from "./quiz-engine";
export { SolutionDerivationEngine } from "./solution-derivation-engine";
export { SpacedRepetitionEngine } from "./spaced-repetition";
export { MasteryTracker } from "./mastery-tracker";
export { FlashcardExporter } from "./flashcard-exporter";

import { CurriculumGenerator } from "./curriculum-generator";
import { ExplanationEngine } from "./explanation-engine";
import { QuizEngine } from "./quiz-engine";
import { SolutionDerivationEngine } from "./solution-derivation-engine";
import { SpacedRepetitionEngine } from "./spaced-repetition";
import { MasteryTracker } from "./mastery-tracker";
import { FlashcardExporter } from "./flashcard-exporter";
import {
  DifficultyLevel,
  SubjectDomain,
  LearningCurriculum,
  ConceptExplanation,
  Quiz,
  QuizAnswerSubmission,
  QuizEvaluationResult,
  StepByStepSolution,
  SpacedRepetitionCard,
  LearnerMasteryProfile,
  FlashcardExportBundle,
} from "./types";

export class LearningPlatformEngine {
  public static createCurriculum(
    userId: string,
    workspaceId: string,
    topic: string,
    domain: SubjectDomain,
    baselineLevel: DifficultyLevel = "beginner",
    targetLevel: DifficultyLevel = "advanced"
  ): LearningCurriculum {
    return CurriculumGenerator.generateCurriculum(
      userId,
      workspaceId,
      topic,
      domain,
      baselineLevel,
      targetLevel
    );
  }

  public static explainConcept(
    concept: string,
    domain: SubjectDomain,
    level: DifficultyLevel = "intermediate"
  ): ConceptExplanation {
    return ExplanationEngine.explainConcept(concept, domain, level);
  }

  public static createQuiz(
    topic: string,
    domain: SubjectDomain,
    level: DifficultyLevel = "intermediate",
    questionCount: number = 3
  ): Quiz {
    return QuizEngine.generateQuiz(topic, domain, level, questionCount);
  }

  public static evaluateQuiz(
    userId: string,
    workspaceId: string,
    quiz: Quiz,
    submissions: QuizAnswerSubmission[]
  ): QuizEvaluationResult {
    const result = QuizEngine.evaluateQuiz(quiz, submissions);
    // Record mastery
    for (const ev of result.evaluations) {
      MasteryTracker.recordEvaluation(
        userId,
        workspaceId,
        ev.concept,
        quiz.domain,
        ev.isCorrect
      );
    }
    return result;
  }

  public static deriveSolution(
    problem: string,
    domain: SubjectDomain,
    difficulty: DifficultyLevel = "intermediate"
  ): StepByStepSolution {
    return SolutionDerivationEngine.deriveSolution(problem, domain, difficulty);
  }

  public static getCards(userId: string, workspaceId: string): SpacedRepetitionCard[] {
    return SpacedRepetitionEngine.getCards(userId, workspaceId);
  }

  public static getDueCards(userId: string, workspaceId: string): SpacedRepetitionCard[] {
    return SpacedRepetitionEngine.getDueCards(userId, workspaceId);
  }

  public static createCard(
    userId: string,
    workspaceId: string,
    concept: string,
    front: string,
    back: string,
    tags: string[] = []
  ): SpacedRepetitionCard {
    return SpacedRepetitionEngine.createCard(userId, workspaceId, concept, front, back, tags);
  }

  public static reviewCard(
    userId: string,
    workspaceId: string,
    cardId: string,
    quality: number
  ): SpacedRepetitionCard | null {
    return SpacedRepetitionEngine.processReview(userId, workspaceId, cardId, quality);
  }

  public static getMasteryProfile(
    userId: string,
    workspaceId: string,
    domain: SubjectDomain = "computer_science"
  ): LearnerMasteryProfile {
    return MasteryTracker.getProfile(userId, workspaceId, domain);
  }

  public static exportFlashcards(
    topic: string,
    cards: SpacedRepetitionCard[]
  ): FlashcardExportBundle {
    return FlashcardExporter.exportBundle(topic, cards);
  }
}
