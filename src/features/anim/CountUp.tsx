"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Rolls the displayed number from its previous value to `value` over ~600ms.
 * Reduced motion (or first render) shows the final value instantly.
 */
export function CountUp({
  value,
  className,
  durationMs = 600,
}: {
  value: number;
  className?: string;
  durationMs?: number;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const firstRef = useRef(true);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;

    if (firstRef.current || reduced || from === value) {
      firstRef.current = false;
      setDisplay(value);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced, durationMs]);

  return (
    <span className={className} data-testid="count-up">
      {display}
    </span>
  );
}
