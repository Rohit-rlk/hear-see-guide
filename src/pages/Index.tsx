import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, Power, Mic, Volume2, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraView } from "@/components/CameraView";
import { StatusBar } from "@/components/StatusBar";
import { useCamera } from "@/hooks/useCamera";
import { useObjectDetection } from "@/hooks/useObjectDetection";
import { useSpatialAudio } from "@/hooks/useSpatialAudio";
import { useDescribeEnvironment } from "@/hooks/useDescribeEnvironment";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  const { videoRef, isActive: cameraActive, error: cameraError, start: startCamera, stop: stopCamera, captureFrame } = useCamera();
  const { isLoading: modelLoading, isReady: modelReady, detections, loadModel, detect } = useObjectDetection();
  const { playBeep, speak } = useSpatialAudio();
  const { isDescribing, description, describe } = useDescribeEnvironment();
  const [isRunning, setIsRunning] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const loopRef = useRef<number | null>(null);

  // Detection loop
  const runDetection = useCallback(async () => {
    if (!videoRef.current || !modelReady) return;
    const results = await detect(videoRef.current);
    if (audioEnabled && results.length > 0) {
      // Play spatial beep for closest/largest object
      const largest = results.reduce((a, b) => (a.bbox[2] * a.bbox[3] > b.bbox[2] * b.bbox[3] ? a : b));
      playBeep(largest.panValue, largest.class);
    }
    loopRef.current = requestAnimationFrame(runDetection);
  }, [videoRef, modelReady, detect, audioEnabled, playBeep]);

  useEffect(() => {
    if (isRunning && cameraActive && modelReady) {
      loopRef.current = requestAnimationFrame(runDetection);
    }
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [isRunning, cameraActive, modelReady, runDetection]);

  const handleToggle = async () => {
    if (isRunning) {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
      stopCamera();
      setIsRunning(false);
      speak("Third Eye deactivated");
    } else {
      await startCamera();
      await loadModel();
      setIsRunning(true);
      speak("Third Eye activated. Scanning environment.");
    }
  };

  const handleDescribe = async () => {
    if (!cameraActive) {
      toast({ title: "Camera not active", description: "Start the camera first.", variant: "destructive" });
      return;
    }
    const frame = captureFrame();
    if (!frame) return;
    speak("Analyzing environment…");
    const text = await describe(frame);
    speak(text);
  };

  useEffect(() => {
    if (cameraError) {
      toast({ title: "Camera Error", description: cameraError, variant: "destructive" });
    }
  }, [cameraError, toast]);

  return (
    <div className="min-h-screen bg-gradient-surface flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
            <Eye className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground tracking-tight">Third-Eye</h1>
            <p className="text-xs text-muted-foreground font-mono">Spatial Awareness Assistant</p>
          </div>
        </div>
        <StatusBar
          cameraActive={cameraActive}
          modelReady={modelReady}
          modelLoading={modelLoading}
          detectionCount={detections.length}
        />
      </header>

      {/* Camera Feed */}
      <main className="flex-1 px-4 py-4 flex flex-col gap-4 max-w-2xl mx-auto w-full">
        <CameraView videoRef={videoRef} detections={detections} isActive={cameraActive} />

        {/* Detection List */}
        {detections.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-3">
            <h2 className="text-sm font-mono text-muted-foreground mb-2">DETECTED OBJECTS</h2>
            <div className="flex flex-wrap gap-2">
              {detections.map((d, i) => (
                <span
                  key={`${d.class}-${i}`}
                  className="px-3 py-1 rounded-full text-sm font-display font-medium bg-primary/15 text-primary border border-primary/30"
                >
                  {d.class} · {Math.round(d.score * 100)}%
                  <span className="ml-1 text-xs text-muted-foreground">
                    {d.panValue < -0.3 ? "← L" : d.panValue > 0.3 ? "R →" : "↑ C"}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="bg-card rounded-lg border border-accent/30 p-4">
            <h2 className="text-sm font-mono text-accent mb-2 flex items-center gap-2">
              <Scan className="w-4 h-4" /> ENVIRONMENT DESCRIPTION
            </h2>
            <p className="text-secondary-foreground text-sm leading-relaxed">{description}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3 mt-auto pb-6">
          <Button
            onClick={handleToggle}
            className={`flex-1 h-16 text-lg font-display font-semibold rounded-xl transition-all ${
              isRunning
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                : "bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
            }`}
            aria-label={isRunning ? "Stop scanning" : "Start scanning"}
          >
            <Power className="w-6 h-6 mr-2" />
            {isRunning ? "Stop" : "Start Scanning"}
          </Button>

          <Button
            onClick={handleDescribe}
            disabled={!cameraActive || isDescribing}
            className="h-16 px-6 text-lg font-display font-semibold rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground disabled:opacity-40"
            aria-label="Describe environment"
          >
            <Mic className="w-6 h-6 mr-2" />
            {isDescribing ? "…" : "Describe"}
          </Button>

          <Button
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              speak(audioEnabled ? "Audio muted" : "Audio enabled");
            }}
            className={`h-16 w-16 rounded-xl ${
              audioEnabled
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            aria-label={audioEnabled ? "Mute audio" : "Enable audio"}
          >
            <Volume2 className="w-6 h-6" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Index;
