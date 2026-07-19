/**
 * True when the OS asks for reduced motion. SSR-safe: returns false when there
 * is no window/matchMedia so first render is stable. One-shot snapshot — for a
 * live-updating value use features/anim/useReducedMotion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
