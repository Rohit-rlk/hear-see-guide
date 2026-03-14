import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, Volume2, VolumeX } from "lucide-react";
import { CameraView } from "@/components/CameraView";
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
  const [isInitializing, setIsInitializing] = useState(false);
  const loopRef = useRef<number | null>(null);
  const describeIntervalRef = useRef<number | null>(null);
  const isDescribingRef = useRef(false);
  const audioEnabledRef = useRef(true);

  useEffect(() => { isDescribingRef.current = isDescribing; }, [isDescribing]);
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);

  const frameCountRef = useRef(0);
  const runDetection = useCallback(async () => {
    if (!videoRef.current || !modelReady) return;
    frameCountRef.current++;
    if (frameCountRef.current % 3 === 0) {
      const results = await detect(videoRef.current);
      if (audioEnabledRef.current && results.length > 0) {
        const largest = results.reduce((a, b) => (a.bbox[2] * a.bbox[3] > b.bbox[2] * b.bbox[3] ? a : b));
        playBeep(largest.panValue, largest.class);
      }
    }
    loopRef.current = requestAnimationFrame(runDetection);
  }, [videoRef, modelReady, detect, playBeep]);

  const doDescribe = useCallback(async () => {
    if (isDescribingRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    const frame = captureFrame();
    if (!frame) return;
    const text = await describe(frame);
    if (audioEnabledRef.current) speak(text);
  }, [captureFrame, describe, speak, videoRef]);

  // Start detection loop when ready
  useEffect(() => {
    if (isRunning && cameraActive && modelReady) {
      loopRef.current = requestAnimationFrame(runDetection);
    }
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [isRunning, cameraActive, modelReady, runDetection]);

  // Start auto-describe interval when running
  useEffect(() => {
    if (isRunning && cameraActive) {
      const startTimeout = setTimeout(() => doDescribe(), 3000);
      describeIntervalRef.current = window.setInterval(doDescribe, 15000);
      return () => {
        clearTimeout(startTimeout);
        if (describeIntervalRef.current) clearInterval(describeIntervalRef.current);
      };
    }
    return () => {
      if (describeIntervalRef.current) clearInterval(describeIntervalRef.current);
    };
  }, [isRunning, cameraActive, doDescribe]);

  // CRITICAL: getUserMedia called directly in click handler for browser security
  const handleStart = async () => {
    if (isRunning || modelLoading || isInitializing) return;
    setIsInitializing(true);
    try {
      await startCamera();
      await loadModel();
      setIsRunning(true);
      speak("Third Eye activated. Scanning environment.");
    } catch (err) {
      console.error("Failed to start:", err);
      toast({ title: "Error", description: "Failed to start camera. Please allow camera permissions.", variant: "destructive" });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleStop = useCallback(() => {
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
    if (describeIntervalRef.current) {
      clearInterval(describeIntervalRef.current);
      describeIntervalRef.current = null;
    }
    stopCamera();
    setIsRunning(false);
    speak("Third Eye deactivated");
  }, [stopCamera, speak]);

  useEffect(() => {
    if (cameraError) {
      toast({ title: "Camera Error", description: cameraError, variant: "destructive" });
    }
  }, [cameraError, toast]);

  // Splash screen
  if (!isRunning) {
    return (
      <div
        className="min-h-screen bg-background flex flex-col items-center justify-center px-6 select-none"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow-strong mb-8">
          <Eye className="w-10 h-10 text-primary-foreground" />
        </div>

        <h1 className="text-4xl font-display font-bold text-foreground tracking-wider mb-2">
          THIRD EYE
        </h1>
        <p className="text-muted-foreground text-lg mb-16">Vision Assistant</p>

        <div className="relative">
          <button
            onClick={handleStart}
            disabled={isInitializing || modelLoading}
            aria-label="Start Third Eye"
            className={`w-48 h-48 rounded-full flex items-center justify-center shadow-glow-strong pulse-ring cursor-pointer border-none ${isInitializing ? 'bg-muted' : 'bg-primary'}`}
          >
            {isInitializing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-display font-bold text-primary tracking-widest">INITIALIZING</span>
              </div>
            ) : (
              <span className="text-2xl font-display font-bold text-primary-foreground tracking-widest">
                {modelLoading ? "LOADING…" : "START"}
              </span>
            )}
          </button>
        </div>

        <p className="text-muted-foreground mt-10 text-sm">Tap the button to detect objects</p>
      </div>
    );
  }

  // Active scanning view
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
            <Eye className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-display font-bold text-foreground">Third Eye</h1>
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAudioEnabled(!audioEnabled);
              speak(audioEnabled ? "Audio muted" : "Audio enabled");
            }}
            className="p-2 rounded-lg bg-secondary text-secondary-foreground"
            aria-label={audioEnabled ? "Mute" : "Unmute"}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStop();
            }}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-display font-bold text-sm"
            aria-label="Stop scanning"
          >
            STOP
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 flex flex-col gap-3 max-w-2xl mx-auto w-full">
        <CameraView videoRef={videoRef} detections={detections} isActive={cameraActive} />

        {detections.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-3">
            <h2 className="text-xs font-mono text-muted-foreground mb-2">DETECTED OBJECTS</h2>
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

        {isDescribing && !description && (
          <div className="bg-card rounded-lg border border-accent/30 p-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div>
              <h2 className="text-xs font-mono text-accent mb-1">ENVIRONMENT</h2>
              <p className="text-muted-foreground text-sm">Analyzing surroundings…</p>
            </div>
          </div>
        )}

        {description && (
          <div className="bg-card rounded-lg border border-accent/30 p-4">
            <h2 className="text-xs font-mono text-accent mb-2">ENVIRONMENT</h2>
            <p className="text-secondary-foreground text-sm leading-relaxed">
              {isDescribing ? "Updating…" : description}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
