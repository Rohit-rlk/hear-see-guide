import { useRef, useCallback, useEffect } from "react";

export function useSpatialAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef<Map<string, number>>(new Map());
  const cooldownMs = 1500;

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const playBeep = useCallback(
    (pan: number, label: string) => {
      const now = Date.now();
      const last = lastPlayedRef.current.get(label) ?? 0;
      if (now - last < cooldownMs) return;
      lastPlayedRef.current.set(label, now);

      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();

      osc.frequency.value = 440 + Math.abs(pan) * 200;
      osc.type = "sine";
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(panner).connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    },
    [getCtx]
  );

  const speak = useCallback(
    (text: string, pan?: number) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    },
    []
  );

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  return { playBeep, speak, getCtx };
}
