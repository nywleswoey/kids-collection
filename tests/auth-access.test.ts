import { describe, it, expect, afterEach } from "vitest";
import { isAllowlistedParent } from "@/features/auth/access";

/** The single parent decision, bound to PARENT_EMAILS. The pure allowlist
 * matching is property-tested in auth-policy.pbt.test.ts; here we pin the
 * env binding used by both signIn and getParent. */

const prev = process.env.PARENT_EMAILS;
afterEach(() => {
  if (prev === undefined) delete process.env.PARENT_EMAILS;
  else process.env.PARENT_EMAILS = prev;
});

describe("isAllowlistedParent", () => {
  it("accepts an allowlisted email (case/space-insensitive) and rejects others", () => {
    process.env.PARENT_EMAILS = "Mum@example.com, dad@example.com";
    expect(isAllowlistedParent("mum@example.com")).toBe(true);
    expect(isAllowlistedParent("  DAD@example.com ")).toBe(true);
    expect(isAllowlistedParent("stranger@example.com")).toBe(false);
  });

  it("rejects when no email or no allowlist configured", () => {
    process.env.PARENT_EMAILS = "parent@example.com";
    expect(isAllowlistedParent(null)).toBe(false);
    expect(isAllowlistedParent(undefined)).toBe(false);
    delete process.env.PARENT_EMAILS;
    expect(isAllowlistedParent("parent@example.com")).toBe(false); // fail-closed
  });
});
