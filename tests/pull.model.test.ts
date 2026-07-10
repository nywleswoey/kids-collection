import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Models the DB-level pull semantics (compare-and-swap spend) to lock in the
 * invariants U4 relies on. The real DB concurrency test runs in Build & Test
 * against Postgres; this proves the intended algorithm is correct.
 */
type Store = { tokens: number };

/** Mirror of `UPDATE ... SET tokens = tokens - 1 WHERE tokens >= 1`. */
function casSpend(store: Store): { spent: boolean; balance: number } {
  if (store.tokens >= 1) {
    store.tokens -= 1;
    return { spent: true, balance: store.tokens };
  }
  return { spent: false, balance: store.tokens };
}

function grant(store: Store, delta: number): number {
  store.tokens = Math.max(0, store.tokens + delta);
  return store.tokens;
}

describe("pull spend model (U4-BR1/BR2)", () => {
  it("N sequential pulls from K tokens: exactly min(N,K) succeed, never negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 0, max: 300 }),
        (K, N) => {
          const store: Store = { tokens: K };
          let ok = 0;
          for (let i = 0; i < N; i++) if (casSpend(store).spent) ok++;
          expect(ok).toBe(Math.min(N, K));
          expect(store.tokens).toBe(Math.max(0, K - N));
          expect(store.tokens).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  it("out of tokens: no spend when balance is 0", () => {
    const store: Store = { tokens: 0 };
    const res = casSpend(store);
    expect(res.spent).toBe(false);
    expect(store.tokens).toBe(0);
  });
});

describe("grant model (U4-BR8)", () => {
  it("balance never negative; positive grant adds exactly delta", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: -500, max: 500 }),
        (start, delta) => {
          const store: Store = { tokens: start };
          const result = grant(store, delta);
          expect(result).toBeGreaterThanOrEqual(0);
          if (delta >= 0) expect(result).toBe(start + delta);
        },
      ),
    );
  });
});
