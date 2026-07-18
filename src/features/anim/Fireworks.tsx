"use client";

import { useMemo } from "react";
import { useOneShotBurst } from "./useOneShotBurst";

/**
 * Full-screen fireworks bursts (U6-FR4) — distinct from confetti. Bump `fire`
 * to launch a volley. Transform/opacity only; renders nothing under reduced
 * motion. Each burst = a ring of sparks radiating from a point.
 */

const COLORS = ["#ffd45e", "#ff6fae", "#8b5cff", "#43e6c8", "#5ee0ff", "#ffffff"];
const BURSTS = 5;
const SPARKS = 18;

interface Spark {
  id: number;
  cx: number; // burst center %, viewport
  cy: number;
  dx: number; // spark travel px
  dy: number;
  delay: number;
  color: string;
}

function build(seed: number): Spark[] {
  const sparks: Spark[] = [];
  for (let b = 0; b < BURSTS; b++) {
    const cx = 15 + ((seed * 7 + b * 29) % 70);
    const cy = 15 + ((seed * 13 + b * 17) % 55);
    const delay = b * 220;
    const radius = 90 + ((seed + b) % 60);
    for (let s = 0; s < SPARKS; s++) {
      const angle = (s / SPARKS) * Math.PI * 2;
      sparks.push({
        id: b * SPARKS + s,
        cx,
        cy,
        dx: Math.cos(angle) * radius,
        dy: Math.sin(angle) * radius,
        delay,
        color: COLORS[(b + s) % COLORS.length],
      });
    }
  }
  return sparks;
}

export function Fireworks({ fire }: { fire: number }) {
  const sparks = useMemo(() => build(fire), [fire]);
  const visible = useOneShotBurst(fire, 2200);

  if (!visible) return null;

  return (
    <div className="fireworks-layer" aria-hidden>
      {sparks.map((s) => (
        <span
          key={`${fire}-${s.id}`}
          className="firework-spark"
          style={
            {
              left: `${s.cx}%`,
              top: `${s.cy}%`,
              background: s.color,
              animationDelay: `${s.delay}ms`,
              "--fx": `${s.dx}px`,
              "--fy": `${s.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
