import { describe, it, expect } from "vitest";
import { namesMatch } from "@/features/profiles/confirm-name";

describe("namesMatch (profile-delete confirmation, Inc23 FR9)", () => {
  it("accepts the exact name", () => {
    expect(namesMatch("Ben", "Ben")).toBe(true);
  });

  it("forgives surrounding whitespace, which is invisible", () => {
    expect(namesMatch("  Ben ", "Ben")).toBe(true);
    expect(namesMatch("Ben", " Ben")).toBe(true);
  });

  it("is case-sensitive — a near miss is not a confirmation", () => {
    expect(namesMatch("ben", "Ben")).toBe(false);
    expect(namesMatch("BEN", "Ben")).toBe(false);
  });

  it("rejects partial and extended input", () => {
    expect(namesMatch("Be", "Ben")).toBe(false);
    expect(namesMatch("Benjamin", "Ben")).toBe(false);
    expect(namesMatch("Ben Ben", "Ben")).toBe(false);
  });

  it("rejects empty input, and never matches an empty name", () => {
    expect(namesMatch("", "Ben")).toBe(false);
    expect(namesMatch("   ", "Ben")).toBe(false);
    // A blank name must not turn an empty box into a confirmed delete.
    expect(namesMatch("", "")).toBe(false);
    expect(namesMatch("   ", "  ")).toBe(false);
  });

  it("handles names with internal spaces and emoji", () => {
    expect(namesMatch("Mary Jane", "Mary Jane")).toBe(true);
    expect(namesMatch("MaryJane", "Mary Jane")).toBe(false);
    expect(namesMatch("Ben 🦊", "Ben 🦊")).toBe(true);
  });
});
