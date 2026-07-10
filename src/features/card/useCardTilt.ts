"use client";

import { useEffect, useRef, useCallback } from "react";
import { shouldAnimate } from "./rarity";

const MAX_TILT = 12; // degrees

/**
 * Tilt + holographic sheen from pointer and device orientation.
 * Writes CSS custom properties (no React re-render). No-op under reduced motion.
 */
export function useCardTilt(interactive: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const setVars = useCallback((rx: number, ry: number, mx: number, my: number) => {
    const el = ref.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
      el.style.setProperty("--mx", `${mx}%`);
      el.style.setProperty("--my", `${my}%`);
    });
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || !shouldAnimate()) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width; // 0..1
      const py = (e.clientY - r.top) / r.height;
      setVars(
        (0.5 - py) * MAX_TILT * 2,
        (px - 0.5) * MAX_TILT * 2,
        px * 100,
        py * 100,
      );
    },
    [interactive, setVars],
  );

  const onPointerLeave = useCallback(() => {
    setVars(0, 0, 50, 50);
  }, [setVars]);

  // Device orientation (mobile tilt).
  useEffect(() => {
    if (!interactive || !shouldAnimate()) return;
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;

    const handler = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // left/right [-90,90]
      const beta = e.beta ?? 0; // front/back
      const ry = Math.max(-MAX_TILT, Math.min(MAX_TILT, gamma / 4));
      const rx = Math.max(-MAX_TILT, Math.min(MAX_TILT, (beta - 45) / 4));
      setVars(rx, ry, 50 + gamma, 50 + (beta - 45));
    };

    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [interactive, setVars]);

  useEffect(() => {
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
