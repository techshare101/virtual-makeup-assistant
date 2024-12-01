import { toast } from "@/components/ui/use-toast";

export interface WebcamOptions {
  width?: number;
  height?: number;
  facingMode?: "user" | "environment";
  frameRate?: number;
}

export class WebcamStream {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement;
  private isInitialized: boolean = false;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  async start(options: WebcamOptions = {}) {
    if (this.isInitialized) {
      return true;
    }

    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: options.width || 1280 },
        height: { ideal: options.height || 720 },
        facingMode: options.facingMode || "user",
        frameRate: { ideal: options.frameRate || 30 }
      }
    };

    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Your browser doesn't support webcam access");
      }

      // Request camera permissions
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Set up video element
      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();
      
      this.isInitialized = true;
      toast({
        title: "Camera Access Granted",
        description: "Your webcam has been successfully initialized.",
      });
      
      return true;
    } catch (error) {
      let errorMessage = "Failed to access webcam";
      
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          errorMessage = "Camera permission was denied. Please allow camera access to use this feature.";
        } else if (error.name === "NotFoundError") {
          errorMessage = "No camera detected. Please connect a camera and try again.";
        } else if (error.name === "NotReadableError") {
          errorMessage = "Camera is already in use by another application.";
        }
      }

      toast({
        variant: "destructive",
        title: "Camera Error",
        description: errorMessage,
      });

      console.error("Webcam error:", error);
      return false;
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        this.videoElement.srcObject = null;
      });
      this.stream = null;
      this.isInitialized = false;
    }
  }

  getVideoElement() {
    return this.videoElement;
  }

  isActive() {
    return this.isInitialized && !!this.stream;
  }

  async switchCamera() {
    const currentFacingMode = this.stream
      ?.getVideoTracks()[0]
      ?.getSettings()
      ?.facingMode;
    
    this.stop();
    
    return this.start({
      facingMode: currentFacingMode === "user" ? "environment" : "user"
    });
  }
}
