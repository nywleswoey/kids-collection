"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Periodic asteroid that streaks across the play-area backdrop (Increment 3).
 * One at a time, every ~8–15s, purely decorative (behind content, aria-hidden,
 * non-interactive). Disabled under prefers-reduced-motion; SSR-safe (renders
 * nothing until mounted). Self-cleans all timers on unmount.
 */

const MIN_GAP_MS = 8_000;
const MAX_GAP_MS = 15_000;
const FLIGHT_MS = 1_500; // must match asteroid-streak keyframe pacing

interface Streak {
  id: number;
  top: number; // vh start offset, %
}

export function Asteroids({ trigger }: { trigger?: number } = {}) {
  const reduced = useReducedMotion();
  const [streak, setStreak] = useState<Streak | null>(null);

  useEffect(() => {
    if (reduced) {
      setStreak(null);
      return;
    }

    let nextId = 0;
    let flightTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      const gap = MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS);
      return setTimeout(fire, gap);
    };

    function fire() {
      setStreak({ id: nextId++, top: 4 + Math.random() * 46 });
      flightTimer = setTimeout(() => {
        setStreak(null);
        gapTimer = scheduleNext();
      }, FLIGHT_MS);
    }

    let gapTimer = scheduleNext();

    return () => {
      clearTimeout(gapTimer);
      if (flightTimer) clearTimeout(flightTimer);
    };
  }, [reduced]);

  // On-demand streak when `trigger` changes (admin effect panel, U4-FR3).
  useEffect(() => {
    if (!trigger || reduced) return;
    setStreak({ id: 1_000_000 + trigger, top: 4 + Math.random() * 46 });
    const t = setTimeout(() => setStreak(null), FLIGHT_MS);
    return () => clearTimeout(t);
  }, [trigger, reduced]);

  if (!streak) return null;

  return (
    <div className="asteroid-layer" aria-hidden>
      <span
        key={streak.id}
        className="asteroid"
        style={{ top: `${streak.top}%`, animationDuration: `${FLIGHT_MS}ms` }}
      >
        ☄️
      </span>
    </div>
  );
}
