/**
 * Pure scheduling/sizing facts for the pre-reveal slot-machine (CardRoulette),
 * extracted so they're shared between the animation and the background
 * prefetcher without duplicating magic numbers, and so they're unit-testable
 * without rendering.
 */

/** Total spin duration (FR1). */
export const FLASH_DURATION_MS = 2500;

/** Smaller square size used for spin flashes — next.config.ts's `imageSizes`
 *  allowlist (128/256/512); full 512 is reserved for the reveal card. */
export const FLASH_DIM = 256;

/**
 * Ease-out frame schedule: many fast frames up front, decelerating to the
 * finale. Each entry is the delay (ms) before that frame shows; the last
 * entry lands on the final card rather than another pool flash.
 */
export function buildFlashDelays(durationMs: number = FLASH_DURATION_MS): number[] {
  const delays: number[] = [];
  let t = 0;
  let d = 55;
  while (t < durationMs) {
    delays.push(d);
    t += d;
    d = Math.min(300, d * 1.14); // grow the gap → visual deceleration
  }
  return delays;
}

/** Number of pool frames a spin actually flashes before landing: the initial
 *  frame plus one per schedule entry except the last, which reveals the final
 *  card instead of the pool. */
export const FLASH_FRAME_COUNT = buildFlashDelays().length;

/**
 * Trim a flash pool down to only the entries a spin can ever show — the
 * roulette cycles pool indices 0..FLASH_FRAME_COUNT-1 (wrapping only if the
 * pool is smaller), so anything beyond that is never flashed and isn't worth
 * prefetching.
 */
export function boundedFlashPool<T>(pool: readonly T[]): T[] {
  return pool.slice(0, Math.min(pool.length, FLASH_FRAME_COUNT));
}
