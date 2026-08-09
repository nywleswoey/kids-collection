// SCRATCH — deliberately failing. Proves the `test` gate reports red (#23).
// This file is never merged; the branch it lives on is deleted afterwards.
import { describe, expect, it } from "vitest";

describe("harness honesty", () => {
  it("fails on purpose so the test gate has to notice", () => {
    expect(1).toBe(2);
  });
});
