import { useState, useRef, useCallback, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

export interface DetectedObject {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  panValue: number; // -1 (left) to 1 (right)
}

export function useObjectDetection() {
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [detections, setDetections] = useState<DetectedObject[]>([]);

  const loadModel = useCallback(async () => {
    if (modelRef.current) return;
    setIsLoading(true);
    try {
      await tf.ready();
      modelRef.current = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      setIsReady(true);
    } catch (err) {
      console.error("Failed to load detection model:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const detect = useCallback(
    async (video: HTMLVideoElement): Promise<DetectedObject[]> => {
      if (!modelRef.current || !video.videoWidth) return [];
      const predictions = await modelRef.current.detect(video, 10, 0.4);
      const width = video.videoWidth;
      const results: DetectedObject[] = predictions.map((p) => {
        const centerX = p.bbox[0] + p.bbox[2] / 2;
        const panValue = (centerX / width) * 2 - 1; // -1 left, 1 right
        return {
          class: p.class,
          score: p.score,
          bbox: p.bbox as [number, number, number, number],
          panValue,
        };
      });
      setDetections(results);
      return results;
    },
    []
  );

  useEffect(() => {
    return () => {
      modelRef.current = null;
    };
  }, []);

  return { isLoading, isReady, detections, loadModel, detect };
}
