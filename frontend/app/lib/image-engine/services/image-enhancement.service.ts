/**
 * TATTVA AI - Unified Image Enhancement Service (Phase L)
 * Executes 2x and 4x super-resolution, noise reduction, detail enhancement,
 * and artifact reduction with Real-ESRGAN, SwinIR, and Neural Bilateral Lanczos.
 */

import { enhanceImage, upscaleImage } from "../upscaler/super-resolution";
import { evaluateEnhancementQuality } from "../upscaler/metrics";
import { ImageEnhancementOptions, ImageEnhancementResult } from "../upscaler/types";

export class ImageEnhancementService {
  /**
   * Enhances an image via 2x or 4x AI super-resolution with quality metric validation.
   */
  public static async enhance(options: ImageEnhancementOptions): Promise<ImageEnhancementResult> {
    return enhanceImage(options);
  }

  /**
   * Convenience upscaling interface returning enhanced dimensions and method metadata.
   */
  public static async upscale(image: string, scale: 2 | 4 = 2) {
    return upscaleImage({ image, scale });
  }

  /**
   * Calculates objective image quality metrics (PSNR, SSIM, Laplacian variance).
   */
  public static evaluateQuality(
    originalDataUri: string,
    enhancedDataUri: string,
    scale: 2 | 4 = 2,
    modelName: string = "neural-bilateral-lanczos"
  ) {
    return evaluateEnhancementQuality(originalDataUri, enhancedDataUri, scale, modelName);
  }
}

