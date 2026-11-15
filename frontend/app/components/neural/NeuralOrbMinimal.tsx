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
  size = 92,
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

    // 10 delicate, subtle ambient micro-particles
    const particleCount = 10;
    const particles = Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / particleCount) * Math.PI * 2;
      const dist = 18 + (i % 3) * 8;
      return {
        baseAngle: angle,
        dist,
        speed: 0.3 + (i % 3) * 0.12,
        radius: 0.8 + (i % 2) * 0.4,
        phase: i * 0.8,
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

      // Dynamic activity rate based on active state
      switch (state) {
        case "typing":
          targetSpeed = 1.25;
          break;
        case "processing":
          targetSpeed = 1.7;
          break;
        case "generating":
          targetSpeed = 1.45;
          break;
        case "error":
          targetSpeed = 0.7;
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
      const cy = size / 2 + Math.sin(t * 1.0) * 2; // extremely subtle floating

      // Elegant, restrained color palette
      let primaryColor = isDark ? "rgba(99, 102, 241, " : "rgba(79, 70, 229, "; // soft indigo
      let secondaryColor = isDark ? "rgba(147, 51, 234, " : "rgba(126, 34, 206, "; // soft violet
      let highlightColor = isDark ? "rgba(56, 189, 248, " : "rgba(14, 165, 233, "; // soft sky

      if (state === "processing") {
        primaryColor = "rgba(14, 165, 233, ";
        secondaryColor = "rgba(99, 102, 241, ";
        highlightColor = "rgba(147, 51, 234, ";
      } else if (state === "generating") {
        primaryColor = "rgba(16, 185, 129, ";
        secondaryColor = "rgba(56, 189, 248, ";
        highlightColor = "rgba(99, 102, 241, ";
      } else if (state === "error") {
        primaryColor = "rgba(244, 63, 94, ";
        secondaryColor = "rgba(239, 68, 68, ";
        highlightColor = "rgba(251, 146, 60, ";
      }

      // 1. Soft Ambient Halo (Less bright, soft & organic)
      const haloRadius = 34 + Math.sin(t * 1.3) * 2;
      const haloGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, haloRadius);
      haloGrad.addColorStop(0, primaryColor + (isDark ? "0.15)" : "0.10)"));
      haloGrad.addColorStop(0.6, secondaryColor + (isDark ? "0.06)" : "0.04)"));
      haloGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Translucent Fluid Core Sphere (Subtle fluid glass)
      const coreRadius = 20 + Math.sin(t * 1.6) * 1.2;
      const coreGrad = ctx.createRadialGradient(
        cx - 4 + Math.cos(t * 0.7) * 2.5,
        cy - 4 + Math.sin(t * 0.7) * 2.5,
        1.5,
        cx,
        cy,
        coreRadius
      );
      coreGrad.addColorStop(0, highlightColor + (isDark ? "0.75)" : "0.65)"));
      coreGrad.addColorStop(0.4, primaryColor + (isDark ? "0.55)" : "0.45)"));
      coreGrad.addColorStop(0.8, secondaryColor + (isDark ? "0.35)" : "0.28)"));
      coreGrad.addColorStop(1, primaryColor + (isDark ? "0.12)" : "0.08)"));

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Subtle Inner Specular Reflection
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.clip();

      const sheenGrad = ctx.createLinearGradient(
        cx - coreRadius,
        cy - coreRadius,
        cx + coreRadius * 0.5,
        cy + coreRadius * 0.5
      );
      sheenGrad.addColorStop(0, isDark ? "rgba(255, 255, 255, 0.32)" : "rgba(255, 255, 255, 0.45)");
      sheenGrad.addColorStop(0.4, "rgba(255, 255, 255, 0.08)");
      sheenGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = sheenGrad;
      ctx.beginPath();
      ctx.ellipse(
        cx - 2 + Math.cos(t * 0.6) * 1.5,
        cy - 4 + Math.sin(t * 0.6) * 1.5,
        coreRadius * 0.75,
        coreRadius * 0.4,
        -Math.PI / 5,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      // 4. Delicate Ambient Orbital Micro-Particles
      particles.forEach((p) => {
        const curAngle = p.baseAngle + t * p.speed * 0.5;
        const curDist = p.dist + Math.sin(t * 1.2 + p.phase) * 2;
        const px = cx + Math.cos(curAngle) * curDist;
        const py = cy + Math.sin(curAngle) * curDist * 0.65; // subtle isometric tilt
        const pAlpha = 0.35 + Math.sin(t * 2 + p.phase) * 0.2;

        ctx.fillStyle = highlightColor + (isDark ? `${pAlpha})` : `${pAlpha * 0.85})`);
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [state, isDark, size]);

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`TATTVA AI Neural Core state: ${state}`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="pointer-events-none"
      />
    </div>
  );
}
