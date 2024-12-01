import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { WebcamStream } from '../lib/webcam';
import { MakeupProcessor, type MakeupOptions } from '../lib/makeup';

interface Props {
  makeupOptions: MakeupOptions;
}

export function WebcamView({ makeupOptions }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    if (!videoElement || !canvasElement) return;

    const webcam = new WebcamStream(videoElement);
    const makeupProcessor = new MakeupProcessor();
    let animationFrame: number;

    const init = async () => {
      await webcam.start();
      await makeupProcessor.initialize();
      
      const processFrame = async () => {
        const processedCanvas = await makeupProcessor.applyMakeup(
          videoElement,
          makeupOptions
        );
        
        if (processedCanvas) {
          const ctx = canvasElement.getContext('2d');
          ctx?.drawImage(processedCanvas, 0, 0);
        }
        
        animationFrame = requestAnimationFrame(processFrame);
      };
      
      processFrame();
    };

    init();

    return () => {
      cancelAnimationFrame(animationFrame);
      webcam.stop();
    };
  }, [makeupOptions]);

  return (
    <Card className="relative aspect-video">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width={1280}
        height={720}
      />
    </Card>
  );
}
