import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

export interface MakeupOptions {
  lipstick?: {
    color: string;
    opacity: number;
  };
  eyeshadow?: {
    color: string;
    opacity: number;
  };
}

export class MakeupProcessor {
  private model: faceLandmarksDetection.FaceLandmarksDetector | null = null;
  
  async initialize() {
    this.model = await faceLandmarksDetection.load(
      faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
    );
  }

  async applyMakeup(imageElement: HTMLVideoElement | HTMLImageElement, options: MakeupOptions) {
    if (!this.model) return null;

    const predictions = await this.model.estimateFaces({
      input: imageElement
    });

    if (!predictions.length) return null;

    const canvas = document.createElement('canvas');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;

    // Draw original image
    ctx.drawImage(imageElement, 0, 0);

    predictions.forEach(prediction => {
      if (options.lipstick) {
        this.applyLipstick(ctx, prediction, options.lipstick);
      }
      if (options.eyeshadow) {
        this.applyEyeshadow(ctx, prediction, options.eyeshadow);
      }
    });

    return canvas;
  }

  private applyLipstick(
    ctx: CanvasRenderingContext2D, 
    prediction: faceLandmarksDetection.Face,
    options: { color: string; opacity: number }
  ) {
    const lipPoints = prediction.annotations.lipsUpperOuter
      .concat(prediction.annotations.lipsLowerOuter);

    ctx.beginPath();
    ctx.moveTo(lipPoints[0][0], lipPoints[0][1]);
    lipPoints.forEach(point => {
      ctx.lineTo(point[0], point[1]);
    });
    ctx.closePath();
    
    ctx.fillStyle = options.color;
    ctx.globalAlpha = options.opacity;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private applyEyeshadow(
    ctx: CanvasRenderingContext2D,
    prediction: faceLandmarksDetection.Face,
    options: { color: string; opacity: number }
  ) {
    const leftEye = prediction.annotations.leftEyeUpper0;
    const rightEye = prediction.annotations.rightEyeUpper0;

    [leftEye, rightEye].forEach(eyePoints => {
      ctx.beginPath();
      ctx.moveTo(eyePoints[0][0], eyePoints[0][1]);
      eyePoints.forEach(point => {
        ctx.lineTo(point[0], point[1]);
      });
      ctx.closePath();
      
      ctx.fillStyle = options.color;
      ctx.globalAlpha = options.opacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }
}
