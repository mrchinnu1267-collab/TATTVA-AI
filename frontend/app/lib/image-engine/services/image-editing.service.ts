/**
 * TATTVA AI - Unified Image Editing Service (Phase L)
 * Executes natural language image editing, object removal, replacement,
 * background modification, outpainting, and mask-based inpainting.
 */

import { executeImageEdit } from "../editing/inpainting-engine";
import { classifyEditingIntent } from "../editing/intent-classifier";
import { autoSegmentSubject, createRectangleMask } from "../editing/mask-generator";
import { executeBackgroundRemoval, executeBackgroundReplacement } from "../editing/background-engine";
import { executeCanvasOutpainting } from "../editing/outpainting-engine";
import { ImageEditingRequest, ImageEditingResult, EditingIntent } from "../editing/types";

export class ImageEditingService {
  /**
   * Executes a full natural-language image editing request.
   */
  public static async edit(req: ImageEditingRequest): Promise<ImageEditingResult> {
    return executeImageEdit(req);
  }

  /**
   * Classifies user editing intent from natural language instruction.
   */
  public static classifyIntent(instruction: string): EditingIntent {
    return classifyEditingIntent(instruction);
  }

  /**
   * Generates automatic segmentation mask for text query or click point.
   */
  public static async segment(
    imageDataUri?: string,
    width: number = 1024,
    height: number = 1024,
    targetQuery?: string
  ): Promise<string> {
    return autoSegmentSubject(width, height, targetQuery);
  }

  /**
   * Creates a rectangular bounding-box mask.
   */
  public static createBoxMask(
    width: number,
    height: number,
    box: { x: number; y: number; width: number; height: number }
  ): string {
    return createRectangleMask(width, height, box);
  }

  /**
   * Removes image background with transparent alpha matting.
   */
  public static async removeBackground(imageDataUri: string): Promise<string> {
    const res = await executeBackgroundRemoval(imageDataUri);
    return res.image;
  }

  /**
   * Replaces image background with new scene prompt.
   */
  public static async replaceBackground(imageDataUri: string, prompt: string): Promise<string> {
    const res = await executeBackgroundReplacement(imageDataUri, prompt);
    return res.image;
  }

  /**
   * Outpaints canvas in any direction.
   */
  public static async outpaint(
    imageDataUri: string,
    prompt: string,
    expand: { left?: number; right?: number; top?: number; bottom?: number }
  ) {
    return executeCanvasOutpainting(imageDataUri, prompt, expand);
  }
}

