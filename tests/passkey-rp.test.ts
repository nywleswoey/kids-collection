import { describe, it, expect } from "vitest";
import { passkeyRp, RP_NAME } from "@/features/admin/webauthn/rp";

/**
 * The host guard is the whole point of this module (OQ-PG-6): passkeys must be
 * OFF on any host that is not the configured rpID, because a preview deployment
 * would otherwise enrol credentials against a throwaway hostname.
 */
describe("passkeyRp", () => {
  const PROD = "kids-collection.vercel.app";

  it("resolves an https origin on the production host", () => {
    expect(passkeyRp(PROD, PROD)).toEqual({
      rpID: PROD,
      rpName: RP_NAME,
      origin: `https://${PROD}`,
    });
  });

  it("resolves a http origin on localhost, keeping the port", () => {
    expect(passkeyRp("localhost", "localhost:3000")).toMatchObject({
      rpID: "localhost",
      origin: "http://localhost:3000",
    });
  });

  it("returns null on a Vercel preview host", () => {
    expect(passkeyRp(PROD, "kids-collection-git-branch-abc123.vercel.app")).toBeNull();
  });

  it("returns null for the registrable suffix — vercel.app is a public suffix", () => {
    expect(passkeyRp(PROD, "vercel.app")).toBeNull();
  });

  it("returns null for a subdomain of the rpID", () => {
    // WebAuthn would allow rpID to be a suffix of the origin, but this app pins
    // one exact host, so anything else is refused rather than quietly accepted.
    expect(passkeyRp(PROD, `sub.${PROD}`)).toBeNull();
  });

  it("ignores the port when matching the host", () => {
    expect(passkeyRp(PROD, `${PROD}:443`)?.origin).toBe(`https://${PROD}`);
  });

  it("matches case-insensitively", () => {
    expect(passkeyRp(PROD, PROD.toUpperCase())).not.toBeNull();
  });

  it("returns null when the host header or rpID is missing", () => {
    expect(passkeyRp(PROD, null)).toBeNull();
    expect(passkeyRp(PROD, undefined)).toBeNull();
    expect(passkeyRp("", PROD)).toBeNull();
  });
});
