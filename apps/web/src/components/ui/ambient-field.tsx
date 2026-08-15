"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

export function AmbientField({ density = 26 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let particles: Particle[] = [];

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(density, Math.max(8, Math.floor((width * height) / 42_000)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: (index * 83.47) % Math.max(width, 1),
        y: (index * 47.13) % Math.max(height, 1),
        vx: 0.025 + (index % 4) * 0.008,
        vy: Math.sin(index * 1.7) * 0.012,
        radius: index % 7 === 0 ? 1.2 : 0.65,
        alpha: 0.08 + (index % 5) * 0.018,
      }));
    };

    const drawFlowLines = (time: number) => {
      const lineCount = width < 720 ? 3 : 5;
      for (let line = 0; line < lineCount; line += 1) {
        context.beginPath();
        for (let x = -40; x <= width + 40; x += 20) {
          const base = height * (0.24 + line * 0.13);
          const y = base + Math.sin(x * 0.006 + time * 0.00012 + line * 0.8) * (20 + line * 3);
          if (x === -40) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.strokeStyle = `rgba(240,185,76,${0.025 + line * 0.006})`;
        context.lineWidth = line === 2 ? 0.8 : 0.55;
        context.stroke();
      }
    };

    const render = (time: number) => {
      context.clearRect(0, 0, width, height);
      drawFlowLines(time);
      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x > width + 4) particle.x = -4;
        if (particle.y > height + 4) particle.y = -4;
        if (particle.y < -4) particle.y = height + 4;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(255,217,118,${particle.alpha})`;
        context.fill();
      }
      if (visible) frame = window.requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible && !frame) frame = window.requestAnimationFrame(render);
      if (!visible && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    resize();
    frame = window.requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [density]);

  return <canvas ref={canvasRef} className="ambient-canvas" aria-hidden="true" />;
}
