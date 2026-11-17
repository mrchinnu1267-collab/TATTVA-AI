/**
 * TATTVA AI - Personalized AI Learning Platform
 * Core Data Structures and Interfaces
 */

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert";

export type SubjectDomain = 
  | "programming"
  | "computer_science"
  | "mathematics"
  | "system_architecture"
  | "data_structures_algorithms"
  | "general";

export interface CurriculumModule {
  id: string;
  order: number;
  title: string;
  description: string;
  concepts: string[];
  estimatedMinutes: number;
  completed: boolean;
  prerequisites?: string[];
}

export interface LearningCurriculum {
  id: string;
  userId: string;
  workspaceId: string;
  topic: string;
  domain: SubjectDomain;
  targetLevel: DifficultyLevel;
  baselineLevel: DifficultyLevel;
  totalEstimatedHours: number;
  modules: CurriculumModule[];
  createdAt: string;
  updatedAt: string;
}

export interface ConceptExplanation {
  concept: string;
  domain: SubjectDomain;
  level: DifficultyLevel;
  overview: string;
  analogy: string;
  keyPrinciples: string[];
  codeOrMathExample?: string;
  commonPitfalls: string[];
  practicalUseCases: string[];
  followUpQuestions: string[];
  suggestedPrerequisites: string[];
}

export type QuizQuestionType = "multiple_choice" | "coding" | "open_response";

export interface QuizQuestion {
  id: string;
  concept: string;
  domain: SubjectDomain;
  level: DifficultyLevel;
  type: QuizQuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  hints: string[];
  explanation: string;
}

export interface Quiz {
  id: string;
  topic: string;
  domain: SubjectDomain;
  level: DifficultyLevel;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizAnswerSubmission {
  questionId: string;
  selectedAnswer: string;
  responseText?: string;
}

export interface QuestionEvaluation {
  questionId: string;
  concept: string;
  isCorrect: boolean;
  score: number; // 0 to 1
  studentAnswer: string;
  correctAnswer: string;
  explanation: string;
  hintsUsedCount?: number;
}

export interface QuizEvaluationResult {
  quizId: string;
  topic: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  evaluations: QuestionEvaluation[];
  masteryDelta: Record<string, number>;
  recommendations: string[];
  evaluatedAt: string;
}

export interface SolutionStep {
  stepNumber: number;
  title: string;
  explanation: string;
  derivationOrCode?: string;
  hint?: string;
}

export interface StepByStepSolution {
  id: string;
  problem: string;
  domain: SubjectDomain;
  difficulty: DifficultyLevel;
  totalSteps: number;
  steps: SolutionStep[];
  finalAnswer: string;
  verificationExplanation: string;
  suggestedPracticeProblems: string[];
}

/**
 * SuperMemo SM-2 Spaced Repetition Card
 */
export interface SpacedRepetitionCard {
  id: string;
  userId: string;
  workspaceId: string;
  concept: string;
  front: string;
  back: string;
  tags: string[];
  repetitions: number;
  intervalDays: number;
  easeFactor: number; // default 2.5
  nextReviewDate: string; // ISO String
  lastReviewedDate?: string;
}

export interface ConceptMasteryRecord {
  concept: string;
  domain: SubjectDomain;
  score: number; // 0 to 100
  retentionPercentage: number; // 0 to 100
  totalQuizzesTaken: number;
  consecutiveCorrect: number;
  lastEvaluated: string;
}

export interface LearnerMasteryProfile {
  userId: string;
  workspaceId: string;
  domain: SubjectDomain;
  overallMasteryPercentage: number;
  concepts: Record<string, ConceptMasteryRecord>;
  updatedAt: string;
}

export interface FlashcardExportBundle {
  topic: string;
  totalCards: number;
  ankiTsv: string; // Tab-separated Front \t Back \t Tags
  jsonExport: SpacedRepetitionCard[];
  generatedAt: string;
}
