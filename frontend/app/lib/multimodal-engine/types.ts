/**
 * TATTVA AI - Multimodal AI Intelligence Types (Phase 18)
 * Unified schemas for Image, Audio, Video, and Cross-Modal Reasoning
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type ModalityType = "text" | "image" | "audio" | "video" | "multimodal_bundle";

export interface MultimodalAttachment {
  type: "image" | "audio" | "video";
  mimeType: string;
  dataBase64?: string;
  url?: string;
  durationSeconds?: number;
  filename?: string;
}

export interface ImageUnderstandingResult {
  caption: string;
  detectedObjects: Array<{ label: string; confidence: number; boundingBox?: [number, number, number, number] }>;
  extractedText?: string; // OCR / Handwriting transcription
  visualQuestionAnswer?: string;
  sceneClassification: string;
  confidenceScore: number;
}

export interface AudioTranscriptionResult {
  transcript: string;
  detectedLanguage: string;
  confidenceScore: number;
  durationSeconds: number;
  segments?: Array<{ start: number; end: number; text: string }>;
}

export interface AudioSynthesisResult {
  audioBufferBase64: string;
  mimeType: string;
  voiceUsed: string;
  durationEstimateSeconds: number;
}

export interface VideoAnalysisResult {
  summary: string;
  keyframeTimestamps: number[];
  scenes: Array<{ timestamp: number; description: string }>;
  timestampedAnswers?: Array<{ timestamp: number; question: string; answer: string }>;
  durationSeconds: number;
}

export interface MultimodalDispatchResponse {
  primaryModality: ModalityType;
  crossModalSynthesis: string;
  imageResult?: ImageUnderstandingResult;
  audioResult?: AudioTranscriptionResult;
  videoResult?: VideoAnalysisResult;
  latencyMs: number;
  modelUsed: string;
}
