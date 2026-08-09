// SCRATCH — deliberately failing PROPERTY. Proves the property-based path
// inside the `test` gate reports red (#23), not just plain assertions.
// PBT is the blocking constraint this whole CI effort exists to mechanise, so
// "the test gate goes red" is not the same claim as "a failing property goes
// red" — fast-check has to reach `fc.assert`, generate, fail, and shrink.
import { describe, expect, it } from "vitest";
import fc from "fast-check";

describe("harness honesty (property)", () => {
  it("fails on purpose so the property path has to notice", () => {
    // False for every n >= 1000. fc.nat()'s default range is 0..2^31-1, so a
    // counterexample is found within the first handful of runs and shrinks to
    // exactly 1000 — a shrunk counterexample in the log is the evidence that
    // the property really ran rather than being skipped.
    fc.assert(
      fc.property(fc.nat(), (n) => {
        expect(n).toBeLessThan(1000);
      }),
    );
  });
});
