"use client";

import React, { useEffect, useRef, useState } from "react";

export type NeuralCoreState = "idle" | "typing" | "processing" | "generating" | "completed" | "error";

interface NeuralCore3DProps {
  state?: NeuralCoreState;
  size?: number;
  className?: string;
  onClick?: () => void;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  alpha: number;
  color: string;
}

interface RingNode {
  angle: number;
  speed: number;
  radius: number;
  tiltX: number;
  tiltY: number;
  size: number;
  color: string;
}

export default function NeuralCore3D({
  state = "idle",
  size = 280,
  className = "",
  onClick,
}: NeuralCore3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  useEffect(() => {
    // Check user preference for reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleMotionChange);
    return () => mediaQuery.removeEventListener("change", handleMotionChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;
    let time = 0;

    // Handle high DPI displays
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Color definitions based on state
    const getColorScheme = () => {
      switch (state) {
        case "error":
          return {
            coreStart: "rgba(244, 63, 94, 0.95)",
            coreMid: "rgba(239, 68, 68, 0.65)",
            coreEnd: "rgba(159, 18, 57, 0.1)",
            ring1: "rgba(244, 63, 94, 0.75)",
            ring2: "rgba(251, 146, 60, 0.65)",
            ring3: "rgba(239, 68, 68, 0.55)",
            node: "#f43f5e",
            glow: "rgba(244, 63, 94, 0.4)",
          };
        case "processing":
          return {
            coreStart: "rgba(6, 182, 212, 0.95)",
            coreMid: "rgba(59, 130, 246, 0.7)",
            coreEnd: "rgba(147, 51, 234, 0.15)",
            ring1: "rgba(6, 182, 212, 0.9)",
            ring2: "rgba(14, 165, 233, 0.8)",
            ring3: "rgba(139, 92, 246, 0.7)",
            node: "#06b6d4",
            glow: "rgba(6, 182, 212, 0.5)",
          };
        case "generating":
          return {
            coreStart: "rgba(168, 85, 247, 0.95)",
            coreMid: "rgba(99, 102, 241, 0.75)",
            coreEnd: "rgba(6, 182, 212, 0.2)",
            ring1: "rgba(168, 85, 247, 0.9)",
            ring2: "rgba(6, 182, 212, 0.85)",
            ring3: "rgba(99, 102, 241, 0.75)",
            node: "#c084fc",
            glow: "rgba(168, 85, 247, 0.55)",
          };
        case "typing":
          return {
            coreStart: "rgba(139, 92, 246, 0.9)",
            coreMid: "rgba(99, 102, 241, 0.6)",
            coreEnd: "rgba(6, 182, 212, 0.1)",
            ring1: "rgba(139, 92, 246, 0.75)",
            ring2: "rgba(6, 182, 212, 0.65)",
            ring3: "rgba(99, 102, 241, 0.55)",
            node: "#a78bfa",
            glow: "rgba(139, 92, 246, 0.35)",
          };
        default: // idle / completed
          return {
            coreStart: "rgba(129, 140, 248, 0.85)",
            coreMid: "rgba(168, 85, 247, 0.55)",
            coreEnd: "rgba(6, 182, 212, 0.1)",
            ring1: "rgba(129, 140, 248, 0.65)",
            ring2: "rgba(6, 182, 212, 0.5)",
            ring3: "rgba(192, 132, 252, 0.45)",
            node: "#818cf8",
            glow: "rgba(129, 140, 248, 0.3)",
          };
      }
    };

    // State-based speed multiplier
    const getSpeedMultiplier = () => {
      switch (state) {
        case "processing":
          return 2.8;
        case "generating":
          return 2.2;
        case "typing":
          return 1.4;
        case "error":
          return 0.8;
        default:
          return 1.0;
      }
    };

    // 1. Generate 3D Particle Constellation
    const particleCount = 48;
    const particles: Particle3D[] = [];
    const colors = ["#818cf8", "#06b6d4", "#c084fc", "#38bdf8", "#a855f7"];
    for (let i = 0; i < particleCount; i++) {
      const radius = 40 + Math.random() * 75;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      particles.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.4,
        size: 1.2 + Math.random() * 2.2,
        alpha: 0.3 + Math.random() * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // 2. Generate 3 Orbital Rings
    const rings: RingNode[] = [
      { angle: 0, speed: 0.016, radius: 82, tiltX: 1.15, tiltY: 0.35, size: 4.5, color: "#818cf8" },
      { angle: Math.PI / 3, speed: -0.013, radius: 96, tiltX: -0.85, tiltY: 0.75, size: 3.8, color: "#06b6d4" },
      { angle: (Math.PI * 2) / 3, speed: 0.021, radius: 110, tiltX: 0.45, tiltY: -1.05, size: 3.2, color: "#c084fc" },
    ];

    // Energy wave pulses for generating state
    const energyPulses: { radius: number; maxRadius: number; alpha: number }[] = [];

    // Pause when document is hidden
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Mouse tracking for 3D parallax
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      mouseRef.current.targetX = relX * 0.6;
      mouseRef.current.targetY = relY * 0.6;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 3D Projection functions
    const project = (x: number, y: number, z: number, rotX: number, rotY: number) => {
      // Rotate around Y axis
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = x * cosY - z * sinY;
      const z1 = z * cosY + x * sinY;

      // Rotate around X axis
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = z1 * cosX + y * sinX;

      const fov = 260;
      const scale = fov / (fov + z2);
      const cx = size / 2;
      const cy = size / 2;

      return {
        x: cx + x1 * scale,
        y: cy + y2 * scale,
        scale,
        depth: z2,
      };
    };

    // Main 60 FPS Render Loop
    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const speedMult = reducedMotion ? 0.2 : getSpeedMultiplier();
      time += 0.016 * speedMult;

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const rotY = time * 0.5 + mouseRef.current.x;
      const rotX = Math.sin(time * 0.3) * 0.2 + mouseRef.current.y;

      const colors = getColorScheme();
      const cx = size / 2;
      const cy = size / 2;

      ctx.clearRect(0, 0, size, size);

      // --- 1. Background Ambient Glow Aura ---
      const auraGradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, size * 0.48);
      auraGradient.addColorStop(0, colors.glow);
      auraGradient.addColorStop(0.5, "rgba(99, 102, 241, 0.08)");
      auraGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
      ctx.fill();

      // --- 2. Energy Waves (Generating State) ---
      if (state === "generating" && !reducedMotion) {
        if (Math.random() < 0.08) {
          energyPulses.push({ radius: 25, maxRadius: size * 0.45, alpha: 0.8 });
        }
      }

      for (let i = energyPulses.length - 1; i >= 0; i--) {
        const pulse = energyPulses[i];
        pulse.radius += 1.8 * speedMult;
        pulse.alpha -= 0.015 * speedMult;

        if (pulse.alpha <= 0 || pulse.radius >= pulse.maxRadius) {
          energyPulses.splice(i, 1);
          continue;
        }

        ctx.strokeStyle = `rgba(168, 85, 247, ${pulse.alpha * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, pulse.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // --- 3. 3D Orbital Rings ---
      rings.forEach((ring, index) => {
        ring.angle += ring.speed * speedMult;

        ctx.save();
        ctx.beginPath();
        const segments = 64;
        let first = true;

        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          // Elliptical coordinate in 3D
          const rx = Math.cos(theta) * ring.radius;
          const ry = Math.sin(theta) * ring.radius * Math.cos(ring.tiltX);
          const rz = Math.sin(theta) * ring.radius * Math.sin(ring.tiltX);

          const p = project(rx, ry, rz, rotX + ring.tiltY, rotY);

          if (first) {
            ctx.moveTo(p.x, p.y);
            first = false;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }

        ctx.closePath();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = index === 0 ? colors.ring1 : index === 1 ? colors.ring2 : colors.ring3;
        ctx.stroke();

        // Draw orbital node traveling along this ring
        const nodeX = Math.cos(ring.angle) * ring.radius;
        const nodeY = Math.sin(ring.angle) * ring.radius * Math.cos(ring.tiltX);
        const nodeZ = Math.sin(ring.angle) * ring.radius * Math.sin(ring.tiltX);
        const nodeP = project(nodeX, nodeY, nodeZ, rotX + ring.tiltY, rotY);

        // Halo around node
        const nodeHalo = ctx.createRadialGradient(nodeP.x, nodeP.y, 0, nodeP.x, nodeP.y, ring.size * 3 * nodeP.scale);
        nodeHalo.addColorStop(0, colors.node);
        nodeHalo.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = nodeHalo;
        ctx.beginPath();
        ctx.arc(nodeP.x, nodeP.y, ring.size * 3 * nodeP.scale, 0, Math.PI * 2);
        ctx.fill();

        // Core of node
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(nodeP.x, nodeP.y, Math.max(1.5, ring.size * nodeP.scale), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // --- 4. Central Spherical Neural Core ---
      // Breathing scale oscillation
      const breathing = Math.sin(time * 2) * 2.5;
      const coreRadius = Math.max(18, 30 + breathing);

      const coreGradient = ctx.createRadialGradient(
        cx - coreRadius * 0.25,
        cy - coreRadius * 0.25,
        coreRadius * 0.1,
        cx,
        cy,
        coreRadius
      );
      coreGradient.addColorStop(0, "#ffffff");
      coreGradient.addColorStop(0.25, colors.coreStart);
      coreGradient.addColorStop(0.65, colors.coreMid);
      coreGradient.addColorStop(1, colors.coreEnd);

      ctx.save();
      ctx.shadowColor = colors.node;
      ctx.shadowBlur = 24;
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- 5. 3D Floating Particles & Synapse Lines ---
      // Sort particles by depth for correct depth ordering
      const projectedParticles = particles.map((p) => {
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;
        p.z += p.vz * speedMult;

        // Boundary reflection
        const maxDist = 95;
        const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        if (dist > maxDist) {
          p.vx *= -1;
          p.vy *= -1;
          p.vz *= -1;
        }

        const proj = project(p.x, p.y, p.z, rotX, rotY);
        return {
          ...p,
          projX: proj.x,
          projY: proj.y,
          scale: proj.scale,
          depth: proj.depth,
        };
      });

      // Connect nearby particles with subtle synaptic lines
      ctx.lineWidth = 0.6;
      for (let i = 0; i < projectedParticles.length; i++) {
        for (let j = i + 1; j < projectedParticles.length; j++) {
          const p1 = projectedParticles[i];
          const p2 = projectedParticles[j];
          const dx = p1.projX - p2.projX;
          const dy = p1.projY - p2.projY;
          const screenDist = Math.sqrt(dx * dx + dy * dy);

          if (screenDist < 36) {
            const lineAlpha = (1 - screenDist / 36) * 0.35 * Math.min(p1.scale, p2.scale);
            ctx.strokeStyle = `rgba(147, 197, 253, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.projX, p1.projY);
            ctx.lineTo(p2.projX, p2.projY);
            ctx.stroke();
          }
        }
      }

      // Draw particle points
      projectedParticles.forEach((p) => {
        const renderSize = Math.max(0.8, p.size * p.scale);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * Math.min(1, Math.max(0.2, p.scale));
        ctx.beginPath();
        ctx.arc(p.projX, p.projY, renderSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [state, size, reducedMotion]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`TATTVA AI Neural Core 3D (${state} state)`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="pointer-events-none transition-transform duration-500 ease-out"
      />
    </div>
  );
}
