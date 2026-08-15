"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

export function Waveform({
  stream = null,
  active = false,
  className,
  label = "Audio waveform",
}: {
  stream?: MediaStream | null;
  active?: boolean;
  className?: string;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let data: Uint8Array<ArrayBuffer> | null = null;
    let frame = 0;
    let width = 0;
    let height = 0;

    if (stream) {
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      data = new Uint8Array(analyser.frequencyBinCount);
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = (time: number) => {
      context.clearRect(0, 0, width, height);
      if (analyser && data) analyser.getByteFrequencyData(data);
      const bars = Math.max(18, Math.floor(width / 8));
      const gap = 3;
      const barWidth = Math.max(1.5, width / bars - gap);

      for (let index = 0; index < bars; index += 1) {
        const sourceIndex = Math.floor((index / bars) * (data?.length ?? bars));
        const measured = data?.[sourceIndex] ?? 0;
        const synthetic = active
          ? (Math.sin(time * 0.004 + index * 0.72) + 1) * 0.22 +
            (Math.sin(time * 0.0017 + index * 0.21) + 1) * 0.12
          : 0.045;
        const amplitude = data ? measured / 255 : synthetic;
        const envelope = Math.sin((index / Math.max(1, bars - 1)) * Math.PI) * 0.75 + 0.25;
        const barHeight = Math.max(2, amplitude * height * envelope);
        const x = index * (barWidth + gap);
        const y = (height - barHeight) / 2;
        const gradient = context.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, "rgba(255,240,181,.95)");
        gradient.addColorStop(0.55, "rgba(240,185,76,.74)");
        gradient.addColorStop(1, "rgba(138,90,18,.36)");
        context.fillStyle = gradient;
        context.beginPath();
        context.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        context.fill();
      }
      frame = window.requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    frame = window.requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      if (audioContext) void audioContext.close();
    };
  }, [active, stream]);

  return <canvas ref={canvasRef} className={cn("waveform", className)} role="img" aria-label={label} />;
}
