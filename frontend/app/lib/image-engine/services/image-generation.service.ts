/**
 * TATTVA AI - Unified Image Generation Service (Phase L)
 * Orchestrates raw generation, multimodal RAG generation, and verified multi-stage
 * accurate generation with automated surgical inpainting correction.
 */

import { generateImage } from "../engine";
import { generateImageWithMultimodalRAG } from "../multimodal-rag/rag-coordinator";
import { generateAccurateImage, AccurateGenerationOptions } from "../accuracy/accuracy-pipeline";
import { ImageGenerationOptions, ImageEngineResult } from "../types";
import { MultiStageAccuracyResult } from "../accuracy/types";
import { MultimodalRAGOptions, MultimodalRAGResult } from "../multimodal-rag/types";

export class ImageGenerationService {
  /**
   * Generates an image using the standard multi-provider pipeline.
   */
  public static async generate(options: ImageGenerationOptions): Promise<ImageEngineResult> {
    return generateImage(options);
  }

  /**
   * Generates an image using Multimodal RAG with retrieved reference visual DNA.
   */
  public static async generateWithRAG(options: MultimodalRAGOptions): Promise<MultimodalRAGResult> {
    return generateImageWithMultimodalRAG(options);
  }

  /**
   * Executes the full 10-stage verified accuracy pipeline:
   * Prompt Understanding -> Checklist Extraction -> Intelligent Routing ->
   * Base Generation -> Independent 8-Dimension Evaluation -> Error Detection ->
   * Targeted Surgical Inpainting Correction -> Final Image.
   */
  public static async generateAccurate(options: AccurateGenerationOptions): Promise<MultiStageAccuracyResult> {
    return generateAccurateImage(options);
  }
}

