import { useEffect, useRef } from "react";
import type { DetectedObject } from "@/hooks/useObjectDetection";

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  detections: DetectedObject[];
  isActive: boolean;
}

export function CameraView({ videoRef, detections, isActive }: CameraViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    let animId: number;
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || !video.videoWidth) {
        animId = requestAnimationFrame(draw);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      detections.forEach((d) => {
        const [x, y, w, h] = d.bbox;
        const hue = d.panValue < -0.2 ? "200" : d.panValue > 0.2 ? "30" : "160";
        ctx.strokeStyle = `hsl(${hue}, 85%, 55%)`;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = `hsla(${hue}, 85%, 55%, 0.85)`;
        ctx.font = "bold 14px 'Space Grotesk', sans-serif";
        const label = `${d.class} ${Math.round(d.score * 100)}%`;
        const tw = ctx.measureText(label).width;
        ctx.fillRect(x, y - 22, tw + 10, 22);
        ctx.fillStyle = "hsl(220, 20%, 6%)";
        ctx.fillText(label, x + 5, y - 6);
      });

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [isActive, detections, videoRef]);

  return (
    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border-2 border-primary/30 shadow-glow">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-primary opacity-60 scan-line" />
      )}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80">
          <p className="text-muted-foreground text-lg font-display">Camera inactive</p>
        </div>
      )}
    </div>
  );
}
