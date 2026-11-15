"use client";

import React, { useEffect, useRef } from "react";

export type NeuralOrbState = "idle" | "typing" | "processing" | "generating" | "completed" | "error";

interface NeuralOrbMinimalProps {
  state?: NeuralOrbState;
  isDark?: boolean;
  className?: string;
  size?: number;
}

export default function NeuralOrbMinimal({
  state = "idle",
  isDark = true,
  className = "",
  size = 110,
}: NeuralOrbMinimalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isVisible = true;
    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    // 14 delicate ambient floating particles
    const particleCount = 14;
    const particles = Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / particleCount) * Math.PI * 2;
      const dist = 24 + (i % 3) * 10;
      return {
        baseAngle: angle,
        dist,
        speed: 0.4 + (i % 4) * 0.15,
        radius: 1 + (i % 3) * 0.5,
        phase: i * 0.7,
      };
    });

    let currentSpeed = 1.0;
    let targetSpeed = 1.0;

    const render = () => {
      if (!isVisible) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      // Dynamic animation speed by state
      switch (state) {
        case "typing":
          targetSpeed = 1.3;
          break;
        case "processing":
          targetSpeed = 2.0;
          break;
        case "generating":
          targetSpeed = 1.6;
          break;
        case "error":
          targetSpeed = 0.8;
          break;
        default:
          targetSpeed = 1.0;
      }

      currentSpeed += (targetSpeed - currentSpeed) * 0.05;
      const t = prefersReducedMotion ? 0 : elapsed * currentSpeed;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2 + Math.sin(t * 1.2) * 3; // gentle float

      // Palette configuration based on state & dark mode
      let primaryColor = isDark ? "rgba(99, 102, 241, " : "rgba(79, 70, 229, "; // indigo
      let secondaryColor = isDark ? "rgba(168, 85, 247, " : "rgba(147, 51, 234, "; // violet
      let highlightColor = isDark ? "rgba(56, 189, 248, " : "rgba(14, 165, 233, "; // sky

      if (state === "processing") {
        primaryColor = "rgba(14, 165, 233, ";
        secondaryColor = "rgba(99, 102, 241, ";
        highlightColor = "rgba(168, 85, 247, ";
      } else if (state === "generating") {
        primaryColor = "rgba(16, 185, 129, ";
        secondaryColor = "rgba(56, 189, 248, ";
        highlightColor = "rgba(99, 102, 241, ";
      } else if (state === "error") {
        primaryColor = "rgba(244, 63, 94, ";
        secondaryColor = "rgba(239, 68, 68, ";
        highlightColor = "rgba(251, 146, 60, ";
      }

      // 1. Soft Ambient Halo (Extremely gentle)
      const haloRadius = 42 + Math.sin(t * 1.5) * 3;
      const haloGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, haloRadius);
      haloGrad.addColorStop(0, primaryColor + (isDark ? "0.22)" : "0.15)"));
      haloGrad.addColorStop(0.5, secondaryColor + (isDark ? "0.10)" : "0.06)"));
      haloGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Translucent Fluid Core Sphere
      const coreRadius = 26 + Math.sin(t * 2) * 1.5;
      const coreGrad = ctx.createRadialGradient(
        cx - 6 + Math.cos(t * 0.8) * 3,
        cy - 6 + Math.sin(t * 0.8) * 3,
        2,
        cx,
        cy,
        coreRadius
      );
      coreGrad.addColorStop(0, highlightColor + (isDark ? "0.85)" : "0.75)"));
      coreGrad.addColorStop(0.35, primaryColor + (isDark ? "0.70)" : "0.60)"));
      coreGrad.addColorStop(0.75, secondaryColor + (isDark ? "0.50)" : "0.40)"));
      coreGrad.addColorStop(1, primaryColor + (isDark ? "0.15)" : "0.10)"));

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Subtle Inner Specular Sheen (Translucent Glass Effect)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.clip();

      const sheenGrad = ctx.createLinearGradient(
        cx - coreRadius,
        cy - coreRadius,
        cx + coreRadius,
        cy + coreRadius
      );
      sheenGrad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
      sheenGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.08)");
      sheenGrad.addColorStop(0.7, "rgba(255, 255, 255, 0)");
      sheenGrad.addColorStop(1, "rgba(255, 255, 255, 0.15)");

      ctx.fillStyle = sheenGrad;
      ctx.fillRect(cx - coreRadius, cy - coreRadius, coreRadius * 2, coreRadius * 2);

      // Generating wave distortion highlight
      if (state === "generating") {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let angle = 0; angle <= Math.PI * 2; angle += 0.1) {
          const waveR = coreRadius - 3 + Math.sin(angle * 6 + t * 4) * 1.5;
          const px = cx + Math.cos(angle) * waveR;
          const py = cy + Math.sin(angle) * waveR;
          if (angle === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      ctx.restore();

      // 4. Delicate Orbital Particles (Soft, non-distracting)
      particles.forEach((p) => {
        const curAngle = p.baseAngle + t * p.speed * 0.35;
        const curDist = p.dist + Math.sin(t * 1.5 + p.phase) * 3;
        const px = cx + Math.cos(curAngle) * curDist;
        const py = cy + Math.sin(curAngle) * (curDist * 0.75); // slight perspective flattening
        const alpha = 0.25 + (Math.sin(t * 2 + p.phase) + 1) * 0.25;

        ctx.fillStyle = isDark
          ? `rgba(224, 231, 255, ${alpha})`
          : `rgba(99, 102, 241, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [state, isDark, size]);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label="TATTVA AI Neural Intelligence Core"
      role="img"
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="pointer-events-none"
      />
    </div>
  );
}
