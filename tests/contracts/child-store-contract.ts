import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { ChildStore } from "@/db/stores/child-store";
import type { ChildSeed } from "@/db/stores/child-store.fake";

/**
 * Shared ChildStore conformance spec — run against BOTH the in-memory fake (here
 * in Vitest) and the pg adapter (Build & Test against Postgres). Absorbs the
 * invariants the retired pull.model.test.ts used to mirror-model: CAS spend never
 * goes negative and yields exactly min(N,K) successes; clamped grant floors at 0.
 *
 * `makeStore(seed)` must return a FRESH, isolated store each call.
 */
export function runChildStoreContract(
  label: string,
  makeStore: (seed?: ChildSeed) => ChildStore | Promise<ChildStore>,
  opts: { properties?: boolean } = {},
) {
  // Exhaustive fuzzing runs against the in-memory fake (fast); the pg run sets
  // properties:false and proves adapter agreement on the concrete cases instead
  // of hammering a real DB with hundreds of round-trips per property.
  const properties = opts.properties !== false;
  describe(`ChildStore contract: ${label}`, () => {
    it("readColumn is 0 for an absent child and for an unset column", async () => {
      const store = await makeStore({ kid: { pullTokens: 2 } });
      expect(await store.readColumn("ghost", "pullTokens")).toBe(0);
      expect(await store.readColumn("kid", "easterEggTickets")).toBe(0);
      expect(await store.readColumn("kid", "pullTokens")).toBe(2);
    });

    it("spendOne decrements the column and returns the resulting pullTokens", async () => {
      const store = await makeStore({ kid: { pullTokens: 3 } });
      expect(await store.spendOne("kid", "pullTokens")).toBe(2);
      expect(await store.readColumn("kid", "pullTokens")).toBe(2);
    });

    it("spendOne of a ticket column leaves pullTokens unchanged but still returns it", async () => {
      const store = await makeStore({ kid: { pullTokens: 5, easterEggTickets: 1 } });
      expect(await store.spendOne("kid", "easterEggTickets")).toBe(5); // pullTokens returned
      expect(await store.readColumn("kid", "easterEggTickets")).toBe(0);
      expect(await store.readColumn("kid", "pullTokens")).toBe(5);
    });

    it("spendOne returns null when the guard fails (nothing held) or child absent", async () => {
      const store = await makeStore({ kid: { pullTokens: 0 } });
      expect(await store.spendOne("kid", "pullTokens")).toBeNull();
      expect(await store.spendOne("ghost", "pullTokens")).toBeNull();
      expect(await store.readColumn("kid", "pullTokens")).toBe(0);
    });

    it("clampedGrant floors at 0 and returns the new value; null for an absent child", async () => {
      const store = await makeStore({ kid: { pullTokens: 2 } });
      expect(await store.clampedGrant("kid", "pullTokens", 3)).toBe(5);
      expect(await store.clampedGrant("kid", "pullTokens", -100)).toBe(0); // floor
      expect(await store.clampedGrant("ghost", "pullTokens", 1)).toBeNull();
    });

    it("incrementColumn adds; no-ops for an absent child", async () => {
      const store = await makeStore({ kid: { pullTokens: 1 } });
      await store.incrementColumn("kid", "pullTokens", 1);
      await store.incrementColumn("ghost", "pullTokens", 1);
      expect(await store.readColumn("kid", "pullTokens")).toBe(2);
      expect(await store.readColumn("ghost", "pullTokens")).toBe(0);
    });

    it.runIf(properties)("property: N spends from K tokens → exactly min(N,K) succeed, never negative", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 60 }),
          fc.integer({ min: 0, max: 80 }),
          async (K, N) => {
            const store = await makeStore({ kid: { pullTokens: K } });
            let ok = 0;
            for (let i = 0; i < N; i++) {
              if ((await store.spendOne("kid", "pullTokens")) !== null) ok++;
            }
            expect(ok).toBe(Math.min(N, K));
            expect(await store.readColumn("kid", "pullTokens")).toBe(Math.max(0, K - N));
          },
        ),
      );
    });

    it.runIf(properties)("property: clampedGrant never yields a negative balance", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 500 }),
          fc.integer({ min: -500, max: 500 }),
          async (start, delta) => {
            const store = await makeStore({ kid: { pullTokens: start } });
            const result = await store.clampedGrant("kid", "pullTokens", delta);
            expect(result).toBeGreaterThanOrEqual(0);
            if (delta >= 0) expect(result).toBe(start + delta);
          },
        ),
      );
    });
  });
}
