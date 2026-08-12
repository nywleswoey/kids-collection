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

  // --- Do NOT Unicode-normalize this comparison. Pinned, with the reasoning,
  // because the change looks like a security improvement and is the opposite.
  //
  // Auth.js shipped a HIGH advisory (GHSA-7rqj-j65f-68wh) for a homoglyph `@`
  // bypass, fixed by NFKC-normalizing addresses BEFORE validating them. Reading
  // that and reaching for `.normalize("NFKC")` here is the obvious move and it
  // would open the hole rather than close it — the two code shapes are mirror
  // images:
  //
  //   Auth.js validated an address, THEN normalized it, and used the normalized
  //   value downstream. Normalizing later meant the thing checked was not the
  //   thing used.
  //
  //   This function does an EXACT MATCH against a fixed allowlist. Every
  //   normalization applied to untrusted input maps MORE distinct strings onto
  //   the allowlisted value, so it can only ever WIDEN what is accepted.
  //
  // `toLowerCase` already widens deliberately and is bounded: ASCII case is not
  // meaningful in the addresses Google issues. NFKC is not bounded — it folds
  // fullwidth forms, ligatures and compatibility characters onto ASCII, so it
  // would map a lookalike address onto the parent's.
  it("does NOT fold Unicode lookalikes onto an allowlisted address", () => {
    const allow = parseAllowlist("parent@example.com");

    // U+FF20 FULLWIDTH COMMERCIAL AT — NFKC-normalizes to a plain "@".
    expect("parent＠example.com".normalize("NFKC")).toBe("parent@example.com");
    expect(isParentEmail("parent＠example.com", allow)).toBe(false);

    // U+1D18 LATIN LETTER SMALL CAPITAL P — no NFKC mapping, rejected anyway.
    expect(isParentEmail("ᴘarent@example.com", allow)).toBe(false);

    // The real address still matches, so this is not just "everything fails".
    expect(isParentEmail("parent@example.com", allow)).toBe(true);
  });

  it("property: only an exact (case/whitespace-insensitive) match is accepted", () => {
    // The general statement behind the case above: any input that is not the
    // allowlisted address after trim+lowercase is denied, whatever else it is.
    fc.assert(
      fc.property(fc.emailAddress(), fc.string({ maxLength: 12 }), (email, noise) => {
        const allow = parseAllowlist(email);
        const candidate = `${email}${noise}`;
        const expected = candidate.trim().toLowerCase() === email.trim().toLowerCase();
        expect(isParentEmail(candidate, allow)).toBe(expected);
      }),
    );
  });
});
