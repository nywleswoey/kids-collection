/**
 * Mass draw (#kcmassdraw) pack sizes: a 5-pack/10-pack next to the existing
 * single pull, same 1 ticket per card. `1` is the existing single pull;
 * `PACK_SIZES` is just the two new options a picker offers. No other
 * imports here (deliberately) — both the server-only pull orchestration
 * (`pull-service.ts`) and client components (`PullButton.tsx`/`PackReveal.tsx`)
 * import this shared constant/guard, so it must stay safe for a client bundle.
 */
export type PackSize = 1 | 5 | 10;

export const PACK_SIZES: readonly PackSize[] = [5, 10];

export function isValidPackSize(n: number): n is PackSize {
  return n === 1 || n === 5 || n === 10;
}
