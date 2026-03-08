import { Eye, Wifi, Volume2 } from "lucide-react";

interface StatusBarProps {
  cameraActive: boolean;
  modelReady: boolean;
  modelLoading: boolean;
  detectionCount: number;
}

export function StatusBar({ cameraActive, modelReady, modelLoading, detectionCount }: StatusBarProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${cameraActive ? "bg-primary shadow-glow" : "bg-muted-foreground"}`} />
        <span className="text-sm text-secondary-foreground font-mono">CAM</span>
      </div>
      <div className="flex items-center gap-2">
        <Eye className={`w-4 h-4 ${modelReady ? "text-primary" : "text-muted-foreground"}`} />
        <span className="text-sm text-secondary-foreground font-mono">
          {modelLoading ? "LOADING…" : modelReady ? "READY" : "OFF"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-accent" />
        <span className="text-sm text-secondary-foreground font-mono">{detectionCount} OBJ</span>
      </div>
    </div>
  );
}
