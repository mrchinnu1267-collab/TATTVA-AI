import type { Metadata } from "next";
import LearningDashboard from "../components/learning/learning-dashboard";

export const metadata: Metadata = {
  title: "Personalized AI Learning Platform | TATTVA AI",
  description: "Adaptive curriculum, concept explanations with analogies, interactive quizzes, step-by-step problem solver, and SuperMemo SM-2 spaced repetition.",
};

export default function LearningPage() {
  return <LearningDashboard />;
}
