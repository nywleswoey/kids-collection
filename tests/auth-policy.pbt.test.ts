import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { isParentEmail, parseAllowlist } from "@/features/auth/policy";

describe("parseAllowlist", () => {
  it("normalizes (trim + lowercase) and drops empties", () => {
    expect(parseAllowlist(" A@x.com , B@Y.com ,, ")).toEqual([
      "a@x.com",
      "b@y.com",
    ]);
    expect(parseAllowlist(undefined)).toEqual([]);
    expect(parseAllowlist("")).toEqual([]);
  });
});

describe("isParentEmail (U2-SEC-3)", () => {
  it("is invariant to case and surrounding whitespace", () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ maxLength: 3 }).map((s) => s.replace(/\S/g, " ")),
        (email, pad) => {
          const allow = parseAllowlist(email);
          // same email in any case / padded still matches
          const messy = `${pad}${email.toUpperCase()}${pad}`;
          expect(isParentEmail(messy, allow)).toBe(true);
        },
      ),
    );
  });

  it("rejects emails not in the allowlist", () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.emailAddress(),
        (a, b) => {
          fc.pre(a.toLowerCase() !== b.toLowerCase());
          expect(isParentEmail(b, parseAllowlist(a))).toBe(false);
        },
      ),
    );
  });

  it("rejects null/empty email", () => {
    expect(isParentEmail(null, ["a@x.com"])).toBe(false);
    expect(isParentEmail("", ["a@x.com"])).toBe(false);
    expect(isParentEmail("a@x.com", [])).toBe(false);
  });
});
