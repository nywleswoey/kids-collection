"use client";

import { useMemo } from "react";
import { useOneShotBurst } from "./useOneShotBurst";

const COLORS = ["#43e6c8", "#ffd45e", "#ff6ba6", "#8b7bff", "#5ee0ff"];
const MAX_PARTICLES = 80;

interface Particle {
  id: number;
  left: number;
  drift: number;
  delay: number;
  duration: number;
  rotate: number;
  color: string;
  size: number;
}

function build(count: number, seed: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    // Cheap deterministic spread per burst so bursts vary without Math.random reliance.
    const r = (n: number) => ((Math.sin((seed + 1) * (i + 1) * n) + 1) / 2);
    return {
      id: seed * 1000 + i,
      left: r(12.9) * 100,
      drift: (r(4.7) - 0.5) * 160,
      delay: r(7.3) * 120,
      duration: 900 + r(2.1) * 700,
      rotate: r(9.1) * 720,
      color: COLORS[i % COLORS.length],
      size: 6 + r(3.3) * 8,
    };
  });
}

/**
 * One-shot confetti burst. Bump `fire` (e.g. a counter or timestamp) to trigger;
 * `count` scales the burst (capped). Renders nothing under reduced motion.
 */
export function Confetti({ fire, count = 60 }: { fire: number; count?: number }) {
  const n = Math.min(MAX_PARTICLES, Math.max(0, count));
  const particles = useMemo(() => build(n, fire), [n, fire]);
  const visible = useOneShotBurst(fire, 1800);

  if (!visible) return null;

  return (
    <div className="confetti-layer" aria-hidden data-testid="confetti">
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              width: `${p.size}px`,
              height: `${p.size * 0.5}px`,
              "--drift": `${p.drift}px`,
              "--rot": `${p.rotate}deg`,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
