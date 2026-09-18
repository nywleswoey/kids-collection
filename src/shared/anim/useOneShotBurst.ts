"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Drives a one-shot animation burst. Bump `fire` (a counter or timestamp) to
 * trigger; the returned flag is true for `durationMs` then falls back to false.
 * Always false under reduced motion, so callers can render `null` when it is.
 */
export function useOneShotBurst(fire: number, durationMs: number): boolean {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!fire || reduced) return;
    setActive(true);
    const t = setTimeout(() => setActive(false), durationMs);
    return () => clearTimeout(t);
  }, [fire, reduced, durationMs]);

  return active && !reduced;
}
